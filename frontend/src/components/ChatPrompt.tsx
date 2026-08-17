import React, { useState } from 'react';
import { Search, MapPin, Building2, Briefcase } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ChatPrompt: React.FC<{ onSearchStart?: () => void }> = ({ onSearchStart }) => {
  const { performLeadSearch, isLoading } = useApp() as any;
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche.trim() || !location.trim()) return;

    performLeadSearch(niche, location, 10);
    if (onSearchStart) onSearchStart();
  };

  const handleChipClick = (n: string, l: string) => {
    setNiche(n);
    setLocation(l);
    performLeadSearch(n, l, 10);
    if (onSearchStart) onSearchStart();
  };

  return (
    <div className="w-full max-w-4xl mx-auto pt-20 px-4 flex flex-col items-center min-h-[75vh]">
      
      {/* Title */}
      <div className="text-center mb-10">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
          Encontre seus próximos clientes.
        </h1>
        <p className="text-lg text-slate-500 font-medium">
          A inteligência artificial do LeadSage varre a internet para encontrar decisores e empresas para você.
        </p>
      </div>

      {/* Faro-style Search Bar */}
      <form onSubmit={handleSubmit} className="w-full mb-10">
        <div className="bg-white rounded-2xl p-2 shadow-xl shadow-slate-200/50 border border-slate-200 flex flex-col md:flex-row items-center gap-2">
          
          <div className="flex-1 w-full flex items-center px-4 py-3 bg-slate-50 rounded-xl border border-transparent focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <Briefcase className="w-5 h-5 text-indigo-500 shrink-0 mr-3" />
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="Qual nicho? (ex: Dentistas, Clínicas)"
              className="w-full bg-transparent text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
            />
          </div>

          <div className="flex-1 w-full flex items-center px-4 py-3 bg-slate-50 rounded-xl border border-transparent focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <MapPin className="w-5 h-5 text-indigo-500 shrink-0 mr-3" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Onde? (ex: São Paulo, Botucatu)"
              className="w-full bg-transparent text-slate-900 placeholder-slate-400 font-medium focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !niche.trim() || !location.trim()}
            className="w-full md:w-auto px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <span>Buscar Leads</span>
            <Search className="w-4 h-4" />
          </button>
        </div>
      </form>

      {/* Suggestion Chips */}
      <div className="w-full max-w-3xl flex flex-wrap justify-center gap-3">
        <button
          onClick={() => handleChipClick('Farmácias', 'São Paulo, SP')}
          className="px-4 py-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-full text-sm font-semibold text-slate-600 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Building2 className="w-4 h-4 text-indigo-500" />
          Farmácias em São Paulo
        </button>
        <button
          onClick={() => handleChipClick('Clínicas Médicas', 'Campinas, SP')}
          className="px-4 py-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-full text-sm font-semibold text-slate-600 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Building2 className="w-4 h-4 text-indigo-500" />
          Clínicas Médicas em Campinas
        </button>
        <button
          onClick={() => handleChipClick('Imobiliárias', 'Rio de Janeiro, RJ')}
          className="px-4 py-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-full text-sm font-semibold text-slate-600 transition-colors flex items-center gap-2 shadow-sm"
        >
          <Building2 className="w-4 h-4 text-indigo-500" />
          Imobiliárias no Rio
        </button>
      </div>

    </div>
  );
};
