import { ehSalvo } from '../../lib/leadsSalvos';
import React from 'react';
import { useApp } from '../../context/AppContext';
import type { LeadItem } from '../../types';
import { GripVertical, Phone, MessageCircle, Bot, RefreshCw } from 'lucide-react';

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

const haQuanto = (iso?: string) => {
  if (!iso) return '';
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  if (min < 1440) return `há ${Math.round(min / 60)} h`;
  return `há ${Math.round(min / 1440)} d`;
};

const getScoreLabel = (score: number | undefined) => {
  if (!score || score === 0) return { text: 'Baixa (0)', color: 'text-slate-500 bg-slate-100 border-slate-200' };
  if (score < 40) return { text: `Baixa (${score})`, color: 'text-slate-500 bg-slate-100 border-slate-200' };
  if (score < 70) return { text: `Média (${score})`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
  return { text: `Alta (${score})`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
};

export const PipelineScreen: React.FC = () => {
  const { leads, updateLeadStage, setSelectedProfileLead, atualizarPipeline } = useApp() as any;
  const [atualizando, setAtualizando] = React.useState(false);

  const onDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData("leadId", leadId);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (leadId) {
      updateLeadStage(leadId, stage);
    }
  };

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2 h-full custom-scrollbar">
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

                      {/* WhatsApp badge */}
                      {lead.whatsapp && (
                        <div className="flex items-center gap-1.5 mb-3">
                          <MessageCircle className="w-3 h-3 text-emerald-500" />
                          <span className="text-[11px] font-bold text-emerald-600">WhatsApp disponível</span>
                        </div>
                      )}
                      {!lead.whatsapp && lead.phone && (
                        <div className="flex items-center gap-1.5 mb-3">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="text-[11px] text-slate-400">Telefone</span>
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
