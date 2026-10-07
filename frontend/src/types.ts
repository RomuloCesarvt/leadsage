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
  // quem moveu o card por ultimo ("robô" ou "voce") e por que
  pipeline_por?: string;
  pipeline_motivo?: string;
  pipeline_em?: string;
  // Dados reais do Google Maps
  rating?: number;
  rating_count?: number;
  maps_url?: string;
  business_status?: string;
  opening_hours?: string;
  // Enriquecimento real (nunca inventado)
  all_emails?: string[];
  phones_extra?: string[];
  contactability?: number;
  // Camada rica do Google. Chega vazia quando a conta nao libera os
  // campos — a busca continua funcionando sem eles.
  opening_hours_week?: string[];
  open_now?: boolean;
  neighborhood?: string;
  postal_code?: string;
  street?: string;
  short_address?: string;
  latitude?: number;
  longitude?: number;
  place_types?: string[];
  google_description?: string;
  price_level?: string;
  price_tier?: number;
  reviews_sample?: { rating?: number; text?: string; when?: string }[];
  review_highlight?: string;
  praise_count?: number;
  complaint_count?: number;
  // Diagnostico do site atual do lead
  site_status?: 'own' | 'social' | 'aggregator' | 'whatsapp' | 'none';
  site_quality?: number;
  site_issues?: string[];
  site_platform?: string;
  site_responsive?: boolean;
  site_https?: boolean;
  site_load_ms?: number;
  site_has_booking?: boolean;
  site_has_form?: boolean;
  site_title?: string;
  // Leitura comercial: ganchos verificados e o porque do lead valer o contato
  hooks?: string[];
  diagnosis?: string;
  best_channel?: string;
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
  /** Muda o tamanho e o tom: WhatsApp no celular nao comporta um e-mail. */
  channel?: string;
  tone: string;
  custom_instructions?: string;
  sender_name?: string;
  user_product?: string;
}

export interface FollowUp {
  quando: string;
  objetivo?: string;
  texto: string;
}

export interface PitchGenerationResponse {
  lead_id: string;
  subject: string;
  body: string;
  tone: string;
  placeholders: Record<string, string>;
  channel?: string;
  /** Qual fato abriu a mensagem e qual perda concreta ela ataca. */
  hook?: string;
  reasoning?: string;
  /** A cadencia que aquece: dois seguimentos ja escritos. */
  follow_ups?: FollowUp[];
  /** O que a revisao encontrou e o modelo nao corrigiu. */
  warnings?: string[];
}

export interface SiteIdentity {
  familia?: string;
  primaria?: string;
  destaque?: string;
  tipografia?: string;
  tipografia_nome?: string;
  cantos?: string;
  cantos_nome?: string;
  layout?: string;
  motivo?: string;
}

export interface SiteCopyResponse {
  categoria: string;
  slogan: string;
  sobre: string;
  servicos: { titulo: string; descricao: string }[];
  diferenciais: string[];
  cta: string;
  seo_titulo: string;
  seo_descricao: string;
  identidade: SiteIdentity;
}

export interface DocumentAIRequest {
  kind: 'proposta' | 'contrato';
  lead_id?: string;
  servico?: string;
  escopo?: string;
  valor?: string;
  condicoes?: string;
  prazo?: string;
  observacoes?: string;
}

export interface DocumentAIResponse {
  kind: string;
  title: string;
  content: string;
  resumo?: string;
  campos_faltando?: string[];
  aviso?: string;
}

export interface DispatchRequest {
  lead_id: string;
  lead_name: string;
  lead_email?: string;
  lead_instagram?: string;
  lead_linkedin?: string;
  lead_phone?: string;
  channel: 'email' | 'whatsapp' | 'whatsapp_api' | 'instagram_direct' | 'linkedin_msg' | 'webhook';
  subject?: string;
  body: string;
  use_template?: boolean;
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
  // Identidade visual dos documentos
  brand_logo?: string;
  brand_primary?: string;
  brand_accent?: string;
  brand_contact?: string;
  sites_quota?: number;
  plan_id?: string;
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
  updated_at?: string;
  /** endereco publico do site, com sufixo aleatorio */
  slug?: string;
  html?: string;
  /** os campos do construtor, para reabrir o site e editar */
  builder_data?: string;
}

export interface IntegrationSettings {
  // WhatsApp Cloud API (Meta)
  wa_token?: string;
  wa_phone_id?: string;
  wa_template?: string;
  wa_language?: string;
  has_wa_token?: boolean;
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

export interface CreditPackage {
  id: string;
  tipo: 'plano' | 'recarga';
  nome: string;
  credits: number;
  sites: number;
  amount_cents: number;
  preco: string;
  descricao: string;
  destaque: boolean;
}

export interface PlanoAtual {
  plan_id: string;
  nome: string;
  credits: number;
  sites: number;
  paises: string[];
  recursos: string[];
  admin: boolean;
}


// ------------------------------------------------- robo de atendimento

export type RoboCanal = 'whatsapp' | 'messenger' | 'instagram' | 'telegram';

export interface RoboConfigEntrada {
  app_secret: string;
  wa_token: string;
  wa_phone_id: string;
  page_id: string;
  page_token: string;
  ig_id: string;
  ativo: boolean;
  objetivo: 'agendar' | 'site' | 'qualificar' | 'vender';
  instrucoes: string;
  link_agenda: string;
  nome_assistente: string;
  catalogo: string;
  faq: string;
  desconto_maximo: number;
  /** o servico que o robo vende, em campos */
  oferta: Partial<OfertaRobo>;
}

export interface OfertaRobo {
  servico: 'site' | 'gmn' | 'social' | 'trafego' | 'outro';
  nome: string;
  preco: string | number;
  prazo_dias: string | number;
  inclui: string;
  nao_inclui: string;
  esboco: 'gratis' | 'pago' | 'nao';
  esboco_prazo: string;
  esboco_preco: string | number;
  pagamento: string;
  revisoes: string;
  garantia: string;
  diferenciais: string;
}

/** O que a tela recebe: os segredos so aparecem como "configurado". */
export interface RoboConfig extends Omit<RoboConfigEntrada, 'app_secret' | 'wa_token' | 'page_token'> {
  tem_app_secret: boolean;
  tem_wa_token: boolean;
  tem_page_token: boolean;
  webhook_url: string;
  verify_token: string;
  whatsapp_pronto: boolean;
  meta_pronto: boolean;
  telegram_pronto: boolean;
  /** @ do bot do Telegram, sem o arroba */
  tg_username: string;
  /** 'app': conectado com um clique pelo app do LeadSage; 'manual': app proprio */
  modo: 'app' | 'manual';
  page_nome: string;
  ig_usuario: string;
  waba_id: string;
  /** paginas autorizadas no login, aguardando escolha (sem token) */
  paginas_pendentes: { id: string; nome: string; ig_usuario: string }[];
}

export interface RoboMensagem {
  de: 'contato' | 'robo' | 'voce';
  texto: string;
  em?: string;
}

export interface RoboConversaResumo {
  id: string;
  canal: RoboCanal;
  contato: string;
  nome: string;
  lead_id: string;
  robo_ativo: boolean;
  optout: boolean;
  precisa_humano: boolean;
  motivo: string;
  atualizado: string;
  ultima: RoboMensagem | null;
  total: number;
}

export interface RoboConversa extends Omit<RoboConversaResumo, 'ultima' | 'total'> {
  mensagens: RoboMensagem[];
}

export interface RoboTeste {
  resposta: string;
  passar_para_humano: boolean;
  motivo: string;
  optout: boolean;
}


// ---------------------------------------------------------------- raio-x

export interface RaioX {
  place_id: string;
  do_cache: boolean;
  gerado_em: string;
  gmn: {
    nome: string; categoria: string; nota: number | null; avaliacoes: number; aberto: boolean;
    descricao: string; resumo_avaliacoes: string; completude: number;
    itens: { item: string; ok: boolean | null; detalhe: string }[];
    link_avaliacoes: string; link_fotos: string; link_perfil: string;
  };
  site: {
    url: string; tipo: 'own' | 'social' | 'aggregator' | 'whatsapp' | 'none';
    nota: number | null; problemas: string[]; plataforma: string; credito_agencia: string;
    pixel_meta: boolean; tag_google_ads: boolean; tag_tiktok: boolean; google_analytics: boolean;
    pixels_via_tag_manager: boolean; ano_rodape: number | null;
  };
  instagram: {
    disponivel: boolean; usuario?: string; motivo?: string; seguidores?: number | null;
    publicacoes?: number | null; dias_desde_ultimo_post?: number | null; posts_90_dias?: number;
    engajamento_medio?: number | null;
  };
  quem_cuida: {
    veredito: 'agencia' | 'dono' | 'abandonado' | 'ninguem' | 'indefinido';
    rotulo: string; confianca: string; evidencias: string[]; abordagem: string; lacunas: string[];
  };
  // Dossie. Raio-x guardado antes dele chega sem estes campos.
  empresa?: DossieEmpresa;
  pessoas?: { nome: string; cargo: string; fonte: string }[];
  dores?: { titulo: string; evidencia: string; peso: 'alto' | 'medio' | 'baixo' }[];
  abordagem?: DossieAbordagem | null;
}

export interface DossieEmpresa {
  cnpj?: string; razao_social?: string; nome_fantasia?: string; situacao?: string; aberta_em?: string;
  anos_de_atividade?: number | null; porte?: string; atividade?: string; municipio?: string; uf?: string;
  socios?: { nome: string; qualificacao: string }[]; fonte?: string;
}

export interface DossieAbordagem {
  angulo: string; abertura: string; por_que_funciona: string; objecao_provavel: string;
  resposta_a_objecao: string; proximo_passo: string; evitar: string; origem: 'ia' | 'fatos'; canal: string;
}


// ------------------------------------------------------------- pipeline

export interface PipelineMovimento {
  de: string;
  para: string;
  por: string;
  motivo: string;
  em: string;
}

export interface PipelineItem {
  id: string;
  etapa: string;
  origem?: string;
  lead?: Partial<LeadItem>;
  historico?: PipelineMovimento[];
  atualizado?: string;
}

export interface ModeloWhatsApp {
  existe: boolean;
  status: string; // PENDING | APPROVED | REJECTED | ''
  motivo: string;
  texto: string;
  lote: number;
}

export interface DisparoResultado {
  enviados: { id: string; nome: string }[];
  ignorados: { id: string; nome?: string; motivo: string }[];
  falhas: { id: string; nome?: string; motivo: string }[];
}


// ------------------------------------------------------- fila de envio

export type CanalFila = 'email' | 'whatsapp' | 'instagram_direct' | 'linkedin_msg';

export interface ItemFila {
  id: string;
  lead_id: string;
  nome: string;
  canal: CanalFila;
  assunto: string;
  texto: string;
  link: string;
  gancho?: string;
  seguimentos?: { quando: string; objetivo?: string; texto: string }[];
  status: 'pendente' | 'enviado' | 'pulado' | 'aguardando_limite' | 'falhou';
  motivo?: string;
  criado: string;
  enviado_em?: string;
  enviado_por?: string;
}

export interface ResumoFila {
  pendentes: number; aguardando_limite: number; enviados: number;
  email_hoje: number; limite_email_dia: number; email_restante: number;
}

export interface ResultadoPreparo {
  lead_id: string; nome: string; canal?: CanalFila;
  resultado: 'enviado' | 'na fila' | 'aguardando' | 'falhou' | 'ignorado'; motivo?: string;
}
