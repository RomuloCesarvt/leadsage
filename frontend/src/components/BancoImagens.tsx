/**
 * Banco de imagens dentro do construtor.
 *
 * As fotos vêm de bancos gratuitos com licença para uso comercial (Pexels,
 * ou StockSnap quando não há chave do Pexels). A busca começa pelo ramo do
 * negócio; dá para procurar outra coisa e escolher onde cada foto entra.
 */
import React, { useState } from 'react';
import { Search, Loader2, ImageIcon } from 'lucide-react';
import { api } from '../services/api';

export type DestinoFoto = 'capa' | 'fotoSobre' | 'galeria';
export type FotoBanco = { url: string; miniatura: string; autor: string; fonte: string };

export const BancoImagens: React.FC<{
  fotos: FotoBanco[];
  carregando: boolean;
  aoBuscar: (termo: string) => void;
  aoEscolher: (url: string, destino: DestinoFoto) => void;
}> = ({ fotos, carregando, aoBuscar, aoEscolher }) => {
  const [termo, setTermo] = useState('');
  const [destino, setDestino] = useState<DestinoFoto>('galeria');

  return (
    <div className="rounded-2xl border border-slate-200 p-3 bg-slate-50/60">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Banco de imagens</span>
        <select value={destino} onChange={e => setDestino(e.target.value as DestinoFoto)}
          className="text-[11px] font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600">
          <option value="capa">Clicar usa como capa</option>
          <option value="fotoSobre">Clicar usa no "Sobre"</option>
          <option value="galeria">Clicar põe na galeria</option>
        </select>
      </div>
      <form onSubmit={e => { e.preventDefault(); aoBuscar(termo.trim()); }} className="flex gap-2 mb-2">
        <input value={termo} onChange={e => setTermo(e.target.value)} placeholder="Buscar em inglês: bakery, gym, coffee…"
          className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500" />
        <button className="px-3 rounded-xl bg-slate-800 text-white" title="Buscar"><Search className="w-3.5 h-3.5" /></button>
      </form>
      {carregando ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : fotos.length ? (
        <div className="grid grid-cols-3 gap-1.5 max-h-64 overflow-y-auto custom-scrollbar pr-1">
          {fotos.map(f => (
            <button key={f.url} type="button" onClick={() => aoEscolher(f.url, destino)}
              title={f.autor ? `Foto: ${f.autor} (${f.fonte})` : f.fonte}
              className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-blue-500">
              <img src={f.miniatura || f.url} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 py-4 text-center">Nenhuma foto encontrada. Tente outro termo.</p>
      )}
      <p className="text-[10px] text-slate-400 mt-2">Fotos de bancos gratuitos, liberadas para uso comercial.</p>
    </div>
  );
};

export const buscarFotos = (nicho: string, termo = '') => api.imagens(nicho, termo);
