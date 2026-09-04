/**
 * Os layouts propriamente ditos.
 *
 * Não são variações de cor: mudam a composição do topo, a ordem das
 * seções, o peso do contato e o que cada um mostra. Um site de padaria
 * precisa de foto e vitrine; um de advogado precisa de sobriedade e
 * credencial; uma oficina precisa do telefone gritando na primeira tela.
 *
 * Todos geram HTML autocontido — CSS embutido, sem CDN, sem fonte remota
 * e sem JavaScript de terceiros. O site publicado tem que abrir sozinho
 * na mão do cliente do usuário.
 */
import type { SiteData, SiteTemplate } from './base';
import {
  cssMidia,
  depoimentos,
  digitos,
  documento,
  esc,
  fundoDeCapa,
  galeria,
  linkInstagram,
  linkWhatsapp,
  marca,
  rodape,
  temGaleria,
} from './base';

const servicosValidos = (d: SiteData) => d.servicos.filter(s => s.titulo.trim());

const temDepoimento = (d: SiteData) => (d.depoimentos || []).some(x => x.texto?.trim());

const vazio = (texto: string) =>
  `<p style="grid-column:1/-1;text-align:center;color:#9ca3af">${texto}</p>`;

const botoesContato = (d: SiteData, classe = 'btn-principal'): string => {
  const zap = linkWhatsapp(d.whatsapp || d.telefone, d.empresa);
  const tel = digitos(d.telefone);
  return `
    ${zap ? `<a class="btn ${classe}" href="${zap}" target="_blank" rel="noopener">Falar no WhatsApp</a>` : ''}
    ${tel ? `<a class="btn btn-vazado" href="tel:+${tel}">Ligar agora</a>` : ''}`;
};

const fotoOuTextura = (src: string | undefined, d: SiteData, alt: string) =>
  src
    ? `<img src="${src}" alt="${esc(alt)}">`
    : `<div style="width:100%;height:100%;${fundoDeCapa({ ...d, capa: undefined })}"></div>`;

/* ============================================================ 1. VITRINE */

const vitrine: SiteTemplate = {
  id: 'vitrine',
  nome: 'Vitrine',
  descricao: 'Foto grande no topo, produtos em destaque e prova social. Para quem vende olhando o cliente.',
  nichos: ['Padarias', 'Restaurantes', 'Pizzarias', 'Cafeterias', 'Lojas', 'Pet Shops', 'Floriculturas'],
  miniatura: ({ corPrimaria, corDestaque }) => `
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="120" fill="#fff"/>
      <rect width="160" height="11" fill="#fff" stroke="#e5e7eb" stroke-width="0.5"/>
      <circle cx="11" cy="5.5" r="3.2" fill="${corPrimaria}"/>
      <rect x="122" y="3" width="28" height="5.5" rx="2.75" fill="${corPrimaria}"/>
      <rect x="0" y="11" width="160" height="48" fill="${corPrimaria}"/>
      <rect x="0" y="11" width="160" height="48" fill="#000" opacity="0.22"/>
      <rect x="13" y="20" width="34" height="6" rx="3" fill="#fff" opacity="0.35"/>
      <rect x="13" y="31" width="78" height="8" rx="4" fill="#fff" opacity="0.95"/>
      <rect x="13" y="45" width="28" height="7" rx="3.5" fill="${corDestaque}"/>
      <rect x="0" y="59" width="160" height="10" fill="${corPrimaria}" opacity="0.85"/>
      <rect x="13" y="76" width="31" height="21" rx="3" fill="#eef0f3"/>
      <rect x="46" y="76" width="31" height="21" rx="3" fill="#eef0f3"/>
      <rect x="79" y="76" width="31" height="21" rx="3" fill="#eef0f3"/>
      <rect x="112" y="76" width="31" height="21" rx="3" fill="#eef0f3"/>
      <rect x="0" y="104" width="160" height="16" fill="#0f172a"/>
    </svg>`,
  render: d =>
    documento(
      d,
      cssMidia + `
.topo{position:sticky;top:0;background:rgba(255,255,255,.9);backdrop-filter:blur(12px);
  border-bottom:1px solid var(--linha);z-index:40}
.topo .container{display:flex;align-items:center;justify-content:space-between;padding:14px 0;gap:16px}

.heroi{position:relative;min-height:min(76vh,620px);display:flex;align-items:flex-end;
  color:#fff;padding-bottom:clamp(44px,7vw,84px)}
.heroi .container{position:relative;z-index:2}
.heroi .etiqueta{display:inline-block;background:rgba(255,255,255,.15);
  border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(6px);
  padding:7px 16px;border-radius:999px;font-size:13px;font-weight:600;margin-bottom:20px}
.heroi h1{font-size:clamp(34px,6.2vw,62px);letter-spacing:-1.4px;max-width:16ch;
  text-shadow:0 2px 24px rgba(0,0,0,.35);margin-bottom:18px}
.heroi p{font-size:clamp(16px,2vw,20px);max-width:52ch;opacity:.95;margin-bottom:32px}
.heroi .btn-vazado{color:#fff;border-color:rgba(255,255,255,.55)}

.tiras{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
  background:var(--primaria);color:var(--sobre-primaria)}
.tiras div{padding:22px 20px;text-align:center;border-right:1px solid rgba(255,255,255,.16)}
.tiras div:last-child{border-right:0}
.tiras strong{display:block;font-size:12px;letter-spacing:1.6px;text-transform:uppercase;
  opacity:.7;margin-bottom:5px}

.grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:22px}
.cartao{background:#fff;border:1px solid var(--linha);border-radius:20px;padding:30px 26px;
  position:relative;overflow:hidden;transition:transform .25s ease,box-shadow .25s ease}
.cartao::before{content:'';position:absolute;top:0;left:0;width:100%;height:3px;
  background:var(--destaque);transform:scaleX(0);transform-origin:left;transition:transform .3s ease}
.cartao:hover{transform:translateY(-4px);box-shadow:0 20px 44px -24px rgba(16,24,40,.4)}
.cartao:hover::before{transform:scaleX(1)}
.cartao-num{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;
  border-radius:12px;background:var(--primaria-clara);color:var(--primaria);
  font-weight:800;font-size:14px;margin-bottom:16px}
.cartao h3{font-size:19px;margin:0 0 8px}
.cartao p{color:var(--tinta-suave);margin:0;font-size:15px}

.sobre{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,64px);align-items:center}
.sobre figure{aspect-ratio:4/3;box-shadow:0 34px 64px -34px rgba(16,24,40,.45)}
.sobre .selo{display:inline-block;background:var(--destaque);color:var(--sobre-destaque);
  padding:6px 14px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:1.2px;
  text-transform:uppercase;margin-bottom:14px}
.sobre h2{font-size:clamp(26px,3.6vw,38px);text-align:left;margin-bottom:14px}
.sobre p{color:var(--tinta-suave);font-size:16.5px}
.sobre .dado{margin:0 0 4px;font-size:15px}

.chamada{background:linear-gradient(135deg,var(--primaria),var(--primaria-escura));
  color:var(--sobre-primaria);text-align:center;padding:clamp(56px,8vw,86px) 0}
.chamada h2{font-size:clamp(26px,4vw,40px);margin-bottom:12px}
.chamada p{opacity:.9;max-width:46ch;margin:0 auto 30px}
.chamada .btn-vazado{color:var(--sobre-primaria);border-color:var(--sobre-primaria)}

@media(max-width:820px){
  .sobre{grid-template-columns:1fr}
  .heroi{min-height:66vh}
}
`,
      `
<header class="topo">
  <div class="container">
    <a class="marca" href="#">${marca(d, 40)}<span>${esc(d.empresa)}</span></a>
    ${digitos(d.telefone) ? `<a class="btn btn-principal" style="padding:10px 20px" href="tel:+${digitos(d.telefone)}">${esc(d.telefone)}</a>` : ''}
  </div>
</header>

<section class="heroi" style="${fundoDeCapa(d)}">
  <div class="container">
    ${d.categoria ? `<span class="etiqueta">${esc(d.categoria)}${d.endereco ? ` &middot; ${esc(d.endereco.split(',')[0])}` : ''}</span>` : ''}
    <h1>${esc(d.slogan || d.empresa)}</h1>
    ${d.sobre ? `<p>${esc(d.sobre)}</p>` : ''}
    <div style="display:flex;gap:14px;flex-wrap:wrap">${botoesContato(d, 'btn-destaque')}</div>
  </div>
</section>

<div class="tiras">
  ${d.horario ? `<div><strong>Horário</strong>${esc(d.horario)}</div>` : ''}
  ${d.endereco ? `<div><strong>Onde estamos</strong>${esc(d.endereco)}</div>` : ''}
  ${d.telefone ? `<div><strong>Pedidos</strong>${esc(d.telefone)}</div>` : ''}
</div>

<section class="secao">
  <div class="container">
    <h2 class="titulo-secao">O que oferecemos</h2>
    <p class="sub-secao">Feito todo dia, do jeito que o cliente espera.</p>
    <div class="grade">
      ${servicosValidos(d).map((s, i) => `<article class="cartao">
        <span class="cartao-num">${String(i + 1).padStart(2, '0')}</span>
        <h3>${esc(s.titulo)}</h3>
        <p>${esc(s.descricao)}</p>
      </article>`).join('') || vazio('Adicione os serviços no editor.')}
    </div>
  </div>
</section>

${temGaleria(d) ? `<section class="secao secao-suave">
  <div class="container">
    <h2 class="titulo-secao">Um pouco do nosso trabalho</h2>
    <p class="sub-secao">Imagens reais de quem faz.</p>
    ${galeria(d)}
  </div>
</section>` : ''}

<section class="secao">
  <div class="container sobre">
    <figure>${fotoOuTextura(d.fotoSobre, d, d.empresa)}</figure>
    <div>
      <span class="selo">Sobre nós</span>
      <h2>${esc(d.empresa)}</h2>
      ${d.sobre ? `<p>${esc(d.sobre)}</p>` : ''}
      ${d.endereco ? `<p class="dado"><strong>Onde:</strong> ${esc(d.endereco)}</p>` : ''}
      ${d.horario ? `<p class="dado"><strong>Quando:</strong> ${esc(d.horario)}</p>` : ''}
    </div>
  </div>
</section>

${temDepoimento(d) ? `<section class="secao secao-suave">
  <div class="container">
    <h2 class="titulo-secao">Quem já provou</h2>
    <p class="sub-secao">O que dizem nossos clientes.</p>
    ${depoimentos(d)}
  </div>
</section>` : ''}

<section class="chamada">
  <div class="container">
    <h2>Vamos fazer o seu pedido?</h2>
    <p>${d.horario ? esc(d.horario) : 'Chame no WhatsApp e a gente responde na hora.'}</p>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">${botoesContato(d, 'btn-destaque')}</div>
  </div>
</section>

${rodape(d)}`
    ),
};

/* ======================================================= 2. PROFISSIONAL */

const profissional: SiteTemplate = {
  id: 'profissional',
  nome: 'Profissional',
  descricao: 'Topo dividido com foto, credenciais em destaque e agendamento. Para quem vende confiança.',
  nichos: ['Clínicas Médicas', 'Clínicas Odontológicas', 'Advogados', 'Contabilidades', 'Consultorias', 'Nutricionistas', 'Fisioterapeutas'],
  miniatura: ({ corPrimaria, corDestaque }) => `
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="120" fill="#fff"/>
      <rect width="160" height="12" fill="#fff" stroke="#e5e7eb" stroke-width="0.5"/>
      <rect x="10" y="4" width="26" height="5" rx="2.5" fill="${corPrimaria}"/>
      <rect x="120" y="3" width="30" height="6" rx="3" fill="${corPrimaria}"/>
      <rect x="10" y="24" width="20" height="4" rx="2" fill="${corDestaque}"/>
      <rect x="10" y="33" width="62" height="8" rx="4" fill="#1f2937"/>
      <rect x="10" y="46" width="52" height="3.5" rx="1.75" fill="#cbd5e1"/>
      <rect x="10" y="53" width="40" height="3.5" rx="1.75" fill="#cbd5e1"/>
      <rect x="10" y="63" width="32" height="7" rx="3.5" fill="${corPrimaria}"/>
      <rect x="88" y="20" width="62" height="56" rx="6" fill="${corPrimaria}" opacity="0.3"/>
      <rect x="0" y="84" width="160" height="9" fill="#f3f4f6"/>
      <rect x="10" y="86.5" width="26" height="4" rx="2" fill="#9ca3af"/>
      <rect x="46" y="86.5" width="26" height="4" rx="2" fill="#9ca3af"/>
      <rect x="82" y="86.5" width="26" height="4" rx="2" fill="#9ca3af"/>
      <rect x="0" y="100" width="160" height="20" fill="${corPrimaria}"/>
    </svg>`,
  render: d =>
    documento(
      d,
      cssMidia + `
.topo{background:#fff;border-bottom:1px solid var(--linha);position:sticky;top:0;z-index:40}
.topo .container{display:flex;align-items:center;justify-content:space-between;padding:18px 0;gap:16px}

.heroi{display:grid;grid-template-columns:1.05fr .95fr;align-items:center;
  gap:clamp(28px,5vw,60px);padding:clamp(52px,7vw,86px) 0}
.heroi .rotulo{color:var(--destaque);font-weight:800;letter-spacing:2px;
  text-transform:uppercase;font-size:12.5px}
.heroi h1{font-size:clamp(30px,4.4vw,50px);letter-spacing:-1px;margin:14px 0 18px}
.heroi p{color:var(--tinta-suave);font-size:17.5px;max-width:50ch;margin-bottom:30px}
.heroi figure{aspect-ratio:4/5;border-radius:24px;
  box-shadow:0 40px 70px -40px rgba(16,24,40,.5)}

.credenciais{background:var(--fundo-suave);border-top:1px solid var(--linha);
  border-bottom:1px solid var(--linha)}
.credenciais .container{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
  gap:6px;padding:26px 0}
.credenciais div{padding:8px 20px;border-left:3px solid var(--destaque)}
.credenciais strong{display:block;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;
  color:var(--primaria);margin-bottom:3px}
.credenciais span{color:var(--tinta-suave);font-size:15px}

.lista-servicos{display:grid;gap:2px;background:var(--linha);
  border:1px solid var(--linha);border-radius:20px;overflow:hidden}
.lista-servicos article{background:#fff;padding:28px 30px;display:grid;
  grid-template-columns:auto 1fr;gap:22px;align-items:start;transition:background .2s ease}
.lista-servicos article:hover{background:var(--fundo-suave)}
.lista-servicos .marcador{width:42px;height:42px;border-radius:50%;background:var(--primaria);
  color:var(--sobre-primaria);display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:15px}
.lista-servicos h3{font-size:18px;margin:0 0 6px;color:var(--primaria)}
.lista-servicos p{color:var(--tinta-suave);margin:0;font-size:15.5px}

.sobre{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(28px,5vw,60px);align-items:center}
.sobre figure{aspect-ratio:1;border-radius:24px;box-shadow:0 30px 60px -34px rgba(16,24,40,.4)}
.sobre h2{text-align:left;font-size:clamp(25px,3.4vw,36px)}
.sobre p{color:var(--tinta-suave);font-size:16.5px}

.cta{background:var(--primaria);color:var(--sobre-primaria);text-align:center;
  padding:clamp(56px,8vw,84px) 0}
.cta h2{font-size:clamp(26px,3.8vw,38px)}
.cta p{opacity:.9;max-width:46ch;margin:0 auto 28px}
.cta .btn-vazado{color:var(--sobre-primaria);border-color:var(--sobre-primaria)}

@media(max-width:880px){
  .heroi,.sobre{grid-template-columns:1fr}
  .heroi figure{aspect-ratio:16/10;order:-1}
}
`,
      `
<header class="topo">
  <div class="container">
    <a class="marca" href="#">${marca(d, 42)}<span>${esc(d.empresa)}</span></a>
    ${linkWhatsapp(d.whatsapp || d.telefone, d.empresa)
      ? `<a class="btn btn-principal" style="padding:11px 22px" href="${linkWhatsapp(d.whatsapp || d.telefone, d.empresa)}" target="_blank" rel="noopener">Agendar</a>`
      : ''}
  </div>
</header>

<section class="container heroi">
  <div>
    <span class="rotulo">${esc(d.categoria || 'Atendimento especializado')}</span>
    <h1>${esc(d.slogan || d.empresa)}</h1>
    ${d.sobre ? `<p>${esc(d.sobre)}</p>` : ''}
    <div style="display:flex;gap:12px;flex-wrap:wrap">${botoesContato(d)}</div>
  </div>
  <figure>${fotoOuTextura(d.capa, d, d.empresa)}</figure>
</section>

<div class="credenciais">
  <div class="container">
    ${d.endereco ? `<div><strong>Endereço</strong><span>${esc(d.endereco)}</span></div>` : ''}
    ${d.horario ? `<div><strong>Atendimento</strong><span>${esc(d.horario)}</span></div>` : ''}
    ${d.telefone ? `<div><strong>Contato</strong><span>${esc(d.telefone)}</span></div>` : ''}
  </div>
</div>

<section class="secao">
  <div class="container">
    <h2 class="titulo-secao">Como podemos ajudar</h2>
    <p class="sub-secao">Serviços pensados para o seu caso.</p>
    <div class="lista-servicos">
      ${servicosValidos(d).map((s, i) => `<article>
        <span class="marcador">${String(i + 1).padStart(2, '0')}</span>
        <div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>
      </article>`).join('') || `<article><div>${vazio('Adicione os serviços no editor.')}</div></article>`}
    </div>
  </div>
</section>

<section class="secao secao-suave">
  <div class="container sobre">
    <figure>${fotoOuTextura(d.fotoSobre, d, d.empresa)}</figure>
    <div>
      <h2>Sobre ${esc(d.empresa)}</h2>
      ${d.sobre ? `<p>${esc(d.sobre)}</p>` : ''}
      ${linkInstagram(d.instagram) ? `<p><a href="${linkInstagram(d.instagram)}" target="_blank" rel="noopener" style="color:var(--primaria);font-weight:700">${esc(d.instagram)}</a></p>` : ''}
    </div>
  </div>
</section>

${temGaleria(d) ? `<section class="secao">
  <div class="container">
    <h2 class="titulo-secao">Nossa estrutura</h2>
    <p class="sub-secao">Onde você será atendido.</p>
    ${galeria(d)}
  </div>
</section>` : ''}

${temDepoimento(d) ? `<section class="secao secao-suave">
  <div class="container">
    <h2 class="titulo-secao">Quem já foi atendido</h2>
    <p class="sub-secao">Relatos de pacientes e clientes.</p>
    ${depoimentos(d)}
  </div>
</section>` : ''}

<section class="cta">
  <div class="container">
    <h2>Vamos conversar?</h2>
    <p>${d.horario ? esc(d.horario) : 'Entre em contato e agende um horário.'}</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">${botoesContato(d, 'btn-destaque')}</div>
  </div>
</section>

${rodape(d)}`
    ),
};

/* ====================================================== 3. SERVIÇO LOCAL */

const servicoLocal: SiteTemplate = {
  id: 'servico-local',
  nome: 'Serviço Local',
  descricao: 'Telefone gritando do topo ao rodapé, com portfólio de trabalhos. Para quem é chamado com urgência.',
  nichos: ['Mecânicas', 'Oficinas', 'Empreiteiras', 'Materiais de Construção', 'Chaveiros', 'Transportadoras', 'Marcenarias'],
  miniatura: ({ corPrimaria, corDestaque }) => `
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="120" fill="#fff"/>
      <rect width="160" height="14" fill="${corDestaque}"/>
      <rect x="48" y="5" width="64" height="5" rx="2.5" fill="#fff" opacity="0.9"/>
      <rect x="0" y="14" width="160" height="46" fill="${corPrimaria}"/>
      <rect x="0" y="14" width="160" height="46" fill="#000" opacity="0.15"/>
      <rect x="12" y="24" width="86" height="9" rx="4" fill="#fff" opacity="0.95"/>
      <rect x="12" y="38" width="58" height="4" rx="2" fill="#fff" opacity="0.55"/>
      <rect x="12" y="47" width="36" height="7" rx="3.5" fill="${corDestaque}"/>
      <rect x="12" y="68" width="44" height="24" rx="3" fill="#f3f4f6"/>
      <rect x="12" y="68" width="3" height="24" fill="${corDestaque}"/>
      <rect x="60" y="68" width="44" height="24" rx="3" fill="#f3f4f6"/>
      <rect x="60" y="68" width="3" height="24" fill="${corDestaque}"/>
      <rect x="108" y="68" width="40" height="24" rx="3" fill="#f3f4f6"/>
      <rect x="108" y="68" width="3" height="24" fill="${corDestaque}"/>
      <rect x="0" y="98" width="160" height="22" fill="#0f172a"/>
      <rect x="46" y="105" width="68" height="8" rx="4" fill="${corDestaque}"/>
    </svg>`,
  render: d =>
    documento(
      d,
      cssMidia + `
.barra{background:var(--destaque);color:var(--sobre-destaque);text-align:center;
  padding:12px 0;font-weight:800;font-size:15px;letter-spacing:.3px}
.barra a{text-decoration:none}
.topo{background:var(--primaria);color:var(--sobre-primaria)}
.topo .container{display:flex;align-items:center;justify-content:space-between;
  padding:20px 0;gap:16px;flex-wrap:wrap}

.heroi{position:relative;color:#fff;padding:clamp(52px,8vw,96px) 0 clamp(60px,9vw,108px)}
.heroi .container{position:relative;z-index:2}
.heroi h1{font-size:clamp(32px,5.6vw,58px);max-width:18ch;letter-spacing:-1.2px;
  text-shadow:0 2px 20px rgba(0,0,0,.35)}
.heroi p{font-size:clamp(16px,2vw,19px);max-width:50ch;opacity:.95;margin-bottom:30px}
.heroi .btn-vazado{color:#fff;border-color:rgba(255,255,255,.55)}
.selos{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:22px}
.selos span{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.26);
  padding:6px 14px;border-radius:8px;font-size:13px;font-weight:600}

.grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
.cartao{background:#fff;border:1px solid var(--linha);border-left:4px solid var(--destaque);
  border-radius:0 16px 16px 0;padding:26px;transition:transform .2s ease,box-shadow .2s ease}
.cartao:hover{transform:translateX(4px);box-shadow:0 16px 34px -20px rgba(16,24,40,.4)}
.cartao-num{color:var(--destaque);font-weight:800;font-size:12px;letter-spacing:2px}
.cartao h3{font-size:18px;margin:8px 0 6px}
.cartao p{color:var(--tinta-suave);margin:0;font-size:15px}

.telefonao{background:#0f172a;color:#fff;text-align:center;padding:clamp(56px,8vw,80px) 0}
.telefonao .aviso{opacity:.7;letter-spacing:2.4px;text-transform:uppercase;font-size:12.5px}
.telefonao .numero{font-size:clamp(30px,6vw,56px);font-weight:900;color:var(--destaque);
  text-decoration:none;display:block;margin:12px 0 20px;letter-spacing:-1px}
.telefonao p{color:#94a3b8;margin:0}

.atendimento{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}
.atendimento div{background:#fff;border:1px solid var(--linha);border-radius:16px;padding:24px}
.atendimento strong{display:block;color:var(--primaria);font-size:12.5px;letter-spacing:1.4px;
  text-transform:uppercase;margin-bottom:6px}
`,
      `
${digitos(d.telefone) ? `<div class="barra"><a href="tel:+${digitos(d.telefone)}">Atendimento agora: ${esc(d.telefone)}</a></div>` : ''}

<header class="topo">
  <div class="container">
    <a class="marca" href="#" style="color:var(--sobre-primaria)">${marca(d, 40)}<span>${esc(d.empresa)}</span></a>
    ${d.horario ? `<span style="opacity:.9;font-size:14px">${esc(d.horario)}</span>` : ''}
  </div>
</header>

<section class="heroi" style="${fundoDeCapa(d)}">
  <div class="container">
    <div class="selos">
      ${d.categoria ? `<span>${esc(d.categoria)}</span>` : ''}
      ${d.endereco ? `<span>${esc(d.endereco.split(',')[0])}</span>` : ''}
      ${d.horario ? `<span>${esc(d.horario)}</span>` : ''}
    </div>
    <h1>${esc(d.slogan || d.empresa)}</h1>
    ${d.sobre ? `<p>${esc(d.sobre)}</p>` : ''}
    <div style="display:flex;gap:12px;flex-wrap:wrap">${botoesContato(d, 'btn-destaque')}</div>
  </div>
</section>

<section class="secao">
  <div class="container">
    <h2 class="titulo-secao">Nossos serviços</h2>
    <p class="sub-secao">Resolvemos com rapidez e sem enrolação.</p>
    <div class="grade">
      ${servicosValidos(d).map((s, i) => `<article class="cartao">
        <span class="cartao-num">${String(i + 1).padStart(2, '0')}</span>
        <h3>${esc(s.titulo)}</h3>
        <p>${esc(s.descricao)}</p>
      </article>`).join('') || vazio('Adicione os serviços no editor.')}
    </div>
  </div>
</section>

${temGaleria(d) ? `<section class="secao secao-suave">
  <div class="container">
    <h2 class="titulo-secao">Trabalhos que já fizemos</h2>
    <p class="sub-secao">Serviço entregue é o melhor argumento.</p>
    ${galeria(d)}
  </div>
</section>` : ''}

${digitos(d.telefone) ? `<section class="telefonao">
  <div class="container">
    <span class="aviso">Precisa agora?</span>
    <a class="numero" href="tel:+${digitos(d.telefone)}">${esc(d.telefone)}</a>
    ${d.horario ? `<p>${esc(d.horario)}</p>` : ''}
  </div>
</section>` : ''}

<section class="secao">
  <div class="container">
    <h2 class="titulo-secao">Onde atendemos</h2>
    <p class="sub-secao">Fale com a gente pelo canal que preferir.</p>
    <div class="atendimento">
      ${d.endereco ? `<div><strong>Endereço</strong>${esc(d.endereco)}</div>` : ''}
      ${d.telefone ? `<div><strong>Telefone</strong>${esc(d.telefone)}</div>` : ''}
      ${d.email ? `<div><strong>E-mail</strong>${esc(d.email)}</div>` : ''}
      ${d.horario ? `<div><strong>Horário</strong>${esc(d.horario)}</div>` : ''}
    </div>
  </div>
</section>

${temDepoimento(d) ? `<section class="secao secao-suave">
  <div class="container">
    <h2 class="titulo-secao">Quem já chamou</h2>
    <p class="sub-secao">Clientes que voltaram.</p>
    ${depoimentos(d)}
  </div>
</section>` : ''}

${rodape(d)}`
    ),
};

/* ========================================================== 4. ESSENCIAL */

const essencial: SiteTemplate = {
  id: 'essencial',
  nome: 'Essencial',
  descricao: 'Página única escura, com mosaico de fotos. Boa como prévia rápida para mostrar ao cliente.',
  nichos: ['Barbearias', 'Salões de Beleza', 'Academias', 'Estúdios', 'Fotógrafos', 'Designers'],
  miniatura: ({ corPrimaria, corDestaque }) => `
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="120" fill="#0b1120"/>
      <rect x="0" y="0" width="160" height="62" fill="${corPrimaria}" opacity="0.35"/>
      <circle cx="80" cy="24" r="11" fill="${corPrimaria}"/>
      <rect x="44" y="42" width="72" height="8" rx="4" fill="#fff" opacity="0.92"/>
      <rect x="56" y="54" width="48" height="3.5" rx="1.75" fill="#94a3b8"/>
      <rect x="58" y="64" width="44" height="8" rx="4" fill="${corDestaque}"/>
      <rect x="14" y="82" width="30" height="22" rx="3" fill="#1e293b"/>
      <rect x="48" y="82" width="30" height="22" rx="3" fill="#1e293b"/>
      <rect x="82" y="82" width="30" height="22" rx="3" fill="#1e293b"/>
      <rect x="116" y="82" width="30" height="22" rx="3" fill="#1e293b"/>
      <rect x="30" y="110" width="100" height="3" rx="1.5" fill="#334155"/>
    </svg>`,
  render: d =>
    documento(
      d,
      cssMidia + `
body{background:#0b1120;color:#e2e8f0}
/* Fundo escuro: o botão vazado herdaria a cor primária e sumiria. */
.btn-vazado{color:#e2e8f0;border-color:rgba(226,232,240,.45)}
.btn-vazado:hover{border-color:#e2e8f0}

.capa{position:relative;min-height:100vh;display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;padding:72px 5vw}
.capa::after{content:'';position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(11,17,32,.35) 0%,rgba(11,17,32,.9) 78%,#0b1120 100%)}
.capa > *{position:relative;z-index:2}
.capa .etiqueta{display:inline-block;border:1px solid rgba(226,232,240,.28);
  padding:6px 16px;border-radius:999px;font-size:12.5px;letter-spacing:2px;
  text-transform:uppercase;color:#cbd5e1;margin:22px 0 18px}
.capa h1{font-size:clamp(36px,7.5vw,72px);color:#fff;letter-spacing:-2px;margin:0 0 16px}
.capa p{font-size:clamp(16px,2.2vw,20px);color:#cbd5e1;max-width:46ch;margin:0 auto 34px}
.capa .marca-iniciais{background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.2);border-radius:20px}
.rolar{position:absolute;bottom:26px;left:50%;transform:translateX(-50%);
  color:#64748b;font-size:12px;letter-spacing:2px;text-transform:uppercase;z-index:2}

.bloco{padding:clamp(56px,9vw,110px) 0}
.bloco .container{width:min(1040px,90vw)}
.bloco h2{font-size:clamp(24px,3.6vw,38px);color:#fff;text-align:center;margin-bottom:10px}
.bloco .legenda{text-align:center;color:#94a3b8;margin-bottom:44px}

.lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}
.cartao{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);
  border-radius:18px;padding:26px;transition:background .25s ease,transform .25s ease}
.cartao:hover{background:rgba(255,255,255,.075);transform:translateY(-3px)}
.cartao-num{color:var(--destaque);font-weight:800;font-size:12px;letter-spacing:2.2px}
.cartao h3{font-size:17px;color:#fff;margin:10px 0 7px}
.cartao p{color:#94a3b8;margin:0;font-size:14.5px}

.galeria figure{background:#1e293b;aspect-ratio:1}
.depoimentos blockquote{background:rgba(255,255,255,.045);border-color:rgba(255,255,255,.09);
  box-shadow:none}
.depoimentos p{color:#cbd5e1}
.depoimentos cite{color:#fff}

.contatos{display:flex;flex-wrap:wrap;gap:14px 34px;justify-content:center;
  color:#94a3b8;font-size:14.5px}
.contatos a{color:#e2e8f0;text-decoration:none;border-bottom:1px solid rgba(226,232,240,.25)}
.rodape{background:transparent;border-top:1px solid rgba(255,255,255,.08)}
`,
      `
<main class="capa" style="${fundoDeCapa(d)}">
  ${marca(d, 76)}
  ${d.categoria ? `<span class="etiqueta">${esc(d.categoria)}</span>` : ''}
  <h1>${esc(d.empresa)}</h1>
  ${d.slogan || d.sobre ? `<p>${esc(d.slogan || d.sobre)}</p>` : ''}
  <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">${botoesContato(d, 'btn-destaque')}</div>
  <span class="rolar">Role para ver mais</span>
</main>

<section class="bloco">
  <div class="container">
    <h2>O que fazemos</h2>
    <p class="legenda">Serviços do estúdio.</p>
    <div class="lista">
      ${servicosValidos(d).map((s, i) => `<article class="cartao">
        <span class="cartao-num">${String(i + 1).padStart(2, '0')}</span>
        <h3>${esc(s.titulo)}</h3>
        <p>${esc(s.descricao)}</p>
      </article>`).join('') || vazio('Adicione os serviços no editor.')}
    </div>
  </div>
</section>

${temGaleria(d) ? `<section class="bloco">
  <div class="container">
    <h2>Nosso trabalho</h2>
    <p class="legenda">Alguns registros recentes.</p>
    ${galeria(d)}
  </div>
</section>` : ''}

${temDepoimento(d) ? `<section class="bloco">
  <div class="container">
    <h2>O que dizem</h2>
    <p class="legenda">Clientes que voltaram.</p>
    ${depoimentos(d)}
  </div>
</section>` : ''}

<section class="bloco" style="padding-top:0">
  <div class="container">
    <div class="contatos">
      ${digitos(d.telefone) ? `<a href="tel:+${digitos(d.telefone)}">${esc(d.telefone)}</a>` : ''}
      ${d.email ? `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : ''}
      ${linkInstagram(d.instagram) ? `<a href="${linkInstagram(d.instagram)}" target="_blank" rel="noopener">${esc(d.instagram)}</a>` : ''}
      ${d.endereco ? `<span>${esc(d.endereco)}</span>` : ''}
      ${d.horario ? `<span>${esc(d.horario)}</span>` : ''}
    </div>
  </div>
</section>

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
