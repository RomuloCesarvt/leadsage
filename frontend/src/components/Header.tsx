import React from 'react';
import { Menu, Zap, Bell } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Header: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
  const { user, setIsCreditModalOpen, setIsProfileModalOpen, viewState } = useApp() as any;

  const getPageTitle = () => {
    switch(viewState) {
      case 'dashboard': return 'Visão Geral';
      case 'hero': return 'Nova Busca';
      case 'workspace': return 'Meus Leads';
      case 'pipeline': return 'Pipeline';
      case 'history': return 'Histórico de Buscas';
      case 'ai-outreach': return 'IA de Abordagem';
      case 'proposals': return 'Propostas';
      case 'contracts': return 'Contratos';
      case 'calculator': return 'Precificador';
      case 'create-site': return 'Construtor de Sites';
      case 'my-sites': return 'Meus Projetos (Sites)';
      case 'tutorials': return 'Tutoriais';
      case 'notifications': return 'Avisos';
      case 'settings': return 'Configurações';
      case 'help': return 'Central de Ajuda';
      case 'subscription': return 'Planos & Preços';
      default: return 'LeadSage';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-50 border-b border-slate-200">
      <div className="h-16 px-4 md:px-8 flex items-center justify-between">
        
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-200 md:hidden transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight hidden md:block">
            {getPageTitle()}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          
          <button
            onClick={() => setIsCreditModalOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-4 py-2 rounded-full bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-all shadow-sm"
          >
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{user?.credits ?? 0} créditos</span>
          </button>

          <button className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors">
            <Bell className="w-5 h-5" />
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white shadow-sm border border-slate-200 hover:ring-blue-100 transition-all"
          >
            <img src={user?.avatar || ''} alt={user?.name || ''} className="w-full h-full object-cover" />
          </button>

        </div>
      </div>
    </header>
  );
};
