/**
 * Conversas: a caixa de entrada de tudo que o usuário conversa, com filtro por canal.
 */
import React, { useState } from 'react';
import { Lock, MessagesSquare } from 'lucide-react';
import { CaixaDeEntrada } from '../CaixaDeEntrada';
import { ChatWhatsApp } from '../ChatWhatsApp';
import { useApp } from '../../context/AppContext';

export const ConversasScreen: React.FC = () => {
  const { setViewState } = useApp() as any;
  const [bloqueado, setBloqueado] = useState('');
  const [aba, setAba] = useState<'whatsapp' | 'canais'>('whatsapp');

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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <MessagesSquare className="w-7 h-7 text-blue-600" /> Conversas
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {aba === 'whatsapp'
              ? 'Seu WhatsApp aqui dentro, como no WhatsApp Web. O robô atende os leads e você assume quando quiser.'
              : 'Tudo que você enviou e as respostas dos leads em Instagram, Messenger, Telegram, e-mail e WhatsApp.'}
          </p>
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1" role="tablist">
          {([['whatsapp', 'WhatsApp'], ['canais', 'Todos os canais']] as const).map(([id, rotulo]) => (
            <button key={id} role="tab" aria-selected={aba === id} onClick={() => setAba(id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold ${aba === id ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}>
              {rotulo}
            </button>
          ))}
        </div>
      </div>
      {aba === 'whatsapp'
        ? <ChatWhatsApp irConectar={() => setViewState('robo')} />
        : <CaixaDeEntrada onBloqueio={setBloqueado} irConfigurar={() => setViewState('robo')} />}
    </div>
  );
};
