/**
 * FORNO — padarias, confeitarias, cafeterias e docerias.
 *
 * Direção de arte (referências de padaria artesanal no Behance): papel kraft
 * quente, serifa gorda e acolhedora, foto em arco de vitrine e o cardápio
 * como lista de balcão, com pontilhado entre o item e o "pedir". Nada de
 * preço inventado: cada item leva ao WhatsApp com o pedido já escrito.
 */
import type { SiteTemplate } from './base';
import { esc } from './base';
import { documentoPremium } from './documento';
import { fim } from './premium';
import {
  type ParFontes, ICONES, ctaPrincipal, cssRodape, depoimentosValidos, fotos, fundoFoto, linkMapa, logo,
  partirSobre, rodapePremium, servicosValidos, urlImagem,
} from './premium-base';
import { cssGaleriaCena, diferenciaisDe, galeriaCena, horarioCurto, notaReal, num, passosDe, secaoLigada, zapTexto } from './cenas-base';

const FONTES_FORNO: ParFontes = {
  titulos: '"Young Serif",Georgia,serif', corpo: '"Figtree",system-ui,sans-serif',
  google: 'family=Young+Serif&family=Figtree:wght@400;500;600;700',
};

export const forno: SiteTemplate = {
  id: 'forno',
  nome: 'Forno',
  descricao: 'Papel kraft, serifa acolhedora, foto em arco e cardápio de balcão com pedido no WhatsApp. Para padarias, confeitarias e cafés.',
  nichos: ['Padarias', 'Confeitarias', 'Cafeterias', 'Docerias', 'Bolos e doces'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#f7efe3"/><rect x="10" y="8" width="26" height="6" rx="3" fill="#3b2418"/><rect x="112" y="6" width="38" height="10" rx="5" fill="${corPrimaria}"/>
    <path d="M92 94V54a28 28 0 0 1 56 0v40z" fill="${corPrimaria}" opacity=".55"/><circle cx="96" cy="40" r="9" fill="${corDestaque}"/>
    <rect x="12" y="30" width="62" height="10" rx="2" fill="#3b2418"/><rect x="12" y="44" width="44" height="10" rx="2" fill="#3b2418"/><rect x="12" y="62" width="30" height="9" rx="4.5" fill="${corPrimaria}"/>
    <rect x="12" y="98" width="60" height="3" fill="#d9c7ad"/><rect x="82" y="98" width="66" height="3" fill="#d9c7ad"/></svg>`,
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Pão quentinho, bolos e doces feitos todo dia, com encomenda fácil pelo WhatsApp.', 'Cada fornada é pensada para você levar sabor para casa e voltar sempre.');
    const capa = urlImagem(d.capa);
    const galeria = fotos(d);
    const foto2 = urlImagem(d.fotoSobre) || galeria[0] || '';
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const horario = horarioCurto(d);
    const mapa = linkMapa(d);
    const difs = secaoLigada(d, 'diferenciais') ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, 'passos') ? passosDe(d, 4) : [];
    const voz = depoimentosValidos(d).slice(0, 3);
    const pedidoGeral = zapTexto(d, 'Olá! Gostaria de fazer uma encomenda.');

    return documentoPremium(d, FONTES_FORNO, `
:root{--f-papel:#f7efe3;--f-tinta:#3b2418;--f-suave:#6f5847;--f-borda:#e2d2ba;--f-claro:#fffaf1}
body{background:#f7efe3;color:var(--f-tinta)}
h1,h2,h3{font-family:var(--fonte-t);font-weight:400;letter-spacing:-.01em;line-height:1.06}
.topo{position:sticky;top:0;z-index:40;background:rgba(247,239,227,.92);backdrop-filter:blur(10px);border-bottom:1px dashed var(--f-borda)}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 0}
.marca{display:flex;align-items:center;gap:10px;font-family:var(--fonte-t);font-size:1.3rem;color:var(--f-tinta)}
.logo-img{height:38px;width:auto}.logo-iniciais{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:700;font-size:14px}
.topo nav{display:flex;gap:28px;font-weight:500;font-size:15px;color:var(--f-suave)}.topo nav a:hover{color:var(--p-texto)}
.btn{border-radius:999px;font-weight:700}
.btn-1{background:var(--p);color:var(--sobre-p)}.btn-1:hover{transform:translateY(-2px)}
.btn-2{background:transparent;color:var(--f-tinta);border:1.5px solid var(--f-tinta)}
.capa{padding:clamp(40px,6vw,84px) 0 clamp(56px,8vw,104px)}
.capa-in{display:grid;grid-template-columns:1.05fr 1fr;gap:clamp(32px,5vw,80px);align-items:center}
.etq{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--p-texto)}
.etq::before{content:'';width:22px;height:2px;background:currentColor}
.capa h1{font-size:clamp(2.8rem,6.2vw,5.4rem);margin:18px 0 18px}
.capa h1 em{font-style:italic;color:var(--p-texto)}
.capa .lead{color:var(--f-suave);font-size:var(--t1);max-width:44ch;margin:0 0 28px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.hoje{margin-top:28px;display:inline-flex;gap:12px;align-items:center;background:var(--f-claro);border:1.5px dashed var(--f-borda);border-radius:16px;padding:12px 18px;font-weight:600}.hoje svg{color:var(--p-texto)}.hoje small{display:block;color:var(--f-suave);font-weight:500}
.arco{position:relative;max-width:480px;margin-left:auto;width:100%}
.arco .img{aspect-ratio:4/5;border-radius:999px 999px 28px 28px;overflow:hidden;box-shadow:0 36px 60px -36px rgba(59,36,24,.55);border:8px solid var(--f-claro);${fundoFoto(capa, d.corPrimaria, 'rgba(0,0,0,0),rgba(59,36,24,.1)')}}
.selo{position:absolute;right:-14px;top:12%;width:112px;height:112px;border-radius:50%;background:var(--d);color:#2a170d;display:grid;place-items:center;text-align:center;font-family:var(--fonte-t);font-size:15px;line-height:1.1;transform:rotate(10deg);box-shadow:0 14px 26px -14px rgba(0,0,0,.5);padding:12px}
.nota-fl{position:absolute;left:-14px;bottom:8%;background:var(--f-claro);border:1.5px dashed var(--f-borda);border-radius:16px;padding:12px 16px;box-shadow:0 20px 36px -24px rgba(59,36,24,.5);font-size:13px;color:var(--f-suave)}.nota-fl b{display:block;font-size:1.5rem;color:var(--f-tinta);font-family:var(--fonte-t);line-height:1}
.sec{padding:clamp(56px,8vw,104px) 0}
.cab{display:flex;align-items:end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:clamp(24px,4vw,44px)}
.cab h2{font-size:clamp(2.2rem,4.8vw,3.8rem);margin:0;max-width:16ch}.cab p{margin:0;color:var(--f-suave);max-width:36ch;font-size:var(--t1)}
.cardapio{background:var(--f-claro);border:1.5px dashed var(--f-borda);border-radius:28px;padding:clamp(24px,4vw,52px);display:grid;grid-template-columns:1fr 1fr;gap:6px clamp(28px,5vw,72px)}
.item{display:flex;flex-direction:column;gap:4px;padding:18px 0;border-bottom:1px dotted #cdb89a}
.item .linha{display:flex;align-items:baseline;gap:10px}
.item h3{font-size:1.45rem;margin:0}.item .pontos{flex:1;border-bottom:2px dotted #cdb89a;transform:translateY(-4px)}
.item a{font-weight:700;font-size:14px;color:var(--p-texto);white-space:nowrap}.item a:hover{text-decoration:underline}
.item p{margin:0;color:var(--f-suave);max-width:46ch}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,6vw,96px);align-items:center}
.sobre .foto{aspect-ratio:1;border-radius:28px 28px 200px 28px;overflow:hidden;border:8px solid var(--f-claro);box-shadow:0 30px 50px -34px rgba(59,36,24,.5);background:var(--p-cla)}.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(2.2rem,4.6vw,3.6rem);margin:0 0 18px}.sobre p{color:var(--f-suave);font-size:var(--t1)}
.etiquetas{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.etiqueta{background:var(--f-claro);border:1.5px dashed var(--f-borda);border-radius:20px;padding:26px;position:relative}
.etiqueta::before{content:'';position:absolute;left:50%;top:-8px;width:44px;height:14px;border-radius:7px;background:var(--d);transform:translateX(-50%) rotate(-3deg);opacity:.85}
.etiqueta h3{font-size:1.35rem;margin:6px 0 8px}.etiqueta p{margin:0;color:var(--f-suave)}
.encomenda{background:var(--f-tinta);color:#f7efe3;border-radius:36px;padding:clamp(32px,6vw,72px)}
.encomenda h2{font-size:clamp(2.2rem,4.6vw,3.6rem);margin:0 0 28px;color:#fff}
.encomenda .passos{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:24px}
.encomenda .n{font-family:var(--fonte-t);font-size:3.6rem;line-height:1;color:var(--d)}
.encomenda h3{font-size:1.4rem;margin:8px 0;color:#fff}.encomenda p{margin:0;color:#d8c7b3}
.vozes .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:16px}
.vozes figure{margin:0;background:var(--f-claro);border:1.5px dashed var(--f-borda);border-radius:24px;padding:28px}
.vozes blockquote{margin:12px 0 18px;font-family:var(--fonte-t);font-size:1.25rem;line-height:1.3}.vozes figcaption{font-weight:600;color:var(--f-suave)}
.chamada .cartao{background:var(--p);color:var(--sobre-p);border-radius:36px;padding:clamp(40px,7vw,84px) clamp(24px,6vw,80px);text-align:center;border:8px solid var(--f-claro)}
.chamada h2{font-size:clamp(2.4rem,5.4vw,4.2rem);margin:0 0 12px;color:inherit}.chamada p{margin:0 auto 26px;max-width:44ch;opacity:.94;font-size:var(--t1)}
.chamada .btn-1{background:var(--f-claro);color:var(--f-tinta)}
.contato .wrap{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:clamp(48px,7vw,88px) 0}
.contato .cx{background:var(--f-claro);border:1.5px dashed var(--f-borda);border-radius:26px;padding:clamp(24px,4vw,44px)}
.contato h2{font-size:clamp(1.8rem,3.4vw,2.6rem);margin:0 0 16px}.contato p{display:flex;gap:12px;margin:0 0 10px;color:var(--f-suave)}.contato svg{flex:none;margin-top:4px;color:var(--p-texto)}
.contato .acoes{display:grid;gap:12px;align-content:center}.contato .btn{justify-content:center}
${cssGaleriaCena('24px', 'var(--f-borda)')}
.sx{--sx-fundo:transparent;--sx-alt:transparent;--sx-card:#fffaf1;--sx-borda:var(--f-borda);--sx-texto:var(--f-tinta);--sx-suave:var(--f-suave);--sx-icone:var(--p-texto);--sx-raio:24px}
.sx-cab h2{font-family:var(--fonte-t)}
${cssRodape('rp', '#2a170d', '#d8c7b3')}
@media(max-width:900px){.topo nav{display:none}.capa-in,.sobre .wrap,.contato .wrap,.cardapio{grid-template-columns:1fr}.arco{margin:8px auto 0;max-width:420px}.etiquetas{grid-template-columns:1fr 1fr}.selo{right:-6px}.nota-fl{left:-6px}}
@media(max-width:560px){.etiquetas{grid-template-columns:1fr}.selo{width:92px;height:92px;font-size:13px}}
`, `
<header class="topo"><div class="wrap">
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav aria-label="Seções"><a href="#cardapio">Cardápio</a><a href="#sobre">A casa</a><a href="#encomendas">Encomendas</a><a href="#contato">Contato</a></nav>
  ${ctaPrincipal(d, 'Encomendar')}
</div></header>
<section class="capa"><div class="wrap capa-in">
  <div><span class="etq">${esc(d.categoria || 'Feito todo dia')}${d.cidade ? ` · ${esc(d.cidade)}` : ''}</span>
    <h1>${d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : 'Cheirinho de pão <em>saindo do forno</em>'}</h1>
    <p class="lead">${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, 'Fazer encomenda')}<a class="btn btn-2" href="#cardapio">Ver cardápio</a></div>
    ${horario ? `<div class="hoje">${ICONES.relogio}<span><small>Aberto</small>${esc(horario)}</span></div>` : ''}</div>
  <div class="arco"><div class="img" role="img" aria-label="${esc(d.empresa)}"></div><span class="selo" aria-hidden="true">Feito todo dia</span>
    ${nota ? `<div class="nota-fl"><b>${nota.nota} ★</b>${nota.avaliacoes ? `${nota.avaliacoes} avaliações no Google` : 'no Google'}</div>` : ''}</div>
</div></section>
${servicos.length ? `<section class="sec" id="cardapio"><div class="wrap"><div class="cab"><h2>O que sai do nosso balcão</h2><p>Toque em “Pedir” e o WhatsApp abre com a mensagem pronta.</p></div>
<div class="cardapio">${servicos.map(s => `<div class="item"><div class="linha"><h3>${esc(s.titulo)}</h3><span class="pontos" aria-hidden="true"></span>${
    zapTexto(d, `Olá! Quero pedir/encomendar: ${s.titulo}`) ? `<a href="${zapTexto(d, `Olá! Quero pedir/encomendar: ${s.titulo}`)}" target="_blank" rel="noopener">Pedir</a>` : ''}</div><p>${esc(s.descricao)}</p></div>`).join('')}</div></div></section>` : ''}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ''}
  <div><h2>Uma padaria de bairro, feita com capricho</h2><p>${sobreTxt}</p>${pedidoGeral ? `<p><a class="btn btn-1" href="${pedidoGeral}" target="_blank" rel="noopener">${ICONES.zap}Falar com a gente</a></p>` : ''}</div>
</div></section>
${difs.length ? `<section class="sec" id="diferenciais" style="padding-top:0"><div class="wrap"><div class="etiquetas">${difs.map(x => `<div class="etiqueta"><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join('')}</div></div></section>` : ''}
${galeriaCena(galeria, esc(d.empresa), 'Direto da vitrine')}
${passos.length ? `<section class="sec" id="passos" style="padding-top:0"><div class="wrap"><div class="encomenda" id="encomendas"><h2>Como encomendar</h2><div class="passos">${passos.map((p, i) => `<div><span class="n">${num(i)}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join('')}</div></div></div></section>` : ''}
${voz.length ? `<section class="sec vozes"><div class="wrap"><div class="cab"><h2>Quem já provou</h2></div><div class="grade">${voz.map(x => `<figure><span class="estrelas" aria-hidden="true">★★★★★</span><blockquote>“${esc(x.texto)}”</blockquote><figcaption>${esc(x.autor || '')}</figcaption></figure>`).join('')}</div></div></section>` : ''}
${secaoLigada(d, 'ctaFinal') ? `<section class="sec chamada" id="chamada"><div class="wrap"><div class="cartao"><h2>Já está com água na boca?</h2><p>Chame no WhatsApp, conte o que quer e combine a retirada.</p>${ctaPrincipal(d, 'Fazer encomenda')}</div></div></section>` : ''}
<section class="contato" id="contato"><div class="wrap">
  <div class="cx"><h2>Venha nos visitar</h2>${d.endereco ? `<p>${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ''}${d.horario ? `<p>${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ''}</div>
  <div class="cx acoes">${ctaPrincipal(d, 'Chamar no WhatsApp')}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  },
};

export const CENAS_FORNO: SiteTemplate[] = [forno];
