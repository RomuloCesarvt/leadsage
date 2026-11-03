from app import desempenho


def _item(i, nicho, etapa="Contato Enviado", origem="salvo"):
    return {"id": f"L{i}", "etapa": etapa, "origem": origem, "lead": {"niche": nicho, "company": f"Empresa {i}"}}


def _conv(i, msgs, temperatura="frio", **extra):
    return {"lead_id": f"L{i}", "sdr": {"temperatura": temperatura}, "mensagens": [{"de": de, "texto": t} for de, t in msgs], **extra}


def test_ranking_por_segmento_responde_interesse_e_pedido_de_link():
    itens = [_item(1, "Padarias"), _item(2, "Padaria"), _item(3, "padarias"), _item(4, "Dentistas"), _item(5, "Dentistas"), _item(6, "Dentistas", "Qualificado")]
    conversas = [
        _conv(1, [("robo", "Oi!"), ("contato", "pode mandar o link que eu mostro pra ela")], "quente"),
        _conv(2, [("robo", "Oi!"), ("contato", "oi")]),
        _conv(3, [("robo", "Oi!")]),
        _conv(4, [("robo", "Oi!"), ("contato", "quem é?")]),
    ]
    r = desempenho.calcular(itens, conversas)
    por_nome = {s["segmento"]: s for s in r["segmentos"]}
    pad, den = por_nome["Padarias"], por_nome["Dentistas"]
    assert pad["abordados"] == 3 and pad["responderam"] == 2 and pad["pediram_link"] == 1 and pad["interessados"] == 1
    assert den["abordados"] == 3 and den["responderam"] == 2 and den["interessados"] == 1 and den["pediram_link"] == 0
    assert r["destaques"]["mais_pedem_link"]["segmento"] == "Padarias"
    assert r["segmentos"][0]["segmento"] == "Padarias"          # quem tem mais pedidos de link vem primeiro


def test_sobra_de_busca_e_robo_do_outro_lado_nao_contam():
    itens = [_item(1, "Padarias", origem="busca"), _item(2, "Padarias")]
    conversas = [_conv(2, [("robo", "Oi!"), ("contato", "Atendimento automático")], contato_robo=True, classificado=True)]
    r = desempenho.calcular(itens, conversas)
    assert r["segmentos"][0]["leads"] == 1 and r["segmentos"][0]["responderam"] == 0


def test_taxa_so_ganha_destaque_com_amostra_minima():
    itens = [_item(1, "Pets"), _item(2, "Mercados"), _item(3, "Mercados"), _item(4, "Mercados")]
    conversas = [_conv(1, [("robo", "Oi!"), ("contato", "oi")])]
    r = desempenho.calcular(itens, conversas)
    assert r["destaques"]["responde_mais"] is None or r["destaques"]["responde_mais"]["segmento"] != "Pets"
    assert desempenho.calcular([], [])["segmentos"] == []
