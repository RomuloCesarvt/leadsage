from typing import Dict, Any, List, Optional
from datetime import datetime
from app.firebase_config import db
from app.config import settings

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

    if user_data.get("role") == "admin":
        return UNLIMITED  # Infinitos para admin

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

    if db is None:
        _sem_banco()
        return {"credits": UNLIMITED, "history": []}

    user_ref = db.collection('users').document(uid)
    user_doc = user_ref.get()
    
    credits = 0
    if user_doc.exists:
        data = user_doc.to_dict()
        credits = UNLIMITED if data.get("role") == "admin" else data.get("credits", 0)

    history_ref = user_ref.collection('history').order_by('timestamp', direction='DESCENDING').limit(20)
    history_docs = history_ref.stream()
    history = [doc.to_dict() for doc in history_docs]

    return {"credits": credits, "history": history}

async def add_credits(uid: str, amount: int, reason: str = "Recarga de Créditos (Pix/Cartão)") -> int:
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
