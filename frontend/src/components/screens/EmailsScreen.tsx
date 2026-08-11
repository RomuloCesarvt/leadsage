import React from 'react';
import { Mail, Inbox, Send, Archive, RefreshCw } from 'lucide-react';

export const EmailsScreen: React.FC = () => {
  return (
    <div className="flex-1 flex h-[calc(100vh-64px)] bg-[#000000] overflow-hidden">
      
      {/* Sidebar de E-mails */}
      <div className="w-64 border-r border-[#18181b] bg-[#050505] p-4 flex flex-col gap-2">
        <h2 className="text-sm font-bold text-zinc-100 px-2 mb-4">Caixas de Correio</h2>
        
        <button className="flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 text-zinc-100 text-sm font-medium">
          <div className="flex items-center gap-3">
            <Inbox className="w-4 h-4 text-zinc-400" />
            Caixa de Entrada
          </div>
          <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">2</span>
        </button>
        
        <button className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors">
          <div className="flex items-center gap-3">
            <Send className="w-4 h-4" />
            Enviados
          </div>
          <span className="text-[10px] font-mono">145</span>
        </button>

        <button className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 text-sm font-medium transition-colors">
          <div className="flex items-center gap-3">
            <Archive className="w-4 h-4" />
            Rascunhos
          </div>
        </button>
      </div>

      {/* Lista de E-mails */}
      <div className="flex-1 flex flex-col bg-[#000000]">
        <div className="h-14 border-b border-[#18181b] flex items-center justify-between px-6 shrink-0">
          <h1 className="text-sm font-semibold text-zinc-100">Caixa de Entrada</h1>
          <button className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors" title="Atualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 flex items-center justify-center mb-6 mx-auto">
              <Mail className="w-8 h-8 text-zinc-600" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-300 mb-2">Tudo limpo por aqui</h2>
            <p className="text-sm text-zinc-500">
              As respostas dos seus leads prospectados aparecerão diretamente na sua caixa de entrada unificada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
