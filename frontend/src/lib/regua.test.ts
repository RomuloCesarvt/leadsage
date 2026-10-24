import { nomesDosQueSairam, saiuPelaRegua } from './regua';

let falhas = 0;
const ok = (nome: string, cond: boolean) => { console.log(`  ${cond ? 'PASS' : 'FALHA'}  ${nome}`); if (!cond) falhas++; };

const encerrado = { em: '2026-10-20T12:00:00Z', motivo: 'régua de abordagens concluída sem resposta' };

console.log('\n--- lead que sai quando a régua termina sem resposta ---');
ok('encerrado no servidor: sai', saiuPelaRegua({}, { encerrado }));
ok('sem encerramento: fica', !saiuPelaRegua({}, {}) && !saiuPelaRegua({}, undefined));
ok('colocado de novo em Meus Leads depois: volta', !saiuPelaRegua({ salvo_em: '2026-10-21T09:00:00Z' }, { encerrado }));
ok('carimbo antigo (antes do encerramento): continua fora', saiuPelaRegua({ salvo_em: '2026-10-01T09:00:00Z' }, { encerrado }));
ok('data do encerramento invalida: nao some com ninguem', !saiuPelaRegua({}, { encerrado: { em: 'lixo', motivo: '' } }));

console.log('\n--- aviso com os nomes ---');
const leads = [{ id: 'a', company: 'Studio Alfa' }, { id: 'b', company: 'Padaria Beta' }, { id: 'c', name: 'Clínica Gama' }, { id: 'd', company: 'Studio Alfa' }] as any[];
const itens = [{ id: 'a', encerrado }, { id: 'b' }, { id: 'c', encerrado }, { id: 'd', encerrado }] as any[];
ok('lista quem saiu, sem repetir o nome', JSON.stringify(nomesDosQueSairam(leads, itens)) === JSON.stringify(['Studio Alfa', 'Clínica Gama']));
ok('ninguem saiu: lista vazia', nomesDosQueSairam(leads, [{ id: 'a' }, { id: 'b' }] as any[]).length === 0);

if (falhas) { console.log(`\n=========== ${falhas} FALHARAM ===========`); process.exit(1); }
console.log('\n=========== TUDO PASSOU ===========');
