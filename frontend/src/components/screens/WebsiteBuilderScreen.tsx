import React, { useState } from 'react';
import { Globe, Wand2, LayoutTemplate, ArrowLeft, ArrowRight, Building2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

type Step = 'choice' | 'select-lead' | 'form' | 'photos' | 'template' | 'preview';

export const WebsiteBuilderScreen: React.FC = () => {
  const { leads } = useApp() as any;
  const [step, setStep] = useState<Step>('choice');
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('Moderno');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string>('');

  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('');
  const [phone, setPhoneVal] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [hours, setHours] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setStep('preview');
    try {
      const leadPayload = selectedLead ? { ...selectedLead } : {
        id: `site_lead_${Date.now()}`,
        name: 'Cliente',
        company: companyName,
        niche: category,
        phone: phone,
        city: city
      };
      
      const res = await api.generateDemoSite({ lead: leadPayload });
      if (res.html_content) {
        setGeneratedHtml(res.html_content);
      } else {
        setGeneratedHtml("<h1>Erro ao gerar o site com IA. Verifique sua chave API.</h1>");
      }
    } catch (err) {
      console.error(err);
      setGeneratedHtml("<h1>Erro na requisição. Verifique sua conexão e chave API.</h1>");
    } finally {
      setIsGenerating(false);
    }
  };

  const fillFromLead = (lead: any) => {
    setSelectedLead(lead);
    setCompanyName(lead.company || '');
    setCategory(lead.niche || '');
    setPhoneVal(lead.phone || '');
    setWhatsapp(lead.whatsapp || '');
    setEmail(lead.email || '');
    setWebsite(lead.website || '');
    setInstagram(lead.instagram || '');
    setAddress(lead.address || '');
    setCity(lead.location?.split(',')[0]?.trim() || '');
    setState(lead.location?.split(',')[1]?.trim() || '');
    setStep('form');
  };

  if (step === 'choice') {
    return (
      <div key="choice" className="flex-1 flex flex-col h-full relative max-w-4xl mx-auto w-full">
        <div className="mb-6 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Construtor de Sites</h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto">Gere sites institucionais completos com inteligência artificial para usar como "isca" nas suas prospecções.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <button 
            onClick={() => setStep('select-lead')}
            className="bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-8 text-left transition-all hover:shadow-md group flex flex-col items-start relative overflow-hidden"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
              <LayoutTemplate className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">Criar a partir de um Lead</h3>
            <p className="text-slate-500 text-sm">A IA vai ler os dados do Google Meu Negócio do lead que você salvou e preencherá todas as informações do site automaticamente.</p>
          </button>

          <button 
            onClick={() => setStep('form')}
            className="bg-white border-2 border-slate-200 hover:border-blue-500 rounded-2xl p-8 text-left transition-all hover:shadow-md group flex flex-col items-start relative overflow-hidden"
          >
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-6">
              <Wand2 className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">Criar do zero</h3>
            <p className="text-slate-500 text-sm">Você preenche manualmente o nome da empresa, telefone, e outros dados para a IA estruturar o site.</p>
          </button>
        </div>
      </div>
    );
  }

  if (step === 'select-lead') {
    return (
      <div key="select-lead" className="flex-1 flex flex-col h-full relative max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <button onClick={() => setStep('choice')} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Selecione um Lead</h1>
          <p className="text-slate-500 text-sm mt-1">Escolha um lead salvo para preencher automaticamente as informações do site.</p>
        </div>

        <div className="space-y-3">
          {leads && leads.length > 0 ? leads.map((lead: any) => (
            <button
              key={lead.id}
              onClick={() => fillFromLead(lead)}
              className="w-full bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-5 text-left flex items-center justify-between transition-all hover:shadow-sm group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{lead.company}</h3>
                  <p className="text-xs text-slate-400">{lead.niche} · {lead.location?.split(',')[0] || ''}</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
            </button>
          )) : (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Globe className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhum lead salvo ainda.</p>
              <p className="text-sm text-slate-400 mt-1">Faça uma busca primeiro para salvar leads.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div key="form" className="flex-1 flex flex-col h-full relative max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar pb-20">
        <div className="mb-6">
          <button onClick={() => setStep('choice')} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Criar site do zero</h1>
          
          {/* Step Indicator */}
          <div className="flex items-center gap-3 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
              <span className="font-bold text-blue-600">Revisão</span>
            </div>
            <div className="w-12 h-px bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 text-xs font-bold flex items-center justify-center">2</span>
              <span className="text-slate-400">Fotos</span>
            </div>
            <div className="w-12 h-px bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 text-xs font-bold flex items-center justify-center">3</span>
              <span className="text-slate-400">Nicho e Template</span>
            </div>
          </div>
        </div>

        {/* Usage Info */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 mb-6 text-sm text-slate-600">
          0 de 1 sites usados (prévia)
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-800">Revisão dos dados</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nome da empresa</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Nome da empresa" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Categoria / Nicho encontrado</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Restaurante" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Telefone</label>
              <input type="text" value={phone} onChange={(e) => setPhoneVal(e.target.value)} placeholder="(47) 3333-0000" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">WhatsApp</label>
              <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(47) 99999-0000" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Site atual</label>
              <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Instagram</label>
              <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@empresa" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Horário de funcionamento</label>
              <input type="text" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Seg a Sex: 8h-18h" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Endereço</label>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Bairro</label>
              <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Bairro" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cidade</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Estado</label>
              <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="SP" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Google Maps Embed URL</label>
              <input type="text" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://www.google.com/maps/embed?..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>

        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-8 right-8 z-30">
          <button 
            onClick={() => setStep('photos')}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-xl shadow-blue-600/30 transition-all flex items-center gap-3 text-lg hover:scale-105 active:scale-95"
          >
            Continuar
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (step === 'photos') {
    return (
      <div key="photos" className="flex-1 flex flex-col h-full relative max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar pb-20">
        <div className="mb-6">
          <button onClick={() => setStep('form')} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Criar site do zero</h1>
          
          {/* Step Indicator */}
          <div className="flex items-center gap-3 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">✓</span>
              <span className="text-slate-500">Revisão</span>
            </div>
            <div className="w-12 h-px bg-blue-600"></div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <span className="font-bold text-blue-600">Fotos</span>
            </div>
            <div className="w-12 h-px bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 text-xs font-bold flex items-center justify-center">3</span>
              <span className="text-slate-400">Nicho e Template</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">

          {/* Logo Upload */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-1">Logo da empresa</h3>
            <p className="text-sm text-slate-500 mb-4">Formato quadrado recomendado (PNG, JPG). Será usado no cabeçalho do site.</p>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50/50">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-3 border border-slate-200 shadow-sm">
                <Globe className="w-7 h-7 text-slate-300" />
              </div>
              <p className="font-bold text-slate-700 text-sm mb-1">Arraste a logo aqui</p>
              <p className="text-xs text-slate-400">ou clique para selecionar</p>
            </div>
          </div>

          {/* Capa Upload */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-1">Foto de capa</h3>
            <p className="text-sm text-slate-500 mb-4">Imagem panorâmica/horizontal. Será usada como banner principal do site.</p>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50/50">
              <div className="w-full h-32 bg-white rounded-lg flex items-center justify-center mb-3 border border-slate-200 shadow-sm">
                <LayoutTemplate className="w-10 h-10 text-slate-300" />
              </div>
              <p className="font-bold text-slate-700 text-sm mb-1">Arraste a foto de capa aqui</p>
              <p className="text-xs text-slate-400">Tamanho recomendado: 1920x600px</p>
            </div>
          </div>

          {/* Demais Fotos Upload */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-1">Demais fotos</h3>
            <p className="text-sm text-slate-500 mb-4">Adicione fotos do espaço, produtos, equipe, etc. para complementar o conteúdo do site.</p>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-400 transition-colors cursor-pointer bg-slate-50/50">
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[1,2,3].map(i => (
                  <div key={i} className="w-20 h-20 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                    <Globe className="w-6 h-6 text-slate-200" />
                  </div>
                ))}
              </div>
              <p className="font-bold text-slate-700 text-sm mb-1">Arraste as fotos aqui</p>
              <p className="text-xs text-slate-400">Até 10 imagens (PNG, JPG). Opcional.</p>
            </div>
          </div>

        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-8 right-8 z-30">
          <button 
            onClick={() => setStep('template')}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-xl shadow-blue-600/30 transition-all flex items-center gap-3 text-lg hover:scale-105 active:scale-95"
          >
            Continuar
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Step: preview
  if (step === 'preview') {
    return (
      <div key="preview" className="flex-1 flex flex-col h-full relative max-w-6xl mx-auto w-full p-4">
        <div className="mb-4 flex items-center justify-between">
          <button onClick={() => setStep('template')} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700">
            <ArrowLeft className="w-4 h-4" /> Editar Opções
          </button>
          {isGenerating ? (
            <div className="text-blue-600 font-bold flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
              A Inteligência Artificial está escrevendo o código do seu site...
            </div>
          ) : (
            <div className="flex gap-4">
              <button className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                Ver Código Fonte
              </button>
              <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2">
                <Globe className="w-4 h-4" /> Publicar Site
              </button>
            </div>
          )}
        </div>
        
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
          {isGenerating ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50">
              <Wand2 className="w-16 h-16 text-blue-500 animate-pulse mb-6" />
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Construindo seu site...</h3>
              <p className="text-slate-500 max-w-md text-center">A IA está processando suas preferências de design, criando copys persuasivas e estruturando os componentes visuais.</p>
            </div>
          ) : (
            <iframe 
              srcDoc={generatedHtml} 
              className="w-full h-full border-none"
              title="Preview do Site"
            />
          )}
        </div>
      </div>
    );
  }

  // Step: template (Nicho e Template)
  return (
    <div key="template" className="flex-1 flex flex-col h-full relative max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar pb-20">
      <div className="mb-6">
        <button onClick={() => setStep('photos')} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Criar site do zero</h1>
        
        {/* Step Indicator */}
        <div className="flex items-center gap-3 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">✓</span>
            <span className="text-slate-500">Revisão</span>
          </div>
          <div className="w-12 h-px bg-blue-600"></div>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">✓</span>
            <span className="text-slate-500">Fotos</span>
          </div>
          <div className="w-12 h-px bg-blue-600"></div>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</span>
            <span className="font-bold text-blue-600">Nicho e Template</span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Nicho Selection */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-1">Nicho do site</h3>
          <p className="text-sm text-slate-500 mb-4">Selecione o nicho que mais se encaixa para a IA escolher textos e seções adequadas.</p>
          <div className="flex flex-wrap gap-2">
            {['Imobiliária', 'Restaurante', 'Clínica', 'Advocacia', 'Salão de Beleza', 'Loja', 'Academia', 'Contabilidade', 'Consultoria', 'Agência', 'Pet Shop', 'Outro'].map((n, i) => (
              <button key={n} className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${i === 0 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Template Selection */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-1">Template</h3>
          <p className="text-sm text-slate-500 mb-4">Escolha o estilo visual do site que será gerado.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Moderno', desc: 'Clean e minimalista com cores vibrantes' },
              { name: 'Clássico', desc: 'Elegante com tipografia sofisticada' },
              { name: 'Impactante', desc: 'Bold com imagens grandes e contrastes fortes' },
            ].map((tpl) => (
              <button 
                key={tpl.name} 
                onClick={() => setSelectedTemplate(tpl.name)}
                className={`rounded-xl border-2 p-5 text-left transition-all ${selectedTemplate === tpl.name ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'}`}
              >
                <div className={`w-full h-24 rounded-lg mb-4 ${selectedTemplate === tpl.name ? 'bg-blue-100' : 'bg-slate-100'} flex items-center justify-center`}>
                  <LayoutTemplate className={`w-8 h-8 ${selectedTemplate === tpl.name ? 'text-blue-500' : 'text-slate-300'}`} />
                </div>
                <h4 className={`font-bold text-sm mb-1 ${selectedTemplate === tpl.name ? 'text-blue-700' : 'text-slate-700'}`}>{tpl.name}</h4>
                <p className="text-xs text-slate-500">{tpl.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-30">
        <button 
          onClick={handleGenerate}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-xl shadow-blue-600/30 transition-all flex items-center gap-3 text-lg hover:scale-105 active:scale-95"
        >
          <Wand2 className="w-5 h-5" />
          Gerar Site com IA
        </button>
      </div>
    </div>
  );
};
