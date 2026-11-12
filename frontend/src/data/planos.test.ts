/** Rodar: cd frontend && npx tsx src/data/planos.test.ts */
import { AGENTE_DIARIO, PLANOS_MENSAIS, entregasDoPlano, entregasDoRobo, idNoServidor, precoComRobo } from './planos';

let falhas = 0;
const checar = (nome: string, ok: boolean) => { console.log(`  ${ok ? 'PASS ' : 'FALHA'} ${nome}`); if (!ok) falhas++; };
const [ess, pro, esc] = PLANOS_MENSAIS;

checar('valores definidos pelo dono', ess.preco === 120 && ess.leads === 150 && pro.preco === 250 && pro.leads === 1000 && esc.preco === 497);
checar('robô: complemento de R$ 100 no Essencial e no Profissional, incluso na Escala', precoComRobo(ess) === 220 && precoComRobo(pro) === 350 && precoComRobo(esc) === 497);
checar('agência vê sites; empresa não vê site e vê orçamento e visitas',
  entregasDoPlano(ess, 'agencia').some(t => t.includes('prévias de site')) &&
  !entregasDoPlano(ess, 'empresa').some(t => /site/i.test(t)) &&
  entregasDoPlano(ess, 'empresa').some(t => t.includes('Orçamento automático')) && entregasDoPlano(ess, 'empresa').some(t => t.includes('visitas')));
checar('cada plano maior entrega mais', pro.leads > ess.leads && esc.leads > pro.leads && pro.sites > ess.sites && esc.sites > pro.sites);
checar('a escada de preço empurra do Essencial para o Profissional (mais de 6x os leads por menos de 2,2x o preço)', pro.leads / ess.leads > 6 && pro.preco / ess.preco < 2.2);
checar('ids dos planos batem com os do servidor (payments.py)', idNoServidor(ess, false) === 'm_essencial' && idNoServidor(ess, true) === 'm_essencial_robo' && idNoServidor(pro, true) === 'm_profissional_robo' && idNoServidor(esc, true) === 'm_escala' && idNoServidor(esc, false) === 'm_escala');

checar('a lista do plano NÃO traz o robô (ele é um bloco à parte)', PLANOS_MENSAIS.every(p => (['agencia', 'empresa'] as const).every(m => !entregasDoPlano(p, m).some(t => /rob[ôo]/i.test(t)))));
checar('o robô lista o que faz e o limite de conversas de cada plano', entregasDoRobo(ess).some(t => t.includes('150 conversas')) && entregasDoRobo(pro).some(t => t.includes('1.000 conversas')) && entregasDoRobo(esc).some(t => t.includes('3.000 conversas')));
checar('o agente de chat está nos planos e no pacote do robô, com mais mensagens no pacote', PLANOS_MENSAIS.every(p => entregasDoRobo(p).some(t => /Agente de IA/.test(t))) && PLANOS_MENSAIS.filter(p => p.robo === 'complemento').every(p => AGENTE_DIARIO[p.id].comRobo > AGENTE_DIARIO[p.id].semRobo));

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
