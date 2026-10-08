/**
 * Caixa de entrada: todas as conversas num lugar só, com filtro por canal.
 *
 * Mostra as conversas do robô (o lead respondeu) e as abordagens já enviadas que
 * ainda esperam resposta, no WhatsApp, Instagram, Messenger, Telegram, e-mail e LinkedIn.
 * Uma abordagem enviada é somente leitura: só dá para responder quando o lead responder.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Ban, ChevronLeft, Clock, MessageCircle, Power, RefreshCw, Search, Send,
} from 'lucide-react';
import { api } from '../services/api';
import { sondar } from '../lib/sondagem';
import { Balao, ICONE_CANAL, NOME_CANAL, quando } from './conversaUi';
import type { RoboCanal, RoboConversa, RoboConversaResumo } from '../types';

const CANAIS: RoboCanal[] = ['whatsapp', 'instagram', 'messenger', 'telegram', 'email', 'linkedin'];
// LinkedIn só aparece quando há conversa nele; os outros cinco sempre ficam à mão
const SEMPRE: RoboCanal[] = ['whatsapp', 'instagram', 'messenger', 'telegram', 'email'];

type Situacao = 'todas' | 'precisa' | 'robo' | 'aguardando' | 'pausadas' | 'sairam';

const SITUACOES: { id: Situacao; rotulo: string }[] = [
  { id: 'todas', rotulo: 'Todas' },
  { id: 'precisa', rotulo: 'Precisa de você' },
  { id: 'robo', rotulo: 'Robô respondendo' },
  { id: 'aguardando', rotulo: 'Aguardando resposta' },
  { id: 'pausadas', rotulo: 'Pausadas' },
  { id: 'sairam', rotulo: 'Pediram para sair' },
];

const casa = (c: RoboConversaResumo, s: Situacao) => {
  if (s === 'precisa') return c.precisa_humano;
  if (s === 'robo') return c.origem !== 'envio' && c.robo_ativo && !c.optout && !c.precisa_humano;
  if (s === 'aguardando') return c.aguardando === true;
  if (s === 'pausadas') return c.origem !== 'envio' && !c.robo_ativo && !c.optout && !c.precisa_humano;
  if (s === 'sairam') return c.optout;
  return true;
};

const campo =
  'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors';

export const CaixaDeEntrada: React.FC<{ onBloqueio: (m: string) => void; irConfigurar: () => void }> = ({
  onBloqueio, irConfigurar,
}) => {
  const [lista, setLista] = useState<RoboConversaResumo[] | null>(null);
  const [aberta, setAberta] = useState<RoboConversa | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [canal, setCanal] = useState<RoboCanal | 'todos'>('todos');
  const [situacao, setSituacao] = useState<Situacao>('todas');
  const [busca, setBusca] = useState('');
  const fim = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    try {
      setLista(await api.roboConversas());
    } catch (e: any) {
      if (/plano|dispon/i.test(e?.message || '')) onBloqueio(e.message);
      else setErro(e?.message || 'Não foi possível carregar as conversas.');
      setLista([]);
    }
  }, [onBloqueio]);

  // Sem push do servidor: a lista é consultada de tempos em tempos, só com a aba à vista.
  useEffect(() => {
    carregar();
    return sondar(carregar, 45000);
  }, [carregar]);

  useEffect(() => {
    if (!aberta || aberta.somente_leitura) return;
    return sondar(async () => {
      try { setAberta(await api.roboConversa(aberta.id)); } catch { /* segue com o que tem */ }
    }, 20000);
  }, [aberta?.id, aberta?.somente_leitura]);

  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth' }); }, [aberta?.mensagens.length]);

  const contagem = useMemo(() => {
    const por: Record<string, number> = {};
    (lista || []).forEach(c => { por[c.canal] = (por[c.canal] || 0) + 1; });
    return por;
  }, [lista]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (lista || []).filter(c =>
      (canal === 'todos' || c.canal === canal)
      && casa(c, situacao)
      && (!q || `${c.nome} ${c.contato}`.toLowerCase().includes(q)),
    );
  }, [lista, canal, situacao, busca]);

  const precisaDeVoce = (lista || []).filter(c => c.precisa_humano).length;

  const abrir = async (id: string) => {
    setErro('');
    try { setAberta(await api.roboConversa(id)); } catch (e: any) { setErro(e.message); }
  };

  const alternarRobo = async () => {
    if (!aberta) return;
    setErro('');
    try {
      setAberta(await api.roboLigar(aberta.id, !aberta.robo_ativo));
      carregar();
    } catch (e: any) { setErro(e.message); }
  };

  const responder = async () => {
    if (!aberta || !texto.trim()) return;
    setEnviando(true);
    setErro('');
    try {
      setAberta(await api.roboResponder(aberta.id, texto.trim()));
      setTexto('');
      carregar();
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  if (lista === null) {
    return <div className="text-slate-400 text-sm p-8 text-center">Carregando conversas…</div>;
  }

  if (!lista.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center">
        <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 mb-1">Nenhuma conversa ainda</h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto mb-5">
          As mensagens que você enviar pela Fila de envio e as respostas dos leads, no WhatsApp, Instagram,
          Messenger, Telegram ou e-mail, aparecem aqui. Quando um lead responder, o robô já atende.
        </p>
        <button onClick={irConfigurar} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">
          Conectar canais
        </button>
        {erro && <p className="text-sm text-red-600 mt-4">{erro}</p>}
      </div>
    );
  }

  const chips: (RoboCanal | 'todos')[] = ['todos', ...CANAIS.filter(c => SEMPRE.includes(c) || contagem[c])];

  return (
    <div className="flex-1 min-h-[560px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex">
      {/* lista com filtros */}
      <div className={`w-full md:w-96 border-r border-slate-100 flex-col ${aberta ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-3 pt-3 pb-2 border-b border-slate-100 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou número"
                aria-label="Buscar conversa"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>
            <button onClick={carregar} title="Atualizar" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1.5 flex-wrap" role="tablist" aria-label="Filtrar por canal">
            {chips.map(c => {
              const ativo = canal === c;
              const total = c === 'todos' ? lista.length : (contagem[c] || 0);
              const Icone = c === 'todos' ? null : ICONE_CANAL[c];
              return (
                <button
                  key={c} role="tab" aria-selected={ativo} onClick={() => setCanal(c)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    ativo ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  } ${!total && !ativo ? 'opacity-50' : ''}`}
                >
                  {Icone && <Icone className="w-3.5 h-3.5" />}
                  {c === 'todos' ? 'Todas' : NOME_CANAL[c]}
                  <span className={`px-1.5 rounded-full text-[10px] ${ativo ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>{total}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={situacao} onChange={e => setSituacao(e.target.value as Situacao)} aria-label="Filtrar por situação"
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
            >
              {SITUACOES.map(s => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
            </select>
            {precisaDeVoce > 0 && (
              <button onClick={() => { setSituacao('precisa'); setCanal('todos'); }}
                className="shrink-0 px-2.5 py-2 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200">
                {precisaDeVoce} precisa{precisaDeVoce > 1 ? 'm' : ''} de você
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!filtradas.length && (
            <p className="text-sm text-slate-400 text-center py-10 px-4">Nenhuma conversa com esses filtros.</p>
          )}
          {filtradas.map(c => {
            const Icone = ICONE_CANAL[c.canal] || MessageCircle;
            return (
              <button
                key={c.id}
                onClick={() => abrir(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 flex gap-3 ${
                  aberta?.id === c.id ? 'bg-blue-50/60' : ''
                }`}
              >
                <Icone className="w-8 h-8 shrink-0 mt-0.5 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-800 truncate">{c.nome || c.contato}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{quando(c.atualizado)}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {c.ultima?.de === 'robo' ? '🤖 ' : c.ultima?.de === 'voce' ? 'Você: ' : ''}
                    {c.ultima?.texto}
                  </p>
                  <div className="mt-1 flex gap-1.5 flex-wrap">
                    {c.aguardando && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> aguardando resposta
                      </span>
                    )}
                    {c.precisa_humano && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">precisa de você</span>
                    )}
                    {c.optout && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">saiu</span>
                    )}
                    {!c.aguardando && !c.optout && !c.precisa_humano && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        c.robo_ativo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {c.robo_ativo ? 'robô' : 'pausado'}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* conversa */}
      <div className={`flex-1 flex-col min-w-0 ${aberta ? 'flex' : 'hidden md:flex'}`}>
        {!aberta ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Escolha uma conversa
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
              <button onClick={() => setAberta(null)} className="md:hidden p-1 text-slate-400" aria-label="Voltar">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 truncate">{aberta.nome || aberta.contato}</p>
                <p className="text-xs text-slate-500">{NOME_CANAL[aberta.canal]} · {aberta.contato}</p>
              </div>
              {aberta.somente_leitura ? (
                <span className="text-xs font-bold text-sky-700 flex items-center gap-1">
                  <Clock className="w-4 h-4" /> aguardando resposta
                </span>
              ) : aberta.optout ? (
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Ban className="w-4 h-4" /> pediu para sair
                </span>
              ) : (
                <button
                  onClick={alternarRobo}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                    aberta.robo_ativo
                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {aberta.robo_ativo ? 'Robô respondendo' : 'Robô pausado'}
                </button>
              )}
            </div>

            {aberta.precisa_humano && aberta.motivo && (
              <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span><b>O robô parou:</b> {aberta.motivo}</span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-slate-50/50">
              {aberta.mensagens.map((m, i) => <Balao key={i} m={m} />)}
              <div ref={fim} />
            </div>

            {aberta.somente_leitura ? (
              <div className="p-4 border-t border-slate-100 text-sm text-slate-500 text-center">
                Esta mensagem já foi enviada. Quando {aberta.nome || 'a pessoa'} responder, a conversa continua aqui e o robô atende.
              </div>
            ) : (
              <div className="p-3 border-t border-slate-100">
                {erro && <p className="text-xs text-red-600 mb-2">{erro}</p>}
                <div className="flex gap-2">
                  <textarea
                    value={texto}
                    onChange={e => setTexto(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); responder(); }
                    }}
                    rows={1}
                    disabled={aberta.optout}
                    placeholder={aberta.optout ? 'Esta pessoa pediu para não receber mais mensagens' : 'Responder você mesmo (pausa o robô nesta conversa)'}
                    className={`${campo} resize-none`}
                  />
                  <button
                    onClick={responder}
                    disabled={enviando || !texto.trim() || aberta.optout}
                    className="px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white"
                    title="Enviar"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
