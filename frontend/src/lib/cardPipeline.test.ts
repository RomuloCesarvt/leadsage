import { acoesDoCard, agenteDe, AGENTES_PADRAO, etiquetasDoCard, haQuanto, linkLigar, linkWhatsApp } from './cardPipeline';

let falhas = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => { console.log(`  ${cond ? 'PASS' : 'FALHA'}  ${nome} ${cond ? '' : detalhe}`); if (!cond) falhas++; };

const AGORA = new Date('2026-10-22T15:00:00Z').getTime();
const lead = (extra: object = {}): any => ({ id: 'l1', company: 'Espaço Luminis', niche: 'Clínicas', phone: '14998003784', whatsapp: true, ...extra });

console.log('\n--- link do WhatsApp e de ligação ---');
ok('celular sem DDI vira 55 + número', linkWhatsApp('(14) 99800-3784') === 'https://wa.me/5514998003784');
ok('fixo sem DDI também', linkWhatsApp('1431232323') === 'https://wa.me/551431232323');
ok('número que já tem 55 não ganha outro', linkWhatsApp('+55 14 99800-3784') === 'https://wa.me/5514998003784');
ok('número curto demais não vira link', linkWhatsApp('3784') === '' && linkWhatsApp('') === '' && linkWhatsApp(undefined) === '');
ok('texto vai codificado', linkWhatsApp('14998003784', 'Oi, tudo bem?').endsWith('?text=Oi%2C%20tudo%20bem%3F'));
ok('ligar usa tel: com o +55', linkLigar('(14) 3123-2323') === 'tel:+551431232323' && linkLigar('12') === '');

console.log('\n--- há quanto tempo ---');
ok('agora', haQuanto('2026-10-22T14:59:40Z', AGORA) === 'agora');
ok('minutos', haQuanto('2026-10-22T14:45:00Z', AGORA) === 'há 15 min');
ok('horas', haQuanto('2026-10-22T12:00:00Z', AGORA) === 'há 3 h');
ok('dias', haQuanto('2026-10-19T15:00:00Z', AGORA) === 'há 3 d');
ok('vazio e inválido não quebram', haQuanto(undefined, AGORA) === '' && haQuanto('xx', AGORA) === '');

console.log('\n--- etiquetas do cartão ---');
const e1 = etiquetasDoCard(lead({ previa_visitas: 3, previa_ultima: '2026-10-22T14:00:00Z' }), AGORA);
ok('prévia aberta vem primeiro, com a contagem e a última abertura', e1[0].texto === 'Prévia aberta · 3x' && e1[0].tom === 'verde' && e1[0].dica === 'Última abertura há 1 h', JSON.stringify(e1[0]));
ok('uma abertura só não mostra "1x"', etiquetasDoCard(lead({ previa_visitas: 1 }), AGORA)[0].texto === 'Prévia aberta');
ok('sem abertura, sem etiqueta de prévia', !etiquetasDoCard(lead(), AGORA).some(t => /Prévia/.test(t.texto)));
ok('ramo aparece como etiqueta neutra', etiquetasDoCard(lead(), AGORA).some(t => t.texto === 'Clínicas' && t.tom === 'neutro'));
ok('movido pelo robô mostra o motivo na dica', etiquetasDoCard(lead({ pipeline_por: 'robô', pipeline_motivo: 'respondeu' }), AGORA).some(t => t.texto === 'Movido pelo robô' && t.dica === 'respondeu'));
ok('sem site só quando o diagnóstico diz', etiquetasDoCard(lead({ website: '', missingDigitalAssets: ['Site'] }), AGORA).some(t => t.texto === 'Sem site')
  && !etiquetasDoCard(lead({ website: 'x.com.br', missingDigitalAssets: [] }), AGORA).some(t => t.texto === 'Sem site'));
ok('nota alta com avaliações suficientes vira etiqueta', etiquetasDoCard(lead({ rating: 4.8, rating_count: 120 }), AGORA).some(t => t.texto === 'Nota 4.8')
  && !etiquetasDoCard(lead({ rating: 4.9, rating_count: 3 }), AGORA).some(t => /Nota/.test(t.texto)));

console.log('\n--- ações rápidas ---');
ok('com WhatsApp: WhatsApp e Ligar', acoesDoCard(lead()).map(a => a.id).join() === 'whatsapp,ligar');
ok('sem WhatsApp: só Ligar', acoesDoCard(lead({ whatsapp: false })).map(a => a.id).join() === 'ligar');
ok('sem telefone: nenhuma ação', acoesDoCard(lead({ phone: '' })).length === 0);

console.log('\n--- agente ---');
ok('sem escolha é o robô padrão', agenteDe(lead()).id === 'robo');
ok('agente inventado cai no padrão', agenteDe(lead({ agente: 'banana' })).id === 'robo');
ok('"Eu atendo" é reconhecido', agenteDe(lead({ agente: 'humano' })).rotulo === 'Eu atendo');
ok('quatro agentes, os mesmos do servidor', AGENTES_PADRAO.map(a => a.id).join() === 'robo,consultivo,direto,humano');

if (falhas) { console.log(`\n=========== ${falhas} FALHARAM ===========`); process.exit(1); }
console.log('\n=========== TUDO PASSOU ===========');
