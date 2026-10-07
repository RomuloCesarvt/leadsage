"""A abordagem precisa ser calorosa e conhecer o produto.

Nada aqui chama a IA: trava o método (cumprimento, apresentação, produto,
ramo, horário) e a revisão de frieza.
"""
from datetime import datetime
from zoneinfo import ZoneInfo

from app import abordagem_mestra as am
from app.ai_generator import _prompt_da_abordagem
from app.models import LeadItem, PitchGenerationRequest

SP = ZoneInfo("America/Sao_Paulo")


def lead(**kw):
    base = dict(id="1", name="Padaria Doce Vida", avatar="", role="Padaria", niche="Padaria", company="Padaria Doce Vida",
                location="Botucatu", city="Botucatu", email="", phone="", whatsapp=True, socials={}, quality_score=70,
                verified=True, outreach_status="Pendente")
    base.update(kw)
    return LeadItem(**base)


def test_saudacao_segue_o_horario():
    assert am.saudacao_do_horario(datetime(2026, 10, 7, 9, 0, tzinfo=SP)) == "Bom dia"
    assert am.saudacao_do_horario(datetime(2026, 10, 7, 15, 0, tzinfo=SP)) == "Boa tarde"
    assert am.saudacao_do_horario(datetime(2026, 10, 7, 20, 0, tzinfo=SP)) == "Boa noite"


def test_momento_avisa_fim_de_semana_e_horario_ruim():
    assert "fim de semana" in am.momento(datetime(2026, 10, 10, 10, 0, tzinfo=SP))
    assert "fora do horário comercial" in am.momento(datetime(2026, 10, 7, 21, 0, tzinfo=SP))
    assert "fora do horário" not in am.momento(datetime(2026, 10, 7, 10, 0, tzinfo=SP))


def test_frieza_e_pega():
    seco = "Notei que seu perfil no Google não tem site. Posso te mostrar uma ideia?"
    quente = "Oi, tudo bem? Aqui é a Ana, da Sites Já. Vi que a Padaria Doce Vida tem nota 4,8 no Google. Posso te mostrar como ficaria um site?"
    assert len(am.revisar_calor(seco)) == 2
    assert am.revisar_calor(quente) == []


def test_sem_apresentacao_so_falta_ela():
    assert [p for p in am.revisar_calor("Olá, Maria! Vi sua nota 4,8 no Google. Posso te mandar uma ideia?") if "quem" in p]


def test_produto_sem_cadastro_nao_inventa_preco():
    texto = am.produto({}, None, "")
    assert "NÃO cadastrados" in texto and "R$" not in texto


def test_produto_cadastrado_traz_os_fatos():
    cfg = {"oferta": {"ativa": True, "servico": "site", "nome": "Site Express", "preco": 997, "prazo_dias": 7}, "objetivo": "agendar"}
    texto = am.produto(cfg, None, "")
    if "Site Express" in texto:
        assert "997" in texto and "7 dias" in texto


def test_prompt_tem_o_metodo_completo():
    req = PitchGenerationRequest(lead=lead(), channel="whatsapp", tone="Direto", sender_name="Sites Já", user_product="Site profissional",
                                 service_brief=am.produto({}, None, "Site profissional"))
    p = _prompt_da_abordagem(req, "whatsapp")
    for trecho in ("CUMPRIMENTO", "QUEM É VOCÊ", "O PRODUTO", "GATILHOS", "O RAMO DESTE NEGÓCIO", "TEMPERATURA", "Agora é"):
        assert trecho in p, trecho
    assert "Eu sou da Sites Já" in p
    assert "Nunca por saudação" not in p
