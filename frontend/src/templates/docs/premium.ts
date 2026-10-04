/**
 * Documentos premium: proposta e contrato com cara de material de agência.
 *
 * Os três temas da primeira geração mudavam só o cabeçalho de uma folha
 * única, em fonte do sistema. Proposta de verdade tem capa — a primeira
 * coisa que o cliente vê ao abrir o PDF, com o nome dele — e o corpo em
 * seções numeradas, com hierarquia que se lê de relance.
 *
 * O conteúdo continua vindo do mesmo texto (modelo preenchido ou escrito
 * pela IA) e do mesmo conversor; muda o acabamento. A capa ocupa a
 * primeira folha do PDF sozinha.
 */
import type { DocTheme, MarcaDocumento } from './base';
import { cssDocumento, esc, marcaVisual, textoParaHtml } from './base';

type Fontes = { titulos: string; corpo: string; google: string };

const linkFontes = (f: Fontes) =>
  `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` +
  `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${f.google}&display=swap">`;

/** Só https e data:image, escapado — o mesmo filtro dos sites. */
const urlImagem = (v?: string): string => {
  const s = String(v || '').trim();
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(s)) return s;
  if (/^https:\/\/[^\s"'<>()\\]+$/.test(s)) return esc(s);
  return '';
};

const hoje = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

/**
 * O que vai na capa sai do próprio texto: "Para:", "Cliente:" ou
 * "CONTRATANTE:" dizem para quem é o documento.
 *
 * Na proposta, as linhas Para/De/Data do topo saem do corpo depois de ir
 * para a capa — senão o cliente lê o próprio nome duas vezes seguidas.
 * No contrato nada sai: a qualificação das partes é texto jurídico.
 */
export const lerCapa = (conteudo: string, removerTopo: boolean) => {
  const linhas = String(conteudo || '').split('\n');
  const valor = (re: RegExp) => {
    for (const l of linhas) {
      const m = l.match(re);
      if (m && m[1].trim() && !/^\[.*\]$/.test(m[1].trim())) return m[1].trim();
    }
    return '';
  };
  const cliente = valor(/^\s*(?:Para|Cliente|Contratante|CONTRATANTE)\s*:\s*(.+)$/i)
    .replace(/,.*$/, '').slice(0, 80);
  const validade = valor(/^\s*Validade(?: da proposta)?\s*:\s*(.+)$/i).slice(0, 60);

  let corpo = conteudo;
  if (removerTopo) {
    // O topo do modelo costuma ser "PROPOSTA COMERCIAL" + Para/De/Data +
    // um separador. Tudo isso ja esta na capa; o corpo comeca na primeira
    // secao de verdade.
    const saida: string[] = [];
    let noTopo = true;
    linhas.forEach((l, i) => {
      const t = l.trim();
      const tituloDoTopo = i < 3 && /^(PROPOSTA|OR[ÇC]AMENTO|CONTRATO)\b/i.test(t) && t === t.toUpperCase();
      if (noTopo && (!t || tituloDoTopo || /^(Para|De|Data|Cliente)\s*:/i.test(t) || /^[-=─━_]{3,}$/.test(t))) return;
      noTopo = false;
      saida.push(l);
    });
    corpo = saida.join('\n');
  }
  return { cliente, validade, corpo };
};

/** Numera as seções da proposta: "01", "02"… no lugar do "1." do texto. */
const numerarSecoes = (html: string): string => {
  let n = 0;
  return html.replace(/<h2>([^<]*)<\/h2>/g, (_, t: string) => {
    n += 1;
    const limpo = t.replace(/^\s*\d+[.)]\s*/, '');
    return `<h2><span class="num">${String(n).padStart(2, '0')}</span><span>${limpo}</span></h2>`;
  });
};

const documento = (m: MarcaDocumento, titulo: string, f: Fontes, css: string, folhas: string) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo || m.empresa)}</title>
${linkFontes(f)}
<style>${cssDocumento(m)}
body{font-family:${f.corpo};font-size:14.5px;background:#e9ebef}
h1,h2,h3,.fonte-t{font-family:${f.titulos}}
.folha{position:relative;overflow:hidden}
.folha.capa{padding:0;display:flex;flex-direction:column}
@media print{
  body{background:#fff !important}
  .folha{background:#fff}
  /* lista nao quebra no meio, e a assinatura nunca vai sozinha para a
     ultima folha: ela leva junto o bloco anterior */
  ul,ol,dl{break-inside:avoid}
  .assinaturas{break-before:avoid;break-inside:avoid}
  @page{size:A4;margin:16mm 16mm 20mm}
  @page :first{margin:0}
  .folha.capa{height:297mm;page-break-after:always;break-after:page}
  .folha.capa,.folha.capa *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
${css}</style>
</head>
<body>${folhas}</body>
</html>`;

/* ============================================================ EXECUTIVO */

const F_EXEC: Fontes = {
  titulos: '"Playfair Display",Georgia,serif', corpo: '"Inter",system-ui,sans-serif',
  google: 'family=Playfair+Display:wght@500;700&family=Inter:wght@400;500;600;700',
};

const executivo: DocTheme = {
  id: 'executivo',
  nome: 'Executivo',
  descricao: 'Capa de página inteira com foto e o nome do cliente; seções numeradas. Para impressionar na proposta.',
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="160" fill="#1f2937"/><rect width="120" height="160" fill="${corPrimaria}" opacity=".55"/>
    <rect x="12" y="14" width="16" height="16" rx="3" fill="#fff" opacity=".9"/>
    <rect x="12" y="96" width="34" height="3" fill="${corDestaque}"/><rect x="12" y="104" width="86" height="10" fill="#fff"/>
    <rect x="12" y="118" width="66" height="10" fill="#fff"/><rect x="12" y="138" width="50" height="4" fill="#fff" opacity=".7"/></svg>`,
  render: (conteudo, m, titulo) => {
    const ehContrato = m.tipo === 'contrato';
    const { cliente, validade, corpo } = lerCapa(conteudo, !ehContrato);
    const foto = urlImagem(m.fotoCapa);
    const corpoHtml = ehContrato ? textoParaHtml(corpo, titulo) : numerarSecoes(textoParaHtml(corpo, titulo));
    return documento(m, titulo, F_EXEC, `
.capa{color:#fff;justify-content:space-between;
  background:${foto ? `linear-gradient(180deg,rgba(10,12,18,.35),rgba(10,12,18,.88)),url('${foto}') center/cover`
    : `radial-gradient(circle at 80% 15%,color-mix(in srgb,var(--primaria) 65%,#fff) 0,transparent 45%),linear-gradient(160deg,var(--primaria),#0b0f19)`}}
.capa-topo{padding:22mm 20mm 0;display:flex;align-items:center;gap:14px;font-weight:600;letter-spacing:.04em}
.capa-topo .logo-iniciais{background:rgba(255,255,255,.18)}
.capa-meio{padding:0 20mm}
.capa .rotulo{display:inline-block;color:var(--destaque);font-size:12px;letter-spacing:.3em;text-transform:uppercase;font-weight:700;
  border-top:2px solid var(--destaque);padding-top:12px;margin-bottom:18px}
.capa h1{font-size:46px;line-height:1.08;font-weight:700;margin:0 0 22px;max-width:15ch}
.capa .para{font-size:17px;opacity:.92}
.capa .para b{font-weight:600}
.capa-pe{padding:0 20mm 18mm;display:flex;justify-content:space-between;align-items:flex-end;font-size:12.5px;opacity:.85;gap:20px}
.capa-pe div{white-space:pre-line}
.corpo{padding:16mm 18mm 4mm}
.faixa{display:flex;justify-content:space-between;align-items:center;padding:9mm 18mm 0;font-size:11.5px;color:var(--suave);
  letter-spacing:.06em;text-transform:uppercase}
.faixa b{color:var(--primaria)}
h2{display:flex;align-items:baseline;gap:14px;border:0;font-size:22px;text-transform:none;letter-spacing:-.01em;
  color:#0f172a;margin:34px 0 14px;padding:0}
h2 .num{font-family:"Inter",sans-serif;font-size:13px;font-weight:700;color:var(--destaque);letter-spacing:.08em;min-width:24px}
h2 + p,h2 + ul,h2 + dl,h2 + .bloco-valor,h2 + table{margin-left:38px}
.corpo > p,.corpo > ul,.corpo > dl,.corpo > table,.corpo > .bloco-valor{margin-left:38px}
.corpo ul{list-style:none;padding-left:0}
.corpo li{position:relative;padding-left:22px}
.corpo li::before{content:'';position:absolute;left:2px;top:.6em;width:8px;height:8px;border-radius:50%;background:var(--destaque)}
.cifra{font-family:"Playfair Display",serif;font-size:32px}
.rodape-doc{margin:28px 18mm 0;padding-top:12px;border-top:1px solid var(--linha);color:var(--suave);font-size:11.5px;display:flex;justify-content:space-between}
@media print{.corpo{padding:0}.faixa{padding:0 0 6mm}.rodape-doc{margin:28px 0 0}
  h2 + p,h2 + ul,h2 + dl,h2 + .bloco-valor,h2 + table,.corpo > p,.corpo > ul,.corpo > dl,.corpo > table,.corpo > .bloco-valor{margin-left:38px}}
`, `
<div class="folha capa">
  <div class="capa-topo">${marcaVisual(m, 44)}<span>${esc(m.empresa)}</span></div>
  <div class="capa-meio">
    <span class="rotulo">${ehContrato ? 'Contrato' : 'Proposta comercial'}</span>
    <h1>${esc(titulo)}</h1>
    ${cliente ? `<div class="para">Preparado para <b>${esc(cliente)}</b></div>` : ''}
  </div>
  <div class="capa-pe"><div>${esc(hoje())}${validade ? `\nVálida por ${esc(validade)}` : ''}</div><div style="text-align:right">${esc(m.contato)}</div></div>
</div>
<div class="folha">
  <div class="faixa"><b>${esc(m.empresa)}</b><span>${esc(titulo)}</span></div>
  <main class="corpo">${corpoHtml}</main>
  <div class="rodape-doc"><span>${esc(m.empresa)}</span><span>${esc(m.contato.split('\n')[0] || '')}</span></div>
</div>`);
  },
};

/* ======================================================== CONTEMPORÂNEO */

const F_CONT: Fontes = {
  titulos: '"Manrope",system-ui,sans-serif', corpo: '"Manrope",system-ui,sans-serif',
  google: 'family=Manrope:wght@400;500;600;700;800',
};

const contemporaneo: DocTheme = {
  id: 'contemporaneo',
  nome: 'Contemporâneo',
  descricao: 'Capa com bloco de cor da marca e a logo em destaque; números das seções em selo. Moderno e limpo.',
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="160" fill="#fff"/><rect width="46" height="160" fill="${corPrimaria}"/>
    <rect x="10" y="14" width="22" height="22" rx="6" fill="#fff" opacity=".9"/><circle cx="46" cy="120" r="22" fill="${corDestaque}"/>
    <rect x="58" y="60" width="50" height="8" rx="2" fill="#111827"/><rect x="58" y="72" width="40" height="8" rx="2" fill="#111827"/>
    <rect x="58" y="88" width="30" height="4" rx="2" fill="#9ca3af"/></svg>`,
  render: (conteudo, m, titulo) => {
    const ehContrato = m.tipo === 'contrato';
    const { cliente, validade, corpo } = lerCapa(conteudo, !ehContrato);
    const foto = urlImagem(m.fotoCapa);
    const corpoHtml = ehContrato ? textoParaHtml(corpo, titulo) : numerarSecoes(textoParaHtml(corpo, titulo));
    return documento(m, titulo, F_CONT, `
.folha.capa{flex-direction:row}
.capa-cor{width:42%;background:var(--primaria);position:relative;padding:22mm 14mm;color:#fff;display:flex;flex-direction:column;justify-content:space-between;overflow:hidden}
.capa-cor::after{content:'';position:absolute;width:150px;height:150px;border-radius:50%;background:var(--destaque);right:-75px;bottom:70mm}
.capa-cor .logo,.capa-cor .logo-iniciais{background:#fff;color:var(--primaria);border-radius:16px;padding:6px}
.capa-cor .empresa{font-weight:800;font-size:18px;margin-top:14px}
.capa-cor .contato{font-size:12px;opacity:.85;white-space:pre-line;position:relative;z-index:1}
.capa-texto{flex:1;padding:0 16mm;display:flex;flex-direction:column;justify-content:center;
  ${foto ? `background:linear-gradient(90deg,#fff 55%,rgba(255,255,255,.85)),url('${foto}') right/cover;` : ''}}
.capa-texto .rotulo{font-size:12px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:var(--primaria);margin-bottom:16px}
.capa-texto h1{font-size:40px;line-height:1.1;font-weight:800;color:#0b1220;letter-spacing:-.02em;margin:0 0 20px}
.capa-texto .para{font-size:16px;color:#4b5563}
.capa-texto .para b{color:#0b1220}
.capa-texto .data{margin-top:30px;font-size:13px;color:var(--suave)}
.corpo{padding:14mm 18mm 4mm}
.faixa{height:8px;background:linear-gradient(90deg,var(--primaria),var(--destaque))}
h2{display:flex;align-items:center;gap:12px;border:0;font-size:19px;text-transform:none;letter-spacing:-.01em;color:#0b1220;margin:30px 0 12px;padding:0;font-weight:800}
h2 .num{display:grid;place-items:center;width:32px;height:32px;border-radius:10px;background:var(--primaria);color:#fff;font-size:12.5px;flex:none}
.corpo ul{list-style:none;padding-left:0}
.corpo li{position:relative;padding-left:24px}
.corpo li::before{content:'✓';position:absolute;left:0;color:var(--primaria);font-weight:800}
.bloco-valor{border-radius:16px;border-left-width:0;border:1.5px solid color-mix(in srgb,var(--primaria) 25%,#fff)}
.tabela{border-radius:12px;overflow:hidden}
.rodape-doc{margin:26px 18mm 0;padding-top:12px;border-top:1px solid var(--linha);color:var(--suave);font-size:11.5px}
@media print{.corpo{padding:0}.faixa{margin-bottom:8mm}.rodape-doc{margin:26px 0 0}.capa-cor::after{bottom:70mm}}
`, `
<div class="folha capa">
  <div class="capa-cor"><div>${marcaVisual(m, 60)}<div class="empresa">${esc(m.empresa)}</div></div><div class="contato">${esc(m.contato)}</div></div>
  <div class="capa-texto">
    <div class="rotulo">${ehContrato ? 'Contrato' : 'Proposta'}</div>
    <h1>${esc(titulo)}</h1>
    ${cliente ? `<div class="para">Para <b>${esc(cliente)}</b></div>` : ''}
    <div class="data">${esc(hoje())}${validade ? ` · válida por ${esc(validade)}` : ''}</div>
  </div>
</div>
<div class="folha"><div class="faixa"></div><main class="corpo">${corpoHtml}</main>
  <div class="rodape-doc">${esc(m.empresa)} · ${esc(m.contato.split('\n')[0] || '')}</div></div>`);
  },
};

/* ============================================================== JURÍDICO */

const F_JUR: Fontes = {
  titulos: '"EB Garamond",Georgia,serif', corpo: '"Source Serif 4",Georgia,serif',
  google: 'family=EB+Garamond:wght@500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600',
};

const juridico: DocTheme = {
  id: 'juridico',
  nome: 'Jurídico',
  descricao: 'Folha de rosto clássica, cláusulas em destaque e "Página X de Y" com espaço para rubrica. Feito para contrato.',
  miniatura: ({ corPrimaria }) => `<svg viewBox="0 0 120 160" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="160" fill="#fffdf8"/><rect x="10" y="10" width="100" height="140" fill="none" stroke="${corPrimaria}" stroke-width=".8"/>
    <rect x="14" y="14" width="92" height="132" fill="none" stroke="${corPrimaria}" stroke-width=".4"/>
    <rect x="40" y="40" width="40" height="4" fill="${corPrimaria}"/><rect x="26" y="62" width="68" height="9" fill="#1f2937"/>
    <rect x="34" y="76" width="52" height="4" fill="#9ca3af"/><rect x="30" y="120" width="60" height="1" fill="#9ca3af"/></svg>`,
  render: (conteudo, m, titulo) => {
    const { cliente, corpo } = lerCapa(conteudo, false);
    return documento(m, titulo, F_JUR, `
body{background:#e7e5df}
.folha{background:#fffdf8}
@media print{body{background:#fffdf8 !important}.folha{background:#fffdf8}}
.capa{align-items:center;justify-content:center;text-align:center;padding:24mm}
.moldura{position:absolute;inset:12mm;border:1px solid var(--primaria)}
.moldura::after{content:'';position:absolute;inset:3mm;border:.5px solid var(--primaria);opacity:.6}
.capa .marca{display:flex;flex-direction:column;align-items:center;gap:12px;font-family:"EB Garamond",serif;font-size:17px;letter-spacing:.14em;text-transform:uppercase;color:var(--primaria);margin-bottom:28mm}
.capa h1{font-size:38px;font-weight:600;line-height:1.15;color:#111827;margin:0 0 14px;letter-spacing:.01em}
.capa .filete{width:60px;height:1px;background:var(--primaria);margin:18px auto}
.capa .partes{font-size:15px;color:#374151}
.capa .data{position:absolute;bottom:26mm;left:0;right:0;font-size:13px;color:var(--suave);letter-spacing:.06em}
.corpo{padding:18mm 22mm 6mm;text-align:justify;hyphens:auto}
.cab{text-align:center;padding:12mm 22mm 0}
.cab h1{font-size:22px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;margin:0}
.cab .filete{width:40px;height:1px;background:var(--primaria);margin:10px auto 0}
h2{font-family:"EB Garamond",serif;font-variant:small-caps;font-size:17px;letter-spacing:.05em;text-transform:none;color:var(--primaria);
  border:0;margin:24px 0 8px;padding:0;text-align:left}
.definicoes dt{font-family:"EB Garamond",serif;font-variant:small-caps;letter-spacing:.04em;text-transform:none;font-size:14px}
.assinaturas{margin-top:60px}
.rubrica{margin:20px 22mm 0;text-align:right;font-size:11px;color:var(--suave)}
@media print{
  @page{@bottom-left{content:"Rubrica: ____________";font-family:Georgia,serif;font-size:9pt;color:#6b7280}
        @bottom-right{content:"Página " counter(page) " de " counter(pages);font-family:Georgia,serif;font-size:9pt;color:#6b7280}}
  @page :first{@bottom-left{content:none}@bottom-right{content:none}}
  .corpo{padding:0}.cab{padding:0 0 4mm}.rubrica{display:none}
}
`, `
<div class="folha capa"><div class="moldura"></div>
  <div class="marca">${marcaVisual(m, 46)}<span>${esc(m.empresa)}</span></div>
  <h1>${esc(titulo)}</h1>
  <div class="filete"></div>
  ${cliente ? `<div class="partes">Contratante: ${esc(cliente)}<br>Contratada: ${esc(m.empresa)}</div>` : ''}
  <div class="data">${esc(hoje())}</div>
</div>
<div class="folha"><div class="cab"><h1>${esc(titulo)}</h1><div class="filete"></div></div>
  <main class="corpo">${textoParaHtml(corpo, titulo)}</main><div class="rubrica">Rubrica: ____________</div></div>`);
  },
};

export const TEMAS_PREMIUM: DocTheme[] = [executivo, contemporaneo, juridico];
