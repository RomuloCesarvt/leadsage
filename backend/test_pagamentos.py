"""Testes da compra de creditos.

O defeito que originou tudo isto: `POST /api/credits/topup` chamava
`add_credits` com o valor que viesse no corpo do request. Qualquer pessoa
logada podia pedir 999999 creditos e receber.

As tres garantias verificadas aqui:

1. nenhuma rota autenticada concede credito
2. o preco vem do servidor, nunca do cliente
3. o webhook exige assinatura, e reenvio nao credita duas vezes

Fixtures (`client`, `as_user`) vem de conftest.py.

Rodar:  cd backend && python -m pytest test_pagamentos.py -v
"""
import asyncio
import hashlib
import hmac
import json

import pytest

from app.config import settings
from app.payments import (
    PACKAGES, achar_pacote, assinatura_confere, catalogo,
    confirmar_pagamento, criar_pedido, vincular_cobranca,
)

SEGREDO = "segredo-de-teste"


def assinar(corpo: dict) -> tuple:
    bruto = json.dumps(corpo).encode()
    return bruto, hmac.new(SEGREDO.encode(), bruto, hashlib.sha256).hexdigest()


# ------------------------------------------- o buraco antigo esta fechado

def test_nao_existe_mais_rota_que_credita_direto(client):
    """A rota antiga dava credito sem cobrar nada."""
    resp = client.post("/api/credits/topup", json={"amount": 999999, "payment_method": "pix"})
    assert resp.status_code == 404


def test_checkout_nao_concede_credito(client):
    saldo_antes = client.get("/api/credits/balance").json()["credits"]
    client.post("/api/checkout", json={"package_id": "pro"})
    assert client.get("/api/credits/balance").json()["credits"] == saldo_antes


def test_sem_provedor_configurado_a_compra_e_recusada(client):
    """Recusar e melhor do que liberar de graca."""
    resp = client.post("/api/checkout", json={"package_id": "pro"})
    assert resp.status_code == 503
    assert "não configurado" in resp.json()["detail"]


# ------------------------------------------------ preco mora no servidor

def test_pacote_desconhecido_e_recusado(client):
    assert client.post("/api/checkout", json={"package_id": "gratis"}).status_code == 400


def test_cliente_nao_escolhe_preco_nem_quantidade(client):
    """O corpo so aceita package_id: valor e creditos vem do catalogo."""
    client.post("/api/checkout", json={
        "package_id": "start", "amount_cents": 1, "credits": 999999,
    })
    pedido = client.get("/api/orders").json()[0]
    pacote = achar_pacote("start")
    assert pedido["amount_cents"] == pacote["amount_cents"]
    assert pedido["credits"] == pacote["credits"]


def test_catalogo_e_publicado_com_preco_formatado(client):
    dados = client.get("/api/packages").json()
    assert len(dados["packages"]) == len(PACKAGES)
    assert dados["packages"][0]["preco"].startswith("R$ ")


def test_todo_pacote_tem_preco_e_credito_positivos():
    for p in PACKAGES:
        assert p["amount_cents"] > 0 and p["credits"] > 0


# ------------------------------------------------------------- assinatura

def test_assinatura_valida_passa():
    corpo, assinatura = assinar({"paid": True})
    assert assinatura_confere(corpo, assinatura, SEGREDO) is True


@pytest.mark.parametrize("assinatura", ["", "abc", "sha256=errada"])
def test_assinatura_invalida_falha(assinatura):
    corpo, _ = assinar({"paid": True})
    assert assinatura_confere(corpo, assinatura, SEGREDO) is False


def test_corpo_alterado_invalida_a_assinatura():
    _, assinatura = assinar({"paid": True, "order_id": "ord_1"})
    adulterado = json.dumps({"paid": True, "order_id": "ord_OUTRO"}).encode()
    assert assinatura_confere(adulterado, assinatura, SEGREDO) is False


def test_prefixo_do_algoritmo_e_aceito():
    corpo, assinatura = assinar({"paid": True})
    assert assinatura_confere(corpo, f"sha256={assinatura}", SEGREDO) is True


def test_sem_segredo_nada_passa():
    corpo, assinatura = assinar({"paid": True})
    assert assinatura_confere(corpo, assinatura, "") is False


# ----------------------------------------------------- webhook na pratica

def test_webhook_sem_assinatura_e_recusado(client, monkeypatch):
    monkeypatch.setattr(settings, "PAYMENT_WEBHOOK_SECRET", SEGREDO)
    assert client.post("/api/webhooks/pagamento", json={"paid": True}).status_code == 401


def test_webhook_com_assinatura_falsa_e_recusado(client, monkeypatch):
    monkeypatch.setattr(settings, "PAYMENT_WEBHOOK_SECRET", SEGREDO)
    corpo, _ = assinar({"paid": True})
    resp = client.post(
        "/api/webhooks/pagamento", content=corpo,
        headers={"x-signature": "falsa", "content-type": "application/json"},
    )
    assert resp.status_code == 401


def test_webhook_desligado_recusa(client):
    assert client.post("/api/webhooks/pagamento", json={"paid": True}).status_code == 503


def test_webhook_assinado_credita_uma_vez_so(client, monkeypatch):
    """Provedores reenviam o webhook quando nao recebem 200. Sem
    idempotencia, a mesma compra creditaria varias vezes."""
    monkeypatch.setattr(settings, "PAYMENT_WEBHOOK_SECRET", SEGREDO)

    client.post("/api/checkout", json={"package_id": "pro"})
    pedido = client.get("/api/orders").json()[0]
    assert pedido["status"] == "pending"

    corpo, assinatura = assinar({"paid": True, "order_id": pedido["id"], "event_id": "evt_1"})
    cabecalhos = {"x-signature": assinatura, "content-type": "application/json"}

    primeira = client.post("/api/webhooks/pagamento", content=corpo, headers=cabecalhos)
    assert primeira.json()["status"] == "creditado"
    assert primeira.json()["credits"] == achar_pacote("pro")["credits"]

    # mesmo evento chegando de novo
    segunda = client.post("/api/webhooks/pagamento", content=corpo, headers=cabecalhos)
    assert segunda.json()["status"] == "ja_processado"

    assert client.get(f"/api/orders/{pedido['id']}").json()["status"] == "paid"


def test_webhook_de_pedido_inexistente_nao_quebra(client, monkeypatch):
    monkeypatch.setattr(settings, "PAYMENT_WEBHOOK_SECRET", SEGREDO)
    corpo, assinatura = assinar({"paid": True, "order_id": "ord_fantasma"})
    resp = client.post(
        "/api/webhooks/pagamento", content=corpo,
        headers={"x-signature": assinatura, "content-type": "application/json"},
    )
    assert resp.json()["status"] == "ignorado"


def test_evento_nao_pago_e_ignorado(client, monkeypatch):
    monkeypatch.setattr(settings, "PAYMENT_WEBHOOK_SECRET", SEGREDO)
    corpo, assinatura = assinar({"paid": False, "order_id": "x"})
    resp = client.post(
        "/api/webhooks/pagamento", content=corpo,
        headers={"x-signature": assinatura, "content-type": "application/json"},
    )
    assert resp.json()["status"] == "ignorado"


# ------------------------------------------------------------- isolamento

def test_pedido_de_outro_usuario_nao_e_visivel(client, as_user):
    client.post("/api/checkout", json={"package_id": "start"})
    pedido = client.get("/api/orders").json()[0]

    as_user("bob")
    assert client.get("/api/orders").json() == []
    assert client.get(f"/api/orders/{pedido['id']}").status_code == 404
