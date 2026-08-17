import React from 'react';


export const CalculatorScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Precificador</h1>
        <p className="text-slate-500 text-sm mt-1">Calcule o valor ideal para seus projetos baseados em horas e escopo.</p>
      </div>

      <div className="flex-1 relative">
        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3">1. Tipo de Serviço</label>
              <div className="flex flex-wrap gap-2">
                {['Site Institucional', 'Landing Page', 'E-commerce', 'Tráfego Pago', 'Consultoria'].map((s, i) => (
                  <div key={s} className={`px-4 py-2 rounded-xl border font-medium text-sm cursor-pointer transition-colors ${i === 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">2. Seu Valor Hora (R$)</label>
              <input type="number" defaultValue="100" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">3. Horas Estimadas do Projeto</label>
              <input type="range" min="1" max="200" defaultValue="30" className="w-full accent-blue-600" />
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
