/**
 * O quadro do pipeline desenhado de verdade (renderização no servidor, sem navegador):
 * etiquetas, "Gerenciar agente" e ações rápidas aparecem no cartão certo e só nele.
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppContext } from '../../context/AppContext';
import { PipelineScreen } from './PipelineScreen';

let falhas = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => { console.log(`  ${cond ? 'PASS' : 'FALHA'}  ${nome} ${cond ? '' : detalhe}`); if (!cond) falhas++; };

const leads: any[] = [
  { id: 'a', company: 'Espaço Luminis', niche: 'Clínicas', phone: '14998003784', whatsapp: true, salvo: true, pipeline_stage: 'Respondeu',
    previa_visitas: 2, previa_ultima: new Date(Date.now() - 3600_000).toISOString(), agente: 'humano', opportunityScore: 80 },
  { id: 'b', company: 'Padaria Jacarandá', niche: 'Padarias', phone: '', whatsapp: false, salvo: true, pipeline_stage: 'Novo Lead', opportunityScore: 30 },
];
const html = renderToStaticMarkup(
  <AppContext.Provider value={{ leads, updateLeadStage: () => {}, setSelectedProfileLead: () => {}, atualizarPipeline: async () => {}, definirAgente: async () => {} } as any}>
    <PipelineScreen />
  </AppContext.Provider>,
);
const cartao = (nome: string) => {
  const i = html.indexOf(nome);
  const ini = html.lastIndexOf('draggable', i);
  const fim = html.indexOf('draggable', i);
  return html.slice(ini, fim === -1 ? undefined : fim);
};
const a = cartao('Espaço Luminis'), b = cartao('Padaria Jacarandá');

console.log('\n--- cartão com prévia aberta, "Eu atendo" e WhatsApp ---');
ok('etiqueta de prévia aberta com a contagem', a.includes('Prévia aberta · 2x'));
ok('ramo como etiqueta', a.includes('>Clínicas<'));
ok('agente mostrado: Eu atendo', a.includes('data-testid="agente"') && a.includes('Eu atendo'));
ok('ação de WhatsApp aponta para o número certo', a.includes('href="https://wa.me/5514998003784"'));
ok('ação de ligar', a.includes('href="tel:+5514998003784"'));
ok('seletor começa fechado', !a.includes('role="menu"'));

console.log('\n--- cartão sem telefone e sem escolha ---');
ok('agente padrão é o robô', b.includes('Robô padrão'));
ok('sem telefone, sem ações rápidas', !b.includes('wa.me') && !b.includes('tel:'));
ok('sem abertura, sem etiqueta de prévia', !b.includes('Prévia aberta'));

console.log('\n--- excluir o lead ---');
ok('todo cartão tem o botão de excluir (com ou sem telefone)', a.includes('data-testid="excluir-lead"') && b.includes('data-testid="excluir-lead"'));
ok('o botão explica o que acontece', b.includes('Excluir este lead: ele sai e nada mais é enviado para ele'));
ok('o aviso da régua concluída não aparece sem leads que saíram', !html.includes('data-testid="aviso-regua"'));

if (falhas) { console.log(`\n=========== ${falhas} FALHARAM ===========`); process.exit(1); }
console.log('\n=========== TUDO PASSOU ===========');
