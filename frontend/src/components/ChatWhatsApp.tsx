/**
 * O chat do WhatsApp dentro do LeadSage, como no WhatsApp Web.
 *
 * Mostra todas as conversas do número conectado (as do robô e as suas), com as mensagens
 * de verdade, e deixa você responder. Os dados vêm do Conector, no computador do usuário:
 * nada disso é guardado na nuvem. O robô aparece como um selo nas conversas que ele atende
 * e pausa sozinho quando você assume uma conversa respondendo por aqui.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Check, CheckCheck, ChevronLeft, Clock, Power, RefreshCw, Search, Send, UserRound, Wifi } from 'lucide-react';
import { api } from '../services/api';
import { conectorLocal, versaoAntiga, type ChatWhats, type EstadoConector, type FonteLista, type MensagemWhats } from '../lib/conectorLocal';
import { sondar } from '../lib/sondagem';
import { WhatsAppIcon } from './BrandIcons';
import type { RoboConversaResumo } from '../types';

type Filtro = 'todas' | 'naoLidas' | 'robo' | 'grupos';

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'naoLidas', rotulo: 'Não lidas' },
  { id: 'robo', rotulo: 'Com o robô' },
  { id: 'grupos', rotulo: 'Grupos' },
];

/** A letra do nome, ou um ícone de pessoa quando o contato só tem número. */
const Avatar: React.FC<{ nome: string; className: string }> = ({ nome, className }) => {
  const letra = (nome || '').trim().match(/\p{L}/u)?.[0];
  return (
    <div className={`${className} rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center shrink-0`}>
      {letra ? letra.toUpperCase() : <UserRound className="w-1/2 h-1/2 text-slate-400" />}
    </div>
  );
};

const ultimos10 = (t: string) => (t || '').replace(/\D/g, '').slice(-10);

const hora = (s: number) => (s ? new Date(s * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');

const dataCurta = (s: number) => {
  if (!s) return '';
  const d = new Date(s * 1000);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return hora(s);
  const ontem = new Date(hoje.getTime() - 86400000);
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const dia = (s: number) => {
  const d = new Date(s * 1000);
  const hoje = new Date();
  if (d.toDateString() === hoje.toDateString()) return 'Hoje';
  const ontem = new Date(hoje.getTime() - 86400000);
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
};

const Tique: React.FC<{ status: number }> = ({ status }) => {
  if (status >= 3) return <CheckCheck className="w-3.5 h-3.5 text-sky-500" />;
  if (status === 2) return <CheckCheck className="w-3.5 h-3.5 text-slate-400" />;
  if (status === 1) return <Check className="w-3.5 h-3.5 text-slate-400" />;
  return <Clock className="w-3 h-3 text-slate-400" />;
};

export const ChatWhatsApp: React.FC<{ irConectar: () => void }> = ({ irConectar }) => {
  const [chats, setChats] = useState<ChatWhats[] | null>(null);
  const [offline, setOffline] = useState(false);
  const [fonte, setFonte] = useState<FonteLista>('');
  const [detalhe, setDetalhe] = useState('');
  const [estado, setEstado] = useState<EstadoConector | null>(null);
  const [robo, setRobo] = useState<RoboConversaResumo[]>([]);
  const [aberto, setAberto] = useState<ChatWhats | null>(null);
  const [mensagens, setMensagens] = useState<MensagemWhats[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const painel = useRef<HTMLDivElement>(null);
  const [limite, setLimite] = useState(60);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const alturaAntes = useRef(0);

  const carregarChats = useCallback(async () => {
    try {
      const l = await conectorLocal.chats(80);
      if (l === null) { setOffline(true); setEstado(await conectorLocal.estado().catch(() => null)); return; }
      setOffline(false);
      setChats(l.chats);
      setFonte(l.fonte);
    } catch (e: any) {
      // o Conector respondeu, mas não conseguiu ler as conversas
      setOffline(true);
      setEstado(await conectorLocal.estado().catch(() => null));
      setErro(e?.message || 'Não foi possível ler as conversas do WhatsApp.');
      conectorLocal.diagnostico().then(d => setDetalhe(d ? JSON.stringify(d.erros || d, null, 1) : '')).catch(() => {});
    }
  }, []);

  const carregarRobo = useCallback(async () => {
    try { setRobo(await api.roboConversas()); } catch { /* sem plano do robô: o chat funciona sem os selos */ }
  }, []);

  useEffect(() => {
    void carregarChats();
    void carregarRobo();
    const a = sondar(carregarChats, 6000);
    const b = sondar(carregarRobo, 30000);
    return () => { a(); b(); };
  }, [carregarChats, carregarRobo]);

  const carregarMensagens = useCallback(async (id: string, max: number) => {
    try {
      const m = await conectorLocal.mensagens(id, max);
      if (m) setMensagens(m);
    } catch (e: any) { setErro(e?.message || 'Não foi possível carregar a conversa.'); }
  }, []);

  useEffect(() => {
    if (!aberto) return;
    setMensagens([]);
    setErro('');
    setAviso('');
    setLimite(60);
    void carregarMensagens(aberto.id, 60);
    conectorLocal.lida(aberto.id).then(carregarChats).catch(() => {});
  }, [aberto?.id, carregarMensagens, carregarChats]);

  // atualiza a conversa aberta; o mesmo limite vale para as mensagens antigas já carregadas
  useEffect(() => {
    if (!aberto) return;
    return sondar(() => { void carregarMensagens(aberto.id, limite); }, 3000);
  }, [aberto?.id, limite, carregarMensagens]);

  // Rola SÓ a lista de mensagens (nunca a página): ao abrir, vai para o fim; com mensagem nova,
  // só desce se você já estava perto do fim, para não puxar quem está lendo o histórico.
  const ultimoId = useRef('');
  useEffect(() => { ultimoId.current = ''; }, [aberto?.id]);
  useEffect(() => {
    const el = painel.current;
    if (!el || !mensagens.length) return;
    const fimId = mensagens[mensagens.length - 1].id;
    if (alturaAntes.current) {
      // acabou de carregar mensagens mais antigas: mantém o que você estava vendo no mesmo lugar
      el.scrollTop = el.scrollHeight - alturaAntes.current;
      alturaAntes.current = 0;
    } else if (!ultimoId.current) {
      el.scrollTop = el.scrollHeight;
    } else if (fimId !== ultimoId.current && el.scrollHeight - el.scrollTop - el.clientHeight < 160) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
    ultimoId.current = fimId;
  }, [mensagens]);

  const carregarMaisAntigas = async () => {
    if (!aberto || carregandoMais) return;
    setCarregandoMais(true);
    alturaAntes.current = painel.current?.scrollHeight || 0;
    const novo = limite + 60;
    setLimite(novo);
    await carregarMensagens(aberto.id, novo);
    setCarregandoMais(false);
  };

  // a conversa do robô que corresponde a um chat (pelo telefone)
  const doRobo = useMemo(() => {
    const mapa = new Map<string, RoboConversaResumo>();
    robo.filter(c => c.canal === 'whatsapp' && c.origem !== 'envio').forEach(c => mapa.set(ultimos10(c.contato), c));
    return mapa;
  }, [robo]);
  const conversaDoRobo = (c: ChatWhats | null) => (c && c.telefone ? doRobo.get(ultimos10(c.telefone)) : undefined);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (chats || []).filter(c => {
      if (filtro === 'grupos' ? !c.grupo : c.grupo) return false;
      if (filtro === 'naoLidas' && !c.naoLidas) return false;
      if (filtro === 'robo' && !conversaDoRobo(c)) return false;
      return !q || `${c.nome} ${c.telefone}`.toLowerCase().includes(q);
    });
  }, [chats, filtro, busca, doRobo]);

  const naoLidasTotal = (chats || []).filter(c => !c.grupo).reduce((n, c) => n + (c.naoLidas ? 1 : 0), 0);

  const alternarRobo = async () => {
    const conv = conversaDoRobo(aberto);
    if (!conv) return;
    try {
      await api.roboLigar(conv.id, !conv.robo_ativo);
      await carregarRobo();
    } catch (e: any) { setErro(e?.message || 'Não foi possível mudar o robô.'); }
  };

  const enviar = async () => {
    if (!aberto || !texto.trim()) return;
    setEnviando(true);
    setErro('');
    const conv = conversaDoRobo(aberto);
    try {
      const m = await conectorLocal.enviar(aberto.id, texto.trim());
      if (m === null) throw new Error('O Conector não respondeu. Veja se ele está aberto no computador.');
      setTexto('');
      setMensagens(prev => [...prev, m]);
      void carregarChats();
      // quem responde por conta própria assume: o robô para de falar por cima
      if (conv && conv.robo_ativo) {
        await api.roboLigar(conv.id, false).catch(() => {});
        setAviso('Você assumiu esta conversa: o robô ficou pausado nela.');
        void carregarRobo();
      }
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar.');
    } finally {
      setEnviando(false);
    }
  };

  // ------------------------------------------------------------ sem conexão
  if (chats === null && offline) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center">
        <WhatsAppIcon className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        {estado?.fase === 'qr' && estado.qr ? (
          <>
            <h3 className="font-bold text-slate-800 mb-1">Escaneie para conectar</h3>
            <img src={estado.qr} alt="QR code do WhatsApp" className="w-56 h-56 mx-auto my-3" />
            <p className="text-slate-500 text-sm">WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b>.</p>
          </>
        ) : estado?.fase === 'pronto' && erro ? (
          <>
            <h3 className="font-bold text-slate-800 mb-1">O WhatsApp está conectado, mas não consegui ler as conversas</h3>
            <p className="text-sm text-red-600 mb-4 break-words">{erro}</p>
            {versaoAntiga(estado.versao) && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                O Conector aberto no seu computador é uma versão antiga ({estado.versao || 'antes da 2.2'}). Feche a janela preta e abra o arquivo “Conectar-WhatsApp” de novo: ele se atualiza sozinho e o chat passa a funcionar.
              </p>
            )}
            {detalhe && (
              <details className="text-left max-w-md mx-auto mb-4">
                <summary className="text-xs text-slate-400 cursor-pointer">Detalhe técnico</summary>
                <pre className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">{detalhe}</pre>
              </details>
            )}
            <button onClick={() => { setErro(''); void carregarChats(); }} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm">
              Tentar de novo
            </button>
            <p className="text-xs text-slate-400 mt-4 max-w-md mx-auto">
              Se continuar, feche a janela preta do Conector e abra o arquivo “Conectar-WhatsApp” de novo: ele se atualiza sozinho.
            </p>
          </>
        ) : estado ? (
          <>
            <h3 className="font-bold text-slate-800 mb-1">{estado.fase === 'pronto' ? 'Carregando suas conversas…' : 'Conectando o WhatsApp…'}</h3>
            <p className="text-slate-500 text-sm">{estado.mensagem}</p>
          </>
        ) : (
          <>
            <h3 className="font-bold text-slate-800 mb-1">Conecte o seu WhatsApp</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-5">
              Suas conversas aparecem aqui como no WhatsApp Web, e o robô atende as dos seus leads. É só baixar o arquivo de conexão e escanear o QR code.
            </p>
            <button onClick={irConectar} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm">
              Conectar o WhatsApp
            </button>
            <p className="text-xs text-slate-400 mt-4">Já conectou? Abra o programa “Conectar-WhatsApp” no computador e espere alguns segundos.</p>
          </>
        )}
        {erro && estado?.fase !== 'pronto' && <p className="text-xs text-red-600 mt-3">{erro}</p>}
      </div>
    );
  }

  if (chats === null) return <div className="text-slate-400 text-sm p-8 text-center">Carregando suas conversas…</div>;

  const conv = conversaDoRobo(aberto);

  const notaHistorico = fonte === 'historico';

  // ------------------------------------------------------------------ chat
  return (
    <div className="h-[calc(100dvh-230px)] min-h-[460px] max-h-[920px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex">
      {/* lista */}
      <div className={`w-full md:w-96 border-r border-slate-100 flex-col min-h-0 ${aberto ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-3 pt-3 pb-2 border-b border-slate-100 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar ou começar uma conversa" aria-label="Buscar conversa"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white" />
            </div>
            <button onClick={carregarChats} title="Atualizar" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100"><RefreshCw className="w-4 h-4" /></button>
          </div>
          {notaHistorico && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              Mostrando as conversas desde que o Conector foi ligado. A leitura completa do WhatsApp está indisponível agora.
            </p>
          )}
          <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="Filtrar conversas">
            {FILTROS.map(f => (
              <button key={f.id} role="tab" aria-selected={filtro === f.id} onClick={() => setFiltro(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  filtro === f.id ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {f.rotulo}{f.id === 'naoLidas' && naoLidasTotal ? ` (${naoLidasTotal})` : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {!filtrados.length && <p className="text-sm text-slate-400 text-center py-10 px-4">Nenhuma conversa aqui.</p>}
          {filtrados.map(c => {
            const r = conversaDoRobo(c);
            return (
              <button key={c.id} onClick={() => setAberto(c)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 flex gap-3 ${aberto?.id === c.id ? 'bg-emerald-50/60' : ''}`}>
                <Avatar nome={c.nome} className="w-10 h-10" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-800 truncate">{c.nome}</span>
                    <span className={`text-[11px] shrink-0 ${c.naoLidas ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>{dataCurta(c.quando)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500 truncate flex-1">{c.ultima?.minha ? 'Você: ' : ''}{c.ultima?.texto}</p>
                    {r && (
                      <span title={r.precisa_humano ? 'O robô precisa de você' : r.robo_ativo ? 'O robô atende' : 'Robô pausado'}
                        className={`shrink-0 ${r.precisa_humano ? 'text-amber-600' : r.robo_ativo ? 'text-blue-600' : 'text-slate-400'}`}>
                        <Bot className="w-4 h-4" />
                      </span>
                    )}
                    {c.naoLidas > 0 && (
                      <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center">{c.naoLidas}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* conversa */}
      <div className={`flex-1 flex-col min-w-0 min-h-0 ${aberto ? 'flex' : 'hidden md:flex'}`}>
        {!aberto ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-2 bg-[#f4f1ea]">
            <WhatsAppIcon className="w-12 h-12 text-slate-300" />
            Escolha uma conversa
            <span className="flex items-center gap-1 text-xs text-emerald-600"><Wifi className="w-3.5 h-3.5" /> Conectado{estado?.numero ? ` · ${estado.numero}` : ''}</span>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
              <button onClick={() => setAberto(null)} className="md:hidden p-1 text-slate-400" aria-label="Voltar"><ChevronLeft className="w-5 h-5" /></button>
              <Avatar nome={aberto.nome} className="w-9 h-9" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 truncate">{aberto.nome}</p>
                <p className="text-xs text-slate-500">{aberto.grupo ? 'Grupo' : aberto.telefone ? `+${aberto.telefone}` : ''}</p>
              </div>
              {conv && (
                <button onClick={alternarRobo}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                    conv.robo_ativo ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  <Power className="w-3.5 h-3.5" /> {conv.robo_ativo ? 'Robô respondendo' : 'Robô pausado'}
                </button>
              )}
            </div>

            {conv?.precisa_humano && conv.motivo && (
              <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 text-sm text-amber-800"><b>O robô parou:</b> {conv.motivo}</div>
            )}

            <div ref={painel} data-painel="mensagens" className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-4 py-3 space-y-1 bg-[#f4f1ea]">
              {mensagens.length >= limite && (
                <div className="flex justify-center pb-2">
                  <button onClick={carregarMaisAntigas} disabled={carregandoMais}
                    className="text-xs font-bold text-emerald-700 bg-white/90 hover:bg-white rounded-full px-4 py-1.5 shadow-sm disabled:opacity-60">
                    {carregandoMais ? 'Carregando…' : 'Ver mensagens anteriores'}
                  </button>
                </div>
              )}
              {mensagens.map((m, i) => {
                const nova = i === 0 || dia(m.quando) !== dia(mensagens[i - 1].quando);
                return (
                  <React.Fragment key={m.id || i}>
                    {nova && m.quando > 0 && (
                      <div className="flex justify-center py-2">
                        <span className="text-[11px] font-semibold text-slate-500 bg-white/80 rounded-full px-3 py-1 shadow-sm">{dia(m.quando)}</span>
                      </div>
                    )}
                    <div className={`flex ${m.minha ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] px-3 py-1.5 rounded-xl text-sm text-slate-800 whitespace-pre-wrap break-words shadow-sm ${
                        m.minha ? 'bg-[#d9fdd3] rounded-tr-sm' : 'bg-white rounded-tl-sm'} ${m.texto.startsWith('[') ? 'italic text-slate-500' : ''}`}>
                        {m.miniatura && <img src={m.miniatura} alt="" className="rounded-lg mb-1 max-h-60 max-w-full object-contain" />}
                        {m.miniatura && m.texto.startsWith('[') ? '' : m.texto}
                        <span className="float-right ml-3 mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                          {hora(m.quando)} {m.minha && <Tique status={m.status} />}
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-100 bg-white shrink-0">
              {aviso && <p className="text-xs text-amber-700 mb-2">{aviso}</p>}
              {erro && <p className="text-xs text-red-600 mb-2">{erro}</p>}
              <div className="flex gap-2">
                <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={1} aria-label="Mensagem"
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(); } }}
                  placeholder="Digite uma mensagem"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white resize-none" />
                <button onClick={enviar} disabled={enviando || !texto.trim()} title="Enviar"
                  className="px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
