"""O criativo do dono: um flyer, card ou PDF de promoção que o robô manda junto com a mensagem.

Um por espaço de trabalho (a agência e a empresa têm o seu). Guardado na base do robô; o arquivo sai por um endereço público
com um código impossível de adivinhar (o WhatsApp e a Meta precisam buscar a imagem por um link). Usos, ligados pelo dono:
  - promocao:  vai junto com o aviso da promoção (depois de o lead gostar da prévia ou, no modo empresa, de pedir valores);
  - abordagem: vai junto com a primeira mensagem do WhatsApp (pelo Conector).
"""
import base64
import binascii
import secrets
from typing import Any, Dict, Optional

from app import robo_store
from app.config import settings

TIPOS = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf"}
MAX_BYTES = 3_000_000


def _chave(uid: str) -> str:
    return f"criativo:{uid}"


def _chave_token(token: str) -> str:
    return f"criativo-token:{token}"


def url_publica(c: Dict[str, Any]) -> str:
    return f"{settings.APP_URL.rstrip('/')}/api/criativo/{c['token']}"


def midia(c: Optional[Dict[str, Any]]) -> Optional[Dict[str, str]]:
    """O que o canal precisa para mandar o arquivo."""
    if not c:
        return None
    return {"url": url_publica(c), "mime": c["mime"], "nome": c.get("nome") or f"criativo.{TIPOS.get(c['mime'], 'bin')}"}


def publico(c: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """O que a tela vê (sem o arquivo)."""
    if not c:
        return {"existe": False}
    return {"existe": True, "nome": c.get("nome", ""), "mime": c["mime"], "bytes": c.get("bytes", 0), "url": url_publica(c),
            "legenda": c.get("legenda", ""), "usos": c.get("usos") or {}}


async def obter(uid: str) -> Optional[Dict[str, Any]]:
    return await robo_store._sql_get(_chave(uid))


async def salvar(uid: str, nome: str, mime: str, dados_b64: str, legenda: str = "", usos: Optional[Dict[str, bool]] = None) -> Dict[str, Any]:
    if mime not in TIPOS:
        raise ValueError("Use uma imagem (JPG, PNG, WEBP) ou um PDF.")
    try:
        bruto = base64.b64decode(dados_b64.split(",", 1)[-1], validate=False)
    except (binascii.Error, ValueError):
        raise ValueError("Arquivo inválido.")
    if not bruto:
        raise ValueError("Arquivo vazio.")
    if len(bruto) > MAX_BYTES:
        raise ValueError("Arquivo grande demais (máximo 3 MB).")
    antigo = await obter(uid)
    if antigo:
        await robo_store._sql_put(_chave_token(antigo["token"]), uid, "criativo-token", {"uid": ""})
    token = secrets.token_urlsafe(18)
    c = {"token": token, "nome": (nome or "criativo")[:80], "mime": mime, "bytes": len(bruto), "b64": base64.b64encode(bruto).decode(),
         "legenda": (legenda or "")[:600], "usos": {"promocao": True, "abordagem": False, **{k: bool(v) for k, v in (usos or {}).items()}}}
    await robo_store._sql_put(_chave(uid), uid, "criativo", c)
    await robo_store._sql_put(_chave_token(token), uid, "criativo-token", {"uid": uid})
    return c


async def atualizar_opcoes(uid: str, legenda: Optional[str], usos: Optional[Dict[str, bool]]) -> Optional[Dict[str, Any]]:
    c = await obter(uid)
    if not c:
        return None
    if legenda is not None:
        c["legenda"] = legenda[:600]
    if usos:
        c["usos"] = {**(c.get("usos") or {}), **{k: bool(v) for k, v in usos.items() if k in ("promocao", "abordagem")}}
    await robo_store._sql_put(_chave(uid), uid, "criativo", c)
    return c


async def remover(uid: str) -> None:
    c = await obter(uid)
    if c:
        await robo_store._sql_put(_chave_token(c["token"]), uid, "criativo-token", {"uid": ""})
    await robo_store._sql_put(_chave(uid), uid, "criativo", {})


async def arquivo_por_token(token: str) -> Optional[tuple]:
    """(bytes, mime, nome) do criativo, ou None."""
    ref = await robo_store._sql_get(_chave_token(token))
    uid = (ref or {}).get("uid")
    if not uid:
        return None
    c = await obter(uid)
    if not c or c.get("token") != token or not c.get("b64"):
        return None
    return base64.b64decode(c["b64"]), c["mime"], c.get("nome", "criativo")


async def para_promocao(uid: str) -> Optional[Dict[str, str]]:
    c = await obter(uid)
    return midia(c) if c and c.get("b64") and (c.get("usos") or {}).get("promocao") else None


async def para_abordagem(uid: str) -> Optional[Dict[str, str]]:
    c = await obter(uid)
    return midia(c) if c and c.get("b64") and (c.get("usos") or {}).get("abordagem") else None
