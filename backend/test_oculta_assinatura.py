"""Contas que usam o sistema sem ver assinatura e compra de creditos."""
from app.config import settings


def test_lista_de_emails_ignora_caixa_e_espacos(monkeypatch):
    monkeypatch.setattr(settings, "HIDE_SUBSCRIPTION_EMAILS", " Luana@Exemplo.com , outra@x.com ")
    assert settings.sem_assinatura_emails == {"luana@exemplo.com", "outra@x.com"}


def test_sem_configuracao_ninguem_e_oculto(monkeypatch):
    monkeypatch.setattr(settings, "HIDE_SUBSCRIPTION_EMAILS", "")
    assert settings.sem_assinatura_emails == set()


def test_perfil_marca_so_a_conta_da_lista(client, monkeypatch):
    # o usuario dos testes e alice@example.com
    assert client.get("/api/profile").json()["oculta_assinatura"] is False

    monkeypatch.setattr(settings, "HIDE_SUBSCRIPTION_EMAILS", "outra@x.com")
    assert client.get("/api/profile").json()["oculta_assinatura"] is False

    monkeypatch.setattr(settings, "HIDE_SUBSCRIPTION_EMAILS", "Alice@Example.com")
    assert client.get("/api/profile").json()["oculta_assinatura"] is True
