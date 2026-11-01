import React, { useEffect, useState } from 'react';
import { Bell, ArrowRight, Sparkles, Eye, UserRound, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { marcarAvisosComoVistos, useAvisos } from '../../lib/avisos';
import type { Aviso } from '../../types';

const ICONE = { previa: Eye, humano: UserRound, resposta: MessageCircle } as const;
const COR = { previa: 'bg-violet-50 text-violet-600', humano: 'bg-rose-50 text-rose-600', resposta: 'bg-emerald-50 text-emerald-600' } as const;

function ha(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (!isFinite(s)) return '';
  if (s < 90) return 'agora';
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return `há ${Math.round(s / 86400)} d`;
}

export const NotificationsScreen: React.FC = () => {
  const { setViewState } = useApp() as any;
  const { avisos, visto, carregado } = useAvisos();
  const [vistoAoAbrir, setVistoAoAbrir] = useState<string | null>(null);
  const [permissao, setPermissao] = useState<string>(() => (typeof Notification === 'undefined' ? 'indisponivel' : Notification.permission));

  // o que era novo ao abrir fica destacado; só depois a lista é marcada como vista
  useEffect(() => {
    if (!carregado) return;
    setVistoAoAbrir((v) => (v === null ? visto : v));
    marcarAvisosComoVistos();
  }, [carregado]);

  const ir = (a: Aviso) => setViewState(a.tipo === 'previa' ? 'workspace' : 'conversas');

  return (
    <div className="flex-1 flex flex-col h-full relative max-w-4xl w-full">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Avisos e Novidades</h1>
        <p className="text-slate-500 text-sm mt-1">O que está acontecendo com seus leads agora e as novidades da plataforma.</p>
      </div>

      <section className="mb-8" aria-label="Avisos dos seus leads">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Seus leads</h2>
          {permissao === 'default' && (
            <button
              onClick={async () => setPermissao(await Notification.requestPermission())}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Avisar também no navegador
            </button>
          )}
        </div>
        {!carregado ? (
          <p className="text-sm text-slate-400">Carregando…</p>
        ) : avisos.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-6 text-sm text-slate-500">
            Nada novo por enquanto. Quando um lead abrir a prévia do site, responder ou pedir uma pessoa, aparece aqui e no sino.
          </div>
        ) : (
          <ul className="space-y-2">
            {avisos.map((a) => {
              const Icone = ICONE[a.tipo] || Bell;
              const novo = a.quando > (vistoAoAbrir ?? visto);
              return (
                <li key={a.id}>
                  <button
                    onClick={() => ir(a)}
                    data-testid="aviso"
                    className={`w-full text-left flex items-start gap-4 rounded-2xl border p-4 transition-colors hover:bg-slate-50 ${novo ? 'bg-white border-blue-200 shadow-sm' : 'bg-white border-slate-200'}`}
                  >
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${COR[a.tipo] || 'bg-slate-100 text-slate-500'}`}>
                      <Icone className="w-5 h-5" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 truncate">{a.titulo}</span>
                        {novo && <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-600 text-white rounded-full px-2 py-0.5">novo</span>}
                      </span>
                      <span className="block text-sm text-slate-500 mt-0.5">{a.texto}</span>
                    </span>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{ha(a.quando)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Novidades</h2>
      <div className="space-y-6">
        
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
              <button
                onClick={() => setViewState('calculator')}
                className="px-5 py-2.5 bg-white text-blue-600 font-bold rounded-xl shadow-sm hover:bg-blue-50 transition-colors"
              >
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
          <button
            onClick={() => setViewState('help')}
            className="px-5 py-2.5 w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors whitespace-nowrap"
          >
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
          <button
            onClick={() => setViewState('help')}
            className="px-5 py-2.5 w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors whitespace-nowrap"
          >
            Solicitar orçamento
          </button>
        </div>

      </div>

    </div>
  );
};
