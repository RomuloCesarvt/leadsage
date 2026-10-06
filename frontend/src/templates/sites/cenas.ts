/**
 * As "cenas": layouts de direção de arte, um conceito visual por ramo.
 * Cada cena tem estrutura própria (não só cores diferentes).
 */
import type { SiteTemplate } from './base';
import { CENAS_RITUAL } from './cena-ritual';
import { CENAS_MESA } from './cena-mesa';
import { CENAS_PLANTA } from './cena-planta';
import { CENAS_SORRISO } from './cena-sorriso';
import { CENAS_PATINHAS } from './cena-patinhas';
import { CENAS_SHOWROOM } from './cena-showroom';
import { CENAS_CREDITO } from './cena-credito';

export const CENAS: SiteTemplate[] = [...CENAS_RITUAL, ...CENAS_MESA, ...CENAS_PLANTA, ...CENAS_SORRISO, ...CENAS_PATINHAS, ...CENAS_SHOWROOM, ...CENAS_CREDITO];
