/**
 * Rolar para o lado "segurando e puxando" (como no celular ou no Trello), para quadros largos como o Pipeline.
 *
 * Arrasta-se pelo fundo do quadro (espaço entre colunas, cabeçalhos, área vazia). O que já tem outra função continua com ela: cartões
 * (que se arrastam entre colunas), botões, links e campos. Um arrasto nunca vira clique sem querer. Quando se arrasta um cartão para
 * longe, as bordas do quadro rolam sozinhas (`rolarNasBordas`).
 */
import { useEffect } from 'react';
import type { RefObject } from 'react';

/** O que NÃO começa o arrasto do quadro: tem função própria. */
export const SELETOR_INTERATIVO = 'button, a, input, select, textarea, label, [draggable="true"], [data-nao-arrastar]';

/** Rolagem nova: o quadro acompanha o ponteiro (puxou para a esquerda, vai para a direita). */
export const novaRolagem = (rolagemInicial: number, xInicial: number, xAtual: number): number =>
  Math.max(0, rolagemInicial - (xAtual - xInicial));

/** Quanto rolar quando um cartão é arrastado perto da borda: negativo à esquerda, positivo à direita, 0 no meio. */
export const empurraoDaBorda = (x: number, esquerda: number, direita: number, faixa = 90, passo = 26): number => {
  if (x < esquerda + faixa) return -Math.ceil(passo * Math.min(1, (esquerda + faixa - x) / faixa));
  if (x > direita - faixa) return Math.ceil(passo * Math.min(1, (x - (direita - faixa)) / faixa));
  return 0;
};

/** Liga o arrasto ao elemento; devolve a função que desliga. */
export const ligarArrastarParaRolar = (el: HTMLElement): (() => void) => {
  let ativo = false;
  let moveu = false;
  let x0 = 0;
  let rolagem0 = 0;

  const baixo = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as Element | null)?.closest?.(SELETOR_INTERATIVO)) return;
    ativo = true;
    moveu = false;
    x0 = e.clientX;
    rolagem0 = el.scrollLeft;
    el.classList.add('arrastando-quadro');
  };
  const mover = (e: MouseEvent) => {
    if (!ativo) return;
    if (Math.abs(e.clientX - x0) > 3) moveu = true;
    if (moveu) { el.scrollLeft = novaRolagem(rolagem0, x0, e.clientX); e.preventDefault(); }
  };
  const soltar = () => {
    if (!ativo) return;
    ativo = false;
    el.classList.remove('arrastando-quadro');
  };
  const clique = (e: MouseEvent) => {
    if (moveu) { e.stopPropagation(); e.preventDefault(); moveu = false; }   // quem puxou o quadro não "clicou" em nada
  };

  el.addEventListener('mousedown', baixo);
  window.addEventListener('mousemove', mover);
  window.addEventListener('mouseup', soltar);
  el.addEventListener('click', clique, true);
  return () => {
    el.removeEventListener('mousedown', baixo);
    window.removeEventListener('mousemove', mover);
    window.removeEventListener('mouseup', soltar);
    el.removeEventListener('click', clique, true);
    el.classList.remove('arrastando-quadro');
  };
};

export const useArrastarParaRolar = (ref: RefObject<HTMLElement | null>): void => {
  useEffect(() => (ref.current ? ligarArrastarParaRolar(ref.current) : undefined), [ref]);
};

/** Durante o arrasto de um cartão: rola o quadro quando o ponteiro chega perto da borda. */
export const rolarNasBordas = (el: HTMLElement | null, x: number): void => {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const passo = empurraoDaBorda(x, r.left, r.right);
  if (passo) el.scrollLeft += passo;
};
