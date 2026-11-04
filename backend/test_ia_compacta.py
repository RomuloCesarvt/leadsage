"""Quando os motores gratuitos recusam o pedido completo, o robô tenta de novo com o prompt compacto em vez de ficar calado."""
import pytest

from app import ai_robo, ai_sdr
from app.ai_client import AIIndisponivel

MSGS = [{"de": "robo", "texto": "Oi! Posso te mostrar uma prévia do site?"}, {"de": "contato", "texto": "Quem é você e o que vocês fazem exatamente?"}]
RESPOSTA = {"mensagens": ["Sou o Rômulo, da Seometria: fazemos sites para negócios locais."], "etapa": "descoberta", "passos": 1}


def _decidir(gerar):
    return ai_robo.decidir(MSGS, "whatsapp", {"name": "Rômulo"}, {"ativo": True}, {"id": "L1", "name": "Maria"}, gerar)


def test_pedido_completo_recusado_tenta_o_compacto_e_responde():
    chamadas = []

    def gerar(prompt):
        chamadas.append(len(prompt))
        if "COMO TRAZER A REUNIÃO" in prompt:                  # o pedido completo "não cabe": a IA gratuita recusa
            raise AIIndisponivel("A fila da IA gratuita está cheia agora.", espera_s=5)
        return RESPOSTA

    d = _decidir(gerar)
    assert d.mensagens and "Rômulo" in d.mensagens[0] and not d.passar_para_humano
    assert len(chamadas) == 2 and chamadas[1] < chamadas[0]


def test_se_o_compacto_tambem_for_recusado_o_erro_sobe_e_nao_fica_em_laco():
    chamadas = []

    def gerar(prompt):
        chamadas.append(1)
        raise AIIndisponivel("sem motores", espera_s=5)

    with pytest.raises(AIIndisponivel):
        _decidir(gerar)
    assert len(chamadas) == 2                                     # completo + compacto, nada além


def test_compactar_tira_o_opcional_e_mantem_o_essencial():
    p = ai_sdr.montar_prompt(MSGS, "whatsapp", {"name": "Rômulo"}, {"ativo": True}, {"id": "L1", "name": "Maria"})
    c = ai_sdr.compactar(p)
    assert len(c) < len(p) * 0.85
    for essencial in ("== CONVERSA ==", "RESPONDA SÓ COM ESTE JSON", "== FORMA ==", "NUNCA invente preço", "NUNCA se apresente nem se descreva como"):
        assert essencial in c
    assert "== COMO TRAZER A REUNIÃO" not in c


def test_fala_enorme_do_cliente_nao_enche_o_pedido():
    menu = "APÓS ANALISAR OS ITENS ACIMA, QUAL DAS OPÇÕES VOCÊ PRECISA? " * 40
    p = ai_sdr.montar_prompt([{"de": "contato", "texto": menu}], "whatsapp", {"name": "R"}, {"ativo": True}, {"id": "L1", "name": "M"})
    assert menu not in p and "[…]" in p
    longa = [{"de": "contato" if i % 2 else "robo", "texto": f"fala {i}"} for i in range(40)]
    q = ai_sdr.montar_prompt(longa, "whatsapp", {"name": "R"}, {"ativo": True}, {"id": "L1", "name": "M"})
    assert "fala 39" in q and "fala 23" not in q                   # só as 16 últimas


def test_todos_os_motores_recebem_a_mesma_instrucao_e_a_resposta_sai_limpa():
    from app import ai_providers as ap
    for json_mode, temp in ((True, ap.TEMPERATURA_JSON), (False, ap.TEMPERATURA_TEXTO)):
        c = ap._corpo("qualquer", "oi", 100, json_mode, False)
        assert c["messages"][0] == {"role": "system", "content": ap.SISTEMA_COMUM}
        assert c["temperature"] == temp
    assert ap.limpar_resposta("<think>vou pensar</think>\nOlá, tudo bem?") == "Olá, tudo bem?"
    assert ap.limpar_resposta("raciocínio solto</think>Olá") == "Olá"
    assert {"sambanova", "nvidia"} <= {p["nome"] for p in ap.PROVEDORES}
