// Direção de arte: cada segmento tem identidade própria e o site usa as cores e fontes dele.
import assert from 'node:assert/strict';
import { MODELOS_DE_PAINEL, direcaoDeArte, fonteDoModelo, segmentoDoRamo, todosOsSegmentos } from './direcao-de-arte';
import { dadosDoLead, escolherTemplate, montarPrevia } from './previa';
import { SITE_TEMPLATES } from './layouts';

// o ramo certo cai no segmento certo
const casos: [string, string][] = [
  ['Pizzarias', 'comida'], ['Padarias', 'doces'], ['Dentistas', 'odonto'], ['Clínicas Odontológicas', 'odonto'], ['Psicologia', 'mente'], ['Nutricionistas', 'saude'],
  ['Barbearias', 'barbearia'], ['Clínicas de estética', 'estetica'], ['Escritórios de advocacia', 'juridico'],
  ['Pet shops', 'pet'], ['Clínica veterinária', 'pet'], ['Academias', 'fitness'], ['Oficinas mecânicas', 'oficina'],
  ['Imobiliárias', 'imoveis'], ['Joalherias', 'moda'], ['Escolas de idiomas', 'educacao'], ['Hotéis', 'turismo'],
  ['Floriculturas', 'natureza'], ['Concessionárias', 'veiculos'], ['Sorveterias', 'doces'], ['Coisa nenhuma', 'generico'], ['', 'generico'],
];
for (const [ramo, id] of casos) assert.equal(segmentoDoRamo(ramo).id, id, `${ramo} -> ${id}`);

// todo modelo citado existe, e toda fonte existe
const ids = new Set(SITE_TEMPLATES.map(t => t.id));
for (const s of todosOsSegmentos()) {
  for (const m of s.modelos) assert.ok(ids.has(m), `modelo ${m} de ${s.id}`);
  for (const f of [s.fonte, s.fonteSerifa, s.fonteSans]) assert.ok(['elegante', 'artesanal', 'moderna', 'forte', 'luxo', 'sobria', 'amigavel', 'editorial', 'tecnologica'].includes(f), `fonte ${f} de ${s.id}`);
  for (const p of s.paletas) assert.match(p.primaria + p.destaque, /^#[0-9a-f]{6}#[0-9a-f]{6}$/i);
}

// segmentos diferentes, cores diferentes (o que o dono reclamou: tudo na mesma cor)
const cores = new Set(['Pizzarias', 'Dentistas', 'Barbearias', 'Advocacia', 'Pet shops', 'Academias', 'Hotéis'].map(r => direcaoDeArte(r, 'X').paleta.primaria));
assert.ok(cores.size >= 6, `cores distintas: ${cores.size}`);

// a mesma empresa sempre cai na mesma paleta; empresas diferentes do mesmo ramo podem variar
assert.deepEqual(direcaoDeArte('Pizzarias', 'Forno Bom'), direcaoDeArte('Pizzaria', 'Forno Bom'));
const variacao = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(e => direcaoDeArte('Pizzarias', `Pizza ${e}`).paleta.nome));
assert.ok(variacao.size >= 2);

// comida tem cor quente (vermelho/laranja), saúde tem cor fria (azul/verde)
const quente = (h: string) => { const r = parseInt(h.slice(1, 3), 16), b = parseInt(h.slice(5, 7), 16); return r > b + 40; };
for (const e of ['A', 'B', 'C', 'D']) assert.ok(quente(direcaoDeArte('Pizzarias', e).paleta.primaria), 'comida quente');
for (const e of ['A', 'B', 'C', 'D']) assert.ok(!quente(direcaoDeArte('Dentistas', e).paleta.primaria), 'saúde fria');

// o site do lead usa a direção: cor do segmento e fonte do modelo no HTML
const pizza = { id: 'l1', company: 'Pizzaria Brasa Viva', niche: 'Pizzarias', city: 'Botucatu', phone: '5514999990000' };
const dados = dadosDoLead(pizza);
assert.equal(dados.segmento, 'comida');
assert.equal(dados.corPrimaria, direcaoDeArte('Pizzarias', 'Pizzaria Brasa Viva').paleta.primaria);
const site = montarPrevia(pizza, []);
assert.ok(site.html.includes(dados.corPrimaria), 'a cor do segmento está no site');
const tmpl = escolherTemplate('Pizzarias', 'Pizzaria Brasa Viva');
assert.ok(direcaoDeArte('Pizzarias').modelos.includes(tmpl.id));
const fonte = fonteDoModelo('comida', tmpl.id);
assert.ok(site.html.includes('fonts.googleapis.com'), 'fonte do par no HTML');
assert.ok(fonte.length > 0);

// dentista e pizzaria não saem com a mesma cara
const dent = montarPrevia({ id: 'l2', company: 'Sorriso Claro', niche: 'Dentistas', city: 'Botucatu' }, []);
assert.notEqual(dent.html.slice(0, 4000), site.html.slice(0, 4000));

// fonte escolhida pelo usuário vence a do segmento
const usuario = SITE_TEMPLATES.find(t => t.id === 'clinica')!.render({ ...dados, fonte: 'luxo' });
assert.ok(usuario.includes('Cormorant'), 'fonte do usuário vence');

// psicologia não recebe modelo de painel nem o de dentista
for (const r of ['Psicologia', 'Psicólogos', 'Clínica de psicologia', 'Terapia', 'Psicanálise', 'Fonoaudiologia']) {
  const sg = segmentoDoRamo(r);
  assert.equal(sg.id, 'mente', r);
  for (const m of ['bento', 'fintech', 'b2b', 'campus', 'planta', 'sorriso', 'neon', 'impacto']) assert.ok(!sg.modelos.includes(m), `${r} não leva ${m}`);
}
assert.equal(segmentoDoRamo('Clínicas Odontológicas').id, 'odonto');
assert.ok(segmentoDoRamo('Dentistas').modelos.includes('sorriso'));
assert.ok(!segmentoDoRamo('Nutricionistas').modelos.includes('bento'));

// modelos de painel só aparecem nos segmentos que os justificam
for (const s of todosOsSegmentos()) {
  for (const m of s.modelos) {
    const permitidos = MODELOS_DE_PAINEL[m];
    if (permitidos) assert.ok(permitidos.includes(s.id), `${m} não combina com ${s.id}`);
  }
}

// para qualquer empresa de qualquer ramo, o modelo escolhido sempre vem da lista do segmento
for (const ramo of ['Psicologia', 'Dentistas', 'Padarias', 'Advocacia', 'Hotéis', 'Imobiliárias', 'Floriculturas', 'Qualquer coisa']) {
  for (const emp of ['A', 'B', 'C', 'D', 'E', 'F']) {
    const t = escolherTemplate(ramo, `Empresa ${emp}`);
    assert.ok(segmentoDoRamo(ramo).modelos.includes(t.id), `${ramo}/${emp}: ${t.id}`);
  }
}

console.log('direcao.test: ok');
