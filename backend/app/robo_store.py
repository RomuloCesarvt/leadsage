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
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from app import bancos
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
    # base de conhecimento do SDR: o que existe para vender e o que pode
    # ser concedido. O que nao estiver aqui, o robo nao inventa.
    "catalogo", "faq", "desconto_maximo",
    # o servico que o robo vende, em campos (ai_oferta)
    "oferta",
    # preenchidos pela conexao com um clique (app do LeadSage)
    "page_nome", "ig_usuario", "waba_id", "wa_pin",
)
SEGREDOS = ("app_secret", "wa_token", "page_token", "wa_pin")


# Quando o Firestore falha (cota do plano gratuito, rede), o app cai no banco
# temporario e quem pergunta recebe "nao existe". Guardar o instante da falha
# deixa a rota dizer "banco indisponivel" em vez de "chave revogada".
_FALHA = [0.0]


def firestore_falhou_agora(janela_s: float = 15.0) -> bool:
    return time.monotonic() - _FALHA[0] < janela_s


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


def _sql_primeiro() -> bool:
    """Com um Postgres no ar, o banco SQL e a fonte principal do robo e da nuvem. O Firestore (com cota diaria de leituras)
    fica so como origem de dados antigos: lidos uma vez, copiados para o SQL e dali em diante nunca mais lidos nem gravados."""
    return bancos.CONJUNTO.tem_postgres()


async def _sql_apagar(chave: str) -> None:
    async with AsyncSessionLocal() as s:
        row = (await s.execute(select(DBRobo).where(DBRobo.chave == chave))).scalar_one_or_none()
        if row:
            await s.delete(row)
            await s.commit()


async def _espelhar_sql(chave: str, uid: str, tipo: str, dados: Dict[str, Any]) -> None:
    """Copia no banco SQL o que acabou de ir para o Firestore.

    Sem isso, o que e gravado enquanto o Firestore aceita escrita mas recusa leitura (cota) some na hora de ler: a escrita
    foi para um lado e a leitura cai no outro. Com a copia, o SQL sempre tem o dado mais recente.
    """
    try:
        await _sql_put(chave, uid, tipo, dados)
    except Exception as exc:  # a copia e reforco: nunca derruba a gravacao principal
        print(f"Falha ao copiar no banco SQL ({chave}): {exc}")


def _mais_novo(a: Optional[Dict[str, Any]], b: Optional[Dict[str, Any]], campo: str = "atualizado") -> Optional[Dict[str, Any]]:
    """Entre duas copias do mesmo registro, a de `campo` mais recente (ISO). Uma so? Ela."""
    if not a:
        return b or None
    if not b:
        return a
    return b if str(b.get(campo) or "") > str(a.get(campo) or "") else a


# -------------------------------------------------------------- canal

async def canal_por_gancho(gancho: str) -> Optional[Dict[str, Any]]:
    if not gancho or not re.fullmatch(r"[A-Za-z0-9_-]{16,64}", gancho):
        return None
    chave = f"canal:{gancho}"
    try:
        no_sql = await _sql_get(chave)
    except Exception as exc:
        print(f"Falha ao ler o canal no SQL: {exc}")
        no_sql = None
    if no_sql and _sql_primeiro():
        return no_sql  # sem tocar no Firestore
    no_firestore = None
    if firestore_db is not None:
        try:
            doc = firestore_db.collection("robo_canais").document(gancho).get()
            no_firestore = doc.to_dict() if doc.exists else None
        except Exception as exc:
            _FALHA[0] = time.monotonic()
            print(f"Falha ao ler canal do robo: {exc}")
    escolhido = _mais_novo(no_firestore, no_sql)
    if escolhido is not None and escolhido is no_firestore and _sql_primeiro():
        await _espelhar_sql(chave, str(escolhido.get("uid") or ""), "canal", escolhido)  # dado antigo: passa para o SQL
    return escolhido


# O canal do usuario custa duas leituras no Firestore e e pedido em quase toda
# chamada do robo. Guardado por alguns segundos so quando veio do Firestore; toda
# escrita deste processo o esquece.
_CANAIS: Dict[str, Any] = {}
_CANAIS_TTL_S = 20


async def canal_do_usuario(uid: str) -> Optional[Dict[str, Any]]:
    guardado = _CANAIS.get(uid)
    if guardado and time.monotonic() - guardado[0] < _CANAIS_TTL_S:
        return dict(guardado[1])
    canal = await _canal_do_usuario(uid)
    if canal is not None and firestore_db is not None and not firestore_falhou_agora(2.0):
        _CANAIS[uid] = (time.monotonic(), dict(canal))
    return canal


async def _canal_do_usuario(uid: str) -> Optional[Dict[str, Any]]:
    candidatos: List[Optional[Dict[str, Any]]] = []
    try:
        candidatos.extend(await _sql_listar(uid, "canal"))
    except Exception as exc:
        print(f"Falha ao listar canais no SQL: {exc}")
    if candidatos and _sql_primeiro():
        return max(candidatos, key=lambda c: str((c or {}).get("atualizado") or ""))  # sem tocar no Firestore
    gancho = None
    if firestore_db is not None:
        try:
            doc = firestore_db.collection("users").document(uid).get()
            gancho = (doc.to_dict() or {}).get("robo_gancho") if doc.exists else None
        except Exception as exc:
            _FALHA[0] = time.monotonic()
            print(f"Falha ao ler o gancho do robo: {exc}")
    if gancho:
        candidatos.append(await canal_por_gancho(gancho))
    validos = [c for c in candidatos if c]
    return max(validos, key=lambda c: str(c.get("atualizado") or "")) if validos else None


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
    if _sql_primeiro():
        await _sql_put(f"canal:{gancho}", uid, "canal", atual)
        _CANAIS.pop(uid, None)
        return atual
    if firestore_db is not None:
        try:
            firestore_db.collection("robo_canais").document(gancho).set(atual)
            firestore_db.collection("users").document(uid).set(
                {"robo_gancho": gancho}, merge=True
            )
            await _espelhar_sql(f"canal:{gancho}", uid, "canal", atual)
            _CANAIS.pop(uid, None)
            return atual
        except Exception as exc:
            _FALHA[0] = time.monotonic()
            print(f"Falha ao gravar canal do robo: {exc}")
    await _sql_put(f"canal:{gancho}", uid, "canal", atual)
    return atual


def visao_publica(canal: Optional[Dict[str, Any]], url_base: str) -> Dict[str, Any]:
    """O que a tela pode ver: nenhum segredo, so se ele existe."""
    c = canal or {}
    saida = {k: c.get(k, "") for k in CAMPOS_CANAL if k not in SEGREDOS}
    saida["ativo"] = bool(c.get("ativo"))
    saida["oferta"] = c.get("oferta") or {}
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
    saida["telegram_pronto"] = bool(c.get("tg_token") and c.get("tg_secret"))
    from app import conector_whatsapp
    saida.update(conector_whatsapp.visao(c))
    saida["tg_username"] = c.get("tg_username", "")
    # paginas autorizadas aguardando escolha: so nome e id, nunca o token
    saida["paginas_pendentes"] = [
        {"id": p.get("id", ""), "nome": p.get("nome", ""), "ig_usuario": p.get("ig_usuario", "")}
        for p in c.get("paginas_pendentes") or []
    ]
    return saida


# ----------------------------------------------------------- conversas

async def obter_conversa(uid: str, cid: str) -> Optional[Dict[str, Any]]:
    try:
        no_sql = await _sql_get(f"conversa:{uid}:{cid}")
    except Exception as exc:
        print(f"Falha ao ler conversa no SQL: {exc}")
        no_sql = None
    if no_sql and _sql_primeiro():
        return no_sql
    if firestore_db is not None:
        try:
            doc = (
                firestore_db.collection("users").document(uid)
                .collection("robo_conversas").document(cid).get()
            )
            no_firestore = doc.to_dict() if doc.exists else None
        except Exception as exc:
            print(f"Falha ao ler conversa: {exc}")
            return no_sql
        escolhido = _mais_novo(no_firestore, no_sql)
        if escolhido is not None and escolhido is no_firestore and _sql_primeiro():
            await _espelhar_sql(f"conversa:{uid}:{cid}", uid, "conversa", escolhido)
        return escolhido
    return no_sql


async def salvar_conversa(uid: str, conversa: Dict[str, Any]) -> None:
    conversa["mensagens"] = (conversa.get("mensagens") or [])[-MAX_MENSAGENS:]
    if _sql_primeiro():
        await _sql_put(f"conversa:{uid}:{conversa['id']}", uid, "conversa", conversa)
        return
    if firestore_db is not None:
        try:
            (
                firestore_db.collection("users").document(uid)
                .collection("robo_conversas").document(conversa["id"]).set(conversa)
            )
            await _espelhar_sql(f"conversa:{uid}:{conversa['id']}", uid, "conversa", conversa)
            return
        except Exception as exc:
            print(f"Falha ao gravar conversa: {exc}")
    await _sql_put(f"conversa:{uid}:{conversa['id']}", uid, "conversa", conversa)


async def listar_conversas(uid: str) -> List[Dict[str, Any]]:
    """Sem as mensagens: a lista mostra so a ultima."""
    todas: List[Dict[str, Any]] = []
    if _sql_primeiro():
        todas = await _sql_listar(uid, "conversa")
        if not await _sql_get(f"sistema:conversas_quente:{uid}") and firestore_db is not None:
            # primeira vez: copia as conversas antigas do Firestore para o SQL (uma leitura so); depois nunca mais
            try:
                docs = firestore_db.collection("users").document(uid).collection("robo_conversas").stream()
                antigas = [d.to_dict() for d in docs]
                por_id = {c.get("id"): c for c in todas}
                for c in antigas:
                    atual = por_id.get(c.get("id"))
                    if c.get("id") and (atual is None or str(c.get("atualizado") or "") > str(atual.get("atualizado") or "")):
                        await _espelhar_sql(f"conversa:{uid}:{c['id']}", uid, "conversa", c)
                        por_id[c["id"]] = c
                await _espelhar_sql(f"sistema:conversas_quente:{uid}", uid, "sistema", {"em": agora()})
                todas = list(por_id.values())
            except Exception as exc:
                _FALHA[0] = time.monotonic()
                print(f"Falha ao copiar as conversas do Firestore: {exc}")
    elif firestore_db is not None:
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
        r["silencio"] = c.get("silencio", "")
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

# usuario_meta: quem do Facebook autorizou — e por ele que chega o pedido
# de exclusao de dados quando a pessoa remove o LeadSage da conta dela.
TIPOS_DE_ATIVO = ("pagina", "instagram", "whatsapp", "usuario_meta", "conector")


def _chave_ativo(tipo: str, ativo_id: str) -> str:
    return f"{tipo}_{re.sub(r'[^0-9A-Za-z]', '', ativo_id or '')}"


async def registrar_ativo(tipo: str, ativo_id: str, uid: str, gancho: str) -> None:
    if tipo not in TIPOS_DE_ATIVO or not ativo_id:
        return
    chave = _chave_ativo(tipo, ativo_id)
    dados = {"uid": uid, "gancho": gancho, "tipo": tipo, "id": ativo_id}
    if _sql_primeiro():
        await _sql_put(f"ativo:{chave}", uid, "ativo", dados)
        return
    if firestore_db is not None:
        try:
            firestore_db.collection("robo_ativos").document(chave).set(dados)
            await _espelhar_sql(f"ativo:{chave}", uid, "ativo", dados)
            return
        except Exception as exc:
            _FALHA[0] = time.monotonic()
            print(f"Falha ao registrar ativo do robo: {exc}")
    await _sql_put(f"ativo:{chave}", uid, "ativo", dados)


async def esquecer_ativo(tipo: str, ativo_id: str) -> None:
    if not ativo_id:
        return
    chave = _chave_ativo(tipo, ativo_id)
    if firestore_db is not None:
        try:
            firestore_db.collection("robo_ativos").document(chave).delete()
        except Exception as exc:
            print(f"Falha ao remover ativo do robo: {exc}")
    await _sql_apagar(f"ativo:{chave}")


# Quem tem o WhatsApp ligado na nuvem: uid -> gancho do canal. O servico da nuvem le esta lista.
_NUVEM_DOC = ("sistema", "nuvem")


async def registrar_nuvem(uid: str, gancho: str) -> None:
    if _sql_primeiro():
        lista = await _sql_get("sistema:nuvem") or {}
        lista[uid] = gancho
        await _sql_put("sistema:nuvem", "sistema", "sistema", lista)
        return
    if firestore_db is not None:
        try:
            firestore_db.collection(_NUVEM_DOC[0]).document(_NUVEM_DOC[1]).set({uid: gancho}, merge=True)
            copia = await _sql_get("sistema:nuvem") or {}
            copia[uid] = gancho
            await _espelhar_sql("sistema:nuvem", "sistema", "sistema", copia)
            return
        except Exception as exc:
            _FALHA[0] = time.monotonic()
            print(f"Falha ao registrar a nuvem: {exc}")
    lista = await _sql_get("sistema:nuvem") or {}
    lista[uid] = gancho
    await _sql_put("sistema:nuvem", "sistema", "sistema", lista)


async def esquecer_nuvem(uid: str) -> None:
    if firestore_db is not None and not _sql_primeiro():
        try:
            from firebase_admin import firestore as _fs
            firestore_db.collection(_NUVEM_DOC[0]).document(_NUVEM_DOC[1]).update({uid: _fs.DELETE_FIELD})
        except Exception as exc:
            print(f"Falha ao remover da nuvem: {exc}")
    lista = await _sql_get("sistema:nuvem") or {}
    if uid in lista:
        lista.pop(uid)
        await _sql_put("sistema:nuvem", "sistema", "sistema", lista)


async def listar_nuvem() -> Dict[str, str]:
    """Quem tem o WhatsApp na nuvem. No SQL depois da primeira copia do Firestore ("quente"); antes disso une os dois."""
    if _sql_primeiro():
        no_sql = await _sql_get("sistema:nuvem") or {}
        if await _sql_get("sistema:nuvem_quente"):
            return no_sql
        if firestore_db is not None:
            try:
                doc = firestore_db.collection(_NUVEM_DOC[0]).document(_NUVEM_DOC[1]).get()
                uniao = {**(dict(doc.to_dict() or {}) if doc.exists else {}), **no_sql}
                await _espelhar_sql("sistema:nuvem", "sistema", "sistema", uniao)
                await _espelhar_sql("sistema:nuvem_quente", "sistema", "sistema", {"em": agora()})
                return uniao
            except Exception as exc:
                _FALHA[0] = time.monotonic()
                print(f"Falha ao copiar a lista da nuvem do Firestore: {exc}")
        return no_sql  # parcial: so o que ja esta no SQL
    if firestore_db is not None:
        try:
            doc = firestore_db.collection(_NUVEM_DOC[0]).document(_NUVEM_DOC[1]).get()
            no_firestore = dict(doc.to_dict() or {}) if doc.exists else {}
            return {**(await _sql_get("sistema:nuvem") or {}), **no_firestore}
        except Exception as exc:
            _FALHA[0] = time.monotonic()
            print(f"Falha ao listar a nuvem: {exc}")
    return await _sql_get("sistema:nuvem") or {}


# Quem clicou em "Desligar": so esses perdem o WhatsApp. Fica marcado ate o servico da nuvem confirmar.
async def marcar_nuvem_sair(uid: str) -> None:
    if firestore_db is not None and not _sql_primeiro():
        try:
            firestore_db.collection("sistema").document("nuvem_sair").set({uid: agora()}, merge=True)
            copia = await _sql_get("sistema:nuvem_sair") or {}
            copia[uid] = agora()
            await _espelhar_sql("sistema:nuvem_sair", "sistema", "sistema", copia)
            return
        except Exception as exc:
            _FALHA[0] = time.monotonic()
            print(f"Falha ao marcar a saida da nuvem: {exc}")
    lista = await _sql_get("sistema:nuvem_sair") or {}
    lista[uid] = agora()
    await _sql_put("sistema:nuvem_sair", "sistema", "sistema", lista)


async def limpar_nuvem_sair(uid: str) -> None:
    if firestore_db is not None and not _sql_primeiro():
        try:
            from firebase_admin import firestore as _fs
            firestore_db.collection("sistema").document("nuvem_sair").update({uid: _fs.DELETE_FIELD})
        except Exception as exc:
            print(f"Falha ao limpar a saida da nuvem: {exc}")
    lista = await _sql_get("sistema:nuvem_sair") or {}
    if uid in lista:
        lista.pop(uid)
        await _sql_put("sistema:nuvem_sair", "sistema", "sistema", lista)


async def listar_nuvem_sair() -> List[str]:
    if _sql_primeiro():
        # pedidos de desligar sao passageiros (o servico confirma logo): no SQL nunca se importa o que ficou velho no Firestore
        return sorted((await _sql_get("sistema:nuvem_sair") or {}).keys())
    if firestore_db is not None:
        try:
            doc = firestore_db.collection("sistema").document("nuvem_sair").get()
            no_firestore = list((doc.to_dict() or {}).keys()) if doc.exists else []
            return sorted(set(no_firestore) | set((await _sql_get("sistema:nuvem_sair") or {}).keys()))
        except Exception as exc:
            _FALHA[0] = time.monotonic()
            print(f"Falha ao listar saidas da nuvem: {exc}")
    return list((await _sql_get("sistema:nuvem_sair") or {}).keys())


async def canal_por_ativo(tipo: str, ativo_id: str) -> Optional[Dict[str, Any]]:
    """A configuracao do cliente dono daquela pagina, conta ou numero."""
    if not ativo_id:
        return None
    chave = _chave_ativo(tipo, ativo_id)
    try:
        dados = await _sql_get(f"ativo:{chave}")
    except Exception as exc:
        print(f"Falha ao ler ativo no SQL: {exc}")
        dados = None
    if dados is None and firestore_db is not None:
        try:
            doc = firestore_db.collection("robo_ativos").document(chave).get()
            dados = doc.to_dict() if doc.exists else None
            if dados and _sql_primeiro():
                await _espelhar_sql(f"ativo:{chave}", str(dados.get("uid") or ""), "ativo", dados)  # dado antigo: passa para o SQL
        except Exception as exc:
            _FALHA[0] = time.monotonic()
            print(f"Falha ao ler ativo do robo: {exc}")
    if not dados:
        return None
    return await canal_por_gancho(dados.get("gancho", ""))


async def substituir_canal(uid: str, canal: Dict[str, Any]) -> Dict[str, Any]:
    """Grava o canal inteiro, inclusive apagando campos.

    `salvar_canal` nunca apaga segredo (o formulario chega vazio). Ao
    desconectar uma pagina, apagar e exatamente o que se quer.
    """
    canal["atualizado"] = agora()
    if _sql_primeiro():
        await _sql_put(f"canal:{canal['gancho']}", uid, "canal", canal)
        _CANAIS.pop(canal.get("uid", ""), None)
        return canal
    if firestore_db is not None:
        try:
            firestore_db.collection("robo_canais").document(canal["gancho"]).set(canal)
            await _espelhar_sql(f"canal:{canal['gancho']}", uid, "canal", canal)
            _CANAIS.pop(canal.get("uid", ""), None)
            return canal
        except Exception as exc:
            _FALHA[0] = time.monotonic()
            print(f"Falha ao gravar canal do robo: {exc}")
    await _sql_put(f"canal:{canal['gancho']}", uid, "canal", canal)
    return canal


async def apagar_conversas(uid: str) -> int:
    """Remove todas as conversas do robo de um usuario (exclusao de dados)."""
    total = 0
    if firestore_db is not None:
        try:
            ref = firestore_db.collection("users").document(uid).collection("robo_conversas")
            for doc in ref.stream():
                doc.reference.delete()
                total += 1
            return total
        except Exception as exc:
            print(f"Falha ao apagar conversas: {exc}")
    async with AsyncSessionLocal() as s:
        rows = (
            await s.execute(select(DBRobo).where(DBRobo.uid == uid, DBRobo.tipo == "conversa"))
        ).scalars().all()
        for row in rows:
            await s.delete(row)
            total += 1
        await s.commit()
    return total


async def registrar_exclusao(codigo: str, conversas_apagadas: int) -> None:
    """Comprovante do pedido de exclusao: so codigo, data e contagem.

    Nao guarda quem pediu — guardar isso contradiria a propria exclusao.
    """
    dados = {"codigo": codigo, "em": agora(), "conversas_apagadas": conversas_apagadas}
    if firestore_db is not None:
        try:
            firestore_db.collection("exclusoes_meta").document(codigo).set(dados)
            return
        except Exception as exc:
            print(f"Falha ao registrar exclusao: {exc}")
    await _sql_put(f"exclusao:{codigo}", "", "exclusao", dados)


async def ler_exclusao(codigo: str) -> Optional[Dict[str, Any]]:
    if not re.fullmatch(r"[0-9a-f]{16}", codigo or ""):
        return None
    if firestore_db is not None:
        try:
            doc = firestore_db.collection("exclusoes_meta").document(codigo).get()
            return doc.to_dict() if doc.exists else None
        except Exception as exc:
            print(f"Falha ao ler exclusao: {exc}")
    return await _sql_get(f"exclusao:{codigo}")
