import React from 'react';
import { MessageSquare, Lock, Sparkles, ChevronDown } from 'lucide-react';

export const AIOutreachScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">IA de Abordagem</h1>
        <p className="text-slate-500 text-sm mt-1">Crie mensagens hiper-personalizadas para prospecção fria no WhatsApp e E-mail.</p>
      </div>

      <div className="flex-1 relative flex flex-col md:flex-row gap-6">
        
        {/* Paywall Overlay */}
        <div className="absolute inset-0 z-20 bg-slate-50/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl border border-slate-200 p-6 text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <span className="text-xs font-black tracking-widest uppercase text-blue-600 mb-2">START</span>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 max-w-md">IA de Abordagem é exclusivo dos planos vitalícios</h2>
          <p className="text-slate-600 max-w-md mb-8">
            Faça upgrade para gerar até 50 abordagens personalizadas por mês. A IA analisa o perfil do lead e cria 3 opções de mensagens focadas em conversão.
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
        <div className="w-full md:w-1/3 bg-white border border-slate-200 rounded-2xl p-5 opacity-30 select-none pointer-events-none flex flex-col h-fit">
          <label className="block text-sm font-bold text-slate-700 mb-2">Lead</label>
          <div className="relative">
            <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 flex items-center justify-between">
              Selecionar um lead...
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
          
          <button className="w-full mt-6 py-3 bg-blue-600 text-white font-bold rounded-xl flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            Gerar Abordagem
          </button>
        </div>

        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 opacity-30 select-none pointer-events-none flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg mb-2">Selecione um lead e clique em Gerar</h3>
          <p className="text-slate-500 max-w-sm">A IA irá analisar o perfil da empresa (nicho, localização, deficiências digitais) e criará 3 mensagens perfeitas para você copiar e colar no WhatsApp.</p>
        </div>

      </div>

    </div>
  );
};
