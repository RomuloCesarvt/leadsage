/**
 * Fila de envio: o robô escreve a abordagem de cada lead e entrega no canal certo.
 */
import React from 'react';
import { ListChecks } from 'lucide-react';
import { FilaDeEnvio } from '../FilaDeEnvio';
import { CriativoDoRobo } from '../CriativoDoRobo';
import { useApp } from '../../context/AppContext';
import { ehEmpresa } from '../../lib/modoDaConta';

export const FilaScreen: React.FC = () => {
  const { user } = useApp() as any;
  return (
  <div className="flex-1 flex flex-col min-h-0 max-w-5xl mx-auto w-full">
    <div className="mb-5">
      <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
        <ListChecks className="w-7 h-7 text-blue-600" /> Disparos
      </h1>
      <p className="text-slate-500 text-sm mt-1">
        A IA escreve a primeira mensagem de cada lead e você revisa: edite, marque ou desmarque, e só o que estiver marcado é enviado. O WhatsApp sai devagar e com limite diário, para proteger o número.
      </p>
    </div>
    <CriativoDoRobo contexto="disparo" empresa={ehEmpresa(user)} />
    <FilaDeEnvio />
  </div>
  );
};
