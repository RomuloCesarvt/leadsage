/**
 * Cinema, parte 3: Neon Espacial, B2B Elipse e Campus Grid.
 *
 * - **Neon Espacial**: céu estrelado, tipografia condensada gigante e luz neon distribuída pelas quatro seções.
 * - **B2B Elipse**: a foto se abre numa elipse conforme a página rola, títulos letra por letra, galeria em mosaico e texto que acende ao rolar.
 * - **Campus Grid**: maiúsculas com destaque, brilho central, linhas de grade e menu de celular funcional.
 */
import type { SiteData, SiteTemplate } from './base';
import { partirSobre } from './premium-base';
import {
  PARES, ICONES, classeImagem, contador, contatoLinhas, cssBaseEscura, cssNavVidro, cssRodapeEscuro, cssVozesEscuras, ctaPrincipal,
  documentoCinema, esc, eyebrow, faixa, fotoDe, fundoImagem, imagens, letras, linkMapa, miniaturaCinema,
  nav, numerosReais, palavras, rodape, seloGoogle, servicosValidos, titulo, vozes,
} from './cinema-base';
import { iconeDoServico } from './premium-base';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Estrelas fixas (sempre as mesmas para o mesmo negócio): pontos de luz espalhados num `box-shadow`. */
const estrelas = (semente: string, n: number): string => {
  let h = 0;
  for (const c of semente) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  return Array.from({ length: n }, () => `${Math.round(rnd() * 2400)}px ${Math.round(rnd() * 1600)}px 0 ${rnd() > .8 ? 1 : 0}px rgba(255,255,255,${(.35 + rnd() * .65).toFixed(2)})`).join(',');
};

/* ====================================================== NEON ESPACIAL */

const neon: SiteTemplate = {
  id: 'neon',
  nome: 'Neon Espacial',
  descricao: 'Céu estrelado, letras condensadas gigantes e luz neon. Para negócios com energia: academias, bares, eventos e moda jovem.',
  nichos: ['Academias', 'Bares', 'Eventos', 'Moda', 'Barbearias', 'Games', 'Casas noturnas'],
  miniatura: miniaturaCinema('escuro', 'herói'),
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Energia de verdade, do primeiro ao último minuto.', 'Aqui o clima é bom, o atendimento é de perto e a gente faz questão de você voltar.');
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1);
    const fotosGal = imagens(d);
    const nums = numerosReais(d);
    const stars = estrelas(d.empresa, 90);
    return documentoCinema(d, PARES.anton, `
${cssBaseEscura(d, '#03040a')}
${cssNavVidro('nv')}
${cssRodapeEscuro('rd')}
${cssVozesEscuras('Anton')}
:root{--neon:color-mix(in srgb,var(--c2) 78%,#5dffb0);--neon2:color-mix(in srgb,var(--c1) 60%,#b04bff)}
.nx-ceu{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.nx-ceu::before,.nx-ceu::after{content:"";position:absolute;width:2px;height:2px;border-radius:50%;box-shadow:${stars};animation:brilha 6s ease-in-out infinite alternate}
.nx-ceu::after{box-shadow:${estrelas(d.empresa + 'b', 60)};animation-duration:9s;animation-delay:-3s;transform:translate(40px,30px)}
@keyframes brilha{from{opacity:.45}to{opacity:1}}
.nx-nebulosa{position:fixed;inset:0;z-index:-2;background:radial-gradient(50% 40% at 80% 10%,color-mix(in srgb,var(--c1) 40%,transparent),transparent 70%),radial-gradient(45% 40% at 10% 85%,color-mix(in srgb,var(--neon) 22%,transparent),transparent 70%)}
.nx-hero{position:relative;min-height:100svh;display:grid;align-content:center;padding:150px 0 90px;overflow:hidden;isolation:isolate}
.nx-foto{position:absolute;inset:0;z-index:-1;background-size:cover;background-position:center;opacity:.34;-webkit-mask-image:linear-gradient(180deg,#000 40%,transparent);mask-image:linear-gradient(180deg,#000 40%,transparent)}
.nx-ola{font-family:"Condiment",cursive;font-size:clamp(26px,3.4vw,46px);color:var(--neon);text-shadow:0 0 22px color-mix(in srgb,var(--neon) 70%,transparent);margin:0 0 4px;transform:rotate(-3deg);display:inline-block}
.nx-h1{font-family:var(--fonte-t);font-weight:400;text-transform:uppercase;font-size:clamp(54px,12.5vw,210px);line-height:.88;letter-spacing:.005em;margin:0 0 26px;word-spacing:.08em}
.nx-h1 .pal{background:linear-gradient(180deg,#fff 20%,color-mix(in srgb,#fff 40%,var(--neon)) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 30px color-mix(in srgb,var(--neon) 35%,transparent))}
.nx-sub{font-size:clamp(17px,1.5vw,20px);color:rgba(255,255,255,.76);max-width:50ch;line-height:1.65;margin:0 0 34px}
.nx-btns{display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.nx-btn{display:inline-flex;align-items:center;gap:12px;padding:17px 34px;border-radius:999px;font-weight:800;font-size:15px;letter-spacing:.06em;text-transform:uppercase;color:#04050a;
  background:var(--neon);box-shadow:0 0 0 0 color-mix(in srgb,var(--neon) 60%,transparent),0 18px 40px -14px var(--neon);animation:pulso 2.8s ease-out infinite;transition:transform .3s var(--ease)}
.nx-btn:hover{transform:translateY(-3px) scale(1.03)}.nx-btn svg{width:18px;height:18px}
@keyframes pulso{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--neon) 55%,transparent),0 18px 40px -14px var(--neon)}70%,100%{box-shadow:0 0 0 22px transparent,0 18px 40px -14px var(--neon)}}
.nx-faixa{padding:22px 0;background:var(--neon);color:#04050a;font-family:var(--fonte-t);font-size:clamp(24px,3.4vw,46px);text-transform:uppercase;transform:rotate(-1.2deg);margin:0 -2vw}
.nx-faixa i{color:#04050a;opacity:.55}
.sec{padding:clamp(70px,10vw,140px) 0;position:relative}
.nx-t{font-family:var(--fonte-t);font-weight:400;text-transform:uppercase;font-size:clamp(40px,7vw,110px);line-height:.92;margin:0 0 clamp(26px,4vw,52px)}
.nx-t em{font-style:normal;color:var(--neon);text-shadow:0 0 28px color-mix(in srgb,var(--neon) 55%,transparent)}
.nx-sobre .wrap{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(30px,5vw,80px);align-items:center}
.nx-sobre p{color:rgba(255,255,255,.8);font-size:clamp(17px,1.5vw,20px);line-height:1.75;max-width:52ch}
.nx-moldura{aspect-ratio:4/5;border-radius:var(--raio);overflow:hidden;position:relative;border:1px solid color-mix(in srgb,var(--neon) 55%,transparent);box-shadow:0 0 60px -10px color-mix(in srgb,var(--neon) 40%,transparent)}
.nx-moldura .par{position:absolute;inset:-8%;background-size:cover;background-position:center}
.nx-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
.nx-card{padding:32px 28px;min-height:250px;display:flex;flex-direction:column;border:1px solid var(--linha);transition:transform .5s var(--ease),border-color .4s,box-shadow .5s}
.nx-card:hover{transform:translateY(-8px);border-color:var(--neon);box-shadow:0 0 50px -10px color-mix(in srgb,var(--neon) 55%,transparent)}
.nx-card .ic{width:50px;height:50px;border-radius:14px;display:grid;place-items:center;color:var(--neon);background:color-mix(in srgb,var(--neon) 14%,transparent);margin-bottom:auto}
.nx-card h3{font-family:var(--fonte-t);font-weight:400;text-transform:uppercase;font-size:clamp(26px,2.4vw,34px);margin:26px 0 8px;line-height:1}
.nx-card p{color:var(--mudo);margin:0;font-size:15.5px;line-height:1.6}
.nx-card .n{position:absolute;top:22px;right:26px;font-family:var(--fonte-t);font-size:24px;color:rgba(255,255,255,.2)}
.nx-gal{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.nx-gal figure{margin:0;aspect-ratio:3/4;border-radius:var(--raio);overflow:hidden;border:1px solid var(--linha);transition:transform .6s var(--ease),border-color .4s}
.nx-gal figure:nth-child(even){transform:translateY(34px)}
.nx-gal figure:hover{border-color:var(--neon);transform:translateY(-6px) scale(1.02)}
.nx-gal img{width:100%;height:100%;object-fit:cover}
.nx-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px;text-align:center}
.nx-ct b{display:block;font-family:var(--fonte-t);font-weight:400;font-size:clamp(70px,10vw,150px);line-height:1;color:var(--neon);text-shadow:0 0 40px color-mix(in srgb,var(--neon) 50%,transparent)}
.nx-ct span{text-transform:uppercase;letter-spacing:.18em;font-size:13px;color:var(--mudo)}
.nx-cta{padding:clamp(60px,9vw,130px) 0}
.nx-cta-in{display:grid;grid-template-columns:1.3fr 1fr;gap:40px;align-items:center;padding:clamp(34px,6vw,76px);border-radius:calc(var(--raio) + 10px);border:1px solid color-mix(in srgb,var(--neon) 50%,transparent);box-shadow:0 0 90px -20px color-mix(in srgb,var(--neon) 45%,transparent)}
.nx-info p{display:flex;gap:14px;margin:0 0 14px;color:#ececf1}.nx-info svg{flex:none;margin-top:3px;color:var(--neon)}
@media(max-width:900px){.nx-sobre .wrap,.nx-cta-in{grid-template-columns:1fr}.nx-gal{grid-template-columns:repeat(2,1fr)}.nx-gal figure:nth-child(even){transform:none}}
`, `
<div class="nx-nebulosa" aria-hidden="true"></div><div class="nx-ceu" aria-hidden="true"></div>
${nav(d, [['#sobre', 'Sobre'], ['#servicos', 'Serviços'], ['#contato', 'Contato']])}
<section class="nx-hero">
  ${capa ? `<div class="nx-foto" style="background-image:url('${capa}')"></div>` : ''}
  <div class="wrap">
    <span class="nx-ola entra">${esc(eyebrow(d) || d.empresa)}</span>
    <h1 class="nx-h1">${palavras(titulo(d, d.empresa), 1)}</h1>
    <p class="nx-sub entra" style="--d:5">${capaTxt}</p>
    <div class="nx-btns entra" style="--d:6">${ctaPrincipal(d, 'Quero participar', 'nx-btn')}<a class="vidro-bt" href="#servicos">Ver o que rola${ICONES.seta}</a></div>
  </div>
</section>
<div style="overflow:hidden;padding:18px 0">${faixa([d.categoria || d.empresa, ...servicos.map(s => s.titulo)], 'marq nx-faixa')}</div>
<section class="sec nx-sobre" id="sobre"><div class="wrap">
  <div class="rev-l"><h2 class="nx-t">Quem é <em>${esc(d.empresa)}</em></h2><p>${sobreTxt}</p>${seloGoogle(d, 'nr-nota vidro')}</div>
  <div class="nx-moldura rev-r"><div class="${classeImagem(foto2 || capa, 'par')}" style="${fundoImagem(foto2 || capa, 1)}"></div></div>
</div></section>
${servicos.length ? `<section class="sec" id="servicos"><div class="wrap"><h2 class="nx-t rev">O que <em>rola</em> aqui</h2>
  <div class="nx-grade">${servicos.map((s, i) => `<article class="nx-card vidro rev"><span class="n">${pad2(i + 1)}</span><span class="ic">${iconeDoServico(i)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</article>`).join('')}</div></div></section>` : ''}
${fotosGal.length >= 3 ? `<section class="sec"><div class="wrap"><h2 class="nx-t rev">Dá uma <em>olhada</em></h2><div class="nx-gal">${fotosGal.slice(0, 4).map((src, i) => `<figure class="rev"><img src="${src}" alt="${esc(d.empresa)} — foto ${i + 1}" loading="lazy"></figure>`).join('')}</div></div></section>` : ''}
${nums.length >= 2 ? `<section class="sec"><div class="wrap"><div class="nx-num">${nums.map(n => n.valor !== undefined ? contador(n.valor, n.rotulo, 'nx-ct') : `<div class="nx-ct"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join('')}</div></div></section>` : ''}
${vozes(d, 'nr-vozes')}
<section class="nx-cta" id="contato"><div class="wrap"><div class="nx-cta-in rev">
  <div><h2 class="nx-t">Bora <em>conversar?</em></h2><div class="nx-btns">${ctaPrincipal(d, 'Chamar no WhatsApp', 'nx-btn')}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div></div>
  <div class="nx-info">${contatoLinhas(d, 'nx-lin')}</div>
</div></div></section>
${rodape(d, 'rd')}
`, true, false);
  },
};

/* ====================================================== B2B ELIPSE */

const b2b: SiteTemplate = {
  id: 'b2b',
  nome: 'B2B Elipse',
  descricao: 'A foto se abre em elipse conforme a página rola, títulos letra por letra e texto que acende ao rolar. Para empresas, indústrias e serviços técnicos.',
  nichos: ['Indústrias', 'Oficinas', 'Construção', 'Logística', 'Contabilidade', 'Engenharia', 'Tecnologia'],
  miniatura: miniaturaCinema('escuro', 'camadas'),
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Soluções profissionais para empresas que não podem parar.', 'Trabalhamos com método, prazo combinado e atendimento direto com quem entende do assunto.');
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0);
    const fotosGal = imagens(d);
    const nums = numerosReais(d);
    const apresentacao = esc(sobreTxt.replace(/&[a-z#0-9]+;/gi, ' ')).split(/\s+/).filter(Boolean).slice(0, 60)
      .map((p, i) => `<span class="leit" style="--i:${i}">${p}</span>`).join(' ');
    return documentoCinema(d, PARES.archivo, `
${cssBaseEscura(d, '#05090f')}
${cssNavVidro('nv')}
${cssRodapeEscuro('rd')}
${cssVozesEscuras('Archivo')}
.b2-palco{position:relative;height:230vh}
.b2-fixo{position:sticky;top:0;height:100svh;overflow:hidden;display:grid;place-items:center;isolation:isolate}
.b2-img{position:absolute;inset:0;z-index:-1;clip-path:ellipse(34% 26% at 50% 54%);background-size:cover;background-position:center}
.b2-fixo::before{content:"";position:absolute;inset:0;z-index:-2;background:radial-gradient(60% 50% at 50% 50%,color-mix(in srgb,var(--c1) 28%,transparent),transparent 70%)}
@keyframes elipse{from{clip-path:ellipse(34% 26% at 50% 54%)}to{clip-path:ellipse(130% 110% at 50% 50%)}}
@supports (animation-timeline:view()){
  .b2-palco{view-timeline-name:--b2;view-timeline-axis:block}
  .b2-img{animation:elipse linear both;animation-timeline:--b2;animation-range:cover 8% cover 62%}
}
@supports not (animation-timeline:view()){.b2-palco{height:auto}.b2-fixo{min-height:100svh;position:relative}.b2-img{clip-path:none}}
.b2-veu{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(5,9,15,.35),rgba(5,9,15,.6))}
.b2-conteudo{text-align:center;padding:0 5vw}
.b2-pre{font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:var(--c2c);margin:0 0 22px}
.b2-h1{font-family:var(--fonte-t);font-weight:800;font-size:clamp(40px,8.4vw,132px);line-height:.95;letter-spacing:-.035em;margin:0 auto 26px;max-width:16ch;text-wrap:balance}
.b2-h1 .pal-g{margin-right:.14em}
.b2-sub{max-width:54ch;margin:0 auto 34px;color:rgba(255,255,255,.82);font-size:clamp(17px,1.5vw,20px);line-height:1.65}
.b2-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.sec{padding:clamp(70px,10vw,150px) 0}
.rot{font-size:12px;letter-spacing:.26em;text-transform:uppercase;color:var(--c2c);margin:0 0 20px}
.b2-leit{font-family:var(--fonte-t);font-weight:700;font-size:clamp(28px,4.6vw,66px);line-height:1.12;letter-spacing:-.025em;max-width:24ch}
.leit{opacity:.18;display:inline-block}
@keyframes acende{to{opacity:1}}
@supports (animation-timeline:view()){.leit{animation:acende linear both;animation-timeline:view();animation-range:entry calc(var(--i) * 1.1%) entry calc(46% + var(--i) * 1.1%)}}
@supports not (animation-timeline:view()){.leit{opacity:1}}
.b2-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:clamp(30px,4vw,56px)}
.b2-card{padding:36px 30px;border-radius:var(--raio);border:1px solid var(--linha);background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.015));transition:transform .5s var(--ease),border-color .3s;position:relative;overflow:hidden}
.b2-card::before{content:"";position:absolute;left:0;top:0;height:2px;width:0;background:linear-gradient(90deg,var(--c1c),var(--c2));transition:width .7s var(--ease)}
.b2-card:hover{transform:translateY(-6px);border-color:rgba(255,255,255,.28)}.b2-card:hover::before{width:100%}
.b2-card .ic{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;background:color-mix(in srgb,var(--c1) 30%,transparent);color:#fff;margin-bottom:26px}
.b2-card h3{font-family:var(--fonte-t);font-weight:700;font-size:24px;letter-spacing:-.02em;margin:0 0 10px}
.b2-card p{margin:0;color:var(--mudo);line-height:1.65;font-size:15.5px}
.b2-mosaico{columns:3;column-gap:14px}
.b2-mosaico figure{margin:0 0 14px;border-radius:var(--raio);overflow:hidden;break-inside:avoid;border:1px solid var(--linha)}
.b2-mosaico img{width:100%;display:block;transition:transform 1.2s var(--ease)}.b2-mosaico figure:hover img{transform:scale(1.06)}
.b2-mosaico figure:nth-child(3n+1) img{aspect-ratio:3/4;object-fit:cover}.b2-mosaico figure:nth-child(3n+2) img{aspect-ratio:1;object-fit:cover}.b2-mosaico figure:nth-child(3n) img{aspect-ratio:4/5;object-fit:cover}
.b2-tit{font-family:var(--fonte-t);font-weight:800;font-size:clamp(34px,5.4vw,76px);line-height:1;letter-spacing:-.035em;margin:0 0 clamp(26px,4vw,48px);max-width:18ch}
.b2-faixa{padding:26px 0;border-block:1px solid var(--linha);font-family:var(--fonte-t);font-weight:700;font-size:clamp(20px,2.6vw,34px);color:rgba(255,255,255,.55);letter-spacing:-.01em;text-transform:uppercase}
.b2-faixa i{color:var(--c2);font-style:normal}
.b2-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));border-block:1px solid var(--linha)}
.b2-ct{padding:40px 30px;border-left:1px solid var(--linha)}.b2-ct:first-child{border-left:0}
.b2-ct b{display:block;font-family:var(--fonte-t);font-weight:800;font-size:clamp(54px,7vw,104px);letter-spacing:-.05em;line-height:1}
.b2-ct span{color:var(--mudo);font-size:14px}
.b2-fim{padding:clamp(60px,9vw,120px) 0;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--c1) 14%,transparent))}
.b2-fim .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(30px,5vw,80px);align-items:center}
.b2-fim h2{font-family:var(--fonte-t);font-weight:800;font-size:clamp(38px,6vw,90px);line-height:.95;letter-spacing:-.04em;margin:0 0 24px}
.b2-info{padding:34px}.b2-info p{display:flex;gap:14px;margin:0 0 14px;color:#e8ebf2}.b2-info svg{flex:none;margin-top:3px;color:var(--c2c)}
@media(max-width:900px){.b2-fim .wrap{grid-template-columns:1fr}.b2-mosaico{columns:2}.b2-ct{border-left:0;border-top:1px solid var(--linha)}.b2-ct:first-child{border-top:0}}
`, `
${nav(d, [['#empresa', 'A empresa'], ['#solucoes', 'Soluções'], ['#contato', 'Contato']])}
<section class="b2-palco"><div class="b2-fixo">
  <div class="${classeImagem(capa, 'b2-img')}" style="${fundoImagem(capa, 0)}"></div><div class="b2-veu"></div>
  <div class="b2-conteudo">
    <p class="b2-pre entra">${esc(eyebrow(d) || d.empresa)}</p>
    <h1 class="b2-h1">${letras(titulo(d, d.empresa), 4)}</h1>
    <p class="b2-sub entra" style="--d:8">${capaTxt}</p>
    <div class="b2-btns entra" style="--d:9">${ctaPrincipal(d, 'Solicitar contato', 'bt-cheio')}<a class="vidro-bt" href="#solucoes">Conhecer as soluções${ICONES.seta}</a></div>
  </div>
</div></section>
<section class="sec" id="empresa"><div class="wrap"><p class="rot">A empresa</p><p class="b2-leit">${apresentacao}</p>${seloGoogle(d, 'nr-nota vidro')}</div></section>
${faixa([d.categoria || d.empresa, ...servicos.map(s => s.titulo)], 'marq b2-faixa')}
${servicos.length ? `<section class="sec" id="solucoes"><div class="wrap"><p class="rot rev">Soluções</p><h2 class="b2-tit rev">O que entregamos para o seu negócio</h2>
  <div class="b2-grade">${servicos.map((s, i) => `<article class="b2-card rev"><span class="ic">${iconeDoServico(i)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</article>`).join('')}</div></div></section>` : ''}
${fotosGal.length >= 3 ? `<section class="sec"><div class="wrap"><h2 class="b2-tit rev">Na prática</h2><div class="b2-mosaico">${fotosGal.slice(0, 6).map((src, i) => `<figure class="rev"><img src="${src}" alt="${esc(d.empresa)} — foto ${i + 1}" loading="lazy"></figure>`).join('')}</div></div></section>` : ''}
${nums.length >= 2 ? `<section><div class="wrap"><div class="b2-num">${nums.map(n => n.valor !== undefined ? contador(n.valor, n.rotulo, 'b2-ct') : `<div class="b2-ct"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join('')}</div></div></section>` : ''}
${vozes(d, 'nr-vozes')}
<section class="b2-fim" id="contato"><div class="wrap">
  <div class="rev-l"><h2>${palavras('Vamos tirar o seu projeto do papel?', 0)}</h2><div class="b2-btns" style="justify-content:flex-start">${ctaPrincipal(d, 'Falar com um especialista', 'bt-cheio')}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div></div>
  <div class="b2-info vidro rev-r">${contatoLinhas(d, 'b2-lin')}</div>
</div></section>
${rodape(d, 'rd')}
`, true, false);
  },
};

/* ====================================================== CAMPUS GRID */

const campus: SiteTemplate = {
  id: 'campus',
  nome: 'Campus Grid',
  descricao: 'Maiúsculas com destaque, brilho central, linhas de grade e cartão de vidro. Para escolas, cursos, tecnologia e consultorias.',
  nichos: ['Escolas', 'Cursos', 'Tecnologia', 'Consultorias', 'Coaching', 'Idiomas', 'Coworking'],
  miniatura: miniaturaCinema('escuro', 'colunas'),
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Método claro, acompanhamento de perto e resultado que dá para ver.', 'Cada pessoa aprende e evolui no próprio ritmo, com orientação de quem faz.');
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0);
    const nums = numerosReais(d);
    const fotosGal = imagens(d);
    return documentoCinema(d, PARES.grotesk, `
${cssBaseEscura(d, '#040608')}
${cssNavVidro('nv')}
${cssRodapeEscuro('rd')}
${cssVozesEscuras('Space Grotesk')}
:root{--verde:color-mix(in srgb,var(--c2) 80%,#7dff9a)}
.cg-hero{position:relative;min-height:100svh;display:grid;place-items:center;padding:150px 0 90px;overflow:hidden;isolation:isolate}
.cg-hero::before{content:"";position:absolute;inset:0;z-index:-2;background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:84px 84px;-webkit-mask-image:radial-gradient(70% 70% at 50% 45%,#000,transparent);mask-image:radial-gradient(70% 70% at 50% 45%,#000,transparent)}
.cg-hero::after{content:"";position:absolute;left:50%;top:44%;width:min(900px,90vw);height:min(900px,90vw);transform:translate(-50%,-50%);z-index:-1;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--verde) 34%,transparent),transparent 62%);filter:blur(30px);animation:respira 7s ease-in-out infinite alternate}
@keyframes respira{from{opacity:.65;transform:translate(-50%,-50%) scale(.94)}to{opacity:1;transform:translate(-50%,-50%) scale(1.06)}}
.cg-foto{position:absolute;inset:0;z-index:-3;background-size:cover;background-position:center;opacity:.2}
.cg-in{text-align:center;display:grid;justify-items:center;gap:26px}
.cg-pre{display:inline-flex;gap:10px;align-items:center;padding:9px 18px;border-radius:999px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--verde)}
.cg-h1{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;font-size:clamp(40px,8vw,128px);line-height:.96;letter-spacing:-.03em;margin:0;max-width:16ch;text-wrap:balance}
.cg-h1 .pal:nth-child(3n){color:var(--verde);text-shadow:0 0 40px color-mix(in srgb,var(--verde) 55%,transparent)}
.cg-card{display:grid;grid-template-columns:1fr auto;gap:30px;align-items:center;padding:26px 30px;max-width:760px;width:100%;text-align:left;border-radius:calc(var(--raio) + 6px)}
.cg-card p{margin:0;color:rgba(255,255,255,.8);font-size:16px;line-height:1.6}
.cg-btn{display:inline-flex;align-items:center;gap:10px;padding:16px 28px;border-radius:999px;background:var(--verde);color:#03140a;font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:13px;white-space:nowrap;transition:transform .3s var(--ease),box-shadow .3s}
.cg-btn:hover{transform:translateY(-3px);box-shadow:0 20px 40px -14px var(--verde)}.cg-btn svg{width:18px;height:18px}
.sec{padding:clamp(70px,10vw,140px) 0;position:relative}
.cg-t{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;font-size:clamp(34px,5.6vw,84px);line-height:.98;letter-spacing:-.03em;margin:0 0 clamp(26px,4vw,50px);max-width:18ch}
.cg-t em{font-style:normal;color:var(--verde)}
.cg-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:1px;background:var(--linha);border:1px solid var(--linha);border-radius:var(--raio);overflow:hidden}
.cg-trilha{background:#050709;padding:34px 30px;min-height:260px;display:flex;flex-direction:column;transition:background .4s}
.cg-trilha:hover{background:color-mix(in srgb,var(--verde) 9%,#050709)}
.cg-trilha .n{font-size:13px;letter-spacing:.2em;color:var(--verde);margin-bottom:auto}
.cg-trilha h3{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;font-size:clamp(22px,2vw,28px);letter-spacing:-.02em;margin:34px 0 10px;line-height:1.05}
.cg-trilha p{margin:0;color:var(--mudo);font-size:15.5px;line-height:1.65}
.cg-sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(30px,5vw,80px);align-items:center}
.cg-sobre p:not(.rot){color:rgba(255,255,255,.78);font-size:clamp(17px,1.5vw,20px);line-height:1.75}
.rot{font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:var(--verde);margin:0 0 20px}
.cg-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.cg-gal figure{margin:0;aspect-ratio:4/3;border-radius:var(--raio);overflow:hidden;border:1px solid var(--linha)}.cg-gal img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}.cg-gal figure:hover img{transform:scale(1.06)}
.cg-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
.cg-ct{padding:34px 30px;border:1px solid var(--linha);border-radius:var(--raio);background:rgba(255,255,255,.025)}
.cg-ct b{display:block;font-family:var(--fonte-t);font-weight:700;font-size:clamp(54px,7vw,100px);line-height:1;color:var(--verde);letter-spacing:-.04em}.cg-ct span{color:var(--mudo);font-size:14px}
.cg-fim{padding:clamp(60px,9vw,130px) 0}
.cg-fim-in{display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:center;padding:clamp(34px,6vw,70px);border-radius:calc(var(--raio) + 10px)}
.cg-fim h2{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;font-size:clamp(36px,5.6vw,84px);line-height:.96;letter-spacing:-.03em;margin:0 0 22px}
.cg-info p{display:flex;gap:14px;margin:0 0 14px;color:#ececf1}.cg-info svg{flex:none;margin-top:3px;color:var(--verde)}
@media(max-width:900px){.cg-card{grid-template-columns:1fr}.cg-sobre .wrap,.cg-fim-in{grid-template-columns:1fr}.cg-gal{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.cg-hero::before{background-size:56px 56px}}
`, `
${nav(d, [['#sobre', 'Sobre'], ['#trilhas', 'Serviços'], ['#contato', 'Contato']])}
<section class="cg-hero">${capa ? `<div class="cg-foto" style="background-image:url('${capa}')"></div>` : ''}
  <div class="wrap cg-in">
    <span class="cg-pre vidro entra">${esc(eyebrow(d) || d.empresa)}</span>
    <h1 class="cg-h1">${palavras(titulo(d, d.empresa), 1)}</h1>
    <div class="cg-card vidro entra" style="--d:5"><p>${capaTxt}</p>${ctaPrincipal(d, 'Quero começar', 'cg-btn')}</div>
    ${seloGoogle(d, 'nr-nota vidro entra')}
  </div>
</section>
<section class="sec cg-sobre" id="sobre"><div class="wrap"><div class="rev-l"><p class="rot">Sobre</p><h2 class="cg-t">${esc(d.empresa)}</h2></div><div class="rev-r"><p>${sobreTxt}</p></div></div></section>
${servicos.length ? `<section class="sec" id="trilhas"><div class="wrap"><p class="rot rev">O que oferecemos</p><h2 class="cg-t rev">Escolha o seu <em>caminho</em></h2>
  <div class="cg-grade">${servicos.map((s, i) => `<article class="cg-trilha rev"><span class="n">${pad2(i + 1)} /</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</article>`).join('')}</div></div></section>` : ''}
${fotosGal.length >= 3 ? `<section class="sec"><div class="wrap"><div class="cg-gal">${fotosGal.slice(0, 6).map((src, i) => `<figure class="rev"><img src="${src}" alt="${esc(d.empresa)} — foto ${i + 1}" loading="lazy"></figure>`).join('')}</div></div></section>` : ''}
${nums.length >= 2 ? `<section class="sec"><div class="wrap"><div class="cg-num">${nums.map(n => n.valor !== undefined ? contador(n.valor, n.rotulo, 'cg-ct') : `<div class="cg-ct"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join('')}</div></div></section>` : ''}
${vozes(d, 'nr-vozes')}
<section class="cg-fim" id="contato"><div class="wrap"><div class="cg-fim-in vidro rev">
  <div><h2>Pronto para <em style="font-style:normal;color:var(--verde)">começar?</em></h2><div style="display:flex;flex-wrap:wrap;gap:12px">${ctaPrincipal(d, 'Chamar no WhatsApp', 'cg-btn')}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div></div>
  <div class="cg-info">${contatoLinhas(d, 'cg-lin')}</div>
</div></div></section>
${rodape(d, 'rd')}
`, true, false);
  },
};

export const LAYOUTS_CINEMA_3: SiteTemplate[] = [neon, b2b, campus];
export type { SiteData };
