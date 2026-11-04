import { CATEGORIAS, TELAS_VALIDAS, buscarTutoriais, totalDeTutoriais } from './tutoriais';

let falhas = 0;
const ok = (nome: string, cond: boolean) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${nome}`); if (!cond) falhas++; };

const todos = CATEGORIAS.flatMap(c => c.tutoriais);
ok('há tutoriais', totalDeTutoriais() >= 20);
ok('ids únicos', new Set(todos.map(t => t.id)).size === todos.length);
ok('todo tutorial tem pelo menos 3 passos e um resumo', todos.every(t => t.passos.length >= 3 && t.resumo.length > 10));
ok('toda tela citada existe no app', todos.every(t => !t.tela || TELAS_VALIDAS.includes(t.tela)));
ok('tela e rótulo andam juntos', todos.every(t => !!t.tela === !!t.telaRotulo));
ok('busca sem acento acha "regua"', buscarTutoriais('regua').some(c => c.tutoriais.some(t => t.id === 'regua')));
ok('busca por "instagram" acha o tutorial do canal', buscarTutoriais('instagram').flatMap(c => c.tutoriais).some(t => t.id === 'instagram'));
ok('busca vazia devolve tudo', buscarTutoriais('  ').length === CATEGORIAS.length);
ok('busca sem resultado devolve vazio', buscarTutoriais('zzzxxyy').length === 0);
// o que os tutoriais afirmam tem de bater com o produto
const texto = todos.flatMap(t => [t.titulo, ...t.passos, ...(t.dicas || []), t.atencao || '']).join(' ');
ok('régua de 2 e 5 dias úteis', /2 dias úteis/.test(texto) && /5 dias úteis/.test(texto));
ok('nunca ensina o robô a se dizer assistente virtual', !/(sou|diga que é|admite que é) (o )?assistente virtual/i.test(texto));

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\n=========== TUDO PASSOU ===========');
