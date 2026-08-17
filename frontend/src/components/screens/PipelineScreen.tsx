import React from 'react';
import { useApp } from '../../context/AppContext';
import type { LeadItem } from '../../types';
import { GripVertical, Building2 } from 'lucide-react';

const COLUMNS = ['Novos', 'Contatados', 'Reunião Agendada', 'Proposta', 'Fechado'];

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
        <p className="text-slate-500 text-sm mt-1">Gerencie suas oportunidades de negócio. Arraste os cards para atualizar o status.</p>
      </div>

      <div className="flex gap-4 items-start min-w-max pb-8 h-[calc(100vh-200px)]">
        {COLUMNS.map(column => {
          const columnLeads = leads.filter((l: LeadItem) => (l.pipeline_stage || 'Novos') === column);
          return (
            <div 
              key={column}
              className="flex flex-col w-[320px] bg-slate-100/50 rounded-2xl border border-slate-200 h-full"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, column)}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-100 rounded-t-2xl flex items-center justify-between">
                <h3 className="font-bold text-slate-700 text-sm">{column}</h3>
                <span className="bg-white text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold shadow-sm border border-slate-200">
                  {columnLeads.length}
                </span>
              </div>
              
              {/* Column Body */}
              <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                {columnLeads.map((lead: LeadItem) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, lead.id)}
                    onClick={() => setSelectedProfileLead(lead)}
                    className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <GripVertical className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate leading-tight flex items-center gap-1.5 mb-1">
                            {lead.company}
                          </p>
                          <p className="text-xs font-semibold text-slate-500 truncate">{lead.name}</p>
                        </div>
                      </div>
                      {lead.opportunityScore && (
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded shrink-0">
                          {lead.opportunityScore}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide bg-slate-100 px-2 py-1 rounded truncate max-w-full">
                        {lead.niche}
                      </div>
                      {lead.missingDigitalAssets && lead.missingDigitalAssets.length > 0 && (
                        <div className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-1 rounded border border-rose-100 flex items-center shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse"></span>
                          {lead.missingDigitalAssets.length} Faltas
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
