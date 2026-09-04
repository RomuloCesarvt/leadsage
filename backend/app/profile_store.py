"""Persistencia do perfil do usuario.

Antes o perfil vivia em `CURRENT_USER`, uma variavel global de modulo:
todos os usuarios compartilhavam o mesmo objeto, entao o que um salvasse
aparecia para os outros. E o PUT /api/profile nem exigia token.

Grava no Firestore quando ha credencial (producao) e cai para SQLite no
dev local. No Vercel o SQLite fica em /tmp e e efemero, por isso o
Firestore e o caminho duravel.
"""
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
)


# Concedidos pela compra: sao LIDOS do armazenamento, mas nunca aceitos
# vindos do usuario. Separar leitura de escrita e o ponto: filtrar os
# dois lados faria a cota sumir logo apos ser concedida.
SYSTEM_FIELDS = ("plan", "sites_quota")


def _clean(payload: Dict[str, Any], sistema: bool = False) -> Dict[str, Any]:
    permitidos = EDITABLE_FIELDS + (SYSTEM_FIELDS if sistema else ())
    return {k: v for k, v in payload.items() if k in permitidos and v is not None}


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


async def get_profile(uid: str) -> UserProfile:
    """Perfil salvo do usuario, ou os defaults quando ainda nao gravou nada."""
    stored: Optional[Dict[str, Any]] = None

    if firestore_db is not None:
        try:
            doc = firestore_db.collection("users").document(uid).get()
            if doc.exists:
                stored = (doc.to_dict() or {}).get("profile")
        except Exception as exc:
            print(f"Falha ao ler perfil no Firestore: {exc}")

    if stored is None:
        try:
            stored = await _load_sqlite(uid)
        except Exception as exc:
            print(f"Falha ao ler perfil no SQLite: {exc}")

    profile = UserProfile(id=uid)
    if stored:
        # leitura: inclui os campos de sistema
        for key, value in _clean(stored, sistema=True).items():
            setattr(profile, key, value)
    return profile


async def save_profile(uid: str, payload: Dict[str, Any]) -> UserProfile:
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

    return await get_profile(uid)


async def conceder_plano(uid: str, plano: str, sites: int) -> None:
    """Aplica o plano comprado. Chamado apenas pela confirmacao de pagamento.

    Passa por fora de EDITABLE_FIELDS: estes campos existem justamente
    para nao serem editaveis pelo usuario.
    """
    atual = await get_profile(uid)
    dados = {"plan": plano, "sites_quota": (atual.sites_quota or 0) + sites}

    if firestore_db is not None:
        try:
            firestore_db.collection("users").document(uid).set(
                {"profile": dados}, merge=True
            )
            return
        except Exception as exc:
            print(f"Falha ao conceder plano no Firestore: {exc}")

    await _save_sqlite(uid, dados)
