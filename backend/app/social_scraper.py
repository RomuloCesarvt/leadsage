import asyncio
import re
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.lead_intel import analisar_site, qualidade_do_site

# Enderecos que aparecem em sites mas nunca sao contato real do negocio
EMAIL_BLOCKLIST = (
    "sentry.io", "sentry-next", "wixpress.com", "example.com", "example.org",
    "domain.com", "seudominio", "seuemail", "email.com", "godaddy", "wordpress.org",
    "squarespace", "shopify.com", "jquery", "schema.org", "w3.org", "sentry",
    "core-js", "npmjs", "@2x", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp",
    "no-reply", "noreply", "postmaster", "abuse@",
)

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
WHATSAPP_RE = re.compile(
    r"(?:wa\.me/|api\.whatsapp\.com/send\?phone=|whatsapp\.com/send/\?phone=)(\+?\d{8,15})"
)

# Paginas que costumam concentrar os dados de contato
CONTACT_PATHS = ("/contato", "/contact", "/fale-conosco", "/sobre", "/about")
CONTACT_HINTS = ("contato", "contact", "fale", "sobre", "quem-somos", "about")

SOCIAL_DOMAINS = {
    "instagram": "instagram.com/",
    "facebook": "facebook.com/",
    "linkedin": "linkedin.com/",
    "tiktok": "tiktok.com/",
    "twitter": "twitter.com/",
    "youtube": "youtube.com/",
}

# Caminhos que nao sao perfil (botao de compartilhar, login, politica...)
SOCIAL_NOISE = (
    "/sharer", "/share.php", "/share?", "/intent/", "/login", "/signup",
    "/policy", "/privacy", "/help", "/legal", "/developers", "/plugins",
    "instagram.com/p/", "instagram.com/explore", "facebook.com/tr?",
)

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
}

CONTACT_LOCALS = ("contato", "contact", "comercial", "vendas", "atendimento", "faleconosco", "sac")


# Telefone escrito na pagina: "(11) 3456-7890", "11 98765-4321",
# "+55 11 98765 4321". Fora desses formatos o risco de capturar CNPJ,
# CEP ou codigo de produto passa a ser maior que o ganho.
TELEFONE_RE = re.compile(
    r"(?:\+?55[\s.-]?)?(?:\(?\d{2}\)?[\s.-]?)?(?:9[\s.-]?)?\d{4}[\s.-]?\d{4}"
)


def empty_result() -> Dict[str, Any]:
    return {
        "instagram": None,
        "linkedin": None,
        "facebook": None,
        "twitter": None,
        "tiktok": None,
        "youtube": None,
        "emails": [],
        "whatsapp_numbers": [],
        "phones": [],
        "bio": "",
        # Diagnostico do site: o que ele tem, o que falta e quanto vale.
        # E o que transforma "faca um site" em "seu site nao abre no
        # celular", que e uma frase que o dono confere em dez segundos.
        "site": {},
        "site_quality": None,
        "site_issues": [],
    }


def limpar_telefone(bruto: str) -> Optional[str]:
    """Normaliza para digitos e recusa o que nao forma telefone brasileiro."""
    digitos = re.sub(r"\D", "", bruto or "")
    if digitos.startswith("55") and len(digitos) in (12, 13):
        digitos = digitos[2:]
    if len(digitos) == 8 or len(digitos) == 9:
        return None  # sem DDD nao da para discar
    if len(digitos) not in (10, 11):
        return None
    ddd = int(digitos[:2])
    if not 11 <= ddd <= 99:
        return None
    if len(digitos) == 11 and digitos[2] != "9":
        return None
    # 00000000, 11111111: mascara de formulario, nao telefone
    if len(set(digitos[2:])) <= 2:
        return None
    return "55" + digitos


def normalize_url(url: str) -> str:
    if not url:
        return ""
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    return url


def _is_social_profile(href: str, domain: str) -> bool:
    low = href.lower()
    if domain not in low:
        return False
    if any(noise in low for noise in SOCIAL_NOISE):
        return False
    # Precisa haver algo depois do dominio: o handle do perfil
    return len(low.split(domain, 1)[1].strip("/")) > 1


def clean_email(raw: str) -> Optional[str]:
    email = raw.strip().strip(".,;:'\"").lower()
    if any(bad in email for bad in EMAIL_BLOCKLIST):
        return None
    if len(email) > 80 or email.count("@") != 1:
        return None
    local, _, domain = email.partition("@")
    if not local or "." not in domain:
        return None
    # Hashes e ids de asset que o regex confunde com email
    if len(local) > 40 or re.fullmatch(r"[0-9a-f]{16,}", local):
        return None
    if domain.split(".")[-1].isdigit():
        return None
    return email


def score_email(email: str, site_domain: str) -> int:
    """Prioriza email do proprio dominio e prefixo comercial."""
    score = 0
    local, _, domain = email.partition("@")
    if site_domain and site_domain in domain:
        score += 10
    if local in CONTACT_LOCALS:
        score += 5
    elif local in ("info", "financeiro", "adm", "administrativo"):
        score += 2
    if domain.endswith((".com.br", ".com", ".br")):
        score += 1
    return score


def texto_visivel(soup: BeautifulSoup) -> str:
    """Texto da pagina sem script/style: evita casar telefone dentro de JS."""
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    return soup.get_text(" ", strip=True)[:60_000]


class SocialScraper:
    """Enriquecimento por scraping real do site do lead.

    Substitui a busca via DuckDuckGo, que nos testes devolvia zero
    resultados uteis (0 acertos em 3 consultas, 2 delas bloqueadas)
    e custava cerca de 1s por lead sem entregar nada.
    """

    @staticmethod
    def parse_page(html: str, base_url: str, result: Dict[str, Any]) -> List[str]:
        """Extrai contatos da pagina. Devolve links internos de contato."""
        soup = BeautifulSoup(html, "html.parser")
        site_domain = urlparse(base_url).netloc.replace("www.", "")
        contact_links: List[str] = []

        for match in EMAIL_RE.findall(html):
            email = clean_email(match)
            if email and email not in result["emails"]:
                result["emails"].append(email)

        for match in WHATSAPP_RE.findall(html):
            number = re.sub(r"\D", "", match)
            if 10 <= len(number) <= 15 and number not in result["whatsapp_numbers"]:
                result["whatsapp_numbers"].append(number)

        # Telefone do rodape e da pagina de contato. Vale mais do que o
        # do Google quando o negocio mudou de numero e nao atualizou o
        # perfil — acontece o tempo todo com quem trocou para celular.
        for bruto in TELEFONE_RE.findall(texto_visivel(soup))[:12]:
            numero = limpar_telefone(bruto)
            if numero and numero not in result["phones"]:
                result["phones"].append(numero)

        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"].strip()
            low = href.lower()

            if low.startswith("mailto:"):
                email = clean_email(low[7:].split("?")[0])
                if email and email not in result["emails"]:
                    result["emails"].append(email)
                continue

            for key, domain in SOCIAL_DOMAINS.items():
                if not result.get(key) and _is_social_profile(href, domain):
                    result[key] = href if href.startswith("http") else urljoin(base_url, href)

            if any(hint in low for hint in CONTACT_HINTS):
                absolute = urljoin(base_url, href).split("#")[0]
                if urlparse(absolute).netloc.replace("www.", "") == site_domain:
                    contact_links.append(absolute)

        if not result["bio"]:
            meta = soup.find("meta", attrs={"name": "description"}) or soup.find(
                "meta", attrs={"property": "og:description"}
            )
            if meta and meta.get("content"):
                result["bio"] = meta["content"].strip()[:400]
            else:
                paragraphs = [p.get_text(strip=True) for p in soup.find_all("p")]
                paragraphs = [p for p in paragraphs if len(p) > 60]
                if paragraphs:
                    result["bio"] = " ".join(paragraphs[:2])[:400]

        return contact_links

    @staticmethod
    async def scrape_website(url: str, max_extra_pages: int = 1) -> Dict[str, Any]:
        """Baixa a home e, se ainda faltar contato, uma pagina de contato."""
        result = empty_result()
        url = normalize_url(url)
        if not url:
            return result

        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(8.0, connect=4.0),
                verify=False,
                follow_redirects=True,
                headers=BROWSER_HEADERS,
            ) as client:
                inicio = time.monotonic()
                try:
                    resp = await client.get(url)
                except Exception:
                    # O site consta no Google mas nao responde. Isso e um
                    # achado, nao um vazio: o lead esta pagando dominio
                    # para mandar o cliente a uma pagina de erro.
                    result["site"] = analisar_site("", url, 0, 0)
                    result["site_quality"], result["site_issues"] = qualidade_do_site(
                        result["site"], datetime.now().year
                    )
                    return result
                if resp.status_code != 200 or "text/html" not in resp.headers.get("content-type", ""):
                    result["site"] = analisar_site("", str(resp.url), resp.status_code, 0)
                    result["site_quality"], result["site_issues"] = qualidade_do_site(
                        result["site"], datetime.now().year
                    )
                    return result

                base = str(resp.url)
                contact_links = SocialScraper.parse_page(resp.text, base, result)

                # Diagnostico do site: e daqui que sai a frase que abre a
                # conversa. "Voce precisa de um site" nao vende para quem
                # ja tem um; "seu site nao abre no celular" vende.
                sinais = analisar_site(
                    resp.text, base, resp.status_code, (time.monotonic() - inicio) * 1000
                )
                nota, problemas = qualidade_do_site(sinais, datetime.now().year)
                result["site"] = sinais
                result["site_quality"] = nota
                result["site_issues"] = problemas

                # Ja temos o essencial: nao gasta uma segunda requisicao
                if result["emails"] and result["instagram"]:
                    return result

                candidates: List[str] = []
                for link in contact_links:
                    if link not in candidates and link.rstrip("/") != base.rstrip("/"):
                        candidates.append(link)
                for path in CONTACT_PATHS:
                    guess = urljoin(base, path)
                    if guess not in candidates:
                        candidates.append(guess)

                for candidate in candidates[:max_extra_pages]:
                    try:
                        sub = await client.get(candidate)
                    except Exception:
                        continue
                    if sub.status_code == 200 and "text/html" in sub.headers.get("content-type", ""):
                        SocialScraper.parse_page(sub.text, str(sub.url), result)
                        if result["emails"]:
                            break
        except Exception as exc:  # pragma: no cover - falha de rede
            print(f"Scraping error for {url}: {exc}")

        return result

    @staticmethod
    async def enrich_lead(company_name: str, city: str, website: str) -> Dict[str, Any]:
        """Enriquece um lead a partir do site informado pelo Google Maps."""
        data = empty_result()
        website = normalize_url(website)
        if not website:
            return data

        low = website.lower()
        is_aggregator = "linktr.ee" in low or "linktree" in low

        # O "site" do Google as vezes ja e a propria rede social do negocio
        direct_social = None
        for key, domain in SOCIAL_DOMAINS.items():
            if domain in low:
                data[key] = website
                direct_social = key
                break

        # Rede social nao vale scrapear (exige login e bloqueia bot).
        # Linktree vale: costuma listar todas as redes num HTML simples.
        if direct_social and not is_aggregator:
            return data

        scraped = await SocialScraper.scrape_website(website)
        for key, value in scraped.items():
            if key in ("emails", "whatsapp_numbers", "phones", "site", "site_issues"):
                data[key] = value
            elif key == "site_quality":
                data[key] = value
            elif value and not data.get(key):
                data[key] = value

        site_domain = urlparse(website).netloc.replace("www.", "")
        data["emails"].sort(key=lambda e: score_email(e, site_domain), reverse=True)
        return data

    @staticmethod
    async def enrich_many(
        targets: List[Dict[str, str]], concurrency: int = 8
    ) -> List[Dict[str, Any]]:
        """Enriquece varios leads em paralelo, com teto de concorrencia."""
        sem = asyncio.Semaphore(concurrency)

        async def bounded(item: Dict[str, str]) -> Dict[str, Any]:
            async with sem:
                try:
                    return await SocialScraper.enrich_lead(
                        item.get("company", ""), item.get("city", ""), item.get("website", "")
                    )
                except Exception:
                    return empty_result()

        return await asyncio.gather(*[bounded(t) for t in targets])
