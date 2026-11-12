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


def test_pausa_por_voce_ter_escrito_vale_so_por_um_tempo():
    conv = {"pausa_humana": True, "robo_ativo": False, "mensagens": [{"de": "contato", "texto": "oi", "em": _iso(50)}, {"de": "voce", "texto": "já respondo", "em": _iso(5)}]}
    assert robo_service._pausa_humana_vigente(conv) is True            # você falou há 5 min: o robô espera
    conv["mensagens"][-1]["em"] = _iso(robo_service.PAUSA_HUMANA_MIN + 1)
    assert robo_service._pausa_humana_vigente(conv) is False           # passou o tempo: quem escrever volta a ser atendido


def test_sem_pausa_ou_sem_data_nao_trava_o_robo():
    assert robo_service._pausa_humana_vigente({"mensagens": []}) is False
    assert robo_service._pausa_humana_vigente({"pausa_humana": True, "mensagens": [{"de": "voce", "em": "lixo"}]}) is False


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
