/**
 * O robô entende o nicho: especialidade médica é saúde (nunca oficina), o nome da empresa e a IA servem de segundo sinal.
 * Rodar:  cd frontend && npx tsx src/templates/sites/nicho.test.ts
 */
import { RAMO_DO_SEGMENTO, ramoEfetivo, segmentoDoRamo, todosOsSegmentos, direcaoDeArte } from './direcao-de-arte';
import { achar } from './conteudo-nichos';
import { montarPrevia } from './previa';

let falhas = 0;
const checar = (nome: string, ok: boolean, detalhe = '') => { console.log(`  ${ok ? 'PASS ' : 'FALHA'} ${nome} ${ok ? '' : detalhe}`); if (!ok) falhas++; };

console.log('--- toda especialidade médica é saúde (o bug: "logist" casava dentro de "gastroenterologistas" e mandava para oficina) ---');
for (const r of ['Gastroenterologistas', 'Ginecologistas', 'Urologistas', 'Neurologistas', 'Endocrinologistas', 'Otorrinolaringologistas', 'Reumatologistas',
  'Pneumologistas', 'Oncologistas', 'Dermatologistas', 'Cardiologistas', 'Oftalmologistas', 'Pediatras', 'Ortopedistas', 'Clínicas', 'Médicos',
  'Consultório médico', 'Centro médico', 'Hospital', 'Fisioterapeutas', 'Nutricionistas']) {
  checar(`${r} -> saúde`, segmentoDoRamo(r).id === 'saude', segmentoDoRamo(r).id);
  checar(`${r} -> texto de clínica, não o genérico`, achar(r).id !== 'generico', achar(r).id);
}
checar('logística de verdade continua sendo oficina/indústria', segmentoDoRamo('Logística e transportes').id === 'oficina');
checar('psiquiatra e fono seguem em saúde mental', segmentoDoRamo('Psiquiatras').id === 'mente' && segmentoDoRamo('Fonoaudiólogos').id === 'mente');

console.log('\n--- o nome da empresa é o segundo sinal ---');
checar('ramo vazio + "Clínica Santa Clara" -> saúde', segmentoDoRamo('', 'Clínica Santa Clara').id === 'saude');
checar('"Consultório Dra. Angela Kley" -> saúde', segmentoDoRamo('Estabelecimento', 'Consultório Dra. Angela Kley').id === 'saude');
checar('"Dr. João Silva" -> saúde', segmentoDoRamo('', 'Dr. João Silva').id === 'saude');
checar('o ramo da busca vale mais que o nome', segmentoDoRamo('Pet shops', 'Clínica Amigo Fiel').id === 'pet');
checar('cor e modelo seguem o segmento achado pelo nome', direcaoDeArte('', 'Clínica Santa Clara').segmento.id === 'saude');

console.log('\n--- a IA reconhece o que o ramo estranho não deixa ---');
checar('ramo estranho + IA diz "saude" -> clínica', segmentoDoRamo(ramoEfetivo('Especialistas', 'Alfa Beta', 'saude')).id === 'saude');
checar('id inventado pela IA é ignorado', ramoEfetivo('Alguma coisa', 'Alfa Beta', 'banana') === 'Alguma coisa');
checar('ramo conhecido não é trocado pela IA', ramoEfetivo('Pizzarias', 'X', 'saude') === 'Pizzarias');
for (const s of todosOsSegmentos().filter(x => x.id !== 'generico')) {
  const r = RAMO_DO_SEGMENTO[s.id];
  checar(`ramo-padrão de "${s.id}" volta ao mesmo segmento`, !!r && segmentoDoRamo(r).id === s.id, `${r} -> ${r && segmentoDoRamo(r).id}`);
}

console.log('\n--- o site de uma clínica de gastro não sai com cara de oficina nem texto genérico ---');
const lead = { id: 'g', company: 'Clínica Santa Clara', niche: 'Gastroenterologistas', city: 'Botucatu', phone: '5514999990000', whatsapp: true };
const p = montarPrevia(lead, []);
const d = JSON.parse(p.builder_data);
checar('segmento saúde, cor fria', d.segmento === 'saude' && parseInt(d.corPrimaria.slice(1, 3), 16) < 120, `${d.segmento} ${d.corPrimaria}`);
checar('título de capa não é o genérico', !/Qualidade e atenção no que fazemos|Fale com a gente e resolva/i.test(p.html));
checar('serviços não são os genéricos ("Condições combinadas", "Suporte")', !d.servicos.some((s: any) => /Condições combinadas|^Suporte$/.test(s.titulo)));
const semNome = montarPrevia({ id: 'x', company: 'Consultório Dra. Angela Kley', niche: 'Estabelecimento', city: 'Botucatu' }, []);
checar('ramo desconhecido + nome de consultório: site de saúde', JSON.parse(semNome.builder_data).segmento === 'saude');
const viaIA = montarPrevia({ id: 'y', company: 'Alfa Beta', niche: 'Especialistas', city: 'Botucatu', copia_ia: { segmento: 'saude', categoria: 'Clínica de gastroenterologia' } }, []);
checar('só a IA sabe o que é: usa o segmento dela e a categoria dela na capa', JSON.parse(viaIA.builder_data).segmento === 'saude' && viaIA.html.includes('Clínica de gastroenterologia'));

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
