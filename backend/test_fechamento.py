from app import ai_robo, fechamento

OFERTA = {"servico": "site", "preco": "1500", "prazo_dias": 7, "pagamento": "cartão em até 6x", "pix_chave": "11222333000181",
          "pix_titular": "Rômulo Silva", "sinal_percentual": 50, "fechamento": "checklist"}


def _decidir(texto, cfg, sdr=None):
    def gerar(_):
        raise AssertionError("o fechamento não pode depender da IA")
    msgs = [{"de": "robo", "texto": "Posso mandar a prévia?"}, {"de": "contato", "texto": texto}]
    return ai_robo.decidir(msgs, "whatsapp", {"name": "Rômulo"}, cfg, {"id": "L1", "name": "Maria Souza"}, gerar, None, sdr)


def test_quer_fechar_entrega_o_checklist_sem_usar_ia():
    d = _decidir("Gostei! Quero fechar", {"oferta": OFERTA})
    texto = "\n".join(d.mensagens)
    assert "R$ 1.500" in texto and "11222333000181" in texto and "R$ 750" in texto
    assert "Comprovante" in texto and "CPF/CNPJ" in texto and "Logo" in texto
    assert d.passar_para_humano and d.sdr["etapa"] == "fechamento" and d.sdr["fechamento_enviado"]
    assert not d.usou_ia


def test_sem_cadastro_o_robo_nao_inventa_valor_nem_pix_e_avisa_o_dono():
    d = _decidir("quero fechar", {"oferta": {"fechamento": "checklist"}})
    texto = "\n".join(d.mensagens)
    assert "R$" not in texto
    assert "chave Pix" in d.motivo and "valor do serviço" in d.motivo


def test_so_uma_vez_e_negacao_nao_fecha():
    assert not fechamento.quer_fechar("não quero fechar agora")
    assert not fechamento.quer_fechar("como funciona?")
    assert fechamento.quer_fechar("bora fechar")
    assert fechamento.quer_fechar("Fechado!")


# ---------------------------------------------------------------- estilo comercial e promoção

PROMO = {"ativa": True, "preco": "600", "inclui": "Hospedagem por 1 ano\nEndereço .vercel.app, sem custo de domínio\nManutenção do site"}
CFG_COMERCIAL = {"estilo": "comercial", "promocao": PROMO, "oferta": {"servico": "site", "nome": "Site profissional", "pix_chave": "x@pix.com", "fechamento": "checklist"}}


def _decidir_com_modelo(cfg, resposta_do_modelo, sdr=None):
    def gerar(_):
        return resposta_do_modelo
    msgs = [{"de": "robo", "texto": "Posso mandar a prévia?"}, {"de": "contato", "texto": "pode mandar"}]
    return ai_robo.decidir(msgs, "whatsapp", {"name": "Rômulo"}, cfg, {"id": "L1", "name": "Maria", "site_publicado": "https://x.vercel.app/s/maria"}, gerar, None, sdr)


MODELO_COM_LINK = {"mensagens": ["Claro! Aqui está a prévia: https://x.vercel.app/s/maria"], "etapa": "proposta", "passar_para_humano": False}


def test_previa_enviada_no_estilo_comercial_traz_a_promocao_com_os_itens_exatos():
    d = _decidir_com_modelo(CFG_COMERCIAL, MODELO_COM_LINK)
    assert len(d.mensagens) == 2 and "https://x.vercel.app/s/maria" in d.mensagens[0]
    promo = d.mensagens[1]
    assert "R$ 600" in promo and "Hospedagem por 1 ano" in promo and "sem custo de domínio" in promo and "Manutenção" in promo
    assert d.sdr["promo_enviada"] is True


def test_promocao_sai_uma_vez_so_e_so_no_estilo_comercial():
    d = _decidir_com_modelo(CFG_COMERCIAL, MODELO_COM_LINK, sdr={"promo_enviada": True})
    assert len(d.mensagens) == 1 and d.sdr["promo_enviada"] is True      # a marca sobrevive ao modelo
    d2 = _decidir_com_modelo({**CFG_COMERCIAL, "estilo": "consultiva"}, MODELO_COM_LINK)
    assert len(d2.mensagens) == 1 and "promo_enviada" not in d2.sdr
    d3 = _decidir_com_modelo({**CFG_COMERCIAL, "promocao": {**PROMO, "ativa": False}}, MODELO_COM_LINK)
    assert len(d3.mensagens) == 1


def test_fechamento_na_promocao_usa_o_preco_e_os_itens_anunciados():
    d = _decidir("quero fechar", CFG_COMERCIAL)
    texto = "\n".join(d.mensagens)
    assert "R$ 600" in texto and "Hospedagem por 1 ano" in texto and "x@pix.com" in texto


# ------------------------------------------------ fechamento em forma de conversa (padrão)

def test_quero_fechar_por_padrao_vira_conversa_e_deixa_claro_que_e_previa():
    d = _decidir("quero fechar", {"estilo": "comercial", "promocao": PROMO, "oferta": {"servico": "site"}, "link_agenda": "https://cal.com/x"})
    texto = "\n".join(d.mensagens)
    assert "prévia" in texto and "suas fotos" in texto and "layout" in texto
    assert "R$ 600" in texto and "Hospedagem por 1 ano" in texto.replace("hospedagem", "Hospedagem")
    assert "conversa rápida" in texto and "https://cal.com/x" in texto
    assert "Pix" not in texto and "Comprovante" not in texto and "CPF" not in texto
    assert d.passar_para_humano and "conversa" in d.motivo and not d.usou_ia


def test_aviso_da_promocao_explica_que_e_previa_e_convida_para_conversa():
    d = _decidir_com_modelo(CFG_COMERCIAL, MODELO_COM_LINK)
    promo = d.mensagens[1]
    assert "prévia" in promo and "suas fotos" in promo and "layout" in promo and "conversa rápida" in promo
    assert "quero fechar" not in promo
