"""O Gemini gratuito recusa (429) rajada de chamadas: uma chamada por lead, duas por vez, nova tentativa em pico e modelo cansado descansa."""
import asyncio
import time

import pytest

from app import ai_client, ai_generator, fila_envio
from app.models import LeadItem, PitchGenerationRequest
from test_robo import com_robo, rodar  # noqa: F401


def _lead():
    return LeadItem(id="L1", name="Ana", avatar="", role="Dona", niche="Dentistas", company="Clínica Aurora", location="Botucatu",
                    city="Botucatu", email="", phone="", whatsapp=True, socials={}, quality_score=70, verified=True, outreach_status="Pendente")


def test_seguimentos_vao_na_mesma_chamada_da_abertura(monkeypatch, rodar):
    chamadas = []

    def falso(client, prompt, obrigatorias=None, tentativas=2, prazo=None, rapido=False, max_tokens=None):
        chamadas.append(prompt)
        return {"body": "Oi, Ana! Achei a clínica no Google.", "follow_ups": [
            {"quando": "2 dias depois", "objetivo": "lembrar", "texto": "Ana, viu a prévia?"},
            {"quando": "5 dias depois", "objetivo": "fechar", "texto": "Ana, deixei a prévia pronta."}]}

    monkeypatch.setattr(ai_generator, "gerar_json", falso)
    monkeypatch.setattr(ai_generator, "build_client", lambda k: object())
    req = PitchGenerationRequest(lead=_lead(), channel="whatsapp", com_seguimentos=True)
    pitch = rodar(ai_generator.AIGenerator.generate_pitch, req, "chave")
    assert len(chamadas) == 1 and '"follow_ups"' in chamadas[0]
    assert [f["texto"] for f in pitch.follow_ups] == ["Ana, viu a prévia?", "Ana, deixei a prévia pronta."]


def test_sem_seguimentos_o_pedido_nao_menciona_follow_ups():
    req = PitchGenerationRequest(lead=_lead(), channel="whatsapp")
    assert '"follow_ups"' not in ai_generator._prompt_da_abordagem(req, "whatsapp")


def test_seguimento_ausente_nao_derruba_a_abertura(monkeypatch, rodar):
    monkeypatch.setattr(ai_generator, "gerar_json", lambda *a, **k: {"body": "Oi, Ana!"})
    monkeypatch.setattr(ai_generator, "build_client", lambda k: object())
    pitch = rodar(ai_generator.AIGenerator.generate_pitch, PitchGenerationRequest(lead=_lead(), channel="whatsapp", com_seguimentos=True), "chave")
    assert pitch.body == "Oi, Ana!" and pitch.follow_ups == []


def test_pico_de_demanda_tenta_de_novo_uma_vez(monkeypatch, rodar):
    async def sem_espera(_):
        return None

    monkeypatch.setattr(fila_envio.asyncio, "sleep", sem_espera)
    tentativas = []

    async def gerar(lead, canal):
        tentativas.append(1)
        if len(tentativas) == 1:
            raise ai_client.AIIndisponivel("A IA está com alta demanda no momento e demorou demais.")
        return {"body": "Oi, Ana! Texto novo e único para esta clínica."}

    async def nao(*a, **k):
        return False

    lead = {"id": "L1", "company": "Clínica Aurora", "phone": "14998003784"}
    r = rodar(fila_envio.preparar_lote, "alice", [lead], gerar, nao, nao, nao, 0, True)
    assert len(tentativas) == 2 and r["resultados"][0]["resultado"] == "para revisar"


def test_endpoint_da_fila_escreve_whatsapp_com_seguimentos_de_ponta_a_ponta(client, com_robo, monkeypatch):
    """O caminho real: /api/robo/fila/preparar -> gerar() -> generate_pitch -> fila. Quebrava com 'dict' sem model_dump."""
    def falso(c, prompt, obrigatorias=None, tentativas=2, prazo=None, rapido=False, max_tokens=None):
        return {"body": "Oi, Ana! Achei a clínica no Google, nota 4,9, sem site. Criei uma prévia. Posso enviar?",
                "follow_ups": [{"quando": "2 dias depois", "objetivo": "lembrar", "texto": "Ana, viu a prévia?"},
                               {"quando": "5 dias depois", "objetivo": "fechar", "texto": "Ana, deixei a prévia pronta."}]}

    monkeypatch.setattr(ai_generator, "gerar_json", falso)
    monkeypatch.setattr(ai_generator, "build_client", lambda k: object())
    from app.config import settings
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "chave-de-teste")
    lead = _lead().model_dump()
    lead.update(phone="14998003784")
    r = client.post("/api/robo/fila/preparar", json={"leads": [lead], "revisar": True})
    assert r.status_code == 200, r.text
    res = r.json()["resultados"][0]
    assert res["resultado"] == "para revisar", res
    item = next(i for i in client.get("/api/robo/fila").json()["itens"] if i["lead_id"] == "L1")
    assert [s["texto"] for s in item["seguimentos"]] == ["Ana, viu a prévia?", "Ana, deixei a prévia pronta."]


def test_texto_do_site_do_mesmo_lead_nao_chama_a_ia_de_novo(client, com_robo, monkeypatch):
    from app import main
    chamadas = []

    async def falso(alvo, chave, servico="", rapido=False):
        chamadas.append(alvo.get("id"))
        return {"categoria": "Padaria", "slogan": "Fornada nova", "sobre": "x", "servicos": [{"titulo": "Pão", "descricao": "y"}]}

    monkeypatch.setattr(main, "gerar_conteudo_de_site", falso)
    lead = _lead().model_dump()
    for _ in range(3):
        r = client.post("/api/generate-site-copy", json={"lead": lead})
        assert r.status_code == 200, r.text and r.json()["slogan"] == "Fornada nova"
    assert chamadas == ["L1"]
