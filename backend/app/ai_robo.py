"""O robo que conversa com o lead depois que ele responde.

A divisao de trabalho e deliberada. Antes da IA, regras fixas decidem o
que nao pode depender de um modelo:

- **pedido para parar** encerra na hora, com resposta fixa, e o robo nao
  volta a falar com aquela pessoa. Deixar isso para a IA e arriscar que
  ela "contorne a objecao" de quem pediu para sair — que e como numero de
  WhatsApp vira denuncia e banimento;
- **limite de respostas seguidas sem humano.** Se o outro lado tambem e
  um robo (atendimento automatico de loja e comum), os dois conversariam
  para sempre, gastando credito a cada volta;
- **midia sem texto** (audio, foto) vai para o humano: o robo nao ouve
  audio, e fingir que entendeu e pior do que chamar alguem.

Depois disso a IA escreve, mas dentro de um contrato: devolve tambem se
e hora de passar para o humano, e nunca inventa preco, prazo ou
garantia — perguntado sobre isso sem a informacao nas instrucoes, ela
diz que vai confirmar e chama o dono.
"""
import re
import unicodedata
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional

# Quantas respostas o robo da seguidas sem nenhuma intervencao humana.
MAX_RESPOSTAS_SEGUIDAS = 12

# Palavras de saida. Comparadas sem acento e sem caixa, como frase
# inteira ou no comeco da mensagem — "nao quero perder essa oportunidade"
# nao e pedido para sair.
PEDIDOS_DE_SAIDA = (
    "pare", "parar", "para", "sair", "stop", "cancelar", "descadastrar",
    "remover", "me tira", "me remove", "nao quero", "nao tenho interesse",
    "sem interesse", "nao me mande", "nao mande mais", "nao envie mais",
    "bloquear", "unsubscribe",
)

RESPOSTA_SAIDA = (
    "Tudo bem, não vou mais te enviar mensagens. Obrigado pelo retorno e "
    "desculpe o incômodo!"
)


@dataclass
class Decisao:
    resposta: str = ""
    passar_para_humano: bool = False
    motivo: str = ""
    optout: bool = False
    usou_ia: bool = False


def _normal(texto: str) -> str:
    t = unicodedata.normalize("NFKD", texto or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z ]+", " ", t).strip()


# Os unicos que valem no FIM de uma frase. "sair" e "chega" ficam de fora
# de proposito: "quanto vai sair?" e a pergunta de preco mais comum do
# Brasil, e "quando chega?" e pergunta de prazo.
FINAIS_DE_SAIDA = ("parar", "pare", "stop", "remover", "descadastrar", "bloquear")

# Inequivocos em qualquer posicao da mensagem.
PEDIDOS_FORTES = (
    "nao me mande", "nao mande mais", "nao envie mais", "me tira", "me remove",
    "descadastrar", "unsubscribe", "para de mandar", "pare de mandar",
    "parem de mandar", "nao me chame", "nao entre em contato",
)


def pediu_para_sair(texto: str) -> bool:
    """Pedido para nao receber mais mensagens.

    So o comeco da mensagem nao basta: "nao quero perder essa
    oportunidade" comeca igual a "nao quero". Por isso as frases curtas
    so contam em mensagem curta, e "para" so conta sozinho — "para
    quando seria?" e pergunta.
    """
    t = _normal(texto)
    if not t:
        return False
    if any(forte in t for forte in PEDIDOS_FORTES):
        return True

    palavras = len(t.split())
    for frase in PEDIDOS_DE_SAIDA:
        if t == frase:
            return True
        if frase == "para":
            continue
        curta = palavras <= len(frase.split()) + 2
        # "nao quero obrigado", "pare por favor"
        if curta and t.startswith(frase + " "):
            return True
        # "ok obrigado, pode parar"
        if frase in FINAIS_DE_SAIDA and palavras <= 6 and re.search(rf"\b{re.escape(frase)}$", t):
            return True
    return False


def e_so_midia(texto: str) -> bool:
    return bool(re.fullmatch(r"\[[^\]]+\]", (texto or "").strip()))


def respostas_seguidas_do_robo(mensagens: List[Dict[str, Any]]) -> int:
    """Quantas vezes o robo respondeu desde a ultima palavra do dono."""
    n = 0
    for m in reversed(mensagens):
        if m.get("de") == "voce":
            break
        if m.get("de") == "robo":
            n += 1
    return n


def montar_prompt(
    mensagens: List[Dict[str, Any]],
    canal: str,
    perfil: Dict[str, Any],
    cfg: Dict[str, Any],
    lead: Optional[Dict[str, Any]],
) -> str:
    quem = perfil.get("company_name") or perfil.get("name") or "a empresa"
    assistente = cfg.get("nome_assistente") or "assistente virtual"
    oferta = perfil.get("product_description") or "serviços de presença digital"
    objetivo = {
        "agendar": "marcar uma conversa rápida (ligação ou reunião) com o responsável",
        "site": "mostrar o site que já foi preparado para o negócio e saber o que a pessoa achou",
        "qualificar": "entender se a pessoa tem interesse e momento para contratar",
    }.get(cfg.get("objetivo") or "agendar", cfg.get("objetivo") or "marcar uma conversa")

    contexto_lead = "Não há dados do negócio desta pessoa."
    if lead:
        partes = [f"Negócio: {lead.get('company') or lead.get('name')}"]
        if lead.get("niche"):
            partes.append(f"Ramo: {lead['niche']}")
        if lead.get("city"):
            partes.append(f"Cidade: {lead['city']}")
        if lead.get("missingDigitalAssets"):
            partes.append("O que falta no digital: " + ", ".join(lead["missingDigitalAssets"]))
        if lead.get("rating"):
            partes.append(f"Nota no Google: {lead['rating']} ({lead.get('rating_count') or 0} avaliações)")
        if lead.get("site_publicado"):
            partes.append(f"Site já preparado para ele: {lead['site_publicado']}")
        contexto_lead = "\n".join(partes)

    limite = 60 if canal == "whatsapp" else 45
    historico = "\n".join(
        f"{'CONTATO' if m.get('de') == 'contato' else quem.upper()}: {m.get('texto', '')}"
        for m in mensagens[-20:]
    )

    return f"""Você é {assistente}, que responde mensagens em nome de {quem}.
{quem} oferece: {oferta}

OBJETIVO DA CONVERSA: {objetivo}.
{f"Link para agendar: {cfg['link_agenda']}" if cfg.get("link_agenda") else ""}

SOBRE QUEM ESTÁ CONVERSANDO:
{contexto_lead}

INSTRUÇÕES DO DONO:
{cfg.get("instrucoes") or "(nenhuma)"}

REGRAS — não negociáveis:
- Português do Brasil, tom de conversa de {canal}, no máximo {limite} palavras.
- Uma pergunta por vez. Nada de lista, nada de emoji em excesso, nada de "Prezado".
- NUNCA invente preço, prazo, desconto, garantia ou resultado. Se perguntarem
  e isso não estiver nas instruções do dono, diga que vai confirmar com o
  responsável e marque passar_para_humano.
- Se perguntarem se você é um robô ou uma pessoa, diga a verdade: você é o
  assistente virtual de {quem}.
- Passe para o humano quando a pessoa quiser fechar, negociar valor, pedir
  algo fora do objetivo, reclamar, ou quando você não souber responder.
- Não repita a mesma pergunta que já foi feita no histórico.

CONVERSA ATÉ AGORA:
{historico}

Responda APENAS com JSON:
{{"resposta": "texto para enviar", "passar_para_humano": false, "motivo": "por que (só se passar)"}}
"""


def decidir(
    mensagens: List[Dict[str, Any]],
    canal: str,
    perfil: Dict[str, Any],
    cfg: Dict[str, Any],
    lead: Optional[Dict[str, Any]],
    gerar_json: Callable[[str], Dict[str, Any]],
) -> Decisao:
    """O que fazer com a ultima mensagem do contato.

    `gerar_json` e injetado para os testes rodarem sem rede.
    """
    ultima = next((m for m in reversed(mensagens) if m.get("de") == "contato"), None)
    if not ultima:
        return Decisao()

    texto = ultima.get("texto", "")

    if pediu_para_sair(texto):
        return Decisao(resposta=RESPOSTA_SAIDA, optout=True, motivo="pediu para não receber mais")

    if e_so_midia(texto):
        return Decisao(passar_para_humano=True, motivo=f"mandou {texto} — o robô não interpreta mídia")

    if respostas_seguidas_do_robo(mensagens) >= MAX_RESPOSTAS_SEGUIDAS:
        return Decisao(
            passar_para_humano=True,
            motivo=f"{MAX_RESPOSTAS_SEGUIDAS} respostas seguidas sem você — pode ser outro robô do outro lado",
        )

    dados = gerar_json(montar_prompt(mensagens, canal, perfil, cfg, lead))
    resposta = str(dados.get("resposta") or "").strip()
    humano = bool(dados.get("passar_para_humano"))

    if not resposta and not humano:
        return Decisao(passar_para_humano=True, motivo="a IA não produziu resposta", usou_ia=True)

    return Decisao(
        resposta=resposta,
        passar_para_humano=humano,
        motivo=str(dados.get("motivo") or "").strip() if humano else "",
        usou_ia=True,
    )
