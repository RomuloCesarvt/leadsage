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
import re as _re
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from app import agentes, ai_oferta, identidade, nicho_guia, playbook_vendas, previa_honesta, quem_fala
from app.playbook_sites import FALA_DO_ROBO_SOBRE_SITES

ETAPAS = ("abertura", "descoberta", "diagnostico", "proposta", "objecao", "agendamento", "fechamento", "perdido")
TEMPERATURAS = ("frio", "morno", "quente")

# Objecoes comuns em prospeccao de servico digital para negocio local,
# com o caminho que funciona. E o que separa um SDR de um atendente.
OBJECOES = """
Técnica de TODA objeção, em 2 ou 3 frases curtas: (1) acolha em meia frase, sem discutir; (2) vire a objeção com UM fato real
(o dossiê, o ramo, a prévia pronta); (3) peça um passo mínimo, de sim ou não. UMA tentativa por objeção: se ele repetir o não, encerre com educação.
- "Já tenho quem cuide" / "já tenho agência" / "meu marido (ou parente, amigo, sócio) faz o site" / "já tenho site": NÃO HÁ O QUE FAZER. Não critique, não insista,
  não ofereça outra coisa. Uma frase de despedida educada ("Que bom que já tem alguém de confiança! Obrigado pela atenção e muito sucesso.") e
  encerre ("tipo": "agradecimento", "etapa": "perdido", "mensagens" com só essa despedida). Quem recusa com motivo não volta a ser abordado.
- "Não preciso de site" / "o Instagram resolve": concorde e vire. Ex.: "O Instagram ajuda muito mesmo! O ponto é quem já quer comprar e pesquisa
  '<ramo> perto de mim' no Google: ali ele não chega no Instagram, chega no concorrente que aparece. Posso te mostrar em 1 minuto como ficaria o seu?"
  Use os números reais do dossiê quando houver.
- PREÇO (ver "OBJEÇÃO DE PREÇO" quando aparecer): "estou sem condições" / "tá caro" / "mês fraco" / "sem dinheiro agora": gancho e o humano assume.
  NUNCA responda "vou ver o valor".
- "Quanto custa?" (pergunta, sem reclamar): benefício primeiro, depois o valor do catálogo, depois um próximo passo. Desconto só até o limite
  autorizado, e só como contrapartida (pagamento à vista, fechar o pacote).
- "Não tenho tempo": vire a favor dele. Ex.: "Por isso mesmo eu cuido de tudo: você só aprova. Te mando a prévia agora e você vê quando der, leva 30 segundos."
- "Vou pensar" / "depois eu vejo": respeite e descubra a dúvida não dita. Ex.: "Claro! Só pra eu te ajudar a decidir: o que pesa mais, o valor, o momento
  ou ver como fica antes?" Ofereça algo concreto (a prévia) para ele decidir com ela na mão. Nunca "fico no aguardo".
- "Agora não" / "no momento não": uma tentativa só. Ex.: "Sem problema! Só te digo que quem pesquisa hoje no Google já cai no concorrente. Quer só dar uma
  olhada na prévia, sem compromisso? Se não fizer sentido, eu paro por aqui."
- "Manda por e-mail" / "manda mais informação": mande o essencial em 2 linhas e o link do site que já foi preparado, se houver; não despeje um texto longo.
- "Quem é você?" / "como conseguiu meu número?": transparência total — o número é o público do perfil
  do Google do negócio, e você é assistente virtual de quem oferece o serviço.
- "Preciso falar com meu sócio / marido / esposa": ótimo, quem decide precisa ver. Ofereça incluir a pessoa
  na conversa de 15 minutos ou mande o essencial para ela ver (link do site pronto). Pergunte o melhor horário para os dois.
- "Já tentei e não deu resultado": valide sem criticar quem fez. Pergunte o que foi feito e o que faltou;
  mostre que o seu método é outro e que a prévia prova antes de ele gastar qualquer coisa.
- "Tem exemplo? Tem portfólio?": mande o que existir (o site já preparado dele é o melhor exemplo). Não invente
  clientes nem resultados.
- "Isso é golpe? Vocês existem?" / "de onde vocês são?": seja transparente — nome da empresa, que é assistente
  virtual, que o contato veio do perfil público do Google, e ofereça uma ligação para ele conferir quem é.
- "Não tenho interesse" (sem motivo e sem "agora"): agradeça e encerre; no máximo uma pergunta aberta e gentil ("posso saber se é
  o momento ou o serviço?"). Se repetir, encerre com educação.
"""

# ------------------------------------------------------------ objecao de preco
#
# "Estou sem condicoes" nao e um "nao": e a hora de virar a conversa e chamar a pessoa. O robo da o gancho (a condicao especial REAL
# que o dono cadastrou) e o humano assume para passar o valor. Dizer "vou ver o valor" esfria e deixa o cliente sozinho.

_PADROES_DE_PRECO = (
    r"sem (condic\w*|dinheiro|grana|verba|orcamento|budget|capital)",
    r"nao (tenho|temos) (como pagar|dinheiro|grana|condic\w*|verba|orcamento|esse valor|essa grana)",
    r"nao (posso|podemos|consigo|conseguimos) pagar",
    r"fora d[oa] (meu |nosso )?(orcamento|bolso|alcance)",
    r"nao cabe (no|em) (meu |nosso )?(bolso|orcamento)",
    r"(mes|periodo|momento|epoca|fase|ano) (fraco|dificil|ruim|apertado|complicado)",
    r"(dinheiro|orcamento|bolso|caixa|financeiro|financeiramente|grana) (esta |ta |anda |ficou )?(apertad\w*|curto|dificil|complicad\w*|zerad\w*)",
    r"(apertad\w*|complicad\w*|dificil|ruim) (de dinheiro|financeiramente|no financeiro|de grana)",
    r"\b(ta|esta|ficou|achei|muito|bem|bastante|meio|um pouco|pouco) (muito |bem |bastante |um pouco )?(caro|salgado|puxado)\b",
    r"\bcaro (demais|pra mim|para mim|para o meu|pro meu)\b",
    r"(valor|preco)( esta| ta| ficou| e| ficou muito)? (muito |bem |bastante |meio )?(alto|puxado|salgado|pesado)",
    r"\b(crise|vendas fracas|pouco movimento)\b[^.!?]{0,40}\b(pagar|investir|gastar)\b",
)
_OBJECAO_DE_PRECO = _re.compile("|".join(f"(?:{p})" for p in _PADROES_DE_PRECO))
_ENROLACAO = _re.compile(
    r"vou (ver|verificar|consultar|checar|confirmar|levantar|calcular|pesquisar|descobrir) (o |a |qual (e )?o |quanto )?(valor|pre[cç]o|condi[cç][aã]o|condi[cç][oõ]es|custo)|"
    r"(te )?retorno com (o |a )?(valor|pre[cç]o|condi[cç][aã]o)|volto (com|a falar d[eo]) (o )?(valor|pre[cç]o)|"
    r"j[aá] te (passo|falo|informo) (o )?(valor|pre[cç]o) (depois|mais tarde|em breve)",
    _re.I,
)


def objecao_de_preco(texto: str) -> bool:
    """O cliente reclamou de dinheiro (sem condições, tá caro, mês fraco)? Pergunta de preço ("quanto custa?") NÃO é isto."""
    t = _simples(texto)
    return bool(t) and len(t.split()) <= 60 and bool(_OBJECAO_DE_PRECO.search(t))


def ultima_do_cliente(mensagens: List[Dict[str, Any]]) -> str:
    return next((m.get("texto", "") for m in reversed(mensagens) if m.get("de") == "contato"), "")


def enrolacao_de_valor(textos: List[str]) -> str:
    """Trecho em que o robô promete "ver o valor" depois (o que a objeção de preço proíbe), ou vazio."""
    for t in textos:
        m = _ENROLACAO.search(t or "")
        if m:
            return m.group(0)
    return ""


def condicao_especial(cfg: Dict[str, Any]) -> str:
    """A condição especial que o DONO cadastrou (vazio se não há): é a única promoção que o robô pode citar."""
    return " ".join(str(cfg.get("condicao_especial") or "").split())[:300]


def _quem_assume(ident: Dict[str, Any]) -> str:
    nome = ((ident or {}).get("nome") or "").strip().split(" ")[0]
    return nome or "o responsável"


def gancho_de_preco(cfg: Dict[str, Any], ident: Dict[str, Any]) -> List[str]:
    """Resposta pronta à objeção de preço (usada quando o modelo não responde nada): vira a objeção e chama o humano, sem falar de valor."""
    quem = _quem_assume(ident)
    cond = condicao_especial(cfg).rstrip(".!")
    if cond:
        return ["Entendo totalmente, e é justamente por isso que te chamei!",
                f"Estamos com uma condição especial: {cond}. Vou chamar {quem} aqui na conversa para te passar tudo certinho, tudo bem?"]
    return ["Entendo totalmente, e é justamente por isso que te chamei: a ideia é caber no seu momento.",
            f"Vou chamar {quem} aqui na conversa para te explicar as condições, tudo bem?"]


def _bloco_do_gancho(mensagens: List[Dict[str, Any]], cfg: Dict[str, Any], lead: Optional[Dict[str, Any]], ident: Dict[str, Any]) -> str:
    """Só aparece quando a ÚLTIMA fala do cliente reclama de dinheiro."""
    if not objecao_de_preco(ultima_do_cliente(mensagens)):
        return ""
    quem = _quem_assume(ident)
    segmento = ((lead or {}).get("niche") or "").strip()
    cond = condicao_especial(cfg)
    if cond:
        gancho = (f"A CONDIÇÃO ESPECIAL REAL que o dono cadastrou: «{cond}». Cite-a como gancho, nas palavras dele"
                  f"{f', falando para o segmento do cliente ({segmento})' if segmento else ''}; não invente percentual, valor, prazo nem vaga além do que está escrito.")
    else:
        gancho = ("O dono NÃO cadastrou condição especial: não prometa desconto, promoção nem prazo, e não diga que é barato, grátis ou que \"não pesa no bolso\". "
                  "Vire a objeção só com o que é real: a conversa é justamente para encontrar uma condição que caiba no momento dele; cite as formas de pagamento "
                  "dos fatos do dono, se houver.")
    return f"""== OBJEÇÃO DE PREÇO: ESTA É A SITUAÇÃO AGORA ==
O cliente disse que está sem condições ou que está caro. Isto NÃO é um "não": é hora de virar e passar para uma pessoa.
Faça em 2 mensagens curtas, nesta ordem:
1) Acolha em meia frase e vire: "entendo, e é justamente por isso que te chamei". {gancho}
2) Diga que {quem} assume a conversa agora para passar a condição e o valor certinho, e termine pedindo o ok ("tudo bem?").
PROIBIDO: dizer "vou ver o valor", "vou consultar", "te retorno com o valor" (esfria), citar valor em reais, discutir o preço ou pedir desculpas.
Marque "passar_para_humano": true e "motivo": "objeção de preço — gancho dado, passe a condição e o valor".
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
        ab = lead.get("previa_abertura") or {}
        if ab.get("visitas"):
            linhas.append(f"A prévia JÁ FOI ABERTA por ele(a): {ab['visitas']} visita(s), a última em {str(ab.get('ultima') or '')[:16].replace('T', ' ')} (UTC). "
                          "É sinal de interesse: pergunte o que achou em vez de reenviar o link ou explicar de novo o que ela é")
        else:
            linhas.append("Ainda não registramos abertura da prévia (o link pode não ter sido aberto, ou aberto por quem não conseguimos identificar): "
                          "não afirme que ele(a) viu")

    jeito = agentes.instrucao(lead.get("agente"))
    if jeito:
        linhas.append(f"Jeito de atender ESCOLHIDO PELO DONO para este lead: {jeito}")

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


# O que o link realmente é. O site da prévia é montado para atrair: foto de banco, texto de exemplo, dados do Google. Chamar isso de
# "site profissional" ou "seu site pronto" promete o que não existe (e o dono vê a foto errada e perde a confiança).
REGRA_DA_PREVIA = """O QUE É A PRÉVIA (leia com atenção):
- É uma PRIMEIRA IDEIA, um esboço visual feito para mostrar como o site poderia ficar. NÃO é o site final e NÃO está pronto para publicar.
- As fotos são de banco de imagens e os textos são de exemplo: no site de verdade entram as fotos, os serviços, os preços e as informações REAIS do negócio,
  depois que o dono aprova e envia o material.
- Chame SEMPRE de "prévia", "esboço", "modelo" ou "ideia de como poderia ficar". PROIBIDO dizer que preparou/montou/criou "um site profissional",
  "o seu site", "o site pronto", "site finalizado" ou "no ar". Você montou uma PRÉVIA, não o site.
- Ao enviar o link, diga com uma frase simples que é uma prévia: o definitivo é feito depois, com as fotos e informações dele.
- Se o dono estranhar uma foto ou um texto da prévia (ex.: "essa foto não é minha"), concorde: é de exemplo, será trocada pelas reais."""


# Quem responde nem sempre é o profissional. O robô já tratou a pessoa AUSENTE como interlocutora ("Entendo, Ana Teresa. Desejo uma ótima licença...")
# quando a recepção avisou que ela entrou em licença maternidade.
QUEM_ESCREVE = """QUEM ESTÁ ESCREVENDO (leia a fala do cliente com exatidão ANTES de responder):
- O nome do dossiê ou da abordagem é do negócio ou do profissional. Quem responde pode ser OUTRA PESSOA: recepção, secretária, funcionário,
  familiar, sócio. NUNCA chame quem escreve pelo nome do profissional. Só use um nome para quem escreve se ELA disse ou assinou
  ("aqui é a Marcelly"). Sem nome dito, não use nome nenhum.
- Quem fala de alguém em TERCEIRA PESSOA ("a Ana Teresa entrou em licença", "o doutor não está", "ela saiu") está falando DE outra pessoa,
  que NÃO está na conversa. Responda a QUEM ESCREVEU. Nunca fale com a pessoa de quem se fala: nada de "Entendo, Ana Teresa", "sua licença",
  "boa recuperação para você".
- Releia a fala palavra por palavra: quem escreveu? de quem falou? o que isso muda para a venda? Escreva isso em "entendi".
- Profissional AFASTADO (licença, maternidade, férias, doença, viagem) ou que NÃO ATENDE MAIS ali (saiu, mudou, aposentou, fechou):
  1) agradeça a quem avisou, em uma frase, e, se quiser, deseje bem ao profissional EM TERCEIRA PESSOA ("desejo uma ótima licença à Dra. Ana Teresa");
  2) faça UMA pergunta curta: quem responde pela clínica ou pela divulgação enquanto isso (sócio, outro profissional, administração), ou quando ela volta;
  3) sem pitch para quem só avisou e sem insistir.
  Saiu ou fechou de vez e ninguém decide por lá: agradeça, despeça-se e use "etapa": "perdido". Licença ou férias (ela volta): agradeça, pergunte pelo
  outro responsável e, sem ninguém, despeça-se dizendo que retoma o contato quando ela voltar, com "passar_para_humano": true e o motivo
  (ex.: "Dra. Ana Teresa em licença maternidade: retomar depois")."""


def _bloco_da_previa(lead: Optional[Dict[str, Any]]) -> str:
    url = ((lead or {}).get("site_publicado") or "").strip()
    if url:
        return (f"EXISTE uma prévia pronta: {url}\n"
                "- Quando o cliente aceitar ver (\"pode mandar\", \"ok\", \"sim\", ou a secretária pedindo o link para mostrar ao responsável), envie ESTE link, escrito por inteiro na mensagem, com uma frase do que ele vai ver. "
                "Nunca escreva marcadores entre colchetes como [LINK]: só o endereço de verdade.")
    return ("Ainda NÃO existe prévia criada para este negócio, mas o SISTEMA CRIA NA HORA quando o cliente aceita.\n"
            "- O cliente aceitou ver ou receber a prévia (\"ok\", \"pode mandar\", \"sim\", \"quero ver\", ou a secretária/recepção pedindo o link para mostrar ao responsável)? Marque \"enviar_previa\": true e escreva a mensagem "
            "com o marcador [LINK_DA_PREVIA] exatamente onde vai o link: o sistema cria o site agora e troca o marcador pelo endereço de verdade. "
            "Ex.: \"Perfeito! Aqui está a prévia: [LINK_DA_PREVIA] Me conta o que achou?\". Uma mensagem curta, sem reunião agora.\n"
            "- O cliente ainda NÃO aceitou? NÃO diga que preparou, montou ou criou, que está pronta, nem que vai mandar o link; "
            "não escreva marcadores e deixe \"enviar_previa\": false.")


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


_DIAS_DA_SEMANA = ["segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo"]


def _proximo_dia_util(base: datetime) -> datetime:
    d = base + timedelta(days=1)
    while d.weekday() >= 5:   # sabado e domingo nao contam
        d += timedelta(days=1)
    return d


def prazo_da_reuniao(agora: Optional[datetime] = None) -> str:
    """O dia mais perto possivel para a conversa, ja com a data: o robo propunha 'daqui a uns dias' e o cliente esfriava."""
    t = (agora or datetime.now(timezone.utc)) - timedelta(hours=3)
    util_hoje = t.weekday() < 5
    amanha = _proximo_dia_util(t)
    nome = lambda d: f"{_DIAS_DA_SEMANA[d.weekday()]} ({d.strftime('%d/%m')})"
    alvo = f"amanhã, {nome(amanha)}" if (amanha - t).days == 1 else nome(amanha)
    hoje = f" Se ainda for antes das 16h de hoje ({_DIAS_DA_SEMANA[t.weekday()]}) e o cliente estiver quente, pode oferecer hoje mais tarde." if util_hoje and t.hour < 16 else ""
    return (f"O dia mais próximo é {alvo}.{hoje} Segundo dia útil: "
            f"{nome(_proximo_dia_util(amanha))}.")


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
    cfg = ai_oferta.aplicar(cfg)
    ident = identidade.da_conta(cfg, perfil)
    quem = ident["empresa"] or perfil.get("company_name") or perfil.get("name") or "a empresa"
    assistente = cfg.get("nome_assistente") or "assistente virtual"
    # a pessoa definiu quem fala: o robô se apresenta com o nome, o cargo e a empresa DELA (nunca com o nome do sistema)
    quem_fala = (f"{ident['apresentacao']} (você se apresenta assim, em primeira pessoa; se perguntarem se é robô, diga que é o "
                 f"assistente virtual de {quem})") if ident["configurada"] and ident["apresentacao"] else ""
    oferta = perfil.get("product_description") or "serviços de presença digital (site, Google e redes sociais)"
    servico = ai_oferta.bloco_do_servico(cfg, lead)
    ramo = nicho_guia.bloco((lead or {}).get("niche"))
    vender = cfg.get("objetivo") == "vender"
    meta = {
        "agendar": "marcar uma conversa de 15 minutos com o responsável (ligação ou vídeo)",
        "site": "fazer a pessoa abrir a prévia (uma primeira ideia do site, não o site final) feita para o negócio dela e ouvir a opinião",
        "qualificar": "entender se há interesse, quem decide, a dor e o momento — e só então propor a conversa",
        "vender": "fechar a venda pela conversa, dentro do catálogo e das condições autorizadas",
    }.get(cfg.get("objetivo") or "agendar", "marcar uma conversa com o responsável")
    desconto = int(cfg.get("desconto_maximo") or 0)
    limite_palavras = 45 if canal == "whatsapp" else 35

    historico = "\n".join(
        f"{'CLIENTE' if m.get('de') == 'contato' else ('VOCÊ' if m.get('de') == 'robo' else quem.upper() + ' (humano)')}: {m.get('texto', '')}"
        for m in mensagens[-30:]
    )

    abertura = quem_fala or f"{assistente}, SDR de {quem}"
    return f"""Você é {abertura}, conversando pelo {canal} com o dono de um negócio local.
Agora é {_agora_brasil(agora)}.

== O QUE {quem.upper()} VENDE ==
{oferta}
{servico}
{f"Catálogo e preços (só estes existem):{chr(10)}{cfg['catalogo']}" if cfg.get('catalogo') else "Não há catálogo de preços: NUNCA diga valores; diga que depende do escopo e proponha a conversa."}
{f"Perguntas frequentes (respostas oficiais):{chr(10)}{cfg['faq']}" if cfg.get('faq') else ""}
{_regra_de_desconto(cfg)}
{f"Link para agendar: {cfg['link_agenda']}" if cfg.get('link_agenda') else ""}
Instruções do dono: {cfg.get('instrucoes') or '(nenhuma)'}

== SEU OBJETIVO ==
{meta}.

== DOSSIÊ DESTE NEGÓCIO (use; é o que torna a conversa única) ==
{_formatar_dossie(lead, raio)}

== ENTENDENDO O RAMO ==
{ramo}

== A PRÉVIA DO SITE DESTE NEGÓCIO ==
{_bloco_da_previa(lead)}

{REGRA_DA_PREVIA}

== QUEM ESTÁ ESCREVENDO ==
{QUEM_ESCREVE}

== SITES: O QUE UM ESPECIALISTA SABE ==
{FALA_DO_ROBO_SOBRE_SITES}

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

== COMO TRAZER A REUNIÃO (o que separa SDR de atendente) ==
1. Responda PRIMEIRO o que a pessoa perguntou, em uma frase; só depois conduza. Quem pergunta e não recebe resposta desconfia.
2. Termine cada mensagem com UM próximo passo, no formato mais fácil de aceitar: pergunta de sim/não ou escolha entre duas opções.
3. Regra dos 3 turnos: até a 3ª resposta do cliente já deve existir um convite concreto ({"fechar" if vender else "uma conversa de 15 minutos"} ou ver o material). Descoberta longa cansa e esfria.
4. Sinal de compra (perguntou preço, prazo, "como funciona", "quero ver", elogiou, disse que precisa): PARE de qualificar e proponha o horário agora.
5. URGÊNCIA DA REUNIÃO: a conversa é no PRÓXIMO DIA ÚTIL. {prazo_da_reuniao(agora)}
   Convide com dois horários concretos NESSE MESMO dia (ex.: "amanhã, quinta, às 10h ou às 15h"), fora do horário de pico do ramo.
   Cada dia de espera é chance de o cliente esfriar, desistir ou conhecer outro fornecedor: nunca ofereça "semana que vem" nem
   um dia mais distante na primeira proposta. Só se ele disser que NÃO consegue nesse dia, pergunte qual o primeiro dia que ele
   consegue e proponha o mais cedo possível (no máximo o segundo dia útil); se ele escolher mais longe, aceite, confirme e diga que
   vai lembrá-lo no dia anterior. Se disser só "semana que vem", volte com o dia mais cedo em que dê ("consigo na terça às 10h, 15 minutos").
   Se houver link de agenda, ofereça junto.
6. Diminua o esforço do sim: 15 minutos, por vídeo ou ligação, "eu te mostro e você decide, sem compromisso".
7. Quando ele confirmar: repita dia, data e hora, peça o melhor WhatsApp ou ligação e quem mais deve participar, e passe para o humano.
8. "Vou pensar": descubra o que falta ("é o valor, o momento ou prefere ver antes?") e ofereça um passo pequeno, nunca um "fico no aguardo".
9. Não repita pergunta já respondida nem abra duas mensagens seguidas do mesmo jeito; varie a forma.
10. Não sabe? Diga que confirma com o responsável e já siga para o convite. Nunca invente.
11. Espelhe o jeito dele: formal com quem é formal, direto com quem é direto, curto com quem escreve curto.

== MÉTODO DE VENDAS (como um bom SDR conduz) ==
{playbook_vendas.METODO}
== OBJEÇÕES: O QUE REALMENTE TRAVA E COMO RESPONDER ==
{OBJECOES}
{_bloco_do_gancho(mensagens, cfg, lead, ident)}{playbook_vendas.bloco_do_momento(ultima_do_cliente(mensagens), sdr, vender, _quem_assume(ident)) if not objecao_de_preco(ultima_do_cliente(mensagens)) else ""}
== PERSUASÃO: SÓ A LEGÍTIMA ==
Use: prova social com dados REAIS do dossiê (a nota dele, as avaliações dele); aversão à perda (o cliente que
procura e cai no concorrente); reciprocidade (o site/diagnóstico já feito para ele); pequenos sins antes do pedido
maior; espelhar as palavras dele; a CONDIÇÃO ESPECIAL cadastrada pelo dono (só quando ela aparece acima, exatamente como está escrita).
PROIBIDO: urgência ou escassez inventada ("só hoje", "últimas vagas"), promoção ou desconto que o dono não cadastrou, casos ou depoimentos que não estejam acima,
resultado garantido, falar mal de concorrente, insistir depois de um "não" claro, pedir CPF, senha ou dado sensível,
e inventar justificativa (custo, margem, agenda cheia) — para negar um desconto basta dizer que não é possível.

== FORMA ==
- Português do Brasil, tom de conversa. Responda em 1 ou 2 mensagens curtas (no máximo {limite_palavras} palavras cada),
  como uma pessoa escreve no {canal}. Uma pergunta por vez. Sem lista, sem "Prezado", no máximo 1 emoji.
- Use o nome da pessoa quando souber. Espelhe o nível de formalidade dela.
- NUNCA invente preço, prazo, garantia ou fato sobre o negócio. Se não souber, diga que confirma com o responsável.
- Se perguntarem se você é robô: diga que é o assistente virtual de {quem}.
- VALORES (preço, renovação, domínio, custos): NUNCA cite por iniciativa sua. Só fale de dinheiro quando o cliente perguntar.
- QUANDO PERGUNTAREM O PREÇO: nunca responda só com o número. Faça nesta ordem, em 2 ou 3 frases curtas:
  1) o benefício e o porquê faz sentido PARA O NEGÓCIO DELE (use o que ele disse e o dossiê: o cliente que procura no Google e não
     acha, o WhatsApp direto, a prévia já pronta, o primeiro ano sem custo de hospedagem e endereço, 2 manutenções, ele só aprova);
  2) só então o valor, amarrado ao que vem junto ("tudo isso por R$ X", "e o investimento é R$ X, já com …");
  3) UM próximo passo (ver a prévia, ou uma conversa curta).
  Se ele só escreveu "preço" ou "quanto?", tudo bem: responda o valor, mas sempre com o valor entregue (o que ele recebe) antes do número.
- Só afirme o que está nos fatos do dono acima. Não diga que "inclui domínio" se o que está escrito é endereço do site e hospedagem:
  domínio próprio da empresa é opcional e tem custo à parte, e só se fala disso se perguntarem.

== QUANDO PASSAR PARA O HUMANO ==
Horário de reunião confirmado; aceitou a proposta; reclamou de preço ou disse que está sem condições (gancho e passe: nunca "vou ver o valor"); quer negociar além do autorizado; pergunta técnica ou jurídica
que você não sabe; reclamação; pedido explícito para falar com uma pessoa.

== O QUE JÁ FOI DITO (leia antes de escrever) ==
- Na CONVERSA abaixo, "VOCÊ" são as mensagens que você (ou o dono) JÁ enviou. A primeira costuma ser a abordagem
  inicial: nela você já cumprimentou, já se apresentou e já deu o motivo do contato.
- NUNCA se apresente de novo (nome, empresa, "vi seu perfil no Google") nem repita elogio, número ou argumento que já
  esteja numa mensagem sua. Continue a partir da resposta do cliente.
- Entenda o que o cliente trouxe ANTES de responder: uma pergunta? interesse? objeção? um agradecimento? indicou outra
  pessoa ("quem cuida disso é o fulano, o número é...")? é mensagem automática ou propaganda do negócio que não
  responde ao que você disse?
- Indicou outro responsável: agradeça em uma frase, diga que vai falar com ele(a), guarde o nome em "decisor" e o
  telefone em "contato_decisor". Não faça pitch para quem não decide.
- SECRETÁRIA, RECEPÇÃO OU ASSISTENTE (quem atende mas não decide): é uma ALIADA, nunca um obstáculo. Se ela pediu, aceitou ou se ofereceu
  para mostrar ("pode mandar que eu mostro para a doutora", "envia o link", "vou repassar"), isso é um ACEITE: o link vai AGORA, nesta
  mesma resposta (enviar_previa true, ou o link de verdade se a prévia já existe). NUNCA segure o link para esperar a doutora/o dono
  e NUNCA pergunte "qual o melhor horário para enviar": quem pediu o link recebe o link. Depois do link, na mesma mensagem ou na
  segunda: agradeça a ajuda pelo nome dela, peça que mostre à responsável e dê o próximo passo COM A RESPONSÁVEL: pergunte se há um
  dia ou horário em que ela poderia conversar uns 15 minutos (ou como prefere ser contatada), e o nome dela se você ainda não souber.
  Crie vínculo: cordial, grato, sem pressa, sem pitch para a secretária. Guarde o nome em "decisor" (e o contato em "contato_decisor"
  se passarem). Isto vale também para "indicou outro responsável": se ele ou ela aceita receber algo, mande o material junto.
- Falas do CLIENTE que começam com 🎤 são ÁUDIOS que o sistema transcreveu sozinho: leia como fala (pode haver erro de transcrição em nome, número
  ou palavra rara; se um dado importante parecer duvidoso, confirme em uma frase) e responda em TEXTO, normalmente (pode dizer que ouviu o áudio).
  Nunca copie nem cite o 🎤 na resposta.
- Mensagem automática, de boas-vindas ou propaganda do negócio: NÃO responda ("automatica": true, "mensagens": []).
- Responda o que ele disse, em uma frase, antes de qualquer pergunta. Nunca ignore uma pergunta dele.
- Se responder em duas mensagens, a ordem é a de leitura: a primeira acolhe ou responde, a segunda conduz.
  Saudação e apresentação nunca vão na segunda.

== CONVERSA ==
{historico}

== RESPONDA SÓ COM ESTE JSON ==
{{"entendi": "uma frase: QUEM escreveu (o profissional ou outra pessoa), DE QUEM falou e o que o cliente disse ou quer",
 "tipo": "pergunta|interesse|objecao|agradecimento|indicou_contato|automatica|outro",
 "automatica": false,
 "enviar_previa": false,
 "mensagens": ["primeira mensagem", "segunda (opcional)"],
 "etapa": "{'|'.join(ETAPAS)}",
 "temperatura": "frio|morno|quente",
 "dados": {{"nome": "", "decisor": "", "contato_decisor": "", "dor": "", "canal_atual": "", "orcamento": "", "prazo": ""}},
 "objecao": "tipo da objeção desta mensagem, ou vazio",
 "proximo_passo": "o que você está buscando na próxima resposta",
 "passar_para_humano": false,
 "motivo": "por que passar (só se passar)",
 "reuniao": "SÓ quando o CLIENTE confirmou um dia e horário exatos que você ofereceu; se você propôs e ele ainda não respondeu, vazio"}}

Regras dos dados: "nome" é SÓ o nome de quem está escrevendo (se ela disse), nunca o de alguém de quem ela fala; "orcamento" é quanto o CLIENTE disse que pode investir (nunca o preço do catálogo);
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
        if k in ("nome", "decisor", "contato_decisor", "dor", "canal_atual", "orcamento", "prazo") and _texto(v):
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
            "entendi": _texto(dados.get("entendi"), 200),
        },
        "automatica": bool(dados.get("automatica")) or dados.get("tipo") == "automatica",
        "enviar_previa": bool(dados.get("enviar_previa")),
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


def valores_da_oferta(cfg: Dict[str, Any]) -> List[float]:
    """Valores que o proprio dono escreveu (ex.: "hospedagem cerca de R$ 40
    por mes") e os que saem do pagamento combinado (50% de entrada, 6x).

    Medido em simulacao: o robo respondeu "R$ 40" a quem perguntou da
    hospedagem — dado do dono — e o verificador barrou como inventado.
    """
    o = cfg.get("oferta") or {}
    escrito = " ".join(
        str(o.get(k) or "") for k in ("inclui", "nao_inclui", "pagamento", "revisoes", "garantia", "diferenciais")
    ) + " " + (cfg.get("faq") or "") + " " + (cfg.get("instrucoes") or "") + " " + (cfg.get("condicao_especial") or "")
    valores = [_num(v) for v in _VALOR.findall(escrito)]
    preco = float(o.get("preco") or 0)
    if preco:
        pagamento = o.get("pagamento") or ""
        for pct in _re.findall(r"(\d{1,3})\s*%", pagamento):
            valores.append(round(preco * int(pct) / 100, 2))
        for n in _re.findall(r"\b(\d{1,2})\s*x\b", pagamento):
            if int(n) >= 2:
                valores.append(round(preco / int(n), 2))
    return [v for v in valores if v > 0]


def valores_permitidos(cfg: Dict[str, Any], mensagens: List[Dict[str, Any]]) -> List[float]:
    """Os valores que o robo pode citar: os do catalogo, esses mesmos com
    o desconto autorizado, e os que o proprio cliente disse."""
    base = [_num(v) for v in _VALOR.findall(cfg.get("catalogo") or "")]
    desconto = int(cfg.get("desconto_maximo") or 0)
    permitidos = list(base) + valores_da_oferta(cfg)
    for v in base:
        permitidos += [round(v * (1 - d / 100), 2) for d in range(1, desconto + 1)]
    for m in mensagens:
        if m.get("de") == "contato":
            permitidos += [_num(v) for v in _VALOR.findall(m.get("texto", ""))]
            permitidos += [_num(v) for v in _re.findall(r"\b(\d{3,6})\b", m.get("texto", ""))]
    return [v for v in permitidos if v > 0]


_APRESENTACAO = _re.compile(r"\b(me chamo|meu nome e|sou (o|a) [a-z]+ (da|do|de)\b|aqui e (o|a) [a-z]+ (da|do|de)\b)")


def _simples(texto: str) -> str:
    import unicodedata
    t = unicodedata.normalize("NFKD", texto or "").encode("ascii", "ignore").decode().lower()
    return _re.sub(r"\s+", " ", _re.sub(r"[^a-z0-9 ]+", " ", t)).strip()


def _repete(novo: str, antigo: str) -> bool:
    """Quase tudo o que a resposta diz ja estava numa mensagem anterior (mesmo conteudo, outras palavras na ponta)."""
    a, b = set(_simples(novo).split()), set(_simples(antigo).split())
    if len(a) < 8:
        return False  # frase curta ("posso te mostrar amanha?") reaproveita palavras sem repetir o assunto
    return len(a & b) / len(a) >= 0.85


# O cliente perguntou de dinheiro? So nesse caso o robo pode citar valor (preco, renovacao, dominio).
_PERGUNTOU_DE_VALOR = _re.compile(
    r"\b(quanto|pre[cç]o|valor(es)?|custa|custo|custos|investimento|mensalidade|anuidade|renova[cç][aã]o|pagar|pagamento|"
    r"parcel\w*|desconto|caro|barato|or[cç]amento|cobra\w*|gr[aá]tis|gratuito|dom[ií]nio|hospedagem|taxa|reais|mil|faz por|fecha por|por quanto)\b|r\$|\d{3,}",
    _re.I,
)


def cliente_perguntou_de_valor(mensagens: List[Dict[str, Any]]) -> bool:
    """A ultima fala do cliente toca em preco, custo ou pagamento?"""
    for m in reversed(mensagens):
        if m.get("de") == "contato":
            return bool(_PERGUNTOU_DE_VALOR.search(m.get("texto", "")))
    return False


_MARCADOR = _re.compile(r"\[[A-Z0-9_ ]{3,40}\]|\{\{[^}]{1,40}\}\}|\{[a-z_]{3,30}\}|<[A-Z_]{3,30}>")
_ALEGA_PREVIA = _re.compile(
    r"\b(montei|preparei|criei|fiz|deixei|elaborei|desenvolvi)\b[^.?!]{0,60}\b(pr[eé]via|esbo[cç]o|site|layout)\b|"
    r"\b(segue|aqui est[aá]|abaixo|vou (te )?(enviar|mandar)|te (envio|mando)|enviei|mandei)\b[^.?!]{0,30}\b(o )?(link|endere[cç]o)\b|"
    r"\blink d[aoe] (pr[eé]via|site|esbo[cç]o)\b",
    _re.I,
)


def resolver_marcadores(textos: List[str], lead: Optional[Dict[str, Any]]) -> List[str]:
    """Troca marcadores como [LINK_DA_PREVIA] pelo link de verdade, quando ele existe."""
    url = (lead or {}).get("site_publicado") or ""
    if not url:
        return textos
    return [_re.sub(r"\[LINK[A-Z0-9_ ]{0,30}\]|\{\{\s*link[^}]{0,30}\}\}|\{link[a-z_]{0,20}\}|<LINK[A-Z_]{0,20}>", url, t, flags=_re.I) for t in textos]


def problemas_da_resposta(textos: List[str], cfg: Dict[str, Any], mensagens: List[Dict[str, Any]], lead: Optional[Dict[str, Any]] = None,
                          criando_previa: bool = False) -> List[str]:
    """`criando_previa`: o sistema vai criar o site agora e trocar [LINK_DA_PREVIA] pelo link; o marcador e a promessa do link valem."""
    erros: List[str] = []
    # 0) a prévia nunca é "o site pronto" nem "o site profissional que preparei"
    falso = previa_honesta.erro_de_site_pronto(textos)
    if falso:
        erros.append(falso)
    # 0b) quem avisa que o profissional está ausente (licença, saiu) é outra pessoa: a resposta não pode falar COM a ausente
    errada = quem_fala.erro_de_pessoa_errada(textos, mensagens)
    if errada:
        erros.append(errada)
    # 1) marcador de modelo nunca vai para o cliente
    for t in ([] if criando_previa else textos):
        m = _MARCADOR.search(t)
        if m:
            erros.append(f'você deixou o marcador "{m.group(0)}" na mensagem: escreva só o texto final, com o link de verdade ou sem ele')
            break
    # 2) sem previa criada, nada de dizer que preparou nem de prometer link agora
    if criando_previa:
        pass
    elif lead is not None and not (lead.get("site_publicado") or "").strip():
        for t in textos:
            if _ALEGA_PREVIA.search(t):
                erros.append('você disse que preparou a prévia ou que vai mandar o link, mas NENHUMA prévia foi criada para este negócio: '
                             'diga que está finalizando e envia por aqui em breve, sem link e sem afirmar que já está pronta')
                break
    # 3) com previa criada, "segue o link" precisa trazer o link de verdade
    elif lead is not None and (lead.get("site_publicado") or "").strip():
        url = lead["site_publicado"]
        for t in textos:
            if _re.search(r"\b(segue|aqui est[aá])\b[^.?!]{0,25}\blink\b", t, _re.I) and url not in t and "http" not in t.lower():
                erros.append(f'você disse "segue o link" sem colocar o link: cole a URL completa {url}')
                break
    if any(m.get("de") == "contato" for m in mensagens) and not cliente_perguntou_de_valor(mensagens):
        for t in textos:
            if _VALOR.search(t):
                erros.append("você citou valor sem o cliente ter perguntado de preço ou custo: só fale de valores se ele perguntar")
                break
    previas = [m.get("texto", "") for m in mensagens if m.get("de") in ("robo", "voce")]
    ja_se_apresentou = any(_APRESENTACAO.search(_simples(p)) for p in previas)
    for t in textos:
        if ja_se_apresentou and _APRESENTACAO.search(_simples(t)):
            erros.append("você já se apresentou nesta conversa: não se apresente de novo, continue a partir da resposta do cliente")
        for p in previas:
            if _repete(t, p):
                erros.append(f'você repetiu o que já disse ("{p[:60]}…"): fale algo novo, a partir do que o cliente trouxe')
                break
    # objeção de preço: o gancho e a passagem para o humano, nunca "vou ver o valor" (esfria e deixa o cliente sozinho)
    if objecao_de_preco(ultima_do_cliente(mensagens)):
        enrola = enrolacao_de_valor(textos)
        if enrola:
            erros.append(f'você disse "{enrola}": quem reclamou de preço recebe o gancho ("é justamente por isso que te chamei") e a passagem para uma pessoa, '
                         'que passa o valor. Nunca diga que vai ver ou consultar o valor')
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


def forma_do_preco(textos: List[str], mensagens: List[Dict[str, Any]]) -> List[str]:
    """O primeiro preco da conversa vem depois do beneficio, nunca como a primeira coisa que o cliente le.

    "Tudo isso por R$ X" vende; "R$ X" sozinho vira comparacao de preco. Vale so na primeira vez que o valor aparece;
    depois (negociacao, reajuste) a pessoa ja viu o valor da oferta.
    """
    juntos = " ".join(textos)
    achou = _VALOR.search(juntos)
    if not achou:
        return []
    if any(_VALOR.search(m.get("texto", "")) for m in mensagens if m.get("de") == "robo"):
        return []
    antes = [p for p in juntos[: achou.start()].split() if len(p) > 1]
    if len(antes) >= 12:
        return []
    return ["você citou o valor antes de mostrar o benefício: primeiro diga o que ele recebe e por que faz sentido para o negócio dele, "
            "e só então o valor, amarrado a isso (\"tudo isso por R$ X\")"]
