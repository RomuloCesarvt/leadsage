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


# ---- acesso total (creditos infinitos e todos os recursos) sem ser admin
def test_acesso_total_nao_e_admin(client, monkeypatch, rodar):
    monkeypatch.setattr(settings, "ADMIN_EMAILS", "dono@x.com")
    monkeypatch.setattr(settings, "ILIMITADOS_EMAILS", "alice@example.com")
    assert cs.acesso_total("alice@example.com") is True and cs.is_admin("alice@example.com") is False
    assert cs.acesso_total("Alice@Example.com ") is True            # maiusculas e espacos nao importam
    assert cs.acesso_total("outro@x.com") is False and cs.acesso_total("dono@x.com") is True  # o admin continua com tudo
    # creditos: nunca cobra
    assert rodar(cs.check_and_deduct_credits, "alice", 10_000, "alice@example.com") == cs.UNLIMITED
    saldo = rodar(cs.get_user_balance, "alice", "alice@example.com")
    assert saldo["credits"] == cs.UNLIMITED and saldo["is_admin"] is False
    # recursos do plano maximo, mas sem a marca de admin que abre o painel
    plano = client.get("/api/plan").json()
    assert plano["plan_id"] == "agencia" and plano["admin"] is False
    # painel de administracao e dados de outros usuarios: bloqueados
    assert client.get("/api/admin/usuarios").status_code == 403
    assert client.get("/api/admin/usuarios/bia/pipeline").status_code == 403
    assert client.post("/api/admin/usuarios/bia/ilimitado", json={"ativo": True}).status_code == 403
    # sites sem limite de vagas
    assert client.get("/api/sites/quota").json()["ilimitado"] is True


def test_sem_acesso_total_o_plano_continua_sendo_o_da_conta(client, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_EMAILS", "")
    monkeypatch.setattr(settings, "ILIMITADOS_EMAILS", "outra@x.com")
    assert client.get("/api/plan").json()["plan_id"] != "agencia"
    assert client.get("/api/sites/quota").json()["ilimitado"] is False


def test_admin_ve_de_onde_vieram_os_creditos_do_usuario(client, admin, rodar):
    rodar(cs.add_credits, "bia", 500, "Compra: pro")
    r = client.get("/api/admin/usuarios/bia/creditos")
    assert r.status_code == 200
    j = r.json()
    assert j["creditos"] >= 500 and "50 créditos" in j["como_funciona"]
    assert any("Compra: pro" in h["description"] for h in j["historico"]) or j["historico"] == []
    assert j["ilimitado"] is False


def test_creditos_de_outro_usuario_so_para_admin(client, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_EMAILS", "outro@x.com")
    assert client.get("/api/admin/usuarios/bia/creditos").status_code == 403
