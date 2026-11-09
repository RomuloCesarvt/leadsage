"""O serviço que o robô vende, em campos — não em texto solto.

O dono escolhe o serviço (site, Google Meu Negócio, redes, tráfego, outro) e
preenche o que o robô pode prometer: preço, prazo, o que inclui, se entrega
esboço antes de fechar, como se paga. O que não estiver aqui, o robô não
promete.

O preço também alimenta o verificador de valores: o robô só cita o número
que o dono cadastrou (e o desconto que autorizou).
"""
import re
from typing import Any, Dict, List, Optional

SERVICOS = ("site", "gmn", "social", "trafego", "ar", "outro")
ESBOCO = ("gratis", "pago", "nao")

# O que cada servico resolve e como conduzir a conversa. E o miolo da venda:
# o modelo recebe isto junto com os fatos do dono (preco, prazo, inclui).
PLAYBOOKS: Dict[str, Dict[str, str]] = {
    "site": {
        "nome": "Site profissional",
        "inclui": "Site responsivo com a marca do negócio, serviços, fotos, avaliações do Google, mapa, horários e botão de WhatsApp, publicado no ar.",
        "tese": (
            "Quem procura o ramo dele na cidade pelo Google precisa chegar num endereço com a cara do negócio: "
            "o Instagram não aparece na busca e o perfil do Google sem site não passa confiança nem leva a lugar "
            "nenhum. O site trabalha 24 horas, mostra serviços, horário e preço, e leva a pessoa direto ao WhatsApp."
        ),
        "descoberta": (
            "Como o cliente novo chega hoje (indicação, Instagram, Google, passando na porta)? O que ele pergunta "
            "sempre pelo WhatsApp que um site já responderia (preço, endereço, horário, cardápio, serviços)? "
            "Já teve site antes e por que parou?"
        ),
        "conducao": (
            "1) Gancho do dossiê (muita avaliação boa e nenhum site; Google sem link; Instagram parado). "
            "2) Uma pergunta de descoberta. 3) Diagnóstico concreto, com número dele. "
            "4) Esboço: com o esboço pronto, mande o link e peça a opinião; sem esboço, ofereça fazer um (veja a regra do esboço). "
            "5) Reunião curta para apresentar e ajustar o esboço — é o convite natural, não um pedido de tempo vazio."
        ),
    },
    "gmn": {
        "nome": "Otimização do Google Meu Negócio",
        "inclui": "Perfil do Google completo: categorias, descrição, horários, fotos, serviços, posts e resposta às avaliações.",
        "tese": (
            "O perfil do Google é a vitrine de quem busca '<ramo> perto de mim': é onde o cliente decide para qual "
            "ligar. Perfil incompleto, sem fotos ou com avaliações sem resposta perde clientes para o concorrente "
            "que aparece com tudo preenchido."
        ),
        "descoberta": "Alguém atualiza o perfil do Google? Os clientes chegam dizendo que viram no Google? Respondem às avaliações?",
        "conducao": (
            "Mostre o que o dossiê aponta que falta no perfil, compare com o que um perfil completo faz, "
            "e convide para uma conversa curta em que você mostra o antes e o depois."
        ),
    },
    "social": {
        "nome": "Gestão de redes sociais",
        "inclui": "Calendário de posts, criativos, legendas, publicação e relatório mensal.",
        "tese": (
            "Rede social parada passa a impressão de negócio fechado ou abandonado. Constância e uma identidade "
            "visual única fazem o cliente lembrar do negócio na hora de comprar."
        ),
        "descoberta": "Quem posta hoje? Com que frequência? O que já funcionou (promoção, bastidor, depoimento)?",
        "conducao": "Use o ritmo real de postagem do dossiê. Proponha uma conversa para apresentar um calendário de exemplo.",
    },
    "trafego": {
        "nome": "Anúncios (Google e Meta)",
        "inclui": "Criação e gestão de campanhas, públicos, criativos e relatório de resultados.",
        "tese": (
            "Anúncio bem feito coloca o negócio na frente de quem está procurando agora, com custo medido por "
            "contato. Não se promete resultado: promete-se método, acompanhamento e transparência."
        ),
        "descoberta": "Já anunciou antes? Quanto pode investir por mês em anúncio? Quantos clientes novos por mês seriam bons?",
        "conducao": "Qualifique orçamento de mídia primeiro. Nunca prometa número de clientes ou retorno.",
    },
    "ar": {
        "nome": "Instalação, limpeza e manutenção de ar-condicionado",
        "inclui": "",
        "tese": (
            "Ar-condicionado sem limpeza em dia rende menos, gasta mais energia, pinga, cheira mal e quebra antes. "
            "Em clínica, escritório, loja, escola e condomínio, o aparelho parado ou com defeito afasta cliente e atrapalha quem trabalha. "
            "Manutenção periódica sai mais barata que conserto e troca de aparelho. Em ambiente climatizado de uso coletivo existe também a "
            "exigência de plano de manutenção (PMOC): cite isso SÓ se o dono cadastrou esse serviço."
        ),
        "descoberta": (
            "Quantos aparelhos vocês têm e de que tipo (split, cassete, piso-teto)? Quando foi a última limpeza ou manutenção? "
            "Algum aparelho pinga, cheira, gela pouco ou está parado? Alguém de confiança já cuida disso hoje?"
        ),
        "conducao": (
            "1) Gancho do ramo e do dossiê (ambiente que depende de ar-condicionado: clínica, escritório, loja, academia). "
            "2) Uma pergunta de descoberta (quantos aparelhos / última limpeza). 3) Mostre o que muda: conforto, conta de luz, menos quebra. "
            "4) Convide para uma visita técnica ou orçamento sem compromisso, com a faixa de preço da tabela cadastrada quando perguntarem. "
            "5) Levante os dados do orçamento (tipo e quantidade de aparelhos, BTUs, endereço, melhor dia e horário) e passe para o humano confirmar a visita. "
            "NÃO existe site, prévia nem esboço neste serviço: nunca ofereça nem cite."
        ),
    },
    "outro": {
        "nome": "Serviço",
        "inclui": "",
        "tese": "Conecte o serviço à dor que o dossiê e a conversa mostram. Fale do que muda para o negócio dele.",
        "descoberta": "O que incomoda hoje, o que já tentou e o que seria um bom resultado nos próximos meses?",
        "conducao": "Descoberta, um fato concreto do dossiê ligado à dor dele, proposta do que muda e convite para uma conversa curta.",
    },
}


def _texto(v: Any, limite: int) -> str:
    return str(v or "").strip()[:limite]


def _numero(v: Any) -> float:
    """'1.500', '1500,50', 'R$ 2.000' -> float. Vazio ou lixo -> 0."""
    s = re.sub(r"[^\d.,]", "", str(v or ""))
    if not s:
        return 0.0
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    elif s.count(".") > 1 or re.search(r"\.\d{3}$", s):
        s = s.replace(".", "")
    try:
        return max(0.0, float(s))
    except ValueError:
        return 0.0


def normalizar(d: Any) -> Dict[str, Any]:
    """Aceita o que a tela mandar e devolve so campos conhecidos, no tamanho certo."""
    d = d if isinstance(d, dict) else {}
    servico = d.get("servico") if d.get("servico") in SERVICOS else "site"
    esboco = d.get("esboco") if d.get("esboco") in ESBOCO else "nao"
    try:
        prazo = max(0, min(365, int(float(d.get("prazo_dias") or 0))))
    except (TypeError, ValueError):
        prazo = 0
    return {
        "servico": servico,
        "nome": _texto(d.get("nome"), 80),
        "preco": _numero(d.get("preco")),
        "prazo_dias": prazo,
        "inclui": _texto(d.get("inclui"), 700),
        "nao_inclui": _texto(d.get("nao_inclui"), 400),
        "esboco": esboco,
        "esboco_prazo": _texto(d.get("esboco_prazo"), 60),
        "esboco_preco": _numero(d.get("esboco_preco")) if esboco == "pago" else 0.0,
        "pagamento": _texto(d.get("pagamento"), 240),
        "revisoes": _texto(d.get("revisoes"), 240),
        "garantia": _texto(d.get("garantia"), 240),
        "diferenciais": _texto(d.get("diferenciais"), 500),
        # fechamento: o que o robo pode passar quando o lead diz que quer fechar
        "pix_chave": _texto(d.get("pix_chave"), 120),
        "pix_titular": _texto(d.get("pix_titular"), 80),
        "pix_banco": _texto(d.get("pix_banco"), 60),
        "sinal_percentual": max(0, min(100, int(_numero(d.get("sinal_percentual"))))),
        "itens_do_cliente": _texto(d.get("itens_do_cliente"), 600),
        "dados_do_contrato": _texto(d.get("dados_do_contrato"), 300),
        # o que acontece quando o lead diz "quero fechar": conversa (padrao: mostrar como melhorar e alinhar) ou checklist (Pix e material)
        "fechamento": d.get("fechamento") if d.get("fechamento") in ("conversa", "checklist") else "conversa",
        # serviço local (ar-condicionado): tabela de preços (uma linha por serviço, "Limpeza de split 9 a 12 mil BTU: R$ 150"),
        # região atendida, visita técnica e agenda
        "tabela_precos": _texto(d.get("tabela_precos"), 1200),
        "regiao": _texto(d.get("regiao"), 240),
        "visita": d.get("visita") if d.get("visita") in ("gratis", "paga", "nao") else "gratis",
        "visita_preco": _numero(d.get("visita_preco")) if d.get("visita") == "paga" else 0.0,
        "agenda": _texto(d.get("agenda"), 300),
    }


def sem_previa(cfg: Optional[Dict[str, Any]]) -> bool:
    """Serviço que não passa por site nem prévia (ar-condicionado): o robô nunca oferece, cria ou cita prévia."""
    o = (cfg or {}).get("oferta")
    return isinstance(o, dict) and o.get("servico") == "ar"


ESTILOS = ("consultiva", "comercial")


def estilo(cfg: Dict[str, Any]) -> str:
    """Como o robo aborda: "consultiva" (padrao: descobre, mostra, convida) ou "comercial" (promocao clara e atrativa depois da previa)."""
    return cfg.get("estilo") if cfg.get("estilo") in ESTILOS else "consultiva"


def normalizar_promocao(d: Any) -> Dict[str, Any]:
    """A promocao REAL do dono: so campos conhecidos. Nada de prazo ou escassez que ele nao tenha escrito."""
    d = d if isinstance(d, dict) else {}
    return {
        "ativa": bool(d.get("ativa")),
        "preco": _numero(d.get("preco")),
        "inclui": _texto(d.get("inclui"), 500),     # um item por linha: hospedagem, dominio, manutencao...
        "validade": _texto(d.get("validade"), 80),  # opcional ("ate 30/11"); vazio = nao cita prazo
        "chamada": _texto(d.get("chamada"), 160),   # a pergunta final; vazio = a padrao
        # o que acompanha a promoção: só a prévia do site (padrão antigo), só o card da promoção, ou os dois
        "formato": d.get("formato") if d.get("formato") in ("previa", "card", "ambos") else "previa",
        # manda o card já na PRIMEIRA mensagem do WhatsApp (a abordagem), não só quando o lead responde
        "card_na_abordagem": bool(d.get("card_na_abordagem")),
    }


def promocao_ativa(cfg: Dict[str, Any]) -> bool:
    """Promocao so vale no estilo comercial, ligada e com preco: sem preco o robo nao tem o que anunciar."""
    p = normalizar_promocao(cfg.get("promocao"))
    return estilo(cfg) == "comercial" and p["ativa"] and p["preco"] > 0 and not sem_previa(cfg)


def formato_da_promocao(cfg: Dict[str, Any]) -> str:
    """previa | card | ambos (só vale com a promoção ativa)."""
    return normalizar_promocao(cfg.get("promocao"))["formato"] if promocao_ativa(cfg) else "previa"


def usa_card(cfg: Dict[str, Any]) -> bool:
    return formato_da_promocao(cfg) in ("card", "ambos")


def card_na_abordagem(cfg: Dict[str, Any]) -> bool:
    return usa_card(cfg) and normalizar_promocao(cfg.get("promocao"))["card_na_abordagem"]


def so_card(cfg: Dict[str, Any]) -> bool:
    """Promoção com card NO LUGAR da prévia: o robô não oferece nem cria prévia do site."""
    return formato_da_promocao(cfg) == "card"


def _itens(texto: str) -> List[str]:
    return [i.strip(" -*\u2022\t") for i in re.split(r"[\n;]", texto or "") if i.strip(" -*\u2022\t")][:8]


def mensagem_da_promocao(cfg: Dict[str, Any], lead: Optional[Dict[str, Any]] = None) -> str:
    """O aviso da promocao, montado em codigo com o que o dono cadastrou (preco e itens exatos)."""
    p = normalizar_promocao(cfg.get("promocao"))
    oferta = normalizar(cfg.get("oferta") or {})
    servico = (oferta["nome"] or "site").strip()
    linhas = [f"🔥 *Promoção imperdível!* O {servico.lower() if servico.lower().startswith('site') else servico} sai por apenas *{_brl(p['preco'])}*."]
    itens = _itens(p["inclui"])
    if itens:
        linhas.append("Já está incluso:\n" + "\n".join(f"✅ {i}" for i in itens))
    if p["validade"]:
        linhas.append(f"Condição válida {p['validade'].rstrip('.')}.")
    # a prévia é uma primeira ideia: isso fica claro antes de qualquer convite
    linhas.append("Lembrando que o que você viu é uma *prévia*, uma primeira ideia com fotos e textos de exemplo. No site de verdade entram as *suas fotos* e informações, "
                  "e o *layout, as cores e as seções podem mudar* do jeito que combinar com o seu negócio.")
    linhas.append(p["chamada"] or "Que tal uma conversa rápida para eu te mostrar como ele pode ficar ainda melhor? 🙂")
    return "\n\n".join(linhas)


def _brl(v: float) -> str:
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".").replace(",00", "")


def ativa(cfg: Dict[str, Any]) -> bool:
    o = cfg.get("oferta")
    return isinstance(o, dict) and bool(o.get("servico"))


def linhas_de_preco(oferta: Dict[str, Any]) -> List[str]:
    """Linhas no formato 'nome: R$ valor (...)' que o desconto e o
    verificador de valores ja sabem ler."""
    nome = oferta.get("nome") or PLAYBOOKS[oferta.get("servico", "outro")]["nome"]
    linhas: List[str] = []
    if oferta.get("preco"):
        extra = f" (entrega em {oferta['prazo_dias']} dias)" if oferta.get("prazo_dias") else ""
        linhas.append(f"{nome}: {_brl(oferta['preco'])}{extra}")
    if oferta.get("esboco") == "pago" and oferta.get("esboco_preco"):
        linhas.append(f"Esboço do {nome}: {_brl(oferta['esboco_preco'])}")
    # tabela de preços do serviço local: cada linha com "R$" entra no catálogo que o verificador de valores conhece
    for l in (oferta.get("tabela_precos") or "").split("\n"):
        if "R$" in l and ":" in l:
            linhas.append(l.strip(" -*•\t"))
    if oferta.get("visita") == "paga" and oferta.get("visita_preco"):
        linhas.append(f"Visita técnica: {_brl(oferta['visita_preco'])}")
    promo = oferta.get("_promocao") or {}
    if promo.get("preco"):
        linhas.append(f"Promoção do {nome}: {_brl(promo['preco'])}")
    return linhas


def _sem_acento(t: str) -> str:
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", str(t or "").lower()) if unicodedata.category(c) != "Mn")


def itens_da_tabela(oferta: Dict[str, Any]) -> List[Dict[str, Any]]:
    """A tabela de preços do serviço local, linha a linha: [{"nome": "Limpeza de split", "preco": 150.0}]."""
    itens: List[Dict[str, Any]] = []
    for l in (oferta.get("tabela_precos") or "").split("\n"):
        l = l.strip(" -*\u2022\t")
        m = re.match(r"^(.+?)\s*[:\-–]\s*R\$\s*([\d.,]+)", l)
        if m and _numero(m.group(2)) > 0:
            itens.append({"nome": m.group(1).strip(), "preco": _numero(m.group(2))})
    return itens


def _achar_item(itens: List[Dict[str, Any]], pedido: str) -> Optional[Dict[str, Any]]:
    """O item da tabela que o modelo citou: nome igual, ou o único que contém as palavras citadas. Na dúvida, nenhum (nunca chuta preço)."""
    alvo = _sem_acento(pedido).strip()
    if not alvo:
        return None
    for it in itens:
        if _sem_acento(it["nome"]).strip() == alvo:
            return it
    palavras = set(re.findall(r"\w{3,}", alvo))
    candidatos = [it for it in itens if palavras and palavras <= set(re.findall(r"\w{3,}", _sem_acento(it["nome"])))]
    return candidatos[0] if len(candidatos) == 1 else None


def calcular_orcamento(oferta: Dict[str, Any], pedidos: Any) -> Dict[str, Any]:
    """O orçamento SOMADO EM CÓDIGO: o modelo diz o que o cliente quer (item da tabela e quantidade); o valor sai só da tabela cadastrada.

    Devolve {"linhas": [...], "total": float, "fora_da_tabela": [...]}. Se algum item não está na tabela, o total não deve ser enviado.
    """
    itens = itens_da_tabela(oferta)
    linhas: List[Dict[str, Any]] = []
    fora: List[str] = []
    for p in (pedidos if isinstance(pedidos, list) else [])[:12]:
        if not isinstance(p, dict):
            continue
        it = _achar_item(itens, str(p.get("item") or ""))
        try:
            qtd = max(1, min(99, int(float(p.get("qtd") or 1))))
        except (TypeError, ValueError):
            qtd = 1
        if not it:
            fora.append(str(p.get("item") or "")[:60])
            continue
        linhas.append({"nome": it["nome"], "qtd": qtd, "unitario": it["preco"], "subtotal": round(it["preco"] * qtd, 2)})
    return {"linhas": linhas, "total": round(sum(l["subtotal"] for l in linhas), 2), "fora_da_tabela": [f for f in fora if f]}


def mensagem_do_orcamento(oferta: Dict[str, Any], calc: Dict[str, Any]) -> str:
    """O orçamento em texto, com os números da tabela e a soma feita em código."""
    linhas = [f"• {l['qtd']} × {l['nome']}: {_brl(l['unitario'])}" + (f" cada ({_brl(l['subtotal'])})" if l["qtd"] > 1 else "") for l in calc["linhas"]]
    txt = "📋 *Orçamento*\n" + "\n".join(linhas) + (f"\n\n*Total: {_brl(calc['total'])}*" if len(linhas) > 1 or calc["linhas"][0]["qtd"] > 1 else "")
    txt += "\n\nO valor final é confirmado pelo técnico, conforme o aparelho e o local." if oferta.get("visita") != "nao" else "\n\nO valor pode mudar conforme o aparelho e o local."
    return txt


def aplicar(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """A config com o catalogo da oferta somado ao catalogo livre.

    Faz o preco cadastrado valer para o limite de desconto e para o
    verificador, sem precisar duplicar o numero em dois lugares.
    """
    if not ativa(cfg) or cfg.get("_oferta_aplicada"):
        return cfg
    oferta = normalizar(cfg["oferta"])
    if promocao_ativa(cfg):
        oferta["_promocao"] = normalizar_promocao(cfg.get("promocao"))
    linhas = linhas_de_preco(oferta)
    livre = (cfg.get("catalogo") or "").strip()
    return {**cfg, "oferta": oferta, "_oferta_aplicada": True,
            "catalogo": "\n".join([*linhas, livre] if livre else linhas)}


def bloco_do_servico(cfg: Dict[str, Any], lead: Optional[Dict[str, Any]]) -> str:
    """O trecho do prompt com os fatos do dono e o roteiro do servico."""
    if not ativa(cfg):
        return ""
    o = normalizar(cfg["oferta"])
    pb = PLAYBOOKS[o["servico"]]
    nome = o["nome"] or pb["nome"]
    inclui = o["inclui"] or pb["inclui"]
    tem_site = bool((lead or {}).get("site_publicado"))

    fatos = [f"Serviço: {nome}"]
    if o["servico"] == "ar":
        if o["preco"]:
            fatos.append(f"Preço base: {_brl(o['preco'])}")
        elif not o["tabela_precos"]:
            fatos.append("Preços: NÃO cadastrados. Não diga valores; diga que o técnico passa o orçamento na visita ou pelo WhatsApp.")
        if not o["prazo_dias"]:
            fatos.append("Prazo para atender: NÃO cadastrado. Não prometa dia; combine o horário na conversa.")
    else:
        fatos.append(f"Preço: {_brl(o['preco'])}" if o["preco"]
                     else "Preço: NÃO cadastrado. Não diga valores; diga que depende do escopo e leve para a conversa.")
        fatos.append(f"Prazo de entrega: {o['prazo_dias']} dias" if o["prazo_dias"]
                     else "Prazo: NÃO cadastrado. Não prometa prazo; diga que confirma na conversa.")
    if inclui:
        fatos.append(f"O que inclui: {inclui}")
    if o["nao_inclui"]:
        fatos.append(f"NÃO inclui (diga com clareza se perguntarem): {o['nao_inclui']}")
    if o["pagamento"]:
        fatos.append(f"Forma de pagamento: {o['pagamento']}")
    if o["revisoes"]:
        fatos.append(f"Ajustes/revisões: {o['revisoes']}")
    if o["garantia"]:
        fatos.append(f"Garantia: {o['garantia']}")
    if o["diferenciais"]:
        fatos.append(f"Diferenciais reais (use só estes): {o['diferenciais']}")

    if o["servico"] == "ar":
        if o["tabela_precos"]:
            fatos.append("Tabela de preços (só estes valores existem; outro serviço ou aparelho: diga que o técnico confirma na visita):\n" + o["tabela_precos"])
        if o["regiao"]:
            fatos.append(f"Região atendida: {o['regiao']} (fora disso, diga que não atende)")
        fatos.append({"gratis": "Visita técnica e orçamento: GRÁTIS, sem compromisso.",
                      "paga": f"Visita técnica: paga{(' (' + _brl(o['visita_preco']) + ')') if o['visita_preco'] else ''}; diga como o valor entra no serviço só se estiver nos fatos.",
                      "nao": "Não há visita técnica: o orçamento sai por mensagem, com o que a pessoa descrever."}[o["visita"]])
        if o["agenda"]:
            fatos.append(f"Agenda e horários de atendimento: {o['agenda']}")
        regra_esboco = ("SEM SITE E SEM PRÉVIA: este serviço não envolve site, prévia, esboço nem link. Nunca ofereça nem cite. "
                        "O próximo passo é sempre o orçamento ou a visita técnica.")
    elif o["esboco"] == "gratis":
        prazo = f" {o['esboco_prazo']}" if o["esboco_prazo"] else ""
        if tem_site:
            regra_esboco = (
                "ESBOÇO: já existe um esboço pronto para este negócio (link no dossiê). Ele é o seu trunfo: "
                "mande o link (se ele já disse sim para receber), com UMA frase de contexto sobre o que ele vai ver e peça a opinião dele. "
                "Chame de PRÉVIA (ou esboço/modelo), nunca de \"site pronto\" ou \"site profissional que preparei\": é uma primeira ideia, com fotos e textos "
                "de exemplo; o site de verdade é feito depois, com as fotos e informações reais dele. "
                "Só depois que ele opinar proponha a reunião curta de uns 10 minutos para ajustar. É grátis e sem compromisso."
            )
        else:
            regra_esboco = (
                f"ESBOÇO: você pode oferecer um esboço GRÁTIS, sem compromisso{prazo}, para a pessoa ver como ficaria "
                "antes de decidir. Se ela aceitar, peça só o essencial (nome de quem decide, logo ou cores se tiver, "
                "o que não pode faltar) e passe para o humano (passar_para_humano=true, motivo 'aceitou esboço'). "
                "Não diga que o esboço já está pronto: ele ainda não existe."
            )
    elif o["esboco"] == "pago":
        preco = f" por {_brl(o['esboco_preco'])}" if o["esboco_preco"] else ""
        regra_esboco = f"ESBOÇO: existe esboço antes do fechamento{preco}. Explique o que a pessoa recebe e como o valor entra no serviço, só se estiver nos fatos acima."
    else:
        regra_esboco = "ESBOÇO: não há esboço antes de fechar. Não prometa. Mostre valor com exemplos e o diagnóstico."

    promo_txt = ""
    if promocao_ativa(cfg) and o["servico"] != "ar":
        p = normalizar_promocao(cfg.get("promocao"))
        itens = "; ".join(_itens(p["inclui"])) or "o que estiver nos fatos acima"
        aviso_da_promo = (
            "Nesta promoção NÃO há prévia do site: não ofereça, não prometa nem crie prévia. Quando o cliente quiser conhecer a condição (ou aceitar ouvir), "
            "a promoção sai AUTOMÁTICA, com um card; convide-o assim: \"Posso te mandar a condição especial que estamos fazendo?\". Não cite o valor por iniciativa."
            if so_card(cfg) else
            'O aviso dela sai automático quando o cliente reagir bem à prévia ("gostei"); NÃO o cite por iniciativa nem mande valor junto com o link.')
        promo_txt = f"""

== ESTILO COMERCIAL E PROMOÇÃO ATIVA ==
PROMOÇÃO REAL: {nome} por {_brl(p['preco'])}, com: {itens}.{(' Válida ' + p['validade'] + '.') if p['validade'] else ''} {aviso_da_promo} Depois de enviado, cite só este preço e estes itens.
Tom entusiasmado e direto, com benefício concreto, e rumo a uma CONVERSA em que você mostra como melhorar o site: sem empurrar pagamento nem pedir Pix, documentos ou material. Lembre que o que ele viu é uma PRÉVIA (entram as fotos dele e o layout pode mudar).
Nunca invente escassez, desconto, brinde ou prazo. O endereço é .vercel.app (sem custo de domínio): diga com clareza se perguntarem. "Quero fechar" tem resposta automática."""
    return f"""== O SERVIÇO QUE VOCÊ VENDE AGORA (fatos do dono; fora disso não existe) ==
{chr(10).join('- ' + f for f in fatos)}
- {regra_esboco}

== COMO VENDER ESTE SERVIÇO ==
Tese: {pb['tese']}
Descoberta: {pb['descoberta']}
Condução: {pb['conducao']}
Sempre que falar de preço, fale junto do que muda para o negócio dele e do que está incluso; nunca solte o número sozinho.{promo_txt}"""
