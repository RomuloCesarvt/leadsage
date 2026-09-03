import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Mail, 
  Phone, 
  Globe, 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  Building2, 
  MapPin, 
  Star
} from 'lucide-react';
import type { LeadItem } from '../types';
import { useApp } from '../context/AppContext';
import { InstagramIcon, LinkedInIcon } from './BrandIcons';

export const LeadCard: React.FC<{ lead: LeadItem }> = ({ lead }) => {
  const { setSelectedLeadForMessage } = useApp();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Enviado':
        return (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Enviado
          </span>
        );
      case 'Mensagem Gerada':
        return (
          <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold">
            Draft IA Criado
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-medium">
            Novo Lead
          </span>
        );
    }
  };

  return (
    <div className="glass-card p-5 rounded-2xl flex flex-col justify-between relative group overflow-hidden">
      {/* Top Header Card */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={lead.avatar}
                alt={lead.name}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-700 group-hover:ring-indigo-500/60 transition-all shadow-md"
              />
              {lead.verified && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 p-0.5 rounded-full shadow" title="Perfil Verificado">
                  <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500 text-slate-950" />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-base leading-tight group-hover:text-indigo-300 transition-colors">
                  {lead.name}
                </h3>
              </div>
              <p className="text-xs font-semibold text-indigo-400 mt-0.5">{lead.role}</p>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate max-w-[160px]">{lead.company}</span>
              </div>
            </div>
          </div>

          {/* Quality Score Badge */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="px-2.5 py-1 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center gap-1 shadow-sm">
              <Star className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
              <span className="text-xs font-extrabold text-emerald-400">{lead.quality_score}%</span>
            </div>
            {getStatusBadge(lead.outreach_status)}
          </div>
        </div>

        {/* Location & Bio */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3 bg-slate-900/40 p-2 rounded-lg border border-slate-800/50">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="font-medium text-slate-300">{lead.location}</span>
        </div>

        {lead.bio && (
          <p className="text-xs text-slate-400 line-clamp-2 italic mb-4 leading-relaxed">
            "{lead.bio}"
          </p>
        )}

        {/* Contact Info Box */}
        <div className="space-y-2 mb-4 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          {/* Email */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300 truncate">
              <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate font-mono">{lead.email}</span>
            </div>
            <button
              onClick={() => copyToClipboard(lead.email, 'email')}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              title="Copiar E-mail"
            >
              {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Phone */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-300 truncate">
              <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate font-mono">{lead.phone}</span>
            </div>
            <button
              onClick={() => copyToClipboard(lead.phone, 'phone')}
              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              title="Copiar Telefone"
            >
              {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-500">Redes:</span>
            {lead.socials.linkedin && (
              <a
                href={lead.socials.linkedin}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center gap-1 font-semibold text-[10px]"
                title="LinkedIn"
              >
                <LinkedInIcon className="w-3.5 h-3.5" title="LinkedIn" /> LinkedIn
              </a>
            )}
            {lead.socials.instagram && (
              <a
                href={lead.socials.instagram}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-colors flex items-center gap-1 font-semibold text-[10px]"
                title="Instagram"
              >
                <InstagramIcon className="w-3.5 h-3.5" title="Instagram" /> Instagram
              </a>
            )}
            {lead.socials.website && (
              <a
                href={lead.socials.website}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                title="Website Oficial"
              >
                <Globe className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
        <button
          onClick={() => setSelectedLeadForMessage(lead)}
          className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Criar Copy IA</span>
        </button>
        <button
          onClick={() => setSelectedLeadForMessage(lead)}
          className="py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Disparar</span>
        </button>
      </div>
    </div>
  );
};
