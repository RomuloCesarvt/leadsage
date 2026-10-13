/**
 * A prévia do lead é o SITE DELE: dados dele, conteúdo do ramo, fotos do banco, layout do ramo.
 * Rodar:  cd frontend && npx tsx src/templates/sites/previa.test.ts
 */
import { montarPrevia, escolherTemplate, dadosDoLead } from './previa';

let falhas = 0;
const checar = (nome: string, ok: boolean, detalhe = '') => { console.log(`  ${ok ? 'PASS ' : 'FALHA'} ${nome} ${ok ? '' : detalhe}`); if (!ok) falhas++; };

const lead = (nicho: string, nome = 'Empresa Teste') => ({
  id: 'L1', name: nome, company: nome, niche: nicho, city: 'Botucatu', phone: '5514998005560', whatsapp: true,
  rating: 4.8, rating_count: 115, address: 'Rua Amando de Barros, 480', email: 'contato@teste.com.br', socials: { instagram: '@teste' },
});
const FOTOS = ['https://images.pexels.com/a.jpg', 'https://images.pexels.com/b.jpg', 'https://images.pexels.com/c.jpg', 'https://images.pexels.com/d.jpg', 'https://images.pexels.com/e.jpg'];

const RAMOS = ['Padarias', 'Dentistas', 'Clínicas de estética', 'Barbearias', 'Advogados', 'Imobiliárias', 'Mecânicas', 'Academias', 'Escolas de idiomas', 'Pet shops', 'Joalherias', 'Alguma coisa estranha'];

console.log('--- cada ramo gera o site da empresa, com os dados dela e as fotos do banco ---');
for (const ramo of RAMOS) {
  const p = montarPrevia(lead(ramo, `Casa ${ramo}`), FOTOS);
  checar(`${ramo}: é o site da empresa (nome, cidade e nota)`, p.html.includes(`Casa ${ramo}`) && p.html.includes('Botucatu') && p.html.includes('115'));
  checar(`${ramo}: tem o telefone e o endereço dela`, /wa\.me\/5514998005560|tel:\+5514998005560/.test(p.html) && p.html.includes('Rua Amando de Barros'));
  checar(`${ramo}: usa as fotos do banco de imagens`, p.html.includes('images.pexels.com/a.jpg'));
  checar(`${ramo}: traz o conteúdo do ramo (serviços)`, (JSON.parse(p.builder_data).servicos || []).filter((s: any) => s.titulo).length >= 3);
  checar(`${ramo}: sem script e com selo do LeadSage`, !/<script(?![^>]*ld\+json)/i.test(p.html) && p.html.includes('selo-leadsage'));
  checar(`${ramo}: modelo e identificador guardados`, !!p.template && p.lead_id === 'L1');
}

console.log('\n--- a escolha do layout varia por empresa e é estável ---');
const doisIguais = new Set(['Padaria A', 'Padaria B', 'Padaria C', 'Padaria D', 'Padaria Estrela', 'Padaria do Zé'].map(n => escolherTemplate('Padarias', n).id));
checar('padarias diferentes não saem todas com o mesmo layout', doisIguais.size >= 2, [...doisIguais].join(','));
checar('a mesma empresa sempre cai no mesmo layout', escolherTemplate('Dentistas', 'Sorriso').id === escolherTemplate('Dentistas', 'Sorriso').id);

console.log('\n--- só entra o que existe ---');
const semFoto = montarPrevia(lead('Dentistas'), []);
checar('sem fotos do banco não há <img src="">', !semFoto.html.includes('<img src=""') && !semFoto.html.includes('undefined'));
const maliciosa = montarPrevia(lead('Dentistas'), ['javascript:alert(1)', 'http://sem-https.com/a.jpg', 'https://ok.com/a.jpg" onerror="alert(1)']);
checar('foto fora de https é recusada', !/javascript:|http:\/\/sem-https|onerror=/i.test(maliciosa.html));
const noSemNome = dadosDoLead({ id: 'x', niche: 'Padarias' });
checar('lead sem nome cai num nome neutro, sem quebrar', typeof noSemNome.empresa === 'string' && noSemNome.empresa.length > 0);
const comFotoDele = montarPrevia({ ...lead('Dentistas'), }, FOTOS);
checar('nenhuma frase inventada de resultado, preço ou garantia', !/garantia|R\$\s?\d|prêmio|anos de mercado/i.test(comFotoDele.html));

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
