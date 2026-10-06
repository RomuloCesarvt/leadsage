/**
 * Seletor de nicho: fechado até clicar.
 *
 * - clicar (ou focar) no campo abre a lista; clicar fora ou Esc fecha;
 * - sem digitar, mostra as categorias (todas fechadas) e abre uma por vez;
 * - ao digitar, busca em todos os nichos, sem acento, por início de palavra;
 * - o que a pessoa digitar vale mesmo fora da lista: a busca é no Google
 *   Maps, então qualquer ramo funciona.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search, ChevronDown, ChevronRight, X, Check,
  HeartPulse, Sparkles, Dumbbell, Utensils, ShoppingBag, Building, Hammer, Wrench, Car, Scale, Landmark,
  Megaphone, Briefcase, Code, Shield, GraduationCap, Dog, PartyPopper, Plane, Truck, Factory, Tractor, Palette, Church,
  HelpCircle,
} from 'lucide-react';
import { CATEGORIAS, TODOS, buscarNichos } from '../lib/nichos';

// Mapa explicito (em vez de `import * as Icons`) para o tree-shaking funcionar.
const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  HeartPulse, Sparkles, Dumbbell, Utensils, ShoppingBag, Building, Hammer, Wrench, Car, Scale, Landmark,
  Megaphone, Briefcase, Code, Shield, GraduationCap, Dog, PartyPopper, Plane, Truck, Factory, Tractor, Palette, Church,
};

export const SeletorNicho: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const [aberto, setAberto] = useState(false);
  // so filtra depois que a pessoa digita: reabrir com um nicho ja escolhido
  // mostra as categorias, nao uma lista de um item so
  const [digitou, setDigitou] = useState(false);
  const [categoriaAberta, setCategoriaAberta] = useState<string | null>(null);
  const [ativo, setAtivo] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    // Esc fecha de qualquer ponto: depois de clicar numa categoria o foco
    // sai do campo e o onKeyDown dele deixa de ouvir
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  const consulta = digitou ? value.trim() : '';
  const resultados = useMemo(() => (consulta ? buscarNichos(consulta, 40) : []), [consulta]);
  const exato = TODOS.some(n => n.nome.toLowerCase() === consulta.toLowerCase());
  // "usar o que digitei" fica no fim quando ha resultados (o Enter pega o
  // primeiro resultado de verdade) e sozinho quando nao ha nenhum
  const opcoes = useMemo(() => {
    const livre = { nome: consulta, categoria: '', livre: true };
    if (!consulta || exato) return resultados as { nome: string; categoria: string; livre?: boolean }[];
    return [...resultados, livre] as { nome: string; categoria: string; livre?: boolean }[];
  }, [consulta, exato, resultados]);

  useEffect(() => { setAtivo(0); }, [consulta]);

  const escolher = (nome: string) => {
    onChange(nome);
    setAberto(false);
    setDigitou(false);
    campo.current?.blur();
  };

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setAberto(false); return; }
    if (!aberto && (e.key === 'ArrowDown' || e.key === 'Enter')) { setAberto(true); return; }
    if (!consulta || opcoes.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo(i => Math.min(i + 1, opcoes.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); escolher(opcoes[ativo].nome); }
  };

  return (
    <div ref={raiz} className="relative">
      <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        ref={campo}
        type="text"
        role="combobox"
        aria-expanded={aberto}
        aria-controls="lista-de-nichos"
        autoComplete="off"
        placeholder="Digite ou escolha na lista"
        value={value}
        onChange={e => { onChange(e.target.value); setDigitou(true); setAberto(true); }}
        onFocus={() => setAberto(true)}
        onClick={() => setAberto(true)}
        onKeyDown={teclas}
        className="w-full pl-11 pr-20 py-3.5 bg-white border border-blue-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {value && (
          <button type="button" aria-label="Limpar nicho"
            onClick={() => { onChange(''); setDigitou(false); campo.current?.focus(); }}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        )}
        <button type="button" aria-label={aberto ? 'Fechar lista' : 'Abrir lista'}
          onClick={() => (aberto ? setAberto(false) : (setAberto(true), campo.current?.focus()))}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <ChevronDown className={`w-5 h-5 transition-transform ${aberto ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {aberto && (
        <div id="lista-de-nichos" role="listbox"
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-[420px] overflow-y-auto">
          {consulta ? (
            <ul className="p-2">
              {opcoes.map((o, i) => (
                <li key={`${o.nome}-${i}`} role="option" aria-selected={i === ativo}>
                  <button type="button" onClick={() => escolher(o.nome)} onMouseEnter={() => setAtivo(i)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left text-sm ${
                      i === ativo ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <span className="font-semibold truncate">
                      {o.livre ? <>Buscar por “{o.nome}”</> : o.nome}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">{o.livre ? 'texto livre' : o.categoria}</span>
                  </button>
                </li>
              ))}
              {resultados.length === 0 && (
                <li className="px-3 py-2 text-xs text-slate-400">
                  Não está na lista, mas a busca no Google Maps funciona com qualquer ramo.
                </li>
              )}
            </ul>
          ) : (
            <div className="p-2">
              <p className="px-2 pt-1 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                {TODOS.length} nichos em {CATEGORIAS.length} categorias · ou digite o seu
              </p>
              {CATEGORIAS.map(cat => {
                const Icone = ICONES[cat.icone] || HelpCircle;
                const aberta = categoriaAberta === cat.categoria;
                return (
                  <div key={cat.categoria} className="rounded-xl overflow-hidden">
                    <button type="button" onClick={() => setCategoriaAberta(aberta ? null : cat.categoria)}
                      aria-expanded={aberta}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50 text-left">
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                          <Icone className="w-4 h-4 text-blue-600" />
                        </span>
                        <span className="font-bold text-slate-800 text-sm truncate">{cat.categoria}</span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-400">{cat.nichos.length}</span>
                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${aberta ? 'rotate-90' : ''}`} />
                      </span>
                    </button>
                    {aberta && (
                      <div className="px-3 pb-3 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-slate-50/50">
                        {cat.nichos.map(nome => {
                          const sel = value === nome;
                          return (
                            <button key={nome} type="button" onClick={() => escolher(nome)}
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                                sel ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'}`}>
                              <span className="font-semibold truncate">{nome}</span>
                              {sel && <Check className="w-4 h-4 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
