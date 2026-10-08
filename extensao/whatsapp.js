// Botão "Sugerir resposta" dentro do WhatsApp Web.
//
// Modo ASSISTIDO: a extensão lê a conversa, pede a resposta ao LeadSage e a coloca
// na caixa de mensagem. Quem aperta Enter é você. Ela nunca envia sozinha: é o que
// mantém o uso parecido com o de uma pessoa e o número mais seguro.
(function () {
  const { lerMensagens, telefoneDoTitulo, SELETORES } = window.LeadSageConversa;
  let botao;

  function aviso(texto, erro) {
    let el = document.getElementById('leadsage-aviso');
    if (!el) {
      el = document.createElement('div');
      el.id = 'leadsage-aviso';
      el.style.cssText =
        'position:fixed;right:16px;bottom:140px;z-index:99999;max-width:280px;padding:10px 12px;border-radius:10px;font:13px system-ui;box-shadow:0 6px 24px rgba(0,0,0,.2)';
      document.body.appendChild(el);
    }
    el.style.background = erro ? '#fee2e2' : '#ecfdf5';
    el.style.color = erro ? '#991b1b' : '#065f46';
    el.textContent = texto;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.remove(), 6000);
  }

  function colocarNaCaixa(texto) {
    const caixa = document.querySelector(SELETORES.caixa);
    if (!caixa) return false;
    caixa.focus();
    document.execCommand('selectAll', false);
    document.execCommand('insertText', false, texto);
    return true;
  }

  async function sugerir() {
    const mensagens = lerMensagens(document, 20);
    if (!mensagens.length) return aviso('Não achei mensagens nesta conversa.', true);
    if (mensagens[mensagens.length - 1].de !== 'contato') {
      return aviso('A última mensagem é sua: não há o que responder.', true);
    }
    botao.disabled = true;
    botao.textContent = 'Escrevendo…';
    try {
      const r = await chrome.runtime.sendMessage({
        tipo: 'sugerir',
        mensagens,
        telefone: telefoneDoTitulo(document),
      });
      if (!r || !r.ok) return aviso((r && r.erro) || 'O LeadSage não respondeu.', true);
      const textos = r.dados.mensagens || [];
      if (!textos.length) return aviso(r.dados.motivo || 'O robô não sugeriu resposta.', true);
      if (r.dados.optout) return aviso('A pessoa pediu para sair. Não envie mais nada.', true);
      colocarNaCaixa(textos.join('\n'));
      aviso(
        r.dados.passar_para_humano
          ? 'Resposta pronta. O robô sugere que VOCÊ assuma esta conversa.'
          : 'Resposta pronta. Revise e aperte Enter.',
      );
    } finally {
      botao.disabled = false;
      botao.textContent = '✨ Sugerir resposta';
    }
  }

  async function iniciar() {
    const { ativa } = await chrome.storage.local.get('ativa');
    if (!ativa) return; // desligada por padrão: o popup liga
    botao = document.createElement('button');
    botao.textContent = '✨ Sugerir resposta';
    botao.style.cssText =
      'position:fixed;right:16px;bottom:90px;z-index:99999;padding:10px 14px;border:0;border-radius:999px;background:#4f46e5;color:#fff;font:600 13px system-ui;box-shadow:0 6px 24px rgba(79,70,229,.45);cursor:pointer';
    botao.onclick = sugerir;
    document.body.appendChild(botao);
  }

  iniciar();
})();
