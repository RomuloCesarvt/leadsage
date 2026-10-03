"""Conectar com um clique: o cliente entra com o Facebook e pronto.

No modo manual, cada cliente criava o proprio app na Meta e colava
chaves — ninguem faz isso. Aqui existe um app so, o do LeadSage, e o
cliente apenas autoriza: escolhe a pagina (que traz junto o Instagram
ligado a ela) e, no WhatsApp, passa pelo cadastro guiado da propria Meta
(Embedded Signup). E como o ManyChat funciona.

Dois cuidados que nao sao opcionais:

- o `state` do OAuth e assinado e expira. Sem isso, um atacante poderia
  completar o login com a conta dele no navegador da vitima e fazer o
  robo da vitima responder pela pagina do atacante (CSRF de login);
- tokens nunca vao para a tela. A lista de paginas que o cliente ve tem
  so nome e id; o token de cada pagina fica no servidor ate a escolha.
"""
import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx

from app.config import settings

VERSAO = "v21.0"
GRAPH = f"https://graph.facebook.com/{VERSAO}"

ESCOPOS_PAGINA = (
    "pages_show_list",
    "pages_messaging",
    "pages_manage_metadata",
    "instagram_basic",
    "instagram_manage_messages",
    "business_management",
)

VALIDADE_STATE = 15 * 60


class MetaRecusou(Exception):
    pass


def disponivel() -> Dict[str, bool]:
    """O que o app do LeadSage ja permite. Sem app, so o modo manual."""
    base = bool(settings.META_APP_ID and settings.META_APP_SECRET)
    return {
        "facebook": base,
        "whatsapp": base and bool(settings.META_WA_CONFIG_ID),
    }


def redirect_uri() -> str:
    return f"{settings.APP_URL}/api/robo/meta/retorno"


# ---------------------------------------------------------------- state

def _assinar(texto: str) -> str:
    return hmac.new(settings.META_APP_SECRET.encode(), texto.encode(), hashlib.sha256).hexdigest()[:32]


def criar_state(uid: str, agora: Optional[float] = None) -> str:
    corpo = json.dumps({"u": uid, "e": int((agora or time.time()) + VALIDADE_STATE),
                        "n": secrets.token_hex(6)}, separators=(",", ":"))
    b64 = base64.urlsafe_b64encode(corpo.encode()).decode().rstrip("=")
    return f"{b64}.{_assinar(b64)}"


def ler_state(state: str, agora: Optional[float] = None) -> str:
    """Devolve o uid de quem iniciou o login, ou levanta MetaRecusou."""
    try:
        b64, assinatura = state.rsplit(".", 1)
    except (ValueError, AttributeError):
        raise MetaRecusou("Retorno do Facebook inválido.")
    if not hmac.compare_digest(_assinar(b64), assinatura):
        raise MetaRecusou("Retorno do Facebook com assinatura inválida.")
    try:
        dados = json.loads(base64.urlsafe_b64decode(b64 + "=" * (-len(b64) % 4)))
    except Exception:
        raise MetaRecusou("Retorno do Facebook inválido.")
    if dados.get("e", 0) < (agora or time.time()):
        raise MetaRecusou("O login com o Facebook expirou. Tente conectar de novo.")
    return str(dados.get("u") or "")


def url_de_login(uid: str) -> str:
    return "https://www.facebook.com/{}/dialog/oauth?{}".format(VERSAO, urlencode({
        "client_id": settings.META_APP_ID,
        "redirect_uri": redirect_uri(),
        "state": criar_state(uid),
        "scope": ",".join(ESCOPOS_PAGINA),
        "response_type": "code",
    }))


# ---------------------------------------------------------------- graph

async def graph(metodo: str, caminho: str, **kwargs) -> Dict[str, Any]:
    """Uma chamada a Graph API. Erro da Meta vira MetaRecusou em portugues."""
    try:
        async with httpx.AsyncClient(timeout=20.0) as cliente:
            r = await cliente.request(metodo, f"{GRAPH}/{caminho.lstrip('/')}", **kwargs)
    except Exception as exc:
        raise MetaRecusou(f"Não foi possível falar com a Meta ({type(exc).__name__}).")
    dados = r.json() if r.content else {}
    if r.status_code >= 400:
        erro = dados.get("error") or {}
        raise MetaRecusou(erro.get("error_user_msg") or erro.get("message") or f"erro {r.status_code}")
    return dados


async def trocar_codigo(code: str, com_redirect: bool = True) -> str:
    """Code -> token de usuario de longa duracao.

    O token curto dura uma hora. Os tokens de pagina derivados de um token
    de longa duracao nao expiram — sem a troca, o robo pararia sozinho no
    dia seguinte.
    """
    params = {
        "client_id": settings.META_APP_ID,
        "client_secret": settings.META_APP_SECRET,
        "code": code,
    }
    if com_redirect:
        params["redirect_uri"] = redirect_uri()
    curto = (await graph("GET", "oauth/access_token", params=params)).get("access_token")
    if not curto:
        raise MetaRecusou("A Meta não devolveu o acesso.")
    longo = await graph("GET", "oauth/access_token", params={
        "grant_type": "fb_exchange_token",
        "client_id": settings.META_APP_ID,
        "client_secret": settings.META_APP_SECRET,
        "fb_exchange_token": curto,
    })
    return longo.get("access_token") or curto


async def listar_paginas(token_usuario: str) -> List[Dict[str, Any]]:
    dados = await graph("GET", "me/accounts", params={
        "fields": "id,name,access_token,instagram_business_account{id,username}",
        "limit": 100,
        "access_token": token_usuario,
    })
    paginas = []
    for p in dados.get("data") or []:
        ig = p.get("instagram_business_account") or {}
        paginas.append({
            "id": p.get("id", ""),
            "nome": p.get("name", ""),
            "token": p.get("access_token", ""),
            "ig_id": ig.get("id", ""),
            "ig_usuario": ig.get("username", ""),
        })
    return [p for p in paginas if p["id"] and p["token"]]


async def assinar_pagina(page_id: str, page_token: str) -> None:
    """Liga a pagina ao webhook do app. Sem isso, nenhuma mensagem chega."""
    await graph("POST", f"{page_id}/subscribed_apps", params={
        "subscribed_fields": "messages,messaging_postbacks",
        "access_token": page_token,
    })


async def desassinar_pagina(page_id: str, page_token: str) -> None:
    try:
        await graph("DELETE", f"{page_id}/subscribed_apps", params={"access_token": page_token})
    except MetaRecusou:
        pass  # token ja revogado: nada a desfazer do nosso lado


async def concluir_whatsapp(code: str, waba_id: str, phone_number_id: str) -> Dict[str, str]:
    """Fecha o cadastro guiado do WhatsApp.

    O Embedded Signup devolve o code e, por mensagem da janela, os ids da
    conta (WABA) e do numero. Falta: trocar o code por token, inscrever o
    app na conta para receber mensagens e registrar o numero na Cloud API
    com um PIN de dois fatores — que precisa ser guardado, porque a Meta
    o pede de novo se o numero for registrado outra vez.
    """
    token = await trocar_codigo(code, com_redirect=False)
    auth = {"Authorization": f"Bearer {token}"}
    await graph("POST", f"{waba_id}/subscribed_apps", headers=auth)
    pin = f"{secrets.randbelow(10**6):06d}"
    try:
        await graph("POST", f"{phone_number_id}/register", headers=auth,
                    json={"messaging_product": "whatsapp", "pin": pin})
    except MetaRecusou as exc:
        # numero ja registrado antes (reconexao): segue com o que existe
        if "already" not in str(exc).lower() and "registrad" not in str(exc).lower():
            raise
        pin = ""
    return {"wa_token": token, "wa_phone_id": phone_number_id, "waba_id": waba_id, "wa_pin": pin}
