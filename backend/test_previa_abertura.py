"""Quem abriu a prévia: gente conta, o robô de miniatura do WhatsApp não, e recarregar não vira outra visita."""
import asyncio
from datetime import datetime, timedelta, timezone

from app import previa_abertura as pa
from app.profile_store import conceder_plano
from test_api import HTML

CELULAR = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


def dar_cota(client, uid="alice", sites=10):
    """Cota pelo loop do próprio app (o get_event_loop() de test_api só funciona se outro teste já criou um loop)."""
    client.portal.call(conceder_plano, uid, "Teste", sites)


DONO = {"uid": "alice", "lead_id": "lead_7", "site_id": "site_x", "empresa": "Espaço Luminis"}


def test_robos_de_miniatura_e_buscadores_nao_contam():
    for ua in ("WhatsApp/2.23.20.0 A", "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)", "TelegramBot (like TwitterBot)",
               "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", "curl/8.4.0", "python-requests/2.31", "", None):
        assert pa.eh_robo(ua), ua


def test_celular_e_computador_de_gente_contam():
    assert not pa.eh_robo(CELULAR)
    assert not pa.eh_robo(DESKTOP)


def test_a_primeira_abertura_cria_o_registro():
    t = datetime(2026, 10, 22, 14, 0, tzinfo=timezone.utc)
    r = pa._contar(None, DONO, "luminis-ab12", t)
    assert r["visitas"] == 1 and r["carregamentos"] == 1
    assert r["primeira"] == r["ultima"] == "2026-10-22T14:00:00+00:00"
    assert r["lead_id"] == "lead_7" and r["empresa"] == "Espaço Luminis"


def test_recarregar_na_mesma_visita_nao_conta_visita_nova():
    t = datetime(2026, 10, 22, 14, 0, tzinfo=timezone.utc)
    r = pa._contar(None, DONO, "s", t)
    r = pa._contar(r, DONO, "s", t + timedelta(minutes=5))
    assert r["visitas"] == 1 and r["carregamentos"] == 2


def test_voltar_horas_depois_e_outra_visita():
    t = datetime(2026, 10, 22, 14, 0, tzinfo=timezone.utc)
    r = pa._contar(None, DONO, "s", t)
    r = pa._contar(r, DONO, "s", t + timedelta(hours=3))
    assert r["visitas"] == 2 and r["primeira"].startswith("2026-10-22T14:00") and r["ultima"].startswith("2026-10-22T17:00")
    assert len(r["historico"]) == 2


def test_historico_guarda_so_as_ultimas():
    t = datetime(2026, 10, 1, 8, 0, tzinfo=timezone.utc)
    r = None
    for i in range(pa.GUARDAR_ULTIMAS + 5):
        r = pa._contar(r, DONO, "s", t + timedelta(hours=2 * i))
    assert len(r["historico"]) == pa.GUARDAR_ULTIMAS and r["visitas"] == pa.GUARDAR_ULTIMAS + 5


def test_a_rota_publica_conta_a_abertura_e_o_painel_lista(client, com_plano):
    com_plano()
    dar_cota(client)
    site = client.post("/api/sites", json={"company": "Espaço Luminis", "html": HTML, "lead_id": "lead_7"}).json()
    url = f"/s/{site['slug']}"

    assert client.get(url, headers={"user-agent": "WhatsApp/2.23.20.0 A"}).status_code == 200   # a miniatura do link
    assert client.get("/api/previa/aberturas").json() == {"aberturas": []}

    assert client.get(url, headers={"user-agent": CELULAR}).status_code == 200                   # a dona abriu
    assert client.get(url, headers={"user-agent": CELULAR}).status_code == 200                   # e recarregou
    abertas = client.get("/api/previa/aberturas").json()["aberturas"]
    assert len(abertas) == 1
    assert abertas[0]["lead_id"] == "lead_7" and abertas[0]["visitas"] == 1 and abertas[0]["carregamentos"] == 2


def test_apelido_inexistente_continua_404_e_nao_registra(client):
    assert client.get("/s/nao-existe-0000", headers={"user-agent": CELULAR}).status_code == 404
    assert client.get("/api/previa/aberturas").json() == {"aberturas": []}


def test_a_abertura_de_um_usuario_nao_aparece_para_outro(client, as_user, com_plano):
    com_plano()
    dar_cota(client)
    site = client.post("/api/sites", json={"company": "Padaria", "html": HTML, "lead_id": "lead_1"}).json()
    client.get(f"/s/{site['slug']}", headers={"user-agent": CELULAR})
    as_user("bob")
    assert client.get("/api/previa/aberturas").json() == {"aberturas": []}


def test_falha_ao_contar_nunca_derruba_a_pagina(client, com_plano, monkeypatch):
    com_plano()
    dar_cota(client)
    site = client.post("/api/sites", json={"company": "Padaria", "html": HTML}).json()

    async def quebrado(*a, **k):
        raise RuntimeError("banco fora")
    monkeypatch.setattr(pa.robo_store, "_sql_get", quebrado)
    r = client.get(f"/s/{site['slug']}", headers={"user-agent": CELULAR})
    assert r.status_code == 200 and "Padaria Teste" in r.text
    assert "private" in r.headers["cache-control"]   # com "public" a CDN serviria sem passar pela contagem
