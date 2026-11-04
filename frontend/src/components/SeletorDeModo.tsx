/**
 * Troca entre o modo Agência e o modo Empresa. Fica no rodapé do menu, sempre à mão.
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
  const atual = modoDaConta(user);
  // sem a lista do servidor (ele não respondeu: perfil provisório) não dá para saber o que a conta tem: não tranca, tenta e deixa o servidor decidir
  const conhecidos = Array.isArray(user?.modos) && user.modos.length > 0 && !user?.semDados;
  const liberados: string[] = conhecidos ? user.modos : ['agencia', 'empresa'];

  const escolher = async (id: ModoDaConta) => {
    if (id === atual) return;
    if (!liberados.includes(id)) {
      setAviso(`Você ainda não tem o modo ${id === 'empresa' ? 'Empresa' : 'Agência'}. Veja como liberar em Assinatura.`);
      setViewState('subscription');
      aoTrocar?.();
      return;
    }
    const nome = id === 'empresa' ? 'Empresa' : 'Agência';
    try {
      setAviso('');
      const salvo = await api.updateProfile({ modo: id });
      const sabe = Array.isArray(salvo?.modos) && salvo.modos.length > 0;
      if (salvo?.modo !== id && sabe && !salvo.modos!.includes(id)) {
        // o servidor sabe quais modos a conta tem e este não é um deles
        setUser(salvo);
        setAviso(`Sua conta não tem o modo ${nome}. Veja como liberar em Assinatura.`);
        return;
      }
      // pegou, ou o servidor não conseguiu gravar (banco ocupado): vale o que a pessoa escolheu, neste aparelho e na conta quando der
      if (user?.id) gravarModoLocal(user.id, id);
      setUser({ ...salvo, modo: id });
      if (salvo?.modo !== id) setAviso('Modo trocado neste aparelho; o servidor ainda não gravou na conta.');
      setViewState('dashboard'); aoTrocar?.();
    } catch {
      // servidor fora do ar: troca só neste aparelho, para a pessoa não ficar travada
      if (user?.id) gravarModoLocal(user.id, id);
      setUser({ ...user, modo: id });
      setAviso('O servidor não respondeu: o modo foi trocado só neste aparelho por enquanto.');
      setViewState('dashboard'); aoTrocar?.();
    }
  };

  return (
    <div className="px-4 pt-3 pb-4 border-t border-slate-100" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
      <p className="px-1 mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Modo</p>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100" role="radiogroup" aria-label="Modo da conta">
        {OPCOES.map(({ id, nome, Icone }) => {
          const ativo = id === atual;
          const trancado = !liberados.includes(id);
          return (
            <button key={id} type="button" role="radio" aria-checked={ativo} onClick={() => void escolher(id)}
              className={`min-h-[44px] md:min-h-0 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                ativo ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {trancado ? <Lock className="w-3.5 h-3.5" /> : <Icone className="w-3.5 h-3.5" />} {nome}
            </button>
          );
        })}
      </div>
      {aviso && <p className="mt-2 text-[11px] text-amber-700 leading-snug">{aviso}</p>}
    </div>
  );
};
