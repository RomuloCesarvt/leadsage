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

import { versaoMenor, garantirBiblioteca, BIBLIOTECA_MINIMA } from './leadsage-conector.mjs';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('compara versões da biblioteca', () => {
  assert.ok(versaoMenor('1.34.7', '1.34.8') && versaoMenor('1.9.0', '1.34.8') && versaoMenor('', '1.34.8'));
  assert.ok(!versaoMenor('1.34.8', '1.34.8') && !versaoMenor('1.35.0', '1.34.8') && !versaoMenor('2.0.0', '1.34.8'));
  assert.equal(BIBLIOTECA_MINIMA, '1.34.8');
});

async function pastaCom(versao) {
  const pasta = await mkdtemp(join(tmpdir(), 'ls-lib-'));
  if (versao) {
    await mkdir(join(pasta, 'node_modules', 'whatsapp-web.js'), { recursive: true });
    await writeFile(join(pasta, 'node_modules', 'whatsapp-web.js', 'package.json'), JSON.stringify({ version: versao }));
  }
  return pasta;
}

test('biblioteca quebrada (1.34.7) é atualizada sozinha ao abrir o Conector', async () => {
  const pasta = await pastaCom('1.34.7');
  const comandos = [];
  const r = await garantirBiblioteca({
    pasta, aviso: () => {},
    executar: async (cmd) => { comandos.push(cmd); await writeFile(join(pasta, 'node_modules', 'whatsapp-web.js', 'package.json'), JSON.stringify({ version: '1.34.8' })); },
  });
  assert.equal(comandos.length, 1);
  assert.match(comandos[0], /npm install whatsapp-web\.js@\^1\.34\.8/);
  assert.deepEqual([r.atualizou, r.versao], [true, '1.34.8']);
});

test('biblioteca em dia não roda npm; sem internet o Conector segue e avisa', async () => {
  let rodou = 0;
  const ok = await garantirBiblioteca({ pasta: await pastaCom('1.34.8'), aviso: () => {}, executar: async () => { rodou++; } });
  assert.deepEqual([ok.atualizou, rodou], [false, 0]);
  const mensagens = [];
  const falhou = await garantirBiblioteca({ pasta: await pastaCom('1.34.7'), aviso: (m) => mensagens.push(m), executar: async () => { throw new Error('sem internet'); } });
  assert.equal(falhou.atualizou, false);
  assert.match(mensagens.join(' '), /npm install whatsapp-web\.js@latest/);
});
