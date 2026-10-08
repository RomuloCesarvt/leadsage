"""WhatsApp, Messenger e Instagram pela API oficial da Meta.

Tres canais, uma porta de entrada: a Meta chama o webhook com formatos
diferentes para cada um, e este modulo transforma tudo em `Recebida` —
canal, contato, nome, texto. O robo nao precisa saber de onde veio.

O que a API oficial permite e o que nao permite e regra da Meta, nao
nossa: aqui so se RESPONDE a quem escreveu. Mandar a primeira mensagem
para um contato frio pelo Instagram ou Messenger nao existe na API, e no
WhatsApp exige modelo aprovado e consentimento — fora do escopo do robo.
"""
import hashlib
import hmac
import re
from dataclasses import dataclass
from typing import Any, Dict, List

import httpx

GRAPH = "https://graph.facebook.com/v21.0"


@dataclass
class Recebida:
    canal: str          # whatsapp | messenger | instagram | telegram
    contato: str        # wa_id, PSID ou IGSID — o endereco para responder
    nome: str
    texto: str
    meta_id: str        # id da mensagem na Meta: garante processar uma vez so
    momento: int        # epoch em segundos


class EnvioFalhou(Exception):
    pass


# ---------------------------------------------------------- assinatura

def assinatura_confere(corpo: bytes, cabecalho: str, segredo: str) -> bool:
    """Confere o X-Hub-Signature-256 com o segredo do app do usuario.

    Sem isto qualquer pessoa que descobrisse a URL poderia forjar
    mensagens: o robo responderia a contatos inventados, gastando credito
    do usuario e mandando texto em nome dele. Sem segredo configurado, a
    resposta e nao — falhar fechado.
    """
    if not segredo or not cabecalho or not cabecalho.startswith("sha256="):
        return False
    esperado = hmac.new(segredo.encode(), corpo, hashlib.sha256).hexdigest()
    return hmac.compare_digest(esperado, cabecalho[len("sha256="):])


# --------------------------------------------------------------- leitura

def _texto_de_midia(tipo: str) -> str:
    rotulos = {
        "image": "[imagem]", "audio": "[áudio]", "video": "[vídeo]",
        "document": "[documento]", "sticker": "[figurinha]", "location": "[localização]",
    }
    return rotulos.get(tipo, f"[{tipo or 'mensagem'}]")


def ler_eventos(corpo: Dict[str, Any], canal_cfg: Dict[str, Any]) -> List[Recebida]:
    """Extrai as mensagens recebidas, ignorando o que nao e conversa.

    Ficam de fora: confirmacoes de entrega e leitura, e os "ecos" — a
    propria mensagem que a pagina enviou voltando pelo webhook. Responder
    ao eco faria o robo conversar consigo mesmo.
    """
    objeto = corpo.get("object")
    saida: List[Recebida] = []

    if objeto == "whatsapp_business_account":
        for entrada in corpo.get("entry") or []:
            for mudanca in entrada.get("changes") or []:
                valor = mudanca.get("value") or {}
                meu_numero = (valor.get("metadata") or {}).get("phone_number_id", "")
                if canal_cfg.get("wa_phone_id") and meu_numero and meu_numero != canal_cfg["wa_phone_id"]:
                    continue
                nomes = {
                    c.get("wa_id"): (c.get("profile") or {}).get("name", "")
                    for c in valor.get("contacts") or []
                }
                for m in valor.get("messages") or []:
                    tipo = m.get("type")
                    if tipo == "text":
                        texto = (m.get("text") or {}).get("body", "")
                    elif tipo == "button":
                        texto = (m.get("button") or {}).get("text", "")
                    elif tipo == "interactive":
                        i = m.get("interactive") or {}
                        texto = ((i.get("button_reply") or i.get("list_reply")) or {}).get("title", "")
                    else:
                        texto = _texto_de_midia(tipo)
                    saida.append(Recebida(
                        canal="whatsapp",
                        contato=m.get("from", ""),
                        nome=nomes.get(m.get("from"), ""),
                        texto=texto,
                        meta_id=m.get("id", ""),
                        momento=int(m.get("timestamp") or 0),
                    ))

    elif objeto in ("page", "instagram"):
        canal = "messenger" if objeto == "page" else "instagram"
        proprios = {canal_cfg.get("page_id"), canal_cfg.get("ig_id")} - {None, ""}
        for entrada in corpo.get("entry") or []:
            for ev in entrada.get("messaging") or []:
                msg = ev.get("message") or {}
                remetente = (ev.get("sender") or {}).get("id", "")
                if not msg or msg.get("is_echo") or remetente in proprios:
                    continue
                texto = msg.get("text") or ""
                if not texto and msg.get("attachments"):
                    texto = _texto_de_midia((msg["attachments"][0] or {}).get("type", ""))
                saida.append(Recebida(
                    canal=canal,
                    contato=remetente,
                    nome="",
                    texto=texto,
                    meta_id=msg.get("mid", ""),
                    momento=int((ev.get("timestamp") or 0) / 1000),
                ))

    return [r for r in saida if r.contato and r.meta_id]


# ----------------------------------------------------------------- envio

ERROS_META = {
    10: "O app da Meta não tem permissão para enviar mensagens por este canal.",
    190: "O token de acesso expirou ou foi revogado. Gere um novo no painel da Meta.",
    200: "Falta permissão no app da Meta para mensagens.",
    551: "Esta pessoa não está disponível para receber mensagens agora.",
    131047: "Passaram mais de 24 horas desde a última mensagem do contato; a Meta só permite modelo aprovado.",
    131026: "A Meta não conseguiu entregar: o número pode não ter WhatsApp.",
    131049: "A Meta limitou mensagens de divulgação para este contato; tente outro dia.",
    130429: "Limite de envios por segundo atingido; tente de novo em instantes.",
    132001: "O modelo de mensagem não existe ou ainda não foi aprovado pela Meta.",
    132000: "O modelo espera outra quantidade de variáveis.",
}


async def enviar(canal: str, contato: str, texto: str, cfg: Dict[str, Any]) -> str:
    """Envia a resposta pelo canal de origem. Devolve o id da Meta."""
    texto = (texto or "").strip()
    if not texto:
        raise EnvioFalhou("Mensagem vazia.")

    if canal == "telegram":
        from app import telegram_canal
        return await telegram_canal.enviar(contato, texto, cfg)

    if canal == "whatsapp":
        token, origem = cfg.get("wa_token"), cfg.get("wa_phone_id")
        if not (token and origem) and cfg.get("cw_hash"):
            # sem a API oficial, mas com o Conector: a resposta sai pelo WhatsApp do PC
            from app import conector_whatsapp
            return await conector_whatsapp.enfileirar_resposta(cfg, contato, texto)
        if not (token and origem):
            raise EnvioFalhou("WhatsApp não conectado.")
        url = f"{GRAPH}/{origem}/messages"
        payload = {
            "messaging_product": "whatsapp",
            "to": re.sub(r"\D", "", contato),
            "type": "text",
            "text": {"preview_url": True, "body": texto[:4096]},
        }
    elif canal in ("messenger", "instagram"):
        token, origem = cfg.get("page_token"), cfg.get("page_id")
        if not (token and origem):
            raise EnvioFalhou("Página do Facebook não conectada.")
        url = f"{GRAPH}/{origem}/messages"
        payload = {
            "recipient": {"id": contato},
            # RESPONSE: resposta a quem escreveu, dentro da janela de 24h
            "messaging_type": "RESPONSE",
            "message": {"text": texto[:1000]},
        }
    else:
        raise EnvioFalhou(f"Canal desconhecido: {canal}")

    try:
        async with httpx.AsyncClient(timeout=15.0) as cliente:
            r = await cliente.post(url, json=payload, headers={"Authorization": f"Bearer {token}"})
    except Exception as exc:
        raise EnvioFalhou(f"Não foi possível falar com a Meta: {type(exc).__name__}")

    dados = r.json() if r.content else {}
    if r.status_code >= 400:
        erro = dados.get("error") or {}
        raise EnvioFalhou(
            ERROS_META.get(erro.get("code")) or erro.get("error_user_msg")
            or erro.get("message") or f"erro {r.status_code}"
        )

    if canal == "whatsapp":
        return ((dados.get("messages") or [{}])[0]).get("id", "")
    return dados.get("message_id", "")


async def enviar_modelo(
    cfg: Dict[str, Any], contato: str, nome: str, idioma: str, variaveis: List[str],
) -> str:
    """Primeira mensagem para quem nunca escreveu: so o modelo aprovado passa.

    E a unica forma que a Meta aceita de iniciar conversa no WhatsApp. O
    modelo vai com a frase de saida ("responda SAIR"), e quem responde abre
    a janela de 24h em que o robo conversa livremente.
    """
    token, origem = cfg.get("wa_token"), cfg.get("wa_phone_id")
    if not (token and origem):
        raise EnvioFalhou("WhatsApp não conectado.")
    payload = {
        "messaging_product": "whatsapp",
        "to": re.sub(r"\D", "", contato),
        "type": "template",
        "template": {
            "name": nome,
            "language": {"code": idioma},
            "components": [{
                "type": "body",
                "parameters": [{"type": "text", "text": (v or "-")[:60]} for v in variaveis],
            }] if variaveis else [],
        },
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as cliente:
            r = await cliente.post(f"{GRAPH}/{origem}/messages", json=payload,
                                   headers={"Authorization": f"Bearer {token}"})
    except Exception as exc:
        raise EnvioFalhou(f"Não foi possível falar com a Meta: {type(exc).__name__}")
    dados = r.json() if r.content else {}
    if r.status_code >= 400:
        erro = dados.get("error") or {}
        raise EnvioFalhou(
            ERROS_META.get(erro.get("code")) or erro.get("error_user_msg")
            or erro.get("message") or f"erro {r.status_code}"
        )
    return ((dados.get("messages") or [{}])[0]).get("id", "")
