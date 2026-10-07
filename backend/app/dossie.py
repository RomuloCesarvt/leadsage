"""Dossiê do lead: quem é a empresa, quem decide, onde dói e como abordar.

Complementa o raio-x. O raio-x responde "quem cuida da presença digital?";
o dossiê responde "com quem eu falo, sobre o quê, e abrindo como?".

Regras que valem para tudo aqui:

- **só fato com fonte.** Cada pessoa e cada dado da empresa carregam de onde
  vieram (site do próprio negócio, Receita Federal). Nome achado em texto
  corrido vem marcado como "citado no site", nunca como "dono";
- **dor com evidência.** Uma dor sem prova que o usuário confira em dez
  segundos vira a frase que faz o dono parar de responder;
- **abordagem diferente por negócio.** O modelo recebe os fatos deste lead e
  um estilo de abertura sorteado pelo próprio negócio (sempre o mesmo para o
  mesmo lead, mas diferente entre leads). Depois um verificador confere que
  a mensagem cita algo que só vale para este negócio; se não citar, cai no
  texto montado a partir dos fatos.
"""
import asyncio
import hashlib
import re
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from app.config import settings

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "pt-BR,pt;q=0.9",
}
PAGINAS_DE_PESSOAS = ("/sobre", "/quem-somos", "/a-clinica", "/a-empresa", "/institucional", "/equipe", "/contato")


# ---------------------------------------------------------------- CNPJ

CNPJ_RE = re.compile(r"\b(\d{2})\.?(\d{3})\.?(\d{3})/?(\d{4})-?(\d{2})\b")


def cnpj_valido(numeros: str) -> bool:
    """Confere os dois dígitos verificadores. Evita tratar telefone ou CEP
    colado a outro número como se fosse CNPJ."""
    if len(numeros) != 14 or len(set(numeros)) == 1:
        return False

    def digito(base: str, pesos: List[int]) -> str:
        soma = sum(int(n) * p for n, p in zip(base, pesos))
        resto = soma % 11
        return "0" if resto < 2 else str(11 - resto)

    d1 = digito(numeros[:12], [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    d2 = digito(numeros[:12] + d1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    return numeros[12:] == d1 + d2


def achar_cnpjs(texto: str) -> List[str]:
    achados: List[str] = []
    for m in CNPJ_RE.finditer(texto or ""):
        n = "".join(m.groups())
        if cnpj_valido(n) and n not in achados:
            achados.append(n)
    return achados


def _data_br(iso: str) -> str:
    try:
        return datetime.strptime(iso[:10], "%Y-%m-%d").strftime("%d/%m/%Y")
    except Exception:
        return ""


def _anos_desde(iso: str, hoje: Optional[date] = None) -> Optional[int]:
    try:
        d = datetime.strptime(iso[:10], "%Y-%m-%d").date()
    except Exception:
        return None
    hoje = hoje or date.today()
    return max(0, hoje.year - d.year - ((hoje.month, hoje.day) < (d.month, d.day)))


def _formatar_cnpj(n: str) -> str:
    n = re.sub(r"\D", "", n or "")
    return f"{n[:2]}.{n[2:5]}.{n[5:8]}/{n[8:12]}-{n[12:]}" if len(n) == 14 else n


def resumir_cnpj(bruto: Dict[str, Any], hoje: Optional[date] = None) -> Dict[str, Any]:
    """O que importa da Receita para quem vai abordar. Dado público (BrasilAPI)."""
    inicio = bruto.get("data_inicio_atividade") or ""
    socios = []
    for s in bruto.get("qsa") or []:
        nome = (s.get("nome_socio") or "").strip().title()
        if nome:
            socios.append({"nome": nome, "qualificacao": (s.get("qualificacao_socio") or "").strip().capitalize()})
    return {
        "cnpj": _formatar_cnpj(bruto.get("cnpj") or ""),
        "razao_social": (bruto.get("razao_social") or "").strip().title(),
        "nome_fantasia": (bruto.get("nome_fantasia") or "").strip().title(),
        "situacao": (bruto.get("descricao_situacao_cadastral") or "").strip().capitalize(),
        "aberta_em": _data_br(inicio),
        "anos_de_atividade": _anos_desde(inicio, hoje),
        "porte": (bruto.get("porte") or bruto.get("descricao_porte") or "").strip().capitalize(),
        "natureza": (bruto.get("natureza_juridica") or "").strip(),
        "atividade": (bruto.get("cnae_fiscal_descricao") or "").strip().capitalize(),
        "municipio": (bruto.get("municipio") or "").strip().title(),
        "uf": bruto.get("uf") or "",
        "socios": socios[:6],
        "fonte": "Receita Federal, via BrasilAPI",
    }


async def consultar_cnpj(numeros: str) -> Dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=8.0) as c:
            r = await c.get(f"https://brasilapi.com.br/api/cnpj/v1/{numeros}")
        if r.status_code != 200:
            return {}
        return resumir_cnpj(r.json())
    except Exception:
        return {}


# -------------------------------------------------------------- pessoas

NOME = r"[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,}"
TITULO_RE = re.compile(rf"\b(Dr\.?|Dra\.?|Prof\.?|Profa\.?|Eng\.?|Arq\.?)\s+({NOME}(?:\s+(?:de|da|do|dos|das|e)?\s*{NOME}){{0,2}})")
CARGO_RE = re.compile(
    rf"\b((?i:fundador(?:a)?|propriet[áa]ri[oa]|dono|dona|diretor(?:a)?|CEO|s[óo]ci[oa](?:-administrador(?:a)?)?|"
    rf"respons[áa]vel t[ée]cnic[oa]|gerente|coordenador(?:a)?))\s*[:\-–—]?\s+({NOME}(?:\s+(?:de|da|do|dos|das|e)?\s*{NOME}){{0,2}})"
)
CARGO_DEPOIS_RE = re.compile(
    rf"({NOME}(?:\s+(?:de|da|do|dos|das|e)?\s*{NOME}){{1,3}})\s*[,\-–—|]\s*"
    rf"((?i:fundador(?:a)?|propriet[áa]ri[oa]|diretor(?:a)?|CEO|s[óo]ci[oa]|respons[áa]vel t[ée]cnic[oa]))\b",
)
# palavras que aparecem em maiúscula em site e não são nome de gente
RUIDO = {"Fale", "Nossa", "Nosso", "Quem", "Somos", "Sobre", "Agende", "Atendimento", "Clínica", "Clinica", "Empresa", "Contato", "Home", "Serviços"}


def achar_pessoas(texto: str) -> List[Dict[str, str]]:
    achados: Dict[str, Dict[str, str]] = {}

    def somar(nome: str, cargo: str):
        nome = re.sub(r"\s+", " ", nome).strip()
        primeira = nome.split(" ")[0]
        if primeira in RUIDO or len(nome) < 5:
            return
        atual = achados.get(nome.lower())
        if not atual or (cargo and not atual["cargo"]):
            achados[nome.lower()] = {"nome": nome, "cargo": cargo, "fonte": "citado no site do negócio"}

    for m in CARGO_RE.finditer(texto):
        somar(m.group(2), m.group(1).lower())
    for m in CARGO_DEPOIS_RE.finditer(texto):
        somar(m.group(1), m.group(2).lower())
    for m in TITULO_RE.finditer(texto):
        somar(f"{m.group(1)} {m.group(2)}", "")
    # quem tem cargo vem primeiro
    return sorted(achados.values(), key=lambda p: (not p["cargo"], p["nome"]))[:6]


async def ler_site(url: str) -> str:
    """Texto visível da home e de até duas páginas institucionais."""
    if not url:
        return ""
    textos: List[str] = []
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(7.0, connect=4.0), follow_redirects=True,
                                     headers=BROWSER_HEADERS, verify=False) as c:
            async def baixar(u: str) -> str:
                try:
                    r = await c.get(u)
                    if r.status_code != 200 or "text/html" not in r.headers.get("content-type", ""):
                        return ""
                    sopa = BeautifulSoup(r.text, "html.parser")
                    for t in sopa(["script", "style", "noscript"]):
                        t.decompose()
                    return " ".join(sopa.get_text(" ").split())[:20000]
                except Exception:
                    return ""

            textos.append(await baixar(url))
            outras = await asyncio.gather(*[baixar(urljoin(url, p)) for p in PAGINAS_DE_PESSOAS[:3]])
            textos.extend(outras)
    except Exception:
        pass
    return " ".join(t for t in textos if t)


# ---------------------------------------------------------------- dores

def montar_dores(raio: Dict[str, Any], lead: Dict[str, Any]) -> List[Dict[str, str]]:
    """As dores que dá para provar, da mais forte para a mais fraca.

    Cada uma traz a evidência que o usuário confere no próprio perfil.
    """
    dores: List[Dict[str, str]] = []
    gmn = raio.get("gmn") or {}
    site = raio.get("site") or {}
    insta = raio.get("instagram") or {}
    quem = raio.get("quem_cuida") or {}
    nota = gmn.get("nota") or lead.get("rating") or 0
    total = gmn.get("avaliacoes") or lead.get("rating_count") or 0

    tipo = site.get("tipo") or "none"
    if tipo == "none":
        dores.append({"titulo": "Quem pesquisa não tem para onde ir",
                      "evidencia": "O perfil do Google não tem site.", "peso": "alto"})
    elif tipo in ("social", "aggregator", "whatsapp"):
        destino = {"social": "uma rede social", "aggregator": "um agregador de links", "whatsapp": "o WhatsApp direto"}[tipo]
        dores.append({"titulo": "O link do Google não leva a um site",
                      "evidencia": f"O link do perfil aponta para {destino}.", "peso": "alto"})
    for p in (site.get("problemas") or [])[:2]:
        dores.append({"titulo": "O site atual trava a venda", "evidencia": f"O site {p}.", "peso": "alto"})

    if nota >= 4.5 and total >= 30 and tipo != "own":
        dores.append({"titulo": "Reputação boa sem onde converter",
                      "evidencia": f"Nota {str(round(nota, 1)).replace('.', ',')} com {total} avaliações e nenhum site próprio.", "peso": "alto"})
    elif total and total < 15:
        dores.append({"titulo": "Pouca prova social",
                      "evidencia": f"Só {total} avaliações no Google.", "peso": "medio"})
    elif not total:
        dores.append({"titulo": "Perfil sem avaliações",
                      "evidencia": "O perfil do Google ainda não tem nenhuma avaliação.", "peso": "medio"})

    for item in gmn.get("itens") or []:
        if item.get("ok") is False and item.get("item") not in ("Site próprio",):
            dores.append({"titulo": f"Perfil do Google sem: {item['item'].lower()}",
                          "evidencia": item.get("detalhe") or "Item ausente no perfil.", "peso": "medio"})

    if insta.get("disponivel"):
        dias = insta.get("dias_desde_ultimo_post")
        if dias is not None and dias > 45:
            dores.append({"titulo": "Instagram parado",
                          "evidencia": f"O último post foi há {dias} dias.", "peso": "medio"})
        elif insta.get("posts_90_dias") == 0:
            dores.append({"titulo": "Instagram sem publicações recentes",
                          "evidencia": "Nenhum post nos últimos 90 dias.", "peso": "medio"})
    elif not insta.get("usuario"):
        dores.append({"titulo": "Sem Instagram ligado ao negócio",
                      "evidencia": "Nenhum perfil achado no site nem no Google.", "peso": "baixo"})

    if quem.get("veredito") == "dono":
        dores.append({"titulo": "O dono faz tudo sozinho",
                      "evidencia": quem.get("rotulo") or "Sinais de que o próprio dono cuida da presença online.", "peso": "medio"})
    elif quem.get("veredito") == "abandonado":
        dores.append({"titulo": "Presença online abandonada",
                      "evidencia": (quem.get("evidencias") or ["Sinais de abandono."])[0], "peso": "alto"})

    ordem = {"alto": 0, "medio": 1, "baixo": 2}
    vistos, unicas = set(), []
    for d in sorted(dores, key=lambda x: ordem.get(x["peso"], 3)):
        if d["titulo"] not in vistos:
            vistos.add(d["titulo"])
            unicas.append(d)
    return unicas[:6]


# ------------------------------------------------------------ abordagem

ESTILOS = [
    ("pergunta", "Abra com uma pergunta curta e específica sobre algo real deste negócio, sem elogio vazio."),
    ("avaliacoes", "Abra citando a reputação concreta (nota e número de avaliações) e o que falta para ela render mais."),
    ("cliente_procurando", "Abra descrevendo a cena de um cliente procurando o negócio no celular e o que ele encontra."),
    ("observacao", "Abra com uma observação direta de algo que você viu no perfil ou no site, dita sem crítica."),
    ("esboco", "Abra dizendo que já olhou o negócio e preparou algo para mostrar (só se a oferta tiver esboço grátis); senão, ofereça um diagnóstico curto."),
    ("concorrencia", "Abra pelo contexto do ramo na cidade, sem inventar nada sobre concorrentes específicos."),
]


def estilo_do_lead(chave: str) -> tuple:
    h = int(hashlib.sha1((chave or "x").encode("utf-8")).hexdigest(), 16)
    return ESTILOS[h % len(ESTILOS)]


def _primeiro_nome(pessoa: Optional[Dict[str, str]]) -> str:
    if not pessoa:
        return ""
    partes = [p for p in re.split(r"\s+", pessoa["nome"]) if p and p.lower().rstrip(".") not in ("dr", "dra", "prof", "profa", "eng", "arq")]
    return partes[0].title() if partes else ""


def abertura_pelos_fatos(empresa: str, dores: List[Dict[str, str]], pessoa: Optional[Dict[str, str]], estilo: str, servico: str) -> str:
    """Texto montado só com fatos, para quando o modelo não responde ou erra."""
    nome = _primeiro_nome(pessoa)
    saudacao = f"Olá, {nome}!" if nome else "Olá!"
    fato = dores[0]["evidencia"].rstrip(".") if dores else f"vi o perfil da {empresa} no Google"
    oferta = servico or "uma página profissional"
    if estilo == "avaliacoes":
        corpo = f"{fato}. Faz sentido transformar isso em mais clientes com {oferta}?"
    elif estilo == "cliente_procurando":
        corpo = f"pensei no cliente que procura a {empresa} no celular: {fato.lower()}. Posso te mostrar como resolver com {oferta}?"
    elif estilo == "pergunta":
        corpo = f"uma pergunta sobre a {empresa}: {fato.lower()}. Isso já te fez perder algum cliente?"
    else:
        corpo = f"olhei a {empresa} e notei que {fato.lower()}. Tenho uma ideia simples com {oferta}; posso te mandar?"
    return f"{saudacao} {corpo}"


def verificar_abertura(texto: str, empresa: str, fatos: List[str], pessoa: Optional[Dict[str, str]]) -> bool:
    """A mensagem precisa mencionar algo específico deste negócio."""
    t = (texto or "").lower()
    if len(t.split()) < 12 or len(t.split()) > 130:
        return False
    marcadores = [w.lower() for w in re.findall(r"[A-Za-zÀ-ú]{4,}", empresa)][:3]
    nome = _primeiro_nome(pessoa).lower()
    if nome:
        marcadores.append(nome)
    for f in fatos:
        marcadores += re.findall(r"\d+[.,]?\d*", f)
    return any(m and m in t for m in marcadores)


def _prompt_abordagem(lead: Dict[str, Any], raio: Dict[str, Any], dores: List[Dict[str, str]],
                      empresa: Dict[str, Any], pessoas: List[Dict[str, str]], estilo: tuple, bloco_oferta: str,
                      sender: str = "") -> str:
    from app import abordagem_mestra
    fatos = [f"- {d['titulo']}: {d['evidencia']}" for d in dores] or ["- (sem dores verificadas)"]
    gente = [f"- {p['nome']}" + (f" ({p['cargo']})" if p.get("cargo") else "") + f" — {p['fonte']}" for p in pessoas]
    gente += [f"- {s['nome']} ({s['qualificacao']}) — sócio na Receita Federal" for s in (empresa.get("socios") or [])]
    reviews = (raio.get("gmn") or {}).get("resumo_avaliacoes") or ""
    return f"""Você é um consultor comercial brasileiro experiente. Monte a ABORDAGEM PERSONALIZADA para este negócio.

NEGÓCIO: {lead.get('company') or lead.get('name')} — {lead.get('niche') or ''} — {lead.get('city') or ''}
NOTA/AVALIAÇÕES: {lead.get('rating') or 'sem nota'} / {lead.get('rating_count') or 0}
QUEM CUIDA DA PRESENÇA DIGITAL: {(raio.get('quem_cuida') or {}).get('rotulo', 'desconhecido')}
O QUE OS CLIENTES DIZEM (Google): {reviews or 'sem resumo'}

DORES VERIFICADAS (use só estas, não invente outras):
{chr(10).join(fatos)}

PESSOAS (só trate alguém pelo nome se estiver aqui; sócio da Receita não é necessariamente quem atende):
{chr(10).join(gente) or '- nenhuma pessoa identificada'}

{bloco_oferta}

ESTILO DESTE LEAD (para não ficar igual aos outros): {estilo[1]}

{abordagem_mestra.momento()}

{abordagem_mestra.estrutura(sender, sem_site=abordagem_mestra.lead_sem_site(lead.get('site_status'), lead.get('missingDigitalAssets')))}

{abordagem_mestra.GATILHOS}

{abordagem_mestra.TEMPERATURA}

O RAMO: {abordagem_mestra.bloco_do_ramo(lead.get('niche'))}

Regras: português do Brasil, tom natural de WhatsApp, caloroso e respeitoso, sem "prezado", no máximo um emoji,
sem promessa de resultado, sem inventar fato, sem preço se a oferta não tiver. A abertura tem de 55 a 90 palavras,
começa cumprimentando (com o nome se houver pessoa identificada), diz quem você é em uma frase, cita um fato concreto
DESTE negócio, liga o fato ao que o serviço resolve e termina em UMA pergunta fácil. A "proximo_passo" e a "resposta_a_objecao"
devem soar como conversa, nunca como roteiro de call center.

Responda SOMENTE um objeto JSON com estas chaves:
"angulo": uma frase com a tese da abordagem (por que vender para este negócio, desse jeito),
"abertura": a primeira mensagem pronta para enviar,
"por_que_funciona": 1-2 frases ligando a abertura à dor verificada,
"objecao_provavel": a objeção mais provável deste negócio (frase curta),
"resposta_a_objecao": como responder em 1-2 frases,
"proximo_passo": o que propor depois da resposta (ex.: mostrar esboço, marcar 15 minutos),
"evitar": o que não dizer para este negócio (1 frase)."""


def abordagem_de_reserva(empresa_nome: str, dores: List[Dict[str, str]], pessoa: Optional[Dict[str, str]],
                         estilo: tuple, servico: str, canal_sugerido: str) -> Dict[str, str]:
    principal = dores[0] if dores else None
    return {
        "angulo": (f"Começar por: {principal['titulo'].lower()} — {principal['evidencia'].rstrip('.').lower()}."
                   if principal else "Começar por uma conversa curta para entender como o negócio capta clientes hoje."),
        "abertura": abertura_pelos_fatos(empresa_nome, dores, pessoa, estilo[0], servico),
        "por_que_funciona": "Parte de um fato que o dono confere no próprio perfil, sem elogio genérico.",
        "objecao_provavel": "Já tenho quem cuide disso." if not principal or principal["peso"] != "alto" else "Agora não é o momento.",
        "resposta_a_objecao": "Sem problema: posso só te mandar o que vi no perfil, sem compromisso, para você avaliar quando quiser.",
        "proximo_passo": "Oferecer o esboço ou 15 minutos de conversa.",
        "evitar": "Falar em preço antes de mostrar o que foi visto no perfil.",
        "origem": "fatos",
        "canal": canal_sugerido,
    }


def gerar_abordagem(lead: Dict[str, Any], raio: Dict[str, Any], dores: List[Dict[str, str]],
                    empresa: Dict[str, Any], pessoas: List[Dict[str, str]], canal: Dict[str, Any]) -> Dict[str, str]:
    """Bloqueante (chamada ao modelo): rode em thread."""
    from app import ai_oferta
    from app.ai_client import AIIndisponivel, build_client, gerar_json
    from app.lead_intel import melhor_canal

    nome_empresa = lead.get("company") or lead.get("name") or "o negócio"
    estilo = estilo_do_lead(str(lead.get("id") or nome_empresa))
    pessoa = pessoas[0] if pessoas else None
    servico = ""
    remetente = str((canal or {}).get("_remetente") or "")
    try:
        if ai_oferta.ativa(canal or {}):
            servico = ((canal.get("oferta") or {}).get("nome") or "").strip()
    except Exception:
        servico = ""
    servico = servico or str((canal or {}).get("_produto") or "")
    from app import abordagem_mestra
    bloco = "O PRODUTO (use só estes fatos):\n" + abordagem_mestra.produto(canal, lead, servico)
    canal_sug = lead.get("best_channel") or melhor_canal(lead)
    reserva = abordagem_de_reserva(nome_empresa, dores, pessoa, estilo, servico, canal_sug)

    if not settings.GEMINI_API_KEY:
        return reserva
    try:
        client = build_client(settings.GEMINI_API_KEY)
        dados = gerar_json(client, _prompt_abordagem(lead, raio, dores, empresa, pessoas, estilo, bloco, remetente),
                           obrigatorias=["abertura", "angulo"], tentativas=1)
    except (AIIndisponivel, Exception):
        return reserva

    texto = str(dados.get("abertura") or "").strip()
    fatos = [d["evidencia"] for d in dores]
    if not verificar_abertura(texto, nome_empresa, fatos, pessoa):
        dados["abertura"] = reserva["abertura"]
        dados["origem"] = "fatos"
    else:
        dados["origem"] = "ia"
    limpo = {k: str(dados.get(k) or reserva[k])[:600] for k in reserva if k not in ("origem", "canal")}
    limpo["origem"] = dados["origem"]
    limpo["canal"] = canal_sug
    return limpo


# -------------------------------------------------------------- montagem

async def montar(lead: Dict[str, Any], raio: Dict[str, Any], site_url: str, canal: Dict[str, Any]) -> Dict[str, Any]:
    """Tudo o que o dossiê acrescenta ao raio-x. Cada parte falha sozinha."""
    texto = await ler_site(site_url) if (raio.get("site") or {}).get("tipo") == "own" else ""

    empresa: Dict[str, Any] = {}
    cnpjs = achar_cnpjs(texto)
    if cnpjs:
        empresa = await consultar_cnpj(cnpjs[0])
    pessoas = achar_pessoas(texto)

    dores = montar_dores(raio, lead)
    abordagem = await asyncio.to_thread(gerar_abordagem, lead, raio, dores, empresa, pessoas, canal)
    return {"empresa": empresa, "pessoas": pessoas, "dores": dores, "abordagem": abordagem}
