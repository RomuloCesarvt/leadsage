/**
 * Troca entre o modo Agência e o modo Empresa. Fica no rodapé do menu, sempre à mão.
 *
 * A troca é instantânea: a tela muda no mesmo toque e o servidor confirma depois (se recusar, volta e explica).
 * O destaque desliza de um lado para o outro (só transform, curva de saída forte, ~280 ms) e o ícone ganha um pulo curto.
 * O modo que a conta ainda não tem aparece com cadeado e leva à Assinatura (a pessoa pode ter os dois).
 */
import React, { useState } from 'react';
import { Briefcase, Lock, Wrench } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { gravarModoLocal, modoDaConta, type ModoDaConta } from '../lib/modoDaConta';

const OPCOES: { id: ModoDaConta; nome: string; Icone: React.FC<{ className?: string }> }[] = [
  { id: 'agencia', nome: 'Agência', Icone: Briefcase },
  { id: 'empresa', nome: 'Empresa', Icone: Wrench },
];

export const SeletorDeModo: React.FC<{ aoTrocar?: () => void }> = ({ aoTrocar }) => {
  const { user, setUser, setViewState } = useApp() as any;
  const [aviso, setAviso] = useState('');
  const [pulo, setPulo] = useState<ModoDaConta | null>(null);
  const atual = modoDaConta(user);
  // sem a lista do servidor (ele não respondeu: perfil provisório) não dá para saber o que a conta tem: não tranca, tenta e deixa o servidor decidir
  const conhecidos = Array.isArray(user?.modos) && user.modos.length > 0 && !user?.semDados;
  const liberados: string[] = conhecidos ? user.modos : ['agencia', 'empresa'];

  const escolher = async (id: ModoDaConta) => {
    if (id === atual) return;
    const nome = id === 'empresa' ? 'Empresa' : 'Agência';
    if (!liberados.includes(id)) {
      setAviso(`Você ainda não tem o modo ${nome}. Veja como liberar em Assinatura.`);
      setViewState('subscription');
      aoTrocar?.();
      return;
    }
    // 1) muda na hora: o menu e a tela já aparecem no modo novo, sem esperar o servidor
    const anterior = user;
    setAviso('');
    setPulo(id);
    window.setTimeout(() => setPulo(null), 500);
    if (user?.id) gravarModoLocal(user.id, id);
    setUser({ ...user, modo: id });
    setViewState('dashboard');
    aoTrocar?.();
    // 2) confirma no servidor em segundo plano
    try {
      const salvo = await api.updateProfile({ modo: id });
      const sabe = Array.isArray(salvo?.modos) && salvo.modos.length > 0;
      if (salvo?.modo !== id && sabe && !salvo.modos!.includes(id)) {
        // o servidor sabe quais modos a conta tem e este não é um deles: desfaz
        if (anterior?.id) gravarModoLocal(anterior.id, modoDaConta(anterior));
        setUser(salvo);
        setAviso(`Sua conta não tem o modo ${nome}. Veja como liberar em Assinatura.`);
        setViewState('subscription');
        return;
      }
      setUser({ ...salvo, modo: id });
      if (salvo?.modo !== id) setAviso('Modo trocado neste aparelho; o servidor ainda não gravou na conta.');
    } catch {
      setAviso('O servidor não respondeu: o modo foi trocado só neste aparelho por enquanto.');
    }
  };

  const indice = OPCOES.findIndex(o => o.id === atual);

  return (
    <div className="px-4 pt-3 pb-4 border-t border-slate-100" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
      <p className="px-1 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Modo</p>
      <div className="relative grid grid-cols-2 p-1.5 rounded-2xl bg-slate-100" role="radiogroup" aria-label="Modo da conta">
        {/* o destaque que desliza: só transform, para não pesar */}
        <span aria-hidden="true" className="seletor-modo-destaque absolute top-1.5 bottom-1.5 left-1.5 rounded-xl bg-white shadow-sm"
          style={{ width: 'calc(50% - 6px)', transform: `translateX(${indice <= 0 ? 0 : 100}%)` }} />
        {OPCOES.map(({ id, nome, Icone }) => {
          const ativo = id === atual;
          const trancado = !liberados.includes(id);
          return (
            <button key={id} type="button" role="radio" aria-checked={ativo} onClick={() => void escolher(id)}
              className={`relative z-10 min-h-[52px] rounded-xl text-sm font-bold flex items-center justify-center gap-2 select-none
                transition-[color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]
                ${ativo ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}>
              {trancado
                ? <Lock className="w-[18px] h-[18px]" />
                : <Icone className={`w-[18px] h-[18px] ${pulo === id ? 'seletor-modo-pulo' : ''}`} />}
              {nome}
            </button>
          );
        })}
      </div>
      {aviso && <p className="mt-2 text-[11px] text-amber-700 leading-snug">{aviso}</p>}
    </div>
  );
};
