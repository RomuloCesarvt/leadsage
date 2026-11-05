"""O print do cliente: o lead disse "Pode" à oferta da prévia e o robô respondeu "como posso ajudar?"."""
from app import ai_robo, robo_service

OFERTA = "Oi! Vi o perfil da sua empresa e preparei uma prévia do site, posso te mostrar?"


def _decidir(falas, lead=None, cfg=None):
    def gerar(_):
        raise AssertionError("o aceite da prévia não pode depender da IA")
    mensagens = [{"de": de, "texto": t} for de, t in falas]
    return ai_robo.decidir(mensagens, "whatsapp", {"name": "Rômulo"}, cfg or {}, lead or {"id": "L1", "name": "João"}, gerar)


def test_pode_depois_da_oferta_manda_o_link_na_hora_sem_ia():
    d = _decidir([("robo", OFERTA), ("contato", "Boa tarde"), ("contato", "Pode")], lead={"id": "L1", "site_publicado": "https://x.vercel.app/s/joao"})
    texto = "\n".join(d.mensagens)
    assert "https://x.vercel.app/s/joao" in texto and "prévia" in texto and "layout" in texto
    assert not d.usou_ia and not d.passar_para_humano and not d.criar_previa


def test_sem_site_criado_o_servico_cria_a_previa_e_troca_o_marcador():
    d = _decidir([("robo", OFERTA), ("contato", "Pode sim")])
    assert d.criar_previa and "[LINK_DA_PREVIA]" in d.mensagens[0]


def test_no_estilo_comercial_o_valor_nao_vai_junto_com_o_link():
    cfg = {"estilo": "comercial", "promocao": {"ativa": True, "preco": "600", "inclui": "Hospedagem por 1 ano"}, "oferta": {"servico": "site"}}
    d = _decidir([("robo", OFERTA), ("contato", "pode mandar")], cfg=cfg)
    assert "R$ 600" not in "\n".join(d.mensagens) and not d.sdr.get("promo_enviada")


def test_nao_confunde_outras_respostas():
    assert not ai_robo.aceitou_a_previa([{"de": "robo", "texto": OFERTA}, {"de": "contato", "texto": "Pode, mas agora não"}])
    assert not ai_robo.aceitou_a_previa([{"de": "robo", "texto": "Qual o melhor horário?"}, {"de": "contato", "texto": "Pode"}])   # não era oferta de prévia
    assert not ai_robo.aceitou_a_previa([{"de": "robo", "texto": OFERTA + " https://x"}, {"de": "contato", "texto": "Pode"}])        # o link já foi
    assert not ai_robo.aceitou_a_previa([{"de": "contato", "texto": "Pode"}])
    assert not ai_robo.aceitou_a_previa([{"de": "robo", "texto": OFERTA}, {"de": "contato", "texto": "vocês fazem site para loja virtual com pagamento?"}])


def test_contexto_do_whatsapp_entra_antes_da_primeira_fala_do_lead():
    conversa = {"mensagens": [{"de": "contato", "texto": "Boa tarde", "meta_id": "w2"}]}
    robo_service._semear_do_whatsapp(conversa, [
        {"id": "w0", "texto": OFERTA, "minha": True, "quando": 1700000000},
        {"id": "w2", "texto": "Boa tarde", "minha": False, "quando": 1700000100},
    ])
    assert [m["de"] for m in conversa["mensagens"]] == ["robo", "contato"] and conversa["mensagens"][0]["texto"] == OFERTA
    # já tem fala nossa: não duplica; e contexto só do lead não é importado
    antes = list(conversa["mensagens"])
    robo_service._semear_do_whatsapp(conversa, [{"id": "w9", "texto": "outra", "minha": True, "quando": 1}])
    assert conversa["mensagens"] == antes
    vazia = {"mensagens": [{"de": "contato", "texto": "oi", "meta_id": "x"}]}
    robo_service._semear_do_whatsapp(vazia, [{"id": "a", "texto": "oi", "minha": False, "quando": 1}])
    assert len(vazia["mensagens"]) == 1
