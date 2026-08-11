import React from 'react';
import { Menu, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Header: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
  const { user, setIsCreditModalOpen, setIsProfileModalOpen } = useApp();

  return (
    <header className="sticky top-0 z-30 h-14 bg-[#000000]/90 backdrop-blur-md border-b border-[#18181b] px-4 md:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-900 md:hidden transition-colors"
          title="Abrir Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center font-serif text-black font-extrabold text-sm">
            L
          </div>
          <span className="font-bold text-white text-sm tracking-tight">Lessie AI Agent</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsCreditModalOpen(true)}
          className="px-3 py-1 rounded-full border border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 text-xs font-medium transition-all"
        >
          Atualização
        </button>

        <button
          onClick={() => setIsCreditModalOpen(true)}
          className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-100 flex items-center gap-1.5 hover:border-zinc-700 transition-colors"
        >
          <Zap className="w-3.5 h-3.5 text-white fill-white" />
          <span>{user?.credits ?? 0}</span>
        </button>

        <button
          onClick={() => setIsProfileModalOpen(true)}
          className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-zinc-700 hover:ring-zinc-500 transition-all"
        >
          <img src={user?.avatar || ''} alt={user?.name || ''} className="w-full h-full object-cover" />
        </button>
      </div>
    </header>
  );
};
