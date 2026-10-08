// Lê a conversa aberta do WhatsApp Web e entende quem falou o quê.
// Separado do resto para ser testado sem navegador (ver teste.mjs).
//
// O WhatsApp Web muda o HTML de vez em quando. Os seletores abaixo são os únicos
// pontos que podem quebrar: se a extensão parar de achar mensagens, é aqui.

(function (raiz) {
  const SELETORES = {
    linhas: 'div[role="row"], div.message-in, div.message-out',
    texto: 'span.selectable-text, span[dir="ltr"]',
    caixa: 'footer div[contenteditable="true"][role="textbox"], footer div[contenteditable="true"]',
    titulo: 'header span[dir="auto"][title], header span[title]',
  };

  function quemFalou(linha) {
    const interno = linha.querySelector && linha.querySelector('[class*="message-"]');
    const c = (linha.className || '') + ' ' + ((interno && interno.className) || '');
    if (/message-out/.test(c)) return 'voce';
    if (/message-in/.test(c)) return 'contato';
    return '';
  }

  /** As últimas mensagens de texto da conversa aberta, na ordem, no formato do LeadSage. */
  function lerMensagens(doc, limite) {
    const saida = [];
    for (const linha of doc.querySelectorAll(SELETORES.linhas)) {
      const de = quemFalou(linha);
      if (!de) continue;
      const partes = [...linha.querySelectorAll(SELETORES.texto)]
        .map((n) => (n.textContent || '').trim())
        .filter(Boolean);
      const texto = partes.join('\n').trim();
      if (texto) saida.push({ de, texto });
    }
    return saida.slice(-(limite || 20));
  }

  /** O telefone vem do título quando o contato não está salvo (aparece como número). */
  function telefoneDoTitulo(doc) {
    const t = doc.querySelector(SELETORES.titulo);
    const digitos = ((t && (t.getAttribute('title') || t.textContent)) || '').replace(/\D/g, '');
    return digitos.length >= 10 && digitos.length <= 15 ? digitos : '';
  }

  const api = { lerMensagens, telefoneDoTitulo, SELETORES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.LeadSageConversa = api;
})(typeof window !== 'undefined' ? window : globalThis);
