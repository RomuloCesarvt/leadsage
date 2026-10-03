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
from typing import Any, Dict, List, Optional

from app.ai_client import (
    AIIndisponivel,
    build_client,
    gerar_json,
    generate_with_fallback,
    strip_code_fence,
)
from app.copy_knowledge import (
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
    mercado = bloco_de_mercado(lead.niche, lead.role)
    vende = req.user_product or "serviços digitais para negócios locais"
    assina = req.sender_name or "Prospecção"

    return f"""Você escreve o primeiro contato de um prestador de serviço para um
negócio local. Não é marketing de massa: é uma mensagem por vez, para
alguém que não pediu para ser contatado. Ela precisa parecer escrita por
uma pessoa que olhou aquele negócio antes de escrever.

QUEM ESCREVE
- Vende: {vende}
- Assina como: {assina}

PARA QUEM (tudo abaixo foi verificado — pode citar, é real)
{_dossie(lead)}

GANCHOS DISPONÍVEIS (fatos prontos para abrir a mensagem; escolha UM)
{_ganchos(lead)}

COMO ESSE MERCADO FUNCIONA
{mercado}

CANAL: {canal}
- Tom do canal: {regras_canal['tom']}
- Tamanho: {regras_canal['limite']}
- Estrutura: {regras_canal['estrutura']}

TOM PEDIDO: {req.tone}
- Voz: {tom['voz']}
- Postura: {tom['postura']}
- Abertura: {tom['abertura']}
- Evite: {tom['evite']}
{('- Instrução extra do usuário (vale acima das demais): ' + req.custom_instructions) if req.custom_instructions else ''}

RACIOCÍNIO ANTES DE ESCREVER (não mostre este passo no texto)
1. Qual gancho é o mais forte para ESTE negócio, e por quê.
2. Qual perda concreta ele sofre hoje por causa disso, na moeda do
   negócio dele (encomenda perdida, paciente que marca em outro lugar,
   orçamento que não chega) — nunca em jargão de marketing.
3. Qual é o menor passo possível que ele pode aceitar sem risco.
Só então escreva.

COMO ESCREVER A ABERTURA
- Comece pelo fato escolhido. Nunca por saudação genérica, nunca por
  você ou pela sua empresa.
- Ligue o fato à perda. Não diga "melhorar a presença digital".
- Ofereça uma coisa só, e pequena.
- Termine com UMA pergunta que se responde em uma palavra.

A CADÊNCIA QUE AQUECE (você escreve os três toques de uma vez)
{plano_de_aquecimento()}
O toque 2 e o toque 3 são curtos: no máximo 45 palavras cada, no mesmo
canal, e não repetem o argumento do toque 1 com outras palavras — cada
um traz algo que ainda não foi dito.
O material novo do toque 2 sai dos dados verificados acima: outro gancho
da lista, outra avaliação, o horário, a descrição do Google. NUNCA uma
estatística de mercado, um número sobre concorrente ("a padaria vizinha
recebe 15 encomendas") ou um percentual de resultado. A proibição de
inventar vale para os três toques, não só para o primeiro.

PROIBIDO
- Estes clichês, em qualquer variação: {lista_de_cliches()}
- Inventar dado que não está acima (faturamento, número de clientes,
  nome do dono, concorrente, prazo, preço)
- Prometer resultado numérico que você não pode garantir
- Elogio vazio: "adorei o trabalho de vocês", "vi que vocês são referência"
- Mais de uma pergunta por mensagem
- Link no primeiro contato
- Emoji, a menos que o canal seja whatsapp ou instagram_direct — e no máximo um

TESTE ANTES DE RESPONDER
Se a mensagem servisse, trocando só o nome, para qualquer outro negócio
da mesma cidade, ela está genérica. Reescreva usando algo que só vale
para {lead.name}.

RETORNO
JSON puro, sem markdown, com exatamente estas chaves:
- "subject": assunto curto e concreto (string vazia se o canal não for email)
- "body": o texto do primeiro contato, com quebras de linha reais
- "gancho": qual fato você usou para abrir, em até 12 palavras
- "raciocinio": a perda concreta que você identificou, em uma frase
- "follow_ups": lista com exatamente 2 objetos, cada um com "quando"
  (ex.: "3 dias depois"), "objetivo" (uma frase) e "texto" (a mensagem)
"""


def _melhor_versao(atual: Dict[str, Any], nova: Dict[str, Any], canal: str) -> Dict[str, Any]:
    """Fica com a versão que tem menos defeitos, não com a mais recente.

    A reescrita costuma melhorar, mas não sempre: pedir correção às vezes
    conserta o clichê e estoura o tamanho. Comparar evita trocar um texto
    bom por um pior.
    """
    if not nova.get("body"):
        return atual
    if len(revisar_copy(nova.get("body", ""), canal)) <= len(revisar_copy(atual.get("body", ""), canal)):
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

        client = build_client(active_key)
        prompt = _prompt_da_abordagem(req, canal)
        dados = gerar_json(client, prompt, obrigatorias=["body"])

        # Revisão: o que o modelo deixou passar volta para ele, nomeado.
        problemas = revisar_copy(dados.get("body", ""), canal)
        if problemas:
            correcao = (
                f"{prompt}\n\n---\nVocê escreveu este corpo:\n\n{dados.get('body', '')}\n\n"
                "A revisão encontrou os problemas abaixo. Reescreva a mensagem "
                "corrigindo TODOS eles, mantendo o gancho e o tom, e devolva o "
                "mesmo JSON completo:\n- " + "\n- ".join(problemas)
            )
            try:
                dados = _melhor_versao(
                    dados, gerar_json(client, correcao, obrigatorias=["body"]), canal
                )
            except AIIndisponivel:
                # A primeira versão existe e é utilizável; os defeitos que
                # sobraram vão como aviso para o usuário decidir.
                pass
            problemas = revisar_copy(dados.get("body", ""), canal)

        seguimentos: List[Dict[str, str]] = []
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
            # Os seguimentos passam pela mesma revisão do primeiro toque.
            # É neles que a invenção costuma escapar — o modelo procura
            # "algo novo para dizer" e inventa um dado de mercado.
            for defeito in revisar_copy(texto, canal):
                problemas.append(f"seguimento {len(seguimentos)}: {defeito}")

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
