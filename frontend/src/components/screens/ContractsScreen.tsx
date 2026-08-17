import React from 'react';
import { ScrollText, Lock } from 'lucide-react';

export const ContractsScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Contratos</h1>
        <p className="text-slate-500 text-sm mt-1">Modelos de contratos jurídicos e prestação de serviço.</p>
      </div>

      <div className="flex-1 relative">
        {/* Paywall Overlay */}
        <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl border border-slate-200 p-6 text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <span className="text-xs font-black tracking-widest uppercase text-slate-500 mb-2">Básico</span>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 max-w-md">Contratos é exclusivo dos planos vitalícios</h2>
          <p className="text-slate-600 max-w-md mb-8">
            Tenha acesso a dezenas de templates jurídicos aprovados por advogados para vender sites e serviços com segurança.
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-30 select-none pointer-events-none">
          {[
            'Prestação de Serviço Simples',
            'Criação de Site Institucional',
            'Desenvolvimento de E-commerce',
            'Gestão de Tráfego Pago',
            'Social Media Mensal'
          ].map((title, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-500">
                <ScrollText className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
              <p className="text-sm text-slate-500 mb-6">Modelo padrão com cláusulas de SLA, rescisão e escopo técnico fechado.</p>
              <div className="flex items-center gap-2">
                <button className="flex-1 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-bold">Visualizar</button>
                <button className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-bold">Usar Contrato</button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
