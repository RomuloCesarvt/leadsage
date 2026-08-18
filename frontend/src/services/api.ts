import type {
  LeadSearchRequest,
  LeadSearchResponse,
  PitchGenerationRequest,
  PitchGenerationResponse,
  DispatchRequest,
  DispatchResponse,
  UserProfile,
  SearchHistoryItem,
  SuggestedNiche
} from '../types';
import { auth } from '../lib/firebase';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function fetchWithToken(endpoint: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  let token = '';
  if (user) {
    token = await user.getIdToken();
  }

  const geminiKey = localStorage.getItem('LEADSAGE_GEMINI_KEY');
  const mapsKey = localStorage.getItem('LEADSAGE_MAPS_KEY');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(geminiKey ? { 'X-Gemini-Key': geminiKey } : {}),
    ...(mapsKey ? { 'X-Maps-Key': mapsKey } : {}),
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
    return await fetchWithToken('/generate-pitch', {
      method: 'POST',
      body: JSON.stringify(req)
    });
  },

  async dispatchMessage(req: DispatchRequest): Promise<DispatchResponse> {
    return await fetchWithToken('/dispatch', {
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

  async topUpCredits(amount: number, paymentMethod: string = 'pix'): Promise<any> {
    return await fetchWithToken('/credits/topup', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        payment_method: paymentMethod
      })
    });
  },

  async getSearchHistory(): Promise<SearchHistoryItem[]> {
    try {
      return await fetchWithToken('/history');
    } catch {
      return [];
    }
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
