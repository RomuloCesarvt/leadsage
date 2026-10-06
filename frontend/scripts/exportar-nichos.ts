/**
 * Exporta o catálogo de nichos da busca para o backend testar a cobertura
 * do banco de imagens contra a mesma lista que a tela mostra.
 *
 *   npx tsx scripts/exportar-nichos.ts
 */
import { writeFileSync } from 'node:fs';
import { TODOS } from '../src/lib/nichos';

writeFileSync('../backend/nichos_catalogo.json', JSON.stringify(TODOS.map(n => n.nome)), 'utf-8');
console.log(`${TODOS.length} nichos exportados`);
