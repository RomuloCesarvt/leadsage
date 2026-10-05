"""O arquiteto de sites: identidade visual antes do texto.

O construtor da tela já tem layouts de verdade. O que faltava era o
projeto: qual layout combina com aquele negócio, que paleta usar, que
tipografia, e o que cada seção precisa dizer. Sem isso, todo site saía
com a mesma cor azul padrão e o mesmo texto de "qualidade e compromisso"
— e dois clientes do mesmo usuário recebiam páginas gêmeas.

A decisão visual **não** é da IA, de propósito. Ela é calculada a partir
do próprio negócio (nome + ramo + cidade), o que dá três garantias que
um modelo não dá:

- dois negócios diferentes nunca caem na mesma combinação por acaso;
- o mesmo negócio gera sempre a mesma identidade, então reabrir o
  construtor não embaralha o site que o usuário já mostrou ao cliente;
- a paleta sai de um conjunto conferido: contraste testado, nada de
  texto cinza-claro sobre bege.

À IA sobra o que ela faz bem: escrever o texto daquele negócio, dentro
do projeto já decidido.
"""
import hashlib
import time
from typing import Any, Dict, List, Optional, Tuple

from app.ai_client import AIIndisponivel, TIMEOUT_LONGO_MS, build_client, gerar_json, generate_with_fallback, strip_code_fence
from app.copy_knowledge import _chave, bloco_de_mercado, conhecimento_do_nicho

# Famílias de mercado. O agrupamento é visual, não comercial: uma
# barbearia e um salão pedem o mesmo tipo de página; uma clínica e um
# escritório de contabilidade, não.
FAMILIA_POR_NICHO = {
    "padaria": "alimentacao",
    "restaurante": "alimentacao",
    "clinica": "saude",
    "odontologia": "saude",
    "advocacia": "juridico",
    "contabilidade": "juridico",
    "estetica": "beleza",
    "barbearia": "beleza",
    "beleza": "beleza",
    "academia": "fitness",
    "petshop": "pet",
    "imobiliaria": "imobiliario",
    "mecanica": "oficina",
    "construcao": "oficina",
    "educacao": "educacao",
}

# Cada paleta é (primária, destaque). Todas foram escolhidas com a
# primária escura o bastante para receber texto branco e o destaque
# claro o bastante para receber texto escuro — é o que o layout assume.
PALETAS: Dict[str, List[Tuple[str, str]]] = {
    "alimentacao": [("#9a3412", "#f59e0b"), ("#7f1d1d", "#fbbf24"), ("#78350f", "#fcd34d"),
                    ("#166534", "#f97316")],
    "saude": [("#0e7490", "#22d3ee"), ("#0f766e", "#5eead4"), ("#1d4ed8", "#60a5fa"),
              ("#155e75", "#a7f3d0")],
    "juridico": [("#0f172a", "#c2a14d"), ("#1e3a8a", "#94a3b8"), ("#312e26", "#d6b36a"),
                 ("#134e4a", "#cbd5e1")],
    "beleza": [("#4c1d95", "#f472b6"), ("#831843", "#fbcfe8"), ("#111827", "#d4af37"),
               ("#581c87", "#f0abfc")],
    "fitness": [("#0f172a", "#84cc16"), ("#b91c1c", "#facc15"), ("#1e40af", "#22d3ee"),
                ("#18181b", "#f97316")],
    "pet": [("#0f766e", "#fbbf24"), ("#7c3aed", "#fcd34d"), ("#0369a1", "#fda4af"),
            ("#15803d", "#fde047")],
    "imobiliario": [("#0f172a", "#c19a6b"), ("#14532d", "#e7e5e4"), ("#1e293b", "#a8a29e"),
                    ("#164e63", "#fcd34d")],
    "oficina": [("#1f2937", "#f97316"), ("#075985", "#fbbf24"), ("#7c2d12", "#fde047"),
                ("#0f172a", "#ef4444")],
    "educacao": [("#1d4ed8", "#f59e0b"), ("#065f46", "#fcd34d"), ("#5b21b6", "#67e8f9"),
                 ("#9d174d", "#fdba74")],
    "": [("#2563eb", "#f59e0b"), ("#0f172a", "#38bdf8"), ("#047857", "#f97316"),
         ("#4338ca", "#fbbf24")],
}

# Pares tipográficos montados só com fontes de sistema: o site publicado
# precisa abrir sem internet e sem CDN, inclusive no celular do cliente
# do usuário.
TIPOGRAFIAS = [
    {
        "id": "editorial",
        "nome": "Editorial",
        "titulos": 'Georgia,"Times New Roman",serif',
        "corpo": '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif',
        "espacamento": "-0.5px",
        "caixa": "none",
    },
    {
        "id": "moderna",
        "nome": "Moderna",
        "titulos": '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
        "corpo": '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
        "espacamento": "-1.2px",
        "caixa": "none",
    },
    {
        "id": "classica",
        "nome": "Clássica",
        "titulos": '"Palatino Linotype","Book Antiqua",Palatino,Georgia,serif',
        "corpo": '"Segoe UI",Tahoma,Geneva,Verdana,sans-serif',
        "espacamento": "0px",
        "caixa": "none",
    },
    {
        "id": "tecnica",
        "nome": "Técnica",
        "titulos": '"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
        "corpo": '"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
        "espacamento": "1.5px",
        "caixa": "uppercase",
    },
    {
        "id": "acolhedora",
        "nome": "Acolhedora",
        "titulos": '"Trebuchet MS","Lucida Grande",Verdana,sans-serif',
        "corpo": '"Trebuchet MS","Lucida Grande",Verdana,sans-serif',
        "espacamento": "-0.3px",
        "caixa": "none",
    },
]

CANTOS = [
    {"id": "reto", "nome": "Reto", "caixa": "2px", "botao": "4px"},
    {"id": "suave", "nome": "Suave", "caixa": "14px", "botao": "10px"},
    {"id": "redondo", "nome": "Redondo", "caixa": "22px", "botao": "999px"},
]

# Layout recomendado por família. São os ids dos templates do construtor.
# Os layouts premium. O mapa apontava para os quatro da primeira geracao:
# quem clicava em "Escrever textos com IA" sem ter escolhido layout a mao
# via o site trocar, sozinho, para o visual antigo.
LAYOUT_POR_FAMILIA = {
    "alimentacao": "aurora",
    "beleza": "estudio",
    "pet": "vibrante",
    "saude": "clinica",
    "juridico": "escritorio",
    "educacao": "vibrante",
    "imobiliario": "escritorio",
    "oficina": "oficina",
    "fitness": "vibrante",
    "": "clinica",
}


def _semente(*partes: str) -> int:
    """Número estável a partir do texto. Mesmo negócio, mesma identidade."""
    base = "|".join(p.strip().lower() for p in partes if p)
    return int(hashlib.sha256(base.encode("utf-8")).hexdigest()[:8], 16)


def familia_do_nicho(niche: str, role: str = "") -> str:
    return FAMILIA_POR_NICHO.get(_chave(niche) or _chave(role), "")


def briefing_visual(
    empresa: str, niche: str = "", role: str = "", cidade: str = ""
) -> Dict[str, Any]:
    """A identidade daquele negócio: paleta, tipografia, cantos e layout."""
    familia = familia_do_nicho(niche, role)
    paletas = PALETAS.get(familia) or PALETAS[""]
    semente = _semente(empresa, niche or role, cidade)

    primaria, destaque = paletas[semente % len(paletas)]
    # Divisões sucessivas: cada decisão usa uma faixa diferente do mesmo
    # número, para as escolhas não andarem juntas.
    tipografia = TIPOGRAFIAS[(semente // 7) % len(TIPOGRAFIAS)]
    cantos = CANTOS[(semente // 53) % len(CANTOS)]

    return {
        "familia": familia or "geral",
        "paleta": {"primaria": primaria, "destaque": destaque},
        "tipografia": tipografia,
        "cantos": cantos,
        "layout": LAYOUT_POR_FAMILIA.get(familia, "clinica"),
        "motivo": _motivo(familia, tipografia["nome"], cantos["nome"]),
    }


def _motivo(familia: str, tipografia: str, cantos: str) -> str:
    leitura = {
        "alimentacao": "cor quente e foto grande, porque a decisão aqui é por desejo",
        "saude": "azul e verde frios, que é o que o paciente associa a cuidado e limpeza",
        "juridico": "tons escuros e dourado discreto, para transmitir seriedade antes do conteúdo",
        "beleza": "contraste forte e acabamento sofisticado, no padrão que esse público já espera",
        "fitness": "alto contraste e energia, com o plano visível logo na primeira tela",
        "pet": "cores afetivas, sem infantilizar o serviço",
        "imobiliario": "sobriedade e espaço em branco, para a foto do imóvel mandar",
        "oficina": "telefone gritando na primeira tela, porque a busca costuma ser urgente",
        "educacao": "confiança e organização, para o responsável comparar propostas",
    }.get(familia, "paleta neutra e legível, apostando na clareza")
    return f"{leitura}. Tipografia {tipografia.lower()} e cantos {cantos.lower()}."


# ------------------------------------------------------------ texto do site

def _dados_do_lead(lead: Any) -> Dict[str, Any]:
    """Aceita LeadItem ou dicionário — a prévia e o construtor chamam diferente."""
    if isinstance(lead, dict):
        return lead
    return {
        "company": getattr(lead, "company", "") or getattr(lead, "name", ""),
        "name": getattr(lead, "name", ""),
        "role": getattr(lead, "role", ""),
        "niche": getattr(lead, "niche", ""),
        "city": getattr(lead, "city", ""),
        "neighborhood": getattr(lead, "neighborhood", "") or "",
        "address": getattr(lead, "address", "") or "",
        "phone": getattr(lead, "phone", "") or "",
        "email": getattr(lead, "email", "") or "",
        "rating": getattr(lead, "rating", None),
        "rating_count": getattr(lead, "rating_count", None),
        "opening_hours": getattr(lead, "opening_hours", "") or "",
        "google_description": getattr(lead, "google_description", "") or "",
        "review_highlight": getattr(lead, "review_highlight", "") or "",
        "price_level": getattr(lead, "price_level", "") or "",
        "instagram": ((getattr(lead, "socials", None).instagram if getattr(lead, "socials", None) else "") or ""),
    }


def _contexto(d: Dict[str, Any]) -> str:
    linhas = [
        f"- Nome: {d.get('company')}",
        f"- Ramo: {d.get('role') or d.get('niche')}",
        f"- Cidade: {d.get('city')}" + (f" (bairro {d['neighborhood']})" if d.get("neighborhood") else ""),
    ]
    if d.get("address"):
        linhas.append(f"- Endereço: {d['address']}")
    if d.get("rating") and d.get("rating_count"):
        nota = f"{float(d['rating']):.1f}".replace(".", ",")
        linhas.append(f"- Reputação real: nota {nota} com {d['rating_count']} avaliações no Google")
    if d.get("google_description"):
        linhas.append(f"- Descrição do Google: {d['google_description']}")
    if d.get("review_highlight"):
        linhas.append(f'- Cliente escreveu: "{d["review_highlight"]}"')
    if d.get("opening_hours"):
        linhas.append(f"- Horário: {d['opening_hours']}")
    if d.get("price_level"):
        linhas.append(f"- Faixa de preço: {d['price_level']}")
    return "\n".join(linhas)


REGRAS_DE_CONTEUDO = """REGRAS DE CONTEÚDO (valem para tudo que você escrever)
- Escreva em português do Brasil, na voz do próprio negócio ("atendemos",
  "nossa equipe"), nunca na voz de quem vende o site.
- Não invente: prêmio, ano de fundação, número de clientes, certificação,
  nome de profissional, preço, depoimento. Se não está nos dados acima,
  não existe.
- Nada de frase de encher linguiça: "qualidade e compromisso",
  "excelência no atendimento", "tradição e inovação", "soluções sob
  medida". Se a frase serve para qualquer negócio da mesma rua, ela está
  errada.
- Cada serviço precisa dizer o que a pessoa leva, não o nome bonito do
  procedimento.
- Frases curtas. O visitante lê no celular, em pé, com pressa."""


def _prompt_do_conteudo(d: Dict[str, Any], briefing: Dict[str, Any], servico_do_usuario: str) -> str:
    mercado = bloco_de_mercado(d.get("niche", ""), d.get("role", ""))
    saber = conhecimento_do_nicho(d.get("niche", ""), d.get("role", ""))
    decide = saber.get("prova", "")

    return f"""Você escreve o conteúdo de um site de uma página para um negócio local
brasileiro. O site será mostrado ao dono como prévia, então cada palavra
precisa soar como o negócio dele — não como um modelo preenchido.

O NEGÓCIO (dados verificados)
{_contexto(d)}

COMO ESSE MERCADO FUNCIONA
{mercado}
{('O que decide a escolha do cliente: ' + decide) if decide else ''}

PROJETO VISUAL JÁ DEFINIDO (não mude, só escreva dentro dele)
- Identidade: {briefing['motivo']}
- Layout: {briefing['layout']}

{REGRAS_DE_CONTEUDO}

RETORNO
JSON puro, sem markdown, com estas chaves:
- "categoria": como o negócio se apresenta, 2 a 4 palavras (ex.: "Padaria e confeitaria")
- "slogan": frase de capa, no máximo 10 palavras, concreta e específica
- "sobre": 2 frases sobre o negócio, sem autoelogio genérico
- "servicos": 4 objetos com "titulo" (até 4 palavras) e "descricao" (uma frase do que o cliente leva)
- "diferenciais": 3 frases curtas de até 8 palavras, cada uma um motivo real de escolher esse lugar
- "cta": o texto do botão principal, até 4 palavras
- "seo_titulo": título da aba, até 60 caracteres, com serviço e cidade
- "seo_descricao": até 155 caracteres, convidativa e específica
"""


async def gerar_conteudo_de_site(
    lead: Any, api_key: str, servico_do_usuario: str = ""
) -> Dict[str, Any]:
    """Texto do site + o projeto visual daquele negócio.

    Devolve tudo que o construtor precisa para montar a página: o
    conteúdo escrito pela IA e a identidade calculada aqui.
    """
    if not api_key:
        raise AIIndisponivel(
            "A escrita com IA não está configurada: falta a chave do Gemini."
        )

    d = _dados_do_lead(lead)
    briefing = briefing_visual(
        d.get("company", ""), d.get("niche", ""), d.get("role", ""), d.get("city", "")
    )

    client = build_client(api_key, TIMEOUT_LONGO_MS)
    dados = gerar_json(
        client,
        _prompt_do_conteudo(d, briefing, servico_do_usuario),
        obrigatorias=["slogan", "sobre", "servicos"],
    )

    servicos = []
    for item in (dados.get("servicos") or [])[:6]:
        if isinstance(item, dict) and str(item.get("titulo") or "").strip():
            servicos.append({
                "titulo": str(item["titulo"]).strip()[:60],
                "descricao": str(item.get("descricao") or "").strip()[:220],
            })

    return {
        "categoria": str(dados.get("categoria") or d.get("role") or "")[:60],
        "slogan": str(dados.get("slogan") or "")[:140],
        "sobre": str(dados.get("sobre") or "")[:600],
        "servicos": servicos,
        "diferenciais": [str(x)[:80] for x in (dados.get("diferenciais") or [])[:4] if str(x).strip()],
        "cta": str(dados.get("cta") or "Falar no WhatsApp")[:30],
        "seo_titulo": str(dados.get("seo_titulo") or "")[:70],
        "seo_descricao": str(dados.get("seo_descricao") or "")[:170],
        "identidade": {
            "familia": briefing["familia"],
            "primaria": briefing["paleta"]["primaria"],
            "destaque": briefing["paleta"]["destaque"],
            "tipografia": briefing["tipografia"]["id"],
            "tipografia_nome": briefing["tipografia"]["nome"],
            "cantos": briefing["cantos"]["id"],
            "cantos_nome": briefing["cantos"]["nome"],
            "layout": briefing["layout"],
            "motivo": briefing["motivo"],
        },
    }


# ------------------------------------------------------- prévia em HTML puro

def _prompt_da_previa(d: Dict[str, Any], briefing: Dict[str, Any]) -> str:
    tipo = briefing["tipografia"]
    canto = briefing["cantos"]
    zap = "".join(c for c in str(d.get("phone") or "") if c.isdigit())

    return f"""Escreva o HTML completo de um site de uma página para o negócio abaixo.
Ele será aberto direto no navegador, sem servidor, para mostrar ao dono
como o negócio dele poderia aparecer na internet.

O NEGÓCIO (dados verificados — use os reais, não invente outros)
{_contexto(d)}
{f'- WhatsApp: https://wa.me/{zap}' if zap else '- Sem telefone conhecido: não invente um'}
{f"- Instagram: {d['instagram']}" if d.get('instagram') else ''}

PROJETO VISUAL (obrigatório, já decidido)
- Cor principal: {briefing['paleta']['primaria']}
- Cor de destaque: {briefing['paleta']['destaque']}
- Títulos na fonte: {tipo['titulos']}
- Texto na fonte: {tipo['corpo']}
- Espaçamento dos títulos: {tipo['espacamento']}; caixa: {tipo['caixa']}
- Arredondamento dos blocos: {canto['caixa']}; dos botões: {canto['botao']}
- Leitura da identidade: {briefing['motivo']}

REGRAS TÉCNICAS (o arquivo precisa abrir sozinho)
- Um único arquivo HTML, do <!DOCTYPE html> ao </html>.
- Todo o CSS dentro de uma tag <style>. Nenhum link externo: sem CDN,
  sem Tailwind, sem Google Fonts, sem imagem de fora. Só fontes de
  sistema e as duas cores acima.
- Onde entraria foto, use fundo em gradiente ou forma em CSS a partir
  das cores da marca. Nunca <img> apontando para a internet.
- Responsivo de verdade: uma coluna abaixo de 720px, botão ocupando a
  largura toda, nada de rolagem horizontal.
- Contraste suficiente: texto claro sobre a cor principal, texto escuro
  sobre a de destaque.
- Botão flutuante de WhatsApp no canto inferior direito quando houver
  telefone, com o link real.
- Inclua <title> e <meta name="description"> com a cidade no texto.

ESTRUTURA
Capa com uma promessa concreta e dois botões (WhatsApp e ligar);
faixa com os diferenciais; seção de serviços com 4 itens; seção sobre o
negócio; bloco de endereço e horário; rodapé com contato. Se houver nota
e número de avaliações, mostre-os como prova social de um jeito discreto.

{REGRAS_DE_CONTEUDO}

Responda APENAS o HTML. Sem bloco markdown, sem explicação antes ou depois.
"""


async def gerar_previa_de_site(lead: Any, api_key: str) -> Tuple[str, float]:
    d = _dados_do_lead(lead)
    briefing = briefing_visual(
        d.get("company", ""), d.get("niche", ""), d.get("role", ""), d.get("city", "")
    )
    client = build_client(api_key, TIMEOUT_LONGO_MS)

    inicio = time.monotonic()
    html = strip_code_fence(generate_with_fallback(client, _prompt_da_previa(d, briefing)))
    segundos = round(time.monotonic() - inicio, 1)

    if "<html" not in html.lower():
        raise AIIndisponivel(
            "A IA não devolveu uma página utilizável. Tente gerar de novo."
        )
    return html, segundos
