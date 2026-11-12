"""Último acesso de verdade de cada conta.

A data de "último login" do Firebase só muda quando a pessoa digita a senha de novo. Quem deixa o app aberto no celular (a sessão se
renova sozinha) aparecia como "último acesso há semanas" no painel de administração. Aqui cada uso do app registra a data, no máximo uma
vez a cada poucos minutos por conta e por instância (para não gravar no banco a cada clique).
"""
import time
from datetime import datetime, timezone
from typing import Dict

from sqlalchemy import select

from app import robo_store
from app.database import AsyncSessionLocal, DBRobo

TIPO = "atividade"
INTERVALO_S = 300                      # grava no máximo a cada 5 minutos por conta
_ULTIMA: Dict[str, float] = {}


def _chave(uid: str) -> str:
    return f"atividade:{uid}"


async def registrar(uid: str) -> None:
    """Marca que esta conta usou o app agora. Nunca derruba a requisição: falha de banco é só ignorada."""
    uid = str(uid or "").split("~", 1)[0]
    if not uid:
        return
    agora = time.monotonic()
    if agora - _ULTIMA.get(uid, -INTERVALO_S) < INTERVALO_S:
        return
    _ULTIMA[uid] = agora
    try:
        await robo_store._sql_put(_chave(uid), uid, TIPO, {"em": datetime.now(timezone.utc).isoformat(timespec="seconds")})
    except Exception as exc:
        print(f"Atividade: não gravou o acesso de {uid}: {exc}")


async def todas() -> Dict[str, str]:
    """uid -> data ISO do último uso do app, de todas as contas (uma leitura só)."""
    try:
        async with AsyncSessionLocal() as s:
            rows = (await s.execute(select(DBRobo).where(DBRobo.tipo == TIPO))).scalars().all()
        return {str(r.uid): str((r.data or {}).get("em") or "") for r in rows}
    except Exception:
        return {}
