import React, { useState } from 'react';
import { X, Mail, Check, Server, Key, Globe } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const IntegrationsModal: React.FC = () => {
  const { isIntegrationsModalOpen, setIsIntegrationsModalOpen } = useApp();

  const [activeTab, setActiveTab] = useState<'smtp' | 'snov' | 'webhook'>('smtp');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('seu-email@gmail.com');
  const [snovApiKey, setSnovApiKey] = useState('snov_live_839210491823901283');
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.zapier.com/hooks/catch/12345/abcde/');
  const [isSaved, setIsSaved] = useState(false);

  if (!isIntegrationsModalOpen) return null;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setIsIntegrationsModalOpen(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Mail className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Canais de Disparo & Integrações</h3>
              <p className="text-xs text-slate-400">Configure SMTP próprio, Snov.io API ou Webhooks de envio</p>
            </div>
          </div>
          <button onClick={() => setIsIntegrationsModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('smtp')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'smtp'
                ? 'border-emerald-400 text-emerald-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" /> SMTP Personalizado
          </button>
          <button
            onClick={() => setActiveTab('snov')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'snov'
                ? 'border-indigo-400 text-indigo-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" /> API Snov.io / Outreach
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'webhook'
                ? 'border-purple-400 text-purple-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Webhook / Zapier
          </button>
        </div>

        <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
          {activeTab === 'smtp' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Host SMTP</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Porta</label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Usuário / E-mail Remetente</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Senha de App / API Key</label>
                <input
                  type="password"
                  value="••••••••••••••••"
                  readOnly
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-400 font-mono"
                />
              </div>
            </div>
          )}

          {activeTab === 'snov' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Chave de API Snov.io / Outreach Hub</label>
                <input
                  type="text"
                  value={snovApiKey}
                  onChange={(e) => setSnovApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Permite verificar caixas de e-mail ativas e sincronizar sequências de cold mail automaticamente.
              </p>
            </div>
          )}

          {activeTab === 'webhook' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">URL do Webhook (Zapier / Make / n8n)</label>
                <input
                  type="text"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Cada novo disparo direto enviará o payload JSON completo para a sua automação externa.
              </p>
            </div>
          )}

          {isSaved && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <Check className="w-4 h-4" /> Configurações salvas com sucesso!
            </div>
          )}

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsIntegrationsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Fechar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
            >
              <Check className="w-4 h-4" /> Salvar Integração
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
