import re

from app import abordagem_mestra, ai_generator, ai_sdr, idioma
from app.models import LeadItem, PitchGenerationRequest


def lead(**kw):
    base = dict(id="1", name="Café Madrid", avatar="", role="Café", niche="Cafeterías", company="Café Madrid", location="Madrid, Spain", city="Madrid",
                email="", phone="+34 612 345 678", whatsapp=True, socials={}, quality_score=70, verified=True, outreach_status="Pendente")
    base.update(kw)
    return LeadItem(**base)


def test_pais_pelo_texto_endereco_e_telefone():
    assert idioma.pais_do_lead({"location": "Madrid, Spain"}) == "ES"
    assert idioma.pais_do_lead({"location": "Austin, TX, USA"}) == "US"
    assert idioma.pais_do_lead({"location": "Itu, SP, Brazil"}) == "BR"
    assert idioma.pais_do_lead({"location": "", "phone": "+351 912 345 678"}) == "PT"
    assert idioma.pais_do_lead({"location": "Botucatu", "phone": "14991884926"}) == "BR"      # sem sinal: Brasil
    assert idioma.pais_do_lead({}) == "BR"


def test_brasil_nao_muda_nada_e_outros_paises_mandam_escrever_na_lingua():
    assert idioma.instrucao(idioma.do_lead({"location": "Itu, SP, Brazil"})) == ""
    t = idioma.instrucao(idioma.do_lead({"location": "Madrid, Spain"}))
    assert "espanhol" in t and "NUNCA misture com português" in t
    assert "português de Portugal" in idioma.instrucao(idioma.do_lead({"location": "Porto, Portugal"}))
    assert "responda no idioma em que ELE escreveu" in idioma.instrucao(idioma.do_lead({"location": "Dallas, USA"}), robo=True)


def _req(l):
    return PitchGenerationRequest(lead=l, channel="whatsapp", tone="Consultivo", sender_name="Ana", user_product="Social media")


def test_prompt_da_abordagem_leva_a_lingua_do_pais():
    p = ai_generator._prompt_da_abordagem(_req(lead()), "whatsapp")
    assert "IDIOMA (regra acima de todas)" in p and "espanhol da Espanha" in p
    br = ai_generator._prompt_da_abordagem(_req(lead(location="Itu, SP, Brazil", phone="+55 14 99188-4926")), "whatsapp")
    assert "IDIOMA (regra" not in br


def test_seguimentos_tambem_na_lingua_do_pais():
    p = ai_generator._prompt_dos_seguimentos(_req(lead(location="Austin, TX, USA", phone="+1 512 555 0100")), "whatsapp", "Hi!")
    assert "inglês americano" in p
    seg, avisos = ai_generator._ler_seguimentos([{"texto": "Hi again, quick follow up"}], "whatsapp", False)
    assert seg[0]["quando"] == "+3d" and avisos == []


def test_robo_responde_na_lingua_e_nao_se_diz_robo_em_ingles():
    p = ai_sdr.montar_prompt([{"de": "contato", "texto": "Hello"}], "whatsapp", {"name": "Ana"}, {}, {"id": "1", "company": "Joe's Cafe", "location": "Austin, TX, USA"}, raio=None)
    assert "IDIOMA (regra acima de todas)" in p
    assert ai_sdr._SE_DIZ_ROBO.search("I'm an AI assistant") and ai_sdr._SE_DIZ_ROBO.search("soy un bot")
    assert not ai_sdr._SE_DIZ_ROBO.search("Hi, I'm Ana from the team")
