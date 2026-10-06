/**
 * PATINHAS — pet shop, banho e tosa, veterinária, agropet.
 *
 * Direção de arte (referências de pet no Behance): cor chapada e forte,
 * tipografia gordinha e enorme, contornos grossos com sombra deslocada
 * (estilo "adesivo"), formas orgânicas e um tom de brincadeira. Quem ama
 * pet quer sentir alegria e confiança ao mesmo tempo.
 *
 * O que a distingue:
 * - capa de cor chapada com onda no fundo, foto em forma de "blob" e
 *   adesivo girado;
 * - cartões de serviço coloridos e levemente inclinados, cada um de uma cor;
 * - fotos como polaroides presas com fita;
 * - depoimentos em balões de fala.
 */
import type { SiteTemplate } from './base';
import { esc } from './base';
import { documentoPremium } from './documento';
import { fim } from './premium';
import {
  type ParFontes, ICONES, ctaPrincipal, cssRodape, depoimentosValidos, fotos, fundoFoto, iconeDoServico, linkMapa, logo,
  partirSobre, rodapePremium, servicosValidos, urlImagem,
} from './premium-base';
import { diferenciaisDe, notaReal, passosDe, secaoLigada, zapTexto } from './cenas-base';

const FONTES_PATINHAS: ParFontes = {
  titulos: '"Baloo 2","Fredoka",system-ui,sans-serif', corpo: '"Nunito",system-ui,sans-serif',
  google: 'family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800',
};

const PATA = `<svg viewBox="0 0 64 64" aria-hidden="true" fill="currentColor"><ellipse cx="20" cy="18" rx="7" ry="10"/><ellipse cx="44" cy="18" rx="7" ry="10"/><ellipse cx="8" cy="35" rx="6" ry="8"/><ellipse cx="56" cy="35" rx="6" ry="8"/><path d="M32 29c-10 0-18 9-18 17 0 7 6 9 12 8 4-1 8-1 12 0 6 1 12-1 12-8 0-8-8-17-18-17z"/></svg>`;

export const patinhas: SiteTemplate = {
  id: 'patinhas',
  nome: 'Patinhas',
  descricao: 'Cor chapada, tipografia gordinha, adesivos e polaroides. Alegre e acolhedor. Para pet shops e veterinárias.',
  nichos: ['Pet shops', 'Banho e tosa', 'Veterinárias', 'Agropecuárias', 'Hotel para pets'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#fff7ea"/><rect width="160" height="66" fill="${corPrimaria}"/><path d="M0 62q20 10 40 0t40 0 40 0 40 0v10H0z" fill="#fff7ea"/>
    <rect x="12" y="14" width="22" height="6" rx="3" fill="#fff7ea"/><rect x="118" y="12" width="30" height="9" rx="4.5" fill="${corDestaque}" stroke="#1d2340" stroke-width="1.2"/>
    <rect x="12" y="28" width="60" height="11" rx="5" fill="#fff7ea"/><rect x="12" y="43" width="42" height="11" rx="5" fill="${corDestaque}" stroke="#1d2340" stroke-width="1.2"/>
    <path d="M100 56c-8-4-10-16-4-24s20-10 28-4 8 18 0 26-16 6-24 2z" fill="#fff7ea" stroke="#1d2340" stroke-width="1.5"/>
    <rect x="12" y="80" width="40" height="24" rx="7" fill="#ffd6e0" stroke="#1d2340" stroke-width="1.2"/><rect x="60" y="80" width="40" height="24" rx="7" fill="#c9f1dd" stroke="#1d2340" stroke-width="1.2"/><rect x="108" y="80" width="40" height="24" rx="7" fill="#e2d9ff" stroke="#1d2340" stroke-width="1.2"/></svg>`,
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Banho, saúde e carinho para o seu melhor amigo, com agendamento fácil pelo WhatsApp.', 'Cuidamos de cada pet com paciência, higiene e atenção, para você deixar com tranquilidade.');
    const capa = urlImagem(d.capa);
    const galeria = fotos(d).slice(0, 4);
    const foto2 = urlImagem(d.fotoSobre);
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const mapa = linkMapa(d);
    const palavras = (d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : 'Quem ama pet cuida com a gente').split(' ');
    const ultima = palavras.splice(Math.max(1, palavras.length - 1)).join(' ');
    const titulo = `${palavras.join(' ')} <span class="destaque">${ultima}</span>`;
    const difs = secaoLigada(d, 'diferenciais') ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, 'passos') ? passosDe(d, 3) : [];
    const voz = depoimentosValidos(d).slice(0, 3);
    const cores = ['#ffd6e0', '#c9f1dd', '#e2d9ff', '#ffe9b8', '#cfe6ff', '#ffd9c2'];

    return documentoPremium(d, FONTES_PATINHAS, `
:root{--k-fundo:#fff7ea;--k-ink:#1d2340;--k-suave:#566079}
body{background:var(--k-fundo);color:var(--k-ink)}
h1,h2,h3{font-family:var(--fonte-t);font-weight:800;line-height:1.02;letter-spacing:-.01em}
.pop{border:3px solid var(--k-ink);box-shadow:6px 6px 0 var(--k-ink)}
.topo{position:sticky;top:0;z-index:40;background:var(--k-fundo);border-bottom:3px solid var(--k-ink)}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px 0}
.marca{display:flex;align-items:center;gap:12px;font-family:var(--fonte-t);font-weight:800;font-size:clamp(1.3rem,2.4vw,1.8rem);color:var(--k-ink)}
.logo-img{height:44px;width:auto}.logo-iniciais{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--d);color:var(--sobre-d);border:3px solid var(--k-ink);font-weight:800}
.topo nav{display:flex;gap:10px}.topo nav a{padding:8px 16px;border-radius:999px;font-weight:700;border:2px solid transparent}.topo nav a:hover{border-color:var(--k-ink);background:#fff}
.btn{border-radius:999px;font-family:var(--fonte-t);font-weight:800;font-size:18px;border:3px solid var(--k-ink);box-shadow:4px 4px 0 var(--k-ink);padding:12px 26px;transition:transform .15s,box-shadow .15s}
.btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--k-ink)}
.btn-1{background:var(--d);color:var(--k-ink)}
.btn-2{background:#fff;color:var(--k-ink)}
.capa{position:relative;background:var(--p);color:var(--sobre-p);padding:clamp(48px,7vw,96px) 0 clamp(110px,12vw,170px);overflow:hidden}
.capa-in{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(28px,5vw,72px);align-items:center;position:relative;z-index:2}
.eyebrow{display:inline-block;background:var(--k-fundo);color:var(--k-ink);border:3px solid var(--k-ink);border-radius:999px;padding:6px 16px;font-weight:800;font-size:14px;transform:rotate(-2deg);margin-bottom:20px}
.capa h1{font-size:clamp(3rem,7.4vw,6.4rem);color:inherit;margin:0 0 20px;text-wrap:balance}
.destaque{display:inline-block;background:var(--d);color:var(--k-ink);padding:0 .18em;border:3px solid var(--k-ink);border-radius:.3em;transform:rotate(-2deg);box-shadow:5px 5px 0 var(--k-ink)}
.capa .lead{font-size:var(--t1);color:inherit;max-width:44ch;margin:0 0 30px;font-weight:600}
.btns{display:flex;gap:14px;flex-wrap:wrap}
.blob-wrap{position:relative;max-width:520px;margin-left:auto;width:100%}
.blob{aspect-ratio:1;border-radius:58% 42% 55% 45%/46% 52% 48% 54%;border:4px solid var(--k-ink);box-shadow:12px 12px 0 var(--k-ink);overflow:hidden;${fundoFoto(capa, d.corDestaque, 'rgba(0,0,0,0),rgba(0,0,0,.05)')}}
.adesivo{position:absolute;right:-6px;top:4%;width:clamp(100px,14vw,132px);aspect-ratio:1;border-radius:50%;background:var(--d);border:3px solid var(--k-ink);box-shadow:4px 4px 0 var(--k-ink);display:grid;place-items:center;text-align:center;font-family:var(--fonte-t);font-weight:800;font-size:clamp(14px,1.8vw,18px);line-height:1.05;color:var(--k-ink);transform:rotate(12deg);padding:12px}
.nota-chip{position:absolute;left:-10px;bottom:10%;background:#fff;border:3px solid var(--k-ink);box-shadow:4px 4px 0 var(--k-ink);border-radius:18px;padding:10px 16px;font-weight:800;color:var(--k-ink);transform:rotate(-4deg)}
.nota-chip b{font-family:var(--fonte-t);font-size:26px;line-height:1;display:block}.nota-chip small{font-weight:700;color:var(--k-suave)}
.nota-chip .estrelas{color:#d97706}
.pata{position:absolute;color:rgba(255,255,255,.14);z-index:1}.pata svg{width:100%;height:auto}
.onda{position:absolute;left:0;right:0;bottom:-1px;height:clamp(60px,8vw,110px);z-index:2}.onda svg{display:block;width:100%;height:100%}
.sec{padding:clamp(56px,8vw,104px) 0}
.cab{text-align:center;max-width:680px;margin:0 auto clamp(28px,4vw,52px)}
.cab h2{font-size:clamp(2.4rem,5.4vw,4.4rem);margin:0 0 10px}.cab p{margin:0;color:var(--k-suave);font-size:var(--t1);font-weight:600}
.cartoes{display:grid;grid-template-columns:repeat(3,1fr);gap:26px}
.cartao{position:relative;border:3px solid var(--k-ink);border-radius:30px;box-shadow:6px 6px 0 var(--k-ink);padding:28px;display:flex;flex-direction:column;gap:10px;transition:transform .2s}
.cartao:nth-child(odd){transform:rotate(-1deg)}.cartao:nth-child(even){transform:rotate(1deg)}.cartao:hover{transform:rotate(0) translateY(-4px)}
.cartao .ic{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:#fff;border:3px solid var(--k-ink);color:var(--k-ink)}
.cartao h3{font-size:var(--t3);margin:8px 0 0}.cartao p{margin:0;font-weight:600;color:#38405a}
.cartao a{margin-top:auto;align-self:flex-start;font-family:var(--fonte-t);font-weight:800;border-bottom:3px solid var(--k-ink)}
.dif-grade{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.dif-card{background:#fff;border:3px solid var(--k-ink);border-radius:26px;box-shadow:5px 5px 0 var(--k-ink);padding:24px;text-align:center}
.dif-card .ic{width:60px;height:60px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;border:3px solid var(--k-ink);color:var(--k-ink)}
.dif-card h3{font-size:var(--t2);margin:0 0 6px}.dif-card p{margin:0;font-weight:600;color:var(--k-suave)}
.trilha{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;position:relative}
.trilha::before{content:'';position:absolute;left:8%;right:8%;top:34px;border-top:4px dashed var(--k-ink);opacity:.35}
.passo{text-align:center;position:relative}
.passo .bolha{width:70px;height:70px;margin:0 auto 16px;border-radius:50%;display:grid;place-items:center;background:var(--d);color:var(--k-ink);border:3px solid var(--k-ink);box-shadow:4px 4px 0 var(--k-ink);font-family:var(--fonte-t);font-weight:800;font-size:28px}
.passo h3{font-size:var(--t3);margin:0 0 6px}.passo p{margin:0 auto;max-width:28ch;font-weight:600;color:var(--k-suave)}
.polaroides{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;align-items:start}
.polaroides figure{margin:0;background:#fff;padding:10px 10px 38px;border:3px solid var(--k-ink);box-shadow:5px 5px 0 var(--k-ink);position:relative;transition:transform .25s}
.polaroides figure:nth-child(1){transform:rotate(-3deg)}.polaroides figure:nth-child(2){transform:rotate(2deg) translateY(14px)}.polaroides figure:nth-child(3){transform:rotate(-2deg)}.polaroides figure:nth-child(4){transform:rotate(3deg) translateY(10px)}
.polaroides figure:hover{transform:rotate(0) scale(1.04);z-index:2}
.polaroides figure::before{content:'';position:absolute;left:50%;top:-14px;width:84px;height:26px;background:rgba(255,220,120,.85);transform:translateX(-50%) rotate(-3deg);border:1px solid rgba(29,35,64,.2)}
.polaroides img{width:100%;aspect-ratio:1;object-fit:cover;display:block}
.sobre .wrap{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(28px,5vw,80px);align-items:center}
.sobre .foto{aspect-ratio:1;border-radius:42% 58% 46% 54%/55% 45% 55% 45%;border:4px solid var(--k-ink);box-shadow:10px 10px 0 var(--k-ink);overflow:hidden;background:var(--p-cla)}.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(2.2rem,4.8vw,3.8rem);margin:0 0 14px}.sobre p{font-size:var(--t1);font-weight:600;color:var(--k-suave)}
.baloes{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:26px}
.balao{position:relative;background:#fff;border:3px solid var(--k-ink);border-radius:26px;box-shadow:5px 5px 0 var(--k-ink);padding:24px 26px;margin:0}
.balao::after{content:'';position:absolute;left:34px;bottom:-18px;width:26px;height:26px;background:#fff;border-right:3px solid var(--k-ink);border-bottom:3px solid var(--k-ink);transform:rotate(45deg)}
.balao blockquote{margin:6px 0 0;font-weight:700;font-size:var(--t1)}
.balao-autor{margin:26px 0 0 20px;font-family:var(--fonte-t);font-weight:800}
.chamada .cartao-cta{background:var(--d);border:3px solid var(--k-ink);border-radius:40px;box-shadow:10px 10px 0 var(--k-ink);padding:clamp(36px,6vw,72px);text-align:center;position:relative;overflow:hidden;color:var(--k-ink)}
.chamada h2{font-size:clamp(2.4rem,6vw,4.8rem);margin:0 0 20px;color:var(--k-ink)}
.chamada .btn-1{background:var(--k-ink);color:#fff}
.contato .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:26px;padding:clamp(40px,6vw,80px) 0}
.contato .cx{background:#fff;border:3px solid var(--k-ink);border-radius:30px;box-shadow:6px 6px 0 var(--k-ink);padding:clamp(24px,4vw,44px)}
.contato h2{font-size:clamp(2rem,4vw,3rem);margin:0 0 14px}.contato p{display:flex;gap:12px;margin:0 0 10px;font-weight:600;color:var(--k-suave)}.contato svg{flex:none;margin-top:4px;color:var(--p-texto)}
.contato .acoes{display:grid;gap:14px;align-content:center;background:var(--p);color:var(--sobre-p)}.contato .btn{justify-content:center}
.sx{--sx-fundo:transparent;--sx-alt:transparent;--sx-card:#fff;--sx-borda:var(--k-ink);--sx-texto:var(--k-ink);--sx-suave:var(--k-suave);--sx-icone:var(--p-texto);--sx-raio:24px}
.sx-cab h2{font-family:var(--fonte-t);font-weight:800}.sx-lista details{border-width:3px;box-shadow:4px 4px 0 var(--k-ink)}
${cssRodape('rp', '#1d2340', '#c6cce0')}
@media(max-width:900px){.topo nav{display:none}.capa-in,.sobre .wrap,.contato .wrap{grid-template-columns:1fr}.blob-wrap{margin:8px auto 0;max-width:400px}.cartoes{grid-template-columns:1fr 1fr}.dif-grade{grid-template-columns:1fr 1fr}.polaroides{grid-template-columns:1fr 1fr}.trilha{grid-template-columns:1fr}.trilha::before{display:none}}
@media(max-width:560px){.cartoes,.dif-grade{grid-template-columns:1fr}.cartao{transform:none!important}}
`, `
<header class="topo"><div class="wrap">
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav aria-label="Seções"><a href="#servicos">Serviços</a><a href="#sobre">Sobre</a><a href="#contato">Contato</a></nav>
  ${ctaPrincipal(d, 'Agendar')}
</div></header>
<section class="capa"><div class="pata" style="left:2%;top:46%;width:90px;transform:rotate(-20deg)">${PATA}</div><div class="pata" style="left:44%;top:6%;width:64px;transform:rotate(18deg)">${PATA}</div>
  <div class="wrap capa-in">
  <div><span class="eyebrow">${esc(d.categoria || 'Cuidado de quem ama pets')}${d.cidade ? ` · ${esc(d.cidade)}` : ''}</span>
    <h1>${titulo}</h1><p class="lead">${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, 'Agendar pelo WhatsApp')}<a class="btn btn-2" href="#servicos">Ver serviços</a></div></div>
  <div class="blob-wrap"><div class="blob" role="img" aria-label="${esc(d.empresa)}"></div>
    ${zapTexto(d, 'Olá! Quero agendar para o meu pet.') ? `<a class="adesivo" href="${zapTexto(d, 'Olá! Quero agendar para o meu pet.')}" target="_blank" rel="noopener">Agende pelo<br>WhatsApp!</a>` : ''}
    ${nota ? `<div class="nota-chip"><span class="estrelas" aria-hidden="true">★★★★★</span><b>${nota.nota}</b><small>${nota.avaliacoes ? `${nota.avaliacoes} avaliações no Google` : 'no Google'}</small></div>` : ''}</div>
</div><div class="onda" aria-hidden="true"><svg viewBox="0 0 1440 110" preserveAspectRatio="none"><path d="M0 60C120 100 240 20 360 50s240 60 360 30 240-60 360-20 240 50 360 10v50H0z" fill="#fff7ea"/></svg></div></section>
${servicos.length ? `<section class="sec" id="servicos"><div class="wrap"><div class="cab"><h2>Do banho ao <span class="destaque" style="font-size:.9em">carinho</span></h2><p>Escolha o serviço e chame: a mensagem já vai pronta.</p></div>
  <div class="cartoes">${servicos.map((s, i) => `<article class="cartao" style="background:${cores[i % cores.length]}"><span class="ic">${iconeDoServico(i)}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p>${
    zapTexto(d, `Olá! Quero agendar: ${s.titulo}`) ? `<a href="${zapTexto(d, `Olá! Quero agendar: ${s.titulo}`)}" target="_blank" rel="noopener">Agendar</a>` : ''}</article>`).join('')}</div></div></section>` : ''}
${difs.length ? `<section class="sec" id="diferenciais" style="padding-top:0"><div class="wrap"><div class="dif-grade">${difs.map((x, i) => `<div class="dif-card"><span class="ic" style="background:${cores[(i + 2) % cores.length]}">${[ICONES.coracao, ICONES.escudo, ICONES.relogio, ICONES.estrela][i % 4]}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join('')}</div></div></section>` : ''}
${passos.length ? `<section class="sec" id="passos"><div class="wrap"><div class="cab"><h2>É fácil <span class="destaque" style="font-size:.9em">assim</span></h2></div>
  <div class="trilha">${passos.map((p, i) => `<div class="passo"><span class="bolha">${i + 1}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join('')}</div></div></section>` : ''}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ''}
  <div><h2>Pet é da <span class="destaque" style="font-size:.9em">família</span></h2><p>${sobreTxt}</p></div>
</div></section>
${galeria.length >= 2 ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="cab"><h2>Carinha de quem é feliz</h2></div><div class="polaroides">${galeria.map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} — foto ${i + 1}" loading="lazy"></figure>`).join('')}</div></div></section>` : ''}
${voz.length ? `<section class="sec"><div class="wrap"><div class="cab"><h2>Os tutores falam</h2></div><div class="baloes">${voz.map(x => `<figure class="balao"><blockquote>“${esc(x.texto)}”</blockquote>${x.autor ? `<figcaption>${esc(x.autor)}</figcaption>` : ''}</figure>`).join('')}</div></div></section>` : ''}
${secaoLigada(d, 'ctaFinal') ? `<section class="sec chamada" id="chamada"><div class="wrap"><div class="cartao-cta"><h2>Vamos cuidar do seu pet?</h2>${ctaPrincipal(d, 'Agendar agora')}</div></div></section>` : ''}
<section class="contato" id="contato"><div class="wrap">
  <div class="cx"><h2>Venha nos visitar</h2>${d.endereco ? `<p>${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ''}${d.horario ? `<p>${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ''}</div>
  <div class="cx acoes">${ctaPrincipal(d, 'Chamar no WhatsApp')}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  },
};

export const CENAS_PATINHAS: SiteTemplate[] = [patinhas];
