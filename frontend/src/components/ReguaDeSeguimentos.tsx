/**
 * A régua de seguimentos, à vista: quem já recebeu a abordagem, em que passo está e quando sai o próximo.
 * O robô faz tudo sozinho (1º seguimento e contato final); aqui a pessoa só acompanha. Quem responde ou pede para sair sai da régua.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Check, CircleDashed, Clock, MessageCircle, RefreshCw, X } from 'lucide-react';
import { api } from '../services/api';
import { sondar } from '../lib/sondagem';
import type { LeadNaRegua, PassoDaRegua, ReguaDeSeguimentos as Regua } from '../types';

const dia = (iso: string): string => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
};

/** "hoje", "amanhã" ou "em 3 dias", para a data do próximo passo. */
export const quandoSai = (iso: string, agora: Date = new Date()): string => {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const dias = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime()) / 86_400_000);
  if (dias <= 0) return 'sai hoje';
  return dias === 1 ? 'sai amanhã' : `sai em ${dias} dias`;
};

const SITUACAO: Record<LeadNaRegua['situacao'], { rotulo: string; cor: string }> = {
  na_regua: { rotulo: 'Na régua', cor: 'bg-blue-50 text-blue-700 border-blue-200' },
  concluida: { rotulo: 'Concluída', cor: 'bg-slate-100 text-slate-600 border-slate-200' },
  respondeu: { rotulo: 'Respondeu', cor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelada: { rotulo: 'Cancelada', cor: 'bg-amber-50 text-amber-700 border-amber-200' },
  optout: { rotulo: 'Pediu para sair', cor: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const Passo: React.FC<{ p: PassoDaRegua; ultimo: boolean }> = ({ p, ultimo }) => {
  const feito = p.estado === 'enviado';
  const cancelado = p.estado === 'cancelado' || p.estado === 'falhou';
  return (
    <li className="flex-1 min-w-0 flex items-start gap-2">
      <span className={`mt-0.5 w-5 h-5 shrink-0 rounded-full flex items-center justify-center ${feito ? 'bg-emerald-500 text-white' : cancelado ? 'bg-slate-200 text-slate-500' : 'bg-white border-2 border-blue-400 text-blue-500'}`}>
        {feito ? <Check className="w-3 h-3" /> : cancelado ? <X className="w-3 h-3" /> : p.estado === 'na_fila' ? <Clock className="w-3 h-3" /> : <CircleDashed className="w-3 h-3" />}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-bold text-slate-800 leading-tight">{p.rotulo}</span>
        <span className="block text-xs text-slate-500">
          {feito ? `enviado ${dia(p.quando)}` : cancelado ? (p.estado === 'falhou' ? 'não saiu' : 'cancelado') : p.estado === 'na_fila' ? 'na fila para sair' : `${dia(p.quando)} · ${quandoSai(p.quando)}`}
        </span>
      </span>
      {!ultimo && <span className="hidden sm:block flex-1 self-center h-px bg-slate-200 mx-1" aria-hidden="true" />}
    </li>
  );
};

export const ReguaDeSeguimentos: React.FC = () => {
  const [regua, setRegua] = useState<Regua | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'na_regua' | 'final' | 'respondeu'>('todos');

  const carregar = useCallback(async () => {
    try { setRegua(await api.reguaDeSeguimentos()); setErro(''); } catch (e: any) { setErro(e?.message || 'Não foi possível carregar a régua.'); } finally { setCarregando(false); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => sondar(() => { void carregar(); }, 60000), [carregar]);

  const todos = regua?.leads ?? [];
  const lista = todos.filter(l => filtro === 'todos' ? true : filtro === 'na_regua' ? l.situacao === 'na_regua'
    : filtro === 'respondeu' ? l.situacao === 'respondeu'
      : l.situacao === 'na_regua' && l.passos.some(p => p.n === 2 && ['agendado', 'na_fila'].includes(p.estado)) && l.passos.filter(p => p.n === 1).every(p => p.estado === 'enviado'));
  const r = regua?.resumo;
  const dias = regua?.dias_uteis ?? [2, 5];

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4" data-testid="regua-de-seguimentos">
      <div className="flex items-start gap-3">
        <CalendarClock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-slate-800">Régua de seguimentos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            O robô faz sozinho: abordagem, 1º seguimento {dias[0]} dias úteis depois e contato final {dias[1]} dias úteis depois. Quem responde ou pede para sair sai da régua.
          </p>
        </div>
        <button onClick={() => { setCarregando(true); void carregar(); }} title="Atualizar" aria-label="Atualizar a régua" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
          <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {erro && <p className="text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-xl p-3">{erro}</p>}

      {r && r.total > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filtrar a régua">
          {([
            ['todos', `Todos (${r.total})`], ['na_regua', `Na régua (${r.na_regua})`], ['final', `Contato final (${r.contato_final})`], ['respondeu', `Responderam (${r.responderam})`],
          ] as const).map(([id, rotulo]) => (
            <button key={id} role="tab" aria-selected={filtro === id} onClick={() => setFiltro(id)}
              className={`px-3.5 h-10 rounded-full text-sm font-bold border whitespace-nowrap ${filtro === id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
              {rotulo}
            </button>
          ))}
        </div>
      )}
      {r && r.saem_hoje > 0 && <p className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">{r.saem_hoje} seguimento(s) saem hoje, no ritmo seguro do WhatsApp.</p>}

      {!carregando && !erro && todos.length === 0 && (
        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
          Ainda não há leads na régua. Quando uma abordagem de WhatsApp for enviada, ela aparece aqui com os próximos passos.
        </p>
      )}

      <ul className="space-y-3">
        {lista.map(l => (
          <li key={`${l.lead_id}-${l.enviado_em}`} className="border border-slate-200 rounded-xl p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="font-bold text-slate-800 text-sm truncate max-w-full">{l.nome || l.telefone}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${SITUACAO[l.situacao].cor}`}>{SITUACAO[l.situacao].rotulo}</span>
              {l.etapa && <span className="text-[11px] text-slate-500">{l.etapa}</span>}
              {l.situacao === 'na_regua' && l.proxima && <span className="ml-auto text-xs font-semibold text-blue-700">{quandoSai(l.proxima)}</span>}
            </div>
            <ol className="flex flex-col sm:flex-row gap-3 sm:gap-1">
              {l.passos.map((p, i) => <Passo key={p.n} p={p} ultimo={i === l.passos.length - 1} />)}
            </ol>
            <p className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
              {l.situacao === 'respondeu' && <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />}
              {l.fase}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};
