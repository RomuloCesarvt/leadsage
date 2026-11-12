/**
 * Dossiê do lead, dentro do painel lateral (raio-x + empresa + pessoas +
 * dores + abordagem personalizada).
 *
 * Não roda sozinho: custa 1 crédito (uma consulta ao Google por lugar, mais
 * o site e a IA), então só gera quando a pessoa pede — e depois fica
 * guardado por 7 dias, reabrindo de graça.
 */
import React, { useEffect, useState } from 'react';
import {
  ScanSearch, Loader2, Check, X, HelpCircle, ExternalLink, RefreshCw, ShieldCheck, Quote,
  Building, Users, Flame, Compass, Copy, Send, ChevronDown, Globe, MapPin, Lightbulb,
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { InstagramIcon } from './BrandIcons';
import type { RaioX } from '../types';

const COR_VEREDITO: Record<string, string> = {
  agencia: 'bg-sky-50 text-sky-900 border-sky-200',
  dono: 'bg-amber-50 text-amber-900 border-amber-200',
  abandonado: 'bg-orange-50 text-orange-900 border-orange-200',
  ninguem: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  indefinido: 'bg-slate-50 text-slate-800 border-slate-200',
};

const PESO: Record<string, string> = {
  alto: 'bg-red-50 text-red-700 border-red-200',
  medio: 'bg-amber-50 text-amber-800 border-amber-200',
  baixo: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CANAL: Record<string, string> = {
  whatsapp: 'WhatsApp', email: 'e-mail', instagram_direct: 'Instagram', linkedin_msg: 'LinkedIn',
};

export const Secao: React.FC<{ icone: React.ReactNode; titulo: string; nota?: string; children: React.ReactNode }> = ({ icone, titulo, nota, children }) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">{icone}{titulo}</h3>
      {nota && <span className="text-[10px] text-slate-500">{nota}</span>}
    </div>
    {children}
  </section>
);

/** As cores do veredito de social media: o que pede ação vem em cor quente, o que já está bem em cor fria. */
const COR_SOCIAL: Record<string, { faixa: string; ponto: string }> = {
  precisa: { faixa: 'bg-rose-50 border-rose-200 text-rose-900', ponto: 'bg-rose-500' },
  irregular: { faixa: 'bg-amber-50 border-amber-200 text-amber-900', ponto: 'bg-amber-500' },
  ativo: { faixa: 'bg-emerald-50 border-emerald-200 text-emerald-900', ponto: 'bg-emerald-500' },
  agencia: { faixa: 'bg-sky-50 border-sky-200 text-sky-900', ponto: 'bg-sky-500' },
  sem_dados: { faixa: 'bg-slate-50 border-slate-200 text-slate-800', ponto: 'bg-slate-400' },
};

/** Bloco que abre e fecha: o título e um resumo de uma linha ficam sempre à vista, o detalhe só quando a pessoa quer. */
const Bloco: React.FC<{ icone: React.ReactNode; titulo: string; resumo?: React.ReactNode; aberto?: boolean; children: React.ReactNode }> = ({ icone, titulo, resumo, aberto = false, children }) => {
  const [on, setOn] = useState(aberto);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <button type="button" onClick={() => setOn(v => !v)} aria-expanded={on} className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left active:bg-slate-50">
        <span className="shrink-0">{icone}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-slate-900 leading-tight">{titulo}</span>
          {resumo && <span className="block text-[13px] text-slate-500 leading-snug mt-0.5">{resumo}</span>}
        </span>
        <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${on ? 'rotate-180' : ''}`} />
      </button>
      {on && <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-100">{children}</div>}
    </section>
  );
};

const Numero: React.FC<{ valor: string; rotulo: string; tom?: 'ruim' | 'bom' | 'neutro' }> = ({ valor, rotulo, tom = 'neutro' }) => (
  <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5">
    <p className={`text-lg font-black leading-tight ${tom === 'ruim' ? 'text-rose-600' : tom === 'bom' ? 'text-emerald-600' : 'text-slate-900'}`}>{valor}</p>
    <p className="text-xs text-slate-500 mt-0.5 leading-tight">{rotulo}</p>
  </div>
);

export const RaioXLead: React.FC<{ lead: any; onUsarAbertura?: (texto: string) => void }> = ({ lead, onUsarAbertura }) => {
  const { setViewState, setSelectedProfileLead } = useApp() as any;
  const [dados, setDados] = useState<RaioX | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  // Ao trocar de lead, some o dossiê do anterior.
  useEffect(() => { setDados(null); setErro(''); setCopiado(false); }, [lead?.id]);

  const gerar = async (refazer = false) => {
    setCarregando(true);
    setErro('');
    try {
      setDados(await api.raioX(lead.id, lead.website || '', lead.socials?.instagram || '', refazer, {
        id: lead.id, company: lead.company, name: lead.name, niche: lead.niche, city: lead.city,
        neighborhood: lead.neighborhood, rating: lead.rating, rating_count: lead.rating_count,
        best_channel: lead.best_channel, whatsapp: lead.whatsapp, phone: lead.phone, email: lead.email,
      }));
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível gerar o dossiê.');
    } finally {
      setCarregando(false);
    }
  };

  const copiar = async (texto: string) => {
    try { await navigator.clipboard.writeText(texto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sem permissão: o texto continua visível */ }
  };

  if (!dados) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <button
          onClick={() => gerar()}
          disabled={carregando}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        >
          {carregando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
          {carregando ? 'Montando o dossiê…' : 'Gerar dossiê completo'}
        </button>
        <ul className="text-[12px] text-slate-700 mt-3 grid gap-1">
          <li>• Quem é o dono ou responsável e dados da empresa na Receita</li>
          <li>• As dores comprovadas, cada uma com a evidência</li>
          <li>• A melhor abordagem para este negócio, com a mensagem pronta</li>
          <li>• Google Meu Negócio, site e Instagram a fundo</li>
        </ul>
        <p className="text-[11px] text-slate-500 mt-2">Custa 1 crédito e fica guardado por 7 dias.</p>
        {erro && <p className="text-xs text-red-700 mt-2">{erro}</p>}
      </div>
    );
  }

  const q = dados.quem_cuida;
  const g = dados.gmn;
  const s = dados.site;
  const ig = dados.instagram;
  const so = dados.social;
  const emp = dados.empresa || {};
  const pessoas = dados.pessoas || [];
  const dores = dados.dores || [];
  const ab = dados.abordagem || null;
  const temEmpresa = !!(emp.razao_social || emp.cnpj);
  const temGente = pessoas.length > 0 || !!emp.socios?.length;
  const m = so?.metricas || {};
  const corSocial = COR_SOCIAL[so?.status || 'sem_dados'];
  const taxa = m.taxa_engajamento;
  const faixaTaxa: 'ruim' | 'bom' | 'neutro' = taxa == null ? 'neutro' : taxa < 1 ? 'ruim' : taxa >= 3 ? 'bom' : 'neutro';
  const semSite = s.tipo !== 'own';
  const anuncios = [s.pixel_meta && 'Meta', s.tag_google_ads && 'Google Ads', s.tag_tiktok && 'TikTok'].filter(Boolean) as string[];
  const irConectar = () => { setSelectedProfileLead?.(null); setViewState?.('robo'); };
  const link = 'inline-flex items-center gap-1.5 min-h-11 text-[14px] text-emerald-700 font-semibold active:underline';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
          <ScanSearch className="w-4 h-4" /> Raio-X do lead
        </span>
        <button onClick={() => gerar(true)} disabled={carregando} title="Refazer (1 crédito)"
          className="min-h-11 px-2 -mr-2 text-[13px] text-slate-500 hover:text-slate-800 flex items-center gap-1.5">
          <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
          {dados.do_cache ? 'guardado' : 'agora'} · refazer
        </button>
      </div>

      {/* 1. EM RESUMO: o veredito em três olhadas, sem abrir nada */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3" data-testid="raiox-resumo">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Em resumo</p>
        <div className="grid grid-cols-1 gap-2.5">
          <div className={`rounded-xl border p-3 flex items-start gap-3 ${corSocial.faixa}`}>
            <span className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${corSocial.ponto}`} />
            <div className="min-w-0">
              <p className="text-[15px] font-black leading-tight">{so?.rotulo || 'Instagram não analisado'}</p>
              <p className="text-[13px] leading-snug mt-0.5 opacity-90">{so?.resumo || ig.motivo}</p>
            </div>
          </div>
          <div className={`rounded-xl border p-3 flex items-start gap-3 ${COR_VEREDITO[q.veredito] || COR_VEREDITO.indefinido}`}>
            <ShieldCheck className="w-4 h-4 mt-1 shrink-0" />
            <div className="min-w-0">
              <p className="text-[15px] font-black leading-tight">{q.rotulo} <span className="text-xs font-semibold opacity-70">· confiança {q.confianca}</span></p>
              <p className="text-[13px] leading-snug mt-0.5 opacity-90">{q.abordagem}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Numero valor={m.seguidores != null ? Number(m.seguidores).toLocaleString('pt-BR') : '—'} rotulo="seguidores" />
          <Numero valor={g?.nota != null ? g.nota.toFixed(1).replace('.', ',') : '—'} rotulo={`Google · ${g?.avaliacoes ?? 0}`} tom={g?.nota != null && g.nota >= 4.5 ? 'bom' : 'neutro'} />
          <Numero valor={semSite ? 'Sem site' : (s.nota != null ? `${s.nota}/100` : 'Tem site')} rotulo="site" tom={semSite ? 'ruim' : 'neutro'} />
        </div>
      </section>

      {/* 2. COMO ABORDAR */}
      {ab ? (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[15px] font-black text-slate-900 flex items-center gap-2"><Compass className="w-4 h-4 text-indigo-600" /> Como abordar</h3>
            <span className="text-xs text-slate-500">{ab.origem === 'ia' ? 'feito por IA' : 'montado pelos fatos'}</span>
          </div>
          <p className="text-[14px] text-slate-900 leading-relaxed font-medium">{ab.angulo}</p>
          <div className="rounded-xl bg-white border border-indigo-100 p-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Mensagem · {CANAL[ab.canal] || ab.canal}</p>
            <p className="text-[14px] text-slate-800 leading-relaxed whitespace-pre-line break-words">{ab.abertura}</p>
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <button onClick={() => copiar(ab.abertura)}
                className="min-h-12 sm:min-h-10 px-4 rounded-xl bg-white border border-slate-300 active:bg-slate-100 text-[14px] font-bold text-slate-700 flex items-center justify-center gap-2">
                {copiado ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                {copiado ? 'Copiado' : 'Copiar mensagem'}
              </button>
              {onUsarAbertura && (
                <button onClick={() => onUsarAbertura(ab.abertura)}
                  className="min-h-12 sm:min-h-10 px-4 rounded-xl bg-indigo-600 active:bg-indigo-700 text-[14px] font-bold text-white flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Usar no disparo
                </button>
              )}
            </div>
          </div>
          <details className="group">
            <summary className="list-none cursor-pointer min-h-11 flex items-center justify-between text-[14px] font-bold text-indigo-700">
              Objeção provável e próximo passo <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
            </summary>
            <dl className="grid gap-2 text-[13px] text-slate-700 leading-relaxed mt-1">
              <div><dt className="font-bold text-slate-900 inline">Por que funciona: </dt><dd className="inline">{ab.por_que_funciona}</dd></div>
              <div><dt className="font-bold text-slate-900 inline">Objeção provável: </dt><dd className="inline">“{ab.objecao_provavel}” → {ab.resposta_a_objecao}</dd></div>
              <div><dt className="font-bold text-slate-900 inline">Depois: </dt><dd className="inline">{ab.proximo_passo}</dd></div>
              <div><dt className="font-bold text-red-700 inline">Evite: </dt><dd className="inline">{ab.evitar}</dd></div>
            </dl>
          </details>
        </section>
      ) : (
        <p className="text-[13px] text-slate-500">A abordagem não ficou pronta desta vez. Use “refazer” para tentar de novo.</p>
      )}

      {/* 3. OS DETALHES, um bloco por assunto: abre só o que interessa */}
      <Bloco aberto icone={<InstagramIcon className="w-5 h-5 text-pink-600" />} titulo="Social media (Instagram)"
        resumo={so ? <>{so.rotulo}{m.posts_por_semana != null && so.status !== 'sem_dados' ? ` · ${String(m.posts_por_semana).replace('.', ',')} posts/semana` : ''}</> : undefined}>
        {so && so.status !== 'sem_dados' ? (
          <>
            {(m.nome || so.usuario) && (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-slate-900 truncate">{m.nome || `@${so.usuario}`}</p>
                  {m.nome && so.usuario && <p className="text-[13px] text-slate-500">@{so.usuario}</p>}
                </div>
                {so.link && <a href={so.link} target="_blank" rel="noopener" className={link}>Abrir <ExternalLink className="w-4 h-4" /></a>}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Numero valor={m.seguidores != null ? Number(m.seguidores).toLocaleString('pt-BR') : '—'} rotulo="seguidores" />
              <Numero valor={m.posts_por_semana != null ? String(m.posts_por_semana).replace('.', ',') : '—'} rotulo="posts por semana" tom={(m.posts_por_semana ?? 0) < 1 ? 'ruim' : (m.posts_por_semana ?? 0) >= 3 ? 'bom' : 'neutro'} />
              <Numero valor={m.dias_desde_ultimo_post != null ? `há ${m.dias_desde_ultimo_post} d` : 'nenhum'} rotulo="último post" tom={(m.dias_desde_ultimo_post ?? 999) > 45 ? 'ruim' : 'neutro'} />
              <Numero valor={taxa != null ? `${String(taxa).replace('.', ',')}%` : '—'} rotulo="engajamento por post" tom={faixaTaxa} />
              <Numero valor={m.reels_pct != null ? `${m.reels_pct}%` : '—'} rotulo="posts em vídeo" tom={m.reels_pct != null && m.reels_pct < 20 ? 'ruim' : 'neutro'} />
              <Numero valor={m.link_da_bio ? 'Tem' : 'Não tem'} rotulo="link na bio" tom={m.link_da_bio ? 'bom' : 'ruim'} />
            </div>
            {m.bio && <p className="text-[13px] text-slate-600 italic leading-snug bg-slate-50 rounded-xl p-3 border border-slate-100">“{m.bio}”</p>}
            {so.motivos.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">O que mostra isso</p>
                <ul className="space-y-1.5">{so.motivos.map((t, i) => <li key={i} className="text-[14px] text-slate-700 leading-snug flex gap-2"><span className="text-slate-300">•</span>{t}</li>)}</ul>
              </div>
            )}
            {so.oportunidades.length > 0 && (
              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-3">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> O que uma agência pode vender aqui</p>
                <ul className="space-y-1.5">{so.oportunidades.map((t, i) => <li key={i} className="text-[14px] text-slate-800 leading-snug flex gap-2"><Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />{t}</li>)}</ul>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-[14px] text-slate-700 leading-snug">
              {so?.usuario ? <><b className="text-slate-900">@{so.usuario}</b> — </> : null}{so?.resumo || ig.motivo}
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              {so?.link && <a href={so.link} target="_blank" rel="noopener" className="min-h-12 sm:min-h-10 px-4 rounded-xl border border-slate-300 text-[14px] font-bold text-slate-700 active:bg-slate-100 flex items-center justify-center gap-2">Ver o perfil no Instagram <ExternalLink className="w-4 h-4" /></a>}
              {/conecte/i.test(so?.resumo || ig.motivo || '') && (
                <button onClick={irConectar} className="min-h-12 sm:min-h-10 px-4 rounded-xl bg-slate-900 text-white text-[14px] font-bold active:bg-slate-800">Conectar meu Instagram</button>
              )}
            </div>
          </div>
        )}
        {(anuncios.length > 0 || !semSite) && (
          <p className="text-[13px] text-slate-600">Anúncios detectados no site: <b className="text-slate-900">{anuncios.join(', ') || 'nenhum sinal'}</b></p>
        )}
      </Bloco>

      {dores.length > 0 && (
        <Bloco icone={<Flame className="w-5 h-5 text-red-600" />} titulo="Dores comprovadas" resumo={`${dores.length} ${dores.length === 1 ? 'achada' : 'achadas'}, cada uma com a evidência`}>
          <ul className="space-y-2">
            {dores.map((d, i) => (
              <li key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-start gap-2.5">
                  <span className={`shrink-0 text-xs font-bold uppercase px-2 py-0.5 rounded border ${PESO[d.peso] || PESO.baixo}`}>{d.peso === 'medio' ? 'médio' : d.peso}</span>
                  <p className="text-[14px] font-bold text-slate-900 leading-snug">{d.titulo}</p>
                </div>
                <p className="text-[13px] text-slate-600 mt-1.5 leading-snug">{d.evidencia}</p>
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      <Bloco icone={<Globe className="w-5 h-5 text-blue-600" />} titulo="Site e anúncios"
        resumo={s.tipo === 'own' ? `${s.nota != null ? `Nota ${s.nota}/100` : 'Tem site próprio'}${s.plataforma ? ` · ${s.plataforma}` : ''}` : { none: 'Não tem site', social: 'O Google leva para uma rede social', aggregator: 'O Google leva para um Linktree', whatsapp: 'O Google leva só para o WhatsApp' }[s.tipo] || 'Sem site'}>
        {s.tipo === 'own' ? (
          <div className="space-y-2 text-[14px] text-slate-700">
            <a href={s.url} target="_blank" rel="noopener" className="text-blue-700 font-medium break-all">{s.url}</a>
            {s.credito_agencia && <p>Feito por <b className="text-slate-900">{s.credito_agencia}</b></p>}
            <p>Anúncios: <b className="text-slate-900">{anuncios.join(', ') || 'nenhum sinal'}</b>{s.pixels_via_tag_manager && <span className="text-slate-500"> (achados no Tag Manager)</span>}</p>
            {!!s.problemas?.length && <ul className="space-y-1.5 pt-1">{s.problemas.map((p, i) => <li key={i} className="text-slate-800 leading-snug">• {p}</li>)}</ul>}
          </div>
        ) : (
          <p className="text-[14px] text-slate-800">Sem site próprio: toda a presença do negócio depende do Google e das redes.</p>
        )}
      </Bloco>

      {g?.itens?.length > 0 && (
        <Bloco icone={<MapPin className="w-5 h-5 text-amber-600" />} titulo="Google Meu Negócio" resumo={`${g.completude}% completo · ${g.avaliacoes} avaliações${g.nota != null ? ` · nota ${g.nota.toFixed(1).replace('.', ',')}` : ''}`}>
          <ul className="space-y-2">
            {g.itens.map(i => (
              <li key={i.item} className="text-[14px] flex items-start gap-2.5">
                {i.ok === true && <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                {i.ok === false && <X className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                {i.ok === null && <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />}
                <span className={i.ok === false ? 'text-slate-900 font-medium' : 'text-slate-700'}>
                  {i.item}{i.detalhe ? <span className="text-slate-500 font-normal"> — {i.detalhe}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          {g.resumo_avaliacoes && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-xs font-bold text-slate-600 mb-1 flex items-center gap-1.5"><Quote className="w-3.5 h-3.5" /> O que os clientes dizem</p>
              <p className="text-[14px] text-slate-800 leading-relaxed whitespace-pre-line">{g.resumo_avaliacoes}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-x-5">
            {g.link_perfil && <a href={g.link_perfil} target="_blank" rel="noopener" className={link}>Abrir o perfil <ExternalLink className="w-4 h-4" /></a>}
            {g.link_avaliacoes && <a href={g.link_avaliacoes} target="_blank" rel="noopener" className={link}>Ver avaliações <ExternalLink className="w-4 h-4" /></a>}
            {g.link_fotos && <a href={g.link_fotos} target="_blank" rel="noopener" className={link}>Ver fotos <ExternalLink className="w-4 h-4" /></a>}
          </div>
        </Bloco>
      )}

      {(temEmpresa || temGente) && (
        <Bloco icone={<Users className="w-5 h-5 text-sky-600" />} titulo="Empresa e quem decide" resumo={emp.razao_social || (pessoas[0]?.nome ? `${pessoas[0].nome}${pessoas[0].cargo ? ` · ${pessoas[0].cargo}` : ''}` : undefined)}>
          {temGente && (
            <ul className="space-y-2">
              {pessoas.map((p, i) => (
                <li key={`p${i}`} className="text-[14px] text-slate-800 leading-snug">
                  <b>{p.nome}</b>{p.cargo && <span className="text-slate-600"> · {p.cargo}</span>}
                  <span className="block text-xs text-slate-500">{p.fonte}</span>
                </li>
              ))}
              {(emp.socios || []).map((p, i) => (
                <li key={`s${i}`} className="text-[14px] text-slate-800 leading-snug">
                  <b>{p.nome}</b>{p.qualificacao && <span className="text-slate-600"> · {p.qualificacao}</span>}
                  <span className="block text-xs text-slate-500">sócio na Receita Federal</span>
                </li>
              ))}
            </ul>
          )}
          {temEmpresa && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
              {[
                ['Razão social', emp.razao_social], ['CNPJ', emp.cnpj],
                ['Situação', emp.situacao], ['Aberta em', emp.aberta_em ? `${emp.aberta_em}${emp.anos_de_atividade != null ? ` (${emp.anos_de_atividade} anos)` : ''}` : ''],
                ['Porte', emp.porte], ['Atividade', emp.atividade],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string} className={k === 'Razão social' || k === 'Atividade' ? 'col-span-2' : ''}>
                  <p className="text-xs uppercase tracking-wider text-slate-500">{k}</p>
                  <p className="text-slate-900 font-medium break-words">{v}</p>
                </div>
              ))}
              <p className="col-span-2 text-xs text-slate-500 flex items-center gap-1.5"><Building className="w-3.5 h-3.5" /> {emp.fonte}</p>
            </div>
          )}
          <p className="text-xs text-slate-500 leading-snug">Nomes citados no site podem não ser quem atende. Confirme antes de chamar alguém pelo nome.</p>
        </Bloco>
      )}
    </div>
  );
};
