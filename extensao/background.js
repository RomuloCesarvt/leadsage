// Fala com o LeadSage. Fica aqui (e não na página) porque o WhatsApp Web não pode chamar
// outro domínio, e para a chave nunca passar pelo código da página.
chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
  if (msg.tipo !== 'sugerir') return false;
  (async () => {
    const { chave, url } = await chrome.storage.local.get(['chave', 'url']);
    if (!chave) return responder({ ok: false, erro: 'Cole a chave do LeadSage no ícone da extensão.' });
    try {
      const base = (url || 'https://leadsageofc.vercel.app').replace(/\/+$/, '');
      const r = await fetch(`${base}/api/conector/responder`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-conector-key': chave },
        body: JSON.stringify({ mensagens: msg.mensagens, telefone: msg.telefone || '' }),
      });
      const dados = await r.json().catch(() => ({}));
      if (!r.ok) return responder({ ok: false, erro: dados.detail || `Erro ${r.status}` });
      responder({ ok: true, dados });
    } catch {
      responder({ ok: false, erro: 'Sem conexão com o LeadSage.' });
    }
  })();
  return true; // resposta assíncrona
});
