"""A pergunta do conector não pode baixar o histórico inteiro: o filtro dos itens em aberto é feito no banco.
Rodar: cd backend && python -m pytest -q test_consulta_leve.py"""
import asyncio

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

import app.database as database
from app import conector_whatsapp, fila_envio, robo_store


def _banco(tmp_path, monkeypatch):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 't.db'}")
    sessao = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    monkeypatch.setattr(robo_store, "AsyncSessionLocal", sessao)
    monkeypatch.setattr(fila_envio, "AsyncSessionLocal", sessao)
    return engine, sessao


def test_so_traz_o_que_esta_em_aberto_e_do_canal(tmp_path, monkeypatch):
    async def roda():
        engine, sessao = _banco(tmp_path, monkeypatch)
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        monkeypatch.setattr(robo_store, "_sql_primeiro", lambda: True)
        monkeypatch.setattr(fila_envio, "firestore_db", None)
        monkeypatch.setattr(conector_whatsapp, "firestore_db", None)
        for i in range(50):                                           # histórico que só cresce
            await robo_store._sql_put(f"saida:u1:{i}", "u1", "saida", {"id": str(i), "status": "enviado"})
            await robo_store._sql_put(f"fila:u1:{i}", "u1", "fila", {"id": str(i), "status": "enviado", "canal": "whatsapp"})
        await robo_store._sql_put("saida:u1:aberta", "u1", "saida", {"id": "aberta", "status": "pendente"})
        await robo_store._sql_put("fila:u1:a", "u1", "fila", {"id": "a", "status": "pendente", "canal": "whatsapp"})
        await robo_store._sql_put("fila:u1:b", "u1", "fila", {"id": "b", "status": "pendente", "canal": "email"})
        await robo_store._sql_put("fila:u2:c", "u2", "fila", {"id": "c", "status": "pendente", "canal": "whatsapp"})   # de outro usuário
        saidas = await conector_whatsapp._listar_saida("u1")
        fila = await conector_whatsapp._fila_whatsapp("u1")
        await engine.dispose()
        return saidas, fila
    saidas, fila = asyncio.run(roda())
    assert [s["id"] for s in saidas] == ["aberta"]
    assert [i["id"] for i in fila] == ["a"]                          # só aberto, só WhatsApp, só deste usuário


def test_se_o_banco_recusar_o_filtro_cai_no_jeito_antigo(tmp_path, monkeypatch):
    async def roda():
        engine, sessao = _banco(tmp_path, monkeypatch)
        async with engine.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
        await robo_store._sql_put("saida:u1:x", "u1", "saida", {"id": "x", "status": "pendente"})
        await robo_store._sql_put("saida:u1:y", "u1", "saida", {"id": "y", "status": "enviado"})

        class Coluna:                                                # um banco que não sabe filtrar por JSON
            def __getitem__(self, _): raise RuntimeError("sem operador JSON")
        monkeypatch.setattr(database.DBRobo, "data", Coluna(), raising=False)
        monkeypatch.setattr(robo_store.DBRobo, "data", Coluna(), raising=False)
        async def lista_tudo(uid, tipo): return [{"id": "x", "status": "pendente"}, {"id": "y", "status": "enviado"}]
        monkeypatch.setattr(robo_store, "_sql_listar", lista_tudo)
        r = await robo_store._sql_listar_abertos("u1", "saida", ("pendente", "enviando"))
        await engine.dispose()
        return r
    assert [i["id"] for i in asyncio.run(roda())] == ["x"]
