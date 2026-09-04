import React, { useState, useEffect } from 'react';
import { X, Mail, Check, Server, Key, Globe, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const IntegrationsModal: React.FC = () => {
  const { isIntegrationsModalOpen, setIsIntegrationsModalOpen } = useApp();

  const [activeTab, setActiveTab] = useState<'smtp' | 'whatsapp' | 'webhook'>('smtp');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [waPhoneId, setWaPhoneId] = useState('');
  const [waToken, setWaToken] = useState('');
  const [waTemplate, setWaTemplate] = useState('');
  const [hasWaToken, setHasWaToken] = useState(false);
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Carrega a configuração real. Antes os campos abriam com valores
  // fictícios e o formulário não gravava nada em lugar nenhum.
  useEffect(() => {
    if (!isIntegrationsModalOpen) return;
    let active = true;
    setSaveError('');
    setSmtpPassword('');
    setWaToken('');
    setResultadoTeste(null);
    api.getIntegrations().then(cfg => {
      if (!active) return;
      setSmtpHost(cfg.smtp_host || '');
      setSmtpPort(String(cfg.smtp_port || 587));
      setSmtpUser(cfg.smtp_user || '');
      setWebhookUrl(cfg.webhook_url || '');
      setHasPassword(Boolean(cfg.has_password));
      setWaPhoneId(cfg.wa_phone_id || '');
      setWaTemplate(cfg.wa_template || '');
      setHasWaToken(Boolean(cfg.has_wa_token));
    });
    return () => { active = false; };
  }, [isIntegrationsModalOpen]);

  const testarCredenciais = async () => {
    setTestando(true);
    setResultadoTeste(null);
    setSaveError('');
    try {
      // Salva antes: o teste roda no backend, com o que está gravado.
      await api.saveIntegrations({ wa_phone_id: waPhoneId, wa_token: waToken, wa_template: waTemplate });
      setWaToken('');
      setHasWaToken(true);
      const r = await api.testarWhatsapp();
      setResultadoTeste(`Conectado: ${r.nome || 'conta verificada'} · ${r.numero}${r.qualidade ? ` · qualidade ${r.qualidade}` : ''}`);
    } catch (err: any) {
      setSaveError(err?.message || 'Não foi possível validar as credenciais.');
    } finally {
      setTestando(false);
    }
  };

  if (!isIntegrationsModalOpen) return null;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError('');
    try {
      await api.saveIntegrations({
        smtp_host: smtpHost,
        smtp_port: Number(smtpPort) || 587,
        smtp_user: smtpUser,
        // Em branco significa "manter a senha atual"
        smtp_password: smtpPassword,
        from_email: smtpUser,
        webhook_url: webhookUrl,
        wa_phone_id: waPhoneId,
        wa_token: waToken,
        wa_template: waTemplate,
      });
      setIsSaved(true);
      setTimeout(() => {
        setIsSaved(false);
        setIsIntegrationsModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setSaveError(err?.message || 'Não foi possível salvar.');
    } finally {
      setIsSaving(false);
    }
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
              <p className="text-xs text-slate-400">Configure SMTP, WhatsApp da Meta ou Webhook de envio</p>
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
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'whatsapp'
                ? 'border-indigo-400 text-indigo-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" /> WhatsApp (Meta)
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
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={hasPassword ? 'Senha salva — deixe em branco para manter' : 'Cole aqui a Senha de App'}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono placeholder-slate-600"
                />
                <p className="text-[11px] text-slate-400">
                  No Gmail é preciso uma Senha de App (a senha normal da conta é recusada).
                </p>
              </div>
            </div>
          )}

          {activeTab === 'whatsapp' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <p className="text-[11px] text-amber-300 leading-snug">
                  A Meta só permite <strong>iniciar</strong> conversa com template aprovado.
                  Mensagem livre chega apenas a quem te escreveu nas últimas 24h. Enviar
                  para quem não pediu contato viola a política e pode banir seu número.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Phone Number ID</label>
                <input
                  type="text"
                  value={waPhoneId}
                  onChange={(e) => setWaPhoneId(e.target.value)}
                  placeholder="Ex: 109876543210987"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono placeholder-slate-600"
                />
                <p className="text-[11px] text-slate-400">
                  Painel da Meta → WhatsApp → Configuração da API.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Token de acesso</label>
                <input
                  type="password"
                  value={waToken}
                  onChange={(e) => setWaToken(e.target.value)}
                  placeholder={hasWaToken ? 'Token salvo — deixe em branco para manter' : 'Cole o token permanente'}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono placeholder-slate-600"
                />
                <p className="text-[11px] text-slate-400">
                  Use um token permanente de usuário do sistema. O temporário expira em 24h.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Nome do template aprovado</label>
                <input
                  type="text"
                  value={waTemplate}
                  onChange={(e) => setWaTemplate(e.target.value)}
                  placeholder="Ex: primeiro_contato"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono placeholder-slate-600"
                />
              </div>

              <button
                type="button"
                onClick={testarCredenciais}
                disabled={testando || !waPhoneId}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700"
              >
                {testando
                  ? <><span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" /> Verificando...</>
                  : 'Testar credenciais'}
              </button>

              {resultadoTeste && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold flex items-center gap-2">
                  <Check className="w-3.5 h-3.5" /> {resultadoTeste}
                </div>
              )}
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

          {saveError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {saveError}
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
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/30"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Salvando...
                </>
              ) : (
                <><Check className="w-4 h-4" /> Salvar Integração</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
