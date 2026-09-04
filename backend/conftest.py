"""Configuracao compartilhada dos testes.

Cada modulo de teste redirecionava o banco e sobrescrevia
`app.dependency_overrides` por conta propria. Como o objeto `app` e o
mesmo, o ultimo import ganhava e os testes so passavam isolados. Aqui a
montagem acontece uma vez so.
"""
import os
import socket

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

import app.database as database

TEST_DB = os.path.join(os.path.dirname(__file__), "test_tmp.db")

database.engine = create_async_engine(f"sqlite+aiosqlite:///{TEST_DB}")
database.AsyncSessionLocal = sessionmaker(
    database.engine, class_=AsyncSession, expire_on_commit=False
)

import app.integrations_store as integrations_store  # noqa: E402
import app.profile_store as profile_store  # noqa: E402
import app.sites_store as sites_store  # noqa: E402
from app.firebase_config import get_current_user  # noqa: E402
from app.main import app  # noqa: E402

for module in (integrations_store, profile_store, sites_store):
    module.AsyncSessionLocal = database.AsyncSessionLocal

# Um unico dicionario de identidade para toda a suite
CURRENT_UID = {"value": "alice"}
app.dependency_overrides[get_current_user] = lambda: {"uid": CURRENT_UID["value"]}


@pytest.fixture
def client():
    """Cliente com banco limpo e usuario "alice" a cada teste."""
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    CURRENT_UID["value"] = "alice"
    with TestClient(app) as c:
        yield c
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)


@pytest.fixture
def com_plano():
    """Concede um plano ao usuario do teste.

    Com o gating por plano, a maioria dos testes precisa declarar de qual
    plano esta falando — o padrao de quem nunca comprou e a Previa
    Gratuita, que quase nada libera.

    Escreve direto no SQLite em vez de chamar conceder_plano(): a funcao
    e async e o engine do SQLAlchemy fica preso ao loop que o TestClient
    ja esta usando, o que dava RuntimeError.
    """
    import json as _json
    import sqlite3

    from app.payments import plano_de

    def _dar(plan_id="agencia", uid=None):
        plano = plano_de(plan_id)
        alvo = uid or CURRENT_UID["value"]
        con = sqlite3.connect(TEST_DB)
        try:
            con.execute(
                "CREATE TABLE IF NOT EXISTS user_profiles (uid TEXT PRIMARY KEY, data JSON)"
            )
            linha = con.execute(
                "SELECT data FROM user_profiles WHERE uid = ?", (alvo,)
            ).fetchone()
            dados = _json.loads(linha[0]) if linha and linha[0] else {}
            dados.update({
                "plan": plano["nome"],
                "plan_id": plan_id,
                "sites_quota": (dados.get("sites_quota") or 0) + plano["sites"],
            })
            con.execute(
                "INSERT INTO user_profiles (uid, data) VALUES (?, ?) "
                "ON CONFLICT(uid) DO UPDATE SET data = excluded.data",
                (alvo, _json.dumps(dados)),
            )
            con.commit()
        finally:
            con.close()

    return _dar


@pytest.fixture
def as_user():
    """Troca a identidade no meio do teste, para checar isolamento."""
    def _switch(uid: str):
        CURRENT_UID["value"] = uid
    return _switch


@pytest.fixture
def free_port():
    """Porta livre de verdade: portas fixas colidiam entre execucoes."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]
