import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Send, Trash2, Check, ArrowRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { MascoteLS } from './Logo';
import { useCelular } from '../lib/useCelular';
import { useApp } from '../context/AppContext';

/**
 * O agente do LeadSage: um chat onde você pede e ele faz (buscar leads, escrever as mensagens da fila).
 * Nunca envia nada: termina na revisão. Gastar créditos pede um toque em "Confirmar".
 * Cada mensagem gasta 1 uso da cota do dia do plano (volta à meia-noite).
 */

type Msg = { papel: 'usuario' | 'agente'; texto: string; em: string; cartao?: { tipo: 'busca' | 'fila'; search_id?: string; exemplos?: string[] } };
type Estado = {
  mensagens: Msg[];
  pendente: { acao: string; nicho: string; local: string; quantidade: number; custo: number; saldo: number } | null;
  tarefa: { status: 'rodando' | 'pronto' | 'erro'; feitos: number; total: number; para_revisar: number } | null;
  nao_lidas: number;
  cota: { usados: number; limite: number | null; restantes: number | null; volta_em: string };
};

const SUGESTOES = [
  'Busque fisioterapeutas em Campinas, 100 leads',
  'Quanto tenho de créditos?',
  'Como está a fila de envio?',
];

const horaDeVolta = (iso?: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'meia-noite';
};

export const AgenteChat: React.FC = () => {
  const { setViewState, setLeads, user, setUser, viewState } = useApp() as any;
  const celular = useCelular();
  const [aberto, setAberto] = useState(false);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const fim = useRef<HTMLDivElement>(null);
  const continuando = useRef(false);

  const valido = (e: any): e is Estado => !!e && Array.isArray(e.mensagens) && !!e.cota;
  const aplicar = useCallback((e: Estado) => { if (valido(e)) setEstado(e); }, []);

  useEffect(() => {
    if (!user) return;
    let vivo = true;
    api.agenteEstado().then(e => { if (vivo && valido(e)) setEstado(e); }).catch(() => { /* sem agente por enquanto */ });
    return () => { vivo = false; };
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // tarefa em andamento (escrever as mensagens): um lote por chamada, mesmo com o chat fechado
  const rodando = estado?.tarefa?.status === 'rodando';
  useEffect(() => {
    if (!rodando || continuando.current) return;
    continuando.current = true;
    let vivo = true;
    (async () => {
      try {
        while (vivo) {
          const e = await api.agenteContinuar();
          if (!vivo) break;
          if (!valido(e)) break;
          setEstado(e);
          if (e.tarefa?.status !== 'rodando') break;
        }
      } catch (err: any) {
        if (vivo) setErro(err?.message || 'Não consegui continuar agora. Abra o chat de novo para retomar.');
      } finally {
        continuando.current = false;
      }
    })();
    return () => { vivo = false; continuando.current = false; };
  }, [rodando]);

  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }); }, [estado?.mensagens.length, enviando, aberto, estado?.pendente]);

  const abrir = () => {
    setAberto(true);
    if (estado?.nao_lidas) api.agenteLidas().then(() => setEstado(e => (e ? { ...e, nao_lidas: 0 } : e))).catch(() => undefined);
  };

  const enviar = async (t: string) => {
    const msg = t.trim();
    if (!msg || enviando) return;
    setErro(''); setTexto(''); setEnviando(true);
    setEstado(e => (e ? { ...e, mensagens: [...e.mensagens, { papel: 'usuario', texto: msg, em: new Date().toISOString() }] } : e));
    try { aplicar(await api.agenteMensagem(msg)); }
    catch (err: any) {
      setErro(err?.message || 'Não consegui falar com o agente agora.');
      api.agenteEstado().then(aplicar).catch(() => undefined);
    } finally { setEnviando(false); }
  };

  const confirmar = async (ok: boolean) => {
    setErro(''); setEnviando(true);
    try {
      aplicar(await api.agenteConfirmar(ok));
      if (ok) api.getCreditBalance().then((b: any) => setUser?.((u: any) => (u && typeof b?.credits === 'number' ? { ...u, credits: b.credits } : u))).catch(() => undefined);
    } catch (err: any) { setErro(err?.message || 'Não consegui concluir.'); }
    finally { setEnviando(false); }
  };

  const verLeads = async (searchId?: string) => {
    if (!searchId) return;
    try {
      const { leads } = await api.agenteBusca(searchId);
      // os leads novos vão para o TOPO da lista (os antigos ficam logo abaixo)
      const novos = leads.map((l: any) => ({ ...l, salvo: true }));
      const ids = new Set(novos.map((l: any) => l.id));
      setLeads((prev: any[]) => [...novos, ...prev.filter(l => !ids.has(l.id))]);
      setAberto(false);
      setViewState('workspace');
    } catch (err: any) { setErro(err?.message || 'Não consegui abrir os leads.'); }
  };

  const limpar = async () => { try { await api.agenteLimpar(); setEstado(await api.agenteEstado()); } catch { /* mantém a conversa */ } };

  if (!user || !estado) return null;
  const cota = estado.cota;
  const semCota = cota.restantes === 0;
  const bolha = (m: Msg, i: number) => (
    <div key={i} className={`flex ${m.papel === 'usuario' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug whitespace-pre-wrap ${m.papel === 'usuario' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-slate-100 text-slate-800 rounded-bl-md'}`}>
        {m.texto}
        {m.cartao?.tipo === 'busca' && (
          <button type="button" onClick={() => verLeads(m.cartao?.search_id)} className="mt-2 w-full min-h-11 rounded-xl bg-white text-blue-700 text-sm font-bold flex items-center justify-center gap-1.5 border border-blue-200">
            Ver os leads <ArrowRight className="w-4 h-4" />
          </button>
        )}
        {m.cartao?.tipo === 'fila' && (
          <button type="button" onClick={() => { try { sessionStorage.setItem('leadsage_fila_foco', 'revisar'); } catch { /* sem armazenamento */ } setAberto(false); setViewState('fila'); }} className="mt-2 w-full min-h-11 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-1.5">
            Abrir a fila para revisar <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {!aberto && !(celular && viewState === 'fila') && (
        <button type="button" onClick={abrir} aria-label="Abrir o agente" data-testid="agente-botao"
          className="fixed right-2 z-40 w-14 h-14 flex items-center justify-center opacity-70 hover:opacity-100 active:opacity-100 active:scale-95 transition-opacity drop-shadow-[0_2px_6px_rgba(15,23,42,0.35)] bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:bottom-6 md:right-6">
          <MascoteLS size={52} piscando={false} className={rodando ? 'animate-bounce' : ''} />
          {estado.nao_lidas > 0 && <span className="absolute top-0 right-0 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">{estado.nao_lidas}</span>}
        </button>
      )}

      {aberto && (
        <div className="fixed inset-0 z-50 md:inset-auto md:right-6 md:bottom-6 md:w-[420px] md:h-[640px] md:max-h-[85vh] bg-white md:rounded-2xl md:shadow-2xl md:border md:border-slate-200 flex flex-col overflow-hidden" role="dialog" aria-label="Agente do LeadSage" data-testid="agente-painel">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
            <MascoteLS size={40} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-slate-900 leading-tight">Agente LeadSage</h2>
              <p className="text-xs text-slate-500 truncate" data-testid="agente-cota">
                {cota.limite === null ? 'Sem limite de mensagens' : semCota ? `Cota de hoje esgotada · volta às ${horaDeVolta(cota.volta_em)}` : `${cota.restantes} de ${cota.limite} mensagens hoje`}
              </p>
            </div>
            <button type="button" onClick={limpar} aria-label="Limpar conversa" className="w-11 h-11 flex items-center justify-center text-slate-400"><Trash2 className="w-4 h-4" /></button>
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="w-11 h-11 -mr-2 flex items-center justify-center text-slate-500"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-white">
            {estado.mensagens.length === 0 && (
              <div className="text-center pt-6">
                <p className="text-slate-800 font-bold">O que você quer que eu faça?</p>
                <p className="text-sm text-slate-500 mt-1 mb-4">Eu busco os leads, escrevo as mensagens e deixo tudo pronto para você revisar. Nada é enviado sem você.</p>
                <div className="space-y-2">
                  {SUGESTOES.map(s => (
                    <button key={s} type="button" onClick={() => enviar(s)} disabled={semCota} className="w-full min-h-12 px-4 rounded-xl border border-slate-200 text-sm text-slate-700 text-left active:bg-slate-50 disabled:opacity-50">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {estado.mensagens.map(bolha)}

            {estado.pendente && (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3" data-testid="agente-confirmacao">
                <p className="text-sm font-bold text-slate-900">Buscar {estado.pendente.quantidade} leads de {estado.pendente.nicho} em {estado.pendente.local}</p>
                <p className="text-xs text-slate-600 mt-0.5">Custa até {estado.pendente.custo} créditos (1 por lead encontrado). Você tem {estado.pendente.saldo}.</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button type="button" onClick={() => confirmar(false)} disabled={enviando} className="min-h-12 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-bold">Cancelar</button>
                  <button type="button" onClick={() => confirmar(true)} disabled={enviando} className="min-h-12 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Confirmar</button>
                </div>
              </div>
            )}

            {estado.tarefa?.status === 'rodando' && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3" data-testid="agente-progresso">
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Escrevendo as mensagens... {estado.tarefa.feitos} de {estado.tarefa.total}</p>
                <div className="h-2 rounded-full bg-slate-200 mt-2 overflow-hidden"><div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.round((estado.tarefa.feitos / Math.max(1, estado.tarefa.total)) * 100)}%` }} /></div>
                <p className="text-xs text-slate-500 mt-2">Deixe o LeadSage aberto até terminar. Eu aviso aqui.</p>
              </div>
            )}

            {enviando && !estado.pendente && <div className="flex"><span className="bg-slate-100 rounded-2xl px-4 py-3 text-slate-500 text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> pensando...</span></div>}
            {erro && <p className="text-sm text-red-600 font-semibold">{erro}</p>}
            <div ref={fim} />
          </div>

          <form onSubmit={e => { e.preventDefault(); enviar(texto); }} className="px-3 py-3 border-t border-slate-200 flex items-end gap-2" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={1} maxLength={600} disabled={semCota}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(texto); } }}
              placeholder={semCota ? 'Cota de hoje esgotada' : 'Peça algo ao agente...'}
              className="flex-1 min-h-12 max-h-32 px-4 py-3 rounded-2xl bg-slate-100 text-base md:text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60" />
            <button type="submit" disabled={!texto.trim() || enviando || semCota} aria-label="Enviar" className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:bg-slate-300 shrink-0"><Send className="w-5 h-5" /></button>
          </form>
        </div>
      )}
    </>
  );
};
