#!/usr/bin/env node
/**
 * LeadSage Conector: o WhatsApp do seu computador conversando com o robô do LeadSage.
 *
 * Tudo em um programa só: abre o WhatsApp Web no Edge/Chrome que você já tem,
 * mostra o QR code numa página local, e depois só fica atendendo.
 *
 *   WhatsApp Web (este computador)  <-->  este Conector  <-->  LeadSage (nuvem)
 *
 * Quem liga para quem: o Conector pergunta ao LeadSage o que enviar e avisa quando
 * um lead responde. O LeadSage nunca precisa alcançar o seu computador, e nenhuma
 * porta é aberta no seu roteador.
 *
 * ATENÇÃO: é o WhatsApp Web automatizado, não a API oficial. O WhatsApp pode
 * restringir o número. Use um número secundário e não aumente o ritmo de envio.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { exec } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const VERSAO = '2.3.0';
const PORTA = 2790;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toLocaleTimeString('pt-BR'), ...a);

// ------------------------------------------------------------- configuração

const CHAVE_RE = /^lsc_[A-Za-z0-9_-]{30,60}$/;

export async function lerConfig(arquivo = join(AQUI, 'config.json'), env = process.env) {
  let c = {};
  try { c = JSON.parse(await readFile(arquivo, 'utf8')); } catch { /* ainda não existe */ }
  return {
    arquivo,
    chave: String(env.LEADSAGE_KEY || c.chave || '').trim(),
    site: String(env.LEADSAGE_URL || c.site || 'https://leadsageofc.vercel.app').replace(/\/+$/, ''),
  };
}

export async function gravarConfig(cfg) {
  await writeFile(cfg.arquivo, JSON.stringify({ chave: cfg.chave, site: cfg.site }), 'utf8');
}

export const chaveValida = (k) => CHAVE_RE.test(String(k || '').trim());

// ------------------------------------------------------------------ LeadSage

async function http_(url, { metodo = 'GET', cabecalhos = {}, corpo, tempoMs = 20000 } = {}) {
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
  } catch (e) {
    return { ok: false, status: 0, dados: { erro: String(e.message || e) } };
  } finally {
    clearTimeout(t);
  }
}

export function clienteLeadsage({ site, chave }) {
  const h = { 'x-conector-key': chave };
  const base = `${site}/api/conector`;
  return {
    ping: (numero, status) => http_(`${base}/ping`, { metodo: 'POST', cabecalhos: h, corpo: { numero: numero || '', status: status || '', versao: VERSAO } }),
    tarefas: () => http_(`${base}/tarefas`, { cabecalhos: h }),
    resultado: (id, ok, erro = '') => http_(`${base}/tarefas/${encodeURIComponent(id)}/resultado`, { metodo: 'POST', cabecalhos: h, corpo: { ok, erro } }),
    mensagem: (m) => http_(`${base}/mensagem`, { metodo: 'POST', cabecalhos: h, corpo: m, tempoMs: 60000 }),
  };
}

// ------------------------------------------------------------------ regras

/** Atraso humano antes de enviar: o do LeadSage mais um pouco de variação. */
export function atrasoHumano(digitandoMs, aleatorio = Math.random) {
  return Math.round(Math.max(800, Number(digitandoMs) || 0) * (0.8 + aleatorio() * 0.5));
}

const ROTULO_MIDIA = { image: '[imagem]', video: '[vídeo]', audio: '[áudio]', ptt: '[áudio]', document: '[documento]', sticker: '[figurinha]', location: '[localização]', vcard: '[contato]' };

/**
 * Uma mensagem recebida vira o que o LeadSage espera, ou nada.
 * `m` tem o formato de um adaptador: { id, de (dígitos), nome, texto, tipo, grupo, minha, momento }.
 */
export function paraLeadsage(m, inicioS = 0) {
  if (!m || m.grupo || m.minha) return null;
  if (!/^\d{10,15}$/.test(String(m.de || ''))) return null;
  if (inicioS && Number(m.momento) && Number(m.momento) < inicioS - 10) return null; // histórico antigo
  const texto = String(m.texto || '').trim() || ROTULO_MIDIA[m.tipo] || '';
  if (!texto) return null;
  return { id: String(m.id), contato: m.de, nome: String(m.nome || ''), texto, momento: Number(m.momento) || 0 };
}

// ------------------------------------------------------- ciclo: o que enviar

/**
 * Pergunta ao LeadSage o que enviar e envia, com pausa humana.
 * `wa.enviar(telefone, texto, digitandoMs)` devolve { ok, erro }.
 */
export async function enviarPendentes(ls, wa, aviso = log, dorme = dormir) {
  const t = await ls.tarefas();
  if (!t.ok) {
    if (t.status === 401) throw new Error('A chave do Conector foi revogada ou está errada. Gere outra no LeadSage.');
    return { enviadas: 0, proximaEm: 30 };
  }
  let enviadas = 0;
  for (const tarefa of t.dados.tarefas || []) {
    await dorme(1000 + Math.floor(Math.random() * 2000)); // respira antes de cada mensagem
    const r = await wa.enviar(tarefa.contato, tarefa.texto, atrasoHumano(tarefa.digitando_ms));
    if (r.ok) {
      enviadas++;
      await ls.resultado(tarefa.id, true);
      aviso(`Enviado (${tarefa.tipo}) para ${tarefa.contato}`);
    } else {
      await ls.resultado(tarefa.id, false, String(r.erro || 'falhou').slice(0, 200));
      aviso(`Falhou o envio para ${tarefa.contato}: ${r.erro}`);
    }
  }
  if (t.dados.motivo_sem_frio) aviso(`Abordagem fria em espera: ${t.dados.motivo_sem_frio}`);
  return { enviadas, proximaEm: Number(t.dados.proxima_em) || 30 };
}

/** Entrega ao LeadSage uma mensagem recebida. Devolve true se foi aceita. */
export async function entregarMensagem(ls, m, inicioS, vistos, aviso = log) {
  if (vistos.has(String(m.id))) return false;
  const payload = paraLeadsage(m, inicioS);
  vistos.add(String(m.id));
  if (vistos.size > 1000) vistos.delete(vistos.values().next().value);
  if (!payload) return false;
  const e = await ls.mensagem(payload);
  if (!e.ok && e.status !== 422) {
    vistos.delete(String(m.id)); // não perde a mensagem: o WhatsApp não reenvia, então avisa
    aviso(`LeadSage não recebeu a mensagem de ${m.de} (HTTP ${e.status}).`);
    return false;
  }
  return true;
}

// ------------------------------------------------- histórico próprio (reserva do chat)

/**
 * Guarda no computador as conversas que o Conector viu passar (mensagens recebidas e enviadas).
 *
 * É a reserva do chat: se ler a página do WhatsApp Web falhar (o WhatsApp muda o código dele de
 * tempos em tempos), a lista de conversas e as mensagens saem daqui, em vez de a tela ficar
 * vazia. Só tem o que aconteceu depois que o Conector foi ligado.
 */
export function criarHistorico(arquivo, { maxMensagens = 300, maxChats = 300 } = {}) {
  let chats = {};
  let pendente = null;

  const salvar = () => {
    if (!arquivo || pendente) return;
    pendente = setTimeout(async () => {
      pendente = null;
      try { await writeFile(arquivo, JSON.stringify({ chats }), 'utf8'); } catch { /* disco cheio ou sem permissão: segue em memória */ }
    }, 2000);
    pendente.unref?.();
  };

  return {
    async carregar() {
      if (!arquivo) return;
      try { chats = JSON.parse(await readFile(arquivo, 'utf8')).chats || {}; } catch { chats = {}; }
    },
    registrar({ chatId, nome, grupo, mensagem }) {
      if (!chatId || !mensagem || !mensagem.id) return;
      const c = chats[chatId] || (chats[chatId] = { id: chatId, nome: '', grupo: Boolean(grupo), telefone: '', naoLidas: 0, quando: 0, ultima: null, mensagens: [] });
      if (c.mensagens.some((m) => m.id === mensagem.id)) return; // o WhatsApp avisa duas vezes
      if (nome && !mensagem.minha) c.nome = nome;
      c.telefone = c.telefone || (/^(\d{10,15})@c\.us$/.exec(chatId) || [])[1] || '';
      c.nome = c.nome || c.telefone || chatId.split('@')[0];
      c.mensagens.push(mensagem);
      c.mensagens.sort((a, b) => a.quando - b.quando);
      if (c.mensagens.length > maxMensagens) c.mensagens.splice(0, c.mensagens.length - maxMensagens);
      if (!mensagem.minha) c.naoLidas += 1;
      const u = c.mensagens[c.mensagens.length - 1];
      c.quando = u.quando;
      c.ultima = { texto: u.texto, minha: u.minha };
      const ids = Object.keys(chats);
      if (ids.length > maxChats) {
        ids.sort((a, b) => chats[a].quando - chats[b].quando).slice(0, ids.length - maxChats).forEach((i) => delete chats[i]);
      }
      salvar();
    },
    chats(limite = 40) {
      return Object.values(chats)
        .sort((a, b) => b.quando - a.quando)
        .slice(0, limite)
        .map(({ mensagens, ...resumo }) => resumo);
    },
    mensagens(chatId, limite = 60) {
      return (chats[chatId]?.mensagens || []).slice(-limite);
    },
    lida(chatId) {
      if (chats[chatId]) { chats[chatId].naoLidas = 0; salvar(); }
    },
  };
}

// ------------------------------------------------------- o chat (como o WhatsApp Web)

/** Um chat da lista: nome, última mensagem, não lidas, número quando for pessoa. */
export function resumoDoChat(chat) {
  const id = chat.id?._serialized || '';
  const grupo = Boolean(chat.isGroup) || id.endsWith('@g.us');
  const ultima = chat.lastMessage || null;
  const telefone = id.endsWith('@c.us') ? String(chat.id.user || '').replace(/\D/g, '') : '';
  return {
    id,
    nome: chat.name || telefone || id.split('@')[0],
    grupo,
    telefone,
    naoLidas: Number(chat.unreadCount) || 0,
    quando: Number(chat.timestamp) || Number(ultima?.timestamp) || 0,
    ultima: ultima
      ? { texto: String(ultima.body || '').trim() || ROTULO_MIDIA[ultima.type] || '', minha: Boolean(ultima.fromMe) }
      : null,
  };
}

export function resumoDaMensagem(msg) {
  const tipo = msg.type === 'chat' ? 'text' : msg.type;
  return {
    id: msg.id?._serialized || msg.id?.id || '',
    texto: String(msg.body || '').trim() || ROTULO_MIDIA[tipo] || '',
    minha: Boolean(msg.fromMe),
    quando: Number(msg.timestamp) || 0,
    tipo,
    midia: Boolean(msg.hasMedia),
    // 0 pendente, 1 enviada, 2 entregue, 3 lida
    status: Number.isFinite(msg.ack) ? msg.ack : 0,
  };
}

const CHAT_ID_RE = /^[0-9A-Za-z._-]{5,40}@(c\.us|g\.us|lid)$/;

/**
 * As rotas do chat. Devolve { status, json }; fica separada do servidor para ser testada
 * sem rede: `wa` é o adaptador do WhatsApp (ou null enquanto não conectou).
 */
export async function tratarChat(wa, metodo, caminho, consulta, corpo) {
  if (!wa) return { status: 503, json: { erro: 'O WhatsApp ainda não está conectado.' } };
  const partes = caminho.split('/').filter(Boolean); // ['chats', id, 'mensagens']
  try {
    if (metodo === 'GET' && partes.length === 1 && partes[0] === 'diagnostico') {
      return { status: 200, json: wa.diagnostico ? wa.diagnostico() : {} };
    }
    if (metodo === 'GET' && partes.length === 1) {
      const limite = Math.min(100, Math.max(1, Number(consulta.get('limite')) || 40));
      return { status: 200, json: await (async () => { const chats = await comLimite(wa.chats(limite), 30000); return { chats, fonte: wa.diagnostico?.().fonteChats || '' }; })() };
    }
    const id = decodeURIComponent(partes[1] || '');
    if (!CHAT_ID_RE.test(id)) return { status: 400, json: { erro: 'Conversa inválida.' } };
    if (metodo === 'GET' && partes[2] === 'mensagens') {
      const limite = Math.min(150, Math.max(1, Number(consulta.get('limite')) || 60));
      return { status: 200, json: await (async () => { const mensagens = await comLimite(wa.mensagens(id, limite), 30000); return { mensagens, fonte: wa.diagnostico?.().fonteMensagens || '' }; })() };
    }
    if (metodo === 'POST' && partes[2] === 'enviar') {
      const texto = String(corpo?.texto || '').trim();
      if (!texto) return { status: 400, json: { erro: 'Mensagem vazia.' } };
      return { status: 200, json: { mensagem: await comLimite(wa.enviarNoChat(id, texto.slice(0, 4096)), 45000) } };
    }
    if (metodo === 'POST' && partes[2] === 'lida') {
      await comLimite(wa.lida(id), 15000);
      return { status: 200, json: { ok: true } };
    }
    return { status: 404, json: { erro: 'Rota desconhecida.' } };
  } catch (e) {
    const erro = String((e && e.message) || e).slice(0, 200) || 'erro desconhecido';
    log(`Chat: falha em ${metodo} ${caminho}: ${erro}`); // aparece na janela do Conector
    return { status: 502, json: { erro } };
  }
}

/** Uma chamada ao WhatsApp que não responde não pode deixar a tela carregando para sempre. */
export function comLimite(promessa, ms, rotulo = 'O WhatsApp') {
  let t;
  const limite = new Promise((_, rej) => { t = setTimeout(() => rej(new Error(`${rotulo} demorou demais para responder.`)), ms); });
  return Promise.race([promessa, limite]).finally(() => clearTimeout(t));
}

// ------------------------------------------------------- WhatsApp (navegador)

export function acharNavegador(existe = existsSync, plataforma = process.platform, env = process.env) {
  const lista = plataforma === 'win32'
    ? [
        `${env['ProgramFiles(x86)'] || 'C:/Program Files (x86)'}/Microsoft/Edge/Application/msedge.exe`,
        `${env.ProgramFiles || 'C:/Program Files'}/Microsoft/Edge/Application/msedge.exe`,
        `${env.ProgramFiles || 'C:/Program Files'}/Google/Chrome/Application/chrome.exe`,
        `${env['ProgramFiles(x86)'] || 'C:/Program Files (x86)'}/Google/Chrome/Application/chrome.exe`,
        `${env.LOCALAPPDATA || ''}/Google/Chrome/Application/chrome.exe`,
      ]
    : plataforma === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
      : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'];
  return lista.find((p) => p && existe(p)) || '';
}

/** Liga o WhatsApp Web. Devolve um adaptador { enviar, parar } e chama os ouvintes. */
async function iniciarWhatsApp({ aoQr, aoPronto, aoCair, aoReceber }) {
  const historico = criarHistorico(join(AQUI, 'historico.json'));
  await historico.carregar();
  const diag = { fonteChats: '', fonteMensagens: '', erros: {} };
  const navegador = acharNavegador();
  if (!navegador) throw new Error('Não achei o Microsoft Edge nem o Google Chrome neste computador. Instale um deles e abra de novo.');
  const { default: pkg } = await import('whatsapp-web.js');
  const { Client, LocalAuth } = pkg;
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: join(AQUI, 'sessao') }),
    puppeteer: { executablePath: navegador, headless: true, args: ['--no-sandbox', '--disable-gpu'] },
  });

  client.on('qr', (qr) => aoQr(qr));
  client.on('ready', () => aoPronto(String(client.info?.wid?.user || '')));
  client.on('disconnected', (motivo) => aoCair(String(motivo || 'desconectado')));
  client.on('auth_failure', (m) => aoCair(`falha de autenticação: ${m}`));
  // todas as mensagens que passam (recebidas, enviadas por você, pelo celular ou pelo LeadSage)
  // alimentam o histórico próprio, que é a reserva do chat
  client.on('message_create', async (msg) => {
    try {
      const id = msg.fromMe ? msg.to : msg.from;
      if (!id || msg.isStatus || String(id).includes('broadcast') || String(id).includes('@newsletter')) return;
      historico.registrar({
        chatId: id,
        grupo: String(id).endsWith('@g.us'),
        nome: msg._data?.notifyName || '',
        mensagem: resumoDaMensagem(msg),
      });
    } catch (e) {
      log('Aviso ao guardar mensagem no histórico:', e.message);
    }
  });
  client.on('message', async (msg) => {
    try {
      if (msg.fromMe || msg.isStatus || (msg.from || '').endsWith('@g.us') || (msg.from || '').includes('broadcast')) return;
      const contato = await msg.getContact().catch(() => null);
      const digitos = String(contato?.number || (msg.from || '').split('@')[0]).replace(/\D/g, '');
      aoReceber({
        id: msg.id?._serialized || msg.id?.id, de: digitos, nome: contato?.pushname || contato?.name || '',
        texto: msg.body, tipo: msg.type === 'chat' ? 'text' : msg.type, grupo: false, minha: false, momento: msg.timestamp,
      });
    } catch (e) {
      log('Aviso ao ler mensagem:', e.message);
    }
  });

  await client.initialize();

  return {
    async enviar(telefone, texto, digitandoMs) {
      try {
        // confere se o número existe no WhatsApp antes de tentar: número inválido é sinal ruim para a conta
        const id = await client.getNumberId(telefone);
        if (!id) return { ok: false, erro: 'esse número não está no WhatsApp' };
        const chat = await client.getChatById(id._serialized);
        await chat.sendStateTyping();
        await dormir(Math.min(9000, Math.max(800, digitandoMs || 0)));
        await client.sendMessage(id._serialized, texto);
        await chat.clearState().catch(() => {});
        return { ok: true };
      } catch (e) {
        return { ok: false, erro: String(e.message || e).slice(0, 160) };
      }
    },
    // ---- o chat: o que o usuário vê no LeadSage, como no WhatsApp Web
    // Leitura direta do que o WhatsApp Web já carregou na página: leve e sem as chamadas
    // que a biblioteca faz por conversa (atualizar os dados de cada grupo, por exemplo),
    // que travam ou quebram quando o WhatsApp muda. Se falhar, cai na biblioteca.
    async chats(limite = 40) {
      try {
        const brutos = await client.pupPage.evaluate((max) => {
          const lista = window.Store.Chat.getModelsArray()
            .filter((c) => c && c.id && !/status@broadcast|@newsletter|@broadcast$/.test(String(c.id._serialized)))
            .sort((a, b) => (b.t || 0) - (a.t || 0))
            .slice(0, max);
          return lista.map((c) => {
            const ms = c.msgs && c.msgs.getModelsArray ? c.msgs.getModelsArray() : [];
            let u = null;
            for (const m of ms) if (!m.isNotification && (!u || (m.t || 0) >= (u.t || 0))) u = m;
            return {
              id: { _serialized: String(c.id._serialized), user: String(c.id.user || '') },
              name: String(c.formattedTitle || c.name || ''),
              isGroup: c.id.server === 'g.us',
              unreadCount: c.unreadCount || 0,
              timestamp: c.t || (u && u.t) || 0,
              lastMessage: u ? { body: String(u.body || u.caption || ''), type: u.type, fromMe: !!(u.id && u.id.fromMe), timestamp: u.t || 0 } : null,
            };
          });
        }, limite);
        diag.fonteChats = 'pagina';
        return brutos.map(resumoDoChat);
      } catch (e) {
        diag.erros.chatsPagina = String(e.message || e).slice(0, 300);
        log('Aviso: leitura direta das conversas falhou, tentando a biblioteca:', diag.erros.chatsPagina.slice(0, 160));
      }
      try {
        const todos = await client.getChats();
        diag.fonteChats = 'biblioteca';
        return todos
          .filter((c) => !(c.id?._serialized || '').includes('status@broadcast'))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          .slice(0, limite)
          .map(resumoDoChat);
      } catch (e) {
        diag.erros.chatsBiblioteca = String(e.message || e).slice(0, 300);
        log('Aviso: a biblioteca também falhou; mostrando o histórico guardado:', diag.erros.chatsBiblioteca.slice(0, 160));
      }
      diag.fonteChats = 'historico';
      return historico.chats(limite);
    },
    async mensagens(chatId, limite = 60) {
      try {
        const brutas = await client.pupPage.evaluate(async (id, max) => {
          const chat = await window.WWebJS.getChat(id, { getAsModel: false });
          let msgs = chat.msgs.getModelsArray().filter((m) => !m.isNotification);
          try {
            // poucas mensagens carregadas: pede as anteriores, como o WhatsApp Web ao rolar
            for (let i = 0; i < 3 && msgs.length < max; i++) {
              const mais = await window.require('WAWebChatLoadMessages').loadEarlierMsgs({ chat });
              if (!mais || !mais.length) break;
              msgs = chat.msgs.getModelsArray().filter((m) => !m.isNotification);
            }
          } catch (_) { /* segue com o que já tem */ }
          msgs.sort((a, b) => (a.t || 0) - (b.t || 0));
          return msgs.slice(-max).map((m) => ({
            id: { _serialized: String((m.id && m.id._serialized) || '') },
            body: String(m.body || m.caption || ''),
            type: m.type,
            fromMe: !!(m.id && m.id.fromMe),
            timestamp: m.t || 0,
            ack: typeof m.ack === 'number' ? m.ack : 0,
            hasMedia: !!(m.mediaData || m.mediaObject || m.isMedia),
          }));
        }, chatId, limite);
        diag.fonteMensagens = 'pagina';
        return brutas.map(resumoDaMensagem);
      } catch (e) {
        diag.erros.mensagensPagina = String(e.message || e).slice(0, 300);
        log('Aviso: leitura direta das mensagens falhou, tentando a biblioteca:', diag.erros.mensagensPagina.slice(0, 160));
      }
      try {
        const chat = await client.getChatById(chatId);
        const msgs = await chat.fetchMessages({ limit: limite });
        diag.fonteMensagens = 'biblioteca';
        return msgs.map(resumoDaMensagem);
      } catch (e) {
        diag.erros.mensagensBiblioteca = String(e.message || e).slice(0, 300);
      }
      diag.fonteMensagens = 'historico';
      return historico.mensagens(chatId, limite);
    },
    diagnostico: () => ({ ...diag, historicoChats: historico.chats(1000).length }),
    async enviarNoChat(chatId, texto) {
      const enviada = await client.sendMessage(chatId, texto);
      return resumoDaMensagem(enviada);
    },
    async lida(chatId) {
      historico.lida(chatId);
      try {
        const chat = await client.getChatById(chatId);
        await chat.sendSeen();
      } catch (e) { diag.erros.lida = String(e.message || e).slice(0, 200); }
    },
    parar: () => client.destroy().catch(() => {}),
  };
}

// ------------------------------------------------------ página local (QR)

const PAGINA = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LeadSage · WhatsApp pelo computador</title>
<body style="margin:0;font:16px system-ui,sans-serif;background:#f8fafc;color:#0f172a;display:grid;place-items:center;min-height:100vh">
<main style="background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:32px;max-width:420px;width:calc(100% - 32px);text-align:center;box-shadow:0 20px 50px -30px rgba(15,23,42,.4)">
<h1 style="font-size:20px;margin:0 0 6px">LeadSage · WhatsApp</h1>
<p id="msg" style="color:#64748b;margin:0 0 18px">Iniciando…</p>
<div id="area"></div>
<p style="color:#94a3b8;font-size:12px;margin:18px 0 0">Deixe esta janela do programa aberta. Você pode fechar esta página.</p>
</main>
<script>
const $ = (id) => document.getElementById(id);
async function atualizar() {
  let e; try { e = await (await fetch('/estado')).json(); } catch { $('msg').textContent = 'Programa fechado. Abra o Conector de novo.'; return; }
  $('msg').textContent = e.mensagem;
  const a = $('area');
  if (e.fase === 'qr') a.innerHTML = '<img alt="QR code" style="width:260px;height:260px" src="' + e.qr + '"><p style="font-size:14px;color:#475569">No celular: WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b> e aponte para o código.</p>';
  else if (e.fase === 'pronto') a.innerHTML = '<div style="font-size:54px">✅</div><p style="color:#047857;font-weight:700">Conectado' + (e.numero ? ' · ' + e.numero : '') + '</p>';
  else if (e.fase === 'sem_chave') a.innerHTML = '<input id="k" placeholder="lsc_..." style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #cbd5e1;border-radius:10px"><button onclick="salvar()" style="margin-top:10px;width:100%;padding:11px;border:0;border-radius:10px;background:#4f46e5;color:#fff;font-weight:700;cursor:pointer">Conectar</button>';
  else if (e.fase === 'erro') a.innerHTML = '<div style="font-size:44px">⚠️</div>';
  else a.innerHTML = '<div style="font-size:44px">⏳</div>';
}
async function salvar() {
  const r = await fetch('/chave', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chave: $('k').value }) });
  const d = await r.json(); if (!d.ok) alert(d.erro || 'Chave inválida');
}
atualizar(); setInterval(atualizar, 2000);
</script></body></html>`;

/** Origens que podem ler o estado: o LeadSage mostra o QR code dentro do próprio app. */
export function origensPermitidas(site) {
  const lista = new Set(['https://leadsageofc.vercel.app']);
  try { lista.add(new URL(site).origin); } catch { /* site inválido: fica só o padrão */ }
  return lista;
}

/** O chat só atende o LeadSage: com Origin tem de ser uma permitida; sem Origin, só a própria página local. */
export function chatPermitido(origem, host, permitidas) {
  if (origem) return permitidas.has(origem);
  return /^(127\.0\.0\.1|localhost):\d+$/.test(host || '');
}

function servidorLocal(estado, aoReceberChave, permitidas, obterWa) {
  return http.createServer(async (req, res) => {
    const origem = req.headers.origin || '';
    const cors = permitidas.has(origem)
      ? { 'access-control-allow-origin': origem, vary: 'Origin', 'access-control-allow-private-network': 'true',
          'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' }
      : {};
    const saida = (status, tipo, corpo) => { res.writeHead(status, { 'content-type': tipo, 'cache-control': 'no-store', ...cors }); res.end(corpo); };
    if (req.method === 'OPTIONS') return saida(204, 'text/plain', '');
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/diagnostico' || url.pathname === '/chats' || url.pathname.startsWith('/chats/')) {
      if (!chatPermitido(origem, req.headers.host, permitidas)) return saida(403, 'application/json', JSON.stringify({ erro: 'Acesso negado.' }));
      let corpo = null;
      if (req.method === 'POST') {
        let bruto = '';
        for await (const parte of req) bruto += parte;
        try { corpo = bruto ? JSON.parse(bruto) : {}; } catch { return saida(400, 'application/json', JSON.stringify({ erro: 'Corpo inválido.' })); }
      }
      const r = await tratarChat(obterWa(), req.method, url.pathname, url.searchParams, corpo);
      return saida(r.status, 'application/json', JSON.stringify(r.json));
    }
    if (req.url === '/estado') return saida(200, 'application/json', JSON.stringify(estado));
    if (req.method === 'POST' && req.url === '/chave') {
      let corpo = '';
      for await (const parte of req) corpo += parte;
      let k = '';
      try { k = String(JSON.parse(corpo).chave || '').trim(); } catch { /* corpo inválido */ }
      if (!chaveValida(k)) return saida(200, 'application/json', JSON.stringify({ ok: false, erro: 'Essa chave não parece a do LeadSage.' }));
      await aoReceberChave(k);
      return saida(200, 'application/json', JSON.stringify({ ok: true }));
    }
    return saida(200, 'text/html; charset=utf-8', PAGINA);
  });
}

function abrirNoNavegador(url) {
  if (process.env.CONECTOR_SEM_ABRIR) return;
  if (process.platform === 'win32') exec(`start "" "${url}"`);
  else if (process.platform === 'darwin') exec(`open "${url}"`);
  else exec(`xdg-open "${url}"`);
}

// ---------------------------------------------------------------- principal

export async function executar() {
  const cfg = await lerConfig();
  const estado = { fase: chaveValida(cfg.chave) ? 'iniciando' : 'sem_chave', mensagem: 'Iniciando…', qr: '', numero: '', versao: VERSAO };
  let iniciarTudo = () => {};
  let waAtual = null;

  const srv = servidorLocal(estado, async (k) => {
    cfg.chave = k;
    await gravarConfig(cfg);
    estado.fase = 'iniciando';
    estado.mensagem = 'Chave salva. Ligando o WhatsApp…';
    iniciarTudo();
  }, origensPermitidas(cfg.site), () => waAtual);
  srv.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? 'O Conector já está aberto em outra janela.' : e.message); process.exit(1); });
  await new Promise((r) => srv.listen(PORTA, '127.0.0.1', r));
  const url = `http://127.0.0.1:${PORTA}`;
  // Abre o próprio LeadSage (a aba onde o usuário já está logado): o QR code aparece lá dentro.
  // A página local continua disponível como reserva.
  abrirNoNavegador(`${cfg.site}/?tela=robo&aba=configurar`);
  log(`LeadSage Conector ${VERSAO}. O QR code aparece no LeadSage. Se não aparecer, abra ${url}`);

  if (estado.fase === 'sem_chave') estado.mensagem = 'Cole a chave que o LeadSage mostrou.';

  let ligado = false;
  iniciarTudo = async () => {
    if (ligado || !chaveValida(cfg.chave)) return;
    ligado = true;
    const ls = clienteLeadsage(cfg);
    const vistos = new Set();
    const inicioS = Math.floor(Date.now() / 1000);
    const QRCode = (await import('qrcode')).default;
    let wa = null;
    let pronto = false;
    let proximaSaida = 0;
    let ultimoPing = 0;

    try {
      estado.mensagem = 'Abrindo o WhatsApp Web…';
      wa = await iniciarWhatsApp({
        aoQr: async (qr) => { estado.fase = 'qr'; estado.mensagem = 'Escaneie o QR code com o celular.'; estado.qr = await QRCode.toDataURL(qr, { width: 300, margin: 1 }); },
        aoPronto: async (numero) => {
          pronto = true; estado.fase = 'pronto'; estado.numero = numero; estado.qr = ''; estado.mensagem = 'Tudo certo. O robô está atendendo.';
          const p = await ls.ping(numero, 'ready');
          if (p.status === 401) { estado.fase = 'erro'; estado.mensagem = 'A chave é inválida ou foi revogada. Gere outra no LeadSage.'; }
          ultimoPing = Date.now();
          log(`WhatsApp pronto${numero ? ` (${numero})` : ''}.`);
        },
        aoCair: (motivo) => { pronto = false; estado.fase = 'erro'; estado.mensagem = `WhatsApp desconectado (${motivo}). Feche e abra o Conector.`; log(estado.mensagem); },
        aoReceber: async (m) => { if (pronto && await entregarMensagem(ls, m, inicioS, vistos)) proximaSaida = 0; },
      });
    } catch (e) {
      estado.fase = 'erro'; estado.mensagem = e.message; log('Erro:', e.message); ligado = false; return;
    }
    waAtual = wa;

    for (;;) {
      try {
        if (pronto && Date.now() >= proximaSaida) {
          const r = await enviarPendentes(ls, wa);
          proximaSaida = Date.now() + r.proximaEm * 1000;
        }
        if (pronto && Date.now() - ultimoPing > 90000) { await ls.ping(estado.numero, 'ready'); ultimoPing = Date.now(); }
      } catch (e) {
        if (/revogada|errada/.test(String(e.message))) { estado.fase = 'erro'; estado.mensagem = e.message; log(e.message); await wa?.parar(); return; }
        log('Aviso:', e.message);
      }
      await dormir(3000);
    }
  };
  await iniciarTudo();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  executar().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
}
