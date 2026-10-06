/**
 * SORRISO — consultório odontológico e clínicas de saúde.
 *
 * Direção de arte (referências de clínica dental no Behance): luz, ar e
 * cantos muito arredondados; foto humana grande com informações flutuando
 * sobre ela; azul limpo com um toque de verde-água. Passa cuidado e
 * modernidade, sem cara de hospital.
 *
 * O que a distingue:
 * - cabeçalho em pílula flutuante, que acompanha a rolagem;
 * - capa com "chips" sobre a foto (nota, horário, contato) em vez de caixas;
 * - tratamentos em carrossel com rolagem por encaixe (CSS puro, sem script);
 * - o primeiro atendimento como linha do tempo: tira o medo do desconhecido.
 * Sem antes-e-depois nem promessa de resultado (regras do CFO).
 */
import type { SiteTemplate } from './base';
import { esc } from './base';
import { documentoPremium } from './documento';
import { fim } from './premium';
import {
  type ParFontes, ICONES, ctaPrincipal, cssRodape, depoimentosValidos, fotos, fundoFoto, iconeDoServico, linkMapa, logo,
  partirSobre, rodapePremium, servicosValidos, urlImagem,
} from './premium-base';
import { cssGaleriaCena, diferenciaisDe, galeriaCena, horarioCurto, notaReal, num, passosDe, secaoLigada, zapTexto } from './cenas-base';

const FONTES_SORRISO: ParFontes = {
  titulos: '"Outfit",system-ui,sans-serif', corpo: '"Outfit",system-ui,sans-serif',
  google: 'family=Outfit:wght@300;400;500;600;700;800',
};

export const sorriso: SiteTemplate = {
  id: 'sorriso',
  nome: 'Sorriso',
  descricao: 'Pílula flutuante, foto com chips, carrossel de tratamentos e linha do tempo da consulta. Para odontologia e saúde.',
  nichos: ['Odontologia', 'Ortodontia', 'Clínicas médicas', 'Fisioterapia', 'Psicologia', 'Nutrição'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#f3f9ff"/><rect x="16" y="7" width="128" height="14" rx="7" fill="#fff" stroke="#e1ebf5"/><rect x="24" y="11" width="22" height="6" rx="3" fill="${corPrimaria}"/><rect x="112" y="10" width="26" height="8" rx="4" fill="${corPrimaria}"/>
    <rect x="12" y="34" width="68" height="9" rx="2" fill="#0c2340"/><rect x="12" y="47" width="54" height="9" rx="2" fill="#0c2340"/><rect x="12" y="60" width="40" height="9" rx="2" fill="${corDestaque}" opacity=".6"/><rect x="12" y="76" width="30" height="9" rx="4.5" fill="${corPrimaria}"/>
    <rect x="92" y="30" width="56" height="58" rx="16" fill="${corPrimaria}" opacity=".3"/><rect x="84" y="36" width="26" height="11" rx="5.5" fill="#fff"/><rect x="124" y="72" width="26" height="11" rx="5.5" fill="#fff"/>
    <rect x="12" y="94" width="40" height="12" rx="5" fill="#fff" stroke="#e1ebf5"/><rect x="58" y="94" width="40" height="12" rx="5" fill="#fff" stroke="#e1ebf5"/><rect x="104" y="94" width="40" height="12" rx="5" fill="#fff" stroke="#e1ebf5"/></svg>`,
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Tratamentos explicados com calma, agendamento fácil e um atendimento que respeita o seu tempo.', 'Aqui você entende cada etapa, tira as dúvidas e decide com segurança.');
    const capa = urlImagem(d.capa);
    const galeria = fotos(d);
    const foto2 = urlImagem(d.fotoSobre) || galeria[0] || '';
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const horario = horarioCurto(d);
    const mapa = linkMapa(d);
    const palavras = (d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : 'Cuide do seu sorriso sem medo').split(' ');
    const ultimas = palavras.splice(Math.max(1, palavras.length - 2)).join(' ');
    const titulo = `${palavras.join(' ')} <span class="marca-texto">${ultimas}</span>`;
    const difs = secaoLigada(d, 'diferenciais') ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, 'passos') ? passosDe(d, 4) : [];
    const voz = depoimentosValidos(d).slice(0, 3);

    return documentoPremium(d, FONTES_SORRISO, `
:root{--s-fundo:#f4f9ff;--s-tinta:#0c2340;--s-suave:#4a6078;--s-borda:#dce8f4;--s-branco:#fff}
body{background:var(--s-fundo);color:var(--s-tinta)}
h1,h2,h3{font-family:var(--fonte-t);font-weight:700;letter-spacing:-.025em;line-height:1.04}
.marca-texto{background:linear-gradient(transparent 62%,color-mix(in srgb,var(--d) 38%,transparent) 62%);padding:0 .08em}
.topo{position:sticky;top:14px;z-index:40;padding:0 14px}
.topo .pilula{max-width:1180px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:20px;background:rgba(255,255,255,.92);backdrop-filter:blur(14px);border:1px solid var(--s-borda);border-radius:999px;padding:10px 12px 10px 22px;box-shadow:0 18px 40px -24px rgba(12,35,64,.4)}
.marca{display:flex;align-items:center;gap:10px;font-weight:700;font-size:var(--t1);color:var(--s-tinta)}
.logo-img{height:36px;width:auto}.logo-iniciais{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:700;font-size:14px}
.topo nav{display:flex;gap:28px;font-weight:500;font-size:15px;color:var(--s-suave)}.topo nav a:hover{color:var(--p-texto)}
.btn{border-radius:999px;font-weight:600}
.btn-1{background:var(--p);color:var(--sobre-p);box-shadow:0 14px 30px -14px var(--p)}.btn-1:hover{transform:translateY(-2px)}
.btn-2{background:var(--s-branco);color:var(--p-texto);border:1.5px solid var(--s-borda)}
.capa{position:relative;padding:clamp(40px,6vw,88px) 0 clamp(56px,8vw,112px);overflow:hidden}
.capa::before,.capa::after{content:'';position:absolute;border-radius:50%;filter:blur(2px);z-index:0}
.capa::before{width:620px;height:620px;right:-180px;top:-200px;background:radial-gradient(circle,color-mix(in srgb,var(--p) 18%,transparent),transparent 70%)}
.capa::after{width:480px;height:480px;left:-160px;bottom:-200px;background:radial-gradient(circle,color-mix(in srgb,var(--d) 22%,transparent),transparent 70%)}
.capa-in{position:relative;z-index:1;display:grid;grid-template-columns:1.05fr 1fr;gap:clamp(32px,5vw,80px);align-items:center}
.eyebrow{display:inline-flex;align-items:center;gap:10px;background:var(--s-branco);border:1px solid var(--s-borda);border-radius:999px;padding:8px 16px 8px 12px;font-size:14px;font-weight:600;color:var(--p-texto)}
.eyebrow::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--d)}
.capa h1{font-size:clamp(2.8rem,6.4vw,5.6rem);margin:22px 0 20px}
.capa .lead{font-size:var(--t1);color:var(--s-suave);max-width:46ch;margin:0 0 30px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.foto-wrap{position:relative;max-width:560px;margin-left:auto;width:100%}
.foto-wrap .img{aspect-ratio:4/5;border-radius:48px 48px 48px 140px;overflow:hidden;box-shadow:0 40px 80px -40px rgba(12,35,64,.55);${fundoFoto(capa, d.corPrimaria, 'rgba(0,0,0,0),rgba(0,0,0,.06)')}}
.chip{position:absolute;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border:1px solid var(--s-borda);border-radius:18px;padding:12px 16px;box-shadow:0 20px 40px -22px rgba(12,35,64,.5);font-size:14px;font-weight:600;color:var(--s-tinta)}
.chip b{font-size:22px;line-height:1;display:block}.chip small{display:block;font-size:12px;color:var(--s-suave);font-weight:500}
.chip svg{color:var(--p-texto);flex:none}
.chip.c1{left:-28px;top:12%}.chip.c2{right:-14px;bottom:20%}.chip.c3{left:6%;bottom:-18px}
.sec{padding:clamp(64px,9vw,120px) 0}
.cab{display:flex;align-items:end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:clamp(28px,4vw,48px)}
.cab h2{font-size:clamp(2.2rem,4.8vw,3.8rem);margin:0;max-width:16ch}.cab p{margin:0;color:var(--s-suave);max-width:36ch;font-size:var(--t1)}
.carrossel{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;--recuo:max(5vw,calc((100vw - 1180px)/2));padding:6px var(--recuo) 28px;scroll-padding-inline:var(--recuo);scrollbar-width:thin;scrollbar-color:var(--p) transparent}
.trat{flex:0 0 min(330px,80vw);scroll-snap-align:start;background:var(--s-branco);border:1px solid var(--s-borda);border-radius:32px;padding:30px;display:flex;flex-direction:column;gap:12px;min-height:360px;transition:transform .3s,box-shadow .3s}
.trat:hover{transform:translateY(-6px);box-shadow:0 30px 50px -30px rgba(12,35,64,.4)}
.trat .topo-card{display:flex;justify-content:space-between;align-items:flex-start}
.trat .ic{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;background:color-mix(in srgb,var(--p) 11%,#fff);color:var(--p-texto)}
.trat .n{font-size:3.4rem;font-weight:800;line-height:.9;color:transparent;-webkit-text-stroke:1.5px var(--s-borda)}
.trat h3{font-size:var(--t3);margin:18px 0 0}.trat p{margin:0;color:var(--s-suave)}
.trat a{margin-top:auto;font-weight:600;color:var(--p-texto);display:inline-flex;gap:8px;align-items:center}.trat a:hover{gap:12px}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,6vw,96px);align-items:center}
.sobre .foto{position:relative;aspect-ratio:1;border-radius:140px 48px 48px 48px;overflow:hidden;background:var(--p-cla)}.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(2.2rem,4.6vw,3.6rem);margin:0 0 18px}.sobre p{color:var(--s-suave);font-size:var(--t1)}
.lista{list-style:none;padding:0;margin:22px 0 0;display:grid;gap:12px}.lista li{display:flex;gap:12px;align-items:center;font-weight:500}.lista svg{flex:none;background:color-mix(in srgb,var(--d) 22%,#fff);color:var(--p-texto);border-radius:50%;padding:5px;width:28px;height:28px}
.dif-grade{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.dif-card{background:var(--s-branco);border:1px solid var(--s-borda);border-radius:28px;padding:28px}
.dif-card .ic{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);margin-bottom:18px}
.dif-card h3{font-size:var(--t2);margin:0 0 8px}.dif-card p{margin:0;color:var(--s-suave)}
.linha{position:relative;max-width:860px;margin:0 auto;display:grid;gap:22px}
.linha::before{content:'';position:absolute;left:27px;top:8px;bottom:8px;width:2px;background:linear-gradient(var(--p),var(--d))}
.etapa{position:relative;display:grid;grid-template-columns:56px 1fr;gap:22px;align-items:start}
.etapa .no{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:var(--s-branco);border:2px solid var(--p);color:var(--p-texto);font-weight:800;font-size:20px;z-index:1}
.etapa .cx{background:var(--s-branco);border:1px solid var(--s-borda);border-radius:24px;padding:22px 26px}
.etapa h3{font-size:var(--t2);margin:0 0 6px}.etapa p{margin:0;color:var(--s-suave)}
.vozes .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
.vozes figure{margin:0;background:var(--s-branco);border:1px solid var(--s-borda);border-radius:28px;padding:28px}
.vozes blockquote{margin:12px 0 18px;color:var(--s-tinta);font-size:var(--t1)}.vozes figcaption{display:flex;gap:12px;align-items:center;font-weight:600}
.vozes .av{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:700;font-size:14px}
.chamada .cartao{position:relative;overflow:hidden;background:var(--p);color:var(--sobre-p);border-radius:44px;padding:clamp(40px,7vw,88px) clamp(24px,6vw,80px);text-align:center}
.chamada .cartao::before,.chamada .cartao::after{content:'';position:absolute;border-radius:50%;background:var(--d);opacity:.28}
.chamada .cartao::before{width:320px;height:320px;right:-80px;top:-120px}.chamada .cartao::after{width:220px;height:220px;left:-60px;bottom:-100px}
.chamada h2{position:relative;font-size:clamp(2.4rem,5.6vw,4.4rem);margin:0 0 12px;color:inherit}.chamada p{position:relative;margin:0 auto 28px;max-width:44ch;font-size:var(--t1);opacity:.92}
.chamada .btn-1{position:relative;background:#fff;color:var(--p-texto);box-shadow:none}
.contato .wrap{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:clamp(48px,7vw,88px) 0}
.contato .cx{background:var(--s-branco);border:1px solid var(--s-borda);border-radius:32px;padding:clamp(24px,4vw,44px)}
.contato h2{font-size:clamp(1.8rem,3.4vw,2.6rem);margin:0 0 16px}.contato p{display:flex;gap:12px;margin:0 0 10px;color:var(--s-suave)}.contato svg{flex:none;margin-top:4px;color:var(--p-texto)}
.contato .acoes{display:grid;gap:12px;align-content:center}.contato .btn{justify-content:center}
${cssGaleriaCena('28px', 'var(--s-borda)')}
.sx{--sx-fundo:transparent;--sx-alt:transparent;--sx-card:#fff;--sx-borda:var(--s-borda);--sx-texto:var(--s-tinta);--sx-suave:var(--s-suave);--sx-icone:var(--p-texto);--sx-raio:26px}
.sx-cab h2{font-family:var(--fonte-t);letter-spacing:-.025em}
${cssRodape('rp', '#0c2340', '#a9bbd0')}
@media(max-width:900px){.topo nav{display:none}.capa-in,.sobre .wrap,.contato .wrap{grid-template-columns:1fr}.foto-wrap{margin:8px auto 0;max-width:460px}.chip.c1{left:-8px}.chip.c2{right:-4px}.dif-grade{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.dif-grade{grid-template-columns:1fr}.chip.c3{display:none}.topo .pilula{padding-left:14px}}
`, `
<header class="topo"><div class="pilula">
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav aria-label="Seções"><a href="#tratamentos">Tratamentos</a><a href="#sobre">A clínica</a><a href="#consulta">A consulta</a><a href="#contato">Contato</a></nav>
  ${ctaPrincipal(d, 'Agendar')}
</div></header>
<section class="capa"><div class="wrap capa-in">
  <div><span class="eyebrow">${esc(d.categoria || 'Atendimento com hora marcada')}${d.cidade ? ` · ${esc(d.cidade)}` : ''}</span>
    <h1>${titulo}</h1><p class="lead">${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, 'Agendar avaliação')}<a class="btn btn-2" href="#tratamentos">Ver tratamentos</a></div></div>
  <div class="foto-wrap"><div class="img" role="img" aria-label="${esc(d.empresa)}"></div>
    ${nota ? `<div class="chip c1"><span class="estrelas" aria-hidden="true">★</span><div><b>${nota.nota}</b><small>${nota.avaliacoes ? `${nota.avaliacoes} avaliações no Google` : 'no Google'}</small></div></div>` : ''}
    ${horario ? `<div class="chip c2">${ICONES.relogio}<div><small>Atendimento</small>${esc(horario)}</div></div>` : ''}
    ${zapTexto(d, 'Olá! Gostaria de agendar uma avaliação.') ? `<a class="chip c3" href="${zapTexto(d, 'Olá! Gostaria de agendar uma avaliação.')}" target="_blank" rel="noopener">${ICONES.zap}<span>Agende pelo WhatsApp</span></a>` : ''}
  </div>
</div></section>
${servicos.length ? `<section class="sec" id="tratamentos"><div class="wrap"><div class="cab"><h2>Cuidados para cada fase do seu sorriso</h2><p>Deslize para conhecer. Cada tratamento começa com uma avaliação.</p></div></div>
<div class="carrossel" tabindex="0" aria-label="Tratamentos">${servicos.map((s, i) => `<article class="trat"><div class="topo-card"><span class="ic">${iconeDoServico(i)}</span><span class="n" aria-hidden="true">${num(i)}</span></div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p>${
    zapTexto(d, `Olá! Quero saber mais sobre: ${s.titulo}`) ? `<a href="${zapTexto(d, `Olá! Quero saber mais sobre: ${s.titulo}`)}" target="_blank" rel="noopener">Quero saber mais ${ICONES.seta}</a>` : ''}</article>`).join('')}</div></section>` : ''}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ''}
  <div><h2>Uma clínica pensada para você se sentir <span class="marca-texto">à vontade</span></h2><p>${sobreTxt}</p>
    ${difs.length ? '' : `<ul class="lista"><li>${ICONES.check}Agendamento pelo WhatsApp</li><li>${ICONES.check}Explicação de cada etapa</li><li>${ICONES.check}Atendimento com atenção</li></ul>`}</div>
</div></section>
${difs.length ? `<section class="sec" id="diferenciais" style="padding-top:0"><div class="wrap"><div class="dif-grade">${difs.map((x, i) => `<div class="dif-card"><span class="ic">${[ICONES.escudo, ICONES.relogio, ICONES.estrela, ICONES.coracao][i % 4]}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join('')}</div></div></section>` : ''}
${galeriaCena(galeria, esc(d.empresa), 'O espaço por dentro')}
${passos.length ? `<section class="sec" id="passos"><div class="wrap"><div class="cab" style="justify-content:center;text-align:center"><div><span class="eyebrow">Sua primeira consulta</span><h2 style="max-width:none;margin:18px 0 0">Como é o <span class="marca-texto">atendimento</span></h2></div></div>
  <div class="linha" id="consulta">${passos.map((p, i) => `<div class="etapa"><span class="no">${i + 1}</span><div class="cx"><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div></div>`).join('')}</div></div></section>` : ''}
${voz.length ? `<section class="sec vozes"><div class="wrap"><div class="cab"><h2>Quem já passou por aqui</h2></div><div class="grade">${voz.map(x => `<figure><span class="estrelas" aria-hidden="true">★★★★★</span><blockquote>“${esc(x.texto)}”</blockquote><figcaption>${x.autor ? `<span class="av">${esc(x.autor.trim().charAt(0).toUpperCase())}</span><span>${esc(x.autor)}</span>` : ''}</figcaption></figure>`).join('')}</div></div></section>` : ''}
${secaoLigada(d, 'ctaFinal') ? `<section class="sec chamada" id="chamada"><div class="wrap"><div class="cartao"><h2>Pronto para cuidar do seu sorriso?</h2><p>Chame no WhatsApp, conte o que você precisa e escolha o melhor horário.</p>${ctaPrincipal(d, 'Agendar avaliação')}</div></div></section>` : ''}
<section class="contato" id="contato"><div class="wrap">
  <div class="cx"><h2>Venha nos visitar</h2>${d.endereco ? `<p>${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ''}${d.horario ? `<p>${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ''}</div>
  <div class="cx acoes">${ctaPrincipal(d, 'Chamar no WhatsApp')}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  },
};

export const CENAS_SORRISO: SiteTemplate[] = [sorriso];
