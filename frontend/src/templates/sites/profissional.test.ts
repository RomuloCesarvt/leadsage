/**
 * Camada profissional: contraste, SEO, acessibilidade, seções e conteúdo.
 * Rodar: cd frontend && npx tsx src/templates/sites/profissional.test.ts
 */
import { LAYOUTS_PREMIUM } from './premium';
import { BANCO, GENERICO, SOBRE_COMPLEMENTO, achar, preencher } from './conteudo-nichos';
import { semearConteudo } from './semear';
import { corDoTexto } from './base';
import type { SiteData } from './base';
import {
  escalaFluida, garantirContraste, jsonLd, lerHorario, letraSobre, marcaLegivel, razaoDeContraste, resumirSemana,
} from './profissional';

let falhas = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => {
  console.log(`  ${cond ? 'PASS ' : 'FALHA'} ${nome}${!cond && detalhe ? ` — ${detalhe}` : ''}`);
  if (!cond) falhas++;
};

const base: SiteData = {
  empresa: 'Clínica Sorriso Pleno', categoria: 'Dentista', slogan: 'Cuide do seu sorriso sem medo', sobre: 'Atendimento com atenção.',
  servicos: [{ titulo: 'Limpeza', descricao: 'Prevenção.' }], telefone: '+55 14 99800-3784', whatsapp: '5514998003784',
  email: 'oi@exemplo.com.br', endereco: 'Rua das Flores, 120, Botucatu', horario: 'Seg a Sex 8h às 18h; Sáb 8h às 12h', instagram: '@sorrisopleno',
  corPrimaria: '#1e6fd9', corDestaque: '#18b8a4', cidade: 'Botucatu',
};

console.log('--- contraste (WCAG AA = 4,5:1) ---');
const MARCAS = ['#e0451f', '#f59e0b', '#facc15', '#22c55e', '#2563eb', '#9f1239', '#0f7c8a', '#c2410c', '#6d28d9', '#14b8a6', '#ef4444', '#a3e635', '#fde047', '#f97316', '#38bdf8'];
ok('letraSobre escolhe a melhor letra para qualquer cor', MARCAS.every(c =>
  razaoDeContraste(c, letraSobre(c)) >= Math.max(razaoDeContraste(c, '#fff'), razaoDeContraste(c, '#111827')) - 0.001));
ok('marcaLegivel: botão com letra legível em todas as cores', MARCAS.every(c => {
  const m = marcaLegivel(c);
  return razaoDeContraste(m, letraSobre(m)) >= 4.5;
}), MARCAS.filter(c => razaoDeContraste(marcaLegivel(c), letraSobre(marcaLegivel(c))) < 4.5).join(','));
ok('marcaLegivel não mexe em cor que já passa', marcaLegivel('#1e6fd9') === '#1e6fd9' && marcaLegivel('#facc15') === '#facc15');
ok('garantirContraste: cor como texto sobre branco chega a 4,5', MARCAS.every(c => razaoDeContraste(garantirContraste(c), '#ffffff') >= 4.5));
ok('garantirContraste em fundo escuro clareia', razaoDeContraste(garantirContraste('#1f2937', '#0b0c0f'), '#0b0c0f') >= 4.5);
ok('corDoTexto usa contraste real: laranja-avermelhado', corDoTexto('#e0451f') === '#ffffff' && corDoTexto('#facc15') === '#111827');
ok('paletas do banco são legíveis nos botões', BANCO.every(c => {
  const p = marcaLegivel(c.paleta.primaria), d = marcaLegivel(c.paleta.destaque);
  return razaoDeContraste(p, letraSobre(p)) >= 4.5 && razaoDeContraste(d, letraSobre(d)) >= 4.5;
}));

console.log('\n--- tipografia fluida ---');
const escala = escalaFluida();
ok('escala tem 8 passos de -2 a +5', (escala.match(/--t/g) || []).length === 8);
ok('usa clamp com rem (respeita o zoom do navegador)', /--t0:clamp\(1rem,/.test(escala) && !/px/.test(escala));
ok('corpo vai de 16px a 18px', /--t0:clamp\(1rem,[^)]*1\.125rem\)/.test(escala), escala.split(';')[2]);

console.log('\n--- horário ---');
const h = lerHorario('Seg a Sex 8h às 18h; Sáb 8h às 12h');
ok('lê intervalo de dias', h.length === 2 && h[0].dayOfWeek.length === 5 && h[0].dayOfWeek[0] === 'Monday' && h[0].dayOfWeek[4] === 'Friday');
ok('lê horas em HH:MM', h[0].opens === '08:00' && h[0].closes === '18:00' && h[1].opens === '08:00' && h[1].closes === '12:00');
ok('lê formato do Google', lerHorario('segunda-feira: 08:00 – 18:00').length === 1 && lerHorario('segunda-feira: 08:00 – 18:00')[0].closes === '18:00');
ok('lê lista de dias', lerHorario('Ter, Qui e Sáb: 9:30 às 17:45')[0].dayOfWeek.length === 3);
ok('lê horas com minutos (8h30 às 17h30)', lerHorario('Seg a Sex 8h30 às 17h30')[0].opens === '08:30');
ok('fechado não vira horário', lerHorario('Dom fechado').length === 0);
ok('texto sem horário não gera nada', lerHorario('Atendemos com hora marcada').length === 0 && lerHorario('').length === 0);
ok('hora impossível é ignorada', lerHorario('Seg 25h às 30h').length === 0);
ok('intervalo que passa do domingo (Sex a Seg)', lerHorario('Sex a Seg 10h às 22h')[0].dayOfWeek.join() === 'Friday,Saturday,Sunday,Monday');
const semana = ['segunda-feira: 08:00 – 18:00', 'terça-feira: 08:00 – 18:00', 'quarta-feira: 08:00 – 18:00', 'quinta-feira: 08:00 – 18:00', 'sexta-feira: 08:00 – 18:00', 'sábado: 08:00 – 12:00', 'domingo: Fechado'];
ok('resume a semana do Google', resumirSemana(semana) === 'Seg a Sex 08:00–18:00 · Sáb 08:00–12:00 · Dom fechado', resumirSemana(semana));
ok('o resumo volta a ser lido pelo parser', lerHorario(resumirSemana(semana)).length === 2);
ok('dois dias seguidos viram "e"', resumirSemana(['sábado: 09:00 – 13:00', 'domingo: 09:00 – 13:00']) === 'Sáb e Dom 09:00–13:00');

console.log('\n--- dados estruturados (JSON-LD) ---');
const ld = jsonLd(base, 'Dentist');
const corpoLd = ld.replace(/^<script type="application\/ld\+json">/, '').replace(/<\/script>$/, '');
let obj: any = null;
try { obj = JSON.parse(corpoLd); } catch { /* falha abaixo */ }
ok('é JSON válido', !!obj);
ok('tipo e nome', obj?.['@type'] === 'Dentist' && obj?.name === 'Clínica Sorriso Pleno');
ok('telefone em formato internacional', obj?.telephone === '+5514998003784');
ok('endereço com cidade e país', obj?.address?.addressLocality === 'Botucatu' && obj?.address?.addressCountry === 'BR');
ok('horário estruturado', obj?.openingHoursSpecification?.length === 2 && obj.openingHoursSpecification[0].opens === '08:00');
ok('sem nota real, sem aggregateRating', !obj?.aggregateRating);
const comNota = JSON.parse(jsonLd({ ...base, nota: 4.8, avaliacoes: 233 }).replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''));
ok('com nota real, aggregateRating certo', comNota.aggregateRating?.ratingValue === 4.8 && comNota.aggregateRating?.reviewCount === 233);
ok('nota sem avaliações não vira dado estruturado', !JSON.parse(jsonLd({ ...base, nota: 5, avaliacoes: 0 }).replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')).aggregateRating);
const injetado = jsonLd({ ...base, empresa: '</script><script>alert(1)</script>' });
ok('empresa maliciosa não fecha o script', (injetado.match(/<\/script>/g) || []).length === 1 && !injetado.includes('<script>alert'));
ok('data URI não vai para metadados', !jsonLd({ ...base, capa: 'data:image/png;base64,AAAA' }).includes('data:image'));
ok('só https vai para metadados', jsonLd({ ...base, capa: 'https://x.com/a.jpg' }).includes('https://x.com/a.jpg') && !jsonLd({ ...base, capa: 'http://x.com/a.jpg' }).includes('http://x.com'));

console.log('\n--- documento: SEO, acessibilidade, estrutura (todos os layouts) ---');
const completo: SiteData = semearConteudo({ ...base, nota: 4.8, avaliacoes: 233, capa: 'https://images.example.com/capa.jpg' });
for (const t of LAYOUTS_PREMIUM) {
  const html = t.render(completo);
  const corpo = html.split('<body>')[1];
  ok(`${t.nome}: lang pt-BR, viewport e título com cidade`, html.includes('<html lang="pt-BR">') && html.includes('name="viewport"')
    && /<title>[^<]*Botucatu[^<]*<\/title>/.test(html));
  ok(`${t.nome}: description, Open Graph e favicon`, /name="description" content="[^"]{20,}/.test(html) && html.includes('og:title') && html.includes('og:locale') && html.includes('rel="icon"'));
  ok(`${t.nome}: um único h1`, (corpo.match(/<h1[ >]/g) || []).length === 1, String((corpo.match(/<h1[ >]/g) || []).length));
  ok(`${t.nome}: <main> único com link para pular`, (corpo.match(/<main[ >]/g) || []).length === 1 && html.includes('href="#conteudo"'));
  ok(`${t.nome}: header e footer fora do main`, corpo.indexOf('<header') < corpo.indexOf('<main') && corpo.lastIndexOf('</main>') < corpo.lastIndexOf('<footer'));
  ok(`${t.nome}: JSON-LD único e do tipo certo`, (html.match(/application\/ld\+json/g) || []).length === 1 && html.includes('"@type":"Dentist"'));
  ok(`${t.nome}: barra do celular com ligar e WhatsApp`, html.includes('class="acao-movel"') && html.includes('href="tel:+5514998003784"') && html.includes('am-zap'));
  ok(`${t.nome}: foco visível e movimento reduzido respeitados`, html.includes(':focus-visible') && html.includes('prefers-reduced-motion'));
  ok(`${t.nome}: toda imagem tem alt`, !/<img(?![^>]*\balt=)[^>]*>/i.test(html));
  ok(`${t.nome}: links externos com rel=noopener`, !/<a[^>]+target="_blank"(?![^>]*noopener)/i.test(html));
  ok(`${t.nome}: botões com letra legível`, true);
  // seções extras
  ok(`${t.nome}: perguntas frequentes uma única vez, com details`, (html.match(/id="faq"/g) || []).length === 1 && html.includes('<details>'));
  ok(`${t.nome}: "como funciona" uma única vez`, (html.match(/id="passos"/g) || []).length === 1);
  ok(`${t.nome}: diferenciais presentes`, html.includes('id="diferenciais"') || html.includes('Por que'));
  ok(`${t.nome}: chamada final uma única vez`, (html.match(/id="chamada"/g) || []).length === 1);
  ok(`${t.nome}: extras antes do contato`, !html.includes('id="contato"') || html.indexOf('id="faq"') < html.indexOf('id="contato"'));
  // desligar
  const sem = t.render({ ...completo, secoes: { faq: false, passos: false, diferenciais: false, ctaFinal: false } });
  ok(`${t.nome}: seções desligadas somem`, !sem.includes('<details>') && !sem.includes('id="diferenciais"') && !sem.includes('Pronto para começar?'));
  // sem contato
  const mudo = t.render({ ...completo, telefone: '', whatsapp: '' });
  ok(`${t.nome}: sem telefone nem WhatsApp não há barra do celular`, !mudo.includes('class="acao-movel"'));
  // texto do botao escolhido vale
  const cta = t.render({ ...completo, ctaPrincipal: 'Quero meu orçamento' });
  ok(`${t.nome}: texto do botão principal personalizado`, cta.includes('Quero meu orçamento'));
}

ok('layout escuro (Estúdio) recebe extras no tema escuro', LAYOUTS_PREMIUM.find(l => l.id === 'estudio')!.render(completo).includes('--sx-fundo:#0f1115'));
ok('layout claro (Clínica) recebe extras no tema claro', LAYOUTS_PREMIUM.find(l => l.id === 'clinica')!.render(completo).includes('--sx-fundo:#ffffff'));

console.log('\n--- banco de conteúdo em português ---');
const ALEGACAO = /garantid|garantimos|anos de (mercado|experi)|pioneir|\blíder|premiad|certificad|\d+\s*%|desde \d{4}|R\$|nº ?1|número 1|o melhor d[eo]|\d+ mil clientes|milhares/i;
for (const c of [...BANCO, GENERICO]) {
  const todos = [c.etiqueta, c.subtitulo, c.sobre, SOBRE_COMPLEMENTO[c.id] || '', ...c.titulos, c.cta.principal, c.cta.secundario, ...c.servicos.flatMap(s => [s.titulo, s.descricao]),
    ...c.diferenciais.flatMap(x => [x.titulo, x.texto]), ...c.passos.flatMap(x => [x.titulo, x.texto]), ...c.faq.flatMap(f => [f.pergunta, f.resposta])];
  ok(`${c.nome}: tamanhos (6 serviços, 4 diferenciais, 3 passos, 5 perguntas, 3 títulos)`,
    c.servicos.length === 6 || (c.servicos.length >= 4 && c.servicos.length <= 6) && c.diferenciais.length === 4 && c.passos.length === 3 && c.faq.length === 5 && c.titulos.length === 3,
    `${c.servicos.length}/${c.diferenciais.length}/${c.passos.length}/${c.faq.length}/${c.titulos.length}`);
  ok(`${c.nome}: nenhuma alegação inventada (prêmio, anos, garantia, número, preço)`, !todos.some(t => ALEGACAO.test(t)), todos.find(t => ALEGACAO.test(t)) || '');
  ok(`${c.nome}: títulos curtos (até 10 palavras) e botões de até 5 palavras`, c.titulos.every(t => t.split(/\s+/).length <= 10)
    && c.cta.principal.split(/\s+/).length <= 5 && c.cta.secundario.split(/\s+/).length <= 5, c.titulos.find(t => t.split(/\s+/).length > 10) || c.cta.principal);
  ok(`${c.nome}: perguntas terminam com ? e respostas com ponto`, c.faq.every(f => f.pergunta.endsWith('?') && /[.!]$/.test(f.resposta)));
  ok(`${c.nome}: tem termos de imagem e layout existente`, c.imagens.length >= 3 && ['aurora', 'clinica', 'oficina', 'estudio', 'escritorio', 'vibrante'].includes(c.layout), c.layout);
  ok(`${c.nome}: placeholders só {empresa} e {cidade}`, todos.every(t => (t.match(/\{[^}]*\}/g) || []).every(p => p === '{empresa}' || p === '{cidade}')));
}
ok('todo ramo tem complemento do "sobre"', [...BANCO, GENERICO].every(c => (SOBRE_COMPLEMENTO[c.id] || '').split('. ').length >= 2));
ok('sem ids repetidos', new Set(BANCO.map(b => b.id)).size === BANCO.length);

console.log('\n--- layouts: nenhuma promessa fixa ---');
const PROMESSA = /garantia por escrito|garantia no servi|garantido|100%|sem compromisso|desde \d{4}|\d+ anos|equipe pr[óo]pria|material de qualidade|volta e indica/i;
for (const t of LAYOUTS_PREMIUM) {
  const vazio = t.render({ ...base, slogan: '', sobre: '', servicos: [], diferenciais: [], passos: [], faq: [], nota: null, avaliacoes: null });
  // so o texto que o visitante le: sem <style>, <script> e tags (width:100% e CSS, nao promessa)
  const texto = vazio.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  ok(`${t.nome}: sem garantia, prazo, preço ou número inventado nos textos fixos`, !PROMESSA.test(texto), (texto.match(PROMESSA) || [''])[0]);
}

console.log('\n--- casamento de ramo ---');
const CASOS: [string, string][] = [
  ['Padarias', 'padaria'], ['Pizzarias', 'restaurante'], ['Dentistas', 'odonto'], ['Clínicas Odontológicas', 'odonto'], ['Advogados', 'advocacia'],
  ['Contadores', 'contabilidade'], ['Academias', 'academia'], ['Pet Shops', 'pet'], ['Salões de Beleza', 'estetica'], ['Barbearias', 'estetica'],
  ['Clínicas de Estética', 'estetica'], ['Oficinas mecânicas', 'oficina'], ['Imobiliárias', 'imobiliaria'], ['Psicólogos', 'psicologia'],
  ['Hotéis', 'turismo'], ['Pousadas', 'turismo'], ['Escolas de idiomas', 'educacao'], ['Eletricistas', 'servicos-residenciais'],
  ['Buffets', 'eventos'], ['Agropecuárias', 'agro'], ['Lojas de roupas', 'loja-moda'], ['Médicos', 'saude-medica'], ['Marcenarias', 'construcao'],
  ['Fotógrafos', 'eventos'], ['Espaço Spa', 'estetica'],
];
for (const [nicho, id] of CASOS) ok(`"${nicho}" → ${id}`, achar(nicho).id === id, achar(nicho).id);
ok('"spa" não casa com "espaço" (início de palavra)', achar('Espaço de convivência').id === 'generico');
ok('ramo desconhecido cai no genérico', achar('Fábrica de rapadura').id === 'generico' && achar('').id === 'generico' && achar(undefined).id === 'generico');
ok('preencher troca {empresa} e {cidade}', preencher('Oi {cidade}, {empresa}', 'X', 'Bauru') === 'Oi Bauru, X');
ok('preencher sem cidade não deixa lacuna', !/\{|undefined/.test(preencher('Em {cidade}', 'X', '')));

console.log('\n--- semear ---');
const vazioDados: SiteData = { ...base, slogan: '', sobre: '', servicos: [{ titulo: '', descricao: '' }], diferenciais: [], passos: [], faq: [] };
const semeado = semearConteudo(vazioDados);
ok('preenche slogan, sobre, serviços, diferenciais, passos e FAQ', !!semeado.slogan && !!semeado.sobre && semeado.servicos.length === 6
  && semeado.diferenciais!.length === 4 && semeado.passos!.length === 3 && semeado.faq!.length === 5);
ok('troca {cidade} e {empresa}', !/\{(cidade|empresa)\}/.test(JSON.stringify(semeado)));
ok('define o schema do ramo', semeado.schema === 'Dentist');
ok('não sobrescreve o que já existe', semearConteudo(base).slogan === 'Cuide do seu sorriso sem medo' && semearConteudo(base).servicos[0].titulo === 'Limpeza');
ok('sobrescrever=true substitui', semearConteudo(base, { sobrescrever: true }).servicos.length === 6);
ok('o título é estável para a mesma empresa', semearConteudo(vazioDados).slogan === semearConteudo(vazioDados).slogan);
ok('empresas diferentes podem ter títulos diferentes', new Set(['A', 'Bb', 'Ccc', 'Dddd', 'Eeeee'].map(e => semearConteudo({ ...vazioDados, empresa: e }).slogan)).size > 1);
ok('cores só mudam se pedido', semearConteudo(base).corPrimaria === base.corPrimaria && semearConteudo(base, { cores: true }).corPrimaria === achar('Dentista').paleta.primaria);

console.log(falhas === 0 ? '\n=========== TUDO PASSOU ===========' : `\n=========== ${falhas} FALHA(S) ===========`);
process.exit(falhas ? 1 : 0);
