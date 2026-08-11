import uuid
from datetime import datetime
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.models import (
    LeadSearchRequest, LeadSearchResponse, LeadItem,
    PitchGenerationRequest, PitchGenerationResponse,
    DispatchRequest, DispatchResponse,
    CreditTopUpRequest, UserProfile
)
from app.leads_engine import LeadsEngine
from app.ai_generator import AIGenerator
from app.dispatcher import OutreachDispatcher
from app.credit_system import check_and_deduct_credits, get_user_balance, add_credits
from app.firebase_config import get_current_user

app = FastAPI(
    title="LeadSage API",
    description="Backend Python para busca de leads com IA, enriquecimento e disparo automatizado.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for saved search history and campaigns
SEARCH_HISTORY: List[Dict[str, Any]] = []
SAVED_LEADS_DATABASE: Dict[str, LeadItem] = {}

# Current active profile
CURRENT_USER = UserProfile()

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
    return CURRENT_USER

@app.post("/api/search-leads", response_model=LeadSearchResponse)
async def search_leads(req: LeadSearchRequest, user: dict = Depends(get_current_user)):
    if not req.niche or not req.location:
        raise HTTPException(status_code=400, detail="Nicho e localização são obrigatórios.")

    cost_per_lead = 1
    requested_limit = req.limit or 10
    total_cost = requested_limit * cost_per_lead
    
    uid = user.get("uid")
    remaining_credits = await check_and_deduct_credits(uid, total_cost)
    if remaining_credits is None:
        raise HTTPException(status_code=402, detail="Saldo insuficiente.")

    # Perform lead search and enrichment
    leads = await LeadsEngine.search_leads(
        niche=req.niche,
        location=req.location,
        query=req.query or "",
        limit=requested_limit
    )

    # Store leads in memory database
    for lead in leads:
        SAVED_LEADS_DATABASE[lead.id] = lead

    search_id = f"sch_{uuid.uuid4().hex[:8]}"

    history_item = {
        "id": search_id,
        "niche": req.niche,
        "location": req.location,
        "total_leads": len(leads),
        "timestamp": datetime.now().strftime("%d/%m/%Y %H:%M"),
        "leads_preview": [l.name for l in leads[:3]]
    }
    SEARCH_HISTORY.insert(0, history_item)

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
async def generate_pitch(req: PitchGenerationRequest, user: dict = Depends(get_current_user)):
    return await AIGenerator.generate_pitch(req)

@app.post("/api/dispatch", response_model=DispatchResponse)
async def dispatch_outreach(req: DispatchRequest, user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    balance_data = await get_user_balance(uid)
    current_credits = balance_data.get("credits", 0)

    try:
        response, remaining = OutreachDispatcher.dispatch_message(req, current_credits)
    except ValueError as e:
        raise HTTPException(status_code=402, detail=str(e))

    # Update lead status in memory database if present
    if req.lead_id in SAVED_LEADS_DATABASE:
        lead = SAVED_LEADS_DATABASE[req.lead_id]
        lead.outreach_status = "Enviado"
        lead.last_contacted_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        lead.last_message = req.body

    # Log deduction
    await check_and_deduct_credits(uid, 2) # Cost 2 credits per dispatch

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
def get_search_history(user: dict = Depends(get_current_user)):
    return SEARCH_HISTORY

@app.get("/api/suggested-niches")
def get_suggested_niches():
    return [
        {"niche": "Farmacêuticos", "icon": "Pill", "count": "1,420+", "avg_score": 96, "locations": ["Botucatu", "São Paulo", "Campinas"]},
        {"niche": "Médicos & Clínicas", "icon": "Stethoscope", "count": "2,850+", "avg_score": 98, "locations": ["Botucatu", "Ribeirão Preto", "Curitiba"]},
        {"niche": "Dentistas & Ortodontia", "icon": "Smile", "count": "1,180+", "avg_score": 94, "locations": ["Botucatu", "Bauru", "Sorocaba"]},
        {"niche": "Corretores de Imóveis", "icon": "Home", "count": "3,400+", "avg_score": 91, "locations": ["Botucatu", "São Paulo", "Santos"]},
        {"niche": "Advogados Empresariais", "icon": "Briefcase", "count": "990+", "avg_score": 95, "locations": ["Botucatu", "São José dos Campos", "Belo Horizonte"]}
    ]
