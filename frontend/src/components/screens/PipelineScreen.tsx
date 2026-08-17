import React from 'react';
import { useApp } from '../../context/AppContext';
import type { LeadItem } from '../../types';
import { GripVertical, Phone, MessageCircle } from 'lucide-react';

const COLUMNS = [
  { key: 'Novo Lead', color: 'bg-blue-600' },
  { key: 'Contato Enviado', color: 'bg-indigo-600' },
  { key: 'Respondeu', color: 'bg-purple-600' },
  { key: 'Reunião', color: 'bg-amber-500' },
  { key: 'Proposta', color: 'bg-fuchsia-600' },
  { key: 'Fechado', color: 'bg-emerald-600' },
];

const getScoreLabel = (score: number | undefined) => {
  if (!score || score === 0) return { text: 'Baixa (0)', color: 'text-slate-500 bg-slate-100 border-slate-200' };
  if (score < 40) return { text: `Baixa (${score})`, color: 'text-slate-500 bg-slate-100 border-slate-200' };
  if (score < 70) return { text: `Média (${score})`, color: 'text-amber-700 bg-amber-50 border-amber-200' };
  return { text: `Alta (${score})`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
};

export const PipelineScreen: React.FC = () => {
  const { leads, updateLeadStage, setSelectedProfileLead } = useApp() as any;

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
    <div className="flex-1 overflow-x-auto overflow-y-hidden p-2 h-full custom-scrollbar">
      <div className="mb-6 px-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Pipeline de Vendas</h1>
        <p className="text-slate-500 text-sm mt-1">Arraste os cards para mover leads entre etapas.</p>
      </div>

      <div className="flex gap-4 items-start min-w-max pb-8 h-[calc(100vh-200px)]">
        {COLUMNS.map(column => {
          const columnLeads = leads.filter((l: LeadItem) => (l.pipeline_stage || 'Novo Lead') === column.key);
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
                      className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <GripVertical className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
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
