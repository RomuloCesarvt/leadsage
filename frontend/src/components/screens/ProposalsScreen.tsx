import React from 'react';
import { Lock } from 'lucide-react';

export const ProposalsScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Propostas</h1>
        <p className="text-slate-500 text-sm mt-1">Modelos de propostas comerciais de alta conversão.</p>
      </div>

      <div className="flex-1 relative">
        {/* Paywall Overlay */}
        <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl border border-slate-200 p-6 text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <span className="text-xs font-black tracking-widest uppercase text-slate-500 mb-2">Básico</span>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 max-w-md">Propostas é exclusivo dos planos vitalícios</h2>
          <p className="text-slate-600 max-w-md mb-8">
            Gere propostas comerciais impecáveis em poucos cliques. Nossos modelos já geraram mais de R$ 5 Milhões em vendas.
          </p>
          <div className="flex items-center gap-4">
            <button className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition-colors">
              Ver Planos
            </button>
            <button className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors">
              Comparar
            </button>
          </div>
        </div>

        {/* Content behind paywall */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-30 select-none pointer-events-none">
          {['Minimalista', 'Premium', 'Corporativo', 'Criativo'].map((title, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
              <div className="w-24 h-32 bg-slate-100 rounded-xl mb-4 border border-slate-200 shadow-sm relative overflow-hidden">
                {/* Fake document skeleton */}
                <div className="absolute top-4 left-4 w-12 h-2 bg-slate-200 rounded"></div>
                <div className="absolute top-8 left-4 w-16 h-2 bg-slate-200 rounded"></div>
                <div className="absolute top-14 left-4 right-4 h-1 bg-slate-200 rounded"></div>
                <div className="absolute top-18 left-4 right-4 h-1 bg-slate-200 rounded"></div>
              </div>
              <h3 className="font-bold text-slate-800 mb-4">{title}</h3>
              <div className="flex flex-col w-full gap-2">
                <button className="w-full py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">Visualizar</button>
                <button className="w-full py-2 rounded-lg bg-blue-600 text-white text-xs font-bold">Usar este modelo</button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
