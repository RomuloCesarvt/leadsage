import React, { createContext, useContext, useState, useEffect } from 'react';
import type { LeadItem, UserProfile, SearchHistoryItem, SuggestedNiche } from '../types';
import { api } from '../services/api';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { apiRequest } from '../lib/api';
import type { LeadItem, SearchHistoryItem, SuggestedNiche } from '../types';

interface AppContextType {
  user: User | null;
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
  
  selectedLeadForMessage: LeadItem | null;
  setSelectedLeadForMessage: (lead: LeadItem | null) => void;

  selectedProfileLead: LeadItem | null;
  setSelectedProfileLead: (lead: LeadItem | null) => void;

  // Actions
  refreshUserData: () => Promise<void>;
  performLeadSearch: (niche: string, location: string, limit?: number) => Promise<void>;
  resetWorkspace: () => void;
  viewState: 'hero' | 'workspace' | 'tasks' | 'history' | 'emails' | 'lists';
  setViewState: (viewState: 'hero' | 'workspace' | 'tasks' | 'history' | 'emails' | 'lists') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [suggestedNiches, setSuggestedNiches] = useState<SuggestedNiche[]>([]);
  
  const [currentNiche, setCurrentNiche] = useState<string>('Farmacêuticos');
  const [currentLocation, setCurrentLocation] = useState<string>('Botucatu, SP');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [isCreditModalOpen, setIsCreditModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isIntegrationsModalOpen, setIsIntegrationsModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [selectedLeadForMessage, setSelectedLeadForMessage] = useState<LeadItem | null>(null);
  const [selectedProfileLead, setSelectedProfileLead] = useState<LeadItem | null>(null);

  const [viewState, setViewState] = useState<'hero' | 'workspace' | 'tasks' | 'history' | 'emails' | 'lists'>('hero');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const refreshUserData = async () => {
    if (!user) return;
    try {
      // Temporarily bypass api.getProfile since user comes from Firebase now
      // setUser(u); // Remove this
      const h = await api.getSearchHistory();
      setHistory(h);
    } catch (err) {
      console.error("Erro ao carregar perfil de usuário", err);
    }
  };

  const performLeadSearch = async (niche: string, location: string, limit: number = 10) => {
    setIsLoading(true);
    setViewState('workspace');
    try {
      const res = await api.searchLeads({ niche, location, limit });
      setLeads(res.leads);
      // setUser(prev => ({ ...prev, credits: res.remaining_credits })); // Removed until backend returns new user schema
      setCurrentNiche(niche);
      setCurrentLocation(location);
      await refreshUserData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao realizar busca de leads.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetWorkspace = () => {
    setViewState('hero');
    setLeads([]);
  };

  useEffect(() => {
    if (!authLoading && user) {
      refreshUserData();
      api.getSuggestedNiches().then(setSuggestedNiches);
    }
  }, [authLoading, user]);

  return (
    <AppContext.Provider
      value={{
        user,
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
        selectedLeadForMessage,
        setSelectedLeadForMessage,
        selectedProfileLead,
        setSelectedProfileLead,
        refreshUserData,
        performLeadSearch,
        resetWorkspace,
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
