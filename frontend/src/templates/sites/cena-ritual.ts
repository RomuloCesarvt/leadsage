/**
 * RITUAL — estética, salão, clínica de beleza.
 *
 * Direção de arte (referências de beleza premium no Behance): o título é
 * o protagonista, em serifa de alto contraste e tamanho de capa de revista;
 * a foto aparece em recortes (arco e círculo) que se sobrepõem; bege quente,
 * tinta quase preta e um único acento. Pouca interface, muito ar.
 *
 * O que torna a página diferente das demais (e não só "mais bonita"):
 * - o menu de tratamentos é uma LISTA numerada de serifa grande, não uma grade
 *   de cartões, e cada linha abre o WhatsApp já escrito com o serviço;
 * - a seção "sobre" é uma frase em itálico gigante, com fotos escalonadas;
 * - o "como funciona" usa numerais vazados enormes.
 */
import type { SiteTemplate } from './base';
import { esc } from './base';
import { documentoPremium } from './documento';
import { fim } from './premium';
import {
  type ParFontes, ICONES, ctaPrincipal, cssRodape, fotos, fundoFoto, linkMapa, logo, partirSobre,
  rodapePremium, seloGoogle, servicosValidos, urlImagem, depoimentosValidos,
} from './premium-base';
import { diferenciaisDe, horarioCurto, notaReal, num, passosDe, secaoLigada, zapTexto } from './cenas-base';

const FONTES_RITUAL: ParFontes = {
  titulos: '"Bodoni Moda","Playfair Display",Georgia,serif', corpo: '"Figtree",system-ui,sans-serif',
  google: 'family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,600;1,6..96,400;1,6..96,500&family=Figtree:wght@400;500;600;700&family=Allura',
};

/** A frase em destaque cabe em duas sentenças: três linhas de itálico gigante já enchem a tela. */
const fraseCurta = (texto: string): string => (texto.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [texto]).slice(0, 2).join(' ').trim();

export const ritual: SiteTemplate = {
  id: 'ritual',
  nome: 'Ritual',
  descricao: 'Título de revista, fotos em arco e menu de tratamentos. Para estética, salão e clínicas de beleza.',
  nichos: ['Estética', 'Salões de beleza', 'Clínicas de estética', 'Spas', 'Cílios e sobrancelhas'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#fbf4ef"/><rect x="58" y="8" width="44" height="5" rx="2" fill="#2a1f23"/>
    <rect x="10" y="26" width="76" height="13" fill="#2a1f23"/><rect x="10" y="43" width="58" height="13" fill="${corPrimaria}"/><rect x="10" y="62" width="30" height="8" rx="4" fill="#2a1f23"/>
    <path d="M100 98V56a20 20 0 0 1 40 0v42z" fill="${corPrimaria}" opacity=".35"/><circle cx="96" cy="76" r="14" fill="${corDestaque}" opacity=".6"/>
    <rect x="10" y="82" width="70" height="1" fill="#d8c6bc"/><rect x="10" y="90" width="70" height="1" fill="#d8c6bc"/><rect x="10" y="98" width="70" height="1" fill="#d8c6bc"/></svg>`,
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Um espaço para cuidar de você com tempo, técnica e atenção a cada detalhe.', 'Do primeiro atendimento ao resultado, cada etapa é pensada para você se sentir bem.');
    const capa = urlImagem(d.capa);
    const galeria = fotos(d);
    const foto2 = urlImagem(d.fotoSobre) || galeria[0] || '';
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const horario = horarioCurto(d);
    const mapa = linkMapa(d);
    const palavras = (d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : 'Realce o que você tem de melhor').split(' ');
    // a última palavra vira itálico colorido: o ritmo de capa de revista
    const ultima = palavras.pop() || '';
    const titulo = `${palavras.join(' ')} <em>${ultima}</em>`;
    const difs = secaoLigada(d, 'diferenciais') ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, 'passos') ? passosDe(d, 3) : [];
    const voz = depoimentosValidos(d);
    const trio = galeria.slice(0, 3);

    return documentoPremium(d, FONTES_RITUAL, `
:root{--r-fundo:#fbf4ef;--r-tinta:#2a1f23;--r-suave:#6e5d63;--r-linha:#e6d5cb;--r-cartao:#fffaf6}
body{background:var(--r-fundo);color:var(--r-tinta)}
h1,h2,h3{font-family:var(--fonte-t);font-weight:400;letter-spacing:-.015em}
.linha .n,.dif-item small,.passo .gde,.fato b{font-variant-numeric:lining-nums}
em{font-style:italic;color:var(--p-texto)}
.topo{position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--r-fundo) 90%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--r-linha)}
.topo-in{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:20px;padding:16px 0}
.topo nav{display:flex;gap:30px;font-size:13px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--r-suave)}
.topo nav a:hover{color:var(--p-texto)}
.marca{display:flex;align-items:center;gap:12px;justify-self:center;font-family:var(--fonte-t);font-size:clamp(1.2rem,2.4vw,1.7rem);font-style:italic;color:var(--r-tinta)}
.logo-img{height:40px;width:auto}.logo-iniciais{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-style:normal;font-weight:600;font-size:15px}
.topo-d{justify-self:end}
.btn{border-radius:999px;font-weight:600}
.btn-1{background:var(--r-tinta);color:#fff}.btn-1:hover{background:var(--p)}
.btn-2{background:transparent;color:var(--r-tinta);border:1.5px solid var(--r-tinta)}
.capa{position:relative;padding:clamp(40px,6vw,88px) 0 clamp(64px,8vw,120px);overflow:hidden}
.capa-in{display:grid;grid-template-columns:1.25fr 1fr;gap:clamp(24px,4vw,64px);align-items:center}
.eyebrow{display:flex;align-items:center;gap:14px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--p-texto);margin:0 0 22px}
.eyebrow::before{content:'';width:44px;height:1px;background:currentColor}
.capa h1{font-size:clamp(3.4rem,9.2vw,8.4rem);line-height:.96;letter-spacing:-.035em;margin:0 0 28px;color:var(--r-tinta);text-wrap:balance}
.capa .lead{font-size:var(--t1);color:var(--r-suave);max-width:44ch;margin:0 0 32px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.colagem{position:relative;aspect-ratio:4/5;max-width:520px;width:100%;margin-left:auto}
.arco{position:absolute;inset:0 8% 10% 12%;border-radius:999px 999px 28px 28px;overflow:hidden;${fundoFoto(capa, d.corPrimaria, 'rgba(0,0,0,0),rgba(0,0,0,.08)')}}
.oval{position:absolute;left:0;bottom:0;width:46%;aspect-ratio:1;border-radius:50%;border:8px solid var(--r-fundo);overflow:hidden;${fundoFoto(foto2, d.corDestaque, 'rgba(0,0,0,0),rgba(0,0,0,.05)')}}
.giro{position:absolute;right:-2%;top:6%;width:clamp(96px,14vw,140px);height:auto;animation:gira 24s linear infinite}
.giro text{font:600 9.6px var(--fonte-c);letter-spacing:.14em;fill:var(--r-tinta);text-transform:uppercase}
.giro circle{fill:var(--r-fundo)}
@keyframes gira{to{transform:rotate(360deg)}}
.capa .selo-google{position:absolute;right:0;bottom:6%;background:var(--r-cartao);border-radius:18px;padding:14px 18px;box-shadow:0 18px 40px -22px rgba(60,30,20,.45);display:grid;gap:2px;font-size:13px;color:var(--r-suave)}
.capa .selo-google b{font-size:26px;color:var(--r-tinta);line-height:1;font-family:var(--fonte-t)}
.marca-agua{position:absolute;left:0;right:0;bottom:-.34em;text-align:center;font-family:var(--fonte-t);font-style:italic;font-size:clamp(5rem,18vw,17rem);line-height:1;color:transparent;-webkit-text-stroke:1px var(--r-linha);white-space:nowrap;pointer-events:none;user-select:none;z-index:0}
.fatos{border-top:1px solid var(--r-linha);border-bottom:1px solid var(--r-linha);background:var(--r-cartao)}
.fatos .wrap{display:grid;grid-template-columns:repeat(3,1fr)}
.fato{padding:26px clamp(14px,2vw,32px);border-right:1px solid var(--r-linha)}.fato:last-child{border-right:0}
.fato small{display:block;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--p-texto);margin-bottom:6px}
.fato b{font-family:var(--fonte-t);font-weight:400;font-size:var(--t2);color:var(--r-tinta)}
.sec{padding:clamp(72px,10vw,140px) 0}
.menu .wrap{display:grid;grid-template-columns:.8fr 1.5fr;gap:clamp(32px,6vw,96px)}
.menu-cab{position:sticky;top:110px;align-self:start}
.menu-cab h2{font-size:clamp(2.6rem,6vw,5.2rem);line-height:1;margin:0 0 18px}
.menu-cab p{color:var(--r-suave);font-size:var(--t1);max-width:30ch}
.linha{display:grid;grid-template-columns:56px 1fr auto;gap:8px 22px;align-items:baseline;padding:28px 0;border-top:1px solid var(--r-linha);transition:padding .3s}
.linha:last-child{border-bottom:1px solid var(--r-linha)}
.linha:hover{padding-left:12px}.linha:hover h3{color:var(--p-texto)}
.linha .n{font-family:var(--fonte-t);font-style:italic;color:var(--p-texto);font-size:var(--t1)}
.linha h3{font-size:clamp(1.5rem,3vw,2.3rem);line-height:1.1;margin:0;transition:color .2s}
.linha p{grid-column:2;margin:6px 0 0;color:var(--r-suave);max-width:46ch}
.linha a{font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--p-texto);white-space:nowrap;border-bottom:1px solid currentColor;padding-bottom:3px}
.frase{text-align:center;padding:clamp(72px,10vw,140px) 0 clamp(40px,6vw,80px)}
.frase blockquote{margin:0 auto;max-width:22ch;font-family:var(--fonte-t);font-style:italic;font-size:clamp(2.2rem,5.6vw,4.6rem);line-height:1.08;letter-spacing:-.02em;color:var(--r-tinta);text-wrap:balance}
.frase .assina{margin-top:26px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--p-texto)}
.trio{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(14px,3vw,40px);align-items:start;padding-bottom:clamp(72px,10vw,140px)}
.trio figure{margin:0;overflow:hidden;background:var(--p-cla)}
.trio figure:nth-child(1){aspect-ratio:3/4;border-radius:999px 999px 0 0;margin-top:48px}
.trio figure:nth-child(2){aspect-ratio:1;border-radius:50%}
.trio figure:nth-child(3){aspect-ratio:3/4;border-radius:0 0 999px 999px;margin-top:-24px}
.trio img{width:100%;height:100%;object-fit:cover}
.dif{background:var(--r-cartao);border-top:1px solid var(--r-linha);border-bottom:1px solid var(--r-linha)}
.dif-grade{display:grid;grid-template-columns:repeat(4,1fr)}
.dif-item{padding:36px clamp(14px,2vw,32px);border-right:1px solid var(--r-linha)}.dif-item:last-child{border-right:0}
.dif-item small{font-family:var(--fonte-t);font-style:italic;color:var(--p-texto);font-size:var(--t1)}
.dif-item h3{font-size:var(--t2);margin:10px 0 8px}.dif-item p{margin:0;color:var(--r-suave)}
.passos .titulo{text-align:center;margin-bottom:clamp(36px,5vw,64px)}.passos .titulo h2{font-size:clamp(2.4rem,5.4vw,4.6rem)}
.passos-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(20px,4vw,56px)}
.passo .gde{display:block;font-family:var(--fonte-t);font-size:clamp(5rem,12vw,10rem);line-height:.9;color:transparent;-webkit-text-stroke:1.5px var(--p);margin-bottom:8px}
.passo h3{font-size:var(--t3);margin:0 0 8px}.passo p{color:var(--r-suave);margin:0}
.vozes{padding:clamp(72px,10vw,140px) 0;background:var(--p);color:var(--sobre-p)}
.vozes blockquote{margin:0 auto;max-width:28ch;text-align:center;font-family:var(--fonte-t);font-style:italic;font-size:clamp(1.8rem,4vw,3.2rem);line-height:1.15;color:inherit}
.vozes figcaption{text-align:center;margin-top:22px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;opacity:.85}
.vozes .estrelas{display:block;text-align:center;margin-bottom:18px;color:var(--sobre-p)}
.chamada{padding:clamp(72px,10vw,140px) 0;text-align:center}
.chamada h2{font-size:clamp(3rem,8vw,7rem);line-height:.98;margin:0 0 30px}
.contato .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(24px,5vw,72px);align-items:end;padding:clamp(56px,8vw,96px) 0;border-top:1px solid var(--r-linha)}
.contato h2{font-size:clamp(2rem,4.4vw,3.6rem);margin:0 0 18px}
.contato p{display:flex;gap:12px;align-items:flex-start;margin:0 0 10px;color:var(--r-suave)}.contato svg{flex:none;margin-top:4px;color:var(--p-texto)}
.contato .acoes{display:grid;gap:12px}.contato .btn{justify-content:center}
.sx{--sx-fundo:var(--r-fundo);--sx-alt:var(--r-cartao);--sx-texto:var(--r-tinta);--sx-suave:var(--r-suave);--sx-card:var(--r-cartao);--sx-borda:var(--r-linha);--sx-raio:22px}
.sx-cab h2{font-family:var(--fonte-t);font-weight:400;font-style:italic;font-size:clamp(2.2rem,5vw,4rem)}
.sx-lista details{border-radius:22px}
${cssRodape('rp', '#2a1f23', '#d8c6bc')}
@media(max-width:900px){.capa-in{grid-template-columns:1fr}.colagem{margin:12px auto 0;max-width:420px}.menu .wrap{grid-template-columns:1fr}.menu-cab{position:static}
  .topo-in{grid-template-columns:auto 1fr}.topo nav{display:none}.marca{justify-self:start}.dif-grade{grid-template-columns:1fr 1fr}.passos-grade{grid-template-columns:1fr}
  .contato .wrap{grid-template-columns:1fr}.trio{grid-template-columns:1fr 1fr}.trio figure:nth-child(3){display:none}.fatos .wrap{grid-template-columns:1fr}.fato{border-right:0;border-bottom:1px solid var(--r-linha)}}
@media(max-width:560px){.linha{grid-template-columns:40px 1fr}.linha a{grid-column:2;justify-self:start}.dif-grade{grid-template-columns:1fr}.dif-item{border-right:0;border-bottom:1px solid var(--r-linha)}}
@media(prefers-reduced-motion:reduce){.giro{animation:none}}
`, `
<header class="topo"><div class="wrap topo-in">
  <nav aria-label="Seções"><a href="#servicos">Tratamentos</a><a href="#sobre">Sobre</a><a href="#contato">Contato</a></nav>
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <div class="topo-d">${ctaPrincipal(d, 'Agendar')}</div>
</div></header>
<section class="capa"><div class="wrap capa-in">
  <div><p class="eyebrow">${esc(d.categoria || 'Beleza e bem-estar')}${d.cidade ? ` · ${esc(d.cidade)}` : ''}</p>
    <h1>${titulo}</h1><p class="lead">${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, 'Agendar horário')}<a class="btn btn-2" href="#servicos">Ver tratamentos</a></div></div>
  <div class="colagem">
    <div class="arco" role="img" aria-label="${esc(d.empresa)}"></div><div class="oval" aria-hidden="true"></div>
    <svg class="giro" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="58"/><defs><path id="giro-c" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs><text><textPath href="#giro-c" textLength="270">agende o seu horário ✦ agende o seu horário ✦</textPath></text></svg>
    ${seloGoogle(d)}
  </div>
</div><div class="marca-agua" aria-hidden="true">${esc(d.empresa)}</div></section>
${nota || horario || d.endereco ? `<section class="fatos"><div class="wrap">
  ${nota ? `<div class="fato"><small>Avaliação no Google</small><b>${nota.nota}${nota.avaliacoes ? ` · ${nota.avaliacoes} avaliações` : ''}</b></div>` : ''}
  ${horario ? `<div class="fato"><small>Horário</small><b>${esc(horario)}</b></div>` : ''}
  ${d.endereco ? `<div class="fato"><small>Visite</small><b>${esc(d.cidade || d.endereco.split(',').slice(-1)[0].trim())}</b></div>` : ''}
</div></section>` : ''}
${servicos.length ? `<section class="sec menu" id="servicos"><div class="wrap">
  <div class="menu-cab"><h2>Nossos <em>tratamentos</em></h2><p>Escolha um cuidado e chame direto: a mensagem já vai pronta.</p></div>
  <div>${servicos.map((s, i) => `<div class="linha"><span class="n">${num(i)}</span><h3>${esc(s.titulo)}</h3>${
    zapTexto(d, `Olá! Quero agendar: ${s.titulo}`) ? `<a href="${zapTexto(d, `Olá! Quero agendar: ${s.titulo}`)}" target="_blank" rel="noopener">Agendar</a>` : ''}<p>${esc(s.descricao)}</p></div>`).join('')}</div>
</div></section>` : ''}
${difs.length ? `<section class="dif" id="diferenciais"><div class="wrap"><div class="dif-grade">${difs.map((x, i) => `<div class="dif-item"><small>${num(i)}</small><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join('')}</div></div></section>` : ''}
<section class="frase" id="sobre"><div class="wrap"><p class="eyebrow" style="justify-content:center">Nossa filosofia</p>
  <blockquote>${fraseCurta(sobreTxt)}</blockquote><p class="assina">${esc(d.empresa)}</p></div></section>
${trio.length ? `<div class="wrap trio">${trio.map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} — foto ${i + 1}" loading="lazy"></figure>`).join('')}</div>` : ''}
${passos.length ? `<section class="sec passos" id="passos"><div class="wrap"><div class="titulo"><p class="eyebrow" style="justify-content:center">Passo a passo</p><h2>Como é o <em>seu ritual</em></h2></div>
  <div class="passos-grade">${passos.map((p, i) => `<div class="passo"><span class="gde" aria-hidden="true">${num(i)}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join('')}</div></div></section>` : ''}
${voz.length ? `<section class="vozes"><div class="wrap"><figure style="margin:0"><span class="estrelas" aria-hidden="true">★★★★★</span><blockquote>“${esc(voz[0].texto)}”</blockquote>${voz[0].autor ? `<figcaption>${esc(voz[0].autor)}</figcaption>` : ''}</figure></div></section>` : ''}
${secaoLigada(d, 'ctaFinal') ? `<section class="chamada" id="chamada"><div class="wrap"><h2>Seu momento <em>começa aqui</em></h2>${ctaPrincipal(d, 'Agendar agora')}</div></section>` : ''}
<section class="contato" id="contato"><div class="wrap">
  <div><h2>Venha nos <em>visitar</em></h2>
    ${d.endereco ? `<p>${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ''}${d.horario ? `<p>${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ''}</div>
  <div class="acoes">${ctaPrincipal(d, 'Chamar no WhatsApp')}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  },
};

export const CENAS_RITUAL: SiteTemplate[] = [ritual];
