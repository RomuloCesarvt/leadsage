import React, { useState, useEffect } from 'react';
import { Save, User, Target, Globe, Check, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

export const SettingsScreen: React.FC = () => {
  const { user, setUser } = useApp() as any;
  const [selectedServices, setSelectedServices] = useState<string[]>(['Sites']);
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [nicheInput, setNicheInput] = useState('');
  const [regions, setRegions] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('WhatsApp');
  const [selectedGoal, setSelectedGoal] = useState('4 a 10');
  const [lang, setLang] = useState('pt');
  const [activeTab, setActiveTab] = useState<'prospeccao' | 'perfil'>('prospeccao');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  // Carrega o que já foi salvo. Antes a tela sempre abria nos valores
  // fixos do useState e o botão Salvar não gravava nada.
  useEffect(() => {
    if (!user) return;
    if (user.services) setSelectedServices(user.services);
    if (user.niches) setSelectedNiches(user.niches);
    if (user.regions) setRegions(user.regions);
    if (user.preferred_channel) setSelectedChannel(user.preferred_channel);
    if (user.monthly_goal) setSelectedGoal(user.monthly_goal);
    if (user.language) setLang(user.language);
  }, [user]);

  const toggleService = (s: string) => {
    setSelectedServices(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
    setSaveState('idle');
  };

  const removeNiche = (n: string) => {
    setSelectedNiches(prev => prev.filter(x => x !== n));
    setSaveState('idle');
  };

  const addNiche = () => {
    const value = nicheInput.trim();
    if (!value || selectedNiches.includes(value)) { setNicheInput(''); return; }
    setSelectedNiches(prev => [...prev, value]);
    setNicheInput('');
    setSaveState('idle');
  };

  const handleSave = async () => {
    setSaveState('saving');
    setSaveError('');
    try {
      const saved = await api.updateProfile({
        ...user,
        services: selectedServices,
        niches: selectedNiches,
        regions,
        preferred_channel: selectedChannel,
        monthly_goal: selectedGoal,
        language: lang,
      });
      setUser(saved);
      setSaveState('saved');
    } catch (err: any) {
      setSaveError(err?.message || 'Não foi possível salvar.');
      setSaveState('error');
    }
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
        </div>

        {/* Right Col - Forms */}
        <div className="col-span-1 lg:col-span-2 space-y-8">

          {/* Language */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" /> Idioma
            </h2>
            <div className="flex gap-2">
              <button onClick={() => { setLang('pt'); setSaveState('idle'); }} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${lang === 'pt' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                Português
              </button>
              <button onClick={() => { setLang('en'); setSaveState('idle'); }} className={`px-5 py-2 rounded-full text-sm font-bold transition-colors ${lang === 'en' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                English
              </button>
            </div>
          </div>
          
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
                  <input
                    type="text"
                    placeholder="Adicionar nicho e pressionar Enter..."
                    value={nicheInput}
                    onChange={(e) => setNicheInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addNiche(); } }}
                    onBlur={addNiche}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Cidades ou regiões atendidas</label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo, SP"
                    value={regions}
                    onChange={(e) => { setRegions(e.target.value); setSaveState("idle"); }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Canal preferido</label>
                  <div className="flex flex-wrap gap-2">
                    {['WhatsApp', 'Instagram', 'E-mail', 'Ligação'].map((item) => (
                      <button 
                        key={item} 
                        onClick={() => { setSelectedChannel(item); setSaveState('idle'); }}
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
                        onClick={() => { setSelectedGoal(item); setSaveState('idle'); }}
                        className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${selectedGoal === item ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end items-center gap-4">
                {saveState === 'saved' && (
                  <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Preferências salvas
                  </span>
                )}
                {saveState === 'error' && (
                  <span className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> {saveError}
                  </span>
                )}
                <button
                  onClick={handleSave}
                  disabled={saveState === 'saving'}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                  {saveState === 'saving' ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Salvando...
                    </>
                  ) : (
                    <><Save className="w-4 h-4" /> Salvar preferências</>
                  )}
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
