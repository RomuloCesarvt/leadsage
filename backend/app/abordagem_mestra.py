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

PONTO_SEM_SITE = """4. A LACUNA, O BENEFÍCIO E A PRÉVIA (é o coração da mensagem), em três frases curtas:
   a) Diga que NÃO encontrou um site do negócio e que quer confirmar se realmente não existe (como afirmação, sem ponto de
      interrogação, para a pergunta final ser a única; ex.: "não encontrei o site de vocês e queria confirmar se realmente ainda não existe").
   b) Diga como um site ajudaria ESTE negócio, na moeda dele: quem pesquisa no Google chega, vê serviços, fotos, horários e avaliações,
      e fala direto no WhatsApp, inclusive fora do horário de atendimento.
   c) Diga que montou uma prévia de como o site dele poderia ficar e que gostaria de apresentá-la sem obrigação nenhuma.
   Não mande link neste primeiro toque."""

PONTO_COM_SITE = """4. A OPORTUNIDADE, O BENEFÍCIO E A PRÉVIA, em três frases curtas. O negócio já tem site, então NÃO diga que não achou:
   a) Cite com respeito UM ponto concreto, e SÓ se ele estiver listado no diagnóstico do dossiê (lento, sem botão de WhatsApp,
      pouco claro no celular). Se o dossiê não listar problema, NÃO invente: diga apenas que olhou o site e viu espaço para
      mostrar melhor o trabalho dele.
   b) Diga o que isso muda para o dono: o cliente que chega pelo celular decide e chama no WhatsApp com mais facilidade.
   c) Diga que montou uma prévia de como o site poderia ficar e que gostaria de apresentá-la sem obrigação nenhuma.
   Não mande link neste primeiro toque."""


def lead_sem_site(site_status: Optional[str], faltando: Any = None) -> bool:
    """Sem site próprio: o Google não aponta site, ou aponta só rede social/agregador/WhatsApp."""
    if (site_status or "") in ("none", "social", "aggregator", "whatsapp"):
        return True
    if site_status == "own":
        return False
    return "website" in (faltando or [])

GATILHOS = """GATILHOS QUE VOCÊ PODE USAR (escolha no máximo dois, só se forem verdadeiros)
- Especificidade: um detalhe que só vale para este negócio prova que você olhou.
- Prova social dele: a nota, as avaliações e o que os clientes escrevem são a melhor abertura.
- Reciprocidade: oferecer primeiro (um esboço, um olhar rápido no perfil) cria vontade de responder.
- Coerência e baixo atrito: peça um sim pequeno antes de qualquer reunião.
- Autoridade discreta: demonstre que conhece o ramo pelas perguntas que faz, não por se elogiar.
NUNCA: urgência ou escassez inventada ("só hoje", "últimas vagas"), medo ("você está perdendo dinheiro"), número de mercado,
comparação com concorrente nominal, promessa de resultado."""

TEMPERATURA = """TEMPERATURA E MOMENTO
- O contato é FRIO: ele não conhece você nem pediu nada. Trate como um desconhecido educado: aquecer vem antes de vender.
- Não fale de preço e não mande link no primeiro toque. Oferecer a prévia sem compromisso, "por aqui mesmo ou numa conversa rápida",
  é o convite certo; reunião nunca é exigência. O objetivo do toque 1 é ser respondido.
- Se o ramo tem hora de pico (veja o guia do ramo), reconheça que ele deve estar ocupado e mostre que a mensagem é rápida."""


def quem_sou(sender_name: str) -> str:
    nome = (sender_name or "").strip()
    if not nome or nome.lower() in ("prospecção leadsage", "leadsage prospecção", "prospecção"):
        return "Eu sou <seu nome>, ajudo negócios locais a serem encontrados e escolhidos no Google"
    return f"Eu sou da {nome} e ajudo negócios locais a serem encontrados e escolhidos no Google"


def estrutura(sender_name: str, agora: Optional[datetime] = None, sem_site: bool = True) -> str:
    return ESTRUTURA.format(
        saudacao=saudacao_do_horario(agora), apresentacao=quem_sou(sender_name),
        ponto_do_site=PONTO_SEM_SITE if sem_site else PONTO_COM_SITE,
    )


def bloco_do_ramo(nicho: Optional[str]) -> str:
    return nicho_guia.bloco(nicho)


_CUMPRIMENTO = re.compile(r"\b(oi|ol[aá]|bom dia|boa tarde|boa noite|e a[ií])\b", re.I)
_APRESENTACAO = re.compile(
    r"\b(sou (?:a |o |da |do |d[aeo] )?\w+|me chamo|meu nome|aqui [ée]|falo da|falo do|trabalho (?:com|na|no)|"
    r"sou d[aoe]|ajudo|ajudamos|cuido|criamos|crio|fa[cç]o sites?|fazemos)\b",
    re.I,
)


def revisar_calor(texto: str, canal: str = "email") -> list:
    """Defeitos de frieza: sem cumprimento ou sem dizer quem escreve."""
    problemas = []
    inicio = " ".join((texto or "").split()[:10])
    if not _CUMPRIMENTO.search(inicio):
        problemas.append("não começa cumprimentando (Oi/Olá/Bom dia + o nome, se souber); está seco demais")
    if not _APRESENTACAO.search(texto or ""):
        problemas.append("não diz quem está escrevendo nem o que faz; apresente-se em uma frase curta antes do motivo do contato")
    return problemas


def revisar_roteiro(texto: str, sem_site: bool) -> list:
    """A mensagem precisa trazer o que o dono pediu: a prévia e, sem site, a confirmação."""
    t = (texto or "").lower()
    problemas = []
    if not re.search(r"(montei|preparei|criei|fiz|deixei)[^.?!]{0,40}(pr[eé]via|esbo[çc]o)", t):
        problemas.append("não diz que você já montou uma prévia do site (use: \"montei uma prévia\") para apresentar sem compromisso")
    if sem_site and not re.search(r"confirmar|realmente|de fato|certeza|existe|n[aã]o tem", t):
        problemas.append("não diz que não encontrou o site e que quer confirmar se realmente não existe")
    if not re.search(r"sem compromisso|sem obriga[çc][aã]o|sem nenhuma obriga", t):
        problemas.append("não deixa claro que apresentar a prévia é sem compromisso nem obrigação")
    if not re.search(r"10 ?min", t):
        problemas.append("não oferece o papo rápido de uns 10 minutos como alternativa")
    return problemas
