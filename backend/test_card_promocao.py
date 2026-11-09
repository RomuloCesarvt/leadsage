import io

from PIL import Image

from app import ai_robo, card_promocao as c

PROMO = {"ativa": True, "preco": "347", "inclui": "Site profissional", "formato": "card"}
CFG = {"estilo": "comercial", "promocao": PROMO, "oferta": {"servico": "site"}}
LEAD = {"id": "L1", "name": "Sorriso Claro", "niche": "Dentistas"}


def test_gera_png_do_tamanho_certo_e_escolhe_o_ramo():
    png = c.gerar("dentista", "347", "Sorriso Claro")
    assert Image.open(io.BytesIO(png)).size == (1080, 1350)
    assert c.ramo_do_lead("Dentistas") == "dentista" and c.ramo_do_lead("Pet shops") == "pet" and c.ramo_do_lead("Contabilidade") == "padrao"
    assert c._preco_partes("347") == ("347", "00") and c._preco_partes("1.249,90") == ("1.249", "90")


def test_endereco_assinado_nao_aceita_preco_trocado():
    url = c.url_do_card("pet", "347", "Amigo Fiel")
    sig = url.split("sig=")[1]
    assert c.assinatura_valida("pet", "347", "Amigo Fiel", sig)
    assert not c.assinatura_valida("pet", "1", "Amigo Fiel", sig)


def _decidir(mensagens, cfg=CFG, sdr=None):
    return ai_robo.decidir(mensagens, "whatsapp", {"name": "Rômulo"}, cfg, LEAD, lambda _: {}, None, sdr)


def test_formato_card_troca_a_previa_pela_promocao_com_card():
    msgs = [{"de": "robo", "texto": "Posso te mandar a condição especial que estamos fazendo?"}, {"de": "contato", "texto": "Pode sim"}]
    d = _decidir(msgs)
    assert d.card and not d.criar_previa and "R$ 347" in d.resposta and "LINK" not in d.resposta and d.sdr["promo_enviada"]


def test_formato_ambos_manda_a_previa_e_so_depois_do_gostei_a_promocao_com_card():
    cfg = {**CFG, "promocao": {**PROMO, "formato": "ambos"}}
    d1 = _decidir([{"de": "robo", "texto": "Quer ver uma prévia do site?"}, {"de": "contato", "texto": "pode"}], cfg)
    assert d1.criar_previa and not d1.card and "R$" not in d1.resposta
    d2 = _decidir([{"de": "robo", "texto": "Aqui a prévia https://x.vercel.app"}, {"de": "contato", "texto": "gostei!"}], cfg, sdr={"previa_enviada": "x"})
    assert d2.card and "R$ 347" in d2.resposta


def test_formato_previa_nao_leva_card():
    cfg = {**CFG, "promocao": {**PROMO, "formato": "previa"}}
    d = _decidir([{"de": "robo", "texto": "Aqui a prévia https://x.vercel.app"}, {"de": "contato", "texto": "gostei!"}], cfg, sdr={"previa_enviada": "x"})
    assert not d.card and "R$ 347" in d.resposta


def test_card_na_abordagem_so_quando_ligado():
    from app import ai_oferta
    assert not ai_oferta.card_na_abordagem(CFG)
    cfg = {**CFG, "promocao": {**PROMO, "formato": "ambos", "card_na_abordagem": True}}
    assert ai_oferta.card_na_abordagem(cfg)
    assert not ai_oferta.card_na_abordagem({**cfg, "promocao": {**cfg["promocao"], "formato": "previa"}})


def test_placas_dos_ramos_dao_tres_artes_e_ramo_sem_foto_cai_no_desenhado():
    for ramo in ("barbearia", "restaurante", "academia", "terapeuta", "arquitetura"):
        assert c.tem_placa(ramo) and c.artes_disponiveis(ramo) == 5
        imgs = [Image.open(io.BytesIO(c.gerar(ramo, "347", "Empresa X", a))) for a in (1, 2, 3, 4, 5)]
        assert all(i.size == (1080, 1350) for i in imgs)
        assert len({i.tobytes() for i in imgs}) == 5                 # as cinco artes são diferentes
    assert c.ramo_do_lead("Psicólogos") == "terapeuta" and c.ramo_do_lead("Arquitetura e engenharia") == "arquitetura"
    assert not c.tem_placa("dentista") and c.artes_disponiveis("dentista") == 1


def test_assinatura_inclui_a_arte():
    url = c.url_do_card("barbearia", "347", "X", 2)
    sig = url.split("sig=")[1]
    assert c.assinatura_valida("barbearia", "347", "X", sig, 2) and not c.assinatura_valida("barbearia", "347", "X", sig, 3)


def test_o_card_usa_o_valor_cadastrado_no_robo_sem_errar_a_casa_decimal():
    from app import ai_oferta
    for digitado, esperado in [("347", ("347", "00")), ("347,00", ("347", "00")), ("1.249,90", ("1.249", "90")), ("599,9", ("599", "90")), ("R$ 1200", ("1.200", "00"))]:
        guardado = ai_oferta.normalizar_promocao({"ativa": True, "preco": digitado})["preco"]       # o robô guarda um número (347.0)
        assert c._preco_partes(c.preco_texto(guardado)) == esperado, digitado
    # e o endereço do card leva o valor certo
    url = c.url_do_card("barbearia", c.preco_texto(499.0), "X", 1)
    assert "preco=499&" in url


def test_valor_vindo_da_tela_com_ponto_decimal():
    assert c._preco_partes("1249.9") == ("1.249", "90") and c._preco_partes("347.0") == ("347", "00") and c._preco_partes("1.249") == ("1.249", "00")


CFG_EMPRESA = {"oferta": {"servico": "ar", "nome": "Limpeza de ar-condicionado", "ativa": True},
               "promocao": {"ativa": True, "preco": "120", "inclui": "Higienização completa\nVisita técnica sem custo", "servico": "Limpeza de ar-condicionado", "card_na_abordagem": True}}


def test_empresa_card_e_aviso_sao_do_servico_e_nao_de_site():
    from app import ai_oferta
    assert ai_oferta.promocao_do_servico(CFG_EMPRESA) and ai_oferta.card_na_abordagem(CFG_EMPRESA)
    msg = ai_oferta.mensagem_da_promocao(CFG_EMPRESA)
    assert "Limpeza de ar-condicionado" in msg and "R$ 120" in msg and "Higienização completa" in msg and "prévia" not in msg.lower() and "site" not in msg.lower()
    midia = c.midia_da_promocao(CFG_EMPRESA, "Cliente X")
    assert "ramo=servico" in midia["url"] and "titulo=Limpeza" in midia["url"] and "preco=120&" in midia["url"]
    png = c.gerar("servico", "120", "X", 2, "Limpeza de ar-condicionado", "Higienização completa|Visita técnica sem custo")
    assert Image.open(io.BytesIO(png)).size == (1080, 1350)
    # assinatura cobre o título: não dá para trocar o serviço do endereço
    url = c.url_do_card("servico", "120", "X", 1, "Limpeza", "a|b")
    sig = url.split("sig=")[1]
    assert c.assinatura_valida("servico", "120", "X", sig, 1, "Limpeza", "a|b") and not c.assinatura_valida("servico", "120", "X", sig, 1, "Instalação", "a|b")


def test_empresa_aceitou_ouvir_a_condicao_recebe_o_card_do_servico():
    msgs = [{"de": "robo", "texto": "Posso te mandar a condição especial que estamos fazendo?"}, {"de": "contato", "texto": "pode sim"}]
    d = ai_robo.decidir(msgs, "whatsapp", {"name": "Rômulo"}, CFG_EMPRESA, {"id": "L1", "name": "Maria"}, lambda _: {}, None, None)
    assert d.card and not d.criar_previa and "R$ 120" in d.resposta and "prévia" not in d.resposta.lower()


def test_garantias_e_momentos_do_empresa_sao_do_servico():
    from app import valor_momento as v
    cfg = {**CFG_EMPRESA, "valor": {"momentos": ["apos_gostei"], "garantias": {"visita_gratis": True, "hospedagem": True}}}
    assert v.momentos_do(cfg) == ["so_se_perguntar"]
    assert v.garantias_marcadas(cfg) == ["visita técnica sem custo"]        # hospedagem é de agência e não vale aqui


def test_o_icone_de_cada_item_combina_com_o_que_ele_diz():
    assert c._icone_para("Higienização completa") == 8 and c._icone_para("Garantia de 90 dias") == 2 and c._icone_para("Atendimento no horário combinado") == 4
    assert c._icone_para("Agendamento pelo WhatsApp") == 0 and c._icone_para("Perfeito no celular") == 3 and c._icone_para("Instalação completa") == 6
    assert c._icone_para("Qualquer coisa") == 10          # sem palavra conhecida: um visto neutro
