import { SeletorDeModo } from '../SeletorDeModo';
import React, { useState, useEffect } from 'react';
import { Save, User, Target, Globe, Check, AlertCircle, Palette, Briefcase } from 'lucide-react';
import { MarcaDoDocumento } from '../MarcaDoDocumento';
import { prepararImagem } from '../../lib/imagem';
import { useApp } from '../../context/AppContext';
import { ehEmpresa } from '../../lib/modoDaConta';

// cada modo tem os seus serviços: agência vende marketing; empresa vende o próprio serviço (ar-condicionado e afins)
const SERVICOS_AGENCIA = ['Sites', 'Tráfego pago', 'Social media', 'Design', 'Consultoria'];
const SERVICOS_EMPRESA = ['Instalação', 'Limpeza e higienização', 'Manutenção preventiva', 'Conserto', 'Venda de aparelhos', 'Projeto e dimensionamento'];
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
  const [activeTab, setActiveTab] = useState<'prospeccao' | 'perfil' | 'marca'>('prospeccao');
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
  }, [user]);

  const empresaModo = ehEmpresa(user);
  const [servicoNovo, setServicoNovo] = useState('');
  const listaDeServicos = empresaModo ? SERVICOS_EMPRESA : SERVICOS_AGENCIA;
  const outraLista = empresaModo ? SERVICOS_AGENCIA : SERVICOS_EMPRESA;
  // serviços escritos pela própria pessoa (fora das duas listas) aparecem como opção marcada, no modo em que ela os criou ou em ambos
  const servicosExtras = selectedServices.filter(x => !listaDeServicos.includes(x) && !outraLista.includes(x));
  const adicionarServico = () => {
    const v = servicoNovo.trim().slice(0, 40);
    if (v && !selectedServices.includes(v)) { setSelectedServices(prev => [...prev, v]); setSaveState('idle'); }
    setServicoNovo('');
  };

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
        language: lang,
        avatar,
      });
      setUser(saved);
      setPerfilState('saved');
    } catch (err: any) {
      setPerfilErro(err?.message || 'Nao foi possivel salvar.');
      setPerfilState('error');
    }
  };

  const rotulo = 'block text-[13px] font-bold text-slate-700 mb-1.5';
  const campo =
    'w-full min-h-12 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base md:text-sm text-slate-800 ' +
    'placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors';
  const cartao = 'bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm';
  const titulo = 'text-base md:text-lg font-bold text-slate-800 flex items-center gap-2';
  const dica = 'text-xs text-slate-500 mt-1 mb-3 leading-snug';
  const chip = (on: boolean) =>
    `min-h-11 px-4 rounded-xl border text-sm font-medium transition-colors ${on ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold' : 'bg-white border-slate-200 text-slate-600 active:bg-slate-50'}`;
  const barra = 'sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0 z-10 -mx-4 md:mx-0 px-4 md:px-0 py-3 bg-white/95 backdrop-blur border-t border-slate-200 md:bg-transparent md:border-0 flex items-center justify-end gap-3 flex-wrap';
  const botaoSalvar = 'min-h-12 flex-1 md:flex-none px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2';
  const abas = [
    { id: 'prospeccao', nome: 'Prospecção', icone: <Target className="w-4 h-4" /> },
    { id: 'perfil', nome: 'Conta', icone: <User className="w-4 h-4" /> },
    { id: 'marca', nome: 'Marca', icone: <Palette className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="flex-1 max-w-3xl w-full mx-auto" data-testid="configuracoes">

      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">Prospecção, dados da conta e a marca que sai nos seus documentos.</p>
      </div>

      <div role="tablist" className="grid grid-cols-3 gap-1 p-1 mb-5 bg-slate-100 rounded-2xl">
        {abas.map(a => (
          <button key={a.id} role="tab" aria-selected={activeTab === a.id} onClick={() => setActiveTab(a.id)}
            className={`min-h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${activeTab === a.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
            {a.icone} {a.nome}
          </button>
        ))}
      </div>

      {activeTab === 'prospeccao' && (
        <div className="space-y-4">
          <div className={cartao}>
            <h2 className={titulo}><Briefcase className="w-5 h-5 text-blue-600" /> O que você vende</h2>
            <p className={dica}>É a base das abordagens e das propostas que a IA escreve para você.</p>
            <div className="flex flex-wrap gap-2">
              {[...listaDeServicos, ...servicosExtras].map(item => (
                <button key={item} onClick={() => toggleService(item)} aria-pressed={selectedServices.includes(item)} className={chip(selectedServices.includes(item))}>{item}</button>
              ))}
            </div>
            {empresaModo && (
              <input type="text" value={servicoNovo} maxLength={40} onChange={e => setServicoNovo(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionarServico(); } }} onBlur={adicionarServico}
                placeholder="Outro serviço seu? Escreva e toque em Enter" className={`${campo} mt-3`} />
            )}
          </div>

          <div className={cartao}>
            <h2 className={titulo}><Target className="w-5 h-5 text-blue-600" /> {empresaModo ? 'Quem você atende' : 'Nichos que você prospecta'}</h2>
            <p className={dica}>{empresaModo ? 'Tipos de cliente. Ex.: clínicas, restaurantes, condomínios.' : 'Os ramos em que você busca leads.'}</p>
            {selectedNiches.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {selectedNiches.map(item => (
                  <span key={item} className="min-h-10 pl-4 pr-1 rounded-xl bg-slate-100 text-slate-700 text-sm font-medium flex items-center gap-1">
                    {item}
                    <button type="button" onClick={() => removeNiche(item)} aria-label={`Remover ${item}`} className="w-9 h-9 flex items-center justify-center text-slate-400 text-lg">&times;</button>
                  </span>
                ))}
              </div>
            )}
            <input type="text" placeholder={empresaModo ? 'Adicionar tipo de cliente' : 'Adicionar nicho'} enterKeyHint="done" value={nicheInput}
              onChange={e => setNicheInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNiche(); } }} onBlur={addNiche} className={campo} />
          </div>

          <div className={cartao}>
            <h2 className={titulo}><Globe className="w-5 h-5 text-blue-600" /> Onde e como</h2>
            <div className="space-y-5 mt-3">
              <div>
                <label className={rotulo} htmlFor="cfg-regiao">Cidades ou regiões atendidas</label>
                <input id="cfg-regiao" type="text" placeholder="Ex.: São Paulo, SP" value={regions} onChange={e => { setRegions(e.target.value); setSaveState('idle'); }} className={campo} />
              </div>
              <div>
                <span className={rotulo}>Canal preferido</span>
                <div className="flex flex-wrap gap-2">
                  {['WhatsApp', 'Instagram', 'E-mail', 'Ligação'].map(item => (
                    <button key={item} onClick={() => { setSelectedChannel(item); setSaveState('idle'); }} aria-pressed={selectedChannel === item} className={chip(selectedChannel === item)}>{item}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className={rotulo}>Meta de novos clientes por mês</span>
                <div className="flex flex-wrap gap-2">
                  {['1 a 3', '4 a 10', '11 a 20', 'Mais de 20'].map(item => (
                    <button key={item} onClick={() => { setSelectedGoal(item); setSaveState('idle'); }} aria-pressed={selectedGoal === item} className={chip(selectedGoal === item)}>{item}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className={barra}>
            {saveState === 'saved' && <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5"><Check className="w-4 h-4" /> Salvo</span>}
            {saveState === 'error' && <span className="text-sm font-semibold text-red-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" /> {saveError}</span>}
            <button onClick={handleSave} disabled={saveState === 'saving'} className={botaoSalvar}>
              {saveState === 'saving' ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar</>}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'perfil' && (
        <div className="space-y-4">
          <div className={cartao}>
            <h2 className={titulo}><User className="w-5 h-5 text-blue-600" /> Seus dados</h2>
            <div className="flex items-center gap-4 my-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                {avatar
                  ? <img src={avatar} alt="Sua foto" className="w-full h-full object-cover" />
                  : <span className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xl">{(nome || '?').trim().charAt(0).toUpperCase()}</span>}
              </div>
              <div className="min-w-0 flex items-center gap-1 flex-wrap">
                <label className="min-h-11 px-4 inline-flex items-center rounded-xl bg-slate-100 text-sm font-bold text-blue-600 cursor-pointer">
                  {avatar ? 'Trocar foto' : 'Enviar foto'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => { escolherImagem(e.target.files?.[0], setAvatar, 400, 120 * 1024); e.target.value = ''; }} />
                </label>
                {avatar && <button type="button" onClick={() => { setAvatar(''); setPerfilState('idle'); }} className="min-h-11 px-3 text-sm font-semibold text-slate-500">Remover</button>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className={rotulo} htmlFor="cfg-nome">Nome completo</label>
                <input id="cfg-nome" type="text" value={nome} onChange={e => { setNome(e.target.value); setPerfilState('idle'); }} className={campo} /></div>
              <div><label className={rotulo} htmlFor="cfg-email">E-mail comercial</label>
                <input id="cfg-email" type="email" inputMode="email" value={emailComercial} onChange={e => { setEmailComercial(e.target.value); setPerfilState('idle'); }} className={campo} /></div>
            </div>
          </div>

          <div className={cartao}>
            <h2 className={titulo}><Briefcase className="w-5 h-5 text-blue-600" /> Sobre o seu negócio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div><label className={rotulo} htmlFor="cfg-empresa">Empresa ou marca</label>
                <input id="cfg-empresa" type="text" value={empresa} onChange={e => { setEmpresa(e.target.value); setPerfilState('idle'); }} className={campo} /></div>
              <div><label className={rotulo} htmlFor="cfg-nicho">{empresaModo ? 'Cliente principal' : 'Nicho principal'}</label>
                <input id="cfg-nicho" type="text" value={nicho} onChange={e => { setNicho(e.target.value); setPerfilState('idle'); }}
                  placeholder={empresaModo ? 'Clínicas, restaurantes, condomínios...' : 'Padarias, clínicas, advocacia...'} className={campo} /></div>
              <div className="md:col-span-2"><label className={rotulo} htmlFor="cfg-oferta">Seu produto ou oferta</label>
                <textarea id="cfg-oferta" rows={4} value={oferta} onChange={e => { setOferta(e.target.value); setPerfilState('idle'); }}
                  placeholder={empresaModo ? 'Que serviço você presta, que problema resolve e o seu diferencial (ex.: atendimento rápido, garantia).' : 'O que você vende, que problema resolve e o seu diferencial.'}
                  className={`${campo} resize-none`} />
                <p className="text-xs text-slate-500 mt-1">A IA escreve as abordagens a partir deste texto.</p></div>
            </div>
          </div>

          <div className={cartao}>
            <h2 className={titulo}>Como você usa o LeadSage</h2>
            <p className={dica}>Agência ou empresa. A troca também está no rodapé do menu; seus leads e conversas continuam como estão.</p>
            <div className="max-w-sm -mx-4"><SeletorDeModo /></div>
          </div>

          <div className={cartao}>
            <h2 className={titulo}><Globe className="w-5 h-5 text-blue-600" /> Idioma</h2>
            <p className={dica}>Preferência do painel. As mensagens para os leads saem no idioma do país de cada lead, sem você precisar trocar nada.</p>
            <div className="grid grid-cols-2 gap-2 max-w-sm">
              {([['pt', 'Português'], ['en', 'English']] as const).map(([cod, nomeIdioma]) => (
                <button key={cod} onClick={() => { setLang(cod); setPerfilState('idle'); }} aria-pressed={lang === cod}
                  className={`min-h-12 rounded-xl text-sm font-bold ${lang === cod ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{nomeIdioma}</button>
              ))}
            </div>
          </div>

          <div className={barra}>
            {perfilState === 'saved' && <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5"><Check className="w-4 h-4" /> Salvo</span>}
            {perfilState === 'error' && <span className="text-sm font-semibold text-red-600 flex items-center gap-1.5"><AlertCircle className="w-4 h-4 shrink-0" /> {perfilErro}</span>}
            <button onClick={salvarPerfil} disabled={perfilState === 'saving'} className={botaoSalvar}>
              {perfilState === 'saving' ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar</>}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'marca' && (
        <div className={cartao}>
          <h2 className={titulo}><Palette className="w-5 h-5 text-blue-600" /> Sua marca nos documentos</h2>
          <p className={dica}>Logo, nome e cores que aparecem no cabeçalho e na capa das propostas e dos contratos.</p>
          <MarcaDoDocumento />
        </div>
      )}
    </div>
  );
};
