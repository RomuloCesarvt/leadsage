import React, { useState } from 'react';
import { Sparkles, Bot, User as UserIcon, CornerDownLeft } from 'lucide-react';
import { LessieTableView } from './LessieTableView';
import { useApp } from '../context/AppContext';

export const SplitViewWorkspace: React.FC = () => {
  const { currentNiche, currentLocation, performLeadSearch, isLoading } = useApp();
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'table'>('chat');
  
  // Resizable pane state
  const [leftWidth, setLeftWidth] = useState(40); // 40% default
  const isDragging = React.useRef(false);

  const startDragging = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const stopDragging = () => {
    isDragging.current = false;
    document.body.style.cursor = 'default';
  };

  const onDrag = React.useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    
    // Sidebar is fixed at w-64 (256px) on lg screens. We need to account for it roughly or just use viewport width
    // Actually, clientX gives us absolute mouse X.
    // If the sidebar is 256px, workspace width is window.innerWidth - 256
    const sidebarWidth = window.innerWidth > 1024 ? 256 : 0;
    const workspaceWidth = window.innerWidth - sidebarWidth;
    const relativeX = e.clientX - sidebarWidth;
    
    let newWidth = (relativeX / workspaceWidth) * 100;
    
    // Constrain to reasonable limits (15% to 85%)
    if (newWidth < 15) newWidth = 15;
    if (newWidth > 85) newWidth = 85;
    
    setLeftWidth(newWidth);
  }, []);

  React.useEffect(() => {
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDragging);
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDragging);
    };
  }, [onDrag]);


  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'user',
      text: `Prospectar ${currentNiche} em ${currentLocation} com redes sociais e e-mail verificado.`
    },
    {
      id: '2',
      sender: 'agent',
      text: `LeadSage AI: Buscando leads qualificados em ${currentLocation} com sinais fortes de contato ativo...`
    }
  ]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userMsg }]);
    setChatInput('');

    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: `LeadSage AI: Atualizando tabela de prospecção e filtrando contatos em ${currentLocation}...`
        }
      ]);
      performLeadSearch(currentNiche, currentLocation, 5);
    }, 800);
  };

  return (
    <div className="w-full flex-1 flex flex-col md:flex-row h-[calc(100vh-3.5rem)] overflow-hidden bg-[#000000]">
      
      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex items-center bg-[#050505] border-b border-[#18181b] shrink-0">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'chat' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}
        >
          Chat IA
        </button>
        <button
          onClick={() => setActiveTab('table')}
          className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'table' ? 'text-white border-b-2 border-white' : 'text-zinc-500'}`}
        >
          Resultados
        </button>
      </div>

      {/* Left Chat Pane */}
      <div 
        style={{ width: window.innerWidth < 768 ? '100%' : `${leftWidth}%` }} 
        className={`flex-col h-full bg-[#000000] shrink-0 ${activeTab === 'chat' ? 'flex' : 'hidden'} md:flex`}
      >
        <div className="h-12 px-4 border-b border-[#18181b] flex items-center justify-between bg-[#050505]">
          <h2 className="text-xs font-semibold text-zinc-300 truncate">
            {currentNiche} Search ({currentLocation})
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-1.5">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-500 ml-1">
                {msg.sender === 'user' ? (
                  <>
                    <UserIcon className="w-3 h-3 text-zinc-400" />
                    <span>Você</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 text-zinc-400" />
                    <span>LeadSage AI</span>
                  </>
                )}
              </div>
              <div
                className={`p-3 text-[13px] rounded-2xl leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-zinc-900/80 border border-zinc-800 text-zinc-100 rounded-tl-sm'
                    : 'bg-transparent text-zinc-300'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="p-3 text-[13px] text-zinc-400 animate-pulse flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-zinc-300 animate-spin" />
              <span>Analisando dados em tempo real...</span>
            </div>
          )}
        </div>

        <div className="p-4 bg-transparent border-t border-[#18181b]">
          <form onSubmit={handleSendChat} className="relative flex items-center shadow-sm">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Envie uma mensagem para o LeadSage AI..."
              className="w-full pl-4 pr-12 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-[13px] text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="absolute right-2 p-1.5 rounded-xl bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors shadow-sm"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="mt-2 text-center text-[10px] text-zinc-600">
            A IA pode cometer erros. Verifique os leads gerados.
          </div>
        </div>
      </div>

      {/* Resizable Divider */}
      <div 
        onMouseDown={startDragging}
        className="hidden md:flex w-1.5 items-center justify-center bg-[#09090b] hover:bg-zinc-700 border-x border-[#18181b] cursor-col-resize shrink-0 transition-colors group z-10"
      >
        <div className="w-0.5 h-8 bg-zinc-700 group-hover:bg-zinc-400 rounded-full transition-colors" />
      </div>

      {/* Right Table Pane */}
      <div className={`flex-1 flex-col h-full overflow-hidden min-w-0 relative bg-[#000000] ${activeTab === 'table' ? 'flex' : 'hidden'} md:flex`}>
        <LessieTableView />
      </div>
    </div>
  );
};
