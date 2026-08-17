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
      <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50 p-6">
        <div className="flex flex-col space-y-3">
          {filteredLeads.map((lead: LeadItem) => (
            <div 
              key={lead.id}
              onClick={() => setSelectedProfileLead(lead)}
              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
            >
              
              {/* Profile Image & Name */}
              <div className="flex items-center gap-3 md:w-1/4 shrink-0">
                <img src={lead.avatar} alt={lead.name} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-800 text-[14px] truncate flex items-center gap-1.5">
                    {lead.name}
                    {lead.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium truncate">{lead.role}</p>
                </div>
              </div>

              {/* Company Info */}
              <div className="md:w-1/4 shrink-0">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-1 truncate">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {lead.company}
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded">
                    {lead.niche}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded">
                    {lead.city}
                  </span>
                </div>
              </div>

              {/* Contacts */}
              <div className="md:w-1/4 shrink-0">
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-[150px]">{lead.email}</span>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate">{lead.phone}</span>
                  </div>
                )}
              </div>

              {/* Status / Tags */}
              <div className="md:w-[15%] shrink-0 flex flex-col gap-2">
                {lead.opportunityScore && (
                  <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded w-fit">
                    {lead.opportunityScore} Score
                  </span>
                )}
                {lead.missingDigitalAssets && lead.missingDigitalAssets.length > 0 && (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-1 rounded border border-rose-100 flex items-center w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse"></span>
                    Sem {lead.missingDigitalAssets[0]}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 md:flex-1 mt-4 md:mt-0">
                <button
                  onClick={(e) => handleGenerateDemoSite(lead, e)}
                  className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition-colors flex items-center gap-1.5"
                  title="Gerar Site IA"
                >
                  <LayoutTemplate className="w-3.5 h-3.5" />
                  <span>Site IA</span>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedLeadForMessage(lead); }}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Gerar Copy IA"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
              
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
