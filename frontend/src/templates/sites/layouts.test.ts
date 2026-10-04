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
import { LAYOUTS_PREMIUM } from './premium';
import { urlImagem } from './premium-base';
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
  // Nenhum script, nunca: o site e servido em sandbox sem JavaScript.
  // A unica dependencia externa aceita e a fonte do Google, nos layouts
  // premium — foi a falta de tipografia que deixava tudo com cara de
  // rascunho. Qualquer outro <link> externo e falha.
  const externos = [...html.matchAll(/<link[^>]+href=["'](https?:[^"']+)/gi)].map(m => m[1])
    .filter(u => !/^https:\/\/fonts\.(googleapis|gstatic)\.com(\/|$)/.test(u));
  checar(`${t.nome}: sem script e sem dependência além das fontes`,
    !/<script/i.test(html) && !externos.length, externos[0] || '');
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
checar('padaria sugere Aurora', sugerirTemplate('Padarias').id === 'aurora');
checar('clínica odontológica sugere Clínica', sugerirTemplate('Clínicas Odontológicas').id === 'clinica');
checar('mecânica sugere Oficina', sugerirTemplate('Mecânicas').id === 'oficina');
checar('barbearia sugere Estúdio', sugerirTemplate('Barbearia').id === 'estudio');
checar('advogado sugere Escritório', sugerirTemplate('Advogados').id === 'escritorio');
checar('academia sugere Vibrante', sugerirTemplate('Academia').id === 'vibrante');
checar('acento não atrapalha', sugerirTemplate('ESTÉTICA').id === 'clinica');
checar('nicho desconhecido cai num layout válido',
  SITE_TEMPLATES.some(t => t.id === sugerirTemplate('Alguma coisa').id));


/* ------------------------------- imagens, galeria e prova social ------ */

console.log('\n--- as fotos entram no site ---');
const comFotos: SiteData = {
  ...dados,
  capa: 'data:image/jpeg;base64,CAPA',
  fotoSobre: 'data:image/jpeg;base64,SOBRE',
  galeria: ['data:image/jpeg;base64,G1', 'data:image/jpeg;base64,G2'],
  depoimentos: [{ texto: 'Melhor padaria do bairro.', autor: 'Marina S.' }],
};

for (const t of SITE_TEMPLATES) {
  const html = t.render(comFotos);
  checar(`${t.nome}: usa a foto de capa`, html.includes('base64,CAPA'));
  checar(`${t.nome}: mostra a galeria`, html.includes('base64,G1') && html.includes('base64,G2'));
  checar(`${t.nome}: mostra o depoimento`,
    html.includes('Melhor padaria do bairro.') && html.includes('Marina S.'));
}

console.log('\n--- sem foto, o site continua apresentável ---');
for (const t of SITE_TEMPLATES) {
  const html = t.render(dados);
  checar(`${t.nome}: não deixa buraco de imagem`, !html.includes('<img src=""') && !html.includes('undefined'));
  checar(`${t.nome}: seção de galeria some quando não há foto`, !html.includes('class="galeria"'));
  checar(`${t.nome}: usa textura no lugar da foto`, html.includes('radial-gradient'));
}

console.log('\n--- cada layout tem composição própria ---');
const assinaturas = SITE_TEMPLATES.map(t => {
  const html = t.render(comFotos);
  // as classes estruturais de cada um
  return [...new Set((html.match(/class="([a-z-]+)"/g) || []))].sort().join('|');
});
checar('nenhum layout repete a estrutura de outro',
  new Set(assinaturas).size === assinaturas.length);

console.log('\n--- o depoimento do usuário também é escapado ---');
const comScript = t0Render();
function t0Render() {
  return SITE_TEMPLATES[0].render({
    ...comFotos,
    depoimentos: [{ texto: '<script>alert(1)</script>', autor: '<b>x</b>' }],
  });
}
checar('script no depoimento não vira script', !comScript.includes('<script>alert(1)</script>'));


console.log('\n--- selo do LeadSage nos planos sem marca propria ---');
for (const t of SITE_TEMPLATES) {
  const assinado = t.render({ ...dados, selo: true });
  const limpo = t.render({ ...dados, selo: false });
  checar(`${t.nome}: plano sem marca propria sai assinado`,
    assinado.includes('selo-leadsage') && assinado.includes('LeadSage'));
  checar(`${t.nome}: plano com marca propria sai limpo`, !limpo.includes('selo-leadsage'));
  checar(`${t.nome}: sem a flag, nao assina`, !t.render(dados).includes('selo-leadsage'));
  checar(`${t.nome}: o selo fica fora do rodape do cliente`,
    assinado.indexOf('</footer>') < assinado.indexOf('<div class="selo-leadsage">'));
  checar(`${t.nome}: o selo nao rouba a cor da marca`,
    !assinado.includes('selo-leadsage" style'));
}

/* --------------------------------------------------- layouts premium */

console.log('\n--- premium: seguranca das imagens ---');
const imagemMaliciosa: SiteData = {
  ...dados,
  capa: 'javascript:alert(1)',
  fotoSobre: `https://x.com/a.jpg" onerror="alert(1)`,
  galeria: ['https://ok.com/foto.jpg', "x' onload='alert(1)", 'data:text/html;base64,PHNjcmlwdD4='],
  logo: 'http://sem-https.com/logo.png',
};
for (const t of LAYOUTS_PREMIUM) {
  const html = t.render(imagemMaliciosa);
  checar(`${t.nome}: recusa URL de imagem perigosa`,
    !/javascript:|onerror=|onload=|data:text\/html|http:\/\/sem-https/i.test(html));
}
checar('urlImagem aceita https', urlImagem('https://images.pexels.com/a.jpg') === 'https://images.pexels.com/a.jpg');
checar('urlImagem aceita data:image', urlImagem('data:image/png;base64,iVBORw0KGgo=').startsWith('data:image/png'));
checar('urlImagem recusa http', urlImagem('http://x.com/a.jpg') === '');

console.log('\n--- premium: texto nao se repete ---');
const umaFrase: SiteData = { ...dados, sobre: 'Padaria de bairro desde 1998 com fermentação natural.' };
const duasFrases: SiteData = { ...dados, sobre: 'Padaria de bairro desde 1998. Fornadas antes do sol nascer.' };
for (const t of LAYOUTS_PREMIUM) {
  const conta = (h: string, trecho: string) => h.split(trecho).length - 1;
  const a = t.render(umaFrase), b = t.render(duasFrases);
  checar(`${t.nome}: "sobre" de uma frase aparece uma vez no corpo`,
    conta(a.split('<body>')[1], 'desde 1998 com fermentação') === 1);
  checar(`${t.nome}: duas frases se dividem entre capa e seção`,
    conta(b.split('<body>')[1], 'Padaria de bairro desde 1998.') === 1 &&
    conta(b.split('<body>')[1], 'Fornadas antes do sol nascer.') === 1);
}

console.log('\n--- premium: cada um tem identidade propria ---');
const fontes = LAYOUTS_PREMIUM.map(t => (t.render(dados).match(/css2\?family=([A-Za-z+]+)/) || [])[1]);
checar('seis pares de fontes diferentes', new Set(fontes).size === LAYOUTS_PREMIUM.length, fontes.join(','));
for (const t of LAYOUTS_PREMIUM) {
  checar(`${t.nome}: selo do Google quando há nota`, t.render({ ...dados, nota: 4.7, avaliacoes: 120 }).includes('120 avaliações'));
  checar(`${t.nome}: sem selo do Google quando a nota é baixa`, !t.render({ ...dados, nota: 3.1 }).includes('selo-google"'));
}

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
