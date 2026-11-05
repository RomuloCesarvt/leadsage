/**
 * Cinema, parte 6: Papel Editorial e Palco em Movimento.
 *
 * - **Papel Editorial**: claro, com textura de papel, selo que gira, marca-texto que corre ao rolar, cartões de serviço que se
 *   empilham e uma fita de fotos que se arrasta com o dedo. Para quem vende confiança e bom gosto.
 * - **Palco em Movimento**: escuro, com a galeria de serviços que anda de lado enquanto a página desce, borda de luz que gira
 *   em cada cartão e brilho pulsando nas palavras de destaque do título. Para quem vende energia e presença.
 *
 * Tudo em CSS puro (o site publicado não roda JavaScript). Onde o navegador não entende `animation-timeline`, o conteúdo
 * aparece normal e as galerias viram faixas de arrastar, nunca ficam escondidas.
 * Os textos fixos servem a qualquer ramo: nada de "cardápio", "obra", "coleção" ou "sorriso" aqui.
 */
import type { SiteTemplate } from './base';
import { partirSobre } from './premium-base';
import {
  PARES, ICONES, classeImagem, contador, contatoLinhas, cssBaseClara, cssBaseEscura, cssNavVidro, cssRodapeEscuro, cssVozesEscuras,
  ctaPrincipal, documentoCinema, esc, eyebrow, faixa, fotoDe, fundoImagem, imagens, linkMapa, miniaturaCinema, nav, numerosReais,
  palavras, rodape, seloGoogle, servicosValidos, titulo, vozes,
} from './cinema-base';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Texto que dá a volta no selo: ramo e cidade reais (ou o nome), repetidos até encher o círculo. */
const textoDoSelo = (partes: string[]): string => {
  const base = `${partes.join(' · ')} · `;
  let t = base;
  while (t.length < 34) t += base;
  return t;
};

/* ====================================================== PAPEL EDITORIAL */

const papel: SiteTemplate = {
  id: 'papel',
  nome: 'Papel Editorial',
  descricao: 'Claro, com textura de papel: selo que gira, marca-texto que corre ao rolar, cartões que se empilham e fita de fotos. Para quem vende confiança e bom gosto.',
  nichos: ['Estética', 'Psicologia', 'Advocacia', 'Imobiliárias', 'Arquitetura', 'Joalherias', 'Hotéis e pousadas', 'Fotografia', 'Confeitarias'],
  miniatura: miniaturaCinema('claro', 'camadas'),
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Cuidado de verdade, do primeiro contato ao resultado.', 'Atendimento próximo, atenção aos detalhes e compromisso com o que foi combinado.');
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1) || capa;
    const nums = numerosReais(d);
    const fitas = imagens(d);
    const partesSelo = [(d.categoria || '').trim(), (d.cidade || '').trim()].filter(Boolean);
    const selo = esc(textoDoSelo(partesSelo.length ? partesSelo : [d.empresa]).toUpperCase());
    const inicial = esc([...(d.empresa || '·').trim()][0] || '·');
    return documentoCinema(d, PARES.instrument, `
${cssBaseClara(d, '#f4efe4')}
${cssNavVidro('pn')}
${cssRodapeEscuro('rd')}
:root{--tinta:#1b1712;--papel:#fbf7ee;--ouro:var(--c2)}
body{--fonte-c:"Inter",system-ui,sans-serif;color:var(--tinta)}
body::before{content:"";position:fixed;inset:0;z-index:60;pointer-events:none;opacity:.5;mix-blend-mode:multiply;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .38  0 0 0 0 .28  0 0 0 .16 0'/></filter><rect width='100%' height='100%' filter='url(%23p)'/></svg>")}
.pn{background:rgba(251,247,238,.78);border-color:rgba(27,23,18,.16);color:var(--tinta);box-shadow:0 18px 40px -26px rgba(27,23,18,.5)}
.pn-marca{color:var(--tinta)}.pn-links{color:rgba(27,23,18,.7)}.pn-links a:hover{color:#000}
.pn-cta{color:var(--tinta);background:rgba(255,255,255,.7);border-color:rgba(27,23,18,.25);box-shadow:none}
.menu-btn{color:var(--tinta);background:rgba(27,23,18,.06);border-color:rgba(27,23,18,.2)}
@media(max-width:860px){.pn-links a{border-top-color:rgba(27,23,18,.12)}}
.rd{background:#1b1712;--linha:rgba(255,255,255,.13);--mudo:rgba(244,245,247,.64)}.rd-marca b{color:#fff}
.sx-pre{color:var(--c1c)}.sx-ic{color:var(--c1c)}
.pp-prog{position:fixed;z-index:70;top:0;left:0;right:0;height:3px;background:var(--c1c);transform-origin:0 50%;transform:scaleX(0)}
@supports (animation-timeline:scroll()){.pp-prog{animation:pp-prog linear both;animation-timeline:scroll(root)}}
@keyframes pp-prog{to{transform:scaleX(1)}}
.pp-hero{position:relative;min-height:100svh;display:grid;align-items:center;padding:150px 0 90px;overflow:hidden}
.pp-hero .wrap{display:grid;grid-template-columns:1.25fr 1fr;gap:clamp(30px,5vw,80px);align-items:center}
.pp-pre{font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:var(--c1c);font-weight:600;margin:0 0 22px;display:flex;align-items:center;gap:12px}
.pp-pre::before{content:"";width:46px;height:1px;background:currentColor}
.pp-h1{font-family:var(--fonte-t);font-weight:400;font-size:clamp(48px,8.6vw,138px);line-height:.92;letter-spacing:-.03em;margin:0 0 26px;color:var(--tinta);text-wrap:balance}
.pp-h1 .pal:nth-child(even){font-style:italic;color:var(--c1c)}
.pp-sub{max-width:46ch;font-size:clamp(17px,1.5vw,20px);line-height:1.7;color:#4a4238;margin:0 0 34px}
.pp-btns{display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.pp-tinta{display:inline-flex;align-items:center;gap:10px;padding:16px 32px;border-radius:999px;background:var(--tinta);color:#fbf7ee;font-weight:600;font-size:15px;transition:transform .3s var(--ease),box-shadow .3s}
.pp-tinta:hover{transform:translateY(-3px);box-shadow:0 22px 40px -18px rgba(27,23,18,.7)}.pp-tinta svg{width:18px;height:18px}
.pp-link{display:inline-flex;align-items:center;gap:8px;font-weight:600;color:var(--tinta);border-bottom:1px solid currentColor;padding-bottom:3px}.pp-link svg{width:16px;height:16px}
.pp-quadro{position:relative;justify-self:center;width:min(440px,84%)}
.pp-foto{position:relative;aspect-ratio:4/5;background:var(--papel);padding:14px 14px 56px;border-radius:6px;box-shadow:0 40px 70px -30px rgba(27,23,18,.55),0 2px 0 rgba(255,255,255,.7) inset;transform:rotate(2.2deg);transition:transform .6s var(--ease)}
.pp-foto:hover{transform:rotate(0)}
.pp-foto .im{position:absolute;inset:14px 14px 56px;background-size:cover;background-position:center;border-radius:2px}
.pp-foto .leg{position:absolute;left:18px;right:18px;bottom:16px;font-family:var(--fonte-t);font-style:italic;font-size:22px;color:#4a4238;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pp-selo{position:absolute;z-index:2;width:clamp(104px,13vw,150px);left:-9%;bottom:-6%;color:var(--c1c);animation:pp-gira 28s linear infinite;filter:drop-shadow(0 8px 14px rgba(27,23,18,.18))}
.pp-selo text{font-family:var(--fonte-c);font-weight:700;fill:currentColor;text-transform:uppercase}
.pp-selo .miolo{font-family:var(--fonte-t);font-style:italic;font-weight:400;text-transform:none;font-size:62px}
.pp-selo circle{fill:var(--papel);stroke:currentColor;stroke-width:1.2}
@keyframes pp-gira{to{transform:rotate(360deg)}}
.pp-sec{padding:clamp(80px,11vw,160px) 0}
.pp-rot{font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:var(--c1c);font-weight:600;margin:0 0 18px}
.pp-t{font-family:var(--fonte-t);font-weight:400;font-size:clamp(38px,6vw,92px);line-height:.96;letter-spacing:-.025em;margin:0 0 clamp(26px,4vw,52px);color:var(--tinta)}
.pp-t em{color:var(--c1c)}
.pp-fala{font-family:var(--fonte-t);font-size:clamp(30px,5vw,72px);line-height:1.12;letter-spacing:-.02em;max-width:22ch;margin:0;color:var(--tinta)}
.pp-marca{color:inherit;background:linear-gradient(var(--c2),var(--c2)) no-repeat 0 88%/100% .36em;padding:0 .08em;-webkit-box-decoration-break:clone;box-decoration-break:clone}
@supports (animation-timeline:view()){.pp-marca{background-size:0 .36em;animation:pp-marca linear both;animation-timeline:view();animation-range:entry 25% cover 50%}}
@keyframes pp-marca{to{background-size:100% .36em}}
.pp-sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(30px,6vw,100px);align-items:center}
.pp-sobre p:not(.pp-rot){font-size:clamp(17px,1.5vw,20px);line-height:1.8;color:#4a4238;max-width:52ch}
.pp-sobre .selo{margin-top:22px}
.pp-arco{position:relative;aspect-ratio:4/5;border-radius:var(--raio);overflow:hidden;box-shadow:0 40px 70px -34px rgba(27,23,18,.5)}
.pp-arco .par{position:absolute;inset:-8%;background-size:cover;background-position:center}
.pp-pilha{display:grid;gap:0}
.pp-card{position:sticky;top:calc(92px + var(--i) * 18px);min-height:clamp(220px,32vh,320px);margin:0 0 clamp(16px,3vh,32px);padding:clamp(26px,3.4vw,46px);border-radius:var(--raio);
  display:grid;grid-template-columns:auto 1fr;gap:clamp(18px,4vw,60px);align-items:center;border:1px solid rgba(27,23,18,.12);
  background:var(--papel);box-shadow:0 30px 60px -36px rgba(27,23,18,.55);transform:rotate(-.5deg)}
.pp-card:nth-child(even){transform:rotate(.5deg);background:color-mix(in srgb,var(--c2) 14%,var(--papel))}
.pp-card:nth-child(3n){background:color-mix(in srgb,var(--c1) 9%,var(--papel))}
.pp-card .n{font-family:var(--fonte-t);font-style:italic;font-size:clamp(64px,10vw,150px);line-height:.8;color:var(--c1c)}
.pp-card h3{font-family:var(--fonte-t);font-weight:400;font-size:clamp(28px,3.6vw,52px);line-height:1;letter-spacing:-.02em;margin:0 0 12px;color:var(--tinta)}
.pp-card p{margin:0;color:#4a4238;line-height:1.65;max-width:52ch}
.pp-fita-sec{padding:clamp(60px,8vw,110px) 0;overflow:hidden}
.pp-fita{display:flex;gap:clamp(14px,2vw,26px);overflow-x:auto;scroll-snap-type:x mandatory;padding:20px 5vw 36px;scrollbar-width:thin}
.pp-pol{flex:0 0 clamp(220px,28vw,330px);scroll-snap-align:center;margin:0;padding:12px 12px 14px;background:var(--papel);border-radius:5px;box-shadow:0 26px 46px -26px rgba(27,23,18,.55);transition:transform .5s var(--ease)}
.pp-pol:nth-child(odd){transform:rotate(-1.8deg)}.pp-pol:nth-child(even){transform:rotate(1.6deg) translateY(14px)}.pp-pol:hover{transform:rotate(0) translateY(-6px)}
.pp-pol img{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:2px}
.pp-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));border-block:1px solid rgba(27,23,18,.18)}
.pp-ct{padding:clamp(30px,4vw,54px) 28px;border-left:1px solid rgba(27,23,18,.18);text-align:center}.pp-ct:first-child{border-left:0}
.pp-ct b{display:block;font-family:var(--fonte-t);font-style:italic;font-weight:400;font-size:clamp(64px,9vw,130px);line-height:1;color:var(--c1c)}
.pp-ct span{font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#6b6155}
.pp-vozes{padding:clamp(60px,9vw,130px) 0}
.pp-vozes h2{font-family:var(--fonte-t);font-weight:400;font-style:italic;font-size:clamp(34px,5vw,64px);margin:0 0 30px;line-height:1;color:var(--tinta)}
.pp-vozes-lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
.pp-vozes-v{margin:0;padding:32px;border-radius:var(--raio);background:var(--papel);border:1px solid rgba(27,23,18,.1);box-shadow:0 24px 44px -32px rgba(27,23,18,.5)}
.pp-vozes-v .estrelas{color:var(--c2)}
.pp-vozes-v blockquote{margin:12px 0 16px;font-family:var(--fonte-t);font-size:23px;line-height:1.35;color:var(--tinta)}
.pp-vozes-v figcaption{color:#6b6155;font-size:14px}
.pp-ficha{position:relative;max-width:900px;margin:0 auto;padding:clamp(30px,5vw,60px);background:var(--papel);border-radius:var(--raio);border:2px dashed rgba(27,23,18,.28);display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(24px,4vw,56px);align-items:center}
.pp-ficha h2{font-family:var(--fonte-t);font-weight:400;font-size:clamp(34px,4.8vw,64px);line-height:1;letter-spacing:-.02em;margin:0 0 20px;color:var(--tinta)}
.pp-lin{display:flex;gap:12px;margin:0 0 12px;color:#3a3229}.pp-lin svg{flex:none;margin-top:3px;color:var(--c1c)}.pp-lin a:hover{color:var(--c1c)}
@media(max-width:900px){.pp-hero .wrap,.pp-sobre .wrap,.pp-ficha{grid-template-columns:1fr}.pp-quadro{margin-top:20px}.pp-selo{left:-2%}.pp-card{grid-template-columns:1fr;gap:6px}.pp-card .n{font-size:64px}.pp-ct{border-left:0;border-top:1px solid rgba(27,23,18,.18)}.pp-ct:first-child{border-top:0}}
`, `
<div class="pp-prog" aria-hidden="true"></div>
${nav(d, [['#sobre', 'Sobre'], ['#servicos', 'Serviços'], ['#contato', 'Contato']], 'pn')}
<section class="pp-hero"><div class="wrap">
  <div><p class="pp-pre entra">${esc(eyebrow(d) || d.empresa)}</p><h1 class="pp-h1">${palavras(titulo(d, d.empresa), 1)}</h1>
    <p class="pp-sub entra" style="--d:5">${capaTxt}</p>
    <div class="pp-btns entra" style="--d:6">${ctaPrincipal(d, 'Falar no WhatsApp', 'pp-tinta')}<a class="pp-link" href="#servicos">Ver serviços${ICONES.seta}</a></div></div>
  <div class="pp-quadro entra" style="--d:4"><div class="pp-foto"><div class="${classeImagem(capa, 'im')}" style="${fundoImagem(capa, 0)}"></div><span class="leg">${esc(d.empresa)}</span></div>
    <svg class="pp-selo" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="96"/><defs><path id="pp-c" d="M100,100 m-72,0 a72,72 0 1,1 144,0 a72,72 0 1,1 -144,0"/></defs>
      <text font-size="15" letter-spacing="2"><textPath href="#pp-c" textLength="448" lengthAdjust="spacing">${selo}</textPath></text><text class="miolo" x="100" y="122" text-anchor="middle">${inicial}</text></svg></div>
</div></section>
<section class="pp-sec" id="sobre"><div class="wrap"><p class="pp-rot rev">Em poucas palavras</p><p class="pp-fala"><mark class="pp-marca">${sobreTxt}</mark></p></div></section>
<section class="pp-sec pp-sobre" style="padding-top:0"><div class="wrap">
  <div class="rev-l"><p class="pp-rot">Quem somos</p><h2 class="pp-t">${esc(d.empresa)}</h2><p>${capaTxt}</p>${seloGoogle(d, 'nr-nota selo')}</div>
  <div class="pp-arco rev-r"><div class="${classeImagem(foto2, 'par')}" style="${fundoImagem(foto2, 1)}"></div></div>
</div></section>
${servicos.length ? `<section class="pp-sec" id="servicos" style="padding-top:0"><div class="wrap"><p class="pp-rot rev">Serviços</p><h2 class="pp-t rev">Como podemos <em>ajudar</em></h2>
  <div class="pp-pilha">${servicos.map((s, i) => `<article class="pp-card" style="--i:${i}"><span class="n">${pad2(i + 1)}</span><div><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</div></article>`).join('')}</div></div></section>` : ''}
${fitas.length >= 3 ? `<section class="pp-fita-sec"><div class="wrap"><p class="pp-rot rev">Por dentro</p></div><div class="pp-fita">${fitas.slice(0, 8).map((src, i) => `<figure class="pp-pol"><img src="${src}" alt="${esc(d.empresa)} — foto ${i + 1}" loading="lazy"></figure>`).join('')}</div></section>` : ''}
${nums.length >= 2 ? `<section class="pp-sec" style="padding-block:clamp(40px,6vw,80px)"><div class="wrap"><div class="pp-num">${nums.map(x => x.valor !== undefined ? contador(x.valor, x.rotulo, 'pp-ct') : `<div class="pp-ct"><b>${x.texto}</b><span>${esc(x.rotulo)}</span></div>`).join('')}</div></div></section>` : ''}
${vozes(d, 'pp-vozes')}
<section class="pp-sec" id="contato"><div class="wrap"><div class="pp-ficha rev">
  <div><p class="pp-rot">Contato</p><h2>Vamos <em style="color:var(--c1c)">conversar</em>?</h2><div class="pp-btns">${ctaPrincipal(d, 'Chamar no WhatsApp', 'pp-tinta')}${linkMapa(d) ? `<a class="pp-link" href="${linkMapa(d)}" target="_blank" rel="noopener">Como chegar${ICONES.seta}</a>` : ''}</div></div>
  <div>${contatoLinhas(d, 'pp-lin')}</div></div></div></section>
${rodape(d, 'rd')}
`, false, true);
  },
};

/* ====================================================== PALCO EM MOVIMENTO */

const palco: SiteTemplate = {
  id: 'palco',
  nome: 'Palco em Movimento',
  descricao: 'Escuro e cheio de energia: galeria que anda de lado enquanto a página desce, borda de luz girando e brilho nas palavras de destaque. Para quem vende presença e atitude.',
  nichos: ['Academias', 'Barbearias', 'Tecnologia', 'Marketing', 'Escolas', 'Eventos', 'Financeiras', 'Moda', 'Turismo'],
  miniatura: miniaturaCinema('escuro', 'colunas'),
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Presença forte, resultado visível e atendimento que acompanha você.', 'Uma equipe que leva o trabalho a sério, com energia e atenção em cada etapa.');
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1) || capa;
    const nums = numerosReais(d);
    const n = Math.max(servicos.length, 1);
    return documentoCinema(d, PARES.grotesk, `
${cssBaseEscura(d, '#06070b')}
${cssNavVidro('nv')}
${cssRodapeEscuro('rd')}
${cssVozesEscuras('Space Grotesk')}
@property --pl-ang{syntax:'<angle>';initial-value:0deg;inherits:false}
@keyframes pl-gira{to{--pl-ang:360deg}}
@keyframes pl-brilho{0%,100%{text-shadow:0 0 0 transparent}50%{text-shadow:0 0 .55em color-mix(in srgb,var(--c2) 75%,transparent)}}
.pl-hero{position:relative;min-height:100svh;display:grid;align-content:end;padding:150px 0 clamp(60px,8vw,110px);overflow:hidden;isolation:isolate}
.pl-bg{position:absolute;inset:-4%;z-index:-2;background-size:cover;background-position:center}.pl-bg.tem-foto{animation:kb 24s ease-in-out infinite alternate}
.pl-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(6,7,11,.5),rgba(6,7,11,.2) 38%,rgba(6,7,11,.94)),radial-gradient(60% 60% at 80% 20%,color-mix(in srgb,var(--c2) 22%,transparent),transparent 70%)}
.pl-pre{display:inline-flex;align-items:center;gap:10px;padding:8px 16px;border-radius:999px;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--c2c);border:1px solid color-mix(in srgb,var(--c2) 45%,transparent);margin:0 0 24px;background:rgba(255,255,255,.05)}
.pl-pre::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--c2);box-shadow:0 0 12px var(--c2)}
.pl-h1{font-family:var(--fonte-t);font-weight:700;font-size:clamp(44px,9.4vw,152px);line-height:.92;letter-spacing:-.05em;margin:0 0 26px;max-width:15ch;text-wrap:balance}
.pl-h1 .pal:nth-child(3n+2){color:var(--c2c);animation:palavra .9s var(--ease) calc(var(--i,0) * 70ms + .15s) both,pl-brilho 3.6s ease-in-out 1.4s infinite}
.pl-sub{max-width:50ch;font-size:clamp(17px,1.5vw,20px);line-height:1.65;color:rgba(255,255,255,.8);margin:0 0 34px}
.pl-btns{display:flex;flex-wrap:wrap;gap:14px}
.pl-luz{position:relative;display:inline-flex;align-items:center;gap:10px;padding:17px 34px;border-radius:999px;font-weight:700;font-size:15px;color:#fff;background:#0d0f16;isolation:isolate;transition:transform .3s var(--ease)}
.pl-luz:hover{transform:translateY(-3px)}.pl-luz svg{width:18px;height:18px}
.pl-luz::before,.pl-card::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1.6px;pointer-events:none;
  background:conic-gradient(from var(--pl-ang),transparent 0 62%,var(--c2c) 82%,#fff 90%,transparent);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);
  animation:pl-gira 5s linear infinite}
.pl-fita{padding:22px 0;border-block:1px solid var(--linha);font-family:var(--fonte-t);font-weight:700;font-size:clamp(22px,3vw,38px);letter-spacing:-.03em;text-transform:uppercase;color:rgba(255,255,255,.88)}
.pl-fita i{color:var(--c2);font-style:normal}
.sec{padding:clamp(80px,11vw,160px) 0}
.pl-rot{font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:var(--c2c);font-weight:600;margin:0 0 18px}
.pl-t{font-family:var(--fonte-t);font-weight:700;font-size:clamp(34px,5.6vw,84px);line-height:.96;letter-spacing:-.045em;margin:0 0 clamp(24px,4vw,50px);max-width:16ch}
.pl-sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(30px,6vw,100px);align-items:center}
.pl-sobre p:not(.pl-rot){font-size:clamp(17px,1.5vw,20px);line-height:1.8;color:rgba(255,255,255,.76);max-width:50ch}
.pl-foto{position:relative;aspect-ratio:4/5;border-radius:var(--raio);overflow:hidden;border:1px solid var(--linha)}
.pl-foto .par{position:absolute;inset:-8%;background-size:cover;background-position:center}
.pl-h{position:relative;padding:clamp(60px,8vw,110px) 0}
.pl-cab{padding-bottom:30px}
.pl-trilho{display:flex;gap:clamp(14px,2vw,24px);overflow-x:auto;scroll-snap-type:x mandatory;padding:10px 5vw 30px;scrollbar-width:thin}
.pl-card{position:relative;flex:0 0 min(80vw,440px);min-height:clamp(340px,52vh,470px);scroll-snap-align:center;padding:30px;border-radius:var(--raio);display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;isolation:isolate;
  background:linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.03));border:1px solid var(--linha);
  transition:transform .5s var(--ease)}
.pl-card:hover{transform:perspective(900px) rotateX(3deg) rotateY(-5deg) translateY(-8px)}
.pl-card .fundo{position:absolute;inset:0;z-index:-1;opacity:.5;background-size:cover;background-position:center}
.pl-card::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,transparent 30%,rgba(6,7,11,.9))}
.pl-card .n{position:absolute;top:22px;left:26px;font-family:var(--fonte-t);font-weight:700;font-size:clamp(54px,6vw,84px);letter-spacing:-.06em;line-height:1;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.55)}
.pl-card h3{font-family:var(--fonte-t);font-weight:700;font-size:clamp(24px,2.6vw,34px);letter-spacing:-.035em;line-height:1.05;margin:0 0 10px}
.pl-card p{margin:0;color:rgba(255,255,255,.75);line-height:1.6;font-size:15.5px}
@media(min-width:801px){@supports (animation-timeline:view()){
  .pl-h{height:calc(100vh + var(--n) * 30vh);padding:0;view-timeline-name:--plh;view-timeline-axis:block}
  .pl-fixo{position:sticky;top:0;height:100svh;box-sizing:border-box;padding-top:104px;overflow:hidden;display:flex;flex-direction:column;justify-content:center}
  .pl-trilho{overflow:visible;scroll-snap-type:none;width:max-content;padding:10px 5vw 30px;animation:pl-corre linear both;animation-timeline:--plh;animation-range:cover 100vh cover calc(100% - 100vh)}
  .pl-card{flex-basis:clamp(340px,30vw,440px)}
}}
@keyframes pl-corre{to{transform:translateX(calc(-100% + 100vw))}}
.pl-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1px;background:var(--linha);border:1px solid var(--linha);border-radius:var(--raio);overflow:hidden}
.pl-ct{background:#080a10;padding:clamp(34px,4vw,54px) 32px}
.pl-ct b{display:block;font-family:var(--fonte-t);font-weight:700;font-size:clamp(56px,7.4vw,112px);letter-spacing:-.06em;line-height:1;color:var(--c2c)}
.pl-ct span{color:var(--mudo);font-size:14px}
.pl-fim{text-align:center}
.pl-fim-in{max-width:880px;margin:0 auto;padding:clamp(40px,7vw,90px) clamp(24px,5vw,70px);border-radius:calc(var(--raio) + 10px)}
.pl-fim h2{font-family:var(--fonte-t);font-weight:700;font-size:clamp(38px,6.4vw,96px);line-height:.95;letter-spacing:-.05em;margin:0 0 18px}
.pl-fim p{color:var(--mudo);max-width:46ch;margin:0 auto 30px}
.pl-cont{display:grid;gap:10px;margin:34px auto 0;max-width:420px;text-align:left}
.pl-lin{display:flex;gap:12px;margin:0;color:#e9ebf0}.pl-lin svg{flex:none;margin-top:3px;color:var(--c2c)}
@media(max-width:900px){.pl-sobre .wrap{grid-template-columns:1fr}}
`, `
${nav(d, [['#sobre', 'Sobre'], ['#servicos', 'Serviços'], ['#contato', 'Contato']])}
<section class="pl-hero"><div class="${classeImagem(capa, 'pl-bg')}" style="${fundoImagem(capa, 1)}"></div>
  <div class="wrap"><p class="pl-pre entra">${esc(eyebrow(d) || d.empresa)}</p><h1 class="pl-h1">${palavras(titulo(d, d.empresa), 1)}</h1>
    <p class="pl-sub entra" style="--d:5">${capaTxt}</p>
    <div class="pl-btns entra" style="--d:6">${ctaPrincipal(d, 'Falar no WhatsApp', 'pl-luz')}<a class="vidro-bt" href="#servicos">Ver serviços${ICONES.seta}</a></div></div></section>
${servicos.length ? faixa(servicos.map(s => s.titulo), 'marq pl-fita') : ''}
<section class="sec pl-sobre" id="sobre"><div class="wrap">
  <div class="rev-l"><p class="pl-rot">Quem somos</p><h2 class="pl-t">${esc(d.empresa)}</h2><p>${sobreTxt}</p>${seloGoogle(d, 'nr-nota vidro selo')}</div>
  <div class="pl-foto rev-r"><div class="${classeImagem(foto2, 'par')}" style="${fundoImagem(foto2, 2)}"></div></div>
</div></section>
${servicos.length ? `<section class="pl-h" id="servicos" style="--n:${n}"><div class="pl-fixo"><div class="wrap pl-cab"><p class="pl-rot rev">Serviços</p><h2 class="pl-t rev" style="margin:0">O que fazemos por você</h2></div>
  <div class="pl-trilho">${servicos.map((s, i) => { const f = fotoDe(d, i + 1); return `<article class="pl-card"><div class="${classeImagem(f, 'fundo')}" style="${fundoImagem(f, i % 3)}"></div><span class="n">${pad2(i + 1)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</article>`; }).join('')}</div></div></section>` : ''}
${nums.length >= 2 ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="pl-num">${nums.map(x => x.valor !== undefined ? contador(x.valor, x.rotulo, 'pl-ct') : `<div class="pl-ct"><b>${x.texto}</b><span>${esc(x.rotulo)}</span></div>`).join('')}</div></div></section>` : ''}
${vozes(d, 'nr-vozes')}
<section class="sec pl-fim" id="contato"><div class="wrap"><div class="pl-fim-in vidro rev"><h2>${palavras('Vamos conversar?', 0)}</h2><p>Chame agora no WhatsApp e conte o que você precisa.</p>
  <div class="pl-btns" style="justify-content:center">${ctaPrincipal(d, 'Chamar no WhatsApp', 'pl-luz')}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div>
  <div class="pl-cont">${contatoLinhas(d, 'pl-lin')}</div></div></div></section>
${rodape(d, 'rd')}
`, true, false);
  },
};

export const LAYOUTS_CINEMA_6: SiteTemplate[] = [papel, palco];
