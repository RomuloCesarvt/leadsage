import asyncio
import os
import re
import unicodedata
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote_plus

import httpx

from app.lead_intel import (
    faixa_de_preco,
    ler_avaliacoes,
    melhor_canal,
    montar_diagnostico,
    montar_ganchos,
)
from app.models import LeadItem, LeadSocialLinks
from app.social_scraper import SocialScraper

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"

# Campos pedidos ao Google, em duas camadas.
#
# A camada essencial e o que a busca nao pode perder: sem ela nao ha
# lead. A camada rica traz o que transforma uma linha de lista em uma
# conversa — o que o Google escreveu sobre o negocio, a faixa de preco,
# as avaliacoes com texto, o horario de hoje, a coordenada.
#
# Cada campo entra no SKU cobrado, e alguns exigem faturamento ativo.
# Por isso a camada rica e opcional em tempo de execucao: se o Google
# recusar a mascara, a busca refaz a chamada so com o essencial em vez
# de devolver erro.
CAMPOS_ESSENCIAIS = [
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
]

CAMPOS_RICOS = [
    "places.shortFormattedAddress",
    "places.location",
    "places.types",
    "places.primaryType",
    "places.currentOpeningHours",
    "places.editorialSummary",
    "places.priceLevel",
]

# O texto das avaliacoes e o melhor material de abordagem que existe:
# citar o que um cliente escreveu no Google e a mensagem que mais recebe
# resposta. Mas `places.reviews` cai no SKU Enterprise + Atmosphere, o
# mais caro da Places API.
#
# Medido nesta conta em 2026-09-21: o Google ACEITA o campo na mascara e
# devolve a lista vazia em todos os resultados — mesmo comportamento de
# `places.photos`, que tambem volta vazio aqui. Pedir um campo que nao
# vem e so risco de cobranca, entao ele fica desligado por padrao.
#
# `LEADSAGE_PLACES_REVIEWS=1` liga quando o faturamento da conta estiver
# ativo; o codigo que le as avaliacoes (lead_intel.ler_avaliacoes) ja
# esta pronto e passa a produzir destaque e amostra na hora.
PEDIR_AVALIACOES = os.getenv("LEADSAGE_PLACES_REVIEWS", "") == "1"

FIELD_MASK = ",".join(CAMPOS_ESSENCIAIS)
MASCARA_RICA = ",".join(
    CAMPOS_ESSENCIAIS + CAMPOS_RICOS + (["places.reviews"] if PEDIR_AVALIACOES else [])
)

# Uma recusa vale para o processo inteiro: se a conta nao tem direito ao
# campo agora, nao vai ter na proxima pagina. Sem esta memoria, cada
# chamada pagaria uma tentativa perdida.
_mascara_rica_ativa = True


class MascaraRecusada(Exception):
    """O Google recusou a mascara rica. Refazer a chamada com a basica."""


def _e_recusa_de_mascara(bruta: str, status: int) -> bool:
    texto = (bruta or "").lower()
    if status not in (400, 403):
        return False
    return any(
        marca in texto
        for marca in ("field mask", "fieldmask", "unknown name", "invalid field",
                      "not supported", "unsupported", "enterprise", "sku")
    )

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


def traduzir_erro_do_google(bruta: str, status: int = 0) -> str:
    """Transforma a recusa da Places API em algo acionavel.

    O usuario nao pode fazer nada com "Quota exceeded for quota metric
    \'SearchTextRequest\'" — e nao deveria ler o numero do nosso projeto
    do Google Cloud. Quem precisa do texto tecnico e o log.
    """
    texto = (bruta or "").lower()

    if "quota" in texto or status == 429:
        return (
            "O limite diario de buscas foi atingido. Ele zera automaticamente "
            "amanha; se precisar de mais hoje, fale com o suporte."
        )
    if "api key" in texto or "api_key" in texto or "unregistered" in texto:
        return "A busca esta indisponivel por um problema de configuracao. Ja estamos vendo isso."
    if "has not been used" in texto or "is disabled" in texto or "permission" in texto:
        return "A busca esta temporariamente indisponivel. Ja estamos vendo isso."
    if "billing" in texto:
        return "A busca esta temporariamente indisponivel. Ja estamos vendo isso."
    if status >= 500:
        return "O Google nao respondeu agora. Tente de novo em alguns instantes."

    return "Nao foi possivel concluir a busca agora. Tente de novo em alguns instantes."


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
    """Normaliza para E.164 sem '+' e detecta celular brasileiro.

    Devolve vazio quando o numero nao forma algo discavel. Isso acontece
    de verdade: ha estabelecimento cadastrado no Google sem o DDD, e o
    proprio Google devolve "+55 38159352". Repassando, o 38 viraria DDD
    de Minas Gerais e o link de WhatsApp levaria a um desconhecido —
    pior do que nao ter telefone.
    """
    source = (international or national or "").strip()
    digits = re.sub(r"\D", "", source)
    if not digits:
        return "", False

    if not source.startswith("+") and not digits.startswith("55"):
        digits = "55" + digits

    if digits.startswith("55"):
        # BR: 55 + DDD(2) + 8 (fixo) ou + 9 + 8 (celular)
        nacional = digits[2:]
        if len(nacional) not in (10, 11):
            return "", False
        ddd = int(nacional[:2])
        # DDD brasileiro vai de 11 a 99, e nenhum comeca com 0 ou 1 no
        # segundo digito abaixo de 11
        if not 11 <= ddd <= 99:
            return "", False
        is_mobile = len(nacional) == 11 and nacional[2] == "9"
        return digits, is_mobile

    # Numero de fora do Brasil: aceita o que veio, dentro do tamanho E.164
    if not 8 <= len(digits) <= 15:
        return "", False
    return digits, False


def score_lead(
    has_own_website: bool,
    has_instagram: bool,
    has_facebook: bool,
    has_email: bool,
    has_phone: bool,
    has_whatsapp: bool,
    rating: float,
    rating_count: int,
    *,
    site_quality: Optional[int] = None,
    tem_avaliacao_com_texto: bool = False,
) -> Tuple[int, int, List[str]]:
    """Pontuacao deterministica. Substitui random.uniform(50, 80).

    opportunity = o quanto o lead PRECISA do servico (lacunas digitais).
    quality     = o quanto ele e acionavel (da para falar com ele?).

    `site_quality` e a nota do diagnostico do site (0-100). Quem TEM site
    deixava de ser oportunidade no modelo antigo, o que e falso: site que
    nao abre no celular ou nao tem telefone na pagina e venda de reforma,
    muitas vezes mais facil do que venda de construcao — o dono ja
    aceitou que precisa de site, so nao sabe que o dele nao funciona.
    """
    missing: List[str] = []
    opportunity = 40

    if not has_own_website:
        opportunity += 25
        missing.append("website")
    elif isinstance(site_quality, int):
        # Site existe: o tamanho da oportunidade e o tamanho do defeito.
        if site_quality < 40:
            opportunity += 22
            missing.append("site funcional")
        elif site_quality < 60:
            opportunity += 14
            missing.append("site adequado ao celular")
        elif site_quality < 80:
            opportunity += 7
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

    # Negocio de quem os clientes falam da assunto para a abordagem
    if tem_avaliacao_com_texto:
        opportunity += 3

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
    if tem_avaliacao_com_texto:
        # Da para abrir a conversa citando o que um cliente escreveu:
        # e a abordagem que mais recebe resposta.
        quality += 5

    return max(1, min(99, opportunity)), max(1, min(99, quality)), missing


class LeadsEngine:
    @staticmethod
    async def _fetch_page(
        client: httpx.AsyncClient,
        api_key: str,
        text_query: str,
        page_token: Optional[str] = None,
        rica: bool = True,
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
                "X-Goog-FieldMask": MASCARA_RICA if rica else FIELD_MASK,
            },
            json=payload,
        )
        data = resp.json()
        if resp.status_code != 200:
            bruta = data.get("error", {}).get("message", "erro desconhecido")
            # O texto do Google vai inteiro para a tela: ja mandou o
            # numero do projeto do Google Cloud para o usuario final, e
            # em ingles, dizendo coisa que so o dono do sistema resolve.
            print(f"Places API recusou ({resp.status_code}): {bruta}")
            if rica and _e_recusa_de_mascara(bruta, resp.status_code):
                raise MascaraRecusada(bruta)
            raise ValueError(traduzir_erro_do_google(bruta, resp.status_code))
        return data

    @staticmethod
    async def _pagina(
        client: httpx.AsyncClient, api_key: str, consulta: str, token: Optional[str]
    ) -> Dict[str, Any]:
        """Busca uma pagina, caindo para a mascara basica se preciso.

        A degradacao acontece uma vez por processo: a partir da recusa,
        todas as chamadas seguintes ja saem enxutas.
        """
        global _mascara_rica_ativa
        try:
            return await LeadsEngine._fetch_page(
                client, api_key, consulta, token, rica=_mascara_rica_ativa
            )
        except MascaraRecusada:
            _mascara_rica_ativa = False
            print("Campos ricos indisponiveis nesta conta do Google; seguindo com a mascara basica.")
            return await LeadsEngine._fetch_page(client, api_key, consulta, token, rica=False)

    @staticmethod
    async def _collect_places(api_key: str, queries: List[str], target: int) -> List[Dict[str, Any]]:
        """Pagina e combina varias consultas ate o alvo, sem repetir estabelecimento."""
        seen: set = set()
        places: List[Dict[str, Any]] = []
        # Uma frente por variacao do nicho. As frentes avancam em
        # rodadas, uma pagina de cada vez: assim "drogaria" e "farmacia
        # de manipulacao" entram na lista mesmo quando "farmacia" tem
        # resultado de sobra. Antes a primeira consulta esgotava o alvo
        # sozinha e os sinonimos nunca chegavam a ser usados.
        frentes = [{"consulta": q, "token": None, "fim": False} for q in queries]

        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=8.0)) as client:
            for rodada in range(MAX_PAGES_PER_QUERY):
                if len(places) >= target or all(f["fim"] for f in frentes):
                    break
                for frente in frentes:
                    if frente["fim"] or len(places) >= target:
                        continue
                    if rodada and not frente["token"]:
                        frente["fim"] = True
                        continue
                    try:
                        data = await LeadsEngine._pagina(
                            client, api_key, frente["consulta"], frente["token"]
                        )
                    except ValueError:
                        # Falhar na primeira consulta indica chave/quota: propaga.
                        # Nas seguintes, o que ja foi coletado ainda serve.
                        if not places:
                            raise
                        frente["fim"] = True
                        continue

                    for place in data.get("places", []):
                        pid = place.get("id")
                        if not pid or pid in seen:
                            continue
                        if place.get("businessStatus") == "CLOSED_PERMANENTLY":
                            continue
                        seen.add(pid)
                        places.append(place)

                    frente["token"] = data.get("nextPageToken")
                    frente["fim"] = not frente["token"]
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

        regular = place.get("regularOpeningHours") or {}
        agora = place.get("currentOpeningHours") or {}
        weekday = regular.get("weekdayDescriptions") or agora.get("weekdayDescriptions") or []
        aberto = agora.get("openNow")
        if aberto is None:
            aberto = regular.get("openNow")

        # Endereco destrinchado: o bairro e o gancho mais forte depois da
        # nota ("a unica padaria da Pituba sem site"), e o formattedAddress
        # sozinho nao entrega isso.
        bairro = extract_component(
            place, ("sublocality_level_1", "sublocality", "neighborhood")
        )
        cep = extract_component(place, ("postal_code",))
        rua = extract_component(place, ("route",))
        numero = extract_component(place, ("street_number",))

        simbolo_preco, nivel_preco = faixa_de_preco(place.get("priceLevel") or "")
        avaliacoes = ler_avaliacoes(place.get("reviews") or [])
        descricao_google = ((place.get("editorialSummary") or {}).get("text") or "").strip()
        tipos = [t.replace("_", " ") for t in (place.get("types") or [])][:8]
        coordenada = place.get("location") or {}

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
            opening_hours_week=weekday[:7],
            open_now=aberto,
            neighborhood=bairro or None,
            postal_code=cep or None,
            street=(f"{rua}, {numero}" if rua and numero else rua) or None,
            short_address=place.get("shortFormattedAddress") or None,
            latitude=coordenada.get("latitude"),
            longitude=coordenada.get("longitude"),
            place_types=tipos,
            google_description=descricao_google or None,
            price_level=simbolo_preco or None,
            price_tier=nivel_preco,
            reviews_sample=avaliacoes["amostra"],
            review_highlight=avaliacoes["destaque"] or None,
            praise_count=avaliacoes["elogios"],
            complaint_count=avaliacoes["reclamacoes"],
            site_status=site_kind,
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

            # Telefones achados no proprio site. Ficam separados do
            # principal: servem quando o numero do Google esta velho, e
            # mostram quando o negocio tem fixo e celular.
            do_site = [t for t in (data.get("phones") or []) if t != lead.phone]
            lead.phones_extra = do_site[:3]
            if not lead.phone and do_site:
                lead.phone = do_site[0]
                lead.whatsapp = len(do_site[0]) == 13 and do_site[0][4] == "9"

            if data.get("bio"):
                lead.bio = data["bio"][:400]

            # Diagnostico do site. So existe quando havia site para abrir:
            # para quem nao tem, a oportunidade ja esta em missingDigitalAssets.
            sinais = data.get("site") or {}
            if sinais:
                lead.site_quality = data.get("site_quality")
                lead.site_issues = (data.get("site_issues") or [])[:4]
                lead.site_platform = sinais.get("plataforma") or None
                lead.site_responsive = sinais.get("responsivo")
                lead.site_https = sinais.get("https")
                lead.site_load_ms = sinais.get("tempo_ms") or None
                lead.site_has_booking = sinais.get("tem_agendamento")
                lead.site_has_form = sinais.get("tem_formulario")
                lead.site_title = sinais.get("titulo") or None
                if not lead.bio and sinais.get("descricao"):
                    lead.bio = sinais["descricao"]

            opportunity, quality, missing = score_lead(
                has_own_website=bool(lead.website),
                has_instagram=bool(lead.socials.instagram),
                has_facebook=bool(lead.socials.facebook),
                has_email=bool(lead.email),
                has_phone=bool(lead.phone),
                has_whatsapp=bool(lead.whatsapp),
                rating=lead.rating or 0.0,
                rating_count=lead.rating_count or 0,
                site_quality=lead.site_quality,
                tem_avaliacao_com_texto=bool(lead.review_highlight or lead.reviews_sample),
            )
            lead.opportunityScore = opportunity
            lead.quality_score = quality
            lead.missingDigitalAssets = missing
            lead.contactability = sum([
                bool(lead.phone), bool(lead.whatsapp), bool(lead.email), bool(lead.socials.instagram)
            ])

            # O resumo anterior repetia a linha de cima do card. O que
            # falta a quem abre a lista nao e o dado, e a leitura dele:
            # por que este lead vale o contato e por onde comecar.
            retrato = {
                "company": lead.company,
                "city": lead.city,
                "neighborhood": lead.neighborhood,
                "rating": lead.rating,
                "rating_count": lead.rating_count,
                "review_highlight": lead.review_highlight,
                "site_status": lead.site_status,
                "site_issues": lead.site_issues,
                "site_platform": lead.site_platform,
                "site_quality": lead.site_quality,
                "opening_hours": lead.opening_hours,
                "price_level": lead.price_level,
                "google_description": lead.google_description,
                "whatsapp": lead.whatsapp,
                "email": lead.email,
                "phone": lead.phone,
                "socials": lead.socials.model_dump(),
            }
            lead.hooks = montar_ganchos(retrato)
            lead.diagnosis = montar_diagnostico(retrato)
            lead.best_channel = melhor_canal(retrato)
            lead.ai_summary = lead.diagnosis

        # Primeiro quem da para contatar, depois quem mais precisa do servico
        leads.sort(
            key=lambda l: ((l.contactability or 0) * 25 + (l.opportunityScore or 0)), reverse=True
        )
        return leads
