/**
 * Peças compartilhadas pelas "cenas" (layouts de direção de arte por ramo).
 *
 * Cada cena tem estrutura e estilo próprios; o que é comum fica aqui: ler
 * os dados já filtrados, montar link de WhatsApp com a mensagem pronta e
 * respeitar os interruptores de seção.
 */
import type { SiteData } from './base';
import { digitos } from './base';

export const secaoLigada = (d: SiteData, id: 'diferenciais' | 'passos' | 'faq' | 'ctaFinal'): boolean => d.secoes?.[id] !== false;

const tem = (t?: string) => !!(t || '').trim();

export const diferenciaisDe = (d: SiteData, max = 4) =>
  (d.diferenciais || []).filter(x => tem(x.titulo) && tem(x.texto)).slice(0, max);

export const passosDe = (d: SiteData, max = 4) =>
  (d.passos || []).filter(x => tem(x.titulo) && tem(x.texto)).slice(0, max);

export const perguntasDe = (d: SiteData, max = 8) =>
  (d.faq || []).filter(x => tem(x.pergunta) && tem(x.resposta)).slice(0, max);

/**
 * WhatsApp com a mensagem já escrita: "Quero agendar: Limpeza de pele".
 * Quem clica já chega dizendo o que quer; para o negócio, é lead qualificado.
 */
export const zapTexto = (d: SiteData, mensagem: string): string => {
  const n = digitos(d.whatsapp || d.telefone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(mensagem)}` : '';
};

/** Primeira linha curta do horário, para chips e faixas ("Seg a Sex 08:00–18:00"). */
export const horarioCurto = (d: SiteData): string => {
  const h = (d.horario || '').trim();
  if (!h) return '';
  const primeiro = h.split(/ · |;|\n/)[0].trim();
  return primeiro.length > 34 ? primeiro.slice(0, 33) + '…' : primeiro;
};

/** Notas e avaliações reais do Google, ou vazio. Nunca inventa. */
export const notaReal = (d: SiteData): { nota: string; avaliacoes: string } | null => {
  const n = Number(d.nota);
  if (!n || n < 3.5) return null;
  return {
    nota: n.toFixed(1).replace('.', ','),
    avaliacoes: d.avaliacoes ? Number(d.avaliacoes).toLocaleString('pt-BR') : '',
  };
};

/** Numeração "01", "02"... */
export const num = (i: number): string => String(i + 1).padStart(2, '0');

/**
 * Parte um texto em "destaque" (a primeira frase, para tipografia grande) e
 * "resto" (o que sobrar, em tamanho de leitura). Um parágrafo inteiro em corpo
 * de cartaz vira um muro de letras.
 */
export const partirDestaque = (texto: string): { destaque: string; resto: string } => {
  const frases = texto.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [texto];
  return { destaque: (frases[0] || texto).trim(), resto: frases.slice(1).join(' ').trim() };
};

/** Galeria simples (até 6 fotos do próprio negócio). Some quando há menos de duas. */
export const galeriaCena = (fotosLista: string[], empresa: string, titulo: string): string => {
  const f = fotosLista.slice(0, 6);
  if (f.length < 2) return '';
  return `<section class="sec" style="padding-top:0"><div class="wrap"><div class="cab"><h2>${titulo}</h2></div><div class="gal-cena">${
    f.map((src, i) => `<figure><img src="${src}" alt="${empresa} — foto ${i + 1}" loading="lazy"></figure>`).join('')}</div></div></section>`;
};

export const cssGaleriaCena = (raio = '14px', borda = 'transparent'): string =>
  `.gal-cena{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:14px}.gal-cena figure{margin:0;aspect-ratio:4/3;border-radius:${raio};overflow:hidden;box-shadow:0 0 0 1px ${borda}}.gal-cena img{width:100%;height:100%;object-fit:cover;transition:transform .5s}.gal-cena figure:hover img{transform:scale(1.04)}`;
