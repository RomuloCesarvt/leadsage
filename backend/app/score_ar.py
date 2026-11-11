"""O score do modo empresa (vende ar-condicionado): o quanto o lead tem chance de virar cliente de instalação ou manutenção.

Diferente da agência, aqui a falta de site ou de Instagram NÃO conta: quem compra ar-condicionado não é quem precisa de marketing.
Pesam, nesta ordem: dor de calor nas avaliações, tipo de negócio (quanto usa ar), dá para falar com a pessoa, movimento do local e horário.
Tudo determinístico, e cada ponto vem com o motivo escrito (o dono vê por que chamar aquele lead primeiro).
"""
import re
import unicodedata
from typing import Any, Dict, List, Tuple


def _n(t: str) -> str:
    return unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()


# Quem usa muito ar-condicionado: (palavras do tipo/nicho, pontos, rótulo)
SEGMENTOS: List[Tuple[Tuple[str, ...], int, str]] = [
    (("clinica", "consultorio", "dentista", "odonto", "medic", "hospital", "laboratorio", "fisioterap", "veterin", "doctor", "dentist", "health"), 18, "clínica/consultório"),
    (("hotel", "pousada", "lodging", "hostel", "motel"), 18, "hotel/pousada"),
    (("academia", "gym", "fitness", "pilates", "crossfit"), 17, "academia"),
    (("restaurante", "lanchonete", "padaria", "cafe", "bar ", "pizzaria", "restaurant", "bakery", "meal_takeaway"), 15, "restaurante/comércio de alimentos"),
    (("escritorio", "coworking", "imobiliaria", "contabil", "advoca", "agencia", "office", "accounting", "lawyer", "real_estate"), 15, "escritório"),
    (("escola", "faculdade", "creche", "curso", "school", "university"), 14, "escola/curso"),
    (("loja", "shopping", "mercado", "supermercado", "farmacia", "store", "pharmacy", "supermarket", "clothing"), 12, "loja/comércio"),
    (("salao", "barbearia", "estetica", "spa", "beauty", "hair"), 12, "salão/estética"),
    (("condominio", "predio", "apartamento", "residencial"), 12, "condomínio/residencial"),
    (("igreja", "church"), 8, "igreja"),
]

CALOR = ("calor", "abafad", "quente", "sem ar", "ar condicionado", "ar-condicionado", "arcondicionado", "climatiz", "ventilacao", "ventilad", "mormaco", "suor", "gela")
DOR = ("ar nao", "nao gela", "quebrad", "desligad", "estragad", "pifou", "nao funciona", "sem funcionar", "fraco", "pingando", "vazando", "barulh")


def _texto_das_avaliacoes(lead: Dict[str, Any]) -> List[str]:
    textos = [str(r.get("text") or "") for r in (lead.get("reviews_sample") or []) if isinstance(r, dict)]
    if lead.get("review_highlight"):
        textos.append(str(lead["review_highlight"]))
    return [t for t in textos if t.strip()]


def pontuar(lead: Dict[str, Any]) -> Tuple[int, List[str]]:
    """(score 1-99, motivos). `lead` é o dict do lead (como sai do `model_dump`)."""
    motivos: List[str] = []
    pontos = 20

    # 1) dor de calor nas avaliações: o sinal mais forte, e dá para abrir a conversa citando
    citam_calor = 0
    citam_defeito = 0
    for t in _texto_das_avaliacoes(lead):
        b = _n(t)
        tem_calor = any(p in b for p in CALOR)
        if tem_calor:
            citam_calor += 1
            if any(p in b for p in DOR):
                citam_defeito += 1
    if citam_defeito:
        pontos += 28
        motivos.append("clientes comentam ar/calor com defeito")
    elif citam_calor:
        pontos += 18
        motivos.append("clientes comentam calor ou ar-condicionado")

    # 2) tipo de negócio
    base = _n(" ".join([str(lead.get("niche") or ""), str(lead.get("role") or ""), str(lead.get("company") or ""), " ".join(lead.get("place_types") or [])]))
    for palavras, valor, rotulo in SEGMENTOS:
        if any(p in base for p in palavras):
            pontos += valor
            motivos.append(f"usa muito ar-condicionado ({rotulo})")
            break

    # 3) dá para falar com a pessoa
    if lead.get("whatsapp"):
        pontos += 14
        motivos.append("tem WhatsApp")
    elif lead.get("phone"):
        pontos += 8
        motivos.append("tem telefone")
    else:
        pontos -= 10
        motivos.append("sem telefone para contato")
    if lead.get("email"):
        pontos += 3

    # 4) movimento do local: mais gente, mais aparelhos e mais urgência
    n = int(lead.get("rating_count") or 0)
    if n >= 200:
        pontos += 10
        motivos.append("local movimentado")
    elif n >= 50:
        pontos += 6
        motivos.append("bom movimento")
    elif n >= 10:
        pontos += 3

    # 5) horário: funciona de dia (o calor é de dia) e dá para agendar fora do pico
    semana = lead.get("opening_hours_week") or []
    if semana:
        pontos += 2
    if str(lead.get("business_status") or "").upper() in ("CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"):
        pontos -= 30
        motivos.append("negócio fechado")

    return max(1, min(99, pontos)), motivos


def aplicar(leads: List[Any]) -> None:
    """Troca o score de agência pelo de ar-condicionado em leads recém-buscados (objetos LeadItem) e reordena no lugar."""
    for lead in leads:
        score, motivos = pontuar(lead.model_dump())
        lead.opportunityScore = score
        lead.missingDigitalAssets = []                      # lacuna digital é conceito de agência
        if motivos:
            lead.diagnosis = "Chance de fechar ar-condicionado: " + "; ".join(motivos) + "."
            lead.ai_summary = lead.diagnosis
    leads.sort(key=lambda l: ((l.contactability or 0) * 25 + (l.opportunityScore or 0)), reverse=True)
