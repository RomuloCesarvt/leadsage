import React from 'react';
import { Book, PlayCircle, MessageCircle, HelpCircle, ChevronRight } from 'lucide-react';

export const HelpScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full relative max-w-4xl mx-auto w-full">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Central de Ajuda</h1>
        <p className="text-slate-500 text-sm mt-1">Encontre respostas rápidas ou fale com nossa equipe.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <a href="#" className="bg-white border border-slate-200 rounded-2xl p-6 flex items-start gap-5 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Book className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors flex items-center gap-2">Documentação <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" /></h3>
            <p className="text-sm text-slate-500">Guias completos sobre todas as funcionalidades da plataforma.</p>
          </div>
        </a>

        <a href="#" className="bg-white border border-slate-200 rounded-2xl p-6 flex items-start gap-5 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
            <PlayCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 mb-1 group-hover:text-amber-600 transition-colors flex items-center gap-2">Tutoriais em vídeo <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" /></h3>
            <p className="text-sm text-slate-500">Aprenda a usar a plataforma com passo a passo em vídeo.</p>
          </div>
        </a>

        <a href="#" className="bg-white border border-slate-200 rounded-2xl p-6 flex items-start gap-5 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
            <MessageCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 mb-1 group-hover:text-emerald-600 transition-colors flex items-center gap-2">Suporte via chat <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" /></h3>
            <p className="text-sm text-slate-500">Fale com nossa equipe de suporte em tempo real.</p>
          </div>
        </a>

        <a href="#" className="bg-white border border-slate-200 rounded-2xl p-6 flex items-start gap-5 hover:shadow-md transition-shadow group">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
            <HelpCircle className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 mb-1 group-hover:text-purple-600 transition-colors flex items-center gap-2">Perguntas Frequentes <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" /></h3>
            <p className="text-sm text-slate-500">Respostas rápidas para as dúvidas mais comuns dos usuários.</p>
          </div>
        </a>

      </div>

    </div>
  );
};
