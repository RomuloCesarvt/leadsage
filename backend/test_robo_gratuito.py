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
