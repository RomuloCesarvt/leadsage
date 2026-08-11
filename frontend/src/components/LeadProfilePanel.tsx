import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  MapPin, 
  Briefcase, 
  Building2, 
  CheckCircle2,
  Sparkles,
  Target,
  UserPlus,
  Send,
  Globe
} from 'lucide-react';

export const LeadProfilePanel: React.FC = () => {
  const { selectedProfileLead, setSelectedProfileLead, setSelectedLeadForMessage } = useApp() as any;

  if (!selectedProfileLead) return null;

  const lead = selectedProfileLead;

  const handleDisparar = () => {
    setSelectedLeadForMessage(lead);
  };

  const handleAddToList = () => {
    alert(`Lead ${lead.name} adicionado à lista!`);
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => setSelectedProfileLead(null)}
      />
      
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#050505] border-l border-[#18181b] shadow-2xl flex flex-col animate-slide-in-right">
        
        <div className="h-14 px-4 border-b border-[#18181b] flex items-center justify-between shrink-0 bg-[#000000]">
          <h2 className="text-sm font-semibold text-zinc-200">Perfil do Lead</h2>
          <button 
            onClick={() => setSelectedProfileLead(null)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-8 custom-scrollbar">
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <img 
                src={lead.avatar} 
                alt={lead.name} 
                className="w-24 h-24 rounded-full object-cover border border-zinc-800 shadow-xl"
              />
              {lead.verified && (
                <div className="absolute bottom-0 right-0 bg-[#050505] rounded-full p-0.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
              )}
            </div>
            
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight">{lead.name}</h1>
              <p className="text-sm text-zinc-400 font-medium mt-1">{lead.role}</p>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-2 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2.5 py-1 rounded-full border border-zinc-800/50">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>{lead.company}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2.5 py-1 rounded-full border border-zinc-800/50">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>{lead.location}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 notranslate" translate="no">
              {lead.socials.linkedin && (
                <a href={lead.socials.linkedin} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-[#0077b5] flex items-center justify-center text-white text-[10px] font-bold shadow-sm transition-transform hover:scale-110">
                  in
                </a>
              )}
              {lead.socials.instagram && (
                <a href={lead.socials.instagram} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm transition-transform hover:scale-110">
                  ig
                </a>
              )}
              {lead.socials.facebook && (
                <a href={lead.socials.facebook} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-[#1877f2] flex items-center justify-center text-white text-[10px] font-bold shadow-sm transition-transform hover:scale-110">
                  fb
                </a>
              )}
              {lead.socials.website && (
                <a href={lead.socials.website} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-300 transition-transform hover:scale-110">
                  <Globe className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* AI Summary */}
          <div className="space-y-3 pt-6 border-t border-zinc-900">
            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Resumo IA
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed font-light">
              {lead.ai_summary || lead.bio || "Resumo não disponível."}
            </p>
          </div>

          {/* Match Criteria */}
          <div className="space-y-4 pt-6 border-t border-zinc-900">
            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              Julgamento de Correspondência
            </h3>
            
            <div className="space-y-4">
              <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Intenção (Intent)</h4>
                    <p className="text-[13px] text-zinc-400 mt-1 leading-relaxed">
                      {lead.match_intent || "O perfil demonstra interesse direto ou indireto relacionado à sua oferta."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Localização</h4>
                    <p className="text-[13px] text-zinc-400 mt-1 leading-relaxed">
                      {lead.match_location || `Localizado em ${lead.location}, condizente com a pesquisa.`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold text-zinc-200">Perfil de Negócio (Business)</h4>
                    <p className="text-[13px] text-zinc-400 mt-1 leading-relaxed">
                      {lead.match_business || `Empresa alvo: ${lead.company}.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Experience */}
          <div className="space-y-3 pt-6 border-t border-zinc-900 pb-4">
            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              Experiência Profissional
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed font-light">
              {lead.experience || "Informações de experiência profissional extraídas do perfil."}
            </p>
          </div>
        </div>

        {/* Fixed Footer CTAs */}
        <div className="p-4 bg-[#050505] border-t border-[#18181b] shrink-0 notranslate" translate="no">
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddToList}
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add à Lista</span>
            </button>
            
            <button
              onClick={handleDisparar}
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <Send className="w-4 h-4" />
              <span>Disparar</span>
            </button>
          </div>
        </div>

      </div>
    </>
  );
};
