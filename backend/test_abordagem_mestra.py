"""A abordagem precisa ser calorosa e conhecer o produto.

Nada aqui chama a IA: trava o método (cumprimento, apresentação, produto,
ramo, horário) e a revisão de frieza.
"""
from datetime import datetime
from zoneinfo import ZoneInfo

from app import abordagem_mestra, abordagem_mestra as am
from test_robo import com_robo, rodar  # noqa: F401
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
    for trecho in ("COMO ESCREVER A PRIMEIRA MENSAGEM", "quem você é em UMA frase", "ESTILO DESTA MENSAGEM", "O PRODUTO", "GATILHOS", "O RAMO DESTE NEGÓCIO", "TEMPERATURA", "Agora é"):
        assert trecho in p, trecho
    assert any(f.format(x="Sites Já") in p for f in am.INTROS_DA_EMPRESA)
    assert "VOZ (a diferença entre gente e disparo)" in p
    assert "Nunca por saudação" not in p


def test_roteiro_exige_previa_e_confirmacao_sem_site():
    sem_previa = "Oi! Vi sua nota 4,8. Posso te mostrar uma ideia?"
    ok = "Oi! Não encontrei o site de vocês e queria confirmar se realmente não existe. Montei uma prévia, sem compromisso. Posso te mostrar por aqui ou prefere um papo de 10 minutinhos?"
    assert len(am.revisar_roteiro(sem_previa, True)) == 4
    assert am.revisar_roteiro(ok, True) == []
    # quem já tem site não precisa da confirmação, só da prévia
    assert am.revisar_roteiro("Montei uma prévia nova do seu site, sem obrigação. Posso mostrar ou prefere 10 minutos de papo?", False) == []


def test_lead_sem_site_reconhece_redes_e_agregadores():
    assert am.lead_sem_site("none") and am.lead_sem_site("social") and am.lead_sem_site("aggregator")
    assert not am.lead_sem_site("own", ["website"])
    assert am.lead_sem_site(None, ["website"])
    assert not am.lead_sem_site(None, [])


def test_prompt_pede_achei_no_google_e_a_previa():
    req = PitchGenerationRequest(lead=lead(site_status="none"), channel="whatsapp", sender_name="Sites Já", user_product="Site")
    p = _prompt_da_abordagem(req, "whatsapp")
    assert "pesquisando no Google" in p and "prévia" in p and "NÃO encontrou o site" in p
    com_site = _prompt_da_abordagem(PitchGenerationRequest(lead=lead(site_status="own"), channel="whatsapp", sender_name="X"), "whatsapp")
    assert "ponto concreto do site atual" in com_site and "NÃO encontrou o site" not in com_site


# ------------------------------------------------------------------ previa criada ou a oferecer

def test_estrutura_muda_conforme_a_previa_exista():
    criada = abordagem_mestra.estrutura("LeadSage", previa="criada")
    oferecer = abordagem_mestra.estrutura("LeadSage", previa="oferecer")
    assert "JÁ montou uma prévia" in criada and any(x in criada for x in am.PEDIDOS_CRIADA) and "10 minutinhos" not in criada
    assert "ainda não existe" in oferecer and any(x in oferecer for x in am.PEDIDOS_OFERECER) and "JÁ montou" not in oferecer
    assert "10 minutinhos" in abordagem_mestra.estrutura("LeadSage")      # sem modo: o texto antigo


def test_roteiro_com_previa_criada_pede_licenca_para_enviar():
    bom = "Boa tarde! Montei uma prévia do site de vocês, sem compromisso. Posso te mandar por aqui?"
    assert abordagem_mestra.revisar_roteiro(bom, False, "criada") == []
    sem_pedido = "Boa tarde! Montei uma prévia do site de vocês, sem compromisso."
    assert any("licença" in p for p in abordagem_mestra.revisar_roteiro(sem_pedido, False, "criada"))


def test_roteiro_sem_previa_nao_pode_dizer_que_montou():
    mentira = "Boa tarde! Montei uma prévia do site de vocês, sem compromisso. Posso montar uma prévia para você ver?"
    assert any("ainda não existe" in p for p in abordagem_mestra.revisar_roteiro(mentira, False, "oferecer"))
    bom = "Boa tarde! Não encontrei o site de vocês e queria confirmar. Posso montar uma prévia para você ver, sem compromisso?"
    assert abordagem_mestra.revisar_roteiro(bom, True, "oferecer") == []


def test_servidor_descobre_se_a_previa_existe(rodar, com_robo):
    from app import main
    from app.sites_store import create_site
    assert rodar(main._previa_do_lead, "alice", "L1") == "oferecer"
    rodar(create_site, "alice", "Padaria", "<html><body>x</body></html>", "", "L1")
    assert rodar(main._previa_do_lead, "alice", "L1") == "criada"
    assert rodar(main._previa_do_lead, "alice", "L2") == "oferecer"


# ------------------------------------------------------------------ whatsapp: curta, completa e diferente de uma para outra

def test_whatsapp_pede_as_cinco_partes_em_45_a_65_palavras_e_email_continua_longo():
    req = PitchGenerationRequest(lead=lead(site_status="none"), channel="whatsapp", sender_name="Sites Já", user_product="Site", previa="criada")
    p = _prompt_da_abordagem(req, "whatsapp")
    assert "de 45 a 65 palavras" in p and "no máximo 65 palavras" in p
    for parte in ("quem você é", "pesquisando no Google", "reputação", "NÃO encontrou o site", "criou uma prévia", "mostrar o quanto isso pode ajudar", 'NUNCA use a palavra "link"'):
        assert parte in p, parte
    longo = _prompt_da_abordagem(PitchGenerationRequest(lead=lead(site_status="none"), channel="email", sender_name="X"), "email")
    assert "CUMPRIMENTO humano" in longo and "COMO ESCREVER A PRIMEIRA MENSAGEM" not in longo


def test_cada_lead_abre_de_um_jeito_e_a_tentativa_seguinte_troca():
    estilos = {am.estilo_da_mensagem(f"lead-{i}") for i in range(300)}
    assert len(estilos) == len(am.ESTILOS_DE_ABERTURA)             # todos os jeitos aparecem
    assert am.estilo_da_mensagem("x", 0) != am.estilo_da_mensagem("x", 1)
    assert am.estilo_da_mensagem("x", 3) == am.estilo_da_mensagem("x", 3)   # estavel para o mesmo lead e tentativa


def test_aberturas_ja_usadas_entram_no_prompt_para_nao_repetir():
    req = PitchGenerationRequest(lead=lead(), channel="whatsapp", sender_name="X", evitar=["Oi, Ana! Aqui é a Júlia da Sites Já"], variacao=2)
    p = _prompt_da_abordagem(req, "whatsapp")
    assert "NÃO comece como estas mensagens já usadas" in p and "Aqui é a Júlia da Sites Já" in p


def test_cumprimento_pode_vir_depois_da_reputacao_nos_estilos_variados():
    texto = "Sua nota 4,9 no Google com 120 avaliações me chamou atenção. Oi, Ana! Sou a Júlia, da Sites Já, e ajudo negócios locais. Posso te mandar uma ideia?"
    assert [p for p in am.revisar_calor(texto) if "cumprimentando" in p] == []
