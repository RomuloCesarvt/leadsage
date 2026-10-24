import { ehSalvo } from '../../lib/leadsSalvos';
import React from 'react';
import { useApp } from '../../context/AppContext';
import type { LeadItem } from '../../types';
import { GripVertical, Phone, MessageCircle, Bot, RefreshCw, UserRound, Check, ChevronDown, Trash2 } from 'lucide-react';
import { AvisoReguaConcluida } from '../AvisoReguaConcluida';
import { acoesDoCard, agenteDe, AGENTES_PADRAO, etiquetasDoCard, haQuanto, type Tom } from '../../lib/cardPipeline';
import { rolarNasBordas, useArrastarParaRolar } from '../../lib/arrastarParaRolar';

const COLUMNS = [
  { key: 'Novo Lead', color: 'bg-blue-600' },
  { key: 'Contato Enviado', color: 'bg-indigo-600' },
  { key: 'Respondeu', color: 'bg-purple-600' },
  { key: 'Qualificado', color: 'bg-cyan-600' },
  { key: 'Reunião', color: 'bg-amber-500' },
  { key: 'Proposta', color: 'bg-fuchsia-600' },
  { key: 'Fechado', color: 'bg-emerald-600' },
  { key: 'Perdido', color: 'bg-slate-500' },
];

// Etapas de antes do pipeline ir para o servidor ("Novos" era o padrao do
// banco): sem este mapa o card nao cai em nenhuma coluna e some do quadro.
const ETAPA_ANTIGA: Record<string, string> = { Novos: 'Novo Lead', Novo: 'Novo Lead', Contato: 'Contato Enviado' };
const etapaDe = (l: LeadItem) => {
  const e = l.pipeline_stage || 'Novo Lead';
  const normal = ETAPA_ANTIGA[e] || e;
  return COLUMNS.some(c => c.key === normal) ? normal : 'Novo Lead';
};

const TOM_DA_ETIQUETA: Record<Tom, string> = {
  neutro: 'bg-slate-100 text-slate-600 border-slate-200',
  azul: 'bg-blue-50 text-blue-700 border-blue-200',
  verde: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ambar: 'bg-amber-50 text-amber-700 border-amber-200',
  roxo: 'bg-purple-50 text-purple-700 border-purple-200',
};

const getScoreLabel = (score: number | undefined) => {
  if (!score || score === 0) return { text: 'Baixa (0)', color: 'text-slate-500 bg-slate-100 border-slate-200' };
  if (score < 40) return { text: `Baixa (${score})`, color: 'text-slate-500 bg-slate-100 border-slate-200' };
  if (score < 70) return { text: `Média (${score})`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
  return { text: `Alta (${score})`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
};

export const PipelineScreen: React.FC = () => {
  const { leads, updateLeadStage, setSelectedProfileLead, atualizarPipeline, definirAgente, removerLeads } = useApp() as any;
  // Excluir o lead: ele sai de Meus Leads e do pipeline, e o servidor cancela o que ainda ia sair para ele (fila e seguimentos)
  const excluirLead = async (lead: LeadItem) => {
    if (!window.confirm(`Excluir ${lead.company || lead.name}? O lead sai de Meus Leads e do pipeline, e nada mais será enviado para ele (mensagens na fila e seguimentos agendados são cancelados).`)) return;
    await removerLeads([lead.id]);
  };
  const [atualizando, setAtualizando] = React.useState(false);
  // cartão com o seletor de agente aberto
  const [agenteAberto, setAgenteAberto] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!agenteAberto) return;
    const fechar = () => setAgenteAberto(null);
    window.addEventListener('click', fechar);
    return () => window.removeEventListener('click', fechar);
  }, [agenteAberto]);

  const onDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // o quadro é largo: dá para segurar o fundo e puxar para os lados, e a barra de baixo é grossa; arrastando um cartão, as bordas rolam sozinhas
  const quadro = React.useRef<HTMLDivElement>(null);
  useArrastarParaRolar(quadro);

  const onDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId) {
      updateLeadStage(leadId, stage);
    }
  };

  return (
    <div ref={quadro} onDragOver={(e) => rolarNasBordas(quadro.current, e.clientX)}
      className="quadro-arrastavel flex-1 overflow-x-auto overflow-y-hidden pb-2 h-full barra-grande" title="Segure o fundo e puxe para os lados">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Pipeline de Vendas</h1>
          <p className="text-slate-500 text-sm mt-1">
            Arraste os cards para mover leads entre etapas. Quando o robô conversa, ele move o card sozinho
            (<Bot className="w-3.5 h-3.5 inline -mt-0.5 text-blue-600" /> mostra o motivo), mas nunca volta uma etapa que você avançou.
          </p>
        </div>
        <button
          onClick={async () => { setAtualizando(true); await atualizarPipeline(); setAtualizando(false); }}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${atualizando ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      <AvisoReguaConcluida />

      <div className="flex gap-4 items-start min-w-max pb-8 h-[calc(100vh-200px)]">
        {COLUMNS.map(column => {
          const columnLeads = leads.filter((l: LeadItem) => ehSalvo(l) && etapaDe(l) === column.key);
          return (
            <div 
              key={column.key}
              className="flex flex-col w-[300px] bg-slate-50 rounded-2xl border border-slate-200 h-full"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, column.key)}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-200 bg-white rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${column.color}`}></span>
                  <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">{column.key}</h3>
                </div>
                <span className={`${column.color} text-white text-xs px-2.5 py-0.5 rounded-full font-bold`}>
                  {columnLeads.length}
                </span>
              </div>
              
              {/* Column Body */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                {columnLeads.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-sm font-medium">
                    Sem leads
                  </div>
                )}
                {columnLeads.map((lead: LeadItem) => {
                  const scoreInfo = getScoreLabel(lead.opportunityScore);
                  const etiquetas = etiquetasDoCard(lead);
                  const acoes = acoesDoCard(lead);
                  const agente = agenteDe(lead);
                  const eu = agente.id === 'humano';
                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, lead.id)}
                      onClick={() => setSelectedProfileLead(lead)}
                      className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all group relative"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <GripVertical className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity absolute left-1 top-4" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-800 truncate leading-tight mb-0.5">
                            {lead.company}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{lead.niche} · {lead.location?.split(',')[0] || 'Brasil'}</p>
                        </div>
                      </div>

                      {etiquetas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3" data-testid="etiquetas">
                          {etiquetas.map(t => (
                            <span key={t.texto} title={t.dica} className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${TOM_DA_ETIQUETA[t.tom]}`}>
                              {t.texto}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${scoreInfo.color}`}>
                          {scoreInfo.text}
                        </span>
                      </div>

                      {lead.pipeline_motivo && (
                        <p className="mt-2.5 text-[11px] text-slate-500 flex items-start gap-1.5 leading-snug">
                          {lead.pipeline_por === 'robô'
                            ? <Bot className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            : <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                          <span>{lead.pipeline_motivo}{lead.pipeline_em ? ` · ${haQuanto(lead.pipeline_em)}` : ''}</span>
                        </p>
                      )}

                      {/* Quem atende + ações rápidas: nada aqui abre o perfil do lead */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            type="button" title="Gerenciar agente: quem atende este lead" data-testid="agente"
                            onClick={e => { e.stopPropagation(); setAgenteAberto(agenteAberto === lead.id ? null : lead.id); }}
                            className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border transition-colors ${eu ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'} hover:brightness-95`}
                          >
                            {eu ? <UserRound className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                            {agente.rotulo}
                            <ChevronDown className="w-3 h-3 opacity-60" />
                          </button>
                          {agenteAberto === lead.id && (
                            <div className="absolute left-0 bottom-full mb-1 z-20 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5" role="menu">
                              {AGENTES_PADRAO.map(a => (
                                <button
                                  key={a.id} type="button" role="menuitemradio" aria-checked={a.id === agente.id}
                                  onClick={() => { setAgenteAberto(null); if (a.id !== agente.id) void definirAgente(lead.id, a.id); }}
                                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 flex items-start gap-2"
                                >
                                  <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${a.id === agente.id ? 'text-blue-600' : 'text-transparent'}`} />
                                  <span>
                                    <span className="block text-xs font-bold text-slate-800">{a.rotulo}</span>
                                    <span className="block text-[11px] text-slate-500 leading-snug">{a.descricao}</span>
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex-1" />
                        {acoes.map(a => (
                          <a
                            key={a.id} href={a.href} target={a.id === 'whatsapp' ? '_blank' : undefined} rel="noreferrer"
                            title={a.id === 'whatsapp' ? 'Abrir a conversa no WhatsApp' : 'Ligar'}
                            className={`p-1.5 rounded-lg border transition-colors ${a.id === 'whatsapp' ? 'border-emerald-200 text-emerald-600 hover:bg-emerald-50' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                          >
                            {a.id === 'whatsapp' ? <MessageCircle className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
                          </a>
                        ))}
                        <button
                          type="button" data-testid="excluir-lead" title="Excluir este lead: ele sai e nada mais é enviado para ele"
                          onClick={e => { e.stopPropagation(); void excluirLead(lead); }}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
