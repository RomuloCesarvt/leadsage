/**
 * A camada que separa um site "montado" de um site feito por profissional.
 *
 * Tudo aqui vale para todo layout, e nada exige JavaScript: o site publicado
 * roda em sandbox sem script.
 *
 * - **contraste**: cor de texto sobre a cor da marca e a própria cor da marca
 *   como texto são ajustadas até atingir WCAG AA (4,5:1). Uma marca
 *   amarela com letra branca é ilegível; aqui isso não sai da fábrica;
 * - **tipografia fluida**: escala com razão 1,2 no celular a 1,333 no
 *   desktop, interpolada com clamp(), sem saltos de breakpoint;
 * - **SEO local**: título, descrição, Open Graph, favicon e dados
 *   estruturados LocalBusiness (JSON-LD) com horário e nota reais;
 * - **acessibilidade**: link "pular para o conteúdo", landmarks, foco
 *   visível, respeito a prefers-reduced-motion;
 * - **conversão no celular**: barra fixa com Ligar e WhatsApp, o gesto que
 *   transforma visita em contato num negócio local;
 * - **movimento**: só transições de hover. Revelação ao rolar foi testada e
 *   descartada: deixa o conteúdo invisível em captura de página inteira,
 *   impressão e miniaturas — conteúdo escondido é pior que página estática.
 */
import type { SiteData } from './base';
import { ajustarCor, digitos, esc, telefoneLegivel } from './base';

/* ---------------------------------------------------------------- cor */

const paraRgb = (hex: string): [number, number, number] => {
  const limpo = (hex || '#000000').replace('#', '');
  const cheio = limpo.length === 3 ? limpo.split('').map(c => c + c).join('') : limpo.padEnd(6, '0');
  const n = parseInt(cheio.slice(0, 6), 16);
  return Number.isNaN(n) ? [0, 0, 0] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Luminância relativa, como na WCAG 2.x. */
export const luminancia = (hex: string): number => {
  const [r, g, b] = paraRgb(hex).map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const razaoDeContraste = (a: string, b: string): number => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/**
 * Escurece (fundo claro) ou clareia (fundo escuro) a cor até ela ser legível
 * como texto sobre o fundo. Cor que já passa volta intacta.
 */
export const garantirContraste = (cor: string, fundo = '#ffffff', minimo = 4.5): string => {
  if (razaoDeContraste(cor, fundo) >= minimo) return cor;
  const passo = luminancia(fundo) > 0.5 ? -8 : 8;
  let atual = cor;
  for (let i = 0; i < 40 && razaoDeContraste(atual, fundo) < minimo; i++) atual = ajustarCor(atual, passo);
  return atual;
};

/**
 * A cor da marca como fundo de botão. Se nem letra branca nem grafite passam
 * de 4,5:1 sobre ela (cores de luminância média, como um laranja-avermelhado),
 * escurece até o branco passar: um botão fraco é pior que um tom ajustado.
 */
export const marcaLegivel = (hex: string): string => {
  if (Math.max(razaoDeContraste(hex, '#ffffff'), razaoDeContraste(hex, '#111827')) >= 4.5) return hex;
  let atual = hex;
  for (let i = 0; i < 40 && razaoDeContraste(atual, '#ffffff') < 4.5; i++) atual = ajustarCor(atual, -6);
  return atual;
};

/** A cor de letra com mais contraste sobre a cor dada: branco ou grafite. */
export const letraSobre = (hex: string): string =>
  razaoDeContraste(hex, '#ffffff') >= razaoDeContraste(hex, '#111827') ? '#ffffff' : '#111827';

/* ---------------------------------------------------------- tipografia */

/**
 * Passos da escala fluida: o mínimo parte de 16px a 320px de largura com razão
 * 1,2; o máximo de 18px a 1500px com razão 1,333. A interpolação linear entre
 * os dois sai como clamp(min, base + inclinação * vw, max).
 */
export const escalaFluida = (): string => {
  const linhas: string[] = [];
  for (let n = -2; n <= 5; n++) {
    const min = 16 * Math.pow(1.2, n);
    const max = 18 * Math.pow(1.333, n);
    const inclinacao = (max - min) / (1500 - 320);
    const base = min - inclinacao * 320;
    const r = (v: number) => Math.round(v * 1000) / 1000;
    linhas.push(`--t${n < 0 ? 'n' + -n : n}:clamp(${r(min / 16)}rem,${r(base / 16)}rem + ${r(inclinacao * 100)}vw,${r(max / 16)}rem)`);
  }
  return linhas.join(';');
};

/* -------------------------------------------------------------- horário */

const DIAS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const ROTULO_DIA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const indiceDoDia = (palavra: string): number => {
  const p = semAcento(palavra);
  if (p.startsWith('seg')) return 0;
  if (p.startsWith('ter')) return 1;
  if (p.startsWith('qua')) return 2;
  if (p.startsWith('qui')) return 3;
  if (p.startsWith('sex')) return 4;
  if (p.startsWith('sab')) return 5;
  if (p.startsWith('dom')) return 6;
  return -1;
};

const hhmm = (h: string, m?: string) => `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;

/**
 * Resume as linhas do Google ("segunda-feira: 08:00 – 18:00") em algo que se
 * lê de relance: "Seg a Sex 08:00–18:00 · Sáb 08:00–12:00 · Dom fechado".
 * Dias seguidos com o mesmo horário viram um intervalo.
 */
export const resumirSemana = (linhas: string[]): string => {
  const por: { dia: number; horas: string }[] = [];
  for (const l of linhas) {
    const i = l.indexOf(':');
    if (i < 0) continue;
    const dia = indiceDoDia(l.slice(0, i));
    if (dia < 0) continue;
    const resto = l.slice(i + 1).trim();
    const horas = /fechado/i.test(resto) ? 'fechado' : /24 horas/i.test(resto) ? '24 horas'
      : resto.replace(/\s*[–—-]\s*/g, '–').replace(/\s+/g, ' ');
    por[dia] = { dia, horas };
  }
  const grupos: { de: number; ate: number; horas: string }[] = [];
  for (let d = 0; d < 7; d++) {
    const x = por[d];
    if (!x) continue;
    const ult = grupos[grupos.length - 1];
    if (ult && ult.horas === x.horas && ult.ate === d - 1) ult.ate = d;
    else grupos.push({ de: d, ate: d, horas: x.horas });
  }
  return grupos
    .map(g => `${ROTULO_DIA[g.de]}${g.ate > g.de ? (g.ate - g.de === 1 ? ' e ' : ' a ') + ROTULO_DIA[g.ate] : ''} ${g.horas}`)
    .join(' · ');
};

export type EspecHorario = { dayOfWeek: string[]; opens: string; closes: string };

/**
 * Lê o horário digitado ("Seg a Sex 8h às 18h; Sáb 8h às 12h") e devolve a
 * estrutura do schema.org. É conservador: parte que não for entendida é
 * ignorada, e um horário incompreensível vira lista vazia — o Google
 * penaliza dado estruturado errado, não dado ausente.
 */
export const lerHorario = (texto: string): EspecHorario[] => {
  const saida: EspecHorario[] = [];
  const DIA = 'seg(?:unda)?|ter(?:[çc]a)?|qua(?:rta)?|qui(?:nta)?|sex(?:ta)?|s[aá]b(?:ado)?|dom(?:ingo)?';
  const reDia = new RegExp(`(${DIA})(?:-feira)?`, 'gi');
  const reHora = /(\d{1,2})(?:[:h](\d{2}))?\s*h?\s*(?:às|as|a|até|ate|-|–|—)\s*(\d{1,2})(?:[:h](\d{2}))?\s*h?/i;

  for (const parte of String(texto || '').split(/[;·|\n]+/)) {
    if (/fechado/i.test(parte)) continue;
    const h = parte.match(reHora);
    if (!h) continue;
    const abre = Number(h[1]), fecha = Number(h[3]);
    if (abre > 23 || fecha > 24) continue;
    const trechoDias = parte.slice(0, h.index);
    const achados = [...trechoDias.matchAll(reDia)].map(m => ({ i: indiceDoDia(m[1]), pos: m.index ?? 0 }));
    if (!achados.length) continue;

    let dias: number[] = [];
    // "Seg a Sex": dois dias ligados por a / à / até / hífen
    const ligacao = trechoDias.match(new RegExp(`(${DIA})(?:-feira)?\\s*(?:a|à|até|ate|-|–|—)\\s*(${DIA})(?:-feira)?`, 'i'));
    if (ligacao) {
      const [de, ate] = [indiceDoDia(ligacao[1]), indiceDoDia(ligacao[2])];
      for (let d = de; ; d = (d + 1) % 7) { dias.push(d); if (d === ate || dias.length > 7) break; }
    } else {
      dias = achados.map(a => a.i);
    }
    dias = [...new Set(dias)].filter(d => d >= 0);
    if (!dias.length) continue;
    saida.push({
      dayOfWeek: dias.map(d => DIAS[d]),
      opens: hhmm(h[1], h[2]),
      closes: hhmm(String(fecha === 24 ? 23 : fecha), fecha === 24 ? '59' : h[4]),
    });
  }
  return saida;
};

/* ------------------------------------------------------------------ SEO */

/** So https limpo vai para metadados: sem aspas, espaco nem sinais de tag. */
const ehUrl = (v?: string) => !!v && /^https:\/\/[^\s"'<>\\]+$/.test(v);

/** Data URIs, javascript: e texto malformado nunca vao para metadados. */
const imagemPublica = (d: SiteData): string[] => [d.capa, d.fotoSobre, ...(d.galeria || [])].filter(ehUrl) as string[];

const ldSeguro = (obj: unknown): string => JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

export const jsonLd = (d: SiteData, tipo = 'LocalBusiness'): string => {
  const tel = digitos(d.telefone || d.whatsapp);
  const horarios = lerHorario(d.horario);
  const ig = d.instagram ? (d.instagram.startsWith('http') ? d.instagram : `https://instagram.com/${d.instagram.replace(/^@/, '')}`) : '';
  const imagens = imagemPublica(d);
  const dados: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': tipo,
    name: d.empresa,
    ...(d.slogan || d.sobre ? { description: (d.slogan || d.sobre).slice(0, 300) } : {}),
    ...(imagens.length ? { image: imagens } : {}),
    ...(tel.length >= 10 ? { telephone: `+${tel.startsWith('55') ? tel : '55' + tel}` } : {}),
    ...(d.email ? { email: d.email } : {}),
    ...(d.endereco ? { address: { '@type': 'PostalAddress', streetAddress: d.endereco, ...(d.cidade ? { addressLocality: d.cidade } : {}), addressCountry: 'BR' } } : {}),
    ...(horarios.length ? { openingHoursSpecification: horarios.map(h => ({ '@type': 'OpeningHoursSpecification', ...h })) } : {}),
    // só com dado real: a nota vem do Google quando o site nasce de um lead
    ...(d.nota && d.avaliacoes && d.avaliacoes > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: d.nota, reviewCount: d.avaliacoes, bestRating: 5 } } : {}),
    ...(ig ? { sameAs: [ig] } : {}),
  };
  return `<script type="application/ld+json">${ldSeguro(dados)}</script>`;
};

const faviconSvg = (d: SiteData): string => {
  const letra = (d.empresa || 'S').trim().charAt(0).toUpperCase() || 'S';
  const fundo = d.corPrimaria || '#2563eb';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='${fundo}'/>`
    + `<text x='32' y='45' font-size='36' text-anchor='middle' font-family='Arial,sans-serif' font-weight='700' fill='${letraSobre(fundo)}'>${esc(letra)}</text></svg>`;
  return `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(svg)}">`;
};

export const cabecaSEO = (d: SiteData, tipo = 'LocalBusiness'): string => {
  const titulo = `${d.empresa}${d.categoria ? ` — ${d.categoria}` : ''}${d.cidade ? ` em ${d.cidade}` : ''}`.slice(0, 70);
  const descricao = esc((d.slogan && d.sobre ? `${d.slogan}. ${d.sobre}` : d.slogan || d.sobre || `${d.empresa}${d.cidade ? ` em ${d.cidade}` : ''}`).slice(0, 158));
  const imagem = imagemPublica(d)[0];
  return `<title>${esc(titulo)}</title>
<meta name="description" content="${descricao}">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="${esc(d.corPrimaria)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(d.empresa)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${descricao}">
${imagem ? `<meta property="og:image" content="${esc(imagem)}">` : ''}
<meta name="twitter:card" content="${imagem ? 'summary_large_image' : 'summary'}">
${faviconSvg(d)}
${jsonLd(d, tipo)}`;
};

/* ------------------------------------------------------ CSS e estrutura */

export const cssProfissional = (): string => `
:root{${escalaFluida()}}
.pular{position:absolute;left:-9999px;top:8px;z-index:200;background:#fff;color:#111827;padding:12px 18px;border-radius:10px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.pular:focus{left:12px}
:focus-visible{outline:3px solid var(--d);outline-offset:3px;border-radius:4px}
::selection{background:var(--p);color:var(--sobre-p)}
html{scroll-padding-top:84px;-webkit-text-size-adjust:100%}
h1,h2,h3{text-wrap:balance}
p,li,blockquote,figcaption{text-wrap:pretty}
.estrelas{color:#d97706}
main:focus{outline:none}
.acao-movel{display:none}
@media(max-width:760px){
  .acao-movel{position:fixed;left:0;right:0;bottom:0;z-index:70;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:10px;
    padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.96);backdrop-filter:blur(10px);
    border-top:1px solid rgba(15,23,42,.1)}
  .acao-movel a{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border-radius:12px;font-weight:700;font-size:16px;width:auto}
  .acao-movel svg{width:20px;height:20px}
  .acao-movel .am-zap{background:#0f7a43;color:#fff}
  .acao-movel .am-tel{background:#fff;color:var(--p-texto);border:1.5px solid var(--p)}
  body{padding-bottom:78px}
  .zap-fixo{display:none}
  /* a barra de baixo ja cobre o gesto; o botao do topo so tirava espaco do nome da empresa */
  .topo .btn{display:none}
}
@media print{.acao-movel,.zap-fixo,.pular{display:none}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;

/** Barra fixa do celular: ligar e WhatsApp, com área de toque de 48px. */
export const barraAcaoMovel = (tel: string, zap: string, iconeTel: string, iconeZap: string): string => {
  if (!tel && !zap) return '';
  return `<nav class="acao-movel" aria-label="Contato rápido">${
    tel ? `<a class="am-tel" href="${tel}">${iconeTel}Ligar</a>` : ''}${
    zap ? `<a class="am-zap" href="${zap}" target="_blank" rel="noopener">${iconeZap}WhatsApp</a>` : ''}</nav>`;
};

/**
 * Envolve o miolo da página em <main id="conteudo">: entre o fim do
 * primeiro </header> e o início do rodapé. Layout sem essa estrutura fica
 * como está — o link "pular" só aparece quando há para onde pular.
 */
export const envolverMain = (corpo: string): { html: string; temMain: boolean } => {
  const fimCabecalho = corpo.indexOf('</header>');
  const inicioRodape = corpo.lastIndexOf('<footer');
  if (fimCabecalho < 0 || inicioRodape < 0 || fimCabecalho + 9 >= inicioRodape) return { html: corpo, temMain: false };
  const a = fimCabecalho + '</header>'.length;
  return {
    html: `${corpo.slice(0, a)}<main id="conteudo" tabindex="-1">${corpo.slice(a, inicioRodape)}</main>${corpo.slice(inicioRodape)}`,
    temMain: true,
  };
};

/**
 * Dados prontos para virar página: o horário vindo do Google ("segunda-feira:
 * 08:00 – 18:00" em várias linhas) vira o resumo legível, e o telefone ganha
 * máscara. O link tel: e o WhatsApp continuam saindo só dos dígitos.
 */
export const prepararDados = (d: SiteData): SiteData => {
  const linhas = String(d.horario || '').split(/\n|;(?=\s*(?:seg|ter|qua|qui|sex|s[aá]b|dom))/i).map(l => l.trim()).filter(Boolean);
  const estiloGoogle = linhas.length > 0 && linhas.every(l => /^(segunda|ter[çc]a|quarta|quinta|sexta|s[aá]bado|domingo)(-feira)?\s*:/i.test(l));
  return {
    ...d,
    horario: estiloGoogle ? resumirSemana(linhas) : String(d.horario || '').trim(),
    telefone: telefoneLegivel(d.telefone),
  };
};
