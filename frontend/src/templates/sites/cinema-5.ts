/**
 * Cinema, parte 5: Fragrância Orbital e Arquitetura em Camadas.
 *
 * - **Fragrância Orbital**: luxo quente, uma foto que se abre em elipse ao rolar e um anel 3D de cartões que gira sozinho.
 * - **Arquitetura em Camadas**: o nome da marca gigante atrás de uma laje em parallax, pílulas de navegação e painéis de vidro fosco.
 */
import type { SiteTemplate } from './base';
import { partirSobre } from './premium-base';
import {
  PARES, ICONES, classeImagem, contador, contatoLinhas, cssBaseEscura, cssNavVidro, cssRodapeEscuro, cssVozesEscuras, ctaPrincipal,
  documentoCinema, esc, eyebrow, faixa, fotoDe, fundoImagem, imagens, linkMapa, miniaturaCinema,
  nav, numerosReais, palavras, rodape, seloGoogle, servicosValidos, titulo, vozes,
} from './cinema-base';

const pad2 = (n: number) => String(n).padStart(2, '0');

/* ====================================================== FRAGRÂNCIA ORBITAL */

const fragrancia: SiteTemplate = {
  id: 'fragrancia',
  nome: 'Fragrância Orbital',
  descricao: 'Luxo quente: a foto se abre em elipse ao rolar e os serviços giram em anel. Para perfumaria, joalheria, floricultura, confeitaria e boutiques.',
  nichos: ['Perfumaria', 'Joalherias', 'Floriculturas', 'Confeitarias', 'Boutiques', 'Spas', 'Decoração'],
  miniatura: miniaturaCinema('escuro', 'orbita'),
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Pequenos luxos para os melhores momentos.', 'Cada peça é escolhida com cuidado, para que o presente, ou o seu momento, seja lembrado.');
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1) || capa;
    const nums = numerosReais(d);
    const itens = servicos.length ? servicos : [];
    const n = Math.max(itens.length, 1);
    return documentoCinema(d, PARES.cormorant, `
${cssBaseEscura(d, '#0d0a08')}
${cssNavVidro('nv')}
${cssRodapeEscuro('rd')}
${cssVozesEscuras('Cormorant', true)}
:root{--ouro:color-mix(in srgb,var(--c2) 70%,#f1d9a0)}
body{--fonte-c:"Jost",system-ui,sans-serif}
.fr-hero{position:relative;min-height:100svh;display:grid;place-items:center;text-align:center;padding:150px 0 100px;overflow:hidden;isolation:isolate}
.fr-bg{position:absolute;inset:-4%;z-index:-2;background-size:cover;background-position:center}.fr-bg.tem-foto{animation:kb 26s ease-in-out infinite alternate}
.fr-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(70% 60% at 50% 50%,rgba(13,10,8,.2),rgba(13,10,8,.82)),linear-gradient(180deg,rgba(13,10,8,.5),transparent 35%,rgba(13,10,8,.95))}
.fr-pre{font-size:12px;letter-spacing:.42em;text-transform:uppercase;color:var(--ouro);margin:0 0 28px}
.fr-h1{font-family:var(--fonte-t);font-weight:400;font-size:clamp(50px,10.4vw,168px);line-height:.9;letter-spacing:-.02em;margin:0 auto 26px;max-width:13ch;word-spacing:.08em;text-wrap:balance}
.fr-h1 .pal:nth-child(even){font-style:italic;color:var(--ouro)}
.fr-sub{max-width:48ch;margin:0 auto 38px;color:rgba(255,255,255,.78);font-size:clamp(17px,1.5vw,20px);line-height:1.7;font-weight:300}
.fr-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.fr-ouro{display:inline-flex;align-items:center;gap:10px;padding:16px 36px;border-radius:999px;color:#1a120a;font-weight:500;letter-spacing:.14em;text-transform:uppercase;font-size:12px;background:linear-gradient(135deg,#f1d9a0,var(--c2));box-shadow:0 20px 40px -18px var(--c2);transition:transform .3s var(--ease)}
.fr-ouro:hover{transform:translateY(-3px)}.fr-ouro svg{width:16px;height:16px}
.fr-ell{position:relative;height:230vh}
.fr-ell-fixo{position:sticky;top:0;height:100svh;overflow:hidden;display:grid;place-items:center;isolation:isolate}
.fr-ell-img{position:absolute;inset:0;z-index:-1;clip-path:ellipse(26% 34% at 50% 52%);background-size:cover;background-position:center}
@keyframes elipse2{from{clip-path:ellipse(26% 34% at 50% 52%)}to{clip-path:ellipse(140% 120% at 50% 50%)}}
@supports (animation-timeline:view()){.fr-ell{view-timeline-name:--fr;view-timeline-axis:block}.fr-ell-img{animation:elipse2 linear both;animation-timeline:--fr;animation-range:cover 6% cover 60%}}
@supports not (animation-timeline:view()){.fr-ell{height:auto}.fr-ell-fixo{position:relative;min-height:100svh}.fr-ell-img{clip-path:none}}
.fr-ell-fixo::after{content:"";position:absolute;inset:0;z-index:-1;background:rgba(13,10,8,.45)}
.fr-ell-txt{text-align:center;padding:0 6vw;max-width:900px}
.fr-ell-txt p{font-family:var(--fonte-t);font-size:clamp(28px,4.4vw,64px);line-height:1.1;font-style:italic;margin:0}
.fr-ell-txt .selo{margin-top:26px}
.sec{padding:clamp(80px,11vw,160px) 0}
.fr-rot{font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:var(--ouro);margin:0 0 20px}
.fr-t{font-family:var(--fonte-t);font-weight:400;font-size:clamp(38px,6vw,92px);line-height:.95;margin:0 0 clamp(26px,4vw,52px)}
.fr-t em{color:var(--ouro)}
.fr-sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(30px,6vw,100px);align-items:center}
.fr-sobre p:not(.fr-rot){font-size:clamp(17px,1.5vw,20px);line-height:1.8;color:rgba(255,255,255,.76);font-weight:300;max-width:50ch}
.fr-arco{aspect-ratio:3/4;border-radius:999px 999px var(--raio) var(--raio);overflow:hidden;position:relative;border:1px solid color-mix(in srgb,var(--ouro) 40%,transparent)}
.fr-arco .par{position:absolute;inset:-8%;background-size:cover;background-position:center}
.fr-orb{padding:clamp(70px,9vw,130px) 0;overflow:hidden;text-align:center}
.fr-cena{perspective:1500px;height:clamp(380px,46vw,520px);display:grid;place-items:center;margin-top:20px}
.fr-anel{position:relative;width:min(230px,56vw);height:clamp(280px,34vw,380px);transform-style:preserve-3d;animation:gira 46s linear infinite}
.fr-anel:hover{animation-play-state:paused}
@keyframes gira{to{transform:rotateY(-360deg)}}
.fr-cart{position:absolute;inset:0;transform:rotateY(calc(var(--i) * (360deg / var(--n)))) translateZ(clamp(260px,34vw,440px));padding:26px 22px;border-radius:var(--raio);text-align:left;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;
  background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.04));border:1px solid color-mix(in srgb,var(--ouro) 45%,transparent);-webkit-backface-visibility:hidden;backface-visibility:hidden;
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.fr-cart .fundo{position:absolute;inset:0;z-index:-1;opacity:.5;background-size:cover;background-position:center}
.fr-cart .n{position:absolute;top:20px;left:22px;font-family:var(--fonte-t);font-style:italic;font-size:30px;color:var(--ouro)}
.fr-cart h3{font-family:var(--fonte-t);font-weight:400;font-size:28px;line-height:1;margin:0 0 8px}.fr-cart p{margin:0;font-size:14px;color:rgba(255,255,255,.75);line-height:1.55;font-weight:300}
.fr-lista{display:none}
@media(max-width:800px){.fr-cena{display:none}.fr-lista{display:grid;gap:14px;text-align:left;margin-top:20px}.fr-lista article{padding:24px;border-radius:var(--raio);border:1px solid var(--linha);background:rgba(255,255,255,.04)}.fr-lista h3{font-family:var(--fonte-t);font-weight:400;font-size:28px;margin:0 0 6px}.fr-lista p{margin:0;color:var(--mudo)}}
.fr-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;text-align:center}
.fr-ct b{display:block;font-family:var(--fonte-t);font-weight:400;font-style:italic;font-size:clamp(64px,9vw,130px);line-height:1;color:var(--ouro)}.fr-ct span{font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:var(--mudo)}
.fr-vip{padding:clamp(60px,9vw,130px) 0;text-align:center}
.fr-vip-in{max-width:780px;margin:0 auto;padding:clamp(34px,6vw,70px);border-radius:calc(var(--raio) + 10px)}
.fr-vip-in h2{font-family:var(--fonte-t);font-weight:400;font-size:clamp(36px,5.4vw,72px);line-height:1;margin:0 0 16px}.fr-vip-in p{color:var(--mudo);margin:0 auto 28px;max-width:44ch;font-weight:300}
.fr-perg{background:#e9dfcf;color:#2a211b;padding:clamp(60px,8vw,100px) 0}
.fr-perg-in{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:40px}
.fr-perg h4{font-size:12px;letter-spacing:.24em;text-transform:uppercase;margin:0 0 14px;color:#8a6a3f}
.fr-perg b{font-family:var(--fonte-t);font-weight:400;font-size:34px;display:block;margin-bottom:8px}
.fr-perg a,.fr-perg span,.fr-perg p{display:block;color:#3a2f26;margin:0 0 8px;font-weight:300}.fr-perg a:hover{color:#8a6a3f}
.fr-perg-fim{margin-top:40px;padding-top:18px;border-top:1px solid rgba(42,33,27,.18);font-size:13px;color:#6b5a49}
@media(max-width:900px){.fr-sobre .wrap,.fr-perg-in{grid-template-columns:1fr}}
`, `
${nav(d, [['#essencia', 'Essência'], ['#colecao', 'Coleção'], ['#contato', 'Contato']])}
<section class="fr-hero"><div class="${classeImagem(capa, 'fr-bg')}" style="${fundoImagem(capa, 0)}"></div>
  <div class="wrap"><p class="fr-pre entra">${esc(eyebrow(d) || d.empresa)}</p><h1 class="fr-h1">${palavras(titulo(d, d.empresa), 1)}</h1>
    <p class="fr-sub entra" style="--d:5">${capaTxt}</p>
    <div class="fr-btns entra" style="--d:6">${ctaPrincipal(d, 'Falar no WhatsApp', 'fr-ouro')}<a class="vidro-bt" href="#colecao">Ver a coleção${ICONES.seta}</a></div></div></section>
<section class="fr-ell" id="essencia"><div class="fr-ell-fixo"><div class="${classeImagem(foto2, 'fr-ell-img')}" style="${fundoImagem(foto2, 1)}"></div>
  <div class="fr-ell-txt"><p>${esc(sobreTxt)}</p>${seloGoogle(d, 'nr-nota vidro selo')}</div></div></section>
<section class="sec fr-sobre"><div class="wrap">
  <div class="rev-l"><p class="fr-rot">Quem somos</p><h2 class="fr-t">${esc(d.empresa)}</h2><p>${capaTxt}</p></div>
  <div class="fr-arco rev-r"><div class="${classeImagem(fotoDe(d, 2) || foto2, 'par')}" style="${fundoImagem(fotoDe(d, 2) || foto2, 2)}"></div></div>
</div></section>
${itens.length ? `<section class="fr-orb" id="colecao"><div class="wrap"><p class="fr-rot rev">A coleção</p><h2 class="fr-t rev">Escolha a sua <em>favorita</em></h2></div>
  <div class="fr-cena" style="--n:${n}"><div class="fr-anel" style="--n:${n}">${itens.map((s, i) => { const f = fotoDe(d, i + 1); return `<article class="fr-cart" style="--i:${i};--n:${n}"><div class="${classeImagem(f, 'fundo')}" style="${fundoImagem(f, i % 3)}"></div><span class="n">${pad2(i + 1)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</article>`; }).join('')}</div></div>
  <div class="wrap fr-lista">${itens.map(s => `<article><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</article>`).join('')}</div></section>` : ''}
${nums.length >= 2 ? `<section class="sec"><div class="wrap"><div class="fr-num">${nums.map(x => x.valor !== undefined ? contador(x.valor, x.rotulo, 'fr-ct') : `<div class="fr-ct"><b>${x.texto}</b><span>${esc(x.rotulo)}</span></div>`).join('')}</div></div></section>` : ''}
${vozes(d, 'nr-vozes')}
<section class="fr-vip" id="contato"><div class="wrap"><div class="fr-vip-in vidro rev"><p class="fr-rot">Lista VIP</p><h2>Receba novidades em <em style="color:var(--ouro)">primeira mão</em></h2><p>Chame no WhatsApp e entre para a lista de quem recebe lançamentos e condições especiais.</p>
  <div class="fr-btns">${ctaPrincipal(d, 'Quero entrar na lista', 'fr-ouro')}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div></div></div></section>
<footer class="fr-perg"><div class="wrap"><div class="fr-perg-in"><div><b>${esc(d.empresa)}</b>${d.slogan ? `<p>${esc(d.slogan)}</p>` : ''}</div><div><h4>Contato</h4>${contatoLinhas(d, 'fr-lin').replace(/<svg[\s\S]*?<\/svg>/g, '')}</div></div>
  <div class="fr-perg-fim">© ${new Date().getFullYear()} ${esc(d.empresa)}${d.cidade ? ` · ${esc(d.cidade)}` : ''}</div></div></footer>
`, true, true);
  },
};

/* ====================================================== ARQUITETURA EM CAMADAS */

const arquitetura: SiteTemplate = {
  id: 'arquitetura',
  nome: 'Arquitetura em Camadas',
  descricao: 'O nome da marca gigante atrás de uma laje em parallax, pílulas de navegação e painéis de vidro fosco. Para arquitetura, imobiliárias, engenharia e decoração.',
  nichos: ['Arquitetura', 'Imobiliárias', 'Engenharia', 'Decoração', 'Paisagismo', 'Construtoras', 'Design de interiores'],
  miniatura: miniaturaCinema('escuro', 'camadas'),
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Espaços pensados com método, luz e propósito.', 'Do primeiro traço à entrega, cada decisão serve a quem vai viver o espaço.');
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1) || capa;
    const nums = numerosReais(d);
    const fotosGal = imagens(d);
    return documentoCinema(d, PARES.syne, `
${cssBaseEscura(d, '#0b0c0e')}
${cssNavVidro('nv')}
${cssRodapeEscuro('rd')}
${cssVozesEscuras('Syne')}
.ar-hero{position:relative;min-height:112svh;overflow:hidden;isolation:isolate;display:grid;align-items:end}
.ar-bg{position:absolute;inset:-6% 0;z-index:-3;background-size:cover;background-position:center}
.ar-bg.tem-foto{animation:kb 28s ease-in-out infinite alternate}
.ar-hero::before{content:"";position:absolute;inset:0;z-index:-2;background:linear-gradient(180deg,rgba(11,12,14,.55),rgba(11,12,14,.15) 40%,rgba(11,12,14,.9))}
.ar-gigante{position:absolute;z-index:-1;left:50%;top:26%;transform:translateX(-50%);width:max-content;max-width:150vw;font-family:var(--fonte-t);font-weight:800;text-transform:uppercase;font-size:clamp(70px,19vw,320px);letter-spacing:-.06em;line-height:.8;white-space:nowrap;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.35);opacity:.9}
@supports (animation-timeline:view()){.ar-gigante{animation:ar-sobe linear both;animation-timeline:view();animation-range:exit 0% exit 100%}}
@keyframes ar-sobe{to{transform:translateX(-50%) translateY(-18vh);opacity:.2}}
.ar-laje{position:relative;margin:0 auto;width:min(980px,86vw);aspect-ratio:16/8;border-radius:var(--raio);overflow:hidden;border:1px solid rgba(255,255,255,.2);box-shadow:0 60px 120px -40px rgba(0,0,0,.8);transform:translateY(0)}
.ar-laje .par{position:absolute;inset:-10%;background-size:cover;background-position:center}
.ar-info{display:grid;grid-template-columns:1fr auto;gap:30px;align-items:end;padding:44px 0 clamp(50px,6vw,84px)}
.ar-pre{font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:var(--c2c);margin:0 0 16px}
.ar-h1{font-family:var(--fonte-t);font-weight:700;font-size:clamp(30px,4.8vw,70px);line-height:1;letter-spacing:-.04em;margin:0;max-width:20ch}
.ar-painel{padding:26px 28px;max-width:340px}.ar-painel p{margin:0 0 18px;color:rgba(255,255,255,.8);font-size:15.5px;line-height:1.65}
.sec{padding:clamp(70px,10vw,150px) 0}
.ar-rot{font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:var(--c2c);margin:0 0 18px}
.ar-t{font-family:var(--fonte-t);font-weight:700;font-size:clamp(32px,5vw,70px);line-height:1;letter-spacing:-.045em;margin:0 0 clamp(26px,4vw,50px);max-width:18ch}
.ar-sobre .wrap{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(30px,6vw,100px);align-items:start}
.ar-sobre p:not(.ar-rot){font-size:clamp(17px,1.5vw,20px);line-height:1.8;color:rgba(255,255,255,.76)}
.ar-lista{border-top:1px solid var(--linha)}
.ar-lin{display:grid;grid-template-columns:70px 1fr 1.2fr;gap:24px;align-items:baseline;padding:30px 0;border-bottom:1px solid var(--linha);transition:padding .5s var(--ease),background .4s}
.ar-lin:hover{padding-left:18px;background:linear-gradient(90deg,color-mix(in srgb,var(--c2) 9%,transparent),transparent)}
.ar-lin .n{font-weight:700;color:var(--c2c);font-size:14px;letter-spacing:.14em}
.ar-lin h3{font-family:var(--fonte-t);font-weight:700;font-size:clamp(22px,2.6vw,36px);letter-spacing:-.035em;margin:0}.ar-lin p{margin:0;color:var(--mudo)}
.ar-seg{position:relative;min-height:100svh;display:grid;place-items:center;text-align:center;overflow:hidden;isolation:isolate}
.ar-seg .par{position:absolute;inset:-12% 0;z-index:-2;background-size:cover;background-position:center}
.ar-seg::before{content:"";position:absolute;inset:0;z-index:-1;background:rgba(11,12,14,.6)}
.ar-seg h2{font-family:var(--fonte-t);font-weight:700;font-size:clamp(40px,8vw,128px);line-height:.95;letter-spacing:-.05em;max-width:14ch;margin:0 auto 26px}
.ar-gal{display:grid;grid-template-columns:repeat(12,1fr);gap:14px}
.ar-gal figure{margin:0;border-radius:var(--raio);overflow:hidden;border:1px solid var(--linha)}.ar-gal img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease)}.ar-gal figure:hover img{transform:scale(1.06)}
.ar-gal figure:nth-child(1){grid-column:span 7;aspect-ratio:16/10}.ar-gal figure:nth-child(2){grid-column:span 5;aspect-ratio:4/5}.ar-gal figure:nth-child(3){grid-column:span 5;aspect-ratio:4/5}.ar-gal figure:nth-child(4){grid-column:span 7;aspect-ratio:16/10}
.ar-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));border-block:1px solid var(--linha)}
.ar-ct{padding:40px 28px;border-left:1px solid var(--linha)}.ar-ct:first-child{border-left:0}
.ar-ct b{display:block;font-family:var(--fonte-t);font-weight:700;font-size:clamp(54px,7vw,104px);letter-spacing:-.06em;line-height:1}.ar-ct span{color:var(--mudo);font-size:14px}
.ar-fim .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(30px,5vw,80px);align-items:center}
.ar-fim h2{font-family:var(--fonte-t);font-weight:700;font-size:clamp(38px,6vw,92px);line-height:.95;letter-spacing:-.05em;margin:0 0 24px}
.ar-cont{padding:34px}.ar-cont p{display:flex;gap:14px;margin:0 0 14px;color:#ececf1}.ar-cont svg{flex:none;margin-top:3px;color:var(--c2c)}
@media(max-width:900px){.ar-info,.ar-sobre .wrap,.ar-fim .wrap{grid-template-columns:1fr}.ar-lin{grid-template-columns:44px 1fr}.ar-lin p{grid-column:2}.ar-gal figure{grid-column:span 12!important}.ar-ct{border-left:0;border-top:1px solid var(--linha)}.ar-ct:first-child{border-top:0}.ar-gigante{top:18%}}
`, `
${nav(d, [['#projeto', 'Sobre'], ['#servicos', 'Serviços'], ['#contato', 'Contato']])}
<section class="ar-hero"><div class="${classeImagem(capa, 'ar-bg')}" style="${fundoImagem(capa, 2)}"></div><div class="ar-gigante" aria-hidden="true">${esc(d.empresa.split(/\s+/).slice(0, 2).join(' '))}</div>
  <div class="wrap" style="padding-top:200px">
    <div class="ar-laje vidro"><div class="${classeImagem(foto2, 'par')}" style="${fundoImagem(foto2, 0)}"></div></div>
    <div class="ar-info"><div><p class="ar-pre entra">${esc(eyebrow(d) || d.empresa)}</p><h1 class="ar-h1">${palavras(titulo(d, d.empresa), 1)}</h1></div>
      <div class="ar-painel vidro entra" style="--d:5"><p>${capaTxt}</p>${ctaPrincipal(d, 'Falar com a equipe', 'bt-cheio')}</div></div>
  </div></section>
<section class="sec ar-sobre" id="projeto"><div class="wrap"><div class="rev-l"><p class="ar-rot">O escritório</p><h2 class="ar-t">${esc(d.empresa)}</h2>${seloGoogle(d, 'nr-nota vidro')}</div><div class="rev-r"><p>${sobreTxt}</p></div></div></section>
${servicos.length ? `<section class="sec" id="servicos" style="padding-top:0"><div class="wrap"><p class="ar-rot rev">Áreas de atuação</p><div class="ar-lista">${servicos.map((s, i) => `<article class="ar-lin rev"><span class="n">${pad2(i + 1)}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></article>`).join('')}</div></div></section>` : ''}
<section class="ar-seg"><div class="${classeImagem(fotoDe(d, 2) || capa, 'par')}" style="${fundoImagem(fotoDe(d, 2) || capa, 1)}"></div><div class="wrap"><h2 class="rev">${esc(d.slogan || `${d.categoria || 'Projetos'} com assinatura`)}</h2>${ctaPrincipal(d, 'Conversar sobre o projeto', 'vidro-bt')}</div></section>
${fotosGal.length >= 4 ? `<section class="sec"><div class="wrap"><h2 class="ar-t rev">Em obra e em uso</h2><div class="ar-gal">${fotosGal.slice(0, 4).map((src, i) => `<figure class="rev"><img src="${src}" alt="${esc(d.empresa)} — projeto ${i + 1}" loading="lazy"></figure>`).join('')}</div></div></section>` : ''}
${nums.length >= 2 ? `<section><div class="wrap"><div class="ar-num">${nums.map(x => x.valor !== undefined ? contador(x.valor, x.rotulo, 'ar-ct') : `<div class="ar-ct"><b>${x.texto}</b><span>${esc(x.rotulo)}</span></div>`).join('')}</div></div></section>` : ''}
${vozes(d, 'nr-vozes')}
<section class="sec ar-fim" id="contato"><div class="wrap">
  <div class="rev-l"><p class="ar-rot">Contato</p><h2>${palavras('Vamos desenhar o seu espaço?', 0)}</h2><div style="display:flex;gap:12px;flex-wrap:wrap">${ctaPrincipal(d, 'Chamar no WhatsApp', 'bt-cheio')}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div></div>
  <div class="ar-cont vidro rev-r">${contatoLinhas(d, 'ar-lin2')}</div>
</div></section>
${rodape(d, 'rd')}
`, true, false);
  },
};

export const LAYOUTS_CINEMA_5: SiteTemplate[] = [fragrancia, arquitetura];
export { faixa };
