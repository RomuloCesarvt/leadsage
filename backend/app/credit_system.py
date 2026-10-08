import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

from sqlalchemy import select, update

from app.firebase_config import db
from app.config import settings
from app.database import AsyncSessionLocal, DBCredito, DBCreditoHistorico

UNLIMITED = 9999


class BancoDeCreditosIndisponivel(RuntimeError):
    """Nao da para saber quanto a pessoa tem, entao nada e cobrado nem
    liberado. Falhar fechado: o prejuizo de recusar uma busca e menor do
    que o de servir buscas pagas de graca para qualquer visitante."""


def _sem_banco() -> None:
    if settings.CREDITO_SEM_BANCO:
        return
    raise BancoDeCreditosIndisponivel(
        "O controle de créditos está indisponível no momento. "
        "Tente de novo em alguns minutos."
    )


def is_admin(email: Optional[str]) -> bool:
    """Admin pela lista de e-mails da configuracao.

    O papel "admin" gravado no Firestore continua valendo, mas se perde
    silenciosamente quando o documento do usuario e recriado (a propria
    check_and_deduct_credits recria com role="user"). A lista de e-mails
    nao depende do banco.
    """
    return bool(email) and email.strip().lower() in settings.admin_emails


def _sql_principal() -> bool:
    """Creditos no banco SQL (Supabase) em vez do Firestore."""
    return db is None and settings.FIRESTORE_DESLIGADO


async def _sql_garantir(s, uid: str) -> DBCredito:
    """A linha de creditos do usuario; a primeira vez nasce com o saldo inicial."""
    linha = (await s.execute(select(DBCredito).where(DBCredito.uid == uid))).scalar_one_or_none()
    if linha is None:
        linha = DBCredito(uid=uid, credits=50, role="user", created_at=datetime.now().isoformat())
        s.add(linha)
        await s.flush()
    return linha


def _historico(uid: str, descricao: str, valor: int, tipo: str) -> DBCreditoHistorico:
    return DBCreditoHistorico(
        id=f"h_{uuid.uuid4().hex[:16]}", uid=uid, description=descricao, amount=valor, type=tipo,
        timestamp=datetime.now().isoformat(),
    )


async def _sql_cobrar(uid: str, amount: int) -> Optional[int]:
    async with AsyncSessionLocal() as s:
        linha = await _sql_garantir(s, uid)
        if linha.role == "admin":
            await s.commit()
            return UNLIMITED
        # o UPDATE condicional impede dois pedidos simultaneos de gastar o mesmo saldo
        r = await s.execute(
            update(DBCredito).where(DBCredito.uid == uid, DBCredito.credits >= amount)
            .values(credits=DBCredito.credits - amount)
        )
        if r.rowcount == 0:
            await s.commit()
            return None
        s.add(_historico(uid, f"Gasto de {amount} créditos", -amount, "debit"))
        await s.commit()
        novo = (await s.execute(select(DBCredito.credits).where(DBCredito.uid == uid))).scalar_one()
        return int(novo)


async def _sql_saldo(uid: str) -> Dict[str, Any]:
    async with AsyncSessionLocal() as s:
        linha = (await s.execute(select(DBCredito).where(DBCredito.uid == uid))).scalar_one_or_none()
        historico = (await s.execute(
            select(DBCreditoHistorico).where(DBCreditoHistorico.uid == uid)
            .order_by(DBCreditoHistorico.timestamp.desc()).limit(20)
        )).scalars().all()
    creditos = 0 if linha is None else (UNLIMITED if linha.role == "admin" else int(linha.credits or 0))
    return {"credits": creditos, "history": [
        {"description": h.description, "amount": h.amount, "type": h.type, "timestamp": h.timestamp} for h in historico]}


async def _sql_somar(uid: str, amount: int, motivo: str) -> int:
    async with AsyncSessionLocal() as s:
        linha = (await s.execute(select(DBCredito).where(DBCredito.uid == uid))).scalar_one_or_none()
        if linha is None:
            s.add(DBCredito(uid=uid, credits=amount, role="user", created_at=datetime.now().isoformat()))
        else:
            await s.execute(update(DBCredito).where(DBCredito.uid == uid).values(credits=DBCredito.credits + amount))
        s.add(_historico(uid, motivo, amount, "credit"))
        await s.commit()
        if linha is None:
            return amount
        return int((await s.execute(select(DBCredito.credits).where(DBCredito.uid == uid))).scalar_one())


async def check_and_deduct_credits(
    uid: str, amount: int, email: Optional[str] = None
) -> Optional[int]:
    """
    Checks if user has enough credits and deducts them.
    Admins (por e-mail ou pelo papel no Firestore) nao consomem creditos.
    Returns the new balance or None if insufficient credits.
    """
    if is_admin(email):
        return UNLIMITED

    if _sql_principal():
        return await _sql_cobrar(uid, amount)

    if db is None:
        _sem_banco()
        return UNLIMITED

    user_ref = db.collection('users').document(uid)
    user_doc = user_ref.get()

    if not user_doc.exists:
        # Criar documento mock se não existir
        user_ref.set({
            "role": "user",
            "credits": 50,
            "createdAt": datetime.now().isoformat()
        })
        user_data = {"role": "user", "credits": 50}
    else:
        user_data = user_doc.to_dict()

    if user_data.get("role") == "admin" or user_data.get("ilimitado"):
        return UNLIMITED  # Infinitos para admin ou para quem o admin liberou

    current_credits = user_data.get("credits", 0)
    if current_credits < amount:
        return None

    new_credits = current_credits - amount
    user_ref.update({"credits": new_credits})

    # Gravar histórico
    db.collection('users').document(uid).collection('history').add({
        "description": f"Gasto de {amount} créditos",
        "amount": -amount,
        "type": "debit",
        "timestamp": datetime.now().isoformat()
    })

    return new_credits

async def get_user_balance(uid: str, email: Optional[str] = None) -> Dict[str, Any]:
    if is_admin(email):
        return {"credits": UNLIMITED, "history": [], "is_admin": True}

    if _sql_principal():
        return await _sql_saldo(uid)

    if db is None:
        _sem_banco()
        return {"credits": UNLIMITED, "history": []}

    user_ref = db.collection('users').document(uid)
    user_doc = user_ref.get()
    
    credits = 0
    if user_doc.exists:
        data = user_doc.to_dict()
        credits = UNLIMITED if (data.get("role") == "admin" or data.get("ilimitado")) else data.get("credits", 0)

    history_ref = user_ref.collection('history').order_by('timestamp', direction='DESCENDING').limit(20)
    history_docs = history_ref.stream()
    history = [doc.to_dict() for doc in history_docs]

    return {"credits": credits, "history": history}

async def add_credits(uid: str, amount: int, reason: str = "Recarga de Créditos (Pix/Cartão)") -> int:
    if _sql_principal():
        return await _sql_somar(uid, amount, reason)

    if db is None:
        _sem_banco()
        return UNLIMITED
        
    user_ref = db.collection('users').document(uid)
    user_doc = user_ref.get()
    
    if user_doc.exists:
        current = user_doc.to_dict().get("credits", 0)
        new_credits = current + amount
        user_ref.update({"credits": new_credits})
    else:
        new_credits = amount
        user_ref.set({"role": "user", "credits": new_credits})

    db.collection('users').document(uid).collection('history').add({
        "description": reason,
        "amount": +amount,
        "type": "credit",
        "timestamp": datetime.now().isoformat()
    })

    return new_credits


async def e_ilimitado(uid: str) -> bool:
    """O admin liberou creditos infinitos para este usuario?"""
    if _sql_principal():
        async with AsyncSessionLocal() as s:
            linha = (await s.execute(select(DBCredito).where(DBCredito.uid == uid))).scalar_one_or_none()
            return bool(linha and linha.role == "admin")
    if db is None:
        return False
    try:
        doc = db.collection("users").document(uid).get()
        d = doc.to_dict() or {} if doc.exists else {}
        return bool(d.get("ilimitado") or d.get("role") == "admin")
    except Exception as exc:
        print(f"Creditos: falha ao ler ilimitado: {exc}")
        return False


async def definir_ilimitado(uid: str, ativo: bool, por: str = "") -> None:
    """Liga ou desliga os creditos infinitos de um usuario (so o admin chama)."""
    if _sql_principal():
        async with AsyncSessionLocal() as s:
            linha = await _sql_garantir(s, uid)
            linha.role = "admin" if ativo else "user"
            s.add(_historico(uid, f"Créditos infinitos {'liberados' if ativo else 'retirados'} por {por}", 0, "credit"))
            await s.commit()
        return
    if db is None:
        _sem_banco()
        return
    ref = db.collection("users").document(uid)
    ref.set({"ilimitado": bool(ativo)}, merge=True)
    ref.collection("history").add({
        "description": f"Créditos infinitos {'liberados' if ativo else 'retirados'} por {por}",
        "amount": 0, "type": "credit", "timestamp": datetime.now().isoformat(),
    })
