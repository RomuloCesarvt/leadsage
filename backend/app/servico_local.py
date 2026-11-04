"""Visitas e retornos do modo empresa (serviço local, ex.: ar-condicionado).

Uma visita agendada vira serviço realizado; serviço de manutenção periódica volta a ser oferta depois de N meses ("já faz 6 meses da
última limpeza, quer agendar?"). Os retornos aparecem numa lista com a mensagem pronta: quem manda é a pessoa, com um clique, e nunca o
sistema sozinho (cliente que já comprou não pode ser tratado como disparo em massa).

Guardado na tabela de robô (DBRobo, tipo "visita"): mesmo banco, mesmo isolamento por usuário.
"""
import re
import uuid
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from app import robo_store

TIPO = "visita"
STATUS = ("agendada", "realizada", "cancelada")
MESES_PADRAO = 6


def _texto(v: Any, n: int) -> str:
    return str(v or "").strip()[:n]


def _data(v: Any) -> str:
    """Só aceita AAAA-MM-DD válido; senão vazio."""
    t = str(v or "").strip()[:10]
    try:
        datetime.strptime(t, "%Y-%m-%d")
        return t
    except ValueError:
        return ""


def _hora(v: Any) -> str:
    m = re.match(r"^(\d{1,2}):(\d{2})", str(v or "").strip())
    return f"{int(m.group(1)):02d}:{m.group(2)}" if m and int(m.group(1)) < 24 and int(m.group(2)) < 60 else ""


def mais_meses(d: str, meses: int) -> str:
    """A data `meses` meses depois (dia limitado ao fim do mês)."""
    ano, mes, dia = (int(x) for x in d.split("-"))
    total = ano * 12 + (mes - 1) + meses
    ano, mes = divmod(total, 12)
    mes += 1
    ultimo = (date(ano + (mes == 12), (mes % 12) + 1, 1) - timedelta(days=1)).day
    return date(ano, mes, min(dia, ultimo)).isoformat()


def normalizar(d: Any, anterior: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Aceita o que a tela mandar e devolve só campos conhecidos, no tamanho certo; funde com o registro anterior."""
    d = d if isinstance(d, dict) else {}
    a = anterior or {}
    pega = lambda k, n: _texto(d[k], n) if k in d else a.get(k, "")  # noqa: E731
    status = d.get("status") if d.get("status") in STATUS else a.get("status", "agendada")
    try:
        meses = max(0, min(36, int(float(d["retorno_meses"])))) if "retorno_meses" in d else int(a.get("retorno_meses", MESES_PADRAO))
    except (TypeError, ValueError):
        meses = MESES_PADRAO
    out = {
        "id": a.get("id") or _texto(d.get("id"), 40) or uuid.uuid4().hex[:12],
        "cliente": pega("cliente", 80), "telefone": re.sub(r"\D", "", pega("telefone", 30)),
        "servico": pega("servico", 160), "aparelhos": pega("aparelhos", 240), "endereco": pega("endereco", 200),
        "data": _data(d["data"]) if "data" in d else a.get("data", ""), "hora": _hora(d["hora"]) if "hora" in d else a.get("hora", ""),
        "observacoes": pega("observacoes", 400), "conversa_id": pega("conversa_id", 120),
        "status": status, "retorno_meses": meses,
        "realizada_em": a.get("realizada_em", ""), "retorno_em": a.get("retorno_em", ""), "retorno_avisado": bool(a.get("retorno_avisado")),
    }
    # serviço feito: o retorno periódico passa a valer (a partir do dia em que foi feito)
    if status == "realizada" and a.get("status") != "realizada":
        base = out["data"] or date.today().isoformat()
        out["realizada_em"] = base
        out["retorno_em"] = mais_meses(base, meses) if meses else ""
        out["retorno_avisado"] = False
    if status != "realizada":
        out["retorno_em"] = "" if status == "cancelada" else out["retorno_em"]
    return out


async def listar(uid: str) -> List[Dict[str, Any]]:
    itens = [v for v in await robo_store._sql_listar(uid, TIPO) if isinstance(v, dict) and v.get("id")]
    return sorted(itens, key=lambda v: (v.get("data") or "9999", v.get("hora") or ""))


async def salvar(uid: str, dados: Dict[str, Any], vid: str = "") -> Dict[str, Any]:
    anterior = None
    if vid:
        anterior = next((v for v in await listar(uid) if v.get("id") == vid), None)
        if anterior is None:
            raise KeyError(vid)
    v = normalizar(dados, anterior)
    if not v["cliente"] and not v["telefone"]:
        raise ValueError("informe o nome ou o telefone do cliente")
    await robo_store._sql_put(f"visita:{uid}:{v['id']}", uid, TIPO, v)
    return v


async def apagar(uid: str, vid: str) -> None:
    await robo_store._sql_apagar(f"visita:{uid}:{vid}")


def retornos_do_dia(visitas: List[Dict[str, Any]], hoje: Optional[str] = None, antecedencia_dias: int = 7) -> List[Dict[str, Any]]:
    """Serviços já realizados cujo retorno vence até daqui a `antecedencia_dias` e que ainda não foram avisados."""
    ate = (date.fromisoformat(hoje) if hoje else date.today()) + timedelta(days=antecedencia_dias)
    return [v for v in visitas if v.get("status") == "realizada" and v.get("retorno_em") and not v.get("retorno_avisado")
            and v["retorno_em"] <= ate.isoformat()]


def mensagem_de_retorno(v: Dict[str, Any], empresa: str = "") -> str:
    """O convite de retorno, só com fatos que a pessoa cadastrou (serviço e data); sem preço nem promessa."""
    primeiro = (v.get("cliente") or "").strip().split(" ")[0]
    feito = (v.get("servico") or "o serviço").strip().rstrip(".")
    quando = ""
    if v.get("realizada_em"):
        try:
            quando = f" em {datetime.strptime(v['realizada_em'], '%Y-%m-%d').strftime('%d/%m/%Y')}"
        except ValueError:
            pass
    quem = f" da {empresa}" if empresa else ""
    return (f"Oi{', ' + primeiro if primeiro else ''}! Aqui é{quem}. Fizemos {feito}{quando} e já está chegando a hora da manutenção de rotina "
            "para o aparelho continuar gelando bem e gastando menos. Quer que eu veja um horário para você? 🙂")
