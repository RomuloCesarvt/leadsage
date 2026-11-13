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
import time
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from app.database import AsyncSessionLocal, DBRobo
from app.firebase_config import db as firestore_db
from app import agentes
from app import robo_store
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
    "name", "company", "phone", "email", "niche", "city", "location", "website", "instagram",
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


# Lead excluído pela pessoa: fica uma lápide. Sem ela, qualquer coisa automática (a aba antiga do navegador sincronizando, a fila de envio, o
# robô registrando quem respondeu) recriava o card no mesmo instante e o lead "voltava". Só uma ação da pessoa (salvar de novo, mover, agente) a remove.
TIPO_LAPIDE = "pipeline_excluido"


def _chave_lapide(uid: str, lead_id: str) -> str:
    return f"pipeline-excluido:{uid}:{lead_id}"


async def excluido_em(uid: str, lead_id: str) -> str:
    """Quando a pessoa excluiu este lead (vazio se nunca excluiu ou se já o salvou de novo)."""
    try:
        d = await robo_store._sql_get(_chave_lapide(uid, lead_id))
    except Exception:
        return ""
    return str((d or {}).get("em") or "")


async def limpar_lapide(uid: str, lead_id: str) -> None:
    """A pessoa quer o lead de volta (salvou de novo, moveu, escolheu agente): a lápide sai."""
    try:
        async with AsyncSessionLocal() as s:
            row = (await s.execute(select(DBRobo).where(DBRobo.chave == _chave_lapide(uid, lead_id)))).scalar_one_or_none()
            if row:
                await s.delete(row)
                await s.commit()
    except Exception as exc:
        print(f"Pipeline: não limpou a lápide do lead: {exc}")


async def _lapides(uid: str) -> Dict[str, str]:
    try:
        async with AsyncSessionLocal() as s:
            rows = (await s.execute(select(DBRobo).where(DBRobo.uid == uid, DBRobo.tipo == TIPO_LAPIDE))).scalars().all()
        return {str(r.chave).rsplit(":", 1)[-1]: str((r.data or {}).get("em") or "") for r in rows}
    except Exception:
        return {}


def _doc(uid: str, lead_id: str):
    return firestore_db.collection("users").document(uid).collection("pipeline").document(lead_id)


COLECAO = "pipeline"


async def _importar(uid: str) -> Optional[List[Dict[str, Any]]]:
    """Copia o pipeline antigo do Firestore para o SQL, uma vez por usuário (nada é apagado lá).

    Cada item só entra se o SQL ainda não tem ou se o do Firestore é mais novo: o que já foi gravado no SQL enquanto o Firestore estava sem cota
    não é sobrescrito. Se o Firestore recusar a leitura, nada é marcado e a tentativa se repete depois de alguns minutos."""
    try:
        itens = [d.to_dict() for d in firestore_db.collection("users").document(uid).collection("pipeline").stream()]
    except Exception as exc:
        robo_store._FALHA[0] = time.monotonic()
        robo_store.adiar_importacao(uid, COLECAO)
        print(f"Importação do pipeline adiada (Firestore): {exc}")
        return None
    for i in itens:
        if not i.get("id"):
            continue
        atual = await robo_store._sql_get(_chave(uid, i["id"]))
        if atual is None or str(i.get("atualizado") or "") > str(atual.get("atualizado") or ""):
            await robo_store._sql_put(_chave(uid, i["id"]), uid, "pipeline", i)
    await robo_store.marcar_importado(uid, COLECAO)
    return itens


async def _garantir_importado(uid: str) -> None:
    """Com o Postgres no ar: traz o pipeline antigo do Firestore uma única vez; depois o SQL é a única fonte."""
    if firestore_db is not None and not await robo_store.sql_e_a_fonte(uid, COLECAO) and robo_store.pode_tentar_importar(uid, COLECAO):
        await _importar(uid)


async def _ler(uid: str, lead_id: str) -> Optional[Dict[str, Any]]:
    if robo_store._sql_primeiro():
        await _garantir_importado(uid)
    elif firestore_db is not None:
        try:
            doc = _doc(uid, lead_id).get()
            return doc.to_dict() if doc.exists else None
        except Exception as exc:
            print(f"Falha ao ler o pipeline: {exc}")
    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == _chave(uid, lead_id)))).scalar_one_or_none()
        return dict(row.data or {}) if row else None


# O Firestore cobra por documento lido e a tela pergunta a lista com frequencia:
# guardar a resposta por alguns segundos corta a conta sem esconder mudanca
# (toda escrita deste processo esvazia o guardado do dono).
_LISTA: Dict[str, Any] = {}
_LISTA_TTL_S = 25


def _esquecer_lista(uid: str) -> None:
    _LISTA.pop(uid, None)


async def _gravar(uid: str, item: Dict[str, Any]) -> None:
    _esquecer_lista(uid)
    item["atualizado"] = agora()
    if firestore_db is not None and not robo_store._sql_primeiro():
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
    guardado = _LISTA.get(uid)
    if guardado and time.monotonic() - guardado[0] < _LISTA_TTL_S:
        return [dict(i) for i in guardado[1]]
    itens: List[Dict[str, Any]] = []
    lido = False
    sql_principal = robo_store._sql_primeiro()
    if sql_principal:
        await _garantir_importado(uid)
    elif firestore_db is not None:
        try:
            itens = [d.to_dict() for d in firestore_db.collection("users").document(uid).collection("pipeline").stream()]
            lido = True
        except Exception as exc:
            print(f"Falha ao listar o pipeline: {exc}")
    if not lido:
        async with AsyncSessionLocal() as s:
            rows = (await s.execute(select(DBRobo).where(DBRobo.uid == uid, DBRobo.tipo == "pipeline"))).scalars().all()
            itens = [dict(r.data or {}) for r in rows]
        lido = sql_principal          # com o Postgres como fonte, a leitura também pode ser guardada por alguns segundos
    lapides = await _lapides(uid)
    if lapides:
        # excluído pela pessoa e não mexido depois: não aparece (cobre cópia antiga no Firestore ou no outro banco)
        itens = [i for i in itens if not (i.get("id") in lapides and str(i.get("atualizado") or "") <= lapides[i["id"]])]
    for i in itens:
        i["etapa"] = etapa_valida(i.get("etapa", "")) or "Novo Lead"
    itens.sort(key=lambda i: i.get("atualizado") or "", reverse=True)
    if lido:
        _LISTA[uid] = (time.monotonic(), [dict(i) for i in itens])
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
        lapide = await excluido_em(uid, lead_id)
        if lapide:
            # a pessoa excluiu este lead. Só volta se ela o salvou DEPOIS (salvo_em mais novo que a exclusão); a aba antiga com a cópia velha não conta
            if str(lead.get("salvo_em") or "") > lapide:
                await limpar_lapide(uid, lead_id)
            else:
                continue
        foto = _foto(lead)
        if existente and origem != "busca" and existente.get("origem") == "busca":
            existente["origem"] = origem
            await _gravar(uid, existente)
        if existente and all((existente.get("lead") or {}).get(k) == v for k, v in foto.items()):
            continue
        await registrar(uid, lead, etapa=lead.get("pipeline_stage") or "", origem=origem)
        novos += existente is None
    return novos


async def definir_reuniao(uid: str, lead_id: str, em: Optional[str], texto: str = "", por: str = "voce") -> Optional[Dict[str, Any]]:
    """Guarda o instante da reunião no card (`reuniao_em`, UTC) e coloca o lead em "Reunião" (agendado). `em` vazio desmarca a reunião."""
    item = await _ler(uid, lead_id)
    if item is None:
        return None
    if not em:
        item.pop("reuniao_em", None)
        item.pop("reuniao_texto", None)
        item.pop("reuniao_por", None)
        await _gravar(uid, item)
        return item
    item["reuniao_em"] = em
    item["reuniao_texto"] = texto
    item["reuniao_por"] = por
    await _gravar(uid, item)
    movido = await mover(uid, lead_id, "Reunião", motivo="reunião marcada" + (f" ({texto})" if texto else ""), por=por)
    return movido or await _ler(uid, lead_id)


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


async def definir_agente(uid: str, lead_id: str, agente: str) -> Optional[Dict[str, Any]]:
    """Escolhe quem atende o lead (ver app/agentes.py). None quando o lead não está no pipeline."""
    escolhido = agentes.valido(agente)
    if not escolhido:
        raise ValueError(f"Agente desconhecido: {agente}")
    item = await _ler(uid, lead_id)
    if item is None:
        return None
    if (item.get("agente") or agentes.PADRAO) == escolhido:
        return item
    item["agente"] = escolhido
    item["agente_em"] = agora()
    await _gravar(uid, item)
    return item


async def encerrar(uid: str, lead_id: str, motivo: str) -> Optional[Dict[str, Any]]:
    """O lead SAI de Meus Leads e do pipeline (a tela esconde o que está encerrado), mas o registro fica: é ele que evita contatar de novo
    quem já recebeu a régua inteira. Se a pessoa voltar a falar, `reabrir` o traz de volta."""
    item = await _ler(uid, lead_id)
    if item is None or item.get("encerrado"):
        return item
    item["encerrado"] = {"em": agora(), "motivo": motivo[:200]}
    await _gravar(uid, item)
    return item


async def reabrir(uid: str, lead_id: str) -> Optional[Dict[str, Any]]:
    """Desfaz o encerramento (o lead respondeu depois de a régua acabar)."""
    item = await _ler(uid, lead_id)
    if item is None or not item.get("encerrado"):
        return item
    item.pop("encerrado", None)
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
    _esquecer_lista(uid)
    # a lápide primeiro: mesmo que a remoção abaixo falhe em um dos bancos, o lead não volta
    try:
        await robo_store._sql_put(_chave_lapide(uid, lead_id), uid, TIPO_LAPIDE, {"em": agora()})
    except Exception as exc:
        print(f"Pipeline: não gravou a lápide do lead excluído: {exc}")
    # com o SQL como fonte o Firestore nem é tocado; se este usuário ainda não foi copiado de lá, apaga lá também (senão voltaria na cópia)
    if firestore_db is not None and not (robo_store._sql_primeiro() and await robo_store.ja_importado(uid, COLECAO)):
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
