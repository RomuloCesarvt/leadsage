/** Rodar: cd frontend && npx tsx src/lib/modoDaConta.test.ts */
import { ehEmpresa, modoDaConta, telaVale } from './modoDaConta';

let falhas = 0;
const checar = (nome: string, ok: boolean) => { console.log(`  ${ok ? 'PASS ' : 'FALHA'} ${nome}`); if (!ok) falhas++; };

checar('conta antiga (sem modo) continua agência', modoDaConta({ modo: '' }) === 'agencia' && modoDaConta(null) === 'agencia' && !ehEmpresa({}));
checar('modo empresa é reconhecido', ehEmpresa({ modo: 'empresa' }));
checar('empresa não vê criar site, meus sites nem precificador', !telaVale('create-site', { modo: 'empresa' }) && !telaVale('my-sites', { modo: 'empresa' }) && !telaVale('calculator', { modo: 'empresa' }));
checar('empresa vê o resto (robô, fila, conversas)', ['robo', 'fila', 'conversas', 'pipeline'].every(t => telaVale(t, { modo: 'empresa' })));
checar('agência vê tudo', ['create-site', 'my-sites', 'calculator'].every(t => telaVale(t, { modo: 'agencia' })));

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
