/**
 * Meus Leads desenhado de verdade (renderização no servidor): os botões de filtro para descartar rápido, com a contagem de cada um.
 */
import '../lib/shimNavegador';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppContext } from '../context/AppContext';
import { LessieTableView } from './LessieTableView';

let falhas = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => { console.log(`  ${cond ? 'PASS' : 'FALHA'}  ${nome} ${cond ? '' : detalhe}`); if (!cond) falhas++; };

const lead = (id: string, extra: Record<string, unknown>) => ({
  id, name: id, company: `Empresa ${id}`, niche: 'Salão', city: 'Botucatu', location: 'Botucatu - SP', phone: '', socials: {}, salvo: true,
  pipeline_stage: 'Novo Lead', outreach_status: 'Pendente', ...extra,
});
const leads: any[] = [
  lead('a', { site_status: 'own', whatsapp: true }),
  lead('b', { site_status: 'own', whatsapp: false }),
  lead('c', { site_status: 'none', whatsapp: true }),
  lead('d', { site_status: 'none', whatsapp: false }),
  lead('e', { site_status: 'social', whatsapp: false, favorito: true }),
];
const desenhar = (modo: 'meus' | 'resultados', lista = leads) => renderToStaticMarkup(
  <AppContext.Provider value={{ leads: lista, setSelectedProfileLead: () => {}, salvarLeads: async () => {}, removerLeads: async () => {}, alternarFavorito: () => {}, setLeadsParaContato: () => {}, setViewState: () => {} } as any}>
    <LessieTableView modo={modo} />
  </AppContext.Provider>,
);
const botao = (html: string, chave: string) => {
  const i = html.indexOf(`data-filtro="${chave}"`);
  return i < 0 ? '' : html.slice(html.lastIndexOf('<button', i), html.indexOf('</button>', i));
};

console.log('\n--- botões de filtro em Meus Leads ---');
const html = desenhar('meus');
for (const [chave, rotulo, n] of [['com-site', 'Com site', 2], ['sem-site', 'Sem site', 3], ['com-whatsapp', 'Com WhatsApp', 2], ['sem-whatsapp', 'Sem WhatsApp', 3], ['favoritos', 'Favoritos', 1]] as const) {
  const b = botao(html, chave);
  ok(`${rotulo} aparece com ${n}`, b.includes(rotulo) && b.includes(`>${n}</span>`), b.slice(0, 160));
}
ok('Sem Instagram e Alta oportunidade continuam', botao(html, 'sem-instagram').includes('Sem Instagram') && botao(html, 'alta-oportunidade').includes('Alta oportunidade'));
ok('os filtros começam desligados', ['com-site', 'sem-site', 'com-whatsapp', 'sem-whatsapp', 'favoritos'].every(c => botao(html, c).includes('aria-pressed="false"')));
ok('a lista mostra todos no começo (5 de 5)', html.includes('Empresa a') && html.includes('Empresa e') && html.includes('5 de 5'));

console.log('\n--- nos resultados da busca ---');
const busca = desenhar('resultados', leads.map(l => ({ ...l, salvo: false, pipeline_stage: '' })));
ok('Com site e Sem WhatsApp também existem aqui', botao(busca, 'com-site') !== '' && botao(busca, 'sem-whatsapp') !== '');
ok('Favoritos só existe em Meus Leads', botao(busca, 'favoritos') === '');

if (falhas) { console.log(`\n=========== ${falhas} FALHARAM ===========`); process.exit(1); }
console.log('\n=========== TUDO PASSOU ===========');
process.exit(0);
