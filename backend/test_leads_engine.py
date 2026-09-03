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
])
def test_normalize_phone(nacional, internacional, esperado, celular):
    assert normalize_phone(nacional, internacional) == (esperado, celular)


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
