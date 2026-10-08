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

from app import meta_canais, pipeline_store, robo_store
from app.ai_robo import Decisao, decidir
from app.config import settings
from app.credit_system import BancoDeCreditosIndisponivel, check_and_deduct_credits, is_admin
from app.database import AsyncSessionLocal, DBLead, chaves_do_lead, id_publico
from app.payments import tem_recurso
from app.profile_store import get_profile

# A Meta espera resposta do webhook em ~20s e reenvia se nao vier. A IA
# precisa caber nisso com folga para o envio.
PRAZO_IA = 14.0

CUSTO_RESPOSTA = 1

Enviar = Callable[[str, str, str, Dict[str, Any]], Awaitable[str]]


def _gerador_padrao() -> Callable[[str], Dict[str, Any]]:
    from app.ai_client import build_client, gerar_json

    cliente = build_client(settings.GEMINI_API_KEY)
    # "mensagens" e conferida em ai_sdr.normalizar, que aceita tambem o
    # formato antigo ("resposta"); exigir aqui faria rejeitar o outro.
    return lambda prompt: gerar_json(cliente, prompt)


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


async def _site_do_lead(uid: str, lead_id: str) -> str:
    from app.sites_store import list_sites

    try:
        for site in await list_sites(uid):
            if site.get("lead_id") == lead_id and site.get("slug"):
                return f"{settings.APP_URL}/s/{site['slug']}"
    except Exception:
        pass
    return ""


def _marcar(conversa: Dict[str, Any], motivo: str) -> None:
    conversa["precisa_humano"] = True
    conversa["motivo"] = motivo


async def processar(
    cfg: Dict[str, Any],
    msg: meta_canais.Recebida,
    gerar: Optional[Callable[[str], Dict[str, Any]]] = None,
    enviar: Optional[Enviar] = None,
) -> Dict[str, Any]:
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
    if any(m.get("meta_id") == msg.meta_id for m in conversa["mensagens"]):
        return conversa

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
        lead["site_publicado"] = await _site_do_lead(uid, lead["id"])
        # primeira resposta do lead: sai de "Contato Enviado" mesmo que o
        # robo nao possa responder (desligado, sem plano, sem creditos)
        await _atualizar_pipeline(uid, conversa, {"etapa": "abertura"})

    async def salvar() -> Dict[str, Any]:
        await robo_store.salvar_conversa(uid, conversa)
        return conversa

    # 2. quem pediu para sair nao recebe mais nada do robo
    if conversa.get("optout"):
        return await salvar()

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
    if not is_admin(email) and not tem_recurso(perfil.plan_id or "previa", "robo_ia"):
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

    # 5 e 6. regras fixas, depois IA
    gerador = gerar or _gerador_padrao()
    try:
        decisao: Decisao = await asyncio.wait_for(
            asyncio.to_thread(
                decidir, conversa["mensagens"], msg.canal,
                perfil.model_dump(), cfg, lead, gerador, raio, conversa.get("sdr"),
            ),
            timeout=PRAZO_IA,
        )
    except asyncio.TimeoutError:
        _marcar(conversa, "a IA demorou demais para responder — responda você")
        return await salvar()
    except Exception as exc:
        _marcar(conversa, f"a IA não respondeu ({type(exc).__name__}) — responda você")
        return await salvar()

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

    # Uma ou duas mensagens curtas, enviadas em sequencia — como uma
    # pessoa escreve. A resposta fixa de saida vem em `resposta`.
    for texto in (decisao.mensagens or ([decisao.resposta] if decisao.resposta else [])):
        try:
            meta_id = await enviar(msg.canal, msg.contato, texto, cfg)
            conversa["mensagens"].append({
                "de": "robo", "texto": texto, "em": robo_store.agora(), "meta_id": meta_id,
            })
        except meta_canais.EnvioFalhou as exc:
            _marcar(conversa, f"a resposta não foi entregue: {exc}")
            return await salvar()

    if decisao.passar_para_humano:
        conversa["robo_ativo"] = False
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
    if not is_admin(email) and not tem_recurso(perfil.plan_id or "previa", "robo_ia"):
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
