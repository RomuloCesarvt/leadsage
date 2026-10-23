/**
 * O F5 de verdade: no primeiro instante, ANTES de o Firebase dizer quem está logado, o app tem de mostrar "Carregando…" e nunca a tela de
 * login. O defeito: `authLoading` não chegava às telas pelo contexto, então a entrada aparecia a cada F5 até a sessão voltar (e entrava
 * "no meio" do login com o Google quando a pessoa clicava).
 */
import './lib/shimNavegador';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from './App';
import { AppProvider, useApp } from './context/AppContext';

let falhas = 0;
const ok = (nome: string, cond: boolean, detalhe = '') => { console.log(`  ${cond ? 'PASS' : 'FALHA'}  ${nome} ${cond ? '' : detalhe}`); if (!cond) falhas++; };

console.log('\n--- primeiro instante do F5 ---');
const html = renderToStaticMarkup(<App />);
ok('mostra "Carregando..." enquanto o Firebase responde', html.includes('Carregando...'), html.slice(0, 200));
ok('não mostra a tela de login', !html.includes('Bem-vindo de volta') && !html.includes('Continuar com Google'));
ok('não mostra o app sem ninguém logado', !html.includes('Pipeline de Vendas'));

const Sonda: React.FC = () => {
  const c = useApp() as any;
  return <span data-carregando={String(c.authLoading)} data-sessao-perdida={String(c.sessaoPerdida)} data-tem-usuario={String(Boolean(c.user))} />;
};
const sonda = renderToStaticMarkup(<AppProvider><Sonda /></AppProvider>);
ok('o contexto entrega authLoading (era o que faltava)', sonda.includes('data-carregando="true"'), sonda);
ok('o contexto entrega sessaoPerdida (vazio no começo)', sonda.includes('data-sessao-perdida="null"'), sonda);
ok('ninguém logado no primeiro instante', sonda.includes('data-tem-usuario="false"'));

if (falhas) { console.log(`\n=========== ${falhas} FALHARAM ===========`); process.exit(1); }
console.log('\n=========== TUDO PASSOU ===========');
process.exit(0);   // o Firebase deixa temporizadores abertos
