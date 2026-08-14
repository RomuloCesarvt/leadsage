import React, { useState } from 'react';
import { 
  Plus, 
  CheckSquare, 
  History, 
  Mail, 
  List, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  ChevronLeft
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Sidebar: React.FC<{ isOpen: boolean; toggleSidebar: () => void }> = ({ isOpen, toggleSidebar }) => {
  const { 
    history, 
    setIsCreditModalOpen, 
    setIsProfileModalOpen,
    performLeadSearch,
    resetWorkspace,
    viewState,
    setViewState
  } = useApp() as any;

  const [isTaskOpen, setIsTaskOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#000000] border-r border-[#18181b] flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      <div className="h-14 px-4 border-b border-[#18181b] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-serif text-black font-extrabold text-lg">
            L
          </div>
          <span className="font-semibold text-white text-base tracking-tight">LeadSage</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
          title="Recolher Menu"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        <div className="space-y-1">
          <button
            onClick={() => {
              if (resetWorkspace) resetWorkspace();
            }}
            className="w-full py-2 px-3 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900/80 flex items-center justify-between text-xs font-medium transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Plus className="w-4 h-4 text-zinc-400 group-hover:text-white" />
              <span>Novo</span>
            </div>
            <kbd className="text-[10px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
              Ctrl+K
            </kbd>
          </button>

          <button
            onClick={() => setViewState('tasks')}
            className={`w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs font-medium transition-colors ${
              viewState === 'tasks' ? 'bg-zinc-900 text-white' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
            }`}
          >
            <CheckSquare className={`w-4 h-4 ${viewState === 'tasks' ? 'text-white' : 'text-zinc-400'}`} />
            <span>Tarefa</span>
          </button>

          <button
            onClick={() => setViewState('history')}
            className={`w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs font-medium transition-colors ${
              viewState === 'history' ? 'bg-zinc-900 text-white' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
            }`}
          >
            <History className={`w-4 h-4 ${viewState === 'history' ? 'text-white' : 'text-zinc-400'}`} />
            <span>Histórico</span>
          </button>

          <button
            onClick={() => setViewState('emails')}
            className={`w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs font-medium transition-colors ${
              viewState === 'emails' ? 'bg-zinc-900 text-white' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
            }`}
          >
            <Mail className={`w-4 h-4 ${viewState === 'emails' ? 'text-white' : 'text-zinc-400'}`} />
            <span>E-mails</span>
          </button>

          <button
            onClick={() => setViewState('lists')}
            className={`w-full py-2 px-3 rounded-lg flex items-center gap-2.5 text-xs font-medium transition-colors ${
              viewState === 'lists' ? 'bg-zinc-900 text-white' : 'text-zinc-300 hover:text-white hover:bg-zinc-900/80'
            }`}
          >
            <List className={`w-4 h-4 ${viewState === 'lists' ? 'text-white' : 'text-zinc-400'}`} />
            <span>Minha Lista</span>
          </button>
        </div>

        <div className="pt-2 border-t border-zinc-900">
          <button
            onClick={() => setIsTaskOpen(!isTaskOpen)}
            className="w-full py-1.5 px-2 flex items-center justify-between text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <span>Task</span>
            {isTaskOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {isTaskOpen && (
            <div className="mt-1 space-y-1 pl-2">
              {history.length === 0 ? (
                <div className="px-2 py-1 text-[11px] text-zinc-600 italic">Nenhuma task pendente</div>
              ) : (
                history.slice(0, 3).map((item: any) => (
                  <button
                    key={item.id}
                    onClick={() => performLeadSearch(item.niche, item.location, 10)}
                    className="w-full text-left px-2.5 py-1.5 rounded text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 truncate transition-colors"
                  >
                    {item.niche} em {item.location.split(',')[0]}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-zinc-900">
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-full py-1.5 px-2 flex items-center justify-between text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <span>Chat</span>
            {isChatOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {isChatOpen && (
            <div className="mt-1 space-y-1 pl-2">
              <button
                onClick={() => performLeadSearch('Farmacêuticos', 'Botucatu, SP', 10)}
                className="w-full text-left px-2.5 py-1.5 rounded text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 truncate flex items-center gap-2"
              >
                <MessageSquare className="w-3 h-3 text-zinc-500" />
                <span>SMB Website Builder</span>
              </button>
              <button
                onClick={() => performLeadSearch('Médicos', 'Botucatu, SP', 10)}
                className="w-full text-left px-2.5 py-1.5 rounded text-xs text-zinc-400 hover:text-white hover:bg-zinc-900 truncate flex items-center gap-2"
              >
                <MessageSquare className="w-3 h-3 text-zinc-500" />
                <span>Prospecção Saúde</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-[#18181b] flex items-center justify-between text-[11px] text-zinc-500 font-medium px-4">
        <button onClick={() => setIsProfileModalOpen(true)} className="hover:text-zinc-300 transition-colors">
          Configuração
        </button>
        <span>|</span>
        <button onClick={() => setIsCreditModalOpen(true)} className="hover:text-zinc-300 transition-colors">
          Feedback
        </button>
        <span>|</span>
        <button className="hover:text-zinc-300 transition-colors">
          Idioma
        </button>
      </div>
    </aside>
  );
};
