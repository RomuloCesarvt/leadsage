"""A prévia do site de um lead, criada na hora pelo robô.

Quando o lead aceita ver a prévia e ela ainda não existe, o robô cria o site e manda o link na mesma conversa.

O site é o DELE: o mesmo motor de sites do disparo (templates por ramo, conteúdo do ramo, nota do Google, telefone,
endereço, horário) com fotos do banco de imagens do ramo. O motor roda numa função Node (`api/render-site.mjs`), chamada
daqui com o segredo do serviço; assim o robô e o disparo geram exatamente o mesmo tipo de site.

Se o motor não responder, NÃO se publica uma página qualquer: o robô avisa que está finalizando e o dono assume.
"""
import json
from typing import Any, Dict, List, Tuple

import httpx

from app import banco_imagens
from app.config import settings
from app.credit_system import is_admin

# Versao do motor de sites. Ao mudar o visual (cores, modelos, titulos), troque o valor: as previas ja criadas e
# nunca editadas sao refeitas, com o mesmo link, na proxima vez que forem enviadas.
MOTOR_VERSAO = "2026-10-13-direcao-de-arte-2"

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


async def renderizar(lead: Dict[str, Any], fotos: List[str], modelo: str = "", anterior: Dict[str, Any] = None) -> Dict[str, Any]:
    """O site do lead (html, modelo, empresa) montado pelo motor de sites."""
    if not settings.WORKER_SECRET:
        raise RuntimeError("o motor de sites não está configurado")
    async with httpx.AsyncClient(timeout=25) as cliente:
        r = await cliente.post(
            f"{settings.APP_URL.rstrip('/')}/api/render-site",
            json={"lead": lead_para_o_motor(lead), "fotos": fotos, "modelo": modelo, "anterior": anterior or None},
            headers={"x-render-secret": settings.WORKER_SECRET},
        )
    if r.status_code != 200:
        raise RuntimeError(f"o motor de sites respondeu {r.status_code}")
    dados = r.json()
    if not str(dados.get("html") or "").strip():
        raise RuntimeError("o motor de sites devolveu uma página vazia")
    return dados


def _com_carimbo(builder_data: str) -> str:
    """O mesmo builder_data, marcado com a versao do motor que gerou o site."""
    try:
        dados = json.loads(builder_data or "{}")
        if isinstance(dados, dict):
            dados["motor"] = MOTOR_VERSAO
            return json.dumps(dados, ensure_ascii=False)
    except Exception:
        pass
    return builder_data


def _carimbo(builder_data: str) -> str:
    try:
        return str((json.loads(builder_data or "{}") or {}).get("motor") or "")
    except Exception:
        return ""


def _do_site_anterior(builder_data: str) -> Dict[str, Any]:
    """Os dados de contato e as fotos do site antigo, para a versao nova nao perder o que o lead de agora nao traz."""
    try:
        d = json.loads(builder_data or "{}")
    except Exception:
        return {}
    if not isinstance(d, dict):
        return {}
    chaves = ("telefone", "whatsapp", "email", "endereco", "horario", "instagram", "nota", "avaliacoes", "logo", "capa", "fotoSobre")
    saida = {k: d[k] for k in chaves if d.get(k) not in (None, "")}
    saida["galeria"] = [x for x in (d.get("galeria") or []) if isinstance(x, str)][:4]
    saida["depoimentos"] = [x for x in (d.get("depoimentos") or []) if isinstance(x, dict)][:3]
    # fotos enviadas pelo dono (data:) pesam demais para a viagem: so entram enderecos https
    for k in ("logo", "capa", "fotoSobre"):
        if str(saida.get(k, "")).startswith("data:"):
            saida.pop(k)
    saida["galeria"] = [x for x in saida["galeria"] if not x.startswith("data:")]
    return saida


async def atualizar_se_antigo(uid: str, email: str, lead: Dict[str, Any]) -> bool:
    """Refaz, com o motor atual, a previa deste lead se ela foi feita por uma versao antiga e ninguem a editou.

    O link nao muda (quem ja recebeu ve o site novo). Site que o dono editou nunca e sobrescrito.
    """
    from app.sites_store import get_site, list_sites, update_site

    lead_id = str(lead.get("id") or "")
    if not lead_id:
        return False
    try:
        for s in await list_sites(uid):
            if s.get("lead_id") != lead_id or not s.get("slug") or s.get("template") == "Prévia rápida":
                continue
            if s.get("updated_at"):
                return False  # o dono mexeu neste site: fica como ele deixou
            dados = s.get("builder_data")
            if dados is None:  # a listagem do banco SQL nao traz o builder_data: le o site para achar o carimbo
                dados = (await get_site(uid, s["id"]) or {}).get("builder_data") or ""
            if _carimbo(dados) == MOTOR_VERSAO:
                return False
            fotos = await fotos_do_ramo(str(lead.get("niche") or lead.get("role") or ""))
            site = await renderizar(lead, fotos, str(s.get("template") or ""), _do_site_anterior(dados))
            await update_site(uid, s["id"], str(site.get("company") or s.get("company") or ""), site["html"],
                              str(site.get("template") or ""), _com_carimbo(str(site.get("builder_data") or "")),
                              marcar_edicao=False)
            return True
    except Exception as exc:  # atualizar e um extra: nunca derruba o envio do link
        print(f"Falha ao atualizar a previa antiga: {type(exc).__name__}: {str(exc)[:80]}")
    return False


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
            str(site.get("template") or ""), lead_id, _com_carimbo(str(site.get("builder_data") or "")),
        )
        return f"{settings.APP_URL.rstrip('/')}/s/{criado['slug']}", ""
    except Exception as exc:  # o robô cai para "finalizando" e chama o dono; não derruba a conversa
        return "", f"{type(exc).__name__}: {str(exc)[:80]}"
