"""Pipeline de vendas guardado no servidor.

Antes o pipeline vivia so no navegador (localStorage): o robo respondia
um lead e a coluna dele nunca mudava, porque o servidor nao sabia em que
etapa o lead estava. Agora cada conta tem o proprio pipeline aqui, e quem
move o card — a pessoa arrastando ou o robo conversando — grava o motivo.

Cada registro guarda uma foto do lead (nome, telefone, diagnostico, ganchos).
E por ela que o robo reconhece quem escreveu: a tabela de leads do SQLite
fica em /tmp na Vercel e some a cada reinicio, o Firestore nao.

Firestore quando ha credencial, SQLite no dev — como o resto do app.
"""
import re
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from app.database import AsyncSessionLocal, DBRobo
from app.firebase_config import db as firestore_db
from app.robo_store import agora

# Ordem das colunas. "Perdido" fica fora da fila: e saida, nao progresso.
ETAPAS = ("Novo Lead", "Contato Enviado", "Respondeu", "Qualificado", "Reunião", "Proposta", "Fechado")
PERDIDO = "Perdido"
TODAS = ETAPAS + (PERDIDO,)

# Etapas antigas, de quando o pipeline so existia no navegador.
APELIDOS = {"Novos": "Novo Lead", "Novo": "Novo Lead", "Contato": "Contato Enviado"}

MAX_HISTORICO = 40

# O que se guarda do lead: o que o robo usa para conversar e o que o
# pipeline mostra. Nada de campo grande (reviews, horarios).
CAMPOS_LEAD = (
    "name", "company", "phone", "email", "niche", "city", "website", "instagram",
    "rating", "rating_count", "missingDigitalAssets", "diagnosis", "hooks",
    "opportunityScore", "maps_url",
)


def etapa_valida(etapa: str) -> str:
    etapa = APELIDOS.get(etapa, etapa)
    return etapa if etapa in TODAS else ""


def so_digitos(telefone: str) -> str:
    return re.sub(r"\D", "", telefone or "")


def mesmo_telefone(a: str, b: str) -> bool:
    """Compara pelos ultimos 11 digitos: com ou sem 55 e sem o 9 da frente
    ainda e o mesmo numero, e o webhook da Meta vem sempre com o codigo."""
    da, db_ = so_digitos(a), so_digitos(b)
    return len(da) >= 10 and len(db_) >= 10 and da[-11:] == db_[-11:]


def pode_mover_sozinho(atual: str, destino: str) -> bool:
    """Regra do robo: so avanca, e so sai do pipeline para "Perdido".

    Se a pessoa arrastou o card para "Proposta", o robo nao o puxa de volta
    para "Respondeu" por a conversa estar numa etapa anterior. Fechado e
    Perdido sao finais: o robo nao mexe mais.
    """
    if atual in ("Fechado", PERDIDO) or destino == atual or destino == "Fechado":
        return False
    if destino == PERDIDO:
        return True
    if destino not in ETAPAS:
        return False
    return ETAPAS.index(destino) > (ETAPAS.index(atual) if atual in ETAPAS else -1)


# ------------------------------------------------------------ armazenamento

def _chave(uid: str, lead_id: str) -> str:
    return f"pipeline:{uid}:{lead_id}"


def _doc(uid: str, lead_id: str):
    return firestore_db.collection("users").document(uid).collection("pipeline").document(lead_id)


async def _ler(uid: str, lead_id: str) -> Optional[Dict[str, Any]]:
    if firestore_db is not None:
        try:
            doc = _doc(uid, lead_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as exc:
            print(f"Falha ao ler o pipeline: {exc}")
    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == _chave(uid, lead_id)))).scalar_one_or_none()
        return dict(row.data or {}) if row else None


async def _gravar(uid: str, item: Dict[str, Any]) -> None:
    item["atualizado"] = agora()
    if firestore_db is not None:
        try:
            _doc(uid, item["id"]).set(item)
            return
        except Exception as exc:
            print(f"Falha ao gravar o pipeline: {exc}")
    chave = _chave(uid, item["id"])
    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == chave))).scalar_one_or_none()
        if row:
            row.data = item
            row.atualizado = item["atualizado"]
        else:
            s.add(DBRobo(chave=chave, uid=uid, tipo="pipeline", data=item, atualizado=item["atualizado"]))
        await s.commit()


async def listar(uid: str) -> List[Dict[str, Any]]:
    itens: List[Dict[str, Any]] = []
    lido = False
    if firestore_db is not None:
        try:
            itens = [d.to_dict() for d in firestore_db.collection("users").document(uid).collection("pipeline").stream()]
            lido = True
        except Exception as exc:
            print(f"Falha ao listar o pipeline: {exc}")
    if not lido:
        async with AsyncSessionLocal() as s:
            rows = (await s.execute(select(DBRobo).where(DBRobo.uid == uid, DBRobo.tipo == "pipeline"))).scalars().all()
            itens = [dict(r.data or {}) for r in rows]
    for i in itens:
        i["etapa"] = etapa_valida(i.get("etapa", "")) or "Novo Lead"
    itens.sort(key=lambda i: i.get("atualizado") or "", reverse=True)
    return itens


async def obter(uid: str, lead_id: str) -> Optional[Dict[str, Any]]:
    return await _ler(uid, lead_id)


def _foto(lead: Dict[str, Any]) -> Dict[str, Any]:
    return {k: lead[k] for k in CAMPOS_LEAD if lead.get(k) not in (None, "", [])}


# ------------------------------------------------------------------ escrita

async def registrar(uid: str, lead: Dict[str, Any], etapa: str = "", origem: str = "busca") -> Dict[str, Any]:
    """Cria ou atualiza a foto do lead. Nao mexe na etapa de quem ja existe."""
    lead_id = str(lead.get("id") or "").strip()
    if not lead_id:
        raise ValueError("Lead sem id.")
    item = await _ler(uid, lead_id)
    if item is None:
        item = {
            "id": lead_id, "etapa": etapa_valida(etapa) or "Novo Lead", "origem": origem,
            "historico": [], "criado": agora(),
        }
    item["lead"] = {**(item.get("lead") or {}), **_foto(lead)}
    await _gravar(uid, item)
    return item


async def registrar_varios(uid: str, leads: List[Dict[str, Any]], origem: str = "busca") -> int:
    """Sincroniza os leads que o navegador ja tem. So grava o que mudou.

    `origem="salvo"` marca quem a pessoa escolheu para Meus Leads; um item que
    antes era so sobra de busca passa a valer como escolhido.
    """
    novos = 0
    for lead in leads[:300]:
        lead_id = str(lead.get("id") or "").strip()
        if not lead_id:
            continue
        existente = await _ler(uid, lead_id)
        foto = _foto(lead)
        if existente and origem != "busca" and existente.get("origem") == "busca":
            existente["origem"] = origem
            await _gravar(uid, existente)
        if existente and all((existente.get("lead") or {}).get(k) == v for k, v in foto.items()):
            continue
        await registrar(uid, lead, etapa=lead.get("pipeline_stage") or "", origem=origem)
        novos += existente is None
    return novos


async def mover(
    uid: str, lead_id: str, etapa: str, motivo: str = "", por: str = "voce", sozinho: bool = False,
) -> Optional[Dict[str, Any]]:
    """Muda a etapa. `sozinho` aplica a regra do robo (so avanca).

    Devolve o item atualizado, ou None se nao houve mudanca.
    """
    destino = etapa_valida(etapa)
    if not destino:
        raise ValueError(f"Etapa desconhecida: {etapa}")
    item = await _ler(uid, lead_id)
    if item is None:
        return None
    atual = etapa_valida(item.get("etapa", "")) or "Novo Lead"
    if destino == atual:
        return None
    if sozinho and not pode_mover_sozinho(atual, destino):
        return None
    item["etapa"] = destino
    item["historico"] = (item.get("historico") or [])[-(MAX_HISTORICO - 1):] + [
        {"de": atual, "para": destino, "por": por, "motivo": motivo[:200], "em": agora()}
    ]
    await _gravar(uid, item)
    return item


async def achar_por_telefone(uid: str, telefone: str) -> Optional[Dict[str, Any]]:
    if len(so_digitos(telefone)) < 10:
        return None
    for item in await listar(uid):
        if mesmo_telefone((item.get("lead") or {}).get("phone", ""), telefone):
            return item
    return None


async def apagar(uid: str, lead_id: str) -> None:
    if firestore_db is not None:
        try:
            _doc(uid, lead_id).delete()
        except Exception as exc:
            print(f"Falha ao apagar do pipeline: {exc}")
    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == _chave(uid, lead_id)))).scalar_one_or_none()
        if row:
            await s.delete(row)
            await s.commit()


# ------------------------------------------------- etapa da conversa -> coluna

def etapa_pelo_sdr(sdr: Dict[str, Any], respondeu: bool) -> str:
    """Traduz o estado do SDR na coluna do pipeline.

    - qualquer resposta do lead ja o tira de "Contato Enviado";
    - "Qualificado" e quando o robo ja entendeu o cenario (diagnostico em
      diante) ou o lead esta quente;
    - "Reunião" so quando o lead confirmou horario — o ai_sdr so preenche
      `reuniao` nesse caso;
    - "Fechado" nunca vem do robo: so a pessoa confirma que recebeu.
    """
    sdr = sdr or {}
    etapa = sdr.get("etapa", "abertura")
    if etapa == "perdido":
        return PERDIDO
    if sdr.get("reuniao"):
        return "Reunião"
    if etapa in ("proposta", "fechamento"):
        return "Proposta"
    if etapa in ("diagnostico", "objecao", "agendamento") or sdr.get("temperatura") == "quente":
        return "Qualificado"
    return "Respondeu" if respondeu else "Contato Enviado"
