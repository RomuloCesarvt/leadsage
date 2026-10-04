/**
 * Raio-X do lead, dentro do painel lateral.
 *
 * Não roda sozinho: custa 1 crédito (uma consulta ao Google por lugar),
 * então só gera quando a pessoa pede — e depois fica guardado por 7 dias,
 * reabrindo de graça.
 */
import React, { useEffect, useState } from 'react';
import { ScanSearch, Loader2, Check, X, HelpCircle, ExternalLink, RefreshCw, ShieldCheck, Quote } from 'lucide-react';
import { api } from '../services/api';
import { InstagramIcon } from './BrandIcons';
import type { RaioX } from '../types';

const COR_VEREDITO: Record<string, string> = {
  agencia: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  dono: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  abandonado: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  ninguem: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  indefinido: 'bg-zinc-800 text-zinc-300 border-zinc-700',
};

const Titulo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">{children}</h4>
);

export const RaioXLead: React.FC<{ lead: any }> = ({ lead }) => {
  const [dados, setDados] = useState<RaioX | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  // Ao trocar de lead, some o raio-x do anterior.
  useEffect(() => { setDados(null); setErro(''); }, [lead?.id]);

  const gerar = async (refazer = false) => {
    setCarregando(true);
    setErro('');
    try {
      setDados(await api.raioX(lead.id, lead.website || '', lead.socials?.instagram || '', refazer));
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível gerar o raio-x.');
    } finally {
      setCarregando(false);
    }
  };

  if (!dados) {
    return (
      <div className="pt-6 border-t border-zinc-900">
        <button
          onClick={() => gerar()}
          disabled={carregando}
          className="w-full py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-sm font-bold text-zinc-200 flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        >
          {carregando ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <ScanSearch className="w-4 h-4 text-emerald-400" />}
          {carregando ? 'Analisando Google, site e Instagram…' : 'Fazer raio-x completo'}
        </button>
        <p className="text-[11px] text-zinc-600 text-center mt-2">
          Google Meu Negócio, avaliações, site, Instagram e quem cuida disso hoje. 1 crédito.
        </p>
        {erro && <p className="text-xs text-red-400 mt-2 text-center">{erro}</p>}
      </div>
    );
  }

  const q = dados.quem_cuida;
  const g = dados.gmn;
  const s = dados.site;
  const ig = dados.instagram;

  return (
    <div className="pt-6 border-t border-zinc-900 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <ScanSearch className="w-3.5 h-3.5 text-emerald-400" /> Raio-X
        </h3>
        <button onClick={() => gerar(true)} disabled={carregando} title="Refazer (1 crédito)"
          className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1">
          <RefreshCw className={`w-3 h-3 ${carregando ? 'animate-spin' : ''}`} />
          {dados.do_cache ? 'guardado' : 'agora'} · refazer
        </button>
      </div>

      {/* quem cuida */}
      <div className={`rounded-xl border p-4 ${COR_VEREDITO[q.veredito] || COR_VEREDITO.indefinido}`}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-bold text-sm flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> {q.rotulo}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-80">confiança {q.confianca}</span>
        </div>
        <p className="text-[13px] opacity-90 leading-relaxed">{q.abordagem}</p>
        {!!q.evidencias.length && (
          <ul className="mt-3 space-y-1">
            {q.evidencias.map((e, i) => <li key={i} className="text-xs text-zinc-300 flex gap-1.5"><span className="opacity-50">•</span>{e}</li>)}
          </ul>
        )}
      </div>

      {/* google meu negocio */}
      {g?.itens?.length > 0 && (
        <div>
          <Titulo>Google Meu Negócio · {g.completude}% completo</Titulo>
          <div className="flex items-baseline gap-2 mb-3">
            {g.nota != null && <span className="text-2xl font-bold text-zinc-100">{g.nota.toFixed(1)}</span>}
            <span className="text-xs text-zinc-500">{g.avaliacoes} avaliações{g.categoria ? ` · ${g.categoria}` : ''}</span>
          </div>
          <ul className="space-y-1.5">
            {g.itens.map(i => (
              <li key={i.item} className="text-xs flex items-start gap-2">
                {i.ok === true && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />}
                {i.ok === false && <X className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />}
                {i.ok === null && <HelpCircle className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />}
                <span className={i.ok === false ? 'text-zinc-200' : 'text-zinc-400'}>
                  {i.item}{i.detalhe ? <span className="text-zinc-600"> — {i.detalhe}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          {g.resumo_avaliacoes && (
            <div className="mt-4 rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
              <p className="text-[11px] font-bold text-zinc-500 mb-1 flex items-center gap-1.5"><Quote className="w-3 h-3" /> O que os clientes dizem (resumo do Google)</p>
              <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">{g.resumo_avaliacoes}</p>
            </div>
          )}
          <div className="flex gap-3 mt-3">
            {g.link_avaliacoes && <a href={g.link_avaliacoes} target="_blank" rel="noopener" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">Ver avaliações <ExternalLink className="w-3 h-3" /></a>}
            {g.link_fotos && <a href={g.link_fotos} target="_blank" rel="noopener" className="text-xs text-emerald-400 hover:underline flex items-center gap-1">Ver fotos <ExternalLink className="w-3 h-3" /></a>}
          </div>
        </div>
      )}

      {/* site */}
      <div>
        <Titulo>Site</Titulo>
        {s.tipo === 'own' ? (
          <div className="space-y-1.5 text-xs text-zinc-400">
            <a href={s.url} target="_blank" rel="noopener" className="text-zinc-200 hover:underline break-all">{s.url}</a>
            {s.nota != null && <p>Nota {s.nota}/100{s.plataforma ? ` · feito em ${s.plataforma}` : ''}</p>}
            {s.credito_agencia && <p>Feito por <b className="text-zinc-200">{s.credito_agencia}</b></p>}
            <p>
              Anúncios: {[s.pixel_meta && 'Meta', s.tag_google_ads && 'Google Ads', s.tag_tiktok && 'TikTok'].filter(Boolean).join(', ') || 'nenhum sinal'}
              {s.pixels_via_tag_manager && <span className="text-zinc-600"> (achados dentro do Tag Manager)</span>}
            </p>
            {!!s.problemas?.length && (
              <ul className="pt-1 space-y-1">{s.problemas.map((p, i) => <li key={i} className="text-zinc-300">• {p}</li>)}</ul>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-300">
            {{ none: 'Não tem site.', social: 'O Google leva para uma rede social, não para um site.',
               aggregator: 'O Google leva para um Linktree ou cardápio.', whatsapp: 'O Google leva só para o WhatsApp.' }[s.tipo] || 'Sem site.'}
          </p>
        )}
      </div>

      {/* instagram */}
      <div>
        <Titulo>Instagram</Titulo>
        {ig.disponivel ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['seguidores', ig.seguidores?.toLocaleString('pt-BR') ?? '—'],
              ['posts em 90 dias', String(ig.posts_90_dias ?? '—')],
              ['último post', ig.dias_desde_ultimo_post != null ? `há ${ig.dias_desde_ultimo_post}d` : 'nenhum'],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="rounded-xl bg-zinc-900/60 border border-zinc-800 py-2">
                <p className="text-sm font-bold text-zinc-100">{valor}</p>
                <p className="text-[10px] text-zinc-500">{rotulo}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 flex items-start gap-2">
            <InstagramIcon className="w-4 h-4 shrink-0" />
            <span>{ig.usuario ? <><b className="text-zinc-300">@{ig.usuario}</b> — </> : null}{ig.motivo}</span>
          </p>
        )}
      </div>
    </div>
  );
};
