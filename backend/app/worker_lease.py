"""Quem está com o WhatsApp de cada usuário: uma "concessão" (lease) com prazo, no banco SQL.

Vários serviços da nuvem (em hospedagens gratuitas diferentes) podem rodar ao mesmo tempo. O WhatsApp só aceita uma conexão
por número, então só um deles atende cada usuário. Quem pega a concessão renova a cada poucos segundos; se o serviço cai ou a
hospedagem sai do ar, a concessão vence e outro serviço assume sozinho. Sem isso, dois serviços brigavam pelo mesmo número
(erro 440, "conflict") e a conexão ficava caindo.
"""
import time
from typing import Any, Dict

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.database import AsyncSessionLocal, DBRobo

TTL_PADRAO_S = 120
TTL_MAXIMO_S = 600


def _chave(uid: str) -> str:
    return f"lease:{uid}"


def endereco_valido(url: str) -> str:
    """O endereço público do serviço (https) ou vazio: é para onde o navegador vai falar direto com o WhatsApp de quem atende."""
    u = (url or "").strip().rstrip("/")
    return u[:200] if u.startswith("https://") and " " not in u else ""


async def tomar(uid: str, quem: str, ttl_s: int = TTL_PADRAO_S, agora: float = 0.0, url: str = "") -> Dict[str, Any]:
    """Pega (ou renova) a concessão deste usuário. {"ok": True} quando é de `quem`; senão, de quem é e por quanto tempo.

    `url`: o endereço público de quem atende (guardado junto): a tela fala direto com o serviço que está de fato com o número."""
    agora = agora or time.time()
    ttl = max(15, min(int(ttl_s or TTL_PADRAO_S), TTL_MAXIMO_S))
    novo = {"holder": quem, "ate": agora + ttl, "url": endereco_valido(url)}
    async with AsyncSessionLocal() as s:
        linha = (await s.execute(select(DBRobo).where(DBRobo.chave == _chave(uid)).with_for_update())).scalar_one_or_none()
        if linha is None:
            s.add(DBRobo(chave=_chave(uid), uid=uid, tipo="lease", data=novo, atualizado=str(int(agora))))
            try:
                await s.commit()
            except IntegrityError:  # outro serviço pegou no mesmo instante
                await s.rollback()
                return {"ok": False, "motivo": "outro servico acabou de assumir"}
            return {"ok": True, "ate_s": ttl}
        atual = dict(linha.data or {})
        if atual.get("holder") == quem or float(atual.get("ate") or 0) <= agora:
            linha.data = novo
            linha.atualizado = str(int(agora))
            await s.commit()
            return {"ok": True, "ate_s": ttl}
        return {"ok": False, "holder": atual.get("holder", ""), "ate_s": max(0, int(float(atual.get("ate") or 0) - agora))}


async def endereco_de_quem_atende(uid: str, agora: float = 0.0) -> str:
    """O endereço do serviço que tem a concessão agora (vazio: ninguém atende, ou o serviço não informou o endereço)."""
    agora = agora or time.time()
    try:
        async with AsyncSessionLocal() as s:
            linha = (await s.execute(select(DBRobo).where(DBRobo.chave == _chave(uid)))).scalar_one_or_none()
    except Exception:
        return ""
    d = dict(linha.data or {}) if linha else {}
    return endereco_valido(d.get("url", "")) if d.get("holder") and float(d.get("ate") or 0) > agora else ""


async def liberar(uid: str, quem: str, agora: float = 0.0) -> bool:
    """Devolve a concessão (o serviço está desligando): o outro assume sem esperar o prazo vencer."""
    agora = agora or time.time()
    async with AsyncSessionLocal() as s:
        linha = (await s.execute(select(DBRobo).where(DBRobo.chave == _chave(uid)).with_for_update())).scalar_one_or_none()
        if linha is None or (linha.data or {}).get("holder") != quem:
            return False
        linha.data = {"holder": "", "ate": 0, "url": ""}
        linha.atualizado = str(int(agora))
        await s.commit()
        return True
