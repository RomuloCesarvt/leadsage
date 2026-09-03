"""Testes das rotas que guardam dados por usuario.

Cobrem os defeitos que faziam a interface mentir: o botao Salvar que nao
salvava, o perfil numa variavel global compartilhada entre todos os
usuarios, o site gerado que sumia ao trocar de tela e o botao de excluir
busca que era decorativo.

Cada bloco checa tambem o isolamento entre contas: um usuario nao pode
ler nem apagar o que e de outro.

Rodar:  cd backend && python -m pytest test_api.py -v
"""
import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

import app.database as database

TEST_DB = "./test_api_tmp.db"

# Redireciona o banco antes de importar quem abre sessao
database.engine = create_async_engine(f"sqlite+aiosqlite:///{TEST_DB}")
database.AsyncSessionLocal = sessionmaker(
    database.engine, class_=AsyncSession, expire_on_commit=False
)

import app.profile_store as profile_store  # noqa: E402
import app.sites_store as sites_store  # noqa: E402
from app.firebase_config import get_current_user  # noqa: E402
from app.main import app  # noqa: E402

profile_store.AsyncSessionLocal = database.AsyncSessionLocal
sites_store.AsyncSessionLocal = database.AsyncSessionLocal

CURRENT_UID = {"value": "alice"}
app.dependency_overrides[get_current_user] = lambda: {"uid": CURRENT_UID["value"]}

HTML = "<!DOCTYPE html><html><body><h1>Padaria Teste</h1></body></html>"


@pytest.fixture
def client():
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)
    CURRENT_UID["value"] = "alice"
    with TestClient(app) as c:
        yield c
    if os.path.exists(TEST_DB):
        os.remove(TEST_DB)


def as_user(uid):
    CURRENT_UID["value"] = uid


def base_profile(**overrides):
    payload = {
        "id": "alice", "name": "Alice", "email": "alice@x.com",
        "company_name": "Alice Corp", "niche_focus": "Odonto",
        "product_description": "Sites", "credits": 0, "plan": "Pro", "avatar": "",
        "services": ["Sites"], "niches": ["Dentistas"], "regions": "Salvador, BA",
        "preferred_channel": "Instagram", "monthly_goal": "11 a 20", "language": "pt",
    }
    payload.update(overrides)
    return payload


# --------------------------------------------------------------- perfil

def test_perfil_persiste(client):
    """O botao Salvar da tela de Configuracoes nao gravava nada."""
    assert client.put("/api/profile", json=base_profile()).status_code == 200
    saved = client.get("/api/profile").json()
    assert saved["company_name"] == "Alice Corp"
    assert saved["niches"] == ["Dentistas"]
    assert saved["regions"] == "Salvador, BA"


def test_perfil_nao_vaza_entre_usuarios(client):
    """CURRENT_USER era uma global de modulo: um perfil para todo mundo."""
    client.put("/api/profile", json=base_profile())

    as_user("bob")
    assert client.get("/api/profile").json()["company_name"] != "Alice Corp"
    client.put("/api/profile", json=base_profile(id="bob", company_name="Bob LTDA"))

    as_user("alice")
    assert client.get("/api/profile").json()["company_name"] == "Alice Corp"


def test_creditos_nao_sao_alteraveis_pelo_request(client):
    assert client.put("/api/profile", json=base_profile(credits=999999)).json()["credits"] != 999999


# ---------------------------------------------------------------- sites

def test_site_publicado_aparece_na_listagem(client):
    """O HTML so existia no useState: ao sair da tela, sumia."""
    assert client.get("/api/sites").json() == []

    site_id = client.post(
        "/api/sites", json={"company": "Padaria Teste", "html": HTML, "template": "Moderno"}
    ).json()["id"]

    listagem = client.get("/api/sites").json()
    assert len(listagem) == 1
    assert listagem[0]["company"] == "Padaria Teste"
    # a listagem nao deve carregar a pagina inteira de cada site
    assert not listagem[0].get("html")
    assert client.get(f"/api/sites/{site_id}").json()["html"] == HTML


def test_site_vazio_e_rejeitado(client):
    assert client.post("/api/sites", json={"company": "X", "html": "   "}).status_code == 400


def test_sites_sao_isolados_por_usuario(client):
    site_id = client.post("/api/sites", json={"company": "Padaria", "html": HTML}).json()["id"]

    as_user("bob")
    assert client.get("/api/sites").json() == []
    assert client.get(f"/api/sites/{site_id}").status_code == 404
    assert client.delete(f"/api/sites/{site_id}").status_code == 404

    as_user("alice")
    assert len(client.get("/api/sites").json()) == 1
    assert client.delete(f"/api/sites/{site_id}").status_code == 200
    assert client.get("/api/sites").json() == []


# ------------------------------------------------------------ historico

@pytest.mark.skipif(
    not os.getenv("GOOGLE_MAPS_API_KEY"),
    reason="precisa da GOOGLE_MAPS_API_KEY para gerar uma busca real",
)
def test_historico_pode_ser_excluido_e_e_isolado(client):
    """O botao de excluir busca nao tinha onClick nem rota."""
    body = {"niche": "Padarias", "location": "Botucatu, SP, Brazil", "limit": 3}
    search_id = client.post("/api/search-leads", json=body).json()["search_id"]
    assert len(client.get("/api/history").json()) == 1

    as_user("bob")
    assert client.get("/api/history").json() == []
    assert client.delete(f"/api/history/{search_id}").status_code == 404

    as_user("alice")
    assert client.delete(f"/api/history/{search_id}").status_code == 200
    assert client.get("/api/history").json() == []
    assert client.delete(f"/api/history/{search_id}").status_code == 404
