"""O robô de sites age como especialista: cidade fora da capa, playbook nos prompts."""
from app import ai_sdr, ai_site
from app.playbook_sites import FALA_DO_ROBO_SOBRE_SITES, PLAYBOOK_DE_SITES


def test_slogan_nunca_leva_a_cidade():
    f = ai_site.slogan_sem_cidade
    assert f("Acolhimento e escuta em Botucatu", "Botucatu") == "Acolhimento e escuta"
    assert f("Botucatu merece uma padaria assim", "Botucatu") == ""
    assert f("Conversar pode ser o primeiro passo", "Botucatu") == "Conversar pode ser o primeiro passo"
    assert f("Qualquer frase", "") == "Qualquer frase"


def test_prompt_de_conteudo_leva_o_playbook_de_especialista():
    lead = {"company": "Júlia Morais | Psicóloga em Botucatu", "niche": "Psicólogos", "city": "Botucatu"}
    briefing = ai_site.briefing_visual("Júlia Morais", "Psicólogos", "", "Botucatu")
    prompt = ai_site._prompt_do_conteudo(ai_site._dados_do_lead(lead), briefing, "")
    assert "SITE NÃO É PERFIL DO GOOGLE" in prompt and "NUNCA cite a cidade" in prompt
    assert "dashboard" in PLAYBOOK_DE_SITES.lower()


def test_robo_de_vendas_sabe_explicar_o_site():
    prompt = ai_sdr.montar_prompt([{"de": "contato", "texto": "por que essas cores?"}], "whatsapp", {}, {}, {"niche": "Psicólogos", "company": "Júlia"})
    assert FALA_DO_ROBO_SOBRE_SITES.split("\n")[0] in prompt
