"""Reuniões marcadas: quando são e os avisos de 1 hora e de 10 minutos antes.

O robô guarda a reunião como texto ("quarta-feira 12h30"); o dono pode marcar pelo card do pipeline (data e hora exatas). Aqui o texto vira um
instante de verdade (`reuniao_em`, em UTC) e, dele, saem os avisos. O fuso é o de Brasília (sem horário de verão desde 2019).
"""
import re
import unicodedata
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

BRASILIA = timezone(timedelta(hours=-3))
ANTECEDENCIAS_MIN = (60, 10)            # avisos: 1 hora e 10 minutos antes
_DIAS = {"segunda": 0, "terca": 1, "quarta": 2, "quinta": 3, "sexta": 4, "sabado": 5, "domingo": 6}


def _normal(texto: str) -> str:
    return unicodedata.normalize("NFKD", str(texto or "").lower()).encode("ascii", "ignore").decode()


def interpretar(texto: str, base: Optional[datetime] = None) -> Optional[datetime]:
    """"quarta-feira 12h30", "amanhã às 14h", "sexta 10:00", "15/11 às 9h" -> o instante (UTC). Sem dia ou sem hora: None."""
    t = _normal(texto)
    if not t.strip():
        return None
    agora = (base or datetime.now(timezone.utc)).astimezone(BRASILIA)
    hora = minuto = None
    m = re.search(r"\b(\d{1,2})\s*(?:h|:)\s*(\d{2})?\b", t) or re.search(r"\bas\s+(\d{1,2})\b", t)
    if m:
        hora, minuto = int(m.group(1)), int(m.group(2) or 0) if m.lastindex and m.lastindex >= 2 else 0
    if hora is None or not (0 <= hora <= 23) or not (0 <= minuto <= 59):
        return None
    dia = None
    d = re.search(r"\b(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\b", t)
    if d:
        ano = int(d.group(3)) + (2000 if d.group(3) and len(d.group(3)) == 2 else 0) if d.group(3) else agora.year
        try:
            dia = datetime(ano, int(d.group(2)), int(d.group(1)), tzinfo=BRASILIA)
        except ValueError:
            return None
        if not d.group(3) and dia.date() < agora.date():
            dia = dia.replace(year=agora.year + 1)
    elif "depois de amanha" in t:
        dia = (agora + timedelta(days=2))
    elif "amanha" in t:
        dia = (agora + timedelta(days=1))
    elif re.search(r"\bhoje\b", t):
        dia = agora
    else:
        for nome, n in _DIAS.items():
            if nome in t:
                falta = (n - agora.weekday()) % 7
                dia = agora + timedelta(days=falta)
                break
    if dia is None:
        return None
    alvo = dia.replace(hour=hora, minute=minuto, second=0, microsecond=0)
    # dia da semana de hoje com a hora já passada: é a semana que vem
    if alvo <= agora and not d and "hoje" not in t:
        alvo += timedelta(days=7)
    return alvo.astimezone(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds")


def _quando_texto(dt: datetime) -> str:
    local = dt.astimezone(BRASILIA)
    dias = ("segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo")
    return f"{dias[local.weekday()]}, {local.strftime('%d/%m')} às {local.strftime('%H:%M')}"


def avisos_da_reuniao(item: Dict[str, Any], agora: Optional[datetime] = None) -> List[Dict[str, Any]]:
    """Os avisos de 1 hora e de 10 minutos antes de uma reunião: cada um nasce na hora dele (`quando`) e vale até 20 minutos depois da reunião."""
    em = item.get("reuniao_em")
    if not em:
        return []
    try:
        reuniao = datetime.fromisoformat(str(em).replace("Z", "+00:00"))
    except ValueError:
        return []
    reuniao = reuniao if reuniao.tzinfo else reuniao.replace(tzinfo=timezone.utc)
    agora = agora or datetime.now(timezone.utc)
    if agora > reuniao + timedelta(minutes=20):
        return []
    lead = item.get("lead") or {}
    nome = (lead.get("company") or lead.get("name") or item.get("nome") or "o lead").strip()
    saida = []
    for minutos in ANTECEDENCIAS_MIN:
        nasce = reuniao - timedelta(minutes=minutos)
        if agora < nasce:
            continue
        faltam = "1 hora" if minutos == 60 else f"{minutos} minutos"
        saida.append({
            "id": f"reuniao:{item.get('id', '')}:{_iso(reuniao)}:{minutos}", "tipo": "reuniao", "quando": _iso(nasce),
            "titulo": f"Reunião com {nome} em {faltam}",
            "texto": f"{_quando_texto(reuniao).capitalize()}. Abra a conversa para se preparar e ter o link ou o endereço à mão.",
            "lead_id": str(item.get("id") or ""),
        })
    return saida


# ---------------------------------------------------------------- detectar a reunião combinada na própria conversa
_AFIRMA = re.compile(r"\b(pode( ser)?( sim)?|combinado|ok|certo|fechado|perfeito|otimo|sim|claro|beleza|ta bom|tudo certo|confirmado|esta (otimo|bom)|"
                     r"vou agendar|agendado|marcado|te espero|nos falamos|ate la|show|blz|top|bora|positivo|esta marcado|ja anotei|anotado)\b")
_CANCELA = re.compile(r"\b(remarc|reagend|cancel|nao consigo|nao posso|nao vou conseguir|adiar|mudar o horario|trocar o horario|outro horario|outro dia)\b")
_HORA = re.compile(r"\b\d{1,2}\s*(?:h|:)\s*\d{0,2}\b|\bas\s+\d{1,2}\b")


def _momento(m: Dict[str, Any]) -> Optional[datetime]:
    try:
        d = datetime.fromisoformat(str(m.get("em") or "").replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def detectar(mensagens: List[Dict[str, Any]], agora: Optional[datetime] = None) -> Optional[Dict[str, Any]]:
    """A reunião JÁ COMBINADA na conversa (por quem for: o robô, você ou o cliente): alguém propõe UM dia e hora e o outro lado confirma.

    Devolve {"em": instante UTC, "texto": o que foi dito} da última combinada que ainda vai acontecer, ou None. Mensagem com dois horários ("terça
    às 12h ou quarta às 12h30") é oferta, não combinado; cancelar ou pedir para remarcar depois desfaz."""
    agora = agora or datetime.now(timezone.utc)
    lado = lambda m: "cliente" if m.get("de") == "contato" else "equipe"
    candidatos = []
    for i, m in enumerate(mensagens):
        texto = str(m.get("texto") or "")
        base = _momento(m)
        if not texto.strip() or base is None:
            continue
        if len(_HORA.findall(_normal(texto))) != 1:                  # nenhum ou mais de um horário: não é um combinado
            continue
        dt = interpretar(texto, base)
        if dt:
            candidatos.append((i, lado(m), dt, texto.strip()))
    acordo = None
    for i, quem, dt, texto in candidatos:
        for m2 in mensagens[i + 1: i + 5]:
            n2 = _normal(m2.get("texto") or "")
            if lado(m2) != quem and (_AFIRMA.search(n2) or _mesmo_horario(m2, dt)):
                acordo = (i, dt, texto)
                break
    if not acordo:
        return None
    i, dt, texto = acordo
    for m in mensagens[i + 1:]:
        if _CANCELA.search(_normal(m.get("texto") or "")) and m.get("de") == "contato":
            return None                                              # o cliente pediu para mudar depois: espera o novo combinado
    if dt < agora - timedelta(minutes=30):
        return None                                                  # já passou
    return {"em": _iso(dt), "texto": texto[:80]}


def _mesmo_horario(m: Dict[str, Any], dt: datetime) -> bool:
    base = _momento(m)
    outro = interpretar(str(m.get("texto") or ""), base) if base else None
    return bool(outro and abs((outro - dt).total_seconds()) < 60)
