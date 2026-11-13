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
