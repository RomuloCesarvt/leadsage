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
  checar(`${t.nome}: sem dependência externa`,
    !/<script|cdn\.|googleapis|unpkg|<link[^>]+href=["']http/i.test(html));
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

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
