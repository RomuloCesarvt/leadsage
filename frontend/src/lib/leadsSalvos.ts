/**
 * "Meus Leads" é a lista curada: só entra quem a pessoa escolheu.
 *
 * Antes toda busca caía direto em Meus Leads e no pipeline, e a lista virava
 * um depósito de tudo o que já foi pesquisado. Agora a busca devolve
 * resultados, a pessoa marca os que interessam e só esses viram leads.
 */
import type { LeadItem } from '../types';

const SEM_ETAPA = new Set(['', 'Novo Lead', 'Novos', 'Novo']);

/** O lead já foi escolhido, ou já está andando (o robô respondeu, a pessoa moveu o card). */
export const ehSalvo = (l: Pick<LeadItem, 'salvo' | 'pipeline_stage' | 'pipeline_origem'>): boolean => {
  if (l.salvo === true) return true;
  if (l.salvo === false) return false;
  // sem marca (leads de antes desta regra, ou vindos do servidor):
  // quem já saiu de "Novo Lead" ou nasceu de uma conversa entrou por escolha
  if (l.pipeline_origem && l.pipeline_origem !== 'busca') return true;
  return !SEM_ETAPA.has(l.pipeline_stage || '');
};

/** Quem veio do servidor só vale como salvo se não for sobra de busca em "Novo Lead". */
export const salvoPeloServidor = (origem?: string, etapa?: string): boolean =>
  (!!origem && origem !== 'busca') || !SEM_ETAPA.has(etapa || '');

export const nichosDe = (leads: LeadItem[]): string[] =>
  Array.from(new Set(leads.map(l => (l.niche || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
