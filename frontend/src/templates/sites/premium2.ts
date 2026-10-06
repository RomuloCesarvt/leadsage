/**
 * Quatro layouts de segunda geração, cada um com uma linguagem visual própria:
 *
 * - **Bento**: grade modular de cartões arredondados, luz e ar. Tecnologia,
 *   marketing, clínicas modernas, educação.
 * - **Natural**: bege, serifa suave e foto em arco. Bem-estar, estética,
 *   nutrição, terapias, floricultura.
 * - **Impacto**: preto, tipografia condensada gigante e faixa em movimento.
 *   Academia, barbearia, eventos, oficina custom.
 * - **Clássico**: simetria, ornamento e serifa de livro. Advocacia,
 *   contabilidade, imobiliária, igrejas, serviços tradicionais.
 *
 * Usam o mesmo invólucro dos demais (SEO, acessibilidade, extras, barra do
 * celular) e só trazem estrutura e estilo.
 */
import type { SiteData, SiteTemplate } from './base';
import { esc } from './base';
import { documentoPremium } from './documento';
import { depoimentosHtml, fim, galeriaHtml, slogan } from './premium';
import {
  type ParFontes, ICONES, ctaPrincipal, cssRodape, fundoFoto, iconeDoServico, linkInsta, linkMapa, linkTel,
  logo, partirSobre, rodapePremium, seloGoogle, servicosValidos, urlImagem, fotos,
} from './premium-base';

/* ------------------------------------------------------------ comum */

const contatoLinhas = (d: SiteData, classe: string): string => {
  const mapa = linkMapa(d), tel = linkTel(d), ig = linkInsta(d);
  return `${d.endereco ? `<p class="${classe}">${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ''}
    ${d.horario ? `<p class="${classe}">${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ''}
    ${tel ? `<p class="${classe}">${ICONES.tel}<a href="${tel}">${esc(d.telefone)}</a></p>` : ''}
    ${ig ? `<p class="${classe}">${ICONES.insta}<a href="${ig}" target="_blank" rel="noopener">${esc(d.instagram)}</a></p>` : ''}
    ${mapa ? '' : ''}`;
};

const blocoContato = (d: SiteData, classe: string, titulo: string, texto: string): string => {
  const mapa = linkMapa(d);
  return `<section class="${classe}" id="contato"><div class="wrap ${classe}-in">
  <div><h2>${titulo}</h2><p class="${classe}-sub">${texto}</p>${contatoLinhas(d, `${classe}-linha`)}</div>
  <div class="${classe}-acoes">${ctaPrincipal(d, 'Chamar no WhatsApp')}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div>
</div></section>`;
};

const cssContato = (classe: string, caixa: string, texto: string, sub: string, borda = 'rgba(0,0,0,.1)') => `
.${classe}{padding:clamp(64px,9vw,104px) 0}
.${classe}-in{display:grid;grid-template-columns:1.2fr 1fr;gap:48px;align-items:center;${caixa}}
.${classe} h2{font-size:var(--t4);color:${texto};letter-spacing:-.02em}
.${classe}-sub{color:${sub};font-size:var(--t1);margin-bottom:24px;max-width:46ch}
.${classe}-linha{display:flex;gap:12px;align-items:flex-start;margin:0 0 12px;color:${texto}}
.${classe}-linha svg{flex:none;margin-top:4px;opacity:.75}
.${classe}-acoes{display:grid;gap:12px;align-content:center}
.${classe}-acoes .btn{justify-content:center;border-color:${borda}}
@media(max-width:860px){.${classe}-in{grid-template-columns:1fr;gap:28px}}`;

const menu = (itens: [string, string][]): string =>
  `<nav aria-label="Seções">${itens.map(([href, rotulo]) => `<a href="${href}">${rotulo}</a>`).join('')}</nav>`;

/* =============================================================== BENTO */

const F_BENTO: ParFontes = {
  titulos: '"Plus Jakarta Sans",system-ui,sans-serif', corpo: '"Plus Jakarta Sans",system-ui,sans-serif',
  google: 'family=Plus+Jakarta+Sans:wght@400;500;600;700;800',
};

const bento: SiteTemplate = {
  id: 'bento',
  nome: 'Bento',
  descricao: 'Cartões arredondados em grade modular, leve e moderno. Para quem quer parecer atual.',
  nichos: ['Tecnologia', 'Marketing', 'Clínicas modernas', 'Educação', 'Pet shops', 'Coworking'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#f4f6fb"/><rect x="10" y="9" width="24" height="6" rx="3" fill="${corPrimaria}"/><rect x="118" y="8" width="32" height="8" rx="4" fill="${corPrimaria}"/>
    <rect x="10" y="30" width="62" height="8" rx="2" fill="#1f2937"/><rect x="10" y="42" width="48" height="4" rx="2" fill="#9ca3af"/><rect x="10" y="54" width="28" height="9" rx="4.5" fill="${corPrimaria}"/>
    <rect x="84" y="24" width="66" height="44" rx="9" fill="${corPrimaria}" opacity=".25"/><rect x="84" y="72" width="31" height="16" rx="6" fill="#fff"/><rect x="119" y="72" width="31" height="16" rx="6" fill="${corDestaque}"/>
    <rect x="10" y="78" width="30" height="24" rx="6" fill="#fff"/><rect x="44" y="78" width="30" height="24" rx="6" fill="#fff"/></svg>`,
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Soluções pensadas para o seu dia a dia, com atendimento direto e sem complicação.', 'Trabalhamos com clareza: você sabe o que será feito, quando e por quanto.');
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || '';
    const servicos = servicosValidos(d);
    const tel = linkTel(d);
    return documentoPremium(d, F_BENTO, `
body{background:#f4f6fb;color:#111827}
.topo{position:sticky;top:0;z-index:30;background:rgba(244,246,251,.82);backdrop-filter:blur(14px);border-bottom:1px solid #e6eaf3}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 0}
.topo-marca{display:flex;align-items:center;gap:12px;font-weight:800;font-size:var(--t1);color:#0b1220}
.logo-img{height:40px;width:auto}.logo-iniciais{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:800}
.topo nav{display:flex;gap:28px;font-weight:600;font-size:15px;color:#475569}.topo nav a:hover{color:var(--p-texto)}
.btn-1{background:var(--p);color:var(--sobre-p);border-radius:999px;box-shadow:0 14px 30px -14px var(--p)}
.btn-2{background:#fff;color:var(--p-texto);border:1.5px solid #dbe2ee;border-radius:999px}
.capa{padding:clamp(48px,7vw,96px) 0 clamp(48px,6vw,80px);background:radial-gradient(900px 420px at 85% -10%,var(--p-cla),transparent 65%),radial-gradient(700px 360px at -10% 20%,color-mix(in srgb,var(--d) 14%,transparent),transparent 60%)}
.capa .wrap{display:grid;grid-template-columns:1.05fr 1fr;gap:clamp(32px,5vw,72px);align-items:center}
.pilula{display:inline-flex;gap:8px;align-items:center;background:#fff;border:1px solid #e3e8f2;border-radius:999px;padding:8px 16px;font-size:14px;font-weight:700;color:var(--p-texto)}
.pilula svg{width:16px;height:16px}
.capa h1{font-size:var(--t5);letter-spacing:-.035em;line-height:1.04;margin:22px 0 18px;color:#0b1220;font-weight:800}
.capa p{font-size:var(--t1);color:#4b5563;max-width:48ch;margin-bottom:30px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.mosaico{display:grid;grid-template-columns:1.2fr 1fr;grid-template-rows:auto auto auto;gap:14px}
.m{border-radius:28px;background:#fff;border:1px solid #e6eaf3;box-shadow:0 20px 40px -28px rgba(15,23,42,.35);padding:22px;overflow:hidden}
.m-foto{grid-row:1/4;min-height:380px;padding:0;${fundoFoto(capa, d.corPrimaria, 'rgba(0,0,0,0),rgba(0,0,0,.12)')}}
.m-nota{display:grid;gap:2px;align-content:center}.m-nota b{font-size:34px;line-height:1;color:#0b1220}.m-nota span{font-size:13px;color:#64748b}
.m-hora{display:flex;gap:12px;align-items:flex-start;font-size:14px;font-weight:600;color:#334155}.m-hora svg{flex:none;color:var(--p-texto);margin-top:2px}
.m-acao{background:var(--p);color:var(--sobre-p);border:0;display:grid;gap:10px;align-content:center}.m-acao b{font-size:var(--t2);line-height:1.15}.m-acao a{font-weight:700;display:inline-flex;gap:8px;align-items:center}
.sec{padding:clamp(56px,8vw,100px) 0}
.cab{max-width:640px;margin:0 0 clamp(28px,4vw,48px)}
.cab h2{font-size:var(--t4);letter-spacing:-.025em;color:#0b1220;font-weight:800}.cab p{color:#5b6475;font-size:var(--t1)}
.grade{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.cx{border-radius:26px;background:#fff;border:1px solid #e6eaf3;padding:28px;transition:transform .25s,box-shadow .25s}
.cx:hover{transform:translateY(-4px);box-shadow:0 28px 50px -30px rgba(15,23,42,.4)}
.cx .ic{width:50px;height:50px;border-radius:15px;display:grid;place-items:center;background:var(--p-cla);color:var(--p-texto);margin-bottom:20px}
.cx h3{font-size:var(--t2);color:#0b1220;margin-bottom:8px}.cx p{color:#5b6475;margin:0}
.n5 .cx:first-child,.n6 .cx:first-child,.n4 .cx:first-child{grid-column:span 2;grid-row:span 2;background:var(--p);color:var(--sobre-p);border-color:transparent;display:flex;flex-direction:column;justify-content:flex-end;min-height:280px}
.cx:first-child{background:var(--p);color:var(--sobre-p);border-color:transparent}.cx:first-child .ic{background:rgba(255,255,255,.18);color:inherit}.cx:first-child h3,.cx:first-child p{color:inherit}
.n5 .cx:first-child h3,.n6 .cx:first-child h3,.n4 .cx:first-child h3{font-size:var(--t3)}
.n6 .cx:last-child{grid-column:1/-1;display:grid;grid-template-columns:auto 1fr;gap:6px 20px;align-items:center}.n6 .cx:last-child .ic{grid-row:span 2;margin:0}.n6 .cx:last-child h3{margin:0}
.n3 .grade,.n2 .grade,.n1 .grade{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,5vw,72px);align-items:center}
.sobre .foto{aspect-ratio:5/4;border-radius:32px;overflow:hidden;background:var(--p-cla);border:1px solid #e6eaf3}.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:var(--t4);letter-spacing:-.025em;color:#0b1220;font-weight:800}.sobre p{color:#4b5563;font-size:var(--t1)}
.lista{list-style:none;padding:0;margin:22px 0 0;display:grid;gap:12px}.lista li{display:flex;gap:12px;font-weight:600;color:#1f2937}.lista svg{color:var(--p-texto);flex:none}
.vozes{padding:clamp(56px,8vw,100px) 0}.vozes h2{font-size:var(--t4);letter-spacing:-.025em;color:#0b1220;margin-bottom:36px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.vozes figure{margin:0;background:#fff;border:1px solid #e6eaf3;border-radius:26px;padding:28px}.vozes blockquote{margin:12px 0 16px;color:#334155}.vozes figcaption{font-weight:700;color:#0b1220}
.galeria{padding:0 0 clamp(56px,8vw,100px)}.galeria h2{font-size:var(--t4);color:#0b1220;margin-bottom:28px}
.galeria-grade{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.galeria-grade figure{margin:0;aspect-ratio:1;border-radius:24px;overflow:hidden}.galeria-grade img{width:100%;height:100%;object-fit:cover}
.galeria-grade figure:first-child{grid-column:span 2;grid-row:span 2}
${cssContato('contato', 'background:#fff;border:1px solid #e6eaf3;border-radius:36px;padding:clamp(28px,5vw,56px)', '#0b1220', '#5b6475', '#dbe2ee')}
.contato{padding-top:0}
${cssRodape('rp', '#0b1220', '#aab2c3')}
@media(max-width:900px){.capa .wrap,.sobre .wrap{grid-template-columns:1fr}.grade{grid-template-columns:repeat(2,1fr)}.topo nav{display:none}.galeria-grade{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.grade{grid-template-columns:1fr}.n4 .cx:first-child,.n5 .cx:first-child,.n6 .cx:first-child{grid-column:auto;grid-row:auto}.n6 .cx:last-child{display:block}.mosaico{grid-template-columns:1fr}.m-foto{grid-row:auto;min-height:260px}}
`, `
<header class="topo"><div class="wrap"><a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  ${menu([['#servicos', 'Serviços'], ['#sobre', 'Sobre'], ['#contato', 'Contato']])}${ctaPrincipal(d, 'Falar agora')}</div></header>
<section class="capa"><div class="wrap">
  <div><span class="pilula">${ICONES.brilho}${esc(d.categoria || 'Atendimento direto')}</span>
    <h1>${slogan(d, 'Soluções simples para o que você precisa')}</h1><p>${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, 'Falar no WhatsApp')}<a class="btn btn-2" href="#servicos">Ver serviços</a></div></div>
  <div class="mosaico">
    <div class="m m-foto" role="img" aria-label="${esc(d.empresa)}"></div>
    ${seloGoogle(d, 'm m-nota') || ''}
    ${d.horario ? `<div class="m m-hora">${ICONES.relogio}<span>${esc(d.horario)}</span></div>` : ''}
    <div class="m m-acao"><b>Fale com a gente</b>${tel ? `<a href="${tel}">${ICONES.tel}${esc(d.telefone)}</a>` : ''}</div>
  </div>
</div></section>
${servicos.length ? `<section class="sec" id="servicos"><div class="wrap"><div class="cab"><h2>O que fazemos</h2><p>Tudo o que você precisa em um só lugar.</p></div>
<div class="grade n${servicos.length}">${servicos.map((s, i) => `<div class="cx"><div class="ic">${iconeDoServico(i)}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join('')}</div></div></section>` : ''}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ''}
  <div><h2>Sobre a ${esc(d.empresa)}</h2><p>${sobreTxt}</p></div>
</div></section>
${galeriaHtml(d, 'galeria', 'Em imagens')}
${depoimentosHtml(d, 'vozes', 'Quem já é cliente')}
${blocoContato(d, 'contato', 'Vamos conversar?', 'Conte o que você precisa e respondemos pelo WhatsApp.')}
${fim(d, rodapePremium(d))}`);
  },
};

/* ============================================================== NATURAL */

const F_NATURAL: ParFontes = {
  titulos: '"DM Serif Display",Georgia,serif', corpo: '"DM Sans",system-ui,sans-serif',
  google: 'family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700',
};

const natural: SiteTemplate = {
  id: 'natural',
  nome: 'Natural',
  descricao: 'Bege, serifa suave e foto em arco. Acolhe e passa cuidado. Para bem-estar e estética.',
  nichos: ['Estética', 'Nutrição', 'Psicologia', 'Terapias', 'Floriculturas', 'Cafeterias'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#f5efe6"/><rect x="10" y="9" width="22" height="5" rx="2.5" fill="${corPrimaria}"/><rect x="120" y="8" width="30" height="8" rx="4" fill="${corPrimaria}"/>
    <rect x="10" y="32" width="58" height="9" rx="2" fill="#3b3128"/><rect x="10" y="45" width="46" height="4" rx="2" fill="#a3978a"/><rect x="10" y="58" width="28" height="9" rx="4.5" fill="${corPrimaria}"/>
    <path d="M92 94V52a24 24 0 0 1 48 0v42z" fill="${corPrimaria}" opacity=".28"/><circle cx="130" cy="38" r="9" fill="${corDestaque}" opacity=".7"/>
    <rect x="10" y="80" width="26" height="20" rx="10" fill="#fff"/><rect x="40" y="80" width="26" height="20" rx="10" fill="#fff"/></svg>`,
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Um espaço pensado para você se sentir bem, com atenção e tempo para cada pessoa.', 'Acreditamos em cuidado sem pressa: ouvimos, explicamos e acompanhamos de perto.');
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || '';
    const servicos = servicosValidos(d);
    return documentoPremium(d, F_NATURAL, `
body{background:#f6f0e7;color:#2f2a24}
.topo{position:sticky;top:0;z-index:30;background:rgba(246,240,231,.9);backdrop-filter:blur(10px);border-bottom:1px solid #e8dfd1}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 0}
.topo-marca{display:flex;align-items:center;gap:12px;font-family:var(--fonte-t);font-size:var(--t2);color:#2f2a24}
.logo-img{height:42px;width:auto}.logo-iniciais{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:700}
.topo nav{display:flex;gap:30px;font-weight:600;font-size:15px;color:#5e5447}.topo nav a:hover{color:var(--p-texto)}
.btn-1{background:var(--p);color:var(--sobre-p);border-radius:999px}
.btn-2{background:transparent;color:var(--p-texto);border:1.5px solid color-mix(in srgb,var(--p) 40%,transparent);border-radius:999px}
.capa{padding:clamp(40px,6vw,80px) 0 clamp(56px,7vw,96px)}
.capa .wrap{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(32px,5vw,80px);align-items:center}
.eyebrow{display:inline-block;font-size:14px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--p-texto);margin-bottom:18px}
.capa h1{font-size:var(--t5);line-height:1.06;letter-spacing:-.02em;color:#2a241e;font-weight:400;margin-bottom:20px}
.capa p{font-size:var(--t1);color:#5e5447;max-width:46ch;margin-bottom:30px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.arco{position:relative;margin-left:auto;width:min(100%,440px)}
.arco .img{aspect-ratio:4/5;border-radius:999px 999px 28px 28px;overflow:hidden;${fundoFoto(capa, d.corPrimaria, 'rgba(0,0,0,0),rgba(0,0,0,.06)')}}
.arco::before{content:'';position:absolute;inset:-14px -14px auto auto;width:62%;height:62%;border-radius:999px 999px 28px 28px;background:color-mix(in srgb,var(--p) 18%,transparent);z-index:-1}
.arco .selo-google{position:absolute;left:-26px;bottom:34px;background:#fffaf2;border-radius:20px;padding:14px 18px;box-shadow:0 18px 40px -22px rgba(60,40,10,.5);display:grid;gap:2px;font-size:13px;color:#6b6054}
.arco .selo-google b{font-size:26px;color:#2a241e;line-height:1}
.sec{padding:clamp(56px,8vw,96px) 0}
.cab{text-align:center;max-width:620px;margin:0 auto clamp(32px,4vw,52px)}
.cab h2{font-size:var(--t4);font-weight:400;color:#2a241e;letter-spacing:-.01em}.cab p{color:#6b6054;font-size:var(--t1)}
.itens{display:flex;flex-wrap:wrap;justify-content:center;gap:18px}
.item{flex:0 1 calc((100% - 36px)/3);min-width:250px;background:#fffaf2;border:1px solid #eadfcf;border-radius:28px;padding:30px;text-align:left}
.item .ic{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--p) 14%,#fffaf2);color:var(--p-texto);margin-bottom:20px}
.item h3{font-family:var(--fonte-t);font-weight:400;font-size:var(--t2);color:#2a241e;margin-bottom:8px}.item p{color:#6b6054;margin:0}
.sobre{background:#efe6d8}.sobre .wrap{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(32px,5vw,80px);align-items:center}
.sobre .foto{aspect-ratio:1;border-radius:50%;overflow:hidden;background:var(--p-cla);max-width:460px;margin:0 auto;width:100%}.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:var(--t4);font-weight:400;color:#2a241e}.sobre p{color:#5e5447;font-size:var(--t1)}
.vozes{padding:clamp(56px,8vw,96px) 0}.vozes h2{text-align:center;font-weight:400;font-size:var(--t4);color:#2a241e;margin-bottom:36px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
.vozes figure{margin:0;background:#fffaf2;border:1px solid #eadfcf;border-radius:28px;padding:28px}.vozes blockquote{margin:12px 0 16px;color:#4a4036;font-family:var(--fonte-t);font-size:var(--t1)}.vozes figcaption{font-weight:700;color:#2a241e}
.galeria{padding:clamp(56px,8vw,96px) 0}.galeria h2{text-align:center;font-weight:400;font-size:var(--t4);color:#2a241e;margin-bottom:32px}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.galeria-grade figure{margin:0;aspect-ratio:4/5;overflow:hidden;border-radius:999px 999px 22px 22px}.galeria-grade img{width:100%;height:100%;object-fit:cover}
${cssContato('contato', 'background:#fffaf2;border:1px solid #eadfcf;border-radius:36px;padding:clamp(28px,5vw,56px)', '#2a241e', '#6b6054', '#e0d3bf')}
.contato{padding-top:0}.contato h2{font-weight:400}
${cssRodape('rp', '#2a241e', '#cfc4b4')}
@media(max-width:900px){.capa .wrap,.sobre .wrap{grid-template-columns:1fr}.item{flex-basis:calc((100% - 18px)/2)}.topo nav{display:none}.arco{margin:0 auto}.arco .selo-google{left:8px}}
@media(max-width:560px){.item{flex-basis:100%}.galeria-grade{grid-template-columns:1fr 1fr}}
`, `
<header class="topo"><div class="wrap"><a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  ${menu([['#servicos', 'Cuidados'], ['#sobre', 'Sobre'], ['#contato', 'Contato']])}${ctaPrincipal(d, 'Agendar')}</div></header>
<section class="capa"><div class="wrap">
  <div><span class="eyebrow">${esc(d.categoria || 'Bem-estar')}</span>
    <h1>${slogan(d, 'Cuidar de você é o nosso jeito de trabalhar')}</h1><p>${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, 'Agendar horário')}<a class="btn btn-2" href="#servicos">Conhecer os cuidados</a></div></div>
  <div class="arco"><div class="img" role="img" aria-label="${esc(d.empresa)}"></div>${seloGoogle(d)}</div>
</div></section>
${servicos.length ? `<section class="sec" id="servicos"><div class="wrap"><div class="cab"><h2>Como podemos cuidar de você</h2><p>Cada atendimento começa por uma conversa.</p></div>
<div class="itens">${servicos.map((s, i) => `<div class="item"><div class="ic">${iconeDoServico(i)}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join('')}</div></div></section>` : ''}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ''}
  <div><span class="eyebrow">Nossa história</span><h2>${esc(d.empresa)}</h2><p>${sobreTxt}</p></div>
</div></section>
${galeriaHtml(d, 'galeria', 'Um pouco do nosso espaço')}
${depoimentosHtml(d, 'vozes', 'Palavras de quem já esteve aqui')}
${blocoContato(d, 'contato', 'Vamos marcar o seu horário?', 'Chame no WhatsApp e escolhemos juntos o melhor dia.')}
${fim(d, rodapePremium(d))}`);
  },
};

/* ============================================================== IMPACTO */

const F_IMPACTO: ParFontes = {
  titulos: '"Anton",Impact,system-ui,sans-serif', corpo: '"Inter",system-ui,sans-serif',
  google: 'family=Anton&family=Inter:wght@400;500;600;700',
};

const impacto: SiteTemplate = {
  id: 'impacto',
  nome: 'Impacto',
  descricao: 'Preto, letra condensada gigante e faixa em movimento. Direto e enérgico.',
  nichos: ['Academias', 'Barbearias', 'Eventos', 'Motos e carros', 'Esportes', 'Casas noturnas'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#0a0a0a"/><rect x="10" y="9" width="26" height="6" fill="${corDestaque}"/><rect x="120" y="8" width="30" height="8" fill="${corDestaque}"/>
    <rect x="10" y="28" width="104" height="14" fill="#fff"/><rect x="10" y="46" width="84" height="14" fill="#fff"/><rect x="10" y="66" width="30" height="9" fill="${corDestaque}"/>
    <rect y="84" width="160" height="12" fill="${corDestaque}"/><rect x="8" y="87" width="30" height="5" fill="#0a0a0a"/><rect x="46" y="87" width="30" height="5" fill="#0a0a0a"/><rect x="84" y="87" width="30" height="5" fill="#0a0a0a"/>
    <rect x="112" y="26" width="38" height="52" fill="${corPrimaria}" opacity=".5"/></svg>`,
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Sem enrolação: você chega, a gente resolve e você sai melhor do que entrou.', 'Aqui o foco é resultado, atendimento direto e constância. Venha conhecer.');
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || '';
    const servicos = servicosValidos(d);
    const faixa = (servicos.length ? servicos.map(s => s.titulo) : [d.categoria || d.empresa, d.empresa]).filter(Boolean).slice(0, 6);
    const repetida = [...faixa, ...faixa, ...faixa, ...faixa].map(t => `<span>${esc(t)}</span>`).join('');
    return documentoPremium(d, F_IMPACTO, `
body{background:#0a0a0a;color:#f4f4f5}
h1,h2,h3{font-weight:400;text-transform:uppercase;letter-spacing:.01em;line-height:1}
.topo{position:sticky;top:0;z-index:30;background:rgba(10,10,10,.88);backdrop-filter:blur(12px);border-bottom:1px solid #1f1f23}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 0}
.topo-marca{display:flex;align-items:center;gap:12px;font-family:var(--fonte-t);font-size:var(--t2);text-transform:uppercase;color:#fff}
.logo-img{height:40px;width:auto}.logo-iniciais{width:40px;height:40px;display:grid;place-items:center;background:var(--d);color:var(--sobre-d);font-family:var(--fonte-t)}
.topo nav{display:flex;gap:28px;font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#a1a1aa}.topo nav a:hover{color:var(--d)}
.btn{border-radius:0;text-transform:uppercase;letter-spacing:.08em;font-size:14px}
.btn-1{background:var(--d);color:var(--sobre-d)}
.btn-2{background:transparent;color:#fff;border:2px solid #3f3f46}.btn-2:hover{border-color:var(--d)}
.capa{position:relative;padding:clamp(72px,12vw,160px) 0 clamp(72px,10vw,130px);overflow:hidden;${fundoFoto(capa, '#18181b', 'rgba(10,10,10,.55),rgba(10,10,10,.92)')}}
.capa h1{font-size:clamp(3.2rem,11vw,9rem);color:#fff;max-width:14ch;margin:0 0 26px}
.capa h1 em{font-style:normal;color:var(--d)}
.capa p{font-size:var(--t1);color:#d4d4d8;max-width:46ch;margin-bottom:34px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.faixa{background:var(--d);color:var(--sobre-d);overflow:hidden;white-space:nowrap;padding:16px 0;transform:rotate(-1.2deg);margin:-26px -2% 0;position:relative;z-index:2}
.faixa div{display:inline-flex;gap:46px;animation:corre 38s linear infinite}
.faixa span{font-family:var(--fonte-t);font-size:var(--t3);text-transform:uppercase}.faixa span::after{content:'✦';margin-left:46px}
@keyframes corre{to{transform:translateX(-50%)}}
.sec{padding:clamp(72px,10vw,120px) 0}
.cab{margin-bottom:clamp(32px,5vw,56px)}.cab h2{font-size:var(--t5);color:#fff}.cab p{color:#a1a1aa;font-size:var(--t1);max-width:50ch;margin-top:12px}
.linhas{border-top:1px solid #27272a}
.linha{display:grid;grid-template-columns:90px 1fr 1.3fr;gap:28px;align-items:baseline;padding:28px 0;border-bottom:1px solid #27272a;transition:background .2s,padding .2s}
.linha:hover{background:#111113;padding-left:14px}
.linha .n{font-family:var(--fonte-t);font-size:var(--t3);color:var(--d)}
.linha h3{font-size:var(--t3);color:#fff}.linha p{color:#a1a1aa;margin:0}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,5vw,72px);align-items:center}
.sobre .foto{aspect-ratio:4/5;overflow:hidden;background:#18181b;position:relative}.sobre .foto img{width:100%;height:100%;object-fit:cover;filter:grayscale(.35) contrast(1.05)}
.sobre .foto::after{content:'';position:absolute;inset:auto 0 0 0;height:8px;background:var(--d)}
.sobre h2{font-size:var(--t5);color:#fff}.sobre p{color:#d4d4d8;font-size:var(--t1);margin-top:20px}
.num{display:flex;gap:28px;flex-wrap:wrap;margin-top:28px}.num div{border-left:4px solid var(--d);padding-left:16px}.num b{display:block;font-family:var(--fonte-t);font-size:var(--t4);font-weight:400;color:#fff;line-height:1}.num span{font-size:13px;color:#a1a1aa;text-transform:uppercase;letter-spacing:.08em}
.vozes{padding:clamp(72px,10vw,120px) 0;background:#111113}.vozes h2{font-size:var(--t5);color:#fff;margin-bottom:36px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
.vozes figure{margin:0;border:1px solid #27272a;padding:28px;background:#0a0a0a}.vozes blockquote{margin:12px 0 16px;color:#e4e4e7}.vozes figcaption{font-weight:700;color:var(--d);text-transform:uppercase;letter-spacing:.06em;font-size:13px}
.estrelas{color:var(--d)}
.galeria{padding:clamp(72px,10vw,120px) 0 0}.galeria h2{font-size:var(--t5);color:#fff;margin-bottom:28px}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.galeria-grade figure{margin:0;aspect-ratio:1;overflow:hidden}.galeria-grade img{width:100%;height:100%;object-fit:cover;filter:grayscale(.4);transition:filter .3s,transform .5s}.galeria-grade figure:hover img{filter:none;transform:scale(1.04)}
.contato{background:var(--d);color:var(--sobre-d);padding:clamp(72px,10vw,120px) 0;margin-top:clamp(72px,10vw,120px)}
.contato-in{display:grid;grid-template-columns:1.3fr 1fr;gap:48px;align-items:center}
.contato h2{font-size:clamp(2.6rem,8vw,6.5rem);color:inherit;margin-bottom:18px}.contato-sub{font-size:var(--t1);color:inherit;max-width:42ch;margin-bottom:24px}
.contato-linha{display:flex;gap:12px;align-items:flex-start;margin:0 0 10px;font-weight:600;color:inherit}.contato-linha svg{flex:none;margin-top:4px}
.contato-acoes{display:grid;gap:12px}.contato-acoes .btn{justify-content:center}
.contato .btn-1{background:#0a0a0a;color:#fff}.contato .btn-2{border-color:currentColor;color:inherit}
${cssRodape('rp', '#050505', '#a1a1aa')}
@media(max-width:900px){.linha{grid-template-columns:60px 1fr}.linha p{grid-column:2}.sobre .wrap,.contato-in{grid-template-columns:1fr}.topo nav{display:none}}
@media(prefers-reduced-motion:reduce){.faixa div{animation:none}}
`, `
<header class="topo"><div class="wrap"><a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  ${menu([['#servicos', 'Serviços'], ['#sobre', 'Sobre'], ['#contato', 'Contato']])}${ctaPrincipal(d, 'Chamar agora')}</div></header>
<section class="capa"><div class="wrap">
  <h1>${slogan(d, esc(d.categoria || 'Faça acontecer'))}</h1><p>${capaTxt}</p>
  <div class="btns">${ctaPrincipal(d, 'Falar no WhatsApp')}<a class="btn btn-2" href="#servicos">Ver serviços</a></div>
</div></section>
<div class="faixa" aria-hidden="true"><div>${repetida}${repetida}</div></div>
${servicos.length ? `<section class="sec" id="servicos"><div class="wrap"><div class="cab"><h2>O que a gente faz</h2></div>
<div class="linhas">${servicos.map((s, i) => `<div class="linha"><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join('')}</div></div></section>` : ''}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ''}
  <div><h2>Sobre a ${esc(d.empresa)}</h2><p>${sobreTxt}</p>
  ${Number(d.nota) >= 3.5 ? `<div class="num"><div><b>${Number(d.nota).toFixed(1).replace('.', ',')}</b><span>nota no Google</span></div>${d.avaliacoes ? `<div><b>${Number(d.avaliacoes).toLocaleString('pt-BR')}</b><span>avaliações</span></div>` : ''}</div>` : ''}</div>
</div></section>
${galeriaHtml(d, 'galeria', 'Dentro da casa')}
${depoimentosHtml(d, 'vozes', 'Quem treina com a gente')}
${blocoContato(d, 'contato', 'Bora?', 'Chame no WhatsApp e combine o seu primeiro dia.')}
${fim(d, rodapePremium(d))}`, { escuro: true });
  },
};

/* ============================================================== CLASSICO */

const F_CLASSICO: ParFontes = {
  titulos: '"Libre Baskerville",Georgia,serif', corpo: '"Source Sans 3",system-ui,sans-serif',
  google: 'family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700',
};

const classico: SiteTemplate = {
  id: 'classico',
  nome: 'Clássico',
  descricao: 'Simetria, serifa de livro e detalhes dourados. Tradição e confiança.',
  nichos: ['Advocacia', 'Contabilidade', 'Imobiliárias', 'Igrejas', 'Cartórios', 'Consultorias'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#fbfaf7"/><rect x="62" y="8" width="36" height="6" rx="1" fill="${corPrimaria}"/><rect x="20" y="20" width="120" height="1" fill="${corDestaque}"/>
    <rect x="34" y="32" width="92" height="8" fill="#1f2937"/><rect x="50" y="45" width="60" height="4" fill="#9ca3af"/><rect x="62" y="56" width="36" height="9" fill="${corPrimaria}"/>
    <rect x="50" y="68" width="60" height="1" fill="${corDestaque}"/><rect x="12" y="78" width="40" height="24" fill="#fff" stroke="#e5e7eb"/><rect x="60" y="78" width="40" height="24" fill="#fff" stroke="#e5e7eb"/><rect x="108" y="78" width="40" height="24" fill="#fff" stroke="#e5e7eb"/></svg>`,
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Atendimento sério, explicação clara e acompanhamento em cada etapa.', 'Atuamos com ética, transparência e dedicação a cada cliente.');
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || '';
    const servicos = servicosValidos(d);
    const orn = '<div class="orn" aria-hidden="true"><i></i><b>◆</b><i></i></div>';
    return documentoPremium(d, F_CLASSICO, `
body{background:#fbfaf7;color:#1f2430}
.topo{background:#fbfaf7;border-bottom:1px solid #e7dfce}
.topo .wrap{display:flex;flex-direction:column;align-items:center;gap:14px;padding:22px 0 16px}
.topo-marca{display:flex;align-items:center;gap:14px;font-family:var(--fonte-t);font-size:var(--t3);color:var(--p-esc);letter-spacing:.02em}
.logo-img{height:48px;width:auto}.logo-iniciais{width:48px;height:48px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-family:var(--fonte-t);border-radius:2px}
.topo nav{display:flex;gap:34px;font-weight:600;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:#4b5563}.topo nav a:hover{color:var(--p-texto)}
.btn{border-radius:2px;letter-spacing:.06em}
.btn-1{background:var(--p);color:var(--sobre-p)}
.btn-2{background:transparent;color:var(--p-texto);border:1.5px solid var(--p)}
.orn{display:flex;align-items:center;gap:14px;justify-content:center;color:var(--d);margin:0 auto}.orn i{display:block;width:72px;height:1px;background:currentColor}.orn b{font-size:11px}
.capa{padding:clamp(56px,8vw,104px) 0;text-align:center;background:linear-gradient(180deg,#fbfaf7,#f4efe3)}
.capa .wrap{max-width:860px}
.etiqueta{display:inline-block;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--p-texto);margin-bottom:22px}
.capa h1{font-size:var(--t5);line-height:1.12;color:var(--p-esc);font-weight:400;margin:0 0 22px}
.capa p{font-size:var(--t1);color:#4b5563;max-width:54ch;margin:22px auto 32px}
.btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.moldura{margin:clamp(40px,6vw,64px) auto 0;max-width:980px;padding:10px;border:1px solid #d9cfb9;background:#fff}
.moldura .img{aspect-ratio:16/8;${fundoFoto(capa, d.corPrimaria, 'rgba(0,0,0,0),rgba(0,0,0,.05)')}}
.selo-google{display:inline-grid;gap:2px;margin-top:26px;font-size:13px;color:#6b7280}.selo-google b{font-size:24px;color:var(--p-esc);line-height:1}
.sec{padding:clamp(56px,8vw,100px) 0}
.cab{text-align:center;max-width:640px;margin:0 auto clamp(32px,5vw,56px)}
.cab h2{font-size:var(--t4);font-weight:400;color:var(--p-esc);margin:18px 0 12px}.cab p{color:#6b7280;font-size:var(--t1)}
.colunas{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid #e0d7c3;background:#fff}
.col{padding:36px 30px;border-right:1px solid #e0d7c3;border-bottom:1px solid #e0d7c3;margin:0 -1px -1px 0}
.col .ic{color:var(--d);margin-bottom:18px}
.col h3{font-size:var(--t2);font-weight:400;color:var(--p-esc);margin-bottom:10px}.col p{color:#5b6472;margin:0}
.sobre{background:var(--p-esc);color:#e8e6df}.sobre .wrap{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(32px,5vw,72px);align-items:center}
.sobre .foto{aspect-ratio:4/5;padding:10px;border:1px solid color-mix(in srgb,var(--d) 55%,transparent)}.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:var(--t4);font-weight:400;color:#fff;margin:18px 0}.sobre p{font-size:var(--t1);color:#d9d6cc}
.sobre .orn{justify-content:flex-start;margin:0}
.vozes{padding:clamp(56px,8vw,100px) 0}.vozes h2{text-align:center;font-weight:400;font-size:var(--t4);color:var(--p-esc);margin-bottom:40px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px}
.vozes figure{margin:0;background:#fff;border:1px solid #e0d7c3;padding:30px;text-align:center}.vozes blockquote{margin:12px 0 16px;color:#3b4252;font-family:var(--fonte-t);font-style:italic}.vozes figcaption{font-weight:700;color:var(--p-esc);letter-spacing:.06em;text-transform:uppercase;font-size:13px}
.galeria{padding:clamp(56px,8vw,100px) 0}.galeria h2{text-align:center;font-weight:400;font-size:var(--t4);color:var(--p-esc);margin-bottom:32px}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.galeria-grade figure{margin:0;aspect-ratio:4/3;overflow:hidden;border:1px solid #e0d7c3;padding:6px;background:#fff}.galeria-grade img{width:100%;height:100%;object-fit:cover}
${cssContato('contato', 'border:1px solid #d9cfb9;background:#fff;padding:clamp(28px,5vw,56px)', 'var(--p-esc)', '#5b6472', '#d9cfb9')}
.contato{padding-top:0}.contato h2{font-weight:400}
${cssRodape('rp', '#171b26', '#b9bdc8')}
@media(max-width:900px){.colunas{grid-template-columns:1fr 1fr}.sobre .wrap{grid-template-columns:1fr}.topo nav{gap:18px;font-size:12px;flex-wrap:wrap;justify-content:center}}
@media(max-width:560px){.colunas{grid-template-columns:1fr}.galeria-grade{grid-template-columns:1fr}}
`, `
<header class="topo"><div class="wrap"><a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  ${menu([['#servicos', 'Atuação'], ['#sobre', 'Quem somos'], ['#contato', 'Contato']])}</div></header>
<section class="capa"><div class="wrap">
  <span class="etiqueta">${esc(d.categoria || 'Atendimento')}</span>${orn}
  <h1>${slogan(d, 'Tradição, seriedade e atenção a cada caso')}</h1><p>${capaTxt}</p>
  <div class="btns">${ctaPrincipal(d, 'Falar com a gente')}<a class="btn btn-2" href="#servicos">Conhecer a atuação</a></div>
  ${seloGoogle(d)}
  <div class="moldura"><div class="img" role="img" aria-label="${esc(d.empresa)}"></div></div>
</div></section>
${servicos.length ? `<section class="sec" id="servicos"><div class="wrap"><div class="cab">${orn}<h2>Áreas de atuação</h2><p>Atendimento individual, com clareza em cada etapa.</p></div>
<div class="colunas">${servicos.map((s, i) => `<div class="col"><div class="ic">${iconeDoServico(i)}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join('')}</div></div></section>` : ''}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ''}
  <div>${orn}<h2>Quem somos</h2><p>${sobreTxt}</p></div>
</div></section>
${galeriaHtml(d, 'galeria', 'O ambiente')}
${depoimentosHtml(d, 'vozes', 'Depoimentos')}
${blocoContato(d, 'contato', 'Entre em contato', 'Conte o seu caso e retornamos pelo WhatsApp.')}
${fim(d, rodapePremium(d))}`);
  },
};

export const LAYOUTS_PREMIUM_2: SiteTemplate[] = [bento, natural, impacto, classico];
