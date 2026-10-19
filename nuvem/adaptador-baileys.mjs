/**
 * O WhatsApp de um usuário, ligado na nuvem (sem navegador), pela biblioteca Baileys.
 *
 * Devolve o mesmo adaptador que o Conector do computador usa: { enviar, chats, mensagens, lida,
 * digitar, parar, sair }. Assim o resto (ciclo de envio, robô, agrupar mensagens) é o mesmo.
 *
 * Os ids de conversa seguem o formato do Conector (`@c.us`, `@g.us`, `@lid`); por dentro o Baileys
 * usa `@s.whatsapp.net`, e a troca fica só aqui.
 */
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import * as B from '@whiskeysockets/baileys';
import pino from 'pino';
import { criarDigitando } from '../conector/leadsage-conector.mjs';

const makeWASocket = B.default?.default || B.default || B.makeWASocket;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ ids

/** "5511999990000:12@s.whatsapp.net" -> "5511999990000@c.us"; grupos e @lid ficam como estão. */
/**
 * Confirmação de envio: `sendMessage` volta assim que a mensagem sai daqui, mesmo que o WhatsApp a recuse depois (número
 * restrito, conta limitada). Só vale como enviada quando o servidor do WhatsApp confirma (status 2 ou mais).
 * 0 = erro, 1 = pendente, 2 = servidor recebeu, 3 = entregue, 4 = lida.
 */
export function criarRastreadorDeEntrega() {
  const nivel = new Map();      // id -> maior status visto
  const esperando = new Map();  // id -> [resolver]
  const registrar = (id, status) => {
    if (!id) return;
    const n = Number(status);
    if (!Number.isFinite(n)) return;
    const atual = nivel.get(id);
    if (n !== 0 && atual !== undefined && n <= atual) return;
    nivel.set(id, n);
    if (nivel.size > 500) nivel.delete(nivel.keys().next().value);
    if (n === 0 || n >= 2) for (const r of esperando.get(id) || []) r(n);
    if (n === 0 || n >= 2) esperando.delete(id);
  };
  const aguardar = (id, ms = 25000) => new Promise((resolve) => {
    const ja = nivel.get(id);
    if (ja === 0 || (ja !== undefined && ja >= 2)) { resolve(ja); return; }
    const t = setTimeout(() => { esperando.set(id, (esperando.get(id) || []).filter((x) => x !== fim)); resolve(null); }, ms);
    const fim = (n) => { clearTimeout(t); resolve(n); };
    esperando.set(id, [...(esperando.get(id) || []), fim]);
  });
  return { registrar, aguardar, nivel: (id) => nivel.get(id) };
}

export function paraChatId(jid) {
  const j = String(jid || '');
  const [usuario, servidor] = j.split('@');
  const limpo = String(usuario || '').split(':')[0];
  if (servidor === 's.whatsapp.net') return `${limpo}@c.us`;
  return `${limpo}@${servidor || ''}`;
}

export function paraJid(chatId) {
  const [usuario, servidor] = String(chatId || '').split('@');
  return `${usuario}@${servidor === 'c.us' ? 's.whatsapp.net' : servidor}`;
}

export const digitos = (jid) => String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');

// ------------------------------------------------------------------ mensagens

const TIPOS = {
  imageMessage: 'image', videoMessage: 'video', audioMessage: 'audio', documentMessage: 'document',
  stickerMessage: 'sticker', locationMessage: 'location', liveLocationMessage: 'location', contactMessage: 'vcard', contactsArrayMessage: 'vcard',
};
const ROTULO = { image: '[imagem]', video: '[vídeo]', audio: '[áudio]', ptt: '[áudio]', document: '[documento]', sticker: '[figurinha]', location: '[localização]', vcard: '[contato]' };

/** Tira os "embrulhos" (mensagem temporária, visualização única...) até chegar na mensagem de verdade. */
export function desembrulhar(message) {
  let m = message || {};
  for (let i = 0; i < 5; i++) {
    const dentro = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message
      || m.documentWithCaptionMessage?.message || m.editedMessage?.message;
    if (!dentro) break;
    m = dentro;
  }
  return m;
}

/** { tipo, texto }: o texto digitado (ou a legenda da mídia) e o tipo no vocabulário do Conector. */
export function lerConteudo(message) {
  const m = desembrulhar(message);
  if (m.conversation) return { tipo: 'text', texto: String(m.conversation) };
  if (m.extendedTextMessage) return { tipo: 'text', texto: String(m.extendedTextMessage.text || '') };
  for (const [campo, tipo] of Object.entries(TIPOS)) {
    if (m[campo]) {
      const ptt = campo === 'audioMessage' && m[campo].ptt;
      return { tipo: ptt ? 'ptt' : tipo, texto: String(m[campo].caption || '') };
    }
  }
  return { tipo: 'unknown', texto: '' };
}

// 0 erro, 1 pendente, 2 no servidor, 3 entregue, 4 lida, 5 ouvida  ->  0 pendente, 1 enviada, 2 entregue, 3 lida
const STATUS = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 3 };

export function resumoBaileys(m) {
  const { tipo, texto } = lerConteudo(m.message);
  const ts = m.messageTimestamp;
  return {
    id: m.key?.id || '',
    texto: texto || ROTULO[tipo] || '',
    minha: Boolean(m.key?.fromMe),
    quando: Number(typeof ts === 'object' && ts ? ts.toNumber?.() ?? ts.low : ts) || Math.floor(Date.now() / 1000),
    tipo,
    midia: tipo !== 'text' && tipo !== 'unknown',
    miniatura: '',
    status: m.key?.fromMe ? (STATUS[m.status] ?? 1) : 0,
  };
}

/** O telefone de quem escreveu: no id normal vem direto; no contato novo (@lid) o WhatsApp manda o número à parte. */
export function telefoneDoRemetente(key) {
  const jid = key?.remoteJid || '';
  if (jid.endsWith('@s.whatsapp.net')) return digitos(jid);
  const alt = key?.remoteJidAlt || key?.senderPn || key?.participantPn || '';
  if (alt && String(alt).endsWith('@s.whatsapp.net')) return digitos(alt);
  return digitos(jid); // o id interno: o servidor sabe lidar
}

// ------------------------------------------------------------------ o adaptador

export async function iniciarBaileys({ dir, parear = '', aoQr, aoCodigo, aoPronto, aoCair, aoReceber, historico, aviso = () => {}, auth = null }) {
  const authDir = join(dir, 'auth');
  const destinos = new Map(); // telefone -> id da conversa de verdade
  let sock = null;
  let parado = false;
  let pronto = false;
  const entregas = criarRastreadorDeEntrega();
  let jaPediuCodigo = false;
  let tentativas = 0;
  let conflitos = 0;      // 440 seguidos: outra conexão usando a mesma conta
  let abertoEm = 0;

  const digitando = criarDigitando(async (contato, st) => {
    const chat = destinos.get(contato);
    if (chat && sock) await sock.sendPresenceUpdate(st === 'typing' ? 'composing' : 'paused', paraJid(chat)).catch(() => {});
  });

  const guardar = (m, { novo = false } = {}) => {
    const jid = m.key?.remoteJid || '';
    if (!jid || jid === 'status@broadcast' || jid.endsWith('@newsletter') || jid.endsWith('@broadcast')) return null;
    const chatId = paraChatId(jid);
    const resumo = resumoBaileys(m);
    if (!resumo.id) return null;
    historico.registrar({ chatId, grupo: jid.endsWith('@g.us'), nome: m.key.fromMe ? '' : (m.pushName || ''), mensagem: resumo });
    if (novo && !m.key.fromMe && !jid.endsWith('@g.us')) {
      const de = telefoneDoRemetente(m.key);
      destinos.set(de, chatId);
      return { id: resumo.id, de, nome: m.pushName || '', texto: lerConteudo(m.message).texto, tipo: resumo.tipo, grupo: false, minha: false, momento: resumo.quando };
    }
    return null;
  };

  async function abrir() {
    if (parado) return;
    // `auth`: sessão guardada no banco (servidor sem disco). Sem ele, usa a pasta.
    const { state, saveCreds } = auth ? { state: auth.state, saveCreds: auth.saveCreds } : await B.useMultiFileAuthState(authDir);
    const { version } = await B.fetchLatestBaileysVersion().catch(() => ({}));
    const s = makeWASocket({
      ...(version ? { version } : {}),
      auth: state,
      logger: pino({ level: 'silent' }),
      browser: B.Browsers.macOS('Chrome'),
      syncFullHistory: true, // ao conectar, o WhatsApp manda o histórico das conversas (só acontece no primeiro pareamento)
      markOnlineOnConnect: false,
    });
    sock = s;
    s.ev.on('creds.update', saveCreds);

    s.ev.on('messaging-history.set', ({ messages }) => {
      for (const m of messages || []) { try { guardar(m); } catch { /* uma mensagem estranha não derruba o resto */ } }
    });
    // confirmações do WhatsApp para o que enviamos (servidor recebeu, entregue, lida)
    s.ev.on('messages.update', (lista) => { for (const u of lista || []) entregas.registrar(u?.key?.id, u?.update?.status); });
    s.ev.on('message-receipt.update', (lista) => { for (const u of lista || []) if (u?.key?.fromMe) entregas.registrar(u.key.id, u.receipt?.readTimestamp ? 4 : 3); });
    s.ev.on('messages.upsert', ({ messages, type }) => {
      for (const m of messages || []) {
        try {
          const nova = guardar(m, { novo: type === 'notify' });
          if (nova) aoReceber(nova);
        } catch (e) { aviso('Aviso ao ler mensagem:', e.message); }
      }
    });

    s.ev.on('connection.update', async (u) => {
      if (s !== sock) return;
      if (u.qr && !state.creds.registered) {
        if (parear && !jaPediuCodigo) {
          jaPediuCodigo = true;
          try {
            const c = String(await s.requestPairingCode(parear));
            aoCodigo(c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c);
          } catch (e) {
            aviso('Não consegui pedir o código:', e.message);
            jaPediuCodigo = false;
            aoQr(u.qr); // sem código, o QR ainda serve
          }
        } else if (!parear) {
          aoQr(u.qr);
        }
      }
      if (u.connection === 'open') {
        pronto = true; tentativas = 0; abertoEm = Date.now();
        aoPronto(digitos(s.user?.id));
      }
      if (u.connection === 'close') {
        pronto = false;
        const codigo = u.lastDisconnect?.error?.output?.statusCode;
        aviso(`Conexão fechada (código ${codigo ?? '?'}: ${String(u.lastDisconnect?.error?.message || '').slice(0, 80)}).`);
        if (parado) return;
        if (codigo === B.DisconnectReason.loggedOut) {
          rmSync(authDir, { recursive: true, force: true });
          await auth?.apagar();
          jaPediuCodigo = false;
          aoCair('o WhatsApp foi desconectado pelo celular');
        }
        tentativas += 1;
        if (codigo === 440) {
          // outra conexão com a mesma conta: reconectar na hora só derruba a outra e vira briga sem fim (nenhum envio passa)
          conflitos = abertoEm && Date.now() - abertoEm > 120000 ? 1 : conflitos + 1;
          if (conflitos >= 4) {
            parado = true;
            aoCair('outra conexão está usando este WhatsApp (conflito); o serviço parou para não derrubar o número');
            return;
          }
          await dormir(20000 * conflitos);
        } else {
          await dormir(Math.min(30000, 2000 * tentativas)); // sem martelar o WhatsApp
        }
        abrir().catch((e) => { aviso('Falha ao reconectar:', e.message); });
      }
    });
  }

  await abrir();

  return {
    get pronto() { return pronto; },
    async enviar(telefone, texto, digitandoMs, chatId = '') {
      try {
        if (!sock || !pronto) return { ok: false, erro: 'O WhatsApp não está conectado agora.' };
        let jid;
        if (chatId) jid = paraJid(chatId);
        else if (destinos.get(telefone)) jid = paraJid(destinos.get(telefone));
        else if (String(telefone).length >= 14) jid = `${telefone}@lid`;
        else {
          // número novo: confere se existe no WhatsApp (número inválido pesa contra a conta)
          const [r] = (await sock.onWhatsApp(telefone)) || [];
          if (!r?.exists) return { ok: false, erro: 'Esse número não está no WhatsApp.' };
          jid = r.jid;
        }
        const espera = Math.min(9000, Math.max(0, Number(digitandoMs) || 0));
        await sock.sendPresenceUpdate('composing', jid).catch(() => {});
        await dormir(espera);
        await sock.sendPresenceUpdate('paused', jid).catch(() => {});
        const enviada = await sock.sendMessage(jid, { text: texto });
        if (!enviada?.key?.id) return { ok: false, erro: 'o WhatsApp não devolveu o envio' };
        // só conta como enviada quando o servidor do WhatsApp confirma; sem isso a tela dizia "enviado" e o celular não tinha nada
        const confirmacao = await entregas.aguardar(enviada.key.id, 25000);
        if (confirmacao === 0) return { ok: false, erro: 'o WhatsApp recusou a mensagem (o número pode estar restrito)' };
        if (confirmacao === null) return { ok: false, erro: 'o WhatsApp não confirmou o envio (o número pode estar restrito ou sem conexão)' };
        guardar({ ...enviada, key: { ...enviada.key, fromMe: true }, message: { conversation: texto }, status: confirmacao });
        return { ok: true, entrega: confirmacao };
      } catch (e) {
        return { ok: false, erro: String(e.message || e).slice(0, 200) };
      }
    },
    /** Resposta feita pelo dono direto no chat do LeadSage. */
    async enviarNoChat(chatId, texto) {
      if (!sock || !pronto) throw new Error('O WhatsApp não está conectado agora.');
      const enviada = await sock.sendMessage(paraJid(chatId), { text: texto });
      if (!enviada?.key?.id) throw new Error('o WhatsApp não devolveu o envio');
      const confirmacao = await entregas.aguardar(enviada.key.id, 25000);
      if (confirmacao === 0) throw new Error('o WhatsApp recusou a mensagem (o número pode estar restrito)');
      if (confirmacao === null) throw new Error('o WhatsApp não confirmou o envio: a mensagem pode não ter chegado');
      const msg = { ...enviada, key: { ...enviada.key, remoteJid: paraJid(chatId), fromMe: true }, message: { conversation: texto }, status: confirmacao };
      guardar(msg);
      return resumoBaileys(msg);
    },
    async chats(limite = 40) { return historico.chats(limite); },
    async mensagens(chatId, limite = 60) { return historico.mensagens(chatId, limite); },
    async lida(chatId) { historico.lida(chatId); },
    digitar: (contato, ligado) => (ligado ? digitando.iniciar(contato) : digitando.parar(contato)),
    diagnostico: () => ({ fonteChats: 'historico', fonteMensagens: 'historico', erros: {} }),
    async parar() { parado = true; try { sock?.end(undefined); } catch { /* já fechou */ } await auth?.descarregar(); },
    /** Sai do número (some da lista de aparelhos conectados) e apaga a sessão. */
    async sair() {
      parado = true;
      try { await sock?.logout(); } catch { /* já estava fora */ }
      try { sock?.end(undefined); } catch { /* idem */ }
      rmSync(authDir, { recursive: true, force: true });
      await auth?.apagar();
    },
  };
}
