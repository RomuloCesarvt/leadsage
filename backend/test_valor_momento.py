import asyncio

from app import valor_momento as v

CFG = {"valor": {"momentos": ["primeira_com_valor", "apos_gostei"], "garantias": {"sem_mensalidade": True, "hospedagem": True}, "detalhes": {"hospedagem": "1 ano"}},
       "promocao": {"ativa": True, "preco": "347"}}


def test_normaliza_e_limita_a_dois_momentos():
    assert v.normalizar(None)["momentos"] == ["apos_gostei"]
    assert v.normalizar({"momentos": ["x", "apos_resposta", "apos_gostei", "so_se_perguntar"]})["momentos"] == ["apos_resposta", "apos_gostei"]


def test_ab_divide_leads_e_cada_lead_fica_do_mesmo_lado():
    lados = [v.escolher(CFG, f"lead{i}") for i in range(200)]
    assert set(lados) == {"primeira_com_valor", "apos_gostei"} and 60 < lados.count("apos_gostei") < 140
    assert v.escolher(CFG, "lead7") == v.escolher(CFG, "lead7")


def test_so_cita_garantia_marcada_e_o_valor_cadastrado():
    b = v.bloco("primeira_com_valor", CFG, "abordagem")
    assert "R$ 347" in b and "sem mensalidade" in b and "hospedagem inclusa (1 ano)" in b and "domínio incluso" not in b
    sem = v.bloco("primeira_sem_numero", {"valor": {"momentos": ["primeira_sem_numero"]}}, "abordagem")
    assert "NÃO cite número" in sem and "não prometa" in sem
    assert "NÃO fale de preço" in v.bloco("apos_gostei", CFG, "abordagem")


def test_robo_so_pode_falar_de_valor_sem_pergunta_nos_momentos_liberados():
    from app import ai_sdr
    txt = ["A ideia é acabar com o medo do preço: site por R$ 347. Posso te mostrar como ficaria?"]
    m = [{"de": "robo", "texto": "oi"}, {"de": "contato", "texto": "oi"}]
    assert ai_sdr.problemas_da_resposta(txt, CFG, m, {"id": "L"}, False, "apos_resposta") == []
    assert ai_sdr.problemas_da_resposta(txt, CFG, m, {"id": "L"}, False, "apos_gostei")


def test_painel_conta_por_momento(monkeypatch):
    from app import fila_envio, robo_store
    async def listar(uid): return [{"momento": "primeira_com_valor", "status": "enviado", "canal": "whatsapp"}, {"momento": "apos_gostei", "status": "enviado", "canal": "whatsapp"}]
    async def conv(uid, com_mensagens=False):
        return [{"sdr": {"momento_valor": "primeira_com_valor", "momento_da_abordagem": True, "previa_enviada": "x"}, "mensagens": [{"de": "contato", "texto": "gostei"}]},
                {"sdr": {"momento_valor": "apos_gostei", "momento_da_abordagem": True}, "optout": True, "mensagens": [{"de": "contato", "texto": "para"}]},
                {"sdr": {"momento_valor": "apos_gostei"}, "mensagens": [{"de": "contato", "texto": "oi"}]}]
    monkeypatch.setattr(fila_envio, "listar", listar)
    monkeypatch.setattr(robo_store, "listar_conversas", conv)
    linhas = {l["momento"]: l for l in asyncio.run(v.painel("u"))}
    assert linhas["primeira_com_valor"]["gostaram"] == 1 and linhas["apos_gostei"]["pararam"] == 1 and linhas["apos_gostei"]["responderam"] == 1
