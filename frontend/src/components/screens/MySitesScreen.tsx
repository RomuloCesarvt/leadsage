import React from 'react';
import { LayoutTemplate, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MySitesScreen: React.FC = () => {
  const { setViewState } = useApp() as any;

  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Meus Sites</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie os sites institucionais criados para prospecção.</p>
        </div>
        <button 
          onClick={() => setViewState('create-site')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          Criar novo site
        </button>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col items-center justify-center p-12 text-center shadow-sm">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <LayoutTemplate className="w-10 h-10 text-blue-600" />
        </div>
        <h3 className="font-bold text-slate-800 text-xl mb-2">Você ainda não criou nenhum site</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          Use nossa inteligência artificial para criar sites incríveis em segundos e usá-los como isca para fechar contratos com seus leads.
        </p>
        <button 
          onClick={() => setViewState('create-site')}
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition-colors"
        >
          Criar meu primeiro site
        </button>
      </div>

    </div>
  );
};
