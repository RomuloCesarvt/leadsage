"""O caminho de uma mensagem recebida ate a resposta do robo.

Ordem das decisoes, da mais barata para a mais cara:

1. ja processamos esta mensagem? (a Meta reenvia quando demora)
2. a pessoa pediu para sair antes? silencio, para sempre
3. o robo esta ligado — no geral e nesta conversa?
4. o plano do dono inclui o robo?
5. regras fixas (saida, midia, laco com outro robo)
6. so entao a IA, e so entao o credito

Cada desvio deixa a conversa marcada com o motivo, para o dono ver na
tela por que o robo nao respondeu — robo que para em silencio e pior do
que robo nenhum.
"""
import asyncio
import re
from typing import Any, Awaitable, Callable, Dict, Optional

from sqlalchemy import select

from app import fila_envio, meta_canais, pipeline_store, robo_store
from app.ai_robo import Decisao, decidir
from app.config import settings
from app.credit_system import BancoDeCreditosIndisponivel, acesso_total, check_and_deduct_credits, is_admin
from app.database import AsyncSessionLocal, DBLead, chaves_do_lead, id_publico
from app.payments import tem_recurso
from app.profile_store import get_profile

# A Meta espera resposta do webhook em ~20s e reenvia se nao vier. A IA
# precisa caber nisso com folga para o envio.
PRAZO_IA = 22.0

CUSTO_RESPOSTA = 1

Enviar = Callable[[str, str, str, Dict[str, Any]], Awaitable[str]]


async def _carregar_especialista(lead: Optional[Dict[str, Any]]) -> None:
    """A ficha de especialista do ramo do lead, carregada antes de o robô responder (uma vez por ramo; depois vem da memória)."""
    nicho = (lead or {}).get("niche") or (lead or {}).get("role")
    if not nicho:
        return
    from app import especialista_nicho
    try:
        await asyncio.wait_for(especialista_nicho.garantir(nicho), timeout=12)
    except Exception:
        pass  # sem a ficha, o robô usa o guia escrito à mão


def _gerador_padrao() -> Callable[[str], Dict[str, Any]]:
    from app.ai_client import build_client, gerar_json

    import time

    cliente = build_client(settings.GEMINI_API_KEY)
    # "mensagens" e conferida em ai_sdr.normalizar, que aceita tambem o
    # formato antigo ("resposta"); exigir aqui faria rejeitar o outro.
    # Resposta de vendedor no WhatsApp tem de sair em segundos: motores em paralelo, o mais rapido vence
    # (antes era um depois do outro, e a IA estourava o prazo: "a IA demorou demais").
    return lambda prompt: gerar_json(cliente, prompt, tentativas=2, prazo=time.monotonic() + PRAZO_IA - 1.5,
                                     rapido=True, max_tokens=700)


async def _lead_do_contato(uid: str, canal: str, contato: str) -> Optional[Dict[str, Any]]:
    """O lead da busca que corresponde a quem escreveu, se houver.

    So da para casar pelo telefone: no Instagram e no Messenger a Meta
    entrega um id proprio da pagina, que nao tem relacao com o @ do perfil.
    """
    if canal != "whatsapp":
        return None
    digitos = re.sub(r"\D", "", contato)
    if len(digitos) < 10:
        return None
    try:
        async with AsyncSessionLocal() as s:
            rows = (await s.execute(select(DBLead).where(DBLead.owner_uid == uid))).scalars().all()
    except Exception:
        return None
    for row in rows:
        if re.sub(r"\D", "", row.phone or "")[-11:] == digitos[-11:]:
            return {
                "id": id_publico(row.id), "name": row.name, "company": row.company, "niche": row.niche,
                "city": row.city, "missingDigitalAssets": row.missingDigitalAssets or [],
                "rating": row.rating, "rating_count": row.rating_count,
                "diagnosis": getattr(row, "diagnosis", None), "hooks": getattr(row, "hooks", None) or [],
            }
    return None


def _lead_do_item(item: Dict[str, Any]) -> Dict[str, Any]:
    """O lead no formato que o SDR espera, a partir do registro do pipeline."""
    foto = dict(item.get("lead") or {})
    foto["id"] = item["id"]
    return foto


async def _achar_ou_criar_no_pipeline(
    uid: str, conversa: Dict[str, Any], msg: meta_canais.Recebida,
) -> Optional[Dict[str, Any]]:
    """O card desta conversa no pipeline. Quem chegou sem estar na busca
    (anuncio, indicacao, quem achou o numero) ganha um card novo: ManyChat
    sem CRM nao serve para vender."""
    try:
        if conversa.get("lead_id"):
            item = await pipeline_store.obter(uid, conversa["lead_id"])
            if item:
                return item
        if msg.canal == "whatsapp":
            item = await pipeline_store.achar_por_telefone(uid, msg.contato)
            if item:
                return item
        nome = msg.nome or "Novo contato"
        novo_id = f"in_{robo_store.id_da_conversa(msg.canal, msg.contato)}"
        foto: Dict[str, Any] = {"id": novo_id, "name": nome, "company": nome}
        if msg.canal == "whatsapp":
            foto["phone"] = "+" + re.sub(r"\D", "", msg.contato)
        return await pipeline_store.registrar(uid, foto, etapa="Respondeu", origem=f"inbound_{msg.canal}")
    except Exception as exc:
        print(f"Falha ao ligar a conversa ao pipeline: {exc}")
        return None


async def _atualizar_pipeline(uid: str, conversa: Dict[str, Any], sdr: Dict[str, Any]) -> None:
    """Move o card conforme a conversa. Nunca derruba a resposta ao lead."""
    lead_id = conversa.get("lead_id")
    if not lead_id:
        return
    try:
        destino = pipeline_store.etapa_pelo_sdr(sdr, respondeu=True)
        motivo = {
            "Respondeu": "o lead respondeu",
            "Qualificado": "o robô qualificou a conversa",
            "Reunião": "o lead confirmou a reunião",
            "Proposta": "a conversa chegou na proposta",
            "Perdido": "o lead recusou",
        }.get(destino, "")
        await pipeline_store.mover(uid, lead_id, destino, motivo=motivo, por="robô", sozinho=True)
    except Exception as exc:
        print(f"Falha ao mover o pipeline: {exc}")


async def _lead_por_id(uid: str, lead_id: str) -> Optional[Dict[str, Any]]:
    """Para o simulador: testar o robo como se fosse aquele lead."""
    try:
        async with AsyncSessionLocal() as s:
            row = (
                await s.execute(select(DBLead).where(DBLead.id.in_(chaves_do_lead(uid, lead_id)), DBLead.owner_uid == uid))
            ).scalar_one_or_none()
    except Exception:
        return None
    if not row:
        return None
    lead = {
        "id": id_publico(row.id), "name": row.name, "company": row.company, "niche": row.niche,
        "city": row.city, "missingDigitalAssets": row.missingDigitalAssets or [],
        "rating": row.rating, "rating_count": row.rating_count,
                "diagnosis": getattr(row, "diagnosis", None), "hooks": getattr(row, "hooks", None) or [],
    }
    lead["site_publicado"] = await _site_do_lead(uid, row.id)
    return lead


async def _atualizar_previa_antiga(uid: str, email: str, lead: Dict[str, Any]) -> None:
    """Previa feita por uma versao antiga do motor (e nunca editada) e refeita antes de o link seguir para o lead."""
    try:
        from app import previa_site
        await previa_site.atualizar_se_antigo(uid, email, lead)
    except Exception:
        pass


async def _site_do_lead(uid: str, lead_id: str) -> str:
    from app.sites_store import list_sites

    try:
        for site in await list_sites(uid):
            # a pagina generica das primeiras versoes ("Previa rapida") nao vale: a previa e o site da empresa
            if site.get("lead_id") == lead_id and site.get("slug") and site.get("template") != "Prévia rápida":
                return f"{settings.APP_URL}/s/{site['slug']}"
    except Exception:
        pass
    return ""


# Falhas passageiras da IA (demorou, limite, instabilidade) nao podem prender a conversa: a proxima
# mensagem do lead tem de ser respondida normalmente. So depois de varias seguidas o dono e chamado.
_TRANSITORIOS = ("a IA demorou", "a IA não respondeu", "a IA não produziu")
MAX_FALHAS_IA = 3
MAX_AUTOMATICAS = 3


def _motivo_transitorio(motivo: str) -> bool:
    return any((motivo or "").startswith(t) for t in _TRANSITORIOS)


def _identidade_da_fala(m: Optional[Dict[str, Any]]) -> str:
    """Quem é esta fala: o id da Meta/WhatsApp ou, na falta, o horário. Serve para contar cada mensagem uma vez só."""
    m = m or {}
    return str(m.get("meta_id") or m.get("em") or m.get("texto") or "")


def _falha_da_ia(conversa: Dict[str, Any], motivo: str) -> None:
    conversa["falhas_ia"] = int(conversa.get("falhas_ia") or 0) + 1
    conversa["silencio"] = f"{motivo.capitalize()}. Tenta de novo na próxima mensagem."
    if conversa["falhas_ia"] >= MAX_FALHAS_IA:
        _marcar(conversa, f"{motivo} ({conversa['falhas_ia']} vezes seguidas) — responda você")


def _marcar(conversa: Dict[str, Any], motivo: str) -> None:
    conversa["precisa_humano"] = True
    conversa["motivo"] = motivo



async def _incluir_abordagem(uid: str, conversa: Dict[str, Any], lead: Optional[Dict[str, Any]], msg: Any) -> None:
    """Põe no começo da conversa a abordagem que o LeadSage já mandou a este lead.

    Sem isso o robô acha que está abrindo a conversa: cumprimenta, se apresenta e repete o pitch por cima do que
    já foi dito. Feito uma vez por conversa (a primeira mensagem do lead); se não houver abordagem (quem escreveu
    primeiro foi o lead), nada muda.
    """
    if conversa.get("abordagem_incluida"):
        return
    conversa["abordagem_incluida"] = True
    if any(m.get("de") in ("robo", "voce") for m in conversa["mensagens"]):
        return
    try:
        itens = await fila_envio.listar(uid)
    except Exception as exc:
        print(f"Robo: nao leu a abordagem enviada: {exc}")
        return
    lead_id = (lead or {}).get("id") or conversa.get("lead_id") or ""
    enviadas = [
        i for i in itens
        if i.get("status") == "enviado" and i.get("canal") == msg.canal and i.get("texto") and (
            (lead_id and i.get("lead_id") == lead_id)
            or pipeline_store.mesmo_telefone((i.get("contato") or {}).get("phone", ""), msg.contato)
        )
    ]
    enviadas.sort(key=lambda i: i.get("enviado_em") or "")
    previas = [
        {"de": "robo", "texto": i["texto"], "em": i.get("enviado_em") or robo_store.agora(), "origem": "abordagem"}
        for i in enviadas[-2:]
    ]
    if previas:
        conversa["mensagens"] = previas + conversa["mensagens"]


# Uma conversa por vez: o Conector chama o robo de varios lugares ao mesmo tempo (agrupador, nova tentativa, varredura).
# Sem isto, cada chamada lia a mesma mensagem sem resposta e todas respondiam: o lead recebia a resposta quatro vezes.
_TRAVAS: Dict[str, asyncio.Lock] = {}


async def processar(
    cfg: Dict[str, Any],
    msg: meta_canais.Recebida,
    gerar: Optional[Callable[[str], Dict[str, Any]]] = None,
    enviar: Optional[Enviar] = None,
    reprocessar: bool = False,
    adiar: bool = False,
) -> Dict[str, Any]:
    chave = f"{cfg['uid']}:{robo_store.id_da_conversa(msg.canal, msg.contato)}"
    trava = _TRAVAS.setdefault(chave, asyncio.Lock())
    async with trava:
        return await _processar(cfg, msg, gerar, enviar, reprocessar, adiar)


async def _processar(
    cfg: Dict[str, Any],
    msg: meta_canais.Recebida,
    gerar: Optional[Callable[[str], Dict[str, Any]]] = None,
    enviar: Optional[Enviar] = None,
    reprocessar: bool = False,
    adiar: bool = False,
) -> Dict[str, Any]:
    """`reprocessar`: a mensagem ja esta na conversa e ficou sem resposta (a IA falhou ou demorou);
    tenta responder de novo, sem repetir a mensagem nem tratar como reenvio.

    `adiar`: so guarda a mensagem (e liga ao lead); a resposta vem depois, quando o lead parar de
    escrever (o Conector chama `responder_pendentes`). Quem manda "boa tarde", "vocês fazem sites?",
    "tem preço?" em tres mensagens recebe uma resposta so, e nao tres."""
    enviar = enviar or meta_canais.enviar
    uid, email = cfg["uid"], cfg.get("email", "")
    cid = robo_store.id_da_conversa(msg.canal, msg.contato)

    conversa = await robo_store.obter_conversa(uid, cid) or {
        "id": cid, "canal": msg.canal, "contato": msg.contato, "nome": "",
        "lead_id": "", "robo_ativo": True, "optout": False,
        "precisa_humano": False, "motivo": "", "mensagens": [],
        "criado": robo_store.agora(),
    }

    # 1. reenvio da Meta
    if not reprocessar and any(m.get("meta_id") == msg.meta_id for m in conversa["mensagens"]):
        return conversa

    if not reprocessar:
        conversa["mensagens"].append({
            "de": "contato", "texto": msg.texto, "em": robo_store.agora(), "meta_id": msg.meta_id,
        })
    if msg.nome:
        conversa["nome"] = msg.nome
    conversa["ultima_entrada"] = robo_store.agora()
    conversa["atualizado"] = robo_store.agora()

    item = await _achar_ou_criar_no_pipeline(uid, conversa, msg)
    lead = _lead_do_item(item) if item else await _lead_do_contato(uid, msg.canal, msg.contato)
    if lead:
        conversa["lead_id"] = lead["id"]
        conversa["nome"] = conversa["nome"] or lead.get("company") or lead.get("name") or ""
        await _atualizar_previa_antiga(uid, email, lead)
        lead["site_publicado"] = await _site_do_lead(uid, lead["id"])
        # primeira resposta do lead: sai de "Contato Enviado" mesmo que o
        # robo nao possa responder (desligado, sem plano, sem creditos)
        await _atualizar_pipeline(uid, conversa, {"etapa": "abertura"})

    await _incluir_abordagem(uid, conversa, lead, msg)

    async def salvar() -> Dict[str, Any]:
        conversa.pop("respondendo", None)
        await robo_store.salvar_conversa(uid, conversa)
        return conversa

    if adiar:
        return await salvar()

    # 2. quem pediu para sair nao recebe mais nada do robo
    if conversa.get("optout"):
        return await salvar()

    # A ultima fala ja e do robo (ou do dono): essa mensagem do lead ja foi respondida. Outra chamada chegou na frente.
    if conversa["mensagens"] and conversa["mensagens"][-1].get("de") != "contato":
        return await salvar()

    # a IA falhou antes por um motivo passageiro: nao prende a conversa, tenta de novo agora
    if conversa.get("precisa_humano") and _motivo_transitorio(conversa.get("motivo", "")):
        conversa["precisa_humano"] = False
        conversa["motivo"] = ""

    # recupera quem saiu da lista do robô só por contar a mesma mensagem várias vezes (e ninguém assumiu)
    if (conversa.get("contato_robo") and not conversa.get("optout") and not any(m.get("de") == "voce" for m in conversa["mensagens"])
            and sum(1 for m in conversa["mensagens"] if m.get("de") == "contato") < MAX_AUTOMATICAS):
        conversa.update({"contato_robo": False, "robo_ativo": True, "automaticas": 0})
        conversa.pop("automatica_id", None)

    # 3. robo desligado. Antes isso era silencioso: a mensagem chegava, nada acontecia e ninguem
    # sabia por que. O motivo fica na conversa (sem travar: ligar o robo depois volta a responder).
    if not cfg.get("ativo"):
        conversa["silencio"] = "O robô está desligado. Ligue em Robô → Comportamento e clique em Salvar."
        return await salvar()
    if not conversa.get("robo_ativo"):
        conversa["silencio"] = "O robô está pausado nesta conversa."
        return await salvar()
    if conversa.get("precisa_humano"):
        conversa["silencio"] = conversa.get("motivo") or "O robô passou esta conversa para você."
        return await salvar()
    conversa.pop("silencio", None)

    # 4. plano
    perfil = await get_profile(uid)
    if not acesso_total(email) and not tem_recurso(perfil.plan_id or "previa", "robo_ia"):
        _marcar(conversa, "seu plano não inclui o robô de atendimento")
        return await salvar()

    # O raio-x do lead, se ja foi feito: e o que torna a conversa unica.
    raio = None
    if lead:
        try:
            from app import raio_x
            raio = await raio_x.ler_cache(uid, lead["id"])
        except Exception:
            raio = None

    # Entre instancias do servidor a trava acima nao vale: marca na propria conversa que alguem esta respondendo.
    import time as _t
    import uuid as _uuid
    reserva = conversa.get("respondendo") or {}
    if reserva.get("em") and _t.time() - float(reserva["em"]) < 90:
        return conversa  # outra chamada ja esta respondendo a esta mensagem
    token = _uuid.uuid4().hex
    conversa["respondendo"] = {"token": token, "em": _t.time()}
    await robo_store.salvar_conversa(uid, conversa)
    await asyncio.sleep(0.35)
    fresca = await robo_store.obter_conversa(uid, cid)
    if fresca and (fresca.get("respondendo") or {}).get("token") != token:
        return fresca  # a outra chamada ganhou

    # 5 e 6. regras fixas, depois IA
    gerador = gerar or _gerador_padrao()
    await _carregar_especialista(lead)
    from app import ia_gate
    ia_gate.PRIORIDADE.set("alta")      # responder quem escreveu vem antes de gerar lote: a conversa não espera na fila da IA
    try:
        decisao: Decisao = await asyncio.wait_for(
            asyncio.to_thread(
                decidir, conversa["mensagens"], msg.canal,
                perfil.model_dump(), cfg, lead, gerador, raio, conversa.get("sdr"),
            ),
            timeout=PRAZO_IA,
        )
    except asyncio.TimeoutError:
        _falha_da_ia(conversa, "a IA demorou demais para responder")
        return await salvar()
    except Exception as exc:
        _falha_da_ia(conversa, f"a IA não respondeu ({type(exc).__name__})")
        return await salvar()
    conversa["falhas_ia"] = 0

    # Do outro lado tem um robo (atendimento automatico): nao responde. A terceira seguida tira o
    # contato da lista do robo, para nao ficar gastando IA e parecendo spam para outro robo.
    if decisao.automatica:
        # Cada MENSAGEM do contato conta uma vez. Antes, a varredura que volta às conversas sem resposta passava de novo pela mesma
        # mensagem e somava de novo: uma única mensagem virava "3 mensagens automáticas" e o contato saía da lista do robô para sempre.
        ident = _identidade_da_fala(conversa["mensagens"][-1] if conversa.get("mensagens") else None)
        if conversa.get("automatica_id") != ident:
            conversa["automatica_id"] = ident
            conversa["automaticas"] = int(conversa.get("automaticas") or 0) + 1
        conversa["silencio"] = "Parece uma resposta automática (outro robô): o robô não respondeu."
        if conversa["automaticas"] >= MAX_AUTOMATICAS:
            conversa["robo_ativo"] = False
            conversa["contato_robo"] = True
            conversa["silencio"] = f"Parece outro robô ({conversa['automaticas']} mensagens automáticas): saiu da lista do robô."
        return await salvar()
    conversa["automaticas"] = 0

    if decisao.sdr:
        conversa["sdr"] = decisao.sdr
        await _atualizar_pipeline(uid, conversa, decisao.sdr)

    if decisao.optout:
        await _atualizar_pipeline(uid, conversa, {"etapa": "perdido"})
        conversa["optout"] = True
        conversa["robo_ativo"] = False
        conversa["motivo"] = decisao.motivo

    if decisao.resposta and decisao.usou_ia:
        try:
            saldo = await check_and_deduct_credits(uid, CUSTO_RESPOSTA, email)
        except BancoDeCreditosIndisponivel:
            saldo = None
        if saldo is None:
            _marcar(conversa, "sem créditos para o robô responder")
            return await salvar()

    textos = list(decisao.mensagens or ([decisao.resposta] if decisao.resposta else []))
    # O lead aceitou a previa e ela nao existe: cria o site agora e manda o link de verdade, na mesma conversa.
    if decisao.criar_previa and textos:
        from app import previa_site
        url, falha = await previa_site.criar(uid, email, {**(lead or {}), "id": (lead or {}).get("id") or conversa.get("lead_id") or cid,
                                                       "name": (lead or {}).get("name") or conversa.get("nome") or ""})
        if url:
            if lead is not None:
                lead["site_publicado"] = url
            textos = [re.sub(r"\[LINK[A-Z0-9_ ]{0,30}\]", url, t) for t in textos]
            if not any(url in t for t in textos):
                textos[-1] = f"{textos[-1]} {url}".strip()
            conversa.setdefault("sdr", {})["previa_enviada"] = url
        else:
            # nao deu para criar agora: nunca sai marcador nem promessa de link; o dono assume
            textos = ["Perfeito! Estou finalizando a prévia e já te envio o link por aqui."]
            decisao.passar_para_humano = True
            decisao.motivo = f"o lead aceitou a prévia, mas não consegui criar o site agora ({falha}): crie e envie o link"

    # Uma ou duas mensagens curtas, enviadas em sequencia — como uma
    # pessoa escreve. A resposta fixa de saida vem em `resposta`.
    for texto in textos:
        try:
            meta_id = await enviar(msg.canal, msg.contato, texto, cfg)
            conversa["mensagens"].append({
                "de": "robo", "texto": texto, "em": robo_store.agora(), "meta_id": meta_id,
            })
        except meta_canais.EnvioFalhou as exc:
            _marcar(conversa, f"a resposta não foi entregue: {exc}")
            return await salvar()

    if decisao.passar_para_humano:
        if not _motivo_transitorio(decisao.motivo or ""):
            conversa["robo_ativo"] = False      # pausa de verdade só quando o robô precisa mesmo de gente; falha da IA é passageira
        _marcar(conversa, decisao.motivo or "o robô pediu sua ajuda")

    return await salvar()


async def responder_como_humano(
    uid: str, cid: str, texto: str, enviar: Optional[Enviar] = None
) -> Dict[str, Any]:
    """O dono responde pela tela. O robo pausa nesta conversa.

    E o que o ManyChat chama de assumir a conversa: se o robo continuasse,
    responderia por cima do dono na mensagem seguinte.
    """
    conversa = await robo_store.obter_conversa(uid, cid)
    if not conversa:
        raise LookupError("Conversa não encontrada.")
    cfg = await robo_store.canal_do_usuario(uid) or {}

    enviar = enviar or meta_canais.enviar
    meta_id = await enviar(conversa["canal"], conversa["contato"], texto, cfg)
    conversa["mensagens"].append({
        "de": "voce", "texto": texto.strip(), "em": robo_store.agora(), "meta_id": meta_id,
    })
    conversa["robo_ativo"] = False
    conversa["precisa_humano"] = False
    conversa["motivo"] = ""
    conversa["atualizado"] = robo_store.agora()
    await robo_store.salvar_conversa(uid, conversa)
    return conversa


async def enviar_previa(uid: str, email: str, cid: str, enviar: Optional[Enviar] = None) -> Dict[str, Any]:
    """Cria (se ainda nao existe) a previa do site deste lead e MANDA o link na conversa, agora.

    Para quando o lead aceitou ver o site e o link nao chegou: o dono resolve com um clique, sem escrever nada.
    O robo continua ligado; so a conversa deixa de estar marcada como "precisa de voce".
    """
    from app import previa_site

    conversa = await robo_store.obter_conversa(uid, cid)
    if not conversa:
        raise LookupError("Conversa não encontrada.")
    cfg = await robo_store.canal_do_usuario(uid) or {}
    item = None
    if conversa.get("lead_id"):
        item = await pipeline_store.obter(uid, conversa["lead_id"])
    if item is None and conversa.get("canal") == "whatsapp":
        item = await pipeline_store.achar_por_telefone(uid, conversa.get("contato", ""))
    lead = _lead_do_item(item) if item else {"id": conversa.get("lead_id") or cid, "name": conversa.get("nome") or "", "phone": conversa.get("contato", "")}
    nome = lead.get("company") or lead.get("name") or conversa.get("nome") or ""

    await _atualizar_previa_antiga(uid, email, lead)
    url = await _site_do_lead(uid, lead["id"])
    if not url:
        url, falha = await previa_site.criar(uid, email, lead)
        if not url:
            raise meta_canais.EnvioFalhou(f"Não consegui criar a prévia agora: {falha}")

    texto = f"Aqui está a prévia do site{f' da {nome}' if nome else ''}: {url}\nDá uma olhada e me conta o que achou."
    enviar = enviar or meta_canais.enviar
    meta_id = await enviar(conversa["canal"], conversa["contato"], texto, {**cfg, "uid": uid})
    conversa["mensagens"].append({"de": "robo", "texto": texto, "em": robo_store.agora(), "meta_id": meta_id})
    conversa["precisa_humano"] = False
    conversa["motivo"] = ""
    conversa.setdefault("sdr", {})["previa_enviada"] = url
    conversa["atualizado"] = robo_store.agora()
    await robo_store.salvar_conversa(uid, conversa)
    return conversa


async def enviar_previa_por_telefone(uid: str, email: str, telefone: str, chat_id: str = "",
                                      enviar: Optional[Enviar] = None) -> Dict[str, Any]:
    """Cria (se preciso) a previa do site do lead com este telefone e manda o link pelo WhatsApp.

    Funciona de qualquer tela que mostre o contato (conversas, chat, abordagem enviada): o que importa e o numero.
    `chat_id`: o id da conversa quando o contato e novo (@lid), para a mensagem ir para o lugar certo.
    """
    from app import previa_site
    from app.conector_whatsapp import enfileirar_resposta

    item = await pipeline_store.achar_por_telefone(uid, telefone)
    if item is None:
        raise LookupError("Não achei este contato entre os seus leads: a prévia é feita a partir de um lead da busca.")
    lead = _lead_do_item(item)
    nome = lead.get("company") or lead.get("name") or ""
    cfg = await robo_store.canal_do_usuario(uid) or {}
    cfg = {**cfg, "uid": uid, "email": email}

    await _atualizar_previa_antiga(uid, email, lead)
    url = await _site_do_lead(uid, lead["id"])
    if not url:
        url, falha = await previa_site.criar(uid, email, lead)
        if not url:
            raise meta_canais.EnvioFalhou(f"Não consegui criar a prévia agora: {falha}")

    texto = f"Aqui está a prévia do site{f' da {nome}' if nome else ''}: {url}\nDá uma olhada e me conta o que achou."
    if enviar is None and not (cfg.get("wa_token") and cfg.get("wa_phone_id")) and cfg.get("cw_hash"):
        meta_id = await enfileirar_resposta(cfg, telefone, texto, chat_id)
    else:
        meta_id = await (enviar or meta_canais.enviar)("whatsapp", telefone, texto, cfg)

    cid = robo_store.id_da_conversa("whatsapp", telefone)
    conversa = await robo_store.obter_conversa(uid, cid)
    if conversa:
        conversa["mensagens"].append({"de": "robo", "texto": texto, "em": robo_store.agora(), "meta_id": meta_id})
        conversa["precisa_humano"] = False
        conversa["motivo"] = ""
        conversa.setdefault("sdr", {})["previa_enviada"] = url
        await robo_store.salvar_conversa(uid, conversa)
    return {"url": url, "texto": texto, "nome": nome}


async def responder_sem_guardar(
    cfg: Dict[str, Any],
    mensagens: list,
    telefone: str = "",
    canal: str = "whatsapp",
    gerar: Optional[Callable[[str], Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Sugere a resposta para uma conversa que o usuário está lendo, sem guardar nada.

    É o caminho da extensão: ela lê a conversa na tela, manda os últimos trechos e
    recebe a resposta. A conversa não passa por nenhum banco nosso. Quem escreveu
    antes (o robô, o dono) chega como "voce" e entra no prompt como fala do vendedor.
    """
    uid, email = cfg["uid"], cfg.get("email", "")
    perfil = await get_profile(uid)
    if not acesso_total(email) and not tem_recurso(perfil.plan_id or "previa", "robo_ia"):
        raise PermissionError("seu plano não inclui o robô de atendimento")

    historico = [
        {"de": "contato" if m.get("de") == "contato" else "robo", "texto": str(m.get("texto") or "")[:1500],
         "em": robo_store.agora()}
        for m in mensagens[-30:] if str(m.get("texto") or "").strip()
    ]
    if not historico or historico[-1]["de"] != "contato":
        return {"mensagens": [], "motivo": "a última mensagem não é do contato; não há o que responder"}

    lead = await _lead_do_contato(uid, canal, telefone) if telefone else None
    raio = None
    if lead:
        try:
            from app import raio_x
            raio = await raio_x.ler_cache(uid, lead["id"])
        except Exception:
            raio = None

    gerador = gerar or _gerador_padrao()
    decisao: Decisao = await asyncio.wait_for(
        asyncio.to_thread(decidir, historico, canal, perfil.model_dump(), cfg, lead, gerador, raio, None),
        timeout=PRAZO_IA,
    )
    textos = decisao.mensagens or ([decisao.resposta] if decisao.resposta else [])
    if textos and decisao.usou_ia:
        try:
            saldo = await check_and_deduct_credits(uid, CUSTO_RESPOSTA, email)
        except BancoDeCreditosIndisponivel:
            saldo = None
        if saldo is None:
            return {"mensagens": [], "motivo": "sem créditos para o robô responder"}
    return {
        "mensagens": textos,
        "passar_para_humano": bool(decisao.passar_para_humano),
        "optout": bool(decisao.optout),
        "motivo": decisao.motivo or "",
        "etapa": (decisao.sdr or {}).get("etapa", ""),
        "temperatura": (decisao.sdr or {}).get("temperatura", ""),
    }


# ----------------------------------------------------- varrer o que ficou sem resposta

def _pausa_por_engano(c: Dict[str, Any]) -> bool:
    """Saiu da lista do robô como "outro robô", mas o contato falou menos vezes do que o necessário para isso (e ninguém assumiu).
    Era o defeito de contar a mesma mensagem várias vezes."""
    from app.ai_robo import certeza_de_robo

    if certeza_de_robo((c.get("ultima") or {}).get("texto", "")):
        return False      # a última fala é mesmo de robô (menu, protocolo): continua fora da lista
    return bool(c.get("contato_robo")) and not c.get("optout") and not c.get("humano") and int(c.get("contatos") or 99) < MAX_AUTOMATICAS


def _sem_resposta(c: Dict[str, Any]) -> bool:
    """A ultima fala e do contato, o robo pode e deve responder."""
    ultima = c.get("ultima") or {}
    if ultima.get("de") != "contato" or c.get("optout"):
        return False
    if c.get("automatica_id") and c.get("automatica_id") == _identidade_da_fala(ultima):
        return False      # esta mensagem já foi julgada automática: só vale a pena voltar quando chegar outra
    if _pausa_por_engano(c):
        return True       # tirado da lista por contar a mesma mensagem várias vezes: volta a ser atendido
    if c.get("contato_robo") or not c.get("robo_ativo", True):
        return False
    if c.get("precisa_humano") and not _motivo_transitorio(c.get("motivo", "")):
        return False
    return True


async def responder_pendentes(
    cfg: Dict[str, Any],
    contato: str = "",
    janela_horas: float = 24,
    maximo: int = 5,
    gerar: Optional[Callable[[str], Dict[str, Any]]] = None,
    enviar: Optional[Enviar] = None,
    canal: str = "whatsapp",
) -> Dict[str, Any]:
    """Responde as mensagens que chegaram e ficaram sem resposta (a IA falhou, o Conector estava fechado...).

    Com `contato`, so aquele; sem, varre as conversas recentes. Antes uma falha da IA deixava a
    pessoa sem resposta ate ela escrever de novo: agora o robo volta sozinho.
    """
    from datetime import datetime, timedelta, timezone

    uid = cfg["uid"]
    if not cfg.get("ativo"):
        return {"processadas": 0, "respondidas": 0, "motivo": "robo desligado"}
    if contato:
        resumos = [{"id": robo_store.id_da_conversa(canal, contato)}]
    else:
        corte = (datetime.now(timezone.utc) - timedelta(hours=janela_horas)).isoformat()
        resumos = [
            c for c in await robo_store.listar_conversas(uid)
            if c.get("canal") == canal and _sem_resposta(c) and str(c.get("atualizado") or "") >= corte[:19]
        ]
    processadas = respondidas = 0
    ultima_conversa: Dict[str, Any] = {}
    for r in resumos[:maximo]:
        conversa = await robo_store.obter_conversa(uid, r["id"])
        if not conversa or not conversa.get("mensagens"):
            continue
        ultima = conversa["mensagens"][-1]
        recuperavel = _pausa_por_engano({
            "contato_robo": conversa.get("contato_robo"), "optout": conversa.get("optout"),
            "humano": any(m.get("de") == "voce" for m in conversa["mensagens"]),
            "contatos": sum(1 for m in conversa["mensagens"] if m.get("de") == "contato"),
            "ultima": ultima,
        })
        if ultima.get("de") != "contato" or conversa.get("optout") or (conversa.get("contato_robo") and not recuperavel):
            continue
        msg = meta_canais.Recebida(
            canal=conversa.get("canal", canal), contato=conversa.get("contato", ""), nome=conversa.get("nome", ""),
            texto=ultima.get("texto", ""), meta_id=ultima.get("meta_id", ""), momento=0,
        )
        processadas += 1
        nova = await processar(cfg, msg, gerar=gerar, enviar=enviar, reprocessar=True)
        ultima_conversa = nova
        if (nova.get("mensagens") or [{}])[-1].get("de") == "robo":
            respondidas += 1
    return {
        "processadas": processadas, "respondidas": respondidas,
        # para o Conector decidir se tenta de novo e o que mostrar
        "tentar_de_novo": bool(ultima_conversa.get("falhas_ia")) and not ultima_conversa.get("precisa_humano"),
        "silencio": ultima_conversa.get("silencio", ""),
    }
