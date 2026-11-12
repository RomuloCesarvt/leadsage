/**
 * Pedaços de tela que as conversas dividem: ícone e nome do canal, hora e o balão de mensagem.
 */
import React from 'react';
import { Bot, Mail, UserRound } from 'lucide-react';
import { WhatsAppIcon, InstagramIcon, FacebookIcon, TelegramIcon, LinkedInIcon } from './BrandIcons';
import type { RoboCanal, RoboMensagem } from '../types';

const IconeEmail: React.FC<{ className?: string }> = ({ className }) => <Mail className={className} />;

export const ICONE_CANAL: Record<RoboCanal, React.FC<{ className?: string }>> = {
  whatsapp: WhatsAppIcon,
  instagram: InstagramIcon,
  messenger: FacebookIcon,
  telegram: TelegramIcon,
  email: IconeEmail,
  linkedin: LinkedInIcon as React.FC<{ className?: string }>,
};

export const NOME_CANAL: Record<RoboCanal, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  telegram: 'Telegram',
  email: 'E-mail',
  linkedin: 'LinkedIn',
};

export const quando = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const hoje = new Date();
  return d.toDateString() === hoje.toDateString()
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

/** Transforma os endereços (https://...) do texto em links tocáveis; o resto continua texto. */
const comLinks = (texto: string, claro: boolean): React.ReactNode[] =>
  String(texto || '').split(/(https?:\/\/[^\s]+)/g).map((parte, i) =>
    /^https?:\/\//.test(parte)
      ? <a key={i} href={parte.replace(/[.,;:!?)]+$/, '')} target="_blank" rel="noreferrer" className={`underline underline-offset-2 ${claro ? 'text-white' : 'text-blue-700'}`}>{parte}</a>
      : <React.Fragment key={i}>{parte}</React.Fragment>);

export const Balao: React.FC<{ m: RoboMensagem }> = ({ m }) => {
  const meu = m.de !== 'contato';
  return (
    <div className={`flex ${meu ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] md:max-w-[78%] min-w-0 px-3.5 py-2.5 md:py-2 rounded-2xl text-[15px] md:text-sm leading-relaxed md:leading-normal whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
          m.de === 'contato'
            ? 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
            : m.de === 'robo'
              ? 'bg-blue-50 border border-blue-100 text-slate-800 rounded-br-md'
              : 'bg-blue-600 text-white rounded-br-md'
        }`}
      >
        {m.de === 'robo' && (
          <span className="flex items-center gap-1 text-xs md:text-[10px] font-bold text-blue-600 mb-0.5">
            <Bot className="w-3 h-3" /> robô
          </span>
        )}
        {m.de === 'voce' && (
          <span className="flex items-center gap-1 text-xs md:text-[10px] font-bold text-blue-100 mb-0.5">
            <UserRound className="w-3 h-3" /> você
          </span>
        )}
        {comLinks(m.texto, m.de === 'voce')}
        {meu && m.entrega === 'falhou' && (
          <span className="block text-xs md:text-[11px] mt-1 font-semibold text-red-600">Não enviada: {m.erro || 'o WhatsApp não confirmou o envio'}</span>
        )}
        {meu && m.entrega === 'enviada' && (
          <span className={`block text-xs md:text-[10px] mt-1 text-right ${m.de === 'voce' ? 'text-blue-100' : 'text-emerald-600'}`}>✓ confirmada pelo WhatsApp</span>
        )}
        {m.em && (
          <span className={`block text-xs md:text-[10px] mt-1 text-right ${m.de === 'voce' ? 'text-blue-100' : 'text-slate-400'}`}>
            {quando(m.em)}
          </span>
        )}
      </div>
    </div>
  );
};
