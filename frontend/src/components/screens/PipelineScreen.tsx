import React from 'react';
import { useApp } from '../../context/AppContext';
import type { LeadItem } from '../../types';
import { GripVertical } from 'lucide-react';

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
    <div className="flex-1 overflow-x-auto overflow-y-hidden bg-[#000000] p-6 h-full custom-scrollbar">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Pipeline de Vendas</h1>
        <p className="text-zinc-400 text-sm mt-1">Gerencie suas oportunidades de negócio em um funil visual. Arraste os cards para atualizar o status.</p>
      </div>

      <div className="flex gap-6 items-start min-w-max pb-8 h-[calc(100vh-200px)]">
        {COLUMNS.map(column => {
          const columnLeads = leads.filter((l: LeadItem) => (l.pipeline_stage || 'Novos') === column);
          return (
            <div 
              key={column}
              className="flex flex-col w-80 bg-zinc-900/30 rounded-xl border border-[#18181b] h-full"
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, column)}
            >
              <div className="p-4 border-b border-[#18181b] bg-[#050505] rounded-t-xl flex items-center justify-between">
                <h3 className="font-semibold text-zinc-200 text-sm">{column}</h3>
                <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full font-mono">
                  {columnLeads.length}
                </span>
              </div>
              
              <div className="flex-1 p-3 overflow-y-auto space-y-3 custom-scrollbar">
                {columnLeads.map((lead: LeadItem) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, lead.id)}
                    onClick={() => setSelectedProfileLead(lead)}
                    className="bg-zinc-950/80 border border-zinc-800/80 p-3.5 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-zinc-600 transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <GripVertical className="w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-200 truncate">{lead.company}</p>
                          <p className="text-xs text-zinc-500 truncate mt-0.5">{lead.name}</p>
                        </div>
                      </div>
                      {lead.opportunityScore && (
                        <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                          {lead.opportunityScore} pts
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <div className="text-[11px] font-medium text-zinc-500 bg-zinc-900 px-2 py-1 rounded truncate max-w-full">
                        {lead.niche}
                      </div>
                      {lead.missingDigitalAssets && lead.missingDigitalAssets.length > 0 && (
                        <div className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-1 rounded flex items-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse"></span>
                          {lead.missingDigitalAssets.length} Deficiências
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
