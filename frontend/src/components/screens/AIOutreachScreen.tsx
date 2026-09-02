import React, { useState } from 'react';
import { MessageSquare, Sparkles, ChevronDown, Check, Copy } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api } from '../../services/api';

const TONES = [
  { id: 'Consultivo', label: 'Consultivo', desc: 'Tom de consultor de negócios' },
  { id: 'Amigável', label: 'Amigável', desc: 'Tom leve e descontraído' },
  { id: 'Direto', label: 'Direto', desc: 'Vai direto ao ponto' },
  { id: 'Autoridade', label: 'Autoridade', desc: 'Posicionamento de especialista' },
  { id: 'Promocional', label: 'Promocional', desc: 'Ofertas e benefícios' },
];

export const AIOutreachScreen: React.FC = () => {
  const { leads, user } = useApp() as any;
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedTone, setSelectedTone] = useState('Consultivo');
  const [customInstructions, setCustomInstructions] = useState('');
  const [userProduct, setUserProduct] = useState(user?.product_description || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPitch, setGeneratedPitch] = useState<{subject: string, body: string} | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!selectedLeadId) return alert('Selecione um lead primeiro.');
    const lead = leads.find((l: any) => l.id === selectedLeadId);
    if (!lead) return;

    setIsGenerating(true);
    setGeneratedPitch(null);
    try {
      const res = await api.generatePitch({
        lead: lead,
        tone: selectedTone,
        custom_instructions: customInstructions,
        sender_name: user?.name || 'Consultor LeadSage',
        user_product: userProduct,
      });
      setGeneratedPitch({
        subject: res.subject,
        body: res.body
      });
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar mensagem. Verifique sua chave da API Gemini nas configurações.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedPitch) return;
    navigator.clipboard.writeText(`Assunto: ${generatedPitch.subject}\n\n${generatedPitch.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedLead = leads.find((l: any) => l.id === selectedLeadId);

  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">IA de Abordagem</h1>
        <p className="text-slate-500 text-sm mt-1">Crie mensagens hiper-personalizadas para prospecção fria no WhatsApp e E-mail.</p>
      </div>

      <div className="flex-1 relative flex flex-col md:flex-row gap-6">
        
        {/* Left Panel - Config */}
        <div className="w-full md:w-1/3 space-y-4">
          
          {/* Lead Selection */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-2">Lead</label>
            <div className="relative mb-4">
              <select 
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Selecione um lead...</option>
                {leads.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name} - {l.company}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {selectedLead && (
              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
                <p><span className="font-bold text-slate-700">{selectedLead.company}</span></p>
                <p>{selectedLead.niche} · {selectedLead.city}</p>
                {selectedLead.ai_summary && <p className="text-slate-400 line-clamp-2">{selectedLead.ai_summary}</p>}
              </div>
            )}
          </div>

          {/* Tone Selection */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-3">Tom da mensagem</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(tone => (
                <button
                  key={tone.id}
                  onClick={() => setSelectedTone(tone.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${selectedTone === tone.id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  title={tone.desc}
                >
                  {tone.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product/Service */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-2">Seu produto/serviço</label>
            <textarea
              value={userProduct}
              onChange={(e) => setUserProduct(e.target.value)}
              placeholder="Descreva brevemente o que você vende ou o problema que resolve..."
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Custom Instructions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-2">Instruções extras <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Ex: Mencionar que sou de Botucatu, oferecer desconto de 20%..."
              rows={2}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Generate Button */}
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !selectedLeadId}
            className={`w-full py-3 transition-colors text-white font-bold rounded-xl flex items-center justify-center gap-2 ${isGenerating || !selectedLeadId ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isGenerating ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span> Gerando com IA...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Gerar Abordagem</>
            )}
          </button>
        </div>

        {/* Right Panel - Result */}
        <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-8 flex flex-col shadow-sm">
          {!generatedPitch ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg mb-2">Selecione um lead e clique em Gerar</h3>
              <p className="text-slate-500 max-w-sm">A IA irá analisar o perfil da empresa (nicho, localização, deficiências digitais) e criará uma mensagem perfeita para você copiar e colar no WhatsApp ou E-mail.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Mensagem Gerada</h3>
                  <p className="text-sm text-slate-500">Tom: {selectedTone} · Pronta para ser enviada</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
                  >
                    {copied ? <><Check className="w-4 h-4 text-green-600" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar Tudo</>}
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-sm text-slate-700 whitespace-pre-wrap flex-1 overflow-y-auto">
                <span className="font-bold text-slate-900 block mb-2">Assunto: {generatedPitch.subject}</span>
                {generatedPitch.body}
              </div>

              <div className="mt-4 flex gap-3">
                <button 
                  onClick={handleGenerate}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Regenerar
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
