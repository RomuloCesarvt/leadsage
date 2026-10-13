"""Varios bancos com troca automatica: o que cai sai de cena e o proximo assume."""
import asyncio
import os

import pytest
from sqlalchemy import text

from app import bancos


def _rodar(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def test_urls_em_ordem_sem_repetir_e_normalizadas():
    env = {
        "DATABASE_URL": "postgres://a:1@h1:6543/db",
        "DATABASE_URL_2": "postgresql://b:2@h2/db",
        "DATABASE_URLS": "postgresql://b:2@h2/db, postgres://c:3@h3/db",
    }
    urls = bancos.urls_dos_bancos(env)
    assert urls == [
        "postgresql+asyncpg://a:1@h1:6543/db",
        "postgresql+asyncpg://b:2@h2/db",
        "postgresql+asyncpg://c:3@h3/db",
    ]


def test_sem_nenhuma_conexao_usa_sqlite():
    assert bancos.urls_dos_bancos({})[0].startswith("sqlite")
    assert bancos.urls_dos_bancos({"VERCEL": "1"})[0].endswith("/tmp/leadsage.db")


@pytest.fixture
def com_conjunto(monkeypatch, tmp_path):
    def montar(urls):
        c = bancos.Conjunto(urls)
        monkeypatch.setattr(bancos, "CONJUNTO", c)
        return c
    return montar


def _sessoes():
    return bancos.criar_fabrica_de_sessoes()


def test_banco_principal_fora_do_ar_passa_para_o_reserva(com_conjunto, tmp_path):
    # porta 1: recusa a conexao na hora, como um banco fora do ar
    ruim = "postgresql+asyncpg://u:p@127.0.0.1:1/x"
    bom = f"sqlite+aiosqlite:///{tmp_path / 'reserva.db'}"
    c = com_conjunto([ruim, bom])
    Sessao = _sessoes()

    async def tenta():
        erros = 0
        for _ in range(3):
            try:
                async with Sessao() as s:
                    await s.execute(text("select 1"))
                    return erros
            except Exception:
                erros += 1
        return erros

    erros = _rodar(tenta())
    assert erros <= 1  # no maximo a primeira chamada paga a falha; o sistema se recupera sozinho
    assert not c.fontes[0].disponivel and c.fontes[1].disponivel
    assert c.escolher() is c.fontes[1]
    est = c.estado()
    assert est[0]["ok"] is False and est[1]["ativo"] is True


def test_preparar_cria_tabelas_nos_que_respondem_e_ignora_o_que_caiu(com_conjunto, tmp_path):
    ruim = "postgresql+asyncpg://u:p@127.0.0.1:1/x"
    a = f"sqlite+aiosqlite:///{tmp_path / 'a.db'}"
    b = f"sqlite+aiosqlite:///{tmp_path / 'b.db'}"
    c = com_conjunto([ruim, a, b])

    async def criar(eng):
        async with eng.begin() as conn:
            await conn.execute(text("create table if not exists t (v text)"))

    estado = _rodar(c.preparar(criar))
    assert [e["ok"] for e in estado] == [False, True, True]
    assert os.path.exists(tmp_path / "a.db") and os.path.exists(tmp_path / "b.db")


def test_depois_do_tempo_o_principal_volta(com_conjunto, tmp_path):
    a = f"sqlite+aiosqlite:///{tmp_path / 'a.db'}"
    b = f"sqlite+aiosqlite:///{tmp_path / 'b.db'}"
    c = com_conjunto([a, b])
    c.fontes[0].marcar_fora("teste")
    assert c.escolher() is c.fontes[1]
    c.fontes[0].fora_ate = 0.0  # o tempo passou
    assert c.escolher() is c.fontes[0]


def test_todos_fora_nao_para_o_sistema(com_conjunto, tmp_path):
    a = f"sqlite+aiosqlite:///{tmp_path / 'a.db'}"
    b = f"sqlite+aiosqlite:///{tmp_path / 'b.db'}"
    c = com_conjunto([a, b])
    c.fontes[0].marcar_fora("x")
    c.fontes[1].marcar_fora("y")
    assert c.escolher() in c.fontes  # tenta de novo em vez de recusar tudo


def test_dados_gravados_no_reserva_leem_do_reserva(com_conjunto, tmp_path):
    a = f"sqlite+aiosqlite:///{tmp_path / 'a.db'}"
    b = f"sqlite+aiosqlite:///{tmp_path / 'b.db'}"
    c = com_conjunto([a, b])
    Sessao = _sessoes()

    async def fluxo():
        async def criar(eng):
            async with eng.begin() as conn:
                await conn.execute(text("create table if not exists t (v text)"))
        await c.preparar(criar)
        c.fontes[0].marcar_fora("caiu")
        async with Sessao() as s:
            await s.execute(text("insert into t values ('no reserva')"))
            await s.commit()
        async with Sessao() as s:
            return (await s.execute(text("select v from t"))).scalars().all()

    assert _rodar(fluxo()) == ["no reserva"]
