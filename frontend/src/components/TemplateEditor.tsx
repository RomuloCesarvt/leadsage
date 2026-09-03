import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Copy, Check, Download, FileText, Users, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { extrairCampos, aplicarCampos } from '../templates';
import type { DocumentItem } from '../types';

/**
 * Editor de modelos.
 *
 * As telas de Propostas e Contratos só mostravam o texto com um botão de
 * copiar. Aqui o modelo vira documento: os trechos [ENTRE COLCHETES]
 * viram campos, o texto pode ser editado à mão, e o resultado é salvo na
 * conta do usuário para ser retomado depois.
 */

type Props = {
  kind: 'proposta' | 'contrato';
  /** modelo de origem (novo documento) */
  template?: { id: string; title: string; content: string } | null;
  /** documento já salvo (edição) */
  documento?: DocumentItem | null;
  onFechar: () => void;
  onSalvo: (doc: DocumentItem) => void;
};

export const TemplateEditor: React.FC<Props> = ({
  kind, template, documento, onFechar, onSalvo,
}) => {
  const { leads } = useApp() as any;

  const conteudoBase = documento?.content ?? template?.content ?? '';
  const [titulo, setTitulo] = useState(documento?.title || template?.title || '');
  const [conteudo, setConteudo] = useState(conteudoBase);
  const [valores, setValores] = useState<Record<string, string>>(documento?.fields || {});
  const [aba, setAba] = useState<'campos' | 'texto'>('campos');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Os campos vêm do texto original: editar o corpo não pode fazer os
  // campos já preenchidos desaparecerem do formulário.
  const campos = useMemo(() => extrairCampos(conteudoBase), [conteudoBase]);
  const preenchido = useMemo(() => aplicarCampos(conteudo, valores), [conteudo, valores]);
  const faltando = campos.filter(c => !valores[c]?.trim()).length;

  useEffect(() => {
    setErro('');
  }, [titulo, conteudo, valores]);

  const preencherComLead = (leadId: string) => {
    const lead = (leads || []).find((l: any) => l.id === leadId);
    if (!lead) return;
    // Preenche o que dá para inferir do lead; o resto continua manual.
    const doLead: Record<string, string> = {
      'NOME DO CLIENTE': lead.company || lead.name,
      'NOME': lead.company || lead.name,
      'NOME/RAZÃO SOCIAL': lead.company || lead.name,
      'RAZÃO SOCIAL': lead.company || lead.name,
      'CIDADE': lead.city || '',
      'CIDADE/UF': lead.location || lead.city || '',
      'ENDEREÇO': lead.address || '',
      'EMAIL': lead.email || '',
      'TELEFONE': lead.phone ? `+${lead.phone}` : '',
      'WHATSAPP': lead.phone ? `+${lead.phone}` : '',
      'DATA': new Date().toLocaleDateString('pt-BR'),
      'ANO': String(new Date().getFullYear()),
    };
    setValores(prev => {
      const novo = { ...prev };
      for (const campo of campos) {
        if (doLead[campo] && !novo[campo]) novo[campo] = doLead[campo];
      }
      return novo;
    });
  };

  const handleSalvar = async () => {
    if (!titulo.trim()) { setErro('Dê um nome ao documento.'); return; }
    setSalvando(true);
    setErro('');
    try {
      const salvo = documento
        ? await api.atualizarDocumento(documento.id, {
            title: titulo, content: conteudo, fields: valores,
          })
        : await api.criarDocumento({
            kind, title: titulo, content: conteudo, fields: valores,
            template_id: template?.id || '',
          });
      onSalvo(salvo);
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  };

  const handleCopiar = async () => {
    await navigator.clipboard.writeText(preenchido);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleBaixar = () => {
    const blob = new Blob([preenchido], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(titulo || kind).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">

        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Nome do documento"
              className="flex-1 min-w-0 text-lg font-bold text-slate-800 bg-transparent border-0 border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none py-1"
            />
          </div>
          <button onClick={onFechar} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 overflow-hidden">

          {/* Formulário */}
          <div className="lg:col-span-2 border-r border-slate-200 flex flex-col overflow-hidden">
            <div className="flex border-b border-slate-200">
              {(['campos', 'texto'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setAba(t)}
                  className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${
                    aba === t
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {t === 'campos' ? `Campos${faltando ? ` (${faltando} vazios)` : ''}` : 'Editar texto'}
                </button>
              ))}
            </div>

            {aba === 'campos' ? (
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {(leads || []).length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      <Users className="w-3.5 h-3.5 inline mr-1" />
                      Preencher a partir de um lead
                    </label>
                    <select
                      onChange={e => e.target.value && preencherComLead(e.target.value)}
                      defaultValue=""
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Escolha um lead...</option>
                      {(leads || []).map((l: any) => (
                        <option key={l.id} value={l.id}>{l.company || l.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {campos.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Este modelo não tem campos entre colchetes. Use a aba
                    &quot;Editar texto&quot; para escrever livremente.
                  </p>
                ) : (
                  campos.map(campo => (
                    <div key={campo}>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">{campo}</label>
                      <input
                        value={valores[campo] || ''}
                        onChange={e => setValores(v => ({ ...v, [campo]: e.target.value }))}
                        placeholder={campo}
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          valores[campo]?.trim()
                            ? 'bg-white border-slate-200'
                            : 'bg-amber-50/50 border-amber-200'
                        }`}
                      />
                    </div>
                  ))
                )}
              </div>
            ) : (
              <textarea
                value={conteudo}
                onChange={e => setConteudo(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full p-5 text-sm font-mono text-slate-700 resize-none focus:outline-none leading-relaxed"
              />
            )}
          </div>

          {/* Pré-visualização */}
          <div className="lg:col-span-3 flex flex-col overflow-hidden bg-slate-50">
            <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Pré-visualização
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopiar}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  {copiado ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                </button>
                <button
                  onClick={handleBaixar}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar
                </button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-6 text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
              {preenchido}
            </pre>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            {faltando > 0
              ? `${faltando} campo${faltando > 1 ? 's' : ''} ainda em branco — aparecem entre colchetes no texto.`
              : campos.length > 0 ? 'Todos os campos preenchidos.' : ''}
          </div>
          <div className="flex items-center gap-3">
            {erro && (
              <span className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" /> {erro}
              </span>
            )}
            <button onClick={onFechar} className="px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700">
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-colors"
            >
              {salvando ? (
                <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
              ) : (
                <><Save className="w-4 h-4" /> {documento ? 'Salvar alterações' : 'Salvar documento'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
