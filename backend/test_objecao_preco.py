"""Objeção de preço: o robô dá o gancho e uma PESSOA assume para passar o valor.

- "estou sem condições" / "tá caro" não é um "não": o robô vira a objeção ("é justamente por isso que te chamei"), cita a condição especial
  que o DONO cadastrou (nunca inventa promoção) e passa para o humano;
- nunca diz "vou ver o valor" (esfria e deixa o cliente sozinho);
- "já tenho quem faça / agência" continua sendo despedida educada, sem insistir.

Nada aqui chama a IA: a geração é substituída.
"""
import pytest

from app.ai_robo import decidir, desinteresse_firme
from app.ai_sdr import gancho_de_preco, montar_prompt, objecao_de_preco, problemas_da_resposta

CFG = {"uid": "alice", "objetivo": "agendar", "meu_nome": "Rômulo Leite", "meu_cargo": "consultor", "minha_empresa": "Seometria"}
LEAD = {"company": "Clínica Sorriso", "niche": "clínica odontológica"}


def conversa(*textos):
    saida = [{"de": "robo", "texto": "Oi! Vi o perfil da Clínica Sorriso no Google e montei uma prévia de site para vocês."}]
    for t in textos:
        saida.append({"de": "contato", "texto": t})
    return saida


def ia(mensagens, humano=False, motivo=""):
    chamadas = []

    def gerar(prompt):
        chamadas.append(prompt)
        return {"mensagens": list(mensagens), "passar_para_humano": humano, "motivo": motivo, "etapa": "objecao", "tipo": "objecao"}

    gerar.chamadas = chamadas
    return gerar


@pytest.mark.parametrize("texto", [
    "Estou sem condições agora", "to sem dinheiro esse mês", "Tá muito caro pra mim", "mês fraco, vendas caíram",
    "não tenho como pagar isso agora", "fora do meu orçamento", "não cabe no meu bolso", "sem grana no momento", "o valor está alto demais",
])
def test_reclamar_de_dinheiro_e_objecao_de_preco(texto):
    assert objecao_de_preco(texto)


@pytest.mark.parametrize("texto", [
    "Quanto custa?", "qual o valor do site?", "Não tenho tempo agora", "minha agenda está apertada", "Manda mais informação",
    "Vou pensar e te falo", "é caro?",
])
def test_pergunta_de_preco_e_outras_objecoes_nao_sao(texto):
    assert not objecao_de_preco(texto)


def test_o_prompt_so_traz_o_gancho_quando_o_cliente_reclamou_de_preco():
    com = montar_prompt(conversa("Estou sem condições agora"), "whatsapp", {}, CFG, LEAD)
    sem = montar_prompt(conversa("Quanto custa?"), "whatsapp", {}, CFG, LEAD)
    assert "OBJEÇÃO DE PREÇO: ESTA É A SITUAÇÃO AGORA" in com and "justamente por isso que te chamei" in com
    assert "OBJEÇÃO DE PREÇO: ESTA É A SITUAÇÃO AGORA" not in sem


def test_condicao_especial_do_dono_entra_no_gancho_e_a_falta_dela_proibe_promessa():
    cfg = {**CFG, "condicao_especial": "condição de lançamento para o seu segmento nesta semana"}
    p = montar_prompt(conversa("tá caro"), "whatsapp", {}, cfg, LEAD)
    assert "condição de lançamento para o seu segmento nesta semana" in p and "clínica odontológica" in p and "Rômulo assume" in p
    p2 = montar_prompt(conversa("tá caro"), "whatsapp", {}, CFG, LEAD)
    assert "NÃO cadastrou condição especial" in p2 and "não prometa desconto" in p2


def test_objecao_de_preco_passa_para_o_humano_mesmo_se_o_modelo_esquecer():
    gerar = ia(["Entendo! É justamente por isso que te chamei. O Rômulo assume agora e te passa a condição, tudo bem?"], humano=False)
    d = decidir(conversa("Estou sem condições agora"), "whatsapp", {}, CFG, LEAD, gerar)
    assert d.passar_para_humano and "preço" in d.motivo and d.mensagens
    assert not d.optout


def test_vou_ver_o_valor_e_barrado_e_o_modelo_tem_uma_chance_de_corrigir():
    respostas = iter([
        ["Entendo! Vou ver o valor e te retorno, tudo bem?"],
        ["Entendo, e é justamente por isso que te chamei! O Rômulo assume a conversa agora para te passar a condição certinha, tudo bem?"],
    ])
    chamadas = []

    def gerar(prompt):
        chamadas.append(prompt)
        return {"mensagens": next(respostas), "passar_para_humano": True, "motivo": "preço", "etapa": "objecao"}

    d = decidir(conversa("tá caro"), "whatsapp", {}, CFG, LEAD, gerar)
    assert len(chamadas) == 2 and "Nunca diga que vai ver ou consultar o valor" in chamadas[1]
    assert "vou ver o valor" not in d.resposta.lower() and d.passar_para_humano


def test_persistindo_em_enrolar_o_humano_assume_sem_mandar_a_enrolacao():
    gerar = ia(["Vou verificar o valor e já te retorno."])
    d = decidir(conversa("sem dinheiro agora"), "whatsapp", {}, CFG, LEAD, gerar)
    assert d.passar_para_humano and "conferência" in d.motivo and not d.resposta


def test_modelo_sem_resposta_usa_o_gancho_pronto_com_a_condicao_do_dono():
    cfg = {**CFG, "condicao_especial": "desconto de lançamento para clínicas até domingo"}
    d = decidir(conversa("tá caro"), "whatsapp", {}, cfg, LEAD, ia([]))
    assert d.passar_para_humano
    assert "justamente por isso" in d.mensagens[0] and "desconto de lançamento para clínicas até domingo" in d.mensagens[1] and "Rômulo" in d.mensagens[1]
    assert "R$" not in d.resposta


def test_gancho_pronto_sem_condicao_nao_promete_desconto():
    m = gancho_de_preco(CFG, {"nome": "Rômulo Leite"})
    assert "desconto" not in " ".join(m).lower() and "Rômulo" in m[1]
    assert "o responsável" in gancho_de_preco(CFG, {})[1]


def test_conferencia_so_barra_enrolacao_quando_ha_objecao_de_preco():
    assert not problemas_da_resposta(["Vou ver o horário e te retorno."], CFG, conversa("quanto custa?"))
    assert problemas_da_resposta(["Vou ver o valor e te retorno."], CFG, conversa("tá caro"))


@pytest.mark.parametrize("texto", [
    "Já tenho agência, obrigado", "já tenho uma agência que cuida disso", "Já tenho quem faça", "meu cunhado faz meus sites",
    "já tenho um designer",
])
def test_ja_tem_quem_faca_e_despedida(texto):
    assert desinteresse_firme(texto) == "ja_tem"
    d = decidir(conversa(texto), "whatsapp", {}, CFG, LEAD, ia(["não deveria ser chamado"]))
    assert d.optout and not d.passar_para_humano and "sucesso" in d.resposta


def test_ja_tem_com_pergunta_ou_mas_quero_continua_conversando():
    assert desinteresse_firme("Já tenho agência, mas quero ver o preço do seu") == ""
