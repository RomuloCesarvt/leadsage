import React, { useState } from 'react';
import { CalendarClock, X, Check } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import type { LeadItem } from '../types';

/** Texto curto para o card: "qua, 18/11 às 12:30" (horário de Brasília). */
export const quandoDaReuniao = (iso?: string): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d);
  const g = (t: string) => p.find(x => x.type === t)?.value || '';
  return `${g('weekday').replace('.', '')}, ${g('day')}/${g('month')} às ${g('hour')}:${g('minute')}`;
};

/** O valor inicial do campo (AAAA-MM-DDTHH:MM) em horário de Brasília. */
const paraCampo = (iso?: string): string => {
  const d = iso ? new Date(iso) : new Date(Date.now() + 24 * 3600_000);
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d);
  return p.replace(' ', 'T');
};

/** Folha para marcar (ou desmarcar) a reunião de um lead: o card vai para "Reunião" e o sistema avisa 1 hora e 10 minutos antes. */
export const MarcarReuniao: React.FC<{ lead: LeadItem; aoFechar: () => void }> = ({ lead, aoFechar }) => {
  const { atualizarPipeline } = useApp() as any;
  const [quando, setQuando] = useState(paraCampo(lead.reuniao_em));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async (valor: string | null) => {
    setSalvando(true); setErro('');
    try {
      await api.pipelineReuniao(lead.id, valor ? `${valor}:00-03:00` : null);
      await atualizarPipeline?.();
      aoFechar();
    } catch (e: any) { setErro(e?.message || 'Não foi possível salvar.'); }
    finally { setSalvando(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-end md:items-center md:justify-center" role="dialog" aria-modal="true" aria-label="Marcar reunião" onClick={aoFechar}>
      <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-2xl p-5" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><CalendarClock className="w-5 h-5" /></span>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-slate-900 leading-tight">Marcar reunião</h2>
            <p className="text-sm text-slate-500 truncate">{lead.company || lead.name}</p>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="w-11 h-11 -mr-2 flex items-center justify-center text-slate-500"><X className="w-5 h-5" /></button>
        </div>
        <label className="block text-[13px] font-bold text-slate-700 mb-1.5" htmlFor="reuniao-quando">Dia e hora (horário de Brasília)</label>
        <input id="reuniao-quando" type="datetime-local" value={quando} onChange={e => setQuando(e.target.value)}
          className="w-full min-h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-base text-slate-800 focus:outline-none focus:border-blue-500" />
        <p className="text-xs text-slate-500 mt-2 leading-snug">O lead vai para <b>Reunião</b> (agendado) e você recebe um aviso <b>1 hora antes</b> e outro <b>10 minutos antes</b>, em Avisos e no sino.</p>
        {erro && <p className="text-sm font-semibold text-red-600 mt-2">{erro}</p>}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button type="button" disabled={salvando || !lead.reuniao_em} onClick={() => salvar(null)} className="min-h-12 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold disabled:opacity-40">Desmarcar</button>
          <button type="button" disabled={salvando || !quando} onClick={() => salvar(quando)} className="min-h-12 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"><Check className="w-4 h-4" /> Salvar</button>
        </div>
      </div>
    </div>
  );
};
