/**
 * PLANTA — construção, reforma, marcenaria, engenharia, arquitetura.
 *
 * Direção de arte (referências de construtoras no Behance): título condensado
 * e pesado sobre foto de obra, um único acento de segurança (âmbar), blocos
 * de informação seca. A página é uma prancha de projeto: malha de fundo,
 * códigos em fonte mono, cantos de enquadramento e figuras numeradas.
 *
 * O que a distingue:
 * - a "ficha da empresa" ao lado do título, como o carimbo de uma prancha;
 * - o escopo em células com código (S-01), não em cartões com ícone;
 * - o processo como linha de etapas horizontal, que é como obra se explica;
 * - fotos de obras como "FIG. 01", em grade com legenda técnica.
 * Nenhum número de obra, prazo ou metragem é inventado.
 */
import type { SiteTemplate } from './base';
import { esc } from './base';
import { documentoPremium } from './documento';
import { fim } from './premium';
import {
  type ParFontes, ICONES, ctaPrincipal, cssRodape, depoimentosValidos, fotos, fundoFoto, linkMapa, linkTel, logo,
  partirSobre, rodapePremium, servicosValidos, urlImagem,
} from './premium-base';
import { diferenciaisDe, horarioCurto, notaReal, num, partirDestaque, passosDe, secaoLigada, zapTexto } from './cenas-base';

const FONTES_PLANTA: ParFontes = {
  titulos: '"Barlow Condensed","Arial Narrow",Impact,sans-serif', corpo: '"Barlow",system-ui,sans-serif',
  google: 'family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500',
};

export const planta: SiteTemplate = {
  id: 'planta',
  nome: 'Planta',
  descricao: 'Prancha de projeto: título industrial, ficha da empresa, escopo em células e etapas da obra.',
  nichos: ['Construção', 'Reformas', 'Marcenarias', 'Arquitetura', 'Engenharia', 'Materiais de construção'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#e9e7e2"/><rect width="160" height="58" fill="${corPrimaria}"/>
    <rect y="58" width="160" height="5" fill="${corDestaque}"/>
    <rect x="10" y="14" width="84" height="11" fill="#fff"/><rect x="10" y="29" width="62" height="11" fill="${corDestaque}"/>
    <rect x="108" y="12" width="42" height="38" fill="none" stroke="#fff" stroke-width="1"/><rect x="112" y="17" width="34" height="2" fill="#fff"/><rect x="112" y="23" width="34" height="2" fill="#fff"/><rect x="112" y="29" width="34" height="2" fill="#fff"/>
    <rect x="10" y="72" width="44" height="30" fill="none" stroke="#14181d"/><rect x="58" y="72" width="44" height="30" fill="none" stroke="#14181d"/><rect x="106" y="72" width="44" height="30" fill="none" stroke="#14181d"/></svg>`,
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Orçamento combinado antes do serviço, comunicação direta e acompanhamento da obra.', 'Conte o que precisa, receba o orçamento e combine as etapas: assim a obra anda com clareza.');
    const capa = urlImagem(d.capa);
    const galeria = fotos(d);
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const horario = horarioCurto(d);
    const mapa = linkMapa(d);
    const tel = linkTel(d);
    const palavras = (d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : 'Obras com clareza do início ao fim').split(' ');
    const ultimas = palavras.splice(Math.max(1, palavras.length - 2)).join(' ');
    const titulo = `${palavras.join(' ')} <em>${ultimas}</em>`;
    const difs = secaoLigada(d, 'diferenciais') ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, 'passos') ? passosDe(d, 4) : [];
    const voz = depoimentosValidos(d).slice(0, 3);
    const obras = galeria.slice(0, 6);

    return documentoPremium(d, FONTES_PLANTA, `
:root{--c-fundo:#e9e7e2;--c-tinta:#14181d;--c-suave:#4f5762;--c-linha:rgba(20,24,29,.28);--c-escuro:#161b21;--c-mono:"IBM Plex Mono",ui-monospace,monospace}
body{background:var(--c-fundo);color:var(--c-tinta);background-image:linear-gradient(rgba(20,24,29,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(20,24,29,.045) 1px,transparent 1px);background-size:32px 32px}
h1,h2,h3{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;letter-spacing:.005em;line-height:.95}
em{font-style:normal;color:var(--d)}
.mono{font-family:var(--c-mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.info{background:#0d1014;color:#aab2bd}.info .wrap{display:flex;justify-content:space-between;gap:20px;padding:8px 0;flex-wrap:wrap}
.info a{color:#e5e9ee}.info a:hover{color:var(--d)}
.topo{position:sticky;top:0;z-index:40;background:var(--c-escuro);border-bottom:3px solid var(--d)}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px 0}
.marca{display:flex;align-items:center;gap:12px;font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;font-size:clamp(1.3rem,2.4vw,1.8rem);color:#fff;letter-spacing:.02em}
.logo-img{height:42px;width:auto}.logo-iniciais{width:42px;height:42px;display:grid;place-items:center;background:var(--d);color:var(--sobre-d);font-weight:800}
.topo nav{display:flex;gap:30px;font-family:var(--fonte-t);font-weight:600;font-size:17px;letter-spacing:.1em;text-transform:uppercase;color:#cfd5dc}
.topo nav a:hover{color:var(--d)}
.btn{border-radius:0;font-family:var(--fonte-t);font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:17px;padding:14px 26px}
.btn-1{background:var(--d);color:var(--sobre-d)}.btn-1:hover{filter:brightness(1.07)}
.btn-2{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.5)}.btn-2:hover{border-color:var(--d);color:var(--d)}
.capa{position:relative;color:#fff;padding:clamp(64px,9vw,128px) 0 clamp(56px,8vw,104px);${fundoFoto(capa, '#1c2128', 'rgba(15,19,23,.6),rgba(15,19,23,.94)')}}
.capa-in{display:grid;grid-template-columns:1.6fr 1fr;gap:clamp(28px,5vw,72px);align-items:end}
.capa .cod{color:var(--d);margin-bottom:18px;display:flex;gap:12px;align-items:center}.capa .cod::before{content:'';width:34px;height:3px;background:var(--d)}
.capa h1{font-size:clamp(3.4rem,10vw,9rem);color:#fff;margin:0 0 24px;text-wrap:balance}
.capa .lead{font-size:var(--t1);color:#d8dde3;max-width:46ch;margin:0 0 30px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.ficha{position:relative;border:1px solid rgba(255,255,255,.35);padding:22px 24px;background:rgba(15,19,23,.55);backdrop-filter:blur(6px)}
.ficha::before,.ficha::after{content:'';position:absolute;width:22px;height:22px;border:3px solid var(--d)}
.ficha::before{left:-3px;top:-3px;border-right:0;border-bottom:0}.ficha::after{right:-3px;bottom:-3px;border-left:0;border-top:0}
.ficha h2{font-size:22px;color:var(--d);margin:0 0 12px}
.ficha dl{margin:0}.ficha dt{font-family:var(--c-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9aa4b0;margin-top:12px}
.ficha dd{margin:2px 0 0;font-family:var(--fonte-t);font-weight:600;font-size:21px;text-transform:uppercase;color:#fff;letter-spacing:.02em}
.hazard{height:14px;background:repeating-linear-gradient(-45deg,var(--d) 0 18px,#14181d 18px 36px)}
.sec{padding:clamp(64px,9vw,120px) 0}
.cab{display:flex;align-items:end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:clamp(28px,4vw,48px);border-bottom:3px solid var(--c-tinta);padding-bottom:16px}
.cab h2{font-size:clamp(2.6rem,6vw,5rem);margin:0}.cab .mono{color:var(--c-suave)}
.celulas{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--c-tinta);border-left:1px solid var(--c-tinta)}
.celula{position:relative;padding:28px 26px 30px;border-right:1px solid var(--c-tinta);border-bottom:1px solid var(--c-tinta);background:rgba(233,231,226,.7);transition:background .25s,color .25s;display:flex;flex-direction:column;gap:10px;min-height:220px}
.celula:hover{background:var(--d);color:var(--sobre-d)}.celula:hover .mono,.celula:hover p{color:inherit}
.celula .mono{color:var(--c-suave)}.celula h3{font-size:clamp(1.7rem,3vw,2.3rem);margin:0}.celula p{margin:0;color:var(--c-suave)}
.celula a{margin-top:auto;font-family:var(--fonte-t);font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:16px;border-bottom:2px solid currentColor;align-self:flex-start}
.dif .wrap{display:grid;grid-template-columns:1fr 1.4fr;gap:clamp(28px,6vw,96px)}
.dif h2{font-size:clamp(2.6rem,6vw,5rem)}
.dif ul{list-style:none;margin:0;padding:0;border-top:1px solid var(--c-tinta)}
.dif li{display:grid;grid-template-columns:44px 1fr;gap:16px;padding:22px 0;border-bottom:1px solid var(--c-tinta)}
.dif li .box{width:30px;height:30px;border:2px solid var(--c-tinta);display:grid;place-items:center;background:var(--d);color:var(--sobre-d)}
.dif li h3{font-size:clamp(1.5rem,2.6vw,2rem);margin:0 0 4px}.dif li p{margin:0;color:var(--c-suave)}
.proc{background:var(--c-escuro);color:#fff;border-top:3px solid var(--d)}
.proc .cab{border-color:#fff}.proc .cab h2{color:#fff}.proc .cab .mono{color:#9aa4b0}
.etapas{display:grid;grid-template-columns:repeat(var(--n,3),1fr);position:relative}
.etapas::before{content:'';position:absolute;left:0;right:0;top:19px;height:2px;background:repeating-linear-gradient(90deg,#4b5563 0 8px,transparent 8px 14px)}
.etapa{position:relative;padding-right:28px}
.etapa .no{position:relative;z-index:1;display:grid;place-items:center;width:40px;height:40px;background:var(--d);color:var(--sobre-d);font-family:var(--fonte-t);font-weight:800;font-size:20px;margin-bottom:22px}
.etapa .mono{color:var(--d);display:block;margin-bottom:6px}.etapa h3{font-size:clamp(1.6rem,2.8vw,2.2rem);margin:0 0 8px;color:#fff}.etapa p{margin:0;color:#b6bec8}
.fig{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
.fig figure{margin:0;position:relative;background:#cfcdc7;grid-column:span 2;display:flex}
.fig img{width:100%;height:100%;aspect-ratio:4/3;object-fit:cover;filter:grayscale(.55) contrast(1.05);transition:filter .4s}.fig figure:hover img{filter:none}
.fig figcaption{position:absolute;left:0;bottom:0;background:var(--c-escuro);color:#fff;padding:6px 12px}
.f2 figure{grid-column:span 3}
.f3 figure:nth-child(1),.f4 figure:nth-child(1),.f5 figure:nth-child(1),.f6 figure:nth-child(1){grid-column:span 4;grid-row:span 2}
.f3 figure:nth-child(1) img,.f4 figure:nth-child(1) img,.f5 figure:nth-child(1) img,.f6 figure:nth-child(1) img{aspect-ratio:auto}
.f4 figure:nth-child(4){grid-column:span 6}.f4 figure:nth-child(4) img{aspect-ratio:16/6}
.f5 figure:nth-child(n+4){grid-column:span 3}
.sobre .wrap{display:grid;grid-template-columns:1.3fr 1fr;gap:clamp(28px,6vw,96px);align-items:center}
.sobre blockquote{margin:0;font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;font-size:clamp(2.2rem,5vw,4.2rem);line-height:1;text-wrap:balance}
.sobre-resto{font-size:var(--t1);color:var(--c-suave);max-width:54ch;margin:22px 0 0}
.nums{display:grid;gap:0;border:1px solid var(--c-tinta);background:rgba(233,231,226,.7)}
.nums div{padding:22px 24px;border-bottom:1px solid var(--c-tinta)}.nums div:last-child{border-bottom:0}
.nums b{display:block;font-family:var(--fonte-t);font-weight:700;font-size:clamp(2.4rem,5vw,3.6rem);line-height:1}.nums .mono{color:var(--c-suave)}
.vozes .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
.vozes figure{margin:0;padding:24px 24px 24px 22px;border-left:6px solid var(--d);background:rgba(255,255,255,.6)}
.vozes blockquote{margin:0 0 12px;font-size:var(--t1)}.vozes figcaption{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.chamada{background:var(--d);color:var(--sobre-d)}
.chamada .wrap{display:flex;align-items:center;justify-content:space-between;gap:28px;flex-wrap:wrap;padding:clamp(40px,6vw,72px) 0}
.chamada h2{font-size:clamp(2.6rem,7vw,5.6rem);margin:0;color:var(--sobre-d)}
.chamada .btn-1{background:var(--c-escuro);color:#fff}
.contato{background:var(--c-escuro);color:#fff}
.contato .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(28px,5vw,72px);padding:clamp(56px,8vw,96px) 0;align-items:end}
.contato h2{font-size:clamp(2.6rem,6vw,5rem);margin:0 0 20px;color:#fff}.contato p{display:flex;gap:12px;margin:0 0 10px;color:#c3cad2}.contato svg{flex:none;margin-top:4px;color:var(--d)}
.contato .acoes{display:grid;gap:12px}.contato .btn{justify-content:center}
.sx{--sx-fundo:transparent;--sx-alt:rgba(255,255,255,.35);--sx-card:#f4f2ed;--sx-borda:var(--c-tinta);--sx-texto:var(--c-tinta);--sx-suave:var(--c-suave);--sx-icone:var(--c-tinta);--sx-raio:0px}
.sx-cab h2{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;font-size:clamp(2.6rem,6vw,5rem);line-height:.95}
.sx-pre{font-family:var(--c-mono);letter-spacing:.14em}
.sx-lista details{border-width:1px}.sx-cta-in{border-radius:0}
${cssRodape('rp', '#0d1014', '#9aa4b0')}
@media(max-width:900px){.info .wrap{justify-content:center}.topo nav{display:none}.capa-in,.sobre .wrap,.dif .wrap,.contato .wrap{grid-template-columns:1fr}.celulas{grid-template-columns:1fr 1fr}.etapas{grid-template-columns:1fr 1fr;gap:28px 0}.etapas::before{display:none}.fig figure,.f4 figure:nth-child(4),.f5 figure:nth-child(n+4),.f2 figure{grid-column:span 6!important;grid-row:auto!important}.fig img{aspect-ratio:4/3!important}}
@media(max-width:560px){.celulas{grid-template-columns:1fr}.etapas{grid-template-columns:1fr}}
`, `
<div class="info mono"><div class="wrap"><span>${d.cidade ? `Atendemos ${esc(d.cidade)} e região` : 'Orçamento pelo WhatsApp'}</span><span>${tel ? `<a href="${tel}">${esc(d.telefone)}</a>` : ''}${horario ? ` · ${esc(horario)}` : ''}</span></div></div>
<header class="topo"><div class="wrap">
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav aria-label="Seções"><a href="#servicos">Serviços</a><a href="#processo">Processo</a><a href="#sobre">Quem somos</a><a href="#contato">Contato</a></nav>
  ${ctaPrincipal(d, 'Pedir orçamento')}
</div></header>
<section class="capa"><div class="wrap capa-in">
  <div><p class="cod mono">${esc(d.categoria || 'Obras e projetos')}</p><h1>${titulo}</h1><p class="lead">${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, 'Pedir orçamento')}<a class="btn btn-2" href="#servicos">Ver serviços</a></div></div>
  <aside class="ficha" aria-label="Ficha da empresa"><h2>Ficha da empresa</h2><dl>
    ${d.categoria ? `<dt>Atuação</dt><dd>${esc(d.categoria)}</dd>` : ''}${d.cidade ? `<dt>Região</dt><dd>${esc(d.cidade)}</dd>` : ''}
    <dt>Atendimento</dt><dd>${d.whatsapp || d.telefone ? 'WhatsApp e telefone' : 'Consulte'}</dd>
    ${horario ? `<dt>Horário</dt><dd>${esc(horario)}</dd>` : ''}${nota ? `<dt>Google</dt><dd>${nota.nota} ★${nota.avaliacoes ? ` · ${nota.avaliacoes}` : ''}</dd>` : ''}</dl></aside>
</div></section>
<div class="hazard" aria-hidden="true"></div>
${servicos.length ? `<section class="sec" id="servicos"><div class="wrap"><div class="cab"><h2>Escopo de serviços</h2><span class="mono">${servicos.length} frentes de trabalho</span></div>
  <div class="celulas">${servicos.map((s, i) => `<div class="celula"><span class="mono">S-${num(i)}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p>${
    zapTexto(d, `Olá! Quero um orçamento de: ${s.titulo}`) ? `<a href="${zapTexto(d, `Olá! Quero um orçamento de: ${s.titulo}`)}" target="_blank" rel="noopener">Pedir orçamento</a>` : ''}</div>`).join('')}</div>
</div></section>` : ''}
${difs.length ? `<section class="sec dif" id="diferenciais"><div class="wrap"><div><span class="mono" style="color:var(--c-suave)">Como trabalhamos</span><h2>O que você <em style="color:var(--c-tinta);background:var(--d);padding:0 .15em">encontra</em></h2></div>
  <ul>${difs.map(x => `<li><span class="box" aria-hidden="true">${ICONES.check}</span><div><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div></li>`).join('')}</ul></div></section>` : ''}
${passos.length ? `<section class="sec proc" id="processo"><div class="wrap"><div class="cab"><h2>Etapas da obra</h2><span class="mono">do primeiro contato à entrega</span></div>
  <div class="etapas" style="--n:${passos.length}" id="passos">${passos.map((p, i) => `<div class="etapa"><span class="no">${i + 1}</span><span class="mono">Etapa ${num(i)}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join('')}</div></div></section>` : ''}
${obras.length >= 2 ? `<section class="sec"><div class="wrap"><div class="cab"><h2>Obras e projetos</h2><span class="mono">registro fotográfico</span></div>
  <div class="fig f${obras.length}">${obras.map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} — obra ${i + 1}" loading="lazy"><figcaption class="mono">Fig. ${num(i)}</figcaption></figure>`).join('')}</div></div></section>` : ''}
<section class="sec sobre" id="sobre"><div class="wrap"><div><blockquote>${partirDestaque(sobreTxt).destaque}</blockquote>${partirDestaque(sobreTxt).resto ? `<p class="sobre-resto">${partirDestaque(sobreTxt).resto}</p>` : ''}</div>
  ${nota || horario ? `<div class="nums">${nota ? `<div><b>${nota.nota}★</b><span class="mono">${nota.avaliacoes ? `${nota.avaliacoes} avaliações no Google` : 'nota no Google'}</span></div>` : ''}${horario ? `<div><b>${esc(horario)}</b><span class="mono">horário de atendimento</span></div>` : ''}</div>` : ''}</div></section>
${voz.length ? `<section class="sec vozes"><div class="wrap"><div class="cab"><h2>Quem já contratou</h2></div><div class="grade">${voz.map(x => `<figure><blockquote>“${esc(x.texto)}”</blockquote>${x.autor ? `<figcaption>${esc(x.autor)}</figcaption>` : ''}</figure>`).join('')}</div></div></section>` : ''}
${secaoLigada(d, 'ctaFinal') ? `<section class="chamada" id="chamada"><div class="wrap"><h2>Fale sobre a sua obra</h2>${ctaPrincipal(d, 'Pedir orçamento')}</div></section>` : ''}
<section class="contato" id="contato"><div class="wrap">
  <div><h2>Onde estamos</h2>${d.endereco ? `<p>${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ''}${d.horario ? `<p>${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ''}</div>
  <div class="acoes">${ctaPrincipal(d, 'Chamar no WhatsApp')}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  },
};

export const CENAS_PLANTA: SiteTemplate[] = [planta];
