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
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6" data-testid="precisa-de-voce">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-bold text-slate-800 text-lg">Precisa de você agora <span className="text-slate-400 font-medium text-base">({itens.length})</span></h3>
        <button type="button" onClick={() => abrirPipeline('')} className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">Abrir pipeline <ArrowRight className="w-4 h-4" /></button>
      </div>
      <ul className="divide-y divide-slate-100">
        {itens.slice(0, 8).map(l => {
          const q = l.qualificacao!;
          const acoes = acoesDoCard(l);
          return (
            <li key={l.id} className="py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <button type="button" onClick={() => abrirLead(l)} className="min-w-0 flex-1 text-left group">
                <p className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-700">{l.company || l.name}</p>
                <p className="text-[12px] text-slate-500 truncate">{ORIENTACAO[q.id]}{l.niche ? ` · ${l.niche}` : ''}</p>
              </button>
              <span title={q.dica} className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border ${COR_DA_TAG[q.tom] || COR_DA_TAG.neutro}`}>{q.rotulo}</span>
              <div className="flex items-center gap-1.5">
                {acoes.map(a => (
                  <a key={a.id} href={a.href} target={a.id === 'whatsapp' ? '_blank' : undefined} rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5">
                    {a.id === 'whatsapp' ? <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Phone className="w-3.5 h-3.5 text-slate-500" />}{a.rotulo}
                  </a>
                ))}
                <button type="button" onClick={() => ir('conversas')} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50">Ver conversa</button>
                <button type="button" onClick={() => abrirPipeline(q.id)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-500" />Ver todos assim</button>
              </div>
            </li>
          );
        })}
      </ul>
      {itens.length > 8 && <p className="text-xs text-slate-400 mt-3">Mostrando os 8 mais urgentes. O restante está no pipeline.</p>}
    </section>
  );
};
