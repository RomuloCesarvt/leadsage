/**
 * O lead que o servidor ENCERROU sai de Meus Leads e do pipeline: depois da abordagem e de todos os seguimentos, sem nenhuma resposta, ele já
 * não precisa ficar. O servidor guarda o registro (para nunca contatar de novo quem já recebeu a régua inteira) e marca `encerrado`.
 *
 * Se a pessoa colocar o mesmo lead de novo em Meus Leads DEPOIS do encerramento, ele volta (vale a escolha mais recente).
 */
import type { LeadItem, PipelineItem } from '../types';

export const saiuPelaRegua = (lead: Pick<LeadItem, 'salvo_em'>, item?: Pick<PipelineItem, 'encerrado'>): boolean => {
  const quando = Date.parse(item?.encerrado?.em || '');
  if (!quando) return false;
  return !((Date.parse(lead.salvo_em || '') || 0) > quando);
};

/** Os nomes (sem repetir) dos leads que acabaram de sair, para avisar a pessoa. */
export const nomesDosQueSairam = (atuais: Pick<LeadItem, 'id' | 'company' | 'name' | 'salvo_em'>[], itens: Pick<PipelineItem, 'id' | 'encerrado'>[]): string[] => {
  const porId = new Map(itens.map(i => [i.id, i]));
  const nomes = atuais.filter(l => saiuPelaRegua(l, porId.get(l.id))).map(l => l.company || l.name || 'Lead');
  return Array.from(new Set(nomes));
};
