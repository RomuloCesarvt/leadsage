import React, { useState } from 'react';
import { Mail, Plus, Search, BarChart3, Users, Clock, Send, FileText, CheckCircle2, XCircle } from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  targetList: string;
  sentCount: number;
  openRate: string;
  status: 'draft' | 'running' | 'completed';
  date: string;
}

const mockCampaigns: Campaign[] = [
  { id: '1', name: 'Prospecção Médicos SP', targetList: 'Médicos (142 leads)', sentCount: 142, openRate: '45%', status: 'completed', date: '16 Ago 2026' },
  { id: '2', name: 'Follow-up Clínicas Odonto', targetList: 'Odontologia (89 leads)', sentCount: 89, openRate: '62%', status: 'completed', date: '12 Ago 2026' },
  { id: '3', name: 'Campanha de Fim de Mês', targetList: 'Todos os nichos (450 leads)', sentCount: 120, openRate: '15%', status: 'running', date: '17 Ago 2026' },
];

export const EmailsScreen: React.FC = () => {
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'completed':
        return <span className="flex items-center w-fit gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 text-[11px] uppercase font-black"><CheckCircle2 className="w-3.5 h-3.5" /> Concluída</span>;
      case 'running':
        return <span className="flex items-center w-fit gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200 text-[11px] uppercase font-black"><Send className="w-3.5 h-3.5 animate-pulse" /> Rodando</span>;
      case 'draft':
      default:
        return <span className="flex items-center w-fit gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[11px] uppercase font-black"><Clock className="w-3.5 h-3.5" /> Rascunho</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full relative">
      
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">Campanhas de E-mail</h1>
          <p className="text-slate-500 text-sm mt-1">Crie sequências de prospecção e acompanhe as taxas de abertura.</p>
        </div>
        <button 
          onClick={() => setIsNewModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors w-fit"
        >
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">E-mails Enviados</p>
            <p className="text-2xl font-black text-slate-800">351</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Taxa Média de Abertura</p>
            <p className="text-2xl font-black text-slate-800">41%</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">Respostas Positivas</p>
            <p className="text-2xl font-black text-slate-800">18</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-t-xl border border-slate-200 border-b-0 flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar campanha..." 
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
              <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome da Campanha</th>
              <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Lista / Público</th>
              <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Enviados</th>
              <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Abertura</th>
              <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Data</th>
              <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockCampaigns.map((camp) => (
              <tr key={camp.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                <td className="py-4 px-6 text-sm font-bold text-slate-800">{camp.name}</td>
                <td className="py-4 px-6 text-sm text-slate-600 flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" /> {camp.targetList}</td>
                <td className="py-4 px-6 text-sm font-semibold text-slate-700">{camp.sentCount}</td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: camp.openRate }}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-600">{camp.openRate}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-slate-500">{camp.date}</td>
                <td className="py-4 px-6">{getStatusBadge(camp.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Campaign Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Nova Campanha de Prospecção
              </h2>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Campanha</label>
                  <input type="text" placeholder="Ex: Prospecção Julho..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Selecionar Lista de Leads</label>
                  <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                    <option value="">Selecione uma lista salva...</option>
                    <option value="1">Todos os Médicos (142)</option>
                    <option value="2">Agências de Marketing (56)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">1</div>
                  <h3 className="font-bold text-slate-800">E-mail Inicial</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Assunto</label>
                    <input type="text" placeholder="Sugestão IA: Temos uma proposta para {nome_empresa}" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center justify-between">
                      Corpo do E-mail
                      <button className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline">
                        <FileText className="w-3.5 h-3.5" /> Usar Template de Alta Conversão
                      </button>
                    </label>
                    <textarea 
                      rows={8} 
                      placeholder="Olá {nome_lead},\n\nEstive analisando o site da {nome_empresa} e percebi que..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-mono"
                    ></textarea>
                  </div>
                </div>
              </div>

              <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold text-sm hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Adicionar E-mail de Follow-up (+2 dias)
              </button>

            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Salvar Rascunho
              </button>
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Iniciar Disparo
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
