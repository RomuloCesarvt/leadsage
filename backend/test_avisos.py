"""Central de avisos: prévia aberta e voltou, lead pedindo uma pessoa, resposta; ninguém que saiu ou é robô."""
from app import avisos


def previa(slug="padaria", visitas=1, ultima="2026-11-01T10:00:00+00:00", empresa="Padaria Sol"):
    return {"slug": slug, "lead_id": "7", "empresa": empresa, "visitas": visitas, "ultima": ultima}


def conversa(**kw):
    base = {"id": "c1", "nome": "Ana", "contato": "5511999990000", "lead_id": "7", "atualizado": "2026-11-01T11:00:00+00:00"}
    return {**base, **kw}


def test_primeira_abertura_e_volta():
    a = avisos.montar([previa()], [])
    assert a[0]["tipo"] == "previa" and "abriu a prévia" in a[0]["titulo"] and a[0]["lead_id"] == "7"
    b = avisos.montar([previa(visitas=3)], [])
    assert "voltou" in b[0]["titulo"] and "3ª visita" in b[0]["texto"]


def test_previa_sem_horario_nao_vira_aviso():
    assert avisos.montar([previa(ultima="")], []) == []


def test_lead_que_precisa_de_pessoa():
    a = avisos.montar([], [conversa(precisa_humano=True, motivo="Pediu o valor")])
    assert a[0]["tipo"] == "humano" and a[0]["titulo"] == "Ana precisa de você" and a[0]["texto"] == "Pediu o valor"
    assert a[0]["conversa_id"] == "c1"


def test_resposta_do_lead_com_trecho():
    ultima = {"de": "contato", "texto": "Oi,   quanto custa?\n", "em": "2026-11-01T12:00:00+00:00"}
    a = avisos.montar([], [conversa(ultima=ultima)])
    assert a[0]["tipo"] == "resposta" and a[0]["texto"] == "Oi, quanto custa?" and a[0]["quando"] == ultima["em"]


def test_nossa_ultima_fala_nao_e_aviso():
    assert avisos.montar([], [conversa(ultima={"de": "voce", "texto": "ola", "em": "x"})]) == []


def test_quem_saiu_e_robo_ficam_de_fora():
    ultima = {"de": "contato", "texto": "pare", "em": "2026-11-01T12:00:00+00:00"}
    assert avisos.montar([], [conversa(optout=True, ultima=ultima), conversa(contato_robo=True, precisa_humano=True)]) == []


def test_ordem_limite_e_nao_lidos():
    lista = avisos.montar([previa(ultima="2026-11-01T09:00:00+00:00"), previa(slug="b", ultima="2026-11-01T13:00:00+00:00")],
                          [conversa(precisa_humano=True, motivo="x")])
    assert [a["quando"] for a in lista] == sorted((a["quando"] for a in lista), reverse=True)
    assert avisos.nao_lidos(lista, "2026-11-01T10:30:00+00:00") == 2
    assert avisos.nao_lidos(lista, "") == 3
    assert len(avisos.montar([previa(slug=str(i), ultima=f"2026-11-01T10:{i:02d}:00+00:00") for i in range(60)], [], limite=5)) == 5
