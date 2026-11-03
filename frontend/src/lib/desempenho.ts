/**
 * Agrupa o desempenho (linhas segmento x cidade x estado, vindas do servidor) pelo que a pessoa quer comparar:
 * segmentos, cidades ou estados, com a opção de olhar um segmento só (o mesmo ramo em outras cidades e estados).
 */
import type { LinhaDeDesempenho } from '../types';

export type Visao = 'segmento' | 'cidade' | 'estado';
export interface Agrupado {
  nome: string; leads: number; abordados: number; responderam: number; interessados: number; pediram_link: number; fechados: number;
  taxa_resposta: number; taxa_interesse: number;
}
export interface Destaque { nome: string; valor: number; abordados: number }

const CAMPOS = ['leads', 'abordados', 'responderam', 'interessados', 'pediram_link', 'fechados'] as const;

const rotulo = (l: LinhaDeDesempenho, por: Visao): string => {
  if (por === 'segmento') return l.segmento;
  if (por === 'estado') return l.estado || 'Sem estado';
  // a cidade vem com a sigla quando há, porque "Rio Claro" existe em SP e em RJ
  return l.cidade ? (l.estado ? `${l.cidade} - ${l.estado}` : l.cidade) : 'Sem cidade';
};

export const agrupar = (linhas: LinhaDeDesempenho[], por: Visao, segmento = ''): Agrupado[] => {
  const mapa = new Map<string, Agrupado>();
  for (const l of linhas) {
    if (segmento && l.segmento !== segmento) continue;
    const nome = rotulo(l, por);
    const g = mapa.get(nome) || { nome, leads: 0, abordados: 0, responderam: 0, interessados: 0, pediram_link: 0, fechados: 0, taxa_resposta: 0, taxa_interesse: 0 };
    for (const c of CAMPOS) g[c] += l[c];
    mapa.set(nome, g);
  }
  const saida = [...mapa.values()].map(g => ({
    ...g,
    taxa_resposta: g.abordados ? Math.round((100 * g.responderam) / g.abordados) : 0,
    taxa_interesse: g.abordados ? Math.round((100 * g.interessados) / g.abordados) : 0,
  }));
  // quem tem mais gente pedindo o link vem primeiro; depois interesse, resposta e volume
  return saida.sort((a, b) => b.pediram_link - a.pediram_link || b.interessados - a.interessados || b.responderam - a.responderam || b.abordados - a.abordados || a.nome.localeCompare(b.nome));
};

export const destaques = (grupos: Agrupado[], minimoParaTaxa: number): { respondeMais: Destaque | null; maisInteresse: Destaque | null; maisPedemLink: Destaque | null } => {
  const melhor = (campo: keyof Agrupado, minimo = 1, exigirAmostra = false): Destaque | null => {
    const c = grupos.filter(g => (g[campo] as number) >= minimo && (!exigirAmostra || g.abordados >= minimoParaTaxa));
    if (!c.length) return null;
    const g = c.reduce((a, b) => ((b[campo] as number) > (a[campo] as number) || ((b[campo] as number) === (a[campo] as number) && b.abordados > a.abordados) ? b : a));
    return { nome: g.nome, valor: g[campo] as number, abordados: g.abordados };
  };
  return { respondeMais: melhor('taxa_resposta', 1, true), maisInteresse: melhor('interessados'), maisPedemLink: melhor('pediram_link') };
};

/** Os segmentos que aparecem nas linhas, para o filtro. */
export const segmentosDasLinhas = (linhas: LinhaDeDesempenho[]): string[] => [...new Set(linhas.map(l => l.segmento))].sort((a, b) => a.localeCompare(b));
