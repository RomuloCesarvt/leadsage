import React from 'react';
import { MessageSquare, Sparkles, ChevronDown } from 'lucide-react';

export const AIOutreachScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">IA de Abordagem</h1>
        <p className="text-slate-500 text-sm mt-1">Crie mensagens hiper-personalizadas para prospecção fria no WhatsApp e E-mail.</p>
      </div>

      <div className="flex-1 relative flex flex-col md:flex-row gap-6">
        
        {/* Content */}
        <div className="w-full md:w-1/3 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-fit shadow-sm">
          <label className="block text-sm font-bold text-slate-700 mb-2">Lead</label>
          <div className="relative">
            <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 flex items-center justify-between cursor-pointer hover:border-blue-400 transition-colors">
              Selecionar um lead...
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
          
          <button className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold rounded-xl flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            Gerar Abordagem
          </button>
        </div>

        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
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
