/**
 * Escolher um lead entre centenas: caixa de busca com poucos resultados por vez.
 * O <select> nativo com todos os leads (nomes longos) abria uma lista gigante e quebrada; aqui nada passa de 30 itens e o texto é cortado.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface OpcaoDeLead { id: string; name?: string; company?: string; city?: string; niche?: string }

const MAXIMO = 30;
const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const titulo = (l: OpcaoDeLead) => (l.company || l.name || 'Sem nome').trim();
const detalhe = (l: OpcaoDeLead) => [l.name && l.name !== l.company ? l.name : '', l.city, l.niche].filter(Boolean).join(' · ');

export const SeletorDeLead: React.FC<{ leads: OpcaoDeLead[]; valor: string; onChange: (id: string) => void; placeholder?: string }> = ({ leads, valor, onChange, placeholder = 'Selecione um lead...' }) => {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const raiz = useRef<HTMLDivElement>(null);
  const escolhido = leads.find(l => l.id === valor);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  const achados = useMemo(() => {
    const q = semAcento(busca.trim());
    const lista = q ? leads.filter(l => semAcento(`${titulo(l)} ${detalhe(l)}`).includes(q)) : leads;
    return { total: lista.length, itens: lista.slice(0, MAXIMO) };
  }, [leads, busca]);

  const escolher = (id: string) => { onChange(id); setAberto(false); setBusca(''); };

  return (
    <div ref={raiz} className="relative">
      <button type="button" onClick={() => setAberto(a => !a)} aria-haspopup="listbox" aria-expanded={aberto}
        className="w-full min-h-[46px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-left flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
        <span className={`flex-1 min-w-0 truncate ${escolhido ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
          {escolhido ? titulo(escolhido) : placeholder}
        </span>
        {escolhido && (
          <span role="button" aria-label="Limpar" tabIndex={0} onClick={e => { e.stopPropagation(); onChange(''); }}
            className="p-1 rounded text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></span>
        )}
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {aberto && (
        <div className="absolute z-40 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
            <input autoFocus value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome, empresa, cidade..."
              className="w-full pl-9 pr-3 py-2.5 bg-slate-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Buscar lead" />
          </div>
          <ul role="listbox" className="max-h-72 overflow-y-auto overscroll-contain py-1">
            {achados.itens.length === 0 && <li className="px-4 py-3 text-sm text-slate-500">Nenhum lead encontrado.</li>}
            {achados.itens.map(l => (
              <li key={l.id} role="option" aria-selected={l.id === valor}>
                <button type="button" onClick={() => escolher(l.id)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-blue-50 ${l.id === valor ? 'bg-blue-50' : ''}`}>
                  <span className="block text-sm font-semibold text-slate-800 truncate">{titulo(l)}</span>
                  {detalhe(l) && <span className="block text-xs text-slate-500 truncate">{detalhe(l)}</span>}
                </button>
              </li>
            ))}
          </ul>
          {achados.total > MAXIMO && (
            <p className="px-4 py-2 text-xs text-slate-500 border-t border-slate-100">Mostrando {MAXIMO} de {achados.total}. Digite para filtrar.</p>
          )}
        </div>
      )}
    </div>
  );
};

/** Versão que guarda a escolha sozinha: para quem só precisa saber QUANDO um lead foi escolhido (vazio = "do zero"). */
export const SeletorDeLeadSolto: React.FC<{ leads: OpcaoDeLead[]; onEscolher: (id: string) => void; placeholder?: string }> = ({ leads, onEscolher, placeholder }) => {
  const [valor, setValor] = useState('');
  return <SeletorDeLead leads={leads} valor={valor} placeholder={placeholder} onChange={id => { setValor(id); onEscolher(id); }} />;
};
