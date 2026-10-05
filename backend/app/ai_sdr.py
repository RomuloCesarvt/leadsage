"""O SDR: a conversa de venda depois que o lead responde.

A primeira versao do robo sabia o nome, o ramo e a nota do lead, e
conversava sem memoria de em que ponto da venda estava. Aqui ele trabalha
como um SDR de verdade:

- **dossie**: antes de responder, le o que se sabe daquele negocio — o
  raio-x (o que os clientes elogiam e reclamam no Google, quem cuida do
  digital, o que falta no perfil), o diagnostico da busca e o site que
  ja foi gerado para ele. Cada conversa parte do negocio daquela pessoa,
  nao de um roteiro;
- **metodo**: etapas de SDR, perguntas de descoberta e um caminho para
  cada objecao comum;
- **memoria**: a cada resposta o modelo devolve a etapa, a temperatura,
  o que ja descobriu (quem decide, dor, orcamento, prazo) e as objecoes.
  Isso volta na proxima mensagem — a conversa tem continuidade;
- **limites do dono**: catalogo, perguntas frequentes, desconto maximo e
  se pode fechar a venda ou so agendar. O que nao estiver la, nao existe.

Persuasao, so a legitima: prova social com a nota REAL do lead, aversao
a perda com o cliente que procura e cai no concorrente, reciprocidade com
o site ja pronto, pequenos compromissos. Urgencia ou escassez inventada,
depoimento falso e insistencia depois de um "nao" ficam proibidos — sao
enganosos e sao exatamente o que faz o numero ser denunciado e banido.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

ETAPAS = ("abertura", "descoberta", "diagnostico", "proposta", "objecao", "agendamento", "fechamento", "perdido")
TEMPERATURAS = ("frio", "morno", "quente")

# Objecoes comuns em prospeccao de servico digital para negocio local,
# com o caminho que funciona. E o que separa um SDR de um atendente.
OBJECOES = """
- "Já tenho alguém que cuida" / "já tenho agência": não critique o atual. Elogie que ele investe nisso e
  ofereça um olhar de fora sobre o que o dossiê mostra que falta (ex.: perfil do Google incompleto).
  Pergunte se ele está satisfeito com os resultados — sem pressionar.
- "Não preciso de site" / "o Instagram resolve": concorde que o Instagram é importante e mostre o que
  ele perde: quem procura no Google ("<ramo> perto de mim") não encontra; o perfil do Google não leva a
  lugar nenhum. Use os números reais do dossiê.
- "Tá caro" / "quanto custa?": antes do preço, ancore no valor (o que muda para o negócio dele). Se o
  preço está no catálogo, diga; se não, diga que depende do escopo e proponha a conversa. Desconto só
  até o limite autorizado, e só como contrapartida (pagamento à vista, fechar o pacote).
- "Não tenho tempo": mostre que o trabalho é seu, não dele — ele aprova, você faz. Proponha algo de
  10 minutos.
- "Vou pensar" / "depois eu vejo": respeite. Pergunte, com leveza, o que falta para ele decidir —
  geralmente é uma dúvida não dita. Ofereça mandar algo concreto (o site pronto, um exemplo).
- "Manda por e-mail" / "manda mais informação": mande o essencial em 2 linhas e o link do site que
  já foi preparado, se houver; não despeje um texto longo.
- "Quem é você?" / "como conseguiu meu número?": transparência total — o número é o público do perfil
  do Google do negócio, e você é assistente virtual de quem oferece o serviço.
- "Não tenho interesse": agradeça, não insista. No máximo uma pergunta aberta e gentil ("posso saber se é
  o momento ou o serviço?"). Se repetir, encerre com educação.
"""


def _formatar_dossie(lead: Optional[Dict[str, Any]], raio: Optional[Dict[str, Any]]) -> str:
    if not lead and not raio:
        return ("Não há dados sobre este negócio. Descubra na conversa: o que ele faz, como os clientes "
                "o encontram hoje e quem cuida das redes e do Google.")
    linhas: List[str] = []
    lead = lead or {}
    nome = lead.get("company") or lead.get("name") or (raio or {}).get("gmn", {}).get("nome")
    if nome:
        linhas.append(f"Negócio: {nome}")
    for chave, rotulo in (("niche", "Ramo"), ("city", "Cidade")):
        if lead.get(chave):
            linhas.append(f"{rotulo}: {lead[chave]}")
    if lead.get("rating"):
        linhas.append(f"Google: nota {lead['rating']} com {lead.get('rating_count') or 0} avaliações")
    if lead.get("missingDigitalAssets"):
        linhas.append("O que falta no digital: " + ", ".join(lead["missingDigitalAssets"]))
    if lead.get("diagnosis"):
        linhas.append(f"Diagnóstico da busca: {lead['diagnosis']}")
    for g in (lead.get("hooks") or [])[:3]:
        linhas.append(f"Gancho verificado: {g}")
    if lead.get("site_publicado"):
        linhas.append(f"Site que JÁ foi preparado para ele (pode mandar o link): {lead['site_publicado']}")

    if raio:
        g = raio.get("gmn") or {}
        if g.get("resumo_avaliacoes"):
            linhas.append(f"O que os clientes dizem no Google (resumo do Google): {g['resumo_avaliacoes']}")
        faltando = [i["item"] for i in g.get("itens", []) if i.get("ok") is False]
        if faltando:
            linhas.append("Perfil do Google sem: " + ", ".join(faltando))
        q = raio.get("quem_cuida") or {}
        if q.get("rotulo"):
            linhas.append(f"Quem cuida do digital: {q['rotulo']} (confiança {q.get('confianca', '?')})")
            for e in (q.get("evidencias") or [])[:4]:
                linhas.append(f"  - {e}")
            if q.get("abordagem"):
                linhas.append(f"Abordagem indicada: {q['abordagem']}")
        s = raio.get("site") or {}
        for p in (s.get("problemas") or [])[:3]:
            linhas.append(f"Problema no site atual: {p}")
        ig = raio.get("instagram") or {}
        if ig.get("disponivel"):
            linhas.append(
                f"Instagram @{ig.get('usuario')}: {ig.get('seguidores')} seguidores, "
                f"{ig.get('posts_90_dias')} posts em 90 dias, último há {ig.get('dias_desde_ultimo_post')} dias"
            )
    return "\n".join(linhas)


def _formatar_estado(sdr: Dict[str, Any]) -> str:
    if not sdr:
        return "Início da conversa: nada descoberto ainda."
    dados = sdr.get("dados") or {}
    partes = [
        f"Etapa: {sdr.get('etapa', 'abertura')} · temperatura: {sdr.get('temperatura', 'frio')}",
        "Já descoberto: " + ("; ".join(f"{k}: {v}" for k, v in dados.items() if v) or "nada"),
    ]
    if sdr.get("objecoes"):
        partes.append("Objeções já levantadas: " + ", ".join(sdr["objecoes"]))
    if sdr.get("recusas"):
        partes.append(
            f"ATENÇÃO: a pessoa acabou de recusar ({sdr['recusas']}ª vez). Agradeça, não argumente, "
            "e faça no máximo UMA pergunta aberta e gentil (é o momento ou o serviço?). Nada de nova oferta."
        )
    if sdr.get("proximo_passo"):
        partes.append(f"Próximo passo combinado: {sdr['proximo_passo']}")
    return "\n".join(partes)


def _brl(v: float) -> str:
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".").replace(",00", "")


def _regra_de_desconto(cfg: Dict[str, Any]) -> str:
    """A conta pronta. Pedir ao modelo que calcule 10% em cima do catalogo
    e pedir que ele erre — medido: ele inventou motivo duas vezes em vez de
    chegar no valor."""
    import re

    desconto = int(cfg.get("desconto_maximo") or 0)
    if not desconto:
        return ("Nenhum desconto autorizado. Se pedirem, diga com simpatia que o valor é esse e reforce "
                "o que está incluso — sem inventar motivo.")
    linhas = [f"Desconto máximo: {desconto}%, só em troca de algo (pagamento à vista ou fechar agora). Valores mínimos:"]
    for item in (cfg.get("catalogo") or "").splitlines():
        m = re.search(r"R\$\s*([\d.]+(?:,\d{1,2})?)", item)
        if not m:
            continue
        cheio = float(m.group(1).replace(".", "").replace(",", "."))
        nome = item[: m.start()].strip(" :-–") or "item"
        linhas.append(f"  - {nome}: de {_brl(cheio)} até no mínimo {_brl(cheio * (1 - desconto / 100))}")
    linhas.append('Se pedirem menos que o mínimo, responda assim, sem justificativa: '
                  '"Nesse valor eu não consigo, mas fechando à vista consigo <valor mínimo>. Fica bom pra você?"')
    return "\n".join(linhas)


def _agora_brasil(agora: Optional[datetime] = None) -> str:
    t = (agora or datetime.now(timezone.utc)) - timedelta(hours=3)
    dias = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]
    return f"{dias[t.weekday()]}, {t.strftime('%d/%m/%Y %H:%M')} (horário de Brasília)"


def montar_prompt(
    mensagens: List[Dict[str, Any]],
    canal: str,
    perfil: Dict[str, Any],
    cfg: Dict[str, Any],
    lead: Optional[Dict[str, Any]],
    raio: Optional[Dict[str, Any]] = None,
    sdr: Optional[Dict[str, Any]] = None,
    agora: Optional[datetime] = None,
) -> str:
    quem = perfil.get("company_name") or perfil.get("name") or "a empresa"
    assistente = cfg.get("nome_assistente") or "assistente virtual"
    oferta = perfil.get("product_description") or "serviços de presença digital (site, Google e redes sociais)"
    vender = cfg.get("objetivo") == "vender"
    meta = {
        "agendar": "marcar uma conversa de 15 minutos com o responsável (ligação ou vídeo)",
        "site": "fazer a pessoa abrir o site que já foi preparado para o negócio dela e ouvir a opinião",
        "qualificar": "entender se há interesse, quem decide, a dor e o momento — e só então propor a conversa",
        "vender": "fechar a venda pela conversa, dentro do catálogo e das condições autorizadas",
    }.get(cfg.get("objetivo") or "agendar", "marcar uma conversa com o responsável")
    desconto = int(cfg.get("desconto_maximo") or 0)
    limite_palavras = 45 if canal == "whatsapp" else 35

    historico = "\n".join(
        f"{'CLIENTE' if m.get('de') == 'contato' else ('VOCÊ' if m.get('de') == 'robo' else quem.upper() + ' (humano)')}: {m.get('texto', '')}"
        for m in mensagens[-30:]
    )

    return f"""Você é {assistente}, SDR de {quem}, conversando pelo {canal} com o dono de um negócio local.
Agora é {_agora_brasil(agora)}.

== O QUE {quem.upper()} VENDE ==
{oferta}
{f"Catálogo e preços (só estes existem):{chr(10)}{cfg['catalogo']}" if cfg.get('catalogo') else "Não há catálogo de preços: NUNCA diga valores; diga que depende do escopo e proponha a conversa."}
{f"Perguntas frequentes (respostas oficiais):{chr(10)}{cfg['faq']}" if cfg.get('faq') else ""}
{_regra_de_desconto(cfg)}
{f"Link para agendar: {cfg['link_agenda']}" if cfg.get('link_agenda') else ""}
Instruções do dono: {cfg.get('instrucoes') or '(nenhuma)'}

== SEU OBJETIVO ==
{meta}.

== DOSSIÊ DESTE NEGÓCIO (use; é o que torna a conversa única) ==
{_formatar_dossie(lead, raio)}

== ONDE A CONVERSA ESTÁ ==
{_formatar_estado(sdr or {})}

== MÉTODO ==
Avance uma etapa por vez: abertura → descoberta → diagnóstico → proposta → {"fechamento" if vender else "agendamento"}.
- Descoberta: perguntas abertas, uma por mensagem. Descubra quem decide, como os clientes chegam hoje,
  o que incomoda, se já tentou algo antes e se há prazo ou orçamento. Não pergunte o que o dossiê já responde.
- Diagnóstico: devolva UM fato específico do dossiê que conecte com a dor dita por ele. Concreto, verificável.
- Proposta: o que muda para o negócio dele, não a lista técnica do serviço.
- {"Fechamento: confirme escopo, preço do catálogo e forma de pagamento; ao aceitar, passe para o humano formalizar." if vender else "Agendamento: proponha dois horários concretos (ou o link), evitando o pico do negócio dele (padaria cedo, restaurante no almoço e no jantar, comércio no sábado). Confirmado o horário, passe para o humano."}
- Lead frio que só respondeu "oi": devolva com o gancho mais forte do dossiê e uma pergunta.

== OBJEÇÕES ==
{OBJECOES}

== PERSUASÃO: SÓ A LEGÍTIMA ==
Use: prova social com dados REAIS do dossiê (a nota dele, as avaliações dele); aversão à perda (o cliente que
procura e cai no concorrente); reciprocidade (o site/diagnóstico já feito para ele); pequenos sins antes do pedido
maior; espelhar as palavras dele.
PROIBIDO: urgência ou escassez inventada ("só hoje", "últimas vagas"), casos ou depoimentos que não estejam acima,
resultado garantido, falar mal de concorrente, insistir depois de um "não" claro, pedir CPF, senha ou dado sensível,
e inventar justificativa (custo, margem, agenda cheia) — para negar um desconto basta dizer que não é possível.

== FORMA ==
- Português do Brasil, tom de conversa. Responda em 1 ou 2 mensagens curtas (no máximo {limite_palavras} palavras cada),
  como uma pessoa escreve no {canal}. Uma pergunta por vez. Sem lista, sem "Prezado", no máximo 1 emoji.
- Use o nome da pessoa quando souber. Espelhe o nível de formalidade dela.
- NUNCA invente preço, prazo, garantia ou fato sobre o negócio. Se não souber, diga que confirma com o responsável.
- Se perguntarem se você é robô: diga que é o assistente virtual de {quem}.

== QUANDO PASSAR PARA O HUMANO ==
Horário de reunião confirmado; aceitou a proposta; quer negociar além do autorizado; pergunta técnica ou jurídica
que você não sabe; reclamação; pedido explícito para falar com uma pessoa.

== CONVERSA ==
{historico}

== RESPONDA SÓ COM ESTE JSON ==
{{"mensagens": ["primeira mensagem", "segunda (opcional)"],
 "etapa": "{'|'.join(ETAPAS)}",
 "temperatura": "frio|morno|quente",
 "dados": {{"nome": "", "decisor": "", "dor": "", "canal_atual": "", "orcamento": "", "prazo": ""}},
 "objecao": "tipo da objeção desta mensagem, ou vazio",
 "proximo_passo": "o que você está buscando na próxima resposta",
 "passar_para_humano": false,
 "motivo": "por que passar (só se passar)",
 "reuniao": "SÓ quando o CLIENTE confirmou um dia e horário exatos que você ofereceu; se você propôs e ele ainda não respondeu, vazio"}}

Regras dos dados: "orcamento" é quanto o CLIENTE disse que pode investir (nunca o preço do catálogo);
"decisor" é quem decide a compra; deixe vazio o que ele não disse.
"""


def _texto(v: Any, limite: int = 200) -> str:
    return str(v or "").strip()[:limite]


def normalizar(dados: Dict[str, Any], anterior: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Confere o que o modelo devolveu e funde com o estado anterior.

    Modelo esquece campo, inventa etapa e as vezes devolve "resposta" no
    lugar de "mensagens". O estado nao pode regredir por isso: o que ja foi
    descoberto continua descoberto se o modelo devolver vazio.
    """
    anterior = anterior or {}
    msgs = dados.get("mensagens")
    if isinstance(msgs, str):
        msgs = [msgs]
    if not msgs and dados.get("resposta"):
        msgs = [dados["resposta"]]
    msgs = [_texto(m, 700) for m in (msgs or []) if _texto(m)][:2]

    etapa = dados.get("etapa") if dados.get("etapa") in ETAPAS else anterior.get("etapa", "abertura")
    temp = dados.get("temperatura") if dados.get("temperatura") in TEMPERATURAS else anterior.get("temperatura", "frio")

    descobertos = dict(anterior.get("dados") or {})
    for k, v in (dados.get("dados") or {}).items():
        if k in ("nome", "decisor", "dor", "canal_atual", "orcamento", "prazo") and _texto(v):
            descobertos[k] = _texto(v)

    objecoes = list(anterior.get("objecoes") or [])
    nova = _texto(dados.get("objecao"), 60)
    if nova and nova not in objecoes:
        objecoes.append(nova)

    return {
        "mensagens": msgs,
        "sdr": {
            "recusas": int(anterior.get("recusas") or 0),
            "etapa": etapa,
            "temperatura": temp,
            "dados": descobertos,
            "objecoes": objecoes[-8:],
            "proximo_passo": _texto(dados.get("proximo_passo")) or anterior.get("proximo_passo", ""),
            "reuniao": _texto(dados.get("reuniao"), 80) or anterior.get("reuniao", ""),
        },
        "passar_para_humano": bool(dados.get("passar_para_humano")),
        "motivo": _texto(dados.get("motivo")),
    }


# ------------------------------------------------------------ verificador
#
# Instrucao no prompt nao basta: medido em 2026-10-04, o modelo negou um
# desconto dizendo "fica abaixo do nosso custo de producao" mesmo com a
# proibicao escrita. Numa conversa de venda, um preco ou um motivo
# inventado e o tipo de erro que vira reclamacao. Entao a resposta e
# conferida em codigo antes de sair.

import re as _re

_VALOR = _re.compile(r"R\$\s*([\d.]+(?:,\d{1,2})?)")
_JUSTIFICATIVA = _re.compile(
    r"\b(nosso custo|custo de (produ|entrega|opera)|abaixo do (nosso )?custo|margem|preju[ií]zo|"
    r"agenda (est[aá] )?(cheia|lotada)|[uú]ltimas? vagas?|s[oó] (hoje|at[eé] hoje)|promo[cç][aã]o rel[aâ]mpago)\b",
    _re.I,
)


def _num(texto: str) -> float:
    try:
        return float(texto.replace(".", "").replace(",", "."))
    except ValueError:
        return -1.0


def valores_permitidos(cfg: Dict[str, Any], mensagens: List[Dict[str, Any]]) -> List[float]:
    """Os valores que o robo pode citar: os do catalogo, esses mesmos com
    o desconto autorizado, e os que o proprio cliente disse."""
    base = [_num(v) for v in _VALOR.findall(cfg.get("catalogo") or "")]
    desconto = int(cfg.get("desconto_maximo") or 0)
    permitidos = list(base)
    for v in base:
        permitidos += [round(v * (1 - d / 100), 2) for d in range(1, desconto + 1)]
    for m in mensagens:
        if m.get("de") == "contato":
            permitidos += [_num(v) for v in _VALOR.findall(m.get("texto", ""))]
            permitidos += [_num(v) for v in _re.findall(r"\b(\d{3,6})\b", m.get("texto", ""))]
    return [v for v in permitidos if v > 0]


def problemas_da_resposta(textos: List[str], cfg: Dict[str, Any], mensagens: List[Dict[str, Any]]) -> List[str]:
    erros: List[str] = []
    permitidos = valores_permitidos(cfg, mensagens)
    for t in textos:
        for v in _VALOR.findall(t):
            n = _num(v)
            if n > 0 and not any(abs(n - p) <= max(1.0, p * 0.001) for p in permitidos):
                erros.append(
                    f"você citou R$ {v}, que não está no catálogo nem dentro do desconto autorizado"
                    if cfg.get("catalogo") else f"você citou R$ {v}, mas não há catálogo: não diga valores"
                )
        m = _JUSTIFICATIVA.search(t)
        if m:
            erros.append(f'você usou "{m.group(0)}", que é justificativa ou urgência inventada')
    return erros
