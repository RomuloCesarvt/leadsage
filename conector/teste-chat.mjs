// O chat do Conector (lista de conversas, mensagens, envio) com um WhatsApp de mentira.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chatPermitido, origensPermitidas, resumoDaMensagem, resumoDoChat, tratarChat } from './leadsage-conector.mjs';

const chat = (id, extra = {}) => ({ id: { _serialized: id, user: id.split('@')[0] }, name: 'Ana', isGroup: false, unreadCount: 2, timestamp: 1760000100,
  lastMessage: { body: 'Quanto custa?', fromMe: false, type: 'chat', timestamp: 1760000100 }, ...extra });

test('resumo de um chat de pessoa', () => {
  const r = resumoDoChat(chat('5514998003784@c.us'));
  assert.deepEqual(r, { id: '5514998003784@c.us', nome: 'Ana', grupo: false, telefone: '5514998003784', naoLidas: 2, quando: 1760000100,
    ultima: { texto: 'Quanto custa?', minha: false } });
});

test('grupo nao tem telefone e midia ganha rotulo', () => {
  const g = resumoDoChat(chat('1203630@g.us', { isGroup: true, name: 'Família', lastMessage: { body: '', type: 'image', fromMe: true } }));
  assert.equal(g.grupo, true);
  assert.equal(g.telefone, '');
  assert.deepEqual(g.ultima, { texto: '[imagem]', minha: true });
});

test('chat sem nome usa o numero', () => {
  assert.equal(resumoDoChat(chat('5514911112222@c.us', { name: '' })).nome, '5514911112222');
});

test('resumo da mensagem', () => {
  const m = resumoDaMensagem({ id: { _serialized: 'true_55@c.us_ABC' }, body: ' Oi ', fromMe: true, timestamp: 1760000200, type: 'chat', ack: 3, hasMedia: false });
  assert.deepEqual(m, { id: 'true_55@c.us_ABC', texto: 'Oi', minha: true, quando: 1760000200, tipo: 'text', midia: false, miniatura: '', status: 3 });
  assert.equal(resumoDaMensagem({ id: { id: 'x' }, body: '', type: 'ptt', hasMedia: true, timestamp: 1 }).texto, '[áudio]');
});

function falso() {
  const chamadas = [];
  return {
    chamadas,
    chats: async (l) => { chamadas.push(['chats', l]); return [{ id: '1@c.us' }]; },
    mensagens: async (id, l) => { chamadas.push(['mensagens', id, l]); return [{ id: 'm1', texto: 'Oi' }]; },
    enviarNoChat: async (id, t) => { chamadas.push(['enviar', id, t]); return { id: 'm2', texto: t }; },
    lida: async (id) => { chamadas.push(['lida', id]); },
  };
}

test('rotas do chat', async () => {
  const wa = falso();
  const q = (s = '') => new URLSearchParams(s);
  assert.deepEqual((await tratarChat(wa, 'GET', '/chats', q('limite=500'))).json.chats, [{ id: '1@c.us' }]);
  assert.deepEqual(wa.chamadas[0], ['chats', 100]); // teto de 100
  const m = await tratarChat(wa, 'GET', '/chats/5514998003784%40c.us/mensagens', q('limite=30'));
  assert.equal(m.status, 200);
  assert.deepEqual(wa.chamadas[1], ['mensagens', '5514998003784@c.us', 30]);
  const e = await tratarChat(wa, 'POST', '/chats/5514998003784%40c.us/enviar', q(), { texto: '  Posso ligar?  ' });
  assert.equal(e.json.mensagem.texto, 'Posso ligar?');
  assert.equal((await tratarChat(wa, 'POST', '/chats/5514998003784%40c.us/lida', q(), {})).status, 200);
});

test('recusa chat invalido, mensagem vazia e rota desconhecida', async () => {
  const wa = falso();
  const q = new URLSearchParams();
  assert.equal((await tratarChat(wa, 'GET', '/chats/../etc/mensagens', q)).status, 400);
  assert.equal((await tratarChat(wa, 'GET', '/chats/abc/mensagens', q)).status, 400);
  assert.equal((await tratarChat(wa, 'POST', '/chats/5514998003784%40c.us/enviar', q, { texto: '   ' })).status, 400);
  assert.equal((await tratarChat(wa, 'DELETE', '/chats/5514998003784%40c.us/x', q)).status, 404);
  assert.equal(wa.chamadas.length, 0);
});

test('sem WhatsApp conectado, 503; erro do WhatsApp, 502', async () => {
  assert.equal((await tratarChat(null, 'GET', '/chats', new URLSearchParams())).status, 503);
  const quebrado = { chats: async () => { throw new Error('Evaluation failed'); } };
  const r = await tratarChat(quebrado, 'GET', '/chats', new URLSearchParams());
  assert.equal(r.status, 502);
  assert.match(r.json.erro, /Evaluation failed/);
});

test('so o LeadSage e a pagina local acessam o chat', () => {
  const ok = origensPermitidas('https://leadsageofc.vercel.app');
  assert.ok(chatPermitido('https://leadsageofc.vercel.app', '127.0.0.1:2790', ok));
  assert.ok(!chatPermitido('https://site-malicioso.test', '127.0.0.1:2790', ok));
  assert.ok(chatPermitido('', '127.0.0.1:2790', ok));       // a propria pagina local
  assert.ok(!chatPermitido('', 'rebind.exemplo.com:2790', ok)); // DNS rebinding
});

test('miniatura em base64 nao vira texto: legenda nas midias, miniatura a parte', async () => {
  const { pareceBase64, textoDaMensagem } = await import('./leadsage-conector.mjs');
  const thumb = '/9j/2wCEABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ' + 'A'.repeat(200);
  assert.ok(pareceBase64(thumb));
  assert.ok(!pareceBase64('Oi, tudo bem? Quanto custa o site de vocês?'));
  assert.equal(textoDaMensagem('image', thumb, 'Olha o logo'), 'Olha o logo');
  assert.equal(textoDaMensagem('image', thumb, ''), '');
  assert.equal(textoDaMensagem('chat', 'Oi!', ''), 'Oi!');
  assert.equal(textoDaMensagem('chat', thumb, ''), ''); // corpo "de texto" que e so base64 tambem some
  const m = resumoDaMensagem({ id: { _serialized: 'x' }, type: 'image', body: thumb, caption: '', fromMe: false, timestamp: 1, hasMedia: true });
  assert.equal(m.texto, '[imagem]');
  assert.ok(m.miniatura.startsWith('data:image/jpeg;base64,/9j/'));
  const t = resumoDaMensagem({ id: { _serialized: 'y' }, type: 'chat', body: 'Oi', fromMe: true, timestamp: 2 });
  assert.equal(t.miniatura, '');
  const c = resumoDoChat({ id: { _serialized: '5514998003784@c.us', user: '5514998003784' }, name: 'Ana', lastMessage: { type: 'image', body: thumb, caption: '', fromMe: false } });
  assert.equal(c.ultima.texto, '[imagem]');
});
