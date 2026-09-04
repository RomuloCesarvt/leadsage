from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class LeadSocialLinks(BaseModel):
    linkedin: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    x_twitter: Optional[str] = None
    tiktok: Optional[str] = None
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
    whatsapp: Optional[bool] = None
    website: Optional[str] = None
    address: Optional[str] = None
    socials: LeadSocialLinks
    quality_score: int
    verified: bool = True
    bio: Optional[str] = None
    ai_summary: Optional[str] = None
    match_intent: Optional[str] = None
    match_location: Optional[str] = None
    match_business: Optional[str] = None
    experience: Optional[str] = None
    opportunityScore: Optional[int] = None
    missingDigitalAssets: Optional[List[str]] = []
    # Dados reais vindos do Google Maps
    rating: Optional[float] = None
    rating_count: Optional[int] = None
    maps_url: Optional[str] = None
    business_status: Optional[str] = None
    opening_hours: Optional[str] = None
    # Enriquecimento real (nunca inventado)
    all_emails: Optional[List[str]] = []
    contactability: Optional[int] = None
    outreach_status: str = "Pendente"
    last_contacted_at: Optional[str] = None
    last_message: Optional[str] = None
    match_category: Optional[str] = None
    pipeline_stage: str = "Novos"

class LeadSearchRequest(BaseModel):
    niche: str
    location: str
    query: Optional[str] = ""
    limit: Optional[int] = Field(default=10, ge=1, le=60)
    enrich: Optional[bool] = True
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
    user_product: Optional[str] = ""

class PitchGenerationResponse(BaseModel):
    lead_id: str
    subject: str
    body: str
    tone: str
    placeholders: Dict[str, str]

class DispatchRequest(BaseModel):
    lead_id: str
    lead_name: str
    lead_email: str = ""
    lead_instagram: Optional[str] = None
    lead_linkedin: Optional[str] = None
    lead_phone: Optional[str] = ""
    # email e webhook enviam de verdade; whatsapp, instagram_direct e
    # linkedin_msg nao tem API de envio e devolvem link de acao
    channel: str = "email"
    subject: Optional[str] = ""
    body: str

class DispatchResponse(BaseModel):
    dispatch_id: str
    lead_id: str
    channel: str
    status: str
    # Antes toda resposta era 200 com texto de sucesso, mesmo quando o
    # envio falhava ou nem existia. A interface comemorava por engano.
    delivered: bool = False
    requires_manual_send: bool = False
    action_url: str = ""
    delivered_at: str
    credits_consumed: int
    remaining_credits: int
    message_preview: str


class IntegrationSettings(BaseModel):
    smtp_host: Optional[str] = ""
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = ""
    smtp_password: Optional[str] = ""
    from_email: Optional[str] = ""
    webhook_url: Optional[str] = ""

class CreditTopUpRequest(BaseModel):
    amount: int
    payment_method: str = "pix"

class UserProfile(BaseModel):
    id: str = "usr_default"
    name: str = "Dr. Rômulo Leite"
    email: str = "romulo@leadsage.ai"
    company_name: str = "LeadSage Corp"
    niche_focus: str = "Saúde & Farmacêutica"
    product_description: str = "Ajudo empresas do setor de saúde a captarem mais clientes com automação de marketing."
    credits: int = 450
    plan: str = "Pro Builder"
    avatar: str = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
    # Preferencias de prospeccao. Ficavam so no useState da tela de
    # Configuracoes e se perdiam a cada reload.
    services: List[str] = Field(default_factory=lambda: ["Sites"])
    niches: List[str] = Field(default_factory=list)
    regions: str = ""
    preferred_channel: str = "WhatsApp"
    monthly_goal: str = "4 a 10"
    language: str = "pt"
    # Identidade visual usada nas propostas e contratos. Fica no perfil
    # para o usuario nao reenviar a logo a cada documento.
    brand_logo: str = ""
    brand_primary: str = "#2563eb"
    brand_accent: str = "#f59e0b"
    brand_contact: str = ""

class DemoSiteRequest(BaseModel):
    lead: LeadItem

class DemoSiteResponse(BaseModel):
    lead_id: str
    preview_url: str = ""
    html_content: str = ""
    generation_time: float = 0.0



class SiteCreateRequest(BaseModel):
    company: str = ""
    html: str
    template: Optional[str] = ""
    lead_id: Optional[str] = ""


class SiteItem(BaseModel):
    id: str
    company: str
    template: Optional[str] = ""
    lead_id: Optional[str] = ""
    created_at: str
    html: Optional[str] = None


class DocumentCreateRequest(BaseModel):
    kind: str                      # proposta | contrato
    title: str
    content: str
    fields: Optional[Dict[str, str]] = None
    template_id: Optional[str] = ""
    lead_id: Optional[str] = ""


class DocumentUpdateRequest(BaseModel):
    title: str
    content: str
    fields: Optional[Dict[str, str]] = None


class DocumentItem(BaseModel):
    id: str
    kind: str
    title: str
    template_id: Optional[str] = ""
    lead_id: Optional[str] = ""
    created_at: str
    updated_at: str
    content: Optional[str] = None
    fields: Optional[Dict[str, str]] = None
