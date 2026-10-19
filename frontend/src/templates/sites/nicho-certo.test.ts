/**
 * CADA NICHO É CADA NICHO: nenhum site sai com palavra de outro ramo (cardápio em clínica, sorriso em gastro, "quem treina" em
 * barbearia). Monta o site de cada segmento em CADA modelo que ele pode receber e procura as palavras proibidas no texto visível.
 * Rodar:  cd frontend && npx tsx src/templates/sites/nicho-certo.test.ts
 */
import { RAMO_DO_SEGMENTO, todosOsSegmentos } from './direcao-de-arte';
import { SITE_TEMPLATES } from './layouts';
import { dadosDoLead } from './previa';

let falhas = 0;
const checar = (nome: string, ok: boolean, detalhe = '') => { if (!ok) { console.log(`  FALHA ${nome} ${detalhe}`); falhas++; } };

// palavra -> segmentos onde ela é permitida
const DONO: [RegExp, string[]][] = [
  [/\bcard[aá]pio\b|\bcozinha\b|fazer pedido|pedir agora|\bcomer\b|[aá]gua na boca|\bpadaria\b|\bfornada/i, ['comida', 'doces', 'mercado']],
  [/\bsorriso\b|\bdente/i, ['odonto']],
  [/\btreina\b|primeiro dia de treino|\bmuscula/i, ['fitness']],
  [/\bcarro\b|\bve[ií]culo|vendedor/i, ['veiculos', 'oficina']],
  [/\btutor(es)?\b|\bpet\b|\bbanho e tosa/i, ['pet']],
  [/\bcr[eé]dito\b|\bsimular\b|simula[cç][aã]o/i, ['financeiro', 'veiculos']],
  [/\bcole[cç][aã]o\b|lista vip/i, ['moda', 'estetica', 'natureza']],
  [/\bobra\b/i, ['arquitetura', 'oficina']],
  [/\bencomend/i, ['doces', 'comida', 'mercado', 'natureza']],
];

const PROBE: Record<string, string[]> = {}; // segmento -> ramos de teste (o padrão + especialidades reais do Google)
for (const s of todosOsSegmentos()) PROBE[s.id] = [RAMO_DO_SEGMENTO[s.id] || 'Negócio local'];
PROBE.saude.push('Gastroenterologistas', 'Ginecologistas', 'Clínicas');

for (const s of todosOsSegmentos()) {
  for (const ramo of PROBE[s.id]) {
    const d = dadosDoLead({ id: 'x', company: 'Empresa Teste', niche: ramo, city: 'Botucatu', phone: '5514999990000', whatsapp: true, rating: 4.8, rating_count: 90 });
    for (const m of s.modelos) {
      const t = SITE_TEMPLATES.find(x => x.id === m)!;
      const html = t.render({ ...d, selo: true });
      const texto = html.slice(html.indexOf('<body')).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      for (const [re, donos] of DONO) {
        const achou = texto.match(re);
        checar(`${s.id} (${ramo}) no modelo ${m}`, !achou || donos.includes(s.id), `tem "${achou?.[0]}" (palavra de ${donos.join('/')})`);
      }
    }
  }
}
console.log(`=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
