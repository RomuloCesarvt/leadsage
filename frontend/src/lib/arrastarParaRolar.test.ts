import { empurraoDaBorda, novaRolagem, SELETOR_INTERATIVO } from './arrastarParaRolar';

let falhas = 0;
const ok = (nome: string, cond: boolean) => { console.log(`  ${cond ? 'PASS' : 'FALHA'}  ${nome}`); if (!cond) falhas++; };

console.log('\n--- rolar segurando e puxando ---');
ok('puxar para a esquerda leva o quadro para a direita', novaRolagem(100, 500, 400) === 200);
ok('puxar para a direita leva o quadro para a esquerda', novaRolagem(300, 500, 600) === 200);
ok('nunca passa do inicio', novaRolagem(50, 100, 900) === 0);
ok('sem mexer o ponteiro, nada muda', novaRolagem(120, 300, 300) === 120);

console.log('\n--- bordas durante o arrasto de um cartao ---');
ok('no meio do quadro nao rola', empurraoDaBorda(500, 0, 1000) === 0);
ok('perto da borda direita rola para a direita', empurraoDaBorda(980, 0, 1000) > 0);
ok('perto da borda esquerda rola para a esquerda', empurraoDaBorda(20, 0, 1000) < 0);
ok('quanto mais perto da borda, mais rapido', empurraoDaBorda(995, 0, 1000) > empurraoDaBorda(930, 0, 1000));
ok('o passo tem teto', empurraoDaBorda(5000, 0, 1000) <= 26);

console.log('\n--- o que nao comeca o arrasto do quadro ---');
for (const parte of ['button', 'a', 'input', 'select', 'textarea', '[draggable="true"]']) ok(`${parte} tem funcao propria`, SELETOR_INTERATIVO.includes(parte));

if (falhas) { console.log(`\n=========== ${falhas} FALHARAM ===========`); process.exit(1); }
console.log('\n=========== TUDO PASSOU ===========');
