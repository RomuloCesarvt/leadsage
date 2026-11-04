import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BookOpen, ChevronDown, Lightbulb, Search, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CATEGORIAS, buscarTutoriais, totalDeTutoriais, type Tutorial } from '../../data/tutoriais';

/** Os tutoriais do LeadSage: passo a passo de cada tela, com busca e um botão que leva até a tela. */
export const TutorialsScreen: React.FC = () => {
  const { setViewState } = useApp() as any;
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<string>(CATEGORIAS[0].tutoriais[0].id);
  const categorias = useMemo(() => buscarTutoriais(busca), [busca]);
  const procurando = busca.trim().length > 0;
  const achados = categorias.reduce((n, c) => n + c.tutoriais.length, 0);

  const Cartao: React.FC<{ t: Tutorial }> = ({ t }) => {
    const expandido = procurando ? true : aberto === t.id;
    return (
      <div className="border-b border-slate-100 last:border-b-0">
        <button onClick={() => setAberto(expandido && !procurando ? '' : t.id)} aria-expanded={expandido}
          className="w-full px-4 sm:px-6 py-4 flex items-start gap-3 text-left hover:bg-slate-50 transition-colors">
          <span className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 mt-0.5"><BookOpen className="w-4 h-4 text-blue-600" /></span>
          <span className="flex-1 min-w-0">
            <span className="block font-bold text-slate-800 text-sm leading-snug">{t.titulo}</span>
            <span className="block text-xs text-slate-500 leading-relaxed mt-0.5">{t.resumo}</span>
          </span>
          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg shrink-0">{t.tempo}</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 mt-1.5 transition-transform ${expandido ? 'rotate-180' : ''}`} />
        </button>

        {expandido && (
          <div className="px-4 sm:px-6 pb-5 sm:pl-[4.5rem] space-y-4">
            <ol className="space-y-3">
              {t.passos.map((p, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-sm text-slate-700 leading-relaxed min-w-0">{p}</span>
                </li>
              ))}
            </ol>
            {t.atencao && (
              <div className="flex gap-2.5 rounded-xl bg-amber-50 border border-amber-100 p-3 text-[13px] text-amber-900 leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span><b>Atenção:</b> {t.atencao}</span>
              </div>
            )}
            {t.dicas && t.dicas.length > 0 && (
              <div className="flex gap-2.5 rounded-xl bg-blue-50/70 border border-blue-100 p-3 text-[13px] text-blue-900 leading-relaxed">
                <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                <ul className="space-y-1">{t.dicas.map((d, i) => <li key={i}>{d}</li>)}</ul>
              </div>
            )}
            {t.tela && (
              <button onClick={() => setViewState(t.tela)}
                className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2">
                {t.telaRotulo || 'Abrir a tela'} <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar max-w-5xl w-full pb-12" data-testid="tutoriais">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Tutoriais</h1>
        <p className="text-slate-500 text-sm mt-1">{totalDeTutoriais()} tutoriais com passo a passo de como o LeadSage funciona, tela por tela. Comece por “O caminho completo”.</p>
      </div>

      <div className="relative mb-5">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar (régua, WhatsApp, prévia...)"
          aria-label="Buscar tutorial" className="w-full pl-11 pr-11 h-12 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {busca && (
          <button onClick={() => setBusca('')} aria-label="Limpar a busca" className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {procurando && <p className="text-xs text-slate-500 mb-3">{achados ? `${achados} tutorial(is) encontrado(s)` : ''}</p>}

      {categorias.length === 0 && (
        <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-2xl p-6 text-center">Nenhum tutorial com “{busca}”. Tente outra palavra, como “WhatsApp”, “fila” ou “robô”.</p>
      )}

      <div className="space-y-4">
        {categorias.map(c => (
          <section key={c.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <header className="px-4 sm:px-6 py-4 bg-slate-50/70 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{c.titulo}</h2>
              <p className="text-xs text-slate-500">{c.descricao}</p>
            </header>
            {c.tutoriais.map(t => <Cartao key={t.id} t={t} />)}
          </section>
        ))}
      </div>
    </div>
  );
};
