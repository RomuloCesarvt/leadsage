/**
 * O que o cartão do pipeline mostra além do nome: etiquetas, ações rápidas e quem atende o lead.
 * Lógica pura (sem React) para poder ser testada: a tela só desenha o que sai daqui.
 */
import type { LeadItem } from '../types';

export interface Agente { id: string; rotulo: string; descricao: string }

/** Os mesmos do servidor (backend/app/agentes.py); a lista do servidor vale quando chega, esta é a reserva. */
export const AGENTES_PADRAO: Agente[] = [
  { id: 'robo', rotulo: 'Robô padrão', descricao: 'Atende como está configurado em Robô → Comportamento.' },
  { id: 'consultivo', rotulo: 'Robô consultivo', descricao: 'Pergunta antes de propor e conduz com calma. Bom para quem decide devagar.' },
  { id: 'direto', rotulo: 'Robô direto', descricao: 'Mensagens curtas e foco no próximo passo. Bom para quem tem pouco tempo.' },
  { id: 'humano', rotulo: 'Eu atendo', descricao: 'O robô não responde este lead. Você conversa pelo WhatsApp.' },
];

export const agenteDe = (lead: Pick<LeadItem, 'agente'>, lista: Agente[] = AGENTES_PADRAO): Agente =>
  lista.find(a => a.id === lead.agente) || lista.find(a => a.id === 'robo') || AGENTES_PADRAO[0];

export type Tom = 'neutro' | 'azul' | 'verde' | 'ambar' | 'roxo';
export interface Etiqueta { texto: string; tom: Tom; dica?: string }

/** Há quanto tempo, em português curto ("agora", "há 5 min", "há 3 h", "há 2 d"). */
export const haQuanto = (iso?: string, agora: number = Date.now()): string => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const min = Math.max(0, Math.round((agora - t) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.round(min / 60)} h`;
  return `há ${Math.round(min / 1440)} d`;
};

/** Link do WhatsApp para o número do lead. Sem DDI (10 ou 11 dígitos) assume Brasil; número curto demais não vira link. */
export const linkWhatsApp = (telefone?: string, texto?: string): string => {
  const d = (telefone || '').replace(/\D/g, '');
  if (d.length < 10) return '';
  const numero = d.length <= 11 ? `55${d}` : d;
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
};

export const linkLigar = (telefone?: string): string => {
  const d = (telefone || '').replace(/\D/g, '');
  return d.length >= 8 ? `tel:+${d.length <= 11 ? `55${d}` : d}` : '';
};

/** Etiquetas do cartão, da mais importante para a menos: o que já aconteceu com o lead vem antes do que ele é. */
export const etiquetasDoCard = (lead: LeadItem, agora: number = Date.now()): Etiqueta[] => {
  const saida: Etiqueta[] = [];
  const visitas = lead.previa_visitas || 0;
  if (visitas > 0) {
    const quando = haQuanto(lead.previa_ultima, agora);
    saida.push({
      texto: visitas > 1 ? `Prévia aberta · ${visitas}x` : 'Prévia aberta',
      tom: 'verde', dica: quando ? `Última abertura ${quando}` : undefined,
    });
  }
  if (lead.pipeline_por === 'robô' && lead.pipeline_motivo) saida.push({ texto: 'Movido pelo robô', tom: 'azul', dica: lead.pipeline_motivo });
  if (lead.niche) saida.push({ texto: lead.niche, tom: 'neutro' });
  if (lead.website === undefined || lead.website === '') {
    if (lead.missingDigitalAssets?.some(a => /site/i.test(a))) saida.push({ texto: 'Sem site', tom: 'ambar' });
  }
  if (lead.rating && lead.rating >= 4.5 && (lead.rating_count || 0) >= 20) saida.push({ texto: `Nota ${lead.rating}`, tom: 'roxo', dica: `${lead.rating_count} avaliações no Google` });
  return saida;
};

/** As ações rápidas que existem para este lead (só as que têm para onde ir). */
export const acoesDoCard = (lead: LeadItem): { id: 'whatsapp' | 'ligar'; rotulo: string; href: string }[] => {
  const saida: { id: 'whatsapp' | 'ligar'; rotulo: string; href: string }[] = [];
  const wa = lead.whatsapp ? linkWhatsApp(lead.phone) : '';
  if (wa) saida.push({ id: 'whatsapp', rotulo: 'WhatsApp', href: wa });
  const tel = linkLigar(lead.phone);
  if (tel) saida.push({ id: 'ligar', rotulo: 'Ligar', href: tel });
  return saida;
};
