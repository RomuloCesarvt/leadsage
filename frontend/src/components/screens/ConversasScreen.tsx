/**
 * Conversas: a caixa de entrada de tudo que o usuário conversa, com filtro por canal.
 */
import React, { useState } from 'react';
import { Lock, MessagesSquare } from 'lucide-react';
import { CaixaDeEntrada } from '../CaixaDeEntrada';
import { useApp } from '../../context/AppContext';

export const ConversasScreen: React.FC = () => {
  const { setViewState } = useApp() as any;
  const [bloqueado, setBloqueado] = useState('');

  if (bloqueado) {
    return (
      <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center mt-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Conversas</h2>
          <p className="text-slate-500 mb-6">{bloqueado}</p>
          <button onClick={() => setViewState('subscription')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
            Ver planos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 max-w-6xl mx-auto w-full">
      <div className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
          <MessagesSquare className="w-7 h-7 text-blue-600" /> Conversas
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Tudo que você enviou e todas as respostas dos leads, em WhatsApp, Instagram, Messenger, Telegram e e-mail. Filtre por canal ou por quem precisa de você.
        </p>
      </div>
      <CaixaDeEntrada onBloqueio={setBloqueado} irConfigurar={() => setViewState('robo')} />
    </div>
  );
};
