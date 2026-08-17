import React from 'react';
import { LessieTableView } from './LessieTableView';
import { useApp } from '../context/AppContext';

export const SplitViewWorkspace: React.FC = () => {
  const { currentNiche, currentLocation } = useApp() as any;

  return (
    <div className="w-full flex-1 flex flex-col h-[calc(100vh-8rem)]">
      
      {/* Title Area */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Leads Encontrados</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Resultados para {currentNiche} em {currentLocation}</p>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative">
        <LessieTableView />
      </div>
      
    </div>
  );
};
