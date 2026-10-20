import { jaDisparado, ordenarCandidatos } from './ordemDaFila';

let falhas = 0;
const ok = (nome: string, cond: boolean) => { console.log(`  ${cond ? 'PASS' : 'FALHA'}  ${nome}`); if (!cond) falhas++; };
const ids = (l: { id: string }[]) => l.map(x => x.id).join(',');

console.log('\n--- ordem da fila de envio ---');
const antigos = [{ id: 'a' }, { id: 'b' }];                                          // sem carimbo (de antes)
const novos = [{ id: 'n1', salvo_em: '2026-10-20T10:00:00Z' }, { id: 'n2', salvo_em: '2026-10-20T11:00:00Z' }];
ok('quem entrou agora vem antes dos antigos', ids(ordenarCandidatos([...antigos, ...novos], new Set())) === 'n2,n1,b,a');
ok('o mais novo primeiro', ids(ordenarCandidatos(novos, new Set())) === 'n2,n1');
ok('sem carimbo: o ultimo da lista vem antes (entrou por ultimo)', ids(ordenarCandidatos(antigos, new Set())) === 'b,a');
ok('quem ja foi trabalhado (fila descartada) vai para o fim, mesmo sendo novo',
  ids(ordenarCandidatos([...novos, { id: 'x', salvo_em: '2026-10-20T12:00:00Z' }], new Set(['x']))) === 'n2,n1,x');
ok('trabalhados tambem ficam do mais novo para o mais antigo', ids(ordenarCandidatos(
  [{ id: 'x', salvo_em: '2026-10-20T08:00:00Z' }, { id: 'y', salvo_em: '2026-10-20T09:00:00Z' }], new Set(['x', 'y']))) === 'y,x');
ok('lista vazia', ordenarCandidatos([], new Set()).length === 0);
ok('nao altera a lista original', (() => { const l = [{ id: 'a' }, { id: 'b' }]; ordenarCandidatos(l, new Set()); return ids(l) === 'a,b'; })());

console.log('\n--- quem ja recebeu disparo ---');
ok('enviado sai da lista', jaDisparado({ outreach_status: 'Enviado' }));
ok('respondeu sai da lista', jaDisparado({ outreach_status: 'Respondido' }));
ok('com data de contato sai da lista', jaDisparado({ outreach_status: 'Pendente', last_contacted_at: '2026-10-19T10:00:00Z' }));
ok('pendente continua na lista', !jaDisparado({ outreach_status: 'Pendente' }));
ok('mensagem gerada (nao enviada) continua', !jaDisparado({ outreach_status: 'Mensagem Gerada' }));

if (falhas) { console.log(`\n=========== ${falhas} FALHARAM ===========`); process.exit(1); }
console.log('\n=========== TUDO PASSOU ===========');
