/**
 * Base dos documentos visuais (propostas e contratos).
 *
 * Antes o documento era texto puro dentro de um <pre>: sem logo, sem
 * cor, sem tipografia, e a exportação saía como .txt. Não dava para
 * mandar isso para um cliente.
 *
 * Os modelos continuam sendo escritos em texto — é o que permite editar
 * à mão e preencher os [CAMPOS]. O que muda é a saída: o texto passa por
 * um conversor que reconhece a estrutura (títulos, listas, pares
 * rótulo/valor, tabelas, linhas de assinatura) e vira HTML formatado.
 */

export type MarcaDocumento = {
  empresa: string;
  logo?: string;
  corPrimaria: string;
  corDestaque: string;
  contato: string;
};

export type DocTheme = {
  id: string;
  nome: string;
  descricao: string;
  miniatura: (m: Pick<MarcaDocumento, 'corPrimaria' | 'corDestaque'>) => string;
  render: (conteudo: string, marca: MarcaDocumento, titulo: string) => string;
};

export const esc = (t: string): string =>
  String(t ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Linha que é só um separador visual do modelo. */
const eSeparador = (l: string) => /^[-=─━_]{3,}$/.test(l.trim()) || /^[━─]{3,}$/.test(l.trim());

/** Linha de assinatura: sublinhados longos, às vezes dois lado a lado. */
const eAssinatura = (l: string) => /_{6,}/.test(l);

/** Título de seção: caixa alta, ou numerada como "3. VALOR" / "CLÁUSULA 2ª". */
const eTitulo = (l: string) => {
  const t = l.trim();
  if (t.length < 3 || t.length > 90) return false;
  if (/^(CLÁUSULA|CLAUSULA)\b/i.test(t)) return true;
  if (/^\d+(\.\d+)*[.)]?\s+\S/.test(t) && t === t.toUpperCase() && /[A-ZÀ-Ú]/.test(t)) return true;
  const semPontuacao = t.replace(/[^A-Za-zÀ-ú]/g, '');
  return semPontuacao.length >= 3 && semPontuacao === semPontuacao.toUpperCase() && !t.endsWith('.');
};

const eItem = (l: string) => /^\s*[•\-*✅✦🎯🎨🚀📅💰📱📧]\s+/.test(l) || /^\s*\d+[.)]\s+\S/.test(l.trim());

/** "Rótulo: valor" — vira uma linha de definição. */
const parDefinicao = (l: string): [string, string] | null => {
  const m = l.match(/^\s*([A-Za-zÀ-ú][^:]{1,38}):\s*(.+)$/);
  return m && !eTitulo(l) ? [m[1].trim(), m[2].trim()] : null;
};

/** Linha de tabela desenhada com barras verticais. */
const eLinhaTabela = (l: string) => /^[│|]/.test(l.trim()) || /\|.*\|/.test(l.trim());

const celulasDe = (l: string): string[] =>
  l
    .trim()
    .split(/[│|]/)
    .map(c => c.trim())
    .filter((c, i, arr) => !(i === 0 && !c) && !(i === arr.length - 1 && !c));

/**
 * Converte o texto do modelo já preenchido em HTML estruturado.
 * O que sobrar vira parágrafo.
 */
export function textoParaHtml(texto: string, tituloDoc = ''): string {
  const linhas = String(texto ?? '').split('\n');
  const saida: string[] = [];
  let i = 0;

  // O cabeçalho do tema já mostra o título. Se o modelo começa repetindo
  // ("CONTRATO DE PRESTAÇÃO DE SERVIÇOS"), a primeira linha sai fora.
  const normalizar = (t: string) =>
    t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  const primeira = linhas.find(l => l.trim())?.trim() || '';
  if (tituloDoc && primeira && eTitulo(primeira)) {
    const a = normalizar(primeira);
    const b = normalizar(tituloDoc);
    if (a === b || a.startsWith(b) || b.startsWith(a)) {
      i = linhas.indexOf(linhas.find(l => l.trim()) as string) + 1;
    }
  }

  const fechar = (tag: string, itens: string[]) =>
    itens.length ? `<${tag}>${itens.join('')}</${tag}>` : '';

  while (i < linhas.length) {
    const linha = linhas[i];
    const limpa = linha.trim();

    if (!limpa) { i++; continue; }

    if (eSeparador(limpa)) { saida.push('<hr>'); i++; continue; }

    if (eAssinatura(limpa)) {
      // Pode haver duas assinaturas na mesma linha; o rótulo vem na seguinte.
      const quantas = (limpa.match(/_{6,}/g) || []).length;
      const rotulos = (linhas[i + 1] || '').trim().split(/\s{2,}/).filter(Boolean);
      const blocos = Array.from({ length: quantas }, (_, k) =>
        `<div class="assinatura"><span class="linha-assinatura"></span><span class="rotulo-assinatura">${esc(rotulos[k] || '')}</span></div>`
      );
      saida.push(`<div class="assinaturas">${blocos.join('')}</div>`);
      i += rotulos.length ? 2 : 1;
      continue;
    }

    if (eLinhaTabela(limpa)) {
      const linhasTabela: string[][] = [];
      while (i < linhas.length && (eLinhaTabela(linhas[i].trim()) || /^[├└┌┬┼┴┐┘─|+-]+$/.test(linhas[i].trim()))) {
        const atual = linhas[i].trim();
        if (!/^[├└┌┬┼┴┐┘─+|-]+$/.test(atual)) {
          const celulas = celulasDe(atual);
          if (celulas.length) linhasTabela.push(celulas);
        }
        i++;
      }
      if (linhasTabela.length) {
        const [cabecalho, ...corpo] = linhasTabela;
        saida.push(
          `<table class="tabela"><thead><tr>${cabecalho
            .map(c => `<th>${esc(c)}</th>`)
            .join('')}</tr></thead><tbody>${corpo
            .map(l => `<tr>${l.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table>`
        );
      }
      continue;
    }

    // Título antes de lista: "1. DIAGNÓSTICO" é numerado mas é seção,
    // não item. Na ordem inversa virava bullet.
    if (eTitulo(limpa)) {
      saida.push(`<h2>${esc(limpa)}</h2>`);
      i++;
      continue;
    }

    if (eItem(limpa)) {
      const itens: string[] = [];
      while (i < linhas.length && eItem(linhas[i].trim()) && !eTitulo(linhas[i].trim())) {
        itens.push(
          `<li>${esc(linhas[i].trim().replace(/^\s*([•\-*✅✦🎯🎨🚀📅💰📱📧]|\d+[.)])\s+/, ''))}</li>`
        );
        i++;
      }
      saida.push(fechar('ul', itens));
      continue;
    }

    const par = parDefinicao(limpa);
    if (par) {
      const defs: string[] = [];
      let j = i;
      while (j < linhas.length) {
        const p = parDefinicao(linhas[j].trim());
        if (!p) break;
        defs.push(`<div class="def"><dt>${esc(p[0])}</dt><dd>${esc(p[1])}</dd></div>`);
        j++;
      }
      saida.push(`<dl class="definicoes">${defs.join('')}</dl>`);
      i = j;
      continue;
    }

    saida.push(`<p>${esc(limpa)}</p>`);
    i++;
  }

  return saida.join('\n');
}

export const marcaVisual = (m: MarcaDocumento, tamanho = 48): string => {
  if (m.logo) return `<img class="logo" src="${m.logo}" alt="${esc(m.empresa)}" style="height:${tamanho}px">`;
  const iniciais = esc(
    m.empresa.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?'
  );
  return `<span class="logo-iniciais" style="width:${tamanho}px;height:${tamanho}px;font-size:${Math.round(
    tamanho * 0.38
  )}px">${iniciais}</span>`;
};

/** CSS comum: tipografia de documento e regras de impressão A4. */
export const cssDocumento = (m: MarcaDocumento): string => `
:root{--primaria:${m.corPrimaria};--destaque:${m.corDestaque};--tinta:#1f2937;--suave:#6b7280;--linha:#e5e7eb}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:#f3f4f6;color:var(--tinta);
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  font-size:14px;line-height:1.65}
.folha{width:210mm;min-height:297mm;margin:24px auto;background:#fff;
  box-shadow:0 4px 24px rgba(0,0,0,.1);padding:0 0 28mm}
.corpo{padding:0 18mm}
h1{font-size:26px;margin:0 0 6px}
h2{font-size:14px;letter-spacing:.6px;text-transform:uppercase;color:var(--primaria);
  margin:26px 0 10px;padding-bottom:6px;border-bottom:1px solid var(--linha)}
p{margin:0 0 10px}
ul{margin:0 0 12px;padding-left:20px}
li{margin-bottom:5px}
hr{border:0;border-top:1px solid var(--linha);margin:18px 0}
.logo{object-fit:contain}
.logo-iniciais{display:inline-flex;align-items:center;justify-content:center;border-radius:10px;
  background:var(--primaria);color:#fff;font-weight:800;letter-spacing:.5px}
.definicoes{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:0 0 14px}
.def{display:contents}
.definicoes dt{font-weight:700;color:var(--suave);font-size:12.5px;text-transform:uppercase;letter-spacing:.4px}
.definicoes dd{margin:0}
.tabela{width:100%;border-collapse:collapse;margin:12px 0 18px;font-size:13.5px}
.tabela th{background:var(--primaria);color:#fff;text-align:left;padding:9px 12px;font-size:12px;
  text-transform:uppercase;letter-spacing:.5px}
.tabela td{padding:9px 12px;border-bottom:1px solid var(--linha)}
.tabela tr:last-child td{border-bottom:0}
.assinaturas{display:flex;gap:40px;margin-top:44px;page-break-inside:avoid}
.assinatura{flex:1;text-align:center}
.linha-assinatura{display:block;border-top:1px solid #9ca3af;margin-bottom:6px}
.rotulo-assinatura{font-size:12px;color:var(--suave);text-transform:uppercase;letter-spacing:.6px}
@media print{
  @page{size:A4;margin:14mm}
  body{background:#fff}
  .folha{width:auto;min-height:0;margin:0;box-shadow:none;padding:0}
  .corpo{padding:0}
  h2{page-break-after:avoid}
}
`;

export const envelope = (m: MarcaDocumento, titulo: string, css: string, corpo: string): string =>
  `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo || m.empresa)}</title>
<style>${cssDocumento(m)}${css}</style>
</head>
<body><div class="folha">${corpo}</div></body>
</html>`;
