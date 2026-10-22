"""Quem abriu a prévia: o sinal mais forte de interesse que o robô tem e que hoje se perdia.

O link `/s/<apelido>` é aberto sem login. Cada abertura de verdade (gente, não o robô que o WhatsApp manda para montar a miniatura
do link) vira um contador no banco do robô, ligado ao lead dono da prévia. Recarregar a página em seguida não conta de novo.
"""
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from app import robo_store
from app.database import AsyncSessionLocal, DBSite

TIPO = "previa_abertura"
# recarregar, voltar à aba ou abrir de novo em seguida é a mesma visita
JANELA_MIN = 30
GUARDAR_ULTIMAS = 20

# quem busca o link sem ser a pessoa: a prévia da conversa do WhatsApp/Telegram/Facebook, buscadores, ferramentas de linha de comando
_ROBO = re.compile(
    r"whatsapp|facebookexternalhit|facebot|telegrambot|twitterbot|slackbot|discordbot|linkedinbot|googlebot|google-inspectiontool|"
    r"bingbot|bingpreview|yandex|baiduspider|duckduckbot|applebot|preview|crawler|spider|\bbot\b|curl/|wget|python-requests|httpx|"
    r"go-http-client|headlesschrome|lighthouse|pingdom|uptime",
    re.I,
)


def eh_robo(user_agent: Optional[str]) -> bool:
    """Sem User-Agent também é máquina: navegador de gente sempre se identifica."""
    ua = (user_agent or "").strip()
    return not ua or bool(_ROBO.search(ua))


def _agora() -> datetime:
    return datetime.now(timezone.utc)


def _chave(slug: str) -> str:
    return f"{TIPO}:{slug}"


async def dono_do_apelido(slug: str) -> Optional[Dict[str, str]]:
    """De quem é a prévia e de qual lead (None quando o apelido não existe)."""
    if not slug:
        return None
    async with AsyncSessionLocal() as session:
        row = (await session.execute(select(DBSite).where(DBSite.slug == slug))).scalars().first()
        if row is None:
            return None
        return {"uid": row.owner_uid or "", "lead_id": row.lead_id or "", "site_id": row.id, "empresa": row.company or ""}


def _contar(atual: Optional[Dict[str, Any]], dono: Dict[str, str], slug: str, quando: datetime) -> Dict[str, Any]:
    """Novo registro depois de uma abertura. `visitas` só sobe passada a janela da visita anterior."""
    reg = dict(atual or {})
    iso = quando.isoformat(timespec="seconds")
    ultima = reg.get("ultima") or ""
    mesma_visita = False
    if ultima:
        try:
            mesma_visita = quando - datetime.fromisoformat(ultima) < timedelta(minutes=JANELA_MIN)
        except ValueError:
            mesma_visita = False
    reg.update({"slug": slug, "lead_id": dono["lead_id"], "site_id": dono["site_id"], "empresa": dono["empresa"],
                "primeira": reg.get("primeira") or iso, "ultima": iso, "atualizado": iso,
                "carregamentos": int(reg.get("carregamentos") or 0) + 1})
    if not mesma_visita:
        reg["visitas"] = int(reg.get("visitas") or 0) + 1
        reg["historico"] = (list(reg.get("historico") or []) + [iso])[-GUARDAR_ULTIMAS:]
    else:
        reg["visitas"] = int(reg.get("visitas") or 1)
    return reg


async def registrar(slug: str, user_agent: Optional[str]) -> Optional[Dict[str, Any]]:
    """Conta uma abertura. Devolve o registro novo, ou None quando era robô ou o apelido não existe. Nunca levanta erro."""
    try:
        if eh_robo(user_agent):
            return None
        dono = await dono_do_apelido(slug)
        if not dono or not dono["uid"]:
            return None
        atual = await robo_store._sql_get(_chave(slug))
        novo = _contar(atual, dono, slug, _agora())
        novo["primeira_visita_agora"] = not atual
        await robo_store._sql_put(_chave(slug), dono["uid"], TIPO, {k: v for k, v in novo.items() if k != "primeira_visita_agora"})
        return novo
    except Exception as exc:  # contar é reforço: jamais pode derrubar a página que o cliente quer ver
        print(f"Abertura da prévia não registrada ({slug}): {type(exc).__name__}")
        return None


async def listar(uid: str) -> List[Dict[str, Any]]:
    """Todas as prévias abertas deste usuário, a mais recente primeiro."""
    itens = await robo_store._sql_listar(uid, TIPO)
    return sorted(itens, key=lambda r: r.get("ultima") or "", reverse=True)


async def do_lead(uid: str, lead_id: str) -> Optional[Dict[str, Any]]:
    """A abertura da prévia de um lead (None: ainda não abriu)."""
    return next((r for r in await listar(uid) if r.get("lead_id") == str(lead_id)), None)
