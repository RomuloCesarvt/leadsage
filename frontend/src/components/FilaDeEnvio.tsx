/**
 * Disparos: escolher leads, REVISAR cada mensagem e só então enviar.
 *
 * 1. Escolher: o usuário marca os leads e o robô escreve uma mensagem diferente para cada um.
 *    Nada sai nessa hora: as mensagens aparecem como rascunho.
 * 2. Revisar: cada mensagem pode ser lida, editada, marcada ou desmarcada.
 * 3. Enviar: só o que está marcado sai. WhatsApp vai para a fila do Conector (com intervalo e limite
 *    diário do número), e-mail sai agora dentro do limite, e Instagram/LinkedIn ficam prontos para abrir.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, Bot, Check, ChevronDown, ChevronUp, Clock, Copy, ExternalLink, Loader2, Mail, Pencil,
  RefreshCw, Send, SkipForward, Trash2, Wifi, WifiOff, X,
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { WhatsAppIcon, InstagramIcon, LinkedInIcon } from './BrandIcons';
import { ehSalvo } from '../lib/leadsSalvos';
import { sondar } from '../lib/sondagem';
import { montarPreviaDoLead } from './SiteBuilder';
import { buscarFotos } from './BancoImagens';
import type { CanalFila, EstadoFilaWhats, ItemFila, LeadItem, ResultadoPreparo, ResumoFila } from '../types';

const SEM_CONTATO_AINDA = new Set(['', 'Novo Lead', 'Novos', 'Novo']);
const LOTE = 4; // a IA escreve a abertura e os seguimentos de cada lead: lotes menores cabem nos 60 s do servidor
const MAXIMO_POR_RODADA = 15;
const EMAIL_OK = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;
const EM_ANDAMENTO = ['rascunho', 'pendente', 'enviando', 'aguardando_limite', 'falhou'];

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
/** O telefone sem pais nem formatação (DDD + 8 últimos dígitos): o mesmo número escrito de jeitos diferentes cai na mesma chave. */
const chaveDoFone = (f?: string | null): string => {
  const d = (f || '').replace(/\D/g, '');
  if (d.length < 10) return '';
  return (d.length >= 11 ? d.slice(-11, -9) : d.slice(-10, -8)) + d.slice(-8);
};

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
  'para revisar': 'bg-blue-50 text-blue-800 border-blue-200',
};

const ESTADO: Record<string, { rotulo: string; cor: string }> = {
  rascunho: { rotulo: 'Para revisar', cor: 'bg-blue-50 text-blue-700' },
  pendente: { rotulo: 'Na fila', cor: 'bg-sky-50 text-sky-700' },
  enviando: { rotulo: 'Enviando', cor: 'bg-sky-100 text-sky-800' },
  aguardando_limite: { rotulo: 'Esperando o limite', cor: 'bg-amber-50 text-amber-800' },
  falhou: { rotulo: 'Não saiu', cor: 'bg-red-50 text-red-700' },
};

type Aba = 'revisar' | 'fila' | 'problema';

export const FilaDeEnvio: React.FC = () => {
  const { leads, atualizarPipeline, leadsParaContato, setLeadsParaContato } = useApp() as any;
  const [itens, setItens] = useState<ItemFila[]>([]);
  const [resumo, setResumo] = useState<ResumoFila | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(leadsParaContato || []));
  const [escolherAberto, setEscolherAberto] = useState(true);
  const [preparando, setPreparando] = useState(false);
  const [progresso, setProgresso] = useState({ feitos: 0, total: 0 });
  const [resultados, setResultados] = useState<ResultadoPreparo[]>([]);
  const [copiado, setCopiado] = useState('');
  const [trabalhando, setTrabalhando] = useState('');
  const [whats, setWhats] = useState<EstadoFilaWhats | null>(null);
  const [aba, setAba] = useState<Aba>('revisar');
  // a revisão: quais rascunhos estão marcados para sair
  const [sel, setSel] = useState<Set<string>>(new Set());
  const vistos = useRef<Set<string>>(new Set());
  // edição em andamento: id -> { texto, assunto }
  const [edicao, setEdicao] = useState<Record<string, { texto: string; assunto: string }>>({});
  const [enviados, setEnviados] = useState(false);
  // criar a prévia do site de cada lead antes de gerar as mensagens (assim a mensagem pode dizer "montei" com verdade)
  const [criarPrevia, setCriarPrevia] = useState(true);
  const [cota, setCota] = useState<{ usados: number; cota: number | null; ilimitado: boolean } | null>(null);
  const [previas, setPrevias] = useState({ feitas: 0, total: 0 });
  const [avisoPrevias, setAvisoPrevias] = useState('');
  const vagasDeSite = cota ? (cota.ilimitado ? Infinity : Math.max(0, (cota.cota || 0) - cota.usados)) : 0;

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await api.filaListar();
      const lista = Array.isArray(r?.itens) ? r.itens : [];
      setItens(lista);
      setResumo(r?.resumo ?? null);
      // rascunhos novos já chegam marcados; o que a pessoa desmarcou continua desmarcado
      const novos = lista.filter(i => i.status === 'rascunho' && !vistos.current.has(i.id));
      if (novos.length) {
        novos.forEach(i => vistos.current.add(i.id));
        setSel(prev => { const n = new Set(prev); novos.forEach(i => n.add(i.id)); return n; });
      }
      setErro('');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar a fila.');
    } finally {
      setCarregando(false);
    }
  }, []);

  const carregarWhats = useCallback(async () => {
    try { setWhats(await api.conectorFila()); } catch { setWhats(null); }
  }, []);

  useEffect(() => { void carregar(); void carregarWhats(); }, [carregar, carregarWhats]);
  useEffect(() => { api.cotaDeSites().then(c => { setCota(c); if (!c.ilimitado && (c.cota || 0) - c.usados <= 0) setCriarPrevia(false); }).catch(() => {}); }, []);
  // a fila anda sozinha (o Conector envia): a tela acompanha, com a aba à vista
  useEffect(() => sondar(() => { void carregar(); void carregarWhats(); }, 15000), [carregar, carregarWhats]);
  useEffect(() => () => setLeadsParaContato([]), [setLeadsParaContato]);

  const rascunhos = useMemo(() => itens.filter(i => i.status === 'rascunho'), [itens]);
  const naFila = useMemo(() => itens.filter(i => ['pendente', 'enviando'].includes(i.status)), [itens]);
  const comProblema = useMemo(() => itens.filter(i => ['falhou', 'aguardando_limite'].includes(i.status)), [itens]);
  const recentes = useMemo(() => itens.filter(i => i.status === 'enviado').slice(0, 8), [itens]);
  const aguardandoEmail = comProblema.filter(i => i.status === 'aguardando_limite' && i.canal === 'email');

  // quando chegam rascunhos, a revisão é o foco; sem eles, volta para o que ainda tem
  useEffect(() => {
    if (rascunhos.length) setEscolherAberto(false);
  }, [rascunhos.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (aba === 'revisar' && !rascunhos.length) setAba(naFila.length ? 'fila' : comProblema.length ? 'problema' : 'revisar');
  }, [rascunhos.length, naFila.length, comProblema.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // quem já recebeu mensagem NÃO volta para a lista (nem com outro cadastro do mesmo número); só entra se a pessoa mandar de propósito (ficha do lead)
  const candidatos = useMemo(() => {
    const jaFalamos = new Set(itens.filter(i => ['enviado', 'enviando'].includes(i.status)).map(i => chaveDoFone(i.contato?.phone)).filter(Boolean));
    return (leads as LeadItem[]).filter(l => ehSalvo(l) && SEM_CONTATO_AINDA.has(l.pipeline_stage || '') && canalDe(l)
      && !itens.some(i => i.lead_id === l.id && EM_ANDAMENTO.concat('enviado').includes(i.status) && i.status !== 'falhou')
      && !(chaveDoFone(l.phone) && jaFalamos.has(chaveDoFone(l.phone))));
  }, [leads, itens]);

  const alternarLead = (id: string) => setMarcados(prev => {
    const novo = new Set(prev);
    if (novo.has(id)) novo.delete(id);
    else if (novo.size < MAXIMO_POR_RODADA) novo.add(id);
    return novo;
  });

  /** A IA gratuita tem limite por minuto: em vez de falhar, espera o tempo que o servidor mandou e tenta de novo (até `maxSegundos`). */
  const esperarIA = async <T,>(fn: () => Promise<T>, rotulo: string, maxSegundos = 420): Promise<T> => {
    const inicio = Date.now();
    for (;;) {
      try { return await fn(); } catch (e: any) {
        const msg = String(e?.message || '');
        const porLimite = /fila da IA|alta demanda|limite gratuito|demorou demais|muita gente/i.test(msg);
        if (!porLimite || (Date.now() - inicio) / 1000 > maxSegundos) throw e;
        const n = Math.min(90, Math.max(8, Number(msg.match(/em (\d+) segundos/)?.[1] || 20)) + 2);
        for (let s = n; s > 0; s--) { setAvisoPrevias(`${rotulo}: a IA gratuita está no limite por minuto, tentando de novo em ${s}s…`); await new Promise(ok => setTimeout(ok, 1000)); }
        setAvisoPrevias('');
      }
    }
  };

  /** Prepara um pedaço dos leads. Erro do servidor (504, queda de rede, limite) não derruba a geração: os leads viram "tentar de novo". */
  const prepararSeguro = async (parte: LeadItem[]) => {
    try {
      return await api.filaPreparar(parte as unknown as Record<string, unknown>[], 'Consultivo', true);
    } catch (e: any) {
      const msg = String(e?.message || 'sem resposta do servidor');
      if (/402|403|401|plano|crédito|credito|autoriz/i.test(msg) && !/fila da IA|alta demanda/i.test(msg)) throw e;   // erro de verdade (plano, login): aparece
      return {
        resultados: parte.map(l => ({ lead_id: l.id, nome: l.company || l.name || l.id, resultado: 'falhou' as const, espera_s: 20, motivo: `não foi possível escrever a mensagem: fila da IA (${msg.slice(0, 80)})` })),
        resumo: undefined as any,
      };
    }
  };

  const gerar = async () => {
    const escolhidos = candidatos.filter(l => marcados.has(l.id));
    if (!escolhidos.length) return;
    setPreparando(true);
    setErro('');
    setResultados([]);
    setProgresso({ feitos: 0, total: escolhidos.length });
    setAvisoPrevias('');
    try {
      await atualizarPipeline(); // o servidor só conhece os leads que o navegador já entregou
      // 0. a prévia do site de cada lead (se a pessoa quis): é o que torna verdadeira a frase "montei uma prévia"
      if (criarPrevia) {
        // todo disparo gera o site de novo com o motor atual: quem já tinha site o recebe refeito, no mesmo endereço e sem gastar vaga;
        // só quem ainda não tinha usa uma vaga nova
        const existentes = new Map<string, string>();
        for (const s of await api.getSites()) { if (s.lead_id && s.template !== 'Prévia rápida') existentes.set(s.lead_id, s.id); }
        const atual = await api.cotaDeSites();
        const vagas = atual.ilimitado ? Infinity : Math.max(0, (atual.cota || 0) - atual.usados);
        const faltam = escolhidos.filter(l => !existentes.has(l.id));
        const refazer = escolhidos.filter(l => existentes.has(l.id));
        const novas = faltam.slice(0, vagas);
        const criar = [...refazer, ...novas];
        setPrevias({ feitas: 0, total: criar.length });
        let feitas = 0; let falhas = 0; let reprovados = 0; let proximo = 0;
        // as fotos do ramo (banco de imagens), uma busca por ramo: o site sai com imagens de verdade, não com gradiente
        const fotosPorRamo = new Map<string, string[]>();
        for (const ramo of new Set(criar.map(l => (l.niche || l.role || '').trim()))) {
          const r = await buscarFotos(ramo);
          fotosPorRamo.set(ramo, r.imagens.map(f => f.url));
        }
        const trabalhador = async () => {
          while (proximo < criar.length) {
            const lead = criar[proximo++];
            try {
              const fotos = (fotosPorRamo.get((lead.niche || lead.role || '').trim()) || []);
              // cada lead começa em um ponto diferente da lista: dois negócios do mesmo ramo não ficam com as mesmas fotos
              const giro = fotos.length ? (proximo * 2) % fotos.length : 0;
              // o texto do site é escrito pela IA para ESTE negócio (nota, avaliação, descrição e horário reais); se ela não responder, vale o do ramo
              const copia = await esperarIA(
                () => api.generateSiteCopy({ lead, empresa: lead.company || lead.name, categoria: lead.niche || lead.role, cidade: lead.city }),
                `Site de ${lead.company || lead.name}`,
              ).catch(() => null);
              const { id, company, name, niche, role, address, location, rating, rating_count, opening_hours, google_description, review_highlight, instagram, email } = lead as any;
              await api.publishSite({
                ...montarPreviaDoLead({ ...lead, copia_ia: copia || undefined }, [...fotos.slice(giro), ...fotos.slice(0, giro)]),
                site_id: existentes.get(lead.id),
                avaliacao: { lead: { id, company, name, niche, role, address, location, rating, rating_count, opening_hours, google_description, review_highlight, instagram, email }, copia_ia: Boolean(copia) },
              });
            } catch (e: any) { falhas++; if (/avalia/i.test(String(e?.message))) reprovados++; }
            feitas++; setPrevias({ feitas, total: criar.length });
          }
        };
        await Promise.all([trabalhador(), trabalhador(), trabalhador()]);
        const semVaga = faltam.length - novas.length;
        if (falhas || semVaga) {
          setAvisoPrevias(`${criar.length - falhas} site(s) gerado(s) agora.${semVaga ? ` ${semVaga} lead(s) ficaram sem prévia por falta de vagas de site no seu plano` : ''}${falhas ? ` ${falhas} falharam${reprovados ? ` (${reprovados} não passaram na avaliação de qualidade: o site sairia genérico ou com assunto de outro ramo)` : ''}` : ''}: para eles a mensagem oferece montar a prévia, em vez de dizer que já está pronta.`);
        }
      }
      // dois lotes por vez: metade do tempo de espera, sem passar do que a IA gratuita aguenta por minuto
      const partes: typeof escolhidos[] = [];
      for (let i = 0; i < escolhidos.length; i += LOTE) partes.push(escolhidos.slice(i, i + LOTE));
      let feitosLote = 0; let proxima = 0;
      const lote = async () => {
        while (proxima < partes.length) {
          const parte = partes[proxima++];
          const r = await prepararSeguro(parte as LeadItem[]);
          setResultados(prev => [...prev, ...r.resultados]);
          if (r.resumo) setResumo(r.resumo);
          feitosLote += parte.length;
          setProgresso({ feitos: Math.min(feitosLote, escolhidos.length), total: escolhidos.length });
        }
      };
      await Promise.all([lote(), lote()]);
      // quem falhou por limite da IA gratuita (muita gente gerando ao mesmo tempo) NÃO fica com erro: espera o tempo que o servidor mandou
      // e tenta de novo, até acabar (no máximo 10 minutos)
      const porLimite = (m?: string) => /alta demanda|limite gratuito|demorou demais|fila da IA|muita gente/i.test(m || '');
      const comecou = Date.now();
      for (;;) {
        const pendentes = new Map<string, number>();
        setResultados(prev => { prev.filter(x => x.resultado === 'falhou' && porLimite(x.motivo)).forEach(x => pendentes.set(x.lead_id, x.espera_s || 20)); return prev; });
        if (!pendentes.size || Date.now() - comecou > 600000) break;
        const espera = Math.min(75, Math.max(12, ...pendentes.values()) + 2);
        for (let seg = espera; seg > 0; seg--) {
          setAvisoPrevias(`A IA gratuita está no limite por minuto. ${pendentes.size} mensagem(ns) na fila: tentando de novo em ${seg}s…`);
          await new Promise(ok => setTimeout(ok, 1000));
        }
        const de_novo = escolhidos.filter(l => pendentes.has(l.id));
        for (let i = 0; i < de_novo.length; i += 2) {
          const r = await prepararSeguro(de_novo.slice(i, i + 2) as LeadItem[]);
          const ids = new Set(r.resultados.map(x => x.lead_id));
          setResultados(prev => [...prev.filter(x => !(ids.has(x.lead_id) && x.resultado === 'falhou')), ...r.resultados]);
          if (r.resumo) setResumo(r.resumo);
        }
      }
      setAvisoPrevias('');
      setMarcados(new Set());
      setAba('revisar');
      await atualizarPipeline();
    } catch (e: any) {
      setErro(e?.message || 'A geração foi interrompida.');
    } finally {
      setPreparando(false);
      await carregar();
    }
  };

  // ------------------------------------------------------------ revisão
  const alternarSel = (id: string) => setSel(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const marcaveis = rascunhos.filter(i => !i.ja_contatado); // quem já recebeu mensagem só entra marcando um a um
  const todosMarcados = marcaveis.length > 0 && marcaveis.every(i => sel.has(i.id));
  const marcarTodos = () => setSel(todosMarcados ? new Set() : new Set(marcaveis.map(i => i.id)));
  const selecionados = rascunhos.filter(i => sel.has(i.id));
  const selWhats = selecionados.filter(i => i.canal === 'whatsapp').length;
  const selEmail = selecionados.filter(i => i.canal === 'email').length;
  const restanteHoje = whats ? Math.max(0, whats.limite_hoje - whats.enviadas_hoje) : null;

  const comecarEdicao = (i: ItemFila) => setEdicao(p => ({ ...p, [i.id]: { texto: i.texto, assunto: i.assunto || '' } }));
  const cancelarEdicao = (id: string) => setEdicao(p => { const n = { ...p }; delete n[id]; return n; });
  const salvarEdicao = async (i: ItemFila) => {
    const e = edicao[i.id];
    if (!e) return;
    setTrabalhando(i.id);
    try {
      const novo = await api.filaEditar(i.id, { texto: e.texto, assunto: i.canal === 'email' ? e.assunto : undefined });
      setItens(prev => prev.map(x => (x.id === i.id ? { ...x, ...novo } : x)));
      cancelarEdicao(i.id);
      setErro('');
    } catch (err: any) { setErro(err?.message || 'Não foi possível salvar a edição.'); }
    finally { setTrabalhando(''); }
  };

  const enviarSelecionados = async () => {
    if (!selecionados.length) return;
    const reenvios = selecionados.filter(i => i.ja_contatado);
    if (reenvios.length && !window.confirm(`${reenvios.length} contato(s) marcado(s) JÁ RECEBERAM mensagem antes (${reenvios.slice(0, 3).map(i => i.nome).join(', ')}${reenvios.length > 3 ? '…' : ''}). Quer enviar novamente mesmo assim?`)) return;
    const emails = selEmail ? ` ${selEmail} e-mail(s) saem agora (custam 2 créditos cada).` : '';
    if (!window.confirm(`Enviar ${selecionados.length} mensagem(ns)?${emails}${selWhats ? ` ${selWhats} de WhatsApp entram na fila e saem aos poucos: de 3 a 7 minutos entre uma e outra, de segunda a sábado, das 8h às 19h (Brasília), para proteger o número.` : ''}`)) return;
    setTrabalhando('aprovar');
    try {
      const r = await api.filaAprovar(selecionados.map(i => i.id), selecionados.some(i => i.ja_contatado));
      setResultados(r.resultados);
      setResumo(r.resumo);
      setSel(prev => { const n = new Set(prev); selecionados.forEach(i => n.delete(i.id)); return n; });
      await carregar(); await carregarWhats(); await atualizarPipeline();
      setAba(rascunhos.length > selecionados.length ? 'revisar' : 'fila');
    } catch (err: any) { setErro(err?.message || 'Não foi possível enviar.'); }
    finally { setTrabalhando(''); }
  };

  const descartarSelecionados = async () => {
    if (!selecionados.length) return;
    if (!window.confirm(`Descartar ${selecionados.length} mensagem(ns)? Elas não serão enviadas.`)) return;
    setTrabalhando('descartar');
    try {
      const r = await api.filaDescartar(selecionados.map(i => i.id));
      setResumo(r.resumo);
      setSel(prev => { const n = new Set(prev); selecionados.forEach(i => n.delete(i.id)); return n; });
      await carregar();
    } catch (err: any) { setErro(err?.message || 'Não foi possível descartar.'); }
    finally { setTrabalhando(''); }
  };

  const descartaveis = rascunhos.length + itens.filter(i => i.status === 'pendente').length + comProblema.length;
  const descartarTodos = async () => {
    if (!descartaveis) return;
    if (!window.confirm(`Descartar TODAS as ${descartaveis} mensagens da fila (para revisar, esperando para sair e com problema)? Elas não serão enviadas. O que já foi enviado não muda.`)) return;
    setTrabalhando('descartar');
    try {
      const r = await api.filaDescartarTodos();
      setResumo(r.resumo);
      setSel(new Set());
      await carregar();
    } catch (err: any) { setErro(err?.message || 'Não foi possível descartar a fila.'); }
    finally { setTrabalhando(''); }
  };

  // ------------------------------------------------------------ ações por item
  const copiar = async (id: string, texto: string) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(id); setTimeout(() => setCopiado(''), 2000); } catch { /* o texto segue visível */ }
  };
  const abrir = async (item: ItemFila) => {
    if (item.canal !== 'whatsapp') await copiar(item.id, item.texto); // Instagram e LinkedIn não aceitam o texto no link
    if (item.link) window.open(item.link, '_blank', 'noopener');
  };
  const acao = async (id: string, fn: () => Promise<unknown>, falha: string, depois?: () => Promise<unknown>) => {
    setTrabalhando(id);
    try { await fn(); await carregar(); if (depois) await depois(); }
    catch (e: any) { setErro(e?.message || falha); }
    finally { setTrabalhando(''); }
  };
  const marcarEnviado = (id: string) => acao(id, () => api.filaMarcarEnviado(id), 'Não foi possível marcar como enviado.', atualizarPipeline);
  const enviarAgora = (id: string) => acao(id, async () => setWhats(await api.filaEnviarAgora(id)), 'Não foi possível enviar agora.');
  const pular = (id: string) => acao(id, () => api.filaPular(id), 'Não foi possível remover.');
  const enviarAguardando = () => acao('aguardando', () => api.filaEnviarAguardando(), 'Não foi possível enviar.', atualizarPipeline);

  const lista = aba === 'revisar' ? rascunhos : aba === 'fila' ? naFila : comProblema;

  // ------------------------------------------------------------ cartão de uma mensagem
  const cartao = (item: ItemFila) => {
    const ed = edicao[item.id];
    const editavel = ['rascunho', 'pendente', 'falhou', 'aguardando_limite'].includes(item.status);
    const est = ESTADO[item.status] || { rotulo: item.status, cor: 'bg-slate-100 text-slate-600' };
    const rascunho = item.status === 'rascunho';
    return (
      <article className={`bg-white border rounded-2xl p-4 ${rascunho && sel.has(item.id) ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2.5 mb-2.5">
          {rascunho && (
            <input type="checkbox" checked={sel.has(item.id)} onChange={() => alternarSel(item.id)} aria-label={`Enviar para ${item.nome}`}
              className="w-5 h-5 accent-blue-600 shrink-0" />
          )}
          <IconeCanal canal={item.canal} />
          <b className="text-sm text-slate-900 truncate flex-1">{item.nome}</b>
          <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 shrink-0 ${est.cor}`}>{est.rotulo}</span>
        </div>
        <p className="text-[11px] font-semibold text-slate-500 mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{NOME_CANAL[item.canal]}{item.editado ? ' · editada por você' : ''}</span>
          {item.previa === 'criada' && (
            <span className="text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
              Prévia criada{item.previa_url ? <> · <a href={item.previa_url} target="_blank" rel="noreferrer" className="underline">ver</a></> : null}
            </span>
          )}
          {item.previa === 'oferecer' && <span className="text-amber-800 bg-amber-50 rounded-full px-2 py-0.5">Sem prévia: a mensagem oferece montar</span>}
        </p>
        {item.ja_contatado && (
          <div className="mb-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 leading-snug" role="alert">
            <b>Já enviamos mensagem para este contato</b>{item.ja_contatado.quando ? ` em ${new Date(item.ja_contatado.quando).toLocaleDateString('pt-BR')}` : ''}
            {item.ja_contatado.respondeu ? ', e ele(a) já respondeu: o robô está cuidando da conversa' : ''}. Quer enviar novamente? Marque a caixa ao lado para confirmar.
          </div>
        )}

        {ed ? (
          <div className="space-y-2">
            {item.canal === 'email' && (
              <input value={ed.assunto} onChange={e => setEdicao(p => ({ ...p, [item.id]: { ...ed, assunto: e.target.value } }))} placeholder="Assunto" aria-label="Assunto"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base md:text-sm focus:outline-none focus:border-blue-500" />
            )}
            <textarea value={ed.texto} onChange={e => setEdicao(p => ({ ...p, [item.id]: { ...ed, texto: e.target.value } }))} rows={Math.min(14, Math.max(5, ed.texto.split('\n').length + 2))} aria-label="Mensagem"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-base md:text-sm leading-relaxed focus:outline-none focus:border-blue-500 resize-y" />
            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={() => salvarEdicao(item)} disabled={trabalhando === item.id || !ed.texto.trim()}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Salvar
              </button>
              <button onClick={() => cancelarEdicao(item.id)} className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
              <span className="text-[11px] text-slate-400 ml-auto">{ed.texto.length} caracteres</span>
            </div>
          </div>
        ) : (
          <>
            {item.assunto && <p className="text-xs font-semibold text-slate-700 mb-1">Assunto: {item.assunto}</p>}
            <p className="text-[13px] md:text-[13px] text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 border border-slate-100 rounded-xl p-3 max-h-48 overflow-y-auto">{item.texto}</p>
            {editavel && (
              <button onClick={() => comecarEdicao(item)} className="mt-2 text-xs font-bold text-blue-700 hover:underline flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Editar mensagem
              </button>
            )}
          </>
        )}

        {item.status === 'enviando' && (
          <p className="text-xs mt-2 flex gap-1.5 text-sky-800"><Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" /> O WhatsApp conectado está enviando esta mensagem.</p>
        )}
        {item.status !== 'rascunho' && item.status !== 'pendente' && item.status !== 'enviando' && item.motivo && (
          <p className={`text-xs mt-2 flex gap-1.5 ${item.status === 'falhou' ? 'text-red-700' : 'text-amber-800'}`}>
            {item.status === 'falhou' ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
            {item.motivo}
          </p>
        )}

        {!!item.seguimentos?.length && !ed && (
          <details className="mt-2 text-xs text-slate-700">
            <summary className="cursor-pointer text-slate-600 hover:text-slate-900">Seguimentos sugeridos ({item.seguimentos.length})</summary>
            <ul className="mt-1.5 space-y-1.5">{item.seguimentos.map((s, i) => <li key={i}><b>{s.quando}:</b> {s.texto}</li>)}</ul>
          </details>
        )}

        {/* o que fazer com o que já está na fila ou deu problema */}
        {!rascunho && !ed && (
          <div className="flex flex-wrap gap-2 mt-3">
            {item.canal === 'whatsapp' && whats?.online && ['pendente', 'falhou'].includes(item.status) && (
              <button onClick={() => enviarAgora(item.id)} disabled={trabalhando === item.id}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
                <Send className="w-3.5 h-3.5" /> {item.status === 'falhou' ? 'Tentar de novo' : 'Enviar agora'}
              </button>
            )}
            {item.canal !== 'email' && item.link && (
              <button onClick={() => abrir(item)} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5" /> Abrir {NOME_CANAL[item.canal]}
              </button>
            )}
            {item.canal !== 'email' && (
              <button onClick={() => copiar(item.id, item.texto)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-400 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                {copiado === item.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />} {copiado === item.id ? 'Copiado' : 'Copiar'}
              </button>
            )}
            {item.canal !== 'email' && item.status === 'pendente' && !(item.canal === 'whatsapp' && whats?.online) && (
              <button onClick={() => marcarEnviado(item.id)} disabled={trabalhando === item.id}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60">
                <Check className="w-3.5 h-3.5" /> Enviei
              </button>
            )}
            <button onClick={() => pular(item.id)} disabled={trabalhando === item.id}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5">
              <SkipForward className="w-3.5 h-3.5" /> Remover da fila
            </button>
          </div>
        )}
        {item.canal === 'instagram_direct' && !rascunho && <p className="text-[11px] text-slate-500 mt-2">O Instagram não aceita o texto no link: ele é copiado, é só colar na conversa.</p>}
        {item.canal === 'linkedin_msg' && !rascunho && <p className="text-[11px] text-slate-500 mt-2">O texto é copiado ao abrir; cole na janela de mensagem.</p>}
      </article>
    );
  };

  const ABAS: { id: Aba; rotulo: string; n: number }[] = [
    { id: 'revisar', rotulo: 'Para revisar', n: rascunhos.length },
    { id: 'fila', rotulo: 'Na fila de envio', n: naFila.length },
    { id: 'problema', rotulo: 'Com problema', n: comProblema.length },
  ];

  return (
    <div className="w-full min-w-0 max-w-4xl mx-auto space-y-4 pb-24">
      {erro && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {erro}
        </div>
      )}

      {/* situação do WhatsApp */}
      {whats?.conectado && (
        <div className={`p-3 rounded-xl border text-xs leading-snug flex flex-wrap items-center gap-x-3 gap-y-1 ${whats.online ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          <b className="flex items-center gap-1.5">{whats.online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />} WhatsApp: {whats.online ? 'conectado' : 'desconectado'}</b>
          <span>Hoje: <b>{whats.enviadas_hoje}</b> de <b>{whats.limite_hoje}</b> abordagens (o limite sobe 5 por dia, até 60)</span>
          {whats.motivo && <span className="basis-full">{whats.motivo}</span>}
          {/falhas seguidas/i.test(whats.motivo || '') && (
            <button onClick={() => acao('retomar', async () => setWhats(await api.whatsRetomar()), 'Não foi possível retomar.')} disabled={!!trabalhando}
              className="mt-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-50 disabled:opacity-50">
              Já conferi o número: retomar os envios
            </button>
          )}
        </div>
      )}

      {/* 1. escolher */}
      <section className="bg-white border border-slate-200 rounded-2xl">
        <button onClick={() => setEscolherAberto(!escolherAberto)} className="w-full flex items-center gap-2 p-4 text-left">
          <Bot className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="flex-1">
            <span className="font-bold text-slate-800 block">1. Escolher leads</span>
            <span className="text-xs text-slate-500">O robô escreve uma mensagem para cada um. <b>Nada é enviado</b> antes de você revisar.</span>
          </span>
          {escolherAberto ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>

        {escolherAberto && (
          <div className="px-4 pb-4">
            {candidatos.length === 0 ? (
              <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-4">
                Nenhum lead novo com e-mail, telefone, Instagram ou LinkedIn. Faça uma busca e salve leads em Meus Leads.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2 text-xs text-slate-600">
                  <span>{candidatos.length} lead(s) novos · {marcados.size} escolhido(s) (máx. {MAXIMO_POR_RODADA})</span>
                  <span className="flex gap-3">
                    <button onClick={() => setMarcados(new Set(candidatos.slice(0, MAXIMO_POR_RODADA).map(l => l.id)))} className="font-semibold text-blue-700 hover:underline">Escolher os primeiros {Math.min(MAXIMO_POR_RODADA, candidatos.length)}</button>
                    {marcados.size > 0 && <button onClick={() => setMarcados(new Set())} className="font-semibold text-slate-500 hover:underline">Limpar</button>}
                  </span>
                </div>
                <ul className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                  {candidatos.map(l => {
                    const canal = canalDe(l)!;
                    return (
                      <li key={l.id}>
                        <label className="flex items-center gap-3 px-3 py-3 md:py-2.5 cursor-pointer hover:bg-slate-50">
                          <input type="checkbox" checked={marcados.has(l.id)} onChange={() => alternarLead(l.id)} className="w-5 h-5 md:w-4 md:h-4 accent-blue-600" />
                          <span className="flex-1 min-w-0 text-sm font-medium text-slate-800 truncate">{l.company || l.name}</span>
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 shrink-0"><IconeCanal canal={canal} className="w-3.5 h-3.5" /> {NOME_CANAL[canal]}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <label className="mt-4 flex items-start gap-3 p-3 rounded-xl border border-blue-100 bg-blue-50/50 cursor-pointer">
                  <input type="checkbox" checked={criarPrevia} onChange={e => setCriarPrevia(e.target.checked)} className="w-5 h-5 mt-0.5 accent-blue-600 shrink-0" />
                  <span className="text-sm">
                    <b className="text-slate-800">Gerar o site de cada lead agora, do zero</b>
                    <span className="block text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {criarPrevia
                        ? 'Cada lead recebe um site novo, feito agora com o nome, o ramo e as fotos dele. Quem já tinha site recebe o site refeito no mesmo endereço, sem gastar outra vaga; só quem não tinha usa 1 vaga.'
                        : 'A mensagem oferece montar a prévia, sem dizer que já existe. Se o lead aceitar, o robô passa a conversa para você criar.'}
                      {cota && !cota.ilimitado ? ` Você tem ${vagasDeSite} vaga(s) de site disponível(is).` : ''}
                    </span>
                  </span>
                </label>
                <button onClick={gerar} disabled={preparando || marcados.size === 0}
                  className="mt-4 w-full sm:w-auto px-5 py-3 md:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2">
                  {preparando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                  {preparando
                    ? (previas.total > 0 && previas.feitas < previas.total ? `Criando prévias ${previas.feitas}/${previas.total}…` : `Escrevendo ${progresso.feitos}/${progresso.total}…`)
                    : `Gerar ${marcados.size || ''} mensagem(ns) para revisar`}
                </button>
              </>
            )}
            {avisoPrevias && <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">{avisoPrevias}</p>}
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
          </div>
        )}
      </section>

      {/* 2. revisar e enviar */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-bold text-slate-800 flex-1">2. Revisar e enviar</h2>
          {descartaveis > 0 && (
            <button onClick={descartarTodos} disabled={!!trabalhando}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-red-300 hover:text-red-700 disabled:opacity-40 text-slate-600 text-xs font-bold flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Descartar todas ({descartaveis})
            </button>
          )}
          <button onClick={() => { void carregar(); void carregarWhats(); }} title="Atualizar" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
          {ABAS.map(a => (
            <button key={a.id} role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold border whitespace-nowrap ${aba === a.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
              {a.rotulo}{a.n ? ` (${a.n})` : ''}
            </button>
          ))}
        </div>

        {aba === 'revisar' && rascunhos.length > 0 && (
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input type="checkbox" checked={todosMarcados} onChange={marcarTodos} className="w-5 h-5 accent-blue-600" /> Marcar todas
            </label>
            <span className="text-xs text-slate-500 ml-auto">{selecionados.length} de {rascunhos.length} marcada(s)</span>
          </div>
        )}

        {lista.length === 0 && !carregando && (
          <p className="text-sm text-slate-600 bg-white border border-slate-200 rounded-2xl p-5 text-center">
            {aba === 'revisar' ? 'Nenhuma mensagem para revisar. Escolha leads acima e o robô escreve as mensagens.'
              : aba === 'fila' ? 'Nada esperando para sair.' : 'Nenhum problema. Tudo certo.'}
          </p>
        )}

        {aba === 'problema' && aguardandoEmail.length > 0 && (
          <button onClick={enviarAguardando} disabled={trabalhando === 'aguardando' || (resumo?.email_restante ?? 1) <= 0}
            className="w-full py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold disabled:opacity-50">
            {trabalhando === 'aguardando' ? 'Enviando…' : `Enviar ${aguardandoEmail.length} e-mail(s) que estão esperando`}
          </button>
        )}

        {lista.map(item => <React.Fragment key={item.id}>{cartao(item)}</React.Fragment>)}
      </section>

      {/* enviados */}
      {recentes.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-2xl">
          <button onClick={() => setEnviados(!enviados)} className="w-full flex items-center justify-between p-4 text-left">
            <span className="font-bold text-slate-800 text-sm">Enviados recentemente ({recentes.length})</span>
            {enviados ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </button>
          {enviados && (
            <ul className="px-4 pb-4 space-y-1.5">
              {recentes.map(i => (
                <li key={i.id} className="text-xs text-slate-700 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /><b className="text-slate-900">{i.nome}</b>
                  <span>{NOME_CANAL[i.canal]} · {i.enviado_por === 'robô' ? 'enviado pelo robô' : i.enviado_por === 'conector' ? 'enviado pelo WhatsApp conectado' : 'enviado por você'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* barra de ação: sempre à vista enquanto há mensagens marcadas */}
      {aba === 'revisar' && rascunhos.length > 0 && (
        <div className="fixed md:sticky bottom-0 inset-x-0 md:inset-x-auto z-30 bg-white/95 backdrop-blur border-t md:border border-slate-200 md:rounded-2xl shadow-[0_-6px_20px_-12px_rgba(15,23,42,.35)] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-2">
            <p className="text-xs text-slate-600 flex-1 min-w-[180px] leading-snug">
              <b className="text-slate-900">{selecionados.length}</b> marcada(s)
              {selWhats > 0 && restanteHoje !== null && <> · WhatsApp pode enviar mais {restanteHoje} hoje{selWhats > restanteHoje ? '; o resto sai nos próximos dias' : ''}</>}
              {selEmail > 0 && <> · {selEmail} e-mail(s) = {selEmail * 2} créditos</>}
            </p>
            <button onClick={descartarSelecionados} disabled={!selecionados.length || !!trabalhando}
              className="px-3.5 py-3 md:py-2.5 rounded-xl bg-white border border-slate-200 hover:border-red-300 hover:text-red-700 disabled:opacity-40 text-slate-600 text-sm font-bold flex items-center gap-1.5">
              <Trash2 className="w-4 h-4" /> Descartar
            </button>
            <button onClick={enviarSelecionados} disabled={!selecionados.length || !!trabalhando}
              className="px-5 py-3 md:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-bold flex items-center gap-2">
              {trabalhando === 'aprovar' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Enviar {selecionados.length || ''} marcada(s)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
