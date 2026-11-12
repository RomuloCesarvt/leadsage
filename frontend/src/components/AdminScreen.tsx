/**
 * Área do administrador: vê o pipeline e as pesquisas de qualquer usuário e libera créditos infinitos.
 * Só aparece (e só responde) para os e-mails em ADMIN_EMAILS.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Infinity as InfinitoIcon, Loader2, Search, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import type { UsuarioAdmin } from '../types';

const data = (iso: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—');

/** "agora", "hoje às 23:45", "ontem às 18:10", "há 3 dias (09/11)": a data de acesso em linguagem de gente. */
const quando = (iso?: string, agora: Date = new Date()): { texto: string; tom: 'verde' | 'ambar' | 'cinza' } => {
  if (!iso) return { texto: 'nunca acessou', tom: 'cinza' };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { texto: '—', tom: 'cinza' };
  const min = Math.round((agora.getTime() - d.getTime()) / 60000);
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const diaDe = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dias = Math.round((diaDe(agora) - diaDe(d)) / 86400000);
  if (min < 1) return { texto: 'agora', tom: 'verde' };
  if (min < 60) return { texto: `há ${min} min`, tom: 'verde' };
  if (dias === 0) return { texto: `hoje às ${hora}`, tom: 'verde' };
  if (dias === 1) return { texto: `ontem às ${hora}`, tom: 'verde' };
  const curto = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return { texto: `há ${dias} dias (${curto})`, tom: dias < 7 ? 'ambar' : 'cinza' };
};
const PONTO = { verde: 'bg-emerald-500', ambar: 'bg-amber-500', cinza: 'bg-slate-300' };

export const AdminScreen: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null>(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<UsuarioAdmin | null>(null);
  const [aba, setAba] = useState<'pipeline' | 'pesquisas' | 'creditos'>('pipeline');
  const [creditos, setCreditos] = useState<Awaited<ReturnType<typeof api.adminCreditos>> | null>(null);
  const [itens, setItens] = useState<any[] | null>(null);
  const [pesquisas, setPesquisas] = useState<any[] | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.adminUsuarios().then(setUsuarios).catch(e => setErro(e?.message || 'Sem acesso.'));
  }, []);

  useEffect(() => {
    if (!aberto) return;
    setItens(null); setPesquisas(null); setCreditos(null); setAba('pipeline');
    api.adminPipeline(aberto.uid).then(r => setItens(r.itens)).catch(e => setErro(e?.message || ''));
    api.adminPesquisas(aberto.uid).then(setPesquisas).catch(() => setPesquisas([]));
    api.adminCreditos(aberto.uid).then(setCreditos).catch(() => setCreditos(null));
  }, [aberto?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (usuarios || []).filter(u => !q || `${u.email} ${u.nome}`.toLowerCase().includes(q));
  }, [usuarios, busca]);

  const alternar = async (u: UsuarioAdmin) => {
    setSalvando(true);
    try {
      const r = await api.adminIlimitado(u.uid, !u.ilimitado);
      const novo = { ...u, ilimitado: r.ilimitado };
      setUsuarios(prev => (prev || []).map(x => (x.uid === u.uid ? novo : x)));
      setAberto(novo);
    } catch (e: any) { setErro(e?.message || 'Não foi possível mudar.'); }
    finally { setSalvando(false); }
  };

  if (erro && !usuarios) return <div className="p-8 text-center text-red-600 text-sm">{erro}</div>;
  if (!usuarios) return <div className="p-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Carregando usuários…</div>;

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto md:p-2 space-y-4">
      <h1 className="text-2xl md:text-xl font-black text-slate-900 flex items-center gap-2"><ShieldCheck className="w-7 h-7 md:w-6 md:h-6 text-blue-600 shrink-0" /> Administração</h1>

      {!aberto ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-3 border-b border-slate-100 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por e-mail ou nome" aria-label="Buscar usuário"
              className="w-full min-h-12 md:min-h-0 pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base md:text-sm focus:outline-none focus:border-blue-500" />
          </div>
          {!filtrados.length && <p className="p-8 text-center text-sm text-slate-400">Nenhum usuário.</p>}
          {filtrados.map(u => {
            const q = quando(u.ultimo_acesso);
            return (
              <button key={u.uid} onClick={() => setAberto(u)} className="w-full min-w-0 text-left px-4 py-3.5 border-b border-slate-100 active:bg-slate-50 hover:bg-slate-50 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[15px] text-slate-900 leading-snug break-words">{u.nome || u.email}</p>
                  {u.nome && <p className="text-[13px] text-slate-500 break-all leading-snug">{u.email}</p>}
                  <p className="text-[13px] text-slate-600 mt-1 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${PONTO[q.tom]}`} />
                    Último acesso: <b className="font-semibold text-slate-800">{q.texto}</b>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {u.admin && <span className="text-xs font-bold uppercase bg-blue-50 text-blue-700 rounded-md px-2 py-0.5">admin</span>}
                  {u.ilimitado && <InfinitoIcon className="w-5 h-5 text-emerald-600" aria-label="Créditos infinitos" />}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setAberto(null)} className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-slate-600 active:bg-slate-100 hover:bg-slate-100" aria-label="Voltar"><ChevronLeft className="w-6 h-6" /></button>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-base text-slate-900 leading-snug break-words">{aberto.nome || aberto.email}</p>
              <p className="text-[13px] text-slate-500 break-all">{aberto.email}</p>
              <p className="text-[13px] text-slate-600 mt-0.5">Último acesso: <b className="text-slate-800">{quando(aberto.ultimo_acesso).texto}</b>{aberto.criado_em ? <span className="text-slate-400"> · criou a conta em {data(aberto.criado_em)}</span> : null}</p>
            </div>
            <button onClick={() => alternar(aberto)} disabled={salvando}
              className={`w-full md:w-auto min-h-12 md:min-h-0 justify-center px-4 md:px-3 py-2 rounded-xl text-[15px] md:text-xs font-bold flex items-center gap-2 md:gap-1.5 disabled:opacity-60 ${
                aberto.ilimitado ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              <InfinitoIcon className="w-4 h-4" /> {aberto.ilimitado ? 'Créditos infinitos: ligado' : 'Dar créditos infinitos'}
            </button>
          </div>
          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(['pipeline', 'pesquisas', 'creditos'] as const).map(a => (
              <button key={a} onClick={() => setAba(a)}
                className={`shrink-0 min-h-11 px-4 py-2 rounded-full text-sm font-bold border ${aba === a ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                {a === 'pipeline' ? `Pipeline${itens ? ` (${itens.length})` : ''}` : a === 'pesquisas' ? `Pesquisas${pesquisas ? ` (${pesquisas.length})` : ''}` : `Créditos${creditos ? ` (${creditos.ilimitado ? '∞' : creditos.creditos})` : ''}`}
              </button>
            ))}
          </div>

          {aba === 'pipeline' && (itens === null ? <p className="text-sm text-slate-400">Carregando…</p> : !itens.length ? <p className="text-sm text-slate-400">Pipeline vazio.</p> : (
            <div className="divide-y divide-slate-100">
              {itens.map(i => (
                <div key={i.id} className="py-2.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-slate-800 leading-snug break-words">{i.lead?.name || i.id}</p>
                    <p className="text-[13px] text-slate-500 break-words">{[i.lead?.niche, i.lead?.city || i.lead?.location, i.lead?.phone].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 rounded-full px-2.5 py-1 shrink-0">{i.etapa}</span>
                </div>
              ))}
            </div>
          ))}

          {aba === 'creditos' && (creditos === null ? <p className="text-sm text-slate-400">Carregando…</p> : (
            <div className="space-y-3">
              <p className="text-sm text-slate-700"><b>{creditos.ilimitado ? 'Créditos infinitos' : `${creditos.creditos} créditos`}</b>{creditos.plano ? ` · plano ${creditos.plano}` : ''}</p>
              <p className="text-xs text-slate-500">{creditos.como_funciona}</p>
              {!creditos.historico.length ? <p className="text-sm text-slate-400">Sem movimentações registradas.</p> : (
                <div className="divide-y divide-slate-100">
                  {creditos.historico.map((h, i) => (
                    <div key={i} className="py-2 flex items-center gap-3">
                      <div className="min-w-0 flex-1"><p className="text-sm text-slate-800 truncate">{h.description}</p><p className="text-xs text-slate-400">{data(h.timestamp)}</p></div>
                      <span className={`text-sm font-bold shrink-0 ${h.amount >= 0 ? 'text-emerald-600' : 'text-slate-500'}`}>{h.amount > 0 ? `+${h.amount}` : h.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {aba === 'pesquisas' && (pesquisas === null ? <p className="text-sm text-slate-400">Carregando…</p> : !pesquisas.length ? <p className="text-sm text-slate-400">Nenhuma pesquisa.</p> : (
            <div className="divide-y divide-slate-100">
              {pesquisas.map(p => (
                <div key={p.id} className="py-2.5">
                  <p className="text-sm font-semibold text-slate-800">{p.niche} · {p.location}</p>
                  <p className="text-xs text-slate-500">{p.total_leads} leads · {data(p.timestamp)}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
