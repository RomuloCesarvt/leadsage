import React, { useEffect, useState } from 'react';
import { History, Eye, Trash2, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import { useCelular } from '../../lib/useCelular';

export const HistoryScreen: React.FC = () => {
  const celular = useCelular();
  const { history, setHistory, setViewState, performLeadSearch, limparResultados } = useApp() as any;
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [limpando, setLimpando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // O histórico só era carregado depois de uma busca na sessão: ao reabrir o app
  // a tela vinha vazia, mesmo com buscas guardadas no servidor.
  useEffect(() => {
    let vivo = true;
    api.getSearchHistory().then(h => { if (vivo) setHistory(h); }).finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [setHistory]);

  const total = (h: any): number => Number(h?.total_leads ?? h?.resultsFound ?? 0) || 0;

  // Limpa o histórico inteiro. Os leads que você já adicionou a Meus Leads ficam;
  // só somem os resultados de busca que ninguém escolheu.
  const limparTudo = async () => {
    if (!window.confirm('Limpar todo o histórico de buscas? Os leads que você adicionou a Meus Leads continuam lá.')) return;
    setLimpando(true);
    try {
      await api.limparHistorico();
      setHistory([]);
      limparResultados();
    } catch (err: any) {
      alert(err?.message || 'Não foi possível limpar o histórico.');
    } finally {
      setLimpando(false);
    }
  };

  // O botão de excluir era decorativo: não tinha onClick nem rota.
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.deleteSearchHistory(id);
      setHistory((prev: any[]) => prev.filter(h => h.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Não foi possível excluir esta busca.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Histórico de Buscas</h1>
          <p className="text-slate-500 text-sm mt-1">Visualize e gerencie suas prospecções anteriores.</p>
        </div>
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={limparTudo}
              disabled={limpando}
              className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-600 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {limpando ? 'Limpando…' : 'Limpar histórico'}
            </button>
          )}
          <button 
            onClick={() => setViewState('hero')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors w-fit"
          >
            <Search className="w-4 h-4" />
            Nova Busca
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <div className="hidden md:flex w-12 h-12 rounded-full bg-slate-50 border border-slate-100 items-center justify-center">
            <Search className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-xs md:text-sm font-semibold text-slate-500 leading-tight">Buscas</p>
            <p className="text-2xl font-black text-slate-800">{history.length}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <div className="hidden md:flex w-12 h-12 rounded-full bg-slate-50 border border-slate-100 items-center justify-center">
            <History className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-xs md:text-sm font-semibold text-slate-500 leading-tight">Leads</p>
            <p className="text-2xl font-black text-slate-800">
              {history.reduce((acc: number, curr: any) => acc + total(curr), 0)}
            </p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-1 md:gap-4">
          <div className="hidden md:flex w-12 h-12 rounded-full bg-slate-50 border border-slate-100 items-center justify-center">
            <History className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-xs md:text-sm font-semibold text-slate-500 leading-tight">Média</p>
            <p className="text-2xl font-black text-slate-800">
              {history.length > 0 ? Math.round(history.reduce((acc: number, curr: any) => acc + total(curr), 0) / history.length) : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-auto custom-scrollbar relative shadow-sm">
        {carregando && history.length === 0 ? (
          <div className="h-full flex items-center justify-center p-12 text-sm text-slate-500">Carregando…</div>
        ) : history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <History className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-1">Nenhuma busca realizada</h3>
            <p className="text-slate-500 text-sm">Suas buscas salvas aparecerão aqui.</p>
          </div>
        ) : celular ? (
          <ul className="divide-y divide-slate-100" data-testid="historico-celular">
            {history.map((item: any) => (
              <li key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-bold text-slate-900 leading-snug break-words">{item.niche}</p>
                    <p className="text-sm text-slate-500 mt-0.5 break-words">{String(item.location || '').replace(/, Brazil$/i, '')}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-slate-700 bg-slate-100 rounded-lg px-2.5 py-1">{total(item)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{new Date(item.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} · {total(item)} encontrados</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => performLeadSearch(item.niche, item.location, 20)}
                    className="flex-1 min-h-12 rounded-xl bg-blue-600 text-white text-[15px] font-bold flex items-center justify-center gap-2 active:bg-blue-700">
                    <Eye className="w-5 h-5" /> Ver leads
                  </button>
                  <button type="button" aria-label="Excluir busca" onClick={() => handleDelete(item.id)} disabled={deletingId === item.id}
                    className="w-12 min-h-12 rounded-xl border border-slate-200 text-slate-400 flex items-center justify-center active:bg-rose-50 active:text-rose-600 disabled:opacity-40">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Nicho</th>
                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Localização</th>
                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Encontrados</th>
                <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item: any) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="py-4 px-6 text-sm font-semibold text-slate-800">
                    {new Date(item.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-4 px-6 text-sm text-slate-600 font-medium">{item.niche}</td>
                  <td className="py-4 px-6 text-sm text-slate-500">{item.location}</td>
                  <td className="py-4 px-6 text-sm font-semibold text-slate-700">{total(item)} encontrados</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => performLeadSearch(item.niche, item.location, 20)}
                        className="px-3 py-1.5 text-blue-600 font-bold text-xs bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver leads
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-40"
                        title="Excluir busca"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
};
