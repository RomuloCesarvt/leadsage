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
    phones_extra: Optional[List[str]] = []
    contactability: Optional[int] = None
    # --- Dados ricos do Google (camada opcional da field mask) ---
    # Chegam vazios quando a conta do Google nao libera esses campos; a
    # busca continua funcionando sem eles.
    opening_hours_week: Optional[List[str]] = []
    open_now: Optional[bool] = None
    neighborhood: Optional[str] = None
    postal_code: Optional[str] = None
    street: Optional[str] = None
    short_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    place_types: Optional[List[str]] = []
    google_description: Optional[str] = None
    price_level: Optional[str] = None
    price_tier: Optional[int] = None
    reviews_sample: Optional[List[Dict[str, Any]]] = []
    review_highlight: Optional[str] = None
    praise_count: Optional[int] = None
    complaint_count: Optional[int] = None
    # --- Diagnostico do site atual ---
    # site_status: own | social | aggregator | whatsapp | none
    site_status: Optional[str] = None
    site_quality: Optional[int] = None
    site_issues: Optional[List[str]] = []
    site_platform: Optional[str] = None
    site_responsive: Optional[bool] = None
    site_https: Optional[bool] = None
    site_load_ms: Optional[int] = None
    site_has_booking: Optional[bool] = None
    site_has_form: Optional[bool] = None
    site_title: Optional[str] = None
    # --- Leitura comercial (deterministica, nunca gerada por IA) ---
    hooks: Optional[List[str]] = []
    diagnosis: Optional[str] = None
    best_channel: Optional[str] = None
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
    # O canal muda o tamanho e o tom: WhatsApp no celular nao comporta o
    # mesmo texto de um e-mail.
    channel: Optional[str] = "email"
    tone: str = "Consultivo" # Consultivo, Amigável, Direto, Autoridade, Promocional
    custom_instructions: Optional[str] = ""
    sender_name: Optional[str] = "Prospecção LeadSage"
    user_product: Optional[str] = ""
    # Fatos do servico que o dono vende (preco, prazo, o que inclui). Preenchido
    # pelo servidor a partir da oferta do robo; o cliente nao precisa enviar.
    service_brief: Optional[str] = ""

class PitchGenerationResponse(BaseModel):
    lead_id: str
    subject: str
    body: str
    tone: str
    placeholders: Dict[str, str]
    # O canal em que este texto foi escrito. Sem ele a tela nao sabia que
    # a copy na caixa era de e-mail enquanto o usuario ja tinha trocado
    # para WhatsApp — e mandava 130 palavras num canal de 60.
    channel: str = "email"
    # Qual fato abriu a mensagem e qual perda concreta ela ataca. Aparece
    # na tela: o usuario precisa poder discordar do argumento antes de
    # mandar em nome dele.
    hook: str = ""
    reasoning: str = ""
    # A cadencia que aquece: dois seguimentos ja escritos, com o momento
    # de cada um. Um contato frio raramente responde no primeiro toque.
    follow_ups: List[Dict[str, str]] = Field(default_factory=list)
    # O que a revisao encontrou e o modelo nao corrigiu. Vazio = limpo.
    warnings: List[str] = Field(default_factory=list)

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
    # Usado no canal whatsapp_api quando a conversa esta fora da janela
    # de 24h e so template aprovado pela Meta e aceito.
    use_template: Optional[bool] = False

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
    # WhatsApp Cloud API
    wa_token: Optional[str] = ""
    wa_phone_id: Optional[str] = ""
    wa_template: Optional[str] = ""
    wa_language: Optional[str] = "pt_BR"
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
    """Perfil do usuario.

    Os defaults eram os dados reais do dono do sistema: nome, e-mail,
    empresa, nicho e ate a foto. Quem se cadastrasse abria o app com a
    identidade de outra pessoa — e, como a IA assina as abordagens com
    estes campos, o prospect recebia e-mail assinado por ele. Agora
    nascem vazios e sao semeados com o que veio do login.
    """
    id: str = "usr_default"
    name: str = ""
    email: str = ""
    company_name: str = ""
    niche_focus: str = ""
    product_description: str = ""
    credits: int = 0
    # Derivado de plan_id na leitura; nunca um nome fixo. Antes dizia
    # "Pro Builder", um plano que nem existe na tabela de precos.
    plan: str = ""
    # Derivado do e-mail na leitura (HIDE_SUBSCRIPTION_EMAILS); nunca gravado.
    oculta_assinatura: bool = False
    avatar: str = ""
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
    sites_quota: int = 0
    plan_id: str = "previa"

class SiteCopyRequest(BaseModel):
    """Conteudo do site escrito pela IA, a partir do lead ou do que o
    usuario ja digitou no construtor.

    Antes o construtor pedia isso ao endpoint de abordagem, embutindo um
    "responda um JSON com slogan e servicos" dentro do prompt de e-mail
    e depois garimpando chaves no meio do texto. Funcionava quase sempre
    — e quando nao funcionava, o usuario via "A IA nao devolveu textos
    utilizaveis" sem entender por que.
    """
    lead: Optional[LeadItem] = None
    empresa: str = ""
    categoria: str = ""
    cidade: str = ""
    servico_do_usuario: str = ""


class SiteCopyResponse(BaseModel):
    categoria: str = ""
    slogan: str = ""
    sobre: str = ""
    servicos: List[Dict[str, str]] = Field(default_factory=list)
    diferenciais: List[str] = Field(default_factory=list)
    cta: str = ""
    seo_titulo: str = ""
    seo_descricao: str = ""
    # Paleta, tipografia, cantos e layout escolhidos para ESTE negocio.
    # Calculado no servidor a partir do nome + ramo + cidade: dois
    # clientes do mesmo usuario nunca recebem a mesma identidade.
    identidade: Dict[str, Any] = Field(default_factory=dict)


class DocumentAIRequest(BaseModel):
    """Briefing para a IA redigir a proposta ou o contrato."""
    kind: str                       # proposta | contrato
    lead_id: Optional[str] = ""
    servico: Optional[str] = ""
    escopo: Optional[str] = ""
    valor: Optional[str] = ""
    condicoes: Optional[str] = ""
    prazo: Optional[str] = ""
    observacoes: Optional[str] = ""


class DocumentAIResponse(BaseModel):
    kind: str
    title: str
    content: str
    resumo: str = ""
    campos_faltando: List[str] = Field(default_factory=list)
    aviso: str = ""


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
    # Preenchido ao reeditar um site ja publicado: regrava no lugar,
    # sem consumir outra vaga da cota.
    site_id: Optional[str] = ""
    # Os campos do construtor, para poder reabrir e editar depois.
    builder_data: Optional[str] = ""


class SiteItem(BaseModel):
    id: str
    company: str
    template: Optional[str] = ""
    lead_id: Optional[str] = ""
    created_at: str
    updated_at: Optional[str] = ""
    # Endereco publico, com sufixo aleatorio para nao ser adivinhavel
    slug: Optional[str] = ""
    html: Optional[str] = None
    builder_data: Optional[str] = None


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


class CheckoutRequest(BaseModel):
    """So o id do pacote. O preco fica no servidor, em payments.PACKAGES."""
    package_id: str
