import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Mail,
  CheckCircle2,
  Loader2,
  Coins,
  Camera,
  MessageCircle,
  Webhook,
  AlertTriangle,
  Copy,
  Check,
  CalendarClock,
  RefreshCw,
  ChevronDown,
  Phone,
  MapPin,
  Star,
  Wand2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LinkedInIcon } from './BrandIcons';
import { Avatar } from './Avatar';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { EstadoFilaWhats, FollowUp } from '../types';

type Canal = 'email' | 'whatsapp' | 'whatsapp_api' | 'instagram_direct' | 'linkedin_msg' | 'webhook';

const NOME_DO_CANAL: Record<Canal, string> = {
  email: 'e-mail',
  whatsapp: 'WhatsApp',
  whatsapp_api: 'WhatsApp',
  instagram_direct: 'Instagram',
  linkedin_msg: 'LinkedIn',
  webhook: 'webhook',
};

const TONS: { valor: string; rotulo: string }[] = [
  { valor: 'Consultivo', rotulo: 'Consultivo' },
  { valor: 'Amigável', rotulo: 'Amigável' },
  { valor: 'Direto', rotulo: 'Direto' },
  { valor: 'Autoridade', rotulo: 'Autoridade' },
  { valor: 'Promocional', rotulo: 'Promoção' },
];

const AJUSTES_RAPIDOS = [
  'Mais curta',
  'Mais informal',
  'Mais profissional',
  'Oferecer mostrar um esboço do site',
  'Falar das avaliações dele',
];

/**
 * Editor e envio da abordagem.
 *
 * Três regras que custavam venda e continuam valendo:
 *
 * 1. O canal vai para a IA: WhatsApp não comporta 130 palavras de e-mail.
 *    Trocar de canal avisa que o texto precisa ser reescrito, sem apagar
 *    o que o usuário já editou.
 * 2. Falha da IA aparece como erro, nunca como texto dentro da mensagem.
 * 3. Contato frio raramente responde no primeiro toque; a sequência de
 *    aquecimento vem pronta.
 *
 * O visual segue o resto do sistema (tema claro): quem escreve e envia
 * precisa ler o texto com conforto, ver para quem vai e poder pedir outra
 * versão em um clique.
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
  // Para qual canal o texto atual foi escrito.
  const [canalDaCopy, setCanalDaCopy] = useState<Canal | null>(null);
  const [hook, setHook] = useState<string>('');
  const [reasoning, setReasoning] = useState<string>('');
  const [avisos, setAvisos] = useState<string[]>([]);
  const [seguimentos, setSeguimentos] = useState<FollowUp[]>([]);
  const [carregandoSeguimentos, setCarregandoSeguimentos] = useState(false);
  // o WhatsApp do próprio usuário, pelo Conector: quando está de pé, o botão envia de verdade
  const [whats, setWhats] = useState<EstadoFilaWhats | null>(null);
  const [copiado, setCopiado] = useState<number | null>(null);
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [maisCanais, setMaisCanais] = useState(false);
  const [verPorque, setVerPorque] = useState(false);
  const [verSequencia, setVerSequencia] = useState(false);
  const [verAjuste, setVerAjuste] = useState(false);

  // WhatsApp (link), Instagram e LinkedIn não têm API de envio: a
  // plataforma abre com a mensagem copiada e nada é cobrado.
  const isManualChannel = ['whatsapp', 'instagram_direct', 'linkedin_msg'].includes(channel);
  const copyDesatualizada = Boolean(body && canalDaCopy && canalDaCopy !== channel);

  const gerarCopy = async (canal: Canal, opcoes: { tom?: string; instrucoes?: string } = {}) => {
    if (!lead) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const res = await api.generatePitch({
        lead,
        channel: canal,
        tone: opcoes.tom ?? tone,
        custom_instructions: opcoes.instrucoes ?? customInstructions,
        sender_name: user?.name || 'LeadSage',
        user_product: user?.product_description || ''
      });
      setSeguimentos([]);
      setSubject(res.subject || '');
      setBody(res.body || '');
      setHook(res.hook || '');
      setReasoning(res.reasoning || '');
      setAvisos(res.warnings || []);
      setSeguimentos(res.follow_ups || []);
      setCanalDaCopy((res.channel as Canal) || canal);
      // a primeira mensagem ja esta na tela; os acompanhamentos chegam em segundo plano
      if (!(res.follow_ups || []).length && res.body) {
        setCarregandoSeguimentos(true);
        api.generateFollowups({
          lead, channel: canal, tone: opcoes.tom ?? tone,
          sender_name: user?.name || 'LeadSage', user_product: user?.product_description || '',
        }, res.body)
          .then(r => { setSeguimentos(r.follow_ups || []); setAvisos(a => [...a, ...(r.warnings || [])]); })
          .catch(() => { /* sem acompanhamento nao impede de enviar */ })
          .finally(() => setCarregandoSeguimentos(false));
      }
    } catch (err: any) {
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
    setVerPorque(false);
    setVerSequencia(false);
    setVerAjuste(false);
    setCustomInstructions('');
    api.conectorFila().then(setWhats).catch(() => setWhats(null));
    gerarCopy(inicial, { instrucoes: '' });
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
      // WhatsApp com o Conector de pé: sai pelo número do próprio usuário, na fila de segurança
      if (channel === 'whatsapp' && whats?.online && lead.phone) {
        const estado = await api.conectorEnviar({
          lead_id: lead.id, nome: lead.company || lead.name, telefone: lead.phone, texto: body,
        });
        setWhats(estado);
        setLeads(prev => prev.map(l => (l.id === lead.id ? { ...l, outreach_status: 'Aguardando envio' } : l)));
        setSuccessMessage(estado.motivo || 'Na fila do Conector: sai em instantes pelo seu WhatsApp.');
        return;
      }
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
          copiou = false;
        }
        if (!copiou) {
          setDispatchError('A conversa foi aberta, mas não consegui copiar a mensagem. Use o botão Copiar.');
        }
        window.open(res.action_url, '_blank', 'noopener,noreferrer');
      }

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

  const fechar = () => setSelectedLeadForMessage(null);
  const palavras = body.trim() ? body.trim().split(/\s+/).length : 0;

  const aba = (
    valor: Canal,
    icone: React.ReactNode,
    rotulo: string,
    ativo: boolean,
    motivo: string,
  ) => (
    <button
      key={valor}
      type="button"
      onClick={() => setChannel(valor)}
      disabled={!ativo}
      title={motivo}
      aria-pressed={channel === valor}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        channel === valor
          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {icone} {rotulo}
    </button>
  );

  const destino =
    channel === 'email' ? lead.email
    : channel === 'whatsapp' || channel === 'whatsapp_api' ? lead.phone
    : channel === 'instagram_direct' ? lead.socials?.instagram
    : channel === 'linkedin_msg' ? lead.socials?.linkedin
    : '';

  const dicaDoCanal =
    channel === 'whatsapp' ? (whats?.online ? `Sai pelo seu WhatsApp conectado (hoje ${whats.enviadas_hoje} de ${whats.limite_hoje}). Sem custo.` : 'Abre o WhatsApp com a mensagem já preenchida. Sem custo.')
    : channel === 'instagram_direct' || channel === 'linkedin_msg'
      ? 'Abre a conversa e copia a mensagem: é só colar (Ctrl+V) e enviar. Sem custo.'
    : channel === 'email' ? 'Sai pelo seu e-mail configurado.'
    : channel === 'whatsapp_api' ? 'Envia pela API oficial da Meta, no seu número conectado.'
    : 'Envia os dados para a automação configurada em Integrações.';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
         onMouseDown={e => { if (e.target === e.currentTarget) fechar(); }}>
      <div role="dialog" aria-label="Escrever e enviar mensagem"
           className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[90vh]">

        {/* cabeçalho: para quem vai */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar src={lead.avatar} nome={lead.company || lead.name} className="w-11 h-11 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 truncate">
                Mensagem para {lead.company || lead.name}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                {lead.name && lead.name !== lead.company && (
                  <span className="font-semibold text-slate-700">{lead.name}</span>
                )}
                {lead.niche && <span>{lead.niche}</span>}
                {lead.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lead.city}</span>}
                {typeof lead.rating === 'number' && lead.rating > 0 && (
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-500 fill-amber-400" />
                    {lead.rating.toFixed(1).replace('.', ',')}{lead.rating_count ? ` (${lead.rating_count})` : ''}
                  </span>
                )}
                {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
              </div>
            </div>
          </div>
          <button onClick={fechar} aria-label="Fechar"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 overflow-y-auto space-y-5 flex-1 min-h-0">
          {successMessage && (
            <div className={`p-3.5 rounded-xl border text-sm font-semibold flex items-center justify-between gap-3 ${
              isManualChannel ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {successMessage}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[11px] bg-white/70 shrink-0">
                {isManualChannel ? 'Sem custo' : '-2 créditos'}
              </span>
            </div>
          )}

          {dispatchError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" />
              {dispatchError}
            </div>
          )}

          {generationError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              <div className="font-semibold flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                A IA não conseguiu escrever agora
              </div>
              <p className="leading-snug">{generationError}</p>
              <button onClick={() => gerarCopy(channel)} className="mt-2 text-xs font-bold underline">
                Tentar de novo
              </button>
            </div>
          )}

          {/* 1. por onde enviar */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">1. Por onde enviar</p>
            <div className="flex flex-wrap gap-2">
              {aba('email', <Mail className="w-4 h-4" />, 'E-mail', Boolean(lead.email),
                lead.email ? 'Envia pelo seu e-mail configurado' : 'Este lead não tem e-mail')}
              {aba('whatsapp', <MessageCircle className="w-4 h-4" />, 'WhatsApp', Boolean(lead.phone),
                lead.phone ? 'Abre o WhatsApp com a mensagem pronta' : 'Este lead não tem telefone')}
              {aba('instagram_direct', <Camera className="w-4 h-4" />, 'Instagram', Boolean(lead.socials?.instagram),
                lead.socials?.instagram ? 'Abre a conversa com a mensagem copiada' : 'Este lead não tem Instagram')}
              {aba('linkedin_msg', <LinkedInIcon className="w-4 h-4" title="LinkedIn" />, 'LinkedIn', Boolean(lead.socials?.linkedin),
                lead.socials?.linkedin ? 'Abre a mensagem com o texto copiado' : 'Este lead não tem LinkedIn')}
              <button type="button" onClick={() => setMaisCanais(v => !v)}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50">
                Mais <ChevronDown className={`w-4 h-4 transition-transform ${maisCanais ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {maisCanais && (
              <div className="flex flex-wrap gap-2 mt-2">
                {aba('whatsapp_api', <MessageCircle className="w-4 h-4" />, 'WhatsApp API', Boolean(lead.phone),
                  lead.phone ? 'Envia pela Cloud API da Meta' : 'Este lead não tem telefone')}
                {aba('webhook', <Webhook className="w-4 h-4" />, 'Webhook', true,
                  'Envia para a automação configurada em Integrações')}
              </div>
            )}
            <p className="text-xs text-slate-500 mt-2.5 leading-snug">
              {destino ? <>Para <b className="text-slate-700">{destino}</b>. </> : null}{dicaDoCanal}
            </p>

            {channel === 'whatsapp_api' && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={usarTemplate} onChange={e => setUsarTemplate(e.target.checked)}
                    className="mt-0.5 accent-emerald-600" />
                  <span className="text-xs text-emerald-900 leading-snug">
                    Usar modelo aprovado: obrigatório para quem <b>não</b> te respondeu nas últimas 24 h.
                    Nesse modo quem vai é o texto aprovado na Meta, e não o escrito abaixo.
                  </span>
                </label>
                <p className="text-xs text-amber-800 leading-snug">
                  Enviar para quem não pediu contato viola a política da Meta e pode banir seu número.
                </p>
              </div>
            )}
          </div>

          {/* 2. a mensagem */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">2. A mensagem</p>
              <span className="text-xs text-slate-400">{palavras ? `${palavras} palavras` : ''}</span>
            </div>

            {copyDesatualizada && (
              <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
                <span className="leading-snug">
                  Este texto foi escrito para <b>{NOME_DO_CANAL[canalDaCopy as Canal]}</b> e você vai enviar por{' '}
                  <b>{NOME_DO_CANAL[channel]}</b>. Tamanho e tom mudam.
                </span>
                <button onClick={() => gerarCopy(channel)} disabled={isGenerating}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-100 border border-amber-300 font-bold hover:bg-amber-200 disabled:opacity-50 flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3" /> Reescrever
                </button>
              </div>
            )}

            {channel === 'email' && (
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto do e-mail"
                aria-label="Assunto do e-mail"
                className="w-full mb-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            )}

            <div className="relative">
              <textarea
                rows={9}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                aria-label="Texto da mensagem"
                placeholder={isGenerating ? '' : 'A mensagem aparece aqui. Você pode editar à vontade.'}
                disabled={isGenerating && !body}
                className={`w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[15px] text-slate-900 leading-relaxed font-sans resize-y focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-opacity ${isGenerating ? 'opacity-40' : ''}`}
              />
              {isGenerating && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-md border border-slate-100 text-sm font-semibold text-indigo-600">
                    <Loader2 className="w-4 h-4 animate-spin" /> Escrevendo para {lead.company || lead.name}…
                  </span>
                </div>
              )}
            </div>

            {/* ações sobre o texto */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button onClick={() => gerarCopy(channel)} disabled={isGenerating}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors">
                <Sparkles className="w-4 h-4" /> Gerar outra versão
              </button>
              <button onClick={() => copiar(body, -1)} disabled={!body.trim()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                {copiado === -1 ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiado === -1 ? 'Copiado' : 'Copiar'}
              </button>
              <button onClick={() => setVerAjuste(v => !v)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <Wand2 className="w-4 h-4" /> Pedir um ajuste
              </button>
            </div>

            {/* tom: troca e já reescreve */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500 mr-1">Tom:</span>
              {TONS.map(t => (
                <button key={t.valor} type="button" disabled={isGenerating}
                  onClick={() => { setTone(t.valor); gerarCopy(channel, { tom: t.valor }); }}
                  aria-pressed={tone === t.valor}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors disabled:opacity-60 ${
                    tone === t.valor
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>
                  {t.rotulo}
                </button>
              ))}
            </div>

            {verAjuste && (
              <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {AJUSTES_RAPIDOS.map(a => (
                    <button key={a} type="button" disabled={isGenerating}
                      onClick={() => { setCustomInstructions(a); gerarCopy(channel, { instrucoes: a }); }}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-60">
                      {a}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !isGenerating) gerarCopy(channel); }}
                    placeholder="Ou escreva: mencionar desconto, falar de estética…"
                    aria-label="Pedido de ajuste para a IA"
                    className="flex-1 min-w-0 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                  <button onClick={() => gerarCopy(channel)} disabled={isGenerating || !customInstructions.trim()}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                    Reescrever
                  </button>
                </div>
              </div>
            )}

            {avisos.length > 0 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Vale revisar antes de enviar
                </div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {avisos.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* 3. extras recolhidos */}
          {(hook || reasoning) && !generationError && (
            <div className="border border-slate-200 rounded-xl">
              <button onClick={() => setVerPorque(v => !v)} aria-expanded={verPorque}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700">
                Por que essa mensagem
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${verPorque ? 'rotate-180' : ''}`} />
              </button>
              {verPorque && (
                <div className="px-4 pb-4 space-y-2 text-sm text-slate-600 leading-relaxed">
                  {hook && <p><b className="text-slate-800">Fato usado para abrir:</b> {hook}</p>}
                  {reasoning && <p><b className="text-slate-800">O que ela resolve para ele:</b> {reasoning}</p>}
                </div>
              )}
            </div>
          )}

          {carregandoSeguimentos && !seguimentos.length && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5 px-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparando as mensagens de acompanhamento…</p>
          )}
          {seguimentos.length > 0 && (
            <div className="border border-slate-200 rounded-xl">
              <button onClick={() => setVerSequencia(v => !v)} aria-expanded={verSequencia}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700">
                <span className="flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-emerald-600" />
                  Se ele não responder: {seguimentos.length} mensagens de acompanhamento
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${verSequencia ? 'rotate-180' : ''}`} />
              </button>
              {verSequencia && (
                <div className="px-4 pb-4 space-y-3">
                  {seguimentos.map((f, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold uppercase tracking-wide text-emerald-700">{f.quando}</span>
                        <div className="flex items-center gap-3">
                          <button onClick={() => copiar(f.texto, i)}
                            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold">
                            {copiado === i ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiado === i ? 'Copiado' : 'Copiar'}
                          </button>
                          <button onClick={() => setBody(f.texto)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                            Usar agora
                          </button>
                        </div>
                      </div>
                      {f.objetivo && <p className="text-xs text-slate-500 mb-1.5">{f.objetivo}</p>}
                      <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed">{f.texto}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* rodapé: o que acontece ao enviar */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-500" />
            {isManualChannel
              ? <span>Abre a conversa: <b className="text-emerald-600">sem custo</b></span>
              : <span>Custo do envio: <b className="text-amber-600">2 créditos</b></span>}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={fechar}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleDispatch}
              disabled={isSending || isGenerating || !body.trim()}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-colors"
            >
              {isSending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
              ) : (
                <><Send className="w-4 h-4" /> {channel === 'whatsapp' && whats?.online ? 'Enviar pelo meu WhatsApp' : isManualChannel ? `Abrir ${NOME_DO_CANAL[channel]}` : 'Enviar mensagem'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
