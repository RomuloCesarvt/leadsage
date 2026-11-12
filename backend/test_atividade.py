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
