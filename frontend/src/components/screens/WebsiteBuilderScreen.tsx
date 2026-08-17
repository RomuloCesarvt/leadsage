import React, { useState } from 'react';
import { Globe, Wand2, LayoutTemplate, ArrowLeft, ArrowRight, Building2, Phone, Mail, MapPin, AtSign, Clock, Map } from 'lucide-react';
import { useApp } from '../../context/AppContext';

type Step = 'choice' | 'select-lead' | 'form' | 'photos';

export const WebsiteBuilderScreen: React.FC = () => {
  const { leads } = useApp() as any;
  const [step, setStep] = useState<Step>('choice');
  const [_selectedLead, setSelectedLead] = useState<any>(null);

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
      <div className="flex-1 flex flex-col h-full relative max-w-4xl mx-auto w-full">
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
      <div className="flex-1 flex flex-col h-full relative max-w-4xl mx-auto w-full">
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
      <div className="flex-1 flex flex-col h-full relative max-w-4xl mx-auto w-full overflow-y-auto custom-scrollbar pb-20">
        <div className="mb-6">
          <button onClick={() => setStep('choice')} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Revisão</h1>
          <p className="text-slate-500 text-sm mt-1">Preencha ou ajuste as informações abaixo. A IA usará para gerar o site.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                <Building2 className="w-3.5 h-3.5 inline mr-1" /> Nome da empresa
              </label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: Imobiliária Top" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Categoria / Nicho</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex: Imobiliária" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                <Phone className="w-3.5 h-3.5 inline mr-1" /> Telefone
              </label>
              <input type="text" value={phone} onChange={(e) => setPhoneVal(e.target.value)} placeholder="(11) 99999-9999" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">WhatsApp</label>
              <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                <Mail className="w-3.5 h-3.5 inline mr-1" /> E-mail
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Site atual</label>
              <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="www.empresa.com.br" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                <AtSign className="w-3.5 h-3.5 inline mr-1" /> Instagram
              </label>
              <input type="text" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@empresa" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                <Clock className="w-3.5 h-3.5 inline mr-1" /> Horário de funcionamento
              </label>
              <input type="text" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Seg-Sex: 8h-18h" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>

          <div className="w-full h-px bg-slate-100"></div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              <MapPin className="w-3.5 h-3.5 inline mr-1" /> Endereço
            </label>
            <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, Número" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Bairro</label>
              <input type="text" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Centro" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cidade</label>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Paulo" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Estado</label>
              <input type="text" value={state} onChange={(e) => setState(e.target.value)} placeholder="SP" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
              <Map className="w-3.5 h-3.5 inline mr-1" /> Google Maps Embed URL
            </label>
            <input type="text" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://www.google.com/maps/embed?..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
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

  // Step: photos
  return (
    <div className="flex-1 flex flex-col h-full relative max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <button onClick={() => setStep('form')} className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Fotos</h1>
        <p className="text-slate-500 text-sm mt-1">Adicione fotos da empresa para personalizar o site. (Opcional)</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border-2 border-dashed border-slate-300">
          <Globe className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="font-bold text-slate-800 text-lg mb-2">Arraste fotos aqui</h3>
        <p className="text-slate-500 text-sm mb-6">ou clique para selecionar do seu computador</p>
        <button className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
          Selecionar Fotos
        </button>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-30">
        <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-xl shadow-blue-600/30 transition-all flex items-center gap-3 text-lg hover:scale-105 active:scale-95">
          Gerar Site com IA
          <Wand2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
