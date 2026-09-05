/**
 * O recorte precisa ser pequeno E completo.
 *
 * Pequeno porque `country-state-city` custava 8,3 MB (2,4 MB comprimidos)
 * na tela mais usada do app. Completo porque a busca depende do nome
 * exato da cidade: faltar um município é o usuário não conseguir
 * prospectar ali.
 *
 * Rodar:  cd frontend && npx tsx src/lib/geo.test.ts
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { montarGeo } from './geo';

let falhas = 0;
const checar = (nome: string, ok: boolean, detalhe = '') => {
  if (ok) console.log(`  PASS  ${nome}`);
  else { falhas++; console.log(`  FALHA ${nome}  ${detalhe}`); }
};

const cru = readFileSync('src/data/geo.json', 'utf-8');
const dados = JSON.parse(cru);
const geo = montarGeo(dados);

console.log('--- o arquivo não pode voltar a inchar ---');
const kb = Buffer.byteLength(cru) / 1024;
const kbGzip = gzipSync(cru).length / 1024;
checar(`cru abaixo de 600 KB (${kb.toFixed(0)} KB)`, kb < 600);
checar(`comprimido abaixo de 200 KB (${kbGzip.toFixed(0)} KB)`, kbGzip < 200);

console.log('\n--- só os países que os planos liberam ---');
const paises = geo.paises().map(p => p.isoCode).sort();
checar('exatamente BR, PT e US', JSON.stringify(paises) === '["BR","PT","US"]', paises.join(','));
checar('cada país tem nome e bandeira', geo.paises().every(p => p.name && p.flag));

console.log('\n--- o Brasil está inteiro ---');
const ufs = geo.estadosDe('BR');
checar(`27 unidades federativas (${ufs.length})`, ufs.length === 27);
checar('SP existe', ufs.some(e => e.isoCode === 'SP'));
checar('DF existe', ufs.some(e => e.isoCode === 'DF'));

const municipiosSP = geo.cidadesDe('BR', 'SP');
checar(`SP com mais de 600 municípios (${municipiosSP.length})`, municipiosSP.length > 600);
for (const cidade of ['Botucatu', 'São Paulo', 'Ribeirão Preto', 'Bauru']) {
  checar(`SP tem ${cidade}`, municipiosSP.some(c => c.name === cidade));
}
checar('Salvador está na Bahia', geo.cidadesDe('BR', 'BA').some(c => c.name === 'Salvador'));

console.log('\n--- os outros dois países respondem ---');
checar('distrito de Lisboa em portugues (a biblioteca diz "Lisbon")',
  geo.estadosDe('PT').some(e => e.name === 'Lisboa'));
checar('cidade de Lisboa em portugues',
  geo.cidadesDe('PT', '11').some(c => c.name === 'Lisboa'));
checar('nenhum nome ingles sobrou em Portugal',
  !geo.estadosDe('PT').some(e => ['Lisbon', 'Oporto', 'Azores'].includes(e.name)));
checar('EUA tem 50+ estados', geo.estadosDe('US').length >= 50);
checar('Califórnia tem cidades', geo.cidadesDe('US', 'CA').length > 100);

console.log('\n--- acentuação preservada ---');
checar('acentos intactos', municipiosSP.some(c => c.name === 'São José do Rio Preto'));

console.log('\n--- ordenação e limpeza ---');
const ordenado = [...municipiosSP].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
checar('cidades vêm ordenadas', JSON.stringify(municipiosSP) === JSON.stringify(ordenado));
checar('sem cidade repetida', new Set(municipiosSP.map(c => c.name)).size === municipiosSP.length);
checar('sem nome vazio', municipiosSP.every(c => c.name.trim().length > 0));

console.log('\n--- entrada inválida não derruba a tela ---');
checar('país desconhecido devolve lista vazia', geo.estadosDe('ZZ').length === 0);
checar('estado desconhecido devolve lista vazia', geo.cidadesDe('BR', 'ZZ').length === 0);
checar('temEstado reconhece o que existe', geo.temEstado('BR', 'SP'));
checar('temEstado recusa o que não existe', !geo.temEstado('BR', 'ZZ'));

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
