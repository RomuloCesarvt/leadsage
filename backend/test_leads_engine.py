"""Testes das regras de busca de leads.

Cobrem os defeitos que faziam as buscas voltarem fracas:
localizacao corrompida, email fabricado, cidade trocada por nome de rua,
score aleatorio e campo websiteUri mal interpretado.

Rodar:  cd backend && python -m pytest test_leads_engine.py -v
"""
import pytest

from app.leads_engine import (
    classify_website,
    extract_city,
    niche_variants,
    normalize_phone,
    traduzir_erro_do_google,
    parse_location,
    score_lead,
    whatsapp_from_url,
)


@pytest.mark.parametrize("location,cidade,uf", [
    ("Salvador, BA, Brazil", "Salvador", "BA"),
    ("Pituba, Salvador, BA, Brazil", "Salvador", "BA"),
    ("Botucatu, SP, Brazil", "Botucatu", "SP"),
    ("Manaus, AM, Brazil", "Manaus", "AM"),
    ("Curitiba, PR, Brasil", "Curitiba", "PR"),
])
def test_parse_location(location, cidade, uf):
    """Antes, todo estado fora de SP/RJ/MG/PR recebia ', SP' colado no fim,
    corrompendo a busca em 23 dos 27 estados."""
    query, city, state = parse_location(location)
    assert city == cidade
    assert state == uf
    assert "Brazil" not in query and "Brasil" not in query


def test_parse_location_vazia():
    assert parse_location("") == ("", "", "")


def test_extract_city_usa_address_components():
    """address.split(',')[0] devolvia o nome da RUA, nao a cidade."""
    place = {
        "formattedAddress": "R. Bahia, 23 - Pituba, Salvador - BA",
        "addressComponents": [
            {"types": ["route"], "longText": "Rua Bahia"},
            {"types": ["administrative_area_level_2"], "longText": "Salvador"},
        ],
    }
    assert extract_city(place, "fallback") == "Salvador"


@pytest.mark.parametrize("nacional,internacional,esperado,celular", [
    ("(71) 99941-7483", "+55 71 99941-7483", "5571999417483", True),
    ("(71) 3052-8402", "", "557130528402", False),
    ("", "", "", False),
    # Caso real: "Paes E Doces Flor De Botucatu" esta cadastrado no Google
    # sem o DDD, e o proprio Google devolve "+55 38159352". Prefixar 55 em
    # cima disso daria 5538159352, lido como DDD 38 (Minas Gerais) — o link
    # de WhatsApp cairia num desconhecido. Melhor devolver vazio.
    ("3815-9352", "+55 38159352", "", False),
    ("1234", "", "", False),
    ("(1) 3052-8402", "", "", False),          # DDD invalido
])
def test_normalize_phone(nacional, internacional, esperado, celular):
    assert normalize_phone(nacional, internacional) == (esperado, celular)


def test_normalize_phone_preserva_numero_estrangeiro():
    """Plano internacional existe; nao brasileiro nao pode virar vazio."""
    numero, celular = normalize_phone("", "+351 912 345 678")
    assert numero == "351912345678"
    assert celular is False


@pytest.mark.parametrize("url,tipo", [
    ("https://parisdelicatessen.com.br/", "own"),
    ("https://www.instagram.com/pado.padaria/", "social"),
    ("https://linktr.ee/datalli", "aggregator"),
    ("https://www.ifood.com.br/delivery/salvador-ba/x", "aggregator"),
    ("https://api.whatsapp.com/send?phone=5571981554052", "whatsapp"),
    ("", "none"),
])
def test_classify_website(url, tipo):
    """O campo websiteUri do Google raramente e um site proprio. Tratar
    perfil de Instagram como 'tem site' escondia o lead mais vendavel."""
    assert classify_website(url)[0] == tipo


def test_whatsapp_from_url():
    assert whatsapp_from_url("https://api.whatsapp.com/send?phone=5571981554052") == "5571981554052"
    assert whatsapp_from_url("https://wa.me/5511999998888") == "5511999998888"
    assert whatsapp_from_url("https://exemplo.com") == ""


def test_score_e_deterministico():
    """O score antigo era random.uniform(50, 80): a ordenacao nao
    significava nada."""
    args = (False, False, False, False, True, True, 4.8, 300)
    assert score_lead(*args) == score_lead(*args)


def test_sem_site_pontua_mais_que_com_site():
    sem = score_lead(False, True, True, True, True, True, 4.5, 100)[0]
    com = score_lead(True, True, True, True, True, True, 4.5, 100)[0]
    assert sem > com


def test_lacunas_listadas():
    _, _, faltando = score_lead(False, False, False, False, False, False, 0, 0)
    assert {"website", "instagram", "email", "telefone"} <= set(faltando)


def test_niche_variants_expande_sinonimos():
    variantes = niche_variants("Padarias")
    assert len(variantes) > 1
    assert any("panificadora" in v.lower() for v in variantes)


def test_niche_variants_sem_sinonimo_conhecido():
    assert niche_variants("Chaveiros") == ["Chaveiros"]


def test_orcamento_do_enriquecimento_existe():
    """A busca precisa caber no limite da funcao serverless. Sem prazo,
    um site lento trava tudo e o usuario nao recebe lead nenhum."""
    from app.leads_engine import ORCAMENTO_ENRIQUECIMENTO
    assert 5 <= ORCAMENTO_ENRIQUECIMENTO <= 30


def test_enriquecimento_lento_nao_derruba_a_busca(monkeypatch):
    """Enriquecimento que estoura o prazo devolve os leads sem as redes,
    em vez de propagar o erro."""
    import asyncio

    import app.leads_engine as motor

    async def travado(*a, **kw):
        await asyncio.sleep(60)

    monkeypatch.setattr(motor.SocialScraper, "enrich_many", travado)
    monkeypatch.setattr(motor, "ORCAMENTO_ENRIQUECIMENTO", 0.2)

    async def falsa_coleta(api_key, queries, target):
        return [{
            "id": "p1",
            "displayName": {"text": "Padaria Teste"},
            "formattedAddress": "R. X, 1 - Salvador - BA",
            "nationalPhoneNumber": "(71) 99918-2820",
        }]

    monkeypatch.setattr(motor.LeadsEngine, "_collect_places", falsa_coleta)

    leads = asyncio.run(motor.LeadsEngine.search_leads(
        niche="Padarias", location="Salvador, BA", limit=1, api_key="CHAVE"
    ))
    assert len(leads) == 1
    assert leads[0].name == "Padaria Teste"
    assert leads[0].socials.instagram is None


# --------------------------------------------------- erro do Google na tela

@pytest.mark.parametrize("bruta,status", [
    ("Quota exceeded for quota metric 'SearchTextRequest' and limit "
     "'SearchTextRequest per day' of service 'places.googleapis.com' for "
     "consumer 'project_number:610092181255'.", 429),
    ("Places API has not been used in project 610092181255 before or it is disabled.", 403),
    ("API key not valid. Please pass a valid API key.", 400),
    ("This API method requires billing to be enabled.", 403),
])
def test_erro_do_google_nao_vaza_a_nossa_infraestrutura(bruta, status):
    """A mensagem crua ia inteira para a tela — inclusive o numero do
    nosso projeto no Google Cloud, em ingles, falando de coisa que so o
    dono do sistema resolve."""
    visivel = traduzir_erro_do_google(bruta, status)
    assert "610092181255" not in visivel
    assert "googleapis" not in visivel.lower()
    assert "api key" not in visivel.lower()
    assert "quota metric" not in visivel.lower()
    assert len(visivel) < 200


def test_limite_diario_explica_o_que_acontece():
    """O usuario precisa saber que zera sozinho, senao acha que quebrou."""
    visivel = traduzir_erro_do_google("Quota exceeded for quota metric 'x'", 429)
    assert "amanh" in visivel.lower()


def test_erro_desconhecido_ainda_diz_algo_util():
    visivel = traduzir_erro_do_google("alguma coisa nova que o Google inventou", 400)
    assert visivel and "tente de novo" in visivel.lower()
