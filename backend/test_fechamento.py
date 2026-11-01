from app import ai_robo, fechamento

OFERTA = {"servico": "site", "preco": "1500", "prazo_dias": 7, "pagamento": "cartão em até 6x", "pix_chave": "11222333000181",
          "pix_titular": "Rômulo Silva", "sinal_percentual": 50}


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
    d = _decidir("quero fechar", {})
    texto = "\n".join(d.mensagens)
    assert "R$" not in texto
    assert "chave Pix" in d.motivo and "valor do serviço" in d.motivo


def test_so_uma_vez_e_negacao_nao_fecha():
    assert not fechamento.quer_fechar("não quero fechar agora")
    assert not fechamento.quer_fechar("como funciona?")
    assert fechamento.quer_fechar("bora fechar")
    assert fechamento.quer_fechar("Fechado!")
