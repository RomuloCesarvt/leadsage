import React, { useState } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Country, State, City } from 'country-state-city';

const POPULAR_NICHES = [
  "Academias", "Advogados", "Agências de Marketing", "Arquitetos", "Autopeças",
  "Bares", "Barbearias", "Boutiques", "Cabeleireiros", "Cafeterias", 
  "Clínicas de Estética", "Clínicas Médicas", "Clínicas Odontológicas", "Consultorias", 
  "Contabilidades", "Corretores de Imóveis", "Coworking", "Designers", 
  "Distribuidores", "E-commerces", "Empreiteiras", "Escolas", "Estúdios de Tatuagem",
  "Farmácias", "Fisioterapeutas", "Floriculturas", "Fotógrafos", "Hospitais",
  "Hotéis", "Imobiliárias", "Lojas de Roupas", "Marcenarias", "Mecânicas",
  "Nutricionistas", "Oficinas", "Padarias", "Pet Shops", "Pizzarias",
  "Restaurantes", "Salões de Beleza", "Seguradoras", "Supermercados", "Transportadoras"
];

export const NovaBuscaScreen: React.FC = () => {
  const { performLeadSearch, setViewState } = useApp() as any;
  const [niche, setNiche] = useState('');
  const [country, setCountry] = useState('BR');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [radius, setRadius] = useState('10');
  const [searchLimit, setSearchLimit] = useState(10);
  const [isSearching, setIsSearching] = useState(false);

  const countries = Country.getAllCountries();
  const states = State.getStatesOfCountry(country);
  const cities = State.getStateByCodeAndCountry(state, country) ? City.getCitiesOfState(country, state) : [];

  const handleSearch = async () => {
    if (!niche || !city || !state) {
      alert("Preencha Nicho, Estado e Cidade para buscar.");
      return;
    }
    const countryName = countries.find(c => c.isoCode === country)?.name || 'Brasil';
    const fullLocation = `${neighborhood ? neighborhood + ', ' : ''}${city}, ${state}, ${countryName}`;
    
    setIsSearching(true);
    try {
      await performLeadSearch(niche, fullLocation, searchLimit);
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

      {/* Form Area */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nicho</label>
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                list="niche-list"
                placeholder="Buscar ou selecionar nicho..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <datalist id="niche-list">
                {POPULAR_NICHES.map(n => (
                  <option key={n} value={n} />
                ))}
              </datalist>
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
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Qtd. de Leads (Teste Ilimitado)</label>
          <input 
            type="number" 
            value={searchLimit}
            onChange={(e) => setSearchLimit(parseInt(e.target.value) || 10)}
            className="w-full md:w-1/3 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
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
