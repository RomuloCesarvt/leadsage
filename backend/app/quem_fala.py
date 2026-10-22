"""Quem está escrevendo, e de quem ele fala.

Quem responde ao robô muitas vezes NÃO é o profissional: é a recepção, a secretária, um funcionário. Quando essa pessoa diz
"a Ana Teresa entrou em licença maternidade, não atende mais aqui", a Ana Teresa é assunto, não interlocutora. O robô já respondeu
"Entendo, Ana Teresa. Desejo uma ótima licença..." como se ela estivesse lendo. Este módulo reconhece esse erro (tratar a pessoa
AUSENTE como se fosse quem escreveu) para o verificador mandar reescrever.
"""
import re
from typing import Any, Dict, List, Optional

# A pessoa de quem se fala não está ali: licença, férias, saiu, não atende mais, viajando, afastada...
_AUSENCIA = re.compile(
    r"licen[cç]a|afastad|f[eé]rias|maternidade|gestante|gr[aá]vida|atestado|n[aã]o atende mais|n[aã]o (?:est[aá]|trabalha|fica|vem) (?:mais )?"
    r"(?:aqui|na cl[ií]nica|no consult[oó]rio|conosco|por aqui)|saiu|foi embora|se mudou|mudou-se|aposent|desligou|viajando|viajou|faleceu|fechou",
    re.I,
)
_TITULO = r"(?:Dra?|Doutora?|Prof[a]?)\.?"
# "a Ana Teresa", "o Dr. Carlos", "a doutora Maria Clara", "Dra. Ana": nome próprio em 3ª pessoa
_TERCEIRA = re.compile(
    r"\b(?:[Aa]|[Oo]|[Dd]ra?\.?|[Dd]outora?|[Pp]rof\.?|[Pp]rofessora?)\s+(?:" + _TITULO + r"\s+)?"
    r"((?:[A-ZÀ-Ý][a-zà-ÿ]+)(?:\s+(?:d[aeo]s?\s+)?[A-ZÀ-Ý][a-zà-ÿ]+){0,2})"
)
# quando a própria pessoa se apresenta ("aqui é a Marcelly", "sou a Ana Teresa", "a Marcelly falando") o nome é DELA
_SE_APRESENTA = re.compile(r"\b(?:aqui [ée]|sou|meu nome [ée]|me chamo|quem fala [ée]|quem fala|falando)\s+$", re.I)
_APRESENTANDO_DEPOIS = re.compile(r"\s+(?:falando|aqui|na linha|que fala)\b", re.I)
_NAO_E_NOME = {"Dra", "Dr", "Doutora", "Doutor", "Boa", "Bom", "Oi", "Olá", "Ola", "Aqui", "Tudo", "Obrigado", "Obrigada"}


def pessoas_ausentes(texto: str) -> List[str]:
    """Nomes citados em terceira pessoa numa fala que fala de ausência ("a Ana Teresa entrou em licença")."""
    if not texto or not _AUSENCIA.search(texto):
        return []
    achados: List[str] = []
    for m in _TERCEIRA.finditer(texto):
        nome = m.group(1).strip()
        if nome.split()[0] in _NAO_E_NOME:
            continue
        if _SE_APRESENTA.search(texto[max(0, m.start() - 22): m.start()]) or _APRESENTANDO_DEPOIS.match(texto[m.end(): m.end() + 14]):
            continue  # "aqui é a Marcelly" / "a Marcelly falando": o nome é de quem escreve, não de uma ausente
        if nome not in achados:
            achados.append(nome)
    return achados


def _trata_como_interlocutora(resposta: str, nome: str) -> Optional[str]:
    """A resposta fala COM a pessoa ausente: chama pelo nome no vocativo, ou deseja algo "para você"/"sua licença"."""
    resposta = re.sub(r"\b(Dra?|Sra?|Prof[a]?)\.", r"\1", resposta)  # "Dra. Ana Teresa." não é começo de frase
    n = re.escape(nome)
    inicio = r"(?:entendo|entendi|certo|claro|perfeito|obrigad[oa]|oi|ol[aá]|tudo bem|beleza|combinado|imagina|poxa|nossa|que bom|parab[eé]ns|sinto muito)"
    voc = re.search(rf"(?:^|[.!?]\s+|\n)(?:{inicio}[,!]?\s+)?{n}\s*[,.!:]", resposta, re.I)
    if voc:
        return voc.group(0).strip(" \n")
    seg = re.search(
        r"\b(?:sua|tua) (?:licen[cç]a|recupera[cç][aã]o|volta|aus[eê]ncia|sa[uú]de)\b|\bboa recupera[cç][aã]o para voc[eê]\b"
        r"|\bpara voc[eê]\b[^.?!]{0,30}\b(?:licen[cç]a|recupera[cç][aã]o|descanso)\b",
        resposta, re.I,
    )
    return seg.group(0) if seg else None


ERRO = ('você tratou "{nome}" como se fosse quem está escrevendo ("{trecho}"), mas "{nome}" é a pessoa DE QUEM o cliente falou ("{ausente}"): '
        'ela está ausente e não está nesta conversa. Responda a QUEM ESCREVEU (a recepção, a secretária, outra pessoa), sem usar o nome da ausente '
        'como tratamento e sem falar com ela ("sua licença", "boa recuperação para você"). Agradeça o aviso e, se quiser, deseje bem a ela EM '
        'TERCEIRA PESSOA ("desejo uma ótima licença à Dra. {nome}"); depois faça UMA pergunta curta: quem responde pela clínica ou pela '
        'divulgação enquanto isso, ou quando ela volta')


def erro_de_pessoa_errada(textos: List[str], mensagens: List[Dict[str, Any]]) -> Optional[str]:
    """Mensagem de correção para o modelo, ou None quando a resposta fala com quem realmente escreveu."""
    ultima = next((m.get("texto", "") for m in reversed(mensagens or []) if m.get("de") == "contato"), "")
    for nome in pessoas_ausentes(ultima):
        for t in textos or []:
            trecho = _trata_como_interlocutora(t, nome)
            if trecho:
                return ERRO.format(nome=nome, trecho=trecho[:60], ausente=ultima.strip()[:90])
    return None
