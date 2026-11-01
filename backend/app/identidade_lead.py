"""A identidade de um lead: o que ele mesmo mostra na internet (logo, fotos, cor da marca, Instagram).

Buscada UMA vez, quando o lead chega (junto do enriquecimento do site), e guardada no próprio lead. Na hora de montar a prévia
o motor já tem tudo: o site sai com a cara da pessoa e não com um modelo genérico. Nada é inventado: só entra o que a página
do lead ou o perfil público do Instagram dizem; se a página não responde, o campo fica vazio e o site usa o banco de imagens.
"""
import asyncio
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
}
# o Instagram só entrega as marcas og: para quem se apresenta como o robô de pré-visualização de links
HEADERS_PREVIA = {"User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)", "Accept-Language": "pt-BR,pt;q=0.9"}

RUIM_NA_IMAGEM = ("pixel", "spacer", "blank", "sprite", "icon-", "/icons/", "loading", "placeholder", "gravatar", "facebook.com/tr", "emoji", "badge", "whatsapp")
COR_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


def vazia() -> Dict[str, Any]:
    return {
        "logo": "", "foto_perfil": "", "imagens": [], "cor": "", "nome": "", "descricao": "",
        "instagram": "", "instagram_usuario": "", "seguidores": None, "publicacoes": None, "instagram_bio": "",
    }


def _https(base: str, href: str) -> str:
    if not href or href.startswith("data:"):
        return ""
    u = urljoin(base, href.strip())
    return u if u.startswith("https://") and len(u) < 400 and not any(r in u.lower() for r in RUIM_NA_IMAGEM) else ""


def _cor_valida(c: str) -> str:
    c = (c or "").strip()
    if not COR_RE.match(c):
        return ""
    if len(c) == 4:
        c = "#" + "".join(ch * 2 for ch in c[1:])
    r, g, b = (int(c[i:i + 2], 16) for i in (1, 3, 5))
    # branco, preto e cinza puro não são cor de marca
    if max(r, g, b) - min(r, g, b) < 28:
        return ""
    return c.lower()


def ler_site(html: str, base: str) -> Dict[str, Any]:
    """Logo, imagem de capa, fotos grandes, cor do tema e nome de exibição de uma página inicial."""
    out = vazia()
    soup = BeautifulSoup(html or "", "html.parser")

    def meta(*chaves: str) -> str:
        for k in chaves:
            t = soup.find("meta", attrs={"property": k}) or soup.find("meta", attrs={"name": k})
            if t and t.get("content"):
                return str(t["content"]).strip()
        return ""

    out["nome"] = meta("og:site_name")[:80]
    out["descricao"] = (meta("og:description", "description") or "")[:400]
    out["cor"] = _cor_valida(meta("theme-color", "msapplication-TileColor"))

    # logo: ícone grande do próprio site, ou a imagem com "logo" no nome dentro do topo da página
    for rel in ("apple-touch-icon", "apple-touch-icon-precomposed", "icon", "shortcut icon"):
        for t in soup.find_all("link", rel=lambda v: v and rel in (v if isinstance(v, str) else " ".join(v)).lower()):
            tam = str(t.get("sizes") or "")
            m = re.match(r"(\d+)x", tam)
            if m and int(m.group(1)) >= 96:
                u = _https(base, t.get("href", ""))
                if u and not u.lower().endswith(".svg"):
                    out["logo"] = u
                    break
        if out["logo"]:
            break
    if not out["logo"]:
        for img in soup.find_all("img", src=True)[:40]:
            marca = " ".join(str(img.get(a) or "") for a in ("src", "alt", "class", "id")).lower()
            if "logo" in marca and not marca.count("logos"):
                u = _https(base, img["src"])
                if u:
                    out["logo"] = u
                    break

    imagens: List[str] = []
    og = _https(base, meta("og:image", "twitter:image"))
    if og and og != out["logo"]:
        imagens.append(og)
    for img in soup.find_all("img", src=True)[:60]:
        try:
            larg = int(re.sub(r"\D", "", str(img.get("width") or "0")) or 0)
        except ValueError:
            larg = 0
        marca = " ".join(str(img.get(a) or "") for a in ("src", "alt", "class")).lower()
        if "logo" in marca:
            continue
        if larg and larg < 500:
            continue
        # sem largura declarada, só vale o que tem cara de foto do negócio
        if not larg and not re.search(r"\.(jpe?g|webp)(\?|$)", marca.split(" ")[0]):
            continue
        u = _https(base, img["src"])
        if u and u not in imagens and u != out["logo"]:
            imagens.append(u)
        if len(imagens) >= 5:
            break
    out["imagens"] = imagens[:5]
    return out


def ler_instagram(html: str, url: str) -> Dict[str, Any]:
    """Foto de perfil, bio e números do perfil público (as marcas og: da página)."""
    out = vazia()
    soup = BeautifulSoup(html or "", "html.parser")

    def meta(k: str) -> str:
        t = soup.find("meta", attrs={"property": k}) or soup.find("meta", attrs={"name": k})
        return str(t["content"]).strip() if t and t.get("content") else ""

    usuario = urlparse(url).path.strip("/").split("/")[0]
    if usuario and usuario.lower() not in ("p", "reel", "explore", "accounts"):
        out["instagram_usuario"] = usuario
        out["instagram"] = f"https://www.instagram.com/{usuario}/"
    foto = meta("og:image")
    if foto.startswith("https://"):
        out["foto_perfil"] = foto
    desc = meta("og:description")
    # "1,234 Followers, 56 Following, 78 Posts - Nome (@usuario) on Instagram: \"bio\""
    m = re.search(r"([\d.,]+\s*[KkMm]?)\s*(?:Followers|seguidores)", desc, re.I)
    if m:
        out["seguidores"] = _numero(m.group(1))
    m = re.search(r"([\d.,]+\s*[KkMm]?)\s*(?:Posts|publica)", desc, re.I)
    if m:
        out["publicacoes"] = _numero(m.group(1))
    m = re.search(r"Instagram:\s*[\"“](.+?)[\"”]\s*$", desc, re.S)
    if m:
        out["instagram_bio"] = re.sub(r"\s+", " ", m.group(1)).strip()[:300]
    t = meta("og:title")
    m = re.match(r"(.+?)\s*\(@", t)
    if m:
        out["nome"] = m.group(1).strip()[:80]
    return out


def _numero(txt: str) -> Optional[int]:
    t = txt.strip().lower().replace(" ", "")
    mult = 1
    if t.endswith("k"):
        mult, t = 1000, t[:-1]
    elif t.endswith("m"):
        mult, t = 1_000_000, t[:-1]
    # "2,345" e "2.345" são milhares; só "12,5K" / "1.2M" têm casa decimal
    t = t.replace(",", ".") if mult > 1 else re.sub(r"[.,]", "", t)
    try:
        return int(float(t) * mult)
    except ValueError:
        return None


async def buscar(site: str = "", instagram: str = "", cliente: Optional[httpx.AsyncClient] = None) -> Dict[str, Any]:
    """Junta o que o site e o perfil do Instagram mostram. Nunca levanta erro."""
    out = vazia()
    proprio = cliente is None
    cli = cliente or httpx.AsyncClient(timeout=httpx.Timeout(7.0, connect=4.0), verify=False, follow_redirects=True)

    async def baixar(url: str, cab: Dict[str, str]) -> str:
        try:
            r = await cli.get(url, headers=cab)
            if r.status_code == 200 and "text/html" in r.headers.get("content-type", ""):
                return r.text
        except Exception:
            pass
        return ""

    try:
        site_url = site if site.startswith("http") else (f"https://{site}" if site else "")
        eh_rede = any(d in site_url.lower() for d in ("instagram.com", "facebook.com", "linktr.ee", "wa.me", "whatsapp.com"))
        tarefas = []
        if site_url and not eh_rede:
            tarefas.append(baixar(site_url, HEADERS))
        else:
            tarefas.append(asyncio.sleep(0, result=""))
        tarefas.append(baixar(instagram, HEADERS_PREVIA) if instagram and "instagram.com" in instagram.lower() else asyncio.sleep(0, result=""))
        html_site, html_ig = await asyncio.gather(*tarefas)
        if html_site:
            s = ler_site(html_site, site_url)
            for k in ("logo", "cor", "nome", "descricao", "imagens"):
                out[k] = s[k]
        if html_ig:
            i = ler_instagram(html_ig, instagram)
            for k in ("foto_perfil", "instagram", "instagram_usuario", "seguidores", "publicacoes", "instagram_bio"):
                out[k] = i[k]
            out["nome"] = out["nome"] or i["nome"]
            # sem logo no site, a foto do perfil faz esse papel
            out["logo"] = out["logo"] or i["foto_perfil"]
    except Exception as exc:  # pragma: no cover - rede
        print(f"Identidade: falhou ({type(exc).__name__}: {str(exc)[:80]})")
    finally:
        if proprio:
            await cli.aclose()
    return out


def tem_algo(ident: Optional[Dict[str, Any]]) -> bool:
    return bool(ident and any(ident.get(k) for k in ("logo", "foto_perfil", "imagens", "cor", "instagram_bio", "descricao", "seguidores")))
