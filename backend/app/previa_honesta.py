"""A prévia é uma prévia: nunca "o seu site profissional", "o site pronto" ou "preparei um site".

O site que o robô manda para atrair o dono é montado com foto de banco e texto de exemplo. Dizer que se "preparou um site
profissional" promete o que ainda não existe, e quando o dono vê uma foto que não é dele a confiança acaba. Este módulo
reconhece essa linguagem para o validador do robô (conversa) e da primeira abordagem mandarem reescrever.
"""
import re
from typing import Optional

_VERBO = r"(?:preparei|montei|criei|fiz|desenvolvi|elaborei|deixei|preparamos|montamos|criamos|fizemos|desenvolvemos|construi|construimos|construímos)"
# entre o verbo e a palavra "site" nao pode aparecer prévia/esboço/modelo: "montei um esboço do seu site" esta certo
_SEM_PREVIA = r"(?:(?!pr[eé]via|esbo[cç]o|modelo|ideia|ideias|vers[aã]o|amostra|rascunho|exemplo|proposta|simula)[^.?!\n])"

_PADROES = (
    # "preparei um site", "montei o seu site", "criamos um novo site"
    re.compile(rf"\b{_VERBO}\b{_SEM_PREVIA}{{0,30}}\b(?:um|o|seu|esse|este|uns)\s+(?:novo\s+)?site\b", re.I),
    # "montei ... site profissional"
    re.compile(rf"\b{_VERBO}\b{_SEM_PREVIA}{{0,40}}\bsite\s+profissional\b", re.I),
    # "aqui está o site", "segue o seu site", "veja o site que preparei"
    re.compile(rf"\b(?:aqui est[aá]|segue|veja|confira|olha)\b{_SEM_PREVIA}{{0,25}}\b(?:o|seu|um|este|esse)\s+(?:novo\s+)?site\b", re.I),
    # "o seu site já está pronto", "o site ficou finalizado", "seu site no ar" (so quando e O site dele; "um site pronto" generico nao conta)
    re.compile(r"\b(?:o|seu|este|esse|meu|nosso)\s+(?:novo\s+)?site\s+(?:profissional\s+)?(?:j[aá]\s+)?(?:(?:est[aá]|ficou|foi)\s+)?"
               r"(?:pronto|finalizado|completo|no ar|publicado|terminado)\b", re.I),
)

ERRO = ('você chamou a prévia de site pronto ou profissional ("{trecho}"): ela é só uma prévia, uma primeira ideia com fotos de banco e textos de '
        'exemplo, não o site final. Chame de prévia, esboço ou modelo e diga que o site de verdade é feito depois, com as fotos e as informações '
        'reais do negócio dele')


def trecho_de_site_pronto(texto: str) -> Optional[str]:
    """O trecho que apresenta a prévia como site pronto/profissional, ou None se a mensagem está honesta."""
    for p in _PADROES:
        m = p.search(texto or "")
        if m:
            return m.group(0)[:60]
    return None


def erro_de_site_pronto(textos) -> Optional[str]:
    """Mensagem de correcao para o modelo, ou None."""
    for t in textos or []:
        achou = trecho_de_site_pronto(t)
        if achou:
            return ERRO.format(trecho=achou)
    return None
