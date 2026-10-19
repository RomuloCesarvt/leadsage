"""WhatsApp pelo computador do próprio usuário (Conector).

O Conector é um programa que roda no PC do usuário: abre o WhatsApp Web no Edge/Chrome
que ele já tem, mostra o QR code e passa a atender. Quem chama quem: o Conector liga
para o LeadSage, nunca o contrário, porque a nuvem não alcança um computador atrás do
roteador.

    Conector --(chave)--> /api/conector/mensagem   o lead respondeu; o robô decide
    Conector --(chave)--> /api/conector/tarefas    o que enviar agora
    Conector --(chave)--> /api/conector/tarefas/{id}/resultado
    Extensão --(chave)--> /api/conector/responder  sugere resposta, sem guardar nada

Duas filas saem por aqui: as **respostas** do robô (e as do dono, pela tela) e
as **abordagens frias** preparadas na Fila de envio. Só as frias têm limite:

- número recém-conectado sobe devagar (aquecimento por idade da conexão);
- um intervalo mínimo entre uma abordagem fria e a seguinte;
- quem respondeu SAIR já é barrado pelo robô, e a primeira mensagem leva o aviso.

É uma conexão NÃO oficial: o WhatsApp pode restringir o número. Os limites
reduzem o risco, não o eliminam, e a tela diz isso antes de conectar.
"""
import hashlib
import random
import re
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import select

from app import fila_envio, robo_store
from app.config import settings
from app.database import AsyncSessionLocal, DBRobo
from app.firebase_config import db as firestore_db
from app.meta_canais import EnvioFalhou

PREFIXO = "lsc_"
CHAVE_RE = re.compile(r"^lsc_[A-Za-z0-9_-]{30,60}$")
ONLINE_SEGUNDOS = 200
INTERVALO_FRIO_S = 90          # (antigo) so vale para contas conectadas antes do ritmo variavel
# Ritmo de abordagem fria. Numero que dispara em ritmo de maquina e bloqueado: pessoas mandam mensagem a qualquer hora,
# com intervalos irregulares e param para descansar.
INTERVALO_MIN_S = 180          # entre uma abordagem fria e a seguinte: de 3 a 7 minutos, sorteado a cada envio
INTERVALO_MAX_S = 420
LOTE_ATE_PAUSA = 5             # a cada 5 abordagens, uma pausa longa
PAUSA_LONGA_S = (900, 1500)    # de 15 a 25 minutos, somados ao intervalo
INTERVALO_PRIORIDADE_S = 60    # "Enviar agora" dispensa o intervalo, nao a prudencia: no minimo 1 minuto desde a ultima
JANELA_HORAS = (8, 19)         # abordagem fria so de segunda a sabado, das 8h as 19h (Brasilia)
FALHAS_PARA_PAUSAR = 3         # tres falhas seguidas: o numero pode estar restrito; para por 2 horas
PAUSA_POR_FALHAS_S = 2 * 3600
FRIO_INICIAL = 10              # por dia, no primeiro dia da conexão
FRIO_POR_DIA = 5               # quanto o limite cresce a cada dia
FRIO_MAXIMO = 60               # teto diário: acima disso o risco de banimento sobe muito
MAX_TAREFAS = 3
CAMPOS_CONECTOR = ("cw_hash", "cw_prefixo", "cw_criado", "cw_visto", "cw_primeiro", "cw_numero",
                   "cw_status", "cw_ultimo_frio", "cw_versao", "cw_frio_dia", "cw_frio_n", "cw_atividade",
                   "cw_proximo_frio_em", "cw_falhas", "cw_pausa_ate")

AVISO_SAIR = "\n\n(Se preferir não receber mais mensagens, é só responder SAIR.)"


# ------------------------------------------------------------------ chave

def hash_da_chave(chave: str) -> str:
    return hashlib.sha256((chave or "").encode("utf-8")).hexdigest()


def chave_valida(chave: str) -> bool:
    return bool(CHAVE_RE.match(chave or ""))


def _so_digitos(numero: Any) -> str:
    return re.sub(r"\D", "", str(numero or ""))[:20]


def lembrar_aquecimento(canal: Dict[str, Any]) -> None:
    """Guarda, por número, desde quando ele está conectado. Trocar a chave ou reconectar o MESMO número não zera o aquecimento
    (o limite do dia voltava a 10 e o número perdia dias de confiança)."""
    numero, primeiro = _so_digitos(canal.get("cw_numero")), canal.get("cw_primeiro")
    if numero and primeiro:
        historico = canal.setdefault("cw_aquec", {})
        antigo = _ler_data(historico.get(numero))
        if not antigo or (_ler_data(primeiro) and _ler_data(primeiro) < antigo):
            historico[numero] = primeiro


async def restaurar_aquecimento(canal: Dict[str, Any]) -> None:
    """Devolve ao canal a data de primeira conexão deste número, se ele já esteve conectado antes.

    Na primeira vez também olha os envios antigos da fila: quem já mandava mensagens antes de existir este registro
    (e teve o aquecimento zerado por uma reconexão) recupera os dias que já cumpriu.
    """
    numero = _so_digitos(canal.get("cw_numero"))
    historico = canal.setdefault("cw_aquec", {})
    candidatas = [d for d in (_ler_data(canal.get("cw_primeiro")), _ler_data(historico.get(numero)) if numero else None) if d]
    if not canal.get("cw_aquec_ok") and canal.get("uid"):
        canal["cw_aquec_ok"] = True
        try:
            for item in await fila_envio.listar(canal["uid"]):
                if item.get("canal") == "whatsapp" and item.get("status") == "enviado":
                    d = _ler_data(item.get("enviado_em"))
                    if d:
                        candidatas.append(d)
        except Exception as exc:  # sem a fila, fica com o que o canal ja sabe
            print(f"Aquecimento: não leu os envios antigos: {exc}")
    if candidatas:
        canal["cw_primeiro"] = min(candidatas).isoformat()
    lembrar_aquecimento(canal)


async def criar_chave(canal: Dict[str, Any]) -> str:
    """Gera uma chave nova (a anterior deixa de valer). Só aparece uma vez."""
    lembrar_aquecimento(canal)
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
    lembrar_aquecimento(canal)
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
        "nuvem": bool(c.get("nuvem_chave")),
        "nuvem_disponivel": bool(settings.WORKER_SECRET),
    }


# Melhor horario por ramo (Brasilia): o dono atende o WhatsApp quando nao esta no pico do negocio dele.
# (palavras do ramo sem acento, dias da semana 0=segunda..6=domingo, janelas em horas decimais)
JANELAS_DO_RAMO = (
    (("odont", "dentist", "clinic", "medic", "saude", "psicolog", "terap", "fisio", "nutri", "estetic", "veterin"), (0, 1, 2, 3, 4), ((9, 11.5), (14, 16.5))),
    (("restaurante", "pizz", "lanch", "hamburg", "churrasc", "bar ", "bistro", "sushi", "marmit"), (0, 1, 2, 3, 4), ((14.5, 17.5),)),
    (("padaria", "confeit", "cafe", "doceria", "sorvet", "acai"), (0, 1, 2, 3, 4), ((13.5, 16.5),)),
    (("barbear", "salao", "cabelei", "beleza", "manicure", "tatuag"), (1, 2, 3, 4, 5), ((9, 12), (14, 17))),
    (("advoga", "juridic", "contab", "imobili", "consult", "seguro"), (0, 1, 2, 3, 4), ((9, 11.5), (14, 17))),
    (("academia", "fitness", "crossfit", "pilates", "danca", "esporte"), (0, 1, 2, 3, 4), ((9, 11), (14, 16))),
)

FUSO_BRASIL = timezone(timedelta(hours=-3))
_sem_acento = lambda t: __import__("unicodedata").normalize("NFKD", t or "").encode("ascii", "ignore").decode().lower()


def janela_do_ramo(ramo: str, agora: datetime) -> bool:
    """O horario combina com o ramo? Ramo sem regra propria vale a janela geral (seg a sab, 8h as 19h)."""
    h = agora.astimezone(FUSO_BRASIL)
    alvo = f" {_sem_acento(ramo)} "
    for palavras, dias, janelas in JANELAS_DO_RAMO:
        if any(p in alvo for p in palavras):
            hora = h.hour + h.minute / 60
            return h.weekday() in dias and any(a <= hora < b for a, b in janelas)
    return janela_aberta(agora)
_sortear = random.randint  # trocado nos testes


def janela_aberta(agora: datetime) -> bool:
    """Segunda a sabado, das 8h as 19h em Brasilia."""
    h = agora.astimezone(FUSO_BRASIL)
    return h.weekday() != 6 and JANELA_HORAS[0] <= h.hour < JANELA_HORAS[1]


def _hhmm(quando: datetime) -> str:
    return quando.astimezone(FUSO_BRASIL).strftime("%H:%M")


def politica_frio(canal: Dict[str, Any], agora: datetime, prioritario: bool = False) -> Tuple[bool, str, int]:
    """Pode sair uma abordagem fria agora? Devolve (pode, motivo, segundos de espera)."""
    pausa = _ler_data(canal.get("cw_pausa_ate"))
    if pausa and agora < pausa:
        return False, f"pausado por falhas seguidas de envio, volta às {_hhmm(pausa)} (confira se o número está restrito)", int((pausa - agora).total_seconds())
    if not janela_aberta(agora):
        return False, "fora do horário de envio (segunda a sábado, das 8h às 19h de Brasília)", 0
    ultimo = _ler_data(canal.get("cw_ultimo_frio"))
    if prioritario:
        espera = max(0, INTERVALO_PRIORIDADE_S - int((agora - ultimo).total_seconds())) if ultimo else 0
    else:
        proximo = _ler_data(canal.get("cw_proximo_frio_em"))
        if proximo:
            espera = max(0, int((proximo - agora).total_seconds()))
        else:  # conta antiga, sem horario sorteado: usa o intervalo de antes
            espera = max(0, INTERVALO_FRIO_S - int((agora - ultimo).total_seconds())) if ultimo else 0
    if espera:
        return False, f"intervalo entre abordagens ({espera}s)", espera
    return True, "", 0


def agendar_proxima_fria(canal: Dict[str, Any], agora: datetime, enviadas_hoje: int) -> None:
    """Sorteia quando pode sair a proxima; a cada lote de 5 acrescenta uma pausa longa."""
    espera = _sortear(INTERVALO_MIN_S, INTERVALO_MAX_S)
    if enviadas_hoje and enviadas_hoje % LOTE_ATE_PAUSA == 0:
        espera += _sortear(*PAUSA_LONGA_S)
    canal["cw_proximo_frio_em"] = (agora + timedelta(seconds=espera)).isoformat()


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
    if firestore_db is not None and not robo_store._sql_primeiro():
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
    if firestore_db is not None and not robo_store._sql_primeiro():
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
    if firestore_db is not None and not robo_store._sql_primeiro():
        try:
            q = (firestore_db.collection("users").document(uid).collection("fila_envio")
                 .where("canal", "==", "whatsapp").where("status", "in", list(ABERTOS)))
            return [d.to_dict() for d in q.stream()]
        except Exception as exc:
            print(f"Conector: falha ao listar a fila de WhatsApp: {exc}")
    return [i for i in await fila_envio.listar(uid) if i.get("canal") == "whatsapp" and i.get("status") in ABERTOS]


async def _obter_saida(uid: str, sid: str) -> Optional[Dict[str, Any]]:
    if firestore_db is not None and not robo_store._sql_primeiro():
        try:
            doc = _doc(uid, sid).get()
            return doc.to_dict() if doc.exists else None
        except Exception as exc:
            print(f"Conector: falha ao ler a saída: {exc}")
    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == _chave_saida(uid, sid)))).scalar_one_or_none()
        return dict(row.data or {}) if row else None


async def enfileirar_resposta(cfg: Dict[str, Any], contato: str, texto: str, chat_id: str = "") -> str:
    """Uma resposta (do robô ou do dono) que o Conector vai enviar. Devolve o id."""
    if not cfg.get("cw_hash"):
        raise EnvioFalhou("WhatsApp pelo computador não conectado.")
    texto = (texto or "").strip()
    if not texto:
        raise EnvioFalhou("Mensagem vazia.")
    sid = f"s_{uuid.uuid4().hex[:12]}"
    await _gravar(cfg["uid"], {
        "id": sid, "tipo": "resposta", "contato": telefone_whatsapp(contato), "texto": texto[:4096],
        "status": "pendente", "criado": robo_store.agora(), "tentativas": 0, "chat_id": chat_id or "",
        # duas respostas criadas no mesmo segundo precisam sair na ordem em que foram escritas
        "seq": time.time_ns(),
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


def _pontos_de_reputacao(item: Dict[str, Any]) -> float:
    try:
        return float(item.get("nota") or 0) if int(item.get("avaliacoes") or 0) >= 10 else 0.0
    except (TypeError, ValueError):
        return 0.0


_ULTIMA_PROMOCAO: Dict[str, float] = {}
PROMOVER_A_CADA_S = 300


async def _promover_seguimentos_vencidos(uid: str) -> None:
    """De tempos em tempos, seguimentos que venceram entram na fila (a menos que a pessoa tenha respondido)."""
    agora_m = time.monotonic()
    if agora_m - _ULTIMA_PROMOCAO.get(uid, 0.0) < PROMOVER_A_CADA_S:
        return
    _ULTIMA_PROMOCAO[uid] = agora_m
    try:
        await fila_envio.promover_seguimentos(uid)
    except Exception as exc:  # reforco: nunca derruba a entrega de tarefas
        print(f"Conector: falha ao promover seguimentos: {exc}")


async def tarefas(canal: Dict[str, Any], agora: Optional[datetime] = None) -> Dict[str, Any]:
    """O que o Conector deve enviar agora: respostas primeiro, depois uma fria no máximo."""
    agora = agora or _agora_dt()
    uid = canal["uid"]
    saida: List[Dict[str, Any]] = []

    for s in sorted(await _listar_saida(uid), key=lambda i: (i.get("criado") or "", int(i.get("seq") or 0))):
        if _disponivel(s, agora) and len(saida) < MAX_TAREFAS:
            s["status"], s["enviando_em"] = "enviando", agora.isoformat()
            await _gravar(uid, s)
            saida.append({"id": s["id"], "tipo": "resposta", "contato": s["contato"], "texto": s["texto"],
                          "chat_id": s.get("chat_id", ""), "digitando_ms": _digitando_ms(s["texto"])})

    await _promover_seguimentos_vencidos(uid)
    itens = await _fila_whatsapp(uid)
    hoje = agora.strftime("%Y-%m-%d")
    frios_hoje = int(canal.get("cw_frio_n") or 0) if canal.get("cw_frio_dia") == hoje else 0
    limite = limite_frio_do_dia(canal, agora)

    todos_pendentes = sorted(
        (i for i in itens if i.get("canal") == "whatsapp" and _disponivel(i, agora)
         and len(telefone_whatsapp((i.get("contato") or {}).get("phone", ""))) >= 12),
        # quem o usuario mandou enviar agora vai na frente; depois, quem tem a melhor reputacao (dono mais engajado)
        key=lambda i: (0 if i.get("prioridade") else 1, -_pontos_de_reputacao(i), i.get("criado") or ""),
    )
    # so sai quem esta no melhor horario do proprio ramo; os outros esperam a vez deles
    pendentes = [i for i in todos_pendentes if i.get("prioridade") or janela_do_ramo(i.get("ramo", ""), agora)]
    prioritario = bool(pendentes and pendentes[0].get("prioridade"))
    pode, motivo_politica, _ = politica_frio(canal, agora, prioritario)
    if todos_pendentes and not pendentes and pode:
        pode, motivo_politica = False, "fora do melhor horário para o ramo dos contatos na fila (cada ramo tem a sua janela)"

    motivo_sem_frio = ""
    if frios_hoje >= limite:
        motivo_sem_frio = f"limite de hoje atingido ({frios_hoje}/{limite}); o número ganha volume a cada dia"
    elif not pode:
        motivo_sem_frio = motivo_politica
    elif not saida:
        if pendentes:
            i = pendentes[0]
            i["status"], i["enviando_em"] = "enviando", agora.isoformat()
            await fila_envio._gravar(uid, i)
            canal["cw_ultimo_frio"] = agora.isoformat()
            canal["cw_frio_dia"], canal["cw_frio_n"] = hoje, frios_hoje + 1
            agendar_proxima_fria(canal, agora, frios_hoje + 1)
            texto = i["texto"]  # sem aviso de "responda SAIR": parece disparo em massa; quem pede para sair e atendido pelo robo
            saida.append({"id": f"fila:{i['id']}", "tipo": "abordagem",
                          "contato": telefone_whatsapp(i["contato"]["phone"]), "texto": texto,
                          "digitando_ms": _digitando_ms(texto)})

    ativo_recente = _ler_data(canal.get("cw_atividade"))
    quente = bool(ativo_recente and (agora - ativo_recente).total_seconds() < 600)
    # o celular esta olhando: o Conector precisa perguntar depressa e mandar o espelho
    from app import espelho_whatsapp
    pedidos = await espelho_whatsapp.pedidos_para_o_conector(uid, agora)
    return {
        "tarefas": saida, "frios_hoje": frios_hoje, "limite_frio": limite, "motivo_sem_frio": motivo_sem_frio,
        # quanto o Conector espera antes de perguntar de novo: depressa só com conversa em andamento
        "proxima_em": 3 if pedidos["remoto"] else (4 if (saida or quente) else 45),
        **pedidos,
    }


async def estado_da_fila(canal: Dict[str, Any], agora: Optional[datetime] = None) -> Dict[str, Any]:
    """O que o usuario precisa ver na Fila de envio sobre o WhatsApp: se o Conector esta de pe,
    quantas esperam, quanto ja saiu hoje e quando sai a proxima. Sem isso a fila parece parada."""
    agora = agora or _agora_dt()
    itens = [i for i in await _fila_whatsapp(canal["uid"]) if i.get("canal") == "whatsapp"]
    hoje = agora.strftime("%Y-%m-%d")
    frios_hoje = int(canal.get("cw_frio_n") or 0) if canal.get("cw_frio_dia") == hoje else 0
    limite = limite_frio_do_dia(canal, agora)
    pendentes = [i for i in itens if i.get("status") == "pendente"]
    pode, motivo_politica, espera = politica_frio(canal, agora, bool(pendentes and pendentes[0].get("prioridade")))
    if not canal.get("cw_hash"):
        motivo = "O WhatsApp pelo computador ainda não foi conectado."
    elif not online(canal, agora):
        motivo = "O Conector está fechado. Abra o programa “Conectar-WhatsApp” no computador."
    elif frios_hoje >= limite:
        motivo = f"Limite de hoje atingido ({frios_hoje} de {limite}). O número ganha volume a cada dia."
    elif pendentes and not pode:
        motivo = (f"Próxima abordagem em cerca de {max(1, round(espera / 60))} min (intervalo de segurança)."
                  if espera and motivo_politica.startswith("intervalo") else motivo_politica[:1].upper() + motivo_politica[1:] + ".")
    elif pendentes:
        motivo = "A próxima sai em instantes."
    else:
        motivo = ""
    return {
        "conectado": bool(canal.get("cw_hash")), "online": online(canal, agora),
        "pendentes": len(pendentes), "enviando": sum(1 for i in itens if i.get("status") == "enviando"),
        "enviadas_hoje": frios_hoje, "limite_hoje": limite, "espera_s": espera, "motivo": motivo,
    }


async def enviar_agora(uid: str, item_id: str) -> bool:
    """Poe um item da fila na frente: dispensa o intervalo (o limite do dia continua valendo)."""
    item = await fila_envio.obter(uid, item_id)
    if not item or item.get("canal") != "whatsapp" or item.get("status") not in ("pendente", "falhou", "enviando"):
        return False
    item["status"], item["prioridade"], item["motivo"] = "pendente", 1, ""
    await fila_envio._gravar(uid, item)
    return True


_FALHA_DE_CONEXAO = re.compile(r"n[aã]o est[aá] conectado|connection (closed|lost|failure)|conflict|stream errored|timed out|timeout", re.I)


def falha_de_conexao(erro: str) -> bool:
    """O envio falhou porque a conexão do serviço caiu, não porque o WhatsApp recusou a mensagem."""
    return bool(_FALHA_DE_CONEXAO.search(erro or ""))


def retomar(canal: Dict[str, Any]) -> None:
    """O usuário conferiu o número e quer voltar a enviar: tira a pausa por falhas e zera a contagem."""
    canal.pop("cw_pausa_ate", None)
    canal["cw_falhas"] = 0


async def registrar_resultado(canal: Dict[str, Any], tarefa_id: str, ok: bool, erro: str = "") -> bool:
    """O Conector diz se enviou. Abordagem fria move o lead no funil.

    "Enviou" aqui e "o WhatsApp confirmou o recebimento no servidor": sem confirmacao o Conector reporta falha.
    Tres falhas seguidas pausam as abordagens frias por 2 horas (numero possivelmente restrito).
    """
    uid = canal["uid"]
    agora = _agora_dt()
    if ok:
        canal["cw_falhas"] = 0
    elif falha_de_conexao(erro):
        pass  # o WhatsApp do serviço estava desconectado: tentar de novo depois, sem pausar o número
    else:
        canal["cw_falhas"] = int(canal.get("cw_falhas") or 0) + 1
        if canal["cw_falhas"] >= FALHAS_PARA_PAUSAR:
            canal["cw_pausa_ate"] = (agora + timedelta(seconds=PAUSA_POR_FALHAS_S)).isoformat()
            canal["cw_falhas"] = 0
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
    await _marcar_entrega_na_conversa(uid, s, ok, erro)
    return True


async def _marcar_entrega_na_conversa(uid: str, saida: Dict[str, Any], ok: bool, erro: str) -> None:
    """A conversa mostrava a resposta como enviada assim que entrava na fila; agora ela so vale quando o WhatsApp confirmou."""
    try:
        cid = robo_store.id_da_conversa("whatsapp", saida.get("contato", ""))
        conversa = await robo_store.obter_conversa(uid, cid)
        if not conversa:
            return
        mudou = False
        for m in conversa.get("mensagens") or []:
            if m.get("meta_id") == saida.get("id"):
                m["entrega"] = "enviada" if ok else "falhou"
                if not ok:
                    m["erro"] = (erro or "o WhatsApp não confirmou o envio")[:200]
                mudou = True
        if mudou:
            await robo_store.salvar_conversa(uid, conversa)
    except Exception as exc:  # reforco: nunca derruba o resultado do envio
        print(f"Conector: falha ao marcar a entrega na conversa: {exc}")


# ------------------------------------------------------------------ saude do numero

_SAUDE: Dict[str, Any] = {}
_SAUDE_TTL_S = 120


def _nivel(pontos: int) -> str:
    return "boa" if pontos >= 80 else ("atencao" if pontos >= 55 else "risco")


async def saude(canal: Dict[str, Any], agora: Optional[datetime] = None) -> Dict[str, Any]:
    """Quanto o numero esta exposto a restricao ou banimento, a partir do que o proprio LeadSage ve.

    Nao e uma nota do WhatsApp (ele nao a publica): e um termometro dos sinais que mais derrubam numeros —
    conexao nova, volume alto, numeros que nao existem, gente pedindo para sair e quase ninguem respondendo.
    """
    agora = agora or _agora_dt()
    if not canal.get("cw_hash"):
        return {"disponivel": False}
    uid = canal["uid"]
    guardado = _SAUDE.get(uid)
    import time as _t
    if guardado and _t.monotonic() - guardado[0] < _SAUDE_TTL_S:
        return guardado[1]

    pontos = 100
    sinais: List[Dict[str, str]] = []

    def marcar(tipo: str, texto: str, tira: int = 0) -> None:
        nonlocal pontos
        pontos -= tira
        sinais.append({"tipo": tipo, "texto": texto})

    # 1. tempo de conexao: numero novo e o que mais leva ban
    primeiro = _ler_data(canal.get("cw_primeiro"))
    dias = max(0, (agora - primeiro).days) if primeiro else 0
    if dias < 1:
        marcar("aviso", "Número conectado hoje: ainda em aquecimento. Comece devagar.", 25)
    elif dias < 3:
        marcar("aviso", f"Conectado há {dias} dias: o número ainda está ganhando confiança.", 15)
    elif dias < 7:
        marcar("aviso", f"Conectado há {dias} dias.", 5)
    else:
        marcar("ok", f"Conectado há {dias} dias.")

    # 2. volume de hoje contra o limite
    hoje = agora.strftime("%Y-%m-%d")
    usados = int(canal.get("cw_frio_n") or 0) if canal.get("cw_frio_dia") == hoje else 0
    limite = limite_frio_do_dia(canal, agora)
    if usados >= limite:
        marcar("aviso", f"Limite de hoje atingido ({usados} de {limite}). O robô para até amanhã.", 10)
    elif usados >= 0.8 * limite:
        marcar("aviso", f"Perto do limite de hoje ({usados} de {limite}).", 5)
    else:
        marcar("ok", f"Hoje: {usados} de {limite} abordagens.")

    # 3. numeros que nao existem no WhatsApp pesam contra a conta
    itens = [i for i in await fila_envio.listar(uid) if i.get("canal") == "whatsapp" and i.get("status") in ("enviado", "falhou")]
    itens.sort(key=lambda i: i.get("enviado_em") or i.get("atualizado") or "", reverse=True)
    recentes = itens[:40]
    invalidos = sum(1 for i in recentes if i.get("status") == "falhou" and "whatsapp" in (i.get("motivo") or "").lower())
    if len(recentes) >= 10:
        taxa = invalidos / len(recentes)
        if taxa >= 0.2:
            marcar("risco", f"{invalidos} de {len(recentes)} números recentes não existem no WhatsApp. Confira a lista de leads.", 25)
        elif taxa >= 0.1:
            marcar("aviso", f"{invalidos} de {len(recentes)} números recentes não existem no WhatsApp.", 12)
        else:
            marcar("ok", "Quase todos os números abordados existem no WhatsApp.")

    # 4. pedidos para sair e respostas: quem recebe e denuncia derruba o numero
    try:
        conversas = [c for c in await robo_store.listar_conversas(uid) if c.get("canal") == "whatsapp" and c.get("origem") == "envio"]
    except Exception:
        conversas = []
    if len(conversas) >= 10:
        saidas = sum(1 for c in conversas if c.get("optout"))
        respondidas = sum(1 for c in conversas if (c.get("total") or 0) >= 2 or (c.get("ultima") or {}).get("de") == "contato")
        if saidas / len(conversas) >= 0.10:
            marcar("risco", f"{saidas} de {len(conversas)} pessoas pediram para sair. Revise a mensagem de abordagem.", 25)
        elif saidas / len(conversas) >= 0.05:
            marcar("aviso", f"{saidas} de {len(conversas)} pessoas pediram para sair.", 12)
        if len(conversas) >= 20 and respondidas / len(conversas) < 0.05:
            marcar("aviso", "Quase ninguém responde às abordagens: mensagem pouco personalizada aumenta o risco de denúncia.", 15)
        elif respondidas:
            marcar("ok", f"{respondidas} de {len(conversas)} pessoas responderam.")

    pontos = max(0, min(100, pontos))
    nivel = _nivel(pontos)
    dicas = [
        "Use um número secundário, nunca o seu principal.",
        "Mantenha o limite diário: ele sobe sozinho conforme o número ganha confiança (máximo " + str(FRIO_MAXIMO) + " por dia).",
        "Personalize a primeira mensagem e só abordem quem tem WhatsApp.",
        "Se alguém pedir para sair, o robô respeita na hora. Não insista.",
    ]
    if nivel != "boa":
        dicas.insert(0, "Reduza o ritmo hoje: pause as abordagens frias e deixe o robô só responder.")
    resposta = {
        "disponivel": True, "pontos": pontos, "nivel": nivel,
        "rotulo": {"boa": "Boa", "atencao": "Atenção", "risco": "Em risco"}[nivel],
        "sinais": sinais, "dicas": dicas, "dias_conectado": dias, "usadas_hoje": usados, "limite_hoje": limite,
    }
    _SAUDE[uid] = (_t.monotonic(), resposta)
    return resposta
