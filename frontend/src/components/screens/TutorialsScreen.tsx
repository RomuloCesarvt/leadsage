import React from 'react';
import { PlayCircle, Loader } from 'lucide-react';

export const TutorialsScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full relative overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Aprenda a usar a LeadSage</h1>
        <p className="text-slate-500 text-sm mt-1">Tutoriais rápidos e práticos para você aproveitar melhor cada recurso da plataforma.</p>
      </div>

      {/* Featured Tutorial */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-1/2 aspect-video lg:aspect-auto bg-slate-900 relative flex items-center justify-center cursor-pointer group min-h-[280px]">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900"></div>
            <div className="relative z-10 text-center">
              <div className="text-white/30 font-black text-5xl lg:text-6xl uppercase leading-none mb-2">GERAR<br/>LEADS</div>
              <div className="text-white/50 font-bold text-lg">na LeadSage</div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors group-hover:scale-110">
                <PlayCircle className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
          <div className="lg:w-1/2 p-8 flex flex-col justify-center">
            <h2 className="text-2xl font-bold text-slate-800 mb-3">Como Gerar Leads Na LeadSage</h2>
            <p className="text-slate-500 mb-6">Aprenda, passo a passo, como realizar uma busca de leads dentro da LeadSage e encontrar empresas com potencial para contratar seus serviços.</p>
            <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors w-fit flex items-center gap-2">
              <PlayCircle className="w-5 h-5" /> Assistir tutorial
            </button>
          </div>
        </div>
      </div>

      {/* Upcoming Tutorials Section */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-800 mb-1">Novos tutoriais estão a caminho</h2>
        <p className="text-slate-500 text-sm">Estamos preparando conteúdos sobre estes temas:</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          'Como criar e vender sites com IA',
          'Pipeline: acompanhe seus leads de perto',
          'Propostas e contratos digitais',
          'IA de Abordagem: mensagens automáticas',
          'Precificador: quanto cobrar?',
          'Exportando leads para CSV e CRM',
        ].map((topic, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4 opacity-60">
            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
              <Loader className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-700 text-sm">{topic}</h3>
              <p className="text-xs text-slate-400">Em breve</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
