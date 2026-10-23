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

# "Meu marido cria sites, não tenho interesse": recusa clara COM motivo. Não é para insistir nem tentar agendar: agradece, deseja sucesso
# e a conversa sai da lista (próximo lead). Só frases inequívocas entram aqui; "agora não" e "vou pensar" continuam com a IA.
_SEM_INTERESSE = (
    "nao tenho interesse", "nao temos interesse", "sem interesse", "nao me interessa", "nao nos interessa", "nao estou interessad",
    "nao estamos interessad", "nao tenho nenhum interesse", "nao preciso de site", "nao precisamos de site", "nao quero site",
    "ja tenho quem", "ja temos quem", "ja tenho alguem que", "ja temos alguem que", "ja tenho site", "ja temos site",
    "ja tenho um site", "ja temos um site", "ja tenho meu site", "ja tenho quem faca", "ja tenho quem cuida",
)
_PARENTE_FAZ = re.compile(
    r"\b(meu|minha|o meu|a minha)\s+(marido|esposa|mulher|namorad[oa]|noiv[oa]|filh[oa]|irmao|irma|prim[oa]|sobrinh[oa]|pai|mae|amig[oa]|socio|socia|cunhad[oa]|genro|nora)\b[^.!?]{0,50}\b(faz|cria|cuida|trabalha|fez|desenvolve|monta|mexe|toca)\b"
)
RESPOSTA_JA_TEM_QUEM_FACA = (
    "Ah, entendo! Que bom que já tem alguém de confiança cuidando disso. De toda forma, agradeço a atenção "
    "e desejo muito sucesso por aí. Se um dia precisar, é só chamar."
)
RESPOSTA_SEM_INTERESSE = (
    "Entendo, sem problema! Agradeço a atenção e desejo muito sucesso. Se mudar de ideia, é só chamar por aqui."
)


def desinteresse_firme(texto: str) -> str:
    """"" se a pessoa não recusou claramente; senão "ja_tem" (tem quem faça: marido, parente, agência) ou "sem_interesse"."""
    t = _normal(texto)
    if not t or len(t.split()) > 60:
        return ""
    if re.search(r"\b(mas|porem|entretanto)\b[^.!?]{0,40}\b(quero|queria|quer|gostaria|me interessa|tenho interesse|pode|manda|mostra|qual|valor|preco|quanto|ver)\b", t):
        return ""         # "não tenho interesse agora, mas me manda o exemplo": quer ver, a IA conduz
    if "?" in (texto or "") and not any(x in t for x in _SEM_INTERESSE):
        return ""         # está perguntando alguma coisa: quer conversar, a IA conduz
    ja_tem = bool(_PARENTE_FAZ.search(t)) or any(x in t for x in ("ja tenho quem", "ja temos quem", "ja tenho alguem", "ja temos alguem", "ja tenho site", "ja temos site", "ja tenho um site", "ja temos um site", "ja tenho meu site"))
    if ja_tem:
        return "ja_tem"
    if any(x in t for x in _SEM_INTERESSE):
        if any(x in t for x in ("no momento", "agora", "por enquanto", "por ora", "neste momento", "hoje")):
            return ""     # "não tenho interesse no momento": é questão de hora, não recusa; a IA faz uma tentativa gentil
        return "sem_interesse"
    return ""


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
    # a mensagem do outro lado parece de um robo (atendimento automatico): nao se responde
    automatica: bool = False
    # o lead aceitou a previa e ela ainda nao existe: o servico cria o site e troca [LINK_DA_PREVIA] pelo link
    criar_previa: bool = False


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


# Sinais de atendimento automatico. Peso 2 = quase so robo escreve assim; peso 1 = pode ser gente,
# so conta junto com outro sinal. "Qual o horario de atendimento?" (peso 1) de um lead de verdade
# nao pode ser tratado como robo.
SINAIS_DE_ROBO = (
    (3, "atendimento automatico"), (3, "mensagem automatica"), (3, "resposta automatica"),
    (3, "assistente virtual"), (3, "este e um atendimento"), (3, "protocolo de atendimento"), (3, "seu protocolo"),
    (3, "digite 1"), (3, "digite 2"), (3, "digite o numero"), (3, "responda com o numero"),
    (3, "escolha uma das opcoes"), (3, "selecione uma opcao"), (3, "para continuar o atendimento"),
    (3, "sobre qual deles"), (2, "agradece seu contato"), (2, "agradecemos o seu contato"),
    (2, "agradecemos seu contato"), (2, "agradeco o seu contato"), (2, "agradeco o contato"),
    (2, "agradecemos pela sua mensagem"), (2, "agradecemos a sua mensagem"), (2, "agradecemos a mensagem"),
    (2, "agradecemos pelo seu contato"), (2, "obrigado pela sua mensagem"), (2, "obrigada pela sua mensagem"),
    (2, "nao estamos disponiveis"), (2, "no momento nao estamos"), (2, "retornaremos assim que"), (2, "responderemos em breve"),
    (3, "sua parcela"), (3, "sua fatura"), (3, "seu boleto"),
    (1, "obrigado por entrar em contato"), (1, "obrigada por entrar em contato"), (1, "em caso de duvidas"),
    (1, "retornaremos"), (1, "responderemos assim que"), (1, "em breve"), (1, "nosso horario"),
    (1, "fora do horario"), (1, "horario de atendimento"), (1, "no momento nao estamos"),
    (1, "clique no botao"), (1, "clique no link"), (1, "acesse o link"), (1, "estamos chegando"),
)


def parece_automatica(texto: str, mensagens: Optional[List[Dict[str, Any]]] = None) -> bool:
    """O outro lado e um robo? Pelo jeito da frase, e por repetir a mesma mensagem."""
    return pontos_de_robo(texto, mensagens) >= 2


def certeza_de_robo(texto: str, mensagens: Optional[List[Dict[str, Any]]] = None) -> bool:
    """Robô sem dúvida (menu, protocolo, "mensagem automática"...): nem chama a IA. Com 2 pontos só (um "agradecemos o seu contato"
    pode ser gente) quem decide é a IA, que também sabe responder "automatica": true."""
    return pontos_de_robo(texto, mensagens) >= 3


def pontos_de_robo(texto: str, mensagens: Optional[List[Dict[str, Any]]] = None) -> int:
    bruto = texto or ""
    t = _normal(bruto)
    if not t or e_so_midia(bruto):
        return 0
    # com os numeros: "digite 1" perde o 1 em _normal
    com_numeros = re.sub(r"[^a-z0-9 ]+", " ", unicodedata.normalize("NFKD", bruto).encode("ascii", "ignore").decode().lower())
    pontos = sum(peso for peso, trecho in SINAIS_DE_ROBO if trecho in t or trecho in com_numeros)
    if re.search(r"https?://", bruto):
        pontos += 1
    if len(re.findall(r"(?m)^\s*(?:[1-9][\).\-]|[•➡✅])", bruto)) >= 2:
        pontos += 2  # lista de opcoes numeradas
    # a mesma frase de novo e de novo: gente nao repete mensagem palavra por palavra
    # (so frase longa: "oi", "???" e "ok" repetidos sao de gente)
    if mensagens and len(com_numeros.strip()) >= 25:
        def chave(x: str) -> str:
            return re.sub(r"[^a-z0-9 ]+", " ", unicodedata.normalize("NFKD", x or "").encode("ascii", "ignore").decode().lower()).strip()
        iguais = sum(1 for m in mensagens if m.get("de") == "contato" and chave(m.get("texto", "")) == com_numeros.strip())
        if iguais >= 2:
            pontos += 2
    return pontos


def _candidata_a_robo(texto: str, mensagens: List[Dict[str, Any]]) -> bool:
    """Vale gastar a IA para olhar esta fala? Só quando há algum indício (sinal de robô, link, texto longo de divulgação)."""
    t = texto or ""
    return pontos_de_robo(t, mensagens) >= 1 or bool(re.search(r"https?://", t)) or len(t) >= 280


PROMPT_CLASSIFICAR = """Você analisa uma conversa de WhatsApp de uma empresa. Decida se QUEM ESCREVE (as falas marcadas CONTATO) é um robô:
atendimento automático, bot de empresa ou banco, mensagem em massa, propaganda, divulgação, promoção, cobrança automática,
corrente, aviso de operadora, golpe/spam. Uma PESSOA de verdade, mesmo curta ou seca ("não tenho interesse", "quem é?"), NÃO é robô.
Só diga que é robô quando o conteúdo deixa claro (texto padronizado, menus, links de oferta, mesma mensagem para todos, "mensagem automática").
Na dúvida, diga que é pessoa.

CONVERSA (mais recente por último):
{conversa}

Responda SOMENTE um JSON: {{"robo": true ou false, "motivo": "uma frase curta em português dizendo o que é (ex.: propaganda de uma loja, menu de atendimento automático)"}}"""


def classificar_contato(mensagens: List[Dict[str, Any]], gerar_json: Optional[Callable[[str], Dict[str, Any]]] = None) -> Optional[Dict[str, Any]]:
    """Quem está do outro lado é um robô ou propaganda? Devolve {"robo": bool, "motivo": str, "usou_ia": bool}, ou None se não deu para decidir.

    Primeiro as regras (grátis, na hora): menu, protocolo, "mensagem automática" são robô sem dúvida. Com indício mais fraco,
    a IA lê o contexto da conversa. Sem indício nenhum, é pessoa: a IA nem é chamada."""
    falas = [m for m in (mensagens or []) if (m.get("texto") or "").strip()]
    do_contato = [m for m in falas if m.get("de") == "contato"]
    if not do_contato:
        return {"robo": False, "motivo": "", "usou_ia": False}
    recentes = do_contato[-3:]
    for m in recentes:
        if certeza_de_robo(m.get("texto", ""), falas):
            return {"robo": True, "motivo": "mensagem automática (menu, protocolo ou aviso padronizado)", "usou_ia": False}
    if not any(_candidata_a_robo(m.get("texto", ""), falas) for m in recentes):
        return {"robo": False, "motivo": "", "usou_ia": False}
    if gerar_json is None:
        return None
    linhas = []
    for m in falas[-8:]:
        quem = {"contato": "CONTATO", "voce": "VOCÊ", "robo": "VOCÊ (robô)"}.get(m.get("de"), "VOCÊ")
        linhas.append(f"{quem}: {(m.get('texto') or '').strip()[:500]}")
    try:
        r = gerar_json(PROMPT_CLASSIFICAR.format(conversa="\n".join(linhas)))
    except Exception:
        return None
    if not isinstance(r, dict) or "robo" not in r:
        return None
    return {"robo": r.get("robo") is True, "motivo": str(r.get("motivo") or "").strip()[:160], "usou_ia": True}


_PEDIU_ENVIO = re.compile(r"\b(mand[aeo]\w*|envi[aeo]\w*|pass[aeo]\w*|encaminh\w*)\b")
_PEDIU_ALVO = re.compile(r"\b(link|site|previa|mostr\w*|repass\w*|encaminh\w*|avali\w*|olhar|ver)\b")


def pediu_o_link(texto: str) -> bool:
    """Quem escreveu (o dono OU a secretária/recepção) pediu ou aceitou receber a prévia: "pode mandar que eu mostro pra doutora",
    "me envia o link", "manda aí que eu repasso". É um aceite: o link vai na hora."""
    t = _normal(texto)
    return bool(t and _PEDIU_ENVIO.search(t) and _PEDIU_ALVO.search(t))


def _ja_mandou_o_link(mensagens: List[Dict[str, Any]], lead: Optional[Dict[str, Any]]) -> bool:
    url = ((lead or {}).get("site_publicado") or "").strip()
    return any(m.get("de") in ("robo", "voce") and ("http" in (m.get("texto") or "").lower() or (url and url in (m.get("texto") or "")))
               for m in mensagens)


def _tem_link(textos: List[str]) -> bool:
    return any("http" in t.lower() or "[LINK_DA_PREVIA]" in t for t in textos)


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
from app.ai_sdr import forma_do_preco, montar_prompt, normalizar, problemas_da_resposta, resolver_marcadores  # noqa: E402


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

    firme = desinteresse_firme(texto)
    if firme:
        # recusa clara (com ou sem motivo): agradece e encerra, sem insistir nem tentar agendar; o lead vira "perdido" e sai da lista
        return Decisao(
            resposta=(RESPOSTA_JA_TEM_QUEM_FACA if firme == "ja_tem"
                      else RESPOSTA_ENCERRA if int((sdr or {}).get("recusas") or 0) >= 1 else RESPOSTA_SEM_INTERESSE), optout=True,
            motivo="já tem quem faça o site" if firme == "ja_tem" else "disse que não tem interesse",
            sdr={**(sdr or {}), "etapa": "perdido", "recusas": int((sdr or {}).get("recusas") or 0) + 1},
        )

    if recusou(texto):
        recusas = int((sdr or {}).get("recusas") or 0)
        if recusas >= 1:
            return Decisao(
                resposta=RESPOSTA_ENCERRA, optout=True, motivo="recusou duas vezes",
                sdr={**(sdr or {}), "recusas": recusas + 1, "etapa": "perdido"},
            )
        sdr = {**(sdr or {}), "recusas": recusas + 1}

    if e_so_midia(texto):
        if texto.strip().lower() == "[áudio]":
            return Decisao(passar_para_humano=True, motivo="mandou um áudio que não deu para transcrever agora — ouça e responda você")
        return Decisao(passar_para_humano=True, motivo=f"mandou {texto} — o robô não interpreta mídia")

    # outro robo do outro lado: nao responde (nem gasta IA nem credito) e a conversa nao vira um
    # papo de dois robos; o servico conta quantas vieram para tirar o contato da lista do robo
    if certeza_de_robo(texto, mensagens):
        return Decisao(automatica=True, motivo="parece uma resposta automática (outro robô)")

    if respostas_seguidas_do_robo(mensagens) >= MAX_RESPOSTAS_SEGUIDAS:
        return Decisao(
            passar_para_humano=True,
            motivo=f"{MAX_RESPOSTAS_SEGUIDAS} respostas seguidas sem você — pode ser outro robô do outro lado",
        )

    prompt = montar_prompt(mensagens, canal, perfil, cfg, lead, raio=raio, sdr=sdr)
    n = normalizar(gerar_json(prompt), sdr)
    # o modelo percebeu que o outro lado e um atendimento automatico ou propaganda: nao se responde
    if n.get("automatica") and not n["mensagens"]:
        return Decisao(automatica=True, usou_ia=True, sdr=n["sdr"], motivo="parece uma resposta automática (outro robô)")

    # Quem atende (secretária, recepção) pediu o link para mostrar ao responsável: o link vai AGORA, e só depois se tenta chegar
    # ao responsável. O modelo já errou isso (pediu "qual o melhor horário para enviar" em vez de enviar): a regra também é de código.
    if pediu_o_link(texto) and not _ja_mandou_o_link(mensagens, lead) and not _tem_link(n["mensagens"]) and not n.get("automatica"):
        sem_site = not ((lead or {}).get("site_publicado") or "").strip()
        aviso = ("\n\n== SUA RESPOSTA ANTERIOR FOI RECUSADA ==\n- A pessoa pediu ou aceitou receber o link da prévia (talvez para mostrar ao responsável) "
                 "e você NÃO mandou. Mande o link AGORA, nesta resposta"
                 + (', com enviar_previa true e o marcador [LINK_DA_PREVIA] onde vai o link' if sem_site else ", escrito por inteiro")
                 + ". Depois do link, agradeça pelo nome, peça que mostre ao responsável e pergunte em que dia ou horário ele(a) poderia "
                   "conversar uns 15 minutos. Não pergunte horário para ENVIAR.")
        n = normalizar(gerar_json(prompt + aviso), sdr)
        if not _tem_link(n["mensagens"]):
            quem = ((n["sdr"].get("dados") or {}).get("nome") or (sdr or {}).get("dados", {}).get("nome") or "").split(" ")[0]
            url = ((lead or {}).get("site_publicado") or "").strip()
            n["mensagens"] = [f"Perfeito{', ' + quem if quem else ''}! Aqui está a prévia: {url or '[LINK_DA_PREVIA]'}",
                              "Obrigado pela ajuda! Pode mostrar para o responsável? Em que dia ou horário ele(a) teria uns 15 minutinhos "
                              "para eu explicar rapidinho?"]
        if sem_site and "[LINK_DA_PREVIA]" in " ".join(n["mensagens"]):
            n["enviar_previa"] = True

    # Conferencia em codigo: preco fora do catalogo e motivo inventado nao
    # saem. Uma chance de corrigir; errou de novo, o humano assume.
    n["mensagens"] = resolver_marcadores(n["mensagens"], lead)
    # o cliente aceitou e nao ha previa: o servico vai criar o site e trocar o marcador (vale so quando o modelo avisou)
    criar_previa = bool(n.get("enviar_previa")) and not ((lead or {}).get("site_publicado") or "").strip()
    erros = problemas_da_resposta(n["mensagens"], cfg, mensagens, lead or {}, criar_previa) + forma_do_preco(n["mensagens"], mensagens)
    if erros:
        correcao = (prompt + "\n\n== SUA RESPOSTA ANTERIOR FOI RECUSADA ==\n"
                    + "\n".join(f"- {e}" for e in erros)
                    + "\nReescreva sem isso. Para negar algo, basta dizer que não é possível.")
        n = normalizar(gerar_json(correcao), sdr)
        n["mensagens"] = resolver_marcadores(n["mensagens"], lead)
        restantes = problemas_da_resposta(n["mensagens"], cfg, mensagens, lead or {}, criar_previa)
        if restantes:
            return Decisao(passar_para_humano=True, usou_ia=True, sdr=n["sdr"],
                           motivo="a resposta do robô não passou na conferência (" + restantes[0][:110] + ") — responda você")
    humano = n["passar_para_humano"]

    if not n["mensagens"] and not humano:
        return Decisao(passar_para_humano=True, motivo="a IA não produziu resposta", usou_ia=True, sdr=n["sdr"])

    # Indicou outra pessoa para falar: o robo agradece e o humano assume (o pitch vai para quem decide, nao para quem atendeu).
    novo = (n["sdr"].get("dados") or {}).get("contato_decisor")
    if novo and novo != ((sdr or {}).get("dados") or {}).get("contato_decisor"):
        humano = True
        quem = (n["sdr"].get("dados") or {}).get("decisor") or "o responsável"
        n["motivo"] = n["motivo"] or f"indicou outro contato: {quem} — {novo}"

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
        criar_previa=criar_previa,
    )
