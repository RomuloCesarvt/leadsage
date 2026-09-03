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
  Camera,
  MessageCircle,
  Webhook
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
  const [channel, setChannel] = useState<'email' | 'whatsapp' | 'instagram_direct' | 'linkedin_msg' | 'webhook'>('email');
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const lead = selectedLeadForMessage;

  // WhatsApp, Instagram e LinkedIn não têm API de envio: a plataforma
  // abre com a mensagem copiada e nada é cobrado.
  const isManualChannel = ['whatsapp', 'instagram_direct', 'linkedin_msg'].includes(channel);

  const handleGeneratePitch = async () => {
    if (!lead) return;
    setIsGenerating(true);
    try {
      const res = await api.generatePitch({
        lead,
        tone,
        custom_instructions: customInstructions,
        sender_name: user?.name || 'LeadSage',
        user_product: user?.product_description || ''
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
    setDispatchError(null);

    try {
      const res = await api.dispatchMessage({
        lead_id: lead.id,
        lead_name: lead.name,
        lead_email: lead.email,
        lead_instagram: lead.socials.instagram,
        lead_linkedin: lead.socials.linkedin,
        lead_phone: lead.phone,
        channel,
        subject,
        body
      });

      setUser(prev => prev ? { ...prev, credits: res.remaining_credits } : prev);

      setLeads(prevLeads =>
        prevLeads.map(l => (l.id === lead.id
          ? { ...l, outreach_status: res.delivered ? 'Enviado' : 'Aguardando envio manual' }
          : l))
      );

      setSuccessMessage(res.status);

      // Canais sem API de envio: copia a mensagem e abre o destino, em
      // vez de fingir que a plataforma foi acionada.
      if (res.requires_manual_send && res.action_url) {
        try {
          await navigator.clipboard.writeText(body);
        } catch {
          /* a área de transferência pode estar bloqueada */
        }
        window.open(res.action_url, '_blank', 'noopener,noreferrer');
      }

      // Confete só para entrega real. Antes ele disparava até quando a
      // resposta era "Erro no Envio: ..." ou "(Simulado)".
      if (res.delivered) {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      setDispatchError(err?.message || 'Erro ao realizar o disparo.');
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
            <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between animate-fadeIn ${
              isManualChannel
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
            }`}>
              <span className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${isManualChannel ? 'text-amber-400' : 'text-emerald-400'}`} />
                {successMessage}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] ${isManualChannel ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                {isManualChannel ? 'Sem custo' : '-2 Créditos'}
              </span>
            </div>
          )}

          {dispatchError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <X className="w-4 h-4 text-red-400 shrink-0" />
              {dispatchError}
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
                  onClick={() => setChannel('whatsapp')}
                  disabled={!lead.phone}
                  title={lead.phone ? 'Abre o WhatsApp com a mensagem pronta' : 'Este lead não tem telefone'}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    channel === 'whatsapp'
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('instagram_direct')}
                  disabled={!lead.socials.instagram}
                  title={lead.socials.instagram ? 'Abre o perfil com a mensagem copiada' : 'Este lead não tem Instagram'}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                    channel === 'instagram_direct'
                      ? 'bg-pink-600 border-pink-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" /> Instagram
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('webhook')}
                  title="Envia o payload para a automação configurada em Integrações"
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                    channel === 'webhook'
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Webhook className="w-3.5 h-3.5" /> Webhook
                </button>
              </div>
              {isManualChannel && (
                <p className="text-[11px] text-amber-400/90 leading-snug">
                  Não existe API pública para enviar por aqui. A LeadSage copia a
                  mensagem e abre a conversa para você concluir — sem gastar créditos.
                </p>
              )}
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
