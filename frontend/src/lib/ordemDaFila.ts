/**
 * A lista de leads para o Disparo: quem acabou de entrar em Meus Leads vem PRIMEIRO; quem já foi trabalhado antes (fila descartada)
 * vai para o fim; e quem já recebeu disparo nem aparece.
 */
import type { LeadItem } from '../types';

const DISPARADOS = ['Enviado', 'Entregue', 'Lido', 'Respondido'];

/** O disparo deste lead já foi feito (pela marca do próprio lead). */
export const jaDisparado = (l: Pick<LeadItem, 'last_contacted_at' | 'outreach_status'>): boolean =>
  Boolean(l.last_contacted_at) || DISPARADOS.includes(l.outreach_status || '');

/** `trabalhados`: ids de leads que já tiveram algum item na fila (descartado, falhou...). Estável: sem carimbo, o último da lista vem antes. */
export const ordenarCandidatos = <T extends Pick<LeadItem, 'id' | 'salvo_em'>>(lista: T[], trabalhados: Set<string>): T[] => {
  const ordem = lista.map((l, posicao) => ({ l, posicao }));
  ordem.sort((a, b) => {
    const ta = trabalhados.has(a.l.id) ? 1 : 0, tb = trabalhados.has(b.l.id) ? 1 : 0;
    if (ta !== tb) return ta - tb;
    const sa = Date.parse(a.l.salvo_em || '') || 0, sb = Date.parse(b.l.salvo_em || '') || 0;
    if (sa !== sb) return sb - sa;                      // mais novo primeiro
    return b.posicao - a.posicao;                       // sem carimbo (antigos): o que entrou por último na lista vem antes
  });
  return ordem.map(o => o.l);
};
