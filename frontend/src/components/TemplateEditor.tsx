import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Save, Copy, Check, Download, FileText, Users, AlertCircle, Printer, Upload, Palette } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { extrairCampos, aplicarCampos } from '../templates';
import { DOC_THEMES, acharTheme } from '../templates/docs/themes';
import type { MarcaDocumento } from '../templates/docs/base';
import type { DocumentItem } from '../types';

const LIMITE_LOGO = 200 * 1024;

const PALETAS_DOC = [
  { nome: 'Azul', primaria: '#2563eb', destaque: '#f59e0b' },
  { nome: 'Grafite', primaria: '#1f2937', destaque: '#38bdf8' },
  { nome: 'Verde', primaria: '#047857', destaque: '#f97316' },
  { nome: 'Vinho', primaria: '#9f1239', destaque: '#facc15' },
  { nome: 'Roxo', primaria: '#6d28d9', destaque: '#22d3ee' },
];

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
  const { leads, user, setUser } = useApp() as any;
  const inputLogo = useRef<HTMLInputElement>(null);
  const quadro = useRef<HTMLIFrameElement>(null);

  const conteudoBase = documento?.content ?? template?.content ?? '';
  const [titulo, setTitulo] = useState(documento?.title || template?.title || '');
  const [conteudo, setConteudo] = useState(conteudoBase);
  const [valores, setValores] = useState<Record<string, string>>(documento?.fields || {});
  const [aba, setAba] = useState<'campos' | 'texto' | 'marca'>('campos');
  const [temaId, setTemaId] = useState(documento?.fields?.__tema || 'classico');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Os campos vêm do texto original: editar o corpo não pode fazer os
  // campos já preenchidos desaparecerem do formulário.
  const campos = useMemo(() => extrairCampos(conteudoBase), [conteudoBase]);
  const preenchido = useMemo(() => aplicarCampos(conteudo, valores), [conteudo, valores]);
  const faltando = campos.filter(c => !valores[c]?.trim()).length;

  // A identidade visual mora no perfil: a logo é enviada uma vez e vale
  // para todos os documentos.
  const marca: MarcaDocumento = useMemo(() => ({
    empresa: user?.company_name || user?.name || 'Sua Empresa',
    logo: user?.brand_logo || undefined,
    corPrimaria: user?.brand_primary || '#2563eb',
    corDestaque: user?.brand_accent || '#f59e0b',
    contato: user?.brand_contact || user?.email || '',
  }), [user]);

  const html = useMemo(
    () => acharTheme(temaId).render(preenchido, marca, titulo || 'Documento'),
    [temaId, preenchido, marca, titulo]
  );

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
            title: titulo, content: conteudo, fields: { ...valores, __tema: temaId },
          })
        : await api.criarDocumento({
            kind, title: titulo, content: conteudo,
            fields: { ...valores, __tema: temaId },
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
    // Baixa o documento formatado, não o texto cru: é o arquivo que o
    // usuário manda para o cliente.
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(titulo || kind).toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /** Abre a impressão do iframe: dali o usuário salva em PDF. */
  const handleImprimir = () => {
    const janela = quadro.current?.contentWindow;
    if (!janela) return;
    janela.focus();
    janela.print();
  };

  const salvarMarca = async (mudanca: Partial<MarcaDocumento & { logo: string }>) => {
    const atualizado = {
      ...user,
      brand_logo: mudanca.logo !== undefined ? mudanca.logo : marca.logo,
      brand_primary: mudanca.corPrimaria || marca.corPrimaria,
      brand_accent: mudanca.corDestaque || marca.corDestaque,
      brand_contact: mudanca.contato !== undefined ? mudanca.contato : marca.contato,
    };
    setUser(atualizado);
    try {
      await api.updateProfile(atualizado);
    } catch {
      /* a marca continua valendo nesta sessão mesmo se o save falhar */
    }
  };

  const enviarLogo = (arquivo: File) => {
    if (arquivo.size > LIMITE_LOGO) {
      setErro('A logo precisa ter no máximo 200 KB.');
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => salvarMarca({ logo: String(leitor.result) });
    leitor.readAsDataURL(arquivo);
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
              {(['campos', 'texto', 'marca'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setAba(t)}
                  className={`flex-1 px-3 py-3 text-sm font-bold transition-colors ${
                    aba === t
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {t === 'campos'
                    ? `Campos${faltando ? ` (${faltando})` : ''}`
                    : t === 'texto' ? 'Texto' : 'Layout'}
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
            ) : aba === 'texto' ? (
              <textarea
                value={conteudo}
                onChange={e => setConteudo(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full p-5 text-sm font-mono text-slate-700 resize-none focus:outline-none leading-relaxed"
              />
            ) : (
              <div className="flex-1 overflow-y-auto p-5 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Acabamento
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {DOC_THEMES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setTemaId(t.id)}
                        title={t.descricao}
                        className={`rounded-xl border-2 overflow-hidden transition-colors ${
                          temaId === t.id ? 'border-blue-500' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className="bg-white"
                          dangerouslySetInnerHTML={{
                            __html: t.miniatura({
                              corPrimaria: marca.corPrimaria,
                              corDestaque: marca.corDestaque,
                            }),
                          }}
                        />
                        <span className={`block py-1.5 text-[11px] font-bold ${
                          temaId === t.id ? 'text-blue-600 bg-blue-50' : 'text-slate-500'
                        }`}>
                          {t.nome}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {DOC_THEMES.find(t => t.id === temaId)?.descricao}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Sua logo
                  </label>
                  <div className="flex items-center gap-3">
                    {marca.logo && (
                      <img src={marca.logo} alt="" className="h-10 w-auto object-contain border border-slate-200 rounded-lg p-1" />
                    )}
                    <button
                      onClick={() => inputLogo.current?.click()}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" /> {marca.logo ? 'Trocar' : 'Enviar logo'}
                    </button>
                    {marca.logo && (
                      <button onClick={() => salvarMarca({ logo: '' })} className="p-2 text-slate-400 hover:text-red-600" title="Remover">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <input
                      ref={inputLogo}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={e => e.target.files?.[0] && enviarLogo(e.target.files[0])}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Fica salva no seu perfil e vale para todos os documentos. Até 200 KB.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    <Palette className="w-3.5 h-3.5 inline mr-1" /> Cores
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PALETAS_DOC.map(p => (
                      <button
                        key={p.nome}
                        onClick={() => salvarMarca({ corPrimaria: p.primaria, corDestaque: p.destaque })}
                        title={p.nome}
                        className={`w-8 h-8 rounded-lg border-2 overflow-hidden flex ${
                          marca.corPrimaria === p.primaria ? 'border-slate-800' : 'border-transparent'
                        }`}
                      >
                        <span className="flex-1" style={{ background: p.primaria }} />
                        <span className="w-1/3" style={{ background: p.destaque }} />
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <label className="flex-1 text-xs text-slate-500">
                      Principal
                      <input type="color" value={marca.corPrimaria}
                        onChange={e => salvarMarca({ corPrimaria: e.target.value })}
                        className="w-full h-9 rounded-lg border border-slate-200 cursor-pointer" />
                    </label>
                    <label className="flex-1 text-xs text-slate-500">
                      Destaque
                      <input type="color" value={marca.corDestaque}
                        onChange={e => salvarMarca({ corDestaque: e.target.value })}
                        className="w-full h-9 rounded-lg border border-slate-200 cursor-pointer" />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Seu contato no documento
                  </label>
                  <input
                    value={marca.contato}
                    onChange={e => salvarMarca({ contato: e.target.value })}
                    placeholder="email@empresa.com · (11) 90000-0000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
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
                  title="Copiar o texto"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  {copiado ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                </button>
                <button
                  onClick={handleBaixar}
                  title="Baixar o documento formatado"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Baixar
                </button>
                <button
                  onClick={handleImprimir}
                  title="Imprimir ou salvar em PDF"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> PDF
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-100">
              <iframe
                ref={quadro}
                title="Documento"
                srcDoc={html}
                sandbox="allow-same-origin allow-modals"
                className="w-full h-full border-0"
              />
            </div>
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
