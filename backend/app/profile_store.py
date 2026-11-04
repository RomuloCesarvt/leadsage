"""Persistencia do perfil do usuario.

Antes o perfil vivia em `CURRENT_USER`, uma variavel global de modulo:
todos os usuarios compartilhavam o mesmo objeto, entao o que um salvasse
aparecia para os outros. E o PUT /api/profile nem exigia token.

Grava no Firestore quando ha credencial (producao) e cai para SQLite no
dev local. No Vercel o SQLite fica em /tmp e e efemero, por isso o
Firestore e o caminho duravel.
"""
import time
from typing import Any, Dict, Optional

from sqlalchemy import select

from app.database import AsyncSessionLocal, DBUserProfile
from app.firebase_config import db as firestore_db
from app.models import UserProfile

# Campos que o usuario controla. `credits` e `plan` NAO entram aqui:
# quem manda neles e o sistema de creditos, nao o corpo do request.
# `plan` e `sites_quota` NAO entram aqui de proposito: sao concedidos
# pela compra, via conceder_plano(). Se ficassem editaveis, um PUT
# /api/profile com sites_quota=999999 daria sites de graca — a mesma
# falha que existia nos creditos.
EDITABLE_FIELDS = (
    "name", "email", "company_name", "niche_focus", "product_description",
    "avatar", "services", "niches", "regions", "preferred_channel",
    "monthly_goal", "language",
    "brand_logo", "brand_primary", "brand_accent", "brand_contact",
    "modo",
)


# Concedidos pela compra: sao LIDOS do armazenamento, mas nunca aceitos
# vindos do usuario. Separar leitura de escrita e o ponto: filtrar os
# dois lados faria a cota sumir logo apos ser concedida.
SYSTEM_FIELDS = ("plan", "plan_id", "sites_quota", "modos")


from app.espaco import conta as _conta

MODOS = ("agencia", "empresa")


def _clean(payload: Dict[str, Any], sistema: bool = False) -> Dict[str, Any]:
    permitidos = EDITABLE_FIELDS + (SYSTEM_FIELDS if sistema else ())
    limpo = {k: v for k, v in payload.items() if k in permitidos and v is not None}
    # modo vazio ou desconhecido nunca é gravado: salvar o perfil por outra tela (que manda modo "") não pode apagar o modo escolhido
    if "modo" in limpo and limpo["modo"] not in MODOS:
        del limpo["modo"]
    return limpo


async def _load_sqlite(uid: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DBUserProfile).where(DBUserProfile.uid == uid))
        row = result.scalar_one_or_none()
        return dict(row.data or {}) if row else None


async def _save_sqlite(uid: str, data: Dict[str, Any]) -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DBUserProfile).where(DBUserProfile.uid == uid))
        row = result.scalar_one_or_none()
        if row:
            merged = dict(row.data or {})
            merged.update(data)
            row.data = merged
        else:
            session.add(DBUserProfile(uid=uid, data=data))
        await session.commit()


# Quase toda rota le o perfil (plano, creditos). Guardado por alguns segundos
# so quando a leitura veio do Firestore; gravar no processo o esquece.
_PERFIS: Dict[str, Any] = {}
_PERFIS_TTL_S = 20


def esquecer_perfil(uid: str) -> None:
    _PERFIS.pop(uid, None)


async def get_profile(uid: str) -> UserProfile:
    """Perfil salvo do usuario, ou os defaults quando ainda nao gravou nada."""
    uid = _conta(uid)
    guardado = _PERFIS.get(uid)
    if guardado and time.monotonic() - guardado[0] < _PERFIS_TTL_S:
        return guardado[1].model_copy(deep=True)
    stored: Optional[Dict[str, Any]] = None
    veio_do_firestore = False

    if firestore_db is not None:
        try:
            doc = firestore_db.collection("users").document(uid).get()
            veio_do_firestore = True
            if doc.exists:
                stored = (doc.to_dict() or {}).get("profile")
        except Exception as exc:
            print(f"Falha ao ler perfil no Firestore: {exc}")

    if stored is None:
        try:
            stored = await _load_sqlite(uid)
        except Exception as exc:
            print(f"Falha ao ler perfil no SQLite: {exc}")
    elif veio_do_firestore:
        # o modo e os modos liberados também são gravados no SQL: com a cota do Firestore estourada a gravação lá é recusada,
        # e ler só dele devolveria o perfil antigo (a troca de modo nunca pegaria)
        try:
            no_sql = await _load_sqlite(uid) or {}
            for chave in ("modo", "modos"):
                if chave in no_sql:
                    stored = {**stored, chave: no_sql[chave]}
        except Exception as exc:
            print(f"Falha ao ler o modo no SQLite: {exc}")

    profile = UserProfile(id=uid)
    if stored:
        # leitura: inclui os campos de sistema
        for key, value in _clean(stored, sistema=True).items():
            setattr(profile, key, value)
    if veio_do_firestore:
        _PERFIS[uid] = (time.monotonic(), profile.model_copy(deep=True))
    return profile


async def save_profile(uid: str, payload: Dict[str, Any]) -> UserProfile:
    uid = _conta(uid)
    esquecer_perfil(uid)
    data = _clean(payload)

    written = False
    if firestore_db is not None:
        try:
            firestore_db.collection("users").document(uid).set(
                {"profile": data}, merge=True
            )
            written = True
        except Exception as exc:
            print(f"Falha ao gravar perfil no Firestore: {exc}")

    if not written:
        await _save_sqlite(uid, data)
    elif "modo" in data:
        try:
            await _save_sqlite(uid, {"modo": data["modo"]})
        except Exception as exc:
            print(f"Falha ao espelhar o modo no SQLite: {exc}")

    return await get_profile(uid)


def modos_permitidos(modos_gravados: Any, modo: str, acesso_total: bool) -> list:
    """Os modos que a conta pode usar: os dois para acesso total; senão os liberados (comprados ou escolhidos ao criar a conta).
    Conta antiga, sem nada gravado, é agência."""
    if acesso_total:
        return list(MODOS)
    gravados = [m for m in (modos_gravados or []) if m in MODOS]
    if gravados:
        return gravados
    return [modo] if modo in MODOS else ["agencia"]


async def liberar_modos(uid: str, modos: list) -> None:
    """Grava os modos liberados (compra ou criação da conta). Passa por fora de EDITABLE_FIELDS: o usuário não escolhe quais modos tem."""
    uid = _conta(uid)
    esquecer_perfil(uid)
    dados = {"modos": [m for m in modos if m in MODOS]}
    if firestore_db is not None:
        try:
            firestore_db.collection("users").document(uid).set({"profile": dados}, merge=True)
        except Exception as exc:
            print(f"Falha ao liberar modos no Firestore: {exc}")
    try:
        await _save_sqlite(uid, dados)             # sempre também no SQL: é de lá que a leitura confere os modos
    except Exception as exc:
        print(f"Falha ao liberar modos no SQLite: {exc}")


async def conceder_plano(uid: str, plano: str, sites: int, plan_id: str = "") -> None:
    """Aplica o plano comprado. Chamado apenas pela confirmacao de pagamento.

    Passa por fora de EDITABLE_FIELDS: estes campos existem justamente
    para nao serem editaveis pelo usuario.
    """
    uid = _conta(uid)
    esquecer_perfil(uid)
    atual = await get_profile(uid)
    esquecer_perfil(uid)
    dados = {"plan": plano, "sites_quota": (atual.sites_quota or 0) + sites}
    if plan_id:
        dados["plan_id"] = plan_id

    if firestore_db is not None:
        try:
            firestore_db.collection("users").document(uid).set(
                {"profile": dados}, merge=True
            )
            return
        except Exception as exc:
            print(f"Falha ao conceder plano no Firestore: {exc}")

    await _save_sqlite(uid, dados)
