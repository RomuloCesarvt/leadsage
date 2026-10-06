/**
 * Base dos layouts premium.
 *
 * Os layouts da primeira geração eram autocontidos de propósito: fonte do
 * sistema e, sem foto do cliente, um gradiente. Fazia sentido quando o
 * site era um .html baixado. Desde que o site passou a morar no nosso
 * domínio (/s/...), essa restrição só servia para deixá-lo com cara de
 * rascunho — todo site saía em Arial, com um bloco de cor no lugar da foto.
 *
 * Aqui entram as duas coisas que separam um site de verdade de um modelo:
 * tipografia escolhida (Google Fonts) e fotografia (banco de imagens).
 * Continua sem JavaScript: o site é servido em sandbox, sem script.
 */
import { garantirContraste, letraSobre, marcaLegivel } from './profissional';
import type { SiteData } from './base';
import { esc, digitos, linkWhatsapp, linkInstagram, ajustarCor } from './base';

export type ParFontes = { titulos: string; corpo: string; google: string };

/**
 * Pares tipográficos que o usuário pode escolher no lugar do par do layout.
 * Cada um foi montado para combinar título e texto — misturar duas fontes
 * ao acaso é o jeito mais rápido de um site parecer amador.
 */
export const FONTES: Record<string, ParFontes & { nome: string; tom: string }> = {
  elegante: { nome: 'Elegante', tom: 'serifa clássica e texto limpo',
    titulos: '"Playfair Display",Georgia,serif', corpo: '"Inter",system-ui,sans-serif',
    google: 'family=Playfair+Display:wght@500;700&family=Inter:wght@400;500;600;700' },
  artesanal: { nome: 'Artesanal', tom: 'calor de coisa feita à mão',
    titulos: '"Fraunces",Georgia,serif', corpo: '"Inter",system-ui,sans-serif',
    google: 'family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600;700' },
  moderna: { nome: 'Moderna', tom: 'geométrica e direta',
    titulos: '"Plus Jakarta Sans",system-ui,sans-serif', corpo: '"Plus Jakarta Sans",system-ui,sans-serif',
    google: 'family=Plus+Jakarta+Sans:wght@400;500;600;700;800' },
  forte: { nome: 'Forte', tom: 'larga e impactante',
    titulos: '"Archivo",system-ui,sans-serif', corpo: '"Inter",system-ui,sans-serif',
    google: 'family=Archivo:wdth,wght@112,700;112,800;112,900&family=Inter:wght@400;500;600' },
  luxo: { nome: 'Luxo', tom: 'serifa fina, ar de boutique',
    titulos: '"Cormorant Garamond",Georgia,serif', corpo: '"Jost",system-ui,sans-serif',
    google: 'family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@300;400;500;600' },
  sobria: { nome: 'Sóbria', tom: 'livro e escritório',
    titulos: '"Libre Baskerville",Georgia,serif', corpo: '"Source Sans 3",system-ui,sans-serif',
    google: 'family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700' },
  amigavel: { nome: 'Amigável', tom: 'arredondada e leve',
    titulos: '"Outfit",system-ui,sans-serif', corpo: '"Nunito",system-ui,sans-serif',
    google: 'family=Outfit:wght@600;700;800;900&family=Nunito:wght@400;600;700' },
  editorial: { nome: 'Editorial', tom: 'revista, contraste alto',
    titulos: '"DM Serif Display",Georgia,serif', corpo: '"DM Sans",system-ui,sans-serif',
    google: 'family=DM+Serif+Display&family=DM+Sans:wght@400;500;700' },
  tecnologica: { nome: 'Tecnológica', tom: 'precisa, de startup',
    titulos: '"Space Grotesk",system-ui,sans-serif', corpo: '"Inter",system-ui,sans-serif',
    google: 'family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600' },
};

/** Uma linha de <link> para as duas famílias, com display=swap. */
export const linkFontes = (f: ParFontes): string =>
  `<link rel="preconnect" href="https://fonts.googleapis.com">` +
  `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
  `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${f.google}&display=swap">`;

/**
 * Só aceita imagem que é imagem.
 *
 * Os layouts antigos colavam a URL direto em src="" e url('') — com uma
 * aspa no meio, dava para escapar do atributo. Aqui só passa https e
 * data:image, e o valor sai escapado.
 */
export const urlImagem = (valor?: string): string => {
  const v = String(valor || '').trim();
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(v)) return v;
  if (/^https:\/\/[^\s"'<>()\\]+$/.test(v)) return esc(v);
  return '';
};

/**
 * O texto "sobre" dividido entre a capa e a secao Sobre.
 *
 * Os layouts usavam o mesmo texto nos dois lugares, e o visitante lia o
 * mesmo paragrafo duas vezes em seguida — marca registrada de site
 * feito sem cuidado. Com duas frases ou mais, a capa fica com a primeira
 * e a secao com o resto. Com uma so, a capa usa a frase do layout.
 */
export const partirSobre = (d: SiteData, capaPadrao: string, sobrePadrao: string): [string, string] => {
  const texto = (d.sobre || '').trim();
  if (!texto) return [esc(capaPadrao), esc(sobrePadrao)];
  const frases = texto.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [texto];
  if (frases.length >= 2) {
    return [esc(frases[0].trim()), esc(frases.slice(1).join(' ').replace(/\s+/g, ' ').trim())];
  }
  return [esc(capaPadrao), esc(texto)];
};

export const fotos = (d: SiteData): string[] =>
  (d.galeria || []).map(urlImagem).filter(Boolean).slice(0, 6);

/** Fundo da capa: a foto com véu, ou um degradê da marca quando não há foto. */
export const fundoFoto = (src: string, cor: string, veu = 'rgba(0,0,0,.35),rgba(0,0,0,.7)'): string =>
  src
    ? `background-image:linear-gradient(180deg,${veu}),url('${src}');background-size:cover;background-position:center`
    : `background-image:radial-gradient(circle at 20% 20%,${ajustarCor(cor, 50)} 0%,transparent 45%),` +
      `linear-gradient(135deg,${cor},${ajustarCor(cor, -60)})`;

export const iniciais = (empresa: string): string =>
  esc(empresa.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?');

export const logo = (d: SiteData, classe = 'logo'): string => {
  const src = urlImagem(d.logo);
  return src
    ? `<img class="${classe}-img" src="${src}" alt="${esc(d.empresa)}">`
    : `<span class="${classe}-iniciais">${iniciais(d.empresa)}</span>`;
};

export const linkZap = (d: SiteData): string => linkWhatsapp(d.whatsapp || d.telefone, d.empresa);
export const linkTel = (d: SiteData): string => (digitos(d.telefone) ? `tel:+${digitos(d.telefone)}` : '');
export const linkMapa = (d: SiteData): string =>
  d.endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${d.empresa} ${d.endereco}`)}` : '';
export const linkInsta = (d: SiteData): string => {
  const u = linkInstagram(d.instagram);
  return /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.]+\/?$/.test(u) ? u : '';
};

/** O botão principal: WhatsApp quando há, senão telefone. */
export const ctaPrincipal = (d: SiteData, texto = 'Falar no WhatsApp', classe = 'btn btn-1'): string => {
  const zap = linkZap(d);
  // o texto que o dono escolheu vale em todos os botoes principais da pagina
  if (zap) return `<a class="${classe}" href="${zap}" target="_blank" rel="noopener">${ICONES.zap}${esc(d.ctaPrincipal?.trim() || texto)}</a>`;
  const tel = linkTel(d);
  if (tel) return `<a class="${classe}" href="${tel}">${ICONES.tel}Ligar agora</a>`;
  return '';
};

export const servicosValidos = (d: SiteData) =>
  (d.servicos || []).filter(s => s.titulo.trim() || s.descricao.trim()).slice(0, 6);

export const depoimentosValidos = (d: SiteData) =>
  (d.depoimentos || []).filter(x => x.texto.trim()).slice(0, 3);

/** Selo da nota no Google, quando o negócio tem. É a prova social mais forte que existe. */
export const seloGoogle = (d: SiteData, classe = 'selo-google'): string => {
  const nota = Number(d.nota);
  if (!nota || nota < 3.5) return '';
  const qtd = d.avaliacoes ? `${Number(d.avaliacoes).toLocaleString('pt-BR')} avaliações no Google` : 'no Google';
  return `<div class="${classe}"><span class="estrelas">★★★★★</span><b>${nota.toFixed(1).replace('.', ',')}</b><span>${esc(qtd)}</span></div>`;
};

const svg = (d: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const ICONES = {
  zap: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.2l-.9 1.2c-.2.2-.3.2-.6.1-1.6-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.6.7.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.9 9.9 0 1112 21.8M20.5 3.5A11.8 11.8 0 0012 0C5.5 0 .2 5.3.2 11.9c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.7c1.7.9 3.7 1.4 5.7 1.4 6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.4-8.3"/></svg>',
  tel: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>'),
  mapa: svg('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
  relogio: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  insta: svg('<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4z"/><path d="M17.5 6.5h.01"/>'),
  email: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
  seta: svg('<path d="M5 12h14M13 5l7 7-7 7"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  estrela: svg('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'),
  coracao: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'),
  escudo: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
  brilho: svg('<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>'),
};

/** Ícone por posição, para os cartões de serviço não repetirem o mesmo. */
export const iconeDoServico = (i: number): string =>
  [ICONES.brilho, ICONES.escudo, ICONES.coracao, ICONES.estrela, ICONES.check, ICONES.relogio][i % 6];

/** Variáveis de cor e o reset comum. Cada layout acrescenta o próprio CSS. */
export const cssRaiz = (d: SiteData, f: ParFontes): string => `
:root{--p:${marcaLegivel(d.corPrimaria)};--p-esc:${ajustarCor(marcaLegivel(d.corPrimaria), -40)};--p-cla:${ajustarCor(d.corPrimaria, 175)};
  --p-texto:${garantirContraste(d.corPrimaria)};
  --d:${marcaLegivel(d.corDestaque)};--sobre-p:${letraSobre(marcaLegivel(d.corPrimaria))};--sobre-d:${letraSobre(marcaLegivel(d.corDestaque))};
  --fonte-t:${f.titulos};--fonte-c:${f.corpo}}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:#fff;color:#16181d;font-family:var(--fonte-c);font-size:var(--t0,17px);line-height:1.6;
  -webkit-font-smoothing:antialiased;color-scheme:light}
img{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
h1,h2,h3{font-family:var(--fonte-t);line-height:1.1;margin:0 0 .5em;font-weight:700}
p{margin:0 0 1em}
.wrap{width:min(1180px,90vw);margin:0 auto}
.btn{display:inline-flex;align-items:center;gap:10px;padding:16px 28px;font-weight:700;font-size:16px;
  border:0;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease,background .2s}
.btn:hover{transform:translateY(-2px)}
.btn svg{flex:none}
@keyframes sobe{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
.sobe{animation:sobe .9s cubic-bezier(.2,.7,.2,1) both}
.sobe-2{animation-delay:.12s}.sobe-3{animation-delay:.24s}.sobe-4{animation-delay:.36s}
.estrelas{color:#f5b301;letter-spacing:2px}
@media(prefers-reduced-motion:reduce){.sobe{animation:none}}
@media(max-width:760px){.btn{width:100%;justify-content:center}}
`;

/** Rodapé comum aos layouts premium, com contatos e horário. */
export const rodapePremium = (d: SiteData, classe = 'rp'): string => {
  const tel = linkTel(d), zap = linkZap(d), mapa = linkMapa(d), ig = linkInsta(d);
  return `<footer class="${classe}"><div class="wrap ${classe}-grade">
  <div><div class="${classe}-marca">${logo(d, `${classe}-logo`)}<b>${esc(d.empresa)}</b></div>
    ${d.slogan ? `<p class="${classe}-sub">${esc(d.slogan)}</p>` : ''}</div>
  <div><h4>Contato</h4>
    ${tel ? `<a href="${tel}">${ICONES.tel}${esc(d.telefone)}</a>` : ''}
    ${zap ? `<a href="${zap}" target="_blank" rel="noopener">${ICONES.zap}WhatsApp</a>` : ''}
    ${d.email ? `<a href="mailto:${esc(d.email)}">${ICONES.email}${esc(d.email)}</a>` : ''}
    ${ig ? `<a href="${ig}" target="_blank" rel="noopener">${ICONES.insta}Instagram</a>` : ''}</div>
  <div><h4>Visite</h4>
    ${d.endereco ? `<a href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}${esc(d.endereco)}</a>` : ''}
    ${d.horario ? `<span>${ICONES.relogio}${esc(d.horario)}</span>` : ''}</div>
</div><div class="wrap ${classe}-linha">© ${new Date().getFullYear()} ${esc(d.empresa)}</div></footer>`;
};

export const cssRodape = (classe = 'rp', fundo = '#0e1014', texto = '#c6cad3') => `
.${classe}{background:${fundo};color:${texto};padding:72px 0 28px;font-size:15px}
.${classe}-grade{display:grid;gap:40px;grid-template-columns:1.4fr 1fr 1fr}
.${classe} h4{font-family:var(--fonte-t);color:#fff;font-size:15px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 16px}
.${classe} a,.${classe} span{display:flex;align-items:flex-start;gap:10px;margin:0 0 12px;color:${texto}}
.${classe} a:hover{color:#fff}
.${classe}-marca{display:flex;align-items:center;gap:12px;color:#fff;font-family:var(--fonte-t);font-size:20px;margin-bottom:12px}
.${classe}-logo-img{height:44px;width:auto}
.${classe}-logo-iniciais{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:800}
.${classe}-sub{color:${texto};max-width:340px}
.${classe}-linha{border-top:1px solid rgba(255,255,255,.1);margin-top:40px;padding-top:20px;font-size:13px;opacity:.7}
@media(max-width:760px){.${classe}-grade{grid-template-columns:1fr}}
`;
