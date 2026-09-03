import React from 'react';
import { LessieTableView } from './LessieTableView';
import { useApp } from '../context/AppContext';
import { Download } from 'lucide-react';
import type { LeadItem } from '../types';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function leadsToCSV(leads: LeadItem[]): string {
  const headers = [
    'Nome', 'Empresa', 'Cargo', 'Nicho', 'Localização', 'Cidade',
    'Email', 'Telefone', 'WhatsApp', 'Website', 'Instagram', 'LinkedIn',
    'Facebook', 'Score', 'Status', 'Pipeline', 'Resumo IA'
  ];

  const rows = leads.map(l => [
    l.name,
    l.company,
    l.role,
    l.niche,
    l.location,
    l.city,
    l.email,
    l.phone,
    l.whatsapp ? 'Sim' : 'Não',
    l.website || l.socials?.website || '',
    l.socials?.instagram || '',
    l.socials?.linkedin || '',
    l.socials?.facebook || '',
    String(l.opportunityScore || l.quality_score || 0),
    l.outreach_status || 'Pendente',
    l.pipeline_stage || 'Novos',
    (l.ai_summary || '').replace(/[\n\r]/g, ' ')
  ]);

  const escapeCSV = (val: string) => `"${val.replace(/"/g, '""')}"`;
  
  return [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');
}

function leadsToTSV(leads: LeadItem[]): string {
  const headers = [
    'Nome', 'Empresa', 'Cargo', 'Nicho', 'Localização', 'Cidade',
    'Email', 'Telefone', 'WhatsApp', 'Website', 'Instagram', 'LinkedIn',
    'Facebook', 'Score', 'Status', 'Pipeline', 'Resumo IA'
  ];

  const rows = leads.map(l => [
    l.name,
    l.company,
    l.role,
    l.niche,
    l.location,
    l.city,
    l.email,
    l.phone,
    l.whatsapp ? 'Sim' : 'Não',
    l.website || l.socials?.website || '',
    l.socials?.instagram || '',
    l.socials?.linkedin || '',
    l.socials?.facebook || '',
    String(l.opportunityScore || l.quality_score || 0),
    l.outreach_status || 'Pendente',
    l.pipeline_stage || 'Novos',
    (l.ai_summary || '').replace(/[\n\r\t]/g, ' ')
  ]);

  return [
    headers.join('\t'),
    ...rows.map(row => row.join('\t'))
  ].join('\n');
}

export const SplitViewWorkspace: React.FC = () => {
  const { leads } = useApp() as any;

  const handleExportCSV = () => {
    if (leads.length === 0) return alert('Nenhum lead para exportar.');
    const csv = leadsToCSV(leads);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(csv, `leadsage_leads_${date}.csv`, 'text/csv');
  };

  const handleExportExcel = () => {
    if (leads.length === 0) return alert('Nenhum lead para exportar.');
    const tsv = leadsToTSV(leads);
    const date = new Date().toISOString().split('T')[0];
    downloadFile(tsv, `leadsage_leads_${date}.xls`, 'application/vnd.ms-excel');
  };

  return (
    <div className="w-full flex-1 flex flex-col h-[calc(100vh-8rem)]">
      
      {/* Title Area */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Meus Leads</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Gerencie e filtre todos os leads encontrados. <span className="text-blue-600 font-bold">{leads.length} leads</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            disabled={isLoading || leads.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button 
            onClick={handleExportExcel}
            disabled={isLoading || leads.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-600 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative">
        {isLoading ? (
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 animate-pulse">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Buscando oportunidades no Google Maps...</h3>
            <p className="text-slate-500 text-center max-w-md">
              A inteligência artificial está varrendo a região, coletando dados de empresas, contatos e analisando a presença digital de cada uma. Isso pode levar alguns segundos.
            </p>
            <div className="w-full max-w-2xl mt-10 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-16 w-full bg-slate-100 rounded-xl"></div>
              ))}
            </div>
          </div>
        ) : (
          <LessieTableView />
        )}
      </div>
      
    </div>
  );
};
