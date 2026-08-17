import React from 'react';
import { 
  Search, 
  Users, 
  Kanban,
  FileText,
  Mail,
  Settings,
  ChevronLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Sidebar: React.FC<{ isOpen: boolean; toggleSidebar: () => void }> = ({ isOpen, toggleSidebar }) => {
  const { 
    viewState,
    setViewState
  } = useApp() as any;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-serif text-white font-extrabold text-lg shadow-sm">
            L
          </div>
          <span className="font-bold text-slate-800 text-xl tracking-tight">LeadSage</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors md:hidden"
          title="Recolher Menu"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        
        {/* Main Section */}
        <div className="space-y-1">
          <p className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Principal</p>
          
          <button
            onClick={() => setViewState('hero')}
            className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${
              viewState === 'hero' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Search className={`w-5 h-5 ${viewState === 'hero' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Busca</span>
          </button>

          <button
            onClick={() => setViewState('workspace')}
            className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${
              viewState === 'workspace' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Users className={`w-5 h-5 ${viewState === 'workspace' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Meus Leads</span>
          </button>
        </div>

        {/* CRM & Sales Section */}
        <div className="space-y-1">
          <p className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Vendas</p>
          
          <button
            onClick={() => setViewState('pipeline')}
            className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${
              viewState === 'pipeline' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Kanban className={`w-5 h-5 ${viewState === 'pipeline' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Pipeline</span>
          </button>

          <button
            onClick={() => setViewState('proposals')}
            className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${
              viewState === 'proposals' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <FileText className={`w-5 h-5 ${viewState === 'proposals' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Propostas</span>
          </button>
        </div>

        {/* Marketing Section */}
        <div className="space-y-1">
          <p className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Marketing</p>
          
          <button
            onClick={() => setViewState('emails')}
            className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${
              viewState === 'emails' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Mail className={`w-5 h-5 ${viewState === 'emails' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>Campanhas</span>
          </button>
        </div>

      </div>

      <div className="p-4 border-t border-slate-100">
        <button
          className="w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
        >
          <Settings className="w-5 h-5 text-slate-400" />
          <span>Configurações</span>
        </button>
      </div>
    </aside>
  );
};
