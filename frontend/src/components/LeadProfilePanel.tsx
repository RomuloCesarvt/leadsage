import React from 'react';
import { useApp } from '../context/AppContext';
import {
  InstagramIcon, WhatsAppIcon, FacebookIcon, LinkedInIcon, TikTokIcon, XIcon, GoogleMapsIcon,
} from './BrandIcons';
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

const SITUACAO: Record<string, string> = {
  own: 'Tem site próprio',
  social: 'O link do perfil leva a uma rede social, não a um site',
  aggregator: 'Usa um agregador de links no lugar de site',
  whatsapp: 'O link do perfil vai direto para o WhatsApp',
  none: 'Não tem site nenhum no perfil do Google',
};

const CANAIS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'e-mail',
  instagram_direct: 'Instagram',
  linkedin_msg: 'LinkedIn',
};

const Etiqueta: React.FC<{ children: React.ReactNode; cor?: 'zinc' | 'emerald' }> = ({ children, cor = 'zinc' }) => (
  <span
    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
      cor === 'emerald'
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
    }`}
  >
    {children}
  </span>
);

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
                <span className="truncate max-w-[150px]">{lead.company}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2.5 py-1 rounded-full border border-zinc-800/50">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span className="truncate max-w-[150px]">{lead.location}</span>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2.5 py-1 rounded-full border border-zinc-800/50 text-emerald-400">
                  <span className="font-medium">{lead.phone}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-1.5 bg-zinc-900/50 px-2.5 py-1 rounded-full border border-zinc-800/50 text-blue-400">
                  <span className="font-medium truncate max-w-[150px]">{lead.email}</span>
                </div>
              )}
            </div>

            {/* Redes do lead. Antes eram as letras "in", "ig", "fb", "tk"
                dentro de circulos coloridos; agora sao os glifos reais. */}
            <div className="flex items-center gap-2 pt-2">
              {[
                { url: lead.socials.linkedin, Icone: LinkedInIcon, cor: 'bg-[#0A66C2]', nome: 'LinkedIn' },
                { url: lead.socials.instagram, Icone: InstagramIcon, cor: 'bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600', nome: 'Instagram' },
                { url: lead.socials.facebook, Icone: FacebookIcon, cor: 'bg-[#0866FF]', nome: 'Facebook' },
                { url: lead.whatsapp && lead.phone ? `https://wa.me/${lead.phone}` : null, Icone: WhatsAppIcon, cor: 'bg-[#25D366]', nome: 'WhatsApp' },
                { url: lead.socials.x_twitter, Icone: XIcon, cor: 'bg-black', nome: 'X' },
                { url: lead.socials.tiktok, Icone: TikTokIcon, cor: 'bg-black', nome: 'TikTok' },
              ]
                .filter(r => r.url)
                .map(({ url, Icone, cor, nome }) => (
                  <a
                    key={nome}
                    href={url as string}
                    target="_blank"
                    rel="noreferrer"
                    title={nome}
                    className={`w-8 h-8 rounded-full ${cor} flex items-center justify-center text-white shadow-sm transition-transform hover:scale-110`}
                  >
                    <Icone className="w-4 h-4" title={nome} />
                  </a>
                ))}

              {lead.socials.website && (
                <a
                  href={lead.socials.website}
                  target="_blank"
                  rel="noreferrer"
                  title="Site oficial"
                  className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-300 transition-transform hover:scale-110"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}

              {lead.maps_url && (
                <a
                  href={lead.maps_url}
                  target="_blank"
                  rel="noreferrer"
                  title="Ver no Google Maps"
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[#4285F4] transition-transform hover:scale-110"
                >
                  <GoogleMapsIcon className="w-4 h-4" title="Google Maps" />
                </a>
              )}
            </div>
          </div>

          {/* AI Summary */}
          <div className="space-y-3 pt-6 border-t border-zinc-900">
            <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Leitura comercial
            </h3>
            <p className="text-sm text-zinc-300 leading-relaxed font-light">
              {lead.diagnosis || lead.ai_summary || lead.bio || "Sem leitura disponível para este lead."}
            </p>
          </div>

          {/* Os ganchos sao fatos verificados, prontos para abrir a
              conversa. Substituem os tres cartoes de "Julgamento de
              Correspondencia", que mostravam texto de preenchimento
              ("O perfil demonstra interesse direto ou indireto...")
              porque os campos por tras deles nunca foram preenchidos
              por busca nenhuma. */}
          {!!(lead.hooks || []).length && (
            <div className="space-y-3 pt-6 border-t border-zinc-900">
              <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Por onde abrir a conversa
              </h3>
              <ul className="space-y-2">
                {(lead.hooks || []).map((g: string, i: number) => (
                  <li
                    key={i}
                    className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3 text-[13px] text-zinc-300 leading-relaxed flex gap-2.5"
                  >
                    <span className="text-emerald-500 font-bold shrink-0">{i + 1}.</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
              {lead.best_channel && (
                <p className="text-[11px] text-zinc-500">
                  Canal com mais chance de ser lido: <strong className="text-zinc-300">{CANAIS[lead.best_channel] || lead.best_channel}</strong>
                </p>
              )}
            </div>
          )}

          {/* Estado do site atual. E o que separa "voce precisa de um
              site" de "seu site nao abre no celular" — a segunda frase o
              dono confere em dez segundos. */}
          {(lead.site_status || lead.site_quality !== undefined) && (
            <div className="space-y-3 pt-6 border-t border-zinc-900">
              <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                Presença digital hoje
              </h3>

              <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-zinc-300">{SITUACAO[lead.site_status] || 'Situação desconhecida'}</span>
                  {typeof lead.site_quality === 'number' && (
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                        lead.site_quality >= 75 ? 'bg-emerald-500/15 text-emerald-400'
                        : lead.site_quality >= 45 ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-red-500/15 text-red-400'}`}
                    >
                      {lead.site_quality}/100
                    </span>
                  )}
                </div>

                {!!(lead.site_issues || []).length && (
                  <ul className="space-y-1 pt-1">
                    {(lead.site_issues || []).map((x: string, i: number) => (
                      <li key={i} className="text-[12px] text-zinc-400 flex gap-2">
                        <span className="text-red-400">•</span><span>{x}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {lead.site_platform && <Etiqueta>{lead.site_platform}</Etiqueta>}
                  {lead.site_responsive === false && <Etiqueta>não é responsivo</Etiqueta>}
                  {lead.site_https === false && <Etiqueta>sem HTTPS</Etiqueta>}
                  {!!lead.site_load_ms && <Etiqueta>{(lead.site_load_ms / 1000).toFixed(1)}s para abrir</Etiqueta>}
                  {lead.site_has_booking && <Etiqueta>tem agendamento</Etiqueta>}
                </div>
              </div>
            </div>
          )}

          {/* O que o Google sabe do negocio. Estava tudo na resposta da
              API e nada aparecia na tela. */}
          {(lead.google_description || lead.price_level || lead.opening_hours_week?.length
            || lead.open_now !== undefined || lead.place_types?.length) && (
            <div className="space-y-3 pt-6 border-t border-zinc-900">
              <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                O que o Google mostra
              </h3>

              {lead.google_description && (
                <p className="text-[13px] text-zinc-300 leading-relaxed">{lead.google_description}</p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {lead.open_now === true && <Etiqueta cor="emerald">aberto agora</Etiqueta>}
                {lead.open_now === false && <Etiqueta>fechado agora</Etiqueta>}
                {lead.price_level && <Etiqueta>faixa {lead.price_level}</Etiqueta>}
                {lead.neighborhood && <Etiqueta>{lead.neighborhood}</Etiqueta>}
                {(lead.place_types || []).slice(0, 3).map((t: string) => <Etiqueta key={t}>{t}</Etiqueta>)}
              </div>

              {!!(lead.opening_hours_week || []).length && (
                <details className="text-[12px] text-zinc-400">
                  <summary className="cursor-pointer text-zinc-500 hover:text-zinc-300">Horário da semana</summary>
                  <ul className="mt-2 space-y-0.5">
                    {(lead.opening_hours_week || []).map((h: string, i: number) => <li key={i}>{h}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* Avaliacoes com texto: e delas que sai a frase que faz o dono
              responder ("um cliente seu escreveu isto"). */}
          {!!(lead.reviews_sample || []).length && (
            <div className="space-y-3 pt-6 border-t border-zinc-900">
              <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                O que os clientes escreveram
              </h3>
              {(lead.reviews_sample || []).map((r: any, i: number) => (
                <blockquote key={i} className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3">
                  <p className="text-[13px] text-zinc-300 italic leading-relaxed">“{r.text}”</p>
                  <footer className="text-[11px] text-zinc-500 mt-1.5">
                    {r.rating ? `${r.rating}★` : ''} {r.when || ''}
                  </footer>
                </blockquote>
              ))}
            </div>
          )}

          {/* Contatos extras achados no site do proprio lead. */}
          {(!!(lead.all_emails || []).length || !!(lead.phones_extra || []).length) && (
            <div className="space-y-2 pt-6 border-t border-zinc-900 pb-4">
              <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                Outros contatos encontrados
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(lead.all_emails || []).map((e: string) => <Etiqueta key={e}>{e}</Etiqueta>)}
                {(lead.phones_extra || []).map((t: string) => <Etiqueta key={t}>+{t}</Etiqueta>)}
              </div>
            </div>
          )}
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
