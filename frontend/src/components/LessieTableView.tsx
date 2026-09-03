import React, { useState } from 'react';
import { 
  Star,
  Kanban,
  Trash2,
  Globe,
  Filter
} from 'lucide-react';
import type { LeadItem } from '../types';
import { useApp } from '../context/AppContext';
import { DigitalPresence } from './DigitalPresence';
import { WhatsAppIcon, InstagramIcon } from './BrandIcons';

export const LessieTableView: React.FC = () => {
  const { leads, setSelectedProfileLead, updateLeadStage } = useApp() as any;
  
  const [filterSemSite, setFilterSemSite] = useState(false);
  const [filterSemIG, setFilterSemIG] = useState(false);
  const [filterWhatsApp, setFilterWhatsApp] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  let filteredLeads = [...leads];
  
  if (filterSemSite) {
    filteredLeads = filteredLeads.filter((l: LeadItem) => l.missingDigitalAssets && l.missingDigitalAssets.includes('website'));
  }
  if (filterSemIG) {
    filteredLeads = filteredLeads.filter((l: LeadItem) => !l.socials?.instagram);
  }
  if (filterWhatsApp) {
    filteredLeads = filteredLeads.filter((l: LeadItem) => l.whatsapp);
  }
  if (activeTag === 'sem-site') {
    filteredLeads = filteredLeads.filter((l: LeadItem) => l.missingDigitalAssets && l.missingDigitalAssets.includes('website'));
  } else if (activeTag === 'com-whatsapp') {
    filteredLeads = filteredLeads.filter((l: LeadItem) => l.whatsapp);
  } else if (activeTag === 'sem-instagram') {
    filteredLeads = filteredLeads.filter((l: LeadItem) => !l.socials?.instagram);
  } else if (activeTag === 'alta-oportunidade') {
    filteredLeads = filteredLeads.filter((l: LeadItem) => (l.opportunityScore || 0) >= 70);
  }

  const getScoreLabel = (score: number | undefined) => {
    if (!score || score === 0) return { text: 'Baixa (0)', color: 'text-slate-500 bg-slate-100 border-slate-200' };
    if (score < 40) return { text: `Baixa (${score})`, color: 'text-slate-500 bg-slate-100 border-slate-200' };
    if (score < 70) return { text: `Média (${score})`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
    return { text: `Alta (${score})`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  };

  if (leads.length === 0) {
    return (
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mb-4">
          <Globe className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhum Lead Encontrado</h3>
        <p className="text-slate-500 max-w-md">Os resultados da sua busca aparecerão aqui. Tente pesquisar por um nicho e cidade no buscador.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      


      {/* Filters Row */}
      <div className="bg-white border border-slate-200 rounded-t-xl px-5 py-3">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex items-center gap-2 text-slate-500 text-sm font-bold">
            <Filter className="w-4 h-4" /> FILTROS
          </div>
          <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Todos os países</option>
            <option>Brasil</option>
          </select>
          <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Todos estados</option>
          </select>
          <input type="text" placeholder="Cidade..." className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 w-28 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>Todos nichos</option>
          </select>
          
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
            <input type="checkbox" checked={filterSemSite} onChange={() => setFilterSemSite(!filterSemSite)} className="rounded border-slate-300" />
            Sem Site
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
            <input type="checkbox" checked={filterSemIG} onChange={() => setFilterSemIG(!filterSemIG)} className="rounded border-slate-300" />
            Sem Instagram
          </label>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
            <input type="checkbox" checked={filterWhatsApp} onChange={() => setFilterWhatsApp(!filterWhatsApp)} className="rounded border-slate-300" />
            Com WhatsApp
          </label>
          <div className="flex-1"></div>
          {[
            { key: 'favoritos', icon: <Star className="w-3 h-3" />, label: 'Favoritos' },
            { key: 'sem-site', icon: <Globe className="w-3 h-3" />, label: 'Sem Site' },
            { key: 'com-whatsapp', icon: <WhatsAppIcon className="w-3 h-3" />, label: 'Com WhatsApp' },
            { key: 'sem-instagram', icon: <InstagramIcon className="w-3 h-3" />, label: 'Sem Instagram' },
            { key: 'alta-oportunidade', icon: <Star className="w-3 h-3" />, label: 'Alta Oportunidade' },
          ].map(tag => (
            <button
              key={tag.key}
              onClick={() => setActiveTag(activeTag === tag.key ? null : tag.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 border ${
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

      {/* Table */}
      <div className="flex-1 bg-white border border-t-0 border-slate-200 rounded-b-xl overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="py-3 px-4 w-10">
                <input type="checkbox" className="rounded border-slate-300" />
              </th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Localização</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contato</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Score</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Presença Digital</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLeads.map((lead: LeadItem) => {
              const scoreInfo = getScoreLabel(lead.opportunityScore);
              return (
                <tr 
                  key={lead.id} 
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                  onClick={() => setSelectedProfileLead(lead)}
                >
                  <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" className="rounded border-slate-300" />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                        {lead.company?.charAt(0) || 'L'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate max-w-[280px]">{lead.company}</p>
                        <p className="text-xs text-slate-400">{lead.niche}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm text-slate-600">{lead.city || lead.location?.split(',')[0] || '-'}</p>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm font-medium text-slate-700">
                      {lead.phone 
                        ? `+${lead.phone}`
                        : '-'
                      }
                    </p>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${scoreInfo.color}`}>
                      {scoreInfo.text}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <DigitalPresence
                      lead={lead}
                      canais={['website', 'instagram', 'whatsapp', 'facebook', 'email']}
                    />
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Favoritar">
                        <Star className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => updateLeadStage(lead.id, 'Novo Lead')}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="Enviar para Pipeline"
                      >
                        <Kanban className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir">
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
    </div>
  );
};
