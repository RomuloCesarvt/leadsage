/**
 * Paises, estados e cidades — só os que o produto vende.
 *
 * A tela usava `country-state-city` direto. A biblioteca embute as
 * cidades do mundo inteiro: 8,3 MB (2,4 MB comprimidos) que o navegador
 * baixava para preencher um <select>. Nova Busca é a tela mais usada do
 * app, então isso era pedágio em cima do que mais importa.
 *
 * `scripts/gerar-geo.mjs` recorta da mesma biblioteca os países que os
 * planos liberam (Brasil, Portugal, EUA) e grava `data/geo.json`: 362 KB,
 * 121 KB comprimidos, com as 26.774 cidades intactas.
 *
 * A biblioteca continua sendo a fonte — ela só não viaja mais até o
 * navegador. Para atualizar: `node scripts/gerar-geo.mjs`.
 */

export type Pais = { isoCode: string; name: string; flag: string };
export type Estado = { isoCode: string; name: string };
export type Cidade = { name: string };

type EstadoBruto = { c: string; n: string; cidades: string[] };
type PaisBruto = { nome: string; bandeira: string; estados: EstadoBruto[] };

/**
 * Carrega o recorte sob demanda. Continua fora do carregamento inicial:
 * quem só abre o painel não paga por isto.
 */
let cache: Promise<Record<string, PaisBruto>> | null = null;

export const carregarGeo = (): Promise<Record<string, PaisBruto>> => {
  if (!cache) cache = import('../data/geo.json').then(m => m.default as Record<string, PaisBruto>);
  return cache;
};

export type Geo = {
  paises: () => Pais[];
  estadosDe: (pais: string) => Estado[];
  temEstado: (pais: string, estado: string) => boolean;
  cidadesDe: (pais: string, estado: string) => Cidade[];
  /** Busca por nome (sem acento, por prefixo/palavra) no pais todo ou so em um estado. */
  buscarCidades: (pais: string, termo: string, estado?: string, limite?: number) => CidadeAchada[];
};

export type CidadeAchada = { nome: string; estado: string; estadoNome: string };

export const semAcento = (t: string) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Mesma superfície que a tela já usava, sobre o recorte local. */
export const montarGeo = (dados: Record<string, PaisBruto>): Geo => {
  const acharEstado = (pais: string, estado: string) =>
    dados[pais]?.estados.find(e => e.c === estado);

  return {
    paises: () =>
      Object.entries(dados).map(([isoCode, p]) => ({
        isoCode,
        name: p.nome,
        flag: p.bandeira,
      })),
    estadosDe: pais => (dados[pais]?.estados || []).map(e => ({ isoCode: e.c, name: e.n })),
    temEstado: (pais, estado) => Boolean(acharEstado(pais, estado)),
    cidadesDe: (pais, estado) =>
      (acharEstado(pais, estado)?.cidades || []).map(name => ({ name })),
    buscarCidades: (pais, termo, estado, limite = 8) => {
      const q = semAcento(termo);
      if (!q) return [];
      const inicio: CidadeAchada[] = [];
      const meio: CidadeAchada[] = [];
      for (const e of dados[pais]?.estados || []) {
        if (estado && e.c !== estado) continue;
        for (const nome of e.cidades) {
          const n = semAcento(nome);
          const achada = { nome, estado: e.c, estadoNome: e.n };
          if (n === q || n.startsWith(q)) inicio.push(achada);
          else if (n.includes(' ' + q)) meio.push(achada);
        }
      }
      // exato primeiro, depois menor nome
      inicio.sort((a, b) => (semAcento(a.nome) === q ? -1 : 0) - (semAcento(b.nome) === q ? -1 : 0) || a.nome.length - b.nome.length);
      return [...inicio, ...meio].slice(0, limite);
    },
  };
};
