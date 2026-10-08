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

export const Balao: React.FC<{ m: RoboMensagem }> = ({ m }) => {
  const meu = m.de !== 'contato';
  return (
    <div className={`flex ${meu ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
          m.de === 'contato'
            ? 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
            : m.de === 'robo'
              ? 'bg-blue-50 border border-blue-100 text-slate-800 rounded-br-md'
              : 'bg-blue-600 text-white rounded-br-md'
        }`}
      >
        {m.de === 'robo' && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 mb-0.5">
            <Bot className="w-3 h-3" /> robô
          </span>
        )}
        {m.de === 'voce' && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-100 mb-0.5">
            <UserRound className="w-3 h-3" /> você
          </span>
        )}
        {m.texto}
        {m.em && (
          <span className={`block text-[10px] mt-1 text-right ${m.de === 'voce' ? 'text-blue-100' : 'text-slate-400'}`}>
            {quando(m.em)}
          </span>
        )}
      </div>
    </div>
  );
};
