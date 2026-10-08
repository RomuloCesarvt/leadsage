/**
 * Área do administrador: vê o pipeline e as pesquisas de qualquer usuário e libera créditos infinitos.
 * Só aparece (e só responde) para os e-mails em ADMIN_EMAILS.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Infinity as InfinitoIcon, Loader2, Search, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import type { UsuarioAdmin } from '../types';

const data = (iso: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—');

export const AdminScreen: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null>(null);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<UsuarioAdmin | null>(null);
  const [aba, setAba] = useState<'pipeline' | 'pesquisas'>('pipeline');
  const [itens, setItens] = useState<any[] | null>(null);
  const [pesquisas, setPesquisas] = useState<any[] | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.adminUsuarios().then(setUsuarios).catch(e => setErro(e?.message || 'Sem acesso.'));
  }, []);

  useEffect(() => {
    if (!aberto) return;
    setItens(null); setPesquisas(null); setAba('pipeline');
    api.adminPipeline(aberto.uid).then(r => setItens(r.itens)).catch(e => setErro(e?.message || ''));
    api.adminPesquisas(aberto.uid).then(setPesquisas).catch(() => setPesquisas([]));
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
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-xl font-black text-slate-800 flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-blue-600" /> Administração</h1>

      {!aberto ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-3 border-b border-slate-100 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-6 top-1/2 -translate-y-1/2" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por e-mail ou nome" aria-label="Buscar usuário"
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base md:text-sm focus:outline-none focus:border-blue-500" />
          </div>
          {!filtrados.length && <p className="p-8 text-center text-sm text-slate-400">Nenhum usuário.</p>}
          {filtrados.map(u => (
            <button key={u.uid} onClick={() => setAberto(u)} className="w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-slate-800 truncate">{u.nome || u.email}</p>
                <p className="text-xs text-slate-500 truncate">{u.email} · último acesso {data(u.ultimo_acesso)}</p>
              </div>
              {u.admin && <span className="text-[10px] font-bold uppercase bg-blue-50 text-blue-700 rounded px-1.5 py-0.5">admin</span>}
              {u.ilimitado && <InfinitoIcon className="w-4 h-4 text-emerald-600 shrink-0" aria-label="Créditos infinitos" />}
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setAberto(null)} className="p-2 -ml-2 rounded-full text-slate-600 hover:bg-slate-100" aria-label="Voltar"><ChevronLeft className="w-5 h-5" /></button>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-800 truncate">{aberto.nome || aberto.email}</p>
              <p className="text-xs text-slate-500 truncate">{aberto.email}</p>
            </div>
            <button onClick={() => alternar(aberto)} disabled={salvando}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 ${
                aberto.ilimitado ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              <InfinitoIcon className="w-4 h-4" /> {aberto.ilimitado ? 'Créditos infinitos: ligado' : 'Dar créditos infinitos'}
            </button>
          </div>
          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <div className="flex gap-2">
            {(['pipeline', 'pesquisas'] as const).map(a => (
              <button key={a} onClick={() => setAba(a)}
                className={`px-4 py-2 rounded-full text-sm font-bold border ${aba === a ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                {a === 'pipeline' ? `Pipeline${itens ? ` (${itens.length})` : ''}` : `Pesquisas${pesquisas ? ` (${pesquisas.length})` : ''}`}
              </button>
            ))}
          </div>

          {aba === 'pipeline' && (itens === null ? <p className="text-sm text-slate-400">Carregando…</p> : !itens.length ? <p className="text-sm text-slate-400">Pipeline vazio.</p> : (
            <div className="divide-y divide-slate-100">
              {itens.map(i => (
                <div key={i.id} className="py-2.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{i.lead?.name || i.id}</p>
                    <p className="text-xs text-slate-500 truncate">{[i.lead?.niche, i.lead?.city || i.lead?.location, i.lead?.phone].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className="text-[11px] font-bold bg-slate-100 text-slate-600 rounded-full px-2.5 py-1 shrink-0">{i.etapa}</span>
                </div>
              ))}
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
