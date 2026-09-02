import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Country, State, City } from 'country-state-city';

const NICHE_CATEGORIES = [
  {
    category: "Saúde e Bem-Estar",
    icon: "HeartPulse",
    niches: [
      { name: "Academias", icon: "Dumbbell" },
      { name: "Clínicas de Estética", icon: "Sparkles" },
      { name: "Clínicas Médicas", icon: "Stethoscope" },
      { name: "Clínicas Odontológicas", icon: "Smile" },
      { name: "Farmácias", icon: "Pill" },
      { name: "Fisioterapeutas", icon: "Activity" },
      { name: "Nutricionistas", icon: "Apple" },
      { name: "Salões de Beleza", icon: "Scissors" },
      { name: "Barbearias", icon: "Scissors" },
    ]
  },
  {
    category: "Imóveis e Construção",
    icon: "Building",
    niches: [
      { name: "Arquitetos", icon: "PenTool" },
      { name: "Corretores de Imóveis", icon: "Home" },
      { name: "Empreiteiras", icon: "HardHat" },
      { name: "Imobiliárias", icon: "Building2" },
      { name: "Marcenarias", icon: "Hammer" },
      { name: "Materiais de Construção", icon: "Wrench" }
    ]
  },
  {
    category: "Comércio e Varejo",
    icon: "ShoppingBag",
    niches: [
      { name: "Autopeças", icon: "Car" },
      { name: "Boutiques", icon: "ShoppingBag" },
      { name: "Distribuidores", icon: "Truck" },
      { name: "E-commerces", icon: "MousePointerClick" },
      { name: "Floriculturas", icon: "Flower2" },
      { name: "Lojas de Roupas", icon: "Shirt" },
      { name: "Pet Shops", icon: "Dog" },
      { name: "Supermercados", icon: "ShoppingCart" },
    ]
  },
  {
    category: "Alimentação",
    icon: "Utensils",
    niches: [
      { name: "Bares", icon: "Beer" },
      { name: "Cafeterias", icon: "Coffee" },
      { name: "Padarias", icon: "Croissant" },
      { name: "Pizzarias", icon: "Pizza" },
      { name: "Restaurantes", icon: "Utensils" }
    ]
  },
  {
    category: "Serviços Profissionais",
    icon: "Briefcase",
    niches: [
      { name: "Advogados", icon: "Scale" },
      { name: "Agências de Marketing", icon: "Megaphone" },
      { name: "Consultorias", icon: "LineChart" },
      { name: "Contabilidades", icon: "Calculator" },
      { name: "Designers", icon: "PenTool" },
      { name: "Fotógrafos", icon: "Camera" },
      { name: "Seguradoras", icon: "Shield" },
      { name: "Desenvolvedores de Software", icon: "Code" }
    ]
  },
  {
    category: "Serviços Gerais",
    icon: "Wrench",
    niches: [
      { name: "Coworking", icon: "Users" },
      { name: "Escolas", icon: "GraduationCap" },
      { name: "Estúdios de Tatuagem", icon: "PenTool" },
      { name: "Mecânicas", icon: "Wrench" },
      { name: "Oficinas", icon: "Wrench" },
      { name: "Transportadoras", icon: "Truck" }
    ]
  }
];

const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
  const IconComponent = (Icons as any)[name] || Icons.HelpCircle;
  return <IconComponent className={className} />;
};

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
  const [expandedCategory, setExpandedCategory] = useState<string | null>(NICHE_CATEGORIES[0].category);

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

  const handleNicheClick = (selectedNiche: string) => {
    setNiche(selectedNiche);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex-1 flex flex-col h-full relative max-w-5xl mx-auto w-full pb-20">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-800">Nova Busca</h1>
        <p className="text-slate-500 mt-1">Encontre negócios locais com oportunidades de venda.</p>
      </div>

      {/* Form Area */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm mb-8">
        
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
                placeholder="Digite ou escolha abaixo..."
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-blue-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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

        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Qtd. de Leads (Teste Ilimitado)</label>
          <input 
            type="number" 
            value={searchLimit}
            onChange={(e) => setSearchLimit(parseInt(e.target.value) || 10)}
            className="w-full md:w-1/3 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <p className="text-sm text-slate-400">Buscaremos até {searchLimit} empresas. Você só utiliza créditos pelos leads reais encontrados.</p>
      </div>

      {/* Categorias de Nichos */}
      <div className="mb-24">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Sugestões de Nichos por Categoria</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {NICHE_CATEGORIES.map((cat, idx) => {
            const isExpanded = expandedCategory === cat.category;
            return (
              <div key={idx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Category Header */}
                <button 
                  onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
                  className="w-full flex items-center justify-between p-5 bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <DynamicIcon name={cat.icon} className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">{cat.category}</h3>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </button>
                
                {/* Nichos (Expanded Content) */}
                {isExpanded && (
                  <div className="p-5 pt-2 border-t border-slate-100 bg-slate-50/50">
                    <div className="grid grid-cols-2 gap-3">
                      {cat.niches.map((n, i) => (
                        <button
                          key={i}
                          onClick={() => handleNicheClick(n.name)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left ${niche === n.name ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/30'}`}
                        >
                          <DynamicIcon name={n.icon} className={`w-4 h-4 ${niche === n.name ? 'text-blue-600' : 'text-slate-400'}`} />
                          <span className="font-semibold text-sm line-clamp-1">{n.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
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
