/**
 * Todo texto da página editável — em qualquer layout.
 *
 * Os layouts têm texto que não vem do formulário: títulos de seção,
 * passos, perguntas frequentes, botões. Esse texto não aparecia em lugar
 * nenhum para editar, e a página ficava com frases que o dono não escolheu.
 *
 * Em vez de reescrever cada layout, uma etapa depois da montagem marca
 * cada texto visível com `data-campo`. Com isso:
 *
 * - o construtor deixa clicar e escrever direto na prévia;
 * - a lista "Textos da página" mostra tudo que dá para editar;
 * - o que a pessoa escreveu fica em `textos` e é reaplicado aqui, inclusive
 *   no site publicado.
 *
 * Texto que veio do formulário (empresa, slogan, serviços, depoimentos)
 * ganha a chave do próprio campo: editar na página atualiza o formulário.
 * O resto ganha uma chave tirada do texto original.
 */
import type { SiteData } from './base';
import { esc } from './base';

const desescapar = (t: string) =>
  t.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const slug = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

/** Peças que não são texto: estrelas, iniciais da logo, ícones. */
const IGNORAR = /\b(estrelas|logo-iniciais|rp-logo-iniciais|zap-fixo|num|n)\b/;

/** Os campos do formulário que podem aparecer como texto na página. */
export const camposDoFormulario = (d: SiteData): Map<string, string> => {
  const m = new Map<string, string>();
  const por = (chave: string, valor?: string) => {
    const v = (valor || '').trim();
    if (v && !m.has(v)) m.set(v, chave);
  };
  por('empresa', d.empresa);
  por('slogan', d.slogan);
  por('categoria', d.categoria);
  por('sobre', d.sobre);
  por('horario', d.horario);
  por('endereco', d.endereco);
  por('telefone', d.telefone);
  (d.servicos || []).forEach((s, i) => { por(`servicos.${i}.titulo`, s.titulo); por(`servicos.${i}.descricao`, s.descricao); });
  (d.depoimentos || []).forEach((x, i) => { por(`depoimentos.${i}.texto`, x.texto); por(`depoimentos.${i}.autor`, x.autor); });
  return m;
};

const FOLHA = /<(h1|h2|h3|h4|p|span|a|figcaption|blockquote|summary|b|em|label|div)(\s[^>]*)?>([^<]{1,700})<\/\1>/g;
/** Texto de botão vem depois do ícone: <a ...><svg>…</svg>Fazer pedido</a> */
const APOS_ICONE = /(<\/svg>)([^<]{2,90})(<\/a>)/g;

export function aplicarTextos(html: string, d: SiteData): string {
  const corte = html.indexOf('<body>');
  if (corte < 0) return html;
  const cabeca = html.slice(0, corte), corpo = html.slice(corte);
  const formulario = camposDoFormulario(d);
  const sobrescritos = d.textos || {};
  const vezes = new Map<string, number>();

  const chaveDe = (texto: string): string => {
    const original = desescapar(texto).trim();
    const doFormulario = formulario.get(original);
    if (doFormulario) return doFormulario;
    const base = `t.${slug(original)}`;
    const n = (vezes.get(base) || 0) + 1;
    vezes.set(base, n);
    return n === 1 ? base : `${base}.${n}`;
  };

  const conteudo = (chave: string, original: string) =>
    Object.prototype.hasOwnProperty.call(sobrescritos, chave) ? esc(sobrescritos[chave]) : original;

  let saida = corpo.replace(FOLHA, (todo, tag: string, attrs = '', texto: string) => {
    // O selo do LeadSage nunca é editável: nos planos sem marca própria
    // ele é obrigatório, e editável viraria um jeito de apagá-lo.
    if (!/[A-Za-zÀ-ú]/.test(texto) || IGNORAR.test(attrs) || attrs.includes('data-campo') || attrs.includes('leadsageofc')) return todo;
    const chave = chaveDe(texto);
    return `<${tag}${attrs} data-campo="${chave}">${conteudo(chave, texto)}</${tag}>`;
  });
  saida = saida.replace(APOS_ICONE, (todo, svgFim: string, texto: string, fim: string) => {
    if (!/[A-Za-zÀ-ú]/.test(texto)) return todo;
    const chave = chaveDe(texto);
    return `${svgFim}<span data-campo="${chave}">${conteudo(chave, texto)}</span>${fim}`;
  });
  return cabeca + saida;
}

/** Lista para o painel "Textos da página": chave, texto atual e de onde vem. */
export function listarTextos(html: string, d: SiteData): { chave: string; texto: string; doFormulario: boolean; editado: boolean }[] {
  const lista: { chave: string; texto: string; doFormulario: boolean; editado: boolean }[] = [];
  const vistos = new Set<string>();
  for (const m of html.matchAll(/data-campo="([^"]+)">([^<]*)</g)) {
    const [, chave, texto] = m;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    lista.push({
      chave, texto: desescapar(texto),
      doFormulario: !chave.startsWith('t.'),
      editado: Object.prototype.hasOwnProperty.call(d.textos || {}, chave),
    });
  }
  return lista;
}

/**
 * Aplica uma edição vinda da página: campo do formulário vai para o
 * formulário; o resto vai para `textos`.
 */
export function editarCampo(d: SiteData, chave: string, valor: string): SiteData {
  const v = valor.replace(/\s+\n/g, '\n').trim();
  const simples: (keyof SiteData)[] = ['empresa', 'slogan', 'categoria', 'sobre', 'horario', 'endereco', 'telefone'];
  if ((simples as string[]).includes(chave)) return { ...d, [chave]: v };

  const lista = chave.match(/^(servicos|depoimentos)\.(\d+)\.(titulo|descricao|texto|autor)$/);
  if (lista) {
    const [, qual, i, campo] = lista;
    const itens = [...((d as any)[qual] || [])];
    itens[Number(i)] = { ...(itens[Number(i)] || {}), [campo]: v };
    return { ...d, [qual]: itens };
  }
  return { ...d, textos: { ...(d.textos || {}), [chave]: v } };
}

export function restaurarTexto(d: SiteData, chave: string): SiteData {
  const textos = { ...(d.textos || {}) };
  delete textos[chave];
  return { ...d, textos };
}

/**
 * Script e estilo que a prévia do construtor recebe — nunca o site
 * publicado. A prévia roda em sandbox só com allow-scripts (origem
 * isolada): o script não alcança o app, só manda mensagem.
 */
export const EDITOR_NA_PREVIA = `
<style>
[data-campo]{outline:1.5px dashed transparent;outline-offset:3px;border-radius:3px;transition:outline-color .15s;cursor:text}
[data-campo]:hover{outline-color:rgba(37,99,235,.55)}
[data-campo]:focus{outline:2px solid #2563eb;background:rgba(37,99,235,.06)}
[data-campo]:empty::before{content:'(vazio — clique para escrever)';opacity:.45;font-style:italic}
</style>
<script>
(function(){
  document.addEventListener('click', function(e){ if (e.target.closest('a')) e.preventDefault(); }, true);
  document.querySelectorAll('[data-campo]').forEach(function(el){
    el.setAttribute('contenteditable', 'plaintext-only');
    el.addEventListener('keydown', function(e){
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); }
      if (e.key === 'Escape') { el.textContent = el.dataset.antes || ''; el.blur(); }
    });
    el.addEventListener('focus', function(){ el.dataset.antes = el.textContent; });
    el.addEventListener('blur', function(){
      if (el.textContent === el.dataset.antes) return;
      parent.postMessage({ tipo: 'leadsage-texto', campo: el.dataset.campo, valor: el.innerText }, '*');
    });
  });
})();
</script>`;

export const comEditor = (html: string): string =>
  html.includes('</body>') ? html.replace('</body>', `${EDITOR_NA_PREVIA}</body>`) : html + EDITOR_NA_PREVIA;
