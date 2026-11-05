"""Assinatura mensal: cobrança aprovada libera a licença (e os leads do mês), renovação soma um mês, reenvio não credita duas vezes,
licença vencida volta para a Prévia e cancelar não derruba o que já foi pago. O Mercado Pago é simulado.
Rodar: cd backend && python -m pytest -q test_assinatura.py"""
import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone

import pytest

from app import mercadopago as mp
from app import payments, profile_store
from app.config import settings

SEGREDO = "segredo-do-webhook"


def assinar_mp(data_id, request_id="req-1"):
    ts = int(time.time())
    v1 = hmac.new(SEGREDO.encode(), f"id:{data_id};request-id:{request_id};ts:{ts};".encode(), hashlib.sha256).hexdigest()
    return {"x-signature": f"ts={ts},v1={v1}", "x-request-id": request_id}


@pytest.fixture
def mercado(monkeypatch):
    """Pagamento configurado + Mercado Pago falso. `estado` guarda o que o 'MP' responde."""
    monkeypatch.setattr(settings, "PAYMENT_PROVIDER", "mercadopago")
    monkeypatch.setattr(settings, "MERCADOPAGO_TOKEN", "token-de-teste")
    monkeypatch.setattr(settings, "PAYMENT_WEBHOOK_SECRET", SEGREDO)
    monkeypatch.setattr(settings, "FIRESTORE_DESLIGADO", True)           # créditos no SQL (sem isso, aqui o saldo vira "ilimitado")
    estado = {"criadas": [], "canceladas": [], "assinaturas": {}, "pagamentos": {}, "cobrancas": {}}

    async def criar(token, order_id, titulo, valor_centavos, url_retorno, url_webhook, email_comprador):
        aid = f"PRE-{len(estado['criadas']) + 1}"
        estado["criadas"].append({"order_id": order_id, "valor": valor_centavos, "email": email_comprador})
        estado["assinaturas"][aid] = {"id": aid, "status": "authorized", "order_id": order_id, "proximo_debito": "2026-12-05"}
        return {"assinatura_id": aid, "checkout_url": f"https://mp.test/{aid}"}

    async def assinatura(token, aid): return estado["assinaturas"][aid]
    async def pagamento(token, pid): return estado["pagamentos"][pid]
    async def cobranca(token, cid): return estado["cobrancas"][cid]
    async def cancelar(token, aid): estado["canceladas"].append(aid)

    monkeypatch.setattr(mp, "criar_assinatura", criar)
    monkeypatch.setattr(mp, "consultar_assinatura", assinatura)
    monkeypatch.setattr(mp, "consultar_pagamento", pagamento)
    monkeypatch.setattr(mp, "consultar_cobranca_da_assinatura", cobranca)
    monkeypatch.setattr(mp, "cancelar_assinatura", cancelar)
    return estado


def aviso(client, tipo, data_id, request_id="req-1"):
    return client.post(f"/api/webhooks/pagamento?type={tipo}&data.id={data_id}", json={"type": tipo, "data": {"id": data_id}}, headers=assinar_mp(data_id, request_id))


def pagamento_aprovado(estado, pid, order_id, valor=25000):
    estado["pagamentos"][pid] = {"id": pid, "status": "approved", "aprovado": True, "order_id": order_id, "valor_centavos": valor, "metodo": "credit_card"}


def test_so_liga_a_cobranca_com_o_pagamento_configurado(client, monkeypatch):
    monkeypatch.setattr(settings, "MERCADOPAGO_TOKEN", "")
    assert client.get("/api/assinatura/config").json()["ativo"] is False
    r = client.post("/api/assinaturas", json={"plano_id": "m_profissional"})
    assert r.status_code == 503                                          # nunca libera de graça


def test_assinar_cria_o_pedido_mas_nao_libera_nada(client, mercado):
    r = client.post("/api/assinaturas", json={"plano_id": "m_profissional"})
    assert r.status_code == 200 and r.json()["checkout_url"].startswith("https://mp.test/")
    assert mercado["criadas"][0]["valor"] == 25000 and mercado["criadas"][0]["email"] == "alice@example.com"
    p = client.get("/api/profile").json()
    assert p["plan_id"] != "m_profissional" and p["licenca_ate"] == ""   # só o webhook libera
    assert client.post("/api/assinaturas", json={"plano_id": "inexistente"}).status_code == 400


def test_cobranca_aprovada_libera_a_licenca_e_os_leads_do_mes(client, mercado):
    pedido = client.post("/api/assinaturas", json={"plano_id": "m_profissional"}).json()["order"]
    pagamento_aprovado(mercado, "PAY-1", pedido["id"])
    saldo_antes = client.get("/api/credits/balance").json()["credits"]
    r = aviso(client, "payment", "PAY-1")
    assert r.status_code == 200 and r.json()["status"] == "creditado" and r.json()["plano"] == "m_profissional"
    p = client.get("/api/profile").json()
    assert p["plan_id"] == "m_profissional" and p["assinatura_status"] == "authorized" and p["assinatura_id"] == "PRE-1"
    assert p["licenca_ate"] > datetime.now(timezone.utc).isoformat() and p["licenca_expirada"] is False
    assert client.get("/api/credits/balance").json()["credits"] == saldo_antes + 1000
    assert "robo_ia" not in payments.plano_de(p["plan_id"])["recursos"]      # sem o complemento, sem robô


def test_reenvio_do_mesmo_aviso_nao_credita_duas_vezes(client, mercado):
    pedido = client.post("/api/assinaturas", json={"plano_id": "m_essencial"}).json()["order"]
    pagamento_aprovado(mercado, "PAY-1", pedido["id"], 12000)
    aviso(client, "payment", "PAY-1")
    saldo = client.get("/api/credits/balance").json()["credits"]
    r = aviso(client, "payment", "PAY-1", "req-2")
    assert r.json()["status"] == "ja_processado"
    assert client.get("/api/credits/balance").json()["credits"] == saldo


def test_renovacao_do_mes_soma_um_mes_e_mais_leads(client, mercado):
    pedido = client.post("/api/assinaturas", json={"plano_id": "m_essencial"}).json()["order"]
    pagamento_aprovado(mercado, "PAY-1", pedido["id"], 12000)
    aviso(client, "payment", "PAY-1")
    ate1 = client.get("/api/profile").json()["licenca_ate"]
    saldo1 = client.get("/api/credits/balance").json()["credits"]
    # no mês seguinte o MP avisa a cobrança da assinatura (outro tipo de evento, mesmo pedido)
    mercado["cobrancas"]["COB-2"] = {"id": "COB-2", "assinatura_id": "PRE-1", "pagamento_id": "PAY-2", "status": "approved", "aprovado": True, "valor_centavos": 12000}
    r = aviso(client, "subscription_authorized_payment", "COB-2", "req-3")
    assert r.json()["status"] == "creditado"
    ate2 = client.get("/api/profile").json()["licenca_ate"]
    assert datetime.fromisoformat(ate2) - datetime.fromisoformat(ate1) >= timedelta(days=30)     # soma a partir do que sobrou
    assert client.get("/api/credits/balance").json()["credits"] == saldo1 + 150


def test_cobranca_recusada_nao_libera(client, mercado):
    pedido = client.post("/api/assinaturas", json={"plano_id": "m_essencial"}).json()["order"]
    mercado["cobrancas"]["COB-1"] = {"id": "COB-1", "assinatura_id": "PRE-1", "pagamento_id": "PAY-9", "status": "rejected", "aprovado": False, "valor_centavos": 12000}
    r = aviso(client, "subscription_authorized_payment", "COB-1")
    assert r.json()["status"] == "ignorado"
    assert client.get("/api/profile").json()["licenca_ate"] == ""


def test_aviso_sem_assinatura_valida_e_recusado(client, mercado):
    r = client.post("/api/webhooks/pagamento?type=payment&data.id=PAY-1", json={"type": "payment", "data": {"id": "PAY-1"}},
                    headers={"x-signature": "ts=1,v1=falsa", "x-request-id": "r"})
    assert r.status_code == 401


def test_licenca_vencida_volta_para_a_previa_sem_apagar_nada(client, mercado):
    pedido = client.post("/api/assinaturas", json={"plano_id": "m_profissional_robo"}).json()["order"]
    pagamento_aprovado(mercado, "PAY-1", pedido["id"], 35000)
    aviso(client, "payment", "PAY-1")
    assert client.get("/api/profile").json()["plan_id"] == "m_profissional_robo"
    # o mês acabou e ninguém pagou: vencida há mais que a tolerância
    import asyncio
    vencida = (datetime.now(timezone.utc) - timedelta(days=profile_store.TOLERANCIA_DA_LICENCA_DIAS + 1)).isoformat()
    import sqlite3, json
    from conftest import TEST_DB
    con = sqlite3.connect(TEST_DB)
    linha = con.execute("SELECT data FROM user_profiles WHERE uid='alice'").fetchone()
    dados = json.loads(linha[0]); dados["licenca_ate"] = vencida
    con.execute("UPDATE user_profiles SET data=? WHERE uid='alice'", (json.dumps(dados),)); con.commit(); con.close()
    profile_store._PERFIS.clear()
    p = client.get("/api/profile").json()
    assert p["plan_id"] == "previa" and p["licenca_expirada"] is True and p["assinatura_plano"] == "m_profissional_robo"   # só a leitura muda


def test_dentro_da_tolerancia_a_licenca_ainda_vale():
    from app.models import UserProfile
    p = UserProfile(plan_id="m_essencial", licenca_ate=(datetime.now(timezone.utc) - timedelta(days=2)).isoformat(), assinatura_plano="m_essencial")
    profile_store._aplicar_validade(p)
    assert p.plan_id == "m_essencial" and not p.licenca_expirada


def test_plano_vitalicio_antigo_nunca_vence():
    from app.models import UserProfile
    p = UserProfile(plan_id="pro")
    profile_store._aplicar_validade(p)
    assert p.plan_id == "pro"


def test_cancelar_nao_derruba_a_licenca_ja_paga(client, mercado):
    pedido = client.post("/api/assinaturas", json={"plano_id": "m_essencial"}).json()["order"]
    pagamento_aprovado(mercado, "PAY-1", pedido["id"], 12000)
    aviso(client, "payment", "PAY-1")
    ate = client.get("/api/profile").json()["licenca_ate"]
    r = client.post("/api/assinaturas/cancelar")
    assert r.status_code == 200 and mercado["canceladas"] == ["PRE-1"]
    p = client.get("/api/profile").json()
    assert p["assinatura_status"] == "cancelled" and p["plan_id"] == "m_essencial" and p["licenca_ate"] == ate
    assert client.post("/api/assinaturas/cancelar").status_code == 404      # já cancelada


def test_o_usuario_nao_consegue_se_dar_licenca_pelo_perfil(client):
    client.put("/api/profile", json={"name": "A", "plan_id": "m_escala", "licenca_ate": "2099-01-01T00:00:00", "assinatura_plano": "m_escala"})
    p = client.get("/api/profile").json()
    assert p["plan_id"] != "m_escala" and p["licenca_ate"] == ""


def test_precos_e_cotas_do_servidor_batem_com_os_da_tela():
    """A tela (frontend/src/data/planos.ts) mostra o que o servidor cobra: se um mudar sem o outro, o cliente paga um valor e vê outro."""
    import pathlib
    import re
    ts = (pathlib.Path(__file__).resolve().parents[1] / "frontend" / "src" / "data" / "planos.ts").read_text(encoding="utf-8")
    tela = {m[0]: (int(m[1]), int(m[2]), int(m[3])) for m in re.findall(
        r"id: '(essencial|profissional|escala)', nome: '[^']+', preco: (\d+), leads: (\d+), sites: (\d+)", ts)}
    robo = int(re.search(r"ROBO_COMPLEMENTO = (\d+)", ts).group(1))
    assert set(tela) == {"essencial", "profissional", "escala"}
    for id_, (preco, leads, sites) in tela.items():
        base = payments.achar_plano_mensal(f"m_{id_}")
        assert (base["amount_cents"], base["credits"], base["sites"]) == (preco * 100, leads, sites), id_
        com_robo = payments.achar_plano_mensal(f"m_{id_}_robo")
        if com_robo:
            assert com_robo["amount_cents"] == (preco + robo) * 100 and "robo_ia" in com_robo["recursos"], id_
        assert "robo_ia" not in base["recursos"] or id_ == "escala"
