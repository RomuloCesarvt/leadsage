import React from 'react';
import { Lock } from 'lucide-react';

export const CalculatorScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Precificador</h1>
        <p className="text-slate-500 text-sm mt-1">Calcule o valor ideal para seus projetos baseados em horas e escopo.</p>
      </div>

      <div className="flex-1 relative">
        {/* Paywall Overlay */}
        <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl border border-slate-200 p-6 text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <span className="text-xs font-black tracking-widest uppercase text-slate-500 mb-2">Básico</span>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 max-w-md">Precificador é exclusivo dos planos vitalícios</h2>
          <p className="text-slate-600 max-w-md mb-8">
            Saiba exatamente quanto cobrar pelos seus serviços usando nossa calculadora avançada baseada em precificação de mercado.
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 opacity-30 select-none pointer-events-none">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">1. Tipo de Serviço</label>
              <div className="flex flex-wrap gap-2">
                {['Site Institucional', 'Landing Page', 'E-commerce', 'Tráfego Pago', 'Consultoria'].map(s => (
                  <div key={s} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm">
                    {s}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">2. Seu Valor Hora (R$)</label>
              <input type="number" value="100" readOnly className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">3. Horas Estimadas do Projeto</label>
              <input type="range" min="1" max="200" value="30" readOnly className="w-full" />
              <div className="text-right text-sm font-bold text-slate-600 mt-1">30 horas</div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 shadow-sm text-white flex flex-col justify-center">
            <h3 className="text-lg font-bold text-slate-300 mb-8 text-center">Faixas de Preço Recomendadas</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                <span className="text-slate-300 font-semibold">Mínimo Aceitável</span>
                <span className="text-xl font-bold">R$ 2.400,00</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-600 rounded-xl shadow-lg transform scale-105">
                <span className="text-white font-black">Preço Ideal</span>
                <span className="text-2xl font-black">R$ 3.000,00</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                <span className="text-slate-300 font-semibold">Valor Premium</span>
                <span className="text-xl font-bold">R$ 4.500,00</span>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
