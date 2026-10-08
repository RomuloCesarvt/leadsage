// Testes do Conector com um LeadSage e um WhatsApp de mentira (nada toca o WhatsApp de verdade).
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  acharNavegador, atrasoHumano, chaveValida, clienteLeadsage, entregarMensagem, enviarPendentes,
  gravarConfig, lerConfig, paraLeadsage,
} from './leadsage-conector.mjs';

function servidor(rotas) {
  return new Promise((resolve) => {
    const chamadas = [];
    const s = http.createServer((req, res) => {
      let corpo = '';
      req.on('data', (d) => (corpo += d));
      req.on('end', () => {
        const caminho = req.url.split('?')[0];
        chamadas.push({ metodo: req.method, caminho, corpo: corpo ? JSON.parse(corpo) : null, cab: req.headers });
        const r = rotas[`${req.method} ${caminho}`] || (() => ({ status: 404, corpo: {} }));
        const { status = 200, corpo: c = {} } = typeof r === 'function' ? r(corpo ? JSON.parse(corpo) : null) : r;
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(c));
      });
    });
    s.listen(0, '127.0.0.1', () => resolve({ s, chamadas, url: `http://127.0.0.1:${s.address().port}` }));
  });
}

const CHAVE = 'lsc_' + 'a'.repeat(40);
const semEspera = async () => {};

test('a chave precisa ter o formato do LeadSage', () => {
  assert.ok(chaveValida(CHAVE));
  assert.ok(!chaveValida('curta'));
  assert.ok(!chaveValida('xyz_' + 'a'.repeat(40)));
  assert.ok(!chaveValida(''));
});

test('config: grava e le a chave, com o site padrao', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'cs-'));
  const arquivo = join(pasta, 'config.json');
  const vazia = await lerConfig(arquivo, {});
  assert.equal(vazia.chave, '');
  assert.equal(vazia.site, 'https://leadsageofc.vercel.app');
  await gravarConfig({ arquivo, chave: CHAVE, site: 'https://exemplo.test' });
  assert.equal(JSON.parse(await readFile(arquivo, 'utf8')).chave, CHAVE);
  assert.equal((await lerConfig(arquivo, {})).site, 'https://exemplo.test');
  assert.equal((await lerConfig(arquivo, { LEADSAGE_KEY: 'lsc_' + 'b'.repeat(40) })).chave, 'lsc_' + 'b'.repeat(40));
});

test('so conversa individual com telefone vira mensagem', () => {
  const base = { id: 'A1', de: '5514998003784', nome: 'Ana', texto: 'Oi', tipo: 'text', grupo: false, minha: false, momento: 1760000100 };
  assert.equal(paraLeadsage(base).texto, 'Oi');
  assert.equal(paraLeadsage({ ...base, grupo: true }), null);
  assert.equal(paraLeadsage({ ...base, minha: true }), null);
  assert.equal(paraLeadsage({ ...base, de: 'abc' }), null);
  assert.equal(paraLeadsage({ ...base, texto: '   ', tipo: 'text' }), null);
  assert.equal(paraLeadsage({ ...base, texto: '', tipo: 'image' }).texto, '[imagem]');
  assert.equal(paraLeadsage({ ...base, texto: '', tipo: 'ptt' }).texto, '[áudio]');
});

test('conversa antiga, de antes de ligar, e ignorada', () => {
  const m = { id: 'A1', de: '5514998003784', texto: 'Oi', tipo: 'text', momento: 1760000000 };
  assert.equal(paraLeadsage(m, 1760000500), null);
  assert.ok(paraLeadsage({ ...m, momento: 1760000495 }, 1760000500));
});

test('atraso humano nunca e instantaneo e tem teto', () => {
  assert.ok(atrasoHumano(0, () => 0) >= 600);
  assert.ok(atrasoHumano(3000, () => 1) <= 4200);
});

test('entrega uma vez so, e tenta de novo se o LeadSage nao recebeu', async () => {
  let falhar = true;
  const entregues = [];
  const ls = await servidor({ 'POST /api/conector/mensagem': (c) => {
    if (falhar) return { status: 503, corpo: {} };
    entregues.push(c);
    return { corpo: { ok: true } };
  } });
  const cli = clienteLeadsage({ site: ls.url, chave: CHAVE });
  const vistos = new Set();
  const m = { id: 'A1', de: '5514998003784', nome: 'Ana', texto: 'Quanto custa?', tipo: 'text', momento: 1760000100 };
  assert.equal(await entregarMensagem(cli, m, 0, vistos, () => {}), false); // falhou: nao marca como vista
  falhar = false;
  assert.equal(await entregarMensagem(cli, m, 0, vistos, () => {}), true);
  assert.equal(await entregarMensagem(cli, m, 0, vistos, () => {}), false); // repetida
  assert.equal(entregues.length, 1);
  assert.equal(entregues[0].texto, 'Quanto custa?');
  assert.equal(ls.chamadas[0].cab['x-conector-key'], CHAVE);
  ls.s.close();
});

test('envia as tarefas, avisa o resultado e relata falha', async () => {
  const ls = await servidor({
    'GET /api/conector/tarefas': () => ({ corpo: { proxima_em: 4, motivo_sem_frio: '', tarefas: [
      { id: 's_1', tipo: 'resposta', contato: '5514998003784', texto: 'Posso te ligar amanhã?', digitando_ms: 1500 },
      { id: 'fila:f_L1', tipo: 'abordagem', contato: '5511999990000', texto: 'Oi!', digitando_ms: 1200 },
    ] } }),
    'POST /api/conector/tarefas/s_1/resultado': () => ({ corpo: { ok: true } }),
    'POST /api/conector/tarefas/fila%3Af_L1/resultado': () => ({ corpo: { ok: true } }),
  });
  const enviados = [];
  const wa = {
    enviar: async (tel, texto, digitando) => {
      enviados.push({ tel, texto, digitando });
      return tel.startsWith('5511') ? { ok: false, erro: 'esse número não está no WhatsApp' } : { ok: true };
    },
  };
  const r = await enviarPendentes(clienteLeadsage({ site: ls.url, chave: CHAVE }), wa, () => {}, semEspera);
  assert.deepEqual(r, { enviadas: 1, proximaEm: 4 });
  assert.equal(enviados[0].tel, '5514998003784');
  assert.ok(enviados[0].digitando >= 800);
  const resultados = ls.chamadas.filter((x) => x.caminho.endsWith('/resultado'));
  assert.deepEqual(resultados.map((x) => x.corpo.ok), [true, false]);
  assert.match(resultados[1].corpo.erro, /não está no WhatsApp/);
  ls.s.close();
});

test('chave revogada derruba o conector com mensagem clara', async () => {
  const ls = await servidor({ 'GET /api/conector/tarefas': () => ({ status: 401, corpo: {} }) });
  const cli = clienteLeadsage({ site: ls.url, chave: CHAVE });
  await assert.rejects(() => enviarPendentes(cli, { enviar: async () => ({ ok: true }) }, () => {}, semEspera), /revogada/);
  ls.s.close();
});

test('LeadSage fora do ar nao derruba: tenta de novo mais tarde', async () => {
  const cli = clienteLeadsage({ site: 'http://127.0.0.1:9', chave: CHAVE });
  const r = await enviarPendentes(cli, { enviar: async () => ({ ok: true }) }, () => {}, semEspera);
  assert.deepEqual(r, { enviadas: 0, proximaEm: 30 });
});

test('acha o Edge ou o Chrome instalado', () => {
  const env = { 'ProgramFiles(x86)': 'C:/Program Files (x86)', ProgramFiles: 'C:/Program Files', LOCALAPPDATA: 'C:/Users/x/AppData/Local' };
  const so = (alvo) => (p) => p === alvo;
  assert.match(acharNavegador(so('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'), 'win32', env), /msedge/);
  assert.match(acharNavegador(so('C:/Program Files/Google/Chrome/Application/chrome.exe'), 'win32', env), /chrome/);
  assert.equal(acharNavegador(() => false, 'win32', env), '');
  assert.match(acharNavegador(so('/usr/bin/chromium'), 'linux', {}), /chromium/);
});
