import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Check, Sparkles, LayoutTemplate, Link } from 'lucide-react';

export const DemoSiteModal: React.FC = () => {
  const { isDemoSiteModalOpen, setIsDemoSiteModalOpen, demoSiteData, setDemoSiteData } = useApp() as any;
  const [isCopied, setIsCopied] = useState(false);

  if (!isDemoSiteModalOpen || !demoSiteData) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://preview.leadsage.ai/demo/${demoSiteData.lead_id}`);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const closeModal = () => {
    setIsDemoSiteModalOpen(false);
    setTimeout(() => setDemoSiteData(null), 300);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#050505] border border-[#18181b] w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header toolbar */}
        <div className="h-16 border-b border-[#18181b] flex items-center justify-between px-6 shrink-0 bg-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Preview do Site de Demonstração</h2>
              <p className="text-xs text-zinc-500">Gerado pela IA do LeadSage</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link className="w-4 h-4" />}
              {isCopied ? 'Link Copiado!' : 'Copiar Link de Compartilhamento'}
            </button>
            <button
              onClick={closeModal}
              className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Browser Mockup Area */}
        <div className="flex-1 bg-zinc-950 p-6 overflow-y-auto custom-scrollbar flex justify-center">
          
          {/* Site Container (Mock) */}
          <div className="w-full max-w-4xl bg-white text-zinc-900 rounded-xl overflow-hidden shadow-2xl flex flex-col h-max border border-zinc-200 font-sans">
            
            {/* Nav */}
            <header className="px-8 py-5 flex justify-between items-center border-b border-zinc-100">
              <div className="text-xl font-black tracking-tighter text-zinc-900">
                {demoSiteData.hero_title.split(' ')[0] || 'Empresa'}<span className="text-indigo-600">.</span>
              </div>
              <div className="flex gap-6 text-sm font-semibold text-zinc-500">
                <span>Início</span>
                <span>Serviços</span>
                <span>Sobre</span>
              </div>
              <button className="px-5 py-2 bg-zinc-900 text-white text-sm font-bold rounded-full">
                {demoSiteData.cta_text}
              </button>
            </header>

            {/* Hero */}
            <section className="px-8 py-24 flex flex-col items-center text-center bg-gradient-to-b from-zinc-50 to-white">
              <span className="text-xs font-bold tracking-widest text-indigo-600 uppercase mb-4 px-3 py-1 bg-indigo-50 rounded-full">Nova Presença Digital</span>
              <h1 className="text-5xl md:text-6xl font-black tracking-tight text-zinc-900 max-w-3xl leading-[1.1]">
                {demoSiteData.hero_title}
              </h1>
              <p className="mt-6 text-lg text-zinc-500 max-w-2xl leading-relaxed">
                {demoSiteData.hero_subtitle}
              </p>
              <div className="mt-10 flex gap-4">
                <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-full shadow-lg shadow-indigo-600/20 transition-all">
                  {demoSiteData.cta_text}
                </button>
                <button className="px-8 py-4 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-bold rounded-full transition-all">
                  Ver Portfólio
                </button>
              </div>
            </section>

            {/* Services */}
            <section className="px-8 py-20 bg-zinc-900 text-white">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold mb-12 text-center">Nossas Especialidades</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {demoSiteData.services.map((svc: string, i: number) => (
                    <div key={i} className="p-6 bg-zinc-800/50 rounded-2xl border border-zinc-800">
                      <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center mb-4 border border-indigo-500/30">
                        <LayoutTemplate className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-bold mb-2">{svc}</h3>
                      <p className="text-sm text-zinc-400">Solução de alta performance focada em resultados e escalabilidade para o seu negócio.</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* About */}
            <section className="px-8 py-20 bg-white">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl font-bold mb-6 text-zinc-900">Sobre Nós</h2>
                <p className="text-lg text-zinc-600 leading-relaxed">
                  {demoSiteData.about_text}
                </p>
              </div>
            </section>

            {/* Footer */}
            <footer className="px-8 py-10 bg-zinc-100 border-t border-zinc-200 text-center">
              <p className="text-sm text-zinc-500 font-medium">© 2026. Feito com tecnologia LeadSage AI.</p>
            </footer>

          </div>
        </div>
      </div>
    </div>
  );
};
