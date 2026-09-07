"""Diagnostico das dependencias externas do LeadSage.

Existe porque descobrir o estado delas exigia garimpar o Google Cloud
Console: qual projeto e dono da chave, se a cota estourou, se a foto do
lead vem ou nao. Nada disso aparecia no app — o sintoma chegava como
"erro na busca" e pronto.

Rodar:  cd backend && python diagnostico.py

Nao altera nada. Faz algumas chamadas baratas de leitura.
"""
import asyncio
import io
import sys

import httpx

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

from app.config import settings
from app.firebase_config import db as firestore_db

OK = "  [ok]   "
ERRO = "  [ERRO] "
AVISO = "  [!]    "


def titulo(texto: str) -> None:
    print(f"\n{texto}\n" + "-" * len(texto))


def impressao_digital(chave: str) -> str:
    """Nunca imprime a chave inteira: este texto costuma ser colado fora."""
    return f"{chave[:10]}...{chave[-4:]}" if len(chave) > 16 else "(muito curta)"


def projeto_dono_da_chave(chave: str) -> str:
    """Descobre a que projeto do Google Cloud a chave pertence.

    Nao ha API que responda isso diretamente. O truque e chamar um
    servico que certamente nao esta habilitado: a recusa nomeia o
    projeto consumidor.
    """
    try:
        r = httpx.get(
            "https://translation.googleapis.com/language/translate/v2",
            params={"key": chave, "q": "x", "target": "en"},
            timeout=20,
        )
        msg = r.json().get("error", {}).get("message", "")
        import re

        achado = re.search(r"project (\d{6,})", msg)
        return achado.group(1) if achado else "nao identificado"
    except Exception as exc:
        return f"falha ao consultar ({exc})"


def checar_places() -> None:
    titulo("Google Places (motor de leads)")
    chave = settings.GOOGLE_MAPS_API_KEY
    if not chave:
        print(f"{ERRO}GOOGLE_MAPS_API_KEY nao esta definida. A busca nao funciona.")
        return

    print(f"{OK}chave presente: {impressao_digital(chave)}")
    print(f"{OK}projeto dono: {projeto_dono_da_chave(chave)}")

    from app.leads_engine import FIELD_MASK

    r = httpx.post(
        "https://places.googleapis.com/v1/places:searchText",
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": chave,
            "X-Goog-FieldMask": FIELD_MASK,
        },
        json={"textQuery": "padaria Botucatu", "languageCode": "pt-BR",
              "regionCode": "BR", "pageSize": 1},
        timeout=30,
    )

    if r.status_code != 200:
        bruta = r.json().get("error", {}).get("message", "")
        if "quota" in bruta.lower():
            print(f"{ERRO}cota diaria esgotada. Zera sozinha; o teto fica em")
            print("         console.cloud.google.com/apis/api/places.googleapis.com/quotas")
        else:
            print(f"{ERRO}Places recusou ({r.status_code}): {bruta[:180]}")
        return

    lugares = r.json().get("places", [])
    print(f"{OK}busca respondendo ({len(lugares)} resultado)")
    if not lugares:
        return

    lugar = lugares[0]
    # Os campos caros do FieldMask (tier Enterprise). Se sumirem, e sinal
    # de que a conta perdeu direito a eles.
    for campo, rotulo in [
        ("nationalPhoneNumber", "telefone"),
        ("websiteUri", "site"),
        ("rating", "nota"),
        ("regularOpeningHours", "horario"),
    ]:
        marca = OK if campo in lugar else AVISO
        print(f"{marca}campo {rotulo}: {'vem' if campo in lugar else 'NAO vem'}")

    fotos = lugar.get("photos") or []
    if fotos:
        print(f"{OK}fotos: {len(fotos)} disponivel(is) — avatar real do lead")
    else:
        print(f"{AVISO}fotos: nao vem. O lead fica com avatar generico.")


def checar_gemini() -> None:
    titulo("Gemini (textos da IA)")
    chave = settings.GEMINI_API_KEY
    if not chave:
        print(f"{ERRO}GEMINI_API_KEY nao esta definida. Pitch e copy nao funcionam.")
        return
    print(f"{OK}chave presente: {impressao_digital(chave)}")

    from app.ai_generator import MODEL_CHAIN

    for modelo in MODEL_CHAIN:
        try:
            r = httpx.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{modelo}:generateContent",
                params={"key": chave},
                json={"contents": [{"parts": [{"text": "responda apenas: ok"}]}]},
                timeout=45,
            )
            if r.status_code == 200:
                print(f"{OK}{modelo}: responde")
            else:
                motivo = r.json().get("error", {}).get("message", "")[:90]
                print(f"{AVISO}{modelo}: {r.status_code} — {motivo}")
        except Exception as exc:
            print(f"{AVISO}{modelo}: falhou ({type(exc).__name__})")


def checar_firestore() -> None:
    titulo("Firestore (creditos, perfis, sites)")
    if firestore_db is None:
        print(f"{ERRO}sem Firestore.")
        if settings.CREDITO_SEM_BANCO:
            print(f"{AVISO}LEADSAGE_CREDITO_SEM_BANCO=1: credito liberado (so para dev).")
        else:
            print(f"{OK}credito recusa em vez de liberar — correto para producao.")
        return
    print(f"{OK}conectado")
    if settings.CREDITO_SEM_BANCO:
        print(f"{AVISO}LEADSAGE_CREDITO_SEM_BANCO=1 esta ligado. NUNCA em producao:")
        print("         com essa variavel, se o banco cair todo mundo busca de graca.")


def checar_pagamento() -> None:
    titulo("Pagamento (Mercado Pago)")
    if not settings.PAYMENT_PROVIDER:
        print(f"{AVISO}PAYMENT_PROVIDER vazio: ninguem consegue comprar.")
        print("         Voce paga o Google por cada busca e nao recebe de volta.")
        return
    print(f"{OK}provedor: {settings.PAYMENT_PROVIDER}")
    for nome, valor in [
        ("MERCADOPAGO_TOKEN", settings.MERCADOPAGO_TOKEN),
        ("PAYMENT_WEBHOOK_SECRET", settings.PAYMENT_WEBHOOK_SECRET),
    ]:
        print(f"{OK if valor else ERRO}{nome}: {'definido' if valor else 'FALTANDO'}")


def checar_admin() -> None:
    titulo("Administradores")
    if not settings.admin_emails:
        print(f"{AVISO}ADMIN_EMAILS vazio: nem voce tem credito ilimitado.")
        return
    for email in sorted(settings.admin_emails):
        print(f"{OK}{email}")


def main() -> None:
    print("=" * 62)
    print("  LeadSage — diagnostico das dependencias externas")
    print("=" * 62)
    checar_places()
    checar_gemini()
    checar_firestore()
    checar_pagamento()
    checar_admin()
    print("\n" + "=" * 62)


if __name__ == "__main__":
    main()
