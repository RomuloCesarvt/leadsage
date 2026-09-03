import uuid
from datetime import datetime
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.responses import Response
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
    CreditTopUpRequest, UserProfile,
    DemoSiteRequest, DemoSiteResponse
)
from app.leads_engine import LeadsEngine
from app.ai_generator import AIGenerator
from app.dispatcher import OutreachDispatcher
from app.credit_system import check_and_deduct_credits, get_user_balance, add_credits
import httpx
from app.firebase_config import get_current_user

app = FastAPI(
    title="LeadSage API",
    description="Backend Python para busca de leads com IA, enriquecimento e disparo automatizado.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CURRENT_USER = UserProfile()

@app.on_event("startup")
async def on_startup():
    await init_db()

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "LeadSage AI Prospecting Engine",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/profile", response_model=UserProfile)
async def get_user_profile(user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    balance_data = await get_user_balance(uid)
    CURRENT_USER.credits = balance_data.get("credits", 0)
    return CURRENT_USER

@app.put("/api/profile", response_model=UserProfile)
def update_user_profile(profile: UserProfile):
    global CURRENT_USER
    CURRENT_USER.name = profile.name
    CURRENT_USER.company_name = profile.company_name
    CURRENT_USER.niche_focus = profile.niche_focus
    CURRENT_USER.email = profile.email
    CURRENT_USER.product_description = profile.product_description
    return CURRENT_USER

@app.post("/api/search-leads", response_model=LeadSearchResponse)
async def search_leads(request: Request, req: LeadSearchRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not req.niche or not req.location:
        raise HTTPException(status_code=400, detail="Nicho e localização são obrigatórios.")

    requested_limit = req.limit or 10
    uid = user.get("uid")

    # Confere saldo ANTES de gastar a cota do Google, mas so debita
    # depois, pelo numero de leads realmente entregues. Antes o credito
    # era cobrado antecipadamente e se perdia se a busca falhasse.
    balance = await get_user_balance(uid)
    if balance.get("credits", 0) < requested_limit:
        raise HTTPException(
            status_code=402,
            detail=f"Creditos insuficientes: a busca custa {requested_limit} e voce tem {balance.get('credits', 0)}."
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
    remaining_credits = await check_and_deduct_credits(uid, total_cost) if total_cost else balance.get("credits", 0)
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
    gemini_key = settings.GEMINI_API_KEY
    return await AIGenerator.generate_pitch(req, api_key=gemini_key)

@app.post("/api/generate-demo-site", response_model=DemoSiteResponse)
async def generate_demo_site(request: Request, req: DemoSiteRequest, user: dict = Depends(get_current_user)):
    gemini_key = settings.GEMINI_API_KEY
    return await AIGenerator.generate_demo_site(req, api_key=gemini_key)

@app.post("/api/dispatch", response_model=DispatchResponse)
async def dispatch_outreach(req: DispatchRequest, user: dict = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    uid = user.get("uid")
    balance_data = await get_user_balance(uid)
    current_credits = balance_data.get("credits", 0)

    try:
        response, remaining = await OutreachDispatcher.dispatch_message(req, current_credits)
    except ValueError as e:
        raise HTTPException(status_code=402, detail=str(e))

    # Update lead status in DB
    result = await db.execute(select(DBLead).where(DBLead.id == req.lead_id))
    lead = result.scalar_one_or_none()
    if lead:
        lead.outreach_status = "Enviado"
        lead.last_contacted_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        lead.last_message = req.body
        await db.commit()

    # Log deduction
    await check_and_deduct_credits(uid, 2)

    return response

@app.get("/api/credits/balance")
async def get_credits_balance(user: dict = Depends(get_current_user)):
    return await get_user_balance(user.get("uid"))

@app.post("/api/credits/topup")
async def topup_credits(req: CreditTopUpRequest, user: dict = Depends(get_current_user)):
    new_balance = await add_credits(user.get("uid"), req.amount, f"Recarga de {req.amount} créditos via {req.payment_method.upper()}")
    return {
        "status": "success",
        "added": req.amount,
        "new_balance": new_balance,
        "timestamp": datetime.now().isoformat()
    }

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

@app.get("/api/place-photo")
async def place_photo(name: str):
    """Serve a foto do Google Maps sem expor a chave da API.

    O avatar antes vinha como URL direta com `key=<GOOGLE_MAPS_API_KEY>`
    embutida, ou seja, a chave ia no HTML de todo usuario.
    """
    if not name.startswith("places/"):
        raise HTTPException(status_code=400, detail="Referencia de foto invalida.")
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


@app.get("/api/suggested-niches")
def get_suggested_niches():
    return [
        {"niche": "Farmacêuticos", "icon": "Pill", "count": "1,420+", "avg_score": 96, "locations": ["Botucatu", "São Paulo", "Campinas"]},
        {"niche": "Médicos & Clínicas", "icon": "Stethoscope", "count": "2,850+", "avg_score": 98, "locations": ["Botucatu", "Ribeirão Preto", "Curitiba"]},
        {"niche": "Dentistas & Ortodontia", "icon": "Smile", "count": "1,180+", "avg_score": 94, "locations": ["Botucatu", "Bauru", "Sorocaba"]},
        {"niche": "Corretores de Imóveis", "icon": "Home", "count": "3,400+", "avg_score": 91, "locations": ["Botucatu", "São Paulo", "Santos"]},
        {"niche": "Advogados Empresariais", "icon": "Briefcase", "count": "990+", "avg_score": 95, "locations": ["Botucatu", "São José dos Campos", "Belo Horizonte"]}
    ]
