import React from 'react';
import { Check } from 'lucide-react';

export const SubscriptionScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full relative max-w-5xl mx-auto w-full pb-12">
      
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Planos & Preços</h1>
        <p className="text-slate-500 mt-2">Escolha o plano ideal para escalar sua prospecção.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* START */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col">
          <h3 className="font-bold text-slate-800 text-xl mb-2">START VITALÍCIO</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-sm font-bold text-slate-500">R$</span>
            <span className="text-4xl font-black text-slate-800">67</span>
          </div>
          <div className="space-y-4 mb-8 flex-1">
            <div className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-blue-500 shrink-0" /> 150 leads</div>
            <div className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-blue-500 shrink-0" /> 10 sites criados</div>
            <div className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-blue-500 shrink-0" /> Acesso vitalício</div>
            <div className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-blue-500 shrink-0" /> IA de Abordagem</div>
            <div className="flex items-center gap-3 text-sm text-slate-600"><Check className="w-5 h-5 text-blue-500 shrink-0" /> Pipeline básico</div>
          </div>
          <button className="w-full py-3.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-colors">
            Garantir acesso Start
          </button>
        </div>

        {/* PRO */}
        <div className="bg-blue-600 rounded-3xl p-8 flex flex-col shadow-xl transform md:-translate-y-4 relative border border-blue-500">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-amber-400 text-amber-900 text-xs font-black px-4 py-1.5 rounded-full tracking-widest uppercase shadow-sm">
            Mais Vendido
          </div>
          <h3 className="font-bold text-white text-xl mb-2">PRO VITALÍCIO</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-blue-200 font-bold">R$</span>
            <span className="text-4xl font-black text-white">97</span>
          </div>
          <div className="space-y-4 mb-8 flex-1">
            <div className="flex items-center gap-3 text-sm text-blue-50"><Check className="w-5 h-5 text-amber-400 shrink-0" /> 500 leads</div>
            <div className="flex items-center gap-3 text-sm text-blue-50"><Check className="w-5 h-5 text-amber-400 shrink-0" /> 50 sites criados</div>
            <div className="flex items-center gap-3 text-sm text-blue-50"><Check className="w-5 h-5 text-amber-400 shrink-0" /> Exportar leads (CSV)</div>
            <div className="flex items-center gap-3 text-sm text-blue-50"><Check className="w-5 h-5 text-amber-400 shrink-0" /> Tudo do plano Start</div>
          </div>
          <button className="w-full py-3.5 bg-white hover:bg-slate-50 text-blue-700 font-bold rounded-xl transition-colors shadow-sm">
            Escolher o Pro Vitalício
          </button>
        </div>

        {/* AGÊNCIA */}
        <div className="bg-slate-900 rounded-3xl p-8 flex flex-col shadow-lg border border-slate-800">
          <h3 className="font-bold text-white text-xl mb-2">AGÊNCIA VITALÍCIO</h3>
          <div className="flex items-baseline gap-1 mb-6">
            <span className="text-slate-400 font-bold">R$</span>
            <span className="text-4xl font-black text-white">197</span>
          </div>
          <div className="space-y-4 mb-8 flex-1">
            <div className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> 3.000 leads</div>
            <div className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> 200 sites criados</div>
            <div className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> Gerador de Propostas</div>
            <div className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> Gerador de Contratos</div>
            <div className="flex items-center gap-3 text-sm text-slate-300"><Check className="w-5 h-5 text-emerald-400 shrink-0" /> Precificador</div>
          </div>
          <button className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-slate-700">
            Garantir acesso Agência
          </button>
        </div>

      </div>

    </div>
  );
};
