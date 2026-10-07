"""Telegram: o robô atende no bot do próprio usuário.

O Telegram é o canal mais simples dos quatro, e totalmente oficial: o usuário
cria um bot no @BotFather, cola o token, e pronto. Duas regras dele:

- o bot só responde a quem falou com ele primeiro (apertou "Iniciar" ou
  mandou mensagem). Não existe mensagem fria por bot; por isso o canal é
  de atendimento, e o convite é um link `t.me/<bot>` que o usuário põe no
  site, no e-mail ou no cartão;
- o webhook é autenticado por um segredo que nós definimos ao cadastrá-lo
  (`secret_token`) e que o Telegram devolve em cada chamada. Sem ele, qualquer
  pessoa que descobrisse a URL poderia forjar conversas.
"""
import hmac
import re
import secrets
from typing import Any, Dict, List

import httpx

from app.meta_canais import EnvioFalhou, Recebida

API = "https://api.telegram.org"
TOKEN_RE = re.compile(r"^\d{6,12}:[A-Za-z0-9_-]{30,50}$")
SEGREDOS_TELEGRAM = ("tg_token", "tg_secret")
CAMPOS_TELEGRAM = ("tg_token", "tg_secret", "tg_username", "tg_bot_id")


class TelegramRecusou(Exception):
    pass


async def _chamar(token: str, metodo: str, payload: Dict[str, Any] | None = None) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=15.0) as c:
            r = await c.post(f"{API}/bot{token}/{metodo}", json=payload or {})
    except Exception as exc:
        raise TelegramRecusou(f"Não foi possível falar com o Telegram: {type(exc).__name__}")
    dados = r.json() if r.content else {}
    if not dados.get("ok"):
        raise TelegramRecusou(dados.get("description") or f"erro {r.status_code}")
    return dados.get("result") or {}


def token_valido(token: str) -> bool:
    return bool(TOKEN_RE.match((token or "").strip()))


async def conectar(canal: Dict[str, Any], token: str, url_base: str) -> Dict[str, Any]:
    """Valida o token, cadastra o webhook e devolve o canal atualizado (sem gravar)."""
    token = (token or "").strip()
    if not token_valido(token):
        raise TelegramRecusou("Esse token não parece de um bot do Telegram. Copie-o inteiro do @BotFather.")

    bot = await _chamar(token, "getMe")
    if not bot.get("is_bot"):
        raise TelegramRecusou("O token não é de um bot.")

    segredo = secrets.token_urlsafe(24)
    await _chamar(token, "setWebhook", {
        "url": f"{url_base}/api/robo/telegram/{canal['gancho']}",
        "secret_token": segredo,
        "allowed_updates": ["message"],
        "drop_pending_updates": True,
    })
    canal.update({
        "tg_token": token,
        "tg_secret": segredo,
        "tg_username": bot.get("username", ""),
        "tg_bot_id": str(bot.get("id", "")),
    })
    return canal


async def desconectar(canal: Dict[str, Any]) -> Dict[str, Any]:
    """Tira o webhook do Telegram e apaga o que guardamos do bot."""
    if canal.get("tg_token"):
        try:
            await _chamar(canal["tg_token"], "deleteWebhook", {"drop_pending_updates": True})
        except TelegramRecusou as exc:
            print(f"Telegram: não removeu o webhook: {exc}")
    for campo in CAMPOS_TELEGRAM:
        canal.pop(campo, None)
    return canal


def segredo_confere(canal: Dict[str, Any], cabecalho: str) -> bool:
    """Falha fechado: sem segredo guardado ou sem cabeçalho, é não."""
    esperado = canal.get("tg_secret") or ""
    return bool(esperado) and bool(cabecalho) and hmac.compare_digest(esperado, cabecalho)


# --------------------------------------------------------------- leitura

def _rotulo_de_midia(msg: Dict[str, Any]) -> str:
    for chave, rotulo in (
        ("photo", "[imagem]"), ("voice", "[áudio]"), ("audio", "[áudio]"), ("video", "[vídeo]"),
        ("video_note", "[vídeo]"), ("document", "[documento]"), ("sticker", "[figurinha]"),
        ("location", "[localização]"), ("contact", "[contato]"),
    ):
        if msg.get(chave):
            return rotulo
    return "[mensagem]"


def ler_update(corpo: Dict[str, Any]) -> List[Recebida]:
    """A mensagem de uma conversa privada, ou nada.

    Ficam de fora: grupos e canais (o robô atende conversa individual), outros
    bots (evita dois robôs conversando entre si) e tudo que não é mensagem
    nova (edições, enquetes, entrada em grupo).
    """
    msg = corpo.get("message") or {}
    chat = msg.get("chat") or {}
    remetente = msg.get("from") or {}
    if not msg or chat.get("type") != "private" or remetente.get("is_bot"):
        return []

    texto = (msg.get("text") or msg.get("caption") or "").strip()
    if texto.startswith("/start"):
        # "Iniciar" não é uma pergunta: vira um cumprimento para o robô abrir a conversa
        texto = "Oi"
    if not texto:
        texto = _rotulo_de_midia(msg)

    nome = " ".join(p for p in (remetente.get("first_name"), remetente.get("last_name")) if p).strip()
    if not chat.get("id") or corpo.get("update_id") is None:
        return []
    return [Recebida(
        canal="telegram",
        contato=str(chat["id"]),
        nome=nome,
        texto=texto,
        meta_id=f"tg{corpo['update_id']}",
        momento=int(msg.get("date") or 0),
    )]


# ----------------------------------------------------------------- envio

ERROS_TELEGRAM = {
    "bot was blocked by the user": "A pessoa bloqueou o bot.",
    "chat not found": "Essa conversa não existe mais no Telegram.",
    "user is deactivated": "A conta dessa pessoa foi desativada.",
    "Unauthorized": "O token do bot foi revogado. Gere um novo no @BotFather.",
}


async def enviar(contato: str, texto: str, cfg: Dict[str, Any]) -> str:
    token = cfg.get("tg_token")
    if not token:
        raise EnvioFalhou("Telegram não conectado.")
    try:
        resultado = await _chamar(token, "sendMessage", {"chat_id": contato, "text": texto[:4096]})
    except TelegramRecusou as exc:
        motivo = str(exc)
        raise EnvioFalhou(next((v for k, v in ERROS_TELEGRAM.items() if k.lower() in motivo.lower()), motivo))
    return str(resultado.get("message_id", ""))
