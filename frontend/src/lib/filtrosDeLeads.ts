/**
 * Filtros de Meus Leads (e dos resultados): servem para descartar rápido. Os botões se combinam ("Com site" + "Sem WhatsApp" mostra só quem
 * tem site e não tem WhatsApp) e cada um mostra quantos leads pega.
 *
 * Site: o que o Google disse manda (`site_status`: "own" é site próprio; "none", "social", "aggregator" e "whatsapp" não são site de verdade).
 * Sem essa informação vale a lista de lacunas digitais e, por último, o endereço guardado. Se nada diz, o lead não entra nem em
 * "Com site" nem em "Sem site": quem não se sabe não é descartado por engano.
 */
import type { LeadItem } from '../types';

export type ChaveFiltro =
  | 'favoritos' | 'sem-site' | 'com-site' | 'sem-whatsapp' | 'com-whatsapp' | 'sem-instagram' | 'alta-oportunidade';

type Campos = Partial<Pick<LeadItem, 'site_status' | 'missingDigitalAssets' | 'website' | 'whatsapp' | 'socials' | 'instagram' | 'opportunityScore' | 'favorito'>>;

const REDES_E_ATALHOS = /(instagram|facebook|linktr\.ee|wa\.me|whatsapp|beacons\.ai|bio\.link|linkin\.bio|youtube|tiktok|ifood|google\.com)/i;

/** true: tem site próprio · false: não tem · null: não dá para saber. */
export const temSite = (l: Campos): boolean | null => {
  const status = (l as { site_status?: string }).site_status;
  if (status === 'own') return true;
  if (status === 'none' || status === 'social' || status === 'aggregator' || status === 'whatsapp') return false;
  if (Array.isArray(l.missingDigitalAssets)) return !l.missingDigitalAssets.includes('website');
  const site = String(l.website || '').trim();
  if (site) return !REDES_E_ATALHOS.test(site);
  return null;
};

export const temWhatsApp = (l: Campos): boolean => Boolean(l.whatsapp);
export const temInstagram = (l: Campos): boolean => Boolean(l.socials?.instagram || l.instagram);

export const FILTROS: { key: ChaveFiltro; rotulo: string; contrario?: ChaveFiltro; aplica: (l: Campos) => boolean; soEmMeusLeads?: boolean }[] = [
  { key: 'favoritos', rotulo: 'Favoritos', soEmMeusLeads: true, aplica: l => Boolean(l.favorito) },
  { key: 'sem-site', rotulo: 'Sem site', contrario: 'com-site', aplica: l => temSite(l) === false },
  { key: 'com-site', rotulo: 'Com site', contrario: 'sem-site', aplica: l => temSite(l) === true },
  { key: 'sem-whatsapp', rotulo: 'Sem WhatsApp', contrario: 'com-whatsapp', aplica: l => !temWhatsApp(l) },
  { key: 'com-whatsapp', rotulo: 'Com WhatsApp', contrario: 'sem-whatsapp', aplica: l => temWhatsApp(l) },
  { key: 'sem-instagram', rotulo: 'Sem Instagram', aplica: l => !temInstagram(l) },
  { key: 'alta-oportunidade', rotulo: 'Alta oportunidade', aplica: l => (l.opportunityScore || 0) >= 70 },
];

/** Liga ou desliga um filtro; ligar "Com site" desliga "Sem site" (e o mesmo para WhatsApp): não existe lead que seja os dois. */
export const alternarFiltro = (ativos: ReadonlySet<ChaveFiltro>, chave: ChaveFiltro): Set<ChaveFiltro> => {
  const novo = new Set(ativos);
  if (novo.has(chave)) { novo.delete(chave); return novo; }
  novo.add(chave);
  const contrario = FILTROS.find(f => f.key === chave)?.contrario;
  if (contrario) novo.delete(contrario);
  return novo;
};

/** Os leads que passam por TODOS os filtros ligados. */
export const aplicarFiltros = <T extends Campos>(leads: T[], ativos: ReadonlySet<ChaveFiltro>): T[] => {
  const regras = FILTROS.filter(f => ativos.has(f.key));
  return regras.length ? leads.filter(l => regras.every(r => r.aplica(l))) : leads;
};

export const contarFiltro = (leads: Campos[], chave: ChaveFiltro): number => {
  const f = FILTROS.find(x => x.key === chave);
  return f ? leads.filter(l => f.aplica(l)).length : 0;
};
