/** Rodar:  cd frontend && npx tsx src/templates/sites/acabamento.test.ts */
import { acabamento } from './acabamento';
import { montarPrevia } from './previa';

let falhas = 0;
const checar = (nome: string, ok: boolean) => { console.log(`  ${ok ? 'PASS ' : 'FALHA'} ${nome}`); if (!ok) falhas++; };

const base = '<html><head><title>x</title></head><body><section><h2>a</h2></section><style>.capa{min-height:100vh}</style></body></html>';
const o = acabamento(base);
checar('usa 100dvh além do 100vh', o.includes('min-height:100vh;min-height:100dvh'));
checar('curva de saída forte e reduced-motion', o.includes('cubic-bezier(.23,1,.32,1)') && o.includes('prefers-reduced-motion:reduce'));
checar('sem o clarão do toque', o.includes('-webkit-tap-highlight-color:transparent'));
checar('não repete quando já aplicado', acabamento(o) === o);
const css = o.match(/<style id="acabamento">([\s\S]*?)<\/style>/)![1];
checar('só anima transform/opacity (nada de top/left/width/height)', !/transition:[^}]*\b(top|left|width|height)\b/.test(css));
checar('sem JS o conteúdo aparece (ocultar só com a classe ac-js)', !/(^|\})\.ac-rev\{/.test(css));
const { html } = montarPrevia({ id: 'l1', company: 'Clínica Sorriso', niche: 'Dentistas', city: 'Botucatu', phone: '5514999999999' });
checar('toda prévia sai com o acabamento, uma vez só', (html.match(/id="acabamento"/g) || []).length === 1);

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
