import React from 'react';
import { FileText, Plus } from 'lucide-react';

export const ProposalsScreen: React.FC = () => {
  return (
    <div className="flex-1 overflow-x-auto overflow-y-auto p-4 md:p-6 h-full custom-scrollbar">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Propostas</h1>
          <p className="text-slate-500 text-sm mt-1">Crie e gerencie contratos e propostas comerciais para seus leads.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors">
          <Plus className="w-4 h-4" />
          Nova Proposta
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-16 text-center shadow-sm">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl border border-blue-100 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhuma proposta criada</h3>
        <p className="text-slate-500 max-w-md">Você ainda não enviou propostas. Utilize os templates para gerar contratos rapidamente para os leads em negociação.</p>
      </div>
    </div>
  );
};
