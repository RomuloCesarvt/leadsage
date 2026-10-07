import React from 'react';
import { ListChecks, Trash2, Users } from 'lucide-react';
import { LessieTableView } from './LessieTableView';
import { useApp } from '../context/AppContext';
import { ehSalvo } from '../lib/leadsSalvos';
import type { LeadItem } from '../types';

/**
 * O que a busca trouxe. Nada daqui vai para Meus Leads sozinho: a pessoa
 * marca os negócios que interessam (ou usa a estrela) e adiciona.
 */
export const ResultadosBusca: React.FC = () => {
  const { leads, isLoading, limparResultados, setViewState } = useApp() as any;
  const resultados = (leads as LeadItem[]).filter(l => !ehSalvo(l));
  const salvos = (leads as LeadItem[]).filter(ehSalvo).length;

  return (
    <div className="w-full flex-1 flex flex-col h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] min-h-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-blue-600" /> Resultados da busca
          </h1>
          <p className="text-sm text-slate-600 font-medium mt-1">
            {resultados.length > 0 ? (
              <>
                <span className="text-blue-700 font-bold">{resultados.length} negócios</span> para você escolher.
                Marque os que interessam e adicione a Meus Leads.
              </>
            ) : 'Marque os negócios que interessam e adicione a Meus Leads.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {resultados.length > 0 && (
            <button
              onClick={() => { if (window.confirm('Descartar todos os resultados que você não adicionou?')) limparResultados(); }}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600"
            ><Trash2 className="w-4 h-4" /> Limpar resultados</button>
          )}
          <button
            onClick={() => setViewState('workspace')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold text-white"
          ><Users className="w-4 h-4" /> Meus Leads ({salvos})</button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden w-full relative">
        {isLoading ? (
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 animate-pulse">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Buscando oportunidades no Google Maps...</h3>
            <p className="text-slate-500 text-center max-w-md">Estamos coletando os dados das empresas e analisando a presença digital de cada uma.</p>
          </div>
        ) : (
          <LessieTableView modo="resultados" />
        )}
      </div>
    </div>
  );
};
