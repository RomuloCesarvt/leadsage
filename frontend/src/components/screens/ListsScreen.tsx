import React from 'react';
import { List, FolderPlus, Download, Users } from 'lucide-react';

export const ListsScreen: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar bg-[#000000]">
      <div className="p-8 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Minhas Listas</h1>
          <button className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm font-medium flex items-center gap-2 transition-colors">
            <FolderPlus className="w-4 h-4" />
            Nova Lista
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card Mock 1 */}
          <div className="group p-5 rounded-2xl bg-[#050505] border border-[#18181b] hover:border-zinc-700 transition-colors flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <List className="w-5 h-5 text-indigo-400" />
              </div>
              <button className="text-zinc-500 hover:text-white p-1" title="Exportar CSV">
                <Download className="w-4 h-4" />
              </button>
            </div>
            
            <div>
              <h3 className="text-base font-semibold text-zinc-200 group-hover:text-white transition-colors">Prospects Farmácias SP</h3>
              <p className="text-sm text-zinc-500 mt-1">Atualizada há 2 dias</p>
            </div>
            
            <div className="pt-4 border-t border-zinc-900 flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Users className="w-4 h-4" />
                <span>24 leads</span>
              </div>
              <div className="flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-900"></div>
                <div className="w-6 h-6 rounded-full bg-zinc-700 border border-zinc-900"></div>
                <div className="w-6 h-6 rounded-full bg-zinc-600 border border-zinc-900 flex items-center justify-center text-[8px] font-bold text-white">+22</div>
              </div>
            </div>
          </div>

          {/* Empty state Card */}
          <div className="group p-5 rounded-2xl bg-[#000000] border border-dashed border-[#27272a] hover:border-zinc-500 transition-colors flex flex-col items-center justify-center text-center gap-2 cursor-pointer h-48">
            <FolderPlus className="w-8 h-8 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            <span className="text-sm font-medium text-zinc-500 group-hover:text-zinc-300">Criar Nova Lista</span>
          </div>
        </div>
      </div>
    </div>
  );
};
