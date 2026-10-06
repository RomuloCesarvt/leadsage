import { CATEGORIAS, TODOS, buscarNichos, normalizar } from './nichos';

let falhas = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${nome}${!cond && detalhe ? ` — ${detalhe}` : ''}`);
  if (!cond) falhas++;
};

console.log(`catálogo: ${CATEGORIAS.length} categorias, ${TODOS.length} nichos`);

ok('tem centenas de nichos', TODOS.length >= 700, String(TODOS.length));
ok('toda categoria tem nichos', CATEGORIAS.every(c => c.nichos.length >= 10),
  CATEGORIAS.filter(c => c.nichos.length < 10).map(c => c.categoria).join(', '));

// um nicho repetido na mesma lista aparece duas vezes para quem busca
const vistos = new Map<string, string>();
const repetidos: string[] = [];
for (const n of TODOS) {
  const k = normalizar(n.nome);
  if (vistos.has(k) && vistos.get(k) === n.categoria) repetidos.push(`${n.nome} (${n.categoria})`);
  vistos.set(k, n.categoria);
}
ok('sem repetidos dentro da mesma categoria', repetidos.length === 0, repetidos.join('; '));

ok('nenhum nome vazio ou com espaço sobrando', TODOS.every(n => n.nome === n.nome.trim() && n.nome.length >= 3));
ok('nomes com tamanho razoável para pesquisa', TODOS.every(n => n.nome.length <= 60));

// busca
const nomes = (q: string) => buscarNichos(q).map(n => n.nome);
ok('busca sem acento acha com acento', nomes('clinica odontologica').includes('Clínicas odontológicas'));
ok('busca por prefixo', nomes('dent')[0].startsWith('Dent'), nomes('dent').slice(0, 3).join(', '));
ok('começo do nome vem antes de palavra no meio', nomes('pet')[0].toLowerCase().startsWith('pet'), nomes('pet').slice(0, 3).join(', '));
ok('várias palavras: todas precisam casar', nomes('lojas de tintas').includes('Lojas de tintas') && !nomes('lojas de tintas').includes('Padarias'));
ok('"spa" não casa com "espaço"', !nomes('spa').some(n => /^espa/i.test(n)), nomes('spa').join(', '));
ok('consulta vazia não devolve nada', buscarNichos('').length === 0 && buscarNichos('   ').length === 0);
ok('consulta sem resultado devolve vazio', buscarNichos('xyzqwerty').length === 0);
ok('busca não repete o mesmo nome', (() => { const r = buscarNichos('lojas de tintas').map(n => n.nome); return new Set(r).size === r.length; })());
ok('respeita o limite', buscarNichos('a', 10).length <= 10);
ok('resultado traz a categoria', buscarNichos('padarias')[0]?.categoria === 'Alimentação e Bebidas');
ok('ícone de toda categoria existe no mapa do seletor',
  CATEGORIAS.every(c => ['HeartPulse', 'Sparkles', 'Dumbbell', 'Utensils', 'ShoppingBag', 'Building', 'Hammer', 'Wrench', 'Car', 'Scale', 'Landmark',
    'Megaphone', 'Briefcase', 'Code', 'Shield', 'GraduationCap', 'Dog', 'PartyPopper', 'Plane', 'Truck', 'Factory', 'Tractor', 'Palette', 'Church'].includes(c.icone)),
  CATEGORIAS.map(c => c.icone).join(','));

console.log(falhas === 0 ? '=========== TUDO PASSOU ===========' : `=========== ${falhas} FALHA(S) ===========`);
process.exit(falhas ? 1 : 0);
