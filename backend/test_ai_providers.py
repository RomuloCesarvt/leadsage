"""Motores de IA gratuitos extras e a corrida entre motores.

Nada aqui chama a internet: o provedor é simulado com um transporte falso do httpx.
"""
import json
import time

import httpx
import pytest

from app import ai_client, ai_providers
from app.ai_client import AIIndisponivel

GROQ = ai_providers.PROVEDORES[0]


@pytest.fixture(autouse=True)
def limpo(monkeypatch):
    ai_providers._CACHE_MODELOS.clear()
    for chave in ("GROQ_API_KEY", "CEREBRAS_API_KEY", "OPENROUTER_API_KEY", "GROQ_MODEL"):
        monkeypatch.delenv(chave, raising=False)
    monkeypatch.setattr(ai_client, "_working_model", None)


def cliente_falso(modelos, responder):
    chamadas = []

    def tratar(req: httpx.Request) -> httpx.Response:
        if req.url.path.endswith("/models"):
            return httpx.Response(200, json={"data": [{"id": m} for m in modelos]})
        corpo = json.loads(req.content)
        chamadas.append(corpo)
        return responder(corpo)

    return httpx.Client(transport=httpx.MockTransport(tratar)), chamadas


def ok(texto='{"body": "Oi"}'):
    return httpx.Response(200, json={"choices": [{"message": {"content": texto}}]})


def test_so_liga_o_provedor_que_tem_chave(monkeypatch):
    assert ai_providers.ativos() == []
    monkeypatch.setenv("GROQ_API_KEY", "gsk_x")
    monkeypatch.setenv("OPENROUTER_API_KEY", "  ")
    assert [p["nome"] for p in ai_providers.ativos()] == ["groq"]


def test_escolhe_o_primeiro_modelo_preferido_que_a_conta_tem():
    assert ai_providers.escolher_modelo(GROQ, ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"]) == "llama-3.3-70b-versatile"
    assert ai_providers.escolher_modelo(GROQ, ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"]) == "openai/gpt-oss-120b"


def test_modelo_fora_da_lista_cai_num_generico_de_texto():
    m = ai_providers.escolher_modelo(GROQ, ["whisper-large-v3", "meta-llama/llama-guard-4", "llama-9-novo"])
    assert m == "llama-9-novo"                    # whisper e guard nao conversam
    with pytest.raises(ai_providers.ProvedorFalhou):
        ai_providers.escolher_modelo(GROQ, ["whisper-large-v3"])


def test_modelo_pode_ser_forcado(monkeypatch):
    monkeypatch.setenv("GROQ_MODEL", "meu-modelo")
    assert ai_providers.escolher_modelo(GROQ, ["llama-3.3-70b-versatile"]) == "meu-modelo"


def test_chama_no_protocolo_da_openai(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "gsk_secreta")
    c, chamadas = cliente_falso(["llama-3.3-70b-versatile"], lambda corpo: ok('{"body": "Boa tarde!"}'))
    texto = ai_providers.chamar(GROQ, "escreva", cliente=c, max_tokens=300)
    assert json.loads(texto)["body"] == "Boa tarde!"
    corpo = chamadas[0]
    assert corpo["model"] == "llama-3.3-70b-versatile" and corpo["max_tokens"] == 300
    assert corpo["messages"] == [{"role": "user", "content": "escreva"}]
    assert corpo["response_format"] == {"type": "json_object"}
    assert "reasoning_effort" not in corpo       # so os modelos que pensam recebem o ajuste


def test_modelo_que_pensa_responde_com_raciocinio_baixo(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "x")
    c, chamadas = cliente_falso(["openai/gpt-oss-120b"], lambda corpo: ok())
    ai_providers.chamar(GROQ, "oi", cliente=c)
    assert chamadas[0]["reasoning_effort"] == "low"


def test_parametro_recusado_e_retirado_e_o_pedido_repete(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "x")

    def responder(corpo):
        if "response_format" in corpo:
            return httpx.Response(400, text='{"error": "response_format nao suportado"}')
        if "reasoning_effort" in corpo:
            return httpx.Response(400, text='{"error": "reasoning_effort invalido"}')
        return ok("texto livre")

    c, chamadas = cliente_falso(["openai/gpt-oss-120b"], responder)
    assert ai_providers.chamar(GROQ, "oi", cliente=c) == "texto livre"
    assert len(chamadas) == 3


@pytest.mark.parametrize("codigo", [429, 503])
def test_pico_de_demanda_vira_falha_transitoria(codigo, monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "x")
    c, _ = cliente_falso(["llama-3.3-70b-versatile"], lambda corpo: httpx.Response(codigo, text="limite"))
    with pytest.raises(ai_providers.ProvedorFalhou) as e:
        ai_providers.chamar(GROQ, "oi", cliente=c)
    assert ai_client._e_transitorio(e.value)      # a corrida segue para o proximo motor


def test_resposta_vazia_e_falha(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "x")
    c, _ = cliente_falso(["llama-3.3-70b-versatile"], lambda corpo: ok("  "))
    with pytest.raises(ai_providers.ProvedorFalhou, match="vazia"):
        ai_providers.chamar(GROQ, "oi", cliente=c)


# ------------------------------------------------------------------ a corrida

def corrida(monkeypatch, itens, atraso=0.2, prazo_s=5):
    monkeypatch.setattr(ai_client, "_candidatos", lambda *a, **k: itens)
    return ai_client.generate_hedged(None, "x", time.monotonic() + prazo_s, atraso=atraso)


def test_o_motor_lento_nao_segura_o_rapido(monkeypatch):
    def lento(_):
        time.sleep(2.0)
        return "do lento"

    t = time.monotonic()
    texto = corrida(monkeypatch, [("lento", lento), ("rapido", lambda _: "do rapido")])
    assert texto == "do rapido" and time.monotonic() - t < 1.2
    assert ai_client._working_model == "rapido"   # na proxima, ele vai na frente


def test_motor_que_falha_passa_a_vez_sem_esperar(monkeypatch):
    def quebrado(_):
        raise RuntimeError("503 UNAVAILABLE")

    t = time.monotonic()
    assert corrida(monkeypatch, [("a", quebrado), ("b", lambda _: "ok")], atraso=3.0) == "ok"
    assert time.monotonic() - t < 1.0


def test_todos_falham_da_mensagem_de_alta_demanda(monkeypatch):
    def quebrado(_):
        raise RuntimeError("429 RESOURCE_EXHAUSTED")

    with pytest.raises(AIIndisponivel, match="alta demanda"):
        corrida(monkeypatch, [("a", quebrado), ("b", quebrado)])


def test_prazo_estourado_nao_trava(monkeypatch):
    def preso(_):
        time.sleep(3)
        return "tarde"

    t = time.monotonic()
    with pytest.raises(AIIndisponivel):
        corrida(monkeypatch, [("a", preso)], atraso=0.2, prazo_s=1)
    assert time.monotonic() - t < 2.0


def test_provedores_com_chave_entram_na_frente_do_gemini(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "x")
    rotulos = [r for r, _ in ai_client._candidatos(None, "oi", None, True)]
    assert rotulos[0] == "groq" and rotulos[1:] == list(ai_client.MODEL_CHAIN)


def test_sem_chave_extra_so_o_gemini(monkeypatch):
    rotulos = [r for r, _ in ai_client._candidatos(None, "oi", None, True)]
    assert rotulos == list(ai_client.MODEL_CHAIN)
