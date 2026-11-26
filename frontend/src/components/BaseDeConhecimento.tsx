/**
 * Base de conhecimento do robô: o dono sobe textos (catálogo, políticas, perguntas, procedimentos) e o robô consulta só o trecho
 * que responde ao que o lead perguntou. Agência e empresa têm bases separadas.
 */
import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, FileText, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { api } from '../services/api';

type Doc = { id: string; titulo: string; trechos: number; caracteres: number; vetorial: boolean };
type Estado = { documentos: Doc[]; trechos: number; limite_trechos: number; limite_documentos: number };

const campo = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500';

export const BaseDeConhecimento: React.FC = () => {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const arquivo = useRef<HTMLInputElement>(null);

  const carregar = () => api.conhecimentoListar().then(e => setEstado(e && Array.isArray(e.documentos) ? e : null)).catch(() => setEstado(null));
  useEffect(() => { carregar(); }, []);

  const lerArquivo = async (f?: File | null) => {
    if (!f) return;
    if (!/\.(txt|md|csv)$/i.test(f.name) && !f.type.startsWith('text/')) { setErro('Envie um arquivo de texto (.txt, .md ou .csv). Para PDF ou Word, copie o texto e cole aqui.'); return; }
    if (f.size > 200_000) { setErro('Arquivo grande demais. Divida em partes de até 30 mil caracteres.'); return; }
    setErro('');
    setTexto(await f.text());
    setTitulo(t => t || f.name.replace(/\.[^.]+$/, ''));
  };

  const adicionar = async () => {
    setSalvando(true);
    setErro('');
    try {
      await api.conhecimentoAdicionar(titulo, texto);
      setTitulo(''); setTexto('');
      await carregar();
    } catch (e: any) { setErro(e?.message || 'Não foi possível salvar.'); }
    finally { setSalvando(false); }
  };

  const apagar = async (d: Doc) => {
    if (!window.confirm(`Apagar "${d.titulo}" da base de conhecimento?`)) return;
    try { await api.conhecimentoApagar(d.id); await carregar(); } catch (e: any) { setErro(e?.message || 'Não foi possível apagar.'); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-600" /> Base de conhecimento</h2>
      <p className="text-sm text-slate-500 mb-5">
        Cole aqui o que o robô precisa saber: catálogo, política de troca, procedimentos, perguntas dos clientes. Quando alguém perguntar,
        ele consulta só o trecho que responde, sem inventar. Cada modo (agência e empresa) tem a sua base.
      </p>

      <div className="space-y-3">
        <input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={120} placeholder="Título (ex.: Política de garantia)" className={campo} />
        <textarea rows={6} value={texto} onChange={e => setTexto(e.target.value)} maxLength={40000}
          placeholder="Cole o texto aqui…" className={`${campo} resize-y`} />
        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={adicionar} disabled={salvando || texto.trim().length < 20}
            className="min-h-12 sm:min-h-0 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Adicionar à base
          </button>
          <input ref={arquivo} type="file" accept=".txt,.md,.csv,text/*" className="hidden" onChange={e => { lerArquivo(e.target.files?.[0]); e.target.value = ''; }} />
          <button type="button" onClick={() => arquivo.current?.click()}
            className="min-h-12 sm:min-h-0 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50">
            <Upload className="w-4 h-4" /> Carregar arquivo de texto
          </button>
        </div>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
      </div>

      <div className="mt-6">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
          Na base {estado ? `· ${estado.documentos.length} documento(s), ${estado.trechos}/${estado.limite_trechos} trechos` : ''}
        </p>
        {!estado ? <p className="text-sm text-slate-400">Carregando…</p>
          : estado.documentos.length === 0 ? <p className="text-sm text-slate-500">Nada cadastrado ainda. O robô responde só com o cadastro e as regras acima.</p>
          : (
            <ul className="divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {estado.documentos.map(d => (
                <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 break-words">{d.titulo}</p>
                    <p className="text-xs text-slate-400">{d.trechos} trecho(s){d.vetorial ? '' : ' · busca por palavras'}</p>
                  </div>
                  <button type="button" aria-label={`Apagar ${d.titulo}`} onClick={() => apagar(d)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
};
