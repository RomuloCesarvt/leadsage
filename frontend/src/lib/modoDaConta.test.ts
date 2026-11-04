/** Rodar: cd frontend && npx tsx src/lib/modoDaConta.test.ts */
const memoria: Record<string, string> = {};
(globalThis as any).localStorage = { getItem: (k: string) => memoria[k] ?? null, setItem: (k: string, v: string) => { memoria[k] = v; }, removeItem: (k: string) => { delete memoria[k]; } };
import { comModoLocal, ehEmpresa, gravarModoLocal, modoDaConta, telaVale } from './modoDaConta';

let falhas = 0;
const checar = (nome: string, ok: boolean) => { console.log(`  ${ok ? 'PASS ' : 'FALHA'} ${nome}`); if (!ok) falhas++; };

checar('conta antiga (sem modo) continua agência', modoDaConta({ modo: '' }) === 'agencia' && modoDaConta(null) === 'agencia' && !ehEmpresa({}));
checar('modo empresa é reconhecido', ehEmpresa({ modo: 'empresa' }));
checar('empresa não vê criar site, meus sites nem precificador', !telaVale('create-site', { modo: 'empresa' }) && !telaVale('my-sites', { modo: 'empresa' }) && !telaVale('calculator', { modo: 'empresa' }));
checar('empresa vê o resto (robô, fila, conversas)', ['robo', 'fila', 'conversas', 'pipeline'].every(t => telaVale(t, { modo: 'empresa' })));
checar('agência vê tudo', ['create-site', 'my-sites', 'calculator'].every(t => telaVale(t, { modo: 'agencia' })));

gravarModoLocal('u1', 'empresa');
checar('escolha local vale quando o servidor devolve o modo antigo e não diz quais modos a conta tem', comModoLocal({ id: 'u1', modo: 'agencia', modos: [] }).modo === 'empresa');
checar('escolha local vale quando a conta tem o modo', comModoLocal({ id: 'u1', modo: 'agencia', modos: ['agencia', 'empresa'] }).modo === 'empresa');
checar('escolha local NÃO vale quando o servidor diz que a conta não tem o modo', comModoLocal({ id: 'u1', modo: 'agencia', modos: ['agencia'] }).modo === 'agencia');
checar('sem escolha local, fica o que veio do servidor', comModoLocal({ id: 'u2', modo: 'agencia', modos: [] }).modo === 'agencia');

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
