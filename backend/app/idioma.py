"""A língua em que se fala com cada lead: a do país dele.

Quem busca negócios fora do Brasil precisa que a abordagem saia na língua nativa de lá, escrita como um profissional daquele país escreve
(tratamento, saudação, pontuação), e não em português. O país vem do texto de localização da busca ("Madrid, Spain"), do endereço e, se for
preciso, do código do telefone. Sem nenhum sinal, vale o Brasil (português).
"""
import re
import unicodedata
from typing import Any, Dict, Optional

# código do país -> (idioma, nome do idioma em português, nome do país, como o profissional de lá fala)
PAISES: Dict[str, Dict[str, str]] = {
    "BR": {"idioma": "pt", "nome": "português do Brasil", "pais": "Brasil", "jeito": "português brasileiro natural, com 'você' e tom caloroso"},
    "PT": {"idioma": "pt", "nome": "português de Portugal", "pais": "Portugal", "jeito": "português europeu (de Portugal), com 'o senhor/a senhora' ou 'você' formal conforme o caso, sem brasileirismos"},
    "US": {"idioma": "en", "nome": "inglês americano", "pais": "Estados Unidos", "jeito": "American English, friendly and direct"},
    "GB": {"idioma": "en", "nome": "inglês britânico", "pais": "Reino Unido", "jeito": "British English, polite and understated"},
    "CA": {"idioma": "en", "nome": "inglês canadense", "pais": "Canadá", "jeito": "Canadian English, friendly and polite"},
    "AU": {"idioma": "en", "nome": "inglês australiano", "pais": "Austrália", "jeito": "Australian English, relaxed and direct"},
    "IE": {"idioma": "en", "nome": "inglês irlandês", "pais": "Irlanda", "jeito": "Irish English, warm and friendly"},
    "NZ": {"idioma": "en", "nome": "inglês neozelandês", "pais": "Nova Zelândia", "jeito": "New Zealand English, relaxed"},
    "ES": {"idioma": "es", "nome": "espanhol da Espanha", "pais": "Espanha", "jeito": "español de España, cercano y profesional (tuteo o 'usted' según el caso)"},
    "MX": {"idioma": "es", "nome": "espanhol mexicano", "pais": "México", "jeito": "español mexicano, cordial y respetuoso (usted al inicio)"},
    "AR": {"idioma": "es", "nome": "espanhol argentino", "pais": "Argentina", "jeito": "español rioplatense (vos), cercano y directo"},
    "CO": {"idioma": "es", "nome": "espanhol colombiano", "pais": "Colômbia", "jeito": "español colombiano, amable y formal (usted)"},
    "CL": {"idioma": "es", "nome": "espanhol chileno", "pais": "Chile", "jeito": "español chileno, cordial y claro"},
    "PE": {"idioma": "es", "nome": "espanhol peruano", "pais": "Peru", "jeito": "español peruano, cordial y respetuoso (usted)"},
    "UY": {"idioma": "es", "nome": "espanhol uruguaio", "pais": "Uruguai", "jeito": "español rioplatense, cordial"},
    "PY": {"idioma": "es", "nome": "espanhol paraguaio", "pais": "Paraguai", "jeito": "español paraguayo, cordial"},
    "EC": {"idioma": "es", "nome": "espanhol equatoriano", "pais": "Equador", "jeito": "español ecuatoriano, cordial (usted)"},
    "BO": {"idioma": "es", "nome": "espanhol boliviano", "pais": "Bolívia", "jeito": "español boliviano, cordial (usted)"},
    "VE": {"idioma": "es", "nome": "espanhol venezuelano", "pais": "Venezuela", "jeito": "español venezolano, cordial"},
    "FR": {"idioma": "fr", "nome": "francês", "pais": "França", "jeito": "français professionnel et chaleureux, avec vouvoiement"},
    "IT": {"idioma": "it", "nome": "italiano", "pais": "Itália", "jeito": "italiano cordiale e professionale (Lei di cortesia)"},
    "DE": {"idioma": "de", "nome": "alemão", "pais": "Alemanha", "jeito": "professionelles Deutsch, höflich und direkt (Sie-Form)"},
    "AT": {"idioma": "de", "nome": "alemão", "pais": "Áustria", "jeito": "professionelles Deutsch, höflich (Sie-Form)"},
}

# nomes de país como aparecem nos textos de localização (já sem acento e em minúsculas), em várias línguas
NOMES = {
    "BR": ("brazil", "brasil"), "PT": ("portugal",), "US": ("united states", "estados unidos", "usa", "u.s.a", "u.s.", "eua"),
    "GB": ("united kingdom", "reino unido", "england", "scotland", "wales", "great britain", "inglaterra", " uk"),
    "CA": ("canada",), "AU": ("australia",), "IE": ("ireland", "irlanda"), "NZ": ("new zealand", "nova zelandia"),
    "ES": ("spain", "espana", "espanha"), "MX": ("mexico",), "AR": ("argentina",), "CO": ("colombia",), "CL": ("chile",),
    "PE": ("peru",), "UY": ("uruguay", "uruguai"), "PY": ("paraguay", "paraguai"), "EC": ("ecuador", "equador"),
    "BO": ("bolivia",), "VE": ("venezuela",), "FR": ("france", "franca"), "IT": ("italy", "italia"),
    "DE": ("germany", "alemanha", "deutschland"), "AT": ("austria",),
}

# código de discagem -> país (do mais longo para o mais curto)
DDI = (
    ("351", "PT"), ("353", "IE"), ("598", "UY"), ("595", "PY"), ("593", "EC"), ("591", "BO"), ("58", "VE"), ("57", "CO"), ("56", "CL"),
    ("55", "BR"), ("54", "AR"), ("52", "MX"), ("51", "PE"), ("49", "DE"), ("44", "GB"), ("43", "AT"), ("39", "IT"), ("34", "ES"),
    ("33", "FR"), ("64", "NZ"), ("61", "AU"), ("1", "US"),
)


def _sem_acento(t: str) -> str:
    return unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()


def pais_do_texto(texto: str) -> str:
    """O país citado num texto de localização ("Madrid, Spain"). Procura primeiro no fim do texto, onde o país costuma estar."""
    t = " " + _sem_acento(texto).strip() + " "
    if not t.strip():
        return ""
    ultimo = t.rsplit(",", 1)[-1]
    for trecho in (ultimo, t):
        for cod, nomes in NOMES.items():
            for n in nomes:
                if re.search(r"(?<![a-z])" + re.escape(n.strip()) + r"(?![a-z])", trecho):
                    return cod
    return ""


def pais_do_telefone(fone: str) -> str:
    d = re.sub(r"\D", "", str(fone or ""))
    if not d or not str(fone).strip().startswith("+") and len(d) <= 11:
        return ""            # número local sem código do país: não dá para saber
    for ddi, cod in sorted(DDI, key=lambda x: -len(x[0])):
        if d.startswith(ddi):
            return cod
    return ""


def pais_do_lead(lead: Any) -> str:
    """O código do país do lead: localização -> endereço -> telefone -> Brasil."""
    g = (lambda k: (lead.get(k) if isinstance(lead, dict) else getattr(lead, k, "")) or "")
    for campo in ("location", "address", "city"):
        cod = pais_do_texto(str(g(campo)))
        if cod:
            return cod
    cod = pais_do_telefone(str(g("phone")))
    return cod or "BR"


def do_lead(lead: Any, pais: Optional[str] = None) -> Dict[str, str]:
    """{"codigo": "en", "pais_codigo": "US", "nome": ..., "pais": ..., "jeito": ...} do lead (ou do país informado)."""
    cod = pais if pais in PAISES else pais_do_lead(lead)
    return {"codigo": PAISES[cod]["idioma"], "pais_codigo": cod, "nome": PAISES[cod]["nome"], "pais": PAISES[cod]["pais"], "jeito": PAISES[cod]["jeito"]}


def e_portugues(idioma: Dict[str, str]) -> bool:
    return idioma.get("codigo") == "pt"


def instrucao(idioma: Dict[str, str], robo: bool = False) -> str:
    """O trecho do prompt que manda escrever na língua do lead. Em português do Brasil não acrescenta nada."""
    if idioma.get("pais_codigo") == "BR":
        return ""
    base = (
        f"IDIOMA (regra acima de todas): o lead é de {idioma['pais']}. Escreva a mensagem INTEIRA em {idioma['nome']}, como um profissional de lá escreve: "
        f"{idioma['jeito']}. Saudação, tratamento, pontuação e emoji no costume do país. NUNCA misture com português. "
        "As instruções e os exemplos destas instruções estão em português só porque são o roteiro: siga a ideia, escreva no idioma do lead. "
        "Não traduza o nome do negócio, nomes de pessoas nem endereços."
    )
    if robo:
        base += (" Se o cliente escrever em outro idioma, responda no idioma em que ELE escreveu. "
                 "O valor em reais (R$) que vier do cadastro continua em reais, escrito como está.")
    return base + "\n"
