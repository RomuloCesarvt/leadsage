/**
 * Variedade entre negócios do mesmo ramo.
 *
 * Seis padarias saíam com os mesmos serviços, a mesma frase de capa e só a cor mudava, porque o texto vinha todo do banco do ramo.
 * Aqui o site de cada lead ganha o que é DELE:
 *  - o texto escrito pela IA para aquele negócio (`copia_ia`), quando existe;
 *  - sem ele, o que o Google diz do lugar (descrição e uma avaliação real) e uma combinação própria dos itens do ramo;
 *  - sempre: uma variação de cor própria, estável por negócio.
 * Nada aqui inventa fato: só reordena o que o banco do ramo já traz ou usa o que veio do Google e da IA com base nos dados.
 */
import type { SiteData } from './base';
import { limparSlogan } from './marca';

export type CopiaIA = {
  slogan?: string; sobre?: string; cta?: string;
  servicos?: { titulo?: string; descricao?: string }[];
  diferenciais_detalhe?: { titulo?: string; texto?: string }[];
  passos?: { titulo?: string; texto?: string }[];
  faq?: { pergunta?: string; resposta?: string }[];
};

export const hashDe = (texto: string): number => {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h;
};

const txt = (v: unknown, max: number): string => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// ---------------------------------------------------------------------------------------------- cor
const paraHsl = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
};

const deHsl = (h: number, s: number, l: number): string => {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const p = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${p(r)}${p(g)}${p(b)}`;
};

/**
 * Desloca a cor um pouco (matiz até ±14°, saturação e brilho levemente): continua a cor do segmento, mas duas empresas
 * do mesmo ramo não repetem o mesmo hexadecimal. O brilho fica numa faixa que mantém o contraste do texto.
 */
export const variarCor = (hex: string, chave: string, ousadia = 1): string => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const h = hashDe(chave);
  const [mat, sat, luz] = paraHsl(hex);
  const dm = ((h % 29) - 14) * ousadia;
  const ds = (((h >>> 5) % 13) - 6) / 100;
  const dl = (((h >>> 9) % 9) - 4) / 100;
  return deHsl((mat + dm + 360) % 360, Math.min(0.92, Math.max(0.12, sat + ds)), Math.min(0.78, Math.max(0.16, luz + dl)));
};

// ---------------------------------------------------------------------------------------------- lista
/** Uma combinação própria dos itens do ramo: começa em outro ponto e leva uma quantidade que varia (nunca menos que `minimo`). */
export const combinar = <T>(lista: T[], chave: string, minimo: number, maximo = lista.length): T[] => {
  if (lista.length <= minimo) return lista;
  const h = hashDe(chave);
  const rot = h % lista.length;
  const qtd = Math.min(lista.length, maximo, minimo + ((h >>> 3) % (Math.max(maximo, minimo) - minimo + 1)));
  return [...lista.slice(rot), ...lista.slice(0, rot)].slice(0, qtd);
};

// ---------------------------------------------------------------------------------------------- texto
const util = (l?: { [k: string]: string | undefined }[], ...campos: string[]) => (l || []).filter(x => campos.every(c => txt(x?.[c], 400)));

/** O texto da IA para este negócio entra no lugar do texto do banco, campo a campo (o que a IA não trouxe fica como estava). */
export const aplicarCopia = (dados: SiteData, copia: CopiaIA | null | undefined, cidade: string): SiteData => {
  if (!copia || typeof copia !== 'object') return dados;
  const saida: SiteData = { ...dados };
  const slogan = limparSlogan(txt(copia.slogan, 140), cidade);
  if (slogan) saida.slogan = slogan;
  const sobre = txt(copia.sobre, 600);
  if (sobre) saida.sobre = sobre;
  const servicos = util(copia.servicos as any, 'titulo', 'descricao').slice(0, 6).map(s => ({ titulo: txt(s.titulo, 60), descricao: txt(s.descricao, 220) }));
  if (servicos.length >= 3) saida.servicos = servicos;
  const dif = util(copia.diferenciais_detalhe as any, 'titulo', 'texto').slice(0, 4).map(x => ({ titulo: txt(x.titulo, 50), texto: txt(x.texto, 160) }));
  if (dif.length >= 3) saida.diferenciais = dif;
  const passos = util(copia.passos as any, 'titulo', 'texto').slice(0, 3).map(x => ({ titulo: txt(x.titulo, 40), texto: txt(x.texto, 160) }));
  if (passos.length === 3) saida.passos = passos;
  const faq = util(copia.faq as any, 'pergunta', 'resposta').slice(0, 5).map(x => ({ pergunta: txt(x.pergunta, 120), resposta: txt(x.resposta, 300) }));
  if (faq.length >= 3) saida.faq = faq;
  const cta = txt(copia.cta, 30);
  if (cta) saida.ctaPrincipal = cta;
  return saida;
};

/**
 * Sem texto da IA: o que é do negócio (descrição do Google, uma avaliação real) e uma combinação própria dos itens do ramo.
 * A descrição só entra se parecer descrição (frase de verdade, sem endereço colado, sem a cidade como assunto).
 */
export const individualizar = (dados: SiteData, lead: any, temCopia = false): SiteData => {
  const chave = `${dados.empresa}|${dados.cidade || ''}`;
  const saida: SiteData = { ...dados };
  const desc = txt(lead?.google_description, 420);
  if (!temCopia && desc.length >= 60 && /[a-zà-ú]{4,}/i.test(desc) && !/^https?:/i.test(desc)) saida.sobre = desc;
  const avaliacao = txt(lead?.review_highlight, 240);
  if (avaliacao.length >= 30 && !(dados.depoimentos || []).some(d => (d.texto || '').trim())) {
    saida.depoimentos = [{ texto: avaliacao, autor: 'Cliente, em avaliação no Google' }];
  }
  if (temCopia) return saida;
  if ((saida.servicos || []).length > 4) saida.servicos = combinar(saida.servicos || [], `${chave}|serv`, 4, 6);
  if ((saida.diferenciais || []).length > 3) saida.diferenciais = combinar(saida.diferenciais || [], `${chave}|dif`, 3, 4);
  if ((saida.faq || []).length > 3) saida.faq = combinar(saida.faq || [], `${chave}|faq`, 3, 5);
  return saida;
};
