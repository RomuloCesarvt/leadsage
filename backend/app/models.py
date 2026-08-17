from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class LeadSocialLinks(BaseModel):
    linkedin: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    website: Optional[str] = None

class LeadItem(BaseModel):
    id: str
    name: str
    avatar: str
    role: str
    niche: str
    company: str
    location: str
    city: str
    email: str
    phone: str
    socials: LeadSocialLinks
    quality_score: int
    verified: bool = True
    bio: Optional[str] = None
    ai_summary: Optional[str] = None
    match_intent: Optional[str] = None
    match_location: Optional[str] = None
    match_business: Optional[str] = None
    experience: Optional[str] = None
    outreach_status: str = "Pendente" # Pendente, Mensagem Gerada, Enviado, Entregue, Lido, Respondido
    last_contacted_at: Optional[str] = None
    last_message: Optional[str] = None
    opportunityScore: Optional[int] = None
    missingDigitalAssets: Optional[List[str]] = None
    pipeline_stage: str = "Novos"

class LeadSearchRequest(BaseModel):
    niche: str
    location: str
    query: Optional[str] = ""
    limit: Optional[int] = 10
    filters: Optional[Dict[str, Any]] = None

class LeadSearchResponse(BaseModel):
    search_id: str
    niche: str
    location: str
    total_found: int
    credits_consumed: int
    remaining_credits: int
    leads: List[LeadItem]
    timestamp: str

class PitchGenerationRequest(BaseModel):
    lead: LeadItem
    tone: str = "Consultivo" # Consultivo, Amigável, Direto, Autoridade, Promocional
    custom_instructions: Optional[str] = ""
    sender_name: Optional[str] = "Prospecção LeadSage"

class PitchGenerationResponse(BaseModel):
    lead_id: str
    subject: str
    body: str
    tone: str
    placeholders: Dict[str, str]

class DispatchRequest(BaseModel):
    lead_id: str
    lead_name: str
    lead_email: str
    lead_instagram: Optional[str] = None
    channel: str = "email" # email, instagram_direct, linkedin_msg, webhook
    subject: Optional[str] = ""
    body: str
    smtp_setting_id: Optional[str] = "default"

class DispatchResponse(BaseModel):
    dispatch_id: str
    lead_id: str
    channel: str
    status: str
    delivered_at: str
    credits_consumed: int
    remaining_credits: int
    message_preview: str

class CreditTopUpRequest(BaseModel):
    amount: int
    payment_method: str = "pix"

class UserProfile(BaseModel):
    id: str = "usr_default"
    name: str = "Dr. Rômulo Leite"
    email: str = "romulo@leadsage.ai"
    company_name: str = "LeadSage Corp"
    niche_focus: str = "Saúde & Farmacêutica"
    credits: int = 450
    plan: str = "Pro Builder"
    avatar: str = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"

class DemoSiteRequest(BaseModel):
    lead: LeadItem

class DemoSiteResponse(BaseModel):
    lead_id: str
    hero_title: str
    hero_subtitle: str
    about_text: str
    services: List[str]
    cta_text: str

