import React from 'react';
import { Globe, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MySitesScreen: React.FC = () => {
  const { setViewState } = useApp() as any;

  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Meus Sites</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie, edite e publique seus sites.</p>
        </div>
        <button 
          onClick={() => setViewState('create-site')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          Criar novo site
        </button>
      </div>

      {/* Usage Badge */}
      <div className="mb-6">
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium">
          <Globe className="w-4 h-4 text-slate-400" />
          Sites utilizados <span className="font-bold">0 / 1</span>
        </span>
      </div>

      {/* Empty State */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <Globe className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="font-bold text-slate-800 text-xl mb-2">Você ainda não criou nenhum site.</h3>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          Crie seu primeiro site profissional com a LeadSage.
        </p>
        <button 
          onClick={() => setViewState('create-site')}
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Criar meu primeiro site
        </button>
      </div>

    </div>
  );
};
