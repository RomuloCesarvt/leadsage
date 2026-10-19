/**
 * Negócios do mesmo ramo não saem gêmeos. Rodar:  cd frontend && npx tsx src/templates/sites/variedade.test.ts
 */
import { montarPrevia } from './previa';
import { combinar, variarCor } from './variedade';

let falhas = 0;
const checar = (nome: string, ok: boolean, detalhe = '') => { console.log(`  ${ok ? 'PASS ' : 'FALHA'} ${nome} ${ok ? '' : detalhe}`); if (!ok) falhas++; };

const NOMES = ['Padaria Doce Vida', 'Panificadora Pão Quente', 'Padaria e Confeitaria Sabor da Serra', 'Padaria do Zé', 'Pães & Cia Padaria Artesanal', 'Padaria Santa Clara', 'Padaria Estrela', 'Padaria Nova Era'];
const lead = (company: string, extra: object = {}) => ({ id: company, company, niche: 'Padarias', city: 'Botucatu', phone: '5514999990000', whatsapp: true, rating: 4.6, rating_count: 150, ...extra });
const sites = NOMES.map(n => { const p = montarPrevia(lead(n), []); return { n, p, d: JSON.parse(p.builder_data) }; });

console.log('--- oito padarias: não repetem tudo ---');
checar('as cores primárias não se repetem (todas diferentes)', new Set(sites.map(s => s.d.corPrimaria)).size === NOMES.length, sites.map(s => s.d.corPrimaria).join(','));
checar('há mais de um modelo de layout', new Set(sites.map(s => s.p.template)).size >= 3, [...new Set(sites.map(s => s.p.template))].join(','));
checar('a lista de serviços varia (ordem ou quantidade)', new Set(sites.map(s => s.d.servicos.map((x: any) => x.titulo).join('|'))).size >= 4);
checar('o HTML não é o mesmo com a cor trocada', new Set(sites.map(s => s.p.html.replace(/#[0-9a-f]{6}/gi, '#'))).size >= 4);
checar('sempre 4 a 6 serviços, 3 ou 4 diferenciais', sites.every(s => s.d.servicos.length >= 4 && s.d.servicos.length <= 6 && s.d.diferenciais.length >= 3 && s.d.diferenciais.length <= 4));

console.log('\n--- o que é do negócio entra no site ---');
const comGoogle = montarPrevia(lead('Padaria Santa Clara', {
  google_description: 'Padaria de bairro com fornadas de hora em hora, pão francês crocante e café coado na hora no balcão.',
  review_highlight: 'O pão de queijo sai sempre quentinho e o atendimento é muito simpático.',
}), []);
checar('a descrição do Google vira o "sobre"', comGoogle.html.includes('fornadas de hora em hora'));
checar('uma avaliação real entra como depoimento, dita como do Google', comGoogle.html.includes('pão de queijo sai sempre quentinho') && /Google/.test(JSON.parse(comGoogle.builder_data).depoimentos[0].autor));
const semGoogle = JSON.parse(montarPrevia(lead('Padaria Santa Clara'), []).builder_data);
checar('sem avaliação real não há depoimento', !(semGoogle.depoimentos || []).some((d: any) => (d.texto || '').trim()));

console.log('\n--- o texto da IA vence o do banco ---');
const copia = {
  slogan: 'Fornada nova a cada hora, café coado na hora em Botucatu', sobre: 'Na Santa Clara o pão sai crocante de hora em hora.',
  servicos: [{ titulo: 'Pão francês de hora em hora', descricao: 'Crocante.' }, { titulo: 'Café coado no balcão', descricao: 'Na hora.' }, { titulo: 'Pão de queijo', descricao: 'Quentinho.' }],
  diferenciais_detalhe: [{ titulo: 'Fornada por hora', texto: 'Sempre novo.' }, { titulo: 'Café na hora', texto: 'Coado a cada pedido.' }, { titulo: 'Bairro', texto: 'Conhece você.' }],
  passos: [{ titulo: 'Escolha', texto: 'Veja o que saiu.' }, { titulo: 'Peça', texto: 'WhatsApp.' }, { titulo: 'Retire', texto: 'Quentinho.' }],
  faq: [{ pergunta: 'Aceitam encomenda?', resposta: 'Sim.' }, { pergunta: 'Horário?', resposta: 'No rodapé.' }, { pergunta: 'Entregam?', resposta: 'Consulte.' }],
  cta: 'Pedir no WhatsApp',
};
const ia = montarPrevia({ ...lead('Padaria Santa Clara'), copia_ia: copia }, []);
const di = JSON.parse(ia.builder_data);
checar('serviços, diferenciais, passos e perguntas são os da IA', di.servicos[0].titulo === 'Pão francês de hora em hora' && di.diferenciais[0].titulo === 'Fornada por hora' && di.passos[1].titulo === 'Peça' && di.faq[0].pergunta === 'Aceitam encomenda?');
checar('a frase de capa da IA não leva a cidade', !/Botucatu/.test(di.slogan), di.slogan);
checar('o botão principal é o da IA', di.ctaPrincipal === 'Pedir no WhatsApp' && ia.html.includes('Pedir no WhatsApp'));
const parcial = JSON.parse(montarPrevia({ ...lead('Padaria Santa Clara'), copia_ia: { sobre: 'Só o sobre.', servicos: [{ titulo: 'Um só', descricao: 'x' }] } }, []).builder_data);
checar('cópia incompleta não apaga o resto (poucos serviços não substituem a lista)', parcial.sobre === 'Só o sobre.' && parcial.servicos.length >= 4);
checar('cópia vazia ou inválida é ignorada', JSON.parse(montarPrevia({ ...lead('X'), copia_ia: {} }, []).builder_data).servicos.length >= 4 && !!montarPrevia({ ...lead('X'), copia_ia: 'lixo' as any }, []).html);

console.log('\n--- ferramentas ---');
checar('variarCor devolve hexadecimal válido e é estável', /^#[0-9a-f]{6}$/.test(variarCor('#8a4b1f', 'a')) && variarCor('#8a4b1f', 'a') === variarCor('#8a4b1f', 'a'));
checar('variarCor mantém o escuro escuro (contraste do texto)', [...'abcdefghij'].every(c => { const h = variarCor('#262626', c); return parseInt(h.slice(1, 3), 16) < 110; }));
checar('variarCor não mexe em valor inválido', variarCor('azul', 'a') === 'azul');
checar('combinar respeita o mínimo e não repete item', (() => { const r = combinar([1, 2, 3, 4, 5, 6], 'k', 4, 6); return r.length >= 4 && new Set(r).size === r.length; })());

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
