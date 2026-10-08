import time
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
import asyncio
from typing import List, Dict, Any, Optional

from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import json

from app.config import settings
from app.database import init_db, get_db, DBLead, DBSearchHistory, EH_POSTGRES, chave_do_lead, chaves_do_lead

from app.models import (
    LeadSearchRequest, LeadSearchResponse, LeadItem, LeadSocialLinks,
    PitchGenerationRequest, PitchGenerationResponse, FollowupsRequest,
    DispatchRequest, DispatchResponse,
    CreditTopUpRequest, CheckoutRequest, UserProfile,
    DemoSiteRequest, DemoSiteResponse,
    SiteCreateRequest, SiteItem, IntegrationSettings,
    DocumentCreateRequest, DocumentUpdateRequest, DocumentItem,
    SiteCopyRequest, SiteCopyResponse, DocumentAIRequest, DocumentAIResponse,
)
from app.leads_engine import LeadsEngine
from app.ai_client import AIIndisponivel
from app.ai_generator import AIGenerator
from app.ai_site import gerar_conteudo_de_site
from app.ai_docs import gerar_documento
from app.dispatcher import OutreachDispatcher, DispatchError, DISPATCH_COST
from app.credit_system import check_and_deduct_credits, get_user_balance
import httpx
from app.firebase_config import get_current_user, db as firestore_db
from app.profile_store import get_profile, save_profile
from app.sites_store import (
    create_site, update_site, list_sites, get_site, delete_site, contar_sites,
    html_publico, garantir_apelido,
)
from app.credit_system import is_admin, BancoDeCreditosIndisponivel
from app.integrations_store import get_integrations, save_integrations, public_view
from app import fila_envio, telegram_canal, robo_store, robo_service, meta_canais, meta_oauth, robo_conexao, raio_x, banco_imagens, pipeline_store, robo_disparo, ai_oferta, abordagem_mestra, conector_whatsapp, caixa_de_entrada
from fastapi.responses import RedirectResponse
from urllib.parse import quote as _quote
from app.ai_robo import decidir as robo_decidir
from app.payments import (
    catalogo, criar_pedido, obter_pedido, listar_pedidos,
    confirmar_pagamento, achar_pacote, vincular_cobranca,
    tem_recurso, paises_do_plano, plano_de,
)
from app import mercadopago
from app.documents_store import (
    create_document, update_document, list_documents, get_document, delete_document,
)

@asynccontextmanager
async def lifespan(_: FastAPI):
    # on_event("startup") esta deprecado e sera removido do FastAPI.
    await init_db()
    yield


app = FastAPI(
    title="LeadSage API",
    description="Backend Python para busca de leads com IA, enriquecimento e disparo automatizado.",
    version="1.0.0",
    lifespan=lifespan,
)

# allow_origins=["*"] com allow_credentials=True e uma combinacao invalida
# (o navegador recusa) e deixava qualquer site chamar a API. Com
# ALLOWED_ORIGINS definido, so as origens listadas passam.
_origins = settings.allowed_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=bool(_origins),
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

async def exigir_recurso(user: dict, recurso: str, o_que: str) -> str:
    """Barra o acesso quando o plano do usuario nao inclui o recurso.

    Admin passa direto — voce precisa testar tudo sem comprar plano.
    Devolve o plan_id para quem precisar dele em seguida.
    """
    if is_admin(user.get("email")):
        return "agencia"

    perfil = await get_profile(user.get("uid"))
    plan_id = perfil.plan_id or "previa"
    if not tem_recurso(plan_id, recurso):
        raise HTTPException(
            status_code=402,
            detail=(
                f"{o_que} não está disponível no plano {plano_de(plan_id)['nome']}. "
                "Faça um upgrade em Assinatura."
            ),
        )
    return plan_id


NOMES_PAIS = {"BR": "Brasil", "PT": "Portugal", "US": "Estados Unidos"}


def detectar_pais(location: str) -> str:
    """Deduz o pais do texto de localizacao vindo do seletor da tela."""
    texto = (location or "").lower()
    if "portugal" in texto:
        return "PT"
    if "united states" in texto or "estados unidos" in texto or texto.strip().endswith(", usa"):
        return "US"
    if "brazil" in texto or "brasil" in texto or not texto:
        return "BR"
    # Pais nao mapeado: trata como internacional, que exige plano pago
    return "OUTRO"


# Formato real da referencia de foto da Places API: places/<id>/photos/<id>
PLACE_PHOTO_RE = re.compile(r"places/[A-Za-z0-9_-]+/photos/[A-Za-z0-9_-]+")

@app.exception_handler(BancoDeCreditosIndisponivel)
async def _banco_fora(request: Request, exc: BancoDeCreditosIndisponivel):
    """503 em vez de liberar. O cliente sabe que e temporario e nos
    sabemos, pelo log, que o Firestore nao subiu."""
    print(f"CREDITO SEM BANCO: {request.url.path} recusado — Firestore indisponivel")
    return JSONResponse(status_code=503, content={"detail": str(exc)})


# Na Vercel so /api/* chega ate a funcao, entao a raiz e inalcancavel
# em producao. O mesmo corpo responde nos dois caminhos.
@app.get("/api/status")
@app.get("/")
def read_root():
    """Estado do servico.

    "armazenamento" existe porque o Firestore falha em silencio: uma
    credencial errada so aparecia como uma linha de log. Como o controle
    de credito agora recusa quando nao ha banco, da para ver aqui, sem
    login e sem expor segredo, se o deploy subiu inteiro.
    """
    return {
        "status": "online",
        "service": "LeadSage AI Prospecting Engine",
        "version": "1.0.0",
        "armazenamento": "firestore" if firestore_db is not None else ("postgres" if EH_POSTGRES else ("sqlite" if settings.FIRESTORE_DESLIGADO else "indisponivel")),
        "timestamp": datetime.now().isoformat()
    }

def _identidade(profile: UserProfile, user: dict) -> UserProfile:
    """Preenche o que o usuario ainda nao escreveu com o que veio do login.

    O token do Firebase ja traz nome, e-mail e foto de quem entrou. Usar
    isso e melhor do que default nenhum — e muito melhor do que o default
    antigo, que era a identidade do dono do sistema.

    O nome do plano vem sempre da tabela de precos: gravado no perfil ele
    envelhecia e passava a mentir.
    """
    profile.name = profile.name or user.get("name") or ""
    profile.email = profile.email or user.get("email") or ""
    profile.avatar = profile.avatar or user.get("picture") or ""
    if is_admin(user.get("email")):
        profile.plan = plano_de("agencia")["nome"]
    else:
        profile.plan = plano_de(profile.plan_id or "previa")["nome"]
    profile.oculta_assinatura = (user.get("email") or "").strip().lower() in settings.sem_assinatura_emails
    return profile


@app.get("/api/profile", response_model=UserProfile)
async def get_user_profile(user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    profile = await get_profile(uid)
    balance = await get_user_balance(uid, user.get("email"))
    profile.credits = balance.get("credits", 0)
    return _identidade(profile, user)


@app.put("/api/profile", response_model=UserProfile)
async def update_user_profile(profile: UserProfile, user: dict = Depends(get_current_user)):
    """Salva o perfil do usuario autenticado.

    Antes esta rota nao exigia token e escrevia numa global de modulo,
    compartilhada por todos os usuarios.
    """
    uid = user.get("uid")
    saved = await save_profile(uid, profile.model_dump())
    balance = await get_user_balance(uid, user.get("email"))
    saved.credits = balance.get("credits", 0)
    return _identidade(saved, user)

@app.post("/api/search-leads", response_model=LeadSearchResponse)
async def search_leads(request: Request, req: LeadSearchRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not req.niche or not req.location:
        raise HTTPException(status_code=400, detail="Nicho e localização são obrigatórios.")

    requested_limit = req.limit or 10
    uid = user.get("uid")

    # Confere saldo ANTES de gastar a cota do Google, mas so debita
    # depois, pelo numero de leads realmente entregues. Antes o credito
    # era cobrado antecipadamente e se perdia se a busca falhasse.
    email = user.get("email")
    balance = await get_user_balance(uid, email)
    if balance.get("credits", 0) < requested_limit:
        raise HTTPException(
            status_code=402,
            detail=(
                f"Créditos insuficientes: esta busca custa {requested_limit} "
                f"e você tem {balance.get('credits', 0)}. "
                "Reduza a quantidade de leads ou recarregue em Assinatura."
            )
        )

    # Previa e Start buscam so no Brasil; Portugal e EUA a partir do Pro.
    if not is_admin(email):
        perfil_busca = await get_profile(uid)
        permitidos = paises_do_plano(perfil_busca.plan_id or "previa")
        pais = detectar_pais(req.location)
        if pais not in permitidos:
            raise HTTPException(
                status_code=402,
                detail=(
                    f"Buscar em {NOMES_PAIS.get(pais, pais)} exige o plano Pro ou superior. "
                    "Seu plano atual busca apenas no Brasil."
                ),
            )

    try:
        leads = await LeadsEngine.search_leads(
            niche=req.niche,
            location=req.location,
            query=req.query or "",
            limit=requested_limit,
            api_key=settings.GOOGLE_MAPS_API_KEY,
            enrich=req.enrich if req.enrich is not None else True,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    search_id = f"sch_{uuid.uuid4().hex[:8]}"
    total_cost = len(leads)
    remaining_credits = await check_and_deduct_credits(uid, total_cost, email) if total_cost else balance.get("credits", 0)
    if remaining_credits is None:
        remaining_credits = 9999

    # Grava o lead inteiro, campo a campo pelo nome da coluna.
    #
    # Antes cada campo era listado a mao na construcao do DBLead, e todo
    # dado novo do Google (bairro, avaliacoes, diagnostico do site)
    # chegava na resposta da API mas nunca no banco: quem abrisse o
    # historico via o lead pela metade.
    colunas = {c.name for c in DBLead.__table__.columns}
    for lead in leads:
        dados = lead.model_dump()
        dados["socials"] = lead.socials.model_dump() if lead.socials else None
        registro = {k: v for k, v in dados.items() if k in colunas}
        registro["id"] = chave_do_lead(uid, str(registro.get("id", "")))
        registro["owner_uid"] = uid
        registro["search_id"] = search_id
        await db.merge(DBLead(**registro))

    db_history = DBSearchHistory(
        id=search_id,
        niche=req.niche,
        location=req.location,
        total_leads=len(leads),
        # ISO ordena corretamente como string; "%d/%m/%Y" nao ordenava
        timestamp=datetime.now().isoformat(timespec="seconds"),
        leads_preview=[l.name for l in leads[:3]],
        owner_uid=uid,
    )
    db.add(db_history)
    
    await db.commit()

    return LeadSearchResponse(
        search_id=search_id,
        niche=req.niche,
        location=req.location,
        total_found=len(leads),
        credits_consumed=total_cost,
        remaining_credits=remaining_credits,
        leads=leads,
        timestamp=datetime.now().isoformat()
    )

@app.post("/api/generate-pitch", response_model=PitchGenerationResponse)
async def generate_pitch(request: Request, req: PitchGenerationRequest, user: dict = Depends(get_current_user)):
    """Escreve a abordagem e a cadencia de aquecimento.

    Uma falha da IA agora e 503, nao 200. Antes a excecao virava o corpo
    da mensagem: o usuario recebia "Houve um erro ao processar com a IA:
    404" dentro do campo de texto, com o botao de disparar ligado.
    """
    await exigir_recurso(user, "ia_abordagem", "A IA de abordagem")
    try:
        await _preparar_pitch(user, req)
        return await AIGenerator.generate_pitch(req, api_key=settings.GEMINI_API_KEY)
    except AIIndisponivel as e:
        raise HTTPException(status_code=503, detail=str(e))


async def _preparar_pitch(user: dict, req: PitchGenerationRequest) -> None:
    """O produto vem do cadastro do dono, nunca do navegador: e ele que garante que a
    mensagem so cita preco, prazo e entrega reais."""
    canal_robo = await robo_store.canal_do_usuario(user.get("uid")) or {}
    perfil = await get_profile(user.get("uid"))
    if not req.user_product:
        req.user_product = perfil.product_description or ""
    if not req.sender_name or req.sender_name == "Prospecção LeadSage":
        req.sender_name = perfil.company_name or perfil.name or req.sender_name
    req.service_brief = abordagem_mestra.produto(canal_robo, req.lead.model_dump(), req.user_product or "")


@app.post("/api/generate-followups")
async def generate_followups(req: FollowupsRequest, user: dict = Depends(get_current_user)):
    """As duas mensagens de acompanhamento, pedidas a parte para a primeira aparecer mais rapido."""
    await exigir_recurso(user, "ia_abordagem", "A IA de abordagem")
    try:
        await _preparar_pitch(user, req.pitch)
        seguimentos, avisos = await AIGenerator.generate_followups(req.pitch, req.primeira, api_key=settings.GEMINI_API_KEY)
        return {"follow_ups": seguimentos, "warnings": avisos}
    except AIIndisponivel as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/api/generate-demo-site", response_model=DemoSiteResponse)
async def generate_demo_site(request: Request, req: DemoSiteRequest, user: dict = Depends(get_current_user)):
    try:
        return await AIGenerator.generate_demo_site(req, api_key=settings.GEMINI_API_KEY)
    except AIIndisponivel as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/api/generate-site-copy", response_model=SiteCopyResponse)
async def gerar_texto_do_site(req: SiteCopyRequest, user: dict = Depends(get_current_user)):
    """Conteudo do site + a identidade visual daquele negocio."""
    await exigir_recurso(user, "ia_abordagem", "A escrita com IA")

    perfil = await get_profile(user.get("uid"))
    alvo = req.lead.model_dump() if req.lead else {}
    # O construtor pode estar sendo usado sem lead nenhum (cliente que o
    # usuario ja tem). Nesse caso o que veio dos campos da tela e tudo.
    alvo["company"] = req.empresa or alvo.get("company") or alvo.get("name") or ""
    alvo["role"] = req.categoria or alvo.get("role") or ""
    alvo["niche"] = req.categoria or alvo.get("niche") or ""
    alvo["city"] = req.cidade or alvo.get("city") or ""
    if not alvo["company"].strip():
        raise HTTPException(status_code=400, detail="Informe o nome da empresa antes de gerar os textos.")

    try:
        return await gerar_conteudo_de_site(
            alvo,
            settings.GEMINI_API_KEY,
            req.servico_do_usuario or perfil.product_description or "",
        )
    except AIIndisponivel as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/api/generate-document", response_model=DocumentAIResponse)
async def gerar_documento_com_ia(
    req: DocumentAIRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Redige a proposta ou o contrato a partir do lead e do briefing.

    O documento sai no mesmo formato dos modelos de texto, entao o editor
    continua reconhecendo os [CAMPOS] e o tema visual continua montando o
    PDF com a marca do usuario.
    """
    if req.kind not in ("proposta", "contrato"):
        raise HTTPException(status_code=400, detail="Tipo de documento inválido.")
    await exigir_recurso(
        user,
        "propostas" if req.kind == "proposta" else "contratos",
        "Gerar proposta com IA" if req.kind == "proposta" else "Gerar contrato com IA",
    )

    lead = None
    if req.lead_id:
        resultado = await db.execute(
            select(DBLead).where(DBLead.id.in_(chaves_do_lead(user.get("uid"), req.lead_id)), DBLead.owner_uid == user.get("uid"))
        )
        encontrado = resultado.scalar_one_or_none()
        if encontrado:
            lead = {
                coluna.name: getattr(encontrado, coluna.name)
                for coluna in DBLead.__table__.columns
            }

    perfil = await get_profile(user.get("uid"))
    try:
        return await gerar_documento(
            req.kind, lead, perfil.model_dump(), req.model_dump(), settings.GEMINI_API_KEY
        )
    except AIIndisponivel as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/dispatch", response_model=DispatchResponse)
async def dispatch_outreach(
    req: DispatchRequest,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dispara a mensagem e so cobra o que foi de fato entregue.

    Antes o credito era debitado sempre, inclusive quando o SMTP falhava
    ou quando o canal nem tinha envio real, e o lead era marcado como
    "Enviado" de qualquer jeito.
    """
    await exigir_recurso(user, "ia_abordagem", "O disparo")
    uid = user.get("uid")
    email = user.get("email")
    balance = await get_user_balance(uid, email)
    current_credits = balance.get("credits", 0)
    config = await get_integrations(uid)

    try:
        response = await OutreachDispatcher.dispatch_message(req, current_credits, config)
    except ValueError as e:
        raise HTTPException(status_code=402, detail=str(e))
    except DispatchError as e:
        raise HTTPException(status_code=422, detail=str(e))

    result = await db.execute(select(DBLead).where(DBLead.id.in_(chaves_do_lead(user.get("uid"), req.lead_id)), DBLead.owner_uid == user.get("uid")))
    lead = result.scalar_one_or_none()
    if lead:
        # Um link gerado nao e uma mensagem entregue
        lead.outreach_status = "Enviado" if response.delivered else "Aguardando envio manual"
        lead.last_contacted_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        lead.last_message = req.body
        await db.commit()

    if response.credits_consumed:
        remaining = await check_and_deduct_credits(uid, response.credits_consumed, email)
        if remaining is not None:
            response.remaining_credits = remaining

    return response


@app.post("/api/integrations/test-whatsapp")
async def testar_whatsapp(user: dict = Depends(get_current_user)):
    """Confere as credenciais da Meta sem enviar mensagem para ninguem."""
    config = await get_integrations(user.get("uid"))
    token = (config.get("wa_token") or "").strip()
    phone_id = (config.get("wa_phone_id") or "").strip()
    if not (token and phone_id):
        raise HTTPException(status_code=400, detail="Informe o Token e o Phone Number ID primeiro.")

    url = f"https://graph.facebook.com/v21.0/{phone_id}"
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, headers={"Authorization": f"Bearer {token}"})
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Nao foi possivel falar com a Meta: {e}")

    dados = resp.json() if resp.content else {}
    if resp.status_code >= 400:
        motivo = (dados.get("error") or {}).get("message", "credenciais recusadas")
        raise HTTPException(status_code=400, detail=f"Meta recusou: {motivo}")

    return {
        "status": "ok",
        "numero": dados.get("display_phone_number", ""),
        "nome": dados.get("verified_name", ""),
        "qualidade": dados.get("quality_rating", ""),
    }


@app.get("/api/integrations")
async def read_integrations(user: dict = Depends(get_current_user)):
    """Nunca devolve a senha SMTP: so `has_password`."""
    return public_view(await get_integrations(user.get("uid")))


@app.put("/api/integrations")
async def update_integrations(
    req: IntegrationSettings, user: dict = Depends(get_current_user)
):
    return await save_integrations(user.get("uid"), req.model_dump())

@app.get("/api/credits/balance")
async def get_credits_balance(user: dict = Depends(get_current_user)):
    return await get_user_balance(user.get("uid"), user.get("email"))

@app.get("/api/packages")
def listar_pacotes():
    """Catalogo com os precos. O cliente manda so o id na compra."""
    return {**catalogo(), "provider": settings.PAYMENT_PROVIDER or None}


@app.post("/api/checkout")
async def iniciar_compra(req: CheckoutRequest, user: dict = Depends(get_current_user)):
    """Cria o pedido pendente. NAO concede credito.

    O credito so entra pelo webhook, depois de o provedor confirmar o
    pagamento. Enquanto nao houver provedor configurado, a rota recusa em
    vez de liberar de graca.
    """
    try:
        pedido = await criar_pedido(user.get("uid"), req.package_id, settings.PAYMENT_PROVIDER)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if settings.PAYMENT_PROVIDER != "mercadopago" or not settings.MERCADOPAGO_TOKEN:
        raise HTTPException(
            status_code=503,
            detail=(
                "Pagamento ainda não configurado. O pedido foi registrado, mas "
                "nenhum crédito é liberado até a cobrança ser confirmada."
            ),
        )

    item = achar_pacote(req.package_id)
    try:
        cobranca = await mercadopago.criar_preferencia(
            token=settings.MERCADOPAGO_TOKEN,
            order_id=pedido["id"],
            titulo=f"LeadSage — {item['nome']}",
            valor_centavos=item["amount_cents"],
            url_retorno=f"{settings.APP_URL}/",
            url_webhook=f"{settings.APP_URL}/api/webhooks/pagamento",
            email_comprador=user.get("email", ""),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    await vincular_cobranca(pedido["id"], "mercadopago", cobranca["preference_id"])
    return {"order": pedido, "checkout_url": cobranca["checkout_url"]}


@app.get("/api/orders")
async def meus_pedidos(user: dict = Depends(get_current_user)):
    return await listar_pedidos(user.get("uid"))


@app.get("/api/orders/{order_id}")
async def ver_pedido(order_id: str, user: dict = Depends(get_current_user)):
    pedido = await obter_pedido(user.get("uid"), order_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido nao encontrado.")
    return pedido


@app.post("/api/webhooks/pagamento")
async def webhook_pagamento(request: Request):
    """Unico caminho que concede credito.

    Nao tem `Depends(get_current_user)` de proposito: quem chama e o
    Mercado Pago, nao o usuario. A autenticacao e a assinatura.

    O corpo do aviso do MP so traz o id — ele NAO diz que esta aprovado.
    Por isso, depois de conferir a assinatura, o estado real e consultado
    na API deles. Confiar no corpo seria o mesmo buraco de antes.
    """
    if not settings.PAYMENT_WEBHOOK_SECRET or not settings.MERCADOPAGO_TOKEN:
        raise HTTPException(status_code=503, detail="Webhook nao configurado.")

    corpo = await request.body()
    try:
        evento = json.loads(corpo or b"{}")
    except Exception:
        raise HTTPException(status_code=400, detail="Corpo invalido.")

    # O MP manda o id ora na query, ora no corpo.
    data_id = str(
        request.query_params.get("data.id")
        or (evento.get("data") or {}).get("id")
        or evento.get("id")
        or ""
    )
    tipo = request.query_params.get("type") or evento.get("type") or evento.get("action", "")
    if "payment" not in str(tipo):
        return {"status": "ignorado", "motivo": "evento nao e de pagamento"}

    if not mercadopago.assinatura_confere(
        x_signature=request.headers.get("x-signature", ""),
        x_request_id=request.headers.get("x-request-id", ""),
        data_id=data_id,
        segredo=settings.PAYMENT_WEBHOOK_SECRET,
    ):
        raise HTTPException(status_code=401, detail="Assinatura invalida.")

    try:
        pagamento = await mercadopago.consultar_pagamento(settings.MERCADOPAGO_TOKEN, data_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    if not pagamento["aprovado"]:
        return {"status": "ignorado", "motivo": f"pagamento {pagamento['status']}"}

    return await confirmar_pagamento(
        provider_ref=pagamento["id"],
        provider_event=pagamento["id"],
        order_id=pagamento["order_id"],
    )


@app.get("/api/history")
async def get_search_history(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DBSearchHistory)
        .where(DBSearchHistory.owner_uid == user.get("uid"))
        .order_by(DBSearchHistory.timestamp.desc())
        .limit(50)
    )
    history = result.scalars().all()
    
    out = []
    for h in history:
        out.append({
            "id": h.id,
            "niche": h.niche,
            "location": h.location,
            "total_leads": h.total_leads,
            "timestamp": h.timestamp,
            "leads_preview": h.leads_preview
        })
    return out

@app.post("/api/sites", response_model=SiteItem)
async def publish_site(req: SiteCreateRequest, user: dict = Depends(get_current_user)):
    """Salva o site gerado, respeitando a cota do plano.

    O plano concede 10, 50 ou 200 sites, mas ate agora nada era conferido:
    dava para criar quantos quisesse. Admin passa direto, como nos
    creditos.
    """
    uid = user.get("uid")
    await exigir_recurso(user, "publicar_site", "Publicar o site")

    # Reeditar nao gasta vaga: a vaga foi cobrada quando o site nasceu.
    if req.site_id:
        try:
            atualizado = await update_site(
                uid, req.site_id, req.company, req.html,
                req.template or "", req.builder_data or "",
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        if atualizado is None:
            raise HTTPException(status_code=404, detail="Site não encontrado.")
        return atualizado

    if not is_admin(user.get("email")):
        perfil = await get_profile(uid)
        cota = perfil.sites_quota or 0
        usados = await contar_sites(uid)
        if usados >= cota:
            raise HTTPException(
                status_code=402,
                detail=(
                    f"Você já usou {usados} de {cota} sites do seu plano. "
                    "Faça um upgrade em Assinatura para criar mais."
                    if cota
                    else "Seu plano ainda não inclui sites. Escolha um plano em Assinatura."
                ),
            )

    try:
        return await create_site(
            uid, req.company, req.html, req.template or "", req.lead_id or "",
            req.builder_data or "",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# Como o "site" do Google e traduzido no CSV. O campo websiteUri quase
# nunca e site proprio: costuma ser Instagram, Linktree ou link de
# WhatsApp, e essa diferenca e o que qualifica o lead.
SITUACAO_DO_SITE = {
    "own": "site proprio",
    "social": "so rede social",
    "aggregator": "so agregador (Linktree e afins)",
    "whatsapp": "so link de WhatsApp",
    "none": "sem site",
}


@app.get("/api/leads/export")
async def exportar_leads(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Exporta os leads do usuario em CSV.

    A exportacao acontecia so no navegador, sem passar pelo backend, o
    que impedia qualquer controle de plano.
    """
    await exigir_recurso(user, "exportar_leads", "Exportar leads")

    result = await db.execute(select(DBLead).where(DBLead.owner_uid == user.get("uid")))
    leads = result.scalars().all()

    # A exportacao e o que o usuario leva para o CRM dele. Levar so o
    # telefone e a nota desperdicava tudo que a busca ja descobriu.
    colunas = [
        "Empresa", "Categoria", "Tipos", "Cidade", "Bairro", "Endereco", "CEP",
        "Latitude", "Longitude", "Telefone", "Outros telefones", "WhatsApp",
        "E-mail", "Outros e-mails", "Site", "Situacao do site", "Nota do site",
        "Problemas do site", "Plataforma do site", "Instagram", "Facebook",
        "LinkedIn", "Nota", "Avaliacoes", "Destaque de avaliacao", "Faixa de preco",
        "Horario", "Aberto agora", "Oportunidade", "Qualidade", "Falta",
        "Melhor canal", "Diagnostico", "Google Maps", "Status do contato",
    ]

    def escapar(valor) -> str:
        texto = "" if valor is None else str(valor)
        return '"' + texto.replace('"', '""') + '"'

    linhas = [",".join(colunas)]
    for l in leads:
        redes = l.socials or {}
        linhas.append(",".join(escapar(v) for v in [
            l.company, l.role, "; ".join(l.place_types or []), l.city, l.neighborhood,
            l.address, l.postal_code, l.latitude, l.longitude, l.phone,
            "; ".join(l.phones_extra or []), "sim" if l.whatsapp else "nao",
            l.email, "; ".join((l.all_emails or [])[1:]), l.website,
            SITUACAO_DO_SITE.get(l.site_status or "", ""), l.site_quality,
            "; ".join(l.site_issues or []), l.site_platform,
            redes.get("instagram", ""), redes.get("facebook", ""), redes.get("linkedin", ""),
            l.rating, l.rating_count, l.review_highlight, l.price_level,
            l.opening_hours, "sim" if l.open_now else ("nao" if l.open_now is False else ""),
            l.opportunityScore, l.quality_score,
            "; ".join(l.missingDigitalAssets or []), l.best_channel, l.diagnosis,
            l.maps_url, l.outreach_status,
        ]))

    # BOM para o Excel abrir os acentos corretamente
    conteudo = chr(65279) + chr(10).join(linhas)   # BOM: Excel abre os acentos
    return Response(
        content=conteudo,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="leads-leadsage.csv"'},
    )


@app.get("/api/plan")
async def meu_plano(user: dict = Depends(get_current_user)):
    """O que o plano do usuario libera, para a tela nao oferecer o que
    vai ser barrado depois."""
    if is_admin(user.get("email")):
        plano = plano_de("agencia")
        return {**plano, "plan_id": "agencia", "admin": True}
    perfil = await get_profile(user.get("uid"))
    plano = plano_de(perfil.plan_id or "previa")
    return {**plano, "plan_id": plano["id"], "admin": False}


@app.get("/api/s/{slug}", include_in_schema=False)
@app.get("/s/{slug}")
async def site_publico(slug: str):
    """Serve o site gerado para quem recebeu o link.

    Sem isto o site publicado nao existia para ninguem de fora: dava para
    baixar um .html e mandar anexo. Mas a venda depende de o dono do
    negocio abrir no celular e ver a propria loja no ar — anexo nao faz
    isso.

    Aberto de proposito, e sem sessao: nenhum dado do usuario sai daqui,
    so o HTML que ele mesmo montou para mostrar. O apelido carrega um
    sufixo aleatorio, entao o endereco nao se adivinha, e o noindex
    mantem o site fora do Google enquanto e so uma amostra de venda.
    """
    html = await html_publico(slug)
    if not html:
        raise HTTPException(status_code=404, detail="Site não encontrado.")
    return Response(
        content=html,
        media_type="text/html; charset=utf-8",
        headers={
            "X-Robots-Tag": "noindex, nofollow",
            "Cache-Control": "public, max-age=300",
            # O site publicado mora no MESMO dominio do app, e o HTML vem do
            # usuario: sem isto, um "site" com <script> rodaria com acesso a
            # sessao de qualquer usuario do LeadSage que abrisse o link. O
            # sandbox trata a pagina como origem isolada e bloqueia script;
            # os sites gerados sao so HTML e CSS, entao nada muda para eles.
            "Content-Security-Policy": (
                "sandbox allow-popups allow-popups-to-escape-sandbox "
                "allow-top-navigation-by-user-activation; script-src 'none'; object-src 'none'"
            ),
            "X-Content-Type-Options": "nosniff",
        },
    )


@app.get("/api/sites/quota")
async def cota_de_sites(user: dict = Depends(get_current_user)):
    """Quanto da cota ja foi usado, para a tela mostrar."""
    uid = user.get("uid")
    usados = await contar_sites(uid)
    if is_admin(user.get("email")):
        return {"usados": usados, "cota": None, "ilimitado": True}
    perfil = await get_profile(uid)
    return {"usados": usados, "cota": perfil.sites_quota or 0, "ilimitado": False}


@app.get("/api/sites")
async def get_sites(user: dict = Depends(get_current_user)):
    """Lista os sites, dando apelido aos que nasceram antes do link publico.

    Sem esse remendo, quem ja tinha sites ficaria sem link para sempre e
    teria de refazer cada um so para conseguir mandar ao cliente.
    """
    uid = user.get("uid")
    sites = await list_sites(uid)
    return [await garantir_apelido(uid, site) for site in sites]


@app.get("/api/sites/{site_id}", response_model=SiteItem)
async def get_single_site(site_id: str, user: dict = Depends(get_current_user)):
    site = await get_site(user.get("uid"), site_id)
    if not site:
        raise HTTPException(status_code=404, detail="Site nao encontrado.")
    return site


@app.delete("/api/sites/{site_id}")
async def remove_site(site_id: str, user: dict = Depends(get_current_user)):
    if not await delete_site(user.get("uid"), site_id):
        raise HTTPException(status_code=404, detail="Site nao encontrado.")
    return {"status": "deleted", "id": site_id}


@app.post("/api/documents", response_model=DocumentItem)
async def criar_documento(req: DocumentCreateRequest, user: dict = Depends(get_current_user)):
    """Salva a versao preenchida de um modelo de proposta ou contrato."""
    recurso = "propostas" if req.kind == "proposta" else "contratos"
    await exigir_recurso(user, recurso, f"Criar {req.kind}s")
    try:
        return await create_document(
            user.get("uid"), req.kind, req.title, req.content,
            req.fields, req.template_id or "", req.lead_id or "",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/documents")
async def listar_documentos(kind: str = None, user: dict = Depends(get_current_user)):
    return await list_documents(user.get("uid"), kind)


@app.get("/api/documents/{doc_id}", response_model=DocumentItem)
async def obter_documento(doc_id: str, user: dict = Depends(get_current_user)):
    doc = await get_document(user.get("uid"), doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento nao encontrado.")
    return doc


@app.put("/api/documents/{doc_id}", response_model=DocumentItem)
async def atualizar_documento(
    doc_id: str, req: DocumentUpdateRequest, user: dict = Depends(get_current_user)
):
    try:
        doc = await update_document(user.get("uid"), doc_id, req.title, req.content, req.fields)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not doc:
        raise HTTPException(status_code=404, detail="Documento nao encontrado.")
    return doc


@app.delete("/api/documents/{doc_id}")
async def remover_documento(doc_id: str, user: dict = Depends(get_current_user)):
    if not await delete_document(user.get("uid"), doc_id):
        raise HTTPException(status_code=404, detail="Documento nao encontrado.")
    return {"status": "deleted", "id": doc_id}


# ======================================================================
# Robo de atendimento (WhatsApp, Instagram, Messenger)
# ======================================================================

class RoboConfigRequest(BaseModel):
    app_secret: Optional[str] = None
    wa_token: Optional[str] = None
    wa_phone_id: Optional[str] = None
    page_id: Optional[str] = None
    page_token: Optional[str] = None
    ig_id: Optional[str] = None
    ativo: Optional[bool] = None
    objetivo: Optional[str] = None
    instrucoes: Optional[str] = Field(default=None, max_length=3000)
    link_agenda: Optional[str] = None
    nome_assistente: Optional[str] = Field(default=None, max_length=60)
    catalogo: Optional[str] = Field(default=None, max_length=4000)
    faq: Optional[str] = Field(default=None, max_length=4000)
    desconto_maximo: Optional[int] = Field(default=None, ge=0, le=50)
    # o servico que o robo vende; normalizado em ai_oferta antes de gravar
    oferta: Optional[Dict[str, Any]] = None


class RoboTextoRequest(BaseModel):
    texto: str = Field(min_length=1, max_length=2000)


class RoboAtivoRequest(BaseModel):
    ativo: bool


class RoboTesteRequest(BaseModel):
    """Conversa simulada: o historico vem da tela, nada e gravado."""
    mensagens: List[Dict[str, str]] = Field(default_factory=list, max_length=40)
    canal: str = "whatsapp"
    lead_id: Optional[str] = None
    # o estado da negociacao volta da tela a cada mensagem do simulador
    sdr: Optional[Dict[str, Any]] = None


@app.get("/api/robo/config")
async def robo_config(user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    canal = await robo_store.canal_do_usuario(user.get("uid"))
    return robo_store.visao_publica(canal, settings.APP_URL)


@app.put("/api/robo/config")
async def robo_salvar_config(req: RoboConfigRequest, user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    if req.objetivo and req.objetivo not in ("agendar", "site", "qualificar", "vender"):
        raise HTTPException(status_code=400, detail="Objetivo inválido.")
    dados = req.model_dump(exclude_none=True)
    if "oferta" in dados:
        dados["oferta"] = ai_oferta.normalizar(dados["oferta"])
    canal = await robo_store.salvar_canal(user.get("uid"), user.get("email", ""), dados)
    return robo_store.visao_publica(canal, settings.APP_URL)


@app.get("/api/robo/webhook/{gancho}")
async def robo_webhook_verificacao(gancho: str, request: Request):
    """O aperto de mao da Meta ao cadastrar o webhook.

    Ela manda hub.verify_token e espera de volta hub.challenge, em texto
    puro. Qualquer outra coisa — inclusive JSON — e recusada pela Meta.
    """
    canal = await robo_store.canal_por_gancho(gancho)
    q = request.query_params
    if (
        canal
        and q.get("hub.mode") == "subscribe"
        and q.get("hub.verify_token")
        and hmac_igual(q.get("hub.verify_token", ""), canal.get("verify_token", ""))
    ):
        return Response(content=q.get("hub.challenge", ""), media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verificação recusada.")


def hmac_igual(a: str, b: str) -> bool:
    import hmac as _hmac
    return bool(a) and bool(b) and _hmac.compare_digest(a, b)


@app.post("/api/robo/webhook/{gancho}")
async def robo_webhook(gancho: str, request: Request):
    """Mensagem chegando da Meta.

    Sem login, de proposito: quem chama e a Meta. O que autentica e a
    assinatura HMAC com o segredo do app daquele usuario — sem ela, a
    requisicao e descartada antes de ler qualquer coisa.

    Depois de autenticada, a resposta e sempre 200, mesmo se algo falhar
    no meio: a Meta reenvia o que nao recebeu 200, e um erro nosso viraria
    uma enxurrada de reenvios. A falha fica registrada na conversa.
    """
    canal = await robo_store.canal_por_gancho(gancho)
    corpo = await request.body()
    if not canal or not meta_canais.assinatura_confere(
        corpo, request.headers.get("x-hub-signature-256", ""), canal.get("app_secret", "")
    ):
        raise HTTPException(status_code=401, detail="Assinatura inválida.")

    try:
        dados = json.loads(corpo or b"{}")
    except ValueError:
        return {"ok": True}

    for msg in meta_canais.ler_eventos(dados, canal):
        try:
            await robo_service.processar(canal, msg)
        except Exception as exc:
            print(f"Robo: falha ao processar {msg.canal}/{msg.meta_id}: {exc}")
    return {"ok": True}


# ---------------------------------------------------------------- pipeline

class PipelineSyncRequest(BaseModel):
    leads: List[Dict[str, Any]] = Field(default_factory=list, max_length=300)


class PipelineMoverRequest(BaseModel):
    etapa: str
    # foto do lead, para o caso de o servidor ainda nao conhece-lo
    lead: Optional[Dict[str, Any]] = None


@app.get("/api/pipeline")
async def pipeline_listar(user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "pipeline", "O pipeline")
    itens = await pipeline_store.listar(user.get("uid"))
    for i in itens:
        i["historico"] = (i.get("historico") or [])[-5:]
    return {"etapas": list(pipeline_store.TODAS), "itens": itens}


@app.post("/api/pipeline/sync")
async def pipeline_sincronizar(req: PipelineSyncRequest, user: dict = Depends(get_current_user)):
    """O navegador entrega os leads que ja tem: e por esta copia que o robo
    reconhece quem escreveu."""
    await exigir_recurso(user, "pipeline", "O pipeline")
    return {"novos": await pipeline_store.registrar_varios(user.get("uid"), req.leads, origem="salvo")}


@app.delete("/api/pipeline/{lead_id}")
async def pipeline_remover(lead_id: str, user: dict = Depends(get_current_user)):
    """Tira um lead de Meus Leads (e do pipeline). So apaga o da propria conta."""
    await exigir_recurso(user, "pipeline", "O pipeline")
    await pipeline_store.apagar(user.get("uid"), lead_id)
    return {"status": "removed", "id": lead_id}


@app.put("/api/pipeline/{lead_id}/etapa")
async def pipeline_mover(lead_id: str, req: PipelineMoverRequest, user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "pipeline", "O pipeline")
    uid = user.get("uid")
    if not pipeline_store.etapa_valida(req.etapa):
        raise HTTPException(status_code=400, detail="Etapa desconhecida.")
    if await pipeline_store.obter(uid, lead_id) is None:
        if not req.lead:
            raise HTTPException(status_code=404, detail="Lead não encontrado no pipeline.")
        await pipeline_store.registrar(uid, {**req.lead, "id": lead_id})
    item = await pipeline_store.mover(uid, lead_id, req.etapa, motivo="movido por você", por="voce")
    return {"etapa": pipeline_store.etapa_valida(req.etapa), "mudou": item is not None}


# ------------------------------------------------------------- fila de envio

class FilaPrepararRequest(BaseModel):
    leads: List[Dict[str, Any]] = Field(default_factory=list, max_length=fila_envio.LOTE_MAXIMO)
    tom: str = "Consultivo"


def _lead_para_pitch(lead: Dict[str, Any]) -> LeadItem:
    """O navegador manda o lead como o tem; o que faltar vira vazio, para a
    abordagem não falhar por um campo opcional."""
    base = {"avatar": "", "role": "", "niche": "", "company": "", "location": "", "city": "", "email": "",
            "phone": "", "socials": {}, "quality_score": 0, "name": ""}
    dados = {**base, **{k: v for k, v in lead.items() if v is not None}}
    dados["socials"] = dados.get("socials") if isinstance(dados.get("socials"), dict) else {}
    return LeadItem.model_validate(dados)


async def _funcoes_da_fila(user: dict):
    """As três pontas que a fila usa: escrever, enviar e cobrar."""
    uid, email = user.get("uid"), user.get("email")
    perfil = await get_profile(uid)
    config = await get_integrations(uid)
    canal_robo = await robo_store.canal_do_usuario(uid) or {}
    produto = ""
    if ai_oferta.ativa(canal_robo):
        produto = ((canal_robo.get("oferta") or {}).get("nome") or "").strip()
    produto = produto or perfil.product_description or ""
    remetente = perfil.company_name or perfil.name or "Prospecção LeadSage"

    async def gerar(lead: Dict[str, Any], canal: str, tom: str = "Consultivo") -> Dict[str, Any]:
        pitch = await AIGenerator.generate_pitch(
            PitchGenerationRequest(lead=_lead_para_pitch(lead), channel=canal, tone=tom,
                                   sender_name=remetente, user_product=produto,
                                   service_brief=abordagem_mestra.produto(canal_robo, lead, produto)),
            api_key=settings.GEMINI_API_KEY,
        )
        return {"subject": pitch.subject, "body": pitch.body, "hook": pitch.hook,
                "follow_ups": [f.model_dump() for f in (pitch.follow_ups or [])]}

    async def enviar(lead: Dict[str, Any], assunto: str, corpo: str) -> str:
        req = DispatchRequest(lead_id=str(lead.get("id", "")), lead_name=lead.get("company") or lead.get("name") or "",
                              lead_email=lead.get("email") or "", channel="email", subject=assunto, body=corpo)
        resposta = await OutreachDispatcher.dispatch_message(req, 10**6, config)
        return resposta.status

    async def pode_enviar() -> bool:
        saldo = (await get_user_balance(uid, email)).get("credits", 0)
        return saldo >= DISPATCH_COST

    async def cobrar() -> None:
        await check_and_deduct_credits(uid, DISPATCH_COST, email)

    return gerar, enviar, pode_enviar, cobrar


@app.post("/api/robo/fila/preparar")
async def fila_preparar(req: FilaPrepararRequest, user: dict = Depends(get_current_user)):
    """O robô escreve a abordagem de cada lead e entrega no canal certo.

    E-mail sai sozinho (com limite diário); WhatsApp, Instagram e LinkedIn
    ficam na fila com o link pronto para a pessoa só enviar.
    """
    await exigir_recurso(user, "ia_abordagem", "O disparo")
    gerar, enviar, pode_enviar, cobrar = await _funcoes_da_fila(user)
    try:
        return await asyncio.wait_for(
            fila_envio.preparar_lote(user.get("uid"), req.leads,
                                     lambda l, c: gerar(l, c, req.tom), enviar, pode_enviar, cobrar),
            timeout=55,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="O preparo demorou demais. Envie menos leads por vez.")


@app.get("/api/robo/fila")
async def fila_listar(user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "ia_abordagem", "O disparo")
    itens = await fila_envio.listar(user.get("uid"))
    return {"itens": itens[:200], "resumo": fila_envio.resumo(itens)}


@app.post("/api/robo/fila/enviar-aguardando")
async def fila_enviar_aguardando(user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "ia_abordagem", "O disparo")
    _, enviar, pode_enviar, cobrar = await _funcoes_da_fila(user)
    return await fila_envio.enviar_aguardando(user.get("uid"), enviar, pode_enviar, cobrar)


@app.post("/api/robo/fila/{item_id}/enviado")
async def fila_marcar_enviado(item_id: str, user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "ia_abordagem", "O disparo")
    item = await fila_envio.marcar_enviado(user.get("uid"), item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item não encontrado na fila.")
    return item


@app.post("/api/robo/fila/{item_id}/pular")
async def fila_pular(item_id: str, user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "ia_abordagem", "O disparo")
    item = await fila_envio.pular(user.get("uid"), item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item não encontrado na fila.")
    return item


# ------------------------------------------------------------------ disparo

class DisparoRequest(BaseModel):
    lead_ids: List[str] = Field(default_factory=list, max_length=robo_disparo.TAMANHO_LOTE)
    consentimento: bool = False


@app.get("/api/robo/whatsapp/modelo")
async def robo_modelo_status(user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    cfg = await robo_store.canal_do_usuario(user.get("uid"))
    try:
        return {**await robo_disparo.status_modelo(cfg), "texto": robo_disparo.CORPO_PADRAO,
                "lote": robo_disparo.TAMANHO_LOTE}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except meta_oauth.MetaRecusou as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.post("/api/robo/whatsapp/modelo")
async def robo_modelo_criar(user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    cfg = await robo_store.canal_do_usuario(user.get("uid"))
    try:
        return await robo_disparo.criar_modelo(cfg)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except meta_oauth.MetaRecusou as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.post("/api/robo/disparar")
async def robo_disparar(req: DisparoRequest, user: dict = Depends(get_current_user)):
    """Primeira mensagem pelo WhatsApp do cliente, com modelo aprovado."""
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    await exigir_recurso(user, "ia_abordagem", "O disparo")
    uid, email = user.get("uid"), user.get("email", "")
    cfg = await robo_store.canal_do_usuario(uid)
    perfil = await get_profile(uid)
    try:
        return await robo_disparo.disparar(uid, email, cfg, perfil.model_dump(), req.lead_ids, req.consentimento)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except meta_oauth.MetaRecusou as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.get("/api/robo/conversas")
async def robo_conversas(user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    uid = user.get("uid")
    conversas = await robo_store.listar_conversas(uid)
    try:
        itens = await fila_envio.listar(uid)
    except Exception as exc:
        print(f"Caixa de entrada: sem a fila de envio: {exc}")
        itens = []
    return caixa_de_entrada.juntar(conversas, itens)


@app.get("/api/robo/conversas/{cid}")
async def robo_conversa(cid: str, user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    if cid.startswith(caixa_de_entrada.PREFIXO_ENVIO):
        item = await fila_envio.obter(user.get("uid"), cid[len(caixa_de_entrada.PREFIXO_ENVIO):])
        if not item or item.get("status") not in ("enviado", "enviando"):
            raise HTTPException(status_code=404, detail="Conversa não encontrada.")
        return caixa_de_entrada.conversa_do_envio(item)
    conversa = await robo_store.obter_conversa(user.get("uid"), cid)
    if not conversa:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")
    return conversa


@app.post("/api/robo/conversas/{cid}/robo")
async def robo_ligar_desligar(cid: str, req: RoboAtivoRequest, user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    uid = user.get("uid")
    conversa = await robo_store.obter_conversa(uid, cid)
    if not conversa:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")
    if req.ativo and conversa.get("optout"):
        # Religar o robo para quem pediu para sair e o caminho mais curto
        # para denuncia e banimento do numero.
        raise HTTPException(
            status_code=409,
            detail="Esta pessoa pediu para não receber mais mensagens. O robô não pode ser religado.",
        )
    conversa["robo_ativo"] = req.ativo
    if req.ativo:
        conversa["precisa_humano"] = False
        conversa["motivo"] = ""
    conversa["atualizado"] = robo_store.agora()
    await robo_store.salvar_conversa(uid, conversa)
    return conversa


@app.post("/api/robo/conversas/{cid}/responder")
async def robo_responder(cid: str, req: RoboTextoRequest, user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    if cid.startswith(caixa_de_entrada.PREFIXO_ENVIO):
        raise HTTPException(
            status_code=409,
            detail="Esta pessoa ainda não respondeu. Quando responder, a conversa se abre aqui e você pode escrever.",
        )
    try:
        return await robo_service.responder_como_humano(user.get("uid"), cid, req.texto)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except meta_canais.EnvioFalhou as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@app.post("/api/robo/testar")
async def robo_testar(req: RoboTesteRequest, user: dict = Depends(get_current_user)):
    """Simulador: o robo responde sem Meta, sem envio e sem gravar.

    Serve para o dono ajustar as instrucoes antes de ligar o robo para
    clientes de verdade. Cobra o mesmo credito de uma resposta real: e a
    mesma chamada de IA.
    """
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    uid, email = user.get("uid"), user.get("email", "")
    canal = await robo_store.canal_do_usuario(uid) or {}
    perfil = await get_profile(uid)

    mensagens = [
        {"de": "contato" if m.get("de") == "contato" else "robo", "texto": str(m.get("texto", ""))[:2000]}
        for m in req.mensagens
    ]
    if not mensagens or mensagens[-1]["de"] != "contato":
        raise HTTPException(status_code=400, detail="A última mensagem precisa ser do contato.")

    lead, raio = None, None
    if req.lead_id:
        lead = await robo_service._lead_por_id(uid, req.lead_id)
        raio = await raio_x.ler_cache(uid, req.lead_id)

    if await check_and_deduct_credits(uid, robo_service.CUSTO_RESPOSTA, email) is None:
        raise HTTPException(status_code=402, detail="Créditos insuficientes para testar o robô.")

    try:
        decisao = await asyncio.wait_for(
            asyncio.to_thread(
                robo_decidir, mensagens, req.canal, perfil.model_dump(), canal, lead,
                robo_service._gerador_padrao(), raio, req.sdr,
            ),
            timeout=robo_service.PRAZO_IA + 6,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="A IA demorou demais. Tente de novo.")
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"A IA não respondeu: {exc}")

    return {
        "resposta": decisao.resposta,
        "mensagens": decisao.mensagens or ([decisao.resposta] if decisao.resposta else []),
        "sdr": decisao.sdr,
        "usou_dossie": bool(lead or raio),
        "passar_para_humano": decisao.passar_para_humano,
        "motivo": decisao.motivo,
        "optout": decisao.optout,
    }


# ------------------------------------------- conexao com um clique

class MetaPaginaRequest(BaseModel):
    page_id: str = Field(min_length=1, max_length=40)


class MetaWhatsAppRequest(BaseModel):
    code: str = Field(min_length=1, max_length=2000)
    waba_id: str = Field(min_length=1, max_length=40)
    phone_number_id: str = Field(min_length=1, max_length=40)


class MetaDesconectarRequest(BaseModel):
    alvo: str


class TelegramConectarRequest(BaseModel):
    token: str = Field(min_length=20, max_length=80)


@app.post("/api/robo/telegram/conectar")
async def telegram_conectar(req: TelegramConectarRequest, user: dict = Depends(get_current_user)):
    """Liga o bot do usuário (criado no @BotFather) ao robô."""
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    uid = user.get("uid")
    canal = await robo_conexao._canal(uid, user.get("email", ""))
    try:
        canal = await telegram_canal.conectar(canal, req.token, settings.APP_URL)
    except telegram_canal.TelegramRecusou as exc:
        raise HTTPException(status_code=400, detail=f"O Telegram recusou: {exc}")
    canal = await robo_store.substituir_canal(uid, canal)
    return robo_store.visao_publica(canal, settings.APP_URL)


@app.post("/api/robo/telegram/desconectar")
async def telegram_desconectar(user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    uid = user.get("uid")
    canal = await robo_conexao._canal(uid, user.get("email", ""))
    canal = await telegram_canal.desconectar(canal)
    canal = await robo_store.substituir_canal(uid, canal)
    return robo_store.visao_publica(canal, settings.APP_URL)


@app.post("/api/robo/telegram/{gancho}")
async def telegram_webhook(gancho: str, request: Request):
    """Mensagem chegando do Telegram.

    Sem login, de propósito: quem chama é o Telegram. O que autentica é o
    segredo que definimos no cadastro do webhook, devolvido no cabeçalho.
    Autenticada, a resposta é sempre 200 para o Telegram não reenviar.
    """
    canal = await robo_store.canal_por_gancho(gancho)
    if not canal or not telegram_canal.segredo_confere(
        canal, request.headers.get("x-telegram-bot-api-secret-token", "")
    ):
        raise HTTPException(status_code=401, detail="Assinatura inválida.")
    try:
        dados = await request.json()
    except ValueError:
        return {"ok": True}
    if not isinstance(dados, dict):
        return {"ok": True}
    for msg in telegram_canal.ler_update(dados):
        try:
            await robo_service.processar(canal, msg)
        except Exception as exc:
            print(f"Robo: falha ao processar telegram/{msg.meta_id}: {exc}")
    return {"ok": True}


# ------------------------------------------------- WhatsApp pelo computador (Conector)

class ConectorPing(BaseModel):
    numero: str = Field(default="", max_length=40)
    status: str = Field(default="", max_length=40)
    versao: str = Field(default="", max_length=20)


class ConectorMensagem(BaseModel):
    id: str = Field(min_length=1, max_length=160)
    contato: str = Field(min_length=8, max_length=40)
    nome: str = Field(default="", max_length=120)
    texto: str = Field(min_length=1, max_length=4000)
    momento: int = 0


class ConectorResultado(BaseModel):
    ok: bool
    erro: str = Field(default="", max_length=300)


# A chave e conferida a cada chamada do Conector; guardar o canal por alguns
# segundos poupa leituras do Firestore (que cobra por documento lido).
_CACHE_CONECTOR: Dict[str, Any] = {}
_CACHE_CONECTOR_S = 15


async def _canal_do_conector(request: Request) -> Dict[str, Any]:
    chave = request.headers.get("x-conector-key", "")
    if not conector_whatsapp.chave_valida(chave):
        raise HTTPException(status_code=401, detail="Chave do Conector inválida.")
    h = conector_whatsapp.hash_da_chave(chave)
    quando, canal = _CACHE_CONECTOR.get(h, (0.0, None))
    if canal is None or time.monotonic() - quando > _CACHE_CONECTOR_S:
        canal = await conector_whatsapp.canal_da_chave(chave)
        if canal is None:
            _CACHE_CONECTOR.pop(h, None)
            if robo_store.firestore_falhou_agora():
                # o banco não respondeu: não dá para saber se a chave vale. Não é "revogada".
                raise HTTPException(status_code=503, detail="O LeadSage está com o banco de dados indisponível agora. O Conector tenta de novo.")
            raise HTTPException(status_code=401, detail="Chave do Conector inválida ou revogada.")
        _CACHE_CONECTOR[h] = (time.monotonic(), canal)
    return canal


async def _gravar_canal_do_conector(canal: Dict[str, Any]) -> None:
    await robo_store.substituir_canal(canal["uid"], canal)
    if canal.get("cw_hash"):
        _CACHE_CONECTOR[canal["cw_hash"]] = (time.monotonic(), canal)


MSG_BANCO_SEM_COTA = (
    "O banco de dados do LeadSage está sem cota agora (limite do plano gratuito do Firebase), "
    "e uma chave gerada neste estado não funcionaria. Tente de novo depois das 4h da manhã (horário de Brasília), "
    "quando a cota volta, ou assim que o faturamento do Firebase for ativado."
)


def _exigir_banco_disponivel() -> None:
    if robo_store.firestore_falhou_agora():
        raise HTTPException(status_code=503, detail=MSG_BANCO_SEM_COTA)


@app.post("/api/robo/conector/gerar")
async def conector_gerar(user: dict = Depends(get_current_user)):
    """Cria (ou troca) a chave que liga o Conector do PC a esta conta. Aparece uma vez."""
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    uid = user.get("uid")
    canal = await robo_conexao._canal(uid, user.get("email", ""))
    _exigir_banco_disponivel()
    antigo = canal.get("cw_hash")
    chave = await conector_whatsapp.criar_chave(canal)
    await robo_store.registrar_ativo("conector", canal["cw_hash"], uid, canal["gancho"])
    canal = await robo_store.substituir_canal(uid, canal)
    if robo_store.firestore_falhou_agora():
        # a gravação caiu no banco temporário: a chave não valeria na próxima chamada
        raise HTTPException(status_code=503, detail=MSG_BANCO_SEM_COTA)
    if antigo:
        _CACHE_CONECTOR.pop(antigo, None)
    return {"chave": chave, **robo_store.visao_publica(canal, settings.APP_URL)}


@app.post("/api/robo/conector/revogar")
async def conector_revogar(user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    uid = user.get("uid")
    canal = await robo_conexao._canal(uid, user.get("email", ""))
    antigo = canal.get("cw_hash")
    canal = await conector_whatsapp.revogar(canal)
    canal = await robo_store.substituir_canal(uid, canal)
    if antigo:
        _CACHE_CONECTOR.pop(antigo, None)
    return robo_store.visao_publica(canal, settings.APP_URL)


@app.post("/api/conector/ping")
async def conector_ping(req: ConectorPing, request: Request):
    """O Conector avisa que está vivo e qual número está ligado."""
    canal = await _canal_do_conector(request)
    agora_dt = datetime.now(timezone.utc)
    visto = conector_whatsapp._ler_data(canal.get("cw_visto"))
    mudou = (req.numero and req.numero != canal.get("cw_numero")) or (req.status != canal.get("cw_status", ""))
    if mudou or not visto or (agora_dt - visto).total_seconds() > 80:
        canal["cw_visto"] = agora_dt.isoformat()
        canal.setdefault("cw_primeiro", canal["cw_visto"])
        if req.numero:
            canal["cw_numero"] = re.sub(r"\D", "", req.numero)[:20]
        canal["cw_status"] = req.status
        canal["cw_versao"] = req.versao
        await _gravar_canal_do_conector(canal)
    return {"ok": True, "limite_frio": conector_whatsapp.limite_frio_do_dia(canal)}


@app.get("/api/conector/tarefas")
async def conector_tarefas(request: Request):
    canal = await _canal_do_conector(request)
    if not canal.get("cw_primeiro"):
        canal["cw_primeiro"] = datetime.now(timezone.utc).isoformat()
    antes = (canal.get("cw_ultimo_frio"), canal.get("cw_frio_n"), canal.get("cw_primeiro"))
    resposta = await conector_whatsapp.tarefas(canal)
    if antes != (canal.get("cw_ultimo_frio"), canal.get("cw_frio_n"), canal.get("cw_primeiro")):
        await _gravar_canal_do_conector(canal)
    return resposta


@app.post("/api/conector/tarefas/{tarefa_id}/resultado")
async def conector_resultado(tarefa_id: str, req: ConectorResultado, request: Request):
    canal = await _canal_do_conector(request)
    if not await conector_whatsapp.registrar_resultado(canal, tarefa_id, req.ok, req.erro):
        raise HTTPException(status_code=404, detail="Tarefa não encontrada.")
    return {"ok": True}


class ConectorFala(BaseModel):
    de: str = Field(pattern="^(contato|voce)$")
    texto: str = Field(max_length=1500)


class ConectorResponder(BaseModel):
    mensagens: List[ConectorFala] = Field(min_length=1, max_length=30)
    telefone: str = Field(default="", max_length=40)


@app.post("/api/conector/responder")
async def conector_responder(req: ConectorResponder, request: Request):
    """Sugere a resposta para a conversa que a extensão leu na tela. Não guarda nada."""
    canal = await _canal_do_conector(request)
    telefone = conector_whatsapp.telefone_whatsapp(req.telefone) if req.telefone else ""
    try:
        return await robo_service.responder_sem_guardar(canal, [m.model_dump() for m in req.mensagens], telefone)
    except PermissionError as exc:
        raise HTTPException(status_code=402, detail=str(exc))
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="A IA demorou para responder. Tente de novo.")
    except Exception as exc:
        print(f"Robo: falha ao sugerir resposta: {exc}")
        raise HTTPException(status_code=503, detail="Não foi possível gerar a resposta agora.")


@app.post("/api/conector/mensagem")
async def conector_mensagem(req: ConectorMensagem, request: Request):
    """Um lead respondeu no WhatsApp do usuário. O robô decide e enfileira a resposta."""
    canal = await _canal_do_conector(request)
    contato = conector_whatsapp.telefone_whatsapp(req.contato)
    if not 10 <= len(contato) <= 15:
        raise HTTPException(status_code=422, detail="Número de contato inválido.")
    canal["cw_atividade"] = datetime.now(timezone.utc).isoformat()
    await _gravar_canal_do_conector(canal)
    msg = meta_canais.Recebida(canal="whatsapp", contato=contato, nome=req.nome.strip(),
                               texto=req.texto.strip(), meta_id=req.id, momento=req.momento)
    try:
        conversa = await robo_service.processar(canal, msg)
    except Exception as exc:
        print(f"Robo: falha ao processar mensagem do conector {req.id}: {exc}")
        return {"ok": False}
    return {"ok": True, "precisa_humano": bool(conversa.get("precisa_humano"))}


@app.get("/api/robo/meta/disponivel")
async def meta_disponivel(user: dict = Depends(get_current_user)):
    """Diz a tela quais botoes mostrar. Sem app da Meta configurado no
    sistema, so o modo manual existe."""
    return {
        **meta_oauth.disponivel(),
        "app_id": settings.META_APP_ID,
        "wa_config_id": settings.META_WA_CONFIG_ID,
    }


@app.get("/api/robo/meta/conectar")
async def meta_conectar(user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    if not meta_oauth.disponivel()["facebook"]:
        raise HTTPException(status_code=503, detail="A conexão com o Facebook ainda não foi ativada no sistema.")
    return {"url": meta_oauth.url_de_login(user.get("uid"))}


@app.get("/api/robo/meta/retorno")
async def meta_retorno(request: Request):
    """Para onde o Facebook devolve o navegador depois do login.

    Sem login nosso: quem chega aqui e o navegador vindo do Facebook. Quem
    e o usuario sai do `state` assinado — e por isso ele tem assinatura e
    validade. A resposta e sempre um redirecionamento de volta ao app,
    com o resultado na URL, porque a pessoa esta olhando para esta tela.
    """
    q = request.query_params
    destino = f"{settings.APP_URL}/?tela=robo&meta="

    if q.get("error"):
        motivo = q.get("error_description") or "A conexão foi cancelada."
        return RedirectResponse(destino + "erro&msg=" + _quote(motivo[:200]))
    try:
        uid = meta_oauth.ler_state(q.get("state", ""))
        token = await meta_oauth.trocar_codigo(q.get("code", ""))
        await robo_conexao.lembrar_quem_autorizou(uid, await meta_oauth.quem_autorizou(token))
        paginas = await meta_oauth.listar_paginas(token)
        if not paginas:
            return RedirectResponse(destino + "erro&msg=" + _quote(
                "Nenhuma página do Facebook foi autorizada. Conecte de novo e marque a página da sua empresa."))
        canal = await robo_conexao.guardar_paginas(uid, paginas)
    except (meta_oauth.MetaRecusou, LookupError) as exc:
        return RedirectResponse(destino + "erro&msg=" + _quote(str(exc)[:200]))

    return RedirectResponse(destino + ("escolher" if canal.get("paginas_pendentes") else "ok"))


@app.post("/api/robo/meta/pagina")
async def meta_escolher_pagina(req: MetaPaginaRequest, user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    try:
        canal = await robo_conexao.escolher_pagina(user.get("uid"), req.page_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except meta_oauth.MetaRecusou as exc:
        raise HTTPException(status_code=502, detail=f"A Meta recusou: {exc}")
    return robo_store.visao_publica(canal, settings.APP_URL)


@app.post("/api/robo/meta/whatsapp")
async def meta_conectar_whatsapp(req: MetaWhatsAppRequest, user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    if not meta_oauth.disponivel()["whatsapp"]:
        raise HTTPException(status_code=503, detail="A conexão do WhatsApp ainda não foi ativada no sistema.")
    try:
        dados = await meta_oauth.concluir_whatsapp(req.code, req.waba_id, req.phone_number_id)
    except meta_oauth.MetaRecusou as exc:
        raise HTTPException(status_code=502, detail=f"A Meta recusou: {exc}")
    canal = await robo_conexao.conectar_whatsapp(user.get("uid"), user.get("email", ""), dados)
    return robo_store.visao_publica(canal, settings.APP_URL)


@app.post("/api/robo/meta/desconectar")
async def meta_desconectar(req: MetaDesconectarRequest, user: dict = Depends(get_current_user)):
    await exigir_recurso(user, "robo_ia", "O robô de atendimento")
    try:
        canal = await robo_conexao.desconectar(user.get("uid"), req.alvo)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return robo_store.visao_publica(canal, settings.APP_URL)


@app.post("/api/robo/meta/exclusao")
async def meta_exclusao(request: Request):
    """Pedido de exclusao de dados da Meta (Data Deletion Callback).

    Chega quando alguem remove o LeadSage da propria conta do Facebook. A
    Meta exige que o app apague o que recebeu dela e devolva um endereco
    onde a pessoa acompanha o pedido, com um codigo de confirmacao.
    """
    formulario = await request.form()
    try:
        dados = meta_oauth.ler_signed_request(str(formulario.get("signed_request", "")))
    except meta_oauth.MetaRecusou as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    codigo = uuid.uuid4().hex[:16]
    apagadas = await robo_conexao.excluir_por_pedido_da_meta(str(dados.get("user_id", "")))
    await robo_store.registrar_exclusao(codigo, apagadas)
    return {
        "url": f"{settings.APP_URL}/api/robo/meta/exclusao/{codigo}",
        "confirmation_code": codigo,
    }


@app.get("/api/robo/meta/exclusao/{codigo}")
async def meta_exclusao_status(codigo: str):
    """Onde a pessoa confere que a exclusao foi feita. Sem login."""
    registro = await robo_store.ler_exclusao(codigo)
    if not registro:
        corpo = "<h1>Pedido não encontrado</h1><p>Confira o código de confirmação.</p>"
    else:
        corpo = (
            "<h1>Dados excluídos</h1>"
            f"<p>Pedido <b>{codigo}</b> concluído em {registro.get('em', '')[:10]}.</p>"
            "<p>O LeadSage apagou os acessos à sua página, Instagram e WhatsApp e as "
            "conversas recebidas por eles.</p>"
        )
    return Response(
        content=f'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
                f'<title>Exclusão de dados — LeadSage</title>'
                f'<body style="font-family:system-ui;max-width:560px;margin:48px auto;padding:0 16px;color:#1f2937">'
                f'{corpo}</body>',
        media_type="text/html; charset=utf-8",
    )


@app.get("/api/robo/meta/webhook")
async def meta_webhook_verificacao(request: Request):
    """Aperto de mao do webhook do app do LeadSage (um so, para todos)."""
    q = request.query_params
    if (
        settings.META_VERIFY_TOKEN
        and q.get("hub.mode") == "subscribe"
        and hmac_igual(q.get("hub.verify_token", ""), settings.META_VERIFY_TOKEN)
    ):
        return Response(content=q.get("hub.challenge", ""), media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verificação recusada.")


@app.post("/api/robo/meta/webhook")
async def meta_webhook(request: Request):
    """Todas as mensagens de todos os clientes conectados pelo app.

    Assinado com o segredo do app do sistema. Cada pedaco e roteado pelo
    ativo que recebeu a mensagem (pagina, Instagram ou numero) ate o
    cliente dono dele; ativo desconhecido e ignorado em silencio — pode
    ser alguem que desconectou e a Meta ainda nao parou de mandar.
    """
    corpo = await request.body()
    if not meta_canais.assinatura_confere(
        corpo, request.headers.get("x-hub-signature-256", ""), settings.META_APP_SECRET
    ):
        raise HTTPException(status_code=401, detail="Assinatura inválida.")
    try:
        dados = json.loads(corpo or b"{}")
    except ValueError:
        return {"ok": True}

    for tipo, ativo_id, pedaco in robo_conexao.dividir_por_ativo(dados):
        canal = await robo_store.canal_por_ativo(tipo, ativo_id)
        if not canal:
            continue
        for msg in meta_canais.ler_eventos(pedaco, canal):
            try:
                await robo_service.processar(canal, msg)
            except Exception as exc:
                print(f"Robo: falha ao processar {msg.canal}/{msg.meta_id}: {exc}")
    return {"ok": True}


# ------------------------------------------------------------- raio-x

class RaioXRequest(BaseModel):
    place_id: str = Field(pattern=r"^[A-Za-z0-9_-]{10,200}$")
    website: Optional[str] = Field(default="", max_length=500)
    instagram: Optional[str] = Field(default="", max_length=200)
    # refazer mesmo com o guardado ainda valido (cobra de novo)
    refazer: bool = False
    # o que a tela ja sabe do lead; alimenta a abordagem personalizada
    lead: Optional[Dict[str, Any]] = None


def raio_x_contexto(lead: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Só os campos que a abordagem usa, com tamanho limitado: o corpo vem do
    navegador e vai para dentro de um prompt."""
    lead = lead or {}
    texto = {k: str(lead.get(k) or "")[:160] for k in
             ("id", "company", "name", "niche", "city", "neighborhood", "best_channel", "phone", "email")}
    numeros = {k: lead.get(k) for k in ("rating", "rating_count") if isinstance(lead.get(k), (int, float))}
    return {**texto, **numeros, "whatsapp": bool(lead.get("whatsapp"))}


@app.post("/api/raio-x")
async def gerar_raio_x(req: RaioXRequest, user: dict = Depends(get_current_user)):
    """O lead a fundo: Google Meu Negocio, site, Instagram e quem cuida.

    Cobra 1 credito na primeira vez e guarda por 7 dias: reabrir o lead
    nao gasta de novo. O custo existe porque o detalhe do Google e uma
    consulta por lugar, ao contrario da busca, que traz 20 por consulta.
    """
    uid, email = user.get("uid"), user.get("email", "")

    if not req.refazer:
        guardado = await raio_x.ler_cache(uid, req.place_id)
        if guardado:
            return {**guardado, "do_cache": True}

    if await check_and_deduct_credits(uid, 1, email) is None:
        raise HTTPException(status_code=402, detail="Créditos insuficientes para o raio-x.")

    canal = await robo_store.canal_do_usuario(uid) or {}
    perfil_rx = await get_profile(uid)
    canal = {**canal, "_remetente": perfil_rx.company_name or perfil_rx.name or "",
             "_produto": perfil_rx.product_description or ""}
    try:
        dados = await asyncio.wait_for(
            raio_x.montar(req.place_id, req.website or "", req.instagram or "", canal,
                          raio_x_contexto(req.lead)),
            timeout=55,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="O raio-x demorou demais. Tente de novo.")

    await raio_x.gravar_cache(uid, req.place_id, dados)
    return {**dados, "do_cache": False}


@app.get("/api/imagens")
async def imagens(nicho: str = "", termo: str = "", user: dict = Depends(get_current_user)):
    """Fotos profissionais do ramo para montar o site. Sem custo de credito:
    sao bancos gratuitos, e foto e o que tira o site da cara de rascunho."""
    return await banco_imagens.buscar(nicho=nicho[:80], termo=termo[:80])


@app.get("/api/place-photo")
async def place_photo(name: str):
    """Serve a foto do Google Maps sem expor a chave da API.

    O avatar antes vinha como URL direta com `key=<GOOGLE_MAPS_API_KEY>`
    embutida, ou seja, a chave ia no HTML de todo usuario.
    """
    # Regex em vez de so checar o prefixo: `name` entra numa URL, entao
    # "places/../../algo" poderia sair do caminho pretendido.
    if not PLACE_PHOTO_RE.fullmatch(name):
        raise HTTPException(status_code=400, detail="Referência de foto inválida.")
    if not settings.GOOGLE_MAPS_API_KEY:
        raise HTTPException(status_code=503, detail="Chave do Google Maps nao configurada.")

    url = f"https://places.googleapis.com/v1/{name}/media"
    params = {"maxHeightPx": 400, "maxWidthPx": 400, "key": settings.GOOGLE_MAPS_API_KEY}
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, params=params)
    except Exception:
        raise HTTPException(status_code=502, detail="Falha ao buscar a foto.")

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail="Foto indisponivel.")

    return Response(
        content=resp.content,
        media_type=resp.headers.get("content-type", "image/jpeg"),
        headers={"Cache-Control": "public, max-age=86400"},
    )


@app.delete("/api/history/{search_id}")
async def delete_search_history(
    search_id: str,
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Apaga uma busca do historico e os leads que vieram dela.

    O filtro por owner_uid impede apagar o historico de outro usuario.
    """
    uid = user.get("uid")
    result = await db.execute(
        select(DBSearchHistory).where(
            DBSearchHistory.id == search_id, DBSearchHistory.owner_uid == uid
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Busca nao encontrada.")

    leads = await db.execute(
        select(DBLead).where(DBLead.search_id == search_id, DBLead.owner_uid == uid)
    )
    for lead in leads.scalars().all():
        await db.delete(lead)

    await db.delete(entry)
    await db.commit()
    return {"status": "deleted", "id": search_id}


@app.delete("/api/history")
async def clear_search_history(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Limpa o historico inteiro e os leads que vieram das buscas.

    Leads que a pessoa ja salvou em "Meus Leads" ficam no pipeline do
    servidor (que e separado) e nao sao tocados aqui.
    """
    uid = user.get("uid")
    historico = await db.execute(select(DBSearchHistory).where(DBSearchHistory.owner_uid == uid))
    entradas = historico.scalars().all()
    for entrada in entradas:
        leads = await db.execute(
            select(DBLead).where(DBLead.search_id == entrada.id, DBLead.owner_uid == uid)
        )
        for lead in leads.scalars().all():
            await db.delete(lead)
        await db.delete(entrada)
    await db.commit()
    return {"status": "cleared", "removidas": len(entradas)}


@app.get("/api/suggested-niches")
def get_suggested_niches():
    return [
        {"niche": "Farmacêuticos", "icon": "Pill", "count": "1,420+", "avg_score": 96, "locations": ["Botucatu", "São Paulo", "Campinas"]},
        {"niche": "Médicos & Clínicas", "icon": "Stethoscope", "count": "2,850+", "avg_score": 98, "locations": ["Botucatu", "Ribeirão Preto", "Curitiba"]},
        {"niche": "Dentistas & Ortodontia", "icon": "Smile", "count": "1,180+", "avg_score": 94, "locations": ["Botucatu", "Bauru", "Sorocaba"]},
        {"niche": "Corretores de Imóveis", "icon": "Home", "count": "3,400+", "avg_score": 91, "locations": ["Botucatu", "São Paulo", "Santos"]},
        {"niche": "Advogados Empresariais", "icon": "Briefcase", "count": "990+", "avg_score": 95, "locations": ["Botucatu", "São José dos Campos", "Belo Horizonte"]}
    ]
