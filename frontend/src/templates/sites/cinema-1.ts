/**
 * Cinema, parte 1: três modelos escuros de página única.
 *
 * - **Noir Vidro**: luxo escuro, título em serifa itálica revelado palavra por palavra, cartões de vidro líquido.
 * - **Portfólio Bento**: contador de carregamento, grade bento alternada, galeria com parallax e rodapé em faixa.
 * - **Editorial Cruzado**: capa com fotos em crossfade, About / Destaque / Filosofia / Serviços.
 */
import type { SiteData, SiteTemplate } from './base';
import { partirSobre, iconeDoServico } from './premium-base';
import {
  PARES, ICONES, classeImagem, contador, contatoLinhas, cssBaseEscura, cssNavVidro, cssRodapeEscuro, ctaPrincipal,
  documentoCinema, esc, eyebrow, faixa, fotoDe, frases, fundoImagem, imagens, letras, linkMapa, logo, miniaturaCinema,
  nav, numerosReais, palavras, rodape, seloGoogle, servicosValidos, titulo, vozes,
} from './cinema-base';

const pad2 = (n: number) => String(n).padStart(2, '0');

/* ====================================================== 1. NOIR VIDRO */

const noir: SiteTemplate = {
  id: 'noir',
  nome: 'Noir Vidro',
  descricao: 'Escuro e luxuoso: título em serifa itálica, vidro líquido e revelações suaves. Para quem vende confiança e sofisticação.',
  nichos: ['Estética', 'Clínicas', 'Advocacia', 'Joalherias', 'Imobiliárias', 'Arquitetura', 'Odontologia premium'],
  miniatura: miniaturaCinema('escuro', 'herói'),
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Atendimento de verdade, com cuidado em cada detalhe.', 'Do primeiro contato ao resultado, cada etapa é pensada para você se sentir bem atendido e voltar sempre.');
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1) || capa;
    const nums = numerosReais(d);
    const fotosGal = imagens(d).slice(1);
    const h1 = titulo(d, `${d.categoria || 'Excelência'}${d.cidade ? ` em ${d.cidade}` : ''}, do jeito que deveria ser`);
    return documentoCinema(d, PARES.instrument, `
${cssBaseEscura(d, '#06070b')}
${cssNavVidro('nv')}
${cssRodapeEscuro('rd')}
.nr-hero{position:relative;min-height:100svh;display:grid;align-items:end;padding:150px 0 clamp(48px,7vw,84px);overflow:hidden;isolation:isolate}
.nr-bg{position:absolute;inset:-4%;z-index:-3}
.nr-bg.tem-foto{animation:kb 24s ease-in-out infinite alternate}
.nr-hero::before{content:"";position:absolute;inset:0;z-index:-2;background:linear-gradient(180deg,rgba(6,7,11,.55) 0%,rgba(6,7,11,.2) 38%,rgba(6,7,11,.92) 100%),radial-gradient(70% 60% at 20% 100%,rgba(6,7,11,.75),transparent)}
.nr-hero::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.09;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.nr-etq{display:inline-flex;align-items:center;gap:10px;padding:9px 18px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;border-radius:999px;color:#fff}
.nr-etq i{width:7px;height:7px;border-radius:50%;background:var(--c2);box-shadow:0 0 14px var(--c2)}
.nr-h1{font-family:var(--fonte-t);font-style:italic;font-weight:400;font-size:clamp(46px,8.6vw,132px);line-height:.94;letter-spacing:-.035em;word-spacing:.12em;margin:26px 0 24px;max-width:15ch;text-wrap:balance}
.nr-sub{font-size:clamp(17px,1.6vw,21px);line-height:1.6;color:rgba(255,255,255,.78);max-width:52ch;margin:0 0 34px}
.nr-btns{display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.nr-nota{margin-top:clamp(36px,6vw,64px);display:inline-flex;gap:14px;align-items:center;padding:14px 22px;border-radius:999px}
.nr-nota .estrelas{font-size:15px}.nr-nota b{font-size:20px;color:#fff}.nr-nota span:last-child{color:var(--mudo);font-size:14px}
.nr-rolar{position:absolute;right:5vw;bottom:44px;width:1px;height:90px;background:linear-gradient(var(--c2),transparent);animation:sobe 2s var(--ease) 1.2s both}
.sec{padding:clamp(72px,10vw,150px) 0;position:relative}
.rot{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--c2c);margin:0 0 18px;display:flex;gap:12px;align-items:center}
.rot::before{content:"";width:34px;height:1px;background:var(--c2c)}
.nr-sobre .wrap{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(36px,6vw,96px);align-items:center}
.nr-sobre h2{font-family:var(--fonte-t);font-style:italic;font-weight:400;font-size:clamp(34px,5vw,72px);line-height:1;margin:0 0 26px}
.nr-sobre p{color:var(--mudo);font-size:clamp(16px,1.4vw,19px);line-height:1.75;max-width:54ch}
.nr-foto{position:relative;aspect-ratio:4/5;overflow:hidden;border-radius:calc(var(--raio) + 8px);padding:10px}
.nr-foto>div{position:absolute;inset:10px;border-radius:calc(var(--raio) - 2px);overflow:hidden}
.nr-foto .par{position:absolute;inset:-8%;background-size:cover;background-position:center}
.nr-serv h2{font-family:var(--fonte-t);font-style:italic;font-weight:400;font-size:clamp(34px,5vw,72px);line-height:1;margin:0 0 clamp(30px,4vw,56px);max-width:16ch}
.nr-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.nr-card{padding:34px 30px 38px;min-height:260px;display:flex;flex-direction:column;transition:transform .5s var(--ease),border-color .4s}
.nr-card:hover{transform:translateY(-8px);border-color:color-mix(in srgb,var(--c2) 60%,#fff 10%)}
.nr-card::after{content:"";position:absolute;inset:-1px;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .5s;
  background:radial-gradient(60% 60% at 50% 0%,color-mix(in srgb,var(--c2) 38%,transparent),transparent 70%)}
.nr-card:hover::after{opacity:1}
.nr-n{font-family:var(--fonte-t);font-style:italic;font-size:46px;line-height:1;color:var(--c2c);opacity:.9}
.nr-card h3{font-family:var(--fonte-t);font-weight:400;font-size:clamp(25px,2.3vw,32px);margin:auto 0 10px;line-height:1.05}
.nr-card p{color:var(--mudo);margin:0;font-size:15.5px;line-height:1.65}
.nr-faixa{padding:26px 0;border-block:1px solid var(--linha);font-family:var(--fonte-t);font-style:italic;font-size:clamp(34px,5vw,64px);color:rgba(255,255,255,.9)}
.nr-faixa i{color:var(--c2);font-style:normal;font-size:.5em}
.nr-num .vidro{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));padding:clamp(32px,5vw,56px)}
.nr-ct{padding:8px 30px;border-left:1px solid var(--linha)}.nr-ct:first-child{border-left:0}
.nr-ct b{display:block;font-family:var(--fonte-t);font-style:italic;font-weight:400;font-size:clamp(56px,7vw,96px);line-height:1;background:linear-gradient(135deg,#fff,var(--c2c));-webkit-background-clip:text;background-clip:text;color:transparent}
.nr-ct span{color:var(--mudo);font-size:14px;letter-spacing:.06em}
.nr-gal{overflow:hidden;padding:0 0 clamp(60px,8vw,120px)}
.nr-gal .marq-t{gap:18px}
.nr-gal figure{margin:0;flex:none;width:clamp(240px,28vw,420px);aspect-ratio:4/5;border-radius:var(--raio);overflow:hidden;border:1px solid var(--linha)}
.nr-gal figure:nth-child(even){margin-top:46px}
.nr-gal img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}.nr-gal figure:hover img{transform:scale(1.08)}
.nr-vozes h2{font-family:var(--fonte-t);font-style:italic;font-weight:400;font-size:clamp(34px,5vw,64px);margin:0 0 36px}
.nr-vozes-lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
.nr-vozes-v{margin:0;padding:34px 30px;border-radius:var(--raio);background:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.025));border:1px solid var(--linha);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}
.nr-vozes-v blockquote{margin:14px 0 18px;font-family:var(--fonte-t);font-style:italic;font-size:22px;line-height:1.35;color:#fff}
.nr-vozes-v figcaption{color:var(--mudo);font-size:14px}
.nr-cta{padding:clamp(50px,8vw,120px) 0}
.nr-cta-in{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(30px,5vw,70px);align-items:center;padding:clamp(34px,6vw,76px);border-radius:calc(var(--raio) + 10px);overflow:hidden}
.nr-cta-in h2{font-family:var(--fonte-t);font-style:italic;font-weight:400;font-size:clamp(38px,6vw,84px);line-height:.98;margin:0 0 20px}
.nr-cta-in>div:first-child p{color:var(--mudo);max-width:42ch;font-size:18px}
.nr-info p{display:flex;gap:14px;align-items:flex-start;margin:0 0 14px;color:#e9ebf0}.nr-info svg{flex:none;margin-top:3px;color:var(--c2c)}
.nr-info a:hover{color:var(--c2c)}
.nr-acoes{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
@media(max-width:900px){
  .nr-sobre .wrap,.nr-cta-in{grid-template-columns:1fr}.nr-grade{grid-template-columns:1fr}.nr-foto{aspect-ratio:4/3}
  .nr-ct{border-left:0;border-top:1px solid var(--linha);padding:22px 8px}.nr-ct:first-child{border-top:0}
  .nr-rolar{display:none}
}
`, `
${nav(d, [['#sobre', 'Sobre'], ['#servicos', 'Serviços'], ['#contato', 'Contato']])}
<section class="nr-hero">
  <div class="${classeImagem(capa, 'nr-bg')}" style="${fundoImagem(capa, 0)}"></div>
  <div class="wrap">
    <span class="nr-etq vidro entra"><i></i>${esc(eyebrow(d) || d.empresa)}</span>
    <h1 class="nr-h1">${palavras(h1, 1)}</h1>
    <p class="nr-sub entra" style="--d:5">${capaTxt}</p>
    <div class="nr-btns entra" style="--d:6">${ctaPrincipal(d, 'Falar no WhatsApp', 'bt-cheio')}<a class="vidro-bt" href="#servicos">Conhecer os serviços${ICONES.seta}</a></div>
    ${seloGoogle(d, 'nr-nota vidro entra')}
  </div>
  <span class="nr-rolar" aria-hidden="true"></span>
</section>
<section class="sec nr-sobre" id="sobre"><div class="wrap">
  <div class="rev-l"><p class="rot">Quem somos</p><h2>${esc(d.empresa)}</h2><p>${sobreTxt}</p></div>
  <div class="nr-foto vidro rev-r"><div><div class="${classeImagem(foto2, 'par')}" style="${fundoImagem(foto2, 1)}"></div></div></div>
</div></section>
${servicos.length ? `<section class="sec nr-serv" id="servicos"><div class="wrap"><p class="rot rev">O que fazemos</p><h2 class="rev">Cuidado em cada serviço</h2>
  <div class="nr-grade">${servicos.map((s, i) => `<article class="nr-card vidro rev" style="--r:${i}"><span class="nr-n">${pad2(i + 1)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</article>`).join('')}</div></div></section>
${faixa(servicos.map(s => s.titulo), 'marq nr-faixa')}` : ''}
${nums.length >= 2 ? `<section class="sec nr-num"><div class="wrap"><div class="vidro rev">${nums.map(n => n.valor !== undefined ? contador(n.valor, n.rotulo, 'nr-ct') : `<div class="nr-ct"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join('')}</div></div></section>` : ''}
${fotosGal.length >= 2 ? `<section class="nr-gal"><div class="marq"><div class="marq-t">${[0, 1, 2].map(() => fotosGal.map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} — foto ${i + 1}" loading="lazy"></figure>`).join('')).join('')}</div></div></section>` : ''}
${vozes(d, 'nr-vozes')}
<section class="nr-cta" id="contato"><div class="wrap"><div class="nr-cta-in vidro rev">
  <div><p class="rot">Contato</p><h2>${palavras('Vamos conversar?', 0)}</h2><p>Chame agora e receba atendimento direto, sem robô e sem complicação.</p>
    <div class="nr-acoes">${ctaPrincipal(d, 'Chamar no WhatsApp', 'bt-cheio')}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div></div>
  <div class="nr-info">${contatoLinhas(d, 'nr-lin')}</div>
</div></div></section>
${rodape(d, 'rd')}
`);
  },
};

export const LAYOUTS_CINEMA_1: SiteTemplate[] = [noir];
