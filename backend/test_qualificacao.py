from datetime import datetime, timedelta, timezone

from app import qualificacao as q

AGORA = datetime(2026, 11, 12, 15, 0, tzinfo=timezone.utc)


def item(etapa="Novo Lead", **kw):
    return {"id": "L1", "etapa": etapa, "atualizado": (AGORA - timedelta(days=1)).isoformat(), **kw}


def conv(**kw):
    base = {"lead_id": "L1", "contatos": 1, "total": 3, "ultima": {"de": "contato", "texto": "oi", "em": AGORA.isoformat()}, "sdr": {}}
    base.update(kw)
    return base


def tag(i, c):
    return q.etiqueta(i, c, AGORA)["id"]


def test_tags_por_situacao():
    assert tag(item("Fechado"), conv()) == "fechado"
    assert tag(item("Perdido"), conv()) == "perdido"
    assert tag(item("Reunião"), conv()) == "reuniao"
    assert tag(item("Respondeu"), conv(precisa_humano=True)) == "precisa_voce"
    assert tag(item("Respondeu"), conv(sdr={"temperatura": "quente"})) == "quente"
    assert tag(item("Respondeu"), conv(ultima={"de": "contato", "texto": "quanto custa a limpeza?", "em": AGORA.isoformat()})) == "preco"
    assert tag(item("Respondeu"), conv(sdr={"objecoes": ["preco"]})) == "objecao"
    assert tag(item("Respondeu"), conv()) == "respondeu"
    assert tag(item("Novo Lead"), None) == "novo"


def test_aguardando_e_esfriando_por_dias_sem_resposta():
    sem = {"lead_id": "L1", "contatos": 0, "total": 1, "ultima": {"de": "robo", "texto": "oi", "em": (AGORA - timedelta(hours=5)).isoformat()}, "sdr": {}}
    assert tag(item("Contato Enviado"), sem) == "aguardando"
    sem["ultima"]["em"] = (AGORA - timedelta(days=4)).isoformat()
    assert tag(item("Contato Enviado"), sem) == "esfriando"


def _fila(n, hora_utc, responde, prefixo):
    itens, convs = [], []
    for k in range(n):
        lid = f"{prefixo}{k}"
        itens.append({"lead_id": lid, "status": "enviado", "tipo": "abordagem", "enviado_em": datetime(2026, 11, 10, hora_utc, 0, tzinfo=timezone.utc).isoformat(), "momento": "apos_resposta"})
        if k < responde:
            convs.append({"lead_id": lid, "contatos": 1, "total": 2})
    return itens, convs


def test_analise_acha_o_melhor_horario_com_amostra_suficiente():
    fa, ca = _fila(10, 17, 5, "a")      # 14h em Brasília (tarde): 50%
    fb, cb = _fila(10, 12, 1, "b")      # 9h em Brasília (manhã): 10%
    r = q.analisar(fa + fb, ca + cb, [], AGORA)
    assert r["taxa_resposta"] == 30 and r["abordados"] == 20
    assert r["horario"][0]["nome"].startswith("à tarde") and r["horario"][0]["taxa"] == 50
    assert any("Melhor horário" in d["titulo"] and "tarde" in d["texto"] for d in r["dicas"])


def test_poucos_envios_nao_concluem_nada():
    f, c = _fila(3, 17, 2, "a")
    r = q.analisar(f, c, [], AGORA)
    assert not any(d["tipo"] == "dica" and "horário" in d["titulo"].lower() for d in r["dicas"])
    assert any(d["tipo"] == "info" for d in r["dicas"])


def test_alerta_de_quem_perguntou_valor():
    pipe = [item("Respondeu")]
    c = [conv(ultima={"de": "contato", "texto": "qual o valor?", "em": AGORA.isoformat()})]
    r = q.analisar([], c, pipe, AGORA)
    assert any(d["tipo"] == "alerta" and "valor" in d["titulo"] for d in r["dicas"])
