/**
 * O nome que vai no topo do site é a MARCA, não o título do perfil no Google.
 *
 * O Google Meu Negócio costuma trazer o nome com palavras-chave coladas ("Júlia Morais | Psicóloga Psicanalista em Botucatu",
 * "Clínica Alluve - Odontologia em Botucatu", "Psicóloga Isabelly Silva CRP: 06/176389"). Num site isso vira um logotipo
 * enorme e com a cidade na primeira linha. Aqui sobra só o nome; a cidade e o resto ficam no rodapé e no mapa.
 */

const semAcento = (t: string) => (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Registros profissionais ("CRP: 06/176389", "CRO-SP 12345", "OAB/SP 123.456") não entram no nome da marca. */
const REGISTRO = /\b(?:CRP|CRO|CRM|CRN|CREFITO|CREFONO|CRESS|CREA|CAU|CRC|CRECI|OAB)\b[\s:/\-.]*(?:[A-Z]{2}\b)?[\s:/\-.]*[\d][\d./\-]*/gi;

export type Marca = { marca: string; descritor: string };

/** Tira da marca a cidade de busca, o "| descrição" e o registro profissional. Nunca devolve vazio. */
export const limparNomeDaMarca = (nome: string, cidade = ''): Marca => {
  const original = (nome || '').replace(/\s+/g, ' ').trim();
  if (!original) return { marca: '', descritor: '' };

  let texto = original.replace(REGISTRO, ' ').replace(/\s+/g, ' ').trim();
  const cid = cidade.trim();

  // 1) separadores: a marca é a primeira parte; o resto é descrição do ramo
  const partes = texto.split(/\s+[|–—]\s+|\s+-\s+|\s*\|\s*/).map(p => p.trim()).filter(Boolean);
  let marca = partes[0] || texto;
  let descritor = partes.slice(1).join(' ').trim();

  // 2) "... em Botucatu" no fim (ou "Botucatu - SP"): cidade não é marca
  if (cid) {
    const c = escapar(cid);
    const emCidade = new RegExp(`\\s+(?:em|de|na|no|da|do|-|,|/)\\s+${c}(?:\\s*[-/,]\\s*[A-Za-z]{2})?\\s*$`, 'i');
    marca = marca.replace(emCidade, '').trim();
    descritor = descritor.replace(new RegExp(`\\s*(?:em|de|na|no|da|do|-|,|/)?\\s*${c}(?:\\s*[-/,]\\s*[A-Za-z]{2})?\\s*$`, 'i'), '').trim();
  }
  // "em <qualquer cidade>" sobrando no fim de uma marca com "Psicóloga ... em X" (sem separador)
  if (!descritor && /\b(?:psic[óo]log|dentista|advogad|nutricionist|fisioterapeut|arquitet|m[ée]dic)[a-zç ]*\s+em\s+\S+(?:\s+\S+)?$/i.test(marca) && cid) {
    marca = marca.replace(/\s+em\s+\S+(?:\s+\S+)?$/i, '').trim();
  }

  marca = marca.replace(/[\s|–—,:;/-]+$/, '').trim();
  // se limpar deixou a marca curta demais (ex.: só "Psicóloga"), mantém o nome original sem a cidade
  if (semAcento(marca).length < 3) marca = original.replace(REGISTRO, '').replace(/\s+/g, ' ').trim();
  return { marca, descritor: descritor.replace(/[\s|–—,:;/-]+$/, '').trim() };
};

/**
 * Uma frase de capa não leva a cidade da busca: ela diz o que a pessoa ganha. Tira "em Botucatu" do fim; se a cidade ainda
 * aparecer, a frase é descartada (quem chama usa então um título do banco do ramo).
 */
export const limparSlogan = (slogan: string, cidade = ''): string => {
  let t = (slogan || '').replace(/\s+/g, ' ').trim();
  const cid = cidade.trim();
  if (!t || !cid) return t;
  const c = escapar(cid);
  t = t.replace(new RegExp(String.raw`\s*(?:,|-|–|—)?\s*(?:em|de|na|no|da|do|para)\s+${c}(?:\s*[-/,]\s*[A-Za-z]{2})?(?=[.!?]?$)`, 'i'), '').trim();
  return new RegExp(String.raw`(^|[^\p{L}])${c}($|[^\p{L}])`, 'iu').test(t) ? '' : t;
};
