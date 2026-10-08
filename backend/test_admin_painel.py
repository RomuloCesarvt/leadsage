"""Painel do administrador: so admin entra; ve pipeline e pesquisas de outro usuario; libera creditos infinitos."""
import pytest

from app import admin_painel, credit_system as cs, pipeline_store
from app.config import settings
from test_creditos_sql import sql_principal  # noqa: F401
from test_robo import rodar  # noqa: F401


@pytest.fixture
def admin(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_EMAILS", "alice@example.com")
    monkeypatch.setattr(admin_painel, "_listar_contas", lambda: [
        {"uid": "bia", "email": "bia@x.com", "nome": "Bia", "criado_em": "", "ultimo_acesso": "2026-10-01T00:00:00+00:00", "admin": False}])


def test_quem_nao_e_admin_leva_403(client, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_EMAILS", "outro@x.com")
    assert client.get("/api/admin/usuarios").status_code == 403
    assert client.get("/api/admin/usuarios/bia/pipeline").status_code == 403
    assert client.post("/api/admin/usuarios/bia/ilimitado", json={"ativo": True}).status_code == 403


def test_lista_usuarios_com_o_estado_dos_creditos(client, admin):
    [u] = client.get("/api/admin/usuarios").json()
    assert u["email"] == "bia@x.com" and u["ilimitado"] is False


def test_ve_o_pipeline_do_outro_usuario(client, admin, rodar):
    rodar(pipeline_store.registrar, "bia", {"id": "l1", "name": "Padaria", "phone": "14999990000"})
    itens = client.get("/api/admin/usuarios/bia/pipeline").json()["itens"]
    assert [i.get("lead_id") or i.get("id") for i in itens] and len(itens) == 1
    assert client.get("/api/admin/usuarios/zeca/pipeline").json()["itens"] == []


def test_liberar_creditos_infinitos_e_retirar(client, admin, rodar):
    assert rodar(cs.check_and_deduct_credits, "bia", 5) == 45
    assert client.post("/api/admin/usuarios/bia/ilimitado", json={"ativo": True}).json()["ilimitado"] is True
    assert rodar(cs.check_and_deduct_credits, "bia", 999) == cs.UNLIMITED
    assert client.get("/api/admin/usuarios").json()[0]["ilimitado"] is True
    client.post("/api/admin/usuarios/bia/ilimitado", json={"ativo": False})
    assert rodar(cs.check_and_deduct_credits, "bia", 5) == 40
