import React, { useState, useEffect } from 'react';
import {
  Search, ChevronDown, ChevronRight, ChevronUp,
  Activity, Apple, Beer, Briefcase, Building, Building2,
  Calculator, Camera, Car, Code, Coffee, Croissant,
  Dog, Dumbbell, Flower2, GraduationCap, Hammer, HardHat,
  HeartPulse, Home, LineChart, Megaphone, MousePointerClick, PenTool,
  Pill, Pizza, Scale, Scissors, Shield, Shirt,
  ShoppingBag, ShoppingCart, Smile, Sparkles, Stethoscope, Truck,
  Users, Utensils, Wrench, HelpCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ICountry, IState, ICity } from 'country-state-city';

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

// Mapa explicito em vez de `import * as Icons`. O namespace import
// anulava o tree-shaking e trazia a biblioteca inteira de icones
// para o bundle.
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  Apple,
  Beer,
  Briefcase,
  Building,
  Building2,
  Calculator,
  Camera,
  Car,
  Code,
  Coffee,
  Croissant,
  Dog,
  Dumbbell,
  Flower2,
  GraduationCap,
  Hammer,
  HardHat,
  HeartPulse,
  HelpCircle,
  Home,
  LineChart,
  Megaphone,
  MousePointerClick,
  PenTool,
  Pill,
  Pizza,
  Scale,
  Scissors,
  Shield,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smile,
  Sparkles,
  Stethoscope,
  Truck,
  Users,
  Utensils,
  Wrench,
};

const DynamicIcon = ({ name, className }: { name: string, className?: string }) => {
  const IconComponent = ICONS[name] || HelpCircle;
  return <IconComponent className={className} />;
};

export const NovaBuscaScreen: React.FC = () => {
  const { performLeadSearch, setViewState } = useApp() as any;
  const [niche, setNiche] = useState('');
  const [country, setCountry] = useState('BR');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [searchLimit, setSearchLimit] = useState(20);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(NICHE_CATEGORIES[0].category);

  // country-state-city embute um city.json de 7,7 MB. Importado de forma
  // estatica, ele sozinho respondia por ~9 MB do bundle inicial e travava
  // o primeiro carregamento. Agora entra como chunk separado, sob demanda.
  const [geo, setGeo] = useState<typeof import('country-state-city') | null>(null);
  const [countries, setCountries] = useState<ICountry[]>([]);
  const [states, setStates] = useState<IState[]>([]);
  const [cities, setCities] = useState<ICity[]>([]);

  useEffect(() => {
    let active = true;
    import('country-state-city').then(mod => {
      if (!active) return;
      setGeo(mod);
      setCountries(mod.Country.getAllCountries());
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!geo) return;
    setStates(geo.State.getStatesOfCountry(country));
  }, [geo, country]);

  useEffect(() => {
    if (!geo || !state) { setCities([]); return; }
    const exists = geo.State.getStateByCodeAndCountry(state, country);
    setCities(exists ? geo.City.getCitiesOfState(country, state) : []);
  }, [geo, country, state]);

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
                onFocus={() => setExpandedCategory(expandedCategory || NICHE_CATEGORIES[0].category)}
                className="w-full pl-11 pr-4 py-3.5 bg-white border border-blue-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                onClick={() => setExpandedCategory(expandedCategory || NICHE_CATEGORIES[0].category)}
              />
              
              {/* Dropdown de Categorias */}
              {expandedCategory !== null && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-[400px] overflow-y-auto">
                  <div className="p-3 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-10">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Selecione uma Categoria</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setExpandedCategory(null); }}
                      className="text-slate-400 hover:text-slate-600 text-sm font-semibold px-2 py-1"
                    >
                      Fechar
                    </button>
                  </div>
                  
                  <div className="p-2 space-y-2">
                    {NICHE_CATEGORIES.map((cat, idx) => {
                      const isExpanded = expandedCategory === cat.category;
                      return (
                        <div key={idx} className="bg-white border border-slate-100 rounded-xl overflow-hidden transition-shadow">
                          {/* Category Header */}
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedCategory(isExpanded ? 'NONE' : cat.category);
                            }}
                            className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <DynamicIcon name={cat.icon} className="w-4 h-4 text-blue-600" />
                              </div>
                              <h3 className="font-bold text-slate-800 text-sm">{cat.category}</h3>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                          
                          {/* Nichos (Expanded Content) */}
                          {isExpanded && (
                            <div className="p-3 pt-0 border-t border-slate-50 bg-slate-50/30">
                              <div className="grid grid-cols-1 gap-2 mt-3">
                                {cat.niches.map((n, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleNicheClick(n.name);
                                      setExpandedCategory(null); // Fecha o dropdown ao selecionar
                                    }}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left ${niche === n.name ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50'}`}
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
              )}
            </div>
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
