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
        "termos": ["cozy room", "house plant", "tea cup", "journal desk", "meditation", "plants indoor", "reading journal", "indoor garden"],
        "bons": {"calm", "peaceful", "serene", "cozy", "comfortable", "harmony", "plant", "plants", "indoor", "indoors", "interior", "home",
                 "minimal", "tea", "journal", "diary", "notebook", "nature", "relax", "light", "book", "reading", "couch", "chair",
                 "meditation", "meditate", "conversation", "support", "window", "greenery", "botanical"},
        "ruins": {"cosmetic", "cosmetics", "cosmeticoil", "essentialoil", "aromatherapy", "skin", "skincare", "beauty", "bodybuilding",
                  "fitness", "fashion", "food", "fruit", "kiwi", "bottle", "glassbottle", "spa", "massage", "bath", "bathtub", "soap"},
        "exigir": True,
    },
    {   # odontologia: cadeira, consultório, dentes. Sorriso de modelo sem relação com dente não entra.
        "chaves": ("dentista", "dentist", "odontolog", "odonto", "ortodont", "implante"),
        "termos": ["dentist", "dental clinic", "dental chair", "teeth"],
        "bons": {"dentist", "dental", "teeth", "tooth", "orthodontist", "clinic", "dentistry", "toothbrush", "braces"},
        "ruins": {"fashion", "dress", "blonde", "hip", "longhair"},
        "exigir": True,
    },
    {   # estética e spa: pele, tratamento, calma
        "chaves": ("estetica", "harmoniza", "spa", "depila", "massagem"),
        "termos": ["spa", "skin care", "facial", "massage", "beauty treatment"],
        "bons": {"spa", "skin", "skincare", "facial", "massage", "beauty", "relax", "harmony", "care", "cosmetology", "wellness", "calm"},
        "ruins": {"food", "fitness", "bodybuilding", "dog", "cat"},
    },
    {   # clínica e saúde: consultório, atendimento, profissional
        "chaves": ("clinica", "medic", "consultorio", "saude", "nutricion", "fisioterap"),
        "termos": ["clinic doctor", "doctor patient", "medical", "healthcare"],
        "bons": {"clinic", "clinical", "doctor", "patient", "consult", "healthcare", "care", "medical", "health", "exam", "checkup"},
        "ruins": {"hospital", "surgery", "blood", "syringe", "injection", "elderly"},
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
