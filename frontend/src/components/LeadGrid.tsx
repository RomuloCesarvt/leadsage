import React, { useState } from 'react';
import { 
  Grid, 
  List, 
  Send, 
  Search, 
  Users, 
  CheckSquare, 
  Square
} from 'lucide-react';
import { LeadCard } from './LeadCard';
import { useApp } from '../context/AppContext';

export const LeadGrid: React.FC = () => {
  const { leads, isLoading, currentNiche, currentLocation, setSelectedLeadForMessage } = useApp();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map(l => l.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <p className="text-sm font-medium text-slate-300 animate-pulse">
          Prospectando e enriquecendo dados de {currentNiche} em {currentLocation}...
        </p>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="w-full py-16 glass-panel rounded-2xl border border-slate-800 text-center p-8">
        <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-200">Nenhum lead carregado ainda</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
          Utilize a barra de busca acima ou selecione um dos nichos sugeridos para iniciar a captura de contatos qualificados.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            Leads Encontrados ({filteredLeads.length})
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              100% Enriquecidos
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Nicho: <strong className="text-slate-200">{currentNiche}</strong> • Região: <strong className="text-slate-200">{currentLocation}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por nome/empresa..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
          </div>

          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs transition-colors ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Visualização em Grade"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs transition-colors ${viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 text-center">
                    <button onClick={toggleSelectAll}>
                      {selectedLeadIds.length === filteredLeads.length ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </th>
                  <th className="p-3.5">Profissional / Empresa</th>
                  <th className="p-3.5">Contato</th>
                  <th className="p-3.5">Localidade</th>
                  <th className="p-3.5">Score</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5 text-center">
                      <button onClick={() => toggleSelectLead(lead.id)}>
                        {selectedLeadIds.includes(lead.id) ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <img src={lead.avatar} alt={lead.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        <div>
                          <div className="font-bold text-slate-100">{lead.name}</div>
                          <div className="text-[11px] text-indigo-400">{lead.role} • {lead.company}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px]">
                      <div>{lead.email}</div>
                      <div className="text-slate-400">{lead.phone}</div>
                    </td>
                    <td className="p-3.5 text-slate-300 font-medium">{lead.location}</td>
                    <td className="p-3.5 font-bold text-emerald-400">{lead.quality_score}%</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-medium">
                        {lead.outreach_status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedLeadForMessage(lead)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 ml-auto"
                      >
                        <Send className="w-3 h-3" /> Disparar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
