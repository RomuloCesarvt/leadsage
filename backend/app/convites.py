"""Convites de teste: libera a uma pessoa (pelo e-mail) um período de teste completo, com saldo próprio, sem cobrar nada.

O convite vale quando a pessoa entra: se a conta ainda não existe, ele é aplicado no primeiro acesso. Aplica uma vez só (marca no banco).
O que o convite faz: libera só o modo indicado (empresa ou agência), dá o plano completo por alguns dias (robô, buscas, disparos, tudo) e
põe os créditos na carteira DAQUELE modo. Passados os dias, a conta volta para a Prévia sozinha (a validade da licença), sem apagar nada.
"""
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from app import espaco, robo_store

CONVITES: Dict[str, Dict[str, Any]] = {
    "vizarbtu@gmail.com": {"modo": "empresa", "creditos": 20, "plano": "m_escala", "dias": 30,
                           # créditos extras, cada um aplicado uma única vez (pelo "id") na carteira do modo, mesmo que o convite já tenha sido usado
                           "bonus": [{"id": "2026-11-11-mais-20", "creditos": 20}]},
}


def _todos() -> Dict[str, Dict[str, Any]]:
    """Os convites do código mais os do ambiente (CONVITES_TESTE='{"a@b.com": {"modo": "empresa", "creditos": 20}}')."""
    extra: Dict[str, Any] = {}
    try:
        extra = json.loads(os.getenv("CONVITES_TESTE", "") or "{}")
    except ValueError:
        extra = {}
    return {**CONVITES, **{str(k).strip().lower(): v for k, v in extra.items() if isinstance(v, dict)}}


def convite_de(email: Optional[str]) -> Optional[Dict[str, Any]]:
    return _todos().get((email or "").strip().lower())


async def aplicar(uid: str, email: Optional[str]) -> bool:
    """Aplica o convite deste e-mail à conta, uma vez. Devolve True se aplicou agora."""
    c = convite_de(email)
    if not c or not uid:
        return False
    uid = espaco.conta(uid)
    chave = f"convite:{uid}"
    if await robo_store._sql_get(chave):
        await _aplicar_bonus(uid, email, c)
        return False
    # marca ANTES de aplicar: se algo falhar no meio, o convite não credita duas vezes (o erro aparece no log)
    await robo_store._sql_put(chave, uid, "sistema", {"email": (email or "").lower(), "em": datetime.now(timezone.utc).isoformat(timespec="seconds")})

    from app import credit_system, payments, profile_store

    modo = c.get("modo") if c.get("modo") in profile_store.MODOS else "empresa"
    await profile_store.liberar_modos(uid, [modo])
    await profile_store.save_profile(uid, {"modo": modo})
    carteira = espaco.do_modo(uid, modo)
    if int(c.get("creditos") or 0) > 0:
        await credit_system.add_credits(carteira, int(c["creditos"]), f"Convite de teste ({modo})")
    plano = payments.achar_plano_mensal(c.get("plano") or "m_escala") or payments.PLANOS_MENSAIS[-1]
    ate = (datetime.now(timezone.utc) + timedelta(days=int(c.get("dias") or 30))).isoformat(timespec="seconds")
    await profile_store.conceder_plano(uid, f"{plano['nome']} (convite de teste)", int(plano.get("sites") or 0), plano["id"], {
        "licenca_ate": ate, "assinatura_status": "convite", "assinatura_plano": plano["id"],
    })
    await _aplicar_bonus(uid, email, c)
    print(f"Convite aplicado: {email} -> {modo}, {c.get('creditos')} créditos, plano {plano['id']} até {ate}")
    return True


async def _aplicar_bonus(uid: str, email: Optional[str], c: Dict[str, Any]) -> None:
    """Créditos extras do convite: cada bônus (pelo id) entra uma vez só, marcado antes de creditar para nunca somar duas vezes."""
    from app import credit_system, profile_store

    modo = c.get("modo") if c.get("modo") in profile_store.MODOS else "empresa"
    for b in c.get("bonus") or []:
        bid, qtd = str((b or {}).get("id") or "").strip(), int((b or {}).get("creditos") or 0)
        if not bid or qtd <= 0:
            continue
        chave = f"convite-bonus:{uid}:{bid}"
        if await robo_store._sql_get(chave):
            continue
        await robo_store._sql_put(chave, uid, "sistema", {"email": (email or "").lower(), "creditos": qtd, "em": datetime.now(timezone.utc).isoformat(timespec="seconds")})
        await credit_system.add_credits(espaco.do_modo(uid, modo), qtd, f"Créditos extras do convite ({modo})")
        print(f"Bônus do convite aplicado: {email} -> {modo}, +{qtd} créditos ({bid})")
