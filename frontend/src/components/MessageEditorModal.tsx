import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Mail, 
  Share2, 
  CheckCircle2, 
  Loader2, 
  Coins, 
  Bot,
  Camera
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const MessageEditorModal: React.FC = () => {
  const { 
    selectedLeadForMessage, 
    setSelectedLeadForMessage, 
    user, 
    setUser,
    setLeads 
  } = useApp();

  const [tone, setTone] = useState<string>('Consultivo');
  const [channel, setChannel] = useState<'email' | 'instagram_direct' | 'linkedin_msg' | 'webhook'>('email');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const lead = selectedLeadForMessage;

  const handleGeneratePitch = async () => {
    if (!lead) return;
    setIsGenerating(true);
    try {
      const res = await api.generatePitch({
        lead,
        tone,
        custom_instructions: customInstructions,
        sender_name: user.name
      });
      setSubject(res.subject);
      setBody(res.body);
    } catch (err) {
      alert("Erro ao gerar mensagem com IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (lead) {
      handleGeneratePitch();
      setSuccessMessage(null);
    }
  }, [lead]);

  const handleDispatch = async () => {
    if (!lead || !body.trim()) return;
    setIsSending(true);
    setSuccessMessage(null);

    try {
      const res = await api.dispatchMessage({
        lead_id: lead.id,
        lead_name: lead.name,
        lead_email: lead.email,
        lead_instagram: lead.socials.instagram,
        channel,
        subject,
        body
      });

      setUser(prev => ({ ...prev, credits: res.remaining_credits }));

      setLeads(prevLeads =>
        prevLeads.map(l => (l.id === lead.id ? { ...l, outreach_status: 'Enviado' } : l))
      );

      setSuccessMessage(res.status);

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      alert(err.response?.data?.detail || "Erro ao realizar disparo automatizado.");
    } finally {
      setIsSending(false);
    }
  };

  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Editor & Disparo de Copy com IA
              </h3>
              <p className="text-xs text-slate-400">
                Para: <strong className="text-slate-200">{lead.name}</strong> ({lead.role} na {lead.company})
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedLeadForMessage(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fadeIn">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Mensagem disparada com sucesso! Status: {successMessage}
              </span>
              <span className="bg-emerald-500/20 px-2 py-0.5 rounded text-[10px]">
                -2 Créditos
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-indigo-400" /> Tom da Abordagem
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="Consultivo">Consultivo & Estratégico</option>
                <option value="Amigável">Amigável & Leve</option>
                <option value="Direto">Direto ao Ponto</option>
                <option value="Autoridade">Autoridade & Benchmark</option>
                <option value="Promocional">Oferta Promocional / Teste</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-emerald-400" /> Canal de Envio
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setChannel('email')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                    channel === 'email'
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> E-mail / SMTP
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('instagram_direct')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                    channel === 'instagram_direct'
                      ? 'bg-pink-600 border-pink-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" /> Direct Bot
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Personalização com dados de <strong className="text-slate-200">{lead.city}</strong>
            </span>
            <button
              onClick={handleGeneratePitch}
              disabled={isGenerating}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Reescrevendo...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Regerar Copy com IA</span>
                </>
              )}
            </button>
          </div>

          {channel === 'email' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Assunto do E-mail</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-100 font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Conteúdo da Mensagem</span>
              <span className="text-[10px] text-slate-500">Variáveis ativas: {'{nome}'}, {'{empresa}'}, {'{cidade}'}</span>
            </label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Instruções Extras para a IA (Opcional)</label>
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Ex: Mencionar desconto de 20% no primeiro mês ou foco em odontologia estática..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Custo do disparo: <strong className="text-amber-400 font-bold">2 Créditos</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedLeadForMessage(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDispatch}
              disabled={isSending || !body.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Disparar Mensagem Direta</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
