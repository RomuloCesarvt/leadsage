import React from 'react';
import { Bell, ArrowRight, Sparkles } from 'lucide-react';

export const NotificationsScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full relative max-w-4xl mx-auto w-full">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Avisos e Novidades</h1>
        <p className="text-slate-500 text-sm mt-1">Fique por dentro das atualizações da plataforma.</p>
      </div>

      <div className="space-y-6 mt-4">
        
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
          <div className="flex items-start gap-6 relative z-10">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold uppercase tracking-widest mb-3">Novo Recurso</span>
              <h2 className="text-2xl font-bold mb-2">Conheça o novo Precificador!</h2>
              <p className="text-blue-100 max-w-xl mb-6">Acabamos de liberar uma calculadora inteligente para você nunca mais ter dúvidas de quanto cobrar pelos seus serviços. Baseado em dados reais do mercado.</p>
              <button className="px-5 py-2.5 bg-white text-blue-600 font-bold rounded-xl shadow-sm hover:bg-blue-50 transition-colors">
                Testar Precificador
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Aprenda a criar e vender sites com IA</h3>
            <p className="text-slate-500 text-sm">Participe do nosso grupo VIP no WhatsApp onde enviamos estratégias diárias de fechamento de contratos de web design usando nossa IA.</p>
          </div>
          <button className="px-5 py-2.5 w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors whitespace-nowrap">
            Quero entrar no grupo
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
            <ArrowRight className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Terceirize o desenvolvimento conosco</h3>
            <p className="text-slate-500 text-sm">Fechou um site complexo ou sistema que nossa IA não cobre? Nossa equipe de experts desenvolve para você (White Label).</p>
          </div>
          <button className="px-5 py-2.5 w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors whitespace-nowrap">
            Solicitar orçamento
          </button>
        </div>

      </div>

    </div>
  );
};
