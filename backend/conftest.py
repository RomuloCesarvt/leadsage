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
