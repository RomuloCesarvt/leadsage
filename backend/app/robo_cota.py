"""Quanto custa o robô responder uma conversa.

Os planos com o Robô de IA prometem "até N conversas por mês" (Essencial+Robô 150, Profissional+Robô 1.000, Escala 3.000). Mas cada resposta
descontava 1 crédito de LEAD da mesma carteira das buscas: quem gastava os créditos buscando ficava com o robô mudo ("sem créditos para o
robô responder"), mesmo com o robô pago. Agora, nesses planos a resposta sai da COTA DE CONVERSAS DO MÊS; os créditos de lead só entram se a
cota do mês acabar (e, sem plano com cota, vale o desconto de crédito de antes).
"""
from datetime import datetime, timezone
from typing import Dict, Optional

from app import robo_store

TIPO = "robo_uso"
# respostas do robô por mês, por plano. Tem de bater com `conversas` em frontend/src/data/planos.ts (os vitalícios com robô: sem promessa, valor de bom senso)
RESPOSTAS_POR_MES: Dict[str, int] = {
    "m_essencial_robo": 150, "m_profissional_robo": 1000, "m_escala": 3000,
    "pro": 1000, "agencia": 3000,
}


def mes() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def limite_do_plano(plan_id: str) -> int:
    return RESPOSTAS_POR_MES.get(plan_id or "", 0)


async def usadas(uid: str) -> int:
    return int((await robo_store._sql_get(f"robo_uso:{uid}:{mes()}") or {}).get("usadas", 0))


async def tentar_cota(uid: str, plan_id: str) -> bool:
    """Gasta uma resposta da cota do mês. False se o plano não tem cota ou ela acabou."""
    limite = limite_do_plano(plan_id)
    if limite <= 0:
        return False
    n = await usadas(uid)
    if n >= limite:
        return False
    await robo_store._sql_put(f"robo_uso:{uid}:{mes()}", uid, TIPO, {"usadas": n + 1, "mes": mes()})
    return True
