import { agrupar, destaques, segmentosDasLinhas } from './desempenho';
import type { LinhaDeDesempenho } from '../types';

let falhas = 0;
const ok = (nome: string, cond: boolean) => { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${nome}`); if (!cond) falhas++; };
const l = (segmento: string, cidade: string, estado: string, abordados: number, responderam: number, interessados: number, pediram_link: number): LinhaDeDesempenho =>
  ({ segmento, cidade, estado, leads: abordados, abordados, responderam, interessados, pediram_link, fechados: 0, taxa_resposta: 0, taxa_interesse: 0 });

const linhas = [
  l('Padarias', 'Botucatu', 'SP', 10, 6, 3, 2), l('Padarias', 'Curitiba', 'PR', 8, 2, 1, 0), l('Padarias', 'Rio Claro', 'SP', 4, 3, 2, 1),
  l('Dentistas', 'Botucatu', 'SP', 6, 1, 0, 0), l('Dentistas', 'Rio Claro', 'RJ', 5, 4, 2, 3),
];

console.log('--- visões ---');
const porEstado = agrupar(linhas, 'estado');
ok('estado soma as cidades (SP = 10+4+6)', porEstado.find(g => g.nome === 'SP')?.abordados === 20);
ok('cidade com a sigla separa Rio Claro de SP e de RJ', agrupar(linhas, 'cidade').filter(g => g.nome.startsWith('Rio Claro')).length === 2);
ok('filtrar um segmento compara só ele entre as cidades', agrupar(linhas, 'cidade', 'Padarias').length === 3 && agrupar(linhas, 'cidade', 'Padarias').every(g => g.nome !== 'Rio Claro - RJ'));
ok('a ordem põe quem mais pede o link primeiro (empate: mais interesse)', agrupar(linhas, 'segmento')[0].nome === 'Padarias');
ok('sem empate, quem mais pede o link vence', agrupar(linhas, 'segmento', 'Dentistas')[0].nome === 'Dentistas' && agrupar([l('A', 'x', 'SP', 5, 1, 9, 0), l('B', 'y', 'SP', 5, 1, 0, 2)], 'segmento')[0].nome === 'B');
ok('taxa de resposta calculada', agrupar(linhas, 'estado', 'Padarias').find(g => g.nome === 'PR')?.taxa_resposta === 25);
ok('sem estado vira "Sem estado"', agrupar([l('X', 'Y', '', 3, 1, 0, 0)], 'estado')[0].nome === 'Sem estado');

console.log('--- destaques ---');
const d = destaques(agrupar(linhas, 'cidade', 'Padarias'), 3);
ok('mais pedem o link na cidade', d.maisPedemLink?.nome === 'Botucatu - SP');
ok('responde mais respeita a amostra mínima', destaques(agrupar([l('X', 'A', 'SP', 1, 1, 1, 1)], 'cidade'), 3).respondeMais === null);
ok('lista de segmentos para o filtro', segmentosDasLinhas(linhas).join() === 'Dentistas,Padarias');

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\n=========== TUDO PASSOU ===========');
