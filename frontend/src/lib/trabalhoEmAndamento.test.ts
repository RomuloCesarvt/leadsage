import { emAndamento, iniciarTrabalho } from './trabalhoEmAndamento';

let falhas = 0;
const ok = (nome: string, cond: boolean) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${nome}`); if (!cond) falhas++; };

ok('sem trabalho, nada em andamento', !emAndamento());
const fim1 = iniciarTrabalho();
const fim2 = iniciarTrabalho();
ok('com trabalho, em andamento', emAndamento());
fim1(); fim1();   // encerrar duas vezes o mesmo não desconta duas
ok('um trabalho ainda aberto continua em andamento', emAndamento());
fim2();
ok('tudo encerrado', !emAndamento());

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\n=========== TUDO PASSOU ===========');
