/**
 * Robô de atendimento: só a configuração do robô, em três abas.
 *
 * - Canais: por onde ele conversa (WhatsApp pelo computador, Instagram e Messenger, Telegram);
 * - Comportamento: o que ele vende e como fala;
 * - Testar: simulador, sem enviar nada a ninguém.
 *
 * As conversas moram em "Conversas" e a Fila de envio tem tela própria: aqui só ficam
 * as coisas que se configuram uma vez.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot, Settings2, FlaskConical, Send, AlertTriangle, Plug,
  Copy, Check, Lock, ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import { WhatsAppIcon, InstagramIcon, FacebookIcon } from '../BrandIcons';
import { ConexaoMeta } from '../ConexaoMeta';
import { DisparoWhatsApp } from '../DisparoWhatsApp';
import { Balao } from '../conversaUi';
import { OfertaDoRobo } from '../OfertaDoRobo';
import type {
  RoboConfig, RoboConfigEntrada, RoboMensagem,
} from '../../types';

type Aba = 'canais' | 'comportamento' | 'testar';

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
  const [aba, setAba] = useState<Aba>('canais');
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
      className={`px-3 sm:px-4 py-2 rounded-xl text-[13px] sm:text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
        aba === id ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      <Icon className="w-4 h-4 hidden sm:block" /> {label}
    </button>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 max-w-4xl mx-auto w-full">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Bot className="w-7 h-7 text-blue-600" /> Robô de atendimento
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Quem responde seus leads como um vendedor. As conversas ficam em{' '}
            <button onClick={() => setViewState('conversas')} className="font-bold text-blue-600 hover:underline">Conversas</button>.
          </p>
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1 max-w-full overflow-x-auto">
          <Tab id="canais" icon={Plug} label="Canais" />
          <Tab id="comportamento" icon={Settings2} label="Comportamento" />
          <Tab id="testar" icon={FlaskConical} label="Testar" />
        </div>
      </div>

      {retornoMeta && aba === 'canais' && (
        <div className={`mb-4 p-3 rounded-xl text-sm border ${
          retornoMeta.estado === 'erro'
            ? 'bg-red-50 border-red-100 text-red-700'
            : 'bg-emerald-50 border-emerald-100 text-emerald-700'
        }`}>
          {retornoMeta.estado === 'ok' && 'Página conectada. Ligue o robô em Comportamento e mande uma mensagem para ela para testar.'}
          {retornoMeta.estado === 'escolher' && 'Login feito. Escolha abaixo qual página o robô vai atender.'}
          {retornoMeta.estado === 'erro' && (retornoMeta.msg || 'A conexão com o Facebook não foi concluída.')}
        </div>
      )}

      {aba === 'testar' ? <Simulador /> : <Configurar parte={aba} onBloqueio={setBloqueado} />}
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

const Configurar: React.FC<{ parte: 'canais' | 'comportamento'; onBloqueio: (m: string) => void }> = ({ parte, onBloqueio }) => {
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
          catalogo: c.catalogo, faq: c.faq, desconto_maximo: c.desconto_maximo || 0,
          oferta: c.oferta || {},
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

  const barraSalvar = (
    <div className="pt-2 flex justify-end items-center gap-4">
      {estado === 'salvo' && <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5"><Check className="w-4 h-4" /> Salvo</span>}
      {estado === 'erro' && <span className="text-sm font-semibold text-red-600">{erro}</span>}
      <button onClick={salvar} disabled={estado === 'salvando'}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl">
        {estado === 'salvando' ? 'Salvando…' : 'Salvar'}
      </button>
    </div>
  );

  // ---------------------------------------------------------------- comportamento
  if (parte === 'comportamento') {
    return (
      <div className="space-y-5 pb-8">
        {/* a chave geral: tudo o mais so vale com o robo ligado */}
        <div className={`rounded-2xl p-5 border flex items-center gap-4 ${form.ativo ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
          <div className="flex-1">
            <p className="font-bold text-slate-800">{form.ativo ? 'O robô está atendendo' : 'O robô está desligado'}</p>
            <p className="text-sm text-slate-500">
              {form.ativo
                ? 'Ele responde quem escrever nos canais conectados. Você pode pausá-lo numa conversa específica.'
                : 'Nada é respondido sozinho. Ligue quando terminar de configurar e testar.'}
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <span className="text-sm font-bold text-slate-600">{form.ativo ? 'Ligado' : 'Desligado'}</span>
            <input type="checkbox" checked={!!form.ativo} onChange={e => mudar('ativo', e.target.checked)} className="w-10 h-5 accent-blue-600" aria-label="Ligar o robô" />
          </label>
        </div>

        <OfertaDoRobo valor={form.oferta} onChange={o => mudar('oferta', o)} />

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-5">
            <Bot className="w-5 h-5 text-blue-600" /> Como ele conversa
          </h2>
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
                <option value="vender">Fechar a venda pela conversa</option>
              </select>
            </div>
            <div>
              <label className={rotulo}>Link para agendar (opcional)</label>
              <input value={form.link_agenda || ''} onChange={e => mudar('link_agenda', e.target.value)}
                placeholder="https://calendly.com/…" className={campo} />
            </div>
            <div>
              <label className={rotulo}>Desconto máximo (%)</label>
              <input type="number" min={0} max={50} value={form.desconto_maximo ?? 0}
                onChange={e => mudar('desconto_maximo', Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
                className={campo} />
              <p className="text-xs text-slate-500 mt-1.5">Só em troca de pagamento à vista ou de fechar na hora. 0 = nunca dá desconto.</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Regras e respostas prontas</h2>
          <p className="text-sm text-slate-500 mb-5">Preço e prazo ficam em "O que o robô vende". Aqui vai só o seu jeito de trabalhar.</p>
          <div className="space-y-5">
            <div>
              <label className={rotulo}>Perguntas frequentes (respostas oficiais)</label>
              <textarea rows={4} value={form.faq || ''} onChange={e => mudar('faq', e.target.value)}
                placeholder={'Uma por linha. Ex.:\nVocês atendem fora de Botucatu? Sim, online, em todo o Brasil.\nPrecisa de contrato? Sim, enviado digitalmente.'}
                className={`${campo} resize-none`} />
            </div>
            <div>
              <label className={rotulo}>Outras regras</label>
              <textarea rows={4} value={form.instrucoes || ''} onChange={e => mudar('instrucoes', e.target.value)}
                placeholder={'Ex.:\n- Atendo só a região de Botucatu.\n- Nunca prometo resultado de vendas.\n- Reunião só de terça a quinta.'}
                className={`${campo} resize-none`} />
            </div>
          </div>
        </div>

        {barraSalvar}
      </div>
    );
  }

  // ---------------------------------------------------------------------- canais
  return (
    <div className="space-y-5 pb-8">
      <ConexaoMeta cfg={cfg} aoMudar={setCfg} />

      {/* tudo que só importa para quem usa a API oficial da Meta fica aqui, fechado */}
      <details open={avancado} onToggle={e => setAvancado((e.target as HTMLDetailsElement).open)}
        className="bg-white border border-slate-200 rounded-2xl shadow-sm">
        <summary className="px-6 py-4 cursor-pointer text-sm font-bold text-slate-600 select-none">
          Avançado: WhatsApp oficial da Meta e app próprio
        </summary>
        <div className="px-6 pb-6 space-y-6">
          <p className="text-xs text-slate-500">
            Só use se você tem um número de WhatsApp Business na API oficial, ou um app da Meta seu. No dia a dia, o WhatsApp pelo computador (acima) basta.
          </p>

          <ConexaoMeta cfg={cfg} aoMudar={setCfg} parte="oficial" />

          <Segredo k="app_secret" tem={cfg.tem_app_secret} label="Chave secreta do app (App Secret)"
            dica="Meta for Developers → seu app → Configurações → Básico" />

          <div className="border-t border-slate-100 pt-5">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
              <WhatsAppIcon className="w-5 h-5" /> WhatsApp (API oficial)
              {prontos.wa && <span className="text-xs font-bold text-emerald-600">conectado</span>}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={rotulo}>ID do número de telefone</label>
                <input value={form.wa_phone_id || ''} onChange={e => mudar('wa_phone_id', e.target.value)} placeholder="Phone number ID" className={campo} />
              </div>
              <Segredo k="wa_token" tem={cfg.tem_wa_token} label="Token de acesso" dica="Token permanente do usuário do sistema" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
              <FacebookIcon className="w-5 h-5" /> <InstagramIcon className="w-5 h-5" /> Messenger e Instagram (app próprio)
              {prontos.meta && <span className="text-xs font-bold text-emerald-600">conectado</span>}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={rotulo}>ID da página do Facebook</label>
                <input value={form.page_id || ''} onChange={e => mudar('page_id', e.target.value)} className={campo} />
              </div>
              <div>
                <label className={rotulo}>ID da conta do Instagram</label>
                <input value={form.ig_id || ''} onChange={e => mudar('ig_id', e.target.value)} placeholder="Instagram profissional ligado à página" className={campo} />
              </div>
              <div className="md:col-span-2">
                <Segredo k="page_token" tem={cfg.tem_page_token} label="Token da página" dica="Token de acesso da página (serve para os dois)" />
              </div>
            </div>
          </div>

          {cfg.webhook_url && (
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <h3 className="font-bold text-slate-800">Cole isto na Meta</h3>
              {[['URL de callback', cfg.webhook_url], ['Token de verificação', cfg.verify_token]].map(([nome, valor]) => (
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
                Assine os campos <b>messages</b> (WhatsApp) e <b>messages</b> + <b>messaging_postbacks</b> (página e Instagram).{' '}
                <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-blue-600 font-bold hover:underline">
                  Abrir Meta for Developers <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          )}

          {barraSalvar}

          <div className="border-t border-slate-100 pt-5">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3"><Send className="w-4 h-4 text-blue-600" /> Disparo por modelo aprovado (API oficial)</h3>
            {avancado && <DisparoWhatsApp irConfigurar={() => { /* já está em Canais */ }} />}
          </div>
        </div>
      </details>
    </div>
  );
};
