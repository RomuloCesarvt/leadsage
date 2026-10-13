/**
 * Entrada do servidor: o mesmo motor de sites do navegador, empacotado para rodar numa função Node (api/render-site.mjs).
 * O robô chama isto quando um lead aceita ver a prévia: o site sai igual ao que o disparo cria.
 */
import { montarPrevia } from './previa';

export const renderizarPrevia = (lead: unknown, fotos: string[] = [], preferido = '', anterior: Record<string, unknown> | null = null) =>
  montarPrevia(lead, fotos, preferido, anterior);
