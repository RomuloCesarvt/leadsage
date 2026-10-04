"""Raio-X do lead: Google Meu Negocio, site, Instagram e quem cuida disso tudo.

A busca traz o essencial de 60 negocios em segundos. O raio-x e o
contrario: um negocio so, a fundo, quando o usuario abre o lead. Isso e
por custo — o detalhe do Google (resumo das avaliacoes) e uma consulta
por lugar, e fazer isso na busca multiplicaria a cota por vinte — e por
foco: so vale aprofundar no lead que alguem vai abordar.

A pergunta central e "tem alguem cuidando da presenca deste negocio?",
porque ela muda a abordagem inteira:

- ninguem cuida        -> comecar do zero
- o dono cuida sozinho -> tirar o trabalho das costas dele
- abandonado           -> retomar o que parou
- ja tem agencia       -> substituir um fornecedor, mostrando o que falta

A resposta sai de evidencias que o usuario pode conferir — credito no
rodape, pixel de anuncio, data do ultimo post — e vem com o grau de
confianca. Nada de IA aqui: um veredito inventado faria o usuario abrir
a conversa com uma afirmacao errada sobre o negocio do outro.
"""
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx

from app.config import settings

VALIDADE_CACHE = 7 * 24 * 3600

CAMPOS_DETALHE = ",".join([
    "displayName", "rating", "userRatingCount", "reviewSummary", "editorialSummary",
    "regularOpeningHours", "websiteUri", "nationalPhoneNumber", "primaryTypeDisplayName",
    "businessStatus", "googleMapsLinks", "photos",
])


# ------------------------------------------------- Google Meu Negocio

def ficha_gmn(place: Dict[str, Any], tipo_site: str) -> Dict[str, Any]:
    """O perfil do Google em itens que o dono confere sozinho.

    Cada item e verdadeiro, falso ou desconhecido. Fotos, nesta conta do
    Google, nunca vem — e "desconhecido" nao e "falta": contar como falta
    faria todo perfil parecer incompleto e o argumento cairia na primeira
    olhada do dono no proprio perfil.
    """
    resumo = ((place.get("reviewSummary") or {}).get("text") or {}).get("text", "")
    descricao = ((place.get("editorialSummary") or {}).get("text") or "")
    fotos = place.get("photos")
    links = place.get("googleMapsLinks") or {}

    itens = [
        {"item": "Site próprio", "ok": tipo_site == "own",
         "detalhe": {"own": "", "social": "o link do perfil leva para rede social",
                     "aggregator": "o link do perfil é um Linktree ou cardápio",
                     "whatsapp": "o link do perfil é só um WhatsApp",
                     "none": "sem site no perfil"}.get(tipo_site, "")},
        {"item": "Telefone", "ok": bool(place.get("nationalPhoneNumber")), "detalhe": ""},
        {"item": "Horário de funcionamento", "ok": bool(place.get("regularOpeningHours")), "detalhe": ""},
        {"item": "Descrição do negócio", "ok": bool(descricao), "detalhe": "" if descricao else "o perfil não tem descrição"},
        {"item": "Fotos", "ok": (len(fotos) > 0) if fotos else None,
         "detalhe": "" if fotos else "não dá para verificar daqui — confira no perfil"},
    ]
    conhecidos = [i for i in itens if i["ok"] is not None]
    completude = round(100 * sum(1 for i in conhecidos if i["ok"]) / len(conhecidos)) if conhecidos else 0

    return {
        "nome": (place.get("displayName") or {}).get("text", ""),
        "categoria": (place.get("primaryTypeDisplayName") or {}).get("text", ""),
        "nota": place.get("rating"),
        "avaliacoes": place.get("userRatingCount") or 0,
        "aberto": place.get("businessStatus", "OPERATIONAL") == "OPERATIONAL",
        "descricao": descricao,
        "resumo_avaliacoes": resumo,
        "itens": itens,
        "completude": completude,
        "link_avaliacoes": links.get("reviewsUri", ""),
        "link_fotos": links.get("photosUri", ""),
        "link_perfil": links.get("placeUri", ""),
    }


# ------------------------------------------------------------ Instagram

def usuario_do_instagram(valor: str) -> str:
    """'https://instagram.com/padoka/' ou '@padoka' -> 'padoka'."""
    import re

    v = (valor or "").strip()
    m = re.search(r"instagram\.com/([A-Za-z0-9_.]{1,30})", v)
    usuario = m.group(1) if m else v.lstrip("@")
    usuario = usuario.strip("/").split("?")[0]
    if usuario.lower() in ("p", "reel", "explore", "stories", "accounts", ""):
        return ""
    return usuario if re.fullmatch(r"[A-Za-z0-9_.]{1,30}", usuario) else ""


def atividade_instagram(bd: Dict[str, Any], agora: Optional[datetime] = None) -> Dict[str, Any]:
    """Le a resposta da Business Discovery: o ritmo de publicacao.

    Seguidores dizem pouco sobre quem cuida; frequencia diz tudo. Perfil
    com post toda semana tem alguem por tras. Perfil cujo ultimo post tem
    quatro meses foi largado.
    """
    agora = agora or datetime.now(timezone.utc)
    posts = (bd.get("media") or {}).get("data") or []
    datas = []
    for p in posts:
        try:
            datas.append(datetime.fromisoformat(p["timestamp"].replace("+0000", "+00:00")))
        except Exception:
            continue
    datas.sort(reverse=True)

    ultimo = (agora - datas[0]).days if datas else None
    em_90 = sum(1 for d in datas if (agora - d).days <= 90)
    engaj = [
        (p.get("like_count") or 0) + (p.get("comments_count") or 0)
        for p in posts if p.get("like_count") is not None
    ]
    return {
        "disponivel": True,
        "usuario": bd.get("username", ""),
        "seguidores": bd.get("followers_count"),
        "publicacoes": bd.get("media_count"),
        "dias_desde_ultimo_post": ultimo,
        "posts_90_dias": em_90,
        "engajamento_medio": round(sum(engaj) / len(engaj)) if engaj else None,
        "bio_tem_link": bool(bd.get("website")),
    }


async def consultar_instagram(usuario: str, canal: Dict[str, Any]) -> Dict[str, Any]:
    """Business Discovery pela conta de Instagram que o usuario conectou.

    E o caminho oficial: uma conta comercial conectada consulta os dados
    publicos de outra conta comercial. Ler a pagina do Instagram sem login
    nao funciona (ele devolve tela de login) e violaria os termos dele.
    """
    if not usuario:
        return {"disponivel": False, "motivo": "nenhum Instagram encontrado para este negócio"}
    ig_id, token = canal.get("ig_id"), canal.get("page_token")
    if not (ig_id and token):
        return {
            "disponivel": False, "usuario": usuario,
            "motivo": "conecte seu Instagram em Robô de Atendimento para ver a atividade deste perfil",
        }

    campos = (
        f"business_discovery.username({usuario})"
        "{username,followers_count,media_count,website,"
        "media.limit(12){timestamp,like_count,comments_count}}"
    )
    try:
        async with httpx.AsyncClient(timeout=15.0) as c:
            r = await c.get(f"https://graph.facebook.com/v21.0/{ig_id}",
                            params={"fields": campos, "access_token": token})
        dados = r.json() if r.content else {}
    except Exception:
        return {"disponivel": False, "usuario": usuario, "motivo": "o Instagram não respondeu agora"}

    if r.status_code >= 400 or "business_discovery" not in dados:
        # Conta pessoal ou inexistente: a API so enxerga contas comerciais.
        return {
            "disponivel": False, "usuario": usuario,
            "motivo": "perfil pessoal ou não encontrado — a Meta só mostra dados de contas comerciais",
        }
    return atividade_instagram(dados["business_discovery"])


# --------------------------------------------------------- quem cuida

def quem_cuida(
    site: Dict[str, Any],
    tipo_site: str,
    gmn: Dict[str, Any],
    insta: Dict[str, Any],
    ano_atual: int,
) -> Dict[str, Any]:
    """O veredito, com as evidencias que o sustentam.

    Os sinais tem peso diferente, e a diferenca importa. Google Analytics
    esta em quase todo site feito por profissional — e em muito site feito
    pelo sobrinho. Sozinho, nao prova nada. Ja um credito no rodape, um
    pixel de anuncio ou um Instagram com post toda semana provam.

    Quando os sinais nao bastam, o veredito diz isso. Errar com convicção
    e pior do que nao saber: o usuario abriria a conversa afirmando algo
    falso sobre o negocio do outro.
    """
    forte: List[str] = []     # alguem profissional por tras
    fraco: List[str] = []     # alguem mexeu, sem dizer quem
    dono: List[str] = []      # feito pelo proprio dono
    abandono: List[str] = []  # comecou e parou
    lacuna: List[str] = []    # o que ninguem esta cuidando

    if site.get("credito_agencia"):
        forte.append(f"o rodapé do site diz \"desenvolvido por {site['credito_agencia']}\"")
    if site.get("pixel_meta"):
        forte.append("o site tem Pixel da Meta — alguém roda anúncio no Instagram/Facebook")
    if site.get("tag_google_ads"):
        forte.append("o site tem tag do Google Ads — alguém investe em anúncio no Google")
    if site.get("tag_tiktok"):
        forte.append("o site tem pixel do TikTok — alguém anuncia no TikTok")
    if site.get("google_analytics"):
        fraco.append("o site mede as visitas (Google Analytics)")

    ano = site.get("ano_rodape")
    if ano and ano >= ano_atual:
        fraco.append(f"o rodapé do site está atualizado ({ano})")
    elif ano and ano <= ano_atual - 2:
        abandono.append(f"o rodapé do site ainda diz {ano}")
    if tipo_site == "own" and site.get("acessivel") is False:
        abandono.append("o site informado no Google não abre")
    if site.get("plataforma") in ("Wix", "Google Sites"):
        dono.append(f"o site é feito em {site['plataforma']}, típico de quem monta sozinho")

    if insta.get("disponivel"):
        dias = insta.get("dias_desde_ultimo_post")
        posts_90 = insta.get("posts_90_dias") or 0
        if dias is None:
            abandono.append("o Instagram não tem nenhuma publicação")
        elif dias > 90:
            abandono.append(f"o último post no Instagram foi há {dias} dias")
        elif posts_90 >= 12:
            forte.append(f"{posts_90} posts no Instagram em 90 dias — ritmo de quem tem calendário")
        elif posts_90 >= 3:
            dono.append(f"{posts_90} posts no Instagram em 90 dias — ativo, sem ritmo fixo")

    if tipo_site in ("none", "social", "aggregator", "whatsapp"):
        lacuna.append({
            "none": "não tem site — o perfil do Google não leva a lugar nenhum",
            "social": "o perfil do Google leva para uma rede social, não para um site",
            "aggregator": "o perfil do Google leva para um Linktree ou cardápio, não para um site",
            "whatsapp": "o perfil do Google leva só para o WhatsApp",
        }[tipo_site])
    faltando = [i["item"].lower() for i in gmn.get("itens", []) if i.get("ok") is False and i["item"] != "Site próprio"]
    if faltando:
        lacuna.append("o perfil do Google está sem " + ", ".join(faltando))
    if gmn.get("avaliacoes", 0) >= 100 and faltando:
        lacuna.append(f"{gmn['avaliacoes']} avaliações num perfil que ninguém completou")

    if site.get("credito_agencia") or len(forte) >= 2 or (forte and fraco):
        veredito, rotulo = "agencia", "Já tem profissional ou agência"
        abordagem = "Você vai substituir alguém: mostre o que o atual não entrega."
    elif abandono and not forte:
        veredito, rotulo = "abandonado", "Presença abandonada"
        abordagem = "Alguém começou e parou. Ofereça retomar sem que ele precise pensar nisso."
    elif dono and not forte:
        veredito, rotulo = "dono", "O dono cuida sozinho"
        abordagem = "Ele já faz algo, do jeito que dá. Ofereça tirar esse trabalho das costas dele."
    elif lacuna and not (forte or fraco):
        veredito, rotulo = "ninguem", "Ninguém cuidando do digital"
        abordagem = "Começo do zero: o argumento é o cliente que procura e não encontra."
    else:
        veredito, rotulo = "indefinido", "Sem sinais suficientes"
        abordagem = "Pergunte logo no início quem cuida hoje do site, das redes e do Google."

    evidencias = forte + abandono + dono + fraco + lacuna
    if forte or (insta.get("disponivel") and len(evidencias) >= 2):
        confianca = "alta"
    elif veredito != "indefinido" and len(evidencias) >= 2:
        confianca = "média"
    else:
        confianca = "baixa"

    return {
        "veredito": veredito, "rotulo": rotulo, "confianca": confianca,
        "evidencias": evidencias, "abordagem": abordagem,
        # o que esta faltando, separado: e a lista do que vender
        "lacunas": lacuna,
    }


# -------------------------------------------------------- tag manager

async def pixels_no_tag_manager(gtm_ids: List[str]) -> Dict[str, bool]:
    """Abre o container do Google Tag Manager e procura os pixels.

    Site feito por profissional raramente cola o pixel no HTML: carrega
    tudo pelo Tag Manager. Lendo so a pagina, as empresas MAIS bem
    cuidadas pareceriam as menos — medido numa rede de academias, com
    Pixel da Meta, Google Ads e TikTok, todos invisiveis no HTML.

    O container e publico e o endereco e sempre do Google, entao nao ha
    risco de o servidor ser levado a outro lugar.
    """
    import re

    achados = {"pixel_meta": False, "tag_google_ads": False, "tag_tiktok": False}
    for gtm in gtm_ids[:2]:
        if not re.fullmatch(r"GTM-[A-Z0-9]{4,10}", gtm):
            continue
        try:
            async with httpx.AsyncClient(timeout=10.0) as c:
                js = (await c.get("https://www.googletagmanager.com/gtm.js", params={"id": gtm})).text
        except Exception:
            continue
        achados["pixel_meta"] |= "connect.facebook.net" in js or "fbevents" in js
        achados["tag_google_ads"] |= bool(re.search(r"AW-\d{6,}", js)) or "googleadservices" in js
        achados["tag_tiktok"] |= "analytics.tiktok.com" in js
    return achados


# ------------------------------------------------------------- cache

async def ler_cache(uid: str, place_id: str) -> Optional[Dict[str, Any]]:
    from app.robo_store import _sql_get
    from app.firebase_config import db as firestore_db

    dados = None
    if firestore_db is not None:
        try:
            doc = firestore_db.collection("users").document(uid).collection("raio_x").document(place_id).get()
            dados = doc.to_dict() if doc.exists else None
        except Exception as exc:
            print(f"Falha ao ler raio-x: {exc}")
    if dados is None:
        dados = await _sql_get(f"raiox:{uid}:{place_id}")
    if dados and time.time() - dados.get("gerado_em_ts", 0) < VALIDADE_CACHE:
        return dados
    return None


async def gravar_cache(uid: str, place_id: str, dados: Dict[str, Any]) -> None:
    from app.robo_store import _sql_put
    from app.firebase_config import db as firestore_db

    if firestore_db is not None:
        try:
            firestore_db.collection("users").document(uid).collection("raio_x").document(place_id).set(dados)
            return
        except Exception as exc:
            print(f"Falha ao gravar raio-x: {exc}")
    await _sql_put(f"raiox:{uid}:{place_id}", uid, "raiox", dados)


# ------------------------------------------------------------ montagem

async def detalhes_do_google(place_id: str) -> Dict[str, Any]:
    if not settings.GOOGLE_MAPS_API_KEY:
        return {}
    try:
        async with httpx.AsyncClient(timeout=15.0) as c:
            r = await c.get(
                f"https://places.googleapis.com/v1/places/{place_id}",
                headers={"X-Goog-Api-Key": settings.GOOGLE_MAPS_API_KEY,
                         "X-Goog-FieldMask": CAMPOS_DETALHE},
                params={"languageCode": "pt-BR"},
            )
        return r.json() if r.status_code == 200 else {}
    except Exception:
        return {}


async def montar(
    place_id: str,
    website_da_tela: str,
    instagram_da_tela: str,
    canal: Dict[str, Any],
) -> Dict[str, Any]:
    from app.dispatcher import DispatchError, _validar_destino_webhook
    from app.leads_engine import classify_website
    from app.social_scraper import SocialScraper

    place = await detalhes_do_google(place_id)

    # O site vem do Google. O da tela so serve se o Google nao informar, e
    # passa pela mesma validacao do webhook: sem ela, o raio-x seria um
    # jeito de fazer o servidor acessar a rede interna da nuvem.
    site_url = place.get("websiteUri") or ""
    if not site_url and website_da_tela:
        try:
            _validar_destino_webhook(website_da_tela)
            site_url = website_da_tela
        except DispatchError:
            site_url = ""

    tipo_site, _ = classify_website(site_url)
    raspado: Dict[str, Any] = {}
    if tipo_site == "own":
        raspado = await SocialScraper.scrape_website(site_url)

    usuario = usuario_do_instagram(instagram_da_tela or raspado.get("instagram") or "")
    if not usuario and tipo_site == "social" and "instagram.com" in site_url.lower():
        usuario = usuario_do_instagram(site_url)

    gmn = ficha_gmn(place, tipo_site) if place else {"itens": [], "completude": 0, "avaliacoes": 0}
    insta = await consultar_instagram(usuario, canal)
    sinais_site = dict(raspado.get("site") or {})
    via_gtm = False
    if sinais_site.get("gtm_ids"):
        escondidos = await pixels_no_tag_manager(sinais_site["gtm_ids"])
        for chave, achou in escondidos.items():
            if achou and not sinais_site.get(chave):
                sinais_site[chave] = True
                via_gtm = True

    return {
        "place_id": place_id,
        "gmn": gmn,
        "site": {
            "url": site_url,
            "tipo": tipo_site,
            "nota": raspado.get("site_quality"),
            "problemas": raspado.get("site_issues") or [],
            "plataforma": sinais_site.get("plataforma", ""),
            "credito_agencia": sinais_site.get("credito_agencia", ""),
            "pixel_meta": bool(sinais_site.get("pixel_meta")),
            "tag_google_ads": bool(sinais_site.get("tag_google_ads")),
            "google_analytics": bool(sinais_site.get("google_analytics")),
            "tag_tiktok": bool(sinais_site.get("tag_tiktok")),
            "pixels_via_tag_manager": via_gtm,
            "ano_rodape": sinais_site.get("ano_rodape"),
        },
        "instagram": insta,
        "quem_cuida": quem_cuida(sinais_site, tipo_site, gmn, insta, datetime.now().year),
        "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "gerado_em_ts": time.time(),
    }
