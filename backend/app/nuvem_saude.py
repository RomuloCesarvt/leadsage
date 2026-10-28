"""O serviço do WhatsApp na nuvem (Render) está de pé?

O Render suspende serviço do plano grátis quando a cota mensal de horas acaba ("Monthly Quota Exceeded") e responde 503 com a página
"Service Suspended". Nesse caso o WhatsApp da nuvem NÃO está conectado, não envia e o robô não responde — e a tela não pode dizer
"nada precisa ser feito". Aqui o servidor confere, de tempos em tempos, o que o endereço do serviço responde.
"""
import time
from typing import Dict

import httpx

from app.config import settings

_GUARDADO: Dict[str, float] = {"em": 0.0, "suspenso": 0.0}
VALIDADE_S = 60.0


def parece_suspenso(status: int, corpo: str) -> bool:
    """Resposta de um serviço suspenso pelo Render (a página diz "suspended")."""
    return status == 503 and "suspended" in (corpo or "").lower()


async def suspenso() -> bool:
    """True quando o serviço da nuvem foi suspenso. Guarda a resposta por 1 minuto; falha de rede nunca vira "suspenso"."""
    agora = time.monotonic()
    if agora - _GUARDADO["em"] < VALIDADE_S:
        return bool(_GUARDADO["suspenso"])
    url = (settings.NUVEM_URL or "").strip()
    if not url:
        return False
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(4.0, connect=3.0)) as c:
            r = await c.get(url.rstrip("/") + "/")
        resultado = parece_suspenso(r.status_code, r.text[:2000])
    except Exception:
        return False        # sem resposta por outro motivo (acordando, rede): quem decide é o aviso de "sem resposta"
    _GUARDADO["em"], _GUARDADO["suspenso"] = agora, 1.0 if resultado else 0.0
    return resultado
