"""Os bancos de reserva recebem os dados do principal (para a troca automática nunca cair num banco vazio).
Rodar: cd backend && python -m pytest -q test_sincronia.py"""
import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

import app.database as database
from app import sincronia


async def _dois(tmp_path):
    a = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'a.db'}")
    b = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'b.db'}")
    for e in (a, b):
        async with e.begin() as c:
            await c.run_sync(database.Base.metadata.create_all)
    return a, b


async def _inserir(engine, tabela, **v):
    async with engine.begin() as c:
        await c.execute(database.Base.metadata.tables[tabela].insert().values(**v))


async def _tudo(engine, tabela):
    from sqlalchemy import select
    async with engine.connect() as c:
        return [dict(r) for r in (await c.execute(select(database.Base.metadata.tables[tabela]))).mappings().all()]


def test_copia_o_que_falta_e_so_troca_o_que_e_mais_novo(tmp_path):
    async def roda():
        a, b = await _dois(tmp_path)
        await _inserir(a, "robo", chave="k1", uid="u1", tipo="canal", data={"x": 1}, atualizado="2026-06-01")
        await _inserir(a, "robo", chave="k2", uid="u1", tipo="canal", data={"x": 2}, atualizado="2026-01-01")
        await _inserir(b, "robo", chave="k2", uid="u1", tipo="canal", data={"x": "mais novo no reserva"}, atualizado="2026-09-01")
        await _inserir(a, "robo", chave="k3", uid="u1", tipo="canal", data={"x": 3}, atualizado="2026-05-01")
        await _inserir(b, "robo", chave="k3", uid="u1", tipo="canal", data={"x": "antigo"}, atualizado="2026-01-01")
        r = await sincronia.copiar_entre(a, b)
        linhas = {l["chave"]: l for l in await _tudo(b, "robo")}
        await a.dispose(); await b.dispose()
        return r, linhas
    r, linhas = asyncio.run(roda())
    assert linhas["k1"]["data"] == {"x": 1}                                 # faltava: copiou
    assert linhas["k2"]["data"] == {"x": "mais novo no reserva"}            # o reserva tinha o mais novo: não sobrescreveu
    assert linhas["k3"]["data"] == {"x": 3}                                 # o principal era mais novo: atualizou
    assert r["robo"]["copiadas"] == 2 and r["robo"]["faltam"] == 0


def test_creditos_so_copiam_o_que_falta_um_saldo_antigo_nunca_volta(tmp_path):
    async def roda():
        a, b = await _dois(tmp_path)
        await _inserir(a, "creditos", uid="u1", credits=999)
        await _inserir(b, "creditos", uid="u1", credits=7)                  # o reserva gastou créditos enquanto era o banco em uso
        await _inserir(a, "creditos", uid="u2", credits=50)
        await sincronia.copiar_entre(a, b)
        linhas = {l["uid"]: l["credits"] for l in await _tudo(b, "creditos")}
        await a.dispose(); await b.dispose()
        return linhas
    linhas = asyncio.run(roda())
    assert linhas == {"u1": 7, "u2": 50}


def test_respeita_o_maximo_por_execucao_e_diz_quanto_falta(tmp_path):
    async def roda():
        a, b = await _dois(tmp_path)
        for i in range(10):
            await _inserir(a, "robo", chave=f"k{i}", uid="u1", tipo="x", data={}, atualizado="2026-01-01")
        r1 = await sincronia.copiar_entre(a, b, maximo_por_tabela=4)
        r2 = await sincronia.copiar_entre(a, b, maximo_por_tabela=100)
        total = len(await _tudo(b, "robo"))
        await a.dispose(); await b.dispose()
        return r1, r2, total
    r1, r2, total = asyncio.run(roda())
    assert r1["robo"] == {"copiadas": 4, "faltam": 6} and r2["robo"]["faltam"] == 0 and total == 10


def test_rota_do_cron_recusa_sem_o_segredo_e_aceita_com_ele(client, monkeypatch):
    monkeypatch.delenv("CRON_SECRET", raising=False)
    assert client.get("/api/sistema/sincronizar-bancos").status_code == 401                          # sem segredo configurado: nunca aberta
    assert client.get("/api/sistema/sincronizar-bancos", headers={"Authorization": "Bearer qualquer"}).status_code == 401
    monkeypatch.setenv("CRON_SECRET", "segredo-longo-de-teste")
    assert client.get("/api/sistema/sincronizar-bancos", headers={"Authorization": "Bearer errado"}).status_code == 401
    r = client.get("/api/sistema/sincronizar-bancos", headers={"Authorization": "Bearer segredo-longo-de-teste"})
    assert r.status_code == 200 and r.json()["ok"] is True
