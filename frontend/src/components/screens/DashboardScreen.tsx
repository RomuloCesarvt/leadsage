import { ehSalvo } from '../../lib/leadsSalvos';
import React, { useEffect, useState } from 'react';
import { Search, Users, ArrowUpRight, BarChart2, Zap, Globe, MessageCircle, Target, ArrowRight, Link2, Flame, Reply } from 'lucide-react';
import { api } from '../../services/api';
import type { DesempenhoPorSegmento } from '../../types';
import { agrupar, destaques as destaquesDe, segmentosDasLinhas, type Visao } from '../../lib/desempenho';
import { useApp } from '../../context/AppContext';
import { PrecisaDeVoce } from '../PrecisaDeVoce';
import { pedirFiltroDoPipeline, pedirBuscaDeLeads } from '../../lib/atalhosDoPainel';

export const DashboardScreen: React.FC = () => {
  const { setViewState, leads: todos, history, user, setSelectedProfileLead } = useApp() as any;
  const leads = (todos as any[]).filter(ehSalvo);

  // quais segmentos (ramos) respondem mais, mostram mais interesse e mais pedem o link da prévia
  const [segmentos, setSegmentos] = useState<DesempenhoPorSegmento | null>(null);
  // ver por segmento, cidade ou estado; com um segmento escolhido, compara o mesmo ramo entre cidades e estados
  const [visao, setVisao] = useState<Visao>('segmento');
  const [filtroSegmento, setFiltroSegmento] = useState('');
  useEffect(() => {
    if (!user) return;
    // resposta fora do formato esperado = sem dados: o resto do dashboard nunca quebra por causa desta seção
    api.segmentosDoDashboard().then(r => setSegmentos(Array.isArray(r?.segmentos) && r?.destaques ? r : null)).catch(() => setSegmentos(null));
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real computed metrics
  const totalLeads = leads.length;
  const highOpportunity = leads.filter((l: any) => (l.opportunityScore || l.quality_score || 0) >= 80).length;
  const pipelineActive = leads.filter((l: any) => l.pipeline_stage && l.pipeline_stage !== 'Novos' && l.pipeline_stage !== 'Novo Lead').length;
  const avgScore = totalLeads > 0 ? Math.round(leads.reduce((sum: number, l: any) => sum + (l.opportunityScore || l.quality_score || 0), 0) / totalLeads) : 0;
  const empresa = user?.modo === 'empresa';
  const quentes = leads.filter((l: any) => ['precisa_voce', 'preco', 'quente'].includes(l.qualificacao?.id)).length;
  const noWebsite = leads.filter((l: any) => l.missingDigitalAssets?.includes('website') || (!l.website && !l.socials?.website)).length;
  const withWhatsapp = leads.filter((l: any) => l.whatsapp === true).length;
  const followUps = leads.filter((l: any) => l.outreach_status === 'Enviado' || l.outreach_status === 'Entregue').length;

  // Pipeline stages
  const stageData = [
    { label: 'Novo Lead', count: leads.filter((l: any) => !l.pipeline_stage || l.pipeline_stage === 'Novos' || l.pipeline_stage === 'Novo Lead').length, color: 'bg-blue-600', dot: 'bg-blue-600' },
    { label: 'Contato Enviado', count: leads.filter((l: any) => l.pipeline_stage === 'Contato Enviado').length, color: 'bg-indigo-600', dot: 'bg-indigo-600' },
    { label: 'Reunião Agendada', count: leads.filter((l: any) => l.pipeline_stage === 'Reunião' || l.pipeline_stage === 'Reunião Agendada').length, color: 'bg-purple-600', dot: 'bg-purple-600' },
    { label: 'Proposta Enviada', count: leads.filter((l: any) => l.pipeline_stage === 'Proposta' || l.pipeline_stage === 'Proposta Enviada').length, color: 'bg-fuchsia-600', dot: 'bg-fuchsia-600' },
    { label: 'Fechado', count: leads.filter((l: any) => l.pipeline_stage === 'Fechado').length, color: 'bg-emerald-600', dot: 'bg-emerald-600' }
  ];

  const maxStageCount = Math.max(1, ...stageData.map(s => s.count));

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar text-slate-800">
      
      {/* Header Area */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Visão Geral</h1>
          <p className="text-slate-500 mt-1">Acompanhe suas oportunidades e prospecções.</p>
        </div>
        <button 
          onClick={() => setViewState('hero')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-5 min-h-11 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap shrink-0"
        >
          <Search className="w-4 h-4" />
          Nova Busca
        </button>
      </div>

      {/* Row 1: 3 Big Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-3 md:mb-6">
        
        {/* Card 1 */}
        <div role="button" tabIndex={0} title="Abrir Meus Leads" onClick={() => setViewState('workspace')} onKeyDown={e => { if (e.key === 'Enter') setViewState('workspace'); }}
          className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 flex flex-col justify-between gap-3 min-h-36 md:h-48 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Leads Encontrados</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div>
            <div className="text-5xl md:text-6xl font-bold tracking-tighter mb-1 text-slate-900">{totalLeads}</div>
            <div className="text-sm text-slate-400">{totalLeads} este mês</div>
          </div>
        </div>

        {/* Card 2 (Blue Theme) */}
        <div role="button" tabIndex={0} title="Ver os leads de maior oportunidade" onClick={() => setViewState('workspace')} onKeyDown={e => { if (e.key === 'Enter') setViewState('workspace'); }}
          className="bg-blue-600 rounded-2xl p-4 md:p-6 shadow-sm flex flex-col justify-between gap-3 min-h-36 md:h-48 cursor-pointer hover:bg-blue-700 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold tracking-widest text-blue-100 uppercase">Oportunidades Altas</span>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <div className="text-5xl md:text-6xl font-bold tracking-tighter mb-1 text-white">{highOpportunity}</div>
            <div className="text-sm text-blue-100">Score acima de 80</div>
          </div>
        </div>

        {/* Card 3 */}
        <div role="button" tabIndex={0} title="Abrir o pipeline" onClick={() => { pedirFiltroDoPipeline(''); setViewState('pipeline'); }} onKeyDown={e => { if (e.key === 'Enter') setViewState('pipeline'); }}
          className="col-span-2 md:col-span-1 bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 flex flex-col justify-between gap-3 min-h-32 md:h-48 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">Pipeline Ativo</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-col gap-0.5">
              <BarChart2 className="w-5 h-5 text-blue-600 rotate-90" />
            </div>
          </div>
          <div>
            <div className="text-5xl md:text-6xl font-bold tracking-tighter mb-1 text-slate-900">{pipelineActive}</div>
            <div className="text-sm text-slate-400">Leads em acompanhamento</div>
          </div>
        </div>

      </div>

      {/* Row 2: 4 Small Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-6">
        
        <div role="button" tabIndex={0} title="Ver os leads" onClick={() => setViewState('workspace')} onKeyDown={e => { if (e.key === 'Enter') setViewState('workspace'); }} className="bg-white rounded-2xl p-3.5 md:p-5 shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
          <div className="hidden sm:flex w-12 h-12 rounded-xl bg-slate-50 items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <span className="text-[13px] md:text-xs font-bold text-slate-500 md:text-slate-400">Score Médio</span>
            <div className="text-2xl font-bold text-slate-800 leading-none mt-1">{avgScore}</div>
          </div>
        </div>

        <div role="button" tabIndex={0} title="Ver os leads sem site" onClick={() => setViewState('workspace')} onKeyDown={e => { if (e.key === 'Enter') setViewState('workspace'); }} className="bg-white rounded-2xl p-3.5 md:p-5 shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
          <div className="hidden sm:flex w-12 h-12 rounded-xl bg-slate-50 items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <span className="text-[13px] md:text-xs font-bold text-slate-500 md:text-slate-400">{empresa ? 'Pedem atenção' : 'Sem Website'}</span>
            <div className="text-2xl font-bold text-slate-800 leading-none mt-1">{empresa ? quentes : noWebsite}</div>
          </div>
        </div>

        <div role="button" tabIndex={0} title="Enviar mensagem para quem tem WhatsApp" onClick={() => setViewState('fila')} onKeyDown={e => { if (e.key === 'Enter') setViewState('fila'); }} className="bg-white rounded-2xl p-3.5 md:p-5 shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
          <div className="hidden sm:flex w-12 h-12 rounded-xl bg-slate-50 items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <span className="text-[13px] md:text-xs font-bold text-slate-500 md:text-slate-400">Com WhatsApp</span>
            <div className="text-2xl font-bold text-slate-800 leading-none mt-1">{withWhatsapp}</div>
          </div>
        </div>

        <div role="button" tabIndex={0} title="Ver quem está em acompanhamento" onClick={() => setViewState('pipeline')} onKeyDown={e => { if (e.key === 'Enter') setViewState('pipeline'); }} className="bg-white rounded-2xl p-3.5 md:p-5 shadow-sm border border-slate-100 flex items-center gap-3 md:gap-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
          <div className="hidden sm:flex w-12 h-12 rounded-xl bg-slate-50 items-center justify-center shrink-0">
            <Target className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <span className="text-[13px] md:text-xs font-bold text-slate-500 md:text-slate-400">Follow-ups</span>
            <div className="text-2xl font-bold text-slate-800 leading-none mt-1">{followUps}</div>
          </div>
        </div>

      </div>

      <PrecisaDeVoce leads={leads} ir={setViewState} abrirLead={(l) => setSelectedProfileLead(l)} />

      {/* Row 4: Buscas Recentes & Funil de Vendas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Buscas Recentes */}
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-lg">Buscas Recentes</h3>
            <button 
              onClick={() => setViewState('history')}
              className="min-h-11 -mr-2 pl-3 text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 flex-1 flex flex-col">
            {history && history.length > 0 ? history.slice(0, 3).map((item: any) => (
              <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center justify-between hover:border-blue-200 transition-colors cursor-pointer" onClick={() => setViewState('history')}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Search className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{item.niche}</h4>
                    <p className="text-xs text-slate-400">{item.location}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-600">{item.total_leads} leads</div>
                  <div className="text-xs text-slate-400">{(() => { const d = new Date(item.timestamp); return isNaN(d.getTime()) ? String(item.timestamp || '') : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }); })()}</div>
                </div>
              </div>
            )) : (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center flex flex-col items-center justify-center flex-1 min-h-48">
                <Search className="w-8 h-8 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium text-sm">Nenhuma busca recente</p>
              </div>
            )}
          </div>
        </div>

        {/* Funil de Vendas */}
        <div className="flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-lg">Funil de Vendas</h3>
            <button 
              onClick={() => setViewState('pipeline')}
              className="min-h-11 -mr-2 pl-3 text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Kanban <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4 flex-1">
            {stageData.map((stage, i) => {
              const widthPct = totalLeads > 0 ? Math.round((stage.count / maxStageCount) * 100) : 0;
              const pctLabel = totalLeads > 0 ? `${Math.round((stage.count / totalLeads) * 100)}%` : '0%';
              return (
                <div key={i} role="button" tabIndex={0} title={`Ver ${stage.label} no pipeline`} onClick={() => { pedirFiltroDoPipeline(''); setViewState('pipeline'); }}
                  onKeyDown={e => { if (e.key === 'Enter') setViewState('pipeline'); }} className="flex items-center gap-2 sm:gap-4 group cursor-pointer min-h-11 active:bg-slate-50 rounded-lg">
                  <div className="w-28 sm:w-40 shrink-0 flex items-center gap-2 text-[13px] sm:text-sm font-medium text-slate-700 leading-tight">
                    <span className={`w-2 h-2 rounded-full ${stage.dot}`}></span>
                    {stage.label}
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3">
                    <div className="font-bold text-slate-800 w-5 sm:w-6 shrink-0">{stage.count}</div>
                    <div className="flex-1 h-8 bg-slate-50 rounded-lg overflow-hidden relative border border-slate-100 group-hover:bg-slate-100 transition-colors">
                      <div className={`h-full ${stage.color} opacity-20`} style={{ width: `${widthPct}%` }}></div>
                    </div>
                    <div className="w-9 sm:w-10 shrink-0 text-right text-xs font-bold text-slate-400">{pctLabel}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>


      {/* Segmentos, cidades e estados: onde está a resposta, o interesse e o pedido de link */}
      {(() => {
        const minimo = segmentos?.minimo_para_taxa ?? 3;
        const linhas = segmentos?.linhas || [];
        const grupos = linhas.length
          ? agrupar(linhas, visao, filtroSegmento)
          : (segmentos?.segmentos || []).map(x => ({ nome: x.segmento, ...x })) as ReturnType<typeof agrupar>;
        const d = linhas.length ? destaquesDe(grupos, minimo) : null;
        const vazio = !segmentos || segmentos.segmentos.length === 0;
        const rotuloDaVisao = { segmento: 'Segmento', cidade: 'Cidade', estado: 'Estado' }[visao];
        const cards = [
          ['Responde mais', d ? d.respondeMais : segmentos?.destaques.responde_mais && { nome: segmentos.destaques.responde_mais.segmento, ...segmentos.destaques.responde_mais }, Reply, (x: any) => `${x.valor}% de resposta`, 'text-blue-600 bg-blue-50'],
          ['Mais interesse', d ? d.maisInteresse : segmentos?.destaques.mais_interesse && { nome: segmentos.destaques.mais_interesse.segmento, ...segmentos.destaques.mais_interesse }, Flame, (x: any) => `${x.valor} interessado${x.valor > 1 ? 's' : ''}`, 'text-orange-600 bg-orange-50'],
          ['Mais pedem o link', d ? d.maisPedemLink : segmentos?.destaques.mais_pedem_link && { nome: segmentos.destaques.mais_pedem_link.segmento, ...segmentos.destaques.mais_pedem_link }, Link2, (x: any) => `${x.valor} pedido${x.valor > 1 ? 's' : ''} de link`, 'text-emerald-600 bg-emerald-50'],
        ] as const;
        return (
          <div className="mt-6" data-testid="segmentos-do-dashboard">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
              <h3 className="font-bold text-slate-800 text-lg">Onde mais respondem</h3>
              <button onClick={() => setViewState('conversas')} className="min-h-11 -mr-2 pl-3 text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                Conversas <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {vazio ? (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
                <MessageCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium text-sm">Quando os leads começarem a responder, aqui aparece qual segmento, cidade e estado respondem mais, têm mais interesse e mais pedem o link da prévia.</p>
              </div>
            ) : (
              <>
                {linhas.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                    <div className="flex bg-slate-100 rounded-xl p-1 self-start" role="tablist" aria-label="Agrupar por">
                      {(['segmento', 'cidade', 'estado'] as const).map(v => (
                        <button key={v} role="tab" aria-selected={visao === v} onClick={() => setVisao(v)}
                          className={`px-4 h-10 rounded-lg text-sm font-bold transition-colors ${visao === v ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500'}`}>
                          {{ segmento: 'Segmento', cidade: 'Cidade', estado: 'Estado' }[v]}
                        </button>
                      ))}
                    </div>
                    <select value={filtroSegmento} onChange={e => setFiltroSegmento(e.target.value)} aria-label="Filtrar por segmento"
                      className="px-3 h-11 sm:h-10 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 sm:max-w-xs">
                      <option value="">Todos os segmentos</option>
                      {segmentosDasLinhas(linhas).map(x => <option key={x} value={x}>{x}</option>)}
                    </select>
                    {filtroSegmento && visao === 'segmento' && <p className="text-xs text-slate-500">Escolha Cidade ou Estado para comparar “{filtroSegmento}” entre lugares.</p>}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {cards.map(([titulo, x, Icone, texto, cor]) => (
                    <div key={titulo} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cor}`}><Icone className="w-5 h-5" /></div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{titulo}</p>
                        {x ? (
                          <>
                            <p className="font-bold text-slate-800 truncate">{x.nome}</p>
                            <p className="text-xs text-slate-500">{texto(x)}</p>
                          </>
                        ) : <p className="text-sm text-slate-400">Ainda sem dados{titulo === 'Responde mais' ? ` (precisa de ${minimo}+ abordados)` : ''}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="hidden sm:grid grid-cols-[1.6fr_repeat(5,1fr)] gap-2 px-5 py-3 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span>{rotuloDaVisao}</span><span className="text-right">Abordados</span><span className="text-right">Responderam</span><span className="text-right">Interesse</span><span className="text-right">Pediram link</span><span className="text-right">Fechados</span>
                  </div>
                  {grupos.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-slate-500">Nenhum lead com esse filtro.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {grupos.slice(0, 15).map(g => (
                        <li key={g.nome} role="button" tabIndex={0} title={visao === 'estado' ? undefined : `Ver os leads de ${g.nome}`}
                          onClick={() => { if (visao === 'estado') return; pedirBuscaDeLeads(`${visao === 'cidade' ? 'cidade' : 'nicho'}:${g.nome}`); setViewState('workspace'); }}
                          onKeyDown={e => { if (e.key === 'Enter' && visao !== 'estado') { pedirBuscaDeLeads(`${visao === 'cidade' ? 'cidade' : 'nicho'}:${g.nome}`); setViewState('workspace'); } }}
                          className={`px-4 sm:px-5 py-3 ${visao === 'estado' ? '' : 'cursor-pointer hover:bg-slate-50 active:bg-slate-100'}`}>
                          <div className="sm:grid sm:grid-cols-[1.6fr_repeat(5,1fr)] sm:gap-2 sm:items-center">
                            <p className="font-bold text-slate-800 text-sm truncate">{g.nome}</p>
                            <div className="grid grid-cols-5 gap-2 mt-2 sm:mt-0 sm:contents text-center sm:text-right">
                              {([['Abord.', g.abordados], ['Resp.', g.responderam], ['Interesse', g.interessados], ['Link', g.pediram_link], ['Fechados', g.fechados]] as const).map(([r, v]) => (
                                <div key={r} className="sm:text-right">
                                  <p className="sm:hidden text-[10px] font-bold uppercase text-slate-400">{r}</p>
                                  <p className="font-bold text-slate-800 text-sm">{v}</p>
                                  {r === 'Resp.' && g.abordados >= minimo && <p className="text-[11px] text-slate-400 sm:hidden">{g.taxa_resposta}%</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                          {g.abordados >= minimo && (
                            <div className="hidden sm:block mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${g.taxa_resposta}%` }} /></div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {linhas.length > 0 && visao !== 'segmento' && grupos.some(g => g.nome === 'Sem estado' || g.nome === 'Sem cidade') && (
                  <p className="mt-2 text-xs text-slate-400">“Sem estado/cidade”: leads salvos antes desta versão ganham o estado na próxima vez que o sistema sincronizar Meus Leads.</p>
                )}
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
};
