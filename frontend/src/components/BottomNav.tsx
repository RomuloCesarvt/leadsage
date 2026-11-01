import React from 'react';
import { LayoutDashboard, Search, Users, MessagesSquare, Menu } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * Barra de baixo do celular: as cinco coisas que mais se usam, ao alcance do polegar.
 * O resto continua no menu lateral (botão "Menu"). Só existe abaixo de 768 px.
 */
const ABAS = [
  { id: 'dashboard', rotulo: 'Início', Icone: LayoutDashboard },
  { id: 'hero', rotulo: 'Buscar', Icone: Search },
  { id: 'workspace', rotulo: 'Leads', Icone: Users },
  { id: 'conversas', rotulo: 'Conversas', Icone: MessagesSquare },
];

export const BottomNav: React.FC<{ abrirMenu: () => void }> = ({ abrirMenu }) => {
  const { viewState, setViewState } = useApp() as any;
  return (
    <nav
      aria-label="Navegação principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 grid grid-cols-5"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {ABAS.map(({ id, rotulo, Icone }) => {
        const ativa = viewState === id || (id === 'workspace' && viewState === 'results');
        return (
          <button
            key={id}
            onClick={() => setViewState(id)}
            aria-current={ativa ? 'page' : undefined}
            className={`h-14 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold active:bg-slate-100 ${ativa ? 'text-blue-600' : 'text-slate-500'}`}
          >
            <Icone className="w-[22px] h-[22px]" />
            {rotulo}
          </button>
        );
      })}
      <button onClick={abrirMenu} className="h-14 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-slate-500 active:bg-slate-100">
        <Menu className="w-[22px] h-[22px]" />
        Menu
      </button>
    </nav>
  );
};
