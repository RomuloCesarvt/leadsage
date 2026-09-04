import asyncio
import re
import unicodedata
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote_plus

import httpx

from app.models import LeadItem, LeadSocialLinks
from app.social_scraper import SocialScraper

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"

# Campos pedidos ao Google. Manter enxuto: cada campo entra no SKU cobrado.
FIELD_MASK = ",".join([
    "nextPageToken",
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.addressComponents",
    "places.businessStatus",
    "places.primaryTypeDisplayName",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.websiteUri",
    "places.googleMapsUri",
    "places.rating",
    "places.userRatingCount",
    "places.photos",
    "places.regularOpeningHours",
])

# Prazo do enriquecimento. A busca inteira precisa caber no limite da
# funcao serverless, entao o scraping trabalha com orcamento fixo.
ORCAMENTO_ENRIQUECIMENTO = 18.0

PAGE_SIZE = 20           # maximo que a Places API (New) aceita por requisicao
MAX_PAGES_PER_QUERY = 3  # 3 x 20 = ate 60 resultados por variacao de consulta

# Sinonimos por nicho: amplia a base sem depender de o usuario escrever
# exatamente o termo que o Google indexa.
NICHE_SYNONYMS: Dict[str, List[str]] = {
    "farmacia": ["farmácia", "drogaria", "farmácia de manipulação"],
    "farmaceutico": ["farmácia", "drogaria"],
    "medico": ["clínica médica", "consultório médico"],
    "clinica medica": ["clínica médica", "consultório médico"],
    "dentista": ["dentista", "clínica odontológica", "ortodontia"],
    "odontologica": ["clínica odontológica", "dentista"],
    "advogado": ["advogado", "escritório de advocacia"],
    "imobiliaria": ["imobiliária", "corretor de imóveis"],
    "corretor": ["corretor de imóveis", "imobiliária"],
    "academia": ["academia", "crossfit", "studio de treinamento"],
    "estetica": ["clínica de estética", "estética avançada", "harmonização facial"],
    "salao": ["salão de beleza", "cabeleireiro"],
    "barbearia": ["barbearia", "barber shop"],
    "pet shop": ["pet shop", "clínica veterinária", "banho e tosa"],
    "restaurante": ["restaurante", "bistrô"],
    "padaria": ["padaria", "panificadora", "confeitaria"],
    "pizzaria": ["pizzaria"],
    "cafeteria": ["cafeteria", "café"],
    "contabilidade": ["escritório de contabilidade", "contador"],
    "marketing": ["agência de marketing", "agência de publicidade"],
    "arquiteto": ["arquiteto", "escritório de arquitetura"],
    "mecanica": ["oficina mecânica", "auto center"],
    "nutricionista": ["nutricionista", "clínica de nutrição"],
    "fisioterapeuta": ["fisioterapeuta", "clínica de fisioterapia"],
    "escola": ["escola", "colégio", "curso"],
    "supermercado": ["supermercado", "mercado"],
}

_UF_RE = re.compile(r"^[A-Z]{2}$")

# O campo websiteUri do Google raramente e um site proprio. Vem perfil de
# rede social, linktree, cardapio de delivery ou ate link de WhatsApp.
# Tratar tudo como "tem site" apagava justamente o lead mais vendavel:
# o negocio que so existe no Instagram e precisa de um site.
SOCIAL_AS_SITE = ("instagram.com", "facebook.com", "linkedin.com", "tiktok.com", "twitter.com", "x.com")
AGGREGATOR_AS_SITE = (
    "linktr.ee", "linktree", "beacons.ai", "bio.link", "ifood.com", "goomer",
    "prefirodelivery", "delivery.com", "rappi", "aiqfome", "anota.ai",
    "menudino", "cardapioweb", "abrhil", "google.com/maps",
)
WHATSAPP_AS_SITE = ("wa.me", "api.whatsapp.com", "whatsapp.com/send")


def classify_website(url: str) -> Tuple[str, str]:
    """Diz o que o campo websiteUri realmente e.

    Devolve (tipo, url) com tipo em: own, social, aggregator, whatsapp, none.
    """
    if not url:
        return "none", ""
    low = url.lower()
    if any(d in low for d in WHATSAPP_AS_SITE):
        return "whatsapp", url
    if any(d in low for d in SOCIAL_AS_SITE):
        return "social", url
    if any(d in low for d in AGGREGATOR_AS_SITE):
        return "aggregator", url
    return "own", url


def whatsapp_from_url(url: str) -> str:
    """Extrai o numero de um link wa.me / api.whatsapp.com."""
    match = re.search(r"(?:wa\.me/|phone=)(\+?\d{8,15})", url or "")
    if not match:
        return ""
    digits = re.sub(r"\D", "", match.group(1))
    return digits if 10 <= len(digits) <= 15 else ""


def strip_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", text or "") if unicodedata.category(c) != "Mn"
    )


def normalize_key(text: str) -> str:
    return strip_accents(text).lower().strip()


def niche_variants(niche: str) -> List[str]:
    """Termo do usuario + sinonimos conhecidos, sem repetir."""
    base = (niche or "").strip()
    key = normalize_key(base)
    variants = [base] if base else []

    for slug, synonyms in NICHE_SYNONYMS.items():
        if slug in key or key in slug:
            variants.extend(synonyms)
            break

    seen, out = set(), []
    for variant in variants:
        k = normalize_key(variant)
        if k and k not in seen:
            seen.add(k)
            out.append(variant)
    return out or [base or "empresa"]


def parse_location(location: str) -> Tuple[str, str, str]:
    """Separa 'Bairro, Cidade, UF, Pais' em (consulta, cidade, uf).

    O codigo anterior colava ', SP' em qualquer local que nao contivesse
    SP/RJ/MG/PR, corrompendo a busca em 23 dos 27 estados brasileiros.
    """
    raw = (location or "").strip()
    if not raw:
        return "", "", ""

    parts = [p.strip() for p in raw.split(",") if p.strip()]
    if parts and normalize_key(parts[-1]) in ("brasil", "brazil", "br"):
        parts = parts[:-1]

    uf = ""
    for part in reversed(parts):
        if _UF_RE.match(part.upper()) and len(part) == 2:
            uf = part.upper()
            break

    city = ""
    for part in reversed(parts):
        if part.upper() != uf:
            city = part
            break

    return ", ".join(parts), city, uf


def extract_component(place: Dict[str, Any], wanted: Tuple[str, ...], short: bool = False) -> str:
    for component in place.get("addressComponents") or []:
        if any(t in component.get("types", []) for t in wanted):
            key = "shortText" if short else "longText"
            return component.get(key) or component.get("longText") or ""
    return ""


def extract_city(place: Dict[str, Any], fallback: str) -> str:
    """Cidade real, lida de addressComponents.

    O codigo anterior usava address.split(',')[0], que devolvia o nome da
    RUA ('R. Bahia', 'Alameda Padua') no lugar da cidade.
    """
    return extract_component(place, ("locality", "administrative_area_level_2")) or fallback


def normalize_phone(national: str, international: str) -> Tuple[str, bool]:
    """Normaliza para E.164 sem '+' e detecta celular brasileiro."""
    source = (international or national or "").strip()
    digits = re.sub(r"\D", "", source)
    if not digits:
        return "", False

    if not source.startswith("+") and not digits.startswith("55"):
        digits = "55" + digits

    # BR: 55 + DDD(2) + 9 + 8 digitos = 13. O '9' de celular fica na posicao 4.
    is_mobile = digits.startswith("55") and len(digits) == 13 and digits[4] == "9"
    return digits, is_mobile


def score_lead(
    has_own_website: bool,
    has_instagram: bool,
    has_facebook: bool,
    has_email: bool,
    has_phone: bool,
    has_whatsapp: bool,
    rating: float,
    rating_count: int,
) -> Tuple[int, int, List[str]]:
    """Pontuacao deterministica. Substitui random.uniform(50, 80).

    opportunity = o quanto o lead PRECISA do servico (lacunas digitais).
    quality     = o quanto ele e acionavel (da para falar com ele?).
    """
    missing: List[str] = []
    opportunity = 40

    if not has_own_website:
        opportunity += 25
        missing.append("website")
    if not has_instagram:
        opportunity += 15
        missing.append("instagram")
    if not has_facebook:
        opportunity += 5
        missing.append("facebook")
    if not has_email:
        missing.append("email")
    if not has_phone:
        missing.append("telefone")
    elif not has_whatsapp:
        missing.append("whatsapp")

    # Negocio com movimento real vale mais o contato
    if rating_count >= 200:
        opportunity += 10
    elif rating_count >= 50:
        opportunity += 6
    elif rating_count >= 10:
        opportunity += 3

    # Nota alta = negocio bom que so peca no digital: melhor alvo
    if rating >= 4.5:
        opportunity += 5
    elif 0 < rating < 3.5:
        opportunity -= 5

    quality = 30
    if has_phone:
        quality += 20
    if has_whatsapp:
        quality += 15
    if has_email:
        quality += 20
    if has_instagram:
        quality += 10
    if rating_count >= 20:
        quality += 5

    return max(1, min(99, opportunity)), max(1, min(99, quality)), missing


def build_summary(
    company: str, city: str, rating: float, rating_count: int, missing: List[str], bio: str
) -> str:
    parts = [f"{company} em {city}." if city else f"{company}."]
    if rating and rating_count:
        parts.append(f"Nota {rating:.1f} no Google com {rating_count} avaliações.")
    elif rating_count:
        parts.append(f"{rating_count} avaliações no Google.")
    else:
        parts.append("Ainda sem avaliações relevantes no Google.")

    gaps = [g for g in missing if g in ("website", "instagram", "facebook")]
    if gaps:
        parts.append("Lacuna digital: sem " + ", sem ".join(gaps) + ".")
    else:
        parts.append("Presença digital montada — a oportunidade está em conversão, não em existir.")

    if bio:
        parts.append(f"Sobre: {bio[:180].strip()}")
    return " ".join(parts)


class LeadsEngine:
    @staticmethod
    async def _fetch_page(
        client: httpx.AsyncClient, api_key: str, text_query: str, page_token: Optional[str] = None
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "textQuery": text_query,
            "languageCode": "pt-BR",
            "regionCode": "BR",
            "pageSize": PAGE_SIZE,
        }
        if page_token:
            payload["pageToken"] = page_token

        resp = await client.post(
            PLACES_URL,
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": FIELD_MASK,
            },
            json=payload,
        )
        data = resp.json()
        if resp.status_code != 200:
            message = data.get("error", {}).get("message", "erro desconhecido")
            raise ValueError(f"Erro na API do Google Maps: {message}")
        return data

    @staticmethod
    async def _collect_places(api_key: str, queries: List[str], target: int) -> List[Dict[str, Any]]:
        """Pagina e combina varias consultas ate o alvo, sem repetir estabelecimento."""
        seen: set = set()
        places: List[Dict[str, Any]] = []

        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=8.0)) as client:
            for query in queries:
                token: Optional[str] = None
                for _ in range(MAX_PAGES_PER_QUERY):
                    try:
                        data = await LeadsEngine._fetch_page(client, api_key, query, token)
                    except ValueError:
                        # Falhar na primeira consulta indica chave/quota: propaga.
                        # Nas seguintes, o que ja foi coletado ainda serve.
                        if not places:
                            raise
                        break

                    for place in data.get("places", []):
                        pid = place.get("id")
                        if not pid or pid in seen:
                            continue
                        if place.get("businessStatus") == "CLOSED_PERMANENTLY":
                            continue
                        seen.add(pid)
                        places.append(place)

                    token = data.get("nextPageToken")
                    if not token or len(places) >= target:
                        break
                if len(places) >= target:
                    break
        return places

    @staticmethod
    def _to_lead(
        place: Dict[str, Any], niche: str, fallback_city: str, fallback_uf: str
    ) -> Tuple[LeadItem, str]:
        company = place.get("displayName", {}).get("text", "Empresa sem nome")
        address = place.get("formattedAddress", "")
        city = extract_city(place, fallback_city)
        uf = extract_component(place, ("administrative_area_level_1",), short=True) or fallback_uf
        raw_website = place.get("websiteUri") or ""
        site_kind, _ = classify_website(raw_website)
        # `website` guarda so site proprio. O resto vai para o campo certo.
        website = raw_website if site_kind == "own" else ""
        rating = float(place.get("rating") or 0.0)
        rating_count = int(place.get("userRatingCount") or 0)

        phone, is_mobile = normalize_phone(
            place.get("nationalPhoneNumber", ""), place.get("internationalPhoneNumber", "")
        )

        socials = LeadSocialLinks(website=website or None)
        if site_kind == "social":
            low = raw_website.lower()
            if "instagram.com" in low:
                socials.instagram = raw_website
            elif "facebook.com" in low:
                socials.facebook = raw_website
            elif "linkedin.com" in low:
                socials.linkedin = raw_website
            elif "tiktok.com" in low:
                socials.tiktok = raw_website
            else:
                socials.x_twitter = raw_website
        elif site_kind == "whatsapp":
            # O "site" e um link de WhatsApp: numero real de contato
            number = whatsapp_from_url(raw_website)
            if number:
                phone = phone or number
                is_mobile = True

        photos = place.get("photos") or []
        if photos and photos[0].get("name"):
            # Proxy no proprio backend: nao expoe a chave do Maps no HTML
            avatar = f"/api/place-photo?name={quote_plus(photos[0]['name'])}"
        else:
            avatar = (
                f"https://ui-avatars.com/api/?name={quote_plus(company[:40])}"
                "&background=0D6EFD&color=fff&size=150"
            )

        hours = place.get("regularOpeningHours") or {}
        weekday = hours.get("weekdayDescriptions") or []

        return LeadItem(
            id=place.get("id", ""),
            name=company,
            company=company,
            role=(place.get("primaryTypeDisplayName") or {}).get("text") or niche,
            niche=niche,
            city=city,
            location=f"{city} - {uf}" if uf else (city or address),
            email="",
            phone=phone,
            whatsapp=is_mobile,
            website=website,
            address=address,
            avatar=avatar,
            rating=rating or None,
            rating_count=rating_count or None,
            maps_url=place.get("googleMapsUri"),
            business_status=place.get("businessStatus"),
            opening_hours="; ".join(weekday[:3]) if weekday else None,
            verified=True,
            quality_score=0,
            opportunityScore=0,
            missingDigitalAssets=[],
            socials=socials,
        ), raw_website

    @staticmethod
    async def search_leads(
        niche: str,
        location: str,
        query: str = "",
        limit: int = 10,
        api_key: str = None,
        enrich: bool = True,
    ) -> List[LeadItem]:
        if not api_key:
            raise ValueError("Chave da API do Google Maps ausente.")

        limit = max(1, min(int(limit or 10), 60))
        location_query, fallback_city, fallback_uf = parse_location(location)

        extra = (query or "").strip()
        queries: List[str] = []
        for variant in niche_variants(niche):
            term = f"{variant} {extra}".strip()
            queries.append(f"{term} em {location_query}" if location_query else term)

        places = await LeadsEngine._collect_places(api_key, queries, limit)
        if not places:
            return []

        built = [
            LeadsEngine._to_lead(place, niche, fallback_city, fallback_uf)
            for place in places[:limit]
        ]
        leads = [lead for lead, _ in built]
        # Scrapeia a URL bruta (linktree e perfil social ainda rendem contato),
        # nao a filtrada, que so guarda site proprio.
        raw_sites = [raw for _, raw in built]

        enrichments: List[Dict[str, Any]] = [{} for _ in leads]
        if enrich:
            # O enriquecimento visita o site de cada lead, e um site lento
            # trava a busca inteira. Com prazo, o que voltou a tempo é
            # aproveitado e o resto sai sem as redes — melhor do que a
            # requisição estourar o limite da Vercel e o usuário não
            # receber lead nenhum.
            try:
                enrichments = await asyncio.wait_for(
                    SocialScraper.enrich_many(
                        [
                            {"company": l.company, "city": l.city, "website": raw}
                            for l, raw in zip(leads, raw_sites)
                        ]
                    ),
                    timeout=ORCAMENTO_ENRIQUECIMENTO,
                )
            except asyncio.TimeoutError:
                print("Enriquecimento excedeu o prazo; devolvendo leads sem as redes.")
            except Exception as exc:
                print(f"Enriquecimento falhou, seguindo sem ele: {exc}")

        for lead, data in zip(leads, enrichments):
            data = data or {}
            # so preenche o que ainda esta vazio: nao apaga o que veio do Maps
            for field, key in (
                ("instagram", "instagram"), ("facebook", "facebook"),
                ("linkedin", "linkedin"), ("x_twitter", "twitter"), ("tiktok", "tiktok"),
            ):
                if not getattr(lead.socials, field) and data.get(key):
                    setattr(lead.socials, field, data[key])

            # Email REAL extraido do site. Nunca montado a partir do nome.
            emails = data.get("emails") or []
            lead.email = emails[0] if emails else ""
            lead.all_emails = emails[:5]

            # Link wa.me tem prioridade sobre o palpite pelo prefixo do telefone
            wa_numbers = data.get("whatsapp_numbers") or []
            if wa_numbers:
                lead.whatsapp = True
                if not lead.phone:
                    lead.phone = wa_numbers[0]

            if data.get("bio"):
                lead.bio = data["bio"][:400]

            opportunity, quality, missing = score_lead(
                has_own_website=bool(lead.website),
                has_instagram=bool(lead.socials.instagram),
                has_facebook=bool(lead.socials.facebook),
                has_email=bool(lead.email),
                has_phone=bool(lead.phone),
                has_whatsapp=bool(lead.whatsapp),
                rating=lead.rating or 0.0,
                rating_count=lead.rating_count or 0,
            )
            lead.opportunityScore = opportunity
            lead.quality_score = quality
            lead.missingDigitalAssets = missing
            lead.contactability = sum([
                bool(lead.phone), bool(lead.whatsapp), bool(lead.email), bool(lead.socials.instagram)
            ])
            lead.ai_summary = build_summary(
                lead.company, lead.city, lead.rating or 0.0, lead.rating_count or 0,
                missing, lead.bio or ""
            )

        # Primeiro quem da para contatar, depois quem mais precisa do servico
        leads.sort(
            key=lambda l: ((l.contactability or 0) * 25 + (l.opportunityScore or 0)), reverse=True
        )
        return leads
