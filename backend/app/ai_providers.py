"""Outros motores de IA, gratuitos, para correr junto com o Gemini.

Por que existe: o Gemini gratuito oscila (503, limite por minuto, 5 a 30 segundos no mesmo
pedido), e uma resposta de vendedor no WhatsApp não pode esperar isso. Os provedores abaixo
rodam modelos abertos em chips próprios e respondem em cerca de 1 segundo. Todos falam o mesmo
protocolo (o da OpenAI), então um cliente só atende os três.

Cada um liga sozinho quando a chave existe no ambiente (Vercel > Environment Variables):

    GROQ_API_KEY        console.groq.com/keys          (sem cartão)
    CEREBRAS_API_KEY    cloud.cerebras.ai              (conferir as condições do plano gratuito)
    OPENROUTER_API_KEY  openrouter.ai/keys             (modelos ":free", limite baixo)

O modelo é escolhido a partir da lista que o próprio provedor devolve (GET /models), na ordem de
preferência abaixo, para não quebrar quando um modelo sai do ar. Dá para forçar um modelo com
GROQ_MODEL, CEREBRAS_MODEL ou OPENROUTER_MODEL.

Os limites gratuitos mudam; as ordens de grandeza (pesquisa de out/2026) são: Groq ~30 pedidos por
minuto, Cerebras ~1 milhão de tokens por dia nos modelos liberados, OpenRouter ~20 por minuto e 50
por dia nos ":free". Por isso nenhum deles é o único: o primeiro que responder vence.
"""
import os
import time
from typing import Any, Dict, List, Optional

import httpx

PROVEDORES: List[Dict[str, Any]] = [
    {
        "nome": "groq",
        "url": "https://api.groq.com/openai/v1",
        "env": "GROQ_API_KEY",
        "preferidos": ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "qwen/qwen3.8-27b", "openai/gpt-oss-20b", "llama-3.1-8b-instant"],
    },
    {
        "nome": "cerebras",
        "url": "https://api.cerebras.ai/v1",
        "env": "CEREBRAS_API_KEY",
        "preferidos": ["gpt-oss-120b", "llama-3.3-70b", "qwen-3.8-27b", "llama3.1-8b"],
    },
    {
        "nome": "openrouter",
        "url": "https://openrouter.ai/api/v1",
        "env": "OPENROUTER_API_KEY",
        "preferidos": ["meta-llama/llama-3.3-70b-instruct:free", "openai/gpt-oss-120b:free", "qwen/qwen3.8-27b:free", "openai/gpt-oss-20b:free"],
    },
]

_CACHE_MODELOS: Dict[str, Any] = {}
_CACHE_TTL_S = 3600


class ProvedorFalhou(RuntimeError):
    """Falha de um provedor. O texto inclui o código HTTP: 429 e 503 contam como pico de demanda."""


def ativos() -> List[Dict[str, Any]]:
    """Os provedores que têm chave configurada, na ordem de velocidade esperada."""
    return [p for p in PROVEDORES if (os.getenv(p["env"]) or "").strip()]


def _chave(p: Dict[str, Any]) -> str:
    return (os.getenv(p["env"]) or "").strip()


def _headers(p: Dict[str, Any]) -> Dict[str, str]:
    h = {"Authorization": f"Bearer {_chave(p)}", "Content-Type": "application/json"}
    if p["nome"] == "openrouter":
        h["HTTP-Referer"] = "https://leadsageofc.vercel.app"
        h["X-Title"] = "LeadSage"
    return h


def modelos_do_provedor(p: Dict[str, Any], cliente: Optional[httpx.Client] = None) -> List[str]:
    """Os modelos que a conta enxerga agora (guardado por 1 hora)."""
    agora = time.monotonic()
    guardado = _CACHE_MODELOS.get(p["nome"])
    if guardado and agora - guardado[0] < _CACHE_TTL_S:
        return guardado[1]
    c = cliente or httpx.Client(timeout=8.0)
    try:
        r = c.get(f"{p['url']}/models", headers=_headers(p))
        if r.status_code >= 400:
            raise ProvedorFalhou(f"{p['nome']}: lista de modelos HTTP {r.status_code}")
        dados = r.json().get("data") or []
        ids = [m.get("id") for m in dados if isinstance(m, dict) and m.get("id")]
    finally:
        if cliente is None:
            c.close()
    _CACHE_MODELOS[p["nome"]] = (agora, ids)
    return ids


_NAO_TEXTO = ("whisper", "tts", "guard", "embed", "orpheus", "image", "vision-preview", "moderation", "transcribe")


def escolher_modelo(p: Dict[str, Any], disponiveis: List[str]) -> str:
    """Modelo forçado por variável, senão o primeiro preferido que a conta tem, senão um genérico."""
    forcado = (os.getenv(f"{p['nome'].upper()}_MODEL") or "").strip()
    if forcado:
        return forcado
    for m in p["preferidos"]:
        if m in disponiveis:
            return m
    for m in disponiveis:
        baixo = m.lower()
        if not any(x in baixo for x in _NAO_TEXTO) and any(x in baixo for x in ("llama", "gpt-oss", "qwen", "mistral", "gemma")):
            return m
    raise ProvedorFalhou(f"{p['nome']}: nenhum modelo de texto disponível")


def _corpo(modelo: str, prompt: str, max_tokens: Optional[int], json_mode: bool, raciocinio_baixo: bool) -> Dict[str, Any]:
    corpo: Dict[str, Any] = {
        "model": modelo,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
    }
    if max_tokens:
        corpo["max_tokens"] = max_tokens
    if json_mode:
        corpo["response_format"] = {"type": "json_object"}
    if raciocinio_baixo and "gpt-oss" in modelo:
        # modelo que "pensa": no nível mínimo ele responde em ~1 s em vez de gastar o prazo pensando
        corpo["reasoning_effort"] = "low"
    return corpo


def chamar(p: Dict[str, Any], prompt: str, limite_s: float = 15.0, max_tokens: Optional[int] = None,
           json_mode: bool = True, cliente: Optional[httpx.Client] = None) -> str:
    """Um pedido de texto ao provedor. Devolve o texto ou levanta ProvedorFalhou."""
    c = cliente or httpx.Client(timeout=httpx.Timeout(limite_s, connect=5.0))
    try:
        modelo = escolher_modelo(p, modelos_do_provedor(p, c))
        extras = {"json_mode": json_mode, "raciocinio_baixo": True}
        for _ in range(3):
            r = c.post(f"{p['url']}/chat/completions", headers=_headers(p),
                       json=_corpo(modelo, prompt, max_tokens, **extras), timeout=limite_s)
            if r.status_code == 400:
                # parâmetro que este modelo não aceita: tira um por vez e repete
                texto = r.text.lower()
                if extras["json_mode"] and "response_format" in texto:
                    extras["json_mode"] = False
                    continue
                if extras["raciocinio_baixo"] and "reasoning" in texto:
                    extras["raciocinio_baixo"] = False
                    continue
            break
        if r.status_code >= 400:
            if r.status_code == 404:
                _CACHE_MODELOS.pop(p["nome"], None)  # o modelo saiu do ar: relê a lista na próxima
            raise ProvedorFalhou(f"{p['nome']} HTTP {r.status_code}: {r.text[:160]}")
        escolhas = (r.json().get("choices") or [])
        texto = ((escolhas[0].get("message") or {}).get("content") or "").strip() if escolhas else ""
        if not texto:
            raise ProvedorFalhou(f"{p['nome']} devolveu resposta vazia")
        return texto
    except httpx.HTTPError as exc:
        raise ProvedorFalhou(f"{p['nome']}: {type(exc).__name__}") from exc
    finally:
        if cliente is None:
            c.close()
