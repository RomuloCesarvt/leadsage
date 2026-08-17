import React, { useState } from 'react';
import { 
  Table as TableIcon,
  Sparkles, 
  CheckCircle2,
  Mail,
  LayoutTemplate,
  Building2,
  Phone
} from 'lucide-react';
import type { LeadItem } from '../types';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const LessieTableView: React.FC = () => {
  const { leads, setSelectedLeadForMessage, currentNiche, setSelectedProfileLead, setIsDemoSiteModalOpen, setDemoSiteData } = useApp() as any;
  
  const [filterMissingWebsite, setFilterMissingWebsite] = useState(false);

  const filteredLeads = filterMissingWebsite 
    ? leads.filter((l: LeadItem) => l.missingDigitalAssets && l.missingDigitalAssets.includes('website'))
    : leads;

  const handleGenerateDemoSite = async (lead: LeadItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const btn = e.currentTarget as HTMLButtonElement;
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<span class="animate-pulse">...</span>';
      btn.disabled = true;

      const data = await api.generateDemoSite({ lead });
      setDemoSiteData(data);
      setIsDemoSiteModalOpen(true);

      btn.innerHTML = originalHtml;
      btn.disabled = false;
    } catch (err) {
      alert("Erro ao gerar site demo");
    }
  };

  const renderSocialBadges = (socials: LeadItem['socials']) => {
    return (
      <div className="flex items-center gap-1.5 notranslate" translate="no">
        {socials.instagram && (
          <a href={socials.instagram} target="_blank" rel="noreferrer" className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm hover:scale-110 transition-transform">ig</a>
        )}
        {socials.linkedin && (
          <a href={socials.linkedin} target="_blank" rel="noreferrer" className="w-6 h-6 rounded-full bg-[#0077b5] flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm hover:scale-110 transition-transform">in</a>
        )}
        {socials.tiktok && (
          <a href={socials.tiktok} target="_blank" rel="noreferrer" className="w-6 h-6 rounded-full bg-black border border-slate-700 flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm hover:scale-110 transition-transform">tk</a>
        )}
        {socials.facebook && (
          <a href={socials.facebook} target="_blank" rel="noreferrer" className="w-6 h-6 rounded-full bg-[#1877f2] flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm hover:scale-110 transition-transform">fb</a>
        )}
      </div>
    );
  };

  if (leads.length === 0) {
    return (
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center mb-4">
          <TableIcon className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhum Lead Encontrado</h3>
        <p className="text-slate-500 max-w-md">Os resultados da sua busca aparecerão aqui. Tente pesquisar por um nicho e cidade no buscador.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
      
      {/* Top Bar / Toolbar */}
      <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">Resultados da Busca</h2>
            <p className="text-xs text-slate-500 font-medium">{filteredLeads.length} leads encontrados para "{currentNiche}"</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterMissingWebsite(!filterMissingWebsite)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              filterMissingWebsite 
                ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-sm' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Apenas "Sem Site"
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredLeads.map((lead: LeadItem) => (
            <div 
              key={lead.id}
              onClick={() => setSelectedProfileLead(lead)}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex flex-col"
            >
              
              {/* Header Card */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <img src={lead.avatar} alt={lead.name} className="w-12 h-12 rounded-full object-cover border border-slate-100 shadow-sm" />
                  <div>
                    <h3 className="font-bold text-slate-800 text-[15px] leading-tight flex items-center gap-1.5">
                      {lead.name}
                      {lead.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{lead.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  {lead.opportunityScore && (
                    <div className="inline-flex flex-col items-end">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Score</span>
                      <span className="text-lg font-black text-indigo-600 leading-none">{lead.opportunityScore}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Info */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-1">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {lead.company}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wide">
                    {lead.niche}
                  </span>
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wide">
                    {lead.city}
                  </span>
                </div>
              </div>

              {/* Tags Deficiencias */}
              {lead.missingDigitalAssets && lead.missingDigitalAssets.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {lead.missingDigitalAssets.map(asset => (
                    <span key={asset} className="px-2 py-1 bg-rose-50 border border-rose-100 text-rose-600 rounded text-[10px] font-bold uppercase tracking-wide flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      Sem {asset}
                    </span>
                  ))}
                </div>
              )}

              {/* Contacts */}
              <div className="mt-auto pt-4 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="truncate max-w-[120px]">{lead.email}</span>
                  </div>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-2 text-slate-600 text-sm">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-3 pt-2">
                  {renderSocialBadges(lead.socials)}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleGenerateDemoSite(lead, e)}
                      className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                      title="Gerar Site IA"
                    >
                      <LayoutTemplate className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedLeadForMessage(lead); }}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      title="Gerar Copy IA"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
