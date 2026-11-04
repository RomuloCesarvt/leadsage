/** Rodar: cd frontend && npx tsx src/data/planos.test.ts */
import { COBRANCA_MENSAL_ATIVA, PLANOS_MENSAIS, entregasDoPlano, precoComRobo } from './planos';

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
checar('cobrança recorrente ainda desligada (botões "em breve")', COBRANCA_MENSAL_ATIVA === false);

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
