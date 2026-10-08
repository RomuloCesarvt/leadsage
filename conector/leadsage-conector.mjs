#!/usr/bin/env node
/**
 * LeadSage Conector: liga o WhatsApp do seu computador (via OpenWA) ao robô do LeadSage.
 *
 * Quem liga para quem: este programa pergunta ao LeadSage o que enviar e avisa
 * quando um lead responde. O LeadSage nunca precisa alcançar o seu computador.
 *
 *   OpenWA (local, :2785)  <-->  este Conector  <-->  LeadSage (nuvem)
 *
 * Sem dependências: só o Node 18 ou mais novo.
 *
 * ATENÇÃO: o OpenWA usa o WhatsApp Web, não a API oficial. O WhatsApp pode
 * restringir o número. Use um número secundário, deixe os limites ligados e
 * não aumente o ritmo de envio por conta própria.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const VERSAO = '1.0.0';

// ------------------------------------------------------------ configuração

export function lerConfig(env = process.env) {
  const c = {
    leadsageUrl: (env.LEADSAGE_URL || 'https://leadsageofc.vercel.app').replace(/\/+$/, ''),
    chave: (env.LEADSAGE_KEY || '').trim(),
    openwaUrl: (env.OPENWA_URL || 'http://localhost:2785').replace(/\/+$/, ''),
    openwaKey: (env.OPENWA_KEY || '').trim(),
    sessao: (env.OPENWA_SESSION || 'leadsage').trim(),
    arquivoEstado: env.CONECTOR_ESTADO || join(AQUI, 'estado.json'),
    // intervalo de leitura das mensagens recebidas (só fala com o OpenWA local)
    leituraMs: Number(env.CONECTOR_LEITURA_MS || 3000),
  };
  const faltando = [];
  if (!/^lsc_[A-Za-z0-9_-]{30,60}$/.test(c.chave)) faltando.push('LEADSAGE_KEY (a chave que o LeadSage mostra em Robô > WhatsApp pelo computador)');
  if (!c.openwaKey) faltando.push('OPENWA_KEY (a chave de API do OpenWA, no arquivo data/.api-key dele)');
  return { c, faltando };
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toLocaleTimeString('pt-BR'), ...a);

// ------------------------------------------------------------------ clientes

async function http(url, { metodo = 'GET', cabecalhos = {}, corpo, tempoMs = 20000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), tempoMs);
  try {
    const r = await fetch(url, {
      method: metodo,
      headers: { 'content-type': 'application/json', ...cabecalhos },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: ctrl.signal,
    });
    const texto = await r.text();
    let dados = null;
    try { dados = texto ? JSON.parse(texto) : null; } catch { dados = { bruto: texto }; }
    return { ok: r.ok, status: r.status, dados };
  } finally {
    clearTimeout(t);
  }
}

export function clienteLeadsage(c) {
  const h = { 'x-conector-key': c.chave };
  const base = `${c.leadsageUrl}/api/conector`;
  return {
    ping: (numero, status) => http(`${base}/ping`, { metodo: 'POST', cabecalhos: h, corpo: { numero: numero || '', status: status || '', versao: VERSAO } }),
    tarefas: () => http(`${base}/tarefas`, { cabecalhos: h }),
    resultado: (id, ok, erro = '') => http(`${base}/tarefas/${encodeURIComponent(id)}/resultado`, { metodo: 'POST', cabecalhos: h, corpo: { ok, erro } }),
    mensagem: (m) => http(`${base}/mensagem`, { metodo: 'POST', cabecalhos: h, corpo: m, tempoMs: 60000 }),
  };
}

export function clienteOpenwa(c) {
  const h = { 'x-api-key': c.openwaKey };
  const base = `${c.openwaUrl}/api`;
  return {
    saude: () => http(`${base}/health`),
    sessoes: () => http(`${base}/sessions`, { cabecalhos: h }),
    criarSessao: (nome) => http(`${base}/sessions`, { metodo: 'POST', cabecalhos: h, corpo: { name: nome } }),
    iniciar: (id) => http(`${base}/sessions/${id}/start`, { metodo: 'POST', cabecalhos: h }),
    sessao: (id) => http(`${base}/sessions/${id}`, { cabecalhos: h }),
    qr: (id) => http(`${base}/sessions/${id}/qr`, { cabecalhos: h }),
    enviarTexto: (id, chatId, text) => http(`${base}/sessions/${id}/messages/send-text`, { metodo: 'POST', cabecalhos: h, corpo: { chatId, text }, tempoMs: 45000 }),
    recebidas: (id, desdeMs) => http(
      `${base}/sessions/${id}/messages?direction=incoming&orderBy=timestamp&inlineMedia=false&limit=100&since=${desdeMs}`,
      { cabecalhos: h },
    ),
    telefoneDoContato: (id, contato) => http(`${base}/sessions/${id}/contacts/${encodeURIComponent(contato)}/phone`, { cabecalhos: h }),
  };
}

// ------------------------------------------------------------------- estado

export async function lerEstado(arquivo) {
  try {
    const e = JSON.parse(await readFile(arquivo, 'utf8'));
    return { desde: Number(e.desde) || 0, vistos: Array.isArray(e.vistos) ? e.vistos : [] };
  } catch {
    return { desde: 0, vistos: [] };
  }
}

export async function gravarEstado(arquivo, estado) {
  const limpo = { desde: estado.desde, vistos: estado.vistos.slice(-500) };
  await writeFile(arquivo, JSON.stringify(limpo), 'utf8');
}

// ------------------------------------------------------------------ regras

/** O número em dígitos de um chatId individual, ou '' para grupo, status e canal. */
export function telefoneDoChat(chatId) {
  const m = /^(\d{10,15})@(c\.us|s\.whatsapp\.net)$/.exec(String(chatId || ''));
  return m ? m[1] : '';
}

/** Uma mensagem do OpenWA vira o que o LeadSage espera, ou nada (grupo, mídia sem texto, vazia). */
export function paraLeadsage(msg, telefone) {
  const texto = String(msg.body || '').trim();
  if (!telefone) return null;
  if (!texto) {
    const rotulos = { image: '[imagem]', video: '[vídeo]', audio: '[áudio]', voice: '[áudio]', document: '[documento]', sticker: '[figurinha]', location: '[localização]' };
    const r = rotulos[msg.type];
    if (!r) return null;
    return { id: String(msg.waMessageId || msg.id), contato: telefone, nome: msg.chatName || '', texto: r, momento: Number(msg.timestamp) || 0 };
  }
  return { id: String(msg.waMessageId || msg.id), contato: telefone, nome: msg.chatName || '', texto, momento: Number(msg.timestamp) || 0 };
}

/** Atraso humano antes de enviar: o do LeadSage mais um pouco de variação. */
export function atrasoHumano(digitandoMs, aleatorio = Math.random) {
  return Math.round(Math.max(800, Number(digitandoMs) || 0) * (0.8 + aleatorio() * 0.5));
}

// ------------------------------------------------------------ OpenWA: sessão

function listaDe(dados) {
  if (Array.isArray(dados)) return dados;
  return dados?.sessions || dados?.data || [];
}

export async function garantirSessao(owa, nome, aviso = log) {
  const lista = await owa.sessoes();
  if (!lista.ok) throw new Error(`OpenWA recusou a chave (HTTP ${lista.status}). Confira OPENWA_KEY.`);
  let s = listaDe(lista.dados).find((x) => x.name === nome || x.id === nome);
  if (!s) {
    const c = await owa.criarSessao(nome);
    if (!c.ok) throw new Error(`Não consegui criar a sessão no OpenWA (HTTP ${c.status}).`);
    s = c.dados?.data || c.dados;
    aviso(`Sessão "${nome}" criada.`);
  }
  const id = s.id;
  if (!id) throw new Error('O OpenWA não devolveu o id da sessão.');
  const resp = await owa.sessao(id);
  const atual = resp.dados?.data || resp.dados || s;
  if (!['ready', 'authenticating', 'initializing', 'qr_ready'].includes(atual.status)) {
    await owa.iniciar(id);
  }
  return id;
}

async function mostrarQr(owa, id) {
  const r = await owa.qr(id);
  const img = r.dados?.qrCode || r.dados?.data?.qrCode;
  if (!img || !img.startsWith('data:image')) return false;
  const arquivo = join(AQUI, 'qr.png');
  await writeFile(arquivo, Buffer.from(img.split(',')[1], 'base64'));
  log(`Escaneie o QR code: WhatsApp > Aparelhos conectados > Conectar um aparelho. Arquivo: ${arquivo}`);
  if (process.platform === 'win32') exec(`start "" "${arquivo}"`);
  else if (process.platform === 'darwin') exec(`open "${arquivo}"`);
  return true;
}

export async function esperarPronta(owa, id, aviso = log, { tentativas = 120, pausaMs = 3000 } = {}) {
  let qrMostrado = false;
  for (let i = 0; i < tentativas; i++) {
    const r = await owa.sessao(id);
    const s = r.dados?.data || r.dados || {};
    if (s.status === 'ready') return s;
    if (s.status === 'qr_ready' && !qrMostrado) qrMostrado = await mostrarQr(owa, id);
    if (['failed', 'disconnected'].includes(s.status) && i > 3) await owa.iniciar(id);
    await dormir(pausaMs);
  }
  throw new Error('A sessão do WhatsApp não ficou pronta. Escaneie o QR e tente de novo.');
}

// --------------------------------------------------------------- ciclo: entrada

/** Lê o que chegou no WhatsApp e entrega ao LeadSage. Devolve quantas mensagens novas. */
export async function lerEEntregar(owa, ls, id, estado, aviso = log) {
  const r = await owa.recebidas(id, estado.desde ? estado.desde * 1000 : 0);
  if (!r.ok) return 0;
  const msgs = (r.dados?.messages || []).slice().sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  let novas = 0;
  for (const m of msgs) {
    const chave = String(m.waMessageId || m.id);
    if (estado.vistos.includes(chave)) continue;
    let tel = telefoneDoChat(m.chatId);
    if (!tel && String(m.chatId || '').endsWith('@lid')) {
      const p = await owa.telefoneDoContato(id, m.chatId);
      const dig = String(p.dados?.phone || p.dados?.data?.phone || '').replace(/\D/g, '');
      if (/^\d{10,15}$/.test(dig)) tel = dig;
    }
    const payload = paraLeadsage(m, tel);
    estado.vistos.push(chave);
    estado.desde = Math.max(estado.desde, Number(m.timestamp) || 0);
    if (!payload) continue;
    const e = await ls.mensagem(payload);
    if (!e.ok && e.status !== 422) {
      // não perde a mensagem: sai da lista de vistos e tenta no próximo ciclo
      estado.vistos.pop();
      aviso(`LeadSage não recebeu a mensagem (HTTP ${e.status}); tento de novo.`);
      break;
    }
    novas++;
  }
  return novas;
}

// ---------------------------------------------------------------- ciclo: saída

/** Pergunta o que enviar e envia, com pausa humana. Devolve {enviadas, proximaEm}. */
export async function enviarPendentes(owa, ls, id, aviso = log, dorme = dormir) {
  const t = await ls.tarefas();
  if (!t.ok) {
    if (t.status === 401) throw new Error('A chave do Conector foi revogada ou está errada. Gere outra no LeadSage.');
    return { enviadas: 0, proximaEm: 30 };
  }
  let enviadas = 0;
  for (const tarefa of t.dados.tarefas || []) {
    await dorme(atrasoHumano(tarefa.digitando_ms));
    const r = await owa.enviarTexto(id, `${tarefa.contato}@c.us`, tarefa.texto);
    if (r.ok) {
      enviadas++;
      await ls.resultado(tarefa.id, true);
      aviso(`Enviado (${tarefa.tipo}) para ${tarefa.contato}`);
    } else {
      const erro = r.dados?.message || r.dados?.error || `HTTP ${r.status}`;
      await ls.resultado(tarefa.id, false, String(erro).slice(0, 200));
      aviso(`Falhou o envio para ${tarefa.contato}: ${erro}`);
    }
  }
  if (t.dados.motivo_sem_frio) aviso(`Abordagem fria em espera: ${t.dados.motivo_sem_frio}`);
  return { enviadas, proximaEm: Number(t.dados.proxima_em) || 30 };
}

// -------------------------------------------------------------------- principal

export async function executar(cfg) {
  const { c, faltando } = cfg;
  if (faltando.length) {
    console.error('Falta configurar:\n - ' + faltando.join('\n - '));
    process.exit(1);
  }
  const owa = clienteOpenwa(c);
  const ls = clienteLeadsage(c);

  const saude = await owa.saude().catch(() => ({ ok: false }));
  if (!saude.ok) throw new Error(`Não encontrei o OpenWA em ${c.openwaUrl}. Ele precisa estar ligado (docker compose up -d).`);

  const id = await garantirSessao(owa, c.sessao);
  const sessao = await esperarPronta(owa, id);
  const numero = String(sessao.phone || sessao.phoneNumber || sessao.me || '').replace(/\D/g, '');
  log(`WhatsApp pronto${numero ? ` (${numero})` : ''}. Conectando ao LeadSage...`);

  const p = await ls.ping(numero, 'ready');
  if (!p.ok) throw new Error(`O LeadSage recusou o Conector (HTTP ${p.status}). Confira LEADSAGE_KEY e LEADSAGE_URL.`);
  log('Conectado. Deixe esta janela aberta: ela atende enquanto estiver rodando.');

  const estado = await lerEstado(c.arquivoEstado);
  // na primeira vez, só mensagens a partir de agora (não responde conversas antigas)
  if (!estado.desde) estado.desde = Math.floor(Date.now() / 1000) - 5;

  let proximaSaida = 0;
  let ultimoPing = Date.now();
  for (;;) {
    try {
      const novas = await lerEEntregar(owa, ls, id, estado);
      if (novas) { await gravarEstado(c.arquivoEstado, estado); proximaSaida = 0; }
      if (Date.now() >= proximaSaida) {
        const r = await enviarPendentes(owa, ls, id);
        proximaSaida = Date.now() + r.proximaEm * 1000;
      }
      if (Date.now() - ultimoPing > 55000) { await ls.ping(numero, 'ready'); ultimoPing = Date.now(); }
    } catch (e) {
      if (/revogada|errada/.test(String(e.message))) { console.error(e.message); process.exit(2); }
      log('Aviso:', e.message);
    }
    await dormir(c.leituraMs);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // .env simples ao lado do programa
  const envPath = join(AQUI, '.env');
  if (existsSync(envPath)) {
    for (const linha of (await readFile(envPath, 'utf8')).split(/\r?\n/)) {
      const m = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(linha);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  executar(lerConfig()).catch((e) => { console.error('Erro:', e.message); process.exit(1); });
}
