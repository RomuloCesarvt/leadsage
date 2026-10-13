// Gera a prévia de uma empresa de cada segmento, para conferir cor, fonte e modelo no navegador.
// Uso: npx tsx qa/render-nichos.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { montarPrevia } from '../src/templates/sites/previa';

const leads = [
  ['pizzaria', 'Pizzaria Brasa Viva', 'Pizzarias'], ['dentista', 'Sorriso Claro', 'Dentistas'], ['barbearia', 'Navalha de Ouro', 'Barbearias'],
  ['advocacia', 'Silva e Prado Advogados', 'Escritórios de advocacia'], ['pet', 'Amigo Fiel', 'Pet shops'], ['academia', 'Força Total', 'Academias'],
  ['estetica', 'Aura Estética', 'Clínicas de estética'], ['oficina', 'Auto Center Rocha', 'Oficinas mecânicas'], ['padaria', 'Pão Quente', 'Padarias'],
];
const pasta = join(import.meta.dirname, 'saida', 'nichos');
mkdirSync(pasta, { recursive: true });
for (const [id, company, niche] of leads) {
  const s = montarPrevia({ id, company, niche, city: 'Botucatu', phone: '5514999990000', rating: 4.8, rating_count: 120 }, []);
  writeFileSync(join(pasta, `${id}.html`), s.html, 'utf8');
  console.log(id, '->', s.template);
}
