"""Último acesso de verdade de cada conta.

A data de "último login" do Firebase só muda quando a pessoa digita a senha de novo. Quem deixa o app aberto no celular (a sessão se
renova sozinha) aparecia como "último acesso há semanas" no painel de administração. Aqui cada uso do app registra a data, no máximo uma
vez a cada poucos minutos por conta e por instância (para não gravar no banco a cada clique).
"""
import time
from datetime import datetime, timezone
from typing import Dict, Optional

from sqlalchemy import func, select

from app import robo_store
from app.database import AsyncSessionLocal, DBCreditoHistorico, DBRobo, DBSearchHistory

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
    dado = {"em": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    for tentativa in (1, 2):
        try:
            await robo_store._sql_put(_chave(uid), uid, TIPO, dado)
            return
        except Exception as exc:
            # duas chamadas da mesma conta chegando juntas disputam a criação da linha: na segunda tentativa ela já existe e só atualiza
            if tentativa == 2:
                print(f"Atividade: não gravou o acesso de {uid}: {exc}")


def _iso(texto: object) -> str:
    """Qualquer data guardada (com ou sem fuso, com ou sem Z) vira "AAAA-MM-DDTHH:MM:SS+00:00" em UTC, para poder comparar como texto."""
    t = str(texto or "").strip()
    if not t:
        return ""
    try:
        d = datetime.fromisoformat(t.replace("Z", "+00:00"))
    except ValueError:
        return ""
    d = d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d.astimezone(timezone.utc)
    return d.isoformat(timespec="seconds")


def _base(uid: Optional[str]) -> str:
    return str(uid or "").split("~", 1)[0]


async def todas() -> Dict[str, str]:
    """uid -> data ISO do último uso do app, de todas as contas.

    Junta o registro de acesso (que só existe de agora em diante) com o uso que JÁ estava guardado: a última busca e o último gasto de
    créditos (busca, raio-x, mensagem). Assim quem usou o sistema ontem aparece com a data de ontem, e não com a do último login.
    """
    saida: Dict[str, str] = {}

    def somar(uid: Optional[str], quando: object) -> None:
        u, d = _base(uid), _iso(quando)
        if u and d and d > saida.get(u, ""):
            saida[u] = d

    fontes = (
        (select(DBRobo.uid, func.max(DBRobo.atualizado)).where(DBRobo.tipo == TIPO).group_by(DBRobo.uid)),
        (select(DBSearchHistory.owner_uid, func.max(DBSearchHistory.timestamp)).group_by(DBSearchHistory.owner_uid)),
        (select(DBCreditoHistorico.uid, func.max(DBCreditoHistorico.timestamp)).group_by(DBCreditoHistorico.uid)),
    )
    for consulta in fontes:
        try:
            async with AsyncSessionLocal() as s:
                for uid, quando in (await s.execute(consulta)).all():
                    somar(uid, quando)
        except Exception as exc:
            print(f"Atividade: fonte indisponível: {exc}")
    return saida
