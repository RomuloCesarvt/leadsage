"""Conhecimento de negócio por nicho, para a IA parar de ser genérica.

O prompt anterior mandava "seja um consultor" e "não seja genérico".
Isso não ensina nada ao modelo — é como pedir a alguém que escreva bem
sem dizer sobre o quê. O resultado era sempre a mesma carta.

Aqui entra o que um vendedor experiente sabe de cada mercado: por onde o
cliente daquele negócio chega, o que ele perde quando não é encontrado, e
quanto vale um cliente ali. Com isso o modelo tem o que dizer.
"""
import re
import unicodedata
from typing import Any, Dict, List


# Limite de palavra em regex, montado sem escape literal para nao ser
# comido por processamento de string.
LIMITE = chr(92) + 'b'


def strip_accents(texto: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", texto or "")
        if unicodedata.category(c) != "Mn"
    )

# Cada entrada responde três perguntas concretas:
#   canal   — por onde o cliente desse negócio realmente chega
#   perda   — o que acontece, em termos práticos, quando ele não é achado
#   ticket  — quanto vale um cliente, para dimensionar o argumento
CONHECIMENTO: Dict[str, Dict[str, str]] = {
    "padaria": {
        "canal": "vizinhança e quem passa na porta; encomenda de bolo e festa vem por telefone e Instagram",
        "perda": "encomenda de aniversário e formatura vai para quem aparece primeiro na busca por 'bolo em <cidade>'",
        "ticket": "uma encomenda de festa passa de R$ 300 e o cliente costuma voltar",
        "prova": "quem procura padaria no celular decide em minutos e não liga se não achar cardápio ou horário",
    },
    "restaurante": {
        "canal": "busca no Google Maps na hora da fome e indicação",
        "perda": "reserva de grupo e evento fechado, que quase nunca chega por rede social",
        "ticket": "um jantar de grupo vale dez almoços avulsos",
        "prova": "cardápio desatualizado ou ausente é o motivo mais comum de o cliente escolher o concorrente ao lado",
    },
    "clinica": {
        "canal": "busca por sintoma ou especialidade, e convênio",
        "perda": "paciente novo, que pesquisa o profissional antes de marcar e desiste se não encontra nada além do Instagram",
        "ticket": "um paciente recorrente vale muito mais que a consulta avulsa",
        "prova": "paciente confere endereço, convênio e formação antes de ligar; sem isso, marca em outro lugar",
    },
    "odontologia": {
        "canal": "busca por 'dentista perto de mim' e indicação",
        "perda": "tratamento de maior valor, como implante e ortodontia, que exige confiança antes do primeiro contato",
        "ticket": "um tratamento ortodôntico é contrato de meses",
        "prova": "antes e depois, formação e estrutura são o que fazem o paciente escolher a clínica",
    },
    "advocacia": {
        "canal": "indicação e busca por área do direito",
        "perda": "cliente que pesquisa o escritório e não encontra nada que transmita seriedade",
        "ticket": "uma causa trabalhista ou empresarial paga muitos meses de site",
        "prova": "o cliente jurídico verifica quem é o escritório antes de expor o problema dele",
    },
    "contabilidade": {
        "canal": "indicação de contador para contador e busca de quem está abrindo empresa",
        "perda": "empresa nova, que procura contador nos primeiros dias e fecha com o primeiro que passa confiança",
        "ticket": "um cliente de contabilidade é honorário mensal, receita recorrente",
        "prova": "quem abre CNPJ compara três escritórios e descarta os que não têm site",
    },
    "estetica": {
        "canal": "Instagram e indicação, com busca crescente por procedimento",
        "perda": "cliente de procedimento caro, que pesquisa resultado e segurança antes de agendar",
        "ticket": "protocolos de harmonização e laser passam de R$ 1.000",
        "prova": "resultado, biossegurança e credencial do profissional decidem a escolha",
    },
    "barbearia": {
        "canal": "vizinhança, Instagram e indicação de cliente para cliente no mesmo bairro",
        "perda": "agendamento fora do horário de atendimento, que se perde quando só há telefone",
        "ticket": "cliente de barbearia volta a cada duas ou três semanas",
        "prova": "agendamento online tira o cliente da fila e enche o horário vago",
    },
    "academia": {
        "canal": "busca por academia próxima e campanha de início de ano",
        "perda": "matrícula de quem compara planos e estrutura antes de visitar",
        "ticket": "uma matrícula anual é receita recorrente de doze meses",
        "prova": "quem procura academia quer ver preço, horário e estrutura antes de entrar",
    },
    "petshop": {
        "canal": "vizinhança e busca por banho e tosa",
        "perda": "cliente recorrente de banho e tosa, que agenda por WhatsApp mas descobre a loja pela busca",
        "ticket": "banho e tosa é receita mensal por animal",
        "prova": "dono de pet escolhe por proximidade e confiança, e confere antes de deixar o animal",
    },
    "imobiliaria": {
        "canal": "portais de imóveis e busca por bairro",
        "perda": "comprador que pesquisa o imóvel e o corretor antes de agendar visita",
        "ticket": "uma comissão de venda paga anos de presença digital",
        "prova": "quem compra imóvel pesquisa muito e desconfia de quem não tem vitrine própria",
    },
    "mecanica": {
        "canal": "urgência: o carro quebrou e a pessoa busca no celular",
        "perda": "serviço de urgência, decidido em minutos pela primeira oficina que aparece com telefone visível",
        "ticket": "um serviço de motor ou câmbio é de alto valor",
        "prova": "na urgência, ganha quem tem telefone e horário visíveis na primeira tela",
    },
    "construcao": {
        "canal": "indicação e busca por serviço específico",
        "perda": "obra completa, que o cliente só confia a quem consegue mostrar trabalhos anteriores",
        "ticket": "uma reforma é contrato de dezenas de milhares",
        "prova": "portfólio de obras é o que separa o profissional do 'cara que apareceu'",
    },
    "beleza": {
        "canal": "Instagram e indicação de cliente",
        "perda": "horário vago que ninguém preenche porque não há agendamento fora do expediente",
        "ticket": "cliente de salão volta todo mês",
        "prova": "agenda cheia depende de o cliente conseguir marcar quando lembra, não quando o salão atende",
    },
    "educacao": {
        "canal": "busca por curso e matrícula sazonal",
        "perda": "matrícula de quem compara escolas pelo site antes de visitar",
        "ticket": "uma matrícula é mensalidade pelo ano inteiro",
        "prova": "pai de aluno pesquisa proposta pedagógica e estrutura antes de agendar visita",
    },
}

# Palavras e construções que denunciam texto de IA. Listar explicitamente
# funciona muito melhor do que pedir "não seja genérico".
CLICHES = [
    "espero que esteja bem",
    "venho por meio desta",
    "somos uma empresa líder",
    "soluções inovadoras",
    "parceria de sucesso",
    "alavancar",
    "potencializar",
    "sinergia",
    "no cenário atual",
    "em um mundo cada vez mais digital",
    "não perca esta oportunidade",
    "revolucionar",
    "transformar digitalmente",
    "estamos à disposição",
    "aguardo seu retorno",
]

# Limites por canal. WhatsApp lido no celular nao aceita o mesmo tamanho
# de um e-mail.
FORMATO_CANAL: Dict[str, Dict[str, Any]] = {
    "email": {
        "limite": "de 90 a 140 palavras",
        "estrutura": "assunto curto e humano; cumprimento com o nome; quem você é em uma frase; o que viu no negócio; o que muda para ele; uma pergunta final",
        "tom": "escrito, mas conversado, como um profissional educado escreve para alguém que não conhece",
    },
    "whatsapp": {
        "limite": "de 45 a 75 palavras",
        "estrutura": "cumprimento (com o nome) e um 'tudo bem?' leve; quem você é; o que viu no negócio e o que muda para ele; uma pergunta fácil. Em linhas curtas",
        "tom": "mensagem de pessoa, calorosa e respeitosa; sem assunto e sem assinatura formal",
    },
    "instagram_direct": {
        "limite": "de 35 a 55 palavras",
        "estrutura": "cumprimento; quem você é em poucas palavras; o que viu no perfil; uma pergunta fácil",
        "tom": "informal e simpático, como quem manda DM de verdade",
    },
    "linkedin_msg": {
        "limite": "de 55 a 90 palavras",
        "estrutura": "cumprimento; quem você é; contexto profissional do que viu; proposta objetiva; convite leve para conversar",
        "tom": "profissional, sem formalidade excessiva",
    },
}


def _chave(texto: str) -> str:
    """Descobre o mercado a partir do texto do nicho ou do tipo do Google.

    Termos curtos exigem limite de palavra: sem isso "bar" casava dentro
    de "barbearia", e toda barbearia recebia o conhecimento de
    restaurante.
    """
    t = strip_accents((texto or "").lower())
    mapa = [
        ("padaria", ["padaria", "panific", "confeit", "bolo"]),
        ("restaurante", ["restaurant", "pizzar", "lanchon", "bistr", "hamburgu", "cafeteria",
                         "boteco", "botequim", "bar", "bares", "cafe"]),
        ("odontologia", ["dentista", "odonto", "ortodont"]),
        ("clinica", ["clínic", "clinic", "médic", "medic", "consultóri", "nutri", "fisiotera", "psicól", "veterinár"]),
        ("advocacia", ["advog", "advocac", "jurídic"]),
        ("contabilidade", ["contab", "contador", "fiscal"]),
        ("estetica", ["estétic", "estetic", "harmoniz", "dermato", "depilaç"]),
        ("barbearia", ["barbe"]),
        ("beleza", ["salão", "salao", "cabelei", "manicur", "unha", "maquia"]),
        ("academia", ["academia", "crossfit", "pilates", "treinam", "personal"]),
        ("petshop", ["pet", "veterin", "tosa"]),
        ("imobiliaria", ["imobiliár", "corretor", "imóve", "imove"]),
        ("mecanica", ["mecânic", "mecanic", "oficina", "auto center", "autopeç", "funilar"]),
        ("construcao", ["construç", "constru", "empreiteir", "marcenar", "arquitet", "engenhar", "reforma", "serralher"]),
        ("educacao", ["escola", "colégi", "colegi", "curso", "ensino", "creche"]),
    ]
    for chave, termos in mapa:
        for termo in termos:
            alvo = strip_accents(termo)
            if len(alvo) <= 4:
                # Termo curto só vale como palavra inteira: sem isso
                # "bar" casava dentro de "barbearia", e toda barbearia
                # recebia o conhecimento de restaurante.
                encontrou = re.search(LIMITE + re.escape(alvo) + LIMITE, t)
            else:
                encontrou = alvo in t
            if encontrou:
                return chave
    return ""


def conhecimento_do_nicho(niche: str, role: str = "") -> Dict[str, str]:
    """O que sabemos do mercado desse lead. Vazio quando não conhecemos —
    melhor o modelo não ter contexto do que ter contexto errado."""
    return CONHECIMENTO.get(_chave(niche) or _chave(role), {})


def bloco_de_mercado(niche: str, role: str = "") -> str:
    """Texto pronto para entrar no prompt."""
    dados = conhecimento_do_nicho(niche, role)
    if not dados:
        return (
            "Não temos conhecimento consolidado deste mercado. "
            "Use apenas os dados verificados do lead e evite afirmar como esse setor funciona."
        )
    return (
        f"- Por onde o cliente desse negócio chega: {dados['canal']}\n"
        f"- O que ele perde sem presença digital: {dados['perda']}\n"
        f"- Quanto vale um cliente ali: {dados['ticket']}\n"
        f"- O que decide a escolha: {dados['prova']}"
    )


def regras_do_canal(canal: str) -> Dict[str, Any]:
    return FORMATO_CANAL.get(canal or "email", FORMATO_CANAL["email"])


def lista_de_cliches() -> str:
    return ", ".join(f'"{c}"' for c in CLICHES)


# ---------------------------------------------------------------- tom de voz

# "Tom: Consultivo" nao ensina nada ao modelo — e um rotulo. O que muda
# de verdade um texto e a instrucao concreta: que verbo usar, como abrir,
# o que nao fazer. Cada tom abaixo e uma direcao de escrita, nao um
# adjetivo.
TONS: Dict[str, Dict[str, str]] = {
    "Consultivo": {
        "voz": "de quem entende do negocio do outro e fala de igual para igual",
        "postura": "aponta um fato, explica a consequencia em dinheiro e propoe um passo pequeno",
        "abertura": "cumprimente, diga quem voce e em uma frase, e so entao traga o dado que voce observou",
        "evite": "vender o servico antes de nomear o problema; adjetivo sobre si mesmo",
    },
    "Amigável": {
        "voz": "de vizinho que conhece o bairro e resolveu escrever",
        "postura": "informal, frases curtas, sem jargao, como quem manda mensagem no celular",
        "abertura": "cite algo local e concreto: o bairro, a fila, o horario, o que os clientes falam",
        "evite": "intimidade falsa, exclamacao em toda frase, girias demais",
    },
    "Direto": {
        "voz": "de quem respeita o tempo do outro",
        "postura": "duas ou tres frases; o problema, a proposta, a pergunta. Nada mais",
        "abertura": "cumprimento curto e apresentacao de meia frase; em seguida o fato, sem rodeio",
        "evite": "contexto longo, historico da sua empresa, qualquer frase que nao mude a decisao",
    },
    "Autoridade": {
        "voz": "de especialista que ja viu esse cenario dezenas de vezes no mesmo setor",
        "postura": "afirma com seguranca a partir de um padrao de mercado, sem arrogancia",
        "abertura": "cumprimente, apresente-se e mostre onde esse negocio esta dentro do padrao do setor",
        "evite": "soar superior, dar licao de moral, listar credenciais sem ligacao com o caso",
    },
    "Promocional": {
        "voz": "de quem tem uma condicao real e por tempo definido",
        "postura": "a oferta aparece cedo, com o limite claro, e a pergunta e sobre aceitar ou nao",
        "abertura": "cumprimente, apresente-se e diga o que esta oferecendo e por que agora",
        "evite": "urgencia inventada, desconto sem motivo, promessa de resultado numerico",
    },
}


def regras_do_tom(tom: str) -> Dict[str, str]:
    return TONS.get((tom or "").strip(), TONS["Consultivo"])


# ------------------------------------------------------------- aquecimento

# Um contato nao vira cliente na primeira mensagem, e a maioria das
# respostas vem do segundo ou do terceiro toque. O erro classico e
# repetir o mesmo pedido mais alto ("so passando para ver se viu"), que
# soa cobranca. Cada toque aqui entrega algo novo e pede menos que o
# anterior.
CADENCIA = (
    {
        "toque": 1,
        "quando": "agora",
        "objetivo": "ser recebido com simpatia: cumprimentar, dizer quem voce e provar que olhou aquele negocio",
        "pedido": "uma pergunta que se responde com uma palavra",
    },
    {
        "toque": 2,
        "quando": "3 dias depois, se nao houve resposta",
        "objetivo": "entregar valor sem cobrar resposta: um dado, uma comparacao, uma ideia aplicavel",
        "pedido": "nenhum pedido novo — no maximo 'faz sentido?'",
    },
    {
        "toque": 3,
        "quando": "7 dias depois do segundo, se ainda nao houve resposta",
        "objetivo": "fechar o ciclo com elegancia e deixar a porta aberta",
        "pedido": "permissao para parar de escrever, o que costuma provocar a resposta",
    },
)


def plano_de_aquecimento() -> str:
    """O texto da cadencia, pronto para entrar no prompt."""
    linhas = []
    for passo in CADENCIA:
        linhas.append(
            f"Toque {passo['toque']} ({passo['quando']}): {passo['objetivo']}. "
            f"Pedido: {passo['pedido']}."
        )
    return "\n".join(linhas)


# ----------------------------------------------------------- controle final

# O modelo obedece "nao use cliche" na maior parte das vezes, nao em
# todas. Como o texto vai para um desconhecido em nome do usuario, o que
# escapa precisa ser pego antes de chegar na tela.
_PERGUNTA = re.compile(r"\?")
# Cortesia de abertura nao e a pergunta da mensagem.
_CORTESIA = re.compile(r"tudo\s+(?:bem|certo|joia|tranquilo)\s*\?|como\s+(?:vai|est[aá]s?)(?:\s+voc[eê])?\s*\?", re.I)
_EMOJI = re.compile(
    "[" + "\U0001F300-\U0001FAFF" + "\U00002600-\U000027BF" + "\U0001F1E6-\U0001F1FF" + "]"
)
# Restos de template que denunciam automacao: [NOME], {empresa}, XXX
_PLACEHOLDER = re.compile(r"\[[A-Za-zÀ-ú _/]{2,30}\]|\{[a-z_]{2,20}\}|\bX{3,}\b")

# Numero que o modelo nao tinha como saber. A invencao aparece quase
# sempre em uma destas tres formas: percentual ("aumenta 30% as
# vendas"), dinheiro ("voce perde R$ 3.000 por mes") e volume de
# clientes ("a padaria vizinha recebe 15 encomendas"). Nota e quantidade
# de avaliacoes vem dos dados reais do Google e nao casam aqui.
_PROMESSA_NUMERICA = re.compile(
    r"\d+\s?%"
    r"|R\$\s?\d"
    r"|\b\d+\s+(?:clientes|encomendas|vendas|pedidos|pacientes|agendamentos|"
    r"leads|contratos|matr[ií]culas|or[çc]amentos)\b",
    re.I,
)

LIMITE_DE_PALAVRAS = {
    "email": 160,
    "whatsapp": 85,
    "whatsapp_api": 85,
    "instagram_direct": 65,
    "linkedin_msg": 100,
    "webhook": 150,
}


def contar_palavras(texto: str) -> int:
    return len([p for p in re.split(r"\s+", (texto or "").strip()) if p])


def revisar_copy(texto: str, canal: str = "email") -> List[str]:
    """Devolve os problemas encontrados no texto gerado.

    Lista vazia = pode ir para a tela. Com problemas, quem chamou manda o
    modelo reescrever citando exatamente estes itens — reescrever com o
    defeito nomeado funciona; reescrever "melhor" nao.
    """
    problemas: List[str] = []
    limpo = (texto or "").strip()

    if not limpo:
        return ["a mensagem veio vazia"]

    baixo = strip_accents(limpo.lower())
    for cliche in CLICHES:
        if strip_accents(cliche.lower()) in baixo:
            problemas.append(f'contém o clichê "{cliche}"')

    limite = LIMITE_DE_PALAVRAS.get(canal or "email", 150)
    palavras = contar_palavras(limpo)
    if palavras > limite:
        problemas.append(f"tem {palavras} palavras e o limite deste canal é {limite}")

    perguntas = len(_PERGUNTA.findall(_CORTESIA.sub("", limpo)))
    if perguntas > 1:
        problemas.append(f"faz {perguntas} perguntas; deve fazer uma só")
    if perguntas == 0:
        problemas.append("não termina em pergunta, então não convida a responder")

    if _PLACEHOLDER.search(limpo):
        problemas.append("sobrou um campo de modelo por preencher, como [NOME] ou {empresa}")

    emojis = _EMOJI.findall(limpo)
    if canal in ("email", "linkedin_msg", "webhook") and emojis:
        problemas.append("usa emoji num canal onde isso passa impressão de disparo em massa")
    elif len(emojis) > 1:
        problemas.append("usa mais de um emoji")

    if "http://" in limpo or "https://" in limpo:
        problemas.append("inclui link no primeiro contato, o que derruba a entrega e a resposta")

    inventado = _PROMESSA_NUMERICA.search(limpo)
    if inventado:
        problemas.append(
            f'afirma o número "{inventado.group(0).strip()}", que não veio dos dados do lead'
        )

    return problemas
