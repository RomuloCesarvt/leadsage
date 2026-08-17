import React from 'react';
import { Search, List, Kanban, Settings, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Header: React.FC = () => {
  const { user, setIsCreditModalOpen, setIsProfileModalOpen, viewState, setViewState } = useApp() as any;

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto h-16 px-4 md:px-6 flex items-center justify-between gap-4">
        
        {/* Logo */}
        <div 
          className="flex items-center gap-2.5 cursor-pointer"
          onClick={() => setViewState('hero')}
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-serif text-white font-extrabold text-sm shadow-sm">
            L
          </div>
          <span className="font-bold text-slate-900 text-lg tracking-tight">LeadSage</span>
        </div>

        {/* Top Navigation (Pills) */}
        <nav className="hidden md:flex items-center p-1 bg-slate-100 rounded-full border border-slate-200/60 shadow-inner">
          <button
            onClick={() => setViewState('workspace')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              viewState === 'workspace' || viewState === 'hero' 
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Busca</span>
          </button>
          
          <button
            onClick={() => setViewState('pipeline')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              viewState === 'pipeline' 
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>CRM</span>
          </button>

          <button
            onClick={() => setViewState('lists')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              viewState === 'lists' 
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Listas</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreditModalOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{user?.credits ?? 0}</span>
          </button>

          <button
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100"
            title="Configurações"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white shadow-sm border border-slate-200 hover:ring-indigo-100 transition-all"
          >
            <img src={user?.avatar || ''} alt={user?.name || ''} className="w-full h-full object-cover" />
          </button>
        </div>

      </div>
    </header>
  );
};
