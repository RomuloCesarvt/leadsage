import asyncio

from app import atividade, robo_store


def test_registra_no_maximo_a_cada_5_minutos(monkeypatch):
    gravados = []

    async def put(k, uid, tipo, d): gravados.append((k, uid, tipo, d["em"]))
    monkeypatch.setattr(robo_store, "_sql_put", put)
    atividade._ULTIMA.clear()
    asyncio.run(atividade.registrar("u1~empresa"))      # o espaço da empresa conta para a mesma conta
    asyncio.run(atividade.registrar("u1"))
    asyncio.run(atividade.registrar("u2"))
    assert [g[1] for g in gravados] == ["u1", "u2"] and gravados[0][0] == "atividade:u1" and gravados[0][2] == "atividade"


def test_falha_de_banco_nao_derruba(monkeypatch):
    async def put(*a, **k): raise RuntimeError("banco fora")
    monkeypatch.setattr(robo_store, "_sql_put", put)
    atividade._ULTIMA.clear()
    asyncio.run(atividade.registrar("u9"))       # não levanta


def test_iso_normaliza_datas_de_todo_jeito():
    assert atividade._iso("2026-11-11T22:10:00Z") == "2026-11-11T22:10:00+00:00"
    assert atividade._iso("2026-11-11T22:10:00.123456") == "2026-11-11T22:10:00+00:00"          # sem fuso = UTC
    assert atividade._iso("2026-11-11T19:10:00-03:00") == "2026-11-11T22:10:00+00:00"
    assert atividade._iso("lixo") == "" and atividade._iso(None) == ""
    assert atividade._base("u1~empresa") == "u1"


def test_segunda_tentativa_cobre_a_corrida_de_criacao(monkeypatch):
    chamadas = []

    async def put(k, uid, tipo, d):
        chamadas.append(1)
        if len(chamadas) == 1:
            raise RuntimeError("duplicate key")
    monkeypatch.setattr(robo_store, "_sql_put", put)
    atividade._ULTIMA.clear()
    asyncio.run(atividade.registrar("u7"))
    assert len(chamadas) == 2
