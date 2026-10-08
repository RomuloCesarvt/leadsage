import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { rodandoNativo } from '../lib/pwa';
import { colherRedirecionamento } from '../lib/autenticacao';
import { sondar } from '../lib/sondagem';
import { ehSalvo, salvoPeloServidor } from '../lib/leadsSalvos';
import type { LeadItem, PipelineItem, SearchHistoryItem, SuggestedNiche, UserProfile } from '../types';

// O servidor so precisa do que o robo usa para conversar e do que o card
// mostra; mandar o lead inteiro (avaliacoes, horarios) pesaria a cada busca.
const CAMPOS_PIPELINE = [
  'id', 'name', 'company', 'phone', 'email', 'niche', 'city', 'website', 'instagram',
  'rating', 'rating_count', 'missingDigitalAssets', 'diagnosis', 'hooks', 'opportunityScore',
  'maps_url', 'pipeline_stage',
] as const;

const fotoDoLead = (l: LeadItem): Record<string, unknown> => {
  const foto: Record<string, unknown> = {};
  for (const c of CAMPOS_PIPELINE) {
    const v = (l as any)[c];
    if (v !== undefined && v !== null && v !== '') foto[c] = v;
  }
  return foto;
};

// Quem escreveu sem estar na busca nasce no servidor; aqui vira um card.
const leadDeItem = (i: PipelineItem): LeadItem => {
  const f = (i.lead || {}) as Partial<LeadItem>;
  const nome = f.company || f.name || 'Novo contato';
  return {
    id: i.id, name: f.name || nome, avatar: '', role: '', niche: f.niche || '', company: nome,
    location: f.city || '', city: f.city || '', email: f.email || '', phone: f.phone || '',
    whatsapp: !!f.phone, socials: {}, quality_score: 0, verified: false, outreach_status: 'Respondido',
    ...f,
  } as LeadItem;
};

const mesclarPipeline = (atuais: LeadItem[], itens: PipelineItem[]): LeadItem[] => {
  const porId = new Map(itens.map(i => [i.id, i]));
  const vistos = new Set<string>();
  const saida = atuais.map(l => {
    vistos.add(l.id);
    const i = porId.get(l.id);
    if (!i) return l;
    const ultimo = (i.historico || [])[(i.historico || []).length - 1];
    return {
      ...l, pipeline_stage: i.etapa, pipeline_por: ultimo?.por, pipeline_motivo: ultimo?.motivo, pipeline_em: ultimo?.em,
      pipeline_origem: i.origem, salvo: l.salvo === true || salvoPeloServidor(i.origem, i.etapa),
    };
  });
  for (const i of itens) {
    if (vistos.has(i.id)) continue;
    const ultimo = (i.historico || [])[(i.historico || []).length - 1];
    saida.push({
      ...leadDeItem(i), pipeline_stage: i.etapa, pipeline_por: ultimo?.por, pipeline_motivo: ultimo?.motivo, pipeline_em: ultimo?.em,
      pipeline_origem: i.origem, salvo: salvoPeloServidor(i.origem, i.etapa),
    });
  }
  return saida;
};

interface AppContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  setUser: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  authLoading: boolean;
  leads: LeadItem[];
  setLeads: React.Dispatch<React.SetStateAction<LeadItem[]>>;
  history: SearchHistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<SearchHistoryItem[]>>;
  suggestedNiches: SuggestedNiche[];
  currentNiche: string;
  setCurrentNiche: (niche: string) => void;
  currentLocation: string;
  setCurrentLocation: (loc: string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Modals
  isCreditModalOpen: boolean;
  setIsCreditModalOpen: (open: boolean) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  isIntegrationsModalOpen: boolean;
  setIsIntegrationsModalOpen: (open: boolean) => void;
  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;
  isDemoSiteModalOpen: boolean;
  setIsDemoSiteModalOpen: (open: boolean) => void;
  demoSiteData: any;
  setDemoSiteData: (data: any) => void;
  
  selectedLeadForMessage: LeadItem | null;
  setSelectedLeadForMessage: (lead: LeadItem | null) => void;

  selectedProfileLead: LeadItem | null;
  setSelectedProfileLead: (lead: LeadItem | null) => void;

  // Actions
  refreshUserData: () => Promise<void>;
  atualizarPipeline: () => Promise<void>;
  performLeadSearch: (niche: string, location: string, limit?: number) => Promise<void>;
  resetWorkspace: () => void;
  /** Escolhe leads dos resultados para entrar em Meus Leads (e no pipeline). */
  salvarLeads: (ids: string[]) => Promise<void>;
  /** Tira leads de Meus Leads (e do pipeline). */
  removerLeads: (ids: string[]) => Promise<void>;
  alternarFavorito: (id: string) => void;
  /** Some só com os resultados de busca que ninguém escolheu. */
  limparResultados: () => void;
  /** Leads marcados em Meus Leads para começar o contato (aba Fila de envio do robô). */
  leadsParaContato: string[];
  setLeadsParaContato: (ids: string[]) => void;
  viewState: string;
  setViewState: (viewState: string) => void;
  // Site que o construtor deve reabrir. Nulo = criar do zero.
  siteEmEdicao: any | null;
  setSiteEmEdicao: (site: any | null) => void;
}

const chaveDosLeads = (uid: string) => `LEADSAGE_LEADS:${uid}`;

/**
 * Os leads de uma conta. A versao antiga guardava tudo numa chave unica,
 * compartilhada por todos os logins do aparelho; o primeiro login depois
 * da mudanca herda essa lista e a chave antiga some, para ninguem mais
 * enxergar o que e de outra conta.
 */
function lerLeadsDoDono(uid: string): LeadItem[] {
  try {
    let bruto = localStorage.getItem(chaveDosLeads(uid));
    if (bruto === null) {
      const antigo = localStorage.getItem('LEADSAGE_LEADS');
      if (antigo !== null) {
        bruto = antigo;
        localStorage.setItem(chaveDosLeads(uid), antigo);
        localStorage.removeItem('LEADSAGE_LEADS');
      }
    }
    const dados = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Os leads ficam no navegador, mas separados por conta: quem entra com
  // outro login no mesmo aparelho nao pode ver (nem misturar) os do anterior.
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [donoDosLeads, setDonoDosLeads] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [suggestedNiches, setSuggestedNiches] = useState<SuggestedNiche[]>([]);
  
  const [currentNiche, setCurrentNiche] = useState<string>('Farmacêuticos');
  const [currentLocation, setCurrentLocation] = useState<string>('Botucatu, SP');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [isCreditModalOpen, setIsCreditModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isDemoSiteModalOpen, setIsDemoSiteModalOpen] = useState(false);
  const [demoSiteData, setDemoSiteData] = useState<any>(null);
  const [selectedLeadForMessage, setSelectedLeadForMessage] = useState<LeadItem | null>(null);
  const [selectedProfileLead, setSelectedProfileLead] = useState<LeadItem | null>(null);

  // A URL pode pedir uma tela: os atalhos do app instalado (?tela=leads)
  // e a volta do login do Facebook (?tela=robo&meta=ok). Sem ler isso,
  // os dois caiam no painel inicial como se nada tivesse acontecido.
  const [viewState, setViewState] = useState<string>(() => {
    const pedida = new URLSearchParams(window.location.search).get('tela') || '';
    const telas: Record<string, string> = { 'nova-busca': 'hero', leads: 'workspace', robo: 'robo', conversas: 'conversas' };
    return telas[pedida] || 'dashboard';
  });
  const [siteEmEdicao, setSiteEmEdicao] = useState<any | null>(null);

  useEffect(() => {
    // No app empacotado a entrada com Google e por redirecionamento: sem
    // recolher o resultado aqui, o usuario volta do Google para a tela de
    // login em branco, como se nada tivesse acontecido. Na web nao roda.
    if (rodandoNativo()) void colherRedirecionamento();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        setLeads(lerLeadsDoDono(currentUser.uid));
        setDonoDosLeads(currentUser.uid);
        // Obter dados do perfil e créditos da API backend
        try {
          const profile = await api.getProfile();
          setUser(profile);
        } catch (error) {
          console.error("Erro ao puxar perfil da API", error);
        }
      } else {
        setUser(null);
        setLeads([]);
        setHistory([]);
        setDonoDosLeads(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const refreshUserData = async () => {
    if (!firebaseUser) return;
    try {
      const p = await api.getProfile();
      setUser(p);
      const h = await api.getSearchHistory();
      setHistory(h);
    } catch (err) {
      console.error("Erro ao carregar dados do usuário", err);
    }
  };

  const performLeadSearch = async (niche: string, location: string, limit: number = 10) => {
    setIsLoading(true);
    // os resultados antigos que ninguém escolheu saem; Meus Leads fica como está
    setLeads(prev => prev.filter(ehSalvo));
    setViewState('results');
    try {
      const res = await api.searchLeads({ niche, location, limit });
      setLeads(prev => {
        const jaTem = new Set(prev.map(l => l.id));
        return [...prev, ...res.leads.filter(l => !jaTem.has(l.id)).map(l => ({ ...l, salvo: false }))];
      });
      if (user) {
        setUser({ ...user, credits: res.remaining_credits });
      }
      setCurrentNiche(niche);
      setCurrentLocation(location);
      await refreshUserData();
    } catch (err: any) {
      // Repassa o motivo real para quem chamou mostrar na tela. Antes
      // aparecia um alerta aqui e outro genérico na tela, culpando a
      // chave de API independente da causa.
      throw new Error(err?.message || 'Não foi possível concluir a busca.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetWorkspace = () => {
    setViewState('hero');
    setLeads(prev => prev.filter(ehSalvo));
  };

  // O pipeline mora no servidor: e la que o robo move os cards enquanto
  // conversa. O navegador entrega os leads que tem, pede o estado de volta
  // e mostra o que o robo fez.
  const leadsRef = useRef<LeadItem[]>(leads);
  leadsRef.current = leads;
  const sincronizados = useRef<Set<string>>(new Set());

  const atualizarPipeline = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      const novos = leadsRef.current.filter(l => ehSalvo(l) && !sincronizados.current.has(l.id));
      if (novos.length) {
        await api.pipelineSincronizar(novos.slice(0, 300).map(fotoDoLead));
        novos.forEach(l => sincronizados.current.add(l.id));
      }
      const { itens } = await api.pipelineListar();
      setLeads(prev => mesclarPipeline(prev, itens));
    } catch {
      // plano sem pipeline ou servidor fora: o quadro local continua valendo
    }
  }, []);

  const updateLeadStage = (leadId: string, stage: string) => {
    const lead = leadsRef.current.find(l => l.id === leadId);
    setLeads(prev => prev.map(l => l.id === leadId
      ? { ...l, salvo: true, pipeline_stage: stage, pipeline_por: 'voce', pipeline_motivo: 'movido por você', pipeline_em: new Date().toISOString() }
      : l));
    api.pipelineMover(leadId, stage, lead ? fotoDoLead(lead) : undefined).catch(() => {});
  };

  const salvarLeads = useCallback(async (ids: string[]) => {
    const alvo = new Set(ids);
    setLeads(prev => prev.map(l => alvo.has(l.id) ? { ...l, salvo: true, pipeline_stage: l.pipeline_stage || 'Novo Lead' } : l));
    leadsRef.current = leadsRef.current.map(l => alvo.has(l.id) ? { ...l, salvo: true } : l);
    await atualizarPipeline();
  }, [atualizarPipeline]);

  const removerLeads = useCallback(async (ids: string[]) => {
    const alvo = new Set(ids);
    setLeads(prev => prev.filter(l => !alvo.has(l.id)));
    ids.forEach(id => sincronizados.current.delete(id));
    await Promise.all(ids.map(id => api.pipelineRemover(id).catch(() => {})));
  }, []);

  const alternarFavorito = useCallback((id: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, favorito: !l.favorito } : l));
  }, []);

  const limparResultados = useCallback(() => {
    setLeads(prev => prev.filter(ehSalvo));
  }, []);

  const [leadsParaContato, setLeadsParaContato] = useState<string[]>([]);

  useEffect(() => {
    if (authLoading || !user) return;
    const t = setTimeout(() => { void atualizarPipeline(); }, 800);
    return () => clearTimeout(t);
  }, [authLoading, user, leads.length, atualizarPipeline]);

  // Enquanto olha o pipeline ou o robo, traz o que o robo moveu sem precisar recarregar.
  useEffect(() => {
    if (!user || (viewState !== 'pipeline' && viewState !== 'robo' && viewState !== 'conversas')) return;
    return sondar(() => { void atualizarPipeline(); }, 90000);
  }, [user, viewState, atualizarPipeline]);

  useEffect(() => {
    if (!authLoading && user) {
      api.getSuggestedNiches().then(setSuggestedNiches);
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!donoDosLeads) return;
    try { localStorage.setItem(chaveDosLeads(donoDosLeads), JSON.stringify(leads)); } catch { /* sem espaco ou bloqueado */ }
  }, [leads, donoDosLeads]);

  return (
    <AppContext.Provider
      value={{
        user,
        firebaseUser,
        setUser,
        leads,
        setLeads,
        history,
        setHistory,
        suggestedNiches,
        currentNiche,
        setCurrentNiche,
        currentLocation,
        setCurrentLocation,
        isLoading,
        setIsLoading,
        isCreditModalOpen,
        setIsCreditModalOpen,
        isProfileModalOpen,
        setIsProfileModalOpen,
        isIntegrationsModalOpen,
        setIsIntegrationsModalOpen,
        isExportModalOpen,
        setIsExportModalOpen,
        isDemoSiteModalOpen,
        setIsDemoSiteModalOpen,
        demoSiteData,
        setDemoSiteData,
        selectedLeadForMessage,
        setSelectedLeadForMessage,
        selectedProfileLead,
        setSelectedProfileLead,
        refreshUserData,
        atualizarPipeline,
        performLeadSearch,
        resetWorkspace,
        salvarLeads,
        removerLeads,
        alternarFavorito,
        limparResultados,
        leadsParaContato,
        setLeadsParaContato,
        updateLeadStage,
        viewState,
        setViewState,
        siteEmEdicao,
        setSiteEmEdicao
      } as any}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de AppProvider");
  return ctx;
};
