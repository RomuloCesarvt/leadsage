"""Curadoria do banco de imagens: o que buscar, o que combina e o que NUNCA entra, por ramo.

O banco entrega o que bate com a palavra, não o que combina com o negócio: "wellness" para psicologia trouxe óleo essencial
com kiwi. Aqui cada ramo diz o assunto que pontua (clima e cena certos) e o que é proibido. Ramo com curadoria usa estes
termos no lugar dos termos genéricos de banco_imagens.TERMOS_POR_NICHO.
"""
import re
from typing import Any, Dict, List

# assuntos que não servem para site de ninguém
RUINS_GERAIS = {
    "shoes", "sneakers", "converse", "mockup", "mockups", "coronavirus", "covid-19", "corona", "facemask", "disease",
    "wheelchair", "handicap", "disability", "bikini", "nude", "alcohol", "cigarette", "gun", "weapon",
}

CURADORIA: List[Dict[str, Any]] = [
    {   # psicologia: ambiente calmo, luz natural, plantas, conversa, caderno e chá. Nada de cosmético, spa, fruta ou academia.
        "chaves": ("psicolog", "psicanal", "psiquiat", "terapia", "terapeut", "neuropsic", "fonoaud", "saude mental", "constelac"),
        "prioritaria": True,   # a especialidade vence a palavra genérica ("Consultório de nutrição" é nutrição, não médico)
        "termos": ["psychologist office", "therapy session", "cozy room", "house plant", "tea cup", "journal desk", "meditation", "plants indoor", "reading journal", "indoor garden"],
        "bons": {"calm", "peaceful", "serene", "cozy", "comfortable", "harmony", "plant", "plants", "indoor", "indoors", "interior", "home",
                 "minimal", "tea", "journal", "diary", "notebook", "nature", "relax", "light", "book", "reading", "couch", "chair",
                 "meditation", "meditate", "conversation", "support", "window", "greenery", "botanical", "therapist", "therapy", "counseling",
                 "psychologist", "psychology", "session", "talking", "listening", "sofa", "armchair", "comfort", "empathy", "office"},
        "ruins": {"cosmetic", "cosmetics", "cosmeticoil", "essentialoil", "aromatherapy", "skin", "skincare", "beauty", "bodybuilding",
                  "fitness", "fashion", "food", "fruit", "kiwi", "bottle", "glassbottle", "spa", "massage", "bath", "bathtub", "soap"},
        "exigir": True,
    },
    {   # odontologia: cadeira, consultório, dentes. Sorriso de modelo sem relação com dente não entra.
        "chaves": ("dentista", "dentist", "odontolog", "odonto", "ortodont", "implante"),
        "prioritaria": True,   # a especialidade vence a palavra genérica ("Consultório de nutrição" é nutrição, não médico)
        "termos": ["dentist", "dental clinic", "dental chair", "teeth"],
        "bons": {"dentist", "dental", "teeth", "tooth", "orthodontist", "clinic", "dentistry", "toothbrush", "braces"},
        "ruins": {"fashion", "dress", "blonde", "hip", "longhair"},
        "exigir": True,
    },
    {   # estética e spa: pele, tratamento, calma
        "chaves": ("estetica", "harmoniza", "spa", "depila", "massagem"),
        "prioritaria": True,   # a especialidade vence a palavra genérica ("Consultório de nutrição" é nutrição, não médico)
        "termos": ["spa", "skin care", "facial", "massage", "beauty treatment"],
        "bons": {"spa", "skin", "skincare", "facial", "massage", "beauty", "relax", "harmony", "care", "cosmetology", "wellness", "calm"},
        "ruins": {"food", "fitness", "bodybuilding", "dog", "cat"},
    },
    {   # nutrição: comida de verdade (frutas, legumes, refeição equilibrada). Nada de médico, consultório, remédio ou fast food:
        # uma nutricionista que recebe foto de "médico atendendo" some do próprio site.
        "chaves": ("nutricion", "nutricao", "nutri", "dietista", "reeducacao alimentar"),
        "prioritaria": True,   # a especialidade vence a palavra genérica ("Consultório de nutrição" é nutrição, não médico)
        "termos": ["healthy food", "fresh vegetables", "fruit bowl", "healthy meal", "salad bowl", "meal prep", "healthy breakfast", "nutritionist"],
        "bons": {"healthy", "food", "fruit", "fruits", "vegetable", "vegetables", "salad", "meal", "nutrition", "nutritionist", "diet", "fresh",
                 "organic", "bowl", "breakfast", "lunch", "kitchen", "cooking", "avocado", "berries", "apple", "plate", "greens", "wellness",
                 "balanced", "vegan", "smoothie", "oats", "seeds"},
        "ruins": {"doctor", "doctors", "physician", "stethoscope", "hospital", "surgery", "surgeon", "nurse", "patient", "syringe", "syringes",
                  "injection", "pills", "pill", "tablet", "tablets", "capsule", "capsules", "medication", "medicine", "drug", "drugs", "pharmacy",
                  "burger", "pizza", "fries", "fastfood", "junkfood", "candy", "soda", "donut", "doughnut", "cake", "alcohol", "beer", "wine",
                  "cigarette", "bodybuilding", "dumbbell", "gym"},
        "exigir": True,
    },
    {   # fisioterapia e reabilitação: movimento, alongamento, tratamento manual. Não é consultório médico.
        "chaves": ("fisioterap", "reabilit", "quiropr", "osteopat"),
        "prioritaria": True,   # a especialidade vence a palavra genérica ("Consultório de nutrição" é nutrição, não médico)
        "termos": ["physical therapy", "physiotherapy", "rehabilitation exercise", "stretching therapy", "back pain therapy", "physiotherapist treatment"],
        "bons": {"physiotherapy", "physiotherapist", "physical", "therapy", "therapist", "rehabilitation", "rehab", "exercise", "exercises", "stretching",
                 "massage", "back", "knee", "shoulder", "spine", "muscle", "recovery", "treatment", "physio", "mobility", "posture", "pilates"},
        "ruins": {"doctor", "doctors", "stethoscope", "hospital", "surgery", "surgeon", "syringe", "syringes", "injection", "pills", "pill",
                  "medication", "medicine", "drug", "drugs", "pharmacy", "veterinary", "dog", "cat", "cosmetic", "cosmetics", "bodybuilding"},
        "exigir": True,
    },
    {   # clínica e saúde: consultório, atendimento, profissional
        "chaves": ("clinica", "medic", "consultorio", "saude", "gastro", "ginecolog", "urolog", "endocrin", "neurolog",
                   "otorrino", "reumat", "pneumo", "oncolog", "proctolog", "hematolog", "nefrolog", "angiolog", "alergist", "imunolog",
                   "infectolog", "mastolog", "geriatr", "obstetr", "anestesi", "cirurg",
                   "doutor", "doutora", "ambulatorio", "posto de saude", "check up", "diagnost", "ultrassom"),
        "termos": ["doctor consultation", "doctor patient", "medical clinic", "stethoscope doctor"],
        "bons": {"clinic", "clinical", "doctor", "doctors", "physician", "patient", "consult", "consultation", "healthcare", "medical", "stethoscope",
                 "checkup", "reception", "nurse", "office", "appointment", "examination", "gynecologist", "cardiologist", "specialist"},
        # embalagem de remedio, seringa e bicho nao dizem "consulta": foi o que apareceu na capa de uma clinica de gastro
        "ruins": {"hospital", "surgery", "blood", "syringe", "syringes", "injection", "elderly", "pills", "pill", "tablet", "tablets", "capsule",
                  "capsules", "medication", "medicine", "drug", "drugs", "pharmacy", "veterinary", "veterinarian", "vet", "dog", "cat", "animal",
                  "pet", "ointment", "ampoule", "vial", "bottle", "cosmetic", "cosmetics"},
        "exigir": True,
    },
]


def _palavras(f: Dict[str, Any]) -> set:
    texto = f"{f.get('titulo', '')} {' '.join(f.get('tags') or [])}".lower()
    return set(re.findall(r"[a-z0-9\-]+", texto))


def pontuar(f: Dict[str, Any], bons: set, ruins: set) -> int:
    """Quanto a foto combina com o ramo. Negativo = proibida (assunto errado)."""
    palavras = _palavras(f)
    if palavras & ruins:
        return -1
    pontos = 3 * len(palavras & bons) + 3 * len(set(re.findall(r"[a-z0-9\-]+", (f.get("titulo") or "").lower())) & bons)  # o título vale em dobro
    if (f.get("largura") or 0) >= 3000:  # imagem grande e larga serve para capa
        pontos += 1
    return pontos


def escolher(fotos: List[Dict[str, Any]], bons: set, ruins: set, quantidade: int, exigir: bool = False) -> List[Dict[str, Any]]:
    """Tira as proibidas, ordena pelo que combina e não deixa a mesma foto (mesmo título) repetir mais de duas vezes.

    `exigir`: só entra foto que tenha pelo menos uma palavra do assunto do ramo (se sobrarem poucas, completa com as neutras).
    """
    pontuadas = [(pontuar(f, bons, ruins), i, f) for i, f in enumerate(fotos)]
    validas = sorted((t for t in pontuadas if t[0] >= 0), key=lambda t: (-t[0], t[1]))
    if exigir:
        # do mais exigente para o menos: duas palavras do assunto, uma, e só então o que sobrou
        for minimo in (6, 3):
            do_assunto = [t for t in validas if t[0] >= minimo]
            if len(do_assunto) >= 4:
                validas = do_assunto
                break
    saida: List[Dict[str, Any]] = []
    por_titulo: Dict[str, int] = {}
    for _, _, f in validas:
        chave = (f.get("titulo") or f["url"]).strip().lower()
        if por_titulo.get(chave, 0) >= 2:
            continue
        por_titulo[chave] = por_titulo.get(chave, 0) + 1
        saida.append(f)
        if len(saida) >= quantidade:
            break
    return saida
