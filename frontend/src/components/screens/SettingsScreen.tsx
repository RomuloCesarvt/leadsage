import React, { useState } from 'react';
import { Save, User, Shield, Target, Globe } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsScreen: React.FC = () => {
  const { user } = useApp() as any;
  const [selectedServices, setSelectedServices] = useState<string[]>(['Sites']);
  const [selectedNiches, setSelectedNiches] = useState<string[]>(['Clínicas', 'Imobiliárias']);
  const [selectedChannel, setSelectedChannel] = useState('WhatsApp');
  const [selectedGoal, setSelectedGoal] = useState('4 a 10');
  const [lang, setLang] = useState('pt');
  const [activeTab, setActiveTab] = useState<'prospeccao' | 'perfil' | 'api'>('prospeccao');

  // API Keys state
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('LEADSAGE_GEMINI_KEY') || '');
  const [mapsKey, setMapsKey] = useState(localStorage.getItem('LEADSAGE_MAPS_KEY') || '');

  const saveApiKeys = () => {
    localStorage.setItem('LEADSAGE_GEMINI_KEY', geminiKey);
    localStorage.setItem('LEADSAGE_MAPS_KEY', mapsKey);
    alert('Chaves de API salvas com sucesso no seu navegador!');
  };

  const toggleService = (s: string) => {
    setSelectedServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const removeNiche = (n: string) => {
    setSelectedNiches(prev => prev.filter(x => x !== n));
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar max-w-5xl mx-auto w-full">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">Gerencie suas preferências de prospecção e perfil da conta.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col - Navigation */}
        <div className="col-span-1 space-y-2 hidden lg:block">
          <button 
            onClick={() => setActiveTab('prospeccao')}
            className={`w-full text-left px-4 py-3 font-bold rounded-xl text-sm transition-colors flex items-center gap-2 ${activeTab === 'prospeccao' ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600 font-medium'}`}
          >
            <Target className="w-4 h-4" /> Preferências de Prospecção
          </button>
          <button 
            onClick={() => setActiveTab('perfil')}
            className={`w-full text-left px-4 py-3 font-bold rounded-xl text-sm transition-colors flex items-center gap-2 ${activeTab === 'perfil' ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600 font-medium'}`}
          >
            <User className="w-4 h-4" /> Perfil da Conta
          </button>
          <button 
            onClick={() => setActiveTab('api')}
            className={`w-full text-left px-4 py-3 font-bold rounded-xl text-sm transition-colors flex items-center gap-2 ${activeTab === 'api' ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600 font-medium'}`}
          >
            <Shield className="w-4 h-4" /> Integrações / APIs
          </button>
        </div>

        {/* Right Col - Forms */}
        <div className="col-span-1 lg:col-span-2 space-y-8">

          {/* Language */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" /> Idioma
            </h2>
            <div className="flex gap-2">
              <button onClick={() => setLang('pt')} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${lang === 'pt' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Português
              </button>
              <button onClick={() => setLang('en')} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${lang === 'en' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                English
              </button>
            </div>
          </div>
          
          {/* API Integrations Form */}
          {activeTab === 'api' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" /> Integrações e Chaves de API
              </h2>
              
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl text-sm mb-6">
                Para que a busca de leads reais e a geração de textos via Inteligência Artificial funcionem perfeitamente, você precisa inserir suas próprias chaves de API abaixo. Elas são salvas apenas no seu navegador local.
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Google Places API Key (Obrigatório para Nova Busca)</label>
                  <p className="text-xs text-slate-500 mb-2">Usado para buscar empresas reais, telefones e sites diretamente do Google Maps.</p>
                  <input 
                    type="password" 
                    value={mapsKey}
                    onChange={(e) => setMapsKey(e.target.value)}
                    placeholder="AIzaSyA..." 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Google Gemini API Key (Obrigatório para IA)</label>
                  <p className="text-xs text-slate-500 mb-2">Usado para gerar as mensagens de prospecção e os textos do construtor de sites. Obtenha no Google AI Studio.</p>
                  <input 
                    type="password" 
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSyB..." 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={saveApiKeys}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Salvar Chaves de API
                </button>
              </div>
            </div>
          )}

          {/* Prospecção Form */}
          {activeTab === 'prospeccao' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" /> Preferências de Prospecção
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Serviço que você vende</label>
                  <div className="flex flex-wrap gap-2">
                    {['Sites', 'Tráfego pago', 'Social media', 'Design', 'Consultoria'].map((item) => (
                      <button 
                        key={item} 
                        onClick={() => toggleService(item)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${selectedServices.includes(item) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Nichos que você prospecta</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedNiches.map((item) => (
                      <div key={item} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium flex items-center gap-2">
                        {item} <span onClick={() => removeNiche(item)} className="text-slate-400 hover:text-slate-600 cursor-pointer">&times;</span>
                      </div>
                    ))}
                  </div>
                  <input type="text" placeholder="Adicionar nicho..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Cidades ou regiões atendidas</label>
                  <input type="text" placeholder="Ex: São Paulo, SP" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Canal preferido</label>
                  <div className="flex flex-wrap gap-2">
                    {['WhatsApp', 'Instagram', 'E-mail', 'Ligação'].map((item) => (
                      <button 
                        key={item} 
                        onClick={() => setSelectedChannel(item)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${selectedChannel === item ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Meta de novos clientes por mês</label>
                  <div className="flex flex-wrap gap-2">
                    {['1 a 3', '4 a 10', '11 a 20', 'Mais de 20'].map((item) => (
                      <button 
                        key={item}
                        onClick={() => setSelectedGoal(item)}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${selectedGoal === item ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2">
                  <Save className="w-4 h-4" /> Salvar preferências
                </button>
              </div>
            </div>
          )}

          {/* Perfil Form */}
          {activeTab === 'perfil' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" /> Dados da Conta
              </h2>

              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                  <img src={user?.avatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{user?.name}</h3>
                  <p className="text-slate-500">{user?.email}</p>
                  <button className="mt-2 text-sm font-bold text-blue-600 hover:underline">Alterar foto</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
                  <input type="text" defaultValue={user?.name} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">E-mail</label>
                  <input type="email" defaultValue={user?.email} readOnly className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed" />
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
