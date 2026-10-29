"""O método de vendas do robô: descobre o que realmente trava, fecha quando o cliente está pronto e não vira insistência.

Nada aqui chama a IA: o que se confere é o que entra no prompt e as regras de código sobre a última fala do cliente.
"""
import pytest

from app import playbook_vendas as pv
from app.ai_sdr import montar_prompt

CFG = {"uid": "alice", "objetivo": "agendar", "meu_nome": "Rômulo Leite"}
LEAD = {"company": "Clínica Sorriso", "niche": "clínica odontológica"}


def conversa(*textos):
    saida = [{"de": "robo", "texto": "Oi! Vi o perfil da Clínica Sorriso e montei uma prévia para vocês."}]
    saida += [{"de": "contato", "texto": t} for t in textos]
    return saida


@pytest.mark.parametrize("texto", [
    "Vou pensar", "depois eu vejo", "Manda por e-mail", "me manda mais informações", "Agora não", "to muito corrido",
    "não tenho tempo agora", "quem sabe mês que vem", "qualquer coisa eu te aviso", "talvez",
])
def test_desculpa_educada_e_cortina_de_fumaca(texto):
    assert pv.cortina_de_fumaca(texto)


@pytest.mark.parametrize("texto", [
    "Quanto tempo leva para ficar pronto?", "Gostei! Como funciona?", "Qual o prazo?", "aceita pix?", "Pode me mandar a proposta",
    "ficou muito bom", "quero sim", "vamos fechar", "Como eu pago?",
])
def test_pergunta_de_prazo_pagamento_e_elogio_sao_sinal_de_compra(texto):
    assert pv.sinal_de_compra(texto)


@pytest.mark.parametrize("texto", ["não quero", "Não tenho interesse", "não gostei", "ok, obrigado", "quem é você?"])
def test_negacao_nao_e_sinal_de_compra(texto):
    assert not pv.sinal_de_compra(texto)


def test_o_metodo_vai_no_prompt_e_pede_para_descobrir_o_motivo_real_sem_insistir():
    p = montar_prompt(conversa("oi"), "whatsapp", {}, CFG, LEAD)
    assert "MÉTODO DE VENDAS" in p and "cortina de fumaça" in p and "o que\" ou \"como\"" in p
    assert "UMA tentativa por objeção" in p and "Dois \"nãos\" claros" in p


def test_vou_pensar_ativa_a_pergunta_calibrada_com_opcoes():
    p = montar_prompt(conversa("vou pensar"), "whatsapp", {}, CFG, LEAD)
    assert "DESCULPA EDUCADA" in p and "o valor, o momento" in p and "saída honrosa" in p or "Se não for agora" in p
    assert "SINAL DE COMPRA" not in p


def test_a_desculpa_que_volta_nao_repete_o_argumento_e_oferece_sair():
    sdr = {"objecoes": ["fumaça: vou pensar"]}
    p = montar_prompt(conversa("vou pensar", "depois eu vejo"), "whatsapp", {}, CFG, LEAD, sdr=sdr)
    assert "A DESCULPA VOLTOU" in p and "NÃO repita" in p and "perdido" in p


def test_sinal_de_compra_manda_fechar_com_duas_opcoes_e_parar_de_argumentar():
    p = montar_prompt(conversa("gostei! como funciona o pagamento?"), "whatsapp", {}, CFG, LEAD)
    assert "SINAL DE COMPRA" in p and "DOIS horários" in p and "NÃO acrescente argumentos" in p
    v = montar_prompt(conversa("gostei! como funciona o pagamento?"), "whatsapp", {}, {**CFG, "objetivo": "vender"}, LEAD)
    assert "forma de pagamento" in v and "formalizar" in v


def test_objecao_de_preco_tem_o_proprio_bloco_e_nao_mistura_com_a_fumaca():
    p = montar_prompt(conversa("estou sem condições, vou pensar"), "whatsapp", {}, CFG, LEAD)
    assert "OBJEÇÃO DE PREÇO: ESTA É A SITUAÇÃO AGORA" in p and "DESCULPA EDUCADA" not in p


def test_conversa_comum_nao_ganha_bloco_extra():
    p = montar_prompt(conversa("pode falar"), "whatsapp", {}, CFG, LEAD)
    for marca in ("== AGORA:", "OBJEÇÃO DE PREÇO: ESTA"):
        assert marca not in p
