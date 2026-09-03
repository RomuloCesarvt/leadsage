import React from 'react';
import { Globe, Mail, Phone } from 'lucide-react';
import {
  InstagramIcon,
  WhatsAppIcon,
  FacebookIcon,
  LinkedInIcon,
} from './BrandIcons';
import type { LeadItem } from '../types';

/**
 * Presença digital do lead.
 *
 * Antes isto era uma coluna de texto com emoji — "Instagram ✅",
 * "Sem IG ❌", "Website ✅" — empilhados um sobre o outro.
 *
 * Agora cada canal é um selo com o ícone real da marca: colorido e
 * clicável quando o lead tem, apagado quando não tem. O que falta é
 * justamente a oportunidade de venda, então o estado "ausente" precisa
 * ser legível, e não gritante.
 */

type Canal = {
  chave: string;
  rotulo: string;
  Icone: React.FC<{ className?: string; title?: string }>;
  url?: string | null;
  presente: boolean;
  /** classes aplicadas quando o canal existe */
  cor: string;
};

function montarCanais(lead: LeadItem): Canal[] {
  const site = lead.website || lead.socials?.website || '';
  const telefone = (lead.phone || '').replace(/\D/g, '');

  return [
    {
      chave: 'website',
      rotulo: site ? 'Site próprio' : 'Sem site',
      Icone: Globe as any,
      url: site || null,
      presente: Boolean(site),
      cor: 'text-sky-600 bg-sky-50 border-sky-200 hover:bg-sky-100',
    },
    {
      chave: 'instagram',
      rotulo: lead.socials?.instagram ? 'Instagram' : 'Sem Instagram',
      Icone: InstagramIcon,
      url: lead.socials?.instagram,
      presente: Boolean(lead.socials?.instagram),
      cor: 'text-[#E4405F] bg-pink-50 border-pink-200 hover:bg-pink-100',
    },
    {
      chave: 'whatsapp',
      rotulo: lead.whatsapp ? 'WhatsApp' : 'Sem WhatsApp',
      Icone: WhatsAppIcon,
      url: lead.whatsapp && telefone ? `https://wa.me/${telefone}` : null,
      presente: Boolean(lead.whatsapp),
      cor: 'text-[#25D366] bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    },
    {
      chave: 'facebook',
      rotulo: lead.socials?.facebook ? 'Facebook' : 'Sem Facebook',
      Icone: FacebookIcon,
      url: lead.socials?.facebook,
      presente: Boolean(lead.socials?.facebook),
      cor: 'text-[#0866FF] bg-blue-50 border-blue-200 hover:bg-blue-100',
    },
    {
      chave: 'linkedin',
      rotulo: lead.socials?.linkedin ? 'LinkedIn' : 'Sem LinkedIn',
      Icone: LinkedInIcon,
      url: lead.socials?.linkedin,
      presente: Boolean(lead.socials?.linkedin),
      cor: 'text-[#0A66C2] bg-sky-50 border-sky-200 hover:bg-sky-100',
    },
    {
      chave: 'email',
      rotulo: lead.email ? lead.email : 'Sem e-mail',
      Icone: Mail as any,
      url: lead.email ? `mailto:${lead.email}` : null,
      presente: Boolean(lead.email),
      cor: 'text-violet-600 bg-violet-50 border-violet-200 hover:bg-violet-100',
    },
    {
      chave: 'telefone',
      rotulo: telefone ? 'Telefone' : 'Sem telefone',
      Icone: Phone as any,
      url: telefone ? `tel:+${telefone}` : null,
      presente: Boolean(telefone),
      cor: 'text-slate-700 bg-slate-100 border-slate-200 hover:bg-slate-200',
    },
  ];
}

const AUSENTE = 'text-slate-300 bg-slate-50 border-slate-200 border-dashed';

/** Fileira compacta de selos — para a tabela e o card. */
export const DigitalPresence: React.FC<{
  lead: LeadItem;
  canais?: string[];
  tamanho?: 'sm' | 'md';
}> = ({ lead, canais, tamanho = 'sm' }) => {
  const lista = montarCanais(lead).filter(c => !canais || canais.includes(c.chave));
  const box = tamanho === 'sm' ? 'w-7 h-7' : 'w-9 h-9';
  const icone = tamanho === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {lista.map(({ chave, rotulo, Icone, url, presente, cor }) => {
        const classes = `${box} rounded-lg border flex items-center justify-center transition-colors ${
          presente ? cor : AUSENTE
        }`;

        if (presente && url) {
          return (
            <a
              key={chave}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              title={rotulo}
              className={classes}
            >
              <Icone className={icone} title={rotulo} />
            </a>
          );
        }

        return (
          <span key={chave} title={rotulo} className={classes}>
            <Icone className={icone} title={rotulo} />
          </span>
        );
      })}
    </div>
  );
};

/** Versão detalhada, com rótulo e leitura da oportunidade. */
export const DigitalPresenceDetail: React.FC<{ lead: LeadItem }> = ({ lead }) => {
  const canais = montarCanais(lead);
  const faltando = canais.filter(c => !c.presente && ['website', 'instagram'].includes(c.chave));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {canais.map(({ chave, rotulo, Icone, url, presente, cor }) => {
          const conteudo = (
            <>
              <span
                className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                  presente ? cor : AUSENTE
                }`}
              >
                <Icone className="w-4 h-4" />
              </span>
              <span
                className={`text-xs font-semibold truncate ${
                  presente ? 'text-slate-700' : 'text-slate-400'
                }`}
              >
                {rotulo}
              </span>
            </>
          );

          const base = 'flex items-center gap-2 p-2 rounded-xl border border-transparent';

          return presente && url ? (
            <a
              key={chave}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${base} hover:border-slate-200 hover:bg-slate-50 transition-colors`}
            >
              {conteudo}
            </a>
          ) : (
            <div key={chave} className={base}>
              {conteudo}
            </div>
          );
        })}
      </div>

      {faltando.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-xs font-semibold text-amber-800">
            Oportunidade: este negócio não tem{' '}
            {faltando.map(f => f.chave === 'website' ? 'site próprio' : 'Instagram').join(' nem ')}.
          </p>
        </div>
      )}
    </div>
  );
};
