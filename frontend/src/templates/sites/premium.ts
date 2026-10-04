/**
 * Layouts premium: seis estruturas diferentes, não seis cores do mesmo.
 *
 * Cada um muda o que um visitante percebe primeiro — o cabeçalho, a capa,
 * a ordem das seções e o par tipográfico. Duas padarias na mesma cidade
 * podem cair no mesmo layout; ainda assim saem diferentes pela foto, pela
 * cor e pelo texto. Dois ramos diferentes nunca saem parecidos.
 */
import type { SiteData, SiteTemplate } from './base';
import { esc } from './base';
import {
  type ParFontes, ICONES, ctaPrincipal, cssRodape, depoimentosValidos, documentoPremium, fotos,
  fundoFoto, iconeDoServico, linkInsta, linkMapa, linkTel, linkZap, logo, rodapePremium,
  partirSobre, seloGoogle, servicosValidos, urlImagem,
} from './premium-base';

/* ------------------------------------------------------------- pedaços */

const blocoContato = (d: SiteData, classe: string, titulo = 'Venha nos visitar'): string => {
  const mapa = linkMapa(d), tel = linkTel(d), ig = linkInsta(d);
  return `<section class="${classe}" id="contato"><div class="wrap ${classe}-in">
  <div><h2>${titulo}</h2>
    ${d.endereco ? `<p class="${classe}-linha">${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ''}
    ${d.horario ? `<p class="${classe}-linha">${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ''}
    ${tel ? `<p class="${classe}-linha">${ICONES.tel}<a href="${tel}">${esc(d.telefone)}</a></p>` : ''}
    ${ig ? `<p class="${classe}-linha">${ICONES.insta}<a href="${ig}" target="_blank" rel="noopener">${esc(d.instagram)}</a></p>` : ''}
  </div>
  <div class="${classe}-acoes">
    ${ctaPrincipal(d, 'Chamar no WhatsApp')}
    ${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}
  </div></div></section>`;
};

const depoimentosHtml = (d: SiteData, classe: string, titulo = 'Quem já é cliente'): string => {
  const lista = depoimentosValidos(d);
  if (!lista.length) return '';
  return `<section class="${classe}"><div class="wrap"><h2>${titulo}</h2><div class="${classe}-grade">${lista
    .map(x => `<figure><span class="estrelas">★★★★★</span><blockquote>“${esc(x.texto)}”</blockquote>${
      x.autor ? `<figcaption>${esc(x.autor)}</figcaption>` : ''}</figure>`)
    .join('')}</div></div></section>`;
};

const galeriaHtml = (d: SiteData, classe: string, titulo = ''): string => {
  const lista = fotos(d);
  if (!lista.length) return '';
  return `<section class="${classe}"><div class="wrap">${titulo ? `<h2>${titulo}</h2>` : ''}<div class="${classe}-grade">${lista
    .map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} — foto ${i + 1}" loading="lazy"></figure>`)
    .join('')}</div></div></section>`;
};

const zapFlutuante = (d: SiteData): string => {
  const zap = linkZap(d);
  return zap ? `<a class="zap-fixo" href="${zap}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICONES.zap}</a>` : '';
};

const cssComum = (d: SiteData) => `
.zap-fixo{position:fixed;right:22px;bottom:22px;width:60px;height:60px;border-radius:50%;background:#25D366;color:#fff;
  display:grid;place-items:center;box-shadow:0 12px 30px -8px rgba(0,0,0,.45);z-index:60}
.zap-fixo svg{width:30px;height:30px}
${d.selo ? `.selo-leadsage{background:#0b0c0f;color:#8b90a0;text-align:center;padding:10px;font-size:12.5px}
.selo-leadsage a{color:#e2e5ec;font-weight:700}` : ''}
`;

const seloLeadsage = (d: SiteData) =>
  d.selo ? '<div class="selo-leadsage">Site criado com <a href="https://leadsageofc.vercel.app" target="_blank" rel="noopener">LeadSage</a></div>' : '';

const fim = (d: SiteData, rodape: string) => `${rodape}${seloLeadsage(d)}${zapFlutuante(d)}`;

const slogan = (d: SiteData, padrao: string) => esc(d.slogan || padrao);

/* ================================================================ AURORA */
/* Gastronomia: foto em tela cheia, cabeçalho transparente por cima, serifa
   expressiva. O cardápio vem em lista com linha pontilhada, como no papel. */

const F_AURORA: ParFontes = {
  titulos: '"Fraunces",Georgia,serif', corpo: '"Inter",system-ui,sans-serif',
  google: 'family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600;700',
};

const aurora: SiteTemplate = {
  id: 'aurora',
  nome: 'Aurora',
  descricao: 'Foto em tela cheia, serifa elegante e cardápio em lista. Feito para dar fome.',
  nichos: ['Padarias', 'Cafeterias', 'Restaurantes', 'Confeitarias', 'Pizzarias'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#1a1410"/><rect width="160" height="62" fill="${corPrimaria}" opacity=".55"/>
    <rect x="12" y="8" width="22" height="5" rx="2" fill="#fff" opacity=".9"/><rect x="110" y="8" width="38" height="5" rx="2" fill="#fff" opacity=".6"/>
    <rect x="40" y="26" width="80" height="9" rx="2" fill="#fff"/><rect x="58" y="40" width="44" height="4" rx="2" fill="#fff" opacity=".7"/>
    <rect x="64" y="49" width="32" height="7" rx="3.5" fill="${corDestaque}"/>
    <rect x="12" y="72" width="62" height="3" fill="#fff" opacity=".5"/><rect x="12" y="80" width="62" height="3" fill="#fff" opacity=".5"/>
    <rect x="86" y="70" width="62" height="32" rx="3" fill="#fff" opacity=".18"/></svg>`,
  render: d => {
    const partes = partirSobre(d, 'Receitas da casa, ingredientes escolhidos e aquele cheiro que chama de longe.', 'Começamos com uma receita de família e a vontade de servir o bairro todos os dias. Hoje cada fornada carrega o mesmo cuidado.');
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || '';
    const servicos = servicosValidos(d);
    return documentoPremium(d, F_AURORA, `
.topo{position:absolute;inset:0 0 auto;z-index:5;padding:26px 0}
.topo .wrap{display:flex;align-items:center;justify-content:space-between}
.topo-marca{display:flex;align-items:center;gap:12px;color:#fff;font-family:var(--fonte-t);font-size:22px}
.logo-img{height:46px;width:auto}
.logo-iniciais{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;border:1.5px solid rgba(255,255,255,.7);color:#fff;font-weight:700}
.topo nav{display:flex;gap:28px;color:rgba(255,255,255,.85);font-size:15px}
.topo nav a:hover{color:#fff}
.capa{min-height:100vh;display:grid;place-items:center;text-align:center;color:#fff;padding:140px 0 100px;${fundoFoto(capa, d.corPrimaria, 'rgba(10,8,6,.35),rgba(10,8,6,.75)')}}
.capa .pre{letter-spacing:.32em;text-transform:uppercase;font-size:13px;color:#fff;margin-bottom:18px;display:inline-block;padding:7px 14px;border:1px solid rgba(255,255,255,.45);border-radius:999px;backdrop-filter:blur(4px)}
.capa h1{font-size:clamp(44px,7.5vw,96px);font-weight:500;max-width:14ch;margin:0 auto 22px;letter-spacing:-.02em}
.capa p{font-size:19px;max-width:560px;margin:0 auto 34px;color:rgba(255,255,255,.85)}
.capa .btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.btn-1{background:var(--d);color:var(--sobre-d);border-radius:999px}
.btn-2{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.6);border-radius:999px}
.selo-google{display:inline-flex;gap:10px;align-items:center;margin-top:34px;font-size:14px;color:rgba(255,255,255,.85)}
.historia{padding:120px 0}
.historia .wrap{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.historia .foto{aspect-ratio:4/5;border-radius:4px;overflow:hidden;background:#eee;box-shadow:24px 24px 0 var(--p-cla)}
.historia .foto img{width:100%;height:100%;object-fit:cover}
.historia .pre{color:var(--p);letter-spacing:.25em;text-transform:uppercase;font-size:13px;font-weight:600}
.historia h2{font-size:clamp(34px,4.5vw,54px);font-weight:500}
.historia p{color:#4a4f5a;font-size:18px}
.menu{background:#faf6f0;padding:110px 0}
.menu h2{text-align:center;font-size:clamp(34px,4.5vw,52px);font-weight:500;margin-bottom:56px}
.menu-grade{display:grid;grid-template-columns:1fr 1fr;gap:12px 72px;max-width:980px;margin:0 auto}
.prato{padding:20px 0;border-bottom:1px solid #e8dfd2}
.prato-topo{display:flex;align-items:baseline;gap:12px}
.prato h3{font-size:22px;font-weight:600;margin:0;padding-left:16px;border-left:3px solid var(--d)}
.prato p{color:#6b6257;margin:6px 0 0 19px;font-size:16px}
.galeria{padding:110px 0}
.galeria h2{text-align:center;font-size:clamp(32px,4vw,48px);font-weight:500;margin-bottom:44px}
.galeria-grade{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:240px;gap:14px}
.galeria-grade figure{margin:0;overflow:hidden;border-radius:4px}
.galeria-grade figure:nth-child(1){grid-column:span 2;grid-row:span 2}
.galeria-grade img{width:100%;height:100%;object-fit:cover;transition:transform .6s}
.galeria-grade figure:hover img{transform:scale(1.06)}
.vozes{background:var(--p);color:var(--sobre-p);padding:110px 0}
.vozes h2{text-align:center;font-size:clamp(32px,4vw,48px);font-weight:500;margin-bottom:48px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:28px}
.vozes figure{margin:0;padding:34px;background:rgba(255,255,255,.08);border-radius:4px}
.vozes blockquote{margin:12px 0 18px;font-family:var(--fonte-t);font-size:21px;line-height:1.45}
.vozes figcaption{opacity:.75;font-size:14px;letter-spacing:.1em;text-transform:uppercase}
.visita{padding:110px 0}
.visita-in{display:grid;grid-template-columns:1.2fr 1fr;gap:60px;align-items:center}
.visita h2{font-size:clamp(34px,4.5vw,52px);font-weight:500}
.visita-linha{display:flex;gap:14px;align-items:flex-start;font-size:18px;color:#3a3f4a}
.visita-linha svg{color:var(--p);margin-top:4px}
.visita-acoes{display:flex;flex-direction:column;gap:14px;align-items:stretch}
.visita .btn-1{justify-content:center}
.visita .btn-2{color:var(--p);border-color:var(--p);justify-content:center}
${cssRodape('rp', '#14110e')}${cssComum(d)}
@media(max-width:860px){.topo nav{display:none}.historia .wrap,.visita-in,.menu-grade{grid-template-columns:1fr;gap:40px}
  .galeria-grade{grid-template-columns:1fr 1fr;grid-auto-rows:170px}}
`, `
<header class="topo"><div class="wrap">
  <a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav><a href="#historia">Nossa história</a>${servicos.length ? '<a href="#menu">Cardápio</a>' : ''}<a href="#contato">Visite</a></nav>
</div></header>
<section class="capa"><div class="wrap">
  <div class="pre sobe">${esc(d.categoria || 'Feito com carinho')}</div>
  <h1 class="sobe sobe-2">${slogan(d, d.empresa)}</h1>
  <p class="sobe sobe-3">${partes[0]}</p>
  <div class="btns sobe sobe-4">${ctaPrincipal(d, 'Fazer pedido')}${linkMapa(d) ? `<a class="btn btn-2" href="${linkMapa(d)}" target="_blank" rel="noopener">Como chegar</a>` : ''}</div>
  ${seloGoogle(d)}
</div></section>
<section class="historia" id="historia"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ''}
  <div><div class="pre">Nossa história</div><h2>${esc(d.empresa)}</h2>
  <p>${partes[1]}</p></div>
</div></section>
${servicos.length ? `<section class="menu" id="menu"><div class="wrap"><h2>Da nossa cozinha</h2><div class="menu-grade">${servicos
  .map(s => `<div class="prato"><div class="prato-topo"><h3>${esc(s.titulo)}</h3></div>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</div>`)
  .join('')}</div></div></section>` : ''}
${galeriaHtml(d, 'galeria', 'Um pouco do nosso dia')}
${depoimentosHtml(d, 'vozes', 'O que dizem por aí')}
${blocoContato(d, 'visita', 'Passe por aqui')}
${fim(d, rodapePremium(d))}`);
  },
};

/* ================================================================ CLÍNICA */
/* Saúde: confiança antes de tudo. Barra de contato no topo, capa dividida
   com o selo da nota no Google sobre a foto, passos do atendimento. */

const F_CLINICA: ParFontes = {
  titulos: '"Plus Jakarta Sans",system-ui,sans-serif', corpo: '"Plus Jakarta Sans",system-ui,sans-serif',
  google: 'family=Plus+Jakarta+Sans:wght@400;500;600;700;800',
};

const clinica: SiteTemplate = {
  id: 'clinica',
  nome: 'Clínica',
  descricao: 'Capa dividida com selo do Google, passos do atendimento e perguntas frequentes. Passa confiança.',
  nichos: ['Clínicas Odontológicas', 'Clínicas Médicas', 'Fisioterapia', 'Estética', 'Psicologia', 'Nutrição'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#fff"/><rect width="160" height="7" fill="${corPrimaria}"/>
    <rect x="10" y="12" width="26" height="5" rx="2" fill="${corPrimaria}"/><rect x="118" y="11" width="32" height="7" rx="3.5" fill="${corDestaque}"/>
    <rect x="10" y="32" width="64" height="8" rx="2" fill="#1f2937"/><rect x="10" y="44" width="54" height="4" rx="2" fill="#9ca3af"/>
    <rect x="10" y="56" width="30" height="8" rx="4" fill="${corPrimaria}"/>
    <rect x="86" y="26" width="64" height="52" rx="10" fill="${corPrimaria}" opacity=".22"/><rect x="78" y="62" width="36" height="14" rx="5" fill="#fff" stroke="#e5e7eb"/>
    <rect x="10" y="86" width="40" height="18" rx="5" fill="#f3f4f6"/><rect x="60" y="86" width="40" height="18" rx="5" fill="#f3f4f6"/><rect x="110" y="86" width="40" height="18" rx="5" fill="#f3f4f6"/></svg>`,
  render: d => {
    const partes = partirSobre(d, 'Atendimento atencioso, explicação clara de cada etapa e estrutura pensada no seu conforto.', 'Uma equipe que acredita que bom atendimento é ouvir antes de tratar.');
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || '';
    const servicos = servicosValidos(d);
    const tel = linkTel(d);
    return documentoPremium(d, F_CLINICA, `
.barra{background:var(--p-esc);color:#fff;font-size:14px}
.barra .wrap{display:flex;gap:28px;justify-content:flex-end;padding:9px 0}
.barra span,.barra a{display:flex;align-items:center;gap:8px;opacity:.9}
.barra svg{width:16px;height:16px}
.topo{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid #eef0f3}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;padding:16px 0}
.topo-marca{display:flex;align-items:center;gap:12px;font-weight:800;font-size:19px;color:#0f172a}
.logo-img{height:42px;width:auto}
.logo-iniciais{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:800}
.topo nav{display:flex;gap:30px;font-weight:600;font-size:15px;color:#475569}
.btn-1{background:var(--p);color:var(--sobre-p);border-radius:14px;box-shadow:0 14px 30px -12px var(--p)}
.btn-2{background:#fff;color:var(--p);border:1.5px solid #dbe1ea;border-radius:14px}
.capa{padding:80px 0 100px;background:linear-gradient(180deg,var(--p-cla),#fff)}
.capa .wrap{display:grid;grid-template-columns:1.05fr 1fr;gap:64px;align-items:center}
.etiqueta{display:inline-flex;gap:8px;align-items:center;background:#fff;border:1px solid #e6eaf0;padding:8px 14px;border-radius:999px;font-size:14px;font-weight:600;color:var(--p)}
.capa h1{font-size:clamp(38px,5.4vw,64px);letter-spacing:-.03em;color:#0b1220;margin:22px 0 20px;font-weight:800}
.capa h1 em{font-style:normal;color:var(--p)}
.capa p{font-size:19px;color:#4b5565;max-width:520px;margin-bottom:32px}
.capa .btns{display:flex;gap:14px;flex-wrap:wrap}
.capa-foto{position:relative}
.capa-foto .img{aspect-ratio:1/1.05;border-radius:28px;overflow:hidden;${fundoFoto(capa, d.corPrimaria, 'rgba(0,0,0,0),rgba(0,0,0,.05)')}}
.selo-google{position:absolute;left:-28px;bottom:36px;background:#fff;border-radius:18px;padding:16px 20px;box-shadow:0 24px 50px -20px rgba(15,23,42,.35);
  display:grid;gap:2px;font-size:13px;color:#64748b}
.selo-google b{font-size:28px;color:#0b1220;line-height:1}
.selo-google .estrelas{font-size:14px}
.servicos{padding:110px 0}
.titulo{text-align:center;max-width:640px;margin:0 auto 56px}
.titulo h2{font-size:clamp(32px,4vw,46px);letter-spacing:-.02em;font-weight:800;color:#0b1220}
.titulo p{color:#64748b;font-size:18px}
.cartoes{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.cartao{padding:32px;border:1px solid #edf0f4;border-radius:22px;background:#fff;transition:box-shadow .25s,transform .25s}
.cartao:hover{transform:translateY(-4px);box-shadow:0 30px 60px -30px rgba(15,23,42,.3)}
.cartao .ic{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;background:var(--p-cla);color:var(--p);margin-bottom:22px}
.cartao h3{font-size:21px;color:#0b1220}
.cartao p{color:#64748b;margin:0}
.passos{background:#0b1220;color:#fff;padding:110px 0}
.passos .titulo h2{color:#fff}.passos .titulo p{color:#94a3b8}
.passos-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;counter-reset:passo}
.passo{padding:30px;border-radius:22px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
.passo::before{counter-increment:passo;content:'0' counter(passo);font-weight:800;font-size:40px;color:var(--d);display:block;margin-bottom:10px}
.passo h3{font-size:20px}.passo p{color:#94a3b8;margin:0}
.sobre{padding:110px 0}
.sobre .wrap{display:grid;grid-template-columns:1fr 1.1fr;gap:72px;align-items:center}
.sobre .foto{aspect-ratio:5/4;border-radius:26px;overflow:hidden;background:var(--p-cla)}
.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(30px,3.6vw,42px);font-weight:800;color:#0b1220;letter-spacing:-.02em}
.sobre p{color:#4b5565;font-size:18px}
.lista{list-style:none;padding:0;margin:24px 0 0;display:grid;gap:12px}
.lista li{display:flex;gap:12px;font-weight:600;color:#1e293b}
.lista svg{color:var(--p);flex:none}
.vozes{background:var(--p-cla);padding:110px 0}
.vozes h2{text-align:center;font-size:clamp(30px,3.6vw,42px);font-weight:800;color:#0b1220;margin-bottom:44px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}
.vozes figure{margin:0;background:#fff;border-radius:22px;padding:30px}
.vozes blockquote{margin:12px 0 16px;color:#334155;font-size:17px}
.vozes figcaption{font-weight:700;color:#0b1220}
.galeria{padding:0 0 110px}
.galeria h2{text-align:center;font-size:clamp(30px,3.6vw,42px);font-weight:800;color:#0b1220;margin-bottom:40px}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.galeria-grade figure{margin:0;aspect-ratio:4/3;border-radius:20px;overflow:hidden}
.galeria-grade img{width:100%;height:100%;object-fit:cover}
.faq{padding:110px 0}
.faq-lista{max-width:780px;margin:0 auto}
.faq details{border-bottom:1px solid #e6eaf0;padding:22px 0}
.faq summary{cursor:pointer;font-weight:700;font-size:18px;color:#0b1220;list-style:none;display:flex;justify-content:space-between}
.faq summary::after{content:'+';color:var(--p);font-size:24px;line-height:1}
.faq details[open] summary::after{content:'−'}
.faq p{color:#64748b;margin:12px 0 0}
.chamada{padding:0 0 110px}
.chamada-in{background:linear-gradient(120deg,var(--p),var(--p-esc));color:var(--sobre-p);border-radius:32px;padding:64px;display:flex;
  gap:32px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.chamada h2{font-size:clamp(28px,3.4vw,40px);font-weight:800;margin:0;max-width:18ch}
.chamada .btn-1{background:#fff;color:var(--p)}
${cssRodape('rp', '#0b1220', '#94a3b8')}${cssComum(d)}
@media(max-width:900px){.barra{display:none}.topo nav{display:none}.capa .wrap,.sobre .wrap{grid-template-columns:1fr}.galeria-grade{grid-template-columns:1fr 1fr}
  .cartoes,.passos-grade{grid-template-columns:1fr}.selo-google{left:16px}.chamada-in{padding:40px}}
`, `
${d.horario || d.endereco ? `<div class="barra"><div class="wrap">${d.horario ? `<span>${ICONES.relogio}${esc(d.horario)}</span>` : ''}${
  d.endereco ? `<span>${ICONES.mapa}${esc(d.endereco)}</span>` : ''}${tel ? `<a href="${tel}">${ICONES.tel}${esc(d.telefone)}</a>` : ''}</div></div>` : ''}
<header class="topo"><div class="wrap">
  <a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav><a href="#servicos">Tratamentos</a><a href="#sobre">A clínica</a><a href="#contato">Contato</a></nav>
  ${ctaPrincipal(d, 'Agendar')}
</div></header>
<section class="capa"><div class="wrap">
  <div><span class="etiqueta sobe">${ICONES.escudo}${esc(d.categoria || 'Atendimento humanizado')}</span>
    <h1 class="sobe sobe-2">${slogan(d, 'Cuidado de verdade, do primeiro contato ao resultado')}</h1>
    <p class="sobe sobe-3">${partes[0]}</p>
    <div class="btns sobe sobe-4">${ctaPrincipal(d, 'Agendar avaliação')}<a class="btn btn-2" href="#servicos">Ver tratamentos</a></div></div>
  <div class="capa-foto sobe sobe-2"><div class="img"></div>${seloGoogle(d)}</div>
</div></section>
${servicos.length ? `<section class="servicos" id="servicos"><div class="wrap"><div class="titulo"><h2>Como podemos ajudar</h2><p>Cada tratamento começa por uma conversa: entender o que você precisa antes de propor qualquer coisa.</p></div>
<div class="cartoes">${servicos.map((s, i) => `<div class="cartao"><div class="ic">${iconeDoServico(i)}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join('')}</div></div></section>` : ''}
<section class="passos"><div class="wrap"><div class="titulo"><h2>Como funciona</h2><p>Sem surpresa: você sabe o que acontece em cada etapa.</p></div>
<div class="passos-grade"><div class="passo"><h3>Você chama</h3><p>Pelo WhatsApp ou telefone, no horário que for melhor para você.</p></div>
<div class="passo"><h3>Avaliação</h3><p>Ouvimos, examinamos e explicamos as opções com calma.</p></div>
<div class="passo"><h3>Tratamento</h3><p>Plano combinado, acompanhamento de perto e retorno garantido.</p></div></div></div></section>
<section class="sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ''}
  <div><h2>Sobre a ${esc(d.empresa)}</h2><p>${partes[1]}</p>
  <ul class="lista"><li>${ICONES.check}Atendimento com hora marcada</li><li>${ICONES.check}Explicação clara de cada etapa</li><li>${ICONES.check}Ambiente acolhedor e higienizado</li></ul></div>
</div></section>
${galeriaHtml(d, 'galeria', 'Nossa estrutura')}
${depoimentosHtml(d, 'vozes', 'Pacientes que confiam')}
<section class="faq"><div class="wrap"><div class="titulo"><h2>Perguntas frequentes</h2></div><div class="faq-lista">
  <details><summary>Como faço para agendar?</summary><p>Pelo WhatsApp ou telefone. Respondemos rápido e encontramos o melhor horário para você.</p></details>
  <details><summary>Preciso de encaminhamento?</summary><p>Não. Você pode agendar direto uma avaliação com a gente.</p></details>
  ${d.horario ? `<details><summary>Qual o horário de atendimento?</summary><p>${esc(d.horario)}.</p></details>` : ''}
  ${d.endereco ? `<details><summary>Onde vocês ficam?</summary><p>${esc(d.endereco)}.</p></details>` : ''}
</div></div></section>
<section class="chamada"><div class="wrap"><div class="chamada-in"><h2>Agende sua avaliação ainda esta semana</h2>${ctaPrincipal(d, 'Agendar pelo WhatsApp')}</div></div></section>
${fim(d, rodapePremium(d))}`);
  },
};

/* ================================================================ OFICINA */
/* Serviço local: força e prova. Capa escura em diagonal, letra larga em
   caixa alta, faixa de números e o telefone gigante no fim. */

const F_OFICINA: ParFontes = {
  titulos: '"Archivo",system-ui,sans-serif', corpo: '"Inter",system-ui,sans-serif',
  google: 'family=Archivo:wdth,wght@112,700;112,800;112,900&family=Inter:wght@400;500;600',
};

const oficina: SiteTemplate = {
  id: 'oficina',
  nome: 'Oficina',
  descricao: 'Capa escura em diagonal, letras fortes e telefone em destaque. Para serviço que resolve.',
  nichos: ['Mecânicas', 'Construção', 'Reformas', 'Elétrica', 'Funilaria', 'Materiais de Construção'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#f4f4f5"/><path d="M0 0h160v60L0 76z" fill="#111"/><path d="M0 0h70v70L0 76z" fill="${corPrimaria}" opacity=".5"/>
    <rect x="10" y="22" width="76" height="10" fill="#fff"/><rect x="10" y="36" width="56" height="10" fill="${corDestaque}"/>
    <rect x="10" y="52" width="34" height="8" fill="${corDestaque}"/>
    <rect x="0" y="80" width="160" height="12" fill="${corDestaque}"/><rect x="10" y="96" width="40" height="8" fill="#d4d4d8"/><rect x="60" y="96" width="40" height="8" fill="#d4d4d8"/><rect x="110" y="96" width="40" height="8" fill="#d4d4d8"/></svg>`,
  render: d => {
    const partes = partirSobre(d, 'Orçamento claro, prazo combinado e garantia no que a gente faz.', 'Quem chama a gente volta e indica. É assim que o bairro conhece nosso trabalho.');
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || '';
    const servicos = servicosValidos(d);
    const tel = linkTel(d);
    const nota = Number(d.nota);
    return documentoPremium(d, F_OFICINA, `
h1,h2,h3{text-transform:uppercase;font-stretch:112%;letter-spacing:-.01em}
.topo{position:absolute;inset:0 0 auto;z-index:5}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;padding:22px 0}
.topo-marca{display:flex;align-items:center;gap:12px;color:#fff;font-family:var(--fonte-t);font-weight:900;font-size:20px;text-transform:uppercase}
.logo-img{height:44px;width:auto}
.logo-iniciais{width:44px;height:44px;display:grid;place-items:center;background:var(--d);color:var(--sobre-d);font-weight:900;font-family:var(--fonte-t)}
.topo-tel{color:#fff;font-family:var(--fonte-t);font-weight:800;font-size:18px;display:flex;gap:10px;align-items:center}
.topo-tel svg{color:var(--d)}
.capa{position:relative;color:#fff;padding:170px 0 150px;clip-path:polygon(0 0,100% 0,100% 86%,0 100%);
  ${fundoFoto(capa, '#111', 'rgba(8,8,10,.6),rgba(8,8,10,.88)')}}
.capa h1{font-size:clamp(46px,8vw,104px);font-weight:900;line-height:.95;max-width:12ch;margin-bottom:24px}
.capa h1 span{color:var(--d)}
.capa p{font-size:19px;max-width:540px;color:#d4d4d8;margin-bottom:36px}
.btn-1{background:var(--d);color:var(--sobre-d);font-family:var(--fonte-t);text-transform:uppercase;letter-spacing:.04em}
.btn-2{background:transparent;color:#fff;border:2px solid #fff;font-family:var(--fonte-t);text-transform:uppercase;letter-spacing:.04em}
.capa .btns{display:flex;gap:14px;flex-wrap:wrap}
.numeros{margin-top:-60px;position:relative;z-index:3}
.numeros .wrap{display:grid;grid-template-columns:repeat(3,1fr);background:var(--p);color:var(--sobre-p)}
.num{padding:34px 28px;border-right:1px solid rgba(255,255,255,.15)}
.num b{display:block;font-family:var(--fonte-t);font-size:44px;font-weight:900;line-height:1}
.num span{opacity:.85;font-size:15px}
.servicos{padding:120px 0 100px}
.cab{display:flex;justify-content:space-between;align-items:end;gap:30px;margin-bottom:50px;flex-wrap:wrap}
.cab h2{font-size:clamp(34px,5vw,62px);font-weight:900;margin:0;max-width:14ch}
.cab p{max-width:420px;color:#52525b;margin:0}
.grade{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:#e4e4e7;border:2px solid #e4e4e7}
.item{background:#fff;padding:38px 32px;position:relative}
.item .n{display:block;font-family:var(--fonte-t);font-weight:900;font-size:15px;color:var(--d);background:#111;padding:4px 8px;width:max-content;margin-bottom:16px;letter-spacing:.08em}
.item h3{font-size:22px;font-weight:800;margin-bottom:10px;position:relative}
.item p{color:#52525b;margin:0;position:relative}
.item:hover{background:#111;color:#fff}.item:hover p{color:#a1a1aa}.item:hover .n{background:var(--d);color:#111}
.sobre{background:#111;color:#fff;padding:120px 0}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center}
.sobre .foto{aspect-ratio:4/3;overflow:hidden;border-left:8px solid var(--d)}
.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(32px,4.4vw,54px);font-weight:900}
.sobre p{color:#a1a1aa;font-size:18px}
.lista{list-style:none;padding:0;margin:24px 0 0;display:grid;gap:14px}
.lista li{display:flex;gap:12px;font-weight:600}.lista svg{color:var(--d)}
.galeria{padding:110px 0}
.galeria h2{font-size:clamp(32px,4.4vw,54px);font-weight:900;margin-bottom:40px}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.galeria-grade figure{margin:0;aspect-ratio:1;overflow:hidden}
.galeria-grade img{width:100%;height:100%;object-fit:cover;filter:grayscale(.2);transition:transform .5s,filter .5s}
.galeria-grade figure:hover img{transform:scale(1.05);filter:none}
.vozes{background:#f4f4f5;padding:110px 0}
.vozes h2{font-size:clamp(32px,4.4vw,54px);font-weight:900;margin-bottom:40px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.vozes figure{margin:0;background:#fff;padding:32px;border-top:5px solid var(--d)}
.vozes blockquote{margin:12px 0 16px;font-size:17px;color:#27272a}
.vozes figcaption{font-family:var(--fonte-t);font-weight:800;text-transform:uppercase}
.ligue{background:var(--d);color:var(--sobre-d);padding:90px 0;text-align:center}
.ligue h2{font-size:clamp(30px,4.4vw,52px);font-weight:900}
.ligue a.tel{display:inline-block;font-family:var(--fonte-t);font-weight:900;font-size:clamp(36px,7vw,84px);margin:8px 0 24px}
.ligue .btn-1{background:#111;color:#fff}
${cssRodape('rp', '#09090b', '#a1a1aa')}${cssComum(d)}
@media(max-width:860px){.topo-tel{display:none}.numeros .wrap,.grade,.sobre .wrap,.galeria-grade{grid-template-columns:1fr}
  .num{border-right:0;border-bottom:1px solid rgba(255,255,255,.15)}}
`, `
<header class="topo"><div class="wrap">
  <a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  ${tel ? `<a class="topo-tel" href="${tel}">${ICONES.tel}${esc(d.telefone)}</a>` : ''}
</div></header>
<section class="capa"><div class="wrap">
  <h1 class="sobe">${esc(d.slogan || 'Serviço bem feito,')} ${d.slogan ? '' : '<span>sem enrolação</span>'}</h1>
  <p class="sobe sobe-2">${partes[0]}</p>
  <div class="btns sobe sobe-3">${ctaPrincipal(d, 'Pedir orçamento')}${servicos.length ? '<a class="btn btn-2" href="#servicos">Nossos serviços</a>' : ''}</div>
</div></section>
<section class="numeros"><div class="wrap">
  <div class="num"><b>${nota >= 3.5 ? nota.toFixed(1).replace('.', ',') + '★' : '100%'}</b><span>${nota >= 3.5 ? `${d.avaliacoes || ''} avaliações no Google` : 'orçamento sem compromisso'}</span></div>
  <div class="num"><b>${servicos.length || '+'}</b><span>${servicos.length ? 'tipos de serviço' : 'serviços sob medida'}</span></div>
  <div class="num"><b>✓</b><span>garantia no serviço</span></div>
</div></section>
${servicos.length ? `<section class="servicos" id="servicos"><div class="wrap"><div class="cab"><h2>O que a gente resolve</h2><p>${esc(d.categoria || 'Atendimento')} com equipe própria e material de qualidade.</p></div>
<div class="grade">${servicos.map((s, i) => `<div class="item"><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join('')}</div></div></section>` : ''}
<section class="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ''}
  <div><h2>Por que a ${esc(d.empresa)}</h2><p>${partes[1]}</p>
  <ul class="lista"><li>${ICONES.check}Orçamento antes de começar</li><li>${ICONES.check}Prazo combinado e cumprido</li><li>${ICONES.check}Garantia por escrito</li></ul></div>
</div></section>
${galeriaHtml(d, 'galeria', 'Trabalhos recentes')}
${depoimentosHtml(d, 'vozes', 'Clientes falando')}
<section class="ligue" id="contato"><div class="wrap"><h2>Precisa resolver hoje?</h2>
  ${tel ? `<a class="tel" href="${tel}">${esc(d.telefone)}</a><br>` : ''}${ctaPrincipal(d, 'Chamar no WhatsApp')}
  ${d.endereco ? `<p style="margin-top:22px">${esc(d.endereco)}${d.horario ? ` · ${esc(d.horario)}` : ''}</p>` : ''}
</div></section>
${fim(d, rodapePremium(d))}`);
  },
};

/* ================================================================ ESTÚDIO */
/* Beleza e estilo: escuro, dourado, serifa fina. A foto manda, o texto
   sussurra. Galeria vertical, agenda em destaque. */

const F_ESTUDIO: ParFontes = {
  titulos: '"Cormorant Garamond",Georgia,serif', corpo: '"Jost",system-ui,sans-serif',
  google: 'family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@300;400;500;600',
};

const estudio: SiteTemplate = {
  id: 'estudio',
  nome: 'Estúdio',
  descricao: 'Fundo escuro, detalhes dourados e serifa fina. Para quem vende estilo.',
  nichos: ['Barbearias', 'Salões de Beleza', 'Estética', 'Tatuagem', 'Moda', 'Joalherias'],
  miniatura: ({ corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#0d0c0b"/><rect x="66" y="8" width="28" height="5" rx="1" fill="${corDestaque}"/>
    <rect x="30" y="30" width="100" height="10" fill="#f5efe6"/><rect x="50" y="44" width="60" height="4" fill="#8a8178"/>
    <rect x="62" y="54" width="36" height="8" fill="none" stroke="${corDestaque}"/>
    <rect x="12" y="72" width="40" height="32" fill="#2a2622"/><rect x="60" y="72" width="40" height="32" fill="#3a342e"/><rect x="108" y="72" width="40" height="32" fill="#2a2622"/></svg>`,
  render: d => {
    const partes = partirSobre(d, 'Técnica, atenção aos detalhes e um ambiente feito para você relaxar.', 'Mais do que um serviço, uma experiência: hora marcada, atenção total e o resultado que você imaginou.');
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || '';
    const servicos = servicosValidos(d);
    return documentoPremium(d, F_ESTUDIO, `
body{background:#0d0c0b;color:#e9e3da;font-weight:300}
h1,h2,h3{font-weight:500}
.topo{position:absolute;inset:0 0 auto;z-index:5;padding:30px 0;text-align:center}
.topo-marca{display:inline-flex;flex-direction:column;align-items:center;gap:10px;font-family:var(--fonte-t);font-size:26px;letter-spacing:.18em;text-transform:uppercase;color:#f5efe6}
.logo-img{height:54px;width:auto}
.logo-iniciais{width:54px;height:54px;border:1px solid var(--d);color:var(--d);display:grid;place-items:center;font-family:var(--fonte-t);font-size:22px}
.capa{min-height:100vh;display:grid;place-items:center;text-align:center;padding:180px 0 120px;${fundoFoto(capa, '#1a1715', 'rgba(13,12,11,.45),rgba(13,12,11,.92)')}}
.capa .linha{width:1px;height:70px;background:var(--d);margin:0 auto 30px}
.capa h1{font-size:clamp(46px,8vw,110px);line-height:.95;font-style:italic;color:#f5efe6;max-width:13ch;margin:0 auto 26px}
.capa p{max-width:520px;margin:0 auto 40px;color:#b8afa3;font-size:18px;letter-spacing:.02em}
.btn-1{background:var(--d);color:var(--sobre-d);text-transform:uppercase;letter-spacing:.18em;font-size:13px;font-weight:500;padding:18px 34px}
.btn-2{border:1px solid var(--d);color:var(--d);text-transform:uppercase;letter-spacing:.18em;font-size:13px;font-weight:500;padding:18px 34px;background:transparent}
.selo-google{display:inline-flex;gap:10px;align-items:center;margin-top:36px;color:#b8afa3;font-size:14px;letter-spacing:.05em}
.sec{padding:130px 0}
.pre{color:var(--d);letter-spacing:.35em;text-transform:uppercase;font-size:12px;font-weight:500;margin-bottom:18px}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:90px;align-items:center}
.sobre .foto{aspect-ratio:3/4;overflow:hidden;position:relative}
.sobre .foto::after{content:'';position:absolute;inset:18px;border:1px solid rgba(255,255,255,.35);pointer-events:none}
.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(38px,5vw,64px);color:#f5efe6;line-height:1}
.sobre p{color:#b8afa3;font-size:18px}
.servicos{background:#141210}
.servicos h2{text-align:center;font-size:clamp(38px,5vw,64px);color:#f5efe6;margin-bottom:64px}
.lista{max-width:860px;margin:0 auto}
.linha-s{display:grid;grid-template-columns:1fr auto;gap:20px;padding:26px 0;border-bottom:1px solid #2a2622;align-items:baseline}
.linha-s h3{font-size:28px;color:#f5efe6;margin:0}
.linha-s p{grid-column:1/-1;color:#8a8178;margin:4px 0 0}
.linha-s span{color:var(--d);font-size:13px;letter-spacing:.2em;text-transform:uppercase}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.galeria-grade figure{margin:0;aspect-ratio:3/4;overflow:hidden}
.galeria-grade figure:nth-child(2){transform:translateY(48px)}
.galeria-grade figure:nth-child(5){transform:translateY(48px)}
.galeria-grade img{width:100%;height:100%;object-fit:cover;transition:transform .8s}
.galeria-grade figure:hover img{transform:scale(1.05)}
.galeria h2{text-align:center;font-size:clamp(38px,5vw,64px);color:#f5efe6;margin-bottom:60px}
.vozes h2{text-align:center;font-size:clamp(36px,4.6vw,56px);color:#f5efe6;margin-bottom:50px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:40px;text-align:center}
.vozes figure{margin:0}
.vozes blockquote{font-family:var(--fonte-t);font-style:italic;font-size:24px;color:#e9e3da;margin:14px 0 18px;line-height:1.4}
.vozes figcaption{color:var(--d);letter-spacing:.2em;text-transform:uppercase;font-size:12px}
.agenda{text-align:center;border-top:1px solid #2a2622;border-bottom:1px solid #2a2622}
.agenda h2{font-size:clamp(38px,5vw,68px);font-style:italic;color:#f5efe6}
.agenda p{color:#b8afa3}
.agenda .btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:30px}
${cssRodape('rp', '#090808', '#8a8178')}${cssComum(d)}
@media(max-width:860px){.sobre .wrap{grid-template-columns:1fr;gap:50px}.galeria-grade{grid-template-columns:1fr 1fr}
  .galeria-grade figure:nth-child(n){transform:none}}
`, `
<header class="topo"><a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a></header>
<section class="capa"><div class="wrap">
  <div class="linha sobe"></div>
  <h1 class="sobe sobe-2">${slogan(d, 'O seu melhor, todos os dias')}</h1>
  <p class="sobe sobe-3">${partes[0]}</p>
  <div class="sobe sobe-4">${ctaPrincipal(d, 'Agendar horário')}</div>
  ${seloGoogle(d)}
</div></section>
<section class="sec sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ''}
  <div><div class="pre">${esc(d.categoria || 'O estúdio')}</div><h2>Cada detalhe pensado</h2>
  <p>${partes[1]}</p></div>
</div></section>
${servicos.length ? `<section class="sec servicos"><div class="wrap"><div class="pre" style="text-align:center">Serviços</div><h2>O que fazemos</h2><div class="lista">${servicos
  .map(s => `<div class="linha-s"><h3>${esc(s.titulo)}</h3><span>Agendar</span>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</div>`).join('')}</div></div></section>` : ''}
${galeriaHtml(d, 'sec galeria', 'Trabalhos')}
${depoimentosHtml(d, 'sec vozes', 'Palavra de cliente')}
<section class="sec agenda" id="contato"><div class="wrap"><div class="pre">Agenda aberta</div><h2>Reserve o seu horário</h2>
  ${d.endereco ? `<p>${esc(d.endereco)}${d.horario ? ` · ${esc(d.horario)}` : ''}</p>` : ''}
  <div class="btns">${ctaPrincipal(d, 'Agendar pelo WhatsApp')}${linkMapa(d) ? `<a class="btn btn-2" href="${linkMapa(d)}" target="_blank" rel="noopener">Como chegar</a>` : ''}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  },
};

/* ============================================================== ESCRITÓRIO */
/* Profissional liberal: sobriedade e credibilidade. Branco, serifa de
   livro, áreas de atuação em colunas, nada piscando. */

const F_ESCRITORIO: ParFontes = {
  titulos: '"Libre Baskerville",Georgia,serif', corpo: '"Source Sans 3",system-ui,sans-serif',
  google: 'family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700',
};

const escritorio: SiteTemplate = {
  id: 'escritorio',
  nome: 'Escritório',
  descricao: 'Sóbrio e editorial: áreas de atuação em colunas e muito espaço em branco. Passa credibilidade.',
  nichos: ['Advogados', 'Contabilidade', 'Imobiliárias', 'Arquitetura', 'Consultoria', 'Psicologia'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#fbfaf7"/><rect x="10" y="10" width="30" height="5" fill="${corPrimaria}"/><rect x="100" y="10" width="50" height="5" fill="#cbd5e1"/>
    <rect x="10" y="20" width="140" height="1" fill="#e2e8f0"/>
    <rect x="10" y="32" width="84" height="9" fill="#0f172a"/><rect x="10" y="45" width="70" height="9" fill="#0f172a"/><rect x="10" y="60" width="26" height="3" fill="${corDestaque}"/>
    <rect x="104" y="30" width="46" height="36" fill="${corPrimaria}" opacity=".25"/>
    <rect x="10" y="76" width="42" height="26" fill="none" stroke="#cbd5e1"/><rect x="59" y="76" width="42" height="26" fill="none" stroke="#cbd5e1"/><rect x="108" y="76" width="42" height="26" fill="none" stroke="#cbd5e1"/></svg>`,
  render: d => {
    const partes = partirSobre(d, 'Atendimento próximo, linguagem simples e compromisso com cada caso.', 'Experiência, ética e dedicação a cada cliente. Acreditamos que confiança se constrói com transparência.');
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || '';
    const servicos = servicosValidos(d);
    return documentoPremium(d, F_ESCRITORIO, `
body{background:#fbfaf7;color:#1c2230}
.topo{position:sticky;top:0;z-index:20;background:#fbfaf7;border-bottom:1px solid #e6e2d9}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;padding:20px 0}
.topo-marca{display:flex;align-items:center;gap:14px;font-family:var(--fonte-t);font-size:19px;color:#111827}
.logo-img{height:40px;width:auto}
.logo-iniciais{width:40px;height:40px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-family:var(--fonte-t)}
.topo nav{display:flex;gap:34px;font-weight:600;font-size:15px;color:#4b5563}
.btn-1{background:var(--p);color:var(--sobre-p);border-radius:2px}
.btn-2{background:transparent;color:var(--p);border:1px solid var(--p);border-radius:2px}
.capa{padding:110px 0 90px}
.capa .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:70px;align-items:center}
.pre{font-size:13px;letter-spacing:.24em;text-transform:uppercase;color:var(--p);font-weight:700}
.capa h1{font-size:clamp(36px,5vw,62px);line-height:1.12;margin:20px 0 26px;color:#0f1420}
.capa .traco{width:70px;height:3px;background:var(--d);margin-bottom:26px}
.capa p{font-size:19px;color:#4b5563;max-width:560px;margin-bottom:34px}
.capa .btns{display:flex;gap:14px;flex-wrap:wrap}
.capa .img{aspect-ratio:4/5;${fundoFoto(capa, d.corPrimaria, 'rgba(0,0,0,0),rgba(0,0,0,.1)')};box-shadow:-22px 22px 0 #ece8df}
.selo-google{display:inline-flex;gap:10px;align-items:center;margin-top:28px;color:#4b5563;font-size:14px}
.areas{padding:110px 0;border-top:1px solid #e6e2d9}
.cab{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-bottom:60px;align-items:end}
.cab h2{font-size:clamp(30px,4vw,48px);margin:10px 0 0;color:#0f1420}
.cab p{color:#6b7280;margin:0;font-size:18px}
.colunas{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #d9d4c8}
.area{padding:36px 30px 40px 0;border-bottom:1px solid #d9d4c8}
.area:not(:nth-child(3n+1)){padding-left:30px;border-left:1px solid #d9d4c8}
.area h3{font-size:21px;color:#0f1420;margin-bottom:12px}
.area p{color:#6b7280;margin:0}
.area .ic{color:var(--p);margin-bottom:18px}
.sobre{background:#0f1420;color:#e5e7eb;padding:110px 0}
.sobre .wrap{display:grid;grid-template-columns:1fr 1.2fr;gap:80px;align-items:center}
.sobre .foto{aspect-ratio:1;overflow:hidden}
.sobre .foto img{width:100%;height:100%;object-fit:cover;filter:grayscale(.3)}
.sobre h2{font-size:clamp(30px,4vw,46px);color:#fff}
.sobre p{color:#9ca3af;font-size:18px}
.sobre .pre{color:var(--d)}
.sobre .assina{font-family:var(--fonte-t);font-style:italic;color:var(--d);font-size:20px;margin-top:24px}
.vozes{padding:110px 0}
.vozes h2{font-size:clamp(30px,4vw,46px);text-align:center;margin-bottom:50px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:30px}
.vozes figure{margin:0;border-top:3px solid var(--d);padding-top:26px}
.vozes blockquote{font-family:var(--fonte-t);font-size:19px;line-height:1.55;margin:10px 0 16px;color:#1f2937}
.vozes figcaption{font-weight:700;color:#4b5563}
.galeria{padding:110px 0 0}
.galeria h2{font-size:clamp(30px,4vw,46px);text-align:center;margin-bottom:44px}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.galeria-grade figure{margin:0;aspect-ratio:3/2;overflow:hidden}
.galeria-grade img{width:100%;height:100%;object-fit:cover;filter:grayscale(.15)}
.contato{padding:110px 0;background:#f2efe8}
.contato-in{display:grid;grid-template-columns:1.2fr 1fr;gap:60px;align-items:center}
.contato h2{font-size:clamp(30px,4vw,46px);color:#0f1420}
.contato-linha{display:flex;gap:14px;align-items:flex-start;color:#374151;font-size:18px}
.contato-linha svg{color:var(--p);margin-top:4px}
.contato-acoes{display:flex;flex-direction:column;gap:14px}
.contato .btn{justify-content:center}
${cssRodape('rp', '#0b0f19', '#9ca3af')}${cssComum(d)}
@media(max-width:900px){.topo nav{display:none}.capa .wrap,.cab,.sobre .wrap,.contato-in{grid-template-columns:1fr}.galeria-grade{grid-template-columns:1fr 1fr}
  .colunas{grid-template-columns:1fr}.area:not(:nth-child(3n+1)){padding-left:0;border-left:0}}
`, `
<header class="topo"><div class="wrap">
  <a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav><a href="#areas">Atuação</a><a href="#sobre">Sobre</a><a href="#contato">Contato</a></nav>
</div></header>
<section class="capa"><div class="wrap">
  <div><div class="pre sobe">${esc(d.categoria || 'Atendimento especializado')}</div>
    <h1 class="sobe sobe-2">${slogan(d, 'Orientação clara para decisões importantes')}</h1>
    <div class="traco"></div>
    <p class="sobe sobe-3">${partes[0]}</p>
    <div class="btns sobe sobe-4">${ctaPrincipal(d, 'Agendar conversa')}${servicos.length ? '<a class="btn btn-2" href="#areas">Áreas de atuação</a>' : ''}</div>
    ${seloGoogle(d)}</div>
  <div class="img sobe sobe-2"></div>
</div></section>
${servicos.length ? `<section class="areas" id="areas"><div class="wrap"><div class="cab"><div><div class="pre">Atuação</div><h2>Como podemos ajudar</h2></div>
<p>Cada caso começa por entender o seu contexto. Só depois vem a proposta.</p></div><div class="colunas">${servicos
  .map((s, i) => `<div class="area"><div class="ic">${iconeDoServico(i)}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join('')}</div></div></section>` : ''}
<section class="sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ''}
  <div><div class="pre">Quem somos</div><h2>${esc(d.empresa)}</h2>
  <p>${partes[1]}</p>
  <div class="assina">${esc(d.empresa)}</div></div>
</div></section>
${galeriaHtml(d, 'galeria', 'O escritório')}
${depoimentosHtml(d, 'vozes', 'Depoimentos')}
${blocoContato(d, 'contato', 'Vamos conversar')}
${fim(d, rodapePremium(d))}`);
  },
};

/* ================================================================ VIBRANTE */
/* Energia: academia, pet, escola. Cor forte, formas arredondadas, letra
   gorda e amigável. */

const F_VIBRANTE: ParFontes = {
  titulos: '"Outfit",system-ui,sans-serif', corpo: '"Nunito",system-ui,sans-serif',
  google: 'family=Outfit:wght@600;700;800;900&family=Nunito:wght@400;600;700',
};

const vibrante: SiteTemplate = {
  id: 'vibrante',
  nome: 'Vibrante',
  descricao: 'Cores fortes, formas arredondadas e muita energia. Para academia, pet shop e escola.',
  nichos: ['Academias', 'Pet Shops', 'Escolas', 'Cursos', 'Sorveterias', 'Lazer'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#fff"/><circle cx="130" cy="20" r="36" fill="${corDestaque}" opacity=".35"/><circle cx="18" cy="96" r="26" fill="${corPrimaria}" opacity=".2"/>
    <rect x="10" y="10" width="28" height="7" rx="3.5" fill="${corPrimaria}"/>
    <rect x="10" y="30" width="78" height="11" rx="5" fill="#111"/><rect x="10" y="45" width="60" height="11" rx="5" fill="${corPrimaria}"/>
    <rect x="10" y="62" width="40" height="10" rx="5" fill="${corDestaque}"/>
    <rect x="96" y="30" width="54" height="50" rx="18" fill="${corPrimaria}" opacity=".5"/>
    <rect x="10" y="84" width="40" height="18" rx="9" fill="#f3f4f6"/><rect x="58" y="84" width="40" height="18" rx="9" fill="#f3f4f6"/></svg>`,
  render: d => {
    const partes = partirSobre(d, 'Estrutura completa, equipe animada e atendimento que faz você querer voltar.', 'Aqui cada pessoa é recebida pelo nome. Ambiente leve, equipe preparada e resultado de verdade.');
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || '';
    const servicos = servicosValidos(d);
    return documentoPremium(d, F_VIBRANTE, `
h1,h2,h3{font-weight:800;letter-spacing:-.02em}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;padding:22px 0}
.topo-marca{display:flex;align-items:center;gap:12px;font-family:var(--fonte-t);font-weight:800;font-size:22px}
.logo-img{height:46px;width:auto}
.logo-iniciais{width:46px;height:46px;border-radius:16px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-family:var(--fonte-t);font-weight:900;transform:rotate(-6deg)}
.btn-1{background:var(--p);color:var(--sobre-p);border-radius:999px;box-shadow:0 10px 0 var(--p-esc)}
.btn-1:hover{box-shadow:0 6px 0 var(--p-esc);transform:translateY(4px)}
.btn-2{background:var(--d);color:var(--sobre-d);border-radius:999px}
.capa{position:relative;overflow:hidden;padding:60px 0 110px}
.capa::before{content:'';position:absolute;width:620px;height:620px;border-radius:50%;background:var(--d);opacity:.22;right:-160px;top:-200px}
.capa .wrap{position:relative;display:grid;grid-template-columns:1.1fr 1fr;gap:50px;align-items:center}
.capa h1{font-size:clamp(44px,7vw,92px);line-height:.98;margin-bottom:22px}
.capa h1 span{color:var(--p);display:block}
.capa p{font-size:20px;color:#4b5563;max-width:520px;margin-bottom:34px}
.capa .btns{display:flex;gap:14px;flex-wrap:wrap}
.capa .img{aspect-ratio:1;border-radius:46% 54% 42% 58%/52% 44% 56% 48%;${fundoFoto(capa, d.corPrimaria, 'rgba(0,0,0,0),rgba(0,0,0,.08)')};
  box-shadow:0 0 0 14px #fff,0 0 0 18px var(--p)}
.selo-google{display:inline-flex;gap:10px;align-items:center;margin-top:26px;background:#fff;border-radius:999px;padding:10px 18px;box-shadow:0 10px 30px -12px rgba(0,0,0,.25);font-size:14px}
.cartoes{padding:100px 0;background:var(--p-cla)}
.cartoes h2{text-align:center;font-size:clamp(34px,5vw,58px);margin-bottom:50px}
.cartoes-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.cartao{background:#fff;border-radius:30px;padding:34px;border:3px solid transparent;transition:border-color .2s,transform .2s}
.cartao:hover{border-color:var(--p);transform:rotate(-1deg)}
.cartao .ic{width:60px;height:60px;border-radius:20px;display:grid;place-items:center;background:var(--d);color:var(--sobre-d);margin-bottom:20px}
.cartao h3{font-size:24px}.cartao p{color:#4b5563;margin:0}
.sobre{padding:110px 0}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center}
.sobre .foto{aspect-ratio:1;border-radius:40px;overflow:hidden;transform:rotate(-3deg);box-shadow:20px 20px 0 var(--d)}
.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(34px,4.6vw,54px)}
.sobre p{font-size:19px;color:#4b5563}
.galeria{padding:0 0 110px}
.galeria h2{text-align:center;font-size:clamp(34px,4.6vw,54px);margin-bottom:40px}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.galeria-grade figure{margin:0;aspect-ratio:1;border-radius:28px;overflow:hidden}
.galeria-grade img{width:100%;height:100%;object-fit:cover;transition:transform .4s}
.galeria-grade figure:hover img{transform:scale(1.08) rotate(2deg)}
.vozes{background:#111;color:#fff;padding:110px 0}
.vozes h2{text-align:center;font-size:clamp(34px,4.6vw,54px);margin-bottom:46px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}
.vozes figure{margin:0;background:#1f1f1f;border-radius:30px;padding:32px}
.vozes blockquote{margin:12px 0 16px;font-size:18px}
.vozes figcaption{color:var(--d);font-weight:800;font-family:var(--fonte-t)}
.final{padding:110px 0}
.final-in{background:var(--p);color:var(--sobre-p);border-radius:44px;padding:70px;text-align:center;position:relative;overflow:hidden}
.final-in::after{content:'';position:absolute;width:300px;height:300px;border-radius:50%;background:var(--d);opacity:.35;left:-80px;bottom:-140px}
.final h2{font-size:clamp(34px,5vw,64px);position:relative}
.final p{position:relative;font-size:19px;opacity:.9}
.final .btn-1{background:#fff;color:var(--p);box-shadow:0 10px 0 rgba(0,0,0,.2);position:relative}
${cssRodape('rp', '#111', '#a3a3a3')}${cssComum(d)}
@media(max-width:860px){.capa .wrap,.sobre .wrap{grid-template-columns:1fr}.cartoes-grade,.galeria-grade{grid-template-columns:1fr 1fr}.final-in{padding:44px 24px}}
@media(max-width:560px){.cartoes-grade,.galeria-grade{grid-template-columns:1fr}}
`, `
<header class="topo"><div class="wrap"><a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>${ctaPrincipal(d, 'Fale com a gente')}</div></header>
<section class="capa"><div class="wrap">
  <div><h1 class="sobe">${esc(d.empresa)}<span>${slogan(d, 'do jeito que você merece')}</span></h1>
    <p class="sobe sobe-2">${partes[0]}</p>
    <div class="btns sobe sobe-3">${ctaPrincipal(d, 'Quero conhecer')}${servicos.length ? '<a class="btn btn-2" href="#servicos">Ver tudo</a>' : ''}</div>
    ${seloGoogle(d)}</div>
  <div class="img sobe sobe-2"></div>
</div></section>
${servicos.length ? `<section class="cartoes" id="servicos"><div class="wrap"><h2>O que tem aqui</h2><div class="cartoes-grade">${servicos
  .map((s, i) => `<div class="cartao"><div class="ic">${iconeDoServico(i)}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join('')}</div></div></section>` : ''}
<section class="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ''}
  <div><h2>Feito pra você</h2><p>${partes[1]}</p>
  ${ctaPrincipal(d, 'Bora começar')}</div>
</div></section>
${galeriaHtml(d, 'galeria', 'Por dentro')}
${depoimentosHtml(d, 'vozes', 'Quem vem, volta')}
<section class="final" id="contato"><div class="wrap"><div class="final-in"><h2>Vem fazer parte!</h2>
  ${d.endereco ? `<p>${esc(d.endereco)}${d.horario ? ` · ${esc(d.horario)}` : ''}</p>` : ''}${ctaPrincipal(d, 'Chamar no WhatsApp')}</div></div></section>
${fim(d, rodapePremium(d))}`);
  },
};

export const LAYOUTS_PREMIUM: SiteTemplate[] = [aurora, clinica, oficina, estudio, escritorio, vibrante];
