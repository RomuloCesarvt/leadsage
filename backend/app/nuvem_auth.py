"""A sessao do WhatsApp de cada usuario da nuvem, guardada como texto cifrado.

Quem cifra e decifra e o servico da nuvem (a chave e o WORKER_SECRET, que o LeadSage nao usa para isso).
Aqui so se guarda e devolve o texto.
"""
import re
import time
from typing import Optional

from sqlalchemy import select

from app import robo_store
from app.database import AsyncSessionLocal, DBRobo
from app.firebase_config import db as firestore_db

_UID_RE = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


def uid_valido(uid: str) -> bool:
    return bool(_UID_RE.match(uid or ""))


def _chave(uid: str) -> str:
    return f"nuvem_auth:{uid}"


async def ler(uid: str) -> Optional[str]:
    """O texto guardado, '' se nao ha nada, ou None se o banco nao respondeu."""
    if firestore_db is not None:
        try:
            doc = firestore_db.collection("nuvem_auth").document(uid).get()
            return (doc.to_dict() or {}).get("blob", "") if doc.exists else ""
        except Exception as exc:
            robo_store._FALHA[0] = time.monotonic()
            print(f"Nuvem: falha ao ler a sessao: {exc}")
            return None
    dados = await robo_store._sql_get(_chave(uid))
    return (dados or {}).get("blob", "")


async def gravar(uid: str, blob: str) -> None:
    if firestore_db is not None:
        try:
            firestore_db.collection("nuvem_auth").document(uid).set({"blob": blob, "em": robo_store.agora()})
            return
        except Exception as exc:
            robo_store._FALHA[0] = time.monotonic()
            print(f"Nuvem: falha ao gravar a sessao: {exc}")
    await robo_store._sql_put(_chave(uid), uid, "nuvem_auth", {"blob": blob})


async def apagar(uid: str) -> None:
    if firestore_db is not None:
        try:
            firestore_db.collection("nuvem_auth").document(uid).delete()
        except Exception as exc:
            print(f"Nuvem: falha ao apagar a sessao: {exc}")
    async with AsyncSessionLocal() as s:
        linha = (await s.execute(select(DBRobo).where(DBRobo.chave == _chave(uid)))).scalar_one_or_none()
        if linha:
            await s.delete(linha)
            await s.commit()
