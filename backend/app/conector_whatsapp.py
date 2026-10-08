"""WhatsApp pelo computador do próprio usuário (Conector + OpenWA).

O Conector é um programa que roda no PC do usuário, ao lado do OpenWA
(gateway de código aberto que se liga ao WhatsApp pelo QR code). Quem chama
quem: o Conector liga para o LeadSage, nunca o contrário, porque a nuvem não
alcança um computador atrás do roteador.

    Conector --(chave)--> /api/conector/mensagem   o lead respondeu; o robô decide
    Conector --(chave)--> /api/conector/tarefas    o que enviar agora
    Conector --(chave)--> /api/conector/tarefas/{id}/resultado

Duas filas saem por aqui: as **respostas** do robô (e as do dono, pela tela) e
as **abordagens frias** preparadas na Fila de envio. Só as frias têm limite:

- número recém-conectado sobe devagar (aquecimento por idade da conexão);
- um intervalo mínimo entre uma abordagem fria e a seguinte;
- quem respondeu SAIR já é barrado pelo robô, e a primeira mensagem leva o aviso.

É uma conexão NÃO oficial: o WhatsApp pode restringir o número. Os limites
reduzem o risco, não o eliminam, e a tela diz isso antes de conectar.
"""
import hashlib
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from app import fila_envio, robo_store
from app.database import AsyncSessionLocal, DBRobo
from app.firebase_config import db as firestore_db
from app.meta_canais import EnvioFalhou

PREFIXO = "lsc_"
CHAVE_RE = re.compile(r"^lsc_[A-Za-z0-9_-]{30,60}$")
ONLINE_SEGUNDOS = 90
INTERVALO_FRIO_S = 90          # entre uma abordagem fria e a seguinte
FRIO_INICIAL = 5               # por dia, no primeiro dia da conexão
FRIO_POR_DIA = 3               # quanto o limite cresce a cada dia
FRIO_MAXIMO = 30
MAX_TAREFAS = 3
CAMPOS_CONECTOR = ("cw_hash", "cw_prefixo", "cw_criado", "cw_visto", "cw_primeiro", "cw_numero",
                   "cw_status", "cw_ultimo_frio", "cw_versao", "cw_frio_dia", "cw_frio_n", "cw_atividade")

AVISO_SAIR = "\n\n(Se preferir não receber mais mensagens, é só responder SAIR.)"


# ------------------------------------------------------------------ chave

def hash_da_chave(chave: str) -> str:
    return hashlib.sha256((chave or "").encode("utf-8")).hexdigest()


def chave_valida(chave: str) -> bool:
    return bool(CHAVE_RE.match(chave or ""))


async def criar_chave(canal: Dict[str, Any]) -> str:
    """Gera uma chave nova (a anterior deixa de valer). Só aparece uma vez."""
    antigo = canal.get("cw_hash")
    if antigo:
        await robo_store.esquecer_ativo("conector", antigo)
    chave = PREFIXO + secrets.token_urlsafe(32)
    h = hash_da_chave(chave)
    for campo in CAMPOS_CONECTOR:
        canal.pop(campo, None)
    canal.update({"cw_hash": h, "cw_prefixo": chave[:8], "cw_criado": robo_store.agora()})
    return chave


async def revogar(canal: Dict[str, Any]) -> Dict[str, Any]:
    if canal.get("cw_hash"):
        await robo_store.esquecer_ativo("conector", canal["cw_hash"])
    for campo in CAMPOS_CONECTOR:
        canal.pop(campo, None)
    return canal


async def canal_da_chave(chave: str) -> Optional[Dict[str, Any]]:
    """O canal do usuário dono da chave, ou nada. Confere o hash duas vezes."""
    if not chave_valida(chave):
        return None
    h = hash_da_chave(chave)
    canal = await robo_store.canal_por_ativo("conector", h)
    if not canal or canal.get("cw_hash") != h:
        return None
    return canal


# ---------------------------------------------------------------- estado

def _agora_dt() -> datetime:
    return datetime.now(timezone.utc)


def _ler_data(texto: Optional[str]) -> Optional[datetime]:
    if not texto:
        return None
    try:
        d = datetime.fromisoformat(str(texto).replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def online(canal: Dict[str, Any], agora: Optional[datetime] = None) -> bool:
    visto = _ler_data(canal.get("cw_visto"))
    return bool(visto and ((agora or _agora_dt()) - visto).total_seconds() <= ONLINE_SEGUNDOS)


def limite_frio_do_dia(canal: Dict[str, Any], agora: Optional[datetime] = None) -> int:
    """Aquecimento: o número só ganha volume com o tempo de conexão."""
    primeiro = _ler_data(canal.get("cw_primeiro"))
    if not primeiro:
        return FRIO_INICIAL
    dias = max(0, ((agora or _agora_dt()) - primeiro).days)
    return min(FRIO_MAXIMO, FRIO_INICIAL + FRIO_POR_DIA * dias)


def visao(canal: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    c = canal or {}
    hoje = _agora_dt().strftime("%Y-%m-%d")
    frios_hoje = int(c.get("cw_frio_n") or 0) if c.get("cw_frio_dia") == hoje else 0
    return {
        "conector_criado": bool(c.get("cw_hash")),
        "conector_prefixo": c.get("cw_prefixo", ""),
        "conector_online": online(c),
        "conector_visto": c.get("cw_visto", ""),
        "conector_numero": c.get("cw_numero", ""),
        "conector_status": c.get("cw_status", ""),
        "conector_frio_hoje": frios_hoje,
        "conector_frio_limite": limite_frio_do_dia(c),
    }


def telefone_whatsapp(bruto: str) -> str:
    """Só dígitos, com 55 na frente quando é número brasileiro sem o país."""
    d = re.sub(r"\D", "", bruto or "")
    if len(d) in (10, 11):
        d = "55" + d
    return d


# ----------------------------------------------------------- saída (fila)

def _chave_saida(uid: str, sid: str) -> str:
    return f"saida:{uid}:{sid}"


def _doc(uid: str, sid: str):
    return firestore_db.collection("users").document(uid).collection("conector_saida").document(sid)


async def _gravar(uid: str, item: Dict[str, Any]) -> None:
    item["atualizado"] = robo_store.agora()
    if firestore_db is not None:
        try:
            _doc(uid, item["id"]).set(item)
            return
        except Exception as exc:
            print(f"Conector: falha ao gravar a saída: {exc}")
    chave = _chave_saida(uid, item["id"])
    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == chave))).scalar_one_or_none()
        if row:
            row.data = item
            row.atualizado = item["atualizado"]
        else:
            s.add(DBRobo(chave=chave, uid=uid, tipo="saida", data=item, atualizado=item["atualizado"]))
        await s.commit()


ABERTOS = ("pendente", "enviando")


async def _listar_saida(uid: str) -> List[Dict[str, Any]]:
    """Só as saídas em aberto: o Firestore cobra por documento lido, e o
    Conector pergunta com frequência."""
    if firestore_db is not None:
        try:
            q = firestore_db.collection("users").document(uid).collection("conector_saida").where("status", "in", list(ABERTOS))
            return [d.to_dict() for d in q.stream()]
        except Exception as exc:
            print(f"Conector: falha ao listar a saída: {exc}")
    async with AsyncSessionLocal() as s:
        rows = (await s.execute(select(DBRobo).where(DBRobo.uid == uid, DBRobo.tipo == "saida"))).scalars().all()
        return [i for i in (dict(r.data or {}) for r in rows) if i.get("status") in ABERTOS]


async def _fila_whatsapp(uid: str) -> List[Dict[str, Any]]:
    """Itens de WhatsApp da Fila de envio que ainda não saíram."""
    if firestore_db is not None:
        try:
            q = (firestore_db.collection("users").document(uid).collection("fila_envio")
                 .where("canal", "==", "whatsapp").where("status", "in", list(ABERTOS)))
            return [d.to_dict() for d in q.stream()]
        except Exception as exc:
            print(f"Conector: falha ao listar a fila de WhatsApp: {exc}")
    return [i for i in await fila_envio.listar(uid) if i.get("canal") == "whatsapp" and i.get("status") in ABERTOS]


async def _obter_saida(uid: str, sid: str) -> Optional[Dict[str, Any]]:
    if firestore_db is not None:
        try:
            doc = _doc(uid, sid).get()
            return doc.to_dict() if doc.exists else None
        except Exception as exc:
            print(f"Conector: falha ao ler a saída: {exc}")
    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == _chave_saida(uid, sid)))).scalar_one_or_none()
        return dict(row.data or {}) if row else None


async def enfileirar_resposta(cfg: Dict[str, Any], contato: str, texto: str) -> str:
    """Uma resposta (do robô ou do dono) que o Conector vai enviar. Devolve o id."""
    if not cfg.get("cw_hash"):
        raise EnvioFalhou("WhatsApp pelo computador não conectado.")
    texto = (texto or "").strip()
    if not texto:
        raise EnvioFalhou("Mensagem vazia.")
    sid = f"s_{uuid.uuid4().hex[:12]}"
    await _gravar(cfg["uid"], {
        "id": sid, "tipo": "resposta", "contato": telefone_whatsapp(contato), "texto": texto[:4096],
        "status": "pendente", "criado": robo_store.agora(), "tentativas": 0,
    })
    return sid


REENTREGA_S = 180   # tarefa entregue ao Conector e sem resultado: volta para a fila


def _disponivel(item: Dict[str, Any], agora: datetime, pendente: str = "pendente") -> bool:
    """Pendente, ou entregue ao Conector há tempo demais sem resposta dele."""
    if item.get("status") == pendente:
        return True
    if item.get("status") == "enviando":
        quando = _ler_data(item.get("enviando_em"))
        return bool(quando and (agora - quando).total_seconds() > REENTREGA_S)
    return False


def _digitando_ms(texto: str) -> int:
    """Tempo de "digitando…" proporcional ao texto, como uma pessoa."""
    return min(9000, 1200 + 45 * len(texto or ""))


async def tarefas(canal: Dict[str, Any], agora: Optional[datetime] = None) -> Dict[str, Any]:
    """O que o Conector deve enviar agora: respostas primeiro, depois uma fria no máximo."""
    agora = agora or _agora_dt()
    uid = canal["uid"]
    saida: List[Dict[str, Any]] = []

    for s in sorted(await _listar_saida(uid), key=lambda i: i.get("criado") or ""):
        if _disponivel(s, agora) and len(saida) < MAX_TAREFAS:
            s["status"], s["enviando_em"] = "enviando", agora.isoformat()
            await _gravar(uid, s)
            saida.append({"id": s["id"], "tipo": "resposta", "contato": s["contato"], "texto": s["texto"],
                          "digitando_ms": _digitando_ms(s["texto"])})

    itens = await _fila_whatsapp(uid)
    hoje = agora.strftime("%Y-%m-%d")
    frios_hoje = int(canal.get("cw_frio_n") or 0) if canal.get("cw_frio_dia") == hoje else 0
    limite = limite_frio_do_dia(canal, agora)

    ultimo = _ler_data(canal.get("cw_ultimo_frio"))
    espera = 0
    if ultimo:
        espera = max(0, INTERVALO_FRIO_S - int((agora - ultimo).total_seconds()))

    motivo_sem_frio = ""
    if frios_hoje >= limite:
        motivo_sem_frio = f"limite de hoje atingido ({frios_hoje}/{limite}); o número ganha volume a cada dia"
    elif espera:
        motivo_sem_frio = f"intervalo entre abordagens ({espera}s)"
    elif not saida:
        pendentes = sorted(
            (i for i in itens if i.get("canal") == "whatsapp" and _disponivel(i, agora)
             and len(telefone_whatsapp((i.get("contato") or {}).get("phone", ""))) >= 12),
            key=lambda i: i.get("criado") or "",
        )
        if pendentes:
            i = pendentes[0]
            i["status"], i["enviando_em"] = "enviando", agora.isoformat()
            await fila_envio._gravar(uid, i)
            canal["cw_ultimo_frio"] = agora.isoformat()
            canal["cw_frio_dia"], canal["cw_frio_n"] = hoje, frios_hoje + 1
            texto = i["texto"] if "responder SAIR" in i["texto"] else i["texto"].rstrip() + AVISO_SAIR
            saida.append({"id": f"fila:{i['id']}", "tipo": "abordagem",
                          "contato": telefone_whatsapp(i["contato"]["phone"]), "texto": texto,
                          "digitando_ms": _digitando_ms(texto)})

    ativo_recente = _ler_data(canal.get("cw_atividade"))
    quente = bool(ativo_recente and (agora - ativo_recente).total_seconds() < 600)
    return {
        "tarefas": saida, "frios_hoje": frios_hoje, "limite_frio": limite, "motivo_sem_frio": motivo_sem_frio,
        # quanto o Conector espera antes de perguntar de novo: depressa só com conversa em andamento
        "proxima_em": 4 if (saida or quente) else 30,
    }


async def registrar_resultado(canal: Dict[str, Any], tarefa_id: str, ok: bool, erro: str = "") -> bool:
    """O Conector diz se enviou. Abordagem fria move o lead no funil."""
    uid = canal["uid"]
    if tarefa_id.startswith("fila:"):
        item_id = tarefa_id[5:]
        item = await fila_envio.obter(uid, item_id)
        if not item or item.get("canal") != "whatsapp":
            return False
        if ok:
            if item.get("status") != "enviado":
                await fila_envio.marcar_enviado(uid, item_id)
                item = await fila_envio.obter(uid, item_id) or item
                item["enviado_por"] = "conector"
                await fila_envio._gravar(uid, item)
        else:
            item["status"] = "falhou"
            item["motivo"] = (erro or "o WhatsApp não aceitou a mensagem")[:200]
            await fila_envio._gravar(uid, item)
        return True

    s = await _obter_saida(uid, tarefa_id)
    if not s:
        return False
    s["status"] = "enviado" if ok else "falhou"
    s["tentativas"] = int(s.get("tentativas") or 0) + 1
    if not ok:
        s["erro"] = (erro or "")[:200]
    await _gravar(uid, s)
    return True
