import React, { useState, useEffect } from 'react';
import { Globe, Plus, Trash2, Eye, Download, X, Pencil, Link2, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';
import type { SiteItem } from '../../types';

export const MySitesScreen: React.FC = () => {
  const { setViewState, setSiteEmEdicao } = useApp() as any;
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<SiteItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [cota, setCota] = useState<{ usados: number; cota: number | null; ilimitado: boolean } | null>(null);

  // Antes esta tela era um estado vazio fixo: nunca listava nada porque
  // os sites gerados não chegavam a ser salvos em lugar nenhum.
  useEffect(() => {
    let active = true;
    api.getSites()
      .then(list => { if (active) setSites(list); })
      .finally(() => { if (active) setLoading(false); });
    api.cotaDeSites().then(c => { if (active) setCota(c); });
    return () => { active = false; };
  }, []);

  const handleOpen = async (id: string) => {
    try {
      setPreview(await api.getSite(id));
    } catch {
      /* o site pode ter sido removido em outra aba */
    }
  };

  // Reabre o site no construtor. Republicar grava por cima, sem
  // consumir outra vaga da cota — a vaga foi paga quando o site nasceu.
  /** O endereco que o dono do negocio vai abrir no celular. */
  const linkPublico = (site: SiteItem) =>
    site.slug ? `${window.location.origin}/s/${site.slug}` : '';

  const copiarLink = async (site: SiteItem) => {
    const url = linkPublico(site);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // navegador sem permissao de area de transferencia: abre o link
      // para a pessoa copiar da barra de endereco
      window.open(url, '_blank', 'noopener');
      return;
    }
    setCopiadoId(site.id);
    setTimeout(() => setCopiadoId(atual => (atual === site.id ? null : atual)), 2000);
  };

  const handleEdit = async (id: string) => {
    setEditandoId(id);
    try {
      setSiteEmEdicao(await api.getSite(id));
      setViewState('create-site');
    } catch {
      setEditandoId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.deleteSite(id);
      setSites(prev => prev.filter(s => s.id !== id));
      // Apagar libera a cota, então o contador precisa acompanhar.
      setCota(c => (c ? { ...c, usados: Math.max(0, c.usados - 1) } : c));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (site: SiteItem) => {
    const full = site.html ? site : await api.getSite(site.id);
    const blob = new Blob([full.html || ''], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${site.company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">

      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Meus Sites</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie, edite e publique seus sites.</p>
        </div>
        <button
          onClick={() => setViewState('create-site')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          Criar novo site
        </button>
      </div>

      <div className="mb-6">
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium">
          <Globe className="w-4 h-4 text-slate-400" />
          Sites criados{' '}
          <span className="font-bold">
            {loading || !cota
              ? '—'
              : cota.ilimitado
                ? `${cota.usados} · ilimitado`
                : `${cota.usados} de ${cota.cota}`}
          </span>
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-pulse">
              <div className="h-10 w-10 rounded-xl bg-slate-100 mb-4"></div>
              <div className="h-4 w-2/3 bg-slate-100 rounded mb-2"></div>
              <div className="h-3 w-1/3 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
      ) : sites.length === 0 ? (
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-6">
            <Globe className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="font-bold text-slate-800 text-xl mb-2">Você ainda não criou nenhum site.</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            Crie seu primeiro site profissional com a LeadSage.
          </p>
          <button
            onClick={() => setViewState('create-site')}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Criar meu primeiro site
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map(site => (
            <div
              key={site.id}
              className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 transition-colors flex flex-col gap-4"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-blue-600" />
                </div>
                <button
                  onClick={() => handleDelete(site.id)}
                  disabled={deletingId === site.id}
                  title="Excluir site"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1">
                <h3 className="font-bold text-slate-800 line-clamp-2">{site.company}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {site.template ? `${site.template} · ` : ''}
                  {site.updated_at ? `editado em ${formatDate(site.updated_at)}` : formatDate(site.created_at)}
                </p>
                {site.slug && (
                  <a
                    href={linkPublico(site)}
                    target="_blank"
                    rel="noopener"
                    className="mt-2 inline-block text-xs font-semibold text-blue-600 hover:underline break-all"
                  >
                    /s/{site.slug}
                  </a>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => handleEdit(site.id)}
                  disabled={editandoId === site.id}
                  className="flex-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> {editandoId === site.id ? 'Abrindo...' : 'Editar'}
                </button>
                <button
                  onClick={() => handleOpen(site.id)}
                  title="Ver o site"
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => copiarLink(site)}
                  disabled={!site.slug}
                  title={site.slug ? 'Copiar o link para mandar ao cliente' : 'Sem link ainda'}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-40"
                >
                  {copiadoId === site.id
                    ? <Check className="w-4 h-4 text-emerald-600" />
                    : <Link2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleDownload(site)}
                  title="Baixar .html"
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">{preview.company}</h3>
              <button
                onClick={() => setPreview(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <iframe
              title={preview.company}
              srcDoc={preview.html || ''}
              sandbox=""
              className="flex-1 w-full border-0 bg-white"
            />
          </div>
        </div>
      )}

    </div>
  );
};
