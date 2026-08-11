import React from 'react';
import { History, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HistoryScreen: React.FC = () => {
  const { history, performLeadSearch } = useApp() as any;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar bg-[#000000]">
      <div className="p-8 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-zinc-100 mb-8 tracking-tight">Histórico de Pesquisas</h1>
        
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center border border-dashed border-[#18181b] rounded-2xl bg-[#050505] p-12 text-center mt-8">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 flex items-center justify-center mb-6">
              <History className="w-8 h-8 text-zinc-600" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-300 mb-2">Seu histórico está vazio</h2>
            <p className="text-sm text-zinc-500 max-w-md">
              O histórico das suas prospecções passadas será exibido aqui para acesso rápido.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item: any) => (
              <div 
                key={item.id} 
                className="group flex items-center justify-between p-4 rounded-xl bg-[#050505] border border-[#18181b] hover:border-zinc-800 hover:bg-[#09090b] transition-all cursor-pointer"
                onClick={() => performLeadSearch(item.niche, item.location, 10)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-900/50 flex items-center justify-center border border-zinc-800/50 group-hover:bg-zinc-800 group-hover:border-zinc-700 transition-colors">
                    <Search className="w-4 h-4 text-zinc-400 group-hover:text-zinc-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-200">
                      Prospecção de {item.niche}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {item.location} • Encontrados {item.total_leads} leads
                    </p>
                  </div>
                </div>
                <div className="text-xs text-zinc-600 font-mono">
                  {new Date(item.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
