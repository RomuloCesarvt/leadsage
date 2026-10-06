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
  Building, Users, Flame, Compass, Copy, Send, MessageSquareWarning,
} from 'lucide-react';
import { api } from '../services/api';
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

export const RaioXLead: React.FC<{ lead: any; onUsarAbertura?: (texto: string) => void }> = ({ lead, onUsarAbertura }) => {
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
  const emp = dados.empresa || {};
  const pessoas = dados.pessoas || [];
  const dores = dados.dores || [];
  const ab = dados.abordagem || null;
  const temEmpresa = !!(emp.razao_social || emp.cnpj);
  const temGente = pessoas.length > 0 || !!emp.socios?.length;

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
          <ScanSearch className="w-3.5 h-3.5" /> Dossiê
        </span>
        <button onClick={() => gerar(true)} disabled={carregando} title="Refazer (1 crédito)"
          className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1">
          <RefreshCw className={`w-3 h-3 ${carregando ? 'animate-spin' : ''}`} />
          {dados.do_cache ? 'guardado' : 'agora'} · refazer
        </button>
      </div>

      {/* abordagem */}
      {ab ? (
        <Secao icone={<Compass className="w-3.5 h-3.5 text-indigo-600" />} titulo="Melhor abordagem"
          nota={ab.origem === 'ia' ? 'feita sob medida por IA' : 'montada pelos fatos'}>
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 space-y-3">
            <p className="text-[13px] text-slate-900 leading-relaxed font-medium">{ab.angulo}</p>
            <div className="rounded-xl bg-white border border-indigo-100 p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Abertura · {CANAL[ab.canal] || ab.canal}
              </p>
              <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-line">{ab.abertura}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => copiar(ab.abertura)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
                {onUsarAbertura && (
                  <button onClick={() => onUsarAbertura(ab.abertura)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Usar no disparo
                  </button>
                )}
              </div>
            </div>
            <dl className="grid gap-2 text-[12px] text-slate-700">
              <div><dt className="font-bold text-slate-900 inline">Por que funciona: </dt><dd className="inline">{ab.por_que_funciona}</dd></div>
              <div><dt className="font-bold text-slate-900 inline">Objeção provável: </dt><dd className="inline">“{ab.objecao_provavel}” → {ab.resposta_a_objecao}</dd></div>
              <div><dt className="font-bold text-slate-900 inline">Depois: </dt><dd className="inline">{ab.proximo_passo}</dd></div>
              <div><dt className="font-bold text-red-700 inline">Evite: </dt><dd className="inline">{ab.evitar}</dd></div>
            </dl>
          </div>
        </Secao>
      ) : (
        <p className="text-xs text-slate-500">A abordagem não ficou pronta desta vez. Use “refazer” para tentar de novo.</p>
      )}

      {/* dores */}
      {dores.length > 0 && (
        <Secao icone={<Flame className="w-3.5 h-3.5 text-red-600" />} titulo="Dores comprovadas" nota={`${dores.length} achadas`}>
          <ul className="space-y-2">
            {dores.map((d, i) => (
              <li key={i} className="rounded-xl border border-slate-200 bg-white p-3 flex gap-3">
                <span className={`h-fit text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${PESO[d.peso] || PESO.baixo}`}>{d.peso === 'medio' ? 'médio' : d.peso}</span>
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">{d.titulo}</p>
                  <p className="text-[12px] text-slate-600 mt-0.5">{d.evidencia}</p>
                </div>
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {/* quem decide */}
      {(temEmpresa || temGente) && (
        <Secao icone={<Users className="w-3.5 h-3.5 text-sky-600" />} titulo="Quem decide e a empresa">
          {temGente && (
            <ul className="space-y-1.5">
              {pessoas.map((p, i) => (
                <li key={`p${i}`} className="text-[13px] text-slate-800 flex flex-wrap items-baseline gap-x-2">
                  <b>{p.nome}</b>
                  {p.cargo && <span className="text-slate-600">{p.cargo}</span>}
                  <span className="text-[10px] text-slate-500">{p.fonte}</span>
                </li>
              ))}
              {(emp.socios || []).map((p, i) => (
                <li key={`s${i}`} className="text-[13px] text-slate-800 flex flex-wrap items-baseline gap-x-2">
                  <b>{p.nome}</b>
                  {p.qualificacao && <span className="text-slate-600">{p.qualificacao}</span>}
                  <span className="text-[10px] text-slate-500">sócio na Receita Federal</span>
                </li>
              ))}
            </ul>
          )}
          {temEmpresa && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
              {[
                ['Razão social', emp.razao_social], ['CNPJ', emp.cnpj],
                ['Situação', emp.situacao], ['Aberta em', emp.aberta_em ? `${emp.aberta_em}${emp.anos_de_atividade != null ? ` (${emp.anos_de_atividade} anos)` : ''}` : ''],
                ['Porte', emp.porte], ['Atividade', emp.atividade],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string} className={k === 'Razão social' || k === 'Atividade' ? 'col-span-2' : ''}>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{k}</p>
                  <p className="text-slate-900 font-medium break-words">{v}</p>
                </div>
              ))}
              <p className="col-span-2 text-[10px] text-slate-500 flex items-center gap-1"><Building className="w-3 h-3" /> {emp.fonte}</p>
            </div>
          )}
          <p className="text-[11px] text-slate-500">
            Nomes citados no site podem não ser quem atende. Confirme antes de chamar alguém pelo nome.
          </p>
        </Secao>
      )}

      {/* quem cuida */}
      <div className={`rounded-xl border p-4 ${COR_VEREDITO[q.veredito] || COR_VEREDITO.indefinido}`}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-bold text-sm flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> {q.rotulo}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-80">confiança {q.confianca}</span>
        </div>
        <p className="text-[13px] leading-relaxed">{q.abordagem}</p>
        {!!q.evidencias.length && (
          <ul className="mt-3 space-y-1">
            {q.evidencias.map((e, i) => <li key={i} className="text-xs flex gap-1.5"><span className="opacity-60">•</span>{e}</li>)}
          </ul>
        )}
      </div>

      {/* google meu negocio */}
      {g?.itens?.length > 0 && (
        <Secao icone={<MessageSquareWarning className="w-3.5 h-3.5 text-amber-600" />} titulo={`Google Meu Negócio · ${g.completude}% completo`}>
          <div className="flex items-baseline gap-2">
            {g.nota != null && <span className="text-2xl font-bold text-slate-900">{g.nota.toFixed(1)}</span>}
            <span className="text-xs text-slate-600">{g.avaliacoes} avaliações{g.categoria ? ` · ${g.categoria}` : ''}</span>
          </div>
          <ul className="space-y-1.5">
            {g.itens.map(i => (
              <li key={i.item} className="text-xs flex items-start gap-2">
                {i.ok === true && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                {i.ok === false && <X className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />}
                {i.ok === null && <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />}
                <span className={i.ok === false ? 'text-slate-900 font-medium' : 'text-slate-700'}>
                  {i.item}{i.detalhe ? <span className="text-slate-500 font-normal"> — {i.detalhe}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          {g.resumo_avaliacoes && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1.5"><Quote className="w-3 h-3" /> O que os clientes dizem (resumo do Google)</p>
              <p className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-line">{g.resumo_avaliacoes}</p>
            </div>
          )}
          <div className="flex gap-4">
            {g.link_perfil && <a href={g.link_perfil} target="_blank" rel="noopener" className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1">Abrir o perfil <ExternalLink className="w-3 h-3" /></a>}
            {g.link_avaliacoes && <a href={g.link_avaliacoes} target="_blank" rel="noopener" className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1">Ver avaliações <ExternalLink className="w-3 h-3" /></a>}
            {g.link_fotos && <a href={g.link_fotos} target="_blank" rel="noopener" className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1">Ver fotos <ExternalLink className="w-3 h-3" /></a>}
          </div>
        </Secao>
      )}

      {/* site */}
      <Secao icone={<ScanSearch className="w-3.5 h-3.5 text-blue-600" />} titulo="Site">
        {s.tipo === 'own' ? (
          <div className="space-y-1.5 text-xs text-slate-700">
            <a href={s.url} target="_blank" rel="noopener" className="text-blue-700 font-medium hover:underline break-all">{s.url}</a>
            {s.nota != null && <p>Nota {s.nota}/100{s.plataforma ? ` · feito em ${s.plataforma}` : ''}</p>}
            {s.credito_agencia && <p>Feito por <b className="text-slate-900">{s.credito_agencia}</b></p>}
            <p>
              Anúncios: {[s.pixel_meta && 'Meta', s.tag_google_ads && 'Google Ads', s.tag_tiktok && 'TikTok'].filter(Boolean).join(', ') || 'nenhum sinal'}
              {s.pixels_via_tag_manager && <span className="text-slate-500"> (achados dentro do Tag Manager)</span>}
            </p>
            {!!s.problemas?.length && (
              <ul className="pt-1 space-y-1">{s.problemas.map((p, i) => <li key={i} className="text-slate-800">• {p}</li>)}</ul>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-800">
            {{ none: 'Não tem site.', social: 'O Google leva para uma rede social, não para um site.',
               aggregator: 'O Google leva para um Linktree ou cardápio.', whatsapp: 'O Google leva só para o WhatsApp.' }[s.tipo] || 'Sem site.'}
          </p>
        )}
      </Secao>

      {/* instagram */}
      <Secao icone={<InstagramIcon className="w-3.5 h-3.5 text-pink-600" />} titulo="Instagram">
        {ig.disponivel ? (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['seguidores', ig.seguidores?.toLocaleString('pt-BR') ?? '—'],
              ['posts em 90 dias', String(ig.posts_90_dias ?? '—')],
              ['último post', ig.dias_desde_ultimo_post != null ? `há ${ig.dias_desde_ultimo_post}d` : 'nenhum'],
            ].map(([rotulo, valor]) => (
              <div key={rotulo} className="rounded-xl bg-slate-50 border border-slate-200 py-2">
                <p className="text-sm font-bold text-slate-900">{valor}</p>
                <p className="text-[10px] text-slate-600">{rotulo}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-700">
            {ig.usuario ? <><b className="text-slate-900">@{ig.usuario}</b> — </> : null}{ig.motivo}
          </p>
        )}
      </Secao>
    </div>
  );
};
