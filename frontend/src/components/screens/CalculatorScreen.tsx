import React, { useState, useMemo } from 'react';
import { Calculator, DollarSign, Clock, Users, TrendingUp } from 'lucide-react';

const SERVICES = [
  { id: 'site-institucional', name: 'Site Institucional', baseMin: 800, baseMax: 3000 },
  { id: 'landing-page', name: 'Landing Page', baseMin: 400, baseMax: 1500 },
  { id: 'ecommerce', name: 'E-commerce', baseMin: 2500, baseMax: 8000 },
  { id: 'trafego-pago', name: 'Gestão de Tráfego Pago (mensal)', baseMin: 800, baseMax: 3000 },
  { id: 'social-media', name: 'Social Media (mensal)', baseMin: 600, baseMax: 2500 },
  { id: 'design-identidade', name: 'Identidade Visual', baseMin: 500, baseMax: 2000 },
  { id: 'consultoria', name: 'Consultoria de Marketing', baseMin: 300, baseMax: 1500 },
  { id: 'seo', name: 'SEO e Otimização', baseMin: 500, baseMax: 2000 },
];

export const CalculatorScreen: React.FC = () => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [complexity, setComplexity] = useState<'baixa' | 'media' | 'alta'>('media');
  const [urgency, setUrgency] = useState<'normal' | 'urgente'>('normal');
  const [clientSize, setClientSize] = useState<'pequeno' | 'medio' | 'grande'>('medio');

  const toggleService = (id: string) => {
    setSelectedServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const multipliers = useMemo(() => {
    let complexityMul = complexity === 'baixa' ? 0.8 : complexity === 'alta' ? 1.4 : 1;
    let urgencyMul = urgency === 'urgente' ? 1.3 : 1;
    let clientMul = clientSize === 'pequeno' ? 0.85 : clientSize === 'grande' ? 1.25 : 1;
    return { complexityMul, urgencyMul, clientMul };
  }, [complexity, urgency, clientSize]);

  const totals = useMemo(() => {
    let min = 0;
    let max = 0;
    selectedServices.forEach(id => {
      const svc = SERVICES.find(s => s.id === id);
      if (svc) {
        min += svc.baseMin;
        max += svc.baseMax;
      }
    });
    const { complexityMul, urgencyMul, clientMul } = multipliers;
    return {
      min: Math.round(min * complexityMul * urgencyMul * clientMul),
      max: Math.round(max * complexityMul * urgencyMul * clientMul)
    };
  }, [selectedServices, multipliers]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar max-w-5xl mx-auto w-full pb-12">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Precificador</h1>
        <p className="text-slate-500 text-sm mt-1">Calcule o valor sugerido dos seus serviços para enviar propostas com confiança.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left - Config */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Services */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" /> Serviços
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SERVICES.map(svc => (
                <button
                  key={svc.id}
                  onClick={() => toggleService(svc.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${selectedServices.includes(svc.id) ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-400' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                  <h4 className={`font-bold text-sm ${selectedServices.includes(svc.id) ? 'text-blue-700' : 'text-slate-700'}`}>{svc.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">Base: R$ {svc.baseMin.toLocaleString('pt-BR')} – R$ {svc.baseMax.toLocaleString('pt-BR')}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Modifiers */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" /> Complexidade
              </label>
              <div className="flex gap-2">
                {(['baixa', 'media', 'alta'] as const).map(c => (
                  <button key={c} onClick={() => setComplexity(c)} className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-colors ${complexity === c ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {c === 'baixa' ? 'Baixa' : c === 'media' ? 'Média' : 'Alta'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" /> Urgência
              </label>
              <div className="flex gap-2">
                {(['normal', 'urgente'] as const).map(u => (
                  <button key={u} onClick={() => setUrgency(u)} className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-colors ${urgency === u ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {u === 'normal' ? 'Normal' : 'Urgente (+30%)'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Porte do cliente
              </label>
              <div className="flex gap-2">
                {(['pequeno', 'medio', 'grande'] as const).map(s => (
                  <button key={s} onClick={() => setClientSize(s)} className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-colors ${clientSize === s ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {s === 'pequeno' ? 'Pequeno' : s === 'medio' ? 'Médio' : 'Grande'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right - Result */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm sticky top-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" /> Valor Sugerido
            </h3>

            {selectedServices.length === 0 ? (
              <div className="text-center py-8">
                <Calculator className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Selecione serviços para calcular</p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 rounded-xl p-6 mb-6 text-center">
                  <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">Faixa de preço</p>
                  <div className="text-3xl font-black text-blue-700 tracking-tight">
                    R$ {totals.min.toLocaleString('pt-BR')} – R$ {totals.max.toLocaleString('pt-BR')}
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Serviços selecionados</p>
                  {selectedServices.map(id => {
                    const svc = SERVICES.find(s => s.id === id);
                    return svc ? (
                      <div key={id} className="flex justify-between text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                        <span>{svc.name}</span>
                        <span className="font-bold text-slate-700">R$ {svc.baseMin.toLocaleString('pt-BR')}+</span>
                      </div>
                    ) : null;
                  })}
                </div>

                <div className="space-y-2 text-xs text-slate-500 bg-slate-50 rounded-xl p-4">
                  <p>Complexidade: <span className="font-bold text-slate-700">{complexity === 'baixa' ? 'Baixa (-20%)' : complexity === 'alta' ? 'Alta (+40%)' : 'Média'}</span></p>
                  <p>Urgência: <span className="font-bold text-slate-700">{urgency === 'urgente' ? 'Urgente (+30%)' : 'Normal'}</span></p>
                  <p>Porte: <span className="font-bold text-slate-700">{clientSize === 'pequeno' ? 'Pequeno (-15%)' : clientSize === 'grande' ? 'Grande (+25%)' : 'Médio'}</span></p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
