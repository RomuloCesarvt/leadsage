import React from 'react';
import { Globe, Wand2, LayoutTemplate } from 'lucide-react';

export const WebsiteBuilderScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full relative max-w-4xl mx-auto w-full">
      
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Globe className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Construtor de Sites</h1>
        <p className="text-slate-500 mt-2 max-w-xl mx-auto">Gere sites institucionais completos com inteligência artificial para usar como "isca" nas suas prospecções.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        
        <button className="bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-8 text-left transition-all hover:shadow-md group flex flex-col items-start relative overflow-hidden">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
            <LayoutTemplate className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">Criar a partir de um Lead</h3>
          <p className="text-slate-500 text-sm">A IA vai ler os dados do Google Meu Negócio do lead que você salvou e preencherá todas as informações do site automaticamente.</p>
        </button>

        <button className="bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-8 text-left transition-all hover:shadow-md group flex flex-col items-start relative overflow-hidden">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
            <Wand2 className="w-6 h-6 text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">Criar do zero</h3>
          <p className="text-slate-500 text-sm">Você preenche manualmente o nome da empresa, telefone, e outros dados para a IA estruturar o site.</p>
        </button>

      </div>

    </div>
  );
};
