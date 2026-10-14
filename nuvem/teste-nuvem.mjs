// Testes do serviço da nuvem (sem rede e sem WhatsApp de verdade).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  paraChatId, paraJid, lerConteudo, resumoBaileys, telefoneDoRemetente, desembrulhar,
} from './adaptador-baileys.mjs';
import { createHmac } from 'node:crypto';
import http from 'node:http';
import { criarGerente, criarApiChat, uidDoToken } from './servidor.mjs';

test('ids: o formato do Baileys vira o do Conector e volta', () => {
  assert.equal(paraChatId('5511999990000@s.whatsapp.net'), '5511999990000@c.us');
  assert.equal(paraChatId('5511999990000:12@s.whatsapp.net'), '5511999990000@c.us');
  assert.equal(paraChatId('120363@g.us'), '120363@g.us');
  assert.equal(paraChatId('128625865191513@lid'), '128625865191513@lid');
  assert.equal(paraJid('5511999990000@c.us'), '5511999990000@s.whatsapp.net');
  assert.equal(paraJid('128625865191513@lid'), '128625865191513@lid');
});

test('mensagens: texto, legenda de mídia e embrulhos', () => {
  assert.deepEqual(lerConteudo({ conversation: 'oi' }), { tipo: 'text', texto: 'oi' });
  assert.deepEqual(lerConteudo({ extendedTextMessage: { text: 'link aqui' } }), { tipo: 'text', texto: 'link aqui' });
  assert.deepEqual(lerConteudo({ imageMessage: { caption: 'minha foto' } }), { tipo: 'image', texto: 'minha foto' });
  assert.equal(lerConteudo({ audioMessage: { ptt: true } }).tipo, 'ptt');
  assert.deepEqual(lerConteudo({ ephemeralMessage: { message: { conversation: 'temporária' } } }), { tipo: 'text', texto: 'temporária' });
  assert.equal(lerConteudo({}).tipo, 'unknown');
  assert.deepEqual(desembrulhar(undefined), {});
});

test('resumo: mídia sem legenda ganha rótulo; minha e status', () => {
  const r = resumoBaileys({ key: { id: 'A1', fromMe: false }, message: { imageMessage: {} }, messageTimestamp: 1760000000 });
  assert.equal(r.texto, '[imagem]'); assert.equal(r.midia, true); assert.equal(r.minha, false); assert.equal(r.quando, 1760000000);
  const m = resumoBaileys({ key: { id: 'A2', fromMe: true }, message: { conversation: 'ola' }, messageTimestamp: { low: 1760000001 }, status: 4 });
  assert.equal(m.minha, true); assert.equal(m.status, 3); assert.equal(m.quando, 1760000001);
});

test('telefone: contato novo (@lid) usa o número que o WhatsApp mandou à parte', () => {
  assert.equal(telefoneDoRemetente({ remoteJid: '5511999990000@s.whatsapp.net' }), '5511999990000');
  assert.equal(telefoneDoRemetente({ remoteJid: '128625865191513@lid', remoteJidAlt: '5511964623668@s.whatsapp.net' }), '5511964623668');
  assert.equal(telefoneDoRemetente({ remoteJid: '128625865191513@lid' }), '128625865191513');
});

// ------------------------------------------------------------------ o gerente

function gerenteFalso(respostas) {
  const eventos = [];
  const sessoes = [];
  const antes = globalThis.fetch;
  globalThis.fetch = async () => {
    const r = respostas.shift();
    if (r === 'rede') throw new Error('sem rede');
    return { ok: r.ok ?? true, status: r.status ?? 200, json: async () => r.corpo };
  };
  const g = criarGerente({
    site: 'https://x.test', segredo: 's'.repeat(20), dados: '/tmp/x', aviso: (...a) => eventos.push(a.join(' ')),
    fabricaSessao: ({ uid, chave }) => {
      const s = { uid, chave, paradas: [], rodar: () => new Promise(() => {}), parar: async (o = {}) => { s.paradas.push(o); } };
      sessoes.push(s);
      return s;
    },
  });
  return { g, sessoes, eventos, restaurar: () => { globalThis.fetch = antes; } };
}

test('gerente: liga quem entrou na lista e não repete', async () => {
  const t = gerenteFalso([{ corpo: { sessoes: [{ uid: 'u1', chave: 'k1' }] } }, { corpo: { sessoes: [{ uid: 'u1', chave: 'k1' }] } }]);
  await t.g.sincronizar(); await t.g.sincronizar();
  assert.equal(t.sessoes.length, 1); assert.equal(t.g.total(), 1);
  t.restaurar();
});

test('gerente: sem resposta do LeadSage, ninguém é desligado', async () => {
  const t = gerenteFalso([{ corpo: { sessoes: [{ uid: 'u1', chave: 'k1' }] } }, 'rede', { ok: false, status: 503, corpo: {} }]);
  await t.g.sincronizar(); await t.g.sincronizar(); await t.g.sincronizar();
  assert.equal(t.g.total(), 1); assert.deepEqual(t.sessoes[0].paradas, []);
  t.restaurar();
});

test('gerente: sumir da lista (falha do banco) NÃO desconecta o WhatsApp, só para de atender aqui', async () => {
  const t = gerenteFalso([{ corpo: { sessoes: [{ uid: 'u1', chave: 'k1' }, { uid: 'u2', chave: 'k2' }] } }, { corpo: { sessoes: [{ uid: 'u2', chave: 'k2' }] } }]);
  await t.g.sincronizar(); await t.g.sincronizar();
  assert.equal(t.g.total(), 1);
  assert.deepEqual(t.sessoes[0].paradas, [{}]);      // parou de atender, sem sair do WhatsApp
  assert.deepEqual(t.sessoes[1].paradas, []);
  t.restaurar();
});

test('gerente: só quem pediu para desligar é desconectado, e o LeadSage é avisado', async () => {
  const t = gerenteFalso([{ corpo: { sessoes: [{ uid: 'u1', chave: 'k1' }, { uid: 'u2', chave: 'k2' }] } },
    { corpo: { sessoes: [{ uid: 'u2', chave: 'k2' }], desligar: ['u1'] } }, { corpo: { ok: true } }]);
  await t.g.sincronizar(); await t.g.sincronizar();
  assert.equal(t.g.total(), 1);
  assert.deepEqual(t.sessoes[0].paradas, [{ sair: true }]);
  assert.deepEqual(t.sessoes[1].paradas, []);
  t.restaurar();
});

test('gerente: quem pediu para desligar sem sessão ativa (reinício) é desconectado pela sessão guardada', async () => {
  const antes = globalThis.fetch;
  const chamadas = [];
  globalThis.fetch = async (url) => { chamadas.push(String(url)); return { ok: true, status: 200, json: async () => ({ sessoes: [], desligar: ['u9'] }) }; };
  const desconectados = [];
  const g = criarGerente({ site: 'https://x.test', segredo: 's'.repeat(20), dados: '/tmp/x', aviso: () => {}, desconectar: async (u) => desconectados.push(u), fabricaSessao: () => ({}) });
  await g.sincronizar();
  globalThis.fetch = antes;
  assert.deepEqual(desconectados, ['u9']);
  assert.ok(chamadas.some((c) => c.endsWith('/api/worker/desligadas/u9')));
});

test('gerente: chave nova recomeça a sessão sem desconectar o WhatsApp', async () => {
  const t = gerenteFalso([{ corpo: { sessoes: [{ uid: 'u1', chave: 'k1' }] } }, { corpo: { sessoes: [{ uid: 'u1', chave: 'k9' }] } }]);
  await t.g.sincronizar(); await t.g.sincronizar();
  assert.equal(t.sessoes.length, 2); assert.deepEqual(t.sessoes[0].paradas, [{}]);
  assert.equal(t.g.ativas.get('u1').chave, 'k9');
  t.restaurar();
});

// ------------------------------------------------------------------ uma sessão inteira

import { Sessao } from './servidor.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('sessão: conecta, avisa o LeadSage, envia a tarefa e atende pedido de código', async () => {
  const chamadas = [];
  const antes = globalThis.fetch;
  let entregue = false;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    const corpo = init?.body ? JSON.parse(init.body) : null;
    chamadas.push([u.split('/api/conector')[1], corpo]);
    const json = (o) => ({ ok: true, status: 200, text: async () => JSON.stringify(o) });
    if (u.endsWith('/ping')) return json({ ok: true, robo_ativo: true, remoto: false, abrir: [], parear: entregue ? '5514999019705' : '' });
    if (u.endsWith('/tarefas')) {
      const tarefas = entregue ? [] : [{ id: 't1', tipo: 'resposta', contato: '5511911112222', texto: 'Oi!', digitando_ms: 1000, chat_id: '5511911112222@c.us' }];
      entregue = true;
      return json({ tarefas, proxima_em: 1, remoto: false, abrir: [], parear: '5514999019705' });
    }
    return json({ ok: true });
  };
  const enviados = [];
  const ciclos = [];
  const fabrica = async (o) => {
    ciclos.push({ parear: o.parear });
    setTimeout(() => o.aoPronto(ciclos.length === 1 ? '5511900000000' : '5514999019705'), 20);
    return {
      enviar: async (c, t, ms, chat) => { enviados.push([c, t, chat]); return { ok: true }; },
      chats: async () => [], mensagens: async () => [], digitar() {}, parar: async () => {}, sair: async () => { ciclos.sairam = true; },
    };
  };
  const s = new Sessao({ uid: 'u1', chave: 'lsc_x', site: 'https://x.test', dados: mkdtempSync(join(tmpdir(), 'nv-')), aviso: () => {}, fabrica });
  const rodando = s.rodar();
  await new Promise((r) => setTimeout(r, 2500));
  await s.parar();
  await rodando;
  globalThis.fetch = antes;

  assert.deepEqual(enviados[0], ['5511911112222', 'Oi!', '5511911112222@c.us']);
  assert.ok(chamadas.some(([rota, b]) => rota === '/ping' && b.fase === 'pronto' && b.numero === '5511900000000'));
  assert.ok(chamadas.some(([rota]) => rota === '/tarefas/t1/resultado'));
  // pediram o código para outro número com um já conectado: NUNCA derruba o que está conectado
  assert.equal(ciclos.sairam, undefined);
  assert.equal(ciclos.length, 1);
});

// ------------------------------------------------------------------ sessão guardada no banco

import { authRemoto, cifrar, decifrar } from './auth-remoto.mjs';

function bancoFalso(inicial = '') {
  const b = { blob: inicial, puts: 0, deletes: 0, falhaLeitura: false };
  b.buscar = async (url, init = {}) => {
    const ok = (corpo) => ({ ok: true, status: 200, json: async () => corpo });
    if (init.method === 'PUT') { b.blob = JSON.parse(init.body).blob; b.puts++; return ok({ ok: true }); }
    if (init.method === 'DELETE') { b.blob = ''; b.deletes++; return ok({ ok: true }); }
    if (b.falhaLeitura) return { ok: false, status: 503, json: async () => ({}) };
    return ok({ blob: b.blob });
  };
  return b;
}

test('sessão guardada: cifra e decifra, e o texto cifrado não mostra o conteúdo', () => {
  const c = cifrar('credenciais secretas', 'segredo-1234567890123456');
  assert.ok(!c.includes('secretas'));
  assert.equal(decifrar(c, 'segredo-1234567890123456'), 'credenciais secretas');
  assert.throws(() => decifrar(c, 'outro-segredo-1234567890123'));
});

test('sessão guardada: sem nada no banco começa do zero; ao mudar, grava cifrado e volta igual', async () => {
  const b = bancoFalso('');
  const seg = 'segredo-1234567890123456';
  const a1 = await authRemoto({ site: 'https://x.test', segredo: seg, uid: 'u1', esperaMs: 10, buscar: b.buscar });
  assert.ok(a1.state.creds.noiseKey);                       // credenciais novas
  a1.state.creds.account = { details: 'x' };                // o WhatsApp confirmou o aparelho
  await a1.state.keys.set({ 'pre-key': { 7: { public: Buffer.from('abc'), private: Buffer.from('def') } } });
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(b.puts, 1);
  const a2 = await authRemoto({ site: 'https://x.test', segredo: seg, uid: 'u1', esperaMs: 10, buscar: b.buscar });
  const k = (await a2.state.keys.get('pre-key', ['7']))['7'];
  assert.equal(Buffer.from(k.public).toString(), 'abc');
  assert.deepEqual(a2.state.creds.noiseKey.public, a1.state.creds.noiseKey.public);  // a mesma sessão
});

test('sessão guardada: se não consegue LER, não começa uma nova (apagaria a que existe)', async () => {
  const b = bancoFalso('');
  b.falhaLeitura = true;
  await assert.rejects(() => authRemoto({ site: 'https://x.test', segredo: 'segredo-1234567890123456', uid: 'u1', buscar: b.buscar }), /Não consegui ler/);
});

test('sessão guardada: pareamento pela metade não é guardado nem carregado', async () => {
  const b = bancoFalso('');
  const seg = 'segredo-1234567890123456';
  const a = await authRemoto({ site: 'https://x.test', segredo: seg, uid: 'u1', esperaMs: 10, buscar: b.buscar });
  a.state.creds.me = { id: '5514999019705@s.whatsapp.net', name: '~' };   // o que o pedido de código deixa
  await a.saveCreds();
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(b.puts, 0);
  const velho = bancoFalso(cifrar(JSON.stringify({ creds: { me: { id: 'x' } }, keys: {} }), seg));
  const c = await authRemoto({ site: 'https://x.test', segredo: seg, uid: 'u1', buscar: velho.buscar });
  assert.ok(!c.state.creds.me && c.state.creds.noiseKey);   // recomeça do zero
});

test('sessão guardada: depois de apagar, nada ressuscita a sessão', async () => {
  const b = bancoFalso('');
  const a = await authRemoto({ site: 'https://x.test', segredo: 'segredo-1234567890123456', uid: 'u1', esperaMs: 10, buscar: b.buscar });
  a.state.creds.account = { details: 'x' };
  await a.apagar();
  assert.ok(!a.state.creds.account);                       // zerou na memória
  await a.saveCreds();                                      // o Baileys ainda avisa depois do logout
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(b.deletes, 1); assert.equal(b.puts, 0); assert.equal(b.blob, '');
});

// ------------------------------------------------------------------ o historico das conversas sobrevive a reinicios

import { criarHistorico } from '../conector/leadsage-conector.mjs';
import { guardaRemota } from './auth-remoto.mjs';

test('historico: grava no banco (cifrado) e volta igual depois de um reinício', async () => {
  const b = bancoFalso('');
  const seg = 'segredo-1234567890123456';
  const guarda = guardaRemota({ site: 'https://x.test', segredo: seg, uid: 'u1', buscar: async (url, init = {}) => {
    if (init.method === 'PUT') { b.blob = JSON.parse(init.body).blob; b.puts++; return { ok: true, status: 200, json: async () => ({}) }; }
    return { ok: true, status: 200, json: async () => ({ blob: b.blob }) };
  } });
  const h1 = criarHistorico('', { maxMensagens: 40, maxChats: 60, ...guarda });
  await h1.carregar();
  assert.deepEqual(h1.chats(), []);                                   // primeira vez: nada
  h1.registrar({ chatId: '5511999990000@c.us', nome: 'Gabriel', mensagem: { id: 'a1', texto: 'boa tarde', minha: false, quando: 100, tipo: 'text', midia: false, status: 0 } });
  await new Promise((r) => setTimeout(r, 6300));                      // a gravação é adiada em alguns segundos
  assert.equal(b.puts, 1);
  assert.ok(!b.blob.includes('Gabriel'));                             // o banco só vê texto cifrado
  const h2 = criarHistorico('', { ...guarda });                       // o serviço reiniciou
  await h2.carregar();
  assert.equal(h2.chats()[0].nome, 'Gabriel');
  assert.equal(h2.mensagens('5511999990000@c.us')[0].texto, 'boa tarde');
});

const segredoTeste = 'segredo-de-teste-1234567890';
const tokenDe = (uid, exp) => `${uid}.${exp}.${createHmac('sha256', segredoTeste).update(`${uid}.${exp}`).digest('hex')}`;

test('token do chat: vale só com a assinatura certa e dentro do prazo', () => {
  const agora = 1000;
  assert.equal(uidDoToken(tokenDe('u1', 2000), segredoTeste, agora), 'u1');
  assert.equal(uidDoToken(tokenDe('u1', 500), segredoTeste, agora), '');            // vencido
  assert.equal(uidDoToken(tokenDe('u1', 2000).replace('u1', 'u2'), segredoTeste, agora), ''); // outro dono
  assert.equal(uidDoToken('lixo', segredoTeste, agora), '');
});

test('API do chat: lê e envia direto da sessão do dono, e ninguém vê a do outro', async () => {
  const enviadas = [];
  const wa = {
    pronto: true,
    chats: async () => [{ id: '5511999990000@c.us', nome: 'Gabriel' }],
    mensagens: async () => [{ id: 'm1', texto: 'oi' }],
    enviarNoChat: async (id, texto) => { enviadas.push([id, texto]); return { id: 'm2', texto, minha: true }; },
    lida: async () => {},
  };
  const gerente = { total: () => 1, ativas: new Map([['u1', { sessao: { wa } }]]) };
  const servidor = http.createServer(criarApiChat({ gerente, segredo: segredoTeste }));
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const exp = Math.floor(Date.now() / 1000) + 600;
  const auth = (uid) => ({ authorization: `Bearer ${tokenDe(uid, exp)}` });
  try {
    assert.equal((await fetch(`${base}/chat`)).status, 401);
    const lista = await (await fetch(`${base}/chat?limite=10`, { headers: auth('u1') })).json();
    assert.equal(lista.chats[0].nome, 'Gabriel');
    const msgs = await (await fetch(`${base}/chat/5511999990000%40c.us/mensagens`, { headers: auth('u1') })).json();
    assert.equal(msgs.mensagens[0].texto, 'oi');
    const env = await (await fetch(`${base}/chat/5511999990000%40c.us/enviar`, { method: 'POST', headers: { ...auth('u1'), 'content-type': 'application/json' }, body: JSON.stringify({ texto: 'olá' }) })).json();
    assert.equal(env.mensagem.texto, 'olá');
    assert.deepEqual(enviadas, [['5511999990000@c.us', 'olá']]);
    assert.equal((await fetch(`${base}/chat`, { headers: auth('u2') })).status, 503); // u2 não tem sessão: nunca vê a de u1
    const pre = await fetch(`${base}/chat`, { method: 'OPTIONS', headers: { origin: 'https://leadsageofc.vercel.app' } });
    assert.equal(pre.status, 204);
    assert.equal(pre.headers.get('access-control-allow-origin'), 'https://leadsageofc.vercel.app');
  } finally { servidor.close(); }
});

test('lista parcial (banco principal sem cota): liga quem aparece e não para ninguém', async () => {
  const paradas = [];
  const fabricaSessao = ({ uid }) => ({ rodar: () => new Promise(() => {}), parar: async () => { paradas.push(uid); } });
  let resposta = { sessoes: [{ uid: 'a', chave: 'k1' }, { uid: 'b', chave: 'k2' }], desligar: [] };
  const antes = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => resposta });
  try {
    const g = criarGerente({ site: 'https://x.test', segredo: 'x'.repeat(20), dados: '/tmp/x', aviso: () => {}, fabricaSessao });
    await g.sincronizar();
    assert.deepEqual([...g.ativas.keys()].sort(), ['a', 'b']);
    resposta = { sessoes: [{ uid: 'c', chave: 'k3' }], desligar: [], parcial: true };   // só o novo aparece
    await g.sincronizar();
    assert.deepEqual([...g.ativas.keys()].sort(), ['a', 'b', 'c']);                      // a e b continuam
    assert.deepEqual(paradas, []);
    resposta = { sessoes: [{ uid: 'c', chave: 'k3' }], desligar: [] };                   // lista completa: aí sim, quem sumiu para
    await g.sincronizar();
    assert.deepEqual([...g.ativas.keys()], ['c']);
  } finally { globalThis.fetch = antes; }
});

// ---- vários serviços da nuvem: só um atende cada número, e o outro assume quando o primeiro some
function tabelaDeConcessoes() {
  const t = new Map(); // uid -> quem
  const para = (quem) => ({
    quem,
    tomar: async (uid) => { const d = t.get(uid); if (!d || d === quem) { t.set(uid, quem); return true; } return false; },
    liberar: async (uid) => { if (t.get(uid) === quem) t.delete(uid); return true; },
  });
  return { t, para, vencer: (uid) => t.delete(uid) };
}
const fabricaFalsa = (paradas) => ({ uid }) => ({ rodar: () => new Promise(() => {}), parar: async () => { paradas.push(uid); } });
const listaFalsa = (corpo) => { globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => corpo }); };

test('dois serviços: só um liga o número; quando o primeiro some, o segundo assume', async () => {
  const antes = globalThis.fetch;
  listaFalsa({ sessoes: [{ uid: 'u1', chave: 'k1' }], desligar: [] });
  const c = tabelaDeConcessoes();
  const pA = [], pB = [];
  try {
    const A = criarGerente({ site: 'https://x.test', segredo: 'x'.repeat(20), dados: '/tmp/x', aviso: () => {}, fabricaSessao: fabricaFalsa(pA), concessao: c.para('render') });
    const B = criarGerente({ site: 'https://x.test', segredo: 'x'.repeat(20), dados: '/tmp/x', aviso: () => {}, fabricaSessao: fabricaFalsa(pB), concessao: c.para('reserva') });
    await A.sincronizar(); await B.sincronizar();
    assert.equal(A.total(), 1); assert.equal(B.total(), 0);                 // só o primeiro atende
    await B.sincronizar(); assert.equal(B.total(), 0);                       // enquanto o primeiro vive, o segundo espera
    // o primeiro some (hospedagem fora do ar): a concessão vence sem ele renovar
    c.vencer('u1');
    await B.sincronizar();
    assert.equal(B.total(), 1);                                              // o segundo assume sozinho
    // o primeiro volta: percebe que perdeu e para (sem desconectar o número)
    await A.renovar();
    assert.equal(A.total(), 0); assert.deepEqual(pA, ['u1']);
  } finally { globalThis.fetch = antes; }
});

test('serviço desligando devolve a concessão e o outro assume na hora', async () => {
  const antes = globalThis.fetch;
  listaFalsa({ sessoes: [{ uid: 'u1', chave: 'k1' }], desligar: [] });
  const c = tabelaDeConcessoes();
  const pA = [], pB = [];
  try {
    const A = criarGerente({ site: 'https://x.test', segredo: 'x'.repeat(20), dados: '/tmp/x', aviso: () => {}, fabricaSessao: fabricaFalsa(pA), concessao: c.para('render') });
    const B = criarGerente({ site: 'https://x.test', segredo: 'x'.repeat(20), dados: '/tmp/x', aviso: () => {}, fabricaSessao: fabricaFalsa(pB), concessao: c.para('reserva') });
    await A.sincronizar(); await B.sincronizar();
    await A.liberarTodas();                                                  // deploy/desligamento
    assert.equal(A.total(), 0);
    await B.sincronizar();
    assert.equal(B.total(), 1);
  } finally { globalThis.fetch = antes; }
});

test('pedido de desligar: só o serviço que atende (ou consegue a concessão) cuida dele', async () => {
  const antes = globalThis.fetch;
  const avisadas = [];
  globalThis.fetch = async (url) => { if (String(url).includes('/desligadas/')) { avisadas.push(url); return { ok: true, json: async () => ({}) }; } return { ok: true, status: 200, json: async () => ({ sessoes: [], desligar: ['u1'] }) }; };
  const c = tabelaDeConcessoes();
  c.t.set('u1', 'render');
  const desconectados = [];
  try {
    const B = criarGerente({ site: 'https://x.test', segredo: 'x'.repeat(20), dados: '/tmp/x', aviso: () => {}, fabricaSessao: fabricaFalsa([]), concessao: c.para('reserva'), desconectar: async (uid) => { desconectados.push(uid); } });
    await B.sincronizar();
    assert.deepEqual(desconectados, []);                                     // o reserva nao mexe no numero que e do outro
    assert.equal(avisadas.length, 0);
  } finally { globalThis.fetch = antes; }
});
