import React from 'react';
import { 
  Search, 
  Users, 
  Kanban,
  FileText,
  Settings,
  ChevronLeft,
  LayoutDashboard,
  History,
  MessageSquare,
  ScrollText,
  Calculator,
  Globe,
  LayoutTemplate,
  PlayCircle,
  Bell,
  HelpCircle,
  CreditCard
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Sidebar: React.FC<{ isOpen: boolean; toggleSidebar: () => void }> = ({ isOpen, toggleSidebar }) => {
  const { viewState, setViewState } = useApp() as any;

  const NavItem = ({ id, icon: Icon, label, disabled = false }: { id: string, icon: any, label: string, disabled?: boolean }) => (
    <button
      onClick={() => !disabled && setViewState(id)}
      disabled={disabled}
      className={`w-full py-2.5 px-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all ${
        viewState === id 
          ? 'bg-blue-50 text-blue-600' 
          : disabled 
            ? 'text-slate-300 cursor-not-allowed'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
      }`}
    >
      <Icon className={`w-5 h-5 ${viewState === id ? 'text-blue-600' : disabled ? 'text-slate-300' : 'text-slate-400'}`} />
      <span>{label}</span>
    </button>
  );

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

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 custom-scrollbar">
        
        {/* Principal Section */}
        <div className="space-y-1">
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Principal</p>
          <NavItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem id="hero" icon={Search} label="Nova Busca" />
          <NavItem id="workspace" icon={Users} label="Meus Leads" />
          <NavItem id="pipeline" icon={Kanban} label="Pipeline" />
          <NavItem id="history" icon={History} label="Histórico" />
        </div>

        {/* Ferramentas de Vendas Section */}
        <div className="space-y-1">
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Ferramentas de Vendas</p>
          <NavItem id="ai-outreach" icon={MessageSquare} label="IA de Abordagem" />
          <NavItem id="proposals" icon={FileText} label="Propostas" />
          <NavItem id="contracts" icon={ScrollText} label="Contratos" />
          <NavItem id="calculator" icon={Calculator} label="Precificador" />
        </div>

        {/* Construtor Section */}
        <div className="space-y-1">
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Construtor</p>
          <NavItem id="create-site" icon={Globe} label="Criar Site" />
          <NavItem id="my-sites" icon={LayoutTemplate} label="Meus Sites" />
        </div>

        {/* Ajuda & Conta Section */}
        <div className="space-y-1">
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Ajuda & Conta</p>
          <NavItem id="tutorials" icon={PlayCircle} label="Tutoriais" />
          <NavItem id="notifications" icon={Bell} label="Avisos" />
          <NavItem id="settings" icon={Settings} label="Configurações" />
          <NavItem id="help" icon={HelpCircle} label="Ajuda" />
          <NavItem id="subscription" icon={CreditCard} label="Assinatura" />
        </div>

      </div>
    </aside>
  );
};
