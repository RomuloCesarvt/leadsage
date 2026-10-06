/**
 * Texto editável em qualquer layout.
 *
 *   npx tsx src/templates/sites/textos.test.ts
 */
import { SITE_TEMPLATES } from './layouts';
import type { SiteData } from './base';
import { aplicarTextos, comEditor, editarCampo, listarTextos, restaurarTexto } from './textos-editaveis';

let falhas = 0;
const checar = (nome: string, ok: boolean, detalhe = '') => {
  if (ok) console.log(`  PASS  ${nome}`);
  else { falhas++; console.log(`  FALHA ${nome} ${detalhe}`); }
};

const dados: SiteData = {
  empresa: 'Padaria Favorita', categoria: 'Padaria', slogan: 'Pão quente todo dia',
  sobre: 'Padaria de bairro. Fornadas antes do sol nascer.',
  servicos: [{ titulo: 'Pães', descricao: 'Fermentação natural.' }],
  telefone: '+55 71 99918-2820', whatsapp: '5571999182820', email: '', endereco: 'R. Hortênsias, 288',
  horario: 'Seg a Sáb', instagram: '', corPrimaria: '#9f1239', corDestaque: '#facc15',
  depoimentos: [{ texto: 'Melhor do bairro.', autor: 'Marina' }],
};

console.log('--- todo layout fica com o texto editável ---');
for (const t of SITE_TEMPLATES) {
  const html = t.render(dados);
  const lista = listarTextos(html, dados);
  checar(`${t.nome}: tem textos editáveis (${lista.length})`, lista.length >= 8);
  checar(`${t.nome}: slogan ligado ao formulário`, html.includes('data-campo="slogan"'));
  checar(`${t.nome}: serviço ligado ao formulário`, html.includes('data-campo="servicos.0.titulo"'));
  checar(`${t.nome}: texto do layout ganha chave própria`, lista.some(x => x.chave.startsWith('t.')));
  const unicas = new Set(lista.map(x => x.chave));
  checar(`${t.nome}: nenhuma chave repetida`, unicas.size === lista.length);
}

console.log('\n--- editar e restaurar ---');
const aurora = SITE_TEMPLATES.find(t => t.id === 'aurora')!;
const titulo = listarTextos(aurora.render(dados), dados).find(x => x.texto === 'Da nossa cozinha')!;
checar('acha o título "Da nossa cozinha"', !!titulo);
const editado = editarCampo(dados, titulo.chave, 'Do nosso forno');
const html2 = aurora.render(editado);
checar('o texto editado aparece na página', html2.includes('>Do nosso forno<') && !html2.includes('>Da nossa cozinha<'));
checar('a lista marca como editado', listarTextos(html2, editado).find(x => x.chave === titulo.chave)!.editado);
checar('restaurar volta o original', aurora.render(restaurarTexto(editado, titulo.chave)).includes('>Da nossa cozinha<'));
checar('apagar deixa vazio (e não some o elemento)', aurora.render(editarCampo(dados, titulo.chave, '')).includes(`data-campo="${titulo.chave}"></h2>`));

console.log('\n--- texto do formulário vai para o formulário ---');
checar('slogan editado na página muda o campo', editarCampo(dados, 'slogan', 'Novo slogan').slogan === 'Novo slogan');
checar('serviço editado na página muda o serviço',
  editarCampo(dados, 'servicos.0.titulo', 'Pão de queijo').servicos[0].titulo === 'Pão de queijo');
checar('depoimento editado muda o depoimento',
  editarCampo(dados, 'depoimentos.0.autor', 'Marina S.').depoimentos![0].autor === 'Marina S.');

console.log('\n--- segurança ---');
const malicioso = editarCampo(dados, 't.qualquer', '<img src=x onerror=alert(1)>');
const comScript = aplicarTextos('<!DOCTYPE html><html><body><h2>qualquer</h2></body></html>', malicioso);
checar('texto editado é escapado', !comScript.includes('<img src=x') && comScript.includes('&lt;img'));
const comSelo = SITE_TEMPLATES[0].render({ ...dados, selo: true });
checar('o selo do LeadSage não é editável',
  !/data-campo="[^"]*"[^>]*>LeadSage</.test(comSelo) && comSelo.includes('>LeadSage</a>'));
// o unico <script> aceito no site e o JSON-LD (dado estruturado); o editor e JS de verdade
checar('o editor só entra na prévia, não no site', !/<script(?![^>]*application\/ld\+json)/.test(aurora.render(dados))
  && !aurora.render(dados).includes('contenteditable'));
checar('a prévia recebe o editor', comEditor(aurora.render(dados)).includes("contenteditable"));

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
