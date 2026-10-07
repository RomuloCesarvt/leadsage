import React, { useState, useEffect } from 'react';
import { Search, ChevronDown, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { carregarGeo, montarGeo } from '../../lib/geo';
import type { Geo, Pais, Estado, Cidade } from '../../lib/geo';
import { SeletorNicho } from '../SeletorNicho';

export const NovaBuscaScreen: React.FC = () => {
  const { performLeadSearch, setViewState } = useApp() as any;
  const [niche, setNiche] = useState('');
  const [country, setCountry] = useState('BR');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [searchLimit, setSearchLimit] = useState(20);
  const [isSearching, setIsSearching] = useState(false);
  const [erroBusca, setErroBusca] = useState('');

  // Antes vinha de country-state-city, com as cidades do mundo inteiro:
  // 8,3 MB (2,4 MB comprimidos) baixados so para preencher estes tres
  // <select>, na tela mais usada do app. Agora e um recorte de Brasil,
  // Portugal e EUA — 121 KB comprimidos, ainda sob demanda.
  const [geo, setGeo] = useState<Geo | null>(null);
  const [countries, setCountries] = useState<Pais[]>([]);
  const [states, setStates] = useState<Estado[]>([]);
  const [cities, setCities] = useState<Cidade[]>([]);

  useEffect(() => {
    let active = true;
    carregarGeo().then(dados => {
      if (!active) return;
      const montado = montarGeo(dados);
      setGeo(montado);
      setCountries(montado.paises());
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!geo) return;
    setStates(geo.estadosDe(country));
  }, [geo, country]);

  useEffect(() => {
    if (!geo || !state) { setCities([]); return; }
    setCities(geo.temEstado(country, state) ? geo.cidadesDe(country, state) : []);
  }, [geo, country, state]);

  const handleSearch = async () => {
    if (!niche || !city || !state) {
      setErroBusca('Preencha Nicho, Estado e Cidade para buscar.');
      return;
    }
    setErroBusca('');
    const countryName = countries.find(c => c.isoCode === country)?.name || 'Brasil';
    const fullLocation = `${neighborhood ? neighborhood + ', ' : ''}${city}, ${state}, ${countryName}`;
    
    setIsSearching(true);
    try {
      await performLeadSearch(niche, fullLocation, searchLimit);
      setViewState('results');
    } catch (e: any) {
      console.error(e);
      setErroBusca(e?.message || 'Não foi possível concluir a busca.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative w-full pb-20">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Nova Busca</h1>
        <p className="text-slate-500 mt-1">Encontre negócios locais com oportunidades de venda.</p>
      </div>

      {erroBusca && (
        <div className="mb-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{erroBusca}</span>
        </div>
      )}

      {/* Form Area */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm mb-8">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">País</label>
            <div className="relative">
              <select 
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setState('');
                  setCity('');
                }}
                className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {countries.length === 0 && <option value="BR">Carregando países...</option>}
                {countries.map(c => (
                  <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Estado / Região</label>
            <div className="relative">
              <select 
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setCity('');
                }}
                disabled={!country}
                className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Selecione...</option>
                {states.map(s => (
                  <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cidade</label>
            <div className="relative">
              <select 
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!state || cities.length === 0}
                className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">{cities.length === 0 && state ? "Digite abaixo ou mude o estado" : "Selecione a cidade..."}</option>
                {cities.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {/* Fallback para países sem lista de cidades mapeada */}
            {state && cities.length === 0 && (
              <input 
                type="text" 
                placeholder="Digite o nome da cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full mt-2 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nicho</label>
            <SeletorNicho value={niche} onChange={setNiche} />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Bairro <span className="text-slate-400 normal-case font-medium tracking-normal">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Pituba, Centro..."
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              Quantidade de leads
            </label>
            <div className="relative">
              <select
                value={searchLimit}
                onChange={(e) => setSearchLimit(Number(e.target.value))}
                className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
              >
                {[10, 20, 30, 40, 60].map(n => (
                  <option key={n} value={n}>{n} leads &middot; {n} cr&eacute;ditos</option>
                ))}
              </select>
              <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Voc&ecirc; s&oacute; paga pelos leads realmente encontrados.</p>
          </div>
        </div>
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
