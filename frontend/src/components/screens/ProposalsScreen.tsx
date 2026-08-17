import React, { useState } from 'react';
import { FileText, Plus, Search, Eye, Send, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface Proposal {
  id: string;
  clientName: string;
  projectName: string;
  value: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  date: string;
}

const mockProposals: Proposal[] = [
  { id: '1', clientName: 'Clínica Sorriso Saudável', projectName: 'Site Institucional + SEO', value: 'R$ 3.500', status: 'sent', date: '15 Ago 2026' },
  { id: '2', clientName: 'Dr. Marcos - Cardiologia', projectName: 'Landing Page Captação', value: 'R$ 1.800', status: 'accepted', date: '10 Ago 2026' },
  { id: '3', clientName: 'Farmácia Central', projectName: 'E-commerce Delivery', value: 'R$ 5.200', status: 'draft', date: '17 Ago 2026' },
];

export const ProposalsScreen: React.FC = () => {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusBadge = (status: Proposal['status']) => {
    switch (status) {
      case 'accepted':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-bold"><CheckCircle2 className="w-3.5 h-3.5" /> Aceita</span>;
      case 'rejected':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold"><XCircle className="w-3.5 h-3.5" /> Recusada</span>;
      case 'sent':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200 text-xs font-bold"><Send className="w-3.5 h-3.5" /> Enviada</span>;
      case 'draft':
      default:
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold"><Clock className="w-3.5 h-3.5" /> Rascunho</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Propostas Comerciais</h1>
          <p className="text-slate-500 text-sm mt-1">Gere contratos e orçamentos profissionais para seus leads.</p>
        </div>
        <button 
          onClick={() => setIsNewModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          Nova Proposta
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-t-xl border border-slate-200 border-b-0 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou projeto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white border border-slate-200 rounded-b-xl overflow-auto custom-scrollbar relative">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
              <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Projeto</th>
              <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
              <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
              <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockProposals.map((prop) => (
              <tr key={prop.id} className="hover:bg-slate-50 transition-colors group">
                <td className="py-4 px-6 text-sm font-semibold text-slate-800">{prop.clientName}</td>
                <td className="py-4 px-6 text-sm text-slate-600">{prop.projectName}</td>
                <td className="py-4 px-6 text-sm font-medium text-slate-700">{prop.value}</td>
                <td className="py-4 px-6 text-sm text-slate-500">{prop.date}</td>
                <td className="py-4 px-6">{getStatusBadge(prop.status)}</td>
                <td className="py-4 px-6 text-right">
                  <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Ver Proposta">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Proposal Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Criar Nova Proposta
              </h2>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Selecionar Lead (Cliente)</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                  <option value="">Selecione um lead da sua base...</option>
                  <option value="1">Clínica Sorriso Saudável</option>
                  <option value="2">Dr. Marcos - Cardiologia</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nome do Projeto</label>
                  <input type="text" placeholder="Ex: Criação de Landing Page" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Valor Total (R$)</label>
                  <input type="text" placeholder="Ex: 2.500,00" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Escopo Resumido</label>
                <textarea 
                  rows={4} 
                  placeholder="Descreva o que está incluso nesta proposta..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                ></textarea>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-800">Template Inteligente</h4>
                  <p className="text-xs text-amber-700 mt-1">Nossa IA irá formatar este escopo em um contrato formal com cláusulas padrão, pronto para envio e assinatura digital.</p>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Gerar Contrato IA
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
