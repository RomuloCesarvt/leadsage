import asyncio
from datetime import datetime, timedelta, timezone

from app import robo_service


def _iso(minutos_atras):
    return (datetime.now(timezone.utc) - timedelta(minutes=minutos_atras)).isoformat(timespec="seconds")


class _Perfil:
    def __init__(self, status=""):
        self.assinatura_status = status


def _deduz(monkeypatch, saldo=5):
    gastos = []

    async def deduz(uid, n, email=None):
        gastos.append(n)
        return saldo - n if saldo >= n else None
    monkeypatch.setattr(robo_service, "check_and_deduct_credits", deduz)
    return gastos


def test_no_teste_o_robo_responde_de_graca(monkeypatch):
    gastos = _deduz(monkeypatch, saldo=0)
    conv = {"mensagens": []}
    assert asyncio.run(robo_service._cobrar_resposta("u~empresa", "a@b.com", _Perfil("convite"), conv)) is True
    assert gastos == [] and "ativa_ate" not in conv


def test_conta_que_paga_cobra_por_conversa_ativa_e_nao_por_mensagem(monkeypatch):
    gastos = _deduz(monkeypatch, saldo=5)
    conv = {"mensagens": []}
    for _ in range(6):                                   # seis mensagens da MESMA conversa
        assert asyncio.run(robo_service._cobrar_resposta("u", "a@b.com", _Perfil("ativa"), conv)) is True
    assert gastos == [1]                                 # um crédito só
    outra = {"mensagens": []}
    assert asyncio.run(robo_service._cobrar_resposta("u", "a@b.com", _Perfil("ativa"), outra)) is True
    assert gastos == [1, 1]                              # outra conversa ativa: outro crédito


def test_conversa_volta_a_contar_depois_da_janela(monkeypatch):
    gastos = _deduz(monkeypatch, saldo=5)
    antiga = {"mensagens": [], "ativa_ate": _iso(60 * 24)}      # a janela venceu ontem
    assert asyncio.run(robo_service._cobrar_resposta("u", "a@b.com", _Perfil("ativa"), antiga)) is True
    assert gastos == [1]


def test_conta_que_paga_sem_credito_nao_responde(monkeypatch):
    _deduz(monkeypatch, saldo=0)
    assert asyncio.run(robo_service._cobrar_resposta("u", "a@b.com", _Perfil("ativa"), {"mensagens": []})) is None


def test_lead_avancado_com_mensagem_sua_o_robo_nao_retoma():
    voce = {"mensagens": [{"de": "contato", "texto": "oi"}, {"de": "voce", "texto": "combinado, quarta 14h15"}]}
    for etapa in ("Reunião", "Proposta", "Fechado"):
        assert robo_service._conduzida_por_voce({"etapa": etapa}, voce) is True        # o caso da Clínica Inovar
    assert robo_service._conduzida_por_voce({"etapa": "Respondeu"}, voce) is False      # no início do funil o robô conduz normalmente
    so_robo = {"mensagens": [{"de": "contato", "texto": "ok"}, {"de": "robo", "texto": "fechado"}]}
    assert robo_service._conduzida_por_voce({"etapa": "Reunião"}, so_robo) is False     # reunião marcada pelo próprio robô: ele segue
    assert robo_service._conduzida_por_voce(None, voce) is False


class _P:
    company_name = "Vizar Peças"


def _conv(texto, robo=0):
    return {"mensagens": [{"de": "robo", "texto": "x"}] * robo + [{"de": "contato", "texto": texto}]}


def test_cumprimento_simples_tem_resposta_mesmo_com_a_ia_fora():
    for t in ("Boa tarde! Tudo bem?", "Bom dia", "Oi", "oii tudo bem?", "Olá!", "Tudo bem?"):
        d = robo_service._decisao_de_reserva(_conv(t), _P())
        assert d and d.usou_ia is False and d.mensagens and "Como posso te ajudar" in d.mensagens[0], t
    assert robo_service._decisao_de_reserva(_conv("Boa tarde! Tudo bem?"), _P()).mensagens[0].startswith("Boa tarde!")
    assert "Vizar Peças" in robo_service._decisao_de_reserva(_conv("oi"), _P()).mensagens[0]


def test_pergunta_de_verdade_espera_a_ia_e_conversa_em_andamento_tambem():
    assert robo_service._decisao_de_reserva(_conv("Vocês instalam split de 12 mil BTU? Quanto custa?"), _P()) is None
    assert robo_service._decisao_de_reserva(_conv("oi", robo=2), _P()) is None
    assert robo_service._decisao_de_reserva({"mensagens": []}, _P()) is None


def test_cumprimento_usa_o_prompt_curto_e_a_conversa_de_verdade_o_completo():
    from app.ai_sdr import montar_prompt
    cfg = {"objetivo": "agendar", "oferta": {"servico": "site", "nome": "Site", "preco": "1500"}}
    curto = montar_prompt([{"de": "robo", "texto": "Oi"}, {"de": "contato", "texto": "Boa tarde! Tudo bem?"}], "whatsapp", {"company_name": "X"}, cfg, {"id": "1", "name": "Maria"})
    cheio = montar_prompt([{"de": "robo", "texto": "Oi"}, {"de": "contato", "texto": "quanto custa?"}], "whatsapp", {"company_name": "X"}, cfg, {"id": "1", "name": "Maria"})
    assert len(curto) < len(cheio) * 0.75
    assert "MÉTODO DE VENDAS" not in curto and "MÉTODO DE VENDAS" in cheio
    for regra in ("PROIBIDO: urgência ou escassez inventada", "NUNCA invente preço", "NUNCA se apresente nem se descreva"):
        assert regra in curto and regra in cheio           # as travas de segurança não saem nunca


# ---- o caso da Clínica Inovar: conversa já conduzida pela equipe, lead em "Reunião"
def _conversa_inovar():
    t = "2026-11-12T16:%02d:00+00:00"
    return [
        {"de": "robo", "texto": "Boa tarde! Me chamo Rômulo, consultor da Seometria...", "em": "2026-11-11T16:30:00+00:00"},
        {"de": "contato", "texto": "Amanhã pode ser umas 14h15?", "em": "2026-11-11T18:12:00+00:00"},
        {"de": "voce", "texto": "Claro, pode ser sim", "em": "2026-11-11T18:23:00+00:00"},
        {"de": "voce", "texto": "Vou aprimorar essa previa para te apresentar amanhã esse horário.", "em": "2026-11-11T18:23:30+00:00"},
        {"de": "voce", "texto": "Barbara, estamos com um mutirão de sites: seu site sairia por apenas R$ 450,00, com 50% de desconto.", "em": t % 48},
        {"de": "contato", "texto": "Bom dia! Tudo bem e com você?", "em": "2026-11-13T14:34:00+00:00"},
    ]


def test_contexto_da_conversa_vai_no_topo_do_pedido_com_o_que_a_equipe_combinou():
    from app.ai_sdr import montar_prompt
    cfg = {"objetivo": "agendar", "oferta": {"servico": "site", "nome": "Site", "preco": "900"}}
    lead = {"id": "1", "name": "Clínica Inovar", "etapa_funil": "Reunião"}
    p = montar_prompt(_conversa_inovar(), "whatsapp", {"company_name": "Seometria"}, cfg, lead, None, {"reuniao": "sexta 14h15"})
    topo = p[:p.index("== O QUE ")]
    assert "CONTEXTO DESTA CONVERSA" in topo and "da equipe de Seometria (humano)" in topo
    assert "Situação no funil de vendas: Reunião" in topo and "JÁ COMBINADA: sexta 14h15" in topo
    assert "Claro, pode ser sim" in topo and "R$ 450" in topo                       # o que o dono combinou e ofereceu
    assert "NÃO proponha, remarque nem crie outra reunião" in topo and "NÃO é uma conversa nova" in topo


def test_conversa_curta_sem_equipe_nao_ganha_bloco_de_contexto():
    from app.ai_sdr import montar_prompt
    cfg = {"objetivo": "agendar", "oferta": {"servico": "site", "nome": "Site", "preco": "900"}}
    p = montar_prompt([{"de": "robo", "texto": "Oi"}, {"de": "contato", "texto": "Boa tarde"}], "whatsapp", {"company_name": "X"}, cfg, {"id": "1"})
    assert "CONTEXTO DESTA CONVERSA" not in p


def test_robo_nao_reabre_reuniao_em_conversa_da_equipe():
    from app.ai_sdr import reabre_reuniao
    lead = {"etapa_funil": "Reunião"}
    msgs = _conversa_inovar()
    for resposta in ("Terça ou quarta-feira seria melhor? Se sim, prefere de manhã ou de tarde?",
                     "Qual desses horários te atende melhor para nossa rápida ligação?",
                     "Quarta-feira às 12h30 está ótimo! Vou agendar nossa ligação de 10 minutos."):
        assert reabre_reuniao([resposta], msgs, lead), resposta
    assert reabre_reuniao(["Bom dia, Barbara! Tudo ótimo. Vi sua resposta sobre a proposta, quer tirar alguma dúvida?"], msgs, lead) is None
    # se o CLIENTE pediu para mudar, o robô pode propor
    msgs2 = msgs + [{"de": "contato", "texto": "Preciso remarcar, não consigo nesse horário", "em": "2026-11-13T15:00:00+00:00"}]
    assert reabre_reuniao(["Claro! Terça às 10h ou quarta às 15h?"], msgs2, lead) is None
    # conversa sem equipe e fora do funil avançado: segue o fluxo normal
    assert reabre_reuniao(["Segunda às 10h ou às 15h?"], [{"de": "contato", "texto": "oi"}], {"etapa_funil": "Respondeu"}) is None


# ---- IA fora do ar: o que está CADASTRADO ainda é respondido (caso real da Vizar: "Quais outros serviços vocês prestam?")
CFG_VIZAR = {"oferta": {
    "nome": "Manutenção em linha branca", "agenda": "segunda-feira à sexta-feira, das 08h00 as 18h00", "garantia": "90 dias", "visita": "paga", "visita_preco": 70,
    "inclui": "Instalação de ar-condicionado residencial e comercial.\nHigienização de ar-condicionado, garantindo melhor qualidade do ar.\nManutenção preventiva e corretiva de aparelhos.",
    "tabela_precos": "Higienização de ar condicionado de 9 e 12 mil Btus: R$ 180,00\nHigienização de ar condicionado de 18 e 24 mil btus: R$ 220,00\nRecarga de gás: mediante orçamento."}}


def test_pergunta_de_servicos_e_respondida_pelo_cadastro_sem_ia():
    conv = {"mensagens": [{"de": "robo", "texto": "Qual o melhor dia: segunda ou terça?"}, {"de": "contato", "texto": "Quais outros serviços voces prestam?"}]}
    d = robo_service._decisao_de_reserva(conv, _P(), CFG_VIZAR)
    assert d and d.usou_ia is False
    t = d.mensagens[0]
    assert "Instalação de ar-condicionado" in t and "Higienização" in t and "Manutenção preventiva" in t and "Qual deles" in t


def test_preco_garantia_e_horario_saem_so_do_cadastro():
    def resp(q):
        d = robo_service._decisao_de_reserva({"mensagens": [{"de": "contato", "texto": q}]}, _P(), CFG_VIZAR)
        return d.mensagens[0] if d else None
    p = resp("qual o valor da higienização?")
    assert "R$ 180,00" in p and "R$ 220,00" in p and "técnico confirma" in p and "R$ 70" in p
    assert "90 dias" in resp("tem garantia?") and "08h00" in resp("que horas vocês funcionam?")
    assert resp("vocês fazem instalação em prédio com andaime e laudo?") is None            # o que o cadastro não responde espera a IA
    sem = {"mensagens": [{"de": "contato", "texto": "quais serviços vocês prestam?"}]}
    assert robo_service._decisao_de_reserva(sem, _P(), {}) is None                          # sem cadastro, não inventa


# ---- TRAVA DE IDIOMA (caso Espaço Bella Vitta: lead escreveu em português e o robô respondeu em inglês)
def test_id_interno_do_whatsapp_nao_e_telefone_nem_vira_pais():
    from app import idioma
    assert idioma.pais_do_telefone("+199088981168177") == ""                 # LID de 15 dígitos: o "+1" já foi lido como EUA
    assert idioma.do_lead({"phone": "+199088981168177"})["codigo"] == "pt"   # sem sinal de país: Brasil, português
    assert idioma.pais_do_telefone("+5515991965370") == "BR" and idioma.pais_do_telefone("+14155550123") == "US"
    assert idioma.pais_do_telefone("+351912345678") == "PT"
    assert not idioma.telefone_plausivel("199088981168177") and idioma.telefone_plausivel("5515991965370")


def test_detecta_o_idioma_do_texto():
    from app import idioma
    assert idioma.detectar("Sim. Mas só poderei te atender após as 22 hs. Assim posso me concentrar melhor. Pode ser?") == "pt"
    assert idioma.detectar("Qual horário?") == "pt" and idioma.detectar("Bom dia!") == "pt"
    assert idioma.detectar("Understood! I'll be here after 10 PM to chat about the color palette and updates. Does that work for you?") == "en"
    assert idioma.detectar("Sorry for the confusion! I meant any time after 10 PM (22:00) works for me.") == "en"
    assert idioma.detectar("Hola, buenos dias, quiero saber el valor de la limpieza") == "es"
    assert idioma.detectar("ok") == ""


CONVERSA_BELLA = [
    {"de": "robo", "texto": "Deixamos o site com a sua cara, mas mesmo nessa versão prévia você pode ver que ele já tem redirecionamento para seu canal de atendimento aqui no whatsapp"},
    {"de": "contato", "texto": "Sim. Mas só poderei te atender após as 22 hs. Assim posso me concentrar melhor. Tenho interesse em atualizar e deixar minha cara com informações precisas e paleta de cores mais atualizadas. Pode ser?"},
]


def test_resposta_em_ingles_para_cliente_em_portugues_e_barrada():
    from app.ai_sdr import problemas_da_resposta
    lead = {"id": "in_whatsapp_199088981168177", "phone": "+199088981168177"}
    ingles = ["Understood! I'll be here after 10 PM to chat about the color palette and updates. Does that work for you?"]
    erros = problemas_da_resposta(ingles, {}, CONVERSA_BELLA, lead)
    assert any("IDIOMA ERRADO" in e and "português" in e for e in erros)
    assert not any("IDIOMA ERRADO" in e for e in problemas_da_resposta(["Combinado! Depois das 22h então. Qual dia fica melhor pra você?"], {}, CONVERSA_BELLA, lead))


def test_prompt_manda_responder_no_idioma_do_cliente_mesmo_com_cadastro_de_outro_pais():
    from app.ai_sdr import montar_prompt
    cfg = {"objetivo": "agendar", "oferta": {"servico": "site", "nome": "Site", "preco": "900"}}
    lead = {"id": "x", "phone": "+14155550123", "location": "Austin, United States"}         # cadastro diz EUA...
    p = montar_prompt(CONVERSA_BELLA, "whatsapp", {"company_name": "Seometria"}, cfg, lead)   # ...mas o cliente escreve em português
    assert "IDIOMA DA CONVERSA" in p and "português do Brasil" in p and "o lead é de Estados Unidos" not in p
    ingles = [{"de": "contato", "texto": "Hello, can you send me the price? We would like to start next week."}]
    assert "o cliente está escrevendo em inglês" in montar_prompt(ingles, "whatsapp", {"company_name": "Seometria"}, cfg, lead)


def test_reserva_em_portugues_nao_responde_quem_escreve_em_outro_idioma():
    conv = {"mensagens": [{"de": "contato", "texto": "Good morning, could you tell me what services you offer?"}]}
    assert robo_service._decisao_de_reserva(conv, _P(), CFG_VIZAR) is None


# ---- o telefone NÃO decide o idioma; a conversa decide; o país só vale quando a BUSCA foi lá fora
def test_telefone_nunca_decide_o_idioma():
    from app import idioma
    for fone in ("+14155550123", "+199088981168177", "+351912345678", "+34600111222"):
        assert idioma.do_lead({"phone": fone})["pais_codigo"] == "BR"                 # sem localização da busca: Brasil, português
    assert idioma.do_lead({"location": "Austin, United States", "phone": "+5515991965370"})["codigo"] == "en"   # busca nos EUA: inglês
    assert idioma.do_lead({"location": "Campinas, SP", "phone": "+14155550123"})["codigo"] == "pt"              # busca no Brasil: português


def test_conversa_nao_troca_de_idioma_no_meio():
    from app import idioma
    pt = [{"de": "robo", "texto": "Bom dia! Tudo bem? Posso te mostrar a prévia do site que montamos para vocês?"},
          {"de": "contato", "texto": "ok"}, {"de": "contato", "texto": "sim"}]
    assert idioma.da_conversa(pt) == "pt"                                              # cliente só disse "ok/sim": vale o que a conversa já vinha sendo
    en = [{"de": "robo", "texto": "Hello! Can I show you the preview we made for your business?"}, {"de": "contato", "texto": "ok"}]
    assert idioma.da_conversa(en) == "en"
    assert idioma.da_conversa([{"de": "contato", "texto": "Hello, how much does it cost?"}, {"de": "robo", "texto": "Olá"}]) == "en"   # o cliente escreveu em inglês: inglês
