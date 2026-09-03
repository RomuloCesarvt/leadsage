import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Pencil, Clock, LayoutTemplate } from 'lucide-react';
import { api } from '../services/api';
import { TemplateEditor } from './TemplateEditor';
import type { Template } from '../templates';
import type { DocumentItem } from '../types';

/**
 * Biblioteca de modelos, usada por Propostas e Contratos.
 *
 * Antes cada tela listava modelos apenas para copiar o texto. Agora há
 * duas abas: os modelos disponíveis e os documentos que o usuário já
 * criou a partir deles — que podem ser reabertos, editados e excluídos.
 */

type Props = {
  kind: 'proposta' | 'contrato';
  titulo: string;
  subtitulo: string;
  templates: Template[];
};

export const TemplateLibrary: React.FC<Props> = ({ kind, titulo, subtitulo, templates }) => {
  const [aba, setAba] = useState<'modelos' | 'meus'>('modelos');
  const [documentos, setDocumentos] = useState<DocumentItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editandoTemplate, setEditandoTemplate] = useState<Template | null>(null);
  const [editandoDoc, setEditandoDoc] = useState<DocumentItem | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const recarregar = () => {
    setCarregando(true);
    api.listarDocumentos(kind)
      .then(setDocumentos)
      .finally(() => setCarregando(false));
  };

  useEffect(recarregar, [kind]);

  const abrirDocumento = async (id: string) => {
    try {
      setEditandoDoc(await api.obterDocumento(id));
    } catch {
      /* pode ter sido removido em outra aba */
    }
  };

  const excluir = async (id: string) => {
    setExcluindo(id);
    try {
      await api.excluirDocumento(id);
      setDocumentos(prev => prev.filter(d => d.id !== id));
    } finally {
      setExcluindo(null);
    }
  };

  const aoSalvar = (doc: DocumentItem) => {
    setEditandoTemplate(null);
    setEditandoDoc(null);
    setDocumentos(prev => {
      const semEle = prev.filter(d => d.id !== doc.id);
      return [doc, ...semEle];
    });
    setAba('meus');
  };

  const formatarData = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex-1 flex flex-col h-full">

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">{titulo}</h1>
        <p className="text-slate-500 text-sm mt-1">{subtitulo}</p>
      </div>

      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <button
          onClick={() => setAba('modelos')}
          className={`px-4 py-2.5 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${
            aba === 'modelos'
              ? 'text-blue-600 border-blue-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          <LayoutTemplate className="w-4 h-4" /> Modelos ({templates.length})
        </button>
        <button
          onClick={() => setAba('meus')}
          className={`px-4 py-2.5 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 ${
            aba === 'meus'
              ? 'text-blue-600 border-blue-600'
              : 'text-slate-500 border-transparent hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" /> Meus documentos ({carregando ? '—' : documentos.length})
        </button>
      </div>

      {aba === 'modelos' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map(t => (
            <div
              key={t.id}
              className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex flex-col"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <LayoutTemplate className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800 mb-1">{t.title}</h3>
              <p className="text-sm text-slate-500 flex-1 mb-4">{t.desc}</p>
              <button
                onClick={() => setEditandoTemplate(t)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> Usar este modelo
              </button>
            </div>
          ))}
        </div>
      ) : carregando ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-slate-100 mb-4" />
              <div className="h-4 w-2/3 bg-slate-100 rounded mb-2" />
              <div className="h-3 w-1/3 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : documentos.length === 0 ? (
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-bold text-slate-800 text-xl mb-2">Nenhum documento ainda.</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            Escolha um modelo, preencha os campos e salve — ele fica guardado aqui para você editar quando quiser.
          </p>
          <button
            onClick={() => setAba('modelos')}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 transition-colors"
          >
            <LayoutTemplate className="w-4 h-4" /> Ver modelos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {documentos.map(doc => (
            <div
              key={doc.id}
              className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition-colors flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <button
                  onClick={() => excluir(doc.id)}
                  disabled={excluindo === doc.id}
                  title="Excluir documento"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h3 className="font-bold text-slate-800 line-clamp-2 mb-1">{doc.title}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-4 flex-1">
                <Clock className="w-3.5 h-3.5" /> Editado em {formatarData(doc.updated_at)}
              </p>

              <button
                onClick={() => abrirDocumento(doc.id)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Pencil className="w-4 h-4" /> Abrir e editar
              </button>
            </div>
          ))}
        </div>
      )}

      {(editandoTemplate || editandoDoc) && (
        <TemplateEditor
          kind={kind}
          template={editandoTemplate}
          documento={editandoDoc}
          onFechar={() => { setEditandoTemplate(null); setEditandoDoc(null); }}
          onSalvo={aoSalvar}
        />
      )}
    </div>
  );
};
