import React from 'react';
import { PlayCircle, Search } from 'lucide-react';

export const TutorialsScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Tutoriais</h1>
          <p className="text-slate-500 text-sm mt-1">Aprenda a usar todas as funcionalidades da plataforma.</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar tutorial..." 
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { title: 'Como Gerar Leads na Prática', duration: '5:32' },
          { title: 'Automatizando a Abordagem com IA', duration: '8:15' },
          { title: 'Criando um Site em 1 Minuto', duration: '3:45' },
          { title: 'Gestão de Pipeline e Kanban', duration: '6:20' },
          { title: 'Enviando Propostas Matadoras', duration: '10:05' },
          { title: 'Configurando seu Perfil', duration: '2:10' },
        ].map((vid, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow group">
            <div className="aspect-video bg-slate-800 relative flex items-center justify-center group-hover:bg-slate-700 transition-colors cursor-pointer">
              <PlayCircle className="w-12 h-12 text-white/50 group-hover:text-white group-hover:scale-110 transition-all" />
              <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-white text-[10px] font-bold tracking-wider">
                {vid.duration}
              </div>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-slate-800 mb-2">{vid.title}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">Aprenda o passo a passo completo sobre este tema e otimize seus resultados na prospecção.</p>
              <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Assistir tutorial</button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
