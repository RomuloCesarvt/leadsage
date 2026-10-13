"""A prévia do site de um lead, criada na hora pelo robô.

Quando o lead aceita ver a prévia e ela ainda não existe, o robô cria o site e manda o link na mesma conversa.

O site é o DELE: o mesmo motor de sites do disparo (templates por ramo, conteúdo do ramo, nota do Google, telefone,
endereço, horário) com fotos do banco de imagens do ramo. O motor roda numa função Node (`api/render-site.mjs`), chamada
daqui com o segredo do serviço; assim o robô e o disparo geram exatamente o mesmo tipo de site.

Se o motor não responder, NÃO se publica uma página qualquer: o robô avisa que está finalizando e o dono assume.
"""
from typing import Any, Dict, List, Tuple

import httpx

from app import banco_imagens
from app.config import settings
from app.credit_system import is_admin

# o que o motor de sites sabe usar de um lead
CAMPOS_DO_LEAD = (
    "id", "name", "company", "niche", "role", "city", "phone", "whatsapp", "email", "address", "location",
    "rating", "rating_count", "opening_hours", "opening_hours_week", "socials", "instagram",
)


def lead_para_o_motor(lead: Dict[str, Any]) -> Dict[str, Any]:
    return {k: lead[k] for k in CAMPOS_DO_LEAD if lead.get(k) not in (None, "")}


async def fotos_do_ramo(nicho: str, quantidade: int = 8) -> List[str]:
    """Endereços https de fotos do ramo (vazio se o banco de imagens não responder: o site cai no fundo desenhado)."""
    try:
        r = await banco_imagens.buscar(nicho=(nicho or "")[:80], quantidade=quantidade)
        return [str(f["url"]) for f in (r.get("imagens") or []) if str(f.get("url", "")).startswith("https://")][:quantidade]
    except Exception:
        return []


async def renderizar(lead: Dict[str, Any], fotos: List[str]) -> Dict[str, Any]:
    """O site do lead (html, modelo, empresa) montado pelo motor de sites."""
    if not settings.WORKER_SECRET:
        raise RuntimeError("o motor de sites não está configurado")
    async with httpx.AsyncClient(timeout=25) as cliente:
        r = await cliente.post(
            f"{settings.APP_URL.rstrip('/')}/api/render-site",
            json={"lead": lead_para_o_motor(lead), "fotos": fotos},
            headers={"x-render-secret": settings.WORKER_SECRET},
        )
    if r.status_code != 200:
        raise RuntimeError(f"o motor de sites respondeu {r.status_code}")
    dados = r.json()
    if not str(dados.get("html") or "").strip():
        raise RuntimeError("o motor de sites devolveu uma página vazia")
    return dados


async def criar(uid: str, email: str, lead: Dict[str, Any]) -> Tuple[str, str]:
    """Cria e publica a prévia deste lead. Devolve (link, motivo_da_falha): o link vem vazio quando não deu para criar."""
    from app.profile_store import get_profile
    from app.sites_store import contar_sites, create_site

    lead_id = str(lead.get("id") or "")
    if not lead_id:
        return "", "o lead não tem identificador"
    try:
        # a pagina generica das primeiras versoes sai de cena (e devolve a vaga): ela nao era o site da empresa
        from app.sites_store import delete_site, list_sites
        for antigo in await list_sites(uid):
            if antigo.get("lead_id") == lead_id and antigo.get("template") == "Prévia rápida":
                await delete_site(uid, antigo["id"])
        if not is_admin(email):
            cota = (await get_profile(uid)).sites_quota or 0
            if await contar_sites(uid) >= cota:
                return "", "o plano não tem mais vagas de site"
        fotos = await fotos_do_ramo(str(lead.get("niche") or lead.get("role") or ""))
        site = await renderizar(lead, fotos)
        criado = await create_site(
            uid, str(site.get("company") or lead.get("company") or lead.get("name") or "Prévia"), site["html"],
            str(site.get("template") or ""), lead_id, str(site.get("builder_data") or ""),
        )
        return f"{settings.APP_URL.rstrip('/')}/s/{criado['slug']}", ""
    except Exception as exc:  # o robô cai para "finalizando" e chama o dono; não derruba a conversa
        return "", f"{type(exc).__name__}: {str(exc)[:80]}"
