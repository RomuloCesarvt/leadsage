import { ehSalvo, salvoPeloServidor, nichosDe } from './leadsSalvos';

let falhas = 0;
const ok = (nome: string, cond: boolean) => { console.log(`  ${cond ? 'PASS' : 'FALHA'}  ${nome}`); if (!cond) falhas++; };

console.log('\n--- leads salvos ---');
ok('resultado de busca nao e salvo', !ehSalvo({}));
ok('em Novo Lead sem marca nao e salvo', !ehSalvo({ pipeline_stage: 'Novo Lead' }));
ok('marcado salvo e salvo', ehSalvo({ salvo: true }));
ok('marca explicita de nao salvo vence a etapa', !ehSalvo({ salvo: false, pipeline_stage: 'Proposta' }));
ok('quem ja andou no pipeline e salvo', ehSalvo({ pipeline_stage: 'Respondeu' }));
ok('quem nasceu de conversa e salvo', ehSalvo({ pipeline_origem: 'inbound_whatsapp', pipeline_stage: 'Novo Lead' }));
ok('sobra de busca no servidor nao e salva', !salvoPeloServidor('busca', 'Novo Lead'));
ok('servidor: etapa avancada e salva', salvoPeloServidor('busca', 'Qualificado'));
ok('servidor: conversa recebida e salva', salvoPeloServidor('inbound_whatsapp', 'Novo Lead'));
ok('nichos sem repeticao e em ordem', JSON.stringify(nichosDe([{ niche: 'Pet' }, { niche: 'Academia' }, { niche: 'Pet' }, { niche: '' }] as any)) === '["Academia","Pet"]');

if (falhas) { console.log(`\n=========== ${falhas} FALHARAM ===========`); process.exit(1); }
console.log('\n=========== TUDO PASSOU ===========');
