import React from 'react';
import { History, Eye, Trash2, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HistoryScreen: React.FC = () => {
  const { history, setViewState, performLeadSearch } = useApp() as any;

  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Histórico de Buscas</h1>
          <p className="text-slate-500 text-sm mt-1">Visualize e gerencie suas prospecções anteriores.</p>
        </div>
        <button 
          onClick={() => setViewState('hero')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors w-fit"
        >
          <Search className="w-4 h-4" />
          Nova Busca
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
            <Search className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Total de Buscas</p>
            <p className="text-2xl font-black text-slate-800">{history.length}</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
            <History className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Total de Leads</p>
            <p className="text-2xl font-black text-slate-800">
              {history.reduce((acc: number, curr: any) => acc + curr.resultsFound, 0)}
            </p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
            <History className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Média por Busca</p>
            <p className="text-2xl font-black text-slate-800">
              {history.length > 0 ? Math.round(history.reduce((acc: number, curr: any) => acc + curr.resultsFound, 0) / history.length) : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-auto custom-scrollbar relative shadow-sm">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <History className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-1">Nenhuma busca realizada</h3>
            <p className="text-slate-500 text-sm">Suas buscas salvas aparecerão aqui.</p>
          </div>
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
                  <td className="py-4 px-6 text-sm font-semibold text-slate-700">{item.resultsFound} de até 20</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => performLeadSearch(item.niche, item.location, 20)}
                        className="px-3 py-1.5 text-blue-600 font-bold text-xs bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver leads
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir busca">
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
