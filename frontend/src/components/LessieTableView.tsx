import React, { useState } from 'react';
import { 
  Table as TableIcon, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Sparkles, 
  Send, 
  Check, 
  CheckCircle2,
  Mail
} from 'lucide-react';
import type { LeadItem } from '../types';
import { useApp } from '../context/AppContext';

export const LessieTableView: React.FC = () => {
  const { leads, setSelectedLeadForMessage, performLeadSearch, currentNiche, currentLocation, setSelectedProfileLead } = useApp() as any;
  
  const [isGroup1Open, setIsGroup1Open] = useState(true);
  const [isGroup2Open, setIsGroup2Open] = useState(true);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);

  const copyEmail = (email: string, id: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmailId(id);
    setTimeout(() => setCopiedEmailId(null), 2000);
  };

  const fullyMatched = leads.slice(0, Math.ceil(leads.length * 0.6));
  const partiallyMatched = leads.slice(Math.ceil(leads.length * 0.6));

  const renderSocialBadges = (socials: LeadItem['socials']) => {
    return (
      <div className="flex items-center gap-1.5 notranslate" translate="no">
        {socials.instagram && (
          <a
            href={socials.instagram}
            target="_blank"
            rel="noreferrer"
            className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm hover:scale-110 transition-transform"
            title="Instagram"
          >
            ig
          </a>
        )}
        {socials.linkedin && (
          <a
            href={socials.linkedin}
            target="_blank"
            rel="noreferrer"
            className="w-6 h-6 rounded-full bg-[#0077b5] flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm hover:scale-110 transition-transform"
            title="LinkedIn"
          >
            in
          </a>
        )}
        {socials.tiktok && (
          <a
            href={socials.tiktok}
            target="_blank"
            rel="noreferrer"
            className="w-6 h-6 rounded-full bg-black border border-zinc-700 flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm hover:scale-110 transition-transform"
            title="TikTok"
          >
            tk
          </a>
        )}
        {socials.facebook && (
          <a
            href={socials.facebook}
            target="_blank"
            rel="noreferrer"
            className="w-6 h-6 rounded-full bg-[#1877f2] flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm hover:scale-110 transition-transform"
            title="Facebook"
          >
            fb
          </a>
        )}
        {socials.x_twitter && (
          <a
            href={socials.x_twitter}
            target="_blank"
            rel="noreferrer"
            className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm hover:scale-110 transition-transform"
            title="X (Twitter)"
          >
            𝕏
          </a>
        )}
        {socials.reddit && (
          <a
            href={socials.reddit}
            target="_blank"
            rel="noreferrer"
            className="w-6 h-6 rounded-full bg-[#ff4500] flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm hover:scale-110 transition-transform"
            title="Reddit"
          >
            r/
          </a>
        )}
      </div>
    );
  };

  const renderLeadRow = (lead: LeadItem, index: number) => (
    <tr 
      key={lead.id} 
      onClick={() => setSelectedProfileLead(lead)}
      className="border-b border-[#18181b] hover:bg-zinc-950/90 transition-colors text-sm group cursor-pointer"
    >
      {/* # Index */}
      <td className="p-4 text-zinc-500 font-mono text-center w-12 text-sm">{index + 1}</td>

      {/* Name & Role */}
      <td className="p-4">
        <div className="flex items-center gap-3">
          <img src={lead.avatar} alt={lead.name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-zinc-800" />
          <div className="min-w-0">
            <div className="font-semibold text-zinc-100 truncate flex items-center gap-1.5 text-[15px]">
              {lead.name}
              {lead.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            </div>
            <div className="text-xs text-zinc-500 truncate mt-0.5 font-medium">{lead.role} • {lead.company}</div>
          </div>
        </div>
      </td>

      {/* Social Links Badges */}
      <td className="p-4" onClick={(e) => e.stopPropagation()}>
        {renderSocialBadges(lead.socials)}
      </td>

      {/* Email / Verification */}
      <td className="p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => copyEmail(lead.email, lead.id)}
            className="px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs font-mono flex items-center gap-2 transition-colors"
            title="Copiar e-mail verificado"
          >
            {copiedEmailId === lead.id ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado!</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5 text-zinc-500" />
                <span>Verificar em...</span>
                <span className="text-zinc-500 text-[11px]">({lead.email.split('@')[0]})</span>
              </>
            )}
          </button>
        </div>
      </td>

      {/* Actions */}
      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setSelectedLeadForMessage(lead)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            title="Gerar Copy Personalizada com IA"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Copy IA</span>
          </button>
          <button
            onClick={() => setSelectedLeadForMessage(lead)}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            title="Disparar Mensagem Direta"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Disparar</span>
          </button>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="w-full flex flex-col h-full bg-[#000000] border-l border-[#18181b]">
      {/* Top Header Toolbar */}
      <div className="h-12 px-4 border-b border-[#18181b] flex items-center justify-between bg-[#050505]">
        <div className="flex items-center gap-2">
          <button className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-1.5">
            <TableIcon className="w-3.5 h-3.5 text-zinc-400" />
            <span>Tabela</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold">
            {leads.length} na lista
          </span>
        </div>
      </div>

      {/* Grouped Accordions & Table Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Group 1: Completamente Qualificados */}
        <div className="space-y-2">
          <button
            onClick={() => setIsGroup1Open(!isGroup1Open)}
            className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
          >
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold text-[11px]">
              Completamente Qualificados
            </span>
            <span className="text-zinc-500 font-normal">{fullyMatched.length} registros</span>
            {isGroup1Open ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
          </button>

          {isGroup1Open && (
            <div className="lessie-panel rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-[#050505] text-zinc-500 font-semibold border-b border-[#18181b] text-[11px]">
                  <tr>
                    <th className="p-3 text-center w-10">#</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Link</th>
                    <th className="p-3">Email</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fullyMatched.map((lead: LeadItem, idx: number) => renderLeadRow(lead, idx))}
                </tbody>
              </table>

              {/* Bottom Row Action */}
              <div className="p-2 bg-[#050505] border-t border-[#18181b]">
                <button
                  onClick={() => performLeadSearch(currentNiche, currentLocation, 5)}
                  className="px-3 py-1 text-xs text-zinc-400 hover:text-white flex items-center gap-1.5 font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Encontre mais</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Group 2: Parcialmente Qualificados */}
        {partiallyMatched.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setIsGroup2Open(!isGroup2Open)}
              className="flex items-center gap-2 text-xs font-semibold text-zinc-300 hover:text-white transition-colors"
            >
              <span className="px-2.5 py-0.5 rounded-full bg-amber-950 border border-amber-800 text-amber-400 font-bold text-[11px]">
                Parcialmente Qualificados
              </span>
              <span className="text-zinc-500 font-normal">{partiallyMatched.length} registros</span>
              {isGroup2Open ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
            </button>

            {isGroup2Open && (
              <div className="lessie-panel rounded-xl overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-[#050505] text-zinc-500 font-semibold border-b border-[#18181b] text-[11px]">
                    <tr>
                      <th className="p-3 text-center w-10">#</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Link</th>
                      <th className="p-3">Email</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partiallyMatched.map((lead: LeadItem, idx: number) => renderLeadRow(lead, fullyMatched.length + idx))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
