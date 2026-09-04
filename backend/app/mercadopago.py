"""Integração com o Mercado Pago.

O Mercado Pago avisa o pagamento por webhook, mas o corpo do aviso só
traz o id — ele **não** diz que está aprovado. Confiar no corpo seria o
mesmo buraco de antes: qualquer um mandaria "aprovado". Por isso o fluxo
aqui é sempre:

    webhook chega → confere a assinatura → consulta o pagamento na API
    do MP → só então credita

A assinatura do MP não é o HMAC do corpo, como na maioria dos provedores.
Ele monta um "manifest" com o id do pagamento, o id da requisição e o
timestamp, e assina isso. Implementar como se fosse o corpo faria a
verificação passar sempre — ou nunca.
"""
import hashlib
import hmac
import time
from typing import Any, Dict, Optional, Tuple

import httpx

API = "https://api.mercadopago.com"

# Janela aceita entre o timestamp assinado e agora. Sem isso, um webhook
# legítimo capturado hoje poderia ser reenviado meses depois.
TOLERANCIA_SEGUNDOS = 5 * 60


def parse_assinatura(cabecalho: str) -> Tuple[str, str]:
    """Separa `ts=...,v1=...` do header x-signature."""
    ts = v1 = ""
    for parte in (cabecalho or "").split(","):
        chave, _, valor = parte.strip().partition("=")
        if chave == "ts":
            ts = valor.strip()
        elif chave == "v1":
            v1 = valor.strip()
    return ts, v1


def assinatura_confere(
    x_signature: str,
    x_request_id: str,
    data_id: str,
    segredo: str,
    agora: Optional[int] = None,
) -> bool:
    """Confere a assinatura no formato do Mercado Pago.

    O manifest é exatamente:  id:<data_id>;request-id:<x_request_id>;ts:<ts>;
    """
    if not (x_signature and segredo and data_id):
        return False

    ts, v1 = parse_assinatura(x_signature)
    if not (ts and v1):
        return False

    # O MP manda o ts em segundos; rejeita aviso muito velho (replay).
    try:
        idade = (agora if agora is not None else int(time.time())) - int(ts) // (
            1000 if len(ts) > 11 else 1
        )
        if abs(idade) > TOLERANCIA_SEGUNDOS:
            return False
    except (TypeError, ValueError):
        return False

    manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};"
    esperado = hmac.new(segredo.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperado, v1)


async def criar_preferencia(
    token: str,
    order_id: str,
    titulo: str,
    valor_centavos: int,
    url_retorno: str,
    url_webhook: str,
    email_comprador: str = "",
) -> Dict[str, Any]:
    """Cria a cobrança e devolve o link de checkout.

    `external_reference` carrega o nosso id de pedido: é por ele que o
    webhook reencontra a compra depois.
    """
    payload: Dict[str, Any] = {
        "items": [
            {
                "title": titulo,
                "quantity": 1,
                "unit_price": round(valor_centavos / 100, 2),
                "currency_id": "BRL",
            }
        ],
        "external_reference": order_id,
        "notification_url": url_webhook,
        "back_urls": {
            "success": f"{url_retorno}?pedido={order_id}&status=sucesso",
            "pending": f"{url_retorno}?pedido={order_id}&status=pendente",
            "failure": f"{url_retorno}?pedido={order_id}&status=falha",
        },
        "auto_return": "approved",
        # Boleto demora dias a compensar e trava o pedido; Pix e cartão
        # resolvem na hora.
        "payment_methods": {"excluded_payment_types": [{"id": "ticket"}]},
    }
    if email_comprador:
        payload["payer"] = {"email": email_comprador}

    async with httpx.AsyncClient(timeout=25.0) as client:
        resp = await client.post(
            f"{API}/checkout/preferences",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=payload,
        )

    dados = resp.json() if resp.content else {}
    if resp.status_code >= 400:
        motivo = dados.get("message") or dados.get("error") or "erro desconhecido"
        raise RuntimeError(f"Mercado Pago recusou a cobrança: {motivo}")

    return {
        "preference_id": dados.get("id", ""),
        # sandbox_init_point é o link de teste; init_point é o real
        "checkout_url": dados.get("init_point") or dados.get("sandbox_init_point", ""),
    }


async def consultar_pagamento(token: str, payment_id: str) -> Dict[str, Any]:
    """Pergunta ao MP o estado real do pagamento.

    É esta consulta que autoriza o crédito — nunca o corpo do webhook.
    """
    async with httpx.AsyncClient(timeout=25.0) as client:
        resp = await client.get(
            f"{API}/v1/payments/{payment_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

    dados = resp.json() if resp.content else {}
    if resp.status_code >= 400:
        motivo = dados.get("message") or "não foi possível consultar o pagamento"
        raise RuntimeError(f"Mercado Pago: {motivo}")

    return {
        "id": str(dados.get("id", "")),
        "status": dados.get("status", ""),          # approved | pending | rejected ...
        "aprovado": dados.get("status") == "approved",
        "order_id": dados.get("external_reference", ""),
        "valor_centavos": int(round(float(dados.get("transaction_amount") or 0) * 100)),
        "metodo": dados.get("payment_method_id", ""),
    }
