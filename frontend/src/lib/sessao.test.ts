import { ESPERA_DA_SESSAO_MS, esquecerSessao, lembrarSessao, sessaoLembrada } from './sessao';

let falhas = 0;
const ok = (nome: string, cond: boolean) => { console.log(`  ${cond ? 'PASS' : 'FALHA'}  ${nome}`); if (!cond) falhas++; };

const guarda = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } };
};

console.log('\n--- marca de "eu estava logado" ---');
const g = guarda();
ok('sem marca, nada lembrado', sessaoLembrada(g) === null);
lembrarSessao('u1', 'ana@x.com', g, 1_000_000);
ok('lembra quem entrou', JSON.stringify(sessaoLembrada(g, 1_000_500)) === JSON.stringify({ uid: 'u1', email: 'ana@x.com', em: 1_000_000 }));
esquecerSessao(g);
ok('sair de propósito apaga a marca', sessaoLembrada(g) === null);
lembrarSessao('u1', null, g, 0);
ok('e-mail ausente vira vazio', sessaoLembrada(g, 10)?.email === '');
ok('marca antiga (mais de 60 dias) não vale', sessaoLembrada(g, 61 * 24 * 3600 * 1000) === null);
ok('marca de 59 dias ainda vale', sessaoLembrada(g, 59 * 24 * 3600 * 1000)?.uid === 'u1');
g.setItem('LEADSAGE_SESSAO', '{lixo');
ok('marca corrompida não derruba nada', sessaoLembrada(g) === null);
g.setItem('LEADSAGE_SESSAO', JSON.stringify({ uid: '', em: 1 }));
ok('marca sem uid é ignorada', sessaoLembrada(g, 2) === null);
ok('sem armazenamento (null) nada quebra', (() => { lembrarSessao('u', 'e', null); esquecerSessao(null); return sessaoLembrada(null) === null; })());
ok('a espera pela sessão é curta (nunca prende o login por muito tempo)', ESPERA_DA_SESSAO_MS >= 1000 && ESPERA_DA_SESSAO_MS <= 6000);

if (falhas) { console.log(`\n=========== ${falhas} FALHARAM ===========`); process.exit(1); }
console.log('\n=========== TUDO PASSOU ===========');
