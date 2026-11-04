import React, { useState } from 'react';
import { api } from '../../services/api';
import { Check, Zap, Crown, Flame } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { modoDaConta } from '../../lib/modoDaConta';
import { COBRANCA_MENSAL_ATIVA, MODO_EXTRA, PLANOS_MENSAIS, ROBO_COMPLEMENTO, entregasDoPlano } from '../../data/planos';

export const SubscriptionScreen: React.FC = () => {
  const [comprando, setComprando] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const { user } = useApp() as any;
  const modo = modoDaConta(user);

  // Os botoes nao tinham onClick: a tela anunciava preco e nao vendia.
  const comprar = async (planoId: string) => {
    setComprando(planoId);
    setErro('');
    try {
      const { checkout_url } = await api.iniciarCompra(planoId);
      if (checkout_url) {
        window.location.href = checkout_url;
      } else {
        setErro('Pagamento ainda não está ativo. Nenhuma cobrança foi feita.');
      }
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível iniciar a compra.');
    } finally {
      setComprando(null);
    }
  };

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

      {erro && (
        <div className="mx-4 mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold text-center">
          {erro}
        </div>
      )}


      {/* Planos mensais: o que cada um entrega, no idioma do modo da conta */}
      <div className="px-4 mb-12">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-slate-800">Planos mensais</h2>
          <p className="text-sm text-slate-500 mt-1">Você está no modo <b>{modo === 'empresa' ? 'Empresa' : 'Agência'}</b>: a lista de entregas abaixo é a do seu modo.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PLANOS_MENSAIS.map(p => (
            <div key={p.id} className={`bg-white rounded-[2rem] p-7 flex flex-col relative border ${p.destaque ? 'border-2 border-blue-500 shadow-xl shadow-blue-500/10' : 'border-slate-100 shadow-sm'}`}>
              {p.destaque && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-full">Mais escolhido</span>}
              <h3 className={`font-black text-xl ${p.destaque ? 'text-blue-600' : 'text-slate-900'}`}>{p.nome}</h3>
              <p className="text-sm text-slate-500 mt-1 mb-5">{p.chamada}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-lg font-bold text-slate-500 mb-1.5">R$</span>
                <span className="text-6xl leading-none font-black tracking-tighter text-slate-900">{p.preco}</span>
                <span className="text-sm font-bold text-slate-400 mb-1.5">/mês</span>
              </div>
              <p className="text-xs font-bold text-slate-400 mb-6">{p.leads.toLocaleString('pt-BR')} leads por mês{p.robo === 'complemento' ? ` · robô de atendimento +R$ ${ROBO_COMPLEMENTO}` : ' · robô incluso'}</p>
              <ul className="space-y-3 mb-7 flex-1">
                {entregasDoPlano(p, modo).map(t => (
                  <li key={t} className="flex items-start gap-3 text-[14px] font-medium text-slate-600">
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5 text-slate-500" /></span>
                    {t}
                  </li>
                ))}
              </ul>
              <button disabled={!COBRANCA_MENSAL_ATIVA}
                className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-colors disabled:cursor-not-allowed ${p.destaque ? 'bg-blue-600 text-white disabled:opacity-60' : 'bg-slate-900 text-white disabled:opacity-60'}`}>
                {COBRANCA_MENSAL_ATIVA ? `Assinar ${p.nome}` : 'Assinatura mensal em breve'}
              </button>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400 mt-5">
          Quer os dois modos (Agência e Empresa)? O segundo modo custa R$ {MODO_EXTRA}/mês a mais. Leads e conversas extras podem ser comprados avulsos quando a cota acaba.
        </p>
      </div>

      <details className="px-4 mb-6">
        <summary className="cursor-pointer text-sm font-bold text-slate-500 text-center mb-6 select-none">Planos vitalícios (vendas encerrando)</summary>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        
        {/* START */}
        <div className="bg-white rounded-[2rem] p-8 flex flex-col shadow-sm border border-slate-100 relative pt-12">
          <div className="absolute top-8 right-8 w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">PLANO</span>
          <h3 className="font-black text-slate-900 text-xl leading-tight pr-14 mb-8">START VITALÍCIO</h3>
          
          <div className="flex items-start gap-1 mb-10">
            <span className="text-xl font-bold text-slate-500 mt-2">R$</span>
            <span className="text-[5rem] leading-none font-black text-slate-900 tracking-tighter">67</span>
          </div>

          <div className="w-full h-px bg-slate-100 mb-8"></div>

          <div className="space-y-5 mb-8 flex-1">
            <div className="flex items-center gap-4 text-[15px] font-medium text-slate-600">
              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-slate-400" />
              </div>
              Acesso vitalício ao LeadSage
            </div>
            <div className="flex items-center gap-4 text-[15px] font-medium text-slate-600">
              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-slate-400" />
              </div>
              150 leads incluídos
            </div>
            <div className="flex items-center gap-4 text-[15px] font-medium text-slate-600">
              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-slate-400" />
              </div>
              10 sites incluídos
            </div>
          </div>

          <button onClick={() => comprar('start')}
            disabled={comprando !== null}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-sm transition-colors mt-auto disabled:opacity-60">
            {comprando === 'start' ? 'Abrindo pagamento...' : 'Começar Agora'}
          </button>
        </div>

        {/* PRO */}
        <div className="bg-white rounded-[2rem] p-8 flex flex-col shadow-xl shadow-slate-200/50 border border-slate-100 relative pt-12 transform lg:-translate-y-4">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-bold px-4 py-1.5 rounded-full tracking-wide shadow-md">
            Recomendado
          </div>
          <div className="absolute top-8 right-8 w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
            <Crown className="w-6 h-6 text-white" />
          </div>
          
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">PLANO</span>
          <h3 className="font-black text-slate-900 text-xl leading-tight pr-14 mb-8">PRO VITALÍCIO</h3>
          
          <div className="flex items-start gap-1 mb-2">
            <span className="text-xl font-bold text-slate-500 mt-2">R$</span>
            <span className="text-[5rem] leading-none font-black text-slate-900 tracking-tighter">97</span>
          </div>
          <p className="text-sm font-bold text-slate-400 mb-8">5 vezes mais sites que o Start</p>

          <div className="w-full h-px bg-slate-100 mb-8"></div>

          <div className="space-y-5 mb-8 flex-1">
            <div className="flex items-center gap-4 text-[15px] font-medium text-slate-600">
              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-slate-400" />
              </div>
              Acesso vitalício ao LeadSage
            </div>
            <div className="flex items-center gap-4 text-[15px] font-medium text-slate-600">
              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-slate-400" />
              </div>
              500 leads incluídos
            </div>
            <div className="flex items-center gap-4 text-[15px] font-medium text-slate-600">
              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-slate-400" />
              </div>
              50 sites incluídos
            </div>
          </div>

          <button onClick={() => comprar('pro')}
            disabled={comprando !== null}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-sm transition-colors shadow-lg mt-auto disabled:opacity-60">
            {comprando === 'pro' ? 'Abrindo pagamento...' : 'Assinar Pro'}
          </button>
        </div>

        {/* AGÊNCIA */}
        <div className="bg-white rounded-[2rem] p-8 flex flex-col shadow-sm border-2 border-blue-500 relative pt-12">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[11px] font-bold px-4 py-1.5 rounded-full tracking-wide shadow-md">
            Maior capacidade
          </div>
          <div className="absolute top-8 right-8 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Flame className="w-6 h-6 text-white" />
          </div>

          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">PLANO</span>
          <h3 className="font-black text-blue-600 text-xl leading-tight pr-14 mb-8">AGÊNCIA VITALÍCIO</h3>
          
          <div className="flex items-start gap-1 mb-10">
            <span className="text-xl font-bold text-blue-500 mt-2">R$</span>
            <span className="text-[5rem] leading-none font-black text-blue-600 tracking-tighter">197</span>
          </div>

          <div className="w-full h-px bg-slate-100 mb-8"></div>

          <div className="space-y-5 mb-8 flex-1">
            <div className="flex items-center gap-4 text-[15px] font-bold text-slate-700">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
              Acesso vitalício ao LeadSage
            </div>
            <div className="flex items-center gap-4 text-[15px] font-bold text-slate-700">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
              3.000 leads incluídos
            </div>
            <div className="flex items-center gap-4 text-[15px] font-bold text-slate-700">
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
              200 sites incluídos
            </div>
          </div>

          <button onClick={() => comprar('agencia')}
            disabled={comprando !== null}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition-colors shadow-lg shadow-blue-500/20 mt-auto disabled:opacity-60">
            {comprando === 'agencia' ? 'Abrindo pagamento...' : 'Falar com Vendas'}
          </button>
        </div>

      </div>
      </details>

    </div>
  );
};
