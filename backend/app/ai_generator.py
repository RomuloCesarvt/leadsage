"""A abordagem: primeira mensagem e a cadência que aquece o lead.

Três coisas mudaram em relação à versão anterior.

**A mensagem não sai mais sozinha.** Um contato frio raramente fecha no
primeiro toque, e o erro comum é repetir o mesmo pedido mais alto três
dias depois. Aqui a IA devolve a abertura e dois seguimentos já
planejados: o segundo entrega algo novo sem cobrar resposta, o terceiro
fecha o ciclo pedindo licença para parar — que é o que costuma provocar
a resposta.

**O texto é conferido antes de chegar na tela.** O modelo obedece "não
use clichê" quase sempre; quase não basta quando a mensagem sai em nome
do usuário, para um desconhecido. O que escapa é nomeado e devolvido
para reescrita — uma vez, citando o defeito, que funciona muito melhor
do que pedir "melhore".

**Erro é erro.** Antes a exceção virava o corpo do e-mail: o usuário
recebia "Houve um erro ao processar com a IA: 404" dentro do campo de
texto e podia disparar isso para o prospect. Agora sobe como falha e a
tela mostra o que aconteceu.
"""
import asyncio
import time
from typing import Any, Dict, List, Optional

from app.ai_client import (
    AIIndisponivel,
    build_client,
    gerar_json,
    generate_with_fallback,
    strip_code_fence,
)
from app import abordagem_mestra
from app.copy_knowledge import (
    LIMITE_DE_PALAVRAS,
    bloco_de_mercado,
    lista_de_cliches,
    plano_de_aquecimento,
    regras_do_canal,
    regras_do_tom,
    revisar_copy,
)
from app.config import settings
from app.models import LeadItem, PitchGenerationRequest, PitchGenerationResponse

# Mantidos aqui porque o resto do projeto os importa deste módulo.
__all__ = ["AIGenerator", "build_client", "generate_with_fallback", "strip_code_fence"]


def _reputacao(lead: LeadItem) -> str:
    if lead.rating and lead.rating_count:
        nota = f"{lead.rating:.1f}".replace(".", ",")
        return f"nota {nota} com {lead.rating_count} avaliações no Google"
    if lead.rating_count:
        return f"{lead.rating_count} avaliações no Google"
    return "ainda sem avaliações relevantes no Google"


def _presenca(lead: LeadItem) -> str:
    canais: List[str] = []
    if lead.website:
        canais.append(f"site próprio ({lead.website})")
    if lead.socials and lead.socials.instagram:
        canais.append("Instagram")
    if lead.socials and lead.socials.facebook:
        canais.append("Facebook")
    if lead.whatsapp:
        canais.append("WhatsApp")
    return ", ".join(canais) if canais else "apenas o perfil no Google Maps"


def _dossie(lead: LeadItem) -> str:
    """Tudo que sabemos do lead, em fatos verificáveis.

    Só entra aqui o que veio do Google ou do site do próprio negócio. É a
    diferença entre uma mensagem que prova ter olhado aquele comércio e
    um texto que serviria para qualquer um da mesma rua.
    """
    linhas = [
        f"- Negócio: {lead.name}",
        f"- Ramo: {lead.role}",
        f"- Onde fica: {lead.neighborhood + ', ' if lead.neighborhood else ''}{lead.city}",
        f"- Reputação: {_reputacao(lead)}",
        f"- O que ele tem hoje: {_presenca(lead)}",
    ]

    if lead.google_description:
        linhas.append(f"- Como o Google descreve: {lead.google_description}")
    if lead.price_level:
        linhas.append(f"- Faixa de preço no Google: {lead.price_level}")
    if lead.opening_hours:
        linhas.append(f"- Horário: {lead.opening_hours}")
    if lead.review_highlight:
        linhas.append(f'- Um cliente escreveu no Google: "{lead.review_highlight}"')
    for review in (lead.reviews_sample or [])[:2]:
        texto = (review or {}).get("text") or ""
        nota = (review or {}).get("rating")
        if texto and texto != lead.review_highlight:
            linhas.append(f'- Outra avaliação ({nota}★): "{texto[:160]}"')

    situacao = {
        "none": "não tem site nenhum no perfil do Google",
        "social": "o link do perfil leva a uma rede social, não a um site",
        "aggregator": "o link do perfil é um agregador (Linktree e afins)",
        "whatsapp": "o link do perfil é o WhatsApp direto",
        "own": "tem site próprio",
    }.get(lead.site_status or "", "")
    if situacao:
        linhas.append(f"- Situação do site: {situacao}")
    if lead.site_quality is not None:
        linhas.append(f"- Diagnóstico do site atual: {lead.site_quality}/100")
    for problema in (lead.site_issues or [])[:3]:
        linhas.append(f"  · o site {problema}")
    if lead.site_platform:
        linhas.append(f"- O site roda em {lead.site_platform}")

    faltando = lead.missingDigitalAssets or []
    linhas.append(
        "- O que falta: " + ("não possui " + ", nem ".join(faltando) if faltando else "nenhuma lacuna óbvia")
    )
    if lead.diagnosis:
        linhas.append(f"- Leitura comercial: {lead.diagnosis}")
    return "\n".join(linhas)


def _ganchos(lead: LeadItem) -> str:
    ganchos = lead.hooks or []
    if not ganchos:
        return "(nenhum gancho pronto — use os dados acima)"
    return "\n".join(f"{i + 1}. {g}" for i, g in enumerate(ganchos))


def _prompt_da_abordagem(req: PitchGenerationRequest, canal: str) -> str:
    lead = req.lead
    tom = regras_do_tom(req.tone)
    regras_canal = regras_do_canal(canal)
    vende = req.user_product or "serviços digitais para negócios locais"
    assina = req.sender_name or "Prospecção"
    sem_site = abordagem_mestra.lead_sem_site(lead.site_status, lead.missingDigitalAssets)

    brief = (req.service_brief or "").strip() or abordagem_mestra.produto(None, None, vende)

    return f"""Você é um vendedor consultivo brasileiro. Escreva UMA primeira mensagem de prospecção
para um negócio local que não pediu contato: simpática, específica sobre ele, nunca com cara de disparo.

{abordagem_mestra.momento()}

QUEM ESCREVE: {assina}. Vende: {vende}.

O PRODUTO (use só estes fatos; nunca invente preço, prazo, garantia ou resultado)
{brief}

O NEGÓCIO (verificado, pode citar)
{_dossie(lead)}

Ganchos prontos (escolha UM): {_ganchos(lead)}

O RAMO DESTE NEGÓCIO
{abordagem_mestra.bloco_do_ramo(lead.niche or lead.role)}

{abordagem_mestra.TEMPERATURA}

{abordagem_mestra.estrutura(assina, sem_site=sem_site)}

{abordagem_mestra.GATILHOS}

CANAL: {canal}. Tom: {regras_canal['tom']}. Tamanho: {regras_canal['limite']}. Estrutura: {regras_canal['estrutura']}.
TOM PEDIDO: {req.tone}. Voz: {tom['voz']}. Postura: {tom['postura']}. Abertura: {tom['abertura']}. Evite: {tom['evite']}.
{('Instrução extra do usuário (vale acima das demais): ' + req.custom_instructions) if req.custom_instructions else ''}

PROIBIDO: clichês ({lista_de_cliches()}); inventar dado que não está acima; prometer resultado numérico;
elogio vazio; mais de uma pergunta; link no primeiro contato; emoji (exceto no whatsapp e instagram_direct, no máximo um).
TESTE: tem cumprimento, diz quem você é e o que faz? Serviria para outro negócio trocando só o nome? Então reescreva
com algo que só vale para {lead.name}.

LIMITE RÍGIDO: o "body" tem no máximo {LIMITE_DE_PALAVRAS.get(canal, 150) - 10} palavras. Frases curtas, uma ideia por linha.

RETORNO: JSON puro com as chaves "subject" (assunto curto; vazio se o canal não for email),
"body" (a mensagem, com quebras de linha reais), "gancho" (o fato que abriu, até 12 palavras) e
"raciocinio" (o que o serviço resolve para ele, em uma frase).
"""


def _prompt_dos_seguimentos(req: PitchGenerationRequest, canal: str, primeira: str) -> str:
    lead = req.lead
    return f"""Escreva 2 mensagens de acompanhamento para quem NÃO respondeu a primeira mensagem de prospecção.

PRIMEIRA MENSAGEM JÁ ENVIADA ({canal}):
{primeira}

DADOS VERIFICADOS DO NEGÓCIO (única fonte de fatos novos)
{_dossie(lead)}

O PRODUTO: {(req.service_brief or req.user_product or "serviços digitais").strip()[:600]}

{plano_de_aquecimento()}
Cada uma tem no máximo 45 palavras, é no mesmo canal, não repete o argumento da primeira e traz algo novo
tirado dos dados acima (outro gancho, outra avaliação, o horário). NUNCA estatística de mercado, número de
concorrente, percentual de resultado, preço ou prazo inventado. Clichês proibidos: {lista_de_cliches()}.

RETORNO: JSON puro com a chave "follow_ups": lista de exatamente 2 objetos com "quando" (ex.: "3 dias depois"),
"objetivo" (uma frase) e "texto" (a mensagem).
"""


def _melhor_versao(atual: Dict[str, Any], nova: Dict[str, Any], canal: str, sem_site: bool = True) -> Dict[str, Any]:
    """Fica com a versão que tem menos defeitos, não com a mais recente.

    A reescrita costuma melhorar, mas não sempre: pedir correção às vezes
    conserta o clichê e estoura o tamanho. Comparar evita trocar um texto
    bom por um pior.
    """
    if not nova.get("body"):
        return atual
    def defeitos(d):
        return len(revisar_copy(d.get("body", ""), canal)) + len(abordagem_mestra.revisar_calor(d.get("body", ""), canal)) + len(abordagem_mestra.revisar_roteiro(d.get("body", ""), sem_site))
    if defeitos(nova) <= defeitos(atual):
        return nova
    return atual


class AIGenerator:
    @staticmethod
    async def generate_pitch(
        req: PitchGenerationRequest, api_key: str = None
    ) -> PitchGenerationResponse:
        lead = req.lead
        tone = req.tone or "Consultivo"
        sender = req.sender_name or "LeadSage Prospecção"
        canal = (getattr(req, "channel", "") or "email").strip()

        placeholders = {
            "nome": lead.name,
            "primeiro_nome": lead.name.split()[0] if lead.name.split() else lead.name,
            "cargo": lead.role,
            "empresa": lead.company,
            "cidade": lead.city,
            "nicho": lead.niche,
        }

        active_key = api_key or settings.GEMINI_API_KEY
        if not active_key:
            # Devolver um texto de aviso no corpo da mensagem seria pior:
            # ele fica editável, parece uma mensagem pronta e já foi
            # disparado para prospect por engano.
            raise AIIndisponivel(
                "A IA de abordagem não está configurada: falta a chave do Gemini. "
                "Informe-a em Configurações → Integrações."
            )

        sem_site = abordagem_mestra.lead_sem_site(lead.site_status, lead.missingDigitalAssets)
        client = build_client(active_key)
        prompt = _prompt_da_abordagem(req, canal)
        # O usuario esta olhando a tela. Uma chamada so, com resposta curta e modelos em
        # paralelo se o primeiro demorar; as chamadas bloqueiam, entao rodam em thread.
        # Antes eram duas chamadas (escrever e depois reescrever) com os seguimentos
        # junto: 15 a 40 s. Os seguimentos agora vem a parte, e o que a revisao local
        # acha vira aviso na tela em vez de outra ida ao modelo.
        limite = time.monotonic() + 40
        dados = await asyncio.to_thread(gerar_json, client, prompt, ["body"], 2, limite, True, 600)

        problemas = (revisar_copy(dados.get("body", ""), canal)
                     + abordagem_mestra.revisar_calor(dados.get("body", ""), canal)
                     + abordagem_mestra.revisar_roteiro(dados.get("body", ""), sem_site))

        seguimentos: List[Dict[str, str]] = []
        if getattr(req, "com_seguimentos", False):
            seguimentos, extras = await AIGenerator.generate_followups(req, str(dados.get("body") or ""), api_key=active_key)
            problemas += extras

        return PitchGenerationResponse(
            lead_id=lead.id,
            subject=str(dados.get("subject") or (f"Sobre a {lead.company}" if canal == "email" else "")),
            body=str(dados.get("body") or "").strip(),
            tone=tone,
            channel=canal,
            hook=str(dados.get("gancho") or "")[:120],
            reasoning=str(dados.get("raciocinio") or "")[:400],
            follow_ups=seguimentos,
            warnings=problemas,
            placeholders=placeholders,
        )

    @staticmethod
    async def generate_followups(req: PitchGenerationRequest, primeira: str, api_key: str = None):
        """As duas mensagens de acompanhamento. Vem depois da primeira, em segundo plano na tela."""
        canal = (getattr(req, "channel", "") or "email").strip()
        active_key = api_key or settings.GEMINI_API_KEY
        if not active_key:
            raise AIIndisponivel("A IA de abordagem não está configurada: falta a chave do Gemini.")
        client = build_client(active_key)
        dados = await asyncio.to_thread(
            gerar_json, client, _prompt_dos_seguimentos(req, canal, primeira), ["follow_ups"], 2,
            time.monotonic() + 40, True, 500,
        )
        seguimentos: List[Dict[str, str]] = []
        avisos: List[str] = []
        for item in (dados.get("follow_ups") or [])[:2]:
            if not isinstance(item, dict):
                continue
            texto = str(item.get("texto") or item.get("body") or "").strip()
            if not texto:
                continue
            seguimentos.append({
                "quando": str(item.get("quando") or "").strip() or "alguns dias depois",
                "objetivo": str(item.get("objetivo") or "").strip(),
                "texto": texto,
            })
            # É neles que a invenção costuma escapar: o modelo procura "algo novo para dizer"
            # e inventa um dado de mercado.
            for defeito in revisar_copy(texto, canal):
                if "não termina em pergunta" in defeito:
                    continue  # o toque 2 não pede nada: entregar valor sem pergunta é o desenho
                avisos.append(f"seguimento {len(seguimentos)}: {defeito}")
        return seguimentos, avisos

    @staticmethod
    async def generate_demo_site(req, api_key: str = None) -> dict:
        """Prévia de site para mostrar ao lead.

        O construtor da tela de sites é o caminho principal (layout real,
        editável, sem chamar modelo a cada tecla). Este endpoint existe
        para a prévia rápida de dentro do card do lead, e agora usa o
        mesmo arquiteto: identidade visual escolhida por negócio e HTML
        autocontido, sem CDN — o arquivo precisa abrir sozinho na mão do
        cliente do usuário.
        """
        from app.ai_site import gerar_previa_de_site
        from app.models import DemoSiteResponse

        lead = getattr(req, "lead", req)
        active_key = api_key or settings.GEMINI_API_KEY
        if not active_key:
            raise AIIndisponivel(
                "A geração de sites não está configurada: falta a chave do Gemini."
            )

        html, segundos = await gerar_previa_de_site(lead, active_key)
        return DemoSiteResponse(
            lead_id=lead.id,
            preview_url=f"/api/preview/{lead.id}",
            html_content=html,
            generation_time=segundos,
        )
