"""Credenciais de envio por usuario (SMTP e webhook).

Antes o modal de Integracoes apenas mostrava "Configuracoes salvas com
sucesso!" e fechava, sem gravar nada. O backend so conhecia o SMTP das
variaveis de ambiente, entao o e-mail do usuario sempre caia no modo
simulado.

A senha nunca volta para o cliente: a leitura devolve `has_password`.
"""
from typing import Any, Dict, Optional

from sqlalchemy import select

from app.database import AsyncSessionLocal, DBIntegration
from app.firebase_config import db as firestore_db

FIELDS = (
    "smtp_host", "smtp_port", "smtp_user", "smtp_password", "from_email", "webhook_url",
    # WhatsApp Cloud API (Meta). O token e secreto e nunca volta ao cliente.
    "wa_token", "wa_phone_id", "wa_template", "wa_language",
)
SECRET_FIELDS = ("smtp_password", "wa_token")


def _clean(payload: Dict[str, Any]) -> Dict[str, Any]:
    data: Dict[str, Any] = {}
    for key in FIELDS:
        if key not in payload or payload[key] is None:
            continue
        value = payload[key]
        if key == "smtp_port":
            try:
                data[key] = int(value)
            except (TypeError, ValueError):
                continue
        else:
            data[key] = str(value).strip()
    return data


def public_view(data: Dict[str, Any]) -> Dict[str, Any]:
    """Versao segura para o frontend: sem a senha em texto claro."""
    out = {k: v for k, v in (data or {}).items() if k not in SECRET_FIELDS}
    out["has_password"] = bool((data or {}).get("smtp_password"))
    out["has_wa_token"] = bool((data or {}).get("wa_token"))
    out.setdefault("smtp_host", "")
    out.setdefault("smtp_port", 587)
    out.setdefault("smtp_user", "")
    out.setdefault("from_email", "")
    out.setdefault("webhook_url", "")
    out.setdefault("wa_phone_id", "")
    out.setdefault("wa_template", "")
    out.setdefault("wa_language", "pt_BR")
    return out


async def _load_sqlite(uid: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DBIntegration).where(DBIntegration.uid == uid))
        row = result.scalar_one_or_none()
        return dict(row.data or {}) if row else None


async def _save_sqlite(uid: str, data: Dict[str, Any]) -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(DBIntegration).where(DBIntegration.uid == uid))
        row = result.scalar_one_or_none()
        if row:
            merged = dict(row.data or {})
            merged.update(data)
            row.data = merged
        else:
            session.add(DBIntegration(uid=uid, data=data))
        await session.commit()


async def _importar(uid: str) -> None:
    """Copia as integrações antigas do Firestore para o SQL, uma vez por usuário (o que já está no SQL manda; nada é apagado lá)."""
    import time
    from app import robo_store
    try:
        doc = firestore_db.collection("users").document(uid).get()
        antigo = (doc.to_dict() or {}).get("integrations") if doc.exists else None
    except Exception as exc:
        robo_store._FALHA[0] = time.monotonic()
        robo_store.adiar_importacao(uid, "integracoes")
        print(f"Importação das integrações adiada (Firestore): {exc}")
        return
    if antigo:
        await _save_sqlite(uid, {**dict(antigo), **(await _load_sqlite(uid) or {})})
    await robo_store.marcar_importado(uid, "integracoes")


async def get_integrations(uid: str) -> Dict[str, Any]:
    """Dados completos, com senha. Uso interno do dispatcher."""
    from app import robo_store
    if robo_store._sql_primeiro():
        if firestore_db is not None and not await robo_store.sql_e_a_fonte(uid, "integracoes") and robo_store.pode_tentar_importar(uid, "integracoes"):
            await _importar(uid)
        try:
            return await _load_sqlite(uid) or {}
        except Exception as exc:
            print(f"Falha ao ler integracoes no SQL: {exc}")
            return {}
    if firestore_db is not None:
        try:
            doc = firestore_db.collection("users").document(uid).get()
            if doc.exists:
                stored = (doc.to_dict() or {}).get("integrations")
                if stored:
                    return dict(stored)
        except Exception as exc:
            print(f"Falha ao ler integracoes no Firestore: {exc}")

    try:
        return await _load_sqlite(uid) or {}
    except Exception as exc:
        print(f"Falha ao ler integracoes no SQLite: {exc}")
        return {}


async def save_integrations(uid: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    data = _clean(payload)

    # Campo de senha em branco significa "manter a atual", nao "apagar":
    # o frontend nunca recebe a senha de volta para reenviar.
    if not data.get("smtp_password"):
        data.pop("smtp_password", None)
    if not data.get("wa_token"):
        data.pop("wa_token", None)

    from app import robo_store
    written = False
    if firestore_db is not None and not robo_store._sql_primeiro():
        try:
            firestore_db.collection("users").document(uid).set(
                {"integrations": data}, merge=True
            )
            written = True
        except Exception as exc:
            print(f"Falha ao gravar integracoes no Firestore: {exc}")

    if not written:
        await _save_sqlite(uid, data)

    return public_view(await get_integrations(uid))
