"""O que um bom vendedor sabe antes de escrever a primeira mensagem.

Um contato frio que abre com "olha, eu faço isso, notei aquilo" soa como
disparo. Quem vende bem faz, nesta ordem: cumprimenta como gente, diz quem
é, mostra por que escreveu justo para este negócio, explica em uma frase o
que muda para o dono e faz uma pergunta fácil de responder. Este módulo
reúne esse método para os dois lugares que escrevem abordagem (a mensagem
da fila/disparo e a abordagem do dossiê), para que falem do mesmo jeito.

Persuasão aqui é só a legítima: especificidade, reciprocidade, prova social
real (as avaliações do próprio negócio), baixo atrito. Nunca urgência
inventada, escassez falsa ou número que não veio dos dados.
"""
import re
import zlib
from datetime import datetime
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo

from app import ai_oferta, nicho_guia

FUSO = ZoneInfo("America/Sao_Paulo")
DIAS = ("segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo")


def agora_brasil(agora: Optional[datetime] = None) -> datetime:
    a = agora or datetime.now(FUSO)
    return a.astimezone(FUSO) if a.tzinfo else a.replace(tzinfo=FUSO)


def saudacao_do_horario(agora: Optional[datetime] = None) -> str:
    h = agora_brasil(agora).hour
    if h < 5:
        return "Olá"
    if h < 12:
        return "Bom dia"
    if h < 18:
        return "Boa tarde"
    return "Boa noite"


def momento(agora: Optional[datetime] = None) -> str:
    a = agora_brasil(agora)
    periodo = "madrugada" if a.hour < 5 else "manhã" if a.hour < 12 else "tarde" if a.hour < 18 else "noite"
    texto = f"Agora é {DIAS[a.weekday()]}-feira, {a.strftime('%H:%M')} ({periodo}) no horário de Brasília. Cumprimento natural: \"{saudacao_do_horario(a)}\"."
    if a.weekday() >= 5:
        texto += " É fim de semana: mensagem curta e leve; não proponha reunião para hoje."
    if a.hour >= 20 or a.hour < 7:
        texto += " É fora do horário comercial: peça desculpa de leve pelo horário e não cobre resposta agora."
    return texto


def produto(cfg_robo: Optional[Dict[str, Any]], lead: Optional[Dict[str, Any]], user_product: str = "") -> str:
    """O que está sendo vendido, em fatos. Sem inventar o que o dono não cadastrou."""
    cfg = cfg_robo or {}
    try:
        if ai_oferta.ativa(cfg):
            return ai_oferta.bloco_do_servico(cfg, lead)
    except Exception:
        pass
    pb = ai_oferta.PLAYBOOKS["site"]
    if (user_product or "").strip():
        return (
            f"Serviço: {user_product.strip()}\n"
            "Preço, prazo e garantia NÃO cadastrados: não diga valores nem prazos; diga que combina na conversa.\n"
            "Se o serviço for site/página, o raciocínio é este: " + pb["tese"]
        )
    return (
        f"Serviço: {pb['nome']}. {pb['inclui']}\nPreço e prazo NÃO cadastrados: não diga valores nem prazos.\n"
        f"Raciocínio de venda: {pb['tese']}"
    )


ESTRUTURA = """COMO UMA BOA PRIMEIRA MENSAGEM É CONSTRUÍDA (nesta ordem, em prosa corrida, sem listas)
1. CUMPRIMENTO humano: "{saudacao}, <nome da pessoa se estiver no dossiê>!" e, se couber no canal, um "tudo bem?" leve.
   O "tudo bem?" de cortesia não conta como a pergunta final.
2. QUEM É VOCÊ, em uma frase curta e sem currículo: "{apresentacao}".
3. COMO ACHOU E O QUE VIU: diga que encontrou o negócio pesquisando no Google e resuma, em uma frase, o que identificou de
   verdade no dossiê (nota, avaliações, o que clientes elogiam). Reconheça o que há de bom antes de apontar a lacuna. Nunca como crítica.
{ponto_do_site}
5. PERGUNTA DE BAIXO ATRITO: UMA só, no fim, com duas saídas fáceis e o tamanho do compromisso dito com todas as letras:
   "posso te mostrar por aqui mesmo, ou prefere um papo rápido de uns 10 minutinhos, sem nenhuma obrigação?" (adapte ao canal e ao tom).
   Deixe claro que a prévia é para apresentar SEM OBRIGAÇÃO nenhuma da parte dele. A conversa é opção, nunca exigência."""

# A previa existe ou nao: a mensagem nunca pode dizer que "montou" algo que ainda nao existe.
PREVIA_CRIADA = """   c) Diga que JÁ montou uma prévia de como o site dele poderia ficar (está pronta, feita com os dados reais do negócio) e peça
      licença para enviar. Não mande o link neste primeiro toque."""
PREVIA_OFERECER = """   c) Diga que pode montar, sem custo e sem compromisso, uma prévia de como o site dele poderia ficar. NÃO diga que já montou nem que
      já está pronta: ela ainda não existe. Não mande link."""
PERGUNTA_CRIADA = """5. PERGUNTA DE BAIXO ATRITO: UMA só, no fim, que se responde com um "sim", neste jeito: "{pedido}" (adapte ao canal e ao tom;
   nunca use a palavra "link"). Não ofereça reunião nesta mensagem: a conversa rápida vem depois que ele vir a prévia."""
PERGUNTA_OFERECER = """5. PERGUNTA DE BAIXO ATRITO: UMA só, no fim, que se responde com um "sim", neste jeito: "{pedido}" (adapte ao canal e ao tom;
   nunca use a palavra "link"). Não ofereça reunião nesta mensagem."""

PONTO_SEM_SITE = """4. A LACUNA, O BENEFÍCIO E A PRÉVIA (é o coração da mensagem), em três frases curtas:
   a) Diga que NÃO encontrou um site do negócio e que quer confirmar se realmente não existe (como afirmação, sem ponto de
      interrogação, para a pergunta final ser a única; ex.: "não encontrei o site de vocês e queria confirmar se realmente ainda não existe").
   b) Diga como um site ajudaria ESTE negócio, na moeda dele: quem pesquisa no Google chega, vê serviços, fotos, horários e avaliações,
      e fala direto no WhatsApp, inclusive fora do horário de atendimento.
{previa_c}
   Não mande link neste primeiro toque."""

PONTO_COM_SITE = """4. A OPORTUNIDADE, O BENEFÍCIO E A PRÉVIA, em três frases curtas. O negócio já tem site, então NÃO diga que não achou:
   a) Cite com respeito UM ponto concreto, e SÓ se ele estiver listado no diagnóstico do dossiê (lento, sem botão de WhatsApp,
      pouco claro no celular). Se o dossiê não listar problema, NÃO invente: diga apenas que olhou o site e viu espaço para
      mostrar melhor o trabalho dele.
   b) Diga o que isso muda para o dono: o cliente que chega pelo celular decide e chama no WhatsApp com mais facilidade.
{previa_c}
   Não mande link neste primeiro toque."""


def lead_sem_site(site_status: Optional[str], faltando: Any = None) -> bool:
    """Sem site próprio: o Google não aponta site, ou aponta só rede social/agregador/WhatsApp."""
    if (site_status or "") in ("none", "social", "aggregator", "whatsapp"):
        return True
    if site_status == "own":
        return False
    return "website" in (faltando or [])

GATILHOS = """GATILHOS (no máximo dois, só se forem verdadeiros): especificidade (um detalhe que só vale para este negócio); prova social dele
(nota, avaliações, o que os clientes escrevem); reciprocidade (oferecer um esboço primeiro); um sim pequeno antes de qualquer reunião.
NUNCA: urgência ou escassez inventada, medo ("você está perdendo dinheiro"), número de mercado, comparação com concorrente nominal, promessa de resultado."""

TEMPERATURA = """TEMPERATURA: contato FRIO, não te conhece nem pediu nada: trate como um desconhecido educado; aquecer vem antes de vender. Sem preço e sem
link no primeiro toque; reunião nunca é exigência; o objetivo do toque 1 é ser respondido. Se o ramo tem hora de pico (guia do ramo), reconheça que
ele deve estar ocupado e seja breve."""


# Variações. Mensagens iguais em todos os números são o caminho mais curto para o spam: cada lead recebe a sua combinação (apresentação,
# o que faz, como chama a prévia, a pergunta final, o jeito de abrir e o tamanho). `n` é a posição no lote: números seguidos nunca repetem.
def escolher(pool: tuple, lead_id: str = "", n: int = 0, sal: str = "", passo: int = 1):
    base = zlib.crc32(f"{lead_id}|{sal}".encode("utf-8"))
    return pool[(base + int(n or 0) * passo) % len(pool)]


VALORES = (
    "ajudo negócios locais a serem encontrados e escolhidos no Google",
    "trabalho para que negócios como o seu apareçam mais quando o cliente pesquisa no Google",
    "ajudo quem tem negócio local a transformar buscas no Google em conversas no WhatsApp",
    "cuido da presença digital de negócios locais: site, Google e WhatsApp",
    "monto sites para negócios locais que querem ser achados com mais facilidade",
    "ajudo comércios e prestadores de serviço a aparecerem melhor na internet",
)
INTROS_COM_NOME = ("Eu sou {x}", "Aqui é {x}", "Me chamo {x}", "Sou {x}", "Meu nome é {x}")
INTROS_DA_EMPRESA = ("Eu sou da {x}", "Falo da {x}", "Sou da {x}", "Aqui é da {x}")
TERMOS_DA_PREVIA = ("a prévia", "o esboço", "uma versão de teste", "um modelo", "uma amostra", "o que montei")

# A pergunta final: um "sim" fácil, em palavras diferentes de um lead para o outro. Nenhuma usa a palavra "link" (soa como spam).
PEDIDOS_CRIADA = (
    "posso te mostrar? É rapidinho de ver, sem compromisso.",
    "quer dar uma olhada? Sem compromisso nenhum.",
    "posso te enviar a prévia pra você avaliar, sem compromisso?",
    "faz sentido eu te mostrar o que montei? Fica à vontade pra dizer não.",
    "te mando por aqui pra você dar uma espiada com calma?",
    "posso compartilhar com você? É só dar uma olhada, sem obrigação.",
    "quer que eu te mostre como ficou? Sem custo nem compromisso.",
    "posso deixar você ver? Se não curtir, sem problema nenhum.",
    "se você topar, te envio pra ver e me contar o que achou. Sem compromisso, tá?",
    "quer ver como ficou? Eu te mando agora, sem compromisso.",
)
PEDIDOS_OFERECER = (
    "posso montar essa prévia pra você dar uma olhada, sem compromisso?",
    "quer que eu monte um esboço pra você ver como ficaria? Sem compromisso nenhum.",
    "se fizer sentido, preparo uma versão de teste pra você avaliar. Pode ser?",
    "posso desenhar uma ideia de como ficaria o site de vocês, sem custo?",
    "topa que eu monte um modelo pra você ver, sem compromisso?",
    "te faço um esboço rápido, sem compromisso, pra você ver o que acha?",
    "posso preparar uma amostra de como poderia ficar? É sem compromisso.",
)
TAMANHOS = (
    "Entre 3 e 4 frases curtas.",
    "4 frases curtas; a última é a pergunta.",
    "Até 5 frases, bem enxutas.",
    "Bem curta: 3 frases e a pergunta.",
)

VOZ_HUMANA = """VOZ (a diferença entre gente e disparo): escreva como uma pessoa de verdade no WhatsApp, não como empresa. Frases curtas,
vocabulário de conversa ("pra", "tá", "rapidinho" são bem-vindos), sem "Prezado", "venho por meio desta", "gostaria de apresentar",
sem lista, sem negrito. Cite UM detalhe só deste negócio (a nota, o que os clientes elogiam, o bairro). Não copie um molde de frase:
esta mensagem tem a sua própria ordem e o seu próprio jeito. No máximo 1 emoji. {tamanho}
PROIBIDO abrir com pergunta solta sobre o negócio da pessoa ("como anda a agenda?", "como está o movimento?", "e as vendas?"): quem não te
conhece estranha e a mensagem perde o sentido. A única pergunta da mensagem é a última. Cada frase tem de fazer sentido para um desconhecido
que acabou de receber a mensagem: nada de supor o que ele está vivendo."""


def quem_sou(sender_name: str, apresentacao: str = "", lead_id: str = "", n: int = 0) -> str:
    valor = escolher(VALORES, lead_id, n, "valor", 5)
    if (apresentacao or "").strip():
        x = apresentacao.strip()
        pool = INTROS_COM_NOME if not x.lower().startswith("a equipe") else INTROS_COM_NOME[:2]
        return f"{escolher(pool, lead_id, n, 'intro', 3).format(x=x)} e {valor}"
    nome = (sender_name or "").strip()
    if not nome or nome.lower() in ("prospecção leadsage", "leadsage prospecção", "prospecção"):
        return f"Eu sou <seu nome>, {valor}"
    return f"{escolher(INTROS_DA_EMPRESA, lead_id, n, 'intro', 3).format(x=nome)} e {valor}"


ESTRUTURA_WHATSAPP = """COMO ESCREVER A PRIMEIRA MENSAGEM (prosa corrida, em linhas curtas, sem listas)
1. {saudacao}, <nome da pessoa se estiver no dossiê>! + quem você é em UMA frase curta, neste jeito: "{apresentacao}" (pode ajustar a ordem das palavras).
2. COMO ACHOU E A REPUTAÇÃO: diz que encontrou o negócio pesquisando no Google e cita o dado REAL do dossiê (nota, número de
   avaliações ou o que os clientes elogiam). Elogio verdadeiro, sem exagero.
3. {lacuna}
4. {previa_c}
5. {pergunta}
ESTILO DESTA MENSAGEM (para ela ser diferente das outras do lote): {estilo}
{voz}
{evitar}"""

ESTILOS_DE_ABERTURA = (
    "abra com o cumprimento e o nome, diga numa frase simpática que encontrou o negócio no Google e só depois se apresente.",
    "abra se apresentando em uma frase e logo diga o que chamou sua atenção no perfil (um detalhe REAL do dossiê).",
    "abra com o cumprimento, apresente-se e diga com naturalidade que ficou com uma ideia para o negócio, antes de falar da nota.",
    "abra pela reputação: comece citando a nota ou as avaliações e só depois se apresente.",
    "abra com o cumprimento e o nome, apresente-se e vá direto ao que achou no Google.",
    "abra com uma observação específica sobre o negócio (algo que os clientes elogiam) e depois se apresente.",
    "tom bem informal, como mensagem de WhatsApp entre conhecidos do bairro, com frases bem curtas.",
    "abra contando que estava pesquisando o ramo no Google quando viu o negócio; depois fale da nota.",
    "abra falando da prévia: diga que fez algo para a pessoa e explique por quê (reputação boa, mas sem site).",
)


def estilo_da_mensagem(lead_id: str = "", variacao: int = 0) -> str:
    """Um jeito de abrir que muda de um lead para outro (estavel por lead; a tentativa seguinte troca)."""
    base = sum(ord(c) for c in str(lead_id or "")) + int(variacao or 0)
    return ESTILOS_DE_ABERTURA[base % len(ESTILOS_DE_ABERTURA)]


def sorteio_da_mensagem(lead_id: str, previa: str, n: int) -> Dict[str, str]:
    """As variações desta mensagem: como chamar a prévia, a pergunta final e o tamanho (para não saírem iguais em todos os números)."""
    # "o que montei" só vale quando a prévia já existe: a que ainda vai ser montada nunca é dada como pronta
    termo = escolher(TERMOS_DA_PREVIA if previa != "oferecer" else TERMOS_DA_PREVIA[:5], lead_id, n, "termo", 5)
    pool = PEDIDOS_OFERECER if previa == "oferecer" else PEDIDOS_CRIADA
    pedido = escolher(pool, lead_id, n, "pedido", 3)
    return {
        "termo": termo,
        "pergunta": (f'UMA pergunta de sim, no fim, neste jeito: "{pedido}" (ajuste no máximo duas palavras ao negócio; não troque por outro molde, '
                     f'e NUNCA use a palavra "link"). Quando falar da prévia, chame de "{termo}".'),
        "tamanho": escolher(TAMANHOS, lead_id, n, "tamanho", 1),
    }


def estrutura(sender_name: str, agora: Optional[datetime] = None, sem_site: bool = True, previa: str = "",
              canal: str = "", lead_id: str = "", variacao: int = 0, evitar: Optional[list] = None, apresentacao: str = "") -> str:
    if (canal or "").startswith("whatsapp"):
        lacuna = ("Diz que, apesar dessa reputação, NÃO encontrou o site do negócio (como afirmação, sem ponto de interrogação)."
                  if sem_site else
                  "Cite com respeito UM ponto concreto do site atual SÓ se estiver no diagnóstico do dossiê; senão diga apenas que olhou o site e viu espaço para mostrá-lo melhor.")
        if previa == "oferecer":
            previa_c = ("Diz que, por isso, pode montar uma prévia do site dele(a) sem custo, para apresentar e mostrar o quanto isso pode ajudar "
                        "ainda mais o negócio (mais gente achando e chamando no WhatsApp). NÃO diga que já existe. Não mande link.")
        else:
            previa_c = ("Diz que, por isso, criou uma prévia do site dele(a), já pronta, para apresentar e mostrar o quanto isso pode ajudar ainda mais "
                        "o negócio (mais gente achando e chamando no WhatsApp). Não mande o link neste primeiro toque.")
        sorteio = sorteio_da_mensagem(lead_id, previa, variacao)
        pergunta = sorteio["pergunta"]
        passadas = [str(x).strip()[:80] for x in (evitar or []) if str(x).strip()][:6]
        return ESTRUTURA_WHATSAPP.format(
            saudacao=saudacao_do_horario(agora), apresentacao=quem_sou(sender_name, apresentacao, lead_id, variacao), lacuna=lacuna, previa_c=previa_c,
            pergunta=pergunta, estilo=estilo_da_mensagem(lead_id, variacao), voz=VOZ_HUMANA.format(tamanho=sorteio["tamanho"]),
            evitar=("NÃO comece como estas mensagens já usadas neste lote: " + " | ".join(f'"{p}"' for p in passadas)) if passadas else "",
        )
    return _estrutura_longa(sender_name, agora, sem_site, previa, apresentacao, lead_id, variacao)


def _estrutura_longa(sender_name: str, agora: Optional[datetime] = None, sem_site: bool = True, previa: str = "", apresentacao: str = "",
                     lead_id: str = "", variacao: int = 0) -> str:
    """`previa`: "criada", "oferecer" ou vazio (comportamento antigo: montou e oferece mostrar por aqui ou em 10 minutos)."""
    ponto = PONTO_SEM_SITE if sem_site else PONTO_COM_SITE
    antigo_c = ("   c) Diga que montou uma prévia de como o site dele poderia ficar e que gostaria de apresentá-la sem obrigação nenhuma.")
    previa_c = {"criada": PREVIA_CRIADA, "oferecer": PREVIA_OFERECER}.get(previa, antigo_c)
    texto = ESTRUTURA.format(
        saudacao=saudacao_do_horario(agora), apresentacao=quem_sou(sender_name, apresentacao, lead_id, variacao),
        ponto_do_site=ponto.format(previa_c=previa_c),
    )
    pergunta = {"criada": PERGUNTA_CRIADA, "oferecer": PERGUNTA_OFERECER}.get(previa)
    if pergunta:
        i = texto.index("5. PERGUNTA DE BAIXO ATRITO")
        pedido = escolher(PEDIDOS_OFERECER if previa == "oferecer" else PEDIDOS_CRIADA, lead_id, variacao, "pedido", 3)
        texto = texto[:i] + pergunta.format(pedido=pedido)
    return texto


def bloco_do_ramo(nicho: Optional[str]) -> str:
    return nicho_guia.bloco(nicho)


_CUMPRIMENTO = re.compile(r"\b(oi|ol[aá]|bom dia|boa tarde|boa noite|e a[ií])\b", re.I)
_APRESENTACAO = re.compile(
    r"\b(sou (?:a |o |da |do |d[aeo] )?\w+|me chamo|meu nome|aqui [ée]|falo da|falo do|trabalho (?:com|na|no|para|pra)|"
    r"sou d[aoe]|ajudo|ajudamos|cuido|criamos|crio|monto|fa[cç]o sites?|fazemos)\b",
    re.I,
)


_PERGUNTA_SOLTA = re.compile(
    r"\bcomo (?:anda|vai|est[aá]|est[aã]o|andam|v[aã]o)\b[^.?!]{0,25}\b(?:agenda|movimento|clientes?|neg[óo]cio|vendas|semana|dia|casa|cl[ií]nica|loja|pacientes?)\b[^.?!]{0,30}\?"
    r"|\b(?:e as vendas|e o movimento|e a agenda|tudo certo com (?:a |o )?(?:agenda|neg[óo]cio|movimento))\b[^.?!]{0,20}\?",
)


def tirar_pergunta_solta(texto: str) -> str:
    """Tira da mensagem a frase que pergunta pela vida do negócio sem sentido nenhum para um desconhecido ("Como anda a agenda em Botucatu?").
    A única pergunta da abordagem é a última; esta nunca chega ao cliente, mesmo que o modelo a escreva."""
    saida = []
    for linha in (texto or "").split("\n"):
        partes = re.split(r"(?<=[.!?])\s+", linha)
        mantidas = [p for p in partes if not _PERGUNTA_SOLTA.search(p.lower())]
        if mantidas or not linha.strip():
            saida.append(" ".join(mantidas))
    return "\n".join(saida).strip()


def revisar_calor(texto: str, canal: str = "email") -> list:
    """Defeitos de frieza: sem cumprimento ou sem dizer quem escreve."""
    problemas = []
    inicio = " ".join((texto or "").split()[:20])
    if not _CUMPRIMENTO.search(inicio):
        problemas.append("não começa cumprimentando (Oi/Olá/Bom dia + o nome, se souber); está seco demais")
    if not _APRESENTACAO.search(texto or ""):
        problemas.append("não diz quem está escrevendo nem o que faz; apresente-se em uma frase curta antes do motivo do contato")
    # pergunta solta sobre a vida do negócio logo no começo ("Como anda a agenda em Botucatu?"): não faz sentido para quem não te conhece
    if _PERGUNTA_SOLTA.search(inicio.lower()):
        problemas.append("abre com uma pergunta solta sobre o negócio (ex.: \"como anda a agenda?\"): quem não te conhece estranha; "
                         "cumprimente, apresente-se e diga por que está escrevendo")
    return problemas


def revisar_roteiro(texto: str, sem_site: bool, previa: str = "") -> list:
    """A mensagem precisa trazer o que o dono pediu: a prévia e, sem site, a confirmação."""
    t = (texto or "").lower()
    problemas = []
    if previa in ("criada", "oferecer"):
        coisa = r"(pr[eé]via|esbo[çc]o|vers[aã]o|modelo|amostra|o que (?:eu )?(?:montei|fiz|preparei)|ideia)"
        montou = re.search(r"\b(montei|preparei|criei|fiz|deixei|desenhei|elaborei)\b[^.?!]{0,50}" + coisa, t) or re.search(r"o que (?:eu )?(?:montei|fiz|preparei)", t)
        if re.search(r"\blink\b", t):
            problemas.append('usa a palavra "link" no primeiro toque (soa como spam): fale da prévia, do esboço ou do que você montou')
        if previa == "criada":
            if not montou:
                problemas.append("não diz que você já montou a prévia do site")
            if not re.search(r"(mand|envi|mostr|compartilh|dar uma (?:olhada|espiada)|\bver\b|avali|conferir)", t):
                problemas.append("não pede licença para mostrar a prévia (uma pergunta fácil, ex.: \"quer dar uma olhada?\")")
        else:
            if montou:
                problemas.append("diz que já montou a prévia, mas ela ainda não existe: ofereça montar")
            if not re.search(r"(posso|quer|gostaria|topa|faz sentido|se (?:fizer|quiser)|te fa[çc]o)[^.?!]{0,50}(mont|cri|prepar|fazer|desenh|esbo|ideia|amostra|versão|versao)", t):
                problemas.append("não oferece montar a prévia (uma pergunta fácil, ex.: \"quer que eu monte um esboço pra você ver?\")")
        if sem_site and not re.search(r"confirmar|realmente|de fato|certeza|existe|n[aã]o tem|n[aã]o encontr", t):
            problemas.append("não diz que não encontrou o site e que quer confirmar se realmente não existe")
        if not re.search(r"sem compromisso|sem obriga|sem custo|sem press|à vontade|a vontade|dizer n[aã]o|sem problema|com calma|se (?:fizer sentido|voc[eê] topar|topar|quiser)|se n[aã]o (?:curtir|gostar|fizer)|s[óo] (?:dar|pra dar) uma (?:olhada|espiada)", t):
            problemas.append("não deixa claro que é sem compromisso")
        return problemas
    if not re.search(r"(montei|preparei|criei|fiz|deixei)[^.?!]{0,40}(pr[eé]via|esbo[çc]o)", t):
        problemas.append("não diz que você já montou uma prévia do site (use: \"montei uma prévia\") para apresentar sem compromisso")
    if sem_site and not re.search(r"confirmar|realmente|de fato|certeza|existe|n[aã]o tem", t):
        problemas.append("não diz que não encontrou o site e que quer confirmar se realmente não existe")
    if not re.search(r"sem compromisso|sem obriga[çc][aã]o|sem nenhuma obriga|sem custo|sem press", t):
        problemas.append("não deixa claro que apresentar a prévia é sem compromisso nem obrigação")
    if not re.search(r"10 ?min", t):
        problemas.append("não oferece o papo rápido de uns 10 minutos como alternativa")
    return problemas
