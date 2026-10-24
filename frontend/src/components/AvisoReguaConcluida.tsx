import React from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

/** Avisa que leads saíram sozinhos porque a régua de abordagens terminou sem resposta (não precisam mais ficar). */
export const AvisoReguaConcluida: React.FC = () => {
  const { saidasDaRegua, limparSaidasDaRegua } = useApp() as any;
  if (!saidasDaRegua?.length) return null;
  const n = saidasDaRegua.length;
  return (
    <div className="mb-4 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-900 flex items-start gap-2" role="status" data-testid="aviso-regua">
      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
      <p className="flex-1 leading-snug">
        {n === 1 ? '1 lead saiu' : `${n} leads saíram`} da lista: a abordagem e os seguimentos terminaram sem resposta, então não precisa mais ficar com {n === 1 ? 'ele' : 'eles'}.
        <span className="text-emerald-700"> ({saidasDaRegua.slice(0, 4).join(', ')}{n > 4 ? '…' : ''}). Se responderem depois, voltam sozinhos.</span>
      </p>
      <button type="button" onClick={limparSaidasDaRegua} aria-label="Fechar o aviso" className="p-1 rounded hover:bg-emerald-100"><X className="w-4 h-4" /></button>
    </div>
  );
};
