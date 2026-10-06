/**
 * SHOWROOM — concessionárias e revendas de veículos.
 *
 * Direção de arte (referências de landing de automóveis no Behance): fundo
 * escuro de vitrine, nome da marca gigante em contorno atrás da foto, faixa
 * de dados reais e cartões de categoria que abrem o WhatsApp já com a
 * mensagem escrita ("Quero ver: Seminovos").
 *
 * Só aparecem dados reais do cadastro. Onde há financiamento, o aviso de
 * análise de crédito acompanha.
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

const FONTES_SHOWROOM: ParFontes = {
  titulos: '"Barlow Condensed",system-ui,sans-serif', corpo: '"Barlow",system-ui,sans-serif',
  google: 'family=Barlow+Condensed:wght@500;600;700;800&family=Barlow:wght@400;500;600',
};

export const showroom: SiteTemplate = {
  id: 'showroom',
  nome: 'Showroom',
  descricao: 'Vitrine escura, nome da marca em contorno atrás da foto, faixa de dados e categorias com WhatsApp pronto. Para concessionárias e revendas.',
  nichos: ['Concessionárias', 'Revendas de veículos', 'Motos', 'Seminovos', 'Multimarcas'],
  miniatura: ({ corPrimaria }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#0b0c10"/><rect x="10" y="8" width="26" height="6" rx="2" fill="#fff"/><rect x="112" y="6" width="38" height="10" rx="2" fill="${corPrimaria}"/>
    <text x="12" y="62" font-size="38" font-weight="800" fill="none" stroke="#2a2d36" stroke-width="1.2" font-family="sans-serif">MARCA</text>
    <rect x="42" y="38" width="86" height="34" rx="10" fill="${corPrimaria}" opacity=".55"/><rect x="12" y="30" width="54" height="9" rx="2" fill="#fff"/><rect x="12" y="44" width="30" height="9" rx="2" fill="${corPrimaria}"/>
    <rect x="8" y="82" width="144" height="10" fill="#16181f"/><rect x="12" y="97" width="30" height="10" rx="2" fill="#16181f"/><rect x="46" y="97" width="30" height="10" rx="2" fill="#16181f"/><rect x="80" y="97" width="30" height="10" rx="2" fill="#16181f"/><rect x="114" y="97" width="30" height="10" rx="2" fill="#16181f"/></svg>`,
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Veículos novos e seminovos, avaliação do seu usado e atendimento direto pelo WhatsApp.', 'Aqui você tira as dúvidas, conhece as opções e negocia com transparência.');
    const capa = urlImagem(d.capa);
    const galeria = fotos(d);
    const foto2 = urlImagem(d.fotoSobre) || galeria[0] || '';
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const horario = horarioCurto(d);
    const mapa = linkMapa(d);
    const marca = esc((d.empresa || '').split(/\s+/).slice(0, 2).join(' ')).toUpperCase();
    const difs = secaoLigada(d, 'diferenciais') ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, 'passos') ? passosDe(d, 4) : [];
    const voz = depoimentosValidos(d).slice(0, 3);
    const temFinanc = servicos.some(s => /financ|credito|crédito/i.test(`${s.titulo} ${s.descricao}`));
    const dados: string[] = [];
    if (nota) dados.push(`<div><b>${nota.nota} ★</b><small>${nota.avaliacoes ? `${nota.avaliacoes} avaliações no Google` : 'avaliação no Google'}</small></div>`);
    if (horario) dados.push(`<div><b>${esc(horario)}</b><small>Horário de atendimento</small></div>`);
    if (d.cidade) dados.push(`<div><b>${esc(d.cidade)}</b><small>Venha conhecer</small></div>`);
    if (d.telefone || d.whatsapp) dados.push(`<div><b>WhatsApp</b><small>Fale com um vendedor</small></div>`);

    return documentoPremium(d, FONTES_SHOWROOM, `
:root{--v-fundo:#0b0c10;--v-card:#14161d;--v-borda:#262932;--v-tinta:#f4f5f7;--v-suave:#a4a9b6}
body{background:#0b0c10;color:var(--v-tinta)}
h1,h2,h3{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;letter-spacing:.005em;line-height:.95}
.topo{position:sticky;top:0;z-index:40;background:rgba(11,12,16,.88);backdrop-filter:blur(12px);border-bottom:1px solid var(--v-borda)}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 0}
.marca{display:flex;align-items:center;gap:10px;font-family:var(--fonte-t);font-weight:700;font-size:1.35rem;text-transform:uppercase;letter-spacing:.04em;color:#fff}
.logo-img{height:34px;width:auto}.logo-iniciais{width:34px;height:34px;border-radius:6px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:700;font-size:14px}
.topo nav{display:flex;gap:28px;font-size:15px;font-weight:500;color:var(--v-suave)}.topo nav a:hover{color:#fff}
.btn{border-radius:4px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;font-size:14px}
.btn-1{background:var(--p);color:var(--sobre-p)}.btn-1:hover{filter:brightness(1.12)}
.btn-2{background:transparent;color:#fff;border:1.5px solid #3a3e4a}.btn-2:hover{border-color:#fff}
.capa{position:relative;overflow:hidden;padding:clamp(40px,6vw,80px) 0 0;isolation:isolate}
.capa .gigante{position:absolute;left:50%;top:clamp(20px,4vw,60px);transform:translateX(-50%);z-index:-1;font-family:var(--fonte-t);font-weight:800;font-size:clamp(6rem,24vw,22rem);line-height:.85;white-space:nowrap;color:transparent;-webkit-text-stroke:2px #23262f;user-select:none;max-width:100%;overflow:hidden}
.capa-in{display:grid;grid-template-columns:1fr 1.15fr;gap:clamp(24px,4vw,64px);align-items:center;min-height:min(560px,70vh)}
.etq{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--v-suave)}
.etq::before{content:'';width:28px;height:3px;background:var(--p)}
.capa h1{font-size:clamp(3.2rem,8vw,7rem);margin:18px 0 18px;color:#fff}
.capa h1 em{font-style:normal;color:var(--p)}
.capa .lead{color:var(--v-suave);font-size:var(--t1);max-width:44ch;margin:0 0 28px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.vitrine{position:relative}
.vitrine .img{aspect-ratio:16/10;border-radius:14px;overflow:hidden;box-shadow:0 50px 90px -40px rgba(0,0,0,.9),0 0 0 1px var(--v-borda);${fundoFoto(capa, d.corPrimaria, 'rgba(11,12,16,0),rgba(11,12,16,.28)')}}
.vitrine::after{content:'';position:absolute;left:8%;right:8%;bottom:-18px;height:30px;background:radial-gradient(ellipse at center,var(--p) 0,transparent 70%);opacity:.35;filter:blur(14px);z-index:-1}
.faixa{margin-top:clamp(32px,5vw,64px);border-top:1px solid var(--v-borda);border-bottom:1px solid var(--v-borda);background:var(--v-card)}
.faixa .wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}
.faixa .wrap>div{padding:22px 24px;border-left:1px solid var(--v-borda)}.faixa .wrap>div:first-child{border-left:0;padding-left:0}
.faixa b{display:block;font-family:var(--fonte-t);font-size:1.7rem;text-transform:uppercase;line-height:1;letter-spacing:.02em}.faixa small{color:var(--v-suave);font-size:13px}
.sec{padding:clamp(64px,9vw,120px) 0}
.cab{display:flex;align-items:end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:clamp(28px,4vw,48px)}
.cab h2{font-size:clamp(2.6rem,6vw,5rem);margin:0;max-width:14ch}.cab p{margin:0;color:var(--v-suave);max-width:38ch;font-size:var(--t1)}
.cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:14px}
.cat{position:relative;display:flex;flex-direction:column;gap:10px;background:var(--v-card);border:1px solid var(--v-borda);border-radius:10px;padding:26px;min-height:240px;overflow:hidden;transition:transform .25s,border-color .25s}
.cat:hover{transform:translateY(-4px);border-color:var(--p)}
.cat .n{font-family:var(--fonte-t);font-weight:800;font-size:4.6rem;line-height:.8;color:transparent;-webkit-text-stroke:1.5px #343845}
.cat h3{font-size:1.9rem;margin:6px 0 0;color:#fff}.cat p{margin:0;color:var(--v-suave)}
.cat a{margin-top:auto;display:inline-flex;gap:8px;align-items:center;font-weight:600;color:var(--p-texto-escuro,#fff);text-transform:uppercase;font-size:13px;letter-spacing:.08em}
.cat a svg{color:var(--p)}.cat:hover a{gap:14px}
.aviso{margin:22px 0 0;color:var(--v-suave);font-size:13px;max-width:70ch}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,6vw,96px);align-items:center}
.sobre .foto{aspect-ratio:4/3;border-radius:10px;overflow:hidden;box-shadow:0 0 0 1px var(--v-borda);background:var(--v-card)}.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(2.4rem,5vw,4rem);margin:0 0 18px}.sobre p{color:var(--v-suave);font-size:var(--t1)}
.dif-grade{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--v-borda);border-radius:10px;overflow:hidden}
.dif-card{padding:28px;border-left:1px solid var(--v-borda);background:var(--v-card)}.dif-card:first-child{border-left:0}
.dif-card .ic{color:var(--p);margin-bottom:16px;display:block}
.dif-card h3{font-size:1.5rem;margin:0 0 8px}.dif-card p{margin:0;color:var(--v-suave)}
.trilha{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;counter-reset:p}
.trilha .p{background:var(--v-card);border:1px solid var(--v-borda);border-top:3px solid var(--p);border-radius:10px;padding:26px}
.trilha .p span{font-family:var(--fonte-t);font-weight:800;font-size:2.6rem;color:var(--p);line-height:1}
.trilha h3{font-size:1.6rem;margin:10px 0 8px}.trilha p{margin:0;color:var(--v-suave)}
.vozes .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.vozes figure{margin:0;background:var(--v-card);border:1px solid var(--v-borda);border-radius:10px;padding:26px}
.vozes blockquote{margin:12px 0 18px;font-size:var(--t1)}.vozes figcaption{font-weight:600;color:var(--v-suave)}
.chamada .cartao{position:relative;overflow:hidden;border-radius:14px;background:var(--p);color:var(--sobre-p);padding:clamp(40px,7vw,88px) clamp(24px,6vw,80px);display:flex;gap:28px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.chamada h2{font-size:clamp(2.6rem,6vw,5rem);margin:0;color:inherit;max-width:14ch}.chamada p{margin:10px 0 0;max-width:42ch;opacity:.92}
.chamada .btn-1{background:#0b0c10;color:#fff}
.contato .wrap{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:clamp(48px,7vw,88px) 0}
.contato .cx{background:var(--v-card);border:1px solid var(--v-borda);border-radius:10px;padding:clamp(24px,4vw,44px)}
.contato h2{font-size:clamp(2rem,3.6vw,2.8rem);margin:0 0 16px}.contato p{display:flex;gap:12px;margin:0 0 10px;color:var(--v-suave)}.contato svg{flex:none;margin-top:4px;color:var(--p)}
.contato .acoes{display:grid;gap:12px;align-content:center}.contato .btn{justify-content:center}
${cssGaleriaCena('10px', '#262932')}
.sx{--sx-fundo:#0b0c10;--sx-alt:#101218;--sx-card:#14161d;--sx-borda:#262932;--sx-texto:#f4f5f7;--sx-suave:#a4a9b6;--sx-icone:var(--p);--sx-raio:10px}
.sx-cab h2{font-family:var(--fonte-t);text-transform:uppercase}
${cssRodape('rp', '#07080b', '#a4a9b6')}
@media(max-width:900px){.topo nav{display:none}.capa-in,.sobre .wrap,.contato .wrap{grid-template-columns:1fr}.dif-grade{grid-template-columns:1fr 1fr}.dif-card{border-top:1px solid var(--v-borda)}.faixa .wrap>div{border-left:0;padding-left:0;border-top:1px solid var(--v-borda)}.faixa .wrap>div:first-child{border-top:0}}
@media(max-width:560px){.dif-grade{grid-template-columns:1fr}.capa .gigante{top:10px}}
`, `
<header class="topo"><div class="wrap">
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav aria-label="Seções"><a href="#categorias">Veículos</a><a href="#sobre">A loja</a><a href="#compra">Como comprar</a><a href="#contato">Contato</a></nav>
  ${ctaPrincipal(d, 'Falar com vendedor')}
</div></header>
<section class="capa"><div class="gigante" aria-hidden="true">${marca}</div>
  <div class="wrap capa-in">
    <div><span class="etq">${esc(d.categoria || 'Veículos novos e seminovos')}${d.cidade ? ` · ${esc(d.cidade)}` : ''}</span>
      <h1>${d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : 'Seu próximo carro <em>começa aqui</em>'}</h1>
      <p class="lead">${capaTxt}</p>
      <div class="btns">${ctaPrincipal(d, 'Falar com vendedor')}<a class="btn btn-2" href="#categorias">Ver opções</a></div></div>
    <div class="vitrine"><div class="img" role="img" aria-label="${esc(d.empresa)}"></div></div>
  </div>
  ${dados.length ? `<div class="faixa"><div class="wrap">${dados.join('')}</div></div>` : ''}
</section>
${servicos.length ? `<section class="sec" id="categorias"><div class="wrap"><div class="cab"><h2>O que você procura</h2><p>Escolha a categoria e chame um vendedor com a mensagem já pronta.</p></div>
<div class="cats">${servicos.map((s, i) => `<article class="cat"><span class="n" aria-hidden="true">${num(i)}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p>${
    zapTexto(d, `Olá! Quero saber mais sobre: ${s.titulo}`) ? `<a href="${zapTexto(d, `Olá! Quero saber mais sobre: ${s.titulo}`)}" target="_blank" rel="noopener">Quero ver ${ICONES.seta}</a>` : ''}</article>`).join('')}</div>
${temFinanc ? '<p class="aviso">Financiamento sujeito à análise de crédito. Condições conforme o momento e o perfil de cada cliente.</p>' : ''}</div></section>` : ''}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ''}
  <div><h2>Atendimento de quem entende de carro</h2><p>${sobreTxt}</p></div>
</div></section>
${difs.length ? `<section class="sec" id="diferenciais" style="padding-top:0"><div class="wrap"><div class="dif-grade">${difs.map((x, i) => `<div class="dif-card"><span class="ic">${[ICONES.escudo, ICONES.relogio, ICONES.estrela, ICONES.check][i % 4]}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join('')}</div></div></section>` : ''}
${galeriaCena(galeria, esc(d.empresa), 'Nossa loja')}
${passos.length ? `<section class="sec" id="passos"><div class="wrap"><div class="cab"><h2 id="compra">Como comprar</h2></div><div class="trilha">${passos.map((p, i) => `<div class="p"><span>${num(i)}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join('')}</div></div></section>` : ''}
${voz.length ? `<section class="sec vozes"><div class="wrap"><div class="cab"><h2>Quem já comprou</h2></div><div class="grade">${voz.map(x => `<figure><span class="estrelas" aria-hidden="true">★★★★★</span><blockquote>“${esc(x.texto)}”</blockquote><figcaption>${esc(x.autor || '')}</figcaption></figure>`).join('')}</div></div></section>` : ''}
${secaoLigada(d, 'ctaFinal') ? `<section class="sec chamada" id="chamada"><div class="wrap"><div class="cartao"><div><h2>Qual vai ser o seu?</h2><p>Chame no WhatsApp, conte o que procura e receba as opções disponíveis.</p></div>${ctaPrincipal(d, 'Falar com vendedor')}</div></div></section>` : ''}
<section class="contato" id="contato"><div class="wrap">
  <div class="cx"><h2>Venha conhecer</h2>${d.endereco ? `<p>${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ''}${d.horario ? `<p>${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ''}</div>
  <div class="cx acoes">${ctaPrincipal(d, 'Chamar no WhatsApp')}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  },
};

export const CENAS_SHOWROOM: SiteTemplate[] = [showroom];
