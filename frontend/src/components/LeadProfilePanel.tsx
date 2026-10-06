import React from 'react';
import { useApp } from '../context/AppContext';
import {
  InstagramIcon, WhatsAppIcon, FacebookIcon, LinkedInIcon, TikTokIcon, XIcon, GoogleMapsIcon,
} from './BrandIcons';
import { RaioXLead, Secao } from './RaioXLead';
import {
  X, MapPin, CheckCircle2, Sparkles, Target, Send, Globe, Phone, Mail, Star, Clock, Gauge, Building2,
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

// Cores do banner quando o negócio não tem foto: uma por nome, sempre a mesma.
const BANNERS = [
  'from-indigo-600 to-sky-500', 'from-emerald-600 to-teal-500', 'from-rose-600 to-orange-500',
  'from-violet-600 to-fuchsia-500', 'from-amber-600 to-yellow-500', 'from-cyan-700 to-blue-500',
];
const bannerDe = (nome: string) => BANNERS[[...nome].reduce((a, c) => a + c.charCodeAt(0), 0) % BANNERS.length];
const iniciaisDe = (nome: string) => nome.split(/\s+/).filter(p => p.length > 2).slice(0, 2).map(p => p[0]).join('').toUpperCase() || nome.slice(0, 2).toUpperCase();

// 551431750177 -> +55 (14) 3175-0177
const telefoneBonito = (t: string): string => {
  const d = String(t || '').replace(/\D/g, '');
  const m = /^55(\d{2})(9?\d{4})(\d{4})$/.exec(d);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : t;
};

const Etiqueta: React.FC<{ children: React.ReactNode; cor?: 'slate' | 'emerald' }> = ({ children, cor = 'slate' }) => (
  <span
    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
      cor === 'emerald'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : 'bg-slate-100 border-slate-200 text-slate-700'
    }`}
  >
    {children}
  </span>
);

const Indicador: React.FC<{ icone: React.ReactNode; valor: string; rotulo: string; tom?: 'ok' | 'atencao' | 'ruim' | 'neutro' }> = ({ icone, valor, rotulo, tom = 'neutro' }) => (
  <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 min-w-0">
    <div className="flex items-center gap-1.5 text-slate-500">{icone}<span className="text-[10px] uppercase tracking-wider truncate">{rotulo}</span></div>
    <p className={`text-lg font-bold leading-tight mt-0.5 ${
      tom === 'ok' ? 'text-emerald-700' : tom === 'atencao' ? 'text-amber-700' : tom === 'ruim' ? 'text-red-700' : 'text-slate-900'}`}>{valor}</p>
  </div>
);

export const LeadProfilePanel: React.FC = () => {
  const { selectedProfileLead, setSelectedProfileLead, setSelectedLeadForMessage } = useApp() as any;

  if (!selectedProfileLead) return null;

  const lead = selectedProfileLead;
  const socials = lead.socials || {};
  const temFoto = typeof lead.avatar === 'string' && lead.avatar.startsWith('/api/place-photo');
  const nota = typeof lead.rating === 'number' ? lead.rating : 0;
  const qs = typeof lead.site_quality === 'number' ? lead.site_quality : null;
  const emails: string[] = Array.from(new Set([lead.email, ...(lead.all_emails || [])].filter(Boolean)));

  const redes = [
    { url: socials.linkedin, Icone: LinkedInIcon, cor: 'bg-[#0A66C2]', nome: 'LinkedIn' },
    { url: socials.instagram, Icone: InstagramIcon, cor: 'bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600', nome: 'Instagram' },
    { url: socials.facebook, Icone: FacebookIcon, cor: 'bg-[#0866FF]', nome: 'Facebook' },
    { url: lead.whatsapp && lead.phone ? `https://wa.me/${lead.phone}` : null, Icone: WhatsAppIcon, cor: 'bg-[#25D366]', nome: 'WhatsApp' },
    { url: socials.x_twitter, Icone: XIcon, cor: 'bg-black', nome: 'X' },
    { url: socials.tiktok, Icone: TikTokIcon, cor: 'bg-black', nome: 'TikTok' },
  ].filter(r => r.url);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={() => setSelectedProfileLead(null)}
      />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-slate-50 border-l border-slate-200 shadow-2xl flex flex-col animate-slide-in-right">

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">

          {/* Capa: a foto do negócio quando o Google entrega; senão, um banner com as iniciais. */}
          <div className="relative h-44 shrink-0">
            {temFoto ? (
              <img src={lead.avatar} alt={lead.name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className={`absolute inset-0 bg-gradient-to-br ${bannerDe(lead.name || '')} flex items-center justify-center`}>
                <span className="text-6xl font-black text-white/25 select-none tracking-tight">{iniciaisDe(lead.name || '')}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
            <button
              onClick={() => setSelectedProfileLead(null)}
              aria-label="Fechar"
              className="absolute top-3 right-3 p-2 rounded-full bg-white/90 text-slate-700 hover:bg-white shadow"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute left-5 right-5 bottom-4 text-white">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight leading-tight drop-shadow">{lead.name}</h1>
                {lead.verified && <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" aria-label="Verificado" />}
              </div>
              <p className="text-sm text-white/90 mt-0.5">{lead.role || lead.niche}</p>
            </div>
          </div>

          <div className="p-5 space-y-7">

            {/* Indicadores */}
            <div className="grid grid-cols-3 gap-2">
              <Indicador icone={<Star className="w-3 h-3" />} rotulo="Google"
                valor={nota ? `${nota.toFixed(1).replace('.', ',')} · ${lead.rating_count || 0}` : 'sem nota'}
                tom={nota >= 4.5 ? 'ok' : nota >= 4 ? 'atencao' : nota ? 'ruim' : 'neutro'} />
              <Indicador icone={<Globe className="w-3 h-3" />} rotulo="Site"
                valor={qs !== null ? `${qs}/100` : lead.site_status === 'none' ? 'nenhum' : '—'}
                tom={qs === null ? (lead.site_status === 'none' ? 'ruim' : 'neutro') : qs >= 75 ? 'ok' : qs >= 45 ? 'atencao' : 'ruim'} />
              <Indicador icone={<Gauge className="w-3 h-3" />} rotulo="Contato"
                valor={typeof lead.contactability === 'number' ? `${lead.contactability}%` : '—'}
                tom={typeof lead.contactability === 'number' ? (lead.contactability >= 60 ? 'ok' : 'atencao') : 'neutro'} />
            </div>

            {/* Contatos e redes */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {lead.location && (
                  <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-slate-200 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />{lead.location}
                  </span>
                )}
                {lead.phone && (
                  <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-slate-200 text-emerald-800 font-medium">
                    <Phone className="w-3.5 h-3.5" />{telefoneBonito(lead.phone)}
                  </span>
                )}
                {emails.map(e => (
                  <a key={e} href={`mailto:${e}`} className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-slate-200 text-blue-700 font-medium break-all">
                    <Mail className="w-3.5 h-3.5 shrink-0" />{e}
                  </a>
                ))}
                {(lead.phones_extra || []).map((t: string) => (
                  <span key={t} className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-slate-200 text-slate-700">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />{telefoneBonito(t)}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {redes.map(({ url, Icone, cor, nome }) => (
                  <a key={nome} href={url as string} target="_blank" rel="noreferrer" title={nome}
                    className={`w-8 h-8 rounded-full ${cor} flex items-center justify-center text-white shadow-sm transition-transform hover:scale-110`}>
                    <Icone className="w-4 h-4" title={nome} />
                  </a>
                ))}
                {socials.website && (
                  <a href={socials.website} target="_blank" rel="noreferrer" title="Site oficial"
                    className="w-8 h-8 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-700 transition-transform hover:scale-110">
                    <Globe className="w-4 h-4" />
                  </a>
                )}
                {lead.maps_url && (
                  <a href={lead.maps_url} target="_blank" rel="noreferrer" title="Ver no Google Maps"
                    className="w-8 h-8 rounded-full bg-white border border-slate-300 flex items-center justify-center text-[#4285F4] transition-transform hover:scale-110">
                    <GoogleMapsIcon className="w-4 h-4" title="Google Maps" />
                  </a>
                )}
              </div>
            </div>

            {/* Leitura comercial */}
            <Secao icone={<Sparkles className="w-3.5 h-3.5 text-indigo-600" />} titulo="Leitura comercial">
              <p className="text-sm text-slate-800 leading-relaxed">
                {lead.diagnosis || lead.ai_summary || lead.bio || 'Sem leitura disponível para este lead.'}
              </p>
            </Secao>

            {/* Dossiê: empresa, pessoas, dores, abordagem, Google Meu Negócio */}
            <RaioXLead lead={lead} />

            {/* Ganchos verificados */}
            {!!(lead.hooks || []).length && (
              <Secao icone={<Target className="w-3.5 h-3.5 text-emerald-600" />} titulo="Por onde abrir a conversa">
                <ul className="space-y-2">
                  {(lead.hooks || []).map((g: string, i: number) => (
                    <li key={i} className="bg-white border border-slate-200 rounded-xl p-3 text-[13px] text-slate-800 leading-relaxed flex gap-2.5">
                      <span className="text-emerald-700 font-bold shrink-0">{i + 1}.</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
                {lead.best_channel && (
                  <p className="text-[11px] text-slate-600">
                    Canal com mais chance de ser lido: <strong className="text-slate-900">{CANAIS[lead.best_channel] || lead.best_channel}</strong>
                  </p>
                )}
              </Secao>
            )}

            {/* Presença digital */}
            {(lead.site_status || lead.site_quality !== undefined) && (
              <Secao icone={<Globe className="w-3.5 h-3.5 text-blue-600" />} titulo="Presença digital hoje">
                <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                  <p className="text-[13px] text-slate-800">{SITUACAO[lead.site_status] || 'Situação desconhecida'}</p>
                  {!!(lead.site_issues || []).length && (
                    <ul className="space-y-1">
                      {(lead.site_issues || []).map((x: string, i: number) => (
                        <li key={i} className="text-[12px] text-slate-700 flex gap-2"><span className="text-red-600">•</span><span>{x}</span></li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {lead.site_platform && <Etiqueta>{lead.site_platform}</Etiqueta>}
                    {lead.site_responsive === false && <Etiqueta>não é responsivo</Etiqueta>}
                    {lead.site_https === false && <Etiqueta>sem HTTPS</Etiqueta>}
                    {!!lead.site_load_ms && <Etiqueta>{(lead.site_load_ms / 1000).toFixed(1)}s para abrir</Etiqueta>}
                    {lead.site_has_booking && <Etiqueta>tem agendamento</Etiqueta>}
                  </div>
                </div>
              </Secao>
            )}

            {/* O que o Google mostra */}
            {(lead.google_description || lead.price_level || lead.opening_hours_week?.length
              || lead.open_now !== undefined || lead.place_types?.length) && (
              <Secao icone={<Building2 className="w-3.5 h-3.5 text-amber-600" />} titulo="O que o Google mostra">
                {lead.google_description && <p className="text-[13px] text-slate-800 leading-relaxed">{lead.google_description}</p>}
                <div className="flex flex-wrap gap-1.5">
                  {lead.open_now === true && <Etiqueta cor="emerald">aberto agora</Etiqueta>}
                  {lead.open_now === false && <Etiqueta>fechado agora</Etiqueta>}
                  {lead.price_level && <Etiqueta>faixa {lead.price_level}</Etiqueta>}
                  {lead.neighborhood && <Etiqueta>{lead.neighborhood}</Etiqueta>}
                  {(lead.place_types || []).slice(0, 3).map((t: string) => <Etiqueta key={t}>{t}</Etiqueta>)}
                </div>
                {!!(lead.opening_hours_week || []).length && (
                  <details className="text-[12px] text-slate-700">
                    <summary className="cursor-pointer text-slate-600 hover:text-slate-900 flex items-center gap-1.5 w-fit"><Clock className="w-3.5 h-3.5" />Horário da semana</summary>
                    <ul className="mt-2 space-y-0.5">
                      {(lead.opening_hours_week || []).map((h: string, i: number) => <li key={i}>{h}</li>)}
                    </ul>
                  </details>
                )}
              </Secao>
            )}

            {/* Avaliações com texto */}
            {!!(lead.reviews_sample || []).length && (
              <Secao icone={<Sparkles className="w-3.5 h-3.5 text-yellow-600" />} titulo="O que os clientes escreveram">
                {(lead.reviews_sample || []).map((r: any, i: number) => (
                  <blockquote key={i} className="bg-white border border-slate-200 rounded-xl p-3">
                    <p className="text-[13px] text-slate-800 italic leading-relaxed">“{r.text}”</p>
                    <footer className="text-[11px] text-slate-600 mt-1.5">{r.rating ? `${r.rating}★` : ''} {r.when || ''}</footer>
                  </blockquote>
                ))}
              </Secao>
            )}
          </div>
        </div>

        {/* Rodapé fixo */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0 notranslate" translate="no">
          <button
            onClick={() => setSelectedLeadForMessage(lead)}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span>Disparar</span>
          </button>
        </div>

      </div>
    </>
  );
};
