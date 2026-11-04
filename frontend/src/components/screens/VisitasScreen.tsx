/**
 * Modo empresa: agenda de visitas e retornos de manutenção.
 * Uma visita feita vira, depois de N meses, um convite de retorno com a mensagem pronta: a pessoa manda com um clique pelo WhatsApp.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Check, Plus, RotateCcw, Send, Trash2, X } from 'lucide-react';
import { api } from '../../services/api';
import type { RetornoServico, VisitaServico } from '../../types';

const campo = 'w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500';
const rotulo = 'block text-xs font-bold text-slate-600 mb-1.5';
const VAZIA = { cliente: '', telefone: '', servico: '', aparelhos: '', endereco: '', data: '', hora: '', observacoes: '', retorno_meses: 6 };

const dataBr = (d: string) => (d ? d.split('-').reverse().join('/') : 'sem data');
const linkWhats = (tel: string, texto: string) => `https://wa.me/${tel.startsWith('55') ? tel : '55' + tel}?text=${encodeURIComponent(texto)}`;

export const VisitasScreen: React.FC = () => {
  const [visitas, setVisitas] = useState<VisitaServico[]>([]);
  const [retornos, setRetornos] = useState<RetornoServico[]>([]);
  const [novo, setNovo] = useState<typeof VAZIA | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try { const r = await api.visitas(); setVisitas(r.visitas || []); setRetornos(r.retornos || []); setErro(''); }
    catch { setErro('Não consegui carregar as visitas agora. Tente de novo em instantes.'); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);

  const salvar = async () => {
    if (!novo) return;
    try { await api.salvarVisita(novo as Partial<VisitaServico>); setNovo(null); await carregar(); }
    catch (e: any) { setErro(e?.message || 'Informe pelo menos o nome ou o telefone do cliente.'); }
  };
  const mudar = async (v: VisitaServico, status: VisitaServico['status']) => { await api.salvarVisita({ status }, v.id); await carregar(); };
  const apagar = async (v: VisitaServico) => { if (confirm(`Apagar a visita de ${v.cliente || v.telefone}?`)) { await api.apagarVisita(v.id); await carregar(); } };
  const avisar = async (r: RetornoServico) => { await api.retornoAvisado(r.id); await carregar(); };

  const agendadas = visitas.filter(v => v.status === 'agendada');
  const feitas = visitas.filter(v => v.status === 'realizada');

  return (
    <div className="flex-1 flex flex-col min-h-0 max-w-4xl mx-auto w-full pb-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <CalendarCheck className="w-7 h-7 text-blue-600" /> Visitas e retornos
          </h1>
          <p className="text-slate-500 text-sm mt-1">Agende as visitas e acompanhe os serviços feitos. Quando chega a hora da manutenção, o sistema avisa e deixa a mensagem pronta.</p>
        </div>
        <button onClick={() => setNovo({ ...VAZIA })} className="shrink-0 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Nova visita
        </button>
      </div>

      {erro && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{erro}</div>}

      {novo && (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className={rotulo}>Cliente</label><input className={campo} value={novo.cliente} onChange={e => setNovo({ ...novo, cliente: e.target.value })} /></div>
            <div><label className={rotulo}>WhatsApp (com DDD)</label><input className={campo} inputMode="tel" value={novo.telefone} onChange={e => setNovo({ ...novo, telefone: e.target.value })} placeholder="14 99999-0000" /></div>
            <div><label className={rotulo}>Dia</label><input className={campo} type="date" value={novo.data} onChange={e => setNovo({ ...novo, data: e.target.value })} /></div>
            <div><label className={rotulo}>Hora</label><input className={campo} type="time" value={novo.hora} onChange={e => setNovo({ ...novo, hora: e.target.value })} /></div>
            <div className="md:col-span-2"><label className={rotulo}>Serviço</label><input className={campo} value={novo.servico} onChange={e => setNovo({ ...novo, servico: e.target.value })} placeholder="Ex.: Limpeza de 2 splits" /></div>
            <div><label className={rotulo}>Aparelhos</label><input className={campo} value={novo.aparelhos} onChange={e => setNovo({ ...novo, aparelhos: e.target.value })} placeholder="Ex.: 2 splits 12 mil BTU" /></div>
            <div><label className={rotulo}>Avisar o retorno em (meses)</label><input className={campo} inputMode="numeric" value={novo.retorno_meses} onChange={e => setNovo({ ...novo, retorno_meses: Number(e.target.value.replace(/\D/g, '')) || 0 })} /></div>
            <div className="md:col-span-2"><label className={rotulo}>Endereço</label><input className={campo} value={novo.endereco} onChange={e => setNovo({ ...novo, endereco: e.target.value })} /></div>
          </div>
          <div className="mt-4 flex gap-2 justify-end">
            <button onClick={() => setNovo(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600">Cancelar</button>
            <button onClick={salvar} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold">Salvar visita</button>
          </div>
        </div>
      )}

      {retornos.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2"><RotateCcw className="w-4 h-4 text-emerald-600" /> Retornos para oferecer ({retornos.length})</h2>
          <div className="space-y-2">
            {retornos.map(r => (
              <div key={r.id} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-slate-800">{r.cliente || r.telefone} <span className="font-normal text-slate-500">· {r.servico || 'serviço'} em {dataBr(r.realizada_em)} · retorno em {dataBr(r.retorno_em)}</span></p>
                <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{r.mensagem}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.telefone && (
                    <a href={linkWhats(r.telefone, r.mensagem)} target="_blank" rel="noopener noreferrer" onClick={() => void avisar(r)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-emerald-700"><Send className="w-4 h-4" /> Enviar pelo WhatsApp</a>
                  )}
                  <button onClick={() => avisar(r)} className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600">Dispensar</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="text-sm font-bold text-slate-700 mb-2">Visitas agendadas ({agendadas.length})</h2>
        {carregando ? <p className="text-sm text-slate-400">Carregando…</p> : agendadas.length === 0 ? (
          <p className="text-sm text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl p-5 text-center">Nenhuma visita marcada. Quando o robô avisar que um cliente quer agendar, cadastre aqui.</p>
        ) : agendadas.map(v => <LinhaDaVisita key={v.id} v={v} onFeita={() => mudar(v, 'realizada')} onCancelar={() => mudar(v, 'cancelada')} onApagar={() => apagar(v)} />)}
      </section>

      {feitas.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-700 mb-2">Serviços realizados ({feitas.length})</h2>
          {feitas.map(v => <LinhaDaVisita key={v.id} v={v} onApagar={() => apagar(v)} />)}
        </section>
      )}
    </div>
  );
};

const LinhaDaVisita: React.FC<{ v: VisitaServico; onFeita?: () => void; onCancelar?: () => void; onApagar: () => void }> = ({ v, onFeita, onCancelar, onApagar }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-2 flex flex-col sm:flex-row sm:items-center gap-3">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold text-slate-800 truncate">{v.cliente || v.telefone} <span className="font-normal text-slate-500">· {dataBr(v.data)}{v.hora ? ` às ${v.hora}` : ''}</span></p>
      <p className="text-xs text-slate-500 mt-0.5 break-words">{[v.servico, v.aparelhos, v.endereco].filter(Boolean).join(' · ') || 'sem detalhes'}</p>
      {v.status === 'realizada' && v.retorno_em && <p className="text-xs text-emerald-700 mt-1">Retorno previsto para {dataBr(v.retorno_em)}</p>}
    </div>
    <div className="flex gap-2 shrink-0">
      {onFeita && <button onClick={onFeita} className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5"><Check className="w-4 h-4" /> Feita</button>}
      {onCancelar && <button onClick={onCancelar} className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-1.5"><X className="w-4 h-4" /> Cancelar</button>}
      <button onClick={onApagar} aria-label="Apagar" className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
    </div>
  </div>
);
