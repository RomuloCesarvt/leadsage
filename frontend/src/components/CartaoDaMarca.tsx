import React, { useState } from 'react';
import { Palette, X, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MarcaDoDocumento } from './MarcaDoDocumento';

/** Resumo da marca no topo de Propostas e Contratos; abre a edição completa numa folha. */
export const CartaoDaMarca: React.FC = () => {
  const { user } = useApp() as any;
  const [aberto, setAberto] = useState(false);
  const logo = user?.brand_logo;
  const nome = user?.company_name || user?.name || 'Sua empresa';
  const p = user?.brand_primary || '#2563eb';
  const d = user?.brand_accent || '#f59e0b';
  const configurada = !!(logo || user?.brand_primary);
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} data-testid="cartao-da-marca"
        className="w-full min-h-16 mb-4 px-4 py-3 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3 text-left active:bg-slate-50">
        <span className="w-11 h-11 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
          {logo ? <img src={logo} alt="" className="w-full h-full object-contain p-1" /> : <Palette className="w-5 h-5 text-slate-400" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-900 leading-tight">Sua marca nos documentos</span>
          <span className="block text-xs text-slate-500 leading-snug line-clamp-2">{configurada ? `${nome} · logo e cores aparecem no PDF` : 'Coloque sua logo e suas cores para o PDF sair com a sua cara'}</span>
        </span>
        <span className="hidden min-[400px]:flex shrink-0 rounded-md overflow-hidden border border-slate-200 h-6 w-10"><i className="flex-1" style={{ background: p }} /><i className="w-1/3" style={{ background: d }} /></span>
        <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
      </button>
      {aberto && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex md:items-center md:justify-center" role="dialog" aria-modal="true" aria-label="Sua marca nos documentos">
          <div className="bg-white w-full h-full md:h-auto md:max-h-[92vh] md:max-w-5xl md:rounded-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
              <h2 className="flex-1 text-base font-bold text-slate-900">Sua marca nos documentos</h2>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="w-11 h-11 -mr-2 flex items-center justify-center text-slate-500"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pb-10"><MarcaDoDocumento /></div>
          </div>
        </div>
      )}
    </>
  );
};
