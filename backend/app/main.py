import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import json

from app.config import settings
from app.database import init_db, get_db, DBLead, DBSearchHistory

from app.models import (
    LeadSearchRequest, LeadSearchResponse, LeadItem, LeadSocialLinks,
    PitchGenerationRequest, PitchGenerationResponse,
    DispatchRequest, DispatchResponse,
    CreditTopUpRequest, CheckoutRequest, UserProfile,
    DemoSiteRequest, DemoSiteResponse,
    SiteCreateRequest, SiteItem, IntegrationSettings,
    DocumentCreateRequest, DocumentUpdateRequest, DocumentItem
)
from app.leads_engine import LeadsEngine
from app.ai_generator import AIGenerator
from app.dispatcher import OutreachDispatcher, DispatchError
from app.credit_system import check_and_deduct_credits, get_user_balance
import httpx
from app.firebase_config import get_current_user, db as firestore_db
from app.profile_store import get_profile, save_profile
from app.sites_store import (
    create_site, update_site, list_sites, get_site, delete_site, contar_sites,
)
from app.credit_system import is_admin, BancoDeCreditosIndisponivel
from app.integrations_store import get_integrations, save_integrations, public_view
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
        "armazenamento": "firestore" if firestore_db is not None else "indisponivel",
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

    # Save to SQLite DB
    for lead in leads:
        db_lead = DBLead(
            id=lead.id,
            name=lead.name,
            avatar=lead.avatar,
            role=lead.role,
            niche=lead.niche,
            company=lead.company,
            location=lead.location,
            city=lead.city,
            email=lead.email,
            phone=lead.phone,
            whatsapp=lead.whatsapp,
            socials=lead.socials.model_dump() if lead.socials else None,
            website=lead.website,
            address=lead.address,
            quality_score=lead.quality_score,
            verified=lead.verified,
            bio=lead.bio,
            ai_summary=lead.ai_summary,
            match_intent=lead.match_intent,
            match_location=lead.match_location,
            match_business=lead.match_business,
            experience=lead.experience,
            opportunityScore=lead.opportunityScore,
            missingDigitalAssets=lead.missingDigitalAssets,
            outreach_status=lead.outreach_status,
            last_contacted_at=lead.last_contacted_at,
            last_message=lead.last_message,
            match_category=lead.match_category,
            pipeline_stage=lead.pipeline_stage,
            rating=lead.rating,
            rating_count=lead.rating_count,
            maps_url=lead.maps_url,
            business_status=lead.business_status,
            opening_hours=lead.opening_hours,
            all_emails=lead.all_emails,
            contactability=lead.contactability,
            owner_uid=uid,
            search_id=search_id,
        )
        await db.merge(db_lead)

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
    await exigir_recurso(user, "ia_abordagem", "A IA de abordagem")
    gemini_key = settings.GEMINI_API_KEY
    return await AIGenerator.generate_pitch(req, api_key=gemini_key)

@app.post("/api/generate-demo-site", response_model=DemoSiteResponse)
async def generate_demo_site(request: Request, req: DemoSiteRequest, user: dict = Depends(get_current_user)):
    gemini_key = settings.GEMINI_API_KEY
    return await AIGenerator.generate_demo_site(req, api_key=gemini_key)

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

    result = await db.execute(select(DBLead).where(DBLead.id == req.lead_id))
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


@app.get("/api/leads/export")
async def exportar_leads(user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Exporta os leads do usuario em CSV.

    A exportacao acontecia so no navegador, sem passar pelo backend, o
    que impedia qualquer controle de plano.
    """
    await exigir_recurso(user, "exportar_leads", "Exportar leads")

    result = await db.execute(select(DBLead).where(DBLead.owner_uid == user.get("uid")))
    leads = result.scalars().all()

    colunas = [
        "Empresa", "Categoria", "Cidade", "Endereco", "Telefone", "WhatsApp",
        "E-mail", "Site", "Instagram", "Facebook", "Nota", "Avaliacoes",
        "Oportunidade", "Falta", "Google Maps",
    ]

    def escapar(valor) -> str:
        texto = "" if valor is None else str(valor)
        return '"' + texto.replace('"', '""') + '"'

    linhas = [",".join(colunas)]
    for l in leads:
        redes = l.socials or {}
        linhas.append(",".join(escapar(v) for v in [
            l.company, l.role, l.city, l.address, l.phone,
            "sim" if l.whatsapp else "nao", l.email, l.website,
            redes.get("instagram", ""), redes.get("facebook", ""),
            l.rating, l.rating_count, l.opportunityScore,
            "; ".join(l.missingDigitalAssets or []), l.maps_url,
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
    return await list_sites(user.get("uid"))


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


@app.get("/api/suggested-niches")
def get_suggested_niches():
    return [
        {"niche": "Farmacêuticos", "icon": "Pill", "count": "1,420+", "avg_score": 96, "locations": ["Botucatu", "São Paulo", "Campinas"]},
        {"niche": "Médicos & Clínicas", "icon": "Stethoscope", "count": "2,850+", "avg_score": 98, "locations": ["Botucatu", "Ribeirão Preto", "Curitiba"]},
        {"niche": "Dentistas & Ortodontia", "icon": "Smile", "count": "1,180+", "avg_score": 94, "locations": ["Botucatu", "Bauru", "Sorocaba"]},
        {"niche": "Corretores de Imóveis", "icon": "Home", "count": "3,400+", "avg_score": 91, "locations": ["Botucatu", "São Paulo", "Santos"]},
        {"niche": "Advogados Empresariais", "icon": "Briefcase", "count": "990+", "avg_score": 95, "locations": ["Botucatu", "São José dos Campos", "Belo Horizonte"]}
    ]
