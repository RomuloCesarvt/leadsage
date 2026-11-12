import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useCelular } from '../lib/useCelular';

/**
 * Uma seção que abre e fecha NO CELULAR: o título e um resumo de uma linha ficam sempre à vista, o miolo só quando a pessoa toca.
 * No computador não muda nada (o miolo aparece como sempre). O miolo é renderizado mesmo fechado (escondido), para não perder o que foi digitado.
 *
 * `cartao`: o miolo já vem num cartão com título próprio (como o "Quando falar de valor"): aqui o contorno do cartão e o título repetido somem.
 */
export const Recolhivel: React.FC<{
  titulo: string; resumo?: React.ReactNode; icone?: React.ReactNode; aberto?: boolean; cartao?: boolean; children: React.ReactNode;
}> = ({ titulo, resumo, icone, aberto = false, cartao = false, children }) => {
  const celular = useCelular();
  const [on, setOn] = useState(aberto);
  if (!celular) return <>{children}</>;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <button type="button" onClick={() => setOn(v => !v)} aria-expanded={on} className="w-full min-h-16 px-4 py-3 flex items-center gap-3 text-left active:bg-slate-50">
        {icone && <span className="shrink-0">{icone}</span>}
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold text-slate-900 leading-tight">{titulo}</span>
          {resumo && <span className="block text-[13px] text-slate-500 leading-snug mt-0.5">{resumo}</span>}
        </span>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${on ? 'rotate-180' : ''}`} />
      </button>
      <div className={`${on ? '' : 'hidden'} border-t border-slate-100 ${cartao ? '[&>div]:!border-0 [&>div]:!shadow-none [&>div]:!rounded-none [&>div]:!p-4 [&_h2]:hidden' : 'p-4'}`}>
        {children}
      </div>
    </section>
  );
};
