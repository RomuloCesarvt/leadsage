import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enviarTextoSeguro, ERRO_DE_PAGINA } from './leadsage-conector.mjs';

test('envio normal não pede o "visto" (foi isso que quebrou o WhatsApp Web)', async () => {
  let opcoes = null;
  const client = { sendMessage: async (_id, _t, o) => { opcoes = o; return { id: 'x' }; } };
  await enviarTextoSeguro(client, '5514999990000@c.us', 'oi');
  assert.deepEqual(opcoes, { sendSeen: false });
});

test('erro de página do WhatsApp Web ("Data passed to getter...") cai no envio pela própria página', async () => {
  let evaluate = 0;
  const client = {
    sendMessage: async () => { throw new Error("Data passed to getter must include an id property (it's how we memoize) but got undefined"); },
    pupPage: { evaluate: async () => { evaluate++; return true; } },
  };
  const r = await enviarTextoSeguro(client, '5514999990000@c.us', 'oi');
  assert.equal(evaluate, 1);
  assert.ok(r.id);
});

test('outro erro (número inexistente, conexão) não é mascarado', async () => {
  const client = { sendMessage: async () => { throw new Error('connection closed'); }, pupPage: { evaluate: async () => true } };
  await assert.rejects(() => enviarTextoSeguro(client, 'x@c.us', 'oi'), /connection closed/);
  assert.ok(ERRO_DE_PAGINA.test('Data passed to getter must include an id property'));
  assert.ok(!ERRO_DE_PAGINA.test('esse número não está no WhatsApp'));
});

test('se a página também falhar, o erro original sobe', async () => {
  const client = {
    sendMessage: async () => { throw new Error('Data passed to getter must include an id property'); },
    pupPage: { evaluate: async () => false },
  };
  await assert.rejects(() => enviarTextoSeguro(client, 'x@c.us', 'oi'), /Data passed to getter/);
});
