"""Áudio do WhatsApp virando texto, de graça, para o robô entender o que o lead falou.

Quem manda áudio costuma ser quem mais quer conversar. Antes o robô via só "[áudio]" e passava a conversa para o dono. Agora a nuvem baixa o
áudio, manda para cá e o robô recebe o texto falado (marcado com 🎤).

Motores, nesta ordem (os dois têm cota gratuita):
  1. Groq Whisper (whisper-large-v3-turbo, depois whisper-large-v3): aceita o .ogg/opus do WhatsApp direto e responde em ~1 s.
  2. Gemini (modelo que entende áudio): reserva, quando o Groq está no limite por minuto ou fora do ar.
"""
import os
import re
from typing import Dict

import httpx

from app.config import settings

GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
MODELOS_WHISPER = ("whisper-large-v3-turbo", "whisper-large-v3")
LIMITE_BYTES = 4_000_000          # a função da Vercel aceita no máximo ~4,5 MB por requisição; um áudio de 3 minutos pesa uns 600 KB

# O Whisper "inventa" legendas quando só ouve silêncio ou ruído: isso nunca pode virar fala do cliente.
_ALUCINACAO = re.compile(
    r"legendas? (pela|por|de|feitas?)|amara\.org|inscreva-?se|obrigad[oa] por assistir|(tchau|até) (a )?próxim[oa]|"
    r"curta e compartilhe|deixe seu like|subtitles? by|www\.", re.I)


class TranscricaoIndisponivel(RuntimeError):
    """Nenhum motor conseguiu ouvir o áudio agora."""


def mime_limpo(mime: str) -> str:
    """"audio/ogg; codecs=opus" -> "audio/ogg" (os motores não querem o parâmetro)."""
    base = (mime or "").split(";")[0].strip().lower()
    return base if base.startswith("audio/") else "audio/ogg"


def _extensao(mime: str) -> str:
    return {"audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac", "audio/wav": "wav", "audio/webm": "webm",
            "audio/x-m4a": "m4a", "audio/amr": "amr"}.get(mime, "ogg")


def limpar(texto: str) -> str:
    """O texto falado, sem espaços sobrando e sem a legenda que o Whisper inventa no silêncio."""
    t = re.sub(r"\s+", " ", (texto or "")).strip()
    if not t or _ALUCINACAO.search(t) and len(t) < 90:
        return ""
    return t[:2000]


def _groq(audio: bytes, mime: str, cliente: httpx.Client) -> str:
    chave = (os.getenv("GROQ_API_KEY") or "").strip()
    if not chave:
        raise TranscricaoIndisponivel("sem chave do Groq")
    ultimo = ""
    for modelo in MODELOS_WHISPER:
        r = cliente.post(
            GROQ_URL, headers={"Authorization": f"Bearer {chave}"},
            files={"file": (f"audio.{_extensao(mime)}", audio, mime)},
            data={"model": modelo, "language": "pt", "response_format": "json", "temperature": "0"},
        )
        if r.status_code == 200:
            return str((r.json() or {}).get("text") or "")
        ultimo = f"{modelo} HTTP {r.status_code}: {r.text[:160]}"
        if r.status_code in (401, 403):
            break                      # chave recusada: o outro modelo também será
    raise TranscricaoIndisponivel(f"groq: {ultimo}")


def _gemini(audio: bytes, mime: str) -> str:
    if not settings.GEMINI_API_KEY:
        raise TranscricaoIndisponivel("sem chave do Gemini")
    from google.genai import types

    from app import ai_client

    cliente = ai_client.build_client(settings.GEMINI_API_KEY, timeout_ms=30_000)
    pedido = ("Transcreva fielmente, em português do Brasil, o que a pessoa fala neste áudio. Responda SOMENTE com a transcrição, "
              "sem comentários, sem aspas e sem rótulos. Se não houver fala (silêncio ou ruído), responda exatamente: VAZIO")
    ultimo = ""
    for modelo in [m for m in ai_client.MODEL_CHAIN if "lite" not in m][:2]:
        try:
            r = cliente.models.generate_content(model=modelo, contents=[types.Part.from_bytes(data=audio, mime_type=mime), pedido])
            texto = (r.text or "").strip()
            return "" if texto.upper().strip(". ") == "VAZIO" else texto
        except Exception as exc:       # 429/503/modelo fora: tenta o próximo
            ultimo = f"{modelo}: {type(exc).__name__}: {str(exc)[:120]}"
    raise TranscricaoIndisponivel(f"gemini: {ultimo}")


def transcrever(audio: bytes, mime: str = "audio/ogg", cliente: "httpx.Client | None" = None) -> Dict[str, str]:
    """{"texto": ..., "motor": "groq"|"gemini"}. Texto vazio = não havia fala. Levanta TranscricaoIndisponivel se nenhum motor respondeu."""
    if not audio:
        raise TranscricaoIndisponivel("áudio vazio")
    mime = mime_limpo(mime)
    erros = []
    c = cliente or httpx.Client(timeout=httpx.Timeout(25.0, connect=5.0))
    try:
        try:
            return {"texto": limpar(_groq(audio, mime, c)), "motor": "groq"}
        except (TranscricaoIndisponivel, httpx.HTTPError) as exc:
            erros.append(str(exc)[:200])
    finally:
        if cliente is None:
            c.close()
    try:
        return {"texto": limpar(_gemini(audio, mime)), "motor": "gemini"}
    except TranscricaoIndisponivel as exc:
        erros.append(str(exc)[:200])
    raise TranscricaoIndisponivel(" | ".join(erros))
