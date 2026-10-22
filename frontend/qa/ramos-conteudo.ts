/**
 * Qual conteúdo de site cada ramo do catálogo recebe.
 *
 * Lê a lista de ramos (JSON no stdin ou o catálogo do backend) e imprime { ramo: id do conteúdo }.
 * Usado por backend/scripts/auditar_ramos.py, que cruza isso com o perfil de fotos de cada ramo.
 *
 *   npx tsx qa/ramos-conteudo.ts ../backend/nichos_catalogo.json
 */
import { readFileSync } from 'node:fs';
import { achar } from '../src/templates/sites/conteudo-nichos';

const arquivo = process.argv[2];
const ramos: string[] = JSON.parse(readFileSync(arquivo, 'utf-8'));
const saida: Record<string, { id: string; titulo: string }> = {};
for (const r of ramos) {
  const c = achar(r);
  saida[r] = { id: c.id, titulo: c.titulos[0] };
}
process.stdout.write(JSON.stringify(saida));
