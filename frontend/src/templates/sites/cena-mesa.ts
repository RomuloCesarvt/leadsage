/**
 * MESA — restaurante, pizzaria, bar, hamburgueria.
 *
 * Direção de arte (referências de restaurante no Behance): fundo escuro e
 * atmosférico, serifa itálica de tamanho de cartaz, fotografia com vinheta
 * e um cardápio que parece impresso. A página é uma noite à mesa: poucas
 * luzes (âmbar), muito contraste, ornamento discreto.
 *
 * O que a distingue:
 * - a capa ocupa a tela inteira, com o título embaixo à esquerda;
 * - o cardápio é um "papel" claro dentro da página escura, com moldura dupla,
 *   linha pontilhada entre prato e botão "Pedir" (WhatsApp já escrito);
 * - mosaico de fotos assimétrico com legendas;
 * - horário e endereço em tipografia grande: é o que o faminto procura.
 */
import type { SiteTemplate } from './base';
import { esc } from './base';
import { documentoPremium } from './documento';
import { fim } from './premium';
import {
  type ParFontes, ICONES, ctaPrincipal, cssRodape, depoimentosValidos, fotos, fundoFoto, linkMapa, logo,
  partirSobre, rodapePremium, servicosValidos, urlImagem,
} from './premium-base';
import { diferenciaisDe, horarioCurto, notaReal, num, partirDestaque, passosDe, secaoLigada, zapTexto } from './cenas-base';

const FONTES_MESA: ParFontes = {
  titulos: '"Instrument Serif","Playfair Display",Georgia,serif', corpo: '"Inter",system-ui,sans-serif',
  google: 'family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700',
};

export const mesa: SiteTemplate = {
  id: 'mesa',
  nome: 'Mesa',
  descricao: 'Capa em tela cheia, serifa itálica gigante e cardápio de papel. Para restaurantes, pizzarias e bares.',
  nichos: ['Restaurantes', 'Pizzarias', 'Bares', 'Hamburguerias', 'Churrascarias', 'Cafeterias'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#120e0c"/><rect width="160" height="64" fill="${corPrimaria}" opacity=".45"/>
    <rect x="10" y="9" width="24" height="5" rx="2" fill="#f3eadc"/><rect x="120" y="8" width="30" height="8" rx="4" fill="${corDestaque}"/>
    <rect x="10" y="34" width="86" height="12" fill="#f3eadc"/><rect x="10" y="50" width="60" height="12" fill="${corDestaque}"/>
    <rect x="22" y="72" width="116" height="32" fill="#f3eadc"/><rect x="30" y="79" width="40" height="3" fill="#120e0c"/><rect x="30" y="86" width="40" height="3" fill="#120e0c"/><rect x="30" y="93" width="40" height="3" fill="#120e0c"/>
    <rect x="90" y="79" width="40" height="3" fill="#120e0c"/><rect x="90" y="86" width="40" height="3" fill="#120e0c"/><rect x="90" y="93" width="40" height="3" fill="#120e0c"/></svg>`,
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Comida de verdade, feita com tempero e atenção, para comer aqui ou pedir pelo WhatsApp.', 'Aqui o prato chega no ponto, o atendimento é próximo e a vontade é que você volte.');
    const capa = urlImagem(d.capa);
    const galeria = fotos(d);
    const foto2 = urlImagem(d.fotoSobre);
    const todas = [foto2, ...galeria].filter(Boolean).slice(0, 4);
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const horario = horarioCurto(d);
    const mapa = linkMapa(d);
    const palavras = (d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : 'Venha comer bem').split(' ');
    const ultimas = palavras.splice(Math.max(1, palavras.length - 2)).join(' ');
    const titulo = `${palavras.join(' ')} <em>${ultimas}</em>`;
    const difs = secaoLigada(d, 'diferenciais') ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, 'passos') ? passosDe(d, 3) : [];
    const voz = depoimentosValidos(d);
    const legendas = ['Feito na hora', 'Do forno à mesa', 'Para dividir', 'Tempero da casa', 'Venha provar'];

    return documentoPremium(d, FONTES_MESA, `
:root{--m-fundo:#120e0c;--m-papel:#f3eadc;--m-tinta:#2b1f17;--m-creme:#f3eadc;--m-suave:#b9ab98;--m-linha:rgba(243,234,220,.16)}
body{background:var(--m-fundo);color:var(--m-creme)}
h1,h2,h3{font-family:var(--fonte-t);font-weight:400;letter-spacing:-.01em}
em{font-style:italic;color:var(--d)}
.topo{position:absolute;inset:0 0 auto 0;z-index:30}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:22px 0}
.marca{display:flex;align-items:center;gap:12px;font-family:var(--fonte-t);font-style:italic;font-size:clamp(1.4rem,2.6vw,2rem);color:var(--m-creme)}
.logo-img{height:44px;width:auto}.logo-iniciais{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--d);color:var(--sobre-d);font-style:normal;font-weight:700;font-size:15px;font-family:var(--fonte-c)}
.topo nav{display:flex;gap:34px;font-size:13px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--m-creme)}
.topo nav a{opacity:.8}.topo nav a:hover{opacity:1;color:var(--d)}
.btn{border-radius:999px;font-weight:700}
.btn-1{background:var(--d);color:var(--sobre-d)}.btn-1:hover{filter:brightness(1.08)}
.btn-2{background:transparent;color:var(--m-creme);border:1.5px solid rgba(243,234,220,.4)}.btn-2:hover{border-color:var(--d);color:var(--d)}
.capa{position:relative;min-height:100svh;display:flex;flex-direction:column;justify-content:flex-end;padding:140px 0 clamp(40px,6vw,72px);${fundoFoto(capa, d.corPrimaria, 'rgba(18,14,12,.35),rgba(18,14,12,.94)')}}
.capa::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 20% 100%,rgba(18,14,12,.85),transparent 60%);pointer-events:none}
.capa-in{position:relative;z-index:2;display:grid;grid-template-columns:1fr auto;gap:40px;align-items:end}
.eyebrow{font-size:13px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--d);margin:0 0 18px}
.capa h1{font-size:clamp(4rem,13vw,12rem);line-height:.86;letter-spacing:-.03em;margin:0 0 26px;color:var(--m-creme);text-wrap:balance}
.capa .lead{font-size:var(--t1);color:var(--m-creme);opacity:.86;max-width:46ch;margin:0 0 30px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.hoje{background:rgba(18,14,12,.72);backdrop-filter:blur(10px);border:1px solid var(--m-linha);border-radius:22px;padding:22px 26px;min-width:240px;display:grid;gap:12px}
.hoje small{font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--d)}
.hoje b{font-family:var(--fonte-t);font-weight:400;font-size:var(--t2);color:var(--m-creme);display:block;line-height:1.15}
.hoje .estrelas{color:var(--d)}
.cardapio{padding:clamp(72px,10vw,140px) 0}
.papel{max-width:1080px;margin:0 auto;background:var(--m-papel);color:var(--m-tinta);padding:clamp(10px,1.4vw,18px);border-radius:6px}
.papel-in{border:1px solid rgba(43,31,23,.5);outline:1px solid rgba(43,31,23,.25);outline-offset:-7px;padding:clamp(28px,5vw,72px) clamp(20px,5vw,72px)}
.papel .orn{display:flex;align-items:center;justify-content:center;gap:14px;color:var(--p-texto);margin-bottom:10px}.papel .orn i{width:60px;height:1px;background:currentColor}
.papel h2{text-align:center;font-size:clamp(3rem,8vw,6.4rem);line-height:.95;color:var(--m-tinta);margin:0 0 8px}
.papel .sub{text-align:center;font-style:italic;font-family:var(--fonte-t);font-size:var(--t2);color:rgba(43,31,23,.7);margin:0 0 clamp(32px,5vw,56px)}
.pratos{display:grid;grid-template-columns:1fr 1fr;gap:0 clamp(28px,5vw,72px)}
.prato{padding:16px 0;border-bottom:1px dotted rgba(43,31,23,.4)}
.prato-topo{display:flex;align-items:baseline;gap:12px}
.prato h3{font-size:var(--t2);color:var(--m-tinta);margin:0;white-space:normal}
.prato .pt{flex:1;border-bottom:1px dotted rgba(43,31,23,.45);transform:translateY(-4px);min-width:20px}
.prato a{font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--p-texto)}
.prato a:hover{text-decoration:underline}
.prato p{margin:6px 0 0;font-style:italic;color:rgba(43,31,23,.72);font-family:var(--fonte-t);font-size:var(--t1)}
.papel .rodape-papel{text-align:center;margin-top:36px}
.papel .btn-1{background:var(--m-tinta);color:var(--m-papel)}
.mosaico{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:clamp(140px,18vw,260px);gap:12px;padding-bottom:clamp(72px,10vw,140px)}
.mosaico figure{margin:0;position:relative;overflow:hidden;border-radius:14px;background:#1c1612}
.mosaico figure:nth-child(1){grid-column:span 2;grid-row:span 2}
.m4 figure:nth-child(4),.m3 figure:nth-child(2),.m3 figure:nth-child(3){grid-column:span 2}
.mosaico img{width:100%;height:100%;object-fit:cover;transition:transform .8s}.mosaico figure:hover img{transform:scale(1.05)}
.mosaico figcaption{position:absolute;left:0;right:0;bottom:0;padding:34px 18px 14px;background:linear-gradient(transparent,rgba(18,14,12,.85));font-family:var(--fonte-t);font-style:italic;font-size:var(--t2)}
.historia{padding:0 0 clamp(72px,10vw,140px)}
.historia .wrap{display:grid;grid-template-columns:1.5fr 1fr;gap:clamp(32px,6vw,96px);align-items:center}
.historia blockquote{margin:0;font-family:var(--fonte-t);font-size:clamp(2.2rem,5.4vw,4.8rem);line-height:1.04;letter-spacing:-.02em;text-wrap:balance}
.hist-resto{font-size:var(--t1);color:var(--m-suave);max-width:50ch;margin:24px 0 0}
.reserva{border:1px solid var(--m-linha);border-radius:22px;padding:30px;display:grid;gap:18px}
.reserva small{font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--d)}
.reserva b{font-family:var(--fonte-t);font-weight:400;font-size:var(--t2);display:block;line-height:1.2}
.dif{border-top:1px solid var(--m-linha);border-bottom:1px solid var(--m-linha)}
.dif-grade{display:grid;grid-template-columns:repeat(4,1fr)}
.dif-item{padding:40px clamp(14px,2vw,30px);border-right:1px solid var(--m-linha)}.dif-item:last-child{border-right:0}
.dif-item h3{font-size:var(--t3);color:var(--m-creme);margin:0 0 8px}.dif-item p{margin:0;color:var(--m-suave)}
.dif-item i{display:block;font-family:var(--fonte-t);color:var(--d);margin-bottom:12px;font-size:var(--t1);font-variant-numeric:lining-nums}
.passos{padding:clamp(72px,10vw,140px) 0}.passos .titulo{margin-bottom:clamp(32px,5vw,56px)}.passos .titulo h2{font-size:clamp(2.6rem,6vw,5.2rem)}
.passos-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(20px,4vw,56px)}
.passo .gde{display:block;font-family:var(--fonte-t);font-style:italic;font-size:clamp(4.5rem,10vw,8rem);line-height:.9;color:var(--d);font-variant-numeric:lining-nums}
.passo h3{font-size:var(--t3);margin:8px 0}.passo p{margin:0;color:var(--m-suave)}
.vozes{padding:clamp(72px,10vw,140px) 0;text-align:center;border-top:1px solid var(--m-linha)}
.vozes .aspas{display:block;font-family:var(--fonte-t);font-size:clamp(5rem,10vw,9rem);line-height:.6;color:var(--d)}
.vozes blockquote{margin:0 auto;max-width:26ch;font-family:var(--fonte-t);font-size:clamp(2rem,4.6vw,3.8rem);line-height:1.08}
.vozes figcaption{margin-top:22px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--m-suave)}
.chamada{background:var(--d);color:var(--sobre-d);padding:clamp(64px,9vw,120px) 0;text-align:center}
.chamada h2{font-size:clamp(2.8rem,8vw,7rem);line-height:.95;margin:0 0 28px;color:var(--sobre-d)}.chamada h2 em{color:var(--sobre-d);opacity:.7}
.chamada .btn-1{background:var(--m-fundo);color:var(--m-creme)}
.onde{padding:clamp(72px,10vw,140px) 0}
.onde .wrap{display:grid;grid-template-columns:1.3fr 1fr;gap:clamp(32px,6vw,96px);align-items:end}
.onde h2{font-size:clamp(2.6rem,6vw,5.2rem);margin:0 0 20px}.onde .end{font-family:var(--fonte-t);font-size:var(--t3);line-height:1.2;margin:0 0 8px}
.onde .hor{color:var(--m-suave);margin:0}.onde .acoes{display:grid;gap:12px}.onde .btn{justify-content:center}
.sx{--sx-fundo:var(--m-fundo);--sx-alt:#17120f;--sx-card:#1c1612;--sx-borda:var(--m-linha);--sx-texto:var(--m-creme);--sx-suave:var(--m-suave);--sx-icone:var(--d);--sx-raio:16px}
.sx-cab h2{font-family:var(--fonte-t);font-weight:400;font-size:clamp(2.4rem,5.4vw,4.4rem)}
${cssRodape('rp', '#0a0706', '#a99b88')}
@media(max-width:900px){.topo nav{display:none}.capa-in{grid-template-columns:1fr}.hoje{min-width:0}.pratos{grid-template-columns:1fr}.mosaico{grid-template-columns:1fr 1fr}.mosaico figure:nth-child(1){grid-column:span 2}.historia .wrap,.onde .wrap{grid-template-columns:1fr}.dif-grade{grid-template-columns:1fr 1fr}.passos-grade{grid-template-columns:1fr}}
@media(max-width:560px){.dif-grade{grid-template-columns:1fr}.dif-item{border-right:0;border-bottom:1px solid var(--m-linha)}.prato a{display:none}}
`, `
<header class="topo"><div class="wrap">
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav aria-label="Seções"><a href="#cardapio">Cardápio</a><a href="#sobre">A casa</a><a href="#contato">Visite</a></nav>
  ${ctaPrincipal(d, 'Pedir agora')}
</div></header>
<section class="capa"><div class="wrap capa-in">
  <div><p class="eyebrow">${esc(d.categoria || 'Cardápio e pedidos')}${d.cidade ? ` · ${esc(d.cidade)}` : ''}</p>
    <h1>${titulo}</h1><p class="lead">${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, 'Pedir pelo WhatsApp')}<a class="btn btn-2" href="#cardapio">Ver o cardápio</a></div></div>
  ${horario || nota ? `<aside class="hoje" aria-label="Informações">
    ${horario ? `<div><small>Funcionamento</small><b>${esc(horario)}</b></div>` : ''}
    ${nota ? `<div><small>No Google</small><b><span class="estrelas" aria-hidden="true">★</span> ${nota.nota}${nota.avaliacoes ? ` · ${nota.avaliacoes} avaliações` : ''}</b></div>` : ''}</aside>` : ''}
</div></section>
${servicos.length ? `<section class="cardapio" id="cardapio"><div class="wrap"><div class="papel"><div class="papel-in">
  <div class="orn" aria-hidden="true"><i></i>✦<i></i></div><h2>Cardápio</h2><p class="sub">Escolha e peça: a mensagem já vai pronta.</p>
  <div class="pratos">${servicos.map(s => `<div class="prato"><div class="prato-topo"><h3>${esc(s.titulo)}</h3><span class="pt" aria-hidden="true"></span>${
    zapTexto(d, `Olá! Quero pedir: ${s.titulo}`) ? `<a href="${zapTexto(d, `Olá! Quero pedir: ${s.titulo}`)}" target="_blank" rel="noopener">Pedir</a>` : ''}</div><p>${esc(s.descricao)}</p></div>`).join('')}</div>
  <div class="rodape-papel">${ctaPrincipal(d, 'Fazer meu pedido')}</div>
</div></div></div></section>` : ''}
${todas.length >= 3 ? `<div class="wrap mosaico m${todas.length}" aria-label="Fotos">${todas.map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} — foto ${i + 1}" loading="lazy"><figcaption>${legendas[i % legendas.length]}</figcaption></figure>`).join('')}</div>` : ''}
<section class="historia" id="sobre"><div class="wrap"><div><blockquote>${partirDestaque(sobreTxt).destaque}</blockquote>${partirDestaque(sobreTxt).resto ? `<p class="hist-resto">${partirDestaque(sobreTxt).resto}</p>` : ''}</div>
  <div class="reserva">${d.endereco ? `<div><small>Onde</small><b>${esc(d.endereco)}</b></div>` : ''}${d.horario ? `<div><small>Quando</small><b>${esc(horario || d.horario)}</b></div>` : ''}</div></div></section>
${difs.length ? `<section class="dif" id="diferenciais"><div class="wrap"><div class="dif-grade">${difs.map((x, i) => `<div class="dif-item"><i>${num(i)}</i><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join('')}</div></div></section>` : ''}
${passos.length ? `<section class="passos" id="passos"><div class="wrap"><div class="titulo"><p class="eyebrow">Passo a passo</p><h2>Como <em>pedir</em></h2></div>
  <div class="passos-grade">${passos.map((p, i) => `<div class="passo"><span class="gde" aria-hidden="true">${num(i)}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join('')}</div></div></section>` : ''}
${voz.length ? `<section class="vozes"><div class="wrap"><figure style="margin:0"><span class="aspas" aria-hidden="true">“</span><blockquote>${esc(voz[0].texto)}</blockquote>${voz[0].autor ? `<figcaption>${esc(voz[0].autor)}</figcaption>` : ''}</figure></div></section>` : ''}
${secaoLigada(d, 'ctaFinal') ? `<section class="chamada" id="chamada"><div class="wrap"><h2>A mesa está <em>posta</em></h2>${ctaPrincipal(d, 'Pedir agora')}</div></section>` : ''}
<section class="onde" id="contato"><div class="wrap">
  <div><h2>Venha <em>comer</em></h2>${d.endereco ? `<p class="end">${esc(d.endereco)}</p>` : ''}${d.horario ? `<p class="hor">${esc(d.horario)}</p>` : ''}</div>
  <div class="acoes">${ctaPrincipal(d, 'Chamar no WhatsApp')}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  },
};

export const CENAS_MESA: SiteTemplate[] = [mesa];
