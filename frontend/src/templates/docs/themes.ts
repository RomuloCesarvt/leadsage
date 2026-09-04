/**
 * Os três acabamentos visuais dos documentos.
 *
 * Mudam o cabeçalho, o peso da cor e o rodapé — o conteúdo é o mesmo,
 * vindo do modelo preenchido. Todos imprimem em A4.
 */
import type { DocTheme, MarcaDocumento } from './base';
import { envelope, esc, marcaVisual, textoParaHtml } from './base';

const rodapeImpresso = (m: MarcaDocumento): string =>
  m.contato
    ? `<div class="rodape-doc">${esc(m.empresa)}${m.contato ? ` · ${esc(m.contato)}` : ''}</div>`
    : '';

/* ------------------------------------------------------------ clássico */

const classico: DocTheme = {
  id: 'classico',
  nome: 'Clássico',
  descricao: 'Cabeçalho sóbrio com filete colorido. O mais seguro para contratos.',
  miniatura: ({ corPrimaria, corDestaque }) => `
    <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="160" fill="#fff"/>
      <rect width="120" height="4" fill="${corPrimaria}"/>
      <rect x="14" y="16" width="18" height="18" rx="4" fill="${corPrimaria}"/>
      <rect x="38" y="20" width="40" height="5" rx="2" fill="#94a3b8"/>
      <rect x="38" y="29" width="28" height="4" rx="2" fill="#cbd5e1"/>
      <rect x="14" y="48" width="60" height="7" rx="3" fill="#334155"/>
      <rect x="14" y="66" width="40" height="4" rx="2" fill="${corDestaque}"/>
      <rect x="14" y="78" width="92" height="3" rx="1.5" fill="#e2e8f0"/>
      <rect x="14" y="86" width="92" height="3" rx="1.5" fill="#e2e8f0"/>
      <rect x="14" y="94" width="70" height="3" rx="1.5" fill="#e2e8f0"/>
      <rect x="14" y="110" width="40" height="4" rx="2" fill="${corDestaque}"/>
      <rect x="14" y="120" width="92" height="3" rx="1.5" fill="#e2e8f0"/>
      <rect x="14" y="140" width="38" height="1.5" fill="#94a3b8"/>
      <rect x="68" y="140" width="38" height="1.5" fill="#94a3b8"/>
    </svg>`,
  render: (conteudo, m, titulo) =>
    envelope(
      m,
      titulo,
      `
.faixa-topo{height:6px;background:var(--primaria)}
.cabecalho{display:flex;align-items:center;justify-content:space-between;gap:20px;
  padding:22mm 18mm 14px;border-bottom:1px solid var(--linha);margin-bottom:22px}
.cabecalho .quem{display:flex;align-items:center;gap:14px}
.cabecalho .empresa{font-weight:800;font-size:16px}
.cabecalho .contato{color:var(--suave);font-size:12px;text-align:right;white-space:pre-line}
.titulo-doc{padding:0 18mm;margin-bottom:6px}
.titulo-doc h1{color:var(--primaria)}
.titulo-doc .data{color:var(--suave);font-size:12.5px}
.rodape-doc{margin-top:34px;padding:12px 18mm 0;border-top:1px solid var(--linha);
  color:var(--suave);font-size:11.5px;text-align:center}
`,
      `<div class="faixa-topo"></div>
<header class="cabecalho">
  <div class="quem">${marcaVisual(m, 46)}<span class="empresa">${esc(m.empresa)}</span></div>
  <div class="contato">${esc(m.contato)}</div>
</header>
<div class="titulo-doc">
  <h1>${esc(titulo)}</h1>
  <span class="data">${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
</div>
<main class="corpo">${textoParaHtml(conteudo, titulo)}</main>
${rodapeImpresso(m)}`
    ),
};

/* ------------------------------------------------------------- moderno */

const moderno: DocTheme = {
  id: 'moderno',
  nome: 'Moderno',
  descricao: 'Capa colorida no topo, com o título em destaque. Bom para propostas.',
  miniatura: ({ corPrimaria, corDestaque }) => `
    <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="160" fill="#fff"/>
      <rect width="120" height="54" fill="${corPrimaria}"/>
      <rect x="14" y="12" width="16" height="16" rx="4" fill="#fff" opacity="0.9"/>
      <rect x="14" y="34" width="62" height="8" rx="4" fill="#fff" opacity="0.95"/>
      <rect x="14" y="46" width="34" height="4" rx="2" fill="${corDestaque}"/>
      <rect x="14" y="70" width="40" height="4" rx="2" fill="${corPrimaria}"/>
      <rect x="14" y="80" width="92" height="3" rx="1.5" fill="#e2e8f0"/>
      <rect x="14" y="88" width="92" height="3" rx="1.5" fill="#e2e8f0"/>
      <rect x="14" y="102" width="92" height="14" rx="3" fill="${corPrimaria}" opacity="0.12"/>
      <rect x="14" y="124" width="70" height="3" rx="1.5" fill="#e2e8f0"/>
      <rect x="14" y="144" width="38" height="1.5" fill="#94a3b8"/>
      <rect x="68" y="144" width="38" height="1.5" fill="#94a3b8"/>
    </svg>`,
  render: (conteudo, m, titulo) =>
    envelope(
      m,
      titulo,
      `
.capa{background:linear-gradient(135deg,var(--primaria),color-mix(in srgb,var(--primaria) 70%,#000));
  color:#fff;padding:20mm 18mm 18mm}
.capa .quem{display:flex;align-items:center;gap:12px;margin-bottom:26px}
.capa .empresa{font-weight:800;font-size:15px}
.capa h1{font-size:30px;margin:0 0 10px;color:#fff}
.capa .sub{opacity:.9;font-size:13px}
.capa .traco{width:56px;height:4px;background:var(--destaque);border-radius:2px;margin-top:16px}
.capa .logo-iniciais{background:rgba(255,255,255,.2)}
.corpo{padding-top:24px}
.rodape-doc{margin-top:34px;padding:12px 18mm 0;border-top:1px solid var(--linha);
  color:var(--suave);font-size:11.5px;text-align:center}
@media print{.capa{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`,
      `<header class="capa">
  <div class="quem">${marcaVisual(m, 42)}<span class="empresa">${esc(m.empresa)}</span></div>
  <h1>${esc(titulo)}</h1>
  <div class="sub">${esc(m.contato)} · ${new Date().toLocaleDateString('pt-BR')}</div>
  <div class="traco"></div>
</header>
<main class="corpo">${textoParaHtml(conteudo, titulo)}</main>
${rodapeImpresso(m)}`
    ),
};

/* ---------------------------------------------------------- minimalista */

const minimalista: DocTheme = {
  id: 'minimalista',
  nome: 'Minimalista',
  descricao: 'Só tipografia e muito branco. Discreto, sem cor pesada.',
  miniatura: ({ corDestaque }) => `
    <svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="160" fill="#fff"/>
      <rect x="14" y="16" width="14" height="14" rx="7" fill="#111827"/>
      <rect x="34" y="21" width="34" height="4" rx="2" fill="#111827"/>
      <rect x="14" y="46" width="74" height="9" rx="3" fill="#111827"/>
      <rect x="14" y="62" width="24" height="2" fill="${corDestaque}"/>
      <rect x="14" y="76" width="92" height="3" rx="1.5" fill="#e5e7eb"/>
      <rect x="14" y="84" width="92" height="3" rx="1.5" fill="#e5e7eb"/>
      <rect x="14" y="92" width="60" height="3" rx="1.5" fill="#e5e7eb"/>
      <rect x="14" y="108" width="30" height="3" rx="1.5" fill="#111827"/>
      <rect x="14" y="118" width="92" height="3" rx="1.5" fill="#e5e7eb"/>
      <rect x="14" y="142" width="38" height="1.5" fill="#9ca3af"/>
      <rect x="68" y="142" width="38" height="1.5" fill="#9ca3af"/>
    </svg>`,
  render: (conteudo, m, titulo) =>
    envelope(
      m,
      titulo,
      `
.cabecalho{display:flex;align-items:center;gap:12px;padding:22mm 18mm 0}
.cabecalho .empresa{font-weight:700;font-size:14px;letter-spacing:.3px}
.cabecalho .logo-iniciais{background:#111827;border-radius:50%}
.titulo-doc{padding:26px 18mm 0}
.titulo-doc h1{font-size:28px;letter-spacing:-.4px}
.titulo-doc .traco{width:44px;height:2px;background:var(--destaque);margin:14px 0 4px}
.titulo-doc .data{color:var(--suave);font-size:12px}
h2{color:#111827;border-bottom:0;text-transform:none;letter-spacing:0;font-size:15px;
  font-weight:800;margin:26px 0 8px}
.tabela th{background:#111827}
.corpo{padding-top:20px}
.rodape-doc{margin-top:38px;padding:12px 18mm 0;color:var(--suave);font-size:11px;text-align:left}
`,
      `<header class="cabecalho">${marcaVisual(m, 34)}<span class="empresa">${esc(m.empresa)}</span></header>
<div class="titulo-doc">
  <h1>${esc(titulo)}</h1>
  <div class="traco"></div>
  <span class="data">${esc(m.contato)} · ${new Date().toLocaleDateString('pt-BR')}</span>
</div>
<main class="corpo">${textoParaHtml(conteudo, titulo)}</main>
${rodapeImpresso(m)}`
    ),
};

export const DOC_THEMES: DocTheme[] = [classico, moderno, minimalista];

export const acharTheme = (id: string): DocTheme =>
  DOC_THEMES.find(t => t.id === id) || DOC_THEMES[0];
