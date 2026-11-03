"""Desempenho por segmento: quais ramos respondem mais, mostram mais interesse e mais pedem o link da prévia.

Conta só o que o sistema já registra (pipeline e conversas); nada novo é guardado. Um segmento é o ramo da busca ("Padarias",
"Dentistas"); ramos escritos de jeitos parecidos ("Padaria", "padarias") entram juntos.
"""
import re
import unicodedata
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional

from app import pipeline_store

ETAPAS_DE_INTERESSE = ("Qualificado", "Reunião", "Proposta", "Fechado")
MINIMO_PARA_TAXA = 3          # com menos abordados que isto, a porcentagem engana: o segmento aparece mas não ganha destaque


def _sem_acento(t: str) -> str:
    return unicodedata.normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()


def chave_do_segmento(nome: str) -> str:
    """"Padarias", "padaria " e "Padaria e Confeitaria" ficam em chaves próximas; só plural e caixa são unificados."""
    base = re.sub(r"[^a-z0-9 ]+", " ", _sem_acento(nome)).strip()
    return " ".join(p[:-1] if len(p) > 4 and p.endswith("s") else p for p in base.split()) or "sem ramo"


def _pediu_link(conversa: Dict[str, Any]) -> bool:
    from app.ai_robo import pediu_o_link
    return any(m.get("de") == "contato" and pediu_o_link(m.get("texto", "")) for m in conversa.get("mensagens") or [])


def _respondeu(conversa: Dict[str, Any]) -> bool:
    if conversa.get("contato_robo") and conversa.get("classificado"):
        return False                      # outro robô / propaganda do outro lado não é resposta de interessado
    return any(m.get("de") == "contato" for m in conversa.get("mensagens") or [])


def calcular(itens: List[Dict[str, Any]], conversas: List[Dict[str, Any]]) -> Dict[str, Any]:
    """`itens`: pipeline (cada um com lead.niche e etapa). `conversas`: conversas COMPLETAS (com as mensagens)."""
    por_lead = {c.get("lead_id"): c for c in conversas if c.get("lead_id")}
    nomes: Dict[str, Counter] = defaultdict(Counter)
    seg: Dict[str, Dict[str, int]] = defaultdict(lambda: {"leads": 0, "abordados": 0, "responderam": 0, "interessados": 0, "pediram_link": 0, "fechados": 0})

    for it in itens:
        if it.get("origem") == "busca":
            continue                      # sobra de busca: o lead nunca foi escolhido
        lead = it.get("lead") or {}
        rotulo = (lead.get("niche") or "").strip() or "Sem ramo"
        chave = chave_do_segmento(rotulo)
        nomes[chave][rotulo] += 1
        s = seg[chave]
        conv = por_lead.get(it.get("id"))
        etapa = it.get("etapa") or "Novo Lead"
        s["leads"] += 1
        abordado = etapa != "Novo Lead" or bool(conv and any(m.get("de") in ("robo", "voce") for m in conv.get("mensagens") or []))
        if abordado:
            s["abordados"] += 1
        respondeu = bool(conv and _respondeu(conv)) or etapa in ("Respondeu",) + ETAPAS_DE_INTERESSE
        if respondeu:
            s["responderam"] += 1
        quente = bool(conv and (conv.get("sdr") or {}).get("temperatura") == "quente")
        if etapa in ETAPAS_DE_INTERESSE or quente:
            s["interessados"] += 1
        if conv and _pediu_link(conv):
            s["pediram_link"] += 1
        if etapa == "Fechado":
            s["fechados"] += 1

    linhas = []
    for chave, s in seg.items():
        nome = nomes[chave].most_common(1)[0][0]
        linhas.append({
            "segmento": nome, **s,
            "taxa_resposta": round(100 * s["responderam"] / s["abordados"]) if s["abordados"] else 0,
            "taxa_interesse": round(100 * s["interessados"] / s["abordados"]) if s["abordados"] else 0,
        })
    # a ordem geral: quem tem mais gente pedindo o link, depois interessada, depois respondendo
    linhas.sort(key=lambda r: (-r["pediram_link"], -r["interessados"], -r["responderam"], -r["abordados"], r["segmento"]))

    def melhor(campo: str, minimo: int = 1, taxa: bool = False) -> Optional[Dict[str, Any]]:
        candidatos = [r for r in linhas if r[campo] >= minimo and (not taxa or r["abordados"] >= MINIMO_PARA_TAXA)]
        if not candidatos:
            return None
        r = max(candidatos, key=lambda x: (x[campo], x["abordados"]))
        return {"segmento": r["segmento"], "valor": r[campo], "abordados": r["abordados"]}

    return {
        "segmentos": linhas[:12],
        "destaques": {
            "responde_mais": melhor("taxa_resposta", 1, True),
            "mais_interesse": melhor("interessados"),
            "mais_pedem_link": melhor("pediram_link"),
        },
        "minimo_para_taxa": MINIMO_PARA_TAXA,
    }


async def do_usuario(uid: str) -> Dict[str, Any]:
    from app import robo_store
    itens = await pipeline_store.listar(uid)
    conversas = await robo_store.listar_conversas(uid, com_mensagens=True)
    return calcular(itens, conversas)
