import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { modoDaConta } from '../../lib/modoDaConta';
import { COBRANCA_MENSAL_ATIVA, MODO_EXTRA, diferenciais, PLANOS_MENSAIS, ROBO_COMPLEMENTO, entregasDoPlano, entregasDoRobo, precoComRobo } from '../../data/planos';

export const SubscriptionScreen: React.FC = () => {
  const { user } = useApp() as any;
  const modo = modoDaConta(user);
  const [comRobo, setComRobo] = useState(false);

  return (
    <div className="flex-1 flex flex-col h-full relative max-w-6xl mx-auto w-full pb-12 pt-8">
      
      {/* Header */}
      <div className="mb-10 text-center">
        <span className="text-xs font-bold tracking-widest text-blue-600 uppercase mb-4 block">PLANOS & PREÇOS</span>
        <h1 className="text-4xl font-black tracking-tight text-slate-800 mb-4">Escolha o plano ideal para escalar sua prospecção</h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto">Encontre oportunidades, organize contatos e feche mais contratos<br/>com o LeadSage.</p>
      </div>

      {/* Toggle */}
      <div className="flex justify-center mb-12">
        <div className="bg-slate-100 p-1 rounded-full flex items-center shadow-inner">
          <button className="px-8 py-2.5 rounded-full bg-slate-900 text-white font-bold text-sm shadow-sm transition-all">Planos</button>
          <button className="px-8 py-2.5 rounded-full text-slate-500 font-bold text-sm hover:text-slate-700 transition-all flex items-center gap-2">
            <span className="text-slate-400">🔑</span> Já paguei, ativar
          </button>
        </div>
      </div>



      {/* Planos mensais: o que cada um entrega, no idioma do modo da conta */}
      <div className="px-4 mb-12">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-slate-800">Planos mensais</h2>
          <p className="text-sm text-slate-500 mt-1">Você está no modo <b>{modo === 'empresa' ? 'Empresa' : 'Agência'}</b>: a lista de entregas abaixo é a do seu modo.</p>
        </div>
        <div className="flex justify-center mb-8">
          <div className="bg-slate-100 p-1 rounded-full flex items-center shadow-inner" role="radiogroup" aria-label="Robô de atendimento">
            <button type="button" role="radio" aria-checked={!comRobo} onClick={() => setComRobo(false)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${!comRobo ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500'}`}>Só o plano</button>
            <button type="button" role="radio" aria-checked={comRobo} onClick={() => setComRobo(true)}
              className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all ${comRobo ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500'}`}>Com robô de atendimento (IA)</button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PLANOS_MENSAIS.map(p => (
            <div key={p.id} className={`bg-white rounded-[2rem] p-7 flex flex-col relative border ${p.destaque ? 'border-2 border-blue-500 shadow-xl shadow-blue-500/10' : 'border-slate-100 shadow-sm'}`}>
              {p.destaque && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-full">Mais escolhido</span>}
              <h3 className={`font-black text-xl ${p.destaque ? 'text-blue-600' : 'text-slate-900'}`}>{p.nome}</h3>
              <p className="text-sm text-slate-500 mt-1 mb-5">{p.chamada}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-lg font-bold text-slate-500 mb-1.5">R$</span>
                <span className="text-6xl leading-none font-black tracking-tighter text-slate-900">{comRobo ? precoComRobo(p) : p.preco}</span>
                <span className="text-sm font-bold text-slate-400 mb-1.5">/mês</span>
              </div>
              <p className="text-xs font-bold text-slate-500 mb-1">
                {p.robo === 'incluso'
                  ? 'Robô de atendimento com IA já incluso'
                  : comRobo ? `R$ ${p.preco} do plano + R$ ${ROBO_COMPLEMENTO} do robô de IA` : `Plano sem o robô de IA · com o robô: R$ ${precoComRobo(p)}/mês`}
              </p>
              <p className="text-xs font-bold text-slate-400 mb-5">{p.leads.toLocaleString('pt-BR')} leads por mês</p>
              <ul className="space-y-3 mb-7 flex-1">
                {entregasDoPlano(p, modo).map(t => (
                  <li key={t} className="flex items-start gap-3 text-[14px] font-medium text-slate-600">
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5 text-slate-500" /></span>
                    {t}
                  </li>
                ))}
              </ul>
              <div className={`rounded-2xl border p-4 mb-6 ${p.robo === 'incluso' || comRobo ? 'border-blue-200 bg-blue-50/60' : 'border-dashed border-slate-200 bg-slate-50'}`}>
                <p className="text-sm font-black text-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <span>Robô de atendimento com IA</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${p.robo === 'incluso' || comRobo ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {p.robo === 'incluso' ? 'Incluso' : comRobo ? `+R$ ${ROBO_COMPLEMENTO}/mês` : `Opcional: +R$ ${ROBO_COMPLEMENTO}/mês`}
                  </span>
                </p>
                <ul className="mt-3 space-y-2">
                  {entregasDoRobo(p).map(t => (
                    <li key={t} className={`flex items-start gap-2 text-[13px] leading-snug ${p.robo === 'incluso' || comRobo ? 'text-slate-700' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${p.robo === 'incluso' || comRobo ? 'text-blue-600' : 'text-slate-300'}`} /> {t}
                    </li>
                  ))}
                </ul>
                {p.robo === 'complemento' && !comRobo && (
                  <button type="button" onClick={() => setComRobo(true)} className="mt-3 text-xs font-bold text-blue-600 hover:underline">Ver preço com o robô de IA</button>
                )}
              </div>
              <button disabled={!COBRANCA_MENSAL_ATIVA}
                className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-colors disabled:cursor-not-allowed ${p.destaque ? 'bg-blue-600 text-white disabled:opacity-60' : 'bg-slate-900 text-white disabled:opacity-60'}`}>
                {COBRANCA_MENSAL_ATIVA ? `Assinar ${p.nome}${comRobo && p.robo === 'complemento' ? ' com robô' : ''}` : 'Assinatura mensal em breve'}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <h3 className="text-center text-xl font-black text-slate-800 mb-1">Por que o LeadSage</h3>
          <p className="text-center text-sm text-slate-500 mb-5">O que você leva em qualquer plano{modo === 'empresa' ? ', pensado para quem vende o próprio serviço' : ''}.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {diferenciais(modo).map(d => (
              <div key={d.titulo} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <p className="text-sm font-bold text-slate-800">{d.titulo}</p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{d.texto}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-8">
          Quer os dois modos (Agência e Empresa)? O segundo modo custa R$ {MODO_EXTRA}/mês a mais. Leads e conversas extras podem ser comprados avulsos quando a cota acaba.
        </p>
      </div>


    </div>
  );
};
