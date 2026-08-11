import React from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const TasksScreen: React.FC = () => {
  const { setViewState } = useApp() as any;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#000000]">
      <div className="p-8 max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <h1 className="text-2xl font-bold text-zinc-100 mb-8 tracking-tight">Minhas Tarefas</h1>
        
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-[#18181b] rounded-2xl bg-[#050505] p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 flex items-center justify-center mb-6">
            <CheckSquare className="w-8 h-8 text-zinc-600" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-300 mb-2">Nenhuma tarefa ativa no momento</h2>
          <p className="text-sm text-zinc-500 mb-8 max-w-md">
            Você não possui campanhas ou buscas agendadas rodando. Crie uma nova tarefa de prospecção para começar.
          </p>
          
          <button
            onClick={() => setViewState('hero')}
            className="px-6 py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
