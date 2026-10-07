/**
 * Fila de envio: o robô escreve a abordagem de cada lead e entrega no canal certo.
 *
 * E-mail sai sozinho (limite diário, rodapé para sair da lista). WhatsApp,
 * Instagram e LinkedIn ficam na fila com a mensagem pronta e o link que abre
 * a conversa: a pessoa só aperta enviar. Nenhuma dessas três plataformas
 * deixa um robô abrir conversa fria de graça e sem risco para a conta.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, Mail, Send, Check, Copy, ExternalLink, SkipForward, Loader2, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { WhatsAppIcon, InstagramIcon, LinkedInIcon } from './BrandIcons';
import { ehSalvo } from '../lib/leadsSalvos';
import type { CanalFila, ItemFila, LeadItem, ResultadoPreparo, ResumoFila } from '../types';

const SEM_CONTATO_AINDA = new Set(['', 'Novo Lead', 'Novos', 'Novo']);
const LOTE = 8;
const MAXIMO_POR_RODADA = 40;
const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;

const NOME_CANAL: Record<CanalFila, string> = {
  email: 'E-mail', whatsapp: 'WhatsApp', instagram_direct: 'Instagram', linkedin_msg: 'LinkedIn',
};

const IconeCanal: React.FC<{ canal: CanalFila; className?: string }> = ({ canal, className = 'w-4 h-4' }) => {
  if (canal === 'whatsapp') return <WhatsAppIcon className={`${className} text-emerald-600`} />;
  if (canal === 'instagram_direct') return <InstagramIcon className={`${className} text-pink-600`} />;
  if (canal === 'linkedin_msg') return <LinkedInIcon className={`${className} text-sky-700`} />;
  return <Mail className={`${className} text-slate-600`} />;
};

/** O canal que a fila vai escolher para o lead: o mesmo critério do servidor. */
const canalDe = (l: LeadItem): CanalFila | null => {
  if (EMAIL_OK.test((l.email || '').trim())) return 'email';
  if ((l.phone || '').replace(/\D/g, '').length >= 10) return 'whatsapp';
  if (l.instagram || l.socials?.instagram) return 'instagram_direct';
  if (l.socials?.linkedin) return 'linkedin_msg';
  return null;
};

const COR_RESULTADO: Record<ResultadoPreparo['resultado'], string> = {
  enviado: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'na fila': 'bg-sky-50 text-sky-800 border-sky-200',
  aguardando: 'bg-amber-50 text-amber-800 border-amber-200',
  falhou: 'bg-red-50 text-red-700 border-red-200',
  ignorado: 'bg-slate-50 text-slate-600 border-slate-200',
};

export const FilaDeEnvio: React.FC = () => {
  const { leads, atualizarPipeline, leadsParaContato, setLeadsParaContato } = useApp() as any;
  const [itens, setItens] = useState<ItemFila[]>([]);
  const [resumo, setResumo] = useState<ResumoFila | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(leadsParaContato || []));
  const [preparando, setPreparando] = useState(false);
  const [progresso, setProgresso] = useState({ feitos: 0, total: 0 });
  const [resultados, setResultados] = useState<ResultadoPreparo[]>([]);
  const [copiado, setCopiado] = useState('');
  const [trabalhando, setTrabalhando] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await api.filaListar();
      setItens(Array.isArray(r?.itens) ? r.itens : []);
      setResumo(r?.resumo ?? null);
      setErro('');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar a fila.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  // a seleção que veio de Meus Leads vale para esta visita; ao sair, zera
  useEffect(() => () => setLeadsParaContato([]), [setLeadsParaContato]);

  const candidatos = useMemo(
    () => (leads as LeadItem[]).filter(l => ehSalvo(l) && SEM_CONTATO_AINDA.has(l.pipeline_stage || '') && canalDe(l)
      && !itens.some(i => i.lead_id === l.id && ['pendente', 'enviado', 'aguardando_limite'].includes(i.status))),
    [leads, itens],
  );

  const alternar = (id: string) => setMarcados(prev => {
    const novo = new Set(prev);
    if (novo.has(id)) novo.delete(id);
    else if (novo.size < MAXIMO_POR_RODADA) novo.add(id);
    return novo;
  });

  const preparar = async () => {
    const escolhidos = candidatos.filter(l => marcados.has(l.id));
    if (!escolhidos.length) return;
    setPreparando(true);
    setErro('');
    setResultados([]);
    setProgresso({ feitos: 0, total: escolhidos.length });
    try {
      await atualizarPipeline(); // o servidor só conhece os leads que o navegador já entregou
      for (let i = 0; i < escolhidos.length; i += LOTE) {
        const parte = escolhidos.slice(i, i + LOTE);
        const r = await api.filaPreparar(parte as unknown as Record<string, unknown>[]);
        setResultados(prev => [...prev, ...r.resultados]);
        setResumo(r.resumo);
        setProgresso({ feitos: Math.min(i + LOTE, escolhidos.length), total: escolhidos.length });
      }
      setMarcados(new Set());
      await atualizarPipeline();
    } catch (e: any) {
      setErro(e?.message || 'O preparo foi interrompido.');
    } finally {
      setPreparando(false);
      await carregar();
    }
  };

  const copiar = async (id: string, texto: string) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(id); setTimeout(() => setCopiado(''), 2000); } catch { /* o texto segue visível */ }
  };

  const abrir = async (item: ItemFila) => {
    // Instagram e LinkedIn não aceitam o texto no link: vai para a área de transferência.
    if (item.canal !== 'whatsapp') await copiar(item.id, item.texto);
    if (item.link) window.open(item.link, '_blank', 'noopener');
  };

  const marcarEnviado = async (id: string) => {
    setTrabalhando(id);
    try { await api.filaMarcarEnviado(id); await carregar(); await atualizarPipeline(); }
    catch (e: any) { setErro(e?.message || 'Não foi possível marcar como enviado.'); }
    finally { setTrabalhando(''); }
  };

  const pular = async (id: string) => {
    setTrabalhando(id);
    try { await api.filaPular(id); await carregar(); }
    catch (e: any) { setErro(e?.message || 'Não foi possível pular.'); }
    finally { setTrabalhando(''); }
  };

  const enviarAguardando = async () => {
    setTrabalhando('aguardando');
    try { await api.filaEnviarAguardando(); await carregar(); await atualizarPipeline(); }
    catch (e: any) { setErro(e?.message || 'Não foi possível enviar.'); }
    finally { setTrabalhando(''); }
  };

  const naFila = itens.filter(i => ['pendente', 'aguardando_limite', 'falhou'].includes(i.status));
  const enviados = itens.filter(i => i.status === 'enviado').slice(0, 8);
  const aguardando = naFila.filter(i => i.status === 'aguardando_limite' && i.canal === 'email');

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-5 pb-8">
      <div className="space-y-5 min-w-0">
        {erro && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}
          </div>
        )}

        {/* 1. preparar */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><Bot className="w-4 h-4 text-blue-600" /> 1. O robô prepara a abordagem</h2>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Escolha os leads. O robô escreve uma mensagem diferente para cada um e usa o melhor canal que o lead tem:
            e-mail sai sozinho; WhatsApp, Instagram e LinkedIn vão para a fila ao lado, com o link pronto.
          </p>

          {candidatos.length === 0 ? (
            <p className="text-sm text-slate-600 mt-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
              Nenhum lead novo com e-mail, telefone, Instagram ou LinkedIn. Faça uma busca ou veja a fila ao lado.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between mt-4 mb-2 text-xs text-slate-600">
                <span>{candidatos.length} lead(s) novos · {marcados.size} escolhido(s) (máx. {MAXIMO_POR_RODADA})</span>
                <button
                  onClick={() => setMarcados(new Set(candidatos.slice(0, MAXIMO_POR_RODADA).map(l => l.id)))}
                  className="font-semibold text-blue-700 hover:underline"
                >Escolher os primeiros {Math.min(MAXIMO_POR_RODADA, candidatos.length)}</button>
              </div>
              <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {candidatos.map(l => {
                  const canal = canalDe(l)!;
                  return (
                    <li key={l.id}>
                      <label className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={marcados.has(l.id)} onChange={() => alternar(l.id)} className="accent-blue-600" />
                        <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate">{l.company || l.name}</span>
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 shrink-0">
                          <IconeCanal canal={canal} className="w-3.5 h-3.5" /> {NOME_CANAL[canal]}
                          {canal === 'email' && <span className="text-emerald-700">· automático</span>}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={preparar}
                disabled={preparando || marcados.size === 0}
                className="mt-4 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2"
              >
                {preparando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {preparando ? `Preparando ${progresso.feitos}/${progresso.total}…` : `Preparar ${marcados.size || ''} lead(s)`}
              </button>
              <p className="text-[11px] text-slate-500 mt-2">E-mails enviados custam 2 créditos cada. Fila e WhatsApp/Instagram/LinkedIn não custam.</p>
            </>
          )}

          {resultados.length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {resultados.map((r, i) => (
                <li key={`${r.lead_id}${i}`} className={`text-xs border rounded-lg px-3 py-1.5 flex flex-wrap gap-x-2 ${COR_RESULTADO[r.resultado]}`}>
                  <b>{r.nome}</b><span>{r.resultado}{r.canal ? ` · ${NOME_CANAL[r.canal]}` : ''}</span>
                  {r.motivo && <span className="opacity-80">— {r.motivo}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* enviados */}
        {enviados.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="font-bold text-slate-800 text-sm mb-3">Enviados recentemente</h2>
            <ul className="space-y-1.5">
              {enviados.map(i => (
                <li key={i.id} className="text-xs text-slate-700 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /><b className="text-slate-900">{i.nome}</b>
                  <span>{NOME_CANAL[i.canal]} · {i.enviado_por === 'robô' ? 'enviado pelo robô' : 'enviado por você'}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* 2. fila */}
      <aside className="space-y-3 min-w-0">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800">2. Fila de envio</h2>
            <button onClick={carregar} title="Atualizar" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {resumo && (
            <p className="text-xs text-slate-600 mt-1">
              {resumo.pendentes} para enviar · {resumo.enviados} enviados · e-mails hoje: {resumo.email_hoje}/{resumo.limite_email_dia}
            </p>
          )}
          {aguardando.length > 0 && (
            <button
              onClick={enviarAguardando}
              disabled={trabalhando === 'aguardando' || (resumo?.email_restante ?? 1) <= 0}
              className="mt-3 w-full py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold disabled:opacity-50"
            >
              {trabalhando === 'aguardando' ? 'Enviando…' : `Enviar ${aguardando.length} e-mail(s) que estão esperando`}
            </button>
          )}
        </div>

        {naFila.length === 0 && !carregando && (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-2xl p-4">
            A fila está vazia. Escolha leads ao lado e o robô deixa as mensagens prontas aqui.
          </p>
        )}

        {naFila.map(item => (
          <article key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <IconeCanal canal={item.canal} />
              <b className="text-sm text-slate-900 truncate flex-1">{item.nome}</b>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{NOME_CANAL[item.canal]}</span>
            </div>
            {item.assunto && <p className="text-xs font-semibold text-slate-700 mb-1">Assunto: {item.assunto}</p>}
            <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 border border-slate-100 rounded-xl p-3 max-h-40 overflow-y-auto">{item.texto}</p>

            {item.status !== 'pendente' && item.motivo && (
              <p className={`text-xs mt-2 flex gap-1.5 ${item.status === 'falhou' ? 'text-red-700' : 'text-amber-800'}`}>
                {item.status === 'falhou' ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                {item.motivo}
              </p>
            )}

            {!!item.seguimentos?.length && (
              <details className="mt-2 text-xs text-slate-700">
                <summary className="cursor-pointer text-slate-600 hover:text-slate-900">Seguimentos sugeridos ({item.seguimentos.length})</summary>
                <ul className="mt-1.5 space-y-1.5">
                  {item.seguimentos.map((s, i) => <li key={i}><b>{s.quando}:</b> {s.texto}</li>)}
                </ul>
              </details>
            )}

            {item.canal !== 'email' && (
              <div className="flex flex-wrap gap-2 mt-3">
                {item.link && (
                  <button onClick={() => abrir(item)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir {NOME_CANAL[item.canal]}
                  </button>
                )}
                <button onClick={() => copiar(item.id, item.texto)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-400 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  {copiado === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiado === item.id ? 'Copiado' : 'Copiar'}
                </button>
                <button onClick={() => marcarEnviado(item.id)} disabled={trabalhando === item.id}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
                  <Check className="w-3.5 h-3.5" /> Enviei
                </button>
                <button onClick={() => pular(item.id)} disabled={trabalhando === item.id}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5">
                  <SkipForward className="w-3.5 h-3.5" /> Pular
                </button>
              </div>
            )}
            {item.canal === 'email' && item.status !== 'pendente' && (
              <button onClick={() => pular(item.id)} disabled={trabalhando === item.id}
                className="mt-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5">
                <SkipForward className="w-3.5 h-3.5" /> Pular
              </button>
            )}
            {item.canal === 'instagram_direct' && <p className="text-[11px] text-slate-500 mt-2">O Instagram não aceita o texto no link: ele é copiado, é só colar na conversa.</p>}
            {item.canal === 'linkedin_msg' && <p className="text-[11px] text-slate-500 mt-2">O texto é copiado ao abrir; cole na janela de mensagem.</p>}
          </article>
        ))}
      </aside>
    </div>
  );
};
