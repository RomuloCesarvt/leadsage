import React from 'react';
import { X, Download, FileSpreadsheet, FileJson } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ExportModal: React.FC = () => {
  const { isExportModalOpen, setIsExportModalOpen, leads, currentNiche, currentLocation } = useApp();

  if (!isExportModalOpen) return null;

  const exportToCSV = () => {
    const headers = ["Nome", "Cargo", "Nicho", "Empresa", "Cidade", "E-mail", "Telefone", "LinkedIn", "Instagram", "Website", "Score", "Status"];
    const rows = leads.map(l => [
      `"${l.name}"`,
      `"${l.role}"`,
      `"${l.niche}"`,
      `"${l.company}"`,
      `"${l.location}"`,
      `"${l.email}"`,
      `"${l.phone}"`,
      `"${l.socials.linkedin || ''}"`,
      `"${l.socials.instagram || ''}"`,
      `"${l.socials.website || ''}"`,
      l.quality_score,
      `"${l.outreach_status}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `leads_${currentNiche.toLowerCase()}_${currentLocation.split(',')[0].toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExportModalOpen(false);
  };

  const exportToJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(leads, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `leads_${currentNiche.toLowerCase()}_${currentLocation.split(',')[0].toLowerCase()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setIsExportModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Download className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Exportar Leads ({leads.length})</h3>
              <p className="text-xs text-slate-400">{currentNiche} em {currentLocation}</p>
            </div>
          </div>
          <button onClick={() => setIsExportModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-300">
            Selecione o formato para baixar todos os contatos com telefones, e-mails, links de redes e score de qualidade:
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={exportToCSV}
              className="p-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500 text-left transition-all flex flex-col items-center justify-center text-center gap-2 group"
            >
              <FileSpreadsheet className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-100">Planilha CSV</span>
              <span className="text-[10px] text-slate-400">Compatível com Excel & Google Sheets</span>
            </button>

            <button
              onClick={exportToJSON}
              className="p-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500 text-left transition-all flex flex-col items-center justify-center text-center gap-2 group"
            >
              <FileJson className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-slate-100">Arquivo JSON</span>
              <span className="text-[10px] text-slate-400">Para integrações & APIs</span>
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={() => setIsExportModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
