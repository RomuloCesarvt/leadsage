/**
 * Preenche um site novo com o repertório do ramo.
 *
 * O dono (ou o vendedor) não começa de uma página vazia nem de "Lorem ipsum":
 * escolhe o negócio e já vê promessa, serviços, diferenciais, passos e
 * perguntas frequentes do ramo, em português, prontos para editar.
 *
 * Só entra o que estiver vazio: nada que a pessoa ou a IA escreveu é
 * sobrescrito (exceto com `sobrescrever`, no botão "Usar sugestões do ramo").
 */
import type { SiteData } from './base';
import { SOBRE_COMPLEMENTO, achar, preencher } from './conteudo-nichos';

const vazio = (v?: string) => !(v || '').trim();
const listaVazia = <T>(l?: T[], campo?: (x: T) => string) =>
  !l || l.length === 0 || l.every(x => (campo ? vazio(campo(x)) : false));

/** Hash simples e estável: a mesma empresa sempre cai na mesma variação de título. */
const indiceEstavel = (texto: string, n: number): number => {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) >>> 0;
  return h % Math.max(1, n);
};

export function semearConteudo(d: SiteData, opcoes: { sobrescrever?: boolean; cores?: boolean } = {}): SiteData {
  const c = achar(d.categoria);
  const { sobrescrever = false } = opcoes;
  const sub = (t: string) => preencher(t, d.empresa, d.cidade || '');

  const saida: SiteData = { ...d, schema: d.schema || c.schema };

  if (sobrescrever || vazio(d.slogan)) {
    saida.slogan = sub(c.titulos[indiceEstavel(d.empresa, c.titulos.length)]);
  }
  if (sobrescrever || vazio(d.sobre)) saida.sobre = sub(`${c.sobre} ${SOBRE_COMPLEMENTO[c.id] || ''}`.trim());
  if (sobrescrever || listaVazia(d.servicos, s => s.titulo + s.descricao)) {
    saida.servicos = c.servicos.map(s => ({ titulo: s.titulo, descricao: sub(s.descricao) }));
  }
  if (sobrescrever || listaVazia(d.diferenciais, x => x.titulo + x.texto)) {
    saida.diferenciais = c.diferenciais.map(x => ({ titulo: x.titulo, texto: sub(x.texto) }));
  }
  if (sobrescrever || listaVazia(d.passos, x => x.titulo + x.texto)) {
    saida.passos = c.passos.map(x => ({ titulo: x.titulo, texto: sub(x.texto) }));
  }
  if (sobrescrever || listaVazia(d.faq, x => x.pergunta + x.resposta)) {
    saida.faq = c.faq.map(x => ({ pergunta: sub(x.pergunta), resposta: sub(x.resposta) }));
  }
  if (opcoes.cores) {
    saida.corPrimaria = c.paleta.primaria;
    saida.corDestaque = c.paleta.destaque;
  }
  return saida;
}

/** O layout que o banco recomenda para o ramo (id), ou vazio. */
export const layoutDoRamo = (nicho?: string): string => {
  const c = achar(nicho);
  return c.id === 'generico' ? '' : c.layout;
};
