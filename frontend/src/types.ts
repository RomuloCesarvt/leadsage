export interface LeadSocialLinks {
  linkedin?: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  x_twitter?: string;
  reddit?: string;
  website?: string;
}

export interface LeadItem {
  id: string;
  name: string;
  avatar: string;
  role: string;
  niche: string;
  company: string;
  location: string;
  city: string;
  email: string;
  phone: string;
  whatsapp?: boolean;
  website?: string;
  address?: string;
  instagram?: string;
  socials: LeadSocialLinks;
  quality_score: number;
  verified: boolean;
  bio?: string;
  ai_summary?: string;
  match_intent?: string;
  match_location?: string;
  match_business?: string;
  experience?: string;
  outreach_status: string; // Pendente, Mensagem Gerada, Enviado, Entregue, Lido, Respondido
  last_contacted_at?: string;
  last_message?: string;
  match_category?: 'fully_matched' | 'partially_matched';
  opportunityScore?: number;
  missingDigitalAssets?: string[];
  pipeline_stage?: string;
  // Dados reais do Google Maps
  rating?: number;
  rating_count?: number;
  maps_url?: string;
  business_status?: string;
  opening_hours?: string;
  // Enriquecimento real (nunca inventado)
  all_emails?: string[];
  contactability?: number;
}

export interface LeadSearchRequest {
  niche: string;
  location: string;
  query?: string;
  limit?: number;
  enrich?: boolean;
}

export interface LeadSearchResponse {
  search_id: string;
  niche: string;
  location: string;
  total_found: number;
  credits_consumed: number;
  remaining_credits: number;
  leads: LeadItem[];
  timestamp: string;
}

export interface PitchGenerationRequest {
  lead: LeadItem;
  tone: string;
  custom_instructions?: string;
  sender_name?: string;
  user_product?: string;
}

export interface PitchGenerationResponse {
  lead_id: string;
  subject: string;
  body: string;
  tone: string;
  placeholders: Record<string, string>;
}

export interface DispatchRequest {
  lead_id: string;
  lead_name: string;
  lead_email?: string;
  lead_instagram?: string;
  lead_linkedin?: string;
  lead_phone?: string;
  channel: 'email' | 'whatsapp' | 'instagram_direct' | 'linkedin_msg' | 'webhook';
  subject?: string;
  body: string;
}

export interface DispatchResponse {
  dispatch_id: string;
  lead_id: string;
  channel: string;
  status: string;
  delivered: boolean;
  requires_manual_send: boolean;
  action_url: string;
  delivered_at: string;
  credits_consumed: number;
  remaining_credits: number;
  message_preview: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  company_name: string;
  niche_focus: string;
  product_description?: string;
  credits: number;
  plan: string;
  avatar: string;
  // Preferências de prospecção
  services?: string[];
  niches?: string[];
  regions?: string;
  preferred_channel?: string;
  monthly_goal?: string;
  language?: string;
}

export interface SearchHistoryItem {
  id: string;
  niche: string;
  location: string;
  total_leads: number;
  timestamp: string;
  leads_preview: string[];
}

export interface SuggestedNiche {
  niche: string;
  icon: string;
  count: string;
  avg_score: number;
  locations: string[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

export interface SiteItem {
  id: string;
  company: string;
  template?: string;
  lead_id?: string;
  created_at: string;
  html?: string;
}

export interface IntegrationSettings {
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  from_email?: string;
  webhook_url?: string;
  has_password?: boolean;
}

export interface DocumentItem {
  id: string;
  kind: 'proposta' | 'contrato';
  title: string;
  template_id?: string;
  lead_id?: string;
  created_at: string;
  updated_at: string;
  content?: string;
  fields?: Record<string, string>;
}
