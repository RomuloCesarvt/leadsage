"""Testes das protecoes de seguranca.

Cobrem quatro pontos encontrados na revisao:

1. admin por e-mail — o papel "admin" no Firestore se perde quando o
   documento do usuario e recriado, entao a lista de e-mails da
   configuracao e a fonte duravel
2. SSRF no webhook — a URL e escolhida pelo usuario e quem faz a
   requisicao e o servidor, que alcanca a rede interna da nuvem
3. proxy de foto — `name` entra numa URL montada por interpolacao
4. CORS — "*" junto com credenciais liberava qualquer site

Rodar:  cd backend && python -m pytest test_seguranca.py -v
"""
import asyncio

import pytest

import app.credit_system as credit_system
from app.config import settings
from app.dispatcher import DispatchError, OutreachDispatcher
from app.main import PLACE_PHOTO_RE
from app.models import DispatchRequest


# ------------------------------------------------------- admin por e-mail

@pytest.fixture
def admin_configurado(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_EMAILS", "dono@leadsage.app, Outro@Exemplo.com ")


def test_admin_reconhecido_pela_lista(admin_configurado):
    assert credit_system.is_admin("dono@leadsage.app") is True


def test_admin_ignora_maiusculas_e_espacos(admin_configurado):
    assert credit_system.is_admin("  OUTRO@exemplo.COM  ") is True


@pytest.mark.parametrize("email", ["outra@pessoa.com", "", None])
def test_nao_admin(admin_configurado, email):
    assert credit_system.is_admin(email) is False


def test_lista_vazia_nao_da_admin_para_ninguem(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_EMAILS", "")
    assert credit_system.is_admin("qualquer@pessoa.com") is False


def test_admin_nao_consome_creditos(admin_configurado):
    """Sem tocar no Firestore: o e-mail sozinho ja garante saldo."""
    saldo = asyncio.run(credit_system.get_user_balance("uid-x", "dono@leadsage.app"))
    assert saldo["credits"] == credit_system.UNLIMITED
    assert saldo["is_admin"] is True

    restante = asyncio.run(credit_system.check_and_deduct_credits("uid-x", 50, "dono@leadsage.app"))
    assert restante == credit_system.UNLIMITED


# -------------------------------------------------------- SSRF no webhook

def _dispatch_webhook(url):
    req = DispatchRequest(lead_id="L1", lead_name="X", channel="webhook", body="oi")
    return asyncio.run(
        OutreachDispatcher.dispatch_message(req, 100, {"webhook_url": url})
    )


@pytest.mark.parametrize("url", [
    "http://127.0.0.1:8000/admin",
    "http://localhost/interno",
    "http://169.254.169.254/latest/meta-data/",   # metadados da nuvem
    "http://metadata.google.internal/computeMetadata/v1/",
    "http://10.0.0.5/",
    "http://192.168.1.1/",
    "http://172.16.0.1/",
    "http://[::1]/",
])
def test_webhook_recusa_endereco_interno(url):
    with pytest.raises(DispatchError, match="interno|resolver"):
        _dispatch_webhook(url)


@pytest.mark.parametrize("url", ["ftp://exemplo.com", "file:///etc/passwd", "gopher://x"])
def test_webhook_recusa_esquema_invalido(url):
    with pytest.raises(DispatchError, match="http"):
        _dispatch_webhook(url)


# ------------------------------------------------------- proxy de foto

@pytest.mark.parametrize("name", [
    "places/ChIJabc-123/photos/AeJbb3_xyz",
    "places/A_1/photos/B-2",
])
def test_referencia_de_foto_valida(name):
    assert PLACE_PHOTO_RE.fullmatch(name)


@pytest.mark.parametrize("name", [
    "places/../../../etc/passwd",
    "places/x/photos/y/../../../z",
    "https://malicioso.com/x",
    "places/x",
    "",
    "places/x/photos/y?key=roubar",
])
def test_referencia_de_foto_invalida_e_recusada(name):
    assert not PLACE_PHOTO_RE.fullmatch(name)


def test_proxy_de_foto_recusa_referencia_invalida(client):
    resp = client.get("/api/place-photo", params={"name": "places/../../etc/passwd"})
    assert resp.status_code == 400


# ---------------------------------------------------------------- CORS

def test_cors_nao_libera_credenciais_para_qualquer_origem():
    """"*" com allow_credentials=True e invalido e perigoso.

    A regra: ou ha origens explicitas (e credenciais liberadas), ou vale
    o curinga (e credenciais bloqueadas). Nunca os dois juntos.
    """
    from app.main import app

    for middleware in app.user_middleware:
        opts = getattr(middleware, "kwargs", {}) or {}
        if "allow_origins" not in opts:
            continue
        if "*" in opts["allow_origins"]:
            assert opts["allow_credentials"] is False
        else:
            assert opts["allow_origins"], "lista de origens nao pode ser vazia"


def test_cors_usa_origens_configuradas(monkeypatch):
    monkeypatch.setattr(settings, "ALLOWED_ORIGINS", "https://leadsageofc.vercel.app, http://localhost:5173")
    assert settings.allowed_origins == [
        "https://leadsageofc.vercel.app",
        "http://localhost:5173",
    ]
