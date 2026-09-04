/**
 * Verificações dos layouts de site.
 *
 * O ponto central: o HTML gerado precisa abrir sozinho, sem CDN e sem
 * fonte remota — um site publicado que depende de rede alheia quebra na
 * mão do cliente do usuário. E o texto que vem do formulário entra no
 * HTML, então precisa ser escapado.
 *
 * Rodar:  cd frontend && npx tsx src/templates/sites/layouts.test.ts
 */
import { SITE_TEMPLATES, sugerirTemplate } from './layouts';
import { esc, linkWhatsapp, corDoTexto } from './base';
import type { SiteData } from './base';

let falhas = 0;
const checar = (nome: string, condicao: boolean, detalhe = '') => {
  if (condicao) {
    console.log(`  PASS  ${nome}`);
  } else {
    falhas++;
    console.log(`  FALHA ${nome} ${detalhe}`);
  }
};

const dados: SiteData = {
  empresa: 'Padaria Favorita',
  categoria: 'Padaria',
  slogan: 'Pão quente todo dia',
  sobre: 'Padaria de bairro em Salvador.',
  servicos: [{ titulo: 'Pães', descricao: 'Fermentação natural.' }],
  telefone: '+55 71 99918-2820',
  whatsapp: '5571999182820',
  email: 'contato@exemplo.com.br',
  endereco: 'R. das Hortênsias, 288',
  horario: 'Seg a Sáb, 6h às 20h',
  instagram: '@padariafavorita',
  corPrimaria: '#9f1239',
  corDestaque: '#facc15',
};

console.log('--- cada layout gera um site completo e autocontido ---');
for (const t of SITE_TEMPLATES) {
  const html = t.render(dados);
  checar(`${t.nome}: documento HTML completo`,
    html.startsWith('<!DOCTYPE html>') && html.trim().endsWith('</html>'));
  checar(`${t.nome}: sem dependência externa`,
    !/<script|cdn\.|googleapis|unpkg|jsdelivr|<link[^>]+href=["']http/i.test(html),
    html.match(/<script[^>]*>|https?:\/\/(cdn|fonts)[^"']*/i)?.[0] || '');
  checar(`${t.nome}: responsivo`, html.includes('name="viewport"') && html.includes('@media'));
  checar(`${t.nome}: usa os dados informados`,
    html.includes('Padaria Favorita') && html.includes('Fermentação natural.'));
  checar(`${t.nome}: aplica a cor escolhida`, html.includes('#9f1239'));
  checar(`${t.nome}: miniatura é um SVG`, t.miniatura(dados).trim().startsWith('<svg'));
}

console.log('\n--- o texto do usuário é escapado ---');
const perigoso: SiteData = { ...dados, empresa: '<script>alert(1)</script>', sobre: 'Aspas " e <b>tags</b>' };
for (const t of SITE_TEMPLATES) {
  const html = t.render(perigoso);
  checar(`${t.nome}: não injeta script vindo do formulário`,
    !html.includes('<script>alert(1)</script>'),
    'script cru presente no HTML');
}
checar('esc() neutraliza os caracteres', esc('<a href="x">&</a>') === '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');

console.log('\n--- links de contato ---');
checar('whatsapp vira wa.me com mensagem',
  linkWhatsapp('+55 71 99918-2820', 'Padaria').startsWith('https://wa.me/5571999182820?text='));
checar('whatsapp sem número devolve vazio', linkWhatsapp('', 'X') === '');

console.log('\n--- contraste do texto sobre a cor ---');
checar('cor escura pede texto claro', corDoTexto('#0f172a') === '#ffffff');
checar('cor clara pede texto escuro', corDoTexto('#facc15') === '#111827');

console.log('\n--- sugestão de layout por nicho ---');
checar('padaria sugere Vitrine', sugerirTemplate('Padarias').id === 'vitrine');
checar('clínica sugere Profissional', sugerirTemplate('Clínicas Odontológicas').id === 'profissional');
checar('mecânica sugere Serviço Local', sugerirTemplate('Mecânicas').id === 'servico-local');
checar('nicho desconhecido cai num layout válido',
  SITE_TEMPLATES.some(t => t.id === sugerirTemplate('Alguma coisa').id));

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
