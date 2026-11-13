from datetime import datetime, timedelta, timezone

from app import avisos, reunioes

SEXTA_1448 = datetime(2026, 11, 13, 17, 48, tzinfo=timezone.utc)       # sexta, 14:48 em Brasília


def local(dt):
    return dt.astimezone(reunioes.BRASILIA).strftime("%a %d/%m %H:%M")


def test_interpreta_o_jeito_que_o_robo_e_o_cliente_escrevem():
    assert local(reunioes.interpretar("quarta-feira 12h30", SEXTA_1448)) == "Wed 18/11 12:30"      # o caso da Clínica Inovar
    assert local(reunioes.interpretar("Quarta 12:30", SEXTA_1448)) == "Wed 18/11 12:30"
    assert local(reunioes.interpretar("amanhã às 14h", SEXTA_1448)) == "Sat 14/11 14:00"
    assert local(reunioes.interpretar("15/11 às 9h", SEXTA_1448)) == "Sun 15/11 09:00"
    assert local(reunioes.interpretar("sexta 14:00", SEXTA_1448)) == "Fri 20/11 14:00"              # hoje já passou das 14h: semana que vem
    assert local(reunioes.interpretar("sexta 16h", SEXTA_1448)) == "Fri 13/11 16:00"                # hoje, ainda por vir


def test_sem_dia_ou_sem_hora_nao_inventa():
    assert reunioes.interpretar("quarta", SEXTA_1448) is None and reunioes.interpretar("12h30", SEXTA_1448) is None
    assert reunioes.interpretar("", SEXTA_1448) is None and reunioes.interpretar("amanhã às 27h", SEXTA_1448) is None


def _item(em):
    return {"id": "L1", "lead": {"company": "Clínica Inovar"}, "reuniao_em": em.isoformat(timespec="seconds")}


def test_aviso_de_1_hora_e_de_10_minutos_antes():
    reuniao = datetime(2026, 11, 18, 15, 30, tzinfo=timezone.utc)                  # quarta 12:30 em Brasília
    assert reunioes.avisos_da_reuniao(_item(reuniao), reuniao - timedelta(hours=2)) == []              # cedo demais
    a = reunioes.avisos_da_reuniao(_item(reuniao), reuniao - timedelta(minutes=59))
    assert [x["titulo"] for x in a] == ["Reunião com Clínica Inovar em 1 hora"]
    assert "quarta, 18/11 às 12:30" in a[0]["texto"].lower() and a[0]["quando"] == (reuniao - timedelta(hours=1)).isoformat(timespec="seconds")
    b = reunioes.avisos_da_reuniao(_item(reuniao), reuniao - timedelta(minutes=9))
    assert [x["titulo"] for x in b] == ["Reunião com Clínica Inovar em 1 hora", "Reunião com Clínica Inovar em 10 minutos"]
    assert reunioes.avisos_da_reuniao(_item(reuniao), reuniao + timedelta(minutes=30)) == []           # já passou
    assert all(x["tipo"] == "reuniao" and x["lead_id"] == "L1" for x in b)


def test_avisos_da_central_incluem_as_reunioes():
    reuniao = datetime.now(timezone.utc) + timedelta(minutes=8)
    lista = avisos.montar([], [], reunioes_marcadas=[_item(reuniao)])
    assert {x["tipo"] for x in lista} == {"reuniao"} and len(lista) == 2


# ---- o robô (ou você, pelo celular) combina o horário na conversa: o sistema agenda sozinho
def M(de, t, em):
    return {"de": de, "texto": t, "em": em}


CONVERSA_INOVAR = [
    M("contato", "Nem as 10h e nem as 15h consigo", "2026-11-13T14:41:35+00:00"),
    M("robo", "Terça ou quarta-feira seria melhor? Se sim, prefere de manhã ou de tarde?", "2026-11-13T14:42:41+00:00"),
    M("contato", "Segunda as 14:00; 17:00", "2026-11-13T17:45:50+00:00"),
    M("robo", "Qual desses horários na segunda fica melhor para nossa ligação?", "2026-11-13T17:46:19+00:00"),
    M("contato", "quarta 12:30; 13:00", "2026-11-13T17:46:23+00:00"),
    M("robo", "Perfeito, Barbara! Terça às 12h ou quarta às 12h30/13h.", "2026-11-13T17:46:33+00:00"),
    M("contato", "Quarta 12h30", "2026-11-13T17:46:54+00:00"),
    M("robo", "Quarta-feira às 12h30 está ótimo, Barbara! Vou agendar nossa ligação de 10 minutos.", "2026-11-13T17:47:19+00:00"),
    M("contato", "Certo", "2026-11-13T17:48:03+00:00"),
]
AGORA = datetime(2026, 11, 13, 17, 50, tzinfo=timezone.utc)


def test_detecta_a_reuniao_combinada_na_conversa_real():
    r = reunioes.detectar(CONVERSA_INOVAR, AGORA)
    assert r and r["em"] == "2026-11-18T15:30:00+00:00"                      # quarta 18/11 12:30 em Brasília


def test_oferta_com_dois_horarios_nao_e_combinado():
    assert reunioes.detectar(CONVERSA_INOVAR[:6], AGORA) is None              # só ofertas e disponibilidades: nada fechado ainda


def test_o_dono_combina_pelo_celular_e_o_cliente_confirma():
    conversa = [M("voce", "Claro, pode ser amanhã às 14h15", "2026-11-11T18:23:00+00:00"), M("contato", "Combinado", "2026-11-11T18:23:30+00:00")]
    r = reunioes.detectar(conversa, datetime(2026, 11, 11, 19, 0, tzinfo=timezone.utc))
    assert r and r["em"] == "2026-11-12T17:15:00+00:00"                         # 12/11 14:15 em Brasília


def test_cliente_pediu_para_remarcar_depois_desfaz_e_reuniao_passada_nao_agenda():
    conversa = CONVERSA_INOVAR + [M("contato", "Preciso remarcar, não consigo nesse horário", "2026-11-13T18:00:00+00:00")]
    assert reunioes.detectar(conversa, AGORA) is None
    assert reunioes.detectar(CONVERSA_INOVAR, datetime(2026, 11, 20, tzinfo=timezone.utc)) is None


def test_sincroniza_o_card_e_nao_troca_o_que_voce_marcou_a_mao(monkeypatch):
    import asyncio
    from app import pipeline_store, robo_service
    registrado = []

    async def obter(uid, lead_id):
        return {"id": lead_id, "etapa": "Respondeu", **estado}

    async def definir(uid, lead_id, em, texto="", por="voce"):
        registrado.append((lead_id, em, por))
    monkeypatch.setattr(pipeline_store, "obter", obter)
    monkeypatch.setattr(pipeline_store, "definir_reuniao", definir)
    monkeypatch.setattr(reunioes, "datetime", type("D", (datetime,), {"now": classmethod(lambda cls, tz=None: AGORA)}))
    conversa = {"lead_id": "L1", "mensagens": CONVERSA_INOVAR}
    estado = {}
    asyncio.run(robo_service._sincronizar_reuniao("u", conversa))
    assert registrado == [("L1", "2026-11-18T15:30:00+00:00", "robô")] and conversa["reuniao_em"] == "2026-11-18T15:30:00+00:00"
    registrado.clear()
    estado.update({"reuniao_em": "2026-11-19T12:00:00+00:00", "reuniao_por": "voce"})       # você marcou outro horário à mão
    asyncio.run(robo_service._sincronizar_reuniao("u", conversa))
    assert registrado == []
