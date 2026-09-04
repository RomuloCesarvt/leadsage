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
import hashlib
import hmac
import json
import time

import pytest

from app.config import settings
from app import mercadopago as mp
from app.payments import PACKAGES, PLANS, ITENS, achar_pacote

SEGREDO = "segredo-de-teste"


# ------------------------------------------- o buraco antigo esta fechado

def test_nao_existe_mais_rota_que_credita_direto(client):
    """A rota antiga dava credito sem cobrar nada."""
    resp = client.post("/api/credits/topup", json={"amount": 999999, "payment_method": "pix"})
    assert resp.status_code == 404


def test_checkout_nao_concede_credito(client):
    saldo_antes = client.get("/api/credits/balance").json()["credits"]
    client.post("/api/checkout", json={"package_id": "recarga_500"})
    assert client.get("/api/credits/balance").json()["credits"] == saldo_antes


def test_sem_provedor_configurado_a_compra_e_recusada(client):
    """Recusar e melhor do que liberar de graca."""
    resp = client.post("/api/checkout", json={"package_id": "recarga_500"})
    assert resp.status_code == 503
    assert "não configurado" in resp.json()["detail"]


# ------------------------------------------------ preco mora no servidor

def test_pacote_desconhecido_e_recusado(client):
    assert client.post("/api/checkout", json={"package_id": "gratis"}).status_code == 400


def test_cliente_nao_escolhe_preco_nem_quantidade(client):
    """O corpo so aceita package_id: valor e creditos vem do catalogo."""
    client.post("/api/checkout", json={
        "package_id": "recarga_150", "amount_cents": 1, "credits": 999999,
    })
    pedido = client.get("/api/orders").json()[0]
    pacote = achar_pacote("recarga_150")
    assert pedido["amount_cents"] == pacote["amount_cents"]
    assert pedido["credits"] == pacote["credits"]


def test_catalogo_separa_planos_de_recargas(client):
    dados = client.get("/api/packages").json()
    assert len(dados["planos"]) == len(PLANS)
    assert len(dados["recargas"]) == len(PACKAGES)
    assert dados["planos"][0]["preco"].startswith("R$ ")


def test_precos_batem_com_a_tela_de_assinatura():
    """Os valores vieram da tela; se mudarem, a venda passa a cobrar
    diferente do que esta anunciado."""
    esperado = {
        "previa": (0, 5), "start": (6700, 150),
        "pro": (9700, 500), "agencia": (19700, 3000),
    }
    for plano in PLANS:
        centavos, creditos = esperado[plano["id"]]
        assert plano["amount_cents"] == centavos
        assert plano["credits"] == creditos


def test_razao_de_leads_por_site_fica_numa_faixa_sensata():
    """Start e Agencia usam 15 leads por site; o Pro usa 10, de
    proposito — e o plano recomendado, entao pesa mais em sites. A faixa
    existe para pegar erro de digitacao, nao para forcar uniformidade."""
    for plano in PLANS:
        if plano["id"] == "previa":
            continue   # 5 leads / 1 site e uma amostra, nao a proporcao comercial
        razao = plano["credits"] / plano["sites"]
        assert 9 <= razao <= 16.5, f"{plano['id']}: {razao:.1f} leads por site"


def test_plano_mais_caro_entrega_mais():
    """Ordenado por preco, leads e sites nunca podem regredir."""
    ordenados = sorted(PLANS, key=lambda p: p["amount_cents"])
    for anterior, seguinte in zip(ordenados, ordenados[1:]):
        assert seguinte["credits"] > anterior["credits"]
        assert seguinte["sites"] > anterior["sites"]


def test_todo_item_tem_credito_positivo_e_preco_coerente():
    """A Previa e gratuita de proposito; o resto tem que ter preco."""
    for p in ITENS:
        assert p["credits"] > 0
        if p["id"] == "previa":
            assert p["amount_cents"] == 0
        else:
            assert p["amount_cents"] > 0


# ------------------------------- assinatura no formato do Mercado Pago

def assinar_mp(data_id: str, request_id: str = "req-1", ts: int = None) -> dict:
    """Monta o header x-signature como o Mercado Pago monta.

    O manifest NAO e o corpo: e id + request-id + ts. Implementar como
    HMAC do corpo faria a verificacao passar sempre — ou nunca.
    """
    ts = ts if ts is not None else int(time.time())
    manifest = f"id:{data_id};request-id:{request_id};ts:{ts};"
    v1 = hmac.new(SEGREDO.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    return {"x-signature": f"ts={ts},v1={v1}", "x-request-id": request_id}


def test_assinatura_valida_do_mp_passa():
    h = assinar_mp("PAY-1")
    assert mp.assinatura_confere(h["x-signature"], "req-1", "PAY-1", SEGREDO) is True


def test_assinatura_de_outro_pagamento_nao_serve():
    """Trocar o id do pagamento invalida: senao, um aviso capturado de
    uma compra serviria para liberar outra."""
    h = assinar_mp("PAY-1")
    assert mp.assinatura_confere(h["x-signature"], "req-1", "PAY-OUTRO", SEGREDO) is False


def test_request_id_diferente_invalida():
    h = assinar_mp("PAY-1", request_id="req-1")
    assert mp.assinatura_confere(h["x-signature"], "req-2", "PAY-1", SEGREDO) is False


def test_aviso_antigo_e_recusado():
    """Sem janela de tempo, um webhook legitimo capturado hoje poderia
    ser reenviado meses depois."""
    h = assinar_mp("PAY-1", ts=int(time.time()) - 3600)
    assert mp.assinatura_confere(h["x-signature"], "req-1", "PAY-1", SEGREDO) is False


@pytest.mark.parametrize("cabecalho", ["", "lixo", "ts=1", "v1=abc"])
def test_header_malformado_e_recusado(cabecalho):
    assert mp.assinatura_confere(cabecalho, "req-1", "PAY-1", SEGREDO) is False


def test_sem_segredo_nada_passa():
    h = assinar_mp("PAY-1")
    assert mp.assinatura_confere(h["x-signature"], "req-1", "PAY-1", "") is False


# ----------------------------------------------------- webhook na pratica

def mp_falso(monkeypatch, aprovado=True, order_id="", payment_id="PAY-1"):
    """Substitui a consulta a API do MP por uma resposta controlada."""
    async def consulta(token, pid):
        return {
            "id": payment_id, "status": "approved" if aprovado else "rejected",
            "aprovado": aprovado, "order_id": order_id,
            "valor_centavos": 9900, "metodo": "pix",
        }
    monkeypatch.setattr(mp, "consultar_pagamento", consulta)


def ligar_pagamento(monkeypatch):
    monkeypatch.setattr(settings, "PAYMENT_WEBHOOK_SECRET", SEGREDO)
    monkeypatch.setattr(settings, "MERCADOPAGO_TOKEN", "TOKEN-FALSO")
    monkeypatch.setattr(settings, "PAYMENT_PROVIDER", "mercadopago")


def test_webhook_sem_assinatura_e_recusado(client, monkeypatch):
    ligar_pagamento(monkeypatch)
    resp = client.post("/api/webhooks/pagamento", json={"type": "payment", "data": {"id": "PAY-1"}})
    assert resp.status_code == 401


def test_webhook_com_assinatura_falsa_e_recusado(client, monkeypatch):
    ligar_pagamento(monkeypatch)
    resp = client.post(
        "/api/webhooks/pagamento",
        json={"type": "payment", "data": {"id": "PAY-1"}},
        headers={"x-signature": "ts=1,v1=falsa", "x-request-id": "req-1"},
    )
    assert resp.status_code == 401


def test_webhook_desligado_recusa(client):
    assert client.post("/api/webhooks/pagamento", json={"type": "payment"}).status_code == 503


def test_corpo_mentindo_que_esta_pago_nao_credita(client, monkeypatch):
    """O corpo do aviso do MP nao diz se foi aprovado. Quem decide e a
    consulta a API deles — por isso "paid": true no corpo nao basta."""
    ligar_pagamento(monkeypatch)
    mp_falso(monkeypatch, aprovado=False, order_id="ord_x")
    h = assinar_mp("PAY-1")
    resp = client.post(
        "/api/webhooks/pagamento",
        json={"type": "payment", "paid": True, "data": {"id": "PAY-1"}},
        headers=h,
    )
    assert resp.json()["status"] == "ignorado"


def test_webhook_assinado_e_aprovado_credita_uma_vez_so(client, monkeypatch):
    """Provedores reenviam o webhook quando nao recebem 200. Sem
    idempotencia, a mesma compra creditaria varias vezes."""
    ligar_pagamento(monkeypatch)

    client.post("/api/checkout", json={"package_id": "recarga_500"})
    pedido = client.get("/api/orders").json()[0]
    assert pedido["status"] == "pending"

    mp_falso(monkeypatch, aprovado=True, order_id=pedido["id"])
    corpo = {"type": "payment", "data": {"id": "PAY-1"}}
    h = assinar_mp("PAY-1")

    primeira = client.post("/api/webhooks/pagamento", json=corpo, headers=h)
    assert primeira.json()["status"] == "creditado"
    assert primeira.json()["credits"] == achar_pacote("recarga_500")["credits"]

    segunda = client.post("/api/webhooks/pagamento", json=corpo, headers=h)
    assert segunda.json()["status"] == "ja_processado"

    assert client.get(f"/api/orders/{pedido['id']}").json()["status"] == "paid"


def test_plano_concede_creditos_e_cota_de_sites(client, monkeypatch):
    ligar_pagamento(monkeypatch)
    client.post("/api/checkout", json={"package_id": "start"})
    pedido = client.get("/api/orders").json()[0]

    mp_falso(monkeypatch, aprovado=True, order_id=pedido["id"])
    resp = client.post(
        "/api/webhooks/pagamento",
        json={"type": "payment", "data": {"id": "PAY-1"}},
        headers=assinar_mp("PAY-1"),
    )
    assert resp.json()["credits"] == 150
    assert resp.json()["sites"] == 10

    perfil = client.get("/api/profile").json()
    assert perfil["sites_quota"] == 10
    assert "Start" in perfil["plan"]


def test_webhook_de_pedido_inexistente_nao_quebra(client, monkeypatch):
    ligar_pagamento(monkeypatch)
    mp_falso(monkeypatch, aprovado=True, order_id="ord_fantasma")
    resp = client.post(
        "/api/webhooks/pagamento",
        json={"type": "payment", "data": {"id": "PAY-1"}},
        headers=assinar_mp("PAY-1"),
    )
    assert resp.json()["status"] == "ignorado"


def test_evento_que_nao_e_pagamento_e_ignorado(client, monkeypatch):
    ligar_pagamento(monkeypatch)
    resp = client.post("/api/webhooks/pagamento", json={"type": "plan", "data": {"id": "1"}})
    assert resp.json()["status"] == "ignorado"


# ------------------------------------------------------------- isolamento

def test_pedido_de_outro_usuario_nao_e_visivel(client, as_user):
    client.post("/api/checkout", json={"package_id": "recarga_150"})
    pedido = client.get("/api/orders").json()[0]

    as_user("bob")
    assert client.get("/api/orders").json() == []
    assert client.get(f"/api/orders/{pedido['id']}").status_code == 404


# ------------------------------------------------------- cota de sites

HTML_SITE = "<!DOCTYPE html><html><body><h1>Site</h1></body></html>"


def test_previa_gratuita_nao_publica_site(client):
    """A Previa cria e edita, mas publicar exige plano pago."""
    resp = client.post("/api/sites", json={"company": "X", "html": HTML_SITE})
    assert resp.status_code == 402
    assert "Publicar o site" in resp.json()["detail"]


def test_cota_do_plano_e_respeitada(client, monkeypatch):
    ligar_pagamento(monkeypatch)

    # compra o Start, que da 10 sites
    client.post("/api/checkout", json={"package_id": "start"})
    pedido = client.get("/api/orders").json()[0]
    mp_falso(monkeypatch, aprovado=True, order_id=pedido["id"])
    client.post(
        "/api/webhooks/pagamento",
        json={"type": "payment", "data": {"id": "PAY-1"}},
        headers=assinar_mp("PAY-1"),
    )

    cota = client.get("/api/sites/quota").json()
    assert cota["cota"] == 10 and cota["usados"] == 0

    for i in range(10):
        r = client.post("/api/sites", json={"company": f"Site {i}", "html": HTML_SITE})
        assert r.status_code == 200, f"site {i}: {r.text}"

    estourado = client.post("/api/sites", json={"company": "Extra", "html": HTML_SITE})
    assert estourado.status_code == 402
    assert "10 de 10" in estourado.json()["detail"]

    assert client.get("/api/sites/quota").json()["usados"] == 10


def test_apagar_site_libera_a_cota(client, monkeypatch):
    ligar_pagamento(monkeypatch)
    client.post("/api/checkout", json={"package_id": "start"})
    pedido = client.get("/api/orders").json()[0]
    mp_falso(monkeypatch, aprovado=True, order_id=pedido["id"])
    client.post(
        "/api/webhooks/pagamento",
        json={"type": "payment", "data": {"id": "PAY-1"}},
        headers=assinar_mp("PAY-1"),
    )

    site_id = client.post("/api/sites", json={"company": "A", "html": HTML_SITE}).json()["id"]
    assert client.get("/api/sites/quota").json()["usados"] == 1

    client.delete(f"/api/sites/{site_id}")
    assert client.get("/api/sites/quota").json()["usados"] == 0


def test_admin_nao_tem_cota(client, monkeypatch):
    """Voce precisa testar sem esbarrar no limite dos clientes."""
    monkeypatch.setattr(settings, "ADMIN_EMAILS", "dono@leadsage.app")
    from app.main import app as fastapi_app
    from app.firebase_config import get_current_user as dep

    fastapi_app.dependency_overrides[dep] = lambda: {
        "uid": "alice", "email": "dono@leadsage.app",
    }
    try:
        cota = client.get("/api/sites/quota").json()
        assert cota["ilimitado"] is True

        # sem plano nenhum, cria varios
        for i in range(12):
            r = client.post("/api/sites", json={"company": f"S{i}", "html": HTML_SITE})
            assert r.status_code == 200
    finally:
        from conftest import CURRENT_UID
        fastapi_app.dependency_overrides[dep] = lambda: {"uid": CURRENT_UID["value"]}


def test_usuario_nao_pode_se_conceder_cota(client):
    """PUT /api/profile com sites_quota daria sites de graca — a mesma
    falha que existia nos creditos."""
    client.put("/api/profile", json={
        "id": "alice", "name": "Alice", "email": "a@x.com", "company_name": "A",
        "niche_focus": "", "product_description": "", "credits": 0,
        "plan": "Agência Vitalício", "plan_id": "agencia",
        "avatar": "", "sites_quota": 999999,
    })
    perfil = client.get("/api/profile").json()
    assert perfil["sites_quota"] != 999999
    assert perfil["plan"] != "Agência Vitalício"
    assert perfil["plan_id"] != "agencia"

    # e continua sem poder criar site
    assert client.post("/api/sites", json={"company": "X", "html": HTML_SITE}).status_code == 402


# ------------------------------------------------ escada de funcionalidades

HTML_MIN = "<!DOCTYPE html><html><body>x</body></html>"


def test_previa_e_o_plano_de_quem_nunca_comprou(client):
    plano = client.get("/api/plan").json()
    assert plano["plan_id"] == "previa"
    assert plano["credits"] == 5 and plano["sites"] == 1
    assert plano["recursos"] == []


@pytest.mark.parametrize("plan_id,esperados", [
    ("previa", []),
    ("start", ["publicar_site", "ia_abordagem", "pipeline", "recarga"]),
    ("pro", ["exportar_leads", "marca_propria", "templates_premium"]),
    ("agencia", ["propostas", "contratos", "precificador", "suporte_prioritario"]),
])
def test_cada_plano_libera_o_que_promete(client, com_plano, plan_id, esperados):
    com_plano(plan_id)
    recursos = client.get("/api/plan").json()["recursos"]
    for r in esperados:
        assert r in recursos, f"{plan_id} deveria liberar {r}"


def test_plano_maior_inclui_tudo_do_menor():
    """Se o Pro nao contiver o Start, alguem faz upgrade e perde acesso."""
    from app.payments import plano_de
    escada = ["start", "pro", "agencia"]
    for menor, maior in zip(escada, escada[1:]):
        assert set(plano_de(menor)["recursos"]) <= set(plano_de(maior)["recursos"])


@pytest.mark.parametrize("plan_id,permitido", [
    ("previa", False), ("start", False), ("pro", True), ("agencia", True),
])
def test_exportacao_de_leads_exige_pro(client, com_plano, plan_id, permitido):
    com_plano(plan_id)
    resp = client.get("/api/leads/export")
    assert (resp.status_code == 200) is permitido, resp.text
    if permitido:
        assert "text/csv" in resp.headers["content-type"]
        assert "Empresa" in resp.text


@pytest.mark.parametrize("plan_id,permitido", [
    ("start", False), ("pro", False), ("agencia", True),
])
def test_propostas_e_contratos_exigem_agencia(client, com_plano, plan_id, permitido):
    com_plano(plan_id)
    resp = client.post("/api/documents", json={
        "kind": "proposta", "title": "T", "content": "Conteudo",
    })
    assert (resp.status_code == 200) is permitido, resp.text


@pytest.mark.parametrize("plan_id,permitido", [
    ("previa", False), ("start", True),
])
def test_publicar_site_exige_plano_pago(client, com_plano, plan_id, permitido):
    com_plano(plan_id)
    resp = client.post("/api/sites", json={"company": "X", "html": HTML_MIN})
    assert (resp.status_code == 200) is permitido, resp.text


@pytest.mark.parametrize("plan_id,local,permitido", [
    ("start", "Salvador, BA, Brazil", True),
    ("start", "Lisboa, Lisboa, Portugal", False),
    ("pro", "Lisboa, Lisboa, Portugal", True),
    ("pro", "Miami, Florida, United States", True),
    ("agencia", "Porto, Porto, Portugal", True),
])
def test_busca_internacional_exige_pro(client, com_plano, plan_id, local, permitido):
    com_plano(plan_id)
    resp = client.post("/api/search-leads", json={
        "niche": "Padarias", "location": local, "limit": 1, "enrich": False,
    })
    if permitido:
        assert resp.status_code != 402, resp.text
    else:
        assert resp.status_code == 402
        assert "Pro" in resp.json()["detail"]


def test_deteccao_de_pais():
    from app.main import detectar_pais
    assert detectar_pais("Salvador, BA, Brazil") == "BR"
    assert detectar_pais("Lisboa, Portugal") == "PT"
    assert detectar_pais("Miami, Florida, United States") == "US"
    assert detectar_pais("") == "BR"
    assert detectar_pais("Buenos Aires, Argentina") == "OUTRO"


def test_admin_passa_por_toda_a_escada(client, monkeypatch):
    """Sem plano nenhum, admin acessa tudo — voce precisa testar."""
    monkeypatch.setattr(settings, "ADMIN_EMAILS", "dono@leadsage.app")
    from app.firebase_config import get_current_user as dep
    from app.main import app as fastapi_app

    fastapi_app.dependency_overrides[dep] = lambda: {
        "uid": "alice", "email": "dono@leadsage.app",
    }
    try:
        assert client.get("/api/plan").json()["admin"] is True
        assert client.get("/api/leads/export").status_code == 200
        assert client.post("/api/documents", json={
            "kind": "contrato", "title": "T", "content": "C",
        }).status_code == 200
        assert client.post("/api/sites", json={
            "company": "X", "html": HTML_MIN,
        }).status_code == 200
    finally:
        from conftest import CURRENT_UID
        fastapi_app.dependency_overrides[dep] = lambda: {"uid": CURRENT_UID["value"]}
