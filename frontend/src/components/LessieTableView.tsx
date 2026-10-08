import React, { useEffect, useMemo, useState } from 'react';
import {
  Star,
  Trash2,
  Globe,
  Filter,
  Search,
  Plus,
  Send,
  X,
} from 'lucide-react';
import type { LeadItem } from '../types';
import { useApp } from '../context/AppContext';
import { DigitalPresence } from './DigitalPresence';
import { WhatsAppIcon, InstagramIcon } from './BrandIcons';
import { ehSalvo, nichosDe } from '../lib/leadsSalvos';

/**
 * A mesma tabela serve às duas listas:
 * - "resultados": o que a busca trouxe e ninguém escolheu ainda. A estrela e
 *   a barra de baixo adicionam o lead a Meus Leads;
 * - "meus": só os leads escolhidos. A estrela marca favorito e a barra de
 *   baixo leva os selecionados para o contato (Fila de envio do robô).
 */
export type ModoTabela = 'resultados' | 'meus';

const normaliza = (t: string) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const LessieTableView: React.FC<{ modo: ModoTabela }> = ({ modo }) => {
  const {
    leads, setSelectedProfileLead, salvarLeads, removerLeads, alternarFavorito,
    setLeadsParaContato, setViewState,
  } = useApp() as any;

  const [filterSemSite, setFilterSemSite] = useState(false);
  const [filterSemIG, setFilterSemIG] = useState(false);
  const [filterWhatsApp, setFilterWhatsApp] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [empresa, setEmpresa] = useState('');
  const [nicho, setNicho] = useState('');
  const [cidade, setCidade] = useState('');
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [aviso, setAviso] = useState('');

  const base: LeadItem[] = useMemo(
    () => (leads as LeadItem[]).filter(l => (modo === 'meus' ? ehSalvo(l) : !ehSalvo(l))),
    [leads, modo],
  );
  const nichos = useMemo(() => nichosDe(base), [base]);
  const cidades = useMemo(
    () => Array.from(new Set(base.map(l => (l.city || l.location?.split(',')[0] || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [base],
  );

  let filteredLeads = base;
  if (empresa.trim()) {
    const q = normaliza(empresa);
    filteredLeads = filteredLeads.filter(l => normaliza(`${l.company} ${l.name}`).includes(q));
  }
  if (nicho) filteredLeads = filteredLeads.filter(l => (l.niche || '').trim() === nicho);
  if (cidade) filteredLeads = filteredLeads.filter(l => (l.city || l.location?.split(',')[0] || '').trim() === cidade);
  if (filterSemSite) filteredLeads = filteredLeads.filter(l => l.missingDigitalAssets && l.missingDigitalAssets.includes('website'));
  if (filterSemIG) filteredLeads = filteredLeads.filter(l => !l.socials?.instagram);
  if (filterWhatsApp) filteredLeads = filteredLeads.filter(l => l.whatsapp);
  if (activeTag === 'favoritos') filteredLeads = filteredLeads.filter(l => l.favorito);
  else if (activeTag === 'sem-site') filteredLeads = filteredLeads.filter(l => l.missingDigitalAssets && l.missingDigitalAssets.includes('website'));
  else if (activeTag === 'com-whatsapp') filteredLeads = filteredLeads.filter(l => l.whatsapp);
  else if (activeTag === 'sem-instagram') filteredLeads = filteredLeads.filter(l => !l.socials?.instagram);
  else if (activeTag === 'alta-oportunidade') filteredLeads = filteredLeads.filter(l => (l.opportunityScore || 0) >= 70);

  // quem sai da lista (adicionado, removido, filtrado) sai também da seleção
  useEffect(() => {
    const visiveis = new Set(filteredLeads.map(l => l.id));
    setMarcados(prev => {
      const mantidos = [...prev].filter(id => visiveis.has(id));
      return mantidos.length === prev.size ? prev : new Set(mantidos);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, empresa, nicho, cidade, filterSemSite, filterSemIG, filterWhatsApp, activeTag, modo]);

  useEffect(() => { setMarcados(new Set()); setAviso(''); }, [modo]);

  const todosMarcados = filteredLeads.length > 0 && filteredLeads.every(l => marcados.has(l.id));
  const alternarTodos = () => setMarcados(todosMarcados ? new Set() : new Set(filteredLeads.map(l => l.id)));
  const alternar = (id: string) => setMarcados(prev => {
    const novo = new Set(prev);
    if (novo.has(id)) novo.delete(id); else novo.add(id);
    return novo;
  });

  const adicionar = async (ids: string[]) => {
    if (!ids.length) return;
    await salvarLeads(ids);
    setMarcados(new Set());
    setAviso(`${ids.length} lead${ids.length > 1 ? 's' : ''} adicionado${ids.length > 1 ? 's' : ''} a Meus Leads.`);
  };

  const remover = async (ids: string[]) => {
    if (!ids.length) return;
    const quais = ids.length > 1 ? `${ids.length} leads` : 'este lead';
    if (!window.confirm(modo === 'meus' ? `Tirar ${quais} de Meus Leads?` : `Descartar ${quais} dos resultados?`)) return;
    await removerLeads(ids);
    setMarcados(new Set());
  };

  const contatar = (ids: string[]) => {
    if (!ids.length) return;
    setLeadsParaContato(ids);
    setViewState('fila');
  };

  const getScoreLabel = (score: number | undefined) => {
    if (!score || score === 0) return { text: 'Baixa (0)', color: 'text-slate-500 bg-slate-100 border-slate-200' };
    if (score < 40) return { text: `Baixa (${score})`, color: 'text-slate-500 bg-slate-100 border-slate-200' };
    if (score < 70) return { text: `Média (${score})`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { text: `Alta (${score})`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  };

  if (base.length === 0) {
    return (
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-slate-300" />
        </div>
        {modo === 'meus' ? (
          <>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Você ainda não escolheu nenhum lead</h3>
            <p className="text-slate-500 max-w-md mb-4">Faça uma busca, marque os negócios que interessam e adicione aqui. É daqui que o contato começa.</p>
            <button onClick={() => setViewState('hero')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">Fazer uma busca</button>
          </>
        ) : (
          <>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhum resultado para escolher</h3>
            <p className="text-slate-500 max-w-md mb-4">Os resultados da sua próxima busca aparecem aqui. Marque os que interessam e adicione a Meus Leads.</p>
            <button onClick={() => setViewState('hero')} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">Fazer uma busca</button>
          </>
        )}
        {aviso && <p className="text-sm text-emerald-700 font-medium mt-4">{aviso}</p>}
      </div>
    );
  }

  const campo = 'px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-t-xl px-5 py-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
            <Filter className="w-4 h-4" /> FILTROS
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text" value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Buscar empresa…"
              aria-label="Buscar empresa" className={`${campo} pl-8 w-48`}
            />
          </div>
          <select value={nicho} onChange={e => setNicho(e.target.value)} aria-label="Filtrar por nicho" className={campo}>
            <option value="">Todos nichos</option>
            {nichos.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select value={cidade} onChange={e => setCidade(e.target.value)} aria-label="Filtrar por cidade" className={campo}>
            <option value="">Todas as cidades</option>
            {cidades.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {(empresa || nicho || cidade || filterSemSite || filterSemIG || filterWhatsApp || activeTag) && (
            <button
              onClick={() => { setEmpresa(''); setNicho(''); setCidade(''); setFilterSemSite(false); setFilterSemIG(false); setFilterWhatsApp(false); setActiveTag(null); }}
              className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1"
            ><X className="w-3 h-3" /> Limpar filtros</button>
          )}
          <span className="text-xs text-slate-500 ml-auto">{filteredLeads.length} de {base.length}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
            <input type="checkbox" checked={filterSemSite} onChange={() => setFilterSemSite(!filterSemSite)} className="rounded border-slate-300" />
            Sem Site
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
            <input type="checkbox" checked={filterSemIG} onChange={() => setFilterSemIG(!filterSemIG)} className="rounded border-slate-300" />
            Sem Instagram
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
            <input type="checkbox" checked={filterWhatsApp} onChange={() => setFilterWhatsApp(!filterWhatsApp)} className="rounded border-slate-300" />
            Com WhatsApp
          </label>
          <div className="hidden lg:block flex-1"></div>
          {[
            ...(modo === 'meus' ? [{ key: 'favoritos', icon: <Star className="w-3 h-3" />, label: 'Favoritos' }] : []),
            { key: 'sem-site', icon: <Globe className="w-3 h-3" />, label: 'Sem Site' },
            { key: 'com-whatsapp', icon: <WhatsAppIcon className="w-3 h-3" />, label: 'Com WhatsApp' },
            { key: 'sem-instagram', icon: <InstagramIcon className="w-3 h-3" />, label: 'Sem Instagram' },
            { key: 'alta-oportunidade', icon: <Star className="w-3 h-3" />, label: 'Alta Oportunidade' },
          ].map(tag => (
            <button
              key={tag.key}
              onClick={() => setActiveTag(activeTag === tag.key ? null : tag.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border whitespace-nowrap ${
                activeTag === tag.key
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tag.icon} {tag.label}
            </button>
          ))}
        </div>
      </div>

      {aviso && (
        <div className="px-5 py-2 bg-emerald-50 border-x border-emerald-100 text-sm text-emerald-800 font-medium flex items-center justify-between">
          <span>{aviso}</span>
          <button onClick={() => setViewState('workspace')} className="font-bold underline">Ver Meus Leads</button>
        </div>
      )}

      {/* Tabela */}
      <div className="flex-1 min-h-0 bg-white border border-t-0 border-slate-200 rounded-b-xl overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="py-3 px-4 w-10">
                <input type="checkbox" checked={todosMarcados} onChange={alternarTodos} aria-label="Selecionar todos" className="rounded border-slate-300" />
              </th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="hidden md:table-cell py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Localização</th>
              <th className="hidden md:table-cell py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contato</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
              <th className="hidden lg:table-cell py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Presença Digital</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLeads.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-sm text-slate-500">Nenhum lead com esses filtros.</td></tr>
            )}
            {filteredLeads.map((lead: LeadItem) => {
              const scoreInfo = getScoreLabel(lead.opportunityScore);
              const marcado = marcados.has(lead.id);
              return (
                <tr
                  key={lead.id}
                  className={`transition-colors group cursor-pointer ${marcado ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                  onClick={() => setSelectedProfileLead(lead)}
                >
                  <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={marcado} onChange={() => alternar(lead.id)} aria-label={`Selecionar ${lead.company}`} className="rounded border-slate-300" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                        {lead.company?.charAt(0) || 'L'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate max-w-[280px]">{lead.company}</p>
                        <p className="text-xs text-slate-500">{lead.niche}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell py-4 px-4">
                    <p className="text-sm text-slate-600">{lead.city || lead.location?.split(',')[0] || '-'}</p>
                  </td>
                  <td className="hidden md:table-cell py-4 px-4">
                    <p className="text-sm font-medium text-slate-700">{lead.phone ? `+${lead.phone}` : '-'}</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${scoreInfo.color}`}>{scoreInfo.text}</span>
                  </td>
                  <td className="hidden lg:table-cell py-4 px-4">
                    <DigitalPresence lead={lead} canais={['website', 'instagram', 'whatsapp', 'facebook', 'email']} />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {modo === 'resultados' ? (
                        <button
                          onClick={() => adicionar([lead.id])}
                          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Adicionar a Meus Leads"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => alternarFavorito(lead.id)}
                          className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors"
                          title={lead.favorito ? 'Tirar dos favoritos' : 'Favoritar'}
                          aria-pressed={!!lead.favorito}
                        >
                          <Star className={`w-4 h-4 ${lead.favorito ? 'text-amber-500 fill-amber-500' : 'text-slate-400 hover:text-amber-500'}`} />
                        </button>
                      )}
                      <button
                        onClick={() => remover([lead.id])}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title={modo === 'meus' ? 'Tirar de Meus Leads' : 'Descartar'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSelectedProfileLead(lead)}
                        className="px-3 py-1 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors"
                      >
                        Detalhes
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Barra de ações dos selecionados */}
      {marcados.size > 0 && (
        <div className="mt-3 shrink-0 bg-slate-900 text-white rounded-2xl px-5 py-3 flex flex-wrap items-center gap-3 shadow-lg">
          <span className="text-sm font-bold">{marcados.size} selecionado{marcados.size > 1 ? 's' : ''}</span>
          {modo === 'resultados' ? (
            <button
              onClick={() => adicionar([...marcados])}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold flex items-center gap-2"
            ><Plus className="w-4 h-4" /> Adicionar a Meus Leads</button>
          ) : (
            <button
              onClick={() => contatar([...marcados])}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold flex items-center gap-2"
            ><Send className="w-4 h-4" /> Enviar para contato</button>
          )}
          <button
            onClick={() => remover([...marcados])}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold flex items-center gap-2"
          ><Trash2 className="w-4 h-4" /> {modo === 'meus' ? 'Tirar da lista' : 'Descartar'}</button>
          <button onClick={() => setMarcados(new Set())} className="ml-auto text-sm text-slate-300 hover:text-white">Limpar seleção</button>
        </div>
      )}
    </div>
  );
};
