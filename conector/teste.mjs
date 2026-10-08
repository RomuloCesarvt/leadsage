// Testes do Conector com um OpenWA e um LeadSage de mentira (nada toca o WhatsApp).
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  atrasoHumano, clienteLeadsage, clienteOpenwa, enviarPendentes, lerConfig, lerEEntregar,
  paraLeadsage, telefoneDoChat,
} from './leadsage-conector.mjs';

function servidor(rotas) {
  return new Promise((resolve) => {
    const chamadas = [];
    const s = http.createServer((req, res) => {
      let corpo = '';
      req.on('data', (d) => (corpo += d));
      req.on('end', () => {
        const caminho = req.url.split('?')[0];
        chamadas.push({ metodo: req.method, caminho, url: req.url, corpo: corpo ? JSON.parse(corpo) : null, cab: req.headers });
        const r = rotas[`${req.method} ${caminho}`] || (() => ({ status: 404, corpo: {} }));
        const { status = 200, corpo: c = {} } = typeof r === 'function' ? r(corpo ? JSON.parse(corpo) : null, req) : r;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(c));
      });
    });
    s.listen(0, '127.0.0.1', () => resolve({ s, chamadas, url: `http://127.0.0.1:${s.address().port}` }));
  });
}

const CHAVE = 'lsc_' + 'a'.repeat(40);

test('configuracao exige as duas chaves', () => {
  assert.equal(lerConfig({}).faltando.length, 2);
  assert.equal(lerConfig({ LEADSAGE_KEY: 'curta', OPENWA_KEY: 'x' }).faltando.length, 1);
  assert.equal(lerConfig({ LEADSAGE_KEY: CHAVE, OPENWA_KEY: 'x' }).faltando.length, 0);
});

test('so conversa individual vira contato', () => {
  assert.equal(telefoneDoChat('5514998003784@c.us'), '5514998003784');
  assert.equal(telefoneDoChat('120363025@g.us'), '');
  assert.equal(telefoneDoChat('status@broadcast'), '');
  assert.equal(telefoneDoChat('abc@c.us'), '');
});

test('midia sem texto vira rotulo e vazio some', () => {
  assert.equal(paraLeadsage({ id: 'a', body: 'Oi', type: 'text' }, '5514998003784').texto, 'Oi');
  assert.equal(paraLeadsage({ id: 'a', body: '', type: 'image' }, '5514998003784').texto, '[imagem]');
  assert.equal(paraLeadsage({ id: 'a', body: '  ', type: 'text' }, '5514998003784'), null);
  assert.equal(paraLeadsage({ id: 'a', body: 'Oi' }, ''), null);
});

test('atraso humano nunca e instantaneo', () => {
  assert.ok(atrasoHumano(0, () => 0) >= 600);
  assert.ok(atrasoHumano(3000, () => 1) <= 4000);
});

test('entrega so mensagens novas, uma vez, e ignora grupos', async () => {
  const entregues = [];
  const owa = await servidor({
    'GET /api/sessions/S1/messages': () => ({ corpo: { messages: [
      { id: 'u2', waMessageId: 'W2', chatId: '5514998003784@c.us', body: 'Quanto custa?', type: 'text', timestamp: 1760000020, chatName: 'Ana' },
      { id: 'u1', waMessageId: 'W1', chatId: '5514998003784@c.us', body: 'Oi', type: 'text', timestamp: 1760000010 },
      { id: 'u3', waMessageId: 'W3', chatId: '1203630@g.us', body: 'oi grupo', type: 'text', timestamp: 1760000030 },
    ] } }),
  });
  const ls = await servidor({ 'POST /api/conector/mensagem': (c) => { entregues.push(c); return { corpo: { ok: true } }; } });
  const c = { leadsageUrl: ls.url, chave: CHAVE, openwaUrl: owa.url, openwaKey: 'k' };
  const estado = { desde: 0, vistos: [] };
  const n = await lerEEntregar(clienteOpenwa(c), clienteLeadsage(c), 'S1', estado, () => {});
  assert.equal(n, 2);
  assert.deepEqual(entregues.map((e) => e.texto), ['Oi', 'Quanto custa?']); // em ordem
  assert.equal(entregues[1].nome, 'Ana');
  assert.equal(owa.chamadas[0].cab['x-api-key'], 'k');
  assert.equal(ls.chamadas[0].cab['x-conector-key'], CHAVE);
  // de novo: nada se repete
  assert.equal(await lerEEntregar(clienteOpenwa(c), clienteLeadsage(c), 'S1', estado, () => {}), 0);
  assert.equal(entregues.length, 2);
  owa.s.close(); ls.s.close();
});

test('mensagem que o LeadSage nao recebeu e tentada de novo', async () => {
  let falhar = true;
  const owa = await servidor({ 'GET /api/sessions/S1/messages': () => ({ corpo: { messages: [
    { id: 'u1', waMessageId: 'W1', chatId: '5514998003784@c.us', body: 'Oi', type: 'text', timestamp: 1760000010 }] } }) });
  const ls = await servidor({ 'POST /api/conector/mensagem': () => (falhar ? { status: 503, corpo: {} } : { corpo: { ok: true } }) });
  const c = { leadsageUrl: ls.url, chave: CHAVE, openwaUrl: owa.url, openwaKey: 'k' };
  const estado = { desde: 0, vistos: [] };
  assert.equal(await lerEEntregar(clienteOpenwa(c), clienteLeadsage(c), 'S1', estado, () => {}), 0);
  falhar = false;
  assert.equal(await lerEEntregar(clienteOpenwa(c), clienteLeadsage(c), 'S1', estado, () => {}), 1);
  owa.s.close(); ls.s.close();
});

test('envia as tarefas, avisa o resultado e relata falha', async () => {
  const enviados = [];
  const owa = await servidor({
    'POST /api/sessions/S1/messages/send-text': (c) => {
      enviados.push(c);
      return c.chatId.startsWith('5511') ? { status: 400, corpo: { message: 'numero fora do WhatsApp' } } : { corpo: { ok: true } };
    },
  });
  const ls = await servidor({
    'GET /api/conector/tarefas': () => ({ corpo: { proxima_em: 4, tarefas: [
      { id: 's_1', tipo: 'resposta', contato: '5514998003784', texto: 'Posso te ligar amanhã?', digitando_ms: 0 },
      { id: 'fila:f_L1', tipo: 'abordagem', contato: '5511999990000', texto: 'Oi!', digitando_ms: 0 },
    ] } }),
    'POST /api/conector/tarefas/s_1/resultado': () => ({ corpo: { ok: true } }),
    'POST /api/conector/tarefas/fila%3Af_L1/resultado': () => ({ corpo: { ok: true } }),
  });
  const c = { leadsageUrl: ls.url, chave: CHAVE, openwaUrl: owa.url, openwaKey: 'k' };
  const semEspera = async () => {};
  const r = await enviarPendentes(clienteOpenwa(c), clienteLeadsage(c), 'S1', () => {}, semEspera);
  assert.deepEqual(r, { enviadas: 1, proximaEm: 4 });
  assert.equal(enviados[0].chatId, '5514998003784@c.us');
  const resultados = ls.chamadas.filter((x) => x.caminho.endsWith('/resultado'));
  assert.deepEqual(resultados.map((x) => x.corpo.ok), [true, false]);
  assert.match(resultados[1].corpo.erro, /fora do WhatsApp/);
  owa.s.close(); ls.s.close();
});

test('chave revogada derruba o conector com mensagem clara', async () => {
  const ls = await servidor({ 'GET /api/conector/tarefas': () => ({ status: 401, corpo: {} }) });
  const c = { leadsageUrl: ls.url, chave: CHAVE, openwaUrl: 'http://x', openwaKey: 'k' };
  await assert.rejects(() => enviarPendentes(clienteOpenwa(c), clienteLeadsage(c), 'S1', () => {}, async () => {}), /revogada/);
  ls.s.close();
});
