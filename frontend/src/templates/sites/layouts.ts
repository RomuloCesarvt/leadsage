/**
 * Os layouts propriamente ditos.
 *
 * Cada um é uma estrutura diferente, não uma troca de cor: mudam a
 * composição do topo, a ordem das seções e o peso do contato. Os nichos
 * declarados servem para a galeria sugerir o layout certo para o lead.
 */
import type { SiteData, SiteTemplate } from './base';
import {
  documento,
  esc,
  marca,
  rodape,
  digitos,
  linkWhatsapp,
  linkInstagram,
} from './base';

const cartoesServico = (d: SiteData): string =>
  d.servicos
    .filter(s => s.titulo.trim())
    .map(
      (s, i) => `<article class="cartao">
      <span class="cartao-num">${String(i + 1).padStart(2, '0')}</span>
      <h3>${esc(s.titulo)}</h3>
      <p>${esc(s.descricao)}</p>
    </article>`
    )
    .join('\n') || `<p style="grid-column:1/-1;text-align:center;color:#6b7280">Adicione os serviços no editor.</p>`;

const botoesContato = (d: SiteData, classe = 'btn-principal'): string => {
  const zap = linkWhatsapp(d.whatsapp || d.telefone, d.empresa);
  const tel = digitos(d.telefone);
  return `
    ${zap ? `<a class="btn ${classe}" href="${zap}" target="_blank" rel="noopener">Falar no WhatsApp</a>` : ''}
    ${tel ? `<a class="btn btn-vazado" href="tel:+${tel}">Ligar agora</a>` : ''}`;
};

/* ------------------------------------------------------------------ 1 */

const vitrine: SiteTemplate = {
  id: 'vitrine',
  nome: 'Vitrine',
  descricao: 'Topo com destaque grande e grade de produtos. Feito para quem vende presencialmente.',
  nichos: ['Padarias', 'Restaurantes', 'Pizzarias', 'Cafeterias', 'Lojas', 'Pet Shops', 'Floriculturas'],
  miniatura: ({ corPrimaria, corDestaque }) => `
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="120" fill="#fff"/>
      <rect width="160" height="14" fill="${corPrimaria}"/>
      <rect x="0" y="14" width="160" height="46" fill="${corPrimaria}" opacity="0.18"/>
      <rect x="12" y="26" width="62" height="7" rx="3" fill="${corPrimaria}"/>
      <rect x="12" y="38" width="44" height="5" rx="2" fill="#cbd5e1"/>
      <rect x="12" y="48" width="30" height="8" rx="4" fill="${corDestaque}"/>
      <rect x="12" y="70" width="40" height="30" rx="4" fill="#e2e8f0"/>
      <rect x="60" y="70" width="40" height="30" rx="4" fill="#e2e8f0"/>
      <rect x="108" y="70" width="40" height="30" rx="4" fill="#e2e8f0"/>
      <rect x="0" y="108" width="160" height="12" fill="#0f172a"/>
    </svg>`,
  render: d =>
    documento(
      d,
      `
.topo{position:sticky;top:0;background:#fff;border-bottom:1px solid var(--linha);z-index:40}
.topo .container{display:flex;align-items:center;justify-content:space-between;padding:14px 0;gap:16px}
.heroi{background:linear-gradient(140deg,var(--primaria),var(--primaria-escura));color:var(--sobre-primaria);
  padding:96px 0;text-align:center}
.heroi h1{font-size:clamp(32px,6vw,56px);margin-bottom:16px}
.heroi p{font-size:clamp(16px,2.2vw,20px);opacity:.92;max-width:620px;margin:0 auto 32px}
.heroi .btn-vazado{color:var(--sobre-primaria);border-color:var(--sobre-primaria)}
.grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px}
.cartao{background:#fff;border:1px solid var(--linha);border-radius:18px;padding:28px;position:relative}
.cartao-num{color:var(--destaque);font-weight:800;font-size:13px;letter-spacing:2px}
.cartao h3{font-size:19px;margin:10px 0 8px}
.cartao p{color:var(--tinta-suave);margin:0}
.faixa{background:var(--destaque);color:var(--sobre-destaque);padding:20px 0;text-align:center;font-weight:700}
.info{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;text-align:center}
.info h3{font-size:15px;text-transform:uppercase;letter-spacing:1px;color:var(--primaria)}
`,
      `
<header class="topo">
  <div class="container">
    <a class="marca" href="#">${marca(d, 40)}<span>${esc(d.empresa)}</span></a>
    ${digitos(d.telefone) ? `<a class="btn btn-principal" style="padding:10px 20px" href="tel:+${digitos(d.telefone)}">${esc(d.telefone)}</a>` : ''}
  </div>
</header>

<section class="heroi">
  <div class="container">
    <h1>${esc(d.slogan || d.empresa)}</h1>
    <p>${esc(d.sobre)}</p>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">${botoesContato(d, 'btn-destaque')}</div>
  </div>
</section>

${d.horario ? `<div class="faixa">${esc(d.horario)}</div>` : ''}

<section class="secao">
  <div class="container">
    <h2 class="titulo-secao">O que oferecemos</h2>
    <p class="sub-secao">Conheça o que preparamos para você.</p>
    <div class="grade">${cartoesServico(d)}</div>
  </div>
</section>

<section class="secao secao-suave">
  <div class="container info">
    ${d.endereco ? `<div><h3>Endereço</h3><p>${esc(d.endereco)}</p></div>` : ''}
    ${d.telefone ? `<div><h3>Telefone</h3><p>${esc(d.telefone)}</p></div>` : ''}
    ${d.horario ? `<div><h3>Horário</h3><p>${esc(d.horario)}</p></div>` : ''}
  </div>
</section>

${rodape(d)}`
    ),
};

/* ------------------------------------------------------------------ 2 */

const profissional: SiteTemplate = {
  id: 'profissional',
  nome: 'Profissional',
  descricao: 'Topo dividido, tom sóbrio e chamada para agendamento. Para quem vende confiança.',
  nichos: ['Clínicas Médicas', 'Clínicas Odontológicas', 'Advogados', 'Contabilidades', 'Consultorias', 'Nutricionistas', 'Fisioterapeutas'],
  miniatura: ({ corPrimaria, corDestaque }) => `
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="120" fill="#fff"/>
      <rect width="160" height="14" fill="#fff" stroke="#e2e8f0"/>
      <rect x="8" y="4" width="30" height="6" rx="3" fill="${corPrimaria}"/>
      <rect x="0" y="14" width="88" height="52" fill="#fff"/>
      <rect x="10" y="26" width="60" height="8" rx="3" fill="${corPrimaria}"/>
      <rect x="10" y="40" width="48" height="4" rx="2" fill="#cbd5e1"/>
      <rect x="10" y="50" width="34" height="8" rx="4" fill="${corDestaque}"/>
      <rect x="88" y="14" width="72" height="52" fill="${corPrimaria}" opacity="0.25"/>
      <rect x="10" y="76" width="140" height="4" rx="2" fill="#e2e8f0"/>
      <rect x="10" y="86" width="44" height="14" rx="3" fill="#f1f5f9"/>
      <rect x="58" y="86" width="44" height="14" rx="3" fill="#f1f5f9"/>
      <rect x="106" y="86" width="44" height="14" rx="3" fill="#f1f5f9"/>
      <rect x="0" y="108" width="160" height="12" fill="#0f172a"/>
    </svg>`,
  render: d =>
    documento(
      d,
      `
.topo{background:#fff;border-bottom:1px solid var(--linha)}
.topo .container{display:flex;align-items:center;justify-content:space-between;padding:18px 0;gap:16px}
.heroi{display:grid;grid-template-columns:1.1fr .9fr;min-height:460px;align-items:center}
.heroi-texto{padding:72px 0 72px max(4vw,calc((100vw - 1120px)/2))}
.heroi-texto .rotulo{color:var(--destaque);font-weight:800;letter-spacing:2px;text-transform:uppercase;font-size:13px}
.heroi-texto h1{font-size:clamp(30px,4.4vw,46px);margin:12px 0 18px}
.heroi-texto p{color:var(--tinta-suave);font-size:17px;max-width:520px}
.heroi-arte{align-self:stretch;background:linear-gradient(160deg,var(--primaria),var(--primaria-escura));
  display:flex;align-items:center;justify-content:center;color:var(--sobre-primaria);padding:40px}
.heroi-arte .selo{text-align:center}
.heroi-arte .selo strong{display:block;font-size:44px;line-height:1}
.grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}
.cartao{border:1px solid var(--linha);border-radius:14px;padding:26px;background:#fff}
.cartao-num{display:none}
.cartao h3{font-size:18px;color:var(--primaria)}
.cartao p{color:var(--tinta-suave);margin:0}
.cta{background:var(--primaria);color:var(--sobre-primaria);text-align:center;padding:72px 0}
.cta h2{font-size:clamp(24px,3.4vw,34px)}
.cta .btn-vazado{color:var(--sobre-primaria);border-color:var(--sobre-primaria)}
@media(max-width:860px){
  .heroi{grid-template-columns:1fr}
  .heroi-texto{padding:56px 4vw}
  .heroi-arte{min-height:200px}
}
`,
      `
<header class="topo">
  <div class="container">
    <a class="marca" href="#">${marca(d, 42)}<span>${esc(d.empresa)}</span></a>
    ${linkWhatsapp(d.whatsapp || d.telefone, d.empresa) ? `<a class="btn btn-principal" style="padding:11px 22px" href="${linkWhatsapp(d.whatsapp || d.telefone, d.empresa)}" target="_blank" rel="noopener">Agendar</a>` : ''}
  </div>
</header>

<section class="heroi">
  <div class="heroi-texto">
    <span class="rotulo">${esc(d.categoria || 'Atendimento especializado')}</span>
    <h1>${esc(d.slogan || d.empresa)}</h1>
    <p>${esc(d.sobre)}</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:28px">${botoesContato(d)}</div>
  </div>
  <div class="heroi-arte">
    <div class="selo">
      ${marca(d, 72)}
      <strong style="margin-top:16px">${esc(d.empresa.split(/\s+/)[0])}</strong>
      <span style="opacity:.85">${esc(d.categoria)}</span>
    </div>
  </div>
</section>

<section class="secao">
  <div class="container">
    <h2 class="titulo-secao">Como podemos ajudar</h2>
    <p class="sub-secao">Serviços pensados para o seu caso.</p>
    <div class="grade">${cartoesServico(d)}</div>
  </div>
</section>

<section class="cta">
  <div class="container">
    <h2>Vamos conversar?</h2>
    <p style="opacity:.9;max-width:520px;margin:0 auto 28px">
      ${d.horario ? esc(d.horario) : 'Entre em contato e agende um horário.'}
    </p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">${botoesContato(d, 'btn-destaque')}</div>
  </div>
</section>

${rodape(d)}`
    ),
};

/* ------------------------------------------------------------------ 3 */

const servicoLocal: SiteTemplate = {
  id: 'servico-local',
  nome: 'Serviço Local',
  descricao: 'Telefone em evidência do topo ao rodapé. Para quem é chamado com urgência.',
  nichos: ['Mecânicas', 'Oficinas', 'Empreiteiras', 'Materiais de Construção', 'Chaveiros', 'Transportadoras', 'Marcenarias'],
  miniatura: ({ corPrimaria, corDestaque }) => `
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="120" fill="#fff"/>
      <rect width="160" height="20" fill="${corDestaque}"/>
      <rect x="52" y="7" width="56" height="6" rx="3" fill="#fff" opacity="0.85"/>
      <rect x="0" y="20" width="160" height="40" fill="${corPrimaria}"/>
      <rect x="12" y="30" width="76" height="9" rx="4" fill="#fff" opacity="0.9"/>
      <rect x="12" y="44" width="40" height="9" rx="4" fill="${corDestaque}"/>
      <rect x="12" y="68" width="66" height="30" rx="4" fill="#f1f5f9"/>
      <rect x="86" y="68" width="62" height="30" rx="4" fill="#f1f5f9"/>
      <rect x="0" y="108" width="160" height="12" fill="#0f172a"/>
    </svg>`,
  render: d =>
    documento(
      d,
      `
.barra{background:var(--destaque);color:var(--sobre-destaque);text-align:center;padding:11px 0;font-weight:700;font-size:15px}
.barra a{text-decoration:none}
.topo{background:var(--primaria);color:var(--sobre-primaria)}
.topo .container{display:flex;align-items:center;justify-content:space-between;padding:22px 0;gap:16px;flex-wrap:wrap}
.heroi{background:var(--primaria);color:var(--sobre-primaria);padding:32px 0 88px}
.heroi h1{font-size:clamp(30px,5vw,50px);max-width:760px}
.heroi p{font-size:18px;opacity:.92;max-width:600px}
.heroi .btn-vazado{color:var(--sobre-primaria);border-color:var(--sobre-primaria)}
.grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:20px}
.cartao{background:#fff;border-left:4px solid var(--destaque);border-radius:0 14px 14px 0;padding:24px;
  box-shadow:0 1px 3px rgba(0,0,0,.06)}
.cartao-num{color:var(--destaque);font-weight:800;font-size:12px;letter-spacing:2px}
.cartao h3{font-size:18px;margin:8px 0 6px}
.cartao p{color:var(--tinta-suave);margin:0}
.destaque-tel{background:#0f172a;color:#fff;text-align:center;padding:64px 0}
.destaque-tel .numero{font-size:clamp(28px,5vw,46px);font-weight:800;color:var(--destaque);text-decoration:none;display:block;margin:8px 0 22px}
`,
      `
${digitos(d.telefone) ? `<div class="barra"><a href="tel:+${digitos(d.telefone)}">Atendimento: ${esc(d.telefone)}</a></div>` : ''}

<header class="topo">
  <div class="container">
    <a class="marca" href="#" style="color:var(--sobre-primaria)">${marca(d, 40)}<span>${esc(d.empresa)}</span></a>
    ${d.endereco ? `<span style="opacity:.9;font-size:14px">${esc(d.endereco)}</span>` : ''}
  </div>
</header>

<section class="heroi">
  <div class="container">
    <h1>${esc(d.slogan || d.empresa)}</h1>
    <p>${esc(d.sobre)}</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:26px">${botoesContato(d, 'btn-destaque')}</div>
  </div>
</section>

<section class="secao">
  <div class="container">
    <h2 class="titulo-secao">Nossos serviços</h2>
    <p class="sub-secao">Resolvemos com rapidez e sem enrolação.</p>
    <div class="grade">${cartoesServico(d)}</div>
  </div>
</section>

${
  digitos(d.telefone)
    ? `<section class="destaque-tel">
  <div class="container">
    <span style="opacity:.8;letter-spacing:2px;text-transform:uppercase;font-size:13px">Precisa agora?</span>
    <a class="numero" href="tel:+${digitos(d.telefone)}">${esc(d.telefone)}</a>
    ${d.horario ? `<p style="color:#94a3b8;margin:0">${esc(d.horario)}</p>` : ''}
  </div>
</section>`
    : ''
}

${rodape(d)}`
    ),
};

/* ------------------------------------------------------------------ 4 */

const essencial: SiteTemplate = {
  id: 'essencial',
  nome: 'Essencial',
  descricao: 'Uma página só, direta ao ponto. Boa como prévia rápida para mostrar ao cliente.',
  nichos: ['Barbearias', 'Salões de Beleza', 'Academias', 'Estúdios', 'Fotógrafos', 'Designers'],
  miniatura: ({ corPrimaria, corDestaque }) => `
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="120" fill="#0f172a"/>
      <circle cx="80" cy="34" r="15" fill="${corPrimaria}"/>
      <rect x="46" y="58" width="68" height="8" rx="4" fill="#fff" opacity="0.9"/>
      <rect x="56" y="72" width="48" height="4" rx="2" fill="#64748b"/>
      <rect x="54" y="84" width="52" height="10" rx="5" fill="${corDestaque}"/>
      <rect x="20" y="102" width="30" height="4" rx="2" fill="#334155"/>
      <rect x="65" y="102" width="30" height="4" rx="2" fill="#334155"/>
      <rect x="110" y="102" width="30" height="4" rx="2" fill="#334155"/>
    </svg>`,
  render: d =>
    documento(
      d,
      `
body{background:#0f172a;color:#e2e8f0}
/* Fundo escuro: o botão vazado herdaria a cor primária, que aqui fica
   escuro sobre escuro e some. Força o traço claro. */
.btn-vazado{color:#e2e8f0;border-color:rgba(226,232,240,.5)}
.btn-vazado:hover{border-color:#e2e8f0}
.capa{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
  text-align:center;padding:64px 5vw;
  background:radial-gradient(circle at 50% 0%,var(--primaria) 0%,transparent 60%),#0f172a}
.capa h1{font-size:clamp(32px,7vw,60px);margin:28px 0 14px;color:#fff}
.capa p{font-size:clamp(16px,2.4vw,20px);color:#cbd5e1;max-width:560px;margin:0 auto 34px}
.lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;
  width:min(900px,92vw);margin:56px auto 0}
.cartao{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:22px;text-align:left}
.cartao-num{color:var(--destaque);font-weight:800;font-size:12px;letter-spacing:2px}
.cartao h3{font-size:17px;color:#fff;margin:8px 0 6px}
.cartao p{color:#94a3b8;margin:0;font-size:14px}
.contatos{display:flex;flex-wrap:wrap;gap:28px;justify-content:center;margin-top:56px;color:#94a3b8;font-size:14px}
.contatos a{color:#e2e8f0;text-decoration:none}
.rodape{background:transparent;border-top:1px solid rgba(255,255,255,.08)}
`,
      `
<main class="capa">
  ${marca(d, 76)}
  <h1>${esc(d.empresa)}</h1>
  <p>${esc(d.slogan || d.sobre)}</p>
  <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">${botoesContato(d, 'btn-destaque')}</div>

  <div class="lista">${cartoesServico(d)}</div>

  <div class="contatos">
    ${digitos(d.telefone) ? `<a href="tel:+${digitos(d.telefone)}">${esc(d.telefone)}</a>` : ''}
    ${d.email ? `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : ''}
    ${linkInstagram(d.instagram) ? `<a href="${linkInstagram(d.instagram)}" target="_blank" rel="noopener">${esc(d.instagram)}</a>` : ''}
    ${d.endereco ? `<span>${esc(d.endereco)}</span>` : ''}
    ${d.horario ? `<span>${esc(d.horario)}</span>` : ''}
  </div>
</main>

${rodape(d)}`
    ),
};

export const SITE_TEMPLATES: SiteTemplate[] = [vitrine, profissional, servicoLocal, essencial];

/** Sugere o layout mais adequado ao nicho do lead. */
export const sugerirTemplate = (nicho: string): SiteTemplate => {
  const alvo = (nicho || '').toLowerCase();
  const achado = SITE_TEMPLATES.find(t =>
    t.nichos.some(n => alvo.includes(n.toLowerCase()) || n.toLowerCase().includes(alvo))
  );
  return achado || SITE_TEMPLATES[0];
};
