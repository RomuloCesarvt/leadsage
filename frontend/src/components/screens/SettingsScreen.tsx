import React, { useState, useEffect } from 'react';
import { Save, User, Target, Globe, Check, AlertCircle, Image as ImageIcon, Palette } from 'lucide-react';
import { prepararImagem } from '../../lib/imagem';
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

  // Aba Perfil: antes era so aparencia — os campos usavam defaultValue,
  // nao havia estado nem botao de salvar, e "Alterar foto" nao fazia nada.
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [emailComercial, setEmailComercial] = useState('');
  const [nicho, setNicho] = useState('');
  const [oferta, setOferta] = useState('');
  const [avatar, setAvatar] = useState('');
  const [logo, setLogo] = useState('');
  const [corPrimaria, setCorPrimaria] = useState('#2563eb');
  const [corDestaque, setCorDestaque] = useState('#f59e0b');
  const [contatoMarca, setContatoMarca] = useState('');
  const [perfilState, setPerfilState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [perfilErro, setPerfilErro] = useState('');

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

    setNome(user.name || '');
    setEmpresa(user.company_name || '');
    setEmailComercial(user.email || '');
    setNicho(user.niche_focus || '');
    setOferta(user.product_description || '');
    setAvatar(user.avatar || '');
    setLogo(user.brand_logo || '');
    setCorPrimaria(user.brand_primary || '#2563eb');
    setCorDestaque(user.brand_accent || '#f59e0b');
    setContatoMarca(user.brand_contact || '');
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

  const escolherImagem = async (
    arquivo: File | undefined,
    aplicar: (dataUri: string) => void,
    larguraMaxima: number,
    tetoBytes: number
  ) => {
    if (!arquivo) return;
    setPerfilErro('');
    try {
      aplicar(await prepararImagem(arquivo, { larguraMaxima, tetoBytes }));
      setPerfilState('idle');
    } catch (err: any) {
      setPerfilErro(err?.message || 'Nao foi possivel usar esta imagem.');
      setPerfilState('error');
    }
  };

  const salvarPerfil = async () => {
    setPerfilState('saving');
    setPerfilErro('');
    try {
      const saved = await api.updateProfile({
        ...user,
        name: nome,
        company_name: empresa,
        email: emailComercial,
        niche_focus: nicho,
        product_description: oferta,
        avatar,
        brand_logo: logo,
        brand_primary: corPrimaria,
        brand_accent: corDestaque,
        brand_contact: contatoMarca,
      });
      setUser(saved);
      setPerfilState('saved');
    } catch (err: any) {
      setPerfilErro(err?.message || 'Nao foi possivel salvar.');
      setPerfilState('error');
    }
  };

  const rotulo = 'block text-sm font-bold text-slate-700 mb-1.5';
  const campo =
    'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 ' +
    'placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors';

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
            <div className="space-y-8">

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" /> Dados da conta
                </h2>

                <div className="flex items-center gap-6 mb-8">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    {avatar
                      ? <img src={avatar} alt="Sua foto" className="w-full h-full object-cover" />
                      : <span className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">
                          {(nome || '?').trim().charAt(0).toUpperCase()}
                        </span>}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{nome || 'Sem nome'}</h3>
                    <p className="text-slate-500 text-sm">{emailComercial}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <label className="text-sm font-bold text-blue-600 hover:underline cursor-pointer">
                        Alterar foto
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            escolherImagem(e.target.files?.[0], setAvatar, 400, 120 * 1024);
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {avatar && (
                        <button
                          type="button"
                          onClick={() => { setAvatar(''); setPerfilState('idle'); }}
                          className="text-sm font-semibold text-slate-500 hover:text-red-600"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={rotulo}>Nome completo</label>
                    <input
                      type="text"
                      value={nome}
                      onChange={e => { setNome(e.target.value); setPerfilState('idle'); }}
                      className={campo}
                    />
                  </div>
                  <div>
                    <label className={rotulo}>E-mail comercial</label>
                    <input
                      type="email"
                      value={emailComercial}
                      onChange={e => { setEmailComercial(e.target.value); setPerfilState('idle'); }}
                      className={campo}
                    />
                  </div>
                  <div>
                    <label className={rotulo}>Empresa ou marca</label>
                    <input
                      type="text"
                      value={empresa}
                      onChange={e => { setEmpresa(e.target.value); setPerfilState('idle'); }}
                      className={campo}
                    />
                  </div>
                  <div>
                    <label className={rotulo}>Nicho principal</label>
                    <input
                      type="text"
                      value={nicho}
                      onChange={e => { setNicho(e.target.value); setPerfilState('idle'); }}
                      placeholder="Padarias, clinicas, advocacia..."
                      className={campo}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className={rotulo}>Seu produto ou oferta</label>
                    <textarea
                      rows={3}
                      value={oferta}
                      onChange={e => { setOferta(e.target.value); setPerfilState('idle'); }}
                      placeholder="O que voce vende, que problema resolve e o seu diferencial. A IA escreve as abordagens a partir disto."
                      className={`${campo} resize-none custom-scrollbar`}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-600" /> Sua marca nos documentos
                </h2>
                <p className="text-slate-500 text-sm mb-6">
                  É o que aparece no cabeçalho das propostas e dos contratos que você envia.
                </p>

                <div className="flex items-start gap-6 mb-6">
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-50 border border-slate-200 shrink-0 flex items-center justify-center">
                    {logo
                      ? <img src={logo} alt="Sua logo" className="w-full h-full object-contain p-2" />
                      : <ImageIcon className="w-7 h-7 text-slate-300" />}
                  </div>
                  <div>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 cursor-pointer transition-colors">
                      <ImageIcon className="w-4 h-4" /> Enviar logo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          escolherImagem(e.target.files?.[0], setLogo, 600, 200 * 1024);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {logo && (
                      <button
                        type="button"
                        onClick={() => { setLogo(''); setPerfilState('idle'); }}
                        className="ml-3 text-sm font-semibold text-slate-500 hover:text-red-600"
                      >
                        Remover
                      </button>
                    )}
                    <p className="text-xs text-slate-500 mt-2 max-w-xs">
                      PNG, JPG ou SVG. Sem logo, usamos as iniciais da empresa.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={rotulo}>Cor principal</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={corPrimaria}
                        onChange={e => { setCorPrimaria(e.target.value); setPerfilState('idle'); }}
                        className="w-12 h-11 rounded-xl border border-slate-200 bg-white cursor-pointer shrink-0"
                        aria-label="Cor principal"
                      />
                      <input
                        type="text"
                        value={corPrimaria}
                        onChange={e => { setCorPrimaria(e.target.value); setPerfilState('idle'); }}
                        className={campo}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={rotulo}>Cor de destaque</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={corDestaque}
                        onChange={e => { setCorDestaque(e.target.value); setPerfilState('idle'); }}
                        className="w-12 h-11 rounded-xl border border-slate-200 bg-white cursor-pointer shrink-0"
                        aria-label="Cor de destaque"
                      />
                      <input
                        type="text"
                        value={corDestaque}
                        onChange={e => { setCorDestaque(e.target.value); setPerfilState('idle'); }}
                        className={campo}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className={rotulo}>Contato no rodapé</label>
                    <textarea
                      rows={2}
                      value={contatoMarca}
                      onChange={e => { setContatoMarca(e.target.value); setPerfilState('idle'); }}
                      placeholder={`${emailComercial || 'seu@email.com.br'}\n(00) 90000-0000`}
                      className={`${campo} resize-none`}
                    />
                    <p className="text-xs text-slate-500 mt-1.5">Uma linha por informação.</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end items-center gap-4">
                {perfilState === 'saved' && (
                  <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Perfil salvo
                  </span>
                )}
                {perfilState === 'error' && (
                  <span className="text-sm font-semibold text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> {perfilErro}
                  </span>
                )}
                <button
                  onClick={salvarPerfil}
                  disabled={perfilState === 'saving'}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
                >
                  {perfilState === 'saving' ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Salvando...
                    </>
                  ) : (
                    <><Save className="w-4 h-4" /> Salvar perfil</>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
