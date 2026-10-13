/**
 * Cinema, parte 2: Portfólio Bento e Editorial Cruzado.
 *
 * - **Portfólio Bento**: contador de carregamento, nome gigante, grade bento alternada, galeria que se move com a rolagem
 *   e rodapé em faixa gigante com o gradiente da marca.
 * - **Editorial Cruzado**: capa com fotos em crossfade, About / Destaque / Filosofia / Serviços reveladas ao rolar.
 */
import type { SiteTemplate } from './base';
import { partirSobre } from './premium-base';
import {
  PARES, ICONES, classeImagem, contador, contatoLinhas, cssBaseEscura, cssNavVidro, cssRodapeEscuro, ctaPrincipal,
  documentoCinema, esc, eyebrow, faixa, fotoDe, frases, fundoImagem, imagens, linkMapa, miniaturaCinema,
  nav, numerosReais, palavras, rodape, seloGoogle, servicosValidos, titulo, vozes,
} from './cinema-base';

const pad2 = (n: number) => String(n).padStart(2, '0');

/* ====================================================== PORTFÓLIO BENTO */

const portfolio: SiteTemplate = {
  id: 'portfolio',
  nome: 'Portfólio Bento',
  descricao: 'Contador de carregamento, nome gigante, grade bento e galeria que se move com a rolagem. Para estúdios e marcas com identidade.',
  nichos: ['Barbearias', 'Estúdios', 'Tatuagem', 'Fotografia', 'Design', 'Academias', 'Moda'],
  miniatura: miniaturaCinema('escuro', 'bento'),
  render: d => {
    const [capaTxt] = partirSobre(d, 'Trabalho autoral, feito com cuidado e entregue com orgulho.', '');
    const servicos = servicosValidos(d);
    const fotosD = imagens(d);
    const capa = fotoDe(d, 0);
    const nums = numerosReais(d);
    const spans = [7, 5, 5, 7, 4, 4, 4];
    const gigante = [0, 1, 2, 3].map(() => '<span class="pf-gigante">Vamos conversar</span><i class="pf-gigante" aria-hidden="true">✦</i>').join('');
    return documentoCinema(d, PARES.syne, `
${cssBaseEscura(d, '#050506')}
${cssNavVidro('nv')}
${cssRodapeEscuro('rd')}
.pf-carga{position:fixed;inset:0;z-index:200;background:#050506;display:grid;place-items:center;pointer-events:none;animation:carga-sai .7s ease 2.35s both}
@keyframes carga-sai{to{opacity:0;visibility:hidden}}
.pf-carga-in{text-align:center}
.pf-n{--n:100;counter-reset:h calc(round(down,var(--n)/100,1)) t calc(round(down,mod(var(--n),100)/10,1)) u calc(mod(var(--n),10));
  font-family:var(--fonte-t);font-weight:800;font-size:clamp(90px,22vw,260px);line-height:.9;letter-spacing:-.04em;font-variant-numeric:tabular-nums;
  background:linear-gradient(135deg,var(--c1c),var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent;
  animation:conta 2.2s cubic-bezier(.65,0,.25,1) both}
.pf-n::after{content:counter(h) counter(t) counter(u)}
.pf-carga p{margin:18px 0 0;letter-spacing:.3em;font-size:12px;text-transform:uppercase;color:var(--mudo)}
.pf-hero{position:relative;min-height:100svh;padding:140px 0 60px;display:grid;align-content:end;overflow:hidden;isolation:isolate}
.pf-hero .pal{animation-delay:calc(var(--i,0) * 70ms + 2.55s)}.pf-hero .entra{animation-delay:calc(var(--d,0) * 120ms + 2.9s)}
.pf-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(60% 55% at 85% 20%,color-mix(in srgb,var(--c1) 55%,transparent),transparent 70%),radial-gradient(50% 50% at 5% 100%,color-mix(in srgb,var(--c2) 40%,transparent),transparent 70%)}
.pf-topo{display:grid;grid-template-columns:1.5fr 1fr;gap:clamp(24px,4vw,64px);align-items:end}
.pf-h1{font-family:var(--fonte-t);font-weight:800;font-size:clamp(44px,9.6vw,150px);line-height:.9;letter-spacing:-.045em;text-transform:uppercase;margin:0;overflow-wrap:break-word}
.pf-h1.m{font-size:clamp(38px,7vw,112px)}.pf-h1.g{font-size:clamp(34px,5.6vw,88px)}
.pf-h1 .pal{display:inline-block;background:linear-gradient(100deg,#fff 10%,var(--c1c) 60%,var(--c2) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:.06em}
.pf-lado{display:grid;gap:22px;align-content:end}
.pf-lado p{margin:0;color:var(--mudo);font-size:clamp(16px,1.4vw,19px);line-height:1.65}
.pf-moldura{position:relative;aspect-ratio:5/4;border-radius:calc(var(--raio) + 6px);overflow:hidden;border:1px solid var(--linha)}
.pf-moldura>div:first-child{position:absolute;inset:0}
.pf-moldura .vidro{position:absolute;left:14px;bottom:14px;padding:10px 16px;border-radius:999px;display:flex;gap:10px;align-items:center;font-size:14px}
.pf-btns{display:flex;flex-wrap:wrap;gap:12px}
.pf-faixa{margin-top:clamp(36px,6vw,70px);padding:20px 0;border-block:1px solid var(--linha);font-family:var(--fonte-t);font-weight:800;font-size:clamp(22px,3vw,40px);text-transform:uppercase;letter-spacing:-.02em;color:rgba(255,255,255,.88)}
.pf-faixa i{color:var(--c2);font-style:normal}
.sec{padding:clamp(64px,9vw,130px) 0}
.pf-cab{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:clamp(26px,4vw,50px);flex-wrap:wrap}
.pf-cab h2{font-family:var(--fonte-t);font-weight:800;font-size:clamp(34px,6vw,84px);line-height:.95;letter-spacing:-.04em;text-transform:uppercase;margin:0}
.pf-cab p{margin:0;color:var(--mudo);max-width:34ch}
.pf-bento{display:grid;grid-template-columns:repeat(12,1fr);gap:14px;grid-auto-rows:minmax(300px,auto)}
.pf-t{position:relative;border-radius:var(--raio);overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:26px;isolation:isolate;border:1px solid var(--linha);min-height:300px;transition:transform .6s var(--ease)}
.pf-t:hover{transform:translateY(-6px)}
.pf-t .fundo{position:absolute;inset:0;z-index:-2;transition:transform 1.4s var(--ease)}
.pf-t:hover .fundo{transform:scale(1.07)}
.pf-t::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,transparent 30%,rgba(5,5,6,.85))}
.pf-t .num{position:absolute;top:22px;left:26px;font-family:var(--fonte-t);font-weight:800;font-size:15px;letter-spacing:.14em;color:#fff;opacity:.8}
.pf-t h3{font-family:var(--fonte-t);font-weight:800;font-size:clamp(24px,2.6vw,38px);letter-spacing:-.03em;text-transform:uppercase;line-height:1;margin:0 0 8px}
.pf-t p{margin:0;color:rgba(255,255,255,.78);font-size:15px;max-width:44ch}
.pf-t .seta{position:absolute;top:18px;right:18px;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;transition:transform .5s var(--ease)}
.pf-t:hover .seta{transform:rotate(-45deg) scale(1.08)}
.pf-ex{height:240vh;position:relative}
.pf-palco{position:sticky;top:0;height:100svh;overflow:hidden;display:grid;align-content:end;gap:16px;padding-bottom:5vh}
.pf-palco h2{position:absolute;z-index:2;left:5vw;top:12vh;font-family:var(--fonte-t);font-weight:800;font-size:clamp(34px,6vw,84px);line-height:.95;letter-spacing:-.04em;text-transform:uppercase;margin:0;color:#fff;text-shadow:0 8px 40px rgba(0,0,0,.6)}
.pf-fila{display:flex;gap:16px;width:max-content;padding-left:8vw}
.pf-fila figure{margin:0;flex:none;width:clamp(240px,27vw,400px);aspect-ratio:16/11;border-radius:var(--raio);overflow:hidden;border:1px solid var(--linha)}
.pf-fila figure>div{width:100%;height:100%}
.pf-fila.b{padding-left:0;margin-left:-14vw}
@keyframes desliza{from{transform:translateX(0)}to{transform:translateX(-34%)}}
@keyframes desliza-r{from{transform:translateX(-34%)}to{transform:translateX(0)}}
@supports (animation-timeline:view()){
  .pf-ex{view-timeline-name:--pfex;view-timeline-axis:block}
  .pf-fila.a{animation:desliza linear both;animation-timeline:--pfex;animation-range:cover 10% cover 90%}
  .pf-fila.b{animation:desliza-r linear both;animation-timeline:--pfex;animation-range:cover 10% cover 90%}
}
.pf-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
.pf-ct{padding:34px 30px;border-radius:var(--raio);border:1px solid var(--linha);background:rgba(255,255,255,.03)}
.pf-ct b{display:block;font-family:var(--fonte-t);font-weight:800;font-size:clamp(54px,7vw,100px);letter-spacing:-.05em;line-height:1;
  background:linear-gradient(135deg,var(--c1c),var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent}
.pf-ct span{color:var(--mudo);font-size:14px}
.pf-fim{padding:clamp(56px,8vw,110px) 0 0;overflow:hidden}
.pf-fim .marq-t{gap:46px}
.pf-gigante{font-family:var(--fonte-t);font-weight:800;font-size:clamp(70px,16vw,240px);line-height:1;letter-spacing:-.05em;text-transform:uppercase;white-space:nowrap;
  background:linear-gradient(100deg,var(--c1c),var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent}
.pf-ctt{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,5vw,80px);padding:clamp(34px,5vw,64px) 0 clamp(50px,7vw,90px)}
.pf-ctt p{display:flex;gap:12px;align-items:flex-start;margin:0 0 12px;color:#e9ebf0}.pf-ctt svg{flex:none;margin-top:3px;color:var(--c2c)}
.pf-ctt-acoes{display:flex;flex-wrap:wrap;gap:12px;align-content:start}
.nr-vozes{padding:clamp(56px,8vw,110px) 0}.nr-vozes h2{font-family:var(--fonte-t);font-weight:800;text-transform:uppercase;font-size:clamp(30px,5vw,64px);margin:0 0 30px}
.nr-vozes-lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.nr-vozes-v{margin:0;padding:30px;border-radius:var(--raio);border:1px solid var(--linha);background:rgba(255,255,255,.03)}
.nr-vozes-v blockquote{margin:12px 0 16px;font-size:19px;line-height:1.45;color:#fff}.nr-vozes-v figcaption{color:var(--mudo);font-size:14px}
@media(max-width:900px){.pf-topo,.pf-ctt{grid-template-columns:1fr}.pf-bento{grid-template-columns:1fr}.pf-t{grid-column:auto!important}.pf-ex{height:auto}.pf-palco{position:relative;height:auto;padding:60px 0}.pf-palco h2{position:static;padding:0 5vw 20px}.pf-fila.b{margin-left:0}}
@media(max-width:900px){.pf-palco h2,.pf-cab h2,.pf-t h3{font-size:clamp(24px,7.2vw,40px);overflow-wrap:anywhere}}
@media(prefers-reduced-motion:reduce){.pf-carga{display:none}}
`, `
<div class="pf-carga" aria-hidden="true"><div class="pf-carga-in"><div class="pf-n"></div><p>${esc(d.empresa)}</p></div></div>
${nav(d, [['#trabalhos', 'Serviços'], ['#explore', 'Galeria'], ['#contato', 'Contato']])}
<section class="pf-hero"><div class="wrap">
  <div class="pf-topo">
    <h1 class="pf-h1 ${d.empresa.length > 20 ? 'g' : d.empresa.length > 12 ? 'm' : ''}">${palavras(d.empresa, 1)}</h1>
    <div class="pf-lado">
      <p class="entra" style="--d:2">${esc(titulo(d, d.categoria || ''))}</p>
      <div class="pf-moldura entra" style="--d:3"><div class="${classeImagem(capa, 'kb')}" style="${fundoImagem(capa, 2)}"></div>${seloGoogle(d, 'vidro')}</div>
      <div class="pf-btns entra" style="--d:4">${ctaPrincipal(d, 'Falar no WhatsApp', 'bt-cheio')}<a class="vidro-bt" href="#trabalhos">Ver serviços${ICONES.seta}</a></div>
    </div>
  </div>
  ${faixa([d.categoria || d.empresa, ...servicos.map(s => s.titulo)], 'marq pf-faixa')}
</div></section>
${servicos.length ? `<section class="sec" id="trabalhos"><div class="wrap">
  <div class="pf-cab rev"><h2>O que a gente faz</h2><p>${capaTxt}</p></div>
  <div class="pf-bento">${servicos.map((s, i) => { const f = fotoDe(d, i + 1); return `<article class="pf-t rev" style="grid-column:span ${spans[i % spans.length]}">
    <div class="${classeImagem(f, 'fundo')}" style="${fundoImagem(f, i % 3)}"></div><span class="num">${pad2(i + 1)}</span><span class="seta vidro">${ICONES.seta}</span>
    <h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</article>`; }).join('')}</div></div></section>` : ''}
${fotosD.length >= 3 ? `<section class="pf-ex" id="explore"><div class="pf-palco"><h2>Explore<br>o nosso mundo</h2>
  <div class="pf-fila a">${[...fotosD, ...fotosD].map(src => `<figure><div class="tem-foto" style="background-image:url('${src}')"></div></figure>`).join('')}</div>
  <div class="pf-fila b">${[...fotosD].reverse().concat([...fotosD].reverse()).map(src => `<figure><div class="tem-foto" style="background-image:url('${src}')"></div></figure>`).join('')}</div>
</div></section>` : ''}
${nums.length >= 2 ? `<section class="sec"><div class="wrap"><div class="pf-num">${nums.map(n => n.valor !== undefined ? contador(n.valor, n.rotulo, 'pf-ct') : `<div class="pf-ct"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join('')}</div></div></section>` : ''}
${vozes(d, 'nr-vozes')}
<section class="pf-fim" id="contato">
  <div class="marq"><div class="marq-t">${gigante}</div></div>
  <div class="wrap pf-ctt"><div>${contatoLinhas(d, 'pf-lin')}</div><div class="pf-ctt-acoes">${ctaPrincipal(d, 'Chamar no WhatsApp', 'bt-cheio')}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div></div>
</section>
${rodape(d, 'rd')}
`);
  },
};

/* ====================================================== EDITORIAL CRUZADO */

const editorial: SiteTemplate = {
  id: 'editorial',
  nome: 'Editorial Cruzado',
  descricao: 'Capa em tela cheia com fotos que se cruzam, texto de revista e seções About, Destaque, Filosofia e Serviços. Para marcas que contam história.',
  nichos: ['Restaurantes', 'Cafeterias', 'Padarias premium', 'Hotéis', 'Vinícolas', 'Floriculturas', 'Eventos'],
  miniatura: miniaturaCinema('escuro', 'colunas'),
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Um lugar para quem aprecia o que é bem feito.', 'Cada detalhe é pensado para que a sua experiência seja inesquecível, do primeiro ao último momento.');
    const servicos = servicosValidos(d);
    const lista = imagens(d);
    const camadas = lista.length >= 2 ? lista.slice(0, 3).map(src => `<div class="cf tem-foto" style="background-image:url('${src}')"></div>`).join('')
      : lista.length === 1 ? `<div class="cf tem-foto" style="background-image:url('${lista[0]}')"></div>`
      : [0, 1, 2].map(i => `<div class="cf cena" style="--cena:${i}"></div>`).join('');
    const destaque = fotoDe(d, 1), terceira = fotoDe(d, 2);
    const nums = numerosReais(d);
    const fil = frases(d.sobre);
    const manifesto = (fil.length >= 3 ? fil.slice(1) : [`${d.categoria || 'Nosso trabalho'} feito com verdade.`, 'Atendimento de perto, sem pressa e sem improviso.', `${d.empresa}.`]).slice(0, 3);
    const depo = (d.depoimentos || []).find(x => x.texto?.trim());
    const h1 = titulo(d, d.empresa);
    return documentoCinema(d, PARES.instrument, `
${cssBaseEscura(d, '#0a0806')}
${cssNavVidro('nv')}
${cssRodapeEscuro('rd')}
.ed-hero{position:relative;min-height:100svh;display:grid;place-items:center;text-align:center;padding:150px 0 100px;overflow:hidden;isolation:isolate}
.ed-fundo{position:absolute;inset:0;z-index:-2}
.ed-fundo>div{position:absolute;inset:-3%;background-size:cover;background-position:center}
.ed-fundo>.cf{animation:cf 21s ease-in-out infinite,kb 21s ease-in-out infinite alternate}
.ed-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(80% 60% at 50% 45%,rgba(10,8,6,.15),rgba(10,8,6,.75)),linear-gradient(180deg,rgba(10,8,6,.5),transparent 30%,rgba(10,8,6,.9))}
.ed-pre{font-size:13px;letter-spacing:.32em;text-transform:uppercase;color:rgba(255,255,255,.8);margin:0 0 26px}
.ed-h1{font-family:var(--fonte-t);font-weight:400;font-size:clamp(52px,10vw,160px);line-height:.92;letter-spacing:-.04em;margin:0 auto 28px;max-width:14ch;word-spacing:.1em;text-wrap:balance}
.ed-sub{max-width:52ch;margin:0 auto 38px;font-size:clamp(17px,1.5vw,20px);color:rgba(255,255,255,.8);line-height:1.65}
.ed-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.ed-pontos{position:absolute;bottom:34px;left:50%;transform:translateX(-50%);display:flex;gap:10px}
.ed-pontos i{width:34px;height:2px;background:rgba(255,255,255,.3);overflow:hidden;position:relative;border-radius:2px}
.ed-pontos i::after{content:"";position:absolute;inset:0;background:#fff;transform:scaleX(0);transform-origin:left;animation:ponto 21s linear infinite}
.ed-pontos i:nth-child(2)::after{animation-delay:7s}.ed-pontos i:nth-child(3)::after{animation-delay:14s}
@keyframes ponto{0%{transform:scaleX(0)}33%{transform:scaleX(1)}33.1%,100%{transform:scaleX(0)}}
.sec{padding:clamp(80px,11vw,170px) 0}
.rot{font-size:12px;letter-spacing:.26em;text-transform:uppercase;color:var(--c2c);margin:0 0 20px}
.ed-sobre .wrap{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(30px,6vw,100px);align-items:start}
.ed-sobre h2{font-family:var(--fonte-t);font-weight:400;font-size:clamp(40px,6vw,92px);line-height:.95;margin:0}
.ed-sobre p:not(.rot){font-size:clamp(19px,2vw,28px);line-height:1.5;color:rgba(255,255,255,.82);margin:0 0 24px;font-family:var(--fonte-t)}
.ed-nota{margin-top:10px;display:inline-flex;gap:12px;align-items:center;padding:12px 20px;border-radius:999px;font-size:14px}
.ed-nota b{font-size:18px;color:#fff}.ed-nota span:last-child{color:var(--mudo)}
.ed-destaque{position:relative;min-height:90svh;display:grid;align-items:end;overflow:hidden;isolation:isolate}
.ed-destaque .par{position:absolute;inset:-10% 0;z-index:-2;background-size:cover;background-position:center}
.ed-destaque::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(10,8,6,.5),rgba(10,8,6,.2) 40%,rgba(10,8,6,.92))}
.ed-destaque .wrap{padding:90px 0 clamp(40px,6vw,80px);display:grid;grid-template-columns:1.4fr 1fr;gap:40px;align-items:end}
.ed-destaque blockquote{margin:0;font-family:var(--fonte-t);font-size:clamp(30px,4.6vw,66px);line-height:1.02;letter-spacing:-.02em}
.ed-destaque cite{display:block;margin-top:18px;font:500 14px var(--fonte-c);letter-spacing:.14em;text-transform:uppercase;color:var(--mudo)}
.ed-stats{display:grid;gap:14px}
.ed-st{padding:20px 24px;border-radius:20px}
.ed-st b{display:block;font-family:var(--fonte-t);font-size:46px;line-height:1;font-weight:400}.ed-st span{color:var(--mudo);font-size:14px}
.ed-filo{text-align:center}
.ed-filo-l{font-family:var(--fonte-t);font-size:clamp(34px,6.4vw,98px);line-height:1.02;letter-spacing:-.03em;margin:0 auto 14px;max-width:18ch;text-wrap:balance}
.ed-filo-l:nth-of-type(even){font-style:italic;color:var(--c2c)}
.ed-filo .vidro-bt{margin-top:40px}
.ed-serv h2{font-family:var(--fonte-t);font-weight:400;font-size:clamp(40px,6vw,92px);line-height:.95;margin:0 0 clamp(28px,4vw,56px)}
.ed-lin{display:grid;grid-template-columns:90px 1fr 1.1fr 40px;gap:24px;align-items:center;padding:30px 4px;border-top:1px solid var(--linha);transition:padding .5s var(--ease),background .4s}
.ed-lin:last-child{border-bottom:1px solid var(--linha)}
.ed-lin:hover{padding-left:20px;background:linear-gradient(90deg,color-mix(in srgb,var(--c2) 10%,transparent),transparent)}
.ed-lin .n{font-family:var(--fonte-t);font-size:30px;color:var(--c2c)}
.ed-lin h3{font-family:var(--fonte-t);font-weight:400;font-size:clamp(28px,3.4vw,50px);margin:0;line-height:1}
.ed-lin p{margin:0;color:var(--mudo)}
.ed-lin .s{color:var(--c2c);transition:transform .5s var(--ease)}.ed-lin:hover .s{transform:translateX(8px)}
.ed-ctt{padding:clamp(60px,9vw,130px) 0}
.ed-ctt .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(30px,6vw,90px);align-items:center}
.ed-ctt h2{font-family:var(--fonte-t);font-weight:400;font-size:clamp(44px,7vw,110px);line-height:.92;margin:0 0 24px}
.ed-t{color:var(--mudo);font-size:18px;max-width:40ch;margin:0 0 28px}
.ed-info{padding:34px;display:grid;gap:4px}
.ed-info p{display:flex;gap:14px;margin:0 0 12px;color:#ececf1}.ed-info svg{flex:none;margin-top:3px;color:var(--c2c)}
.ed-foto3{margin-top:30px;aspect-ratio:16/9;border-radius:var(--raio);overflow:hidden;border:1px solid var(--linha)}.ed-foto3>div{width:100%;height:100%}
.nr-vozes{padding:clamp(56px,8vw,110px) 0}.nr-vozes h2{font-family:var(--fonte-t);font-weight:400;font-size:clamp(34px,5vw,64px);margin:0 0 30px}
.nr-vozes-lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.nr-vozes-v{margin:0;padding:32px;border-radius:var(--raio);border:1px solid var(--linha);background:rgba(255,255,255,.035)}
.nr-vozes-v blockquote{margin:12px 0 16px;font-family:var(--fonte-t);font-size:22px;line-height:1.35;color:#fff}.nr-vozes-v figcaption{color:var(--mudo);font-size:14px}
@media(max-width:900px){.ed-sobre .wrap,.ed-destaque .wrap,.ed-ctt .wrap{grid-template-columns:1fr}.ed-lin{grid-template-columns:50px 1fr;gap:6px 14px}.ed-lin p{grid-column:2}.ed-lin .s{display:none}}
`, `
${nav(d, [['#historia', 'Sobre'], ['#filosofia', 'Filosofia'], ['#servicos', 'Serviços'], ['#contato', 'Contato']])}
<section class="ed-hero"><div class="ed-fundo">${camadas}</div>
  <div class="wrap"><p class="ed-pre entra">${esc(eyebrow(d) || 'Bem-vindo')}</p>
    <h1 class="ed-h1">${palavras(h1, 1)}</h1>
    <p class="ed-sub entra" style="--d:5">${capaTxt}</p>
    <div class="ed-btns entra" style="--d:6">${ctaPrincipal(d, 'Falar no WhatsApp', 'bt-cheio')}<a class="vidro-bt" href="#servicos">Ver o que oferecemos${ICONES.seta}</a></div></div>
  ${(lista.length >= 2 || !lista.length) ? '<div class="ed-pontos" aria-hidden="true"><i></i><i></i><i></i></div>' : ''}
</section>
<section class="sec ed-sobre" id="historia"><div class="wrap">
  <div class="rev-l"><p class="rot">Nossa história</p><h2>${esc(d.empresa)}</h2></div>
  <div class="rev-r"><p>${sobreTxt}</p>${seloGoogle(d, 'ed-nota vidro')}</div>
</div></section>
<section class="ed-destaque"><div class="${classeImagem(destaque, 'par')}" style="${fundoImagem(destaque, 1)}"></div>
  <div class="wrap"><div class="rev"><blockquote>${esc(depo?.texto || titulo(d, d.categoria || d.empresa))}</blockquote>
    <cite>${esc(depo?.autor || d.empresa)}</cite></div>
    ${nums.length ? `<div class="ed-stats rev-r">${nums.map(n => n.valor !== undefined ? contador(n.valor, n.rotulo, 'ed-st vidro') : `<div class="ed-st vidro"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join('')}</div>` : ''}</div></section>
<section class="sec ed-filo" id="filosofia"><div class="wrap"><p class="rot rev">Filosofia</p>
  ${manifesto.map(f => `<p class="ed-filo-l rev">${esc(f)}</p>`).join('')}
  <a class="vidro-bt rev" href="#contato">Vamos conversar${ICONES.seta}</a></div></section>
${servicos.length ? `<section class="sec ed-serv" id="servicos"><div class="wrap"><h2 class="rev">O que <em style="font-style:italic;color:var(--c2c)">oferecemos</em></h2>
  <div>${servicos.map((s, i) => `<article class="ed-lin rev"><span class="n">${pad2(i + 1)}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p><span class="s">${ICONES.seta}</span></article>`).join('')}</div></div></section>` : ''}
${vozes(d, 'nr-vozes')}
<section class="ed-ctt" id="contato"><div class="wrap">
  <div class="rev-l"><p class="rot">Contato</p><h2>${palavras('Venha nos conhecer', 0)}</h2><p class="ed-t">Chame agora e receba atendimento direto.</p>
    <div class="ed-btns" style="justify-content:flex-start">${ctaPrincipal(d, 'Chamar no WhatsApp', 'bt-cheio')}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div></div>
  <div class="rev-r"><div class="ed-info vidro">${contatoLinhas(d, 'ed-lin2')}</div>${terceira ? `<div class="ed-foto3"><div class="tem-foto" style="background-image:url('${terceira}')"></div></div>` : ''}</div>
</div></section>
${rodape(d, 'rd')}
`);
  },
};

export const LAYOUTS_CINEMA_2: SiteTemplate[] = [portfolio, editorial];
