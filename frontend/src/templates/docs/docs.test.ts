/**
 * Verificações dos documentos visuais.
 *
 * O conversor de texto em HTML é o coração disto: os modelos continuam
 * escritos em texto (para poder editar à mão e preencher os [CAMPOS]),
 * e é ele que reconhece a estrutura. Se errar, o documento sai feio.
 *
 * Rodar:  cd frontend && npm run test:docs
 */
import { DOC_THEMES, acharTheme } from './themes';
import { TEMAS_PREMIUM } from './premium';
import { textoParaHtml, esc } from './base';
import type { MarcaDocumento } from './base';

let falhas = 0;
const checar = (nome: string, ok: boolean, detalhe = '') => {
  if (ok) console.log(`  PASS  ${nome}`);
  else { falhas++; console.log(`  FALHA ${nome}  ${detalhe}`); }
};

const marca: MarcaDocumento = {
  empresa: 'Studio Rômulo',
  corPrimaria: '#9f1239',
  corDestaque: '#facc15',
  contato: 'romulo@studio.com.br',
};

console.log('--- o conversor reconhece a estrutura do modelo ---');

checar('caixa alta vira título',
  textoParaHtml('CLÁUSULA 1ª - OBJETO').includes('<h2>'));

checar('número + caixa alta é título, não item de lista',
  textoParaHtml('1. DIAGNÓSTICO').includes('<h2>'),
  textoParaHtml('1. DIAGNÓSTICO'));

checar('número + texto normal é item de lista',
  textoParaHtml('1. Aprovação desta proposta').includes('<li>'));

checar('bullet vira lista',
  textoParaHtml('• Entregável um\n• Entregável dois').match(/<li>/g)?.length === 2);

checar('rótulo: valor vira definição',
  textoParaHtml('CONTRATANTE: Padaria Favorita').includes('<dt>CONTRATANTE</dt>'));

checar('separador vira linha',
  textoParaHtml('---').includes('<hr>'));

checar('sublinhado vira bloco de assinatura',
  textoParaHtml('________________          ________________\nCONTRATANTE          CONTRATADA')
    .match(/class="assinatura"/g)?.length === 2);

const tabela = textoParaHtml('│ Item │ Valor │\n│ Site │ R$ 1.000 │');
checar('tabela desenhada vira <table>', tabela.includes('<table') && tabela.includes('<th>Item</th>'), tabela.slice(0, 120));

checar('texto solto vira parágrafo',
  textoParaHtml('Este é um parágrafo comum do contrato.').startsWith('<p>'));

console.log('\n--- título repetido no começo do modelo é removido ---');
const comRepeticao = textoParaHtml('CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\nCLÁUSULA 1ª', 'Contrato de Prestação de Serviços');
checar('não repete o título do cabeçalho',
  (comRepeticao.match(/<h2>/g) || []).length === 1, comRepeticao);
checar('sem título informado, nada é removido',
  (textoParaHtml('CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\nCLÁUSULA 1ª').match(/<h2>/g) || []).length === 2);

console.log('\n--- escape ---');
checar('conteúdo do usuário é escapado',
  !textoParaHtml('Cliente: <script>alert(1)</script>').includes('<script>'));
checar('esc() cobre os caracteres', esc('<a "b" & c>') === '&lt;a &quot;b&quot; &amp; c&gt;');

console.log('\n--- cada acabamento gera um documento imprimível ---');
const conteudo = 'CLÁUSULA 1ª - OBJETO\n\nPrestação de serviços de criação de site.';
for (const t of DOC_THEMES) {
  const html = t.render(conteudo, marca, 'Contrato de Teste');
  checar(`${t.nome}: documento completo`,
    html.startsWith('<!DOCTYPE html>') && html.trim().endsWith('</html>'));
  checar(`${t.nome}: regra de impressão A4`, html.includes('@page') && html.includes('A4'));
  // Script nunca. Fonte do Google, so nos temas premium: sem tipografia
  // de verdade o documento parecia formulario.
  const externos = [...html.matchAll(/<link[^>]+href=["'](https?:[^"']+)/gi)].map(m => m[1])
    .filter(u => !/^https:\/\/fonts\.(googleapis|gstatic)\.com(\/|$)/.test(u));
  checar(`${t.nome}: sem script e sem dependência além das fontes`,
    !/<script/i.test(html) && !externos.length, externos[0] || '');
  checar(`${t.nome}: mostra a marca`, html.includes('Studio Rômulo'));
  checar(`${t.nome}: aplica a cor`, html.includes('#9f1239'));
  checar(`${t.nome}: miniatura é SVG`, t.miniatura(marca).trim().startsWith('<svg'));
}

console.log('\n--- logo ---');
const comLogo = acharTheme('classico').render(conteudo, { ...marca, logo: 'data:image/png;base64,AAAA' }, 'X');
checar('usa a logo enviada', comLogo.includes('data:image/png;base64,AAAA'));
checar('sem logo, usa as iniciais',
  acharTheme('classico').render(conteudo, marca, 'X').includes('>SR<'));

console.log('\n--- tema desconhecido não quebra ---');
checar('id inválido cai no primeiro tema', acharTheme('inexistente').id === DOC_THEMES[0].id);

/* ------------------------------------------- o valor precisa saltar --- */

console.log('\n--- a secao de investimento vira bloco destacado ---');
const comValor = textoParaHtml(
  [
    'ESCOPO DO PROJETO',
    'Criacao do site institucional.',
    '',
    'INVESTIMENTO',
    'Valor total: R$ 2.500,00',
    'Forma de pagamento: 50% na assinatura',
    '',
    'PRAZO',
    'Entrega em 30 dias.',
  ].join('\n'),
  ''
);
checar('a secao de investimento ganha o bloco', comValor.includes('<section class="bloco-valor">'));
checar('a cifra ganha destaque', comValor.includes('<strong class="cifra">R$ 2.500,00</strong>'));
checar('o escopo nao entra no bloco', !/bloco-valor[^]*Criacao do site/.test(comValor));
checar('a secao seguinte fecha o bloco',
  comValor.indexOf('</section>') < comValor.indexOf('PRAZO'));
checar('so a primeira cifra e ampliada',
  (comValor.match(/class="cifra"/g) || []).length === 1);

console.log('\n--- campo ainda por preencher tambem conta ---');
const naoPreenchido = textoParaHtml('INVESTIMENTO\nValor total: R$ [VALOR]', '');
checar('R$ [VALOR] e reconhecido', naoPreenchido.includes('<strong class="cifra">R$ [VALOR]</strong>'));

console.log('\n--- secao longa nao vira caixa gigante ---');
const clausula = textoParaHtml(
  ['CLAUSULA QUARTA - DO PRECO']
    .concat(Array.from({ length: 8 }, (_, k) => `Paragrafo ${k + 1} sobre o pagamento de R$ 900,00.`))
    .join('\n'),
  ''
);
checar('clausula longa fica sem a caixa', !clausula.includes('bloco-valor'));
checar('mas a cifra continua destacada', clausula.includes('class="cifra"'));

console.log('\n--- secao sem dinheiro fica intacta ---');
const semDinheiro = textoParaHtml('PRAZO DE ENTREGA\nEntrega em 30 dias uteis.', '');
checar('nao inventa bloco onde nao ha valor', !semDinheiro.includes('bloco-valor'));
checar('nao inventa cifra', !semDinheiro.includes('class="cifra"'));

console.log('\n--- a linha de total fecha a tabela ---');
const tabelaComTotal = textoParaHtml(
  [
    '| Item | Quantidade | Valor |',
    '| Landing page | 1 | R$ 1.800,00 |',
    '| Manutencao | 3 | R$ 700,00 |',
    '| Total | | R$ 2.500,00 |',
  ].join('\n'),
  ''
);
checar('a linha de total e marcada', tabelaComTotal.includes('<tr class="total">'));
checar('as demais linhas nao sao', (tabelaComTotal.match(/<tr class="total">/g) || []).length === 1);
checar('coluna de dinheiro alinha a direita', tabelaComTotal.includes('class="tabela valores"'));

const semValores = textoParaHtml('| Etapa | Responsavel |\n| Briefing | Cliente |', '');
checar('tabela sem dinheiro nao ganha alinhamento', !semValores.includes('valores'));

console.log('\n--- o CSS acompanha ---');
for (const t of DOC_THEMES) {
  const html = t.render('INVESTIMENTO\nValor: R$ 1.000,00', marca, 'Proposta');
  checar(`${t.nome}: estiliza o bloco de valor`, html.includes('.bloco-valor{'));
  checar(`${t.nome}: estiliza a linha de total`, html.includes('.tabela tr.total td{'));
  checar(`${t.nome}: imprime a cor do bloco`, html.includes('print-color-adjust:exact'));
}

/* -------------------------------------------------- temas premium */

console.log('\n--- premium: capa e corpo ---');
const proposta = [
  'PROPOSTA COMERCIAL', '', 'Para: Padaria Jacarandá', 'De: Studio', 'Data: 04/10/2026', '---', '',
  '1. DIAGNÓSTICO', 'Sem site no Google.', '', '2. INVESTIMENTO', 'Valor total: R$ 2.500,00',
].join('\n');
for (const t of TEMAS_PREMIUM.filter(t => t.id !== 'juridico')) {
  const html = t.render(proposta, { ...marca, tipo: 'proposta' }, 'Proposta de presença digital');
  const corpo = html.split('class="folha capa"')[1].split('<main class="corpo">')[1] || '';
  checar(`${t.nome}: capa diz para quem é`, html.includes('Padaria Jacarandá</b>'));
  checar(`${t.nome}: o corpo não repete Para/De/Data da capa`, !/>Para<|>De<|>Data</.test(corpo));
  checar(`${t.nome}: o corpo não repete "PROPOSTA COMERCIAL"`, !corpo.includes('PROPOSTA COMERCIAL'));
  checar(`${t.nome}: seções numeradas sem o número do texto`,
    corpo.includes('<span class="num">01</span><span>DIAGNÓSTICO</span>'));
  checar(`${t.nome}: capa sozinha na primeira folha do PDF`, html.includes('break-after:page'));
  checar(`${t.nome}: fundo da tela não vai para o PDF`, /@media print\{\s*body\{background:#fff !important\}/.test(html));
}

const contrato = 'CONTRATANTE: Padaria Jacarandá Ltda., CNPJ 1\n\nCLÁUSULA 1ª - DO OBJETO\nCriação de site.';
const juridico = TEMAS_PREMIUM.find(t => t.id === 'juridico')!.render(contrato, { ...marca, tipo: 'contrato' }, 'Contrato');
checar('Jurídico: contratante na folha de rosto, sem o CNPJ', juridico.includes('Contratante: Padaria Jacarandá Ltda.<'));
checar('Jurídico: o contrato não perde a qualificação das partes', juridico.includes('CNPJ 1'));
checar('Jurídico: numera as páginas e pede rubrica', juridico.includes('counter(pages)') && juridico.includes('Rubrica'));

console.log('\n--- premium: foto da capa só se for imagem ---');
for (const t of TEMAS_PREMIUM) {
  const html = t.render(proposta, { ...marca, tipo: 'proposta', fotoCapa: "https://x.com/a.jpg') ;}</style><script>alert(1)</script>" }, 'P');
  checar(`${t.nome}: foto maliciosa não injeta nada`, !html.includes('<script>alert(1)'));
}

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
