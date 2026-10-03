"""Armazenamento do robo de atendimento.

Dois tipos de registro:

- **canal**: a conexao do usuario com a Meta (tokens, segredo do app,
  ids do numero e da pagina). Fica num documento de nivel raiz chaveado
  pelo *gancho* — o trecho aleatorio da URL do webhook — porque a Meta
  chama essa URL sem dizer de quem e a mensagem. Uma leitura pelo gancho
  resolve o dono, sem varrer usuarios.

- **conversa**: o historico com cada contato, com as mensagens dentro do
  proprio documento. Conversa de prospeccao e curta; o teto de mensagens
  mantem o documento longe do limite de 1 MB do Firestore.

Firestore quando ha credencial, SQLite no dev — como o resto do app.
"""
import re
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from app.database import AsyncSessionLocal, DBRobo
from app.firebase_config import db as firestore_db

# Guardado no documento da conversa; o resto se perde (o robo so le as
# ultimas de qualquer forma).
MAX_MENSAGENS = 200

CAMPOS_CANAL = (
    # app da Meta: assina cada webhook
    "app_secret",
    # WhatsApp Cloud API
    "wa_token", "wa_phone_id",
    # Messenger e Instagram (ambos respondem com o token da pagina)
    "page_id", "page_token", "ig_id",
    # comportamento do robo
    "ativo", "objetivo", "instrucoes", "link_agenda", "nome_assistente",
    # preenchidos pela conexao com um clique (app do LeadSage)
    "page_nome", "ig_usuario", "waba_id", "wa_pin",
)
SEGREDOS = ("app_secret", "wa_token", "page_token", "wa_pin")


def agora() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def id_da_conversa(canal: str, contato: str) -> str:
    limpo = re.sub(r"[^A-Za-z0-9_-]", "", contato or "")[:80]
    return f"{canal}_{limpo}"


# ------------------------------------------------------------- sqlite

async def _sql_get(chave: str) -> Optional[Dict[str, Any]]:
    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == chave))).scalar_one_or_none()
        return dict(row.data or {}) if row else None


async def _sql_put(chave: str, uid: str, tipo: str, data: Dict[str, Any]) -> None:
    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == chave))).scalar_one_or_none()
        if row:
            row.data = data
            row.atualizado = agora()
        else:
            s.add(DBRobo(chave=chave, uid=uid, tipo=tipo, data=data, atualizado=agora()))
        await s.commit()


async def _sql_listar(uid: str, tipo: str) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as s:
        rows = (
            await s.execute(select(DBRobo).where(DBRobo.uid == uid, DBRobo.tipo == tipo))
        ).scalars().all()
        return [dict(r.data or {}) for r in rows]


# -------------------------------------------------------------- canal

async def canal_por_gancho(gancho: str) -> Optional[Dict[str, Any]]:
    if not gancho or not re.fullmatch(r"[A-Za-z0-9_-]{16,64}", gancho):
        return None
    if firestore_db is not None:
        try:
            doc = firestore_db.collection("robo_canais").document(gancho).get()
            return doc.to_dict() if doc.exists else None
        except Exception as exc:
            print(f"Falha ao ler canal do robo: {exc}")
    return await _sql_get(f"canal:{gancho}")


async def canal_do_usuario(uid: str) -> Optional[Dict[str, Any]]:
    gancho = None
    if firestore_db is not None:
        try:
            doc = firestore_db.collection("users").document(uid).get()
            gancho = (doc.to_dict() or {}).get("robo_gancho") if doc.exists else None
        except Exception as exc:
            print(f"Falha ao ler o gancho do robo: {exc}")
    if gancho:
        return await canal_por_gancho(gancho)

    for c in await _sql_listar(uid, "canal"):
        return c
    return None


async def salvar_canal(uid: str, email: str, mudancas: Dict[str, Any]) -> Dict[str, Any]:
    """Grava a conexao. Segredo vazio nao apaga o que ja estava salvo.

    A tela nunca recebe o segredo de volta (ve so "configurado"), entao
    o formulario chega com o campo vazio. Tratar vazio como "apagar"
    derrubaria a conexao a cada vez que a pessoa ajustasse as instrucoes.
    """
    atual = await canal_do_usuario(uid) or {}

    if not atual.get("gancho"):
        atual["gancho"] = secrets.token_urlsafe(24)
        # a Meta manda o verify_token uma vez, ao cadastrar o webhook; ele
        # e diferente do gancho para a URL sozinha nao bastar
        atual["verify_token"] = secrets.token_urlsafe(18)
        atual["criado"] = agora()

    for campo in CAMPOS_CANAL:
        if campo not in mudancas or mudancas[campo] is None:
            continue
        valor = mudancas[campo]
        if campo in SEGREDOS and not str(valor).strip():
            continue
        atual[campo] = valor.strip() if isinstance(valor, str) else valor

    atual["uid"] = uid
    atual["email"] = email or atual.get("email", "")
    atual["atualizado"] = agora()

    gancho = atual["gancho"]
    if firestore_db is not None:
        try:
            firestore_db.collection("robo_canais").document(gancho).set(atual)
            firestore_db.collection("users").document(uid).set(
                {"robo_gancho": gancho}, merge=True
            )
            return atual
        except Exception as exc:
            print(f"Falha ao gravar canal do robo: {exc}")
    await _sql_put(f"canal:{gancho}", uid, "canal", atual)
    return atual


def visao_publica(canal: Optional[Dict[str, Any]], url_base: str) -> Dict[str, Any]:
    """O que a tela pode ver: nenhum segredo, so se ele existe."""
    c = canal or {}
    saida = {k: c.get(k, "") for k in CAMPOS_CANAL if k not in SEGREDOS}
    saida["ativo"] = bool(c.get("ativo"))
    for segredo in SEGREDOS:
        saida[f"tem_{segredo}"] = bool(c.get(segredo))
    saida["webhook_url"] = f"{url_base}/api/robo/webhook/{c['gancho']}" if c.get("gancho") else ""
    saida["verify_token"] = c.get("verify_token", "")
    # Pelo app do LeadSage a assinatura e conferida com o segredo do app
    # do sistema; no modo manual, com o segredo do app do proprio cliente.
    pelo_sistema = c.get("modo") == "app"
    assinatura_ok = pelo_sistema or bool(c.get("app_secret"))
    saida["modo"] = c.get("modo") or "manual"
    saida["whatsapp_pronto"] = bool(c.get("wa_token") and c.get("wa_phone_id") and assinatura_ok)
    saida["meta_pronto"] = bool(c.get("page_token") and c.get("page_id") and assinatura_ok)
    # paginas autorizadas aguardando escolha: so nome e id, nunca o token
    saida["paginas_pendentes"] = [
        {"id": p.get("id", ""), "nome": p.get("nome", ""), "ig_usuario": p.get("ig_usuario", "")}
        for p in c.get("paginas_pendentes") or []
    ]
    return saida


# ----------------------------------------------------------- conversas

async def obter_conversa(uid: str, cid: str) -> Optional[Dict[str, Any]]:
    if firestore_db is not None:
        try:
            doc = (
                firestore_db.collection("users").document(uid)
                .collection("robo_conversas").document(cid).get()
            )
            return doc.to_dict() if doc.exists else None
        except Exception as exc:
            print(f"Falha ao ler conversa: {exc}")
    return await _sql_get(f"conversa:{uid}:{cid}")


async def salvar_conversa(uid: str, conversa: Dict[str, Any]) -> None:
    conversa["mensagens"] = (conversa.get("mensagens") or [])[-MAX_MENSAGENS:]
    if firestore_db is not None:
        try:
            (
                firestore_db.collection("users").document(uid)
                .collection("robo_conversas").document(conversa["id"]).set(conversa)
            )
            return
        except Exception as exc:
            print(f"Falha ao gravar conversa: {exc}")
    await _sql_put(f"conversa:{uid}:{conversa['id']}", uid, "conversa", conversa)


async def listar_conversas(uid: str) -> List[Dict[str, Any]]:
    """Sem as mensagens: a lista mostra so a ultima."""
    todas: List[Dict[str, Any]] = []
    if firestore_db is not None:
        try:
            docs = (
                firestore_db.collection("users").document(uid)
                .collection("robo_conversas").stream()
            )
            todas = [d.to_dict() for d in docs]
        except Exception as exc:
            print(f"Falha ao listar conversas: {exc}")
            todas = await _sql_listar(uid, "conversa")
    else:
        todas = await _sql_listar(uid, "conversa")

    resumo = []
    for c in todas:
        r = {k: v for k, v in c.items() if k != "mensagens"}
        msgs = c.get("mensagens") or []
        r["ultima"] = msgs[-1] if msgs else None
        r["total"] = len(msgs)
        resumo.append(r)
    resumo.sort(key=lambda c: c.get("atualizado") or "", reverse=True)
    return resumo


# ------------------------------------------------------------- ativos
#
# Com o app do LeadSage, todas as mensagens de todos os clientes chegam no
# mesmo webhook. O que diz de quem e cada uma e o ativo que a recebeu: o
# id da pagina, da conta do Instagram ou do numero do WhatsApp. Este
# indice resolve isso em uma leitura.

TIPOS_DE_ATIVO = ("pagina", "instagram", "whatsapp")


def _chave_ativo(tipo: str, ativo_id: str) -> str:
    return f"{tipo}_{re.sub(r'[^0-9A-Za-z]', '', ativo_id or '')}"


async def registrar_ativo(tipo: str, ativo_id: str, uid: str, gancho: str) -> None:
    if tipo not in TIPOS_DE_ATIVO or not ativo_id:
        return
    chave = _chave_ativo(tipo, ativo_id)
    dados = {"uid": uid, "gancho": gancho, "tipo": tipo, "id": ativo_id}
    if firestore_db is not None:
        try:
            firestore_db.collection("robo_ativos").document(chave).set(dados)
            return
        except Exception as exc:
            print(f"Falha ao registrar ativo do robo: {exc}")
    await _sql_put(f"ativo:{chave}", uid, "ativo", dados)


async def esquecer_ativo(tipo: str, ativo_id: str) -> None:
    if not ativo_id:
        return
    chave = _chave_ativo(tipo, ativo_id)
    if firestore_db is not None:
        try:
            firestore_db.collection("robo_ativos").document(chave).delete()
            return
        except Exception as exc:
            print(f"Falha ao remover ativo do robo: {exc}")
    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == f"ativo:{chave}"))).scalar_one_or_none()
        if row:
            await s.delete(row)
            await s.commit()


async def canal_por_ativo(tipo: str, ativo_id: str) -> Optional[Dict[str, Any]]:
    """A configuracao do cliente dono daquela pagina, conta ou numero."""
    if not ativo_id:
        return None
    chave = _chave_ativo(tipo, ativo_id)
    dados = None
    if firestore_db is not None:
        try:
            doc = firestore_db.collection("robo_ativos").document(chave).get()
            dados = doc.to_dict() if doc.exists else None
        except Exception as exc:
            print(f"Falha ao ler ativo do robo: {exc}")
    if dados is None:
        dados = await _sql_get(f"ativo:{chave}")
    if not dados:
        return None
    return await canal_por_gancho(dados.get("gancho", ""))


async def substituir_canal(uid: str, canal: Dict[str, Any]) -> Dict[str, Any]:
    """Grava o canal inteiro, inclusive apagando campos.

    `salvar_canal` nunca apaga segredo (o formulario chega vazio). Ao
    desconectar uma pagina, apagar e exatamente o que se quer.
    """
    canal["atualizado"] = agora()
    if firestore_db is not None:
        try:
            firestore_db.collection("robo_canais").document(canal["gancho"]).set(canal)
            return canal
        except Exception as exc:
            print(f"Falha ao gravar canal do robo: {exc}")
    await _sql_put(f"canal:{canal['gancho']}", uid, "canal", canal)
    return canal
