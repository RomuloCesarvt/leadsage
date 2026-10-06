/**
 * Robô de atendimento — caixa de entrada, disparo, simulador e conexão com a Meta.
 *
 * No WhatsApp o robô abre a conversa com um modelo aprovado (aba Disparo) e
 * depois conversa livremente. No Instagram e no Messenger ele só RESPONDE a
 * quem escreveu: a API da Meta não permite iniciar conversa com contato frio.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot, MessageCircle, Settings2, FlaskConical, Send, UserRound, AlertTriangle,
  Copy, Check, Power, RefreshCw, Ban, Lock, ExternalLink, ChevronLeft,
} from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { WhatsAppIcon, InstagramIcon, FacebookIcon } from '../BrandIcons';
import { ConexaoMeta } from '../ConexaoMeta';
import { DisparoWhatsApp } from '../DisparoWhatsApp';
import type {
  RoboCanal, RoboConfig, RoboConfigEntrada, RoboConversa, RoboConversaResumo, RoboMensagem,
} from '../../types';

type Aba = 'conversas' | 'disparo' | 'simulador' | 'configurar';

const ICONE_CANAL: Record<RoboCanal, React.FC<{ className?: string }>> = {
  whatsapp: WhatsAppIcon,
  instagram: InstagramIcon,
  messenger: FacebookIcon,
};

const NOME_CANAL: Record<RoboCanal, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
};

const quando = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  const hoje = new Date();
  return d.toDateString() === hoje.toDateString()
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const campo =
  'w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 ' +
  'placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors';
const rotulo = 'block text-sm font-bold text-slate-700 mb-1.5';

// ===================================================================

export const RoboScreen: React.FC = () => {
  // A volta do login do Facebook chega com ?meta=ok|escolher|erro na URL.
  const retornoMeta = useMemo(() => {
    const q = new URLSearchParams(window.location.search);
    const estado = q.get('meta');
    return estado ? { estado, msg: q.get('msg') || '' } : null;
  }, []);
  const [aba, setAba] = useState<Aba>(retornoMeta ? 'configurar' : 'conversas');
  const [bloqueado, setBloqueado] = useState('');

  useEffect(() => {
    // limpa a URL: recarregar a pagina nao deve repetir o aviso
    if (retornoMeta) window.history.replaceState({}, '', window.location.pathname);
  }, [retornoMeta]);
  const { setViewState } = useApp() as any;

  if (bloqueado) {
    return (
      <div className="flex-1 overflow-y-auto max-w-2xl mx-auto w-full">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center mt-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Robô de atendimento</h2>
          <p className="text-slate-500 mb-6">{bloqueado}</p>
          <button
            onClick={() => setViewState('subscription')}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
          >
            Ver planos
          </button>
        </div>
      </div>
    );
  }

  const Tab = ({ id, icon: Icon, label }: { id: Aba; icon: any; label: string }) => (
    <button
      onClick={() => setAba(id)}
      className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors ${
        aba === id ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 max-w-6xl mx-auto w-full">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Bot className="w-7 h-7 text-blue-600" /> Robô de atendimento
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            A IA abre a conversa no WhatsApp, responde no WhatsApp, Instagram e Messenger como SDR e move o lead no pipeline.
          </p>
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1">
          <Tab id="conversas" icon={MessageCircle} label="Conversas" />
          <Tab id="disparo" icon={Send} label="Disparo" />
          <Tab id="simulador" icon={FlaskConical} label="Simulador" />
          <Tab id="configurar" icon={Settings2} label="Configurar" />
        </div>
      </div>

      {aba === 'conversas' && <Conversas onBloqueio={setBloqueado} irConfigurar={() => setAba('configurar')} />}
      {aba === 'disparo' && <DisparoWhatsApp irConfigurar={() => setAba('configurar')} />}
      {aba === 'simulador' && <Simulador />}
      {aba === 'configurar' && retornoMeta && (
        <div className={`mb-4 p-3 rounded-xl text-sm border ${
          retornoMeta.estado === 'erro'
            ? 'bg-red-50 border-red-100 text-red-700'
            : 'bg-emerald-50 border-emerald-100 text-emerald-700'
        }`}>
          {retornoMeta.estado === 'ok' && 'Página conectada. Ligue o robô e mande uma mensagem para ela para testar.'}
          {retornoMeta.estado === 'escolher' && 'Login feito. Escolha abaixo qual página o robô vai atender.'}
          {retornoMeta.estado === 'erro' && (retornoMeta.msg || 'A conexão com o Facebook não foi concluída.')}
        </div>
      )}
      {aba === 'configurar' && <Configurar onBloqueio={setBloqueado} />}
    </div>
  );
};

// ================================================================ conversas

const Conversas: React.FC<{ onBloqueio: (m: string) => void; irConfigurar: () => void }> = ({
  onBloqueio, irConfigurar,
}) => {
  const [lista, setLista] = useState<RoboConversaResumo[] | null>(null);
  const [aberta, setAberta] = useState<RoboConversa | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
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

  // Sem push do servidor: a lista é consultada de tempos em tempos.
  useEffect(() => {
    carregar();
    const t = setInterval(carregar, 10000);
    return () => clearInterval(t);
  }, [carregar]);

  useEffect(() => {
    if (!aberta) return;
    const t = setInterval(async () => {
      try { setAberta(await api.roboConversa(aberta.id)); } catch { /* segue com o que tem */ }
    }, 6000);
    return () => clearInterval(t);
  }, [aberta?.id]);

  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth' }); }, [aberta?.mensagens.length]);

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
          Quando um lead responder à sua abordagem no WhatsApp, Instagram ou Messenger,
          a conversa aparece aqui — e o robô já responde.
        </p>
        <button onClick={irConfigurar} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm">
          Conectar canais
        </button>
        {erro && <p className="text-sm text-red-600 mt-4">{erro}</p>}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[520px] bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex">
      {/* lista */}
      <div className={`w-full md:w-80 border-r border-slate-100 flex-col ${aberta ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-700">{lista.length} conversa(s)</span>
          <button onClick={carregar} title="Atualizar" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {lista.map(c => {
            const Icone = ICONE_CANAL[c.canal] || MessageCircle;
            return (
              <button
                key={c.id}
                onClick={() => abrir(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 flex gap-3 ${
                  aberta?.id === c.id ? 'bg-blue-50/60' : ''
                }`}
              >
                <Icone className="w-8 h-8 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-800 truncate">{c.nome || c.contato}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{quando(c.atualizado)}</span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {c.ultima?.de === 'robo' ? '🤖 ' : c.ultima?.de === 'voce' ? 'Você: ' : ''}
                    {c.ultima?.texto}
                  </p>
                  <div className="mt-1 flex gap-1.5">
                    {c.precisa_humano && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">precisa de você</span>
                    )}
                    {c.optout && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">saiu</span>
                    )}
                    {!c.optout && !c.precisa_humano && (
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
              <button onClick={() => setAberta(null)} className="md:hidden p-1 text-slate-400">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 truncate">{aberta.nome || aberta.contato}</p>
                <p className="text-xs text-slate-500">{NOME_CANAL[aberta.canal]} · {aberta.contato}</p>
              </div>
              {aberta.optout ? (
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
          </>
        )}
      </div>
    </div>
  );
};

const Balao: React.FC<{ m: RoboMensagem }> = ({ m }) => {
  const meu = m.de !== 'contato';
  return (
    <div className={`flex ${meu ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
          m.de === 'contato'
            ? 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
            : m.de === 'robo'
              ? 'bg-blue-50 border border-blue-100 text-slate-800 rounded-br-md'
              : 'bg-blue-600 text-white rounded-br-md'
        }`}
      >
        {m.de === 'robo' && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 mb-0.5">
            <Bot className="w-3 h-3" /> robô
          </span>
        )}
        {m.de === 'voce' && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-100 mb-0.5">
            <UserRound className="w-3 h-3" /> você
          </span>
        )}
        {m.texto}
        {m.em && (
          <span className={`block text-[10px] mt-1 text-right ${m.de === 'voce' ? 'text-blue-100' : 'text-slate-400'}`}>
            {quando(m.em)}
          </span>
        )}
      </div>
    </div>
  );
};

// ================================================================ simulador

const Simulador: React.FC = () => {
  const [msgs, setMsgs] = useState<RoboMensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [pensando, setPensando] = useState(false);
  const [aviso, setAviso] = useState('');
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => { fim.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length, pensando]);

  const enviar = async () => {
    if (!texto.trim() || pensando) return;
    const historico: RoboMensagem[] = [...msgs, { de: 'contato', texto: texto.trim() }];
    setMsgs(historico);
    setTexto('');
    setAviso('');
    setPensando(true);
    try {
      const r = await api.roboTestar(historico);
      if (r.resposta) setMsgs([...historico, { de: 'robo', texto: r.resposta }]);
      if (r.optout) setAviso('O contato pediu para sair. Numa conversa real, o robô nunca mais falaria com ele.');
      else if (r.passar_para_humano) setAviso(`O robô passaria para você aqui: ${r.motivo || 'sem motivo informado'}.`);
    } catch (e: any) {
      setAviso(e?.message || 'Não foi possível testar agora.');
    } finally {
      setPensando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col min-h-[480px] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-700">Você é o lead. Escreva como ele escreveria.</span>
          {msgs.length > 0 && (
            <button onClick={() => { setMsgs([]); setAviso(''); }} className="text-xs font-bold text-slate-500 hover:text-slate-700">
              Recomeçar
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 bg-slate-50/50">
          {!msgs.length && (
            <p className="text-sm text-slate-400 text-center mt-16">
              Experimente: “Oi, vi sua mensagem. Quanto custa um site?”
            </p>
          )}
          {msgs.map((m, i) => <Balao key={i} m={m} />)}
          {pensando && <p className="text-xs text-slate-400 flex items-center gap-1"><Bot className="w-3.5 h-3.5" /> digitando…</p>}
          <div ref={fim} />
        </div>
        {aviso && (
          <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 text-sm text-amber-800 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {aviso}
          </div>
        )}
        <div className="p-3 border-t border-slate-100 flex gap-2">
          <input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && enviar()}
            placeholder="Mensagem do lead…"
            className={campo}
          />
          <button onClick={enviar} disabled={pensando || !texto.trim()}
            className="px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-sm text-slate-600 space-y-3 h-fit">
        <h3 className="font-bold text-slate-800">O que testar</h3>
        <p>• <b>Preço:</b> o robô não pode inventar. Sem preço nas instruções, ele diz que vai confirmar e chama você.</p>
        <p>• <b>“Você é um robô?”</b> Ele admite que é o assistente virtual.</p>
        <p>• <b>“Pare de mandar mensagem”</b>: encerra, e numa conversa real ele nunca mais escreve.</p>
        <p>• <b>Querer fechar</b>: ele passa para você.</p>
        <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
          Cada resposta do simulador consome 1 crédito, como uma resposta real. Nada é enviado a ninguém.
        </p>
      </div>
    </div>
  );
};

// ================================================================ configurar

const VAZIO: Partial<RoboConfigEntrada> = {};

const Configurar: React.FC<{ onBloqueio: (m: string) => void }> = ({ onBloqueio }) => {
  const [cfg, setCfg] = useState<RoboConfig | null>(null);
  const [form, setForm] = useState<Partial<RoboConfigEntrada>>(VAZIO);
  const [estado, setEstado] = useState<'idle' | 'salvando' | 'salvo' | 'erro'>('idle');
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState('');
  // Modo avancado: app proprio da Meta. Aberto so para quem ja usa.
  const [avancado, setAvancado] = useState(false);

  useEffect(() => {
    api.roboConfig()
      .then(c => {
        setCfg(c);
        setAvancado(c.modo === 'manual' && c.tem_app_secret);
        setForm({
          ativo: c.ativo, objetivo: (c.objetivo || 'agendar') as any, instrucoes: c.instrucoes,
          link_agenda: c.link_agenda, nome_assistente: c.nome_assistente,
          wa_phone_id: c.wa_phone_id, page_id: c.page_id, ig_id: c.ig_id,
        });
      })
      .catch((e: any) => {
        if (/plano|dispon/i.test(e?.message || '')) onBloqueio(e.message);
        else setErro(e?.message || 'Não foi possível carregar.');
      });
  }, [onBloqueio]);

  const mudar = (k: keyof RoboConfigEntrada, v: any) => {
    setForm(f => ({ ...f, [k]: v }));
    setEstado('idle');
  };

  const salvar = async () => {
    setEstado('salvando');
    setErro('');
    try {
      const salvo = await api.roboSalvarConfig(form);
      setCfg(salvo);
      // segredos digitados nao ficam no formulario depois de salvos
      setForm(f => ({ ...f, app_secret: '', wa_token: '', page_token: '' }));
      setEstado('salvo');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível salvar.');
      setEstado('erro');
    }
  };

  const copiar = async (rotuloCopia: string, valor: string) => {
    try { await navigator.clipboard.writeText(valor); setCopiado(rotuloCopia); setTimeout(() => setCopiado(''), 1800); }
    catch { /* sem permissao de area de transferencia */ }
  };

  const Segredo = ({ k, tem, label, dica }: { k: 'app_secret' | 'wa_token' | 'page_token'; tem: boolean; label: string; dica: string }) => (
    <div>
      <label className={rotulo}>
        {label} {tem && <span className="ml-1 text-xs font-bold text-emerald-600">✓ configurado</span>}
      </label>
      <input
        type="password"
        autoComplete="off"
        value={(form[k] as string) || ''}
        onChange={e => mudar(k, e.target.value)}
        placeholder={tem ? 'Deixe vazio para manter o atual' : dica}
        className={campo}
      />
    </div>
  );

  const prontos = useMemo(() => ({
    wa: !!cfg?.whatsapp_pronto, meta: !!cfg?.meta_pronto,
  }), [cfg]);

  if (!cfg) {
    return <div className="text-slate-400 text-sm p-8 text-center">{erro || 'Carregando…'}</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pb-8">
      <div className={`${avancado ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-5`}>

        <ConexaoMeta cfg={cfg} aoMudar={setCfg} />

        {/* comportamento */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-600" /> Como o robô conversa
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm font-bold text-slate-600">{form.ativo ? 'Ligado' : 'Desligado'}</span>
              <input type="checkbox" checked={!!form.ativo} onChange={e => mudar('ativo', e.target.checked)}
                className="w-10 h-5 accent-blue-600" />
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={rotulo}>Nome do assistente</label>
              <input value={form.nome_assistente || ''} onChange={e => mudar('nome_assistente', e.target.value)}
                placeholder="Ex.: Ana, assistente do Studio R" className={campo} />
            </div>
            <div>
              <label className={rotulo}>Objetivo da conversa</label>
              <select value={form.objetivo || 'agendar'} onChange={e => mudar('objetivo', e.target.value)} className={campo}>
                <option value="agendar">Marcar uma conversa</option>
                <option value="site">Mostrar o site que já fiz para ele</option>
                <option value="qualificar">Entender se tem interesse</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={rotulo}>Link para agendar (opcional)</label>
              <input value={form.link_agenda || ''} onChange={e => mudar('link_agenda', e.target.value)}
                placeholder="https://calendly.com/…" className={campo} />
            </div>
            <div className="md:col-span-2">
              <label className={rotulo}>Instruções</label>
              <textarea rows={5} value={form.instrucoes || ''} onChange={e => mudar('instrucoes', e.target.value)}
                placeholder={'O que o robô precisa saber. Ex.:\n- Site institucional a partir de R$ 1.200, entrega em 15 dias.\n- Atendo só a região de Botucatu.\n- Não ofereço desconto; isso é comigo.'}
                className={`${campo} resize-none`} />
              <p className="text-xs text-slate-500 mt-1.5">
                Preço e prazo só são ditos se estiverem aqui. Sem isso, o robô diz que vai confirmar e chama você.
              </p>
            </div>
          </div>
        </div>

        {/* conexao manual: app proprio da Meta */}
        <details open={avancado} onToggle={e => setAvancado((e.target as HTMLDetailsElement).open)}
          className="bg-white border border-slate-200 rounded-2xl shadow-sm group">
          <summary className="px-6 py-4 cursor-pointer text-sm font-bold text-slate-600 select-none">
            Modo avançado: usar meu próprio app da Meta
          </summary>
        <div className="px-6 pb-6 space-y-6">

          <Segredo k="app_secret" tem={cfg.tem_app_secret} label="Chave secreta do app (App Secret)"
            dica="Meta for Developers → seu app → Configurações → Básico" />

          <div className="border-t border-slate-100 pt-5">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
              <WhatsAppIcon className="w-5 h-5" /> WhatsApp
              {prontos.wa && <span className="text-xs font-bold text-emerald-600">conectado</span>}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={rotulo}>ID do número de telefone</label>
                <input value={form.wa_phone_id || ''} onChange={e => mudar('wa_phone_id', e.target.value)}
                  placeholder="Phone number ID" className={campo} />
              </div>
              <Segredo k="wa_token" tem={cfg.tem_wa_token} label="Token de acesso" dica="Token permanente do usuário do sistema" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
              <FacebookIcon className="w-5 h-5" /> <InstagramIcon className="w-5 h-5" /> Messenger e Instagram
              {prontos.meta && <span className="text-xs font-bold text-emerald-600">conectado</span>}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={rotulo}>ID da página do Facebook</label>
                <input value={form.page_id || ''} onChange={e => mudar('page_id', e.target.value)} className={campo} />
              </div>
              <div>
                <label className={rotulo}>ID da conta do Instagram</label>
                <input value={form.ig_id || ''} onChange={e => mudar('ig_id', e.target.value)}
                  placeholder="Instagram profissional ligado à página" className={campo} />
              </div>
              <div className="md:col-span-2">
                <Segredo k="page_token" tem={cfg.tem_page_token} label="Token da página" dica="Token de acesso da página (serve para os dois)" />
              </div>
            </div>
          </div>

        </div>
        </details>

        <div className="pt-2 flex justify-end items-center gap-4">
            {estado === 'salvo' && <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5"><Check className="w-4 h-4" /> Salvo</span>}
            {estado === 'erro' && <span className="text-sm font-semibold text-red-600">{erro}</span>}
            <button onClick={salvar} disabled={estado === 'salvando'}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl">
              {estado === 'salvando' ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
      </div>

      {/* passo a passo do modo manual */}
      <div className={`space-y-5 ${avancado ? '' : 'hidden'}`}>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-3">Cole isto na Meta</h3>
          {!cfg.webhook_url ? (
            <p className="text-sm text-slate-500">Salve a configuração uma vez para gerar seu endereço de webhook.</p>
          ) : (
            <div className="space-y-3">
              {[
                ['URL de callback', cfg.webhook_url],
                ['Token de verificação', cfg.verify_token],
              ].map(([nome, valor]) => (
                <div key={nome}>
                  <p className="text-xs font-bold text-slate-500 mb-1">{nome}</p>
                  <button onClick={() => copiar(nome, valor)}
                    className="w-full text-left px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 break-all flex items-start gap-2 hover:bg-slate-100">
                    <span className="flex-1">{valor}</span>
                    {copiado === nome ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                  </button>
                </div>
              ))}
              <p className="text-xs text-slate-500">
                Assine os campos <b>messages</b> (WhatsApp) e <b>messages</b> + <b>messaging_postbacks</b> (página e Instagram).
              </p>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-sm text-slate-600">
          <h3 className="font-bold text-slate-800 mb-3">Passo a passo</h3>
          <ol className="list-decimal pl-4 space-y-2">
            <li>Crie um app do tipo <b>Empresa</b> em developers.facebook.com.</li>
            <li>Adicione os produtos <b>WhatsApp</b> e/ou <b>Messenger</b> e <b>Instagram</b>.</li>
            <li>Copie a <b>App Secret</b>, os IDs e os tokens para esta tela e salve.</li>
            <li>Em <b>Webhooks</b>, cole a URL e o token ao lado e assine as mensagens.</li>
            <li>Ligue o robô e teste mandando uma mensagem do seu celular.</li>
          </ol>
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener"
            className="mt-4 inline-flex items-center gap-1.5 text-blue-600 font-bold hover:underline">
            Abrir Meta for Developers <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
            O robô só responde a quem escreveu. O primeiro contato com o lead continua sendo seu,
            pela IA de Abordagem — é regra da Meta para Instagram e Messenger, e no WhatsApp
            mandar para quem não pediu leva ao bloqueio do número.
          </p>
        </div>
      </div>
    </div>
  );
};
