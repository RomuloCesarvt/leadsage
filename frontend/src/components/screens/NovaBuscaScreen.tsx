import React, { useState } from 'react';
import { Search, Lock, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const NovaBuscaScreen: React.FC = () => {
  const { performLeadSearch, setViewState } = useApp() as any;
  const [niche, setNiche] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [radius, setRadius] = useState('10');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!niche || !city || !state) {
      alert("Preencha Nicho, Estado e Cidade para buscar.");
      return;
    }
    const fullLocation = `${neighborhood ? neighborhood + ', ' : ''}${city}, ${state}, Brasil`;
    
    setIsSearching(true);
    try {
      await performLeadSearch(niche, fullLocation, 5);
      setViewState('workspace');
    } catch (e) {
      console.error(e);
      alert("Erro ao buscar leads. Verifique sua conexão e chave API.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative max-w-5xl mx-auto w-full pb-20">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Nova Busca</h1>
        <p className="text-slate-500 mt-1">Encontre negócios locais com oportunidades de venda.</p>
      </div>

      {/* Warning Box */}
      <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-xl border border-amber-100 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h3 className="font-bold text-amber-900">Você usou todos os seus 5 leads de teste</h3>
            <p className="text-sm text-amber-700/80">Assine um plano para continuar gerando leads.</p>
          </div>
        </div>
        <button 
          onClick={() => setViewState('subscription')}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors whitespace-nowrap"
        >
          Ver Planos
        </button>
      </div>

      {/* Form Area */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">País</label>
            <div className="relative">
              <select className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
                <option>Brasil</option>
              </select>
              <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Estado</label>
            <div className="relative">
              <select 
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                <option value="">Selecione o(a) estado...</option>
                <option value="SP">São Paulo</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="MG">Minas Gerais</option>
              </select>
              <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cidade</label>
            <input 
              type="text" 
              placeholder={state ? "Digite a cidade..." : "Escolha um(a) estado primeiro"}
              disabled={!state}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nicho</label>
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Buscar ou selecionar nicho..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Bairro / Região <span className="text-slate-400 font-normal lowercase tracking-normal">(opcional)</span></label>
            <input 
              type="text" 
              placeholder="Ex: Centro, Jardins..."
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Raio (KM)</label>
            <input 
              type="number" 
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Qtd. de Leads</label>
          <div className="w-full md:w-1/3 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium flex items-center justify-between cursor-not-allowed opacity-80">
            <span>Até 5 leads</span>
            <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Plano Gratuito</span>
          </div>
        </div>

        <p className="text-sm text-slate-400">Buscaremos até 20 empresas. Você só utiliza créditos pelos leads reais encontrados.</p>

      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-30">
        <button 
          onClick={handleSearch}
          disabled={isSearching}
          className={`px-8 py-4 font-bold rounded-full shadow-xl transition-all flex items-center gap-3 text-lg ${isSearching ? 'bg-blue-400 cursor-not-allowed text-white shadow-none' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 hover:scale-105 active:scale-95'}`}
        >
          {isSearching ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Buscando no Google Maps...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Buscar Oportunidades
            </>
          )}
        </button>
      </div>

    </div>
  );
};
