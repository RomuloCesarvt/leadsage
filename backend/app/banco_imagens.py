"""Banco de imagens para os sites gerados.

Site sem foto parece rascunho — e era o principal motivo de os sites
parecerem todos iguais: quem nao tinha foto do cliente recebia um
gradiente. Aqui o site nasce com fotos profissionais do ramo.

Duas fontes, na ordem:

- **Pexels**, quando ha PEXELS_API_KEY (gratuita, cadastro na hora):
  alta resolucao e busca boa. Licenca livre para uso comercial.
- **Openverse/StockSnap**, sem chave nenhuma: fotos profissionais em
  CC0 (uso comercial, sem exigir credito), mas no maximo 960 px de
  largura — bom para galeria, aceitavel para capa com sobreposicao.

Fica de fora o resto do Openverse de proposito: a maior parte e foto
documental da Wikimedia (rua de Hong Kong para "padaria"), que nao vende.
"""
import re
import time
import unicodedata
from typing import Any, Dict, List, Tuple

import httpx

from app.config import settings

# Buscas em ingles rendem muito mais nos dois bancos. Cada nicho tem
# termos testados: "advogado" puro trazia pintura do seculo XVII.
TERMOS_POR_NICHO: List[Tuple[Tuple[str, ...], List[str]]] = [
    (("padaria", "panificadora", "confeitaria"), ["bakery", "bread", "pastry", "croissant"]),
    (("cafeteria", "cafe"), ["coffee shop", "coffee", "latte art", "cafe interior"]),
    (("restaurante", "bistro", "lanchonete"), ["restaurant", "restaurant food", "chef cooking", "dinner table"]),
    (("pizzaria",), ["pizza", "pizza oven", "italian food"]),
    (("hamburgueria", "burger"), ["burger", "fries", "restaurant food"]),
    (("dentista", "odonto", "ortodont"), ["dentist", "dental clinic", "smile"]),
    (("clinica", "medic", "consultorio", "saude"), ["clinic doctor", "doctor", "medical", "healthcare"]),
    (("fisioterap",), ["physiotherapy", "massage therapy", "rehabilitation"]),
    (("nutricion",), ["healthy food", "nutrition", "salad"]),
    (("psicolog", "terapia"), ["therapy office", "calm interior", "conversation"]),
    (("estetica", "harmoniza"), ["spa", "skin care", "beauty treatment"]),
    (("salao", "cabeleireir", "beleza"), ["beauty salon", "hair salon", "hairdresser"]),
    (("barbearia", "barber"), ["barber", "barbershop", "beard"]),
    (("manicure", "unha"), ["manicure", "nails", "beauty salon"]),
    (("academia", "crossfit", "fitness", "pilates", "studio de treino"), ["gym", "fitness", "workout", "training"]),
    (("advoca", "advogad", "juridic"), ["business meeting", "office desk", "contract signing", "handshake"]),
    (("contab", "contador"), ["accounting", "office desk", "business finance", "laptop work"]),
    (("imobili", "corretor"), ["house", "real estate", "modern home", "living room"]),
    (("arquitet", "decora", "interiores"), ["interior design", "architecture", "modern living room"]),
    (("mecanic", "oficina", "auto center", "funilaria"), ["car mechanic", "car repair", "garage", "car engine"]),
    (("pet", "veterinar", "banho e tosa"), ["dog", "cat", "puppy", "pet"]),
    (("escola", "curso", "educa"), ["classroom", "students", "study"]),
    (("farmacia", "drogaria"), ["pharmacy", "medicine", "healthcare"]),
    (("mercado", "supermercado", "hortifruti"), ["grocery", "vegetables", "market"]),
    (("floricultura", "flores"), ["flowers", "florist", "bouquet"]),
    (("fotograf",), ["photographer", "camera", "photo studio"]),
    (("marketing", "agencia", "publicidade"), ["creative team", "office", "laptop work"]),
    (("construt", "reforma", "engenharia"), ["construction", "architecture", "renovation"]),
    (("hotel", "pousada"), ["hotel room", "hotel", "travel"]),
    (("moda", "roupa", "boutique", "vestuario"), ["clothing store", "fashion", "boutique"]),
    (("tinta",), ["paint", "painting wall", "paint store"]),
    (("material de construc", "materiais de construc", "ferragem"), ["hardware store", "tools", "construction"]),
    (("otica", "oculos"), ["eyeglasses", "optician", "glasses"]),
    (("joalheria", "joias", "relojoaria"), ["jewelry", "watch", "rings"]),
    (("papelaria", "grafica"), ["stationery", "printing", "notebook"]),
    (("autoescola",), ["driving", "car", "road"]),
    (("lavanderia",), ["laundry", "washing machine", "clean clothes"]),
    (("buffet", "evento", "festa"), ["event", "party", "catering"]),
    (("sorveteria", "acai"), ["ice cream", "dessert", "smoothie bowl"]),
    (("doceria", "brigadeiro", "bolo"), ["cake", "dessert", "pastry"]),
    (("acougue",), ["butcher", "meat", "steak"]),
    (("tatuag", "tattoo"), ["tattoo", "tattoo artist"]),
]
TERMOS_GENERICOS = ["small business", "shop", "store front", "team work"]

VALIDADE = 6 * 3600
_cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}


def _sem_acento(t: str) -> str:
    return unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()


def termos_para(nicho: str) -> List[str]:
    n = _sem_acento(nicho)
    for chaves, termos in TERMOS_POR_NICHO:
        if any(c in n for c in chaves):
            return termos
    # nicho desconhecido: tenta o proprio texto, depois o generico
    limpo = re.sub(r"[^a-z ]", " ", n).strip()
    return ([limpo] if limpo else []) + TERMOS_GENERICOS


async def _pexels(termo: str, quantidade: int) -> List[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.get(
            "https://api.pexels.com/v1/search",
            params={"query": termo, "per_page": quantidade, "orientation": "landscape"},
            headers={"Authorization": settings.PEXELS_API_KEY},
        )
    if r.status_code != 200:
        return []
    saida = []
    for f in r.json().get("photos") or []:
        src = f.get("src") or {}
        saida.append({
            "url": src.get("large2x") or src.get("original", ""),
            "miniatura": src.get("medium", ""),
            "largura": f.get("width"), "altura": f.get("height"),
            "autor": f.get("photographer", ""), "fonte": "Pexels",
            "pagina": f.get("url", ""),
        })
    return saida


async def _openverse(termo: str, quantidade: int) -> List[Dict[str, Any]]:
    async with httpx.AsyncClient(timeout=15.0) as c:
        r = await c.get(
            "https://api.openverse.org/v1/images/",
            params={"q": termo, "license_type": "commercial", "source": "stocksnap",
                    "page_size": quantidade, "aspect_ratio": "wide"},
            headers={"User-Agent": "LeadSage/1.0 (sites para pequenos negocios)"},
        )
    if r.status_code != 200:
        return []
    saida = []
    for f in r.json().get("results") or []:
        url = f.get("url", "")
        if not url.startswith("https://"):
            continue
        saida.append({
            "url": url, "miniatura": url,
            "largura": f.get("width"), "altura": f.get("height"),
            "autor": f.get("creator", ""), "fonte": "StockSnap",
            "pagina": f.get("foreign_landing_url", ""),
        })
    return saida


async def buscar(nicho: str = "", termo: str = "", quantidade: int = 18) -> Dict[str, Any]:
    """Fotos para o nicho (ou para um termo digitado). Nunca levanta erro:
    sem foto, o site cai no fundo desenhado em CSS, como antes."""
    termos = [termo] if termo else termos_para(nicho)
    chave = f"{settings.PEXELS_API_KEY[:4]}|{'|'.join(termos)}|{quantidade}"
    guardado = _cache.get(chave)
    if guardado and time.time() - guardado[0] < VALIDADE:
        return {"imagens": guardado[1], "fonte": guardado[1][0]["fonte"] if guardado[1] else ""}

    fotos: List[Dict[str, Any]] = []
    vistos = set()
    por_termo = max(4, quantidade // max(1, len(termos)) + 2)
    for t in termos:
        try:
            lote = await (_pexels(t, por_termo) if settings.PEXELS_API_KEY else _openverse(t, por_termo))
        except Exception:
            lote = []
        for f in lote:
            if f["url"] and f["url"] not in vistos:
                vistos.add(f["url"])
                fotos.append(f)
        if len(fotos) >= quantidade:
            break

    fotos = fotos[:quantidade]
    _cache[chave] = (time.time(), fotos)
    return {"imagens": fotos, "fonte": fotos[0]["fonte"] if fotos else ""}
