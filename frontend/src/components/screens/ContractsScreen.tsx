import React from 'react';
import { ScrollText } from 'lucide-react';

export const ContractsScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Contratos</h1>
        <p className="text-slate-500 text-sm mt-1">Modelos de contratos jurídicos e prestação de serviço.</p>
      </div>

      <div className="flex-1 relative">
        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                <button className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 text-sm font-bold">Visualizar</button>
                <button className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm font-bold">Usar Contrato</button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
