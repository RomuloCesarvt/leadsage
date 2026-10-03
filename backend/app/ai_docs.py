"""Propostas e contratos escritos para aquele cliente, não preenchidos.

Os modelos de texto continuam existindo e continuam úteis: são o ponto
de partida de quem só quer preencher colchetes. O que faltava era o
outro caminho — o documento que nasce do lead.

A diferença aparece no diagnóstico. Uma proposta boa não começa pelo que
você vende; começa mostrando que você entendeu o negócio do outro. Como
a busca já sabe que a padaria tem 213 avaliações e nenhum site, que o
site da clínica não abre no celular e que o restaurante só tem Linktree,
esse material entra na primeira seção — e é o que faz o documento não
parecer um modelo baixado da internet.

O texto sai no mesmo formato dos modelos (TÍTULOS EM CAIXA ALTA, pares
"Rótulo: valor", itens com •, tabela com barras). Não é estética: é o
que o conversor da tela reconhece para montar o PDF com capa, cores da
marca e destaque no bloco de investimento. Um Markdown bonito chegaria
na tela como texto cru.

O que o usuário ainda não informou fica como [CAMPO] — o editor
transforma cada um em campo de formulário. É melhor do que a IA inventar
um valor: número errado em proposta é pior do que lacuna.
"""
from typing import Any, Dict, List, Optional

from app.ai_client import AIIndisponivel, TIMEOUT_LONGO_MS, build_client, gerar_json
from app.copy_knowledge import bloco_de_mercado, conhecimento_do_nicho

TIPOS = ("proposta", "contrato")

# O conversor da tela (templates/docs/base.ts) lê estrutura, não
# markdown. Estas são as convenções que ele reconhece — e por isso são
# obrigatórias no texto gerado.
FORMATO = """FORMATO DO TEXTO (obrigatório — a tela converte isto em documento visual)
- Título de seção: linha inteira em CAIXA ALTA, sozinha. Ex.: DIAGNÓSTICO
  Em contrato, use CLÁUSULA 1ª – OBJETO, CLÁUSULA 2ª – ESCOPO, e assim por diante.
- Dado de cabeçalho: uma linha "Rótulo: valor". Ex.: Validade: 15 dias
- Lista: cada item começa com "• ".
- Tabela de valores: linhas com barras verticais, assim:
  │ Item                          │ Valor      │
  │ Página inicial e institucional │ R$ 2.400   │
  │ TOTAL                          │ R$ 3.900   │
- Separador entre blocos: uma linha com ---
- Assinatura: linha com _________________________ e, abaixo, o nome.
- NÃO use markdown: nada de #, **, listas com -, tabelas com | no estilo GitHub.
- Sem emoji."""


def _retrato_do_lead(lead: Optional[Dict[str, Any]]) -> str:
    """O que já sabemos do cliente. É daqui que sai o diagnóstico."""
    if not lead:
        return "(nenhum lead vinculado: escreva o diagnóstico a partir do briefing)"

    linhas = [f"- Empresa: {lead.get('company') or lead.get('name')}"]
    if lead.get("role"):
        linhas.append(f"- Ramo: {lead['role']}")
    cidade = lead.get("city") or ""
    bairro = lead.get("neighborhood") or ""
    if cidade:
        linhas.append(f"- Onde atua: {bairro + ', ' if bairro else ''}{cidade}")
    if lead.get("address"):
        linhas.append(f"- Endereço: {lead['address']}")
    if lead.get("phone"):
        linhas.append(f"- Telefone: {lead['phone']}")
    if lead.get("email"):
        linhas.append(f"- E-mail: {lead['email']}")
    if lead.get("rating") and lead.get("rating_count"):
        nota = f"{float(lead['rating']):.1f}".replace(".", ",")
        linhas.append(f"- Reputação: nota {nota} com {lead['rating_count']} avaliações no Google")
    if lead.get("google_description"):
        linhas.append(f"- Descrição no Google: {lead['google_description']}")
    if lead.get("review_highlight"):
        linhas.append(f'- Um cliente escreveu: "{lead["review_highlight"]}"')

    situacao = {
        "none": "não tem site nenhum",
        "social": "só tem rede social, sem site",
        "aggregator": "usa um agregador de links no lugar de site",
        "whatsapp": "o link do perfil vai direto para o WhatsApp",
        "own": "tem site próprio",
    }.get(lead.get("site_status") or "", "")
    if situacao:
        linhas.append(f"- Situação digital: {situacao}")
    if lead.get("site_quality") is not None:
        linhas.append(f"- Nota do site atual: {lead['site_quality']}/100")
    for problema in (lead.get("site_issues") or [])[:4]:
        linhas.append(f"  · o site {problema}")
    if lead.get("missingDigitalAssets"):
        linhas.append("- Lacunas: " + ", ".join(lead["missingDigitalAssets"]))
    if lead.get("diagnosis"):
        linhas.append(f"- Leitura comercial: {lead['diagnosis']}")
    return "\n".join(linhas)


def _briefing(dados: Dict[str, Any]) -> str:
    """O que o usuário informou. O que faltar vira [CAMPO] no documento."""
    campos = [
        ("Serviço contratado", dados.get("servico")),
        ("Escopo descrito pelo usuário", dados.get("escopo")),
        ("Valor", dados.get("valor")),
        ("Forma de pagamento", dados.get("condicoes")),
        ("Prazo de entrega", dados.get("prazo")),
        ("Observações", dados.get("observacoes")),
    ]
    presentes = [f"- {rotulo}: {valor}" for rotulo, valor in campos if str(valor or "").strip()]
    ausentes = [rotulo for rotulo, valor in campos if not str(valor or "").strip()]

    texto = "\n".join(presentes) if presentes else "- (o usuário não detalhou nada)"
    if ausentes:
        texto += (
            "\n\nNÃO INFORMADO (deixe como campo entre colchetes, em CAIXA ALTA, "
            "para o usuário preencher — não invente): " + ", ".join(ausentes)
        )
    return texto


def _quem_assina(perfil: Dict[str, Any]) -> str:
    linhas = []
    for rotulo, chave in (
        ("Nome", "name"), ("Empresa", "company_name"), ("E-mail", "email"),
        ("Contato", "brand_contact"), ("O que vende", "product_description"),
    ):
        valor = str(perfil.get(chave) or "").strip()
        if valor:
            linhas.append(f"- {rotulo}: {valor}")
    return "\n".join(linhas) or "- (perfil não preenchido: use [SEU NOME] e [SUA EMPRESA])"


ARQUITETURA_PROPOSTA = """ARQUITETURA DA PROPOSTA (nesta ordem, com estes títulos)
1. Um bloco de cabeçalho com pares "Rótulo: valor": Para, De, Data,
   Validade da proposta, Referência.
2. RESUMO EXECUTIVO — três frases: onde o cliente está, o que muda, o
   que ele precisa decidir. Quem lê só isto tem que entender a proposta.
3. DIAGNÓSTICO — o que foi observado no negócio dele, com os fatos reais
   listados acima (nota, avaliações, ausência de site, defeitos do site
   atual). Cada observação seguida da consequência em dinheiro ou em
   cliente perdido. Esta seção é a que diferencia a proposta; escreva-a
   como quem visitou o negócio.
4. O QUE PROPOMOS — a solução em 3 ou 4 entregas nomeadas, cada uma com
   uma frase do que o cliente ganha (não do que você faz).
5. COMO VAMOS TRABALHAR — as fases, com o que acontece em cada uma e o
   que se espera do cliente em cada fase.
6. CRONOGRAMA — pares "Etapa: prazo", somando o prazo total informado.
7. INVESTIMENTO — tabela com as linhas do escopo e o TOTAL. Depois, em
   pares, a forma de pagamento e a validade. Se o usuário informou um
   único valor, não invente desdobramento de preço: apresente o total e
   descreva o que está incluso.
8. O QUE NÃO ESTÁ INCLUÍDO — três itens objetivos. Proposta séria diz o
   limite do escopo; é o que evita briga depois.
9. GARANTIAS — o que você assegura (revisões, suporte, prazo), sem
   prometer resultado de vendas.
10. PRÓXIMOS PASSOS — três passos numerados, o primeiro sendo o aceite.
11. Assinatura ao final."""

ARQUITETURA_CONTRATO = """ARQUITETURA DO CONTRATO (nesta ordem)
1. Qualificação das partes: CONTRATANTE e CONTRATADA, cada uma com
   pares "Rótulo: valor" (nome/razão social, CNPJ ou CPF, endereço,
   representante, e-mail). O que não foi informado vira [CAMPO].
2. Cláusulas numeradas como CLÁUSULA 1ª – OBJETO, CLÁUSULA 2ª – ...,
   cobrindo, no mínimo:
   objeto; escopo detalhado e o que está fora dele; obrigações da
   contratada; obrigações do contratante (incluindo entrega de material,
   textos, logo e acessos, e o efeito do atraso nisso); prazo e
   cronograma; preço, forma de pagamento e o que acontece em caso de
   atraso; alterações de escopo e como são orçadas; propriedade
   intelectual e licença de uso do que for entregue; hospedagem, domínio
   e custos de terceiros; confidencialidade; proteção de dados pessoais
   com menção expressa à Lei 13.709/2018 (LGPD) e ao papel de cada parte;
   garantia e correção de defeitos, com prazo; suporte e manutenção após
   a entrega; rescisão, prazo de aviso e multa; limitação de
   responsabilidade; disposições gerais e foro.
3. Fechamento com cidade, data, duas linhas de assinatura (contratante e
   contratada) e duas linhas de testemunha.

LINGUAGEM DO CONTRATO
- Português jurídico objetivo, frases curtas, sem latim decorativo.
- Cada cláusula com parágrafos numerados quando tiver mais de uma regra.
- Nada de cláusula abusiva ou de promessa de resultado comercial.
- Adapte as cláusulas ao serviço descrito no briefing: contrato de site
  fala de domínio, hospedagem e homologação; contrato de tráfego fala de
  verba de anúncio e acesso a conta de anúncios."""


def _prompt(kind: str, lead: Optional[Dict[str, Any]], perfil: Dict[str, Any],
            dados: Dict[str, Any]) -> str:
    nicho = (lead or {}).get("niche") or (lead or {}).get("role") or ""
    mercado = bloco_de_mercado(nicho, (lead or {}).get("role", ""))
    saber = conhecimento_do_nicho(nicho, (lead or {}).get("role", ""))
    arquitetura = ARQUITETURA_CONTRATO if kind == "contrato" else ARQUITETURA_PROPOSTA
    peca = "um contrato de prestação de serviços" if kind == "contrato" else "uma proposta comercial"

    return f"""Você redige {peca} em português do Brasil, para um prestador de serviço
enviar a um cliente específico. O documento vai ser lido e assinado por
gente de verdade: precisa ser completo, preciso e sem enchimento.

QUEM ENVIA
{_quem_assina(perfil)}

PARA QUEM (dados verificados do negócio)
{_retrato_do_lead(lead)}

BRIEFING DO SERVIÇO
{_briefing(dados)}

COMO O MERCADO DELE FUNCIONA
{mercado}
{('O que decide a escolha do cliente dele: ' + saber['prova']) if saber.get('prova') else ''}

{arquitetura}

{FORMATO}

REGRAS QUE NÃO PODEM SER QUEBRADAS
- Nunca invente número: valor, prazo, percentual, CNPJ, quantidade de
  clientes, faturamento. Sem informação, use [CAMPO EM CAIXA ALTA].
- Use os fatos reais do negócio acima. Se o diagnóstico citar "213
  avaliações", é porque isso é verdade; não arredonde nem exagere.
- Não prometa posição no Google, número de vendas ou retorno garantido.
- Não copie frase de modelo pronto: "somos uma empresa líder", "soluções
  inovadoras", "parceria de sucesso" estão proibidas.
- O documento inteiro em texto corrido, seguindo o FORMATO acima.

RETORNO
JSON puro, sem markdown, com estas chaves:
- "titulo": título do documento, curto (ex.: "Proposta — Site institucional para a Padaria Pão Quente")
- "conteudo": o documento inteiro, com quebras de linha reais
- "resumo": uma frase sobre a lógica que você usou para montar este documento
- "campos_faltando": lista dos [CAMPOS] que ficaram para o usuário preencher
"""


async def gerar_documento(
    kind: str,
    lead: Optional[Dict[str, Any]],
    perfil: Dict[str, Any],
    dados: Dict[str, Any],
    api_key: str,
) -> Dict[str, Any]:
    if kind not in TIPOS:
        raise ValueError(f"Tipo de documento inválido: {kind}")
    if not api_key:
        raise AIIndisponivel(
            "A redação com IA não está configurada: falta a chave do Gemini."
        )

    client = build_client(api_key, TIMEOUT_LONGO_MS)
    resposta = gerar_json(
        client,
        _prompt(kind, lead, perfil, dados),
        obrigatorias=["titulo", "conteudo"],
    )

    conteudo = str(resposta.get("conteudo") or "").strip()
    if len(conteudo) < 400:
        raise AIIndisponivel(
            "A IA devolveu um documento curto demais para ser usado. Gere novamente."
        )

    faltando = [str(c).strip() for c in (resposta.get("campos_faltando") or []) if str(c).strip()]

    return {
        "kind": kind,
        "title": str(resposta.get("titulo") or "").strip()[:120] or (
            "Contrato de prestação de serviços" if kind == "contrato" else "Proposta comercial"
        ),
        "content": conteudo,
        "resumo": str(resposta.get("resumo") or "").strip()[:300],
        "campos_faltando": faltando[:12],
        # Documento gerado por IA é ponto de partida, não parecer
        # jurídico. Dizer isso na tela é mais honesto do que enfiar um
        # aviso no meio do contrato que o cliente do usuário vai ler.
        "aviso": (
            "Revise com seu advogado antes de assinar: este contrato foi montado "
            "a partir do briefing e não substitui análise jurídica."
            if kind == "contrato" else
            "Confira valores, prazos e o que ficou entre colchetes antes de enviar."
        ),
    }
