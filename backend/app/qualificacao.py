"""Qualificação do lead no pipeline e leitura do que está funcionando.

Duas coisas, as duas só com o que o sistema já registra (pipeline, conversas e fila de envio), sem IA e sem custo:

1. `etiqueta`: UMA tag colorida por lead que resume em que pé ele está (Quente, Perguntou valor, Esfriando...). A etapa do pipeline diz onde o card
   está no funil; a tag diz como ele está andando.
2. `analisar`: compara quem respondeu e quem não respondeu por horário de envio, dia da semana, forma de falar de valor, arte anexa e prévia, e devolve
   dicas do que ajustar. Só afirma algo com amostra mínima: com poucos envios, diz que ainda não dá para concluir.
"""
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

# tom -> o front pinta (neutro, azul, verde, ambar, roxo, vermelho, laranja, ceu, esmeralda)
TAGS: Dict[str, Dict[str, str]] = {
    "fechado": {"rotulo": "Fechado", "tom": "verde", "dica": "Negócio fechado."},
    "perdido": {"rotulo": "Perdido", "tom": "neutro", "dica": "Disse não ou saiu do fluxo."},
    "reuniao": {"rotulo": "Visita/reunião marcada", "tom": "esmeralda", "dica": "Há dia e horário combinados: confirme e compareça."},
    "precisa_voce": {"rotulo": "Precisa de você", "tom": "vermelho", "dica": "O robô passou a conversa para uma pessoa."},
    "quente": {"rotulo": "Quente", "tom": "laranja", "dica": "Mostrou interesse claro: responda rápido."},
    "preco": {"rotulo": "Perguntou valor", "tom": "ambar", "dica": "Quer saber o preço: é o melhor momento para falar de condição."},
    "objecao": {"rotulo": "Com objeção", "tom": "roxo", "dica": "Levantou uma dúvida ou resistência: vale reler a conversa."},
    "respondeu": {"rotulo": "Respondeu", "tom": "azul", "dica": "Respondeu, ainda sem sinal forte de compra."},
    "aguardando": {"rotulo": "Aguardando resposta", "tom": "ceu", "dica": "Recebeu a abordagem há pouco tempo."},
    "esfriando": {"rotulo": "Esfriando", "tom": "laranja", "dica": "Está há 3 dias ou mais sem responder: hora de um seguimento."},
    "novo": {"rotulo": "Sem abordagem", "tom": "neutro", "dica": "Ainda não recebeu mensagem."},
}

_PRECO = re.compile(r"\b(quanto|valor|valores|pre[çc]o|custa|custo|or[çc]amento|investimento|mensalidade)\b", re.I)
DIAS_ESFRIANDO = 3
MINIMO_PARA_CONCLUIR = 5          # envios por grupo para uma comparação valer
DIFERENCA_MINIMA = 10             # pontos percentuais de diferença entre o melhor e o pior grupo


def _data(v: Any) -> Optional[datetime]:
    if not v:
        return None
    try:
        d = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _respondeu(conv: Optional[Dict[str, Any]]) -> bool:
    if not conv:
        return False
    if conv.get("contato_robo") and conv.get("classificado"):
        return False                    # outro robô ou propaganda do outro lado não é resposta de interessado
    return int(conv.get("contatos") or 0) > 0 or any(m.get("de") == "contato" for m in conv.get("mensagens") or [])


def _abordado(item: Dict[str, Any], conv: Optional[Dict[str, Any]]) -> bool:
    if (item.get("etapa") or "Novo Lead") != "Novo Lead":
        return True
    return bool(conv and (conv.get("total") or conv.get("mensagens")))


def etiqueta(item: Dict[str, Any], conv: Optional[Dict[str, Any]], agora: Optional[datetime] = None) -> Dict[str, str]:
    """A tag do lead, da mais forte para a mais fraca. `conv` pode ser o resumo da conversa (sem as mensagens)."""
    agora = agora or datetime.now(timezone.utc)
    etapa = item.get("etapa") or "Novo Lead"
    sdr = (conv or {}).get("sdr") or {}
    if etapa == "Fechado":
        k = "fechado"
    elif etapa == "Perdido" or (conv or {}).get("optout"):
        k = "perdido"
    elif etapa == "Reunião" or sdr.get("reuniao"):
        k = "reuniao"
    elif conv and conv.get("precisa_humano") and _respondeu(conv):
        k = "precisa_voce"
    elif _respondeu(conv) and (sdr.get("temperatura") == "quente" or etapa in ("Qualificado", "Proposta")):
        k = "quente"
    elif _respondeu(conv) and any(m.get("de") == "contato" and _PRECO.search(m.get("texto") or "") for m in ([conv.get("ultima")] if conv.get("ultima") else []) + list(conv.get("mensagens") or [])):
        k = "preco"
    elif _respondeu(conv) and sdr.get("objecoes"):
        k = "objecao"
    elif _respondeu(conv) or etapa == "Respondeu":
        k = "respondeu"
    elif _abordado(item, conv):
        quando = _data((conv or {}).get("ultima", {}) and (conv["ultima"] or {}).get("em")) or _data(item.get("atualizado")) or agora
        k = "esfriando" if agora - quando >= timedelta(days=DIAS_ESFRIANDO) else "aguardando"
    else:
        k = "novo"
    return {"id": k, **TAGS[k]}


def resumo_das_tags(itens: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Quantos leads em cada tag (só as que existem), na ordem de importância."""
    cont: Dict[str, int] = defaultdict(int)
    for i in itens:
        if i.get("qualificacao"):
            cont[i["qualificacao"]["id"]] += 1
    return [{"id": k, **TAGS[k], "total": cont[k]} for k in TAGS if cont.get(k)]


# ------------------------------------------------------------------ o que está funcionando

def _faixa_do_horario(h: int) -> str:
    if 6 <= h < 12:
        return "de manhã (6h às 12h)"
    if 12 <= h < 18:
        return "à tarde (12h às 18h)"
    if 18 <= h < 22:
        return "à noite (18h às 22h)"
    return "de madrugada ou muito cedo"


_DIAS = ("segunda", "terça", "quarta", "quinta", "sexta", "sábado", "domingo")


def _taxa(g: Dict[str, int]) -> int:
    return round(100 * g["resp"] / g["env"]) if g["env"] else 0


def _grupo() -> Dict[str, int]:
    return {"env": 0, "resp": 0}


def analisar(itens_fila: List[Dict[str, Any]], conversas: List[Dict[str, Any]], itens_pipeline: Optional[List[Dict[str, Any]]] = None,
             agora: Optional[datetime] = None) -> Dict[str, Any]:
    """`itens_fila`: a fila de envio (enviado_em, lead_id, momento, card_enviado, previa). `conversas`: as conversas (com ou sem mensagens)."""
    agora = agora or datetime.now(timezone.utc)
    por_lead = {c.get("lead_id"): c for c in conversas if c.get("lead_id")}
    dims: Dict[str, Dict[str, Dict[str, int]]] = {"horario": defaultdict(_grupo), "dia": defaultdict(_grupo), "valor": defaultdict(_grupo),
                                                  "arte": defaultdict(_grupo), "previa": defaultdict(_grupo)}
    total = _grupo()
    vistos = set()
    for it in itens_fila:
        if it.get("status") != "enviado" or it.get("tipo") == "seguimento" or not it.get("lead_id") or it["lead_id"] in vistos:
            continue
        vistos.add(it["lead_id"])
        enviado = _data(it.get("enviado_em"))
        conv = por_lead.get(it["lead_id"])
        resp = _respondeu(conv)
        grupos = []
        if enviado:
            br = enviado - timedelta(hours=3)
            grupos.append(("horario", _faixa_do_horario(br.hour)))
            grupos.append(("dia", "fim de semana" if br.weekday() >= 5 else "dia útil"))
        mom = (it.get("momento") or ((conv or {}).get("sdr") or {}).get("momento_valor") or "")
        if mom:
            from app import valor_momento
            nome_mom = (valor_momento.MOMENTOS.get(str(mom)) or valor_momento.MOMENTOS_EMPRESA.get(str(mom)) or {}).get("nome") or str(mom)
            grupos.append(("valor", nome_mom[0].lower() + nome_mom[1:]))
        grupos.append(("arte", "com a arte da promoção" if it.get("card_enviado") else "sem arte"))
        if it.get("previa") in ("criada", "oferecer") or it.get("previa_url"):
            grupos.append(("previa", "com prévia"))
        total["env"] += 1
        total["resp"] += int(resp)
        for dim, nome in grupos:
            dims[dim][nome]["env"] += 1
            dims[dim][nome]["resp"] += int(resp)

    def linhas(dim: str) -> List[Dict[str, Any]]:
        return sorted(({"nome": n, "enviadas": g["env"], "responderam": g["resp"], "taxa": _taxa(g)} for n, g in dims[dim].items()),
                      key=lambda r: (-r["taxa"], -r["enviadas"]))

    dicas: List[Dict[str, str]] = []
    geral = _taxa(total)

    def comparar(dim: str, titulo: str, frase: str) -> None:
        ok = [r for r in linhas(dim) if r["enviadas"] >= MINIMO_PARA_CONCLUIR]
        if len(ok) < 2:
            return
        melhor, pior = ok[0], ok[-1]
        if melhor["taxa"] - pior["taxa"] >= DIFERENCA_MINIMA:
            dicas.append({"tipo": "dica", "titulo": titulo, "texto": frase.format(m=melhor["nome"], mt=melhor["taxa"], p=pior["nome"], pt=pior["taxa"])})

    comparar("horario", "Melhor horário para abordar", "Os leads respondem mais quando a mensagem chega {m} ({mt}% respondem, contra {pt}% {p}). Tente concentrar os envios nessa faixa.")
    comparar("dia", "Melhor dia", "Chega mais resposta em {m} ({mt}% contra {pt}% em {p}). Priorize esse período nos envios.")
    comparar("valor", "Quando falar de valor", "Funciona melhor falar de valor assim: {m} ({mt}% respondem, contra {pt}% em \"{p}\"). Considere usar esse momento como padrão em Robô → Quando falar de valor.")
    comparar("arte", "Arte da promoção", "Abordagens {m} tiveram {mt}% de resposta, contra {pt}% {p}. Vale manter a que funciona melhor.")

    if total["env"] < MINIMO_PARA_CONCLUIR * 2:
        dicas.append({"tipo": "info", "titulo": "Ainda são poucos envios",
                      "texto": f"Com {total['env']} abordagem(ns) enviada(s) ainda não dá para comparar horários e formas de abordar com segurança. As dicas aparecem sozinhas a partir de uns {MINIMO_PARA_CONCLUIR * 2} envios."})

    # alertas do funil agora (não dependem de comparação)
    tags = [etiqueta(i, por_lead.get(i.get("id")), agora) for i in (itens_pipeline or []) if i.get("origem") != "busca"]
    cont: Dict[str, int] = defaultdict(int)
    for t in tags:
        cont[t["id"]] += 1
    if cont["precisa_voce"]:
        dicas.insert(0, {"tipo": "alerta", "titulo": f"{cont['precisa_voce']} lead(s) esperando você", "texto": "O robô passou a conversa para uma pessoa. Responda hoje para não esfriar."})
    if cont["preco"]:
        dicas.insert(0, {"tipo": "alerta", "titulo": f"{cont['preco']} lead(s) perguntaram o valor", "texto": "É o melhor momento da conversa: apresente a condição e proponha o próximo passo."})
    if cont["esfriando"] >= 3:
        dicas.append({"tipo": "alerta", "titulo": f"{cont['esfriando']} leads esfriando", "texto": f"Estão há {DIAS_ESFRIANDO} dias ou mais sem responder. Um seguimento curto, com um assunto novo, costuma reabrir a conversa."})
    if total["env"] >= MINIMO_PARA_CONCLUIR and geral < 10:
        dicas.append({"tipo": "dica", "titulo": "Respostas baixas", "texto": f"Só {geral}% responderam à abordagem. Teste outra forma de abrir (mais curta, com a promoção ou a arte logo na primeira mensagem) e compare."})

    return {
        "abordados": total["env"], "responderam": total["resp"], "taxa_resposta": geral,
        "horario": linhas("horario"), "dia": linhas("dia"), "valor": linhas("valor"), "arte": linhas("arte"),
        "dicas": dicas, "minimo_para_concluir": MINIMO_PARA_CONCLUIR,
    }


async def do_usuario(uid: str, itens_pipeline: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    from app import fila_envio, pipeline_store, robo_store
    itens_pipeline = itens_pipeline if itens_pipeline is not None else await pipeline_store.listar(uid)
    fila = await fila_envio.listar(uid)
    conversas = await robo_store.listar_conversas(uid, com_mensagens=False)
    return analisar(fila, conversas, itens_pipeline)
