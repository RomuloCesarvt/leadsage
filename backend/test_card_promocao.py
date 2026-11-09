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
        assert c.tem_placa(ramo) and c.artes_disponiveis(ramo) == 3
        imgs = [Image.open(io.BytesIO(c.gerar(ramo, "347", "Empresa X", a))) for a in (1, 2, 3)]
        assert all(i.size == (1080, 1350) for i in imgs)
        assert len({i.tobytes() for i in imgs}) == 3                 # as três artes são diferentes
    assert c.ramo_do_lead("Psicólogos") == "terapeuta" and c.ramo_do_lead("Arquitetura e engenharia") == "arquitetura"
    assert not c.tem_placa("dentista") and c.artes_disponiveis("dentista") == 1


def test_assinatura_inclui_a_arte():
    url = c.url_do_card("barbearia", "347", "X", 2)
    sig = url.split("sig=")[1]
    assert c.assinatura_valida("barbearia", "347", "X", sig, 2) and not c.assinatura_valida("barbearia", "347", "X", sig, 3)
