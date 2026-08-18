import React from 'react';
import { LessieTableView } from './LessieTableView';
import { useApp } from '../context/AppContext';
import { Download } from 'lucide-react';

export const SplitViewWorkspace: React.FC = () => {
  const { leads } = useApp() as any;

  return (
    <div className="w-full flex-1 flex flex-col h-[calc(100vh-8rem)]">
      
      {/* Title Area */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Meus Leads</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gerencie e filtre todos os leads encontrados. <span className="text-blue-600 font-bold">{leads.length} leads</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600 transition-colors">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600 transition-colors">
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative">
        <LessieTableView />
      </div>
      
    </div>
  );
};
