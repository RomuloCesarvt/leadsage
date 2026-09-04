"""Envio das mensagens de abordagem.

O dispatcher antigo devolvia sucesso para tudo. Instagram, LinkedIn e
webhook retornavam "Enviado via ... (Simulado)" sem enviar nada, e uma
falha de SMTP virava a string "Erro no Envio: ..." num retorno 200 — que
a interface tratava como sucesso, com confete e 2 creditos cobrados.

Agora cada canal diz a verdade em `delivered`. Quem nao tem API de envio
(WhatsApp, Instagram, LinkedIn) devolve `action_url`: o link pronto para
o usuario concluir o contato, sem fingir que a plataforma foi acionada.
"""
import ipaddress
import re
import socket
import uuid
from datetime import datetime
from email.message import EmailMessage
from typing import Any, Dict, Optional, Tuple
from urllib.parse import quote, urlparse

import aiosmtplib
import httpx

from app.config import settings
from app.models import DispatchRequest, DispatchResponse

DISPATCH_COST = 2

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$")

# Canais sem API de envio automatico. Geram link para o usuario concluir.
#
# Instagram e LinkedIn ficam aqui por limitacao das plataformas, nao por
# falta de implementacao: a Instagram Messaging API so permite responder
# quem escreveu nas ultimas 24h, e o LinkedIn nao tem API publica de
# mensagens. Automatizar por fora dos Termos derruba a conta do usuario.
#
# "whatsapp" e o modo link (gratuito, sem risco). "whatsapp_api" envia de
# verdade pela Cloud API oficial da Meta.
MANUAL_CHANNELS = ("whatsapp", "instagram_direct", "linkedin_msg")


class DispatchError(Exception):
    """Falha real de envio. Vira 4xx/5xx e nao consome creditos."""


def _profile_url(raw: str, base: str) -> str:
    if not raw:
        return ""
    if raw.startswith(("http://", "https://")):
        return raw
    return f"{base}{raw.lstrip('@/')}"


def _whatsapp_link(phone: str, message: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if not digits:
        raise DispatchError("Este lead não tem telefone para WhatsApp.")
    return f"https://wa.me/{digits}?text={quote(message[:1500])}"


async def _send_email(req: DispatchRequest, config: Dict[str, Any]) -> str:
    recipient = (req.lead_email or "").strip()
    if not recipient:
        raise DispatchError("Este lead não tem e-mail. Use WhatsApp ou Instagram.")
    if not EMAIL_RE.match(recipient):
        raise DispatchError(f"E-mail inválido: {recipient}")

    host = config.get("smtp_host") or settings.SMTP_HOST
    port = int(config.get("smtp_port") or settings.SMTP_PORT or 587)
    user = config.get("smtp_user") or settings.SMTP_USER
    password = config.get("smtp_password") or settings.SMTP_PASS
    sender = config.get("from_email") or settings.FROM_EMAIL or user

    if not (user and password):
        raise DispatchError(
            "SMTP não configurado. Abra Integrações e informe host, usuário e senha de app."
        )

    message = EmailMessage()
    message["From"] = sender
    message["To"] = recipient
    message["Subject"] = req.subject or "Contato"
    message.set_content(req.body)

    try:
        await aiosmtplib.send(
            message,
            hostname=host,
            port=port,
            start_tls=port == 587,
            use_tls=port == 465,
            username=user,
            password=password,
            timeout=20,
        )
    except aiosmtplib.SMTPAuthenticationError:
        raise DispatchError(
            "O servidor recusou as credenciais. No Gmail é preciso usar uma Senha de App."
        )
    except Exception as exc:
        raise DispatchError(f"Falha no envio SMTP: {exc}")

    return f"Enviado para {recipient}"


GRAPH_VERSAO = "v21.0"

# Os códigos que a Meta devolve são numéricos e a mensagem vem em inglês.
# Traduzir importa: quase todos significam "a política foi violada" ou
# "a janela de 24h fechou", e o usuário precisa saber qual é.
ERROS_WHATSAPP = {
    131047: (
        "A conversa está fora da janela de 24 horas. Para falar com quem não te "
        "respondeu recentemente, é preciso usar um template aprovado pela Meta."
    ),
    131026: (
        "A Meta não conseguiu entregar: o número pode não ter WhatsApp ou não "
        "aceitar mensagens de empresas."
    ),
    131051: "Tipo de mensagem não suportado por este número.",
    132000: "O template existe, mas o número de variáveis enviadas não bate com o aprovado.",
    132001: "Template não encontrado. Confira o nome e o idioma cadastrados na Meta.",
    132007: "O template foi rejeitado pela Meta e não pode ser enviado.",
    190: "O token de acesso expirou ou foi revogado. Gere um novo no painel da Meta.",
    10: "Sua conta não tem permissão para enviar por este número.",
    100: "Parâmetro inválido na chamada à Meta. Confira o Phone Number ID.",
    80007: "Limite de envio atingido. A Meta libera conforme sua conta ganha reputação.",
    131056: "Muitas mensagens para o mesmo número em pouco tempo.",
}


async def _enviar_whatsapp_api(req: DispatchRequest, config: Dict[str, Any]) -> str:
    """Envia de verdade pela WhatsApp Cloud API (Meta).

    Duas formas de mensagem, e a diferença é regra da Meta, não nossa:

    - texto livre: só chega se a pessoa te escreveu nas últimas 24h
    - template aprovado: única forma de iniciar conversa

    Mandar para quem nunca pediu contato viola a política de mensagens da
    Meta e leva o número ao banimento, então o erro correspondente é
    devolvido em português, sem tentar contornar.
    """
    token = (config.get("wa_token") or "").strip()
    phone_id = (config.get("wa_phone_id") or "").strip()

    if not (token and phone_id):
        raise DispatchError(
            "WhatsApp não configurado. Abra Integrações e informe o Token e o "
            "Phone Number ID da sua conta Meta Business."
        )

    destino = re.sub(r"\D", "", req.lead_phone or "")
    if not destino:
        raise DispatchError("Este lead não tem telefone.")
    if len(destino) < 12:
        raise DispatchError(f"Telefone incompleto para envio internacional: {destino}")

    if req.use_template:
        nome_template = (config.get("wa_template") or "").strip()
        if not nome_template:
            raise DispatchError(
                "Nenhum template configurado. Cadastre um na Meta e informe o nome em Integrações."
            )
        payload: Dict[str, Any] = {
            "messaging_product": "whatsapp",
            "to": destino,
            "type": "template",
            "template": {
                "name": nome_template,
                "language": {"code": config.get("wa_language") or "pt_BR"},
            },
        }
    else:
        payload = {
            "messaging_product": "whatsapp",
            "to": destino,
            "type": "text",
            "text": {"preview_url": False, "body": req.body[:4096]},
        }

    url = f"https://graph.facebook.com/{GRAPH_VERSAO}/{phone_id}/messages"
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                url, headers={"Authorization": f"Bearer {token}"}, json=payload
            )
    except Exception as exc:
        raise DispatchError(f"Não foi possível falar com a Meta: {exc}")

    dados = resp.json() if resp.content else {}

    if resp.status_code >= 400:
        erro = dados.get("error", {}) or {}
        codigo = erro.get("code")
        detalhe = ERROS_WHATSAPP.get(codigo)
        if not detalhe:
            detalhe = erro.get("error_user_msg") or erro.get("message") or "erro desconhecido"
        raise DispatchError(f"WhatsApp: {detalhe}")

    contatos = dados.get("messages") or []
    identificador = contatos[0].get("id", "") if contatos else ""
    return f"Enviado pelo WhatsApp para +{destino}" + (f" ({identificador[:18]}…)" if identificador else "")


def _validar_destino_webhook(url: str) -> None:
    """Impede que o webhook aponte para a rede interna do servidor.

    Sem isso, quem configurasse a integracao faria o backend chamar
    qualquer endereco alcancavel de dentro da infraestrutura — inclusive
    o endpoint de metadados da nuvem (169.254.169.254), que devolve
    credenciais. E o SSRF classico.
    """
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise DispatchError("A URL do webhook precisa começar com http:// ou https://")

    host = parsed.hostname
    if not host:
        raise DispatchError("A URL do webhook não tem um endereço válido.")

    if host.lower() in ("localhost", "metadata.google.internal") or host.endswith(".internal"):
        raise DispatchError("O webhook não pode apontar para um endereço interno.")

    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        raise DispatchError(f"Não foi possível resolver o endereço do webhook: {host}")

    for info in infos:
        endereco = ipaddress.ip_address(info[4][0])
        if (
            endereco.is_private
            or endereco.is_loopback
            or endereco.is_link_local
            or endereco.is_reserved
            or endereco.is_multicast
        ):
            raise DispatchError("O webhook não pode apontar para um endereço interno.")


async def _send_webhook(req: DispatchRequest, config: Dict[str, Any]) -> str:
    url = (config.get("webhook_url") or "").strip()
    if not url:
        raise DispatchError("Nenhum webhook configurado em Integrações.")
    _validar_destino_webhook(url)

    payload = {
        "lead_id": req.lead_id,
        "lead_name": req.lead_name,
        "lead_email": req.lead_email,
        "lead_instagram": req.lead_instagram,
        "subject": req.subject,
        "body": req.body,
        "sent_at": datetime.now().isoformat(timespec="seconds"),
    }
    try:
        # follow_redirects=False: um 302 para 127.0.0.1 driblaria a checagem
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=False) as client:
            resp = await client.post(url, json=payload)
    except Exception as exc:
        raise DispatchError(f"Não foi possível chamar o webhook: {exc}")

    if resp.status_code >= 400:
        raise DispatchError(f"O webhook respondeu {resp.status_code}.")
    return f"Webhook chamado ({resp.status_code})"


def _manual_channel(req: DispatchRequest) -> Tuple[str, str]:
    """Canais sem API: devolve (texto de status, link de acao)."""
    if req.channel == "whatsapp":
        return (
            "Link de WhatsApp pronto com a mensagem preenchida",
            _whatsapp_link(req.lead_phone or "", req.body),
        )

    if req.channel == "instagram_direct":
        url = _profile_url(req.lead_instagram or "", "https://instagram.com/")
        if not url:
            raise DispatchError("Este lead não tem Instagram.")
        return ("Perfil aberto — a mensagem foi copiada para você colar na DM", url)

    url = _profile_url(req.lead_linkedin or "", "https://linkedin.com/in/")
    if not url:
        raise DispatchError("Este lead não tem LinkedIn.")
    return ("Perfil aberto — a mensagem foi copiada para você colar", url)


class OutreachDispatcher:
    @staticmethod
    async def dispatch_message(
        req: DispatchRequest,
        current_credits: int,
        config: Optional[Dict[str, Any]] = None,
    ) -> DispatchResponse:
        """Envia (ou prepara) a mensagem.

        Levanta DispatchError quando nao foi possivel entregar. Quem chama
        so cobra creditos se `delivered` vier True.
        """
        config = config or {}
        channel = (req.channel or "email").strip()

        # Canais manuais nao consomem credito: nada e enviado por nos.
        chargeable = channel not in MANUAL_CHANNELS
        if chargeable and current_credits < DISPATCH_COST:
            raise ValueError("Créditos insuficientes para realizar o disparo automatizado.")

        action_url = ""
        if channel == "email":
            status_text = await _send_email(req, config)
        elif channel == "whatsapp_api":
            status_text = await _enviar_whatsapp_api(req, config)
        elif channel == "webhook":
            status_text = await _send_webhook(req, config)
        elif channel in MANUAL_CHANNELS:
            status_text, action_url = _manual_channel(req)
        else:
            raise DispatchError(f"Canal desconhecido: {channel}")

        cost = DISPATCH_COST if chargeable else 0
        return DispatchResponse(
            dispatch_id=f"disp_{uuid.uuid4().hex[:10]}",
            lead_id=req.lead_id,
            channel=channel,
            status=status_text,
            delivered=chargeable,
            requires_manual_send=not chargeable,
            action_url=action_url,
            delivered_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            credits_consumed=cost,
            remaining_credits=max(0, current_credits - cost),
            message_preview=f"[{channel.upper()}] {req.lead_name}: {(req.subject or req.body)[:80]}",
        )
