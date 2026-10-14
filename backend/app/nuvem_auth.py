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


def _chave(uid: str, tipo: str = "auth") -> str:
    return f"nuvem_{tipo}:{uid}"


def _colecao(tipo: str) -> str:
    return "nuvem_auth" if tipo == "auth" else f"nuvem_{tipo}"


async def ler(uid: str, tipo: str = "auth") -> Optional[str]:
    """O texto guardado, '' se nao ha nada, ou None se o banco nao respondeu."""
    try:
        no_sql = await robo_store._sql_get(_chave(uid, tipo))
    except Exception as exc:
        print(f"Nuvem: falha ao ler a sessao no SQL: {exc}")
        no_sql = None
    if no_sql and no_sql.get("apagado") and robo_store._sql_primeiro():
        return ""  # o usuario desligou de proposito: sessao antiga que sobrou no Firestore nao volta
    if no_sql and (no_sql.get("blob") or "") and robo_store._sql_primeiro():
        return no_sql.get("blob", "")  # sem tocar no Firestore
    if firestore_db is not None:
        try:
            doc = firestore_db.collection(_colecao(tipo)).document(uid).get()
            blob = (doc.to_dict() or {}).get("blob", "") if doc.exists else ""
        except Exception as exc:
            robo_store._FALHA[0] = time.monotonic()
            print(f"Nuvem: falha ao ler a sessao: {exc}")
            # o Firestore nao respondeu e o SQL nao tem a sessao: nao da para saber se existe (nunca tratar como "sem sessao"),
            # a menos que a pessoa tenha acabado de pedir uma conexao NOVA (ai nao ha o que restaurar: o QR sai na hora)
            if no_sql and (no_sql.get("blob") or ""):
                return no_sql.get("blob", "")
            if robo_store._sql_primeiro() and await robo_store._sql_get(f"nuvem_novo:{uid}"):
                return ""
            return None
        if blob and robo_store._sql_primeiro():
            await robo_store._espelhar_sql(_chave(uid, tipo), uid, "nuvem_auth", {"blob": blob})  # dado antigo: passa para o SQL
        return blob or (no_sql or {}).get("blob", "")
    return (no_sql or {}).get("blob", "")


async def gravar(uid: str, blob: str, tipo: str = "auth") -> None:
    if firestore_db is not None and not robo_store._sql_primeiro():
        try:
            firestore_db.collection(_colecao(tipo)).document(uid).set({"blob": blob, "em": robo_store.agora()})
            await robo_store._espelhar_sql(_chave(uid, tipo), uid, "nuvem_auth", {"blob": blob})
            return
        except Exception as exc:
            robo_store._FALHA[0] = time.monotonic()
            print(f"Nuvem: falha ao gravar a sessao: {exc}")
    await robo_store._sql_put(_chave(uid, tipo), uid, "nuvem_auth", {"blob": blob})


async def apagar(uid: str, tipo: str = "auth") -> None:
    if firestore_db is not None:
        try:
            firestore_db.collection(_colecao(tipo)).document(uid).delete()
        except Exception as exc:
            print(f"Nuvem: falha ao apagar ({tipo}): {exc}")
    if robo_store._sql_primeiro():
        # tumulo: "desligado de proposito". Sem isso, a sessao antiga que ficou no Firestore voltaria na proxima leitura
        await robo_store._sql_put(_chave(uid, tipo), uid, "nuvem_auth", {"blob": "", "apagado": True})
        return
    async with AsyncSessionLocal() as s:
        linha = (await s.execute(select(DBRobo).where(DBRobo.chave == _chave(uid, tipo)))).scalar_one_or_none()
        if linha:
            await s.delete(linha)
            await s.commit()


async def marcar_novo(uid: str) -> None:
    """A pessoa pediu uma conexao NOVA agora: se o Firestore estiver fora, o servico pode pedir o QR sem esperar por ele."""
    await robo_store._sql_put(f"nuvem_novo:{uid}", uid, "nuvem_auth", {"em": robo_store.agora()})
