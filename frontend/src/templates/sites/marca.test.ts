// O nome no topo do site é a marca: sem a cidade da busca, sem "| descrição", sem registro profissional.
import assert from 'node:assert/strict';
import { limparNomeDaMarca } from './marca';
import { dadosDoLead, montarPrevia } from './previa';

const casos: [string, string, string][] = [
  ['Júlia Morais | Psicóloga Psicanalista em Botucatu', 'Botucatu', 'Júlia Morais'],
  ['Psicóloga Isabelly Silva CRP: 06/176389', 'Botucatu', 'Psicóloga Isabelly Silva'],
  ['Clínica Alluve - Odontologia em Botucatu', 'Botucatu', 'Clínica Alluve'],
  ['Max Andrade', 'Botucatu', 'Max Andrade'],
  ['Pizzaria Botucatu', 'Botucatu', 'Pizzaria Botucatu'],                    // a cidade é parte da marca: fica
  ['Padaria Pão Quente - Botucatu SP', 'Botucatu', 'Padaria Pão Quente'],
  ['Dra. Ana Lima | Dentista', 'Botucatu', 'Dra. Ana Lima'],
  ['Dr. Paulo Reis OAB/SP 123.456 Advogado em Botucatu', 'Botucatu', 'Dr. Paulo Reis Advogado'],
  ['Espaço Mente Viva – Psicologia Clínica', 'Botucatu', 'Espaço Mente Viva'],
  ['Studio Aura', '', 'Studio Aura'],
  ['', 'Botucatu', ''],
];
for (const [nome, cidade, esperado] of casos) assert.equal(limparNomeDaMarca(nome, cidade).marca, esperado, `${nome} -> ${esperado}`);
assert.equal(limparNomeDaMarca('Júlia Morais | Psicóloga Psicanalista em Botucatu', 'Botucatu').descritor, 'Psicóloga Psicanalista');

// nunca devolve só uma palavra solta no lugar do nome
assert.ok(limparNomeDaMarca('Psicóloga | CRP 06/1', 'Botucatu').marca.length >= 3);

// no site: a marca limpa aparece no topo e a cidade não vem colada nela
const lead = { id: 'j', company: 'Júlia Morais | Psicóloga Psicanalista em Botucatu', niche: 'Psicólogos', city: 'Botucatu', rating: 5, rating_count: 6, phone: '5514999990000' };
assert.equal(dadosDoLead(lead).empresa, 'Júlia Morais');
const html = montarPrevia(lead, []).html;
const corpo = html.slice(html.indexOf('<body')).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
assert.ok(!/Júlia Morais[^<]{0,6}\|/.test(corpo), 'sem "| descrição" colada na marca');
assert.ok(!/Psicóloga Psicanalista em Botucatu/.test(corpo), 'a frase do Google não vira marca');

console.log('marca.test: ok');

// frase de capa: a cidade da busca nunca entra
import { limparSlogan } from './marca';
assert.equal(limparSlogan('Acolhimento e escuta em Botucatu', 'Botucatu'), 'Acolhimento e escuta');
assert.equal(limparSlogan('Seu sorriso novo, em Botucatu.', 'Botucatu'), 'Seu sorriso novo.');
assert.equal(limparSlogan('Botucatu merece uma padaria assim', 'Botucatu'), '');          // cidade no meio: descarta (o banco do ramo assume)
assert.equal(limparSlogan('Conversar pode ser o primeiro passo', 'Botucatu'), 'Conversar pode ser o primeiro passo');
assert.equal(limparSlogan('Qualquer frase', ''), 'Qualquer frase');
console.log('marca.test (slogan): ok');
