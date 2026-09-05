/**
 * Gera o recorte de paises/estados/cidades que o LeadSage realmente usa.
 *
 * `country-state-city` embute um city.json com as cidades do mundo: 8,3 MB
 * (2,4 MB comprimidos) que o navegador baixava so para preencher um
 * <select>. Nos vendemos para Brasil, Portugal e EUA — os paises que os
 * planos liberam em payments.PLANS.
 *
 * A biblioteca continua sendo a fonte; ela so nao viaja mais para o
 * navegador. Rodar depois de atualizar a dependencia:
 *
 *   node scripts/gerar-geo.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { Country, State, City } from 'country-state-city';

const PAISES = ['BR', 'PT', 'US'];

/**
 * A biblioteca traz Portugal com alguns nomes em ingles. Num app em
 * portugues, vendendo para Portugal, "Lisbon" no <select> esta errado —
 * e o texto do <select> e o que vai para a busca no Google.
 *
 * Sao poucos casos (1 distrito e 1 cidade em 1.313); se aparecerem mais,
 * o lugar de corrigir e aqui.
 */
const CORRECOES = {
  PT: { Lisbon: 'Lisboa', Oporto: 'Porto', Azores: 'Acores' },
};

const corrigir = (iso, nome) => CORRECOES[iso]?.[nome] || nome;

const saida = {};
let totalCidades = 0;

for (const iso of PAISES) {
  const pais = Country.getCountryByCode(iso);
  if (!pais) throw new Error(`pais ${iso} nao existe na biblioteca`);

  const estados = State.getStatesOfCountry(iso).map(e => {
    const cidades = [
      ...new Set(City.getCitiesOfState(iso, e.isoCode).map(c => corrigir(iso, c.name))),
    ].sort(
      (a, b) => a.localeCompare(b, 'pt-BR')
    );
    totalCidades += cidades.length;
    return { c: e.isoCode, n: corrigir(iso, e.name), cidades };
  });

  estados.sort((a, b) => a.n.localeCompare(b.n, 'pt-BR'));
  saida[iso] = { nome: pais.name, bandeira: pais.flag, estados };
}

mkdirSync('src/data', { recursive: true });
const destino = 'src/data/geo.json';
writeFileSync(destino, JSON.stringify(saida), 'utf-8');

const kb = (Buffer.byteLength(JSON.stringify(saida)) / 1024).toFixed(0);
console.log(`${destino}: ${PAISES.join(', ')} · ${totalCidades} cidades · ${kb} KB`);
