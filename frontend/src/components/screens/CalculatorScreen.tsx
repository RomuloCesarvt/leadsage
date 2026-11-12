import React, { useState, useMemo, useEffect } from 'react';
import { Calculator, DollarSign, Clock, Users, TrendingUp, Check, Copy, FileText, Pencil, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';

type Servico = { id: string; name: string; baseMin: number; baseMax: number; mensal?: boolean };

const SERVICES: Servico[] = [
  { id: 'site-institucional', name: 'Site Institucional', baseMin: 800, baseMax: 3000 },
  { id: 'landing-page', name: 'Landing Page', baseMin: 400, baseMax: 1500 },
  { id: 'ecommerce', name: 'E-commerce', baseMin: 2500, baseMax: 8000 },
  { id: 'trafego-pago', name: 'Gestão de Tráfego Pago', baseMin: 800, baseMax: 3000, mensal: true },
  { id: 'social-media', name: 'Social Media', baseMin: 600, baseMax: 2500, mensal: true },
  { id: 'design-identidade', name: 'Identidade Visual', baseMin: 500, baseMax: 2000 },
  { id: 'consultoria', name: 'Consultoria de Marketing', baseMin: 300, baseMax: 1500, mensal: true },
  { id: 'seo', name: 'SEO e Otimização', baseMin: 500, baseMax: 2000, mensal: true },
];

const CHAVE = 'leadsage_precos';
const brl = (n: number) => `R$ ${n.toLocaleString('pt-BR')}`;

const lerPrecos = (): Record<string, [number, number]> => {
  try { return JSON.parse(localStorage.getItem(CHAVE) || '{}') || {}; } catch { return {}; }
};

const Segmentos = <T extends string>({ valor, opcoes, onChange, rotulo }: { valor: T; opcoes: [T, string][]; onChange: (v: T) => void; rotulo: string }) => (
  <div role="group" aria-label={rotulo} className="grid gap-1 p-1 bg-slate-100 rounded-xl" style={{ gridTemplateColumns: `repeat(${opcoes.length}, minmax(0, 1fr))` }}>
    {opcoes.map(([v, nome]) => (
      <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={valor === v}
        className={`min-h-11 px-1 rounded-lg text-[13px] md:text-sm font-bold ${valor === v ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>{nome}</button>
    ))}
  </div>
);

export const CalculatorScreen: React.FC = () => {
  const { setViewState } = useApp() as any;
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [complexity, setComplexity] = useState<'baixa' | 'media' | 'alta'>('media');
  const [urgency, setUrgency] = useState<'normal' | 'urgente'>('normal');
  const [clientSize, setClientSize] = useState<'pequeno' | 'medio' | 'grande'>('medio');
  const [editando, setEditando] = useState(false);
  const [meus, setMeus] = useState<Record<string, [number, number]>>(lerPrecos);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => { try { localStorage.setItem(CHAVE, JSON.stringify(meus)); } catch { /* sem armazenamento */ } }, [meus]);

  const servicos = useMemo(() => SERVICES.map(s => {
    const m = meus[s.id];
    return m ? { ...s, baseMin: m[0], baseMax: m[1] } : s;
  }), [meus]);

  const toggleService = (id: string) => setSelectedServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const fator = (complexity === 'baixa' ? 0.8 : complexity === 'alta' ? 1.4 : 1) * (urgency === 'urgente' ? 1.3 : 1) * (clientSize === 'pequeno' ? 0.85 : clientSize === 'grande' ? 1.25 : 1);

  const escolhidos = servicos.filter(s => selectedServices.includes(s.id));
  const soma = (lista: Servico[]) => ({
    min: Math.round(lista.reduce((a, s) => a + s.baseMin, 0) * fator),
    max: Math.round(lista.reduce((a, s) => a + s.baseMax, 0) * fator),
  });
  const unico = soma(escolhidos.filter(s => !s.mensal));
  const mensal = soma(escolhidos.filter(s => s.mensal));
  const temUnico = escolhidos.some(s => !s.mensal);
  const temMensal = escolhidos.some(s => s.mensal);

  const mudarPreco = (id: string, pos: 0 | 1, valor: string) => {
    const base = SERVICES.find(s => s.id === id)!;
    const atual = meus[id] || [base.baseMin, base.baseMax];
    const n = Math.max(0, Math.round(Number(valor.replace(/\D/g, '')) || 0));
    const novo: [number, number] = pos === 0 ? [n, atual[1]] : [atual[0], n];
    setMeus(prev => ({ ...prev, [id]: novo }));
  };

  const resumo = () => {
    const linhas = escolhidos.map(s => `• ${s.name}${s.mensal ? ' (mensal)' : ''}`);
    const partes = [];
    if (temUnico) partes.push(`Investimento único: ${brl(unico.min)} a ${brl(unico.max)}`);
    if (temMensal) partes.push(`Mensalidade: ${brl(mensal.min)} a ${brl(mensal.max)}`);
    return `${linhas.join('\n')}\n\n${partes.join('\n')}`;
  };

  const copiar = async () => {
    try { await navigator.clipboard.writeText(resumo()); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sem permissão */ }
  };

  const Faixa: React.FC<{ rotulo: string; v: { min: number; max: number } }> = ({ rotulo, v }) => (
    <div className="rounded-xl bg-blue-50 p-4 text-center">
      <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-1">{rotulo}</p>
      <p className="text-2xl md:text-3xl font-black text-blue-700 tracking-tight leading-tight">{brl(v.min)}<span className="block md:inline text-base md:text-3xl font-bold md:font-black text-blue-500 md:text-blue-700"> a {brl(v.max)}</span></p>
    </div>
  );

  const detalhes = (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm md:sticky md:top-6">
      <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-blue-600" /> Valor sugerido</h3>
      {escolhidos.length === 0 ? (
        <div className="text-center py-6">
          <Calculator className="w-9 h-9 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">Toque nos serviços acima para calcular.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {temUnico && <Faixa rotulo="Investimento único" v={unico} />}
            {temMensal && <Faixa rotulo="Por mês" v={mensal} />}
          </div>
          <ul className="space-y-1.5 mb-4">
            {escolhidos.map(s => (
              <li key={s.id} className="flex justify-between gap-3 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                <span className="min-w-0">{s.name}{s.mensal && <em className="not-italic text-slate-400"> · mensal</em>}</span>
                <span className="font-bold text-slate-700 shrink-0">{brl(Math.round(s.baseMin * fator))}+</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 mb-4 leading-relaxed">
            Complexidade {complexity === 'baixa' ? 'baixa (−20%)' : complexity === 'alta' ? 'alta (+40%)' : 'média'} · urgência {urgency === 'urgente' ? '(+30%)' : 'normal'} · cliente {clientSize === 'pequeno' ? 'pequeno (−15%)' : clientSize === 'grande' ? 'grande (+25%)' : 'médio'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={copiar} className="min-h-12 rounded-xl bg-slate-100 active:bg-slate-200 text-slate-700 text-sm font-bold flex items-center justify-center gap-2">
              {copiado ? <><Check className="w-4 h-4 text-emerald-600" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar</>}
            </button>
            <button type="button" onClick={() => setViewState('proposals')} className="min-h-12 rounded-xl bg-blue-600 active:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" /> Fazer proposta
            </button>
          </div>
        </>
      )}
    </div>
  );

  const principal = temUnico ? unico : mensal;
  const cartao = 'bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm';

  return (
    <div className="flex-1 flex flex-col w-full">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Precificador</h1>
        <p className="text-slate-500 text-sm mt-1">Toque nos serviços, ajuste o cenário e veja quanto cobrar.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6 min-w-0">
          <div className={cartao}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-base md:text-lg font-bold text-slate-800 flex items-center gap-2"><Calculator className="w-5 h-5 text-blue-600" /> Serviços</h2>
              <button type="button" onClick={() => setEditando(v => !v)} aria-pressed={editando} className={`min-h-11 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 ${editando ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                <Pencil className="w-3.5 h-3.5" /> {editando ? 'Concluir' : 'Meus preços'}
              </button>
            </div>
            {editando && (
              <p className="text-xs text-slate-500 mb-3 leading-snug">Coloque os valores que você realmente cobra. Ficam salvos neste aparelho.
                {Object.keys(meus).length > 0 && <button type="button" onClick={() => setMeus({})} className="ml-2 inline-flex items-center gap-1 font-bold text-slate-700 underline"><RotateCcw className="w-3 h-3" /> Voltar ao padrão</button>}</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {servicos.map(svc => {
                const on = selectedServices.includes(svc.id);
                return (
                  <div key={svc.id} className={`rounded-xl border transition-colors ${on ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' : 'bg-white border-slate-200'}`}>
                    <button type="button" onClick={() => toggleService(svc.id)} aria-pressed={on} className="w-full min-h-16 px-4 py-3 flex items-center gap-3 text-left">
                      <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${on ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>{on && <Check className="w-4 h-4 text-white" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className={`block font-bold text-sm leading-tight ${on ? 'text-blue-700' : 'text-slate-800'}`}>{svc.name}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{brl(svc.baseMin)} a {brl(svc.baseMax)}{svc.mensal ? ' por mês' : ''}</span>
                      </span>
                    </button>
                    {editando && (
                      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                        {([0, 1] as const).map(pos => (
                          <label key={pos} className="text-[11px] font-semibold text-slate-500">{pos === 0 ? 'Mínimo' : 'Máximo'}
                            <input inputMode="numeric" value={pos === 0 ? svc.baseMin : svc.baseMax} onChange={e => mudarPreco(svc.id, pos, e.target.value)}
                              className="mt-1 w-full min-h-11 px-3 rounded-lg border border-slate-200 bg-white text-base md:text-sm text-slate-800" />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`${cartao} space-y-5`}>
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-600" /> Complexidade</p>
              <Segmentos rotulo="Complexidade" valor={complexity} onChange={setComplexity} opcoes={[['baixa', 'Baixa'], ['media', 'Média'], ['alta', 'Alta']]} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" /> Urgência</p>
              <Segmentos rotulo="Urgência" valor={urgency} onChange={setUrgency} opcoes={[['normal', 'Normal'], ['urgente', 'Urgente +30%']]} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /> Porte do cliente</p>
              <Segmentos rotulo="Porte do cliente" valor={clientSize} onChange={setClientSize} opcoes={[['pequeno', 'Pequeno'], ['medio', 'Médio'], ['grande', 'Grande']]} />
            </div>
          </div>
        </div>

        <div className="min-w-0">{detalhes}</div>
      </div>

      {escolhidos.length > 0 && (
        <div className="md:hidden sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 -mx-4 mt-4 px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between gap-3" data-testid="barra-do-valor">
          <span className="text-xs text-slate-300">{escolhidos.length} serviço{escolhidos.length > 1 ? 's' : ''}{temUnico && temMensal ? ' · único' : temMensal ? ' · por mês' : ''}</span>
          <span className="font-black text-base">{brl(principal.min)} a {brl(principal.max)}</span>
        </div>
      )}
    </div>
  );
};
