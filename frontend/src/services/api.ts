import type {
  LeadSearchRequest,
  LeadSearchResponse,
  PitchGenerationRequest,
  FollowUp,
  EstadoFilaWhats,
  PitchGenerationResponse,
  DispatchRequest,
  DispatchResponse,
  UserProfile,
  SearchHistoryItem,
  SuggestedNiche,
  SiteItem,
  IntegrationSettings,
  DocumentItem,
  CreditPackage,
  PlanoAtual,
  SiteCopyResponse,
  DocumentAIRequest,
  DocumentAIResponse,
  RoboConfig,
  PipelineItem,
  ModeloWhatsApp,
  DisparoResultado,
  RoboConfigEntrada,
  RoboConversa,
  RoboConversaResumo,
  RoboMensagem,
  RoboTeste,
  RaioX,
  ItemFila,
  ResumoFila,
  ResultadoPreparo
} from '../types';
import { auth } from '../lib/firebase';

/**
 * Onde o backend responde.
 *
 * Na web, '/api' relativo funciona: o front e a API saem do mesmo
 * dominio na Vercel. Dentro do invólucro nativo, nao — o conteudo e
 * servido de capacitor://localhost, e '/api' passa a apontar para o
 * proprio aparelho, onde nao ha servidor nenhum. Por isso o build do app
 * precisa de VITE_API_URL absoluto (veja .env.production.example).
 *
 * O aviso abaixo existe porque essa falha e silenciosa e confusa: o app
 * abre normalmente e so as chamadas morrem, sem dizer por que.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

if (
  typeof window !== 'undefined' &&
  !/^https?:$/.test(window.location.protocol) &&
  API_BASE_URL.startsWith('/')
) {
  console.error(
    'LeadSage: rodando fora do navegador com VITE_API_URL relativo. ' +
      'Refaca o build do app definindo VITE_API_URL com a URL completa do backend.'
  );
}

async function fetchWithToken(endpoint: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  let token = '';
  if (user) {
    token = await user.getIdToken();
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API Error: ${response.statusText}`);
  }
  
  return response.json();
}

export const api = {
  async getProfile(): Promise<UserProfile> {
    try {
      return await fetchWithToken('/profile');
    } catch {
      return {
        id: 'usr_default',
        name: auth.currentUser?.displayName || 'Dr. Rômulo Leite',
        email: auth.currentUser?.email || 'romulo@leadsage.ai',
        company_name: 'LeadSage Corp',
        niche_focus: 'Saúde & Farmacêutica',
        credits: 450,
        plan: 'Pro Builder',
        avatar: auth.currentUser?.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      };
    }
  },

  async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    return await fetchWithToken('/profile', {
      method: 'PUT',
      body: JSON.stringify(profile)
    });
  },

  async searchLeads(req: LeadSearchRequest): Promise<LeadSearchResponse> {
    return await fetchWithToken('/search-leads', {
      method: 'POST',
      body: JSON.stringify(req)
    });
  },

  async generatePitch(req: PitchGenerationRequest): Promise<PitchGenerationResponse> {
    // O servidor desiste aos ~55 s; sem limite aqui a tela ficaria girando
    // quando a conexão cai ou a função é cortada.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 62_000);
    try {
      return await fetchWithToken('/generate-pitch', {
        method: 'POST',
        body: JSON.stringify(req),
        signal: ctrl.signal,
      });
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        throw new Error('A IA demorou mais que o normal para responder. Clique em "Gerar outra versão" para tentar de novo.');
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  },

  // Os seguimentos vem a parte: a primeira mensagem aparece em segundos e eles chegam depois.
  async generateFollowups(pitch: PitchGenerationRequest, primeira: string): Promise<{ follow_ups: FollowUp[]; warnings: string[] }> {
    return await fetchWithToken('/generate-followups', {
      method: 'POST',
      body: JSON.stringify({ pitch, primeira }),
    });
  },

  async dispatchMessage(req: DispatchRequest): Promise<DispatchResponse> {
    return await fetchWithToken('/dispatch', {
      method: 'POST',
      body: JSON.stringify(req)
    });
  },

  /**
   * Textos do site + a identidade visual daquele negocio.
   *
   * Antes o construtor pedia isso ao endpoint de abordagem, embutindo
   * "responda um JSON" dentro do prompt de e-mail e garimpando as
   * chaves no meio do texto devolvido.
   */
  async generateSiteCopy(req: {
    lead?: any;
    empresa?: string;
    categoria?: string;
    cidade?: string;
    servico_do_usuario?: string;
  }): Promise<SiteCopyResponse> {
    return await fetchWithToken('/generate-site-copy', {
      method: 'POST',
      body: JSON.stringify(req)
    });
  },

  /** Proposta ou contrato redigido para aquele lead, nao um modelo preenchido. */
  async generateDocument(req: DocumentAIRequest): Promise<DocumentAIResponse> {
    return await fetchWithToken('/generate-document', {
      method: 'POST',
      body: JSON.stringify(req)
    });
  },

  async generateDemoSite(req: { lead: any }): Promise<any> {
    return await fetchWithToken('/generate-demo-site', {
      method: 'POST',
      body: JSON.stringify(req)
    });
  },

  async getCreditBalance(): Promise<{ credits: number; history: any[] }> {
    try {
      return await fetchWithToken('/credits/balance');
    } catch {
      return { credits: 450, history: [] };
    }
  },

  async listarPacotes(): Promise<{ planos: CreditPackage[]; recargas: CreditPackage[]; provider: string | null }> {
    try {
      return await fetchWithToken('/packages');
    } catch {
      return { planos: [], recargas: [], provider: null };
    }
  },

  // O cliente manda só o id do pacote: o preço mora no servidor. E o
  // crédito não entra aqui — só pelo webhook do provedor.
  async iniciarCompra(packageId: string): Promise<{ order: any; checkout_url: string | null }> {
    return await fetchWithToken('/checkout', {
      method: 'POST',
      body: JSON.stringify({ package_id: packageId })
    });
  },

  async listarPedidos(): Promise<any[]> {
    try {
      return await fetchWithToken('/orders');
    } catch {
      return [];
    }
  },

  async getSearchHistory(): Promise<SearchHistoryItem[]> {
    try {
      return await fetchWithToken('/history');
    } catch {
      return [];
    }
  },

  async publishSite(payload: {
    company: string;
    html: string;
    template?: string;
    lead_id?: string;
    /** preenchido ao reeditar: regrava no lugar, sem gastar outra vaga */
    site_id?: string;
    /** os campos do construtor, para reabrir o site depois */
    builder_data?: string;
  }): Promise<SiteItem> {
    return await fetchWithToken('/sites', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getSites(): Promise<SiteItem[]> {
    try {
      return await fetchWithToken('/sites');
    } catch {
      return [];
    }
  },

  // ------------------------------------------------ robo de atendimento

  async roboConfig(): Promise<RoboConfig> {
    return await fetchWithToken('/robo/config');
  },

  async roboSalvarConfig(dados: Partial<RoboConfigEntrada>): Promise<RoboConfig> {
    return await fetchWithToken('/robo/config', { method: 'PUT', body: JSON.stringify(dados) });
  },

  async roboConversas(): Promise<RoboConversaResumo[]> {
    return await fetchWithToken('/robo/conversas');
  },

  async roboConversa(id: string): Promise<RoboConversa> {
    return await fetchWithToken(`/robo/conversas/${encodeURIComponent(id)}`);
  },

  async roboLigar(id: string, ativo: boolean): Promise<RoboConversa> {
    return await fetchWithToken(`/robo/conversas/${encodeURIComponent(id)}/robo`, {
      method: 'POST', body: JSON.stringify({ ativo }),
    });
  },

  async roboResponder(id: string, texto: string): Promise<RoboConversa> {
    return await fetchWithToken(`/robo/conversas/${encodeURIComponent(id)}/responder`, {
      method: 'POST', body: JSON.stringify({ texto }),
    });
  },

  async roboTestar(mensagens: RoboMensagem[], canal = 'whatsapp'): Promise<RoboTeste> {
    return await fetchWithToken('/robo/testar', {
      method: 'POST',
      body: JSON.stringify({ mensagens: mensagens.map(m => ({ de: m.de, texto: m.texto })), canal }),
    });
  },

  async metaDisponivel(): Promise<{ facebook: boolean; whatsapp: boolean; app_id: string; wa_config_id: string }> {
    return await fetchWithToken('/robo/meta/disponivel');
  },

  async metaConectar(): Promise<{ url: string }> {
    return await fetchWithToken('/robo/meta/conectar');
  },

  async metaEscolherPagina(page_id: string): Promise<RoboConfig> {
    return await fetchWithToken('/robo/meta/pagina', { method: 'POST', body: JSON.stringify({ page_id }) });
  },

  async metaWhatsApp(code: string, waba_id: string, phone_number_id: string): Promise<RoboConfig> {
    return await fetchWithToken('/robo/meta/whatsapp', {
      method: 'POST', body: JSON.stringify({ code, waba_id, phone_number_id }),
    });
  },

  async metaDesconectar(alvo: 'facebook' | 'whatsapp'): Promise<RoboConfig> {
    return await fetchWithToken('/robo/meta/desconectar', { method: 'POST', body: JSON.stringify({ alvo }) });
  },

  async telegramConectar(token: string): Promise<RoboConfig> {
    return await fetchWithToken('/robo/telegram/conectar', { method: 'POST', body: JSON.stringify({ token }) });
  },

  async conectorGerar(): Promise<RoboConfig & { chave: string }> {
    return await fetchWithToken('/robo/conector/gerar', { method: 'POST' });
  },

  async conectorRevogar(): Promise<RoboConfig> {
    return await fetchWithToken('/robo/conector/revogar', { method: 'POST' });
  },

  async telegramDesconectar(): Promise<RoboConfig> {
    return await fetchWithToken('/robo/telegram/desconectar', { method: 'POST' });
  },

  // ------------------------------------------------ pipeline e disparo

  async pipelineListar(): Promise<{ etapas: string[]; itens: PipelineItem[] }> {
    return await fetchWithToken('/pipeline');
  },

  async pipelineSincronizar(leads: Record<string, unknown>[]): Promise<{ novos: number }> {
    return await fetchWithToken('/pipeline/sync', { method: 'POST', body: JSON.stringify({ leads }) });
  },

  async pipelineMover(leadId: string, etapa: string, lead?: Record<string, unknown>): Promise<{ etapa: string; mudou: boolean }> {
    return await fetchWithToken(`/pipeline/${encodeURIComponent(leadId)}/etapa`, {
      method: 'PUT', body: JSON.stringify({ etapa, lead }),
    });
  },

  async modeloWhatsApp(): Promise<ModeloWhatsApp> {
    return await fetchWithToken('/robo/whatsapp/modelo');
  },

  async criarModeloWhatsApp(): Promise<ModeloWhatsApp> {
    return await fetchWithToken('/robo/whatsapp/modelo', { method: 'POST' });
  },

  async roboDisparar(lead_ids: string[], consentimento: boolean): Promise<DisparoResultado> {
    return await fetchWithToken('/robo/disparar', {
      method: 'POST', body: JSON.stringify({ lead_ids, consentimento }),
    });
  },

  async raioX(place_id: string, website: string, instagram: string, refazer = false, lead?: Record<string, unknown>): Promise<RaioX> {
    return await fetchWithToken('/raio-x', {
      method: 'POST', body: JSON.stringify({ place_id, website, instagram, refazer, lead }),
    });
  },

  // ------------------------------------------------- fila de envio

  async filaListar(): Promise<{ itens: ItemFila[]; resumo: ResumoFila }> {
    return await fetchWithToken('/robo/fila');
  },

  async filaPreparar(leads: Record<string, unknown>[], tom = 'Consultivo'): Promise<{ resultados: ResultadoPreparo[]; resumo: ResumoFila }> {
    return await fetchWithToken('/robo/fila/preparar', { method: 'POST', body: JSON.stringify({ leads, tom }) });
  },

  async filaEnviarAguardando(): Promise<{ enviados: number; resumo: ResumoFila }> {
    return await fetchWithToken('/robo/fila/enviar-aguardando', { method: 'POST' });
  },

  async filaMarcarEnviado(id: string): Promise<ItemFila> {
    return await fetchWithToken(`/robo/fila/${encodeURIComponent(id)}/enviado`, { method: 'POST' });
  },

  async conectorFila(): Promise<EstadoFilaWhats> {
    return await fetchWithToken('/robo/conector/fila');
  },

  async whatsEstado(): Promise<{ conectado: boolean; online: boolean; fase?: string; qr?: string; codigo?: string; numero?: string }> {
    return await fetchWithToken('/robo/whats/estado');
  },

  async whatsChats(): Promise<{ chats: any[]; idade_s: number | null; online: boolean; conectado: boolean }> {
    return await fetchWithToken('/robo/whats/chats');
  },

  async whatsMensagens(id: string): Promise<{ mensagens: any[]; idade_s: number | null }> {
    return await fetchWithToken(`/robo/whats/chats/${encodeURIComponent(id)}/mensagens`);
  },

  async whatsEnviar(id: string, texto: string, telefone = ''): Promise<{ ok: boolean; online: boolean }> {
    return await fetchWithToken(`/robo/whats/chats/${encodeURIComponent(id)}/enviar`, { method: 'POST', body: JSON.stringify({ texto, telefone }) });
  },

  async conectorParear(numero: string): Promise<{ numero: string }> {
    return await fetchWithToken('/robo/conector/parear', { method: 'POST', body: JSON.stringify({ numero }) });
  },

  async filaEnviarAgora(id: string): Promise<EstadoFilaWhats> {
    return await fetchWithToken(`/robo/fila/${encodeURIComponent(id)}/enviar-agora`, { method: 'POST' });
  },

  async conectorEnviar(dados: { lead_id: string; nome: string; telefone: string; texto: string }): Promise<EstadoFilaWhats> {
    return await fetchWithToken('/robo/conector/enviar', { method: 'POST', body: JSON.stringify(dados) });
  },

  async filaPular(id: string): Promise<ItemFila> {
    return await fetchWithToken(`/robo/fila/${encodeURIComponent(id)}/pular`, { method: 'POST' });
  },

  async imagens(nicho: string, termo = ''): Promise<{ imagens: { url: string; miniatura: string; autor: string; fonte: string }[]; fonte: string }> {
    const q = new URLSearchParams({ nicho, termo });
    try {
      const r = await fetchWithToken(`/imagens?${q}`);
      // Resposta inesperada vira lista vazia: o banco de fotos e um extra, e
      // um .length em undefined derrubava a tela inteira do construtor.
      return { imagens: Array.isArray(r?.imagens) ? r.imagens : [], fonte: String(r?.fonte || '') };
    } catch {
      return { imagens: [], fonte: '' };
    }
  },

  async meuPlano(): Promise<PlanoAtual> {
    try {
      return await fetchWithToken('/plan');
    } catch {
      return { plan_id: 'previa', nome: 'Prévia Gratuita', credits: 5, sites: 1,
               paises: ['BR'], recursos: [], admin: false };
    }
  },

  // A exportação passou a ser rota do backend: no navegador não havia
  // como controlar o plano.
  async exportarLeads(): Promise<void> {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : '';
    const resp = await fetch(`${API_BASE_URL}/leads/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!resp.ok) {
      const erro = await resp.json().catch(() => ({}));
      throw new Error(erro.detail || 'Não foi possível exportar.');
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads-leadsage.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  async cotaDeSites(): Promise<{ usados: number; cota: number | null; ilimitado: boolean }> {
    try {
      return await fetchWithToken('/sites/quota');
    } catch {
      return { usados: 0, cota: 0, ilimitado: false };
    }
  },

  async getSite(id: string): Promise<SiteItem> {
    return await fetchWithToken(`/sites/${id}`);
  },

  async deleteSite(id: string): Promise<void> {
    await fetchWithToken(`/sites/${id}`, { method: 'DELETE' });
  },

  async limparHistorico(): Promise<{ removidas: number }> {
    return await fetchWithToken('/history', { method: 'DELETE' });
  },

  async pipelineRemover(leadId: string): Promise<void> {
    await fetchWithToken(`/pipeline/${encodeURIComponent(leadId)}`, { method: 'DELETE' });
  },

  async deleteSearchHistory(id: string): Promise<void> {
    await fetchWithToken(`/history/${id}`, { method: 'DELETE' });
  },

  async getIntegrations(): Promise<IntegrationSettings> {
    try {
      return await fetchWithToken('/integrations');
    } catch {
      return { smtp_port: 587, has_password: false };
    }
  },

  async saveIntegrations(cfg: IntegrationSettings): Promise<IntegrationSettings> {
    return await fetchWithToken('/integrations', {
      method: 'PUT',
      body: JSON.stringify(cfg)
    });
  },

  async listarDocumentos(kind?: string): Promise<DocumentItem[]> {
    try {
      return await fetchWithToken(`/documents${kind ? `?kind=${kind}` : ''}`);
    } catch {
      return [];
    }
  },

  async obterDocumento(id: string): Promise<DocumentItem> {
    return await fetchWithToken(`/documents/${id}`);
  },

  async criarDocumento(payload: {
    kind: string; title: string; content: string;
    fields?: Record<string, string>; template_id?: string; lead_id?: string;
  }): Promise<DocumentItem> {
    return await fetchWithToken('/documents', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async atualizarDocumento(id: string, payload: {
    title: string; content: string; fields?: Record<string, string>;
  }): Promise<DocumentItem> {
    return await fetchWithToken(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  },

  async excluirDocumento(id: string): Promise<void> {
    await fetchWithToken(`/documents/${id}`, { method: 'DELETE' });
  },

  async testarWhatsapp(): Promise<{ status: string; numero: string; nome: string; qualidade: string }> {
    return await fetchWithToken('/integrations/test-whatsapp', { method: 'POST' });
  },

  async getSuggestedNiches(): Promise<SuggestedNiche[]> {
    try {
      return await fetchWithToken('/suggested-niches');
    } catch {
      return [
        { niche: "Farmacêuticos", icon: "Pill", count: "1,420+", avg_score: 96, locations: ["Botucatu", "São Paulo", "Campinas"] },
        { niche: "Médicos & Clínicas", icon: "Stethoscope", count: "2,850+", avg_score: 98, locations: ["Botucatu", "Ribeirão Preto", "Curitiba"] },
        { niche: "Dentistas & Ortodontia", icon: "Smile", count: "1,180+", avg_score: 94, locations: ["Botucatu", "Bauru", "Sorocaba"] },
        { niche: "Corretores de Imóveis", icon: "Home", count: "3,400+", avg_score: 91, locations: ["Botucatu", "São Paulo", "Santos"] }
      ];
    }
  }
};
