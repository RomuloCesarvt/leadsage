// O histórico próprio: a reserva do chat quando a leitura da página do WhatsApp Web falha.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { comLimite, criarHistorico, tratarChat } from './leadsage-conector.mjs';

const msg = (id, texto, minha, quando) => ({ id, texto, minha, quando, tipo: 'text', midia: false, status: 1 });
const CHAT = '5514998003784@c.us';

test('guarda e lista conversas, da mais recente para a mais antiga', () => {
  const h = criarHistorico('');
  h.registrar({ chatId: CHAT, nome: 'Ana', mensagem: msg('1', 'Oi', false, 100) });
  h.registrar({ chatId: '5514911112222@c.us', nome: 'Bia', mensagem: msg('2', 'Olá', false, 200) });
  h.registrar({ chatId: CHAT, mensagem: msg('3', 'Tudo bem?', true, 300) });
  const lista = h.chats(10);
  assert.deepEqual(lista.map((c) => c.id), [CHAT, '5514911112222@c.us']);
  assert.equal(lista[0].nome, 'Ana');                       // o nome vem de quem escreveu, nao de quem recebeu
  assert.equal(lista[0].telefone, '5514998003784');
  assert.deepEqual(lista[0].ultima, { texto: 'Tudo bem?', minha: true });
  assert.equal(lista[0].naoLidas, 1);                       // so a recebida conta
  assert.equal(lista[0].mensagens, undefined);              // a lista nao carrega as mensagens
});

test('mensagens em ordem, sem repetir o aviso duplicado do WhatsApp', () => {
  const h = criarHistorico('');
  h.registrar({ chatId: CHAT, mensagem: msg('2', 'segunda', false, 200) });
  h.registrar({ chatId: CHAT, mensagem: msg('1', 'primeira', true, 100) });
  h.registrar({ chatId: CHAT, mensagem: msg('1', 'primeira', true, 100) });
  assert.deepEqual(h.mensagens(CHAT, 10).map((m) => m.texto), ['primeira', 'segunda']);
  assert.deepEqual(h.mensagens(CHAT, 1).map((m) => m.texto), ['segunda']);
  assert.deepEqual(h.mensagens('naoexiste@c.us'), []);
});

test('marcar como lida zera as nao lidas; os limites seguram o tamanho', () => {
  const h = criarHistorico('', { maxMensagens: 3, maxChats: 2 });
  for (let i = 1; i <= 5; i++) h.registrar({ chatId: CHAT, mensagem: msg(`m${i}`, `t${i}`, false, i) });
  assert.equal(h.mensagens(CHAT, 100).length, 3);
  assert.equal(h.chats()[0].naoLidas, 5);
  h.lida(CHAT);
  assert.equal(h.chats()[0].naoLidas, 0);
  h.registrar({ chatId: 'a@c.us', mensagem: msg('a', 'a', false, 1000) });
  h.registrar({ chatId: 'b@c.us', mensagem: msg('b', 'b', false, 2000) });
  assert.equal(h.chats(10).length, 2);                      // o mais antigo saiu
});

test('sobrevive a reiniciar o Conector', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'hist-'));
  const arquivo = join(pasta, 'historico.json');
  const a = criarHistorico(arquivo);
  a.registrar({ chatId: CHAT, nome: 'Ana', mensagem: msg('1', 'Oi', false, 100) });
  await new Promise((r) => setTimeout(r, 2300)); // o salvamento espera 2 s para juntar escritas
  assert.ok(JSON.parse(await readFile(arquivo, 'utf8')).chats[CHAT]);
  const b = criarHistorico(arquivo);
  await b.carregar();
  assert.equal(b.chats()[0].nome, 'Ana');
});

test('arquivo corrompido nao derruba: comeca vazio', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'hist-'));
  const arquivo = join(pasta, 'historico.json');
  await import('node:fs/promises').then((f) => f.writeFile(arquivo, '{isso nao e json'));
  const h = criarHistorico(arquivo);
  await h.carregar();
  assert.deepEqual(h.chats(), []);
});

test('a rota do chat devolve de onde veio a lista e tem rota de diagnostico', async () => {
  const wa = { chats: async () => [{ id: CHAT }], diagnostico: () => ({ fonteChats: 'historico', erros: { chatsPagina: 'r' } }) };
  const q = new URLSearchParams();
  const r = await tratarChat(wa, 'GET', '/chats', q);
  assert.equal(r.json.fonte, 'historico');
  const d = await tratarChat(wa, 'GET', '/diagnostico', q);
  assert.equal(d.json.erros.chatsPagina, 'r');
});

test('uma leitura que nao responde estoura o tempo em vez de travar', async () => {
  await assert.rejects(() => comLimite(new Promise(() => {}), 30, 'O WhatsApp'), /demorou demais/);
  assert.equal(await comLimite(Promise.resolve(7), 30), 7);
});
