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
  Webhook,
  AlertTriangle,
  Target,
  Copy,
  Check,
  CalendarClock,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LinkedInIcon } from './BrandIcons';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { FollowUp } from '../types';

type Canal = 'email' | 'whatsapp' | 'whatsapp_api' | 'instagram_direct' | 'linkedin_msg' | 'webhook';

const NOME_DO_CANAL: Record<Canal, string> = {
  email: 'e-mail',
  whatsapp: 'WhatsApp',
  whatsapp_api: 'WhatsApp',
  instagram_direct: 'Instagram',
  linkedin_msg: 'LinkedIn',
  webhook: 'webhook',
};

/**
 * Editor da abordagem.
 *
 * Três defeitos foram corrigidos aqui, e todos custavam venda:
 *
 * 1. O canal não era enviado para a IA. A mensagem saía sempre no
 *    formato de e-mail — 130 palavras com assinatura — e ia para o
 *    WhatsApp, onde ninguém lê isso. Agora o canal vai junto, e trocar
 *    de canal avisa que o texto precisa ser reescrito, sem apagar o que
 *    o usuário já editou.
 * 2. Uma falha da IA virava texto no corpo da mensagem ("Houve um erro
 *    ao processar..."), com o botão de disparar ligado. Agora o erro
 *    aparece como erro.
 * 3. Não existia seguimento. Contato frio raramente responde no
 *    primeiro toque; a cadência de aquecimento agora vem pronta.
 */
export const MessageEditorModal: React.FC = () => {
  const {
    selectedLeadForMessage,
    setSelectedLeadForMessage,
    user,
    setUser,
    setLeads
  } = useApp();

  const lead = selectedLeadForMessage;

  const [tone, setTone] = useState<string>('Consultivo');
  const [channel, setChannel] = useState<Canal>('email');
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [usarTemplate, setUsarTemplate] = useState(false);
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  // Para qual canal o texto atual foi escrito. Sem isso não dá para
  // avisar que a copy na caixa é de e-mail e o envio é de WhatsApp.
  const [canalDaCopy, setCanalDaCopy] = useState<Canal | null>(null);
  const [hook, setHook] = useState<string>('');
  const [reasoning, setReasoning] = useState<string>('');
  const [avisos, setAvisos] = useState<string[]>([]);
  const [seguimentos, setSeguimentos] = useState<FollowUp[]>([]);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // WhatsApp (link), Instagram e LinkedIn não têm API de envio: a
  // plataforma abre com a mensagem copiada e nada é cobrado.
  const isManualChannel = ['whatsapp', 'instagram_direct', 'linkedin_msg'].includes(channel);
  const copyDesatualizada = Boolean(body && canalDaCopy && canalDaCopy !== channel);

  const gerarCopy = async (canal: Canal) => {
    if (!lead) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const res = await api.generatePitch({
        lead,
        channel: canal,
        tone,
        custom_instructions: customInstructions,
        sender_name: user?.name || 'LeadSage',
        user_product: user?.product_description || ''
      });
      setSubject(res.subject || '');
      setBody(res.body || '');
      setHook(res.hook || '');
      setReasoning(res.reasoning || '');
      setAvisos(res.warnings || []);
      setSeguimentos(res.follow_ups || []);
      setCanalDaCopy((res.channel as Canal) || canal);
    } catch (err: any) {
      // A mensagem do backend já diz o que aconteceu (chave ausente,
      // Gemini fora do ar). Trocar por "Erro ao gerar" escondia isso.
      setGenerationError(err?.message || 'Não foi possível gerar a mensagem agora.');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!lead) return;
    // O canal sugerido vem da busca: quem tem WhatsApp lê no WhatsApp,
    // quem só tem e-mail lê no e-mail.
    const sugerido = (lead.best_channel as Canal) || 'email';
    const inicial: Canal =
      sugerido === 'whatsapp' && !lead.phone ? 'email'
      : sugerido === 'instagram_direct' && !lead.socials?.instagram ? 'email'
      : sugerido;
    setChannel(inicial);
    setSuccessMessage(null);
    setDispatchError(null);
    gerarCopy(inicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);

  const copiar = async (texto: string, indice: number) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(indice);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      /* navegador bloqueou a área de transferência */
    }
  };

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
        body,
        use_template: channel === 'whatsapp_api' ? usarTemplate : undefined,
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
        let copiou = true;
        try {
          await navigator.clipboard.writeText(body);
        } catch {
          // Alguns navegadores bloqueiam a área de transferência; sem
          // avisar, o usuário colaria o conteúdo errado.
          copiou = false;
        }
        if (!copiou) {
          setDispatchError('A conversa foi aberta, mas não consegui copiar a mensagem. Copie pelo botão acima.');
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

  const botaoCanal = (
    valor: Canal,
    icone: React.ReactNode,
    rotulo: string,
    ativo: boolean,
    motivo: string,
    cor: string,
  ) => (
    <button
      type="button"
      onClick={() => setChannel(valor)}
      disabled={!ativo}
      title={motivo}
      className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
        channel === valor ? cor : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
      }`}
    >
      {icone} {rotulo}
    </button>
  );

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

          {generationError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/40 text-red-300 text-xs animate-fadeIn">
              <div className="font-semibold flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                A IA não escreveu a mensagem
              </div>
              <p className="text-red-200/90 leading-snug">{generationError}</p>
              <button
                onClick={() => gerarCopy(channel)}
                className="mt-2 text-[11px] font-semibold text-red-200 underline hover:text-white"
              >
                Tentar de novo
              </button>
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
                <option value="Consultivo">Consultivo &amp; Estratégico</option>
                <option value="Amigável">Amigável &amp; Leve</option>
                <option value="Direto">Direto ao Ponto</option>
                <option value="Autoridade">Autoridade &amp; Benchmark</option>
                <option value="Promocional">Oferta Promocional / Teste</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-emerald-400" /> Canal de Envio
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {botaoCanal(
                  'email', <Mail className="w-3.5 h-3.5" />, 'E-mail / SMTP',
                  Boolean(lead.email),
                  lead.email ? 'Envia pelo seu SMTP' : 'Este lead não tem e-mail',
                  'bg-indigo-600 border-indigo-500 text-white',
                )}
                {botaoCanal(
                  'whatsapp_api', <MessageCircle className="w-3.5 h-3.5" />, 'WhatsApp API',
                  Boolean(lead.phone),
                  lead.phone ? 'Envia de verdade pela Cloud API da Meta' : 'Este lead não tem telefone',
                  'bg-emerald-700 border-emerald-600 text-white',
                )}
                {botaoCanal(
                  'whatsapp', <MessageCircle className="w-3.5 h-3.5" />, 'WhatsApp (link)',
                  Boolean(lead.phone),
                  lead.phone ? 'Abre o WhatsApp com a mensagem pronta' : 'Este lead não tem telefone',
                  'bg-emerald-600 border-emerald-500 text-white',
                )}
                {botaoCanal(
                  'instagram_direct', <Camera className="w-3.5 h-3.5" />, 'Instagram',
                  Boolean(lead.socials.instagram),
                  lead.socials.instagram ? 'Abre a conversa com a mensagem copiada' : 'Este lead não tem Instagram',
                  'bg-pink-600 border-pink-500 text-white',
                )}
                {botaoCanal(
                  'linkedin_msg', <LinkedInIcon className="w-3.5 h-3.5" title="LinkedIn" />, 'LinkedIn',
                  Boolean(lead.socials.linkedin),
                  lead.socials.linkedin ? 'Abre a janela de mensagem com o texto copiado' : 'Este lead não tem LinkedIn',
                  'bg-sky-700 border-sky-600 text-white',
                )}
                {botaoCanal(
                  'webhook', <Webhook className="w-3.5 h-3.5" />, 'Webhook',
                  true,
                  'Envia o payload para a automação configurada em Integrações',
                  'bg-amber-600 border-amber-500 text-white',
                )}
              </div>
              {isManualChannel && (
                <p className="text-[11px] text-amber-400/90 leading-snug">
                  {channel === 'whatsapp'
                    ? 'Modo link: abre o WhatsApp com a mensagem já preenchida. Sem custo.'
                    : 'Abre a conversa e copia a mensagem — é só colar com Ctrl+V e enviar. Instagram e LinkedIn não permitem preencher o texto por link. Sem custo.'}
                </p>
              )}

              {channel === 'whatsapp_api' && (
                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usarTemplate}
                      onChange={e => setUsarTemplate(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span className="text-[11px] text-emerald-300 leading-snug">
                      Usar template aprovado — obrigatório para quem <strong>não</strong> te
                      respondeu nas últimas 24h. Nesse modo quem vai é o texto
                      aprovado na Meta; a mensagem escrita acima não é enviada.
                    </span>
                  </label>
                  <p className="text-[11px] text-amber-400/90 leading-snug">
                    Enviar para quem não pediu contato viola a política da Meta e pode
                    banir seu número. Use com quem já te procurou ou deu opt-in.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* O texto foi escrito para outro canal: avisar em vez de apagar
              o que o usuário editou. */}
          {copyDesatualizada && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-[11px] flex items-center justify-between gap-3 animate-fadeIn">
              <span className="leading-snug">
                Este texto foi escrito para <strong>{NOME_DO_CANAL[canalDaCopy as Canal]}</strong> e
                você vai enviar por <strong>{NOME_DO_CANAL[channel]}</strong>. O tamanho e o tom mudam.
              </span>
              <button
                onClick={() => gerarCopy(channel)}
                disabled={isGenerating}
                className="shrink-0 px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 font-semibold hover:bg-amber-500/30 disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3 h-3" /> Reescrever
              </button>
            </div>
          )}

          {(hook || reasoning) && !generationError && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              {hook && (
                <p className="text-[11px] text-slate-300 flex items-start gap-2">
                  <Target className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                  <span><strong className="text-slate-200">Gancho usado:</strong> {hook}</span>
                </p>
              )}
              {reasoning && (
                <p className="text-[11px] text-slate-400 leading-snug pl-[22px]">
                  <strong className="text-slate-300">Perda que a mensagem ataca:</strong> {reasoning}
                </p>
              )}
            </div>
          )}

          {avisos.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200">
              <div className="font-semibold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Revise antes de enviar
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {avisos.map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Personalização com dados de <strong className="text-slate-200">{lead.city}</strong>
            </span>
            <button
              onClick={() => gerarCopy(channel)}
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
              <span className="text-[10px] text-slate-500">
                {body.trim() ? `${body.trim().split(/\s+/).length} palavras` : 'Variáveis: {nome}, {empresa}, {cidade}'}
              </span>
            </label>
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3.5 bg-slate-950 border border-slate-700/80 rounded-xl text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* A cadência que aquece: o contato frio raramente responde no
              primeiro toque, e repetir o mesmo pedido soa cobrança. */}
          {seguimentos.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-emerald-400" />
                Sequência de aquecimento
                <span className="font-normal text-slate-500">— se ele não responder</span>
              </label>
              {seguimentos.map((f, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                      {f.quando}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copiar(f.texto, i)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        {copiado === i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        {copiado === i ? 'Copiado' : 'Copiar'}
                      </button>
                      <button
                        onClick={() => setBody(f.texto)}
                        className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        Usar agora
                      </button>
                    </div>
                  </div>
                  {f.objetivo && <p className="text-[10px] text-slate-500">{f.objetivo}</p>}
                  <p className="text-[11px] text-slate-300 whitespace-pre-line leading-relaxed">{f.texto}</p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400">Instruções Extras para a IA (Opcional)</label>
            <input
              type="text"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Ex: Mencionar desconto de 20% no primeiro mês ou foco em odontologia estética..."
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-400" />
            {isManualChannel ? (
              <span>Este canal abre a conversa: <strong className="text-emerald-400 font-bold">sem custo</strong></span>
            ) : (
              <span>Custo do disparo: <strong className="text-amber-400 font-bold">2 Créditos</strong></span>
            )}
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
              disabled={isSending || isGenerating || !body.trim()}
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
                  <span>{isManualChannel ? `Abrir ${NOME_DO_CANAL[channel]}` : 'Disparar Mensagem'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
