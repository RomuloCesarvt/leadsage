import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import type { LeadItem, SearchHistoryItem, SuggestedNiche, UserProfile } from '../types';

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
  performLeadSearch: (niche: string, location: string, limit?: number) => Promise<void>;
  resetWorkspace: () => void;
  viewState: string;
  setViewState: (viewState: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [leads, setLeads] = useState<LeadItem[]>(() => {
    const savedLeads = localStorage.getItem('LEADSAGE_LEADS');
    if (savedLeads) {
      try {
        return JSON.parse(savedLeads);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
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

  const [viewState, setViewState] = useState<string>('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        // Obter dados do perfil e créditos da API backend
        try {
          const profile = await api.getProfile();
          setUser(profile);
        } catch (error) {
          console.error("Erro ao puxar perfil da API", error);
        }
      } else {
        setUser(null);
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
    setLeads([]);
    setViewState('workspace');
    try {
      const res = await api.searchLeads({ niche, location, limit });
      setLeads(res.leads);
      if (user) {
        setUser({ ...user, credits: res.remaining_credits });
      }
      setCurrentNiche(niche);
      setCurrentLocation(location);
      await refreshUserData();
    } catch (err: any) {
      alert(err.message || err.response?.data?.detail || "Erro ao realizar busca de leads.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetWorkspace = () => {
    setViewState('hero');
    setLeads([]);
  };

  const updateLeadStage = (leadId: string, stage: string) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, pipeline_stage: stage } : l));
  };

  useEffect(() => {
    if (!authLoading && user) {
      api.getSuggestedNiches().then(setSuggestedNiches);
    }
  }, [authLoading, user]);

  useEffect(() => {
    localStorage.setItem('LEADSAGE_LEADS', JSON.stringify(leads));
  }, [leads]);

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
        performLeadSearch,
        resetWorkspace,
        updateLeadStage,
        viewState,
        setViewState
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
