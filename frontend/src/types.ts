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
}

export interface LeadSearchRequest {
  niche: string;
  location: string;
  query?: string;
  limit?: number;
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
  lead_email: string;
  lead_instagram?: string;
  channel: 'email' | 'instagram_direct' | 'linkedin_msg' | 'webhook';
  subject?: string;
  body: string;
}

export interface DispatchResponse {
  dispatch_id: string;
  lead_id: string;
  channel: string;
  status: string;
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
  credits: number;
  plan: string;
  avatar: string;
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
