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

SERVICOS = ("site", "gmn", "social", "trafego", "outro")
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
    }


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
    return linhas


def aplicar(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """A config com o catalogo da oferta somado ao catalogo livre.

    Faz o preco cadastrado valer para o limite de desconto e para o
    verificador, sem precisar duplicar o numero em dois lugares.
    """
    if not ativa(cfg) or cfg.get("_oferta_aplicada"):
        return cfg
    oferta = normalizar(cfg["oferta"])
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

    if o["esboco"] == "gratis":
        prazo = f" {o['esboco_prazo']}" if o["esboco_prazo"] else ""
        if tem_site:
            regra_esboco = (
                "ESBOÇO: já existe um esboço pronto para este negócio (link no dossiê). Ele é o seu trunfo: "
                "mande o link, peça a opinião em uma frase e proponha a reunião curta para ajustar. É grátis e sem compromisso."
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

    return f"""== O SERVIÇO QUE VOCÊ VENDE AGORA (fatos do dono; fora disso não existe) ==
{chr(10).join('- ' + f for f in fatos)}
- {regra_esboco}

== COMO VENDER ESTE SERVIÇO ==
Tese: {pb['tese']}
Descoberta: {pb['descoberta']}
Condução: {pb['conducao']}
Sempre que falar de preço, fale junto do que muda para o negócio dele e do que está incluso; nunca solte o número sozinho."""
