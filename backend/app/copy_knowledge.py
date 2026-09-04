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
        "limite": "de 90 a 130 palavras",
        "estrutura": "assunto curto, abertura com o dado concreto, uma frase de proposta, uma pergunta final",
        "tom": "escrito, mas conversado; sem saudação protocolar",
    },
    "whatsapp": {
        "limite": "no máximo 60 palavras",
        "estrutura": "duas ou três frases curtas, quebradas em linhas, terminando em pergunta",
        "tom": "mensagem de pessoa, não de empresa; sem assunto e sem assinatura formal",
    },
    "instagram_direct": {
        "limite": "no máximo 45 palavras",
        "estrutura": "uma frase que mostra que você viu o perfil, uma frase de proposta, uma pergunta",
        "tom": "direto e informal, como quem manda DM de verdade",
    },
    "linkedin_msg": {
        "limite": "no máximo 80 palavras",
        "estrutura": "contexto profissional, proposta objetiva, convite para conversa",
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
