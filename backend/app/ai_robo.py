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
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

# Quantas respostas o robo da seguidas sem nenhuma intervencao humana.
MAX_RESPOSTAS_SEGUIDAS = 12

# Palavras de saida. Comparadas sem acento e sem caixa, como frase
# inteira ou no comeco da mensagem — "nao quero perder essa oportunidade"
# nao e pedido para sair.
PEDIDOS_DE_SAIDA = (
    "pare", "parar", "para", "sair", "stop", "cancelar", "descadastrar",
    "remover", "me tira", "me remove", "nao me mande", "nao mande mais",
    "nao envie mais", "bloquear", "unsubscribe",
)

# Recusa nao e pedido para sair. "Nao tenho interesse no momento" e um
# "agora nao": um bom SDR agradece e faz no maximo uma pergunta gentil.
# Tratar isso como saida definitiva encerrava conversas recuperaveis; a
# segunda recusa, essa sim, encerra.
RECUSAS = (
    "nao tenho interesse", "sem interesse", "nao quero", "nao preciso",
    "agora nao", "no momento nao", "nao obrigado", "nao, obrigado", "dispenso",
)

RESPOSTA_ENCERRA = (
    "Entendido, obrigado pela sinceridade! Não vou mais te incomodar. "
    "Se um dia precisar, é só chamar por aqui."
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
    # ate duas mensagens curtas, como gente escreve no WhatsApp
    mensagens: List[str] = field(default_factory=list)
    # memoria da negociacao: etapa, temperatura, o que foi descoberto
    sdr: Dict[str, Any] = field(default_factory=dict)


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


def recusou(texto: str) -> bool:
    """Recusa curta e direta. Mensagem longa com "nao quero" no meio e
    conversa, nao recusa ("nao quero perder essa oportunidade")."""
    t = _normal(texto)
    if not t or len(t.split()) > 7:
        return False
    return any(t == r or t.startswith(r + " ") or t.endswith(" " + r) for r in RECUSAS)


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


from app import ai_oferta  # noqa: E402
from app.ai_sdr import montar_prompt, normalizar, problemas_da_resposta  # noqa: E402


def decidir(
    mensagens: List[Dict[str, Any]],
    canal: str,
    perfil: Dict[str, Any],
    cfg: Dict[str, Any],
    lead: Optional[Dict[str, Any]],
    gerar_json: Callable[[str], Dict[str, Any]],
    raio: Optional[Dict[str, Any]] = None,
    sdr: Optional[Dict[str, Any]] = None,
) -> Decisao:
    """O que fazer com a ultima mensagem do contato.

    `gerar_json` e injetado para os testes rodarem sem rede.
    """
    ultima = next((m for m in reversed(mensagens) if m.get("de") == "contato"), None)
    if not ultima:
        return Decisao()

    # o preco cadastrado na oferta vale para o desconto e para o verificador
    cfg = ai_oferta.aplicar(cfg)

    texto = ultima.get("texto", "")

    if pediu_para_sair(texto):
        return Decisao(resposta=RESPOSTA_SAIDA, optout=True, motivo="pediu para não receber mais")

    if recusou(texto):
        recusas = int((sdr or {}).get("recusas") or 0)
        if recusas >= 1:
            return Decisao(
                resposta=RESPOSTA_ENCERRA, optout=True, motivo="recusou duas vezes",
                sdr={**(sdr or {}), "recusas": recusas + 1, "etapa": "perdido"},
            )
        sdr = {**(sdr or {}), "recusas": recusas + 1}

    if e_so_midia(texto):
        return Decisao(passar_para_humano=True, motivo=f"mandou {texto} — o robô não interpreta mídia")

    if respostas_seguidas_do_robo(mensagens) >= MAX_RESPOSTAS_SEGUIDAS:
        return Decisao(
            passar_para_humano=True,
            motivo=f"{MAX_RESPOSTAS_SEGUIDAS} respostas seguidas sem você — pode ser outro robô do outro lado",
        )

    prompt = montar_prompt(mensagens, canal, perfil, cfg, lead, raio=raio, sdr=sdr)
    n = normalizar(gerar_json(prompt), sdr)

    # Conferencia em codigo: preco fora do catalogo e motivo inventado nao
    # saem. Uma chance de corrigir; errou de novo, o humano assume.
    erros = problemas_da_resposta(n["mensagens"], cfg, mensagens)
    if erros:
        correcao = (prompt + "\n\n== SUA RESPOSTA ANTERIOR FOI RECUSADA ==\n"
                    + "\n".join(f"- {e}" for e in erros)
                    + "\nReescreva sem isso. Para negar algo, basta dizer que não é possível.")
        n = normalizar(gerar_json(correcao), sdr)
        if problemas_da_resposta(n["mensagens"], cfg, mensagens):
            return Decisao(passar_para_humano=True, usou_ia=True, sdr=n["sdr"],
                           motivo="a IA insistiu em citar preço ou motivo que não existe — responda você")
    humano = n["passar_para_humano"]

    if not n["mensagens"] and not humano:
        return Decisao(passar_para_humano=True, motivo="a IA não produziu resposta", usou_ia=True, sdr=n["sdr"])

    # Reuniao combinada e o fim do trabalho do robo: o humano assume.
    if n["sdr"].get("reuniao") and not (sdr or {}).get("reuniao"):
        humano = True
        n["motivo"] = n["motivo"] or f"reunião combinada: {n['sdr']['reuniao']}"

    return Decisao(
        resposta="\n\n".join(n["mensagens"]),
        mensagens=n["mensagens"],
        passar_para_humano=humano,
        motivo=n["motivo"] if humano else "",
        usou_ia=True,
        sdr=n["sdr"],
    )
