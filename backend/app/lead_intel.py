"""O que os dados brutos do lead significam para quem vai vender.

O motor de busca junta fatos (nota, avaliações, horário, site). Fatos
sozinhos não vendem: quem abre a lista precisa saber, em uma linha, por
que este negócio vale o contato e por onde começar a conversa.

Este módulo faz essa leitura — e faz sem IA, de propósito:

- o gancho tem que ser verdadeiro. Texto gerado inventa; aqui cada frase
  sai de um campo que veio do Google ou do site do próprio lead;
- roda em toda busca, para 60 leads. Uma chamada de modelo por lead
  estouraria o tempo da função e o custo;
- o que sai daqui é justamente o material que a IA usa depois para
  escrever a abordagem. Contexto verificado na entrada, texto na saída.

Tudo aqui é função pura sobre dicionários: dá para testar sem rede.
"""
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

# ----------------------------------------------------------------- preço

# O Google devolve a faixa como enum. O símbolo é o que o usuário lê.
FAIXAS_DE_PRECO = {
    "PRICE_LEVEL_FREE": ("Grátis", 0),
    "PRICE_LEVEL_INEXPENSIVE": ("$", 1),
    "PRICE_LEVEL_MODERATE": ("$$", 2),
    "PRICE_LEVEL_EXPENSIVE": ("$$$", 3),
    "PRICE_LEVEL_VERY_EXPENSIVE": ("$$$$", 4),
}


def faixa_de_preco(bruto: str) -> Tuple[str, Optional[int]]:
    """('$$', 2) — símbolo para a tela, número para o score."""
    simbolo, nivel = FAIXAS_DE_PRECO.get(bruto or "", ("", None))
    return simbolo, nivel


# ------------------------------------------------------- site: plataforma

# Assinaturas que aparecem no HTML de quem usa construtor pronto. Importa
# para a venda: um site feito no editor gratuito do Wix ou uma página de
# "em construção" do WordPress são oportunidade, não concorrência.
PLATAFORMAS = (
    ("Wix", ("wix.com", "wixstatic", "_wixcssimportrule", "wixsite.com")),
    ("WordPress", ("wp-content", "wp-includes", "wordpress")),
    ("Shopify", ("cdn.shopify.com", "shopify-features")),
    ("Squarespace", ("squarespace.com", "static1.squarespace")),
    ("Webflow", ("webflow.com", "wf-domain")),
    ("Google Sites", ("sites.google.com", "gstatic.com/_/sites")),
    ("Loja Integrada", ("lojaintegrada.com.br",)),
    ("Nuvemshop", ("nuvemshop", "tiendanube")),
    ("Linktree", ("linktr.ee", "linktree")),
    ("GoDaddy", ("godaddysites", "godaddy.com")),
    ("Elementor", ("elementor",)),
)

# Domínios de construtor gratuito: o negócio não tem domínio próprio, e
# isso aparece no link que ele manda para o cliente.
DOMINIOS_DE_VITRINE = (
    ".wixsite.com", ".business.site", ".blogspot.", ".webnode.",
    ".godaddysites.com", ".weebly.com", ".jimdosite.com", ".negocio.site",
)

MARCADORES_AGENDAMENTO = (
    "agendar", "agendamento", "marcar consulta", "marque sua", "calendly",
    "booking", "reservar mesa", "reserve sua", "agende", "doctoralia", "zenklub",
)

MARCADORES_LOJA = ("adicionar ao carrinho", "comprar agora", "finalizar compra", "checkout", "carrinho")

ANO_COPYRIGHT = re.compile(r"(?:©|&copy;|copyright)\s*(?:20\d{2}\s*[-–]\s*)?(20\d{2})", re.I)


def analisar_site(
    html: str,
    url: str,
    status: int = 200,
    tempo_ms: float = 0.0,
    ano_atual: int = 0,
) -> Dict[str, Any]:
    """Lê o HTML da home e devolve o estado do site, em sinais objetivos.

    Nada de "o site é feio": isso é opinião e não fecha venda. O que
    fecha é "não abre no celular", "não tem telefone na página" e "o
    rodapé diz 2019" — fatos que o dono confere em dez segundos.
    """
    baixo = (html or "").lower()
    sinais: Dict[str, Any] = {
        "url": url or "",
        "acessivel": bool(html) and 200 <= status < 300,
        "https": (url or "").lower().startswith("https://"),
        "tempo_ms": int(tempo_ms or 0),
        "plataforma": "",
        "dominio_proprio": True,
        "responsivo": False,
        "titulo": "",
        "descricao": "",
        "tem_telefone": False,
        "tem_whatsapp": False,
        "tem_formulario": False,
        "tem_agendamento": False,
        "tem_loja": False,
        "tem_mapa": False,
        "tem_analytics": False,
        "ano_rodape": None,
        "peso_kb": len(html or "") // 1024,
    }

    if not sinais["acessivel"]:
        return sinais

    dominio = urlparse(url or "").netloc.lower()
    sinais["dominio_proprio"] = not any(d in dominio for d in DOMINIOS_DE_VITRINE)

    for nome, marcas in PLATAFORMAS:
        if any(m in baixo for m in marcas):
            sinais["plataforma"] = nome
            break

    sinais["responsivo"] = 'name="viewport"' in baixo or "name='viewport'" in baixo

    titulo = re.search(r"<title[^>]*>(.*?)</title>", html or "", re.S | re.I)
    if titulo:
        sinais["titulo"] = re.sub(r"\s+", " ", titulo.group(1)).strip()[:160]

    descricao = re.search(
        r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']{10,400})',
        html or "", re.I
    )
    if descricao:
        sinais["descricao"] = re.sub(r"\s+", " ", descricao.group(1)).strip()[:300]

    sinais["tem_telefone"] = "tel:" in baixo or bool(re.search(r"\(\d{2}\)\s?\d{4,5}-?\d{4}", html or ""))
    sinais["tem_whatsapp"] = "wa.me" in baixo or "api.whatsapp" in baixo or "whatsapp" in baixo
    sinais["tem_formulario"] = "<form" in baixo
    sinais["tem_agendamento"] = any(m in baixo for m in MARCADORES_AGENDAMENTO)
    sinais["tem_loja"] = any(m in baixo for m in MARCADORES_LOJA)
    sinais["tem_mapa"] = "maps.google" in baixo or "google.com/maps" in baixo or "mapbox" in baixo
    sinais["tem_analytics"] = (
        "googletagmanager" in baixo or "google-analytics" in baixo or "gtag(" in baixo
        or "fbq(" in baixo or "facebook.net/" in baixo
    )

    ano = ANO_COPYRIGHT.search(html or "")
    if ano:
        try:
            sinais["ano_rodape"] = int(ano.group(1))
        except ValueError:
            pass

    return sinais


def qualidade_do_site(sinais: Dict[str, Any], ano_atual: int) -> Tuple[int, List[str]]:
    """Nota de 0 a 100 e a lista de problemas, em linguagem de dono de negócio.

    A nota não é estética: mede se o site cumpre o trabalho de converter
    quem chegou nele. Cada desconto vira uma frase que pode ir para a
    abordagem sem passar vergonha, porque é verificável.
    """
    if not sinais.get("acessivel"):
        return 0, ["o site não abre — quem clica no link do Google vê erro"]

    nota = 100
    problemas: List[str] = []

    if not sinais.get("responsivo"):
        nota -= 25
        problemas.append("não se adapta ao celular, onde está a maior parte das buscas")
    if not sinais.get("https"):
        nota -= 20
        problemas.append("abre sem cadeado de segurança e o navegador avisa o visitante")
    if not sinais.get("tem_telefone") and not sinais.get("tem_whatsapp"):
        nota -= 20
        problemas.append("não tem telefone nem WhatsApp visível na página")
    elif not sinais.get("tem_whatsapp"):
        nota -= 8
        problemas.append("não tem botão de WhatsApp, o canal que esse público usa")
    if not sinais.get("tem_formulario") and not sinais.get("tem_agendamento"):
        nota -= 10
        problemas.append("não tem formulário nem agendamento: o visitante precisa ligar")
    if not sinais.get("descricao"):
        nota -= 8
        problemas.append("não tem descrição para o Google, o que derruba a posição na busca")
    if not sinais.get("titulo"):
        nota -= 6
        problemas.append("não tem título de página definido")
    if not sinais.get("dominio_proprio"):
        nota -= 12
        problemas.append("usa endereço de construtor gratuito em vez de domínio próprio")
    if not sinais.get("tem_analytics"):
        nota -= 5
        problemas.append("não tem medição de visitas: não dá para saber o que o site traz")

    ano_rodape = sinais.get("ano_rodape")
    if ano_atual and ano_rodape and ano_rodape <= ano_atual - 2:
        nota -= 10
        problemas.append(f"o rodapé ainda diz {ano_rodape}, passando impressão de abandono")

    tempo = sinais.get("tempo_ms") or 0
    if tempo > 4000:
        nota -= 12
        problemas.append("demora mais de 4 segundos para abrir")
    elif tempo > 2500:
        nota -= 6
        problemas.append("abre devagar em conexão de celular")

    return max(0, min(100, nota)), problemas


# ------------------------------------------------------------ avaliações

# Frases que aparecem em avaliação e valem como matéria-prima de conversa:
# elogio ao atendimento abre porta; reclamação de demora abre outra.
ELOGIO = ("atendimento", "atenciosa", "atencioso", "excelente", "ótimo", "otimo",
          "maravilhoso", "recomendo", "profissional", "carinho", "qualidade")
RECLAMACAO = ("demora", "demorado", "caro", "péssimo", "pessimo", "ruim", "falta",
              "não atende", "nao atende", "esperei", "descaso", "sujo")


def _texto_da_avaliacao(review: Dict[str, Any]) -> str:
    texto = review.get("text") or review.get("originalText") or {}
    if isinstance(texto, dict):
        texto = texto.get("text") or ""
    return re.sub(r"\s+", " ", str(texto)).strip()


def ler_avaliacoes(reviews: List[Dict[str, Any]], limite: int = 3) -> Dict[str, Any]:
    """Transforma as avaliações do Google em material de abordagem.

    Guarda poucas e curtas: a abordagem cita uma, não resume todas.
    """
    amostra: List[Dict[str, Any]] = []
    elogios, reclamacoes = 0, 0
    destaque = ""

    for review in reviews or []:
        texto = _texto_da_avaliacao(review)
        if not texto:
            continue
        nota = review.get("rating")
        baixo = texto.lower()
        if any(p in baixo for p in ELOGIO):
            elogios += 1
        if any(p in baixo for p in RECLAMACAO):
            reclamacoes += 1

        if len(amostra) < limite:
            amostra.append({
                "rating": nota,
                "text": texto[:280],
                "when": (review.get("relativePublishTimeDescription") or "")[:40],
            })
        # O destaque é o elogio mais curto: cabe inteiro numa mensagem.
        if nota and nota >= 4 and 40 <= len(texto) <= 180:
            if not destaque or len(texto) < len(destaque):
                destaque = texto

    return {
        "amostra": amostra,
        "destaque": destaque[:180],
        "elogios": elogios,
        "reclamacoes": reclamacoes,
    }


# --------------------------------------------------------------- ganchos

def _plural(n: int, singular: str, plural: str) -> str:
    return f"{n} {singular if n == 1 else plural}"


def montar_ganchos(lead: Dict[str, Any]) -> List[str]:
    """Fatos verificados que servem de primeira frase, do mais forte ao mais fraco.

    A IA recebe esta lista pronta. É a diferença entre "vi que vocês são
    referência na região" — que serve para qualquer um — e "213 avaliações
    com nota 4,8 e nenhum site para onde mandar quem procura".
    """
    ganchos: List[str] = []

    nota = lead.get("rating") or 0
    total = lead.get("rating_count") or 0
    bairro = lead.get("neighborhood") or ""
    cidade = lead.get("city") or ""
    lugar = f"{bairro} ({cidade})" if bairro and cidade else (bairro or cidade)
    # Nota em portugues: 4,7 — nao 4.7. Detalhe que entrega texto de robo
    # quando a frase vai inteira para dentro da mensagem.
    escrita = f"{nota:.1f}".replace(".", ",")

    if nota >= 4.5 and total >= 30:
        ganchos.append(
            f"nota {escrita} com {_plural(total, 'avaliação', 'avaliações')} no Google"
            + (f" — das melhores de {lugar}" if lugar else "")
        )
    elif total >= 10:
        ganchos.append(f"{_plural(total, 'avaliação', 'avaliações')} no Google, nota {escrita}")
    elif total:
        ganchos.append(f"apenas {_plural(total, 'avaliação', 'avaliações')} no Google")
    else:
        ganchos.append("perfil no Google ainda sem avaliações")

    destaque = lead.get("review_highlight") or ""
    if destaque:
        ganchos.append(f'um cliente escreveu no Google: "{destaque}"')

    estado = lead.get("site_status") or "none"
    if estado == "none":
        ganchos.append("nenhum site no perfil do Google: quem procura no celular não tem para onde ir")
    elif estado == "social":
        ganchos.append("o link do perfil leva à rede social, não a um site")
    elif estado == "aggregator":
        ganchos.append("o link do perfil é um agregador (tipo Linktree), não um site próprio")
    elif estado == "whatsapp":
        ganchos.append("o link do perfil é o WhatsApp direto, sem nenhuma página antes")

    problemas = lead.get("site_issues") or []
    if problemas:
        ganchos.append(f"o site atual {problemas[0]}")
    if len(problemas) > 1:
        ganchos.append(f"e também {problemas[1]}")

    if lead.get("site_platform"):
        ganchos.append(f"o site roda em {lead['site_platform']}")

    horario = lead.get("opening_hours") or ""
    if horario and "24 horas" not in horario:
        ganchos.append("fora do horário de atendimento não há ninguém para responder")

    if lead.get("price_level"):
        ganchos.append(f"faixa de preço {lead['price_level']} segundo o Google")

    descricao = lead.get("google_description") or ""
    if descricao:
        ganchos.append(f"o próprio Google descreve o negócio como: {descricao[:120]}")

    return [g for g in ganchos if g][:8]


# Qual canal tem mais chance de ser lido, dado o que o lead tem.
def melhor_canal(lead: Dict[str, Any]) -> str:
    if lead.get("whatsapp") and lead.get("phone"):
        return "whatsapp"
    if lead.get("email"):
        return "email"
    if (lead.get("socials") or {}).get("instagram"):
        return "instagram_direct"
    if lead.get("phone"):
        return "whatsapp"
    return "email"


def montar_diagnostico(lead: Dict[str, Any]) -> str:
    """Uma frase de leitura comercial: o que está acontecendo com esse negócio.

    Substitui o resumo anterior, que repetia os mesmos dados da linha de
    cima do card sem dizer nada a mais.
    """
    nome = lead.get("company") or "O negócio"
    total = lead.get("rating_count") or 0
    nota = lead.get("rating") or 0
    estado = lead.get("site_status") or "none"
    nota_site = lead.get("site_quality")
    escrita = f"{nota:.1f}".replace(".", ",")

    if total >= 50 and nota >= 4.5 and estado != "own":
        base = (
            f"{nome} já tem reputação construída ({escrita} com {total} avaliações) "
            "e nenhum site próprio para capturar quem pesquisa antes de decidir. "
            "É o cenário mais fácil de vender: a demanda existe e vaza."
        )
    elif estado != "own":
        base = (
            f"{nome} não tem site próprio. Quem procura no celular encontra o perfil do "
            "Google e para por aí — sem preço, sem serviço, sem agendamento."
        )
    elif isinstance(nota_site, int) and nota_site < 60:
        base = (
            f"{nome} tem site, mas ele não cumpre o papel: {nota_site}/100 no diagnóstico. "
            "Aqui a venda é reforma, não construção."
        )
    elif total < 10:
        base = (
            f"{nome} aparece pouco: {total or 'nenhuma'} avaliação no Google. "
            "Antes do site, o gargalo é visibilidade."
        )
    else:
        base = (
            f"{nome} tem presença digital montada. A oportunidade está em conversão "
            "e em tirar o cliente do concorrente, não em existir na internet."
        )

    contato = []
    if lead.get("whatsapp"):
        contato.append("WhatsApp")
    if lead.get("email"):
        contato.append("e-mail")
    if (lead.get("socials") or {}).get("instagram"):
        contato.append("Instagram")
    if contato:
        base += f" Dá para falar com ele por {', '.join(contato)}."
    else:
        base += " O contato é o ponto fraco: só telefone fixo."

    return base
