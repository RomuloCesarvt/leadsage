/**
 * Motor da família "Cinema": sites escuros e claros com cara de produção, em CSS puro.
 *
 * O site publicado é servido em sandbox, sem JavaScript. Tudo o que se move aqui é CSS:
 *
 * - **vidro líquido**: fundo translúcido com desfoque, borda de luz e brilho interno;
 * - **revelação ao rolar**: `animation-timeline: view()`. Onde o navegador não suporta, o conteúdo
 *   simplesmente aparece, sem animação (nunca fica escondido);
 * - **título palavra por palavra**: cada palavra entra com desfoque, uma depois da outra;
 * - **contadores** (`@property`): o número final está no próprio elemento; a animação só parte de zero;
 * - **marquee**, **crossfade de fotos**, **Ken Burns**, **parallax** e **menu de celular** (sem script).
 *
 * Nada de vídeo de terceiros: a imagem é a do próprio cliente (capa e galeria) ou uma cena gerada
 * com as cores da marca. Foto real vence qualquer cena.
 */
import type { SiteData } from './base';
import { esc } from './base';
import { documentoPremium } from './documento';
import { cssComum, fim } from './premium';
import {
  type ParFontes, ICONES, ctaPrincipal, depoimentosValidos, fotos, linkInsta, linkMapa, linkTel, linkZap,
  logo, seloGoogle, servicosValidos, urlImagem,
} from './premium-base';

/* ------------------------------------------------------------ fontes */

export const PARES: Record<string, ParFontes> = {
  instrument: {
    titulos: '"Instrument Serif",Georgia,serif', corpo: '"Inter",system-ui,sans-serif',
    google: 'family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700',
  },
  anton: {
    titulos: '"Anton",Impact,"Arial Narrow",sans-serif', corpo: '"Inter",system-ui,sans-serif',
    google: 'family=Anton&family=Condiment&family=Inter:wght@400;500;600;700',
  },
  sora: {
    titulos: '"Sora",system-ui,sans-serif', corpo: '"Inter",system-ui,sans-serif',
    google: 'family=Sora:wght@300;400;600;700&family=Inter:wght@400;500;600',
  },
  archivo: {
    titulos: '"Archivo",system-ui,sans-serif', corpo: '"Inter",system-ui,sans-serif',
    google: 'family=Archivo:wdth,wght@100,300;125,800;125,900&family=Inter:wght@400;500;600',
  },
  grotesk: {
    titulos: '"Space Grotesk",system-ui,sans-serif', corpo: '"Inter",system-ui,sans-serif',
    google: 'family=Space+Grotesk:wght@400;500;700&family=Inter:wght@400;500;600',
  },
  cormorant: {
    titulos: '"Cormorant Garamond",Georgia,serif', corpo: '"Jost",system-ui,sans-serif',
    google: 'family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,500&family=Jost:wght@300;400;500;600',
  },
  syne: {
    titulos: '"Syne",system-ui,sans-serif', corpo: '"Manrope",system-ui,sans-serif',
    google: 'family=Syne:wght@500;700;800&family=Manrope:wght@300;400;500;600;700',
  },
};

/* ------------------------------------------------------------ texto */

/** Cada palavra do título entra com desfoque, uma depois da outra (`--i` é a posição). */
export const palavras = (texto: string, inicio = 0, passo = 1): string =>
  esc(texto).split(/\s+/).filter(Boolean)
    .map((p, i) => `<span class="pal" style="--i:${inicio + i * passo}">${p}</span>`).join(' ');

/** Cada letra com seu atraso (títulos curtos): a revelação caractere a caractere. */
export const letras = (texto: string, inicio = 0): string =>
  esc(texto).split(' ').map((palavra, w, todas) => {
    const base = todas.slice(0, w).join(' ').length + (w ? w : 0);
    return `<span class="pal-g">${[...palavra].map((c, i) => `<span class="let" style="--i:${inicio + base + i}">${c}</span>`).join('')}</span>`;
  }).join(' ');

export const titulo = (d: SiteData, padrao: string): string =>
  (d.slogan || '').trim() || padrao;

export const eyebrow = (d: SiteData): string =>
  [d.categoria, d.cidade].map(x => (x || '').trim()).filter(Boolean).join(' · ');

/** Quebra o "sobre" em frases. */
export const frases = (texto: string): string[] =>
  (texto || '').match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) || [];

/* ------------------------------------------------------------ imagens */

/** As fotos do próprio negócio, sem repetir: capa, foto do "sobre" e galeria. */
export const imagens = (d: SiteData): string[] => {
  const todas = [urlImagem(d.capa), urlImagem(d.fotoSobre), ...fotos(d)].filter(Boolean);
  return [...new Set(todas)];
};

export const fotoDe = (d: SiteData, i: number): string => {
  const lista = imagens(d);
  return lista.length ? lista[i % lista.length] : '';
};

/** A foto quando há; senão uma cena com as cores da marca (nunca um quadrado vazio). */
export const fundoImagem = (src: string, variante = 0): string =>
  src ? `background-image:url('${src}')` : `--cena:${variante}`;

export const classeImagem = (src: string, base: string): string => `${base} ${src ? 'tem-foto' : 'cena'}`;

/* ------------------------------------------------------------ pedaços de HTML */

export const nav = (d: SiteData, itens: [string, string][], classe = 'nv'): string => {
  const zap = ctaPrincipal(d, 'Falar agora', `${classe}-cta vidro-bt`);
  return `<header class="${classe}"><input type="checkbox" id="${classe}-chk" class="menu-chk" aria-label="Abrir menu">
  <a class="${classe}-marca" href="#topo">${logo(d, `${classe}-logo`)}<span>${esc(d.empresa)}</span></a>
  <nav class="${classe}-links" aria-label="Seções">${itens.map(([h, r]) => `<a href="${h}">${r}</a>`).join('')}</nav>
  ${zap}
  <label for="${classe}-chk" class="menu-btn" aria-hidden="true"><i></i><i></i><i></i></label>
</header>`;
};

export const contatoLinhas = (d: SiteData, classe: string): string => {
  const tel = linkTel(d), ig = linkInsta(d), mapa = linkMapa(d);
  return `${d.endereco ? `<p class="${classe}">${ICONES.mapa}<span>${mapa ? `<a href="${mapa}" target="_blank" rel="noopener">${esc(d.endereco)}</a>` : esc(d.endereco)}</span></p>` : ''}
${d.horario ? `<p class="${classe}">${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ''}
${tel ? `<p class="${classe}">${ICONES.tel}<a href="${tel}">${esc(d.telefone)}</a></p>` : ''}
${ig ? `<p class="${classe}">${ICONES.insta}<a href="${ig}" target="_blank" rel="noopener">${esc(d.instagram)}</a></p>` : ''}
${d.email ? `<p class="${classe}">${ICONES.email}<a href="mailto:${esc(d.email)}">${esc(d.email)}</a></p>` : ''}`;
};

/** Faixa em movimento com os serviços (ou qualquer lista de palavras). */
export const faixa = (itens: string[], classe = 'marq'): string => {
  const lista = itens.filter(Boolean);
  if (!lista.length) return '';
  const trilha = lista.map(t => `<span>${esc(t)}</span><i aria-hidden="true">✦</i>`).join('');
  return `<div class="${classe}" aria-hidden="true"><div class="marq-t">${trilha}${trilha}${trilha}${trilha}</div></div>`;
};

/** Número que sobe de zero até o valor real quando entra na tela. */
export const contador = (valor: number, rotulo: string, classe = 'ct'): string =>
  `<div class="${classe}"><b class="cont" style="--n:${Math.round(valor)}" aria-label="${Math.round(valor)}"></b><span>${esc(rotulo)}</span></div>`;

/** Só números que existem: nota e avaliações do Google, quantidade de serviços. */
export const numerosReais = (d: SiteData): { texto: string; valor?: number; rotulo: string }[] => {
  const saida: { texto: string; valor?: number; rotulo: string }[] = [];
  const nota = Number(d.nota);
  if (nota >= 3.5) saida.push({ texto: nota.toFixed(1).replace('.', ','), rotulo: 'nota no Google' });
  if (Number(d.avaliacoes) > 0) saida.push({ texto: '', valor: Number(d.avaliacoes), rotulo: 'avaliações de clientes' });
  const n = servicosValidos(d).length;
  if (n >= 2) saida.push({ texto: '', valor: n, rotulo: n === 1 ? 'serviço' : 'serviços' });
  return saida;
};

export const rodape = (d: SiteData, classe = 'rd'): string => {
  const tel = linkTel(d), zap = linkZap(d), ig = linkInsta(d), mapa = linkMapa(d);
  return `<footer class="${classe}"><div class="wrap ${classe}-in">
  <div class="${classe}-marca">${logo(d, `${classe}-logo`)}<b>${esc(d.empresa)}</b>${d.slogan ? `<p>${esc(d.slogan)}</p>` : ''}</div>
  <div class="${classe}-col"><h4>Contato</h4>
    ${tel ? `<a href="${tel}">${esc(d.telefone)}</a>` : ''}
    ${zap ? `<a href="${zap}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
    ${d.email ? `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : ''}
    ${ig ? `<a href="${ig}" target="_blank" rel="noopener">Instagram</a>` : ''}</div>
  <div class="${classe}-col"><h4>Visite</h4>
    ${d.endereco ? (mapa ? `<a href="${mapa}" target="_blank" rel="noopener">${esc(d.endereco)}</a>` : `<span>${esc(d.endereco)}</span>`) : ''}
    ${d.horario ? `<span>${esc(d.horario)}</span>` : ''}</div>
</div><div class="wrap ${classe}-fim">© ${new Date().getFullYear()} ${esc(d.empresa)}${d.cidade ? ` · ${esc(d.cidade)}` : ''}</div></footer>`;
};

export const vozes = (d: SiteData, classe: string, tit = 'O que dizem de nós'): string => {
  const lista = depoimentosValidos(d);
  if (!lista.length) return '';
  return `<section class="${classe}" id="vozes"><div class="wrap"><h2 class="rev">${tit}</h2><div class="${classe}-lista">${lista
    .map((x, i) => `<figure class="${classe}-v rev" style="--r:${i}"><span class="estrelas">★★★★★</span><blockquote>“${esc(x.texto)}”</blockquote>${
      x.autor ? `<figcaption>${esc(x.autor)}</figcaption>` : ''}</figure>`).join('')}</div></div></section>`;
};

/* ------------------------------------------------------------ CSS compartilhado */

/** Tema escuro: cores da marca misturadas ao preto, sem nunca depender de a marca ser clara. */
export const cssBaseEscura = (d: SiteData, fundo = '#07080c'): string => `
:root{--c1:${d.corPrimaria};--c2:${d.corDestaque};
  --bg:${fundo};--fg:#f4f5f7;--mudo:rgba(244,245,247,.64);--linha:rgba(255,255,255,.13);
  --c1c:color-mix(in srgb,var(--c1) 58%,#fff);--c2c:color-mix(in srgb,var(--c2) 72%,#fff);
  --raio:26px;--ease:cubic-bezier(.2,.7,.2,1)}
@supports (background:color-mix(in srgb,red,blue)){:root{--bg:color-mix(in srgb,var(--c1) 8%,${fundo})}}
body{background:${fundo};background:var(--bg);color:var(--fg);-webkit-font-smoothing:antialiased;overflow-x:hidden}
::selection{background:var(--c2);color:#111}
.wrap{width:min(1200px,90vw);margin:0 auto}
h1,h2,h3{color:#fff;letter-spacing:-.02em}
a{color:inherit}
${cssMovimento()}
${cssVidro()}
${cssMenu()}
`;

/** Tema claro, para os modelos de papel e vidro fosco. */
export const cssBaseClara = (d: SiteData, fundo = '#f6f3ee'): string => `
:root{--c1:${d.corPrimaria};--c2:${d.corDestaque};--bg:${fundo};--fg:#14161a;--mudo:#5d6370;--linha:rgba(20,22,26,.12);
  --c1c:color-mix(in srgb,var(--c1) 80%,#000);--c2c:var(--c2);--raio:26px;--ease:cubic-bezier(.2,.7,.2,1)}
body{background:${fundo};color:var(--fg);-webkit-font-smoothing:antialiased;overflow-x:hidden}
.wrap{width:min(1200px,90vw);margin:0 auto}
h1,h2,h3{color:#0d0f13;letter-spacing:-.02em}
${cssMovimento()}
${cssVidro()}
${cssMenu()}
`;

export const cssMovimento = (): string => `
html{scroll-behavior:smooth}
/* título palavra por palavra */
@keyframes palavra{from{opacity:0;filter:blur(14px);transform:translateY(.45em)}to{opacity:1;filter:blur(0);transform:none}}
.pal,.let{display:inline-block;animation:palavra .9s var(--ease) both;animation-delay:calc(var(--i,0) * 70ms + .15s)}
.let{animation-duration:.7s;animation-delay:calc(var(--i,0) * 38ms + .2s)}
.pal-g{display:inline-block;white-space:nowrap}
@keyframes sobe{from{opacity:0;transform:translateY(22px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
.entra{animation:sobe 1s var(--ease) both;animation-delay:calc(var(--d,0) * 120ms + .5s)}
/* revelação ao rolar: onde não há suporte, o conteúdo só aparece */
@keyframes rev{from{opacity:0;transform:translateY(44px) scale(.98);filter:blur(10px)}to{opacity:1;transform:none;filter:none}}
@keyframes rev-l{from{opacity:0;transform:translateX(-60px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
@keyframes rev-r{from{opacity:0;transform:translateX(60px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
@supports (animation-timeline:view()){
  .rev{animation:rev linear both;animation-timeline:view();animation-range:entry 4% entry 52%}
  .rev-l{animation:rev-l linear both;animation-timeline:view();animation-range:entry 4% entry 52%}
  .rev-r{animation:rev-r linear both;animation-timeline:view();animation-range:entry 4% entry 52%}
  .par{animation:par linear both;animation-timeline:view();animation-range:cover 0% cover 100%}
  .par-l{animation:par-l linear both;animation-timeline:view();animation-range:cover 0% cover 100%}
}
@keyframes par{from{transform:translateY(-8%) scale(1.12)}to{transform:translateY(8%) scale(1.12)}}
@keyframes par-l{from{transform:translateY(60px)}to{transform:translateY(-60px)}}
/* Ken Burns e crossfade */
@keyframes kb{from{transform:scale(1.04) translate(0,0)}to{transform:scale(1.2) translate(-2%,-1.5%)}}
.kb{animation:kb 22s ease-in-out infinite alternate}
@keyframes cf{0%{opacity:0}6%{opacity:1}34%{opacity:1}42%{opacity:0}100%{opacity:0}}
.cf{opacity:0;animation:cf 21s ease-in-out infinite}
.cf:nth-child(2){animation-delay:7s}.cf:nth-child(3){animation-delay:14s}.cf:first-child{opacity:1;animation-delay:0s}
/* faixa em movimento */
.marq{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.marq-t{display:flex;align-items:center;gap:clamp(24px,4vw,56px);width:max-content;animation:marq 38s linear infinite}
.marq:hover .marq-t{animation-play-state:paused}
.marq span{white-space:nowrap}
@keyframes marq{to{transform:translateX(-25%)}}
@keyframes marq-r{from{transform:translateX(-25%)}to{transform:translateX(0)}}
/* contador: o número final está em --n; a animação parte de zero */
@property --n{syntax:'<integer>';initial-value:0;inherits:false}
@keyframes conta{from{--n:0}}
.cont{counter-reset:n var(--n);font-variant-numeric:tabular-nums}
.cont::after{content:counter(n)}
@supports (animation-timeline:view()){.cont{animation:conta linear both;animation-timeline:view();animation-range:entry 10% entry 80%}}
@supports not (animation-timeline:view()){.cont{animation:conta 2.2s var(--ease) both}}
/* brilho que passa pelo botão */
@keyframes brilho{from{transform:translateX(-120%) skewX(-18deg)}to{transform:translateX(260%) skewX(-18deg)}}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
  .pal,.let,.entra,.rev,.rev-l,.rev-r{opacity:1!important;filter:none!important;transform:none!important}
  .cf:not(:first-child){display:none}
}
`;

export const cssVidro = (): string => `
.vidro{position:relative;background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.035));
  -webkit-backdrop-filter:blur(22px) saturate(170%);backdrop-filter:blur(22px) saturate(170%);
  border:1px solid rgba(255,255,255,.16);border-radius:var(--raio);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 0 -1px 0 rgba(255,255,255,.04),0 30px 60px -28px rgba(0,0,0,.65)}
.vidro::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:radial-gradient(120% 70% at 0% 0%,rgba(255,255,255,.2),transparent 45%);mix-blend-mode:soft-light}
.vidro-bt{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:10px;
  padding:15px 28px;border-radius:999px;font-weight:600;font-size:15px;color:#fff;cursor:pointer;
  background:linear-gradient(160deg,rgba(255,255,255,.22),rgba(255,255,255,.06));
  -webkit-backdrop-filter:blur(18px) saturate(170%);backdrop-filter:blur(18px) saturate(170%);
  border:1px solid rgba(255,255,255,.28);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 18px 38px -18px rgba(0,0,0,.7);
  transition:transform .3s var(--ease),box-shadow .3s var(--ease),background .3s}
.vidro-bt:hover{transform:translateY(-3px);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 26px 46px -18px rgba(0,0,0,.75)}
.vidro-bt::after{content:"";position:absolute;top:0;bottom:0;width:38%;left:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);
  transform:translateX(-120%) skewX(-18deg)}
.vidro-bt:hover::after{animation:brilho .9s var(--ease)}
.vidro-bt svg{width:18px;height:18px;flex:none}
.bt-cheio{display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:999px;font-weight:700;font-size:15px;
  background:linear-gradient(135deg,var(--c1c),var(--c2));color:#0b0c10;border:0;cursor:pointer;
  box-shadow:0 20px 40px -16px color-mix(in srgb,var(--c2) 70%,transparent);transition:transform .3s var(--ease),filter .3s}
.bt-cheio:hover{transform:translateY(-3px);filter:brightness(1.08)}
.bt-cheio svg{width:18px;height:18px}
.grao{position:relative}
.grao::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.09;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
/* cena gerada com as cores da marca, no lugar de uma foto que não existe */
.cena{position:relative;background-color:#080a10;
  background-image:radial-gradient(60% 80% at 18% 12%,color-mix(in srgb,var(--c1) 75%,transparent),transparent 62%),
  radial-gradient(55% 70% at 92% 88%,color-mix(in srgb,var(--c2) 52%,transparent),transparent 62%),
  radial-gradient(40% 50% at 60% 40%,color-mix(in srgb,var(--c1c) 24%,transparent),transparent 70%),
  linear-gradient(160deg,#0c0f17,#05060a)}
.cena[style*="--cena:1"]{background-image:radial-gradient(70% 80% at 85% 15%,color-mix(in srgb,var(--c2) 60%,transparent),transparent 62%),radial-gradient(60% 70% at 10% 90%,color-mix(in srgb,var(--c1) 70%,transparent),transparent 62%),linear-gradient(200deg,#0c0f17,#05060a)}
.cena[style*="--cena:2"]{background-image:radial-gradient(80% 60% at 50% 0%,color-mix(in srgb,var(--c1c) 55%,transparent),transparent 65%),radial-gradient(50% 60% at 15% 85%,color-mix(in srgb,var(--c2) 45%,transparent),transparent 62%),linear-gradient(120deg,#0c0f17,#05060a)}
.tem-foto{background-size:cover;background-position:center;background-color:#0b0d12}
`;

export const cssMenu = (): string => `
.menu-chk{position:absolute;opacity:0;pointer-events:none}
.menu-btn{display:none;width:44px;height:44px;border-radius:50%;cursor:pointer;place-items:center;align-content:center;gap:5px;
  background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.menu-btn i{display:block;width:18px;height:2px;border-radius:2px;background:currentColor;transition:transform .3s var(--ease),opacity .2s}
.menu-chk:checked~.menu-btn i:nth-child(1){transform:translateY(7px) rotate(45deg)}
.menu-chk:checked~.menu-btn i:nth-child(2){opacity:0}
.menu-chk:checked~.menu-btn i:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
`;

/** Rodapé escuro padrão da família. */
export const cssRodapeEscuro = (classe = 'rd'): string => `
.${classe}{padding:72px 0 28px;border-top:1px solid var(--linha);background:rgba(0,0,0,.28)}
.${classe}-in{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:44px}
.${classe}-marca{display:grid;gap:10px;align-content:start}
.${classe}-marca b{font-family:var(--fonte-t);font-size:26px;color:#fff;font-weight:400}
.${classe}-marca p{color:var(--mudo);max-width:34ch;margin:0}
.${classe}-logo-img{height:46px;width:auto;border-radius:10px}
.${classe}-logo-iniciais{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--c1c),var(--c2));color:#0b0c10;font-weight:800}
.${classe}-col{display:grid;gap:10px;align-content:start}
.${classe}-col h4{margin:0 0 6px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--mudo);font-weight:600}
.${classe}-col a,.${classe}-col span{color:#e9ebf0;font-size:15px}
.${classe}-col a:hover{color:var(--c2c)}
.${classe}-fim{margin-top:48px;padding-top:20px;border-top:1px solid var(--linha);font-size:13px;color:var(--mudo)}
@media(max-width:800px){.${classe}-in{grid-template-columns:1fr;gap:30px}}
`;

/** Barra de navegação de vidro, fixa no topo, com menu de celular sem script. */
export const cssNavVidro = (classe = 'nv'): string => `
.${classe}{position:fixed;z-index:50;top:16px;left:50%;transform:translateX(-50%);width:min(1120px,calc(100vw - 28px));
  display:flex;align-items:center;gap:22px;padding:10px 12px 10px 22px;border-radius:999px;
  background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.05));
  -webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%);
  border:1px solid rgba(255,255,255,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 24px 50px -24px rgba(0,0,0,.7)}
.${classe}-marca{display:flex;align-items:center;gap:12px;font-family:var(--fonte-t);font-size:21px;color:#fff;white-space:nowrap;min-width:0}
.${classe}-marca span{overflow:hidden;text-overflow:ellipsis}
.${classe}-logo-img{height:38px;width:auto;border-radius:10px}
.${classe}-logo-iniciais{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--c1c),var(--c2));color:#0b0c10;font-weight:800;font-size:14px;font-family:var(--fonte-c)}
.${classe}-links{display:flex;gap:26px;margin-left:auto;font-size:14px;font-weight:500;color:rgba(255,255,255,.78)}
.${classe}-links a{transition:color .2s}.${classe}-links a:hover{color:#fff}
.${classe}-cta{padding:11px 22px;font-size:14px}
@media(max-width:860px){
  .${classe}{gap:12px;border-radius:30px;flex-wrap:wrap;padding:10px 12px 10px 18px}
  .${classe}-marca{flex:1}
  .${classe}-cta{display:none}
  .menu-btn{display:grid;color:#fff}
  .${classe}-links{display:none;order:5;width:100%;flex-direction:column;gap:2px;margin:0;padding:6px 4px 10px;font-size:17px}
  .${classe}-links a{padding:12px 8px;border-top:1px solid rgba(255,255,255,.1)}
  .menu-chk:checked~.${classe}-links{display:flex}
}
`;

/** Depoimentos no tema escuro (classes `nr-vozes*`, geradas por `vozes()`). `serifa`: usa a fonte de títulos em itálico. */
export const cssVozesEscuras = (familia = '', itálico = false): string => `
.nr-vozes{padding:clamp(56px,8vw,110px) 0}
.nr-vozes h2{font-family:var(--fonte-t);font-weight:${itálico ? '400' : '700'};${itálico ? 'font-style:italic;' : ''}font-size:clamp(32px,5vw,64px);margin:0 0 30px;line-height:1}
.nr-vozes-lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.nr-vozes-v{margin:0;padding:32px;border-radius:var(--raio);border:1px solid var(--linha);
  background:linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.02));-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
.nr-vozes-v blockquote{margin:12px 0 16px;font-size:20px;line-height:1.45;color:#fff${familia ? '' : ''}}
.nr-vozes-v figcaption{color:var(--mudo);font-size:14px}
.nr-nota{display:inline-flex;gap:12px;align-items:center;padding:12px 20px;border-radius:999px;font-size:14px;margin-top:18px}
.nr-nota b{font-size:18px;color:#fff}.nr-nota span:last-child{color:var(--mudo)}
`;

/**
 * As seções extras (diferenciais, passos, perguntas e chamada final) vestidas com o tema da família,
 * em vez do cartão genérico: vidro no escuro, papel no claro.
 */
export const cssExtrasCinema = (escuro = true, serifa = true): string => `
.sx{background:transparent;color:var(--fg);position:relative}
.sx-alt{background:${escuro ? 'rgba(255,255,255,.025)' : 'rgba(0,0,0,.025)'}}
.sx-pre{color:var(--c2c);letter-spacing:.22em;font-weight:600;font-size:12px}
.sx-cab h2{font-family:var(--fonte-t);${serifa ? 'font-weight:400;font-style:italic;font-size:clamp(34px,5vw,64px);line-height:1' : ''}}
.sx-cab p:not(.sx-pre){color:var(--mudo)}
.sx-grade li,.sx-lista details{background:${escuro ? 'linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.03))' : 'rgba(255,255,255,.7)'};
  border:1px solid var(--linha);border-radius:var(--raio);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);
  transition:transform .4s var(--ease),border-color .3s}
.sx-grade li:hover{transform:translateY(-6px);border-color:color-mix(in srgb,var(--c2) 55%,transparent)}
.sx-ic{background:color-mix(in srgb,var(--c2) 16%,transparent);color:var(--c2c)}
.sx-grade h3,.sx-passos h3{font-family:var(--fonte-t);font-weight:${serifa ? '400' : '700'};color:inherit}
.sx-grade p,.sx-passos p,.sx-lista details>div{color:var(--mudo)}
.sx-passos li::before{background:linear-gradient(135deg,var(--c1c),var(--c2));color:#0b0c10}
.sx-lista summary{color:inherit}.sx-lista summary::after{color:var(--c2c)}
.sx-cta{background:transparent}
.sx-cta-in{background:linear-gradient(135deg,color-mix(in srgb,var(--c1) 70%,#000),color-mix(in srgb,var(--c2) 55%,#000));color:#fff;border:1px solid rgba(255,255,255,.18);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 40px 80px -40px rgba(0,0,0,.7)}
.sx-cta-in h2{font-family:var(--fonte-t);${serifa ? 'font-weight:400;font-style:italic' : ''};color:#fff}
.sx-btn-1{background:#fff;color:#0b0c10}.sx-btn-2{color:#fff;border-color:rgba(255,255,255,.55)}
`;

/** Esqueleto de um modelo da família: o documento (SEO, fontes, extras, barra do celular) e o CSS comum. */
/**
 * Fotos da galeria que o modelo não mostrou: entram numa faixa antes do rodapé, para nenhuma foto do cliente ficar de fora.
 * (Cada modelo escolhe quantas usa no desenho dele; o que sobra aparece aqui.)
 */
const galeriaQueSobrou = (d: SiteData, corpo: string): string => {
  const faltam = fotos(d).filter(src => !corpo.includes(src));
  if (!faltam.length) return '';
  return `<section class="cn-gal"><div class="wrap"><div class="cn-gal-g">${faltam
    .map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} — foto ${i + 1}" loading="lazy"></figure>`).join('')}</div></div></section>`;
};

const cssGaleriaQueSobrou = `
.cn-gal{padding:clamp(40px,6vw,80px) 0}
.cn-gal-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.cn-gal figure{margin:0;aspect-ratio:4/3;border-radius:var(--raio,24px);overflow:hidden;border:1px solid var(--linha,rgba(0,0,0,.1))}
.cn-gal img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease,ease)}.cn-gal figure:hover img{transform:scale(1.05)}
`;

/** Esqueleto de um modelo da família: o documento (SEO, fontes, extras, barra do celular), o selo e o WhatsApp flutuante. */
export const documentoCinema = (
  d: SiteData, par: ParFontes, css: string, corpo: string, escuro = true, serifa = true,
): string => {
  const rodapeAt = corpo.lastIndexOf('<footer');
  const extra = galeriaQueSobrou(d, corpo);
  const miolo = extra && rodapeAt >= 0 ? `${corpo.slice(0, rodapeAt)}${extra}
${corpo.slice(rodapeAt)}` : corpo;
  return documentoPremium(
    d, par, `${css}${cssComum(d)}${cssGaleriaQueSobrou}${cssExtrasCinema(escuro, serifa)}`,
    `<div id="topo"></div>${miolo}${fim(d, '')}`, { escuro, semRevelacao: true },
  );
};

/** Miniatura abstrata para a lista de modelos (a tela mostra o site real do lead quando há um). */
export const miniaturaCinema = (estilo: 'escuro' | 'claro' | 'misto', forma: 'herói' | 'bento' | 'colunas' | 'orbita' | 'camadas') =>
  ({ corPrimaria, corDestaque }: { corPrimaria: string; corDestaque: string }) => {
    const fundo = estilo === 'claro' ? '#f6f3ee' : '#07080c';
    const tinta = estilo === 'claro' ? '#14161a' : '#ffffff';
    const miolo = {
      herói: `<rect x="14" y="34" width="86" height="9" rx="4" fill="${tinta}" opacity=".95"/><rect x="14" y="48" width="58" height="9" rx="4" fill="${tinta}" opacity=".7"/>
        <rect x="14" y="68" width="34" height="11" rx="5.5" fill="${corDestaque}"/><rect x="104" y="30" width="44" height="50" rx="8" fill="${corPrimaria}" opacity=".55"/>`,
      bento: `<rect x="12" y="30" width="62" height="38" rx="7" fill="${corPrimaria}" opacity=".7"/><rect x="78" y="30" width="32" height="18" rx="5" fill="${tinta}" opacity=".22"/>
        <rect x="114" y="30" width="34" height="38" rx="7" fill="${corDestaque}" opacity=".8"/><rect x="78" y="52" width="32" height="16" rx="5" fill="${tinta}" opacity=".14"/>
        <rect x="12" y="72" width="50" height="14" rx="5" fill="${tinta}" opacity=".16"/><rect x="66" y="72" width="82" height="14" rx="5" fill="${tinta}" opacity=".24"/>`,
      colunas: `<rect x="12" y="32" width="40" height="52" rx="6" fill="${tinta}" opacity=".16"/><rect x="60" y="32" width="40" height="52" rx="6" fill="${corPrimaria}" opacity=".6"/>
        <rect x="108" y="32" width="40" height="52" rx="6" fill="${tinta}" opacity=".16"/><rect x="12" y="90" width="136" height="6" rx="3" fill="${corDestaque}" opacity=".8"/>`,
      orbita: `<ellipse cx="80" cy="62" rx="60" ry="22" fill="none" stroke="${tinta}" opacity=".3"/><circle cx="80" cy="46" r="12" fill="${corDestaque}"/>
        <circle cx="34" cy="64" r="8" fill="${corPrimaria}" opacity=".8"/><circle cx="126" cy="64" r="8" fill="${corPrimaria}" opacity=".8"/>`,
      camadas: `<rect x="14" y="24" width="132" height="22" rx="4" fill="${tinta}" opacity=".12"/><rect x="34" y="44" width="92" height="46" rx="8" fill="${corPrimaria}" opacity=".7"/>
        <rect x="46" y="98" width="68" height="6" rx="3" fill="${corDestaque}"/>`,
    }[forma];
    return `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg"><rect width="160" height="110" fill="${fundo}"/>
      <rect x="22" y="7" width="116" height="13" rx="6.5" fill="${tinta}" opacity=".14"/>${miolo}</svg>`;
  };

export { ICONES, ctaPrincipal, linkZap, linkTel, linkMapa, linkInsta, logo, seloGoogle, servicosValidos, depoimentosValidos, fotos, urlImagem, esc };
