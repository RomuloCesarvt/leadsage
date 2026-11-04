"""Modo ar-condicionado: serviço local, sem site nem prévia. Rodar: cd backend && python -m pytest -q test_ar_condicionado.py"""
import re

from app import abordagem_mestra, ai_oferta, ai_robo, ai_sdr, fechamento

CFG = {"oferta": {"servico": "ar", "tabela_precos": "Limpeza de split 9 a 12 mil BTU: R$ 150\nInstalação de split: R$ 450",
                  "regiao": "Botucatu e região", "visita": "gratis", "agenda": "segunda a sábado, das 8h às 18h", "garantia": "90 dias"},
       "objetivo": "site", "estilo": "comercial", "promocao": {"ativa": True, "preco": 600}}
LEAD = {"company": "Clínica Vida", "niche": "Clínicas", "city": "Botucatu"}


def test_so_o_servico_ar_dispensa_a_previa():
    assert ai_oferta.sem_previa(CFG) and not ai_oferta.sem_previa({"oferta": {"servico": "site"}})
    assert not ai_oferta.promocao_ativa(CFG)          # promoção de site não vale aqui


def test_tabela_entra_no_catalogo_que_o_verificador_conhece():
    c = ai_oferta.aplicar(CFG)
    assert "R$ 150" in c["catalogo"] and "R$ 450" in c["catalogo"]


def test_prompt_nao_manda_para_site_nem_previa():
    p = ai_sdr.montar_prompt([{"de": "contato", "texto": "quanto custa a limpeza?"}], "whatsapp", {"company_name": "Frio Total"}, CFG, LEAD)
    assert "A PRÉVIA DO SITE" not in p and "SITES: O QUE UM ESPECIALISTA SABE" not in p and "REGRA_DA_PREVIA" not in p
    assert "Tabela de preços" in p and "visita técnica" in p.lower()
    assert "Já tenho site" not in p and "[LINK_DA_PREVIA]" not in p


def test_quero_fechar_vira_orcamento_e_visita():
    ms, _ = fechamento.montar_visita(CFG, LEAD, "Ana")
    texto = " ".join(ms).lower()
    assert "endereço" in texto and "aparelhos" in texto and "sem custo" in texto and "segunda a sábado" in texto
    assert "prévia" not in texto and "pix" not in texto
    assert "visita" in fechamento.motivo_para_o_dono([], CFG)


def test_robo_nunca_cria_previa_no_modo_ar():
    resposta = {"entendi": "x", "tipo": "interesse", "mensagens": ["Perfeito! Qual o endereço?"], "etapa": "descoberta", "enviar_previa": True}
    d = ai_robo.decidir([{"de": "contato", "texto": "pode mandar"}], "whatsapp", {"company_name": "Frio Total"}, CFG, LEAD, lambda prompt: resposta)
    assert not d.criar_previa
    assert not any("LINK_DA_PREVIA" in m for m in d.mensagens)


def test_primeira_mensagem_sem_site_e_com_pergunta():
    est = abordagem_mestra.estrutura("Frio Total", previa="nenhuma", canal="whatsapp", lead_id="a", nicho="Clínicas")
    assert "ar-condicionado" in est and "NÃO fale de site" in est
    assert abordagem_mestra.revisar_roteiro("Oi! Montei uma prévia do site", True, "nenhuma")
    assert not abordagem_mestra.revisar_roteiro("Bom dia! Sou o João da Frio Total. Quantos aparelhos vocês têm?", True, "nenhuma")


def test_orcamento_soma_em_codigo_so_com_a_tabela():
    o = ai_oferta.normalizar(CFG["oferta"])
    calc = ai_oferta.calcular_orcamento(o, [{"item": "Limpeza de split 9 a 12 mil BTU", "qtd": 2}, {"item": "instalação de split", "qtd": 1}])
    assert calc["total"] == 750 and not calc["fora_da_tabela"]
    txt = ai_oferta.mensagem_do_orcamento(o, calc)
    assert "R$ 750" in txt and "2 × Limpeza" in txt
    # item que não está na tabela: nada de total chutado
    fora = ai_oferta.calcular_orcamento(o, [{"item": "Troca de compressor", "qtd": 1}])
    assert fora["fora_da_tabela"] == ["Troca de compressor"] and fora["total"] == 0


def test_robo_manda_o_orcamento_calculado_pelo_codigo():
    resposta = {"entendi": "x", "tipo": "pergunta", "mensagens": ["Consigo sim! Te passo o orçamento."], "etapa": "proposta",
                "orcamento": [{"item": "Limpeza de split 9 a 12 mil BTU", "qtd": 3}]}
    d = ai_robo.decidir([{"de": "contato", "texto": "preciso de limpeza em 3 splits de 12 mil BTU"}], "whatsapp", {"company_name": "Frio Total"}, CFG, LEAD, lambda p: resposta)
    assert any("R$ 450" in m for m in d.mensagens)           # 3 x 150, somado em código
    assert d.sdr.get("orcamento_enviado") == 450


def test_robo_passa_para_humano_quando_pede_fora_da_tabela():
    resposta = {"entendi": "x", "tipo": "pergunta", "mensagens": ["Vou ver com o técnico."], "etapa": "proposta",
                "orcamento": [{"item": "Troca de compressor", "qtd": 1}]}
    d = ai_robo.decidir([{"de": "contato", "texto": "preciso trocar o compressor"}], "whatsapp", {"company_name": "Frio Total"}, CFG, LEAD, lambda p: resposta)
    assert d.passar_para_humano and "fora da tabela" in d.motivo
