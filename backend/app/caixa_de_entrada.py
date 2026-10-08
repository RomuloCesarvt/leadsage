"""A caixa de entrada: tudo que o usuário conversa, num lugar só.

Duas fontes entram na mesma lista:

- **conversas do robô** (o lead respondeu, no WhatsApp, Instagram, Messenger ou Telegram);
- **abordagens já enviadas** (e-mail, WhatsApp, Instagram, LinkedIn) que ainda não tiveram resposta.

Sem a segunda fonte, quem acabou de disparar mensagens abria "Conversas" e via vazio,
sem saber se o envio tinha funcionado. A abordagem enviada aparece como uma conversa
"aguardando resposta"; se o lead responder, a conversa do robô assume o lugar dela.
"""
import re
from typing import Any, Dict, List

PREFIXO_ENVIO = "envio:"

# o nome do canal na fila de envio -> o nome que a tela usa
CANAL_VISUAL = {
    "email": "email",
    "whatsapp": "whatsapp",
    "instagram_direct": "instagram",
    "linkedin_msg": "linkedin",
}


def _digitos(texto: str) -> str:
    return re.sub(r"\D", "", texto or "")


def _contato_do_item(item: Dict[str, Any]) -> str:
    c = item.get("contato") or {}
    canal = item.get("canal")
    if canal == "email":
        return c.get("email", "")
    if canal == "whatsapp":
        return c.get("phone", "")
    if canal == "instagram_direct":
        return c.get("instagram", "")
    return c.get("linkedin", "")


def _ja_conversa(item: Dict[str, Any], conversas: List[Dict[str, Any]]) -> bool:
    """O lead já respondeu e virou conversa do robô?"""
    if item.get("canal") != "whatsapp":
        return False
    fim = _digitos(_contato_do_item(item))[-10:]
    return bool(fim) and any(
        c.get("canal") == "whatsapp" and _digitos(c.get("contato", ""))[-10:] == fim for c in conversas
    )


def _mensagem(item: Dict[str, Any]) -> Dict[str, Any]:
    texto = item.get("texto", "")
    if item.get("canal") == "email" and item.get("assunto"):
        texto = f"Assunto: {item['assunto']}\n\n{texto}"
    return {"de": "voce", "texto": texto, "em": item.get("enviado_em") or item.get("criado") or ""}


def resumo_do_envio(item: Dict[str, Any]) -> Dict[str, Any]:
    msg = _mensagem(item)
    return {
        "id": PREFIXO_ENVIO + item["id"],
        "canal": CANAL_VISUAL.get(item.get("canal", ""), item.get("canal", "")),
        "contato": _contato_do_item(item),
        "nome": item.get("nome", ""),
        "lead_id": item.get("lead_id", ""),
        "robo_ativo": False, "optout": False, "precisa_humano": False, "motivo": "",
        "atualizado": msg["em"],
        "ultima": msg, "total": 1,
        "origem": "envio", "aguardando": True,
    }


def conversa_do_envio(item: Dict[str, Any]) -> Dict[str, Any]:
    r = resumo_do_envio(item)
    r.pop("ultima"), r.pop("total")
    r["mensagens"] = [_mensagem(item)]
    r["somente_leitura"] = True
    return r


def juntar(conversas: List[Dict[str, Any]], itens_da_fila: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Conversas do robô + abordagens enviadas sem resposta, da mais recente para a mais antiga."""
    lista = [{**c, "origem": "robo", "aguardando": False} for c in conversas]
    for item in itens_da_fila:
        if item.get("status") in ("enviado", "enviando") and not _ja_conversa(item, conversas):
            lista.append(resumo_do_envio(item))
    lista.sort(key=lambda c: c.get("atualizado") or "", reverse=True)
    return lista
