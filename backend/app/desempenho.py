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


_UF = re.compile(r"(?:[-,/]|\s)\s*([A-Za-z]{2})\s*$")
UFS = {"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"}


def estado_do_lead(lead: Dict[str, Any]) -> str:
    """A sigla do estado ("SP") a partir de "Botucatu - SP"; vazio quando o lead nao traz."""
    m = _UF.search(str(lead.get("location") or "").strip())
    uf = m.group(1).upper() if m else ""
    return uf if uf in UFS else ""


def _pediu_link(conversa: Dict[str, Any]) -> bool:
    from app.ai_robo import pediu_o_link
    return any(m.get("de") == "contato" and pediu_o_link(m.get("texto", "")) for m in conversa.get("mensagens") or [])


def _respondeu(conversa: Dict[str, Any]) -> bool:
    if conversa.get("contato_robo") and conversa.get("classificado"):
        return False                      # outro robô / propaganda do outro lado não é resposta de interessado
    return any(m.get("de") == "contato" for m in conversa.get("mensagens") or [])


_CAMPOS = ("leads", "abordados", "responderam", "interessados", "pediram_link", "fechados")


def _linha(base: Dict[str, Any]) -> Dict[str, Any]:
    ab = base["abordados"]
    return {**base,
            "taxa_resposta": round(100 * base["responderam"] / ab) if ab else 0,
            "taxa_interesse": round(100 * base["interessados"] / ab) if ab else 0}


def calcular(itens: List[Dict[str, Any]], conversas: List[Dict[str, Any]]) -> Dict[str, Any]:
    """`itens`: pipeline (cada um com lead.niche/city/location e etapa). `conversas`: conversas COMPLETAS (com as mensagens).

    Devolve os segmentos, os destaques e `linhas`: o mesmo desempenho no nivel segmento x cidade x estado, para a tela
    comparar o mesmo segmento entre cidades e estados."""
    por_lead = {c.get("lead_id"): c for c in conversas if c.get("lead_id")}
    nomes: Dict[Any, Counter] = defaultdict(Counter)
    cidades: Dict[Any, Counter] = defaultdict(Counter)
    acc: Dict[Any, Dict[str, int]] = defaultdict(lambda: {k: 0 for k in _CAMPOS})

    for it in itens:
        if it.get("origem") == "busca":
            continue                      # sobra de busca: o lead nunca foi escolhido
        lead = it.get("lead") or {}
        rotulo = (lead.get("niche") or "").strip() or "Sem ramo"
        cidade = (lead.get("city") or "").strip()
        uf = estado_do_lead(lead)
        chave = (chave_do_segmento(rotulo), chave_do_segmento(cidade) if cidade else "", uf)
        nomes[chave[0]][rotulo] += 1
        if cidade:
            cidades[chave[1]][cidade] += 1
        s = acc[chave]
        conv = por_lead.get(it.get("id"))
        etapa = it.get("etapa") or "Novo Lead"
        s["leads"] += 1
        abordado = etapa != "Novo Lead" or bool(conv and any(m.get("de") in ("robo", "voce") for m in conv.get("mensagens") or []))
        if abordado:
            s["abordados"] += 1
        if bool(conv and _respondeu(conv)) or etapa in ("Respondeu",) + ETAPAS_DE_INTERESSE:
            s["responderam"] += 1
        quente = bool(conv and (conv.get("sdr") or {}).get("temperatura") == "quente")
        if etapa in ETAPAS_DE_INTERESSE or quente:
            s["interessados"] += 1
        if conv and _pediu_link(conv):
            s["pediram_link"] += 1
        if etapa == "Fechado":
            s["fechados"] += 1

    linhas = [
        _linha({"segmento": nomes[seg].most_common(1)[0][0], "cidade": cidades[cid].most_common(1)[0][0] if cid else "", "estado": uf, **s})
        for (seg, cid, uf), s in acc.items()
    ]

    por_segmento: Dict[str, Dict[str, Any]] = {}
    for r in linhas:
        t = por_segmento.setdefault(r["segmento"], {"segmento": r["segmento"], **{k: 0 for k in _CAMPOS}})
        for k in _CAMPOS:
            t[k] += r[k]
    segmentos = [_linha(t) for t in por_segmento.values()]
    # a ordem geral: quem tem mais gente pedindo o link, depois interessada, depois respondendo
    segmentos.sort(key=lambda r: (-r["pediram_link"], -r["interessados"], -r["responderam"], -r["abordados"], r["segmento"]))
    linhas.sort(key=lambda r: (-r["pediram_link"], -r["interessados"], -r["responderam"], -r["abordados"], r["segmento"], r["cidade"]))

    def melhor(campo: str, minimo: int = 1, taxa: bool = False) -> Optional[Dict[str, Any]]:
        candidatos = [r for r in segmentos if r[campo] >= minimo and (not taxa or r["abordados"] >= MINIMO_PARA_TAXA)]
        if not candidatos:
            return None
        r = max(candidatos, key=lambda x: (x[campo], x["abordados"]))
        return {"segmento": r["segmento"], "valor": r[campo], "abordados": r["abordados"]}

    return {
        "segmentos": segmentos[:12],
        "linhas": linhas[:400],
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
