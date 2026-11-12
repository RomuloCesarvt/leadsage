import React from 'react';
import { Bot, ChevronDown, MessageCircle, Phone, RefreshCw, Trash2 } from 'lucide-react';
import { AnaliseDoPipeline, COR_DA_TAG, FaixaDeTags } from './AnaliseDoPipeline';
import { acoesDoCard, haQuanto } from '../lib/cardPipeline';
import type { LeadItem } from '../types';

export interface EtapaDoQuadro { key: string; color: string }

interface Props {
  leads: LeadItem[];
  etapas: EtapaDoQuadro[];
  etapaDe: (l: LeadItem) => string;
  filtroTag: string;
  aoFiltrar: (id: string) => void;
  mover: (id: string, etapa: string) => void;
  abrir: (l: LeadItem) => void;
  excluir: (l: LeadItem) => void;
  atualizar: () => Promise<void>;
  empresa: boolean;
}

const POR_PAGINA = 15;
// a etapa que abre primeiro: onde há gente esperando por você
const PRIORIDADE = ['Respondeu', 'Qualificado', 'Reunião', 'Proposta', 'Contato Enviado', 'Novo Lead'];

/**
 * O pipeline feito para o celular: um CRM em lista, uma etapa por vez, e não o quadro de colunas do computador.
 * Abas de etapa em cima (com a contagem), um cartão por lead com o que importa e três ações grandes (WhatsApp, Ligar, Mover).
 */
export const PipelineCelular: React.FC<Props> = ({ leads, etapas, etapaDe, filtroTag, aoFiltrar, mover, abrir, excluir, atualizar, empresa }) => {
  const daEtapa = (k: string) => leads.filter(l => etapaDe(l) === k && (!filtroTag || l.qualificacao?.id === filtroTag));
  const [etapa, setEtapa] = React.useState(() => PRIORIDADE.find(k => leads.some(l => etapaDe(l) === k)) || 'Novo Lead');
  const [quantos, setQuantos] = React.useState(POR_PAGINA);
  const [atualizando, setAtualizando] = React.useState(false);
  React.useEffect(() => { setQuantos(POR_PAGINA); }, [etapa, filtroTag]);
  const lista = daEtapa(etapa);
  const cor = etapas.find(e => e.key === etapa)?.color || 'bg-blue-600';

  return (
    <div className="pb-2" data-testid="pipeline-celular">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pipeline</h1>
          <p className="text-sm text-slate-500">{leads.length} leads · toque no cartão para ver o lead</p>
        </div>
        <button type="button" aria-label="Atualizar o pipeline" onClick={async () => { setAtualizando(true); await atualizar(); setAtualizando(false); }}
          className="w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-600 active:bg-slate-100 flex items-center justify-center shrink-0">
          <RefreshCw className={`w-5 h-5 ${atualizando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <AnaliseDoPipeline iniciarFechado />
      <FaixaDeTags leads={leads} filtro={filtroTag} aoFiltrar={aoFiltrar} />

      <div className="sticky top-[3.75rem] z-10 -mx-4 py-2 bg-slate-50/95 backdrop-blur border-b border-slate-200">
        <div className="flex gap-2 overflow-x-auto snap-x scroll-px-4 -mx-4 px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Etapas do pipeline">
          {etapas.map(e => {
            const n = daEtapa(e.key).length;
            const ativo = e.key === etapa;
            return (
              <button key={e.key} type="button" role="tab" aria-selected={ativo} onClick={() => setEtapa(e.key)}
                ref={el => { if (ativo && el) el.scrollIntoView({ inline: 'center', block: 'nearest' }); }}
                className={`snap-start shrink-0 min-h-11 px-4 rounded-full text-sm font-bold flex items-center gap-2 border transition-colors ${ativo ? `${e.color} text-white border-transparent` : 'bg-white text-slate-700 border-slate-200 active:bg-slate-100'}`}>
                {e.key}
                <span className={`min-w-6 h-6 px-1.5 rounded-full text-xs flex items-center justify-center ${ativo ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'}`}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {lista.length === 0 && (
          <li className="text-center py-14 text-slate-400 text-[15px] font-medium">Nenhum lead em “{etapa}”{filtroTag ? ' com essa tag' : ''}.</li>
        )}
        {lista.slice(0, quantos).map(l => {
          const q = l.qualificacao;
          const acoes = acoesDoCard(l);
          const zap = acoes.find(a => a.id === 'whatsapp');
          const ligar = acoes.find(a => a.id === 'ligar');
          const cidade = (l.city || l.location?.split(',')[0] || '').trim();
          const score = l.opportunityScore || 0;
          return (
            <li key={l.id}>
              <article onClick={() => abrir(l)} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 active:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900 leading-snug break-words">{l.company || l.name}</h3>
                    <p className="text-sm text-slate-500 mt-0.5 break-words">{[l.niche, cidade].filter(Boolean).join(' · ')}</p>
                  </div>
                  {!empresa && score >= 40 && <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-lg border ${score >= 70 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>{score}</span>}
                </div>

                {q && (
                  <div className="mt-3">
                    <span className={`inline-block text-[13px] font-bold px-3 py-1 rounded-lg border ${COR_DA_TAG[q.tom] || COR_DA_TAG.neutro}`}>{q.rotulo}</span>
                  </div>
                )}

                {l.pipeline_motivo && (
                  <p className="mt-2.5 text-[13px] leading-snug text-slate-600 flex items-start gap-2">
                    {l.pipeline_por === 'robô' && <Bot className="w-4 h-4 text-blue-600 shrink-0 mt-px" />}
                    <span>{l.pipeline_motivo}{l.pipeline_em ? ` · ${haQuanto(l.pipeline_em)}` : ''}</span>
                  </p>
                )}

                <div className="mt-4 space-y-2" onClick={e => e.stopPropagation()}>
                  {zap && (
                    <a href={zap.href} target="_blank" rel="noreferrer" className="w-full min-h-12 px-4 rounded-xl bg-emerald-600 text-white text-base font-bold flex items-center justify-center gap-2.5 active:bg-emerald-700">
                      <MessageCircle className="w-5 h-5 shrink-0" />Chamar no WhatsApp
                    </a>
                  )}
                  <div className="flex items-stretch gap-2">
                    {ligar && (
                      <a href={ligar.href} className="flex-1 min-h-12 px-3 rounded-xl border border-slate-300 bg-white text-slate-700 text-[15px] font-bold flex items-center justify-center gap-2 active:bg-slate-100">
                        <Phone className="w-5 h-5 shrink-0" />Ligar
                      </a>
                    )}
                    <label className="relative flex-1 min-h-12 px-3 rounded-xl border border-slate-300 bg-white text-slate-700 text-[15px] font-bold flex items-center justify-center gap-1.5 active:bg-slate-100">
                      Mover<ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      <select value={etapaDe(l)} aria-label={`Mover ${l.company || l.name} para outra etapa`} onChange={e => mover(l.id, e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 text-base">
                        {etapas.map(e => <option key={e.key} value={e.key}>{e.key}</option>)}
                      </select>
                    </label>
                    <button type="button" aria-label={`Excluir ${l.company || l.name}`} onClick={() => excluir(l)}
                      className="w-12 min-h-12 shrink-0 rounded-xl border border-slate-200 bg-white text-slate-400 flex items-center justify-center active:bg-rose-50 active:text-rose-600">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {lista.length > quantos && (
        <button type="button" onClick={() => setQuantos(q => q + POR_PAGINA)}
          className="mt-4 w-full min-h-12 rounded-xl border border-slate-300 bg-white text-[15px] font-bold text-slate-700 active:bg-slate-100">
          Ver mais ({lista.length - quantos})
        </button>
      )}
      <div className={`h-1 mt-6 rounded-full ${cor} opacity-0`} />
    </div>
  );
};
