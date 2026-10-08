/**
 * Fila de envio: o robô escreve a abordagem de cada lead e entrega no canal certo.
 */
import React from 'react';
import { ListChecks } from 'lucide-react';
import { FilaDeEnvio } from '../FilaDeEnvio';

export const FilaScreen: React.FC = () => (
  <div className="flex-1 flex flex-col min-h-0 max-w-5xl mx-auto w-full">
    <div className="mb-5">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
        <ListChecks className="w-7 h-7 text-blue-600" /> Fila de envio
      </h1>
      <p className="text-slate-500 text-sm mt-1">
        A IA escreve a primeira mensagem de cada lead. O e-mail sai sozinho; o WhatsApp sai pelo seu computador, devagar e com limite diário; Instagram e LinkedIn ficam prontos para você enviar.
      </p>
    </div>
    <FilaDeEnvio />
  </div>
);
