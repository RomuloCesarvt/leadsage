import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { modoDaConta } from '../../lib/modoDaConta';
import { MODO_EXTRA, diferenciais, idNoServidor, PLANOS_MENSAIS, ROBO_COMPLEMENTO, entregasDoPlano, entregasDoRobo, precoComRobo } from '../../data/planos';

export const SubscriptionScreen: React.FC = () => {
  const { user, refreshUserData } = useApp() as any;
  const modo = modoDaConta(user);
  const [comRobo, setComRobo] = useState(false);
  const [pagamentoAtivo, setPagamentoAtivo] = useState(false);     // o servidor diz se a cobrança mensal está configurada de verdade
  const [abrindo, setAbrindo] = useState('');
  const [aviso, setAviso] = useState('');
  const voltouDoPagamento = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('assinatura');

  useEffect(() => { api.assinaturaConfig().then(c => setPagamentoAtivo(Boolean(c.ativo))); }, []);

  // voltou do Mercado Pago: a licença entra quando ele confirma (webhook). A tela confere o perfil algumas vezes até aparecer.
  useEffect(() => {
    if (!voltouDoPagamento) return;
    setAviso('Pagamento recebido pelo Mercado Pago. Estamos confirmando; sua licença é liberada em instantes.');
    let n = 0;
    const t = setInterval(async () => {
      n += 1;
      try { await refreshUserData?.(); } catch { /* tenta de novo */ }
      if (n >= 12) clearInterval(t);
    }, 5000);
    return () => clearInterval(t);
  }, [voltouDoPagamento]); // eslint-disable-line react-hooks/exhaustive-deps

  const assinar = async (id: string) => {
    setAbrindo(id); setAviso('');
    try {
      const { checkout_url } = await api.assinar(id);
      if (checkout_url) window.location.href = checkout_url;
      else setAviso('Não foi possível abrir o pagamento. Nenhuma cobrança foi feita.');
    } catch (e: any) { setAviso(e?.message || 'Não foi possível iniciar a assinatura.'); }
    finally { setAbrindo(''); }
  };

  const cancelar = async () => {
    if (!confirm('Cancelar a assinatura? Você continua com o plano até o fim do período já pago e não será cobrado de novo.')) return;
    try { await api.cancelarAssinatura(); await refreshUserData?.(); setAviso('Assinatura cancelada. Seu plano vale até o fim do período pago.'); }
    catch (e: any) { setAviso(e?.message || 'Não foi possível cancelar agora.'); }
  };

  const nomeDoPlano = PLANOS_MENSAIS.find(p => `m_${p.id}` === (user?.assinatura_plano || '').replace(/_robo$/, ''))?.nome;
  const dataBr = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');
  const statusTexto: Record<string, string> = { authorized: 'Ativa', paused: 'Pausada', cancelled: 'Cancelada (vale até o fim do período pago)' };

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
        {aviso && <div className="max-w-2xl mx-auto mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold text-center">{aviso}</div>}
        {user?.licenca_expirada && (
          <div className="max-w-2xl mx-auto mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold text-center">
            Sua assinatura venceu e sua conta voltou para a Prévia. Seus dados estão guardados: assine de novo para recuperar tudo.
          </div>
        )}
        {user?.assinatura_plano && !user?.licenca_expirada && (
          <div className="max-w-2xl mx-auto mb-8 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sua assinatura</p>
              <p className="text-lg font-black text-slate-800">{nomeDoPlano || user.assinatura_plano}{user.assinatura_plano.endsWith('_robo') ? ' + Robô de IA' : ''}</p>
              <p className="text-sm text-slate-500">{statusTexto[user.assinatura_status || ''] || '—'} · licença válida até <b>{dataBr(user.licenca_ate)}</b></p>
            </div>
            {user.assinatura_status === 'authorized' && (
              <button onClick={cancelar} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:text-red-600 hover:border-red-200">Cancelar assinatura</button>
            )}
          </div>
        )}
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
              <button disabled={!pagamentoAtivo || abrindo !== ''} onClick={() => void assinar(idNoServidor(p, comRobo))}
                className={`w-full py-3.5 rounded-2xl text-sm font-bold transition-colors disabled:cursor-not-allowed ${p.destaque ? 'bg-blue-600 text-white disabled:opacity-60' : 'bg-slate-900 text-white disabled:opacity-60'}`}>
                {!pagamentoAtivo ? 'Assinatura mensal em breve' : abrindo === idNoServidor(p, comRobo) ? 'Abrindo pagamento...' : `Assinar ${p.nome}${comRobo && p.robo === 'complemento' ? ' com robô' : ''}`}
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
