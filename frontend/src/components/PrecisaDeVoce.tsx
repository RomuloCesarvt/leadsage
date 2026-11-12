import React from 'react';
import { ArrowRight, MessageCircle, Phone, Users } from 'lucide-react';
import { COR_DA_TAG } from './AnaliseDoPipeline';
import { acoesDoCard } from '../lib/cardPipeline';
import { pedirFiltroDoPipeline } from '../lib/atalhosDoPainel';
import type { LeadItem } from '../types';

/** O que pede ação agora, da mais urgente para a menos. */
const PRIORIDADE = ['precisa_voce', 'preco', 'quente', 'reuniao', 'esfriando'] as const;
const ORIENTACAO: Record<string, string> = {
  precisa_voce: 'O robô passou a conversa para você',
  preco: 'Perguntou o valor: apresente a condição',
  quente: 'Interessado: responda rápido',
  reuniao: 'Visita ou reunião marcada: confirme',
  esfriando: '3 dias ou mais sem responder: faça um seguimento',
};

/** Painel de ações: os leads que precisam de você agora, com o que fazer (WhatsApp, ver a conversa, abrir no pipeline). */
export const PrecisaDeVoce: React.FC<{ leads: LeadItem[]; ir: (tela: string) => void; abrirLead: (l: LeadItem) => void }> = ({ leads, ir, abrirLead }) => {
  const itens = leads
    .filter(l => l.qualificacao && (PRIORIDADE as readonly string[]).includes(l.qualificacao.id))
    .sort((a, b) => PRIORIDADE.indexOf(a.qualificacao!.id as any) - PRIORIDADE.indexOf(b.qualificacao!.id as any));
  if (!itens.length) return null;
  const abrirPipeline = (tag: string) => { pedirFiltroDoPipeline(tag); ir('pipeline'); };
  return (
    <section className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 mb-5 sm:mb-6" data-testid="precisa-de-voce">
      <div className="flex items-center justify-between gap-3 mb-1 sm:mb-4">
        <h3 className="font-bold text-slate-800 text-base sm:text-lg leading-tight">Precisa de você agora <span className="text-slate-400 font-medium">({itens.length})</span></h3>
        <button type="button" onClick={() => abrirPipeline('')} className="shrink-0 min-h-11 text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 whitespace-nowrap">Pipeline <ArrowRight className="w-4 h-4" /></button>
      </div>
      <ul className="divide-y divide-slate-100">
        {itens.slice(0, 8).map(l => {
          const q = l.qualificacao!;
          const acoes = acoesDoCard(l);
          const zap = acoes.find(a => a.id === 'whatsapp');
          const ligar = acoes.find(a => a.id === 'ligar');
          const sec = 'min-h-11 px-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 active:bg-slate-100 sm:hover:bg-slate-50 flex items-center justify-center gap-2';
          return (
            <li key={l.id} className="py-4 sm:flex sm:items-center sm:gap-4">
              <div className="sm:flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => abrirLead(l)} className="min-w-0 text-left group">
                    <p className="text-[15px] font-bold text-slate-800 leading-snug break-words group-hover:text-blue-700">{l.company || l.name}</p>
                  </button>
                  <span title={q.dica} className={`shrink-0 text-[11px] font-extrabold px-2.5 py-1 rounded-lg border ${COR_DA_TAG[q.tom] || COR_DA_TAG.neutro}`}>{q.rotulo}</span>
                </div>
                <p className="text-[13px] text-slate-500 leading-snug mt-1">{ORIENTACAO[q.id]}{l.niche ? ` · ${l.niche}` : ''}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 sm:mt-0 sm:flex sm:shrink-0">
                {zap && (
                  <a href={zap.href} target="_blank" rel="noreferrer" className="col-span-2 min-h-12 sm:min-h-11 px-4 rounded-xl bg-emerald-600 text-white text-[15px] sm:text-sm font-bold active:bg-emerald-700 sm:hover:bg-emerald-700 flex items-center justify-center gap-2">
                    <MessageCircle className="w-4 h-4" />Chamar no WhatsApp
                  </a>
                )}
                {ligar && <a href={ligar.href} className={sec}><Phone className="w-4 h-4 text-slate-500" />Ligar</a>}
                <button type="button" onClick={() => ir('conversas')} className={`${sec} ${ligar ? '' : 'col-span-2'}`}>Ver conversa</button>
                <button type="button" onClick={() => abrirPipeline(q.id)} className="col-span-2 sm:col-span-1 min-h-10 sm:min-h-11 sm:px-3 sm:rounded-xl sm:border sm:border-slate-200 text-[13px] sm:text-sm font-semibold text-slate-500 sm:text-slate-600 active:text-slate-800 flex items-center justify-center gap-2"><Users className="w-4 h-4 text-slate-400" />Ver todos assim</button>
              </div>
            </li>
          );
        })}
      </ul>
      {itens.length > 8 && <p className="text-xs text-slate-400 mt-3">Mostrando os 8 mais urgentes. O restante está no pipeline.</p>}
    </section>
  );
};
