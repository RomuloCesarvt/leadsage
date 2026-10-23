/**
 * LeadSage Nuvem: o WhatsApp de cada usuário, ligado o tempo todo num servidor.
 *
 * Fala com o LeadSage como o Conector do computador fala (mesmas rotas, uma chave por usuário),
 * só que muitos usuários no mesmo processo. A lista de quem deve estar ligado vem do LeadSage
 * (`/api/worker/sessoes`): quem liga a nuvem entra, quem desliga sai (e o WhatsApp dele é
 * desconectado). Se o LeadSage não responder, nada é desligado: a sessão só cai por pedido do usuário.
 *
 * Variáveis: LEADSAGE_URL (https://...), WORKER_SECRET, DADOS_DIR (pasta que persiste; padrão ./dados).
 */
import { mkdirSync } from 'node:fs';
import { createHmac, timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clienteLeadsage, criarAgrupador, criarHistorico, enviarPendentes, entregarMensagem, tentarDeNovo, tratarChat,
} from '../conector/leadsage-conector.mjs';
import { iniciarBaileys } from './adaptador-baileys.mjs';
import { authRemoto, guardaRemota } from './auth-remoto.mjs';

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const agora = () => new Date().toISOString().slice(11, 19);


const ORIGENS = (process.env.CHAT_ORIGENS || 'https://leadsageofc.vercel.app,http://localhost:5173,http://127.0.0.1:5173').split(',');

/** Token do chat: uid.exp.assinatura (HMAC com o segredo do serviço). Devolve o uid ou '' se inválido/vencido. */
export function uidDoToken(token, segredo, agoraS = Math.floor(Date.now() / 1000)) {
  const [uid, exp, sig] = String(token || '').split('.');
  if (!uid || !exp || !sig || Number(exp) < agoraS) return '';
  const esperado = createHmac('sha256', segredo).update(`${uid}.${exp}`).digest('hex');
  const a = Buffer.from(sig), b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b) ? uid : '';
}

/** API de chat servida pelo próprio worker: o navegador lê as conversas direto daqui, sem passar pelo banco. */
export function criarApiChat({ gerente, segredo }) {
  return async (req, res) => {
    const origem = req.headers.origin || '';
    const cors = {
      'access-control-allow-origin': ORIGENS.includes(origem) ? origem : ORIGENS[0],
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      vary: 'origin',
    };
    const responder = (status, json) => { res.writeHead(status, { 'content-type': 'application/json', ...cors }); res.end(JSON.stringify(json)); };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    const url = new URL(req.url, 'http://x');
    if (!url.pathname.startsWith('/chat')) return responder(200, { ok: true, sessoes: gerente.total() });
    const uid = uidDoToken((req.headers.authorization || '').replace(/^Bearer\s+/i, ''), segredo);
    if (!uid) return responder(401, { erro: 'Acesso negado.' });
    let corpo = {};
    if (req.method === 'POST') {
      const partes = [];
      for await (const c of req) { partes.push(c); if (partes.reduce((n, x) => n + x.length, 0) > 100000) return responder(413, { erro: 'Grande demais.' }); }
      try { corpo = JSON.parse(Buffer.concat(partes).toString() || '{}'); } catch { return responder(400, { erro: 'JSON inválido.' }); }
    }
    const wa = gerente.ativas.get(uid)?.sessao?.wa || null;
    const r = await tratarChat(wa && wa.pronto ? wa : null, req.method, url.pathname.replace(/^\/chat/, '/chats'), url.searchParams, corpo);
    responder(r.status, r.json);
  };
}

export class Sessao {
  constructor({ uid, chave, site, dados, aviso, fabrica = iniciarBaileys, authFabrica = null, segredo = '' }) {
    this.segredo = segredo;
    this.authFabrica = authFabrica; // sessão no banco (servidor sem disco); sem ele, usa a pasta
    this.uid = uid;
    this.chave = chave;
    this.site = site;
    this.dir = join(dados, uid.replace(/[^0-9A-Za-z_-]/g, '_'));
    this.aviso = (...a) => aviso(`[${uid.slice(0, 6)}]`, ...a);
    this.fabrica = fabrica;
    this.ls = clienteLeadsage({ site, chave });
    this.estado = { fase: 'iniciando', numero: '', qr: '', codigo: '' };
    this.pronto = false;
    this.parou = false;
    this.pedidos = { remoto: false, abrir: [], parear: '' };
    this.pareando = '';
    this.wa = null;
  }

  async empurrar() {
    const e = this.estado;
    const p = await this.ls.ping(e.numero, e.fase === 'pronto' ? 'ready' : e.fase, { fase: e.fase, qr: e.fase === 'qr' ? e.qr : '', codigo: e.codigo });
    this.ultimoPing = Date.now();
    if (!p?.ok) {
      // sem isto, um ping recusado (chave que não vale, banco fora) deixava a tela em "aguardando" sem nenhuma pista
      const agora = Date.now();
      if (!this.ultimoAvisoPing || agora - this.ultimoAvisoPing > 60000) {
        this.ultimoAvisoPing = agora;
        this.aviso(`O LeadSage recusou o aviso de estado (HTTP ${p?.status ?? '?'}): ${String(p?.dados?.detail || p?.dados?.erro || '').slice(0, 120)}`);
      }
    }
    this.lerPing(p);
    return p;
  }

  lerPing(p) {
    if (!p?.dados) return;
    if (typeof p.dados.robo_ativo === 'boolean') this.roboAtivo = p.dados.robo_ativo;
    if ('remoto' in p.dados) this.pedidos = { remoto: Boolean(p.dados.remoto), abrir: p.dados.abrir || [], parear: p.dados.parear || '' };
  }

  async ligar(parear = '') {
    const { default: QRCode } = await import('qrcode');
    const qrParaTexto = (qr) => QRCode.toDataURL(qr, { width: 300, margin: 1 });
    this.wa = await this.fabrica({
      dir: this.dir,
      parear,
      auth: this.authFabrica ? await this.authFabrica(this.uid) : null,
      historico: this.historico,
      aviso: this.aviso,
      transcrever: (audio, mimetype) => this.ls.transcrever(audio, mimetype),   // o robô entende áudio: o LeadSage transcreve de graça
      aoQr: async (qr) => {
        this.aviso('QR code gerado, aguardando leitura.');
        this.estado = { ...this.estado, fase: 'qr', codigo: '', qr: await qrParaTexto(qr) };
        this.empurrar().catch(() => {});
      },
      aoCodigo: (codigo) => {
        this.estado = { ...this.estado, fase: 'codigo', codigo, qr: '' };
        this.aviso(`Código de pareamento gerado.`);
        this.empurrar().catch(() => {});
      },
      aoPronto: async (numero) => {
        this.pronto = true; // `pareando` fica: lembra do pedido já atendido, para não repetir
        this.estado = { fase: 'pronto', numero, qr: '', codigo: '' };
        await this.empurrar();
        setTimeout(() => this.ls.reprocessar('').catch(() => {}), 10000);
        this.aviso(`WhatsApp pronto (${numero}).`);
      },
      aoCair: (motivo) => {
        this.pronto = false; this.pareando = '';
        this.estado = { ...this.estado, fase: 'erro', qr: '', codigo: '' };
        this.aviso(`WhatsApp desconectado (${motivo}).`);
        this.empurrar().catch(() => {});
      },
      aoReceber: async (m) => {
        if (!this.pronto) return;
        const guardada = await entregarMensagem(this.ls, m, this.inicioS, this.vistos, this.aviso, null, { adiar: true });
        if (guardada) this.agrupador.registrar(m.de);
      },
    });
  }

  async responderAgora(contato) {
    if (this.roboAtivo) this.wa?.digitar(contato, true);
    const r = await this.ls.reprocessar(contato);
    const d = r.dados || {};
    if (d.respondidas > 0) { this.aviso(`Robô respondeu a ${contato}.`); this.proximaSaida = 0; return; }
    this.wa?.digitar(contato, false);
    if (d.silencio) this.aviso(`Robô NÃO respondeu a ${contato}: ${d.silencio}`);
    if (d.tentar_de_novo) tentarDeNovo(this.ls, contato).catch(() => {});
  }

  /** Sem ninguém olhando: manda a lista de conversas (e as últimas mensagens das mais recentes) quando ela MUDOU, no máximo a cada 60 s.
   * Assim, quando a tela abre, ou o serviço estava dormindo, o servidor já tem tudo, e a lista nunca aparece vazia. */
  async espelharSozinho() {
    const v = this.historico?.versao?.() ?? 0;
    const t = Date.now();
    if (v === this.versaoEspelhada && t - (this.ultimoEspelhoSozinho || 0) < 10 * 60 * 1000) return;
    if (t - (this.ultimoEspelhoSozinho || 0) < 60000) return;
    this.ultimoEspelhoSozinho = t;
    this.versaoEspelhada = v;
    const chats = await this.wa.chats(80);
    await this.ls.espelho({ chats });
    for (const c of chats.slice(0, 12)) {
      if (!c.id) continue;
      await this.ls.espelho({ chat_id: c.id, mensagens: await this.wa.mensagens(c.id, 40) });
    }
  }

  async espelhar() {
    const t = Date.now();
    if (t - (this.ultimoEspelhoChats || 0) > 5000) {
      this.ultimoEspelhoChats = t;
      await this.ls.espelho({ chats: await this.wa.chats(80) });
    }
    for (const id of this.pedidos.abrir) {
      if (t - (this.ultimoEspelhoMsgs.get(id) || 0) > 3000) {
        this.ultimoEspelhoMsgs.set(id, t);
        await this.ls.espelho({ chat_id: id, mensagens: await this.wa.mensagens(id, 60) });
      }
    }
  }

  /** Roda até `parar()`. Cada volta é curta; erros de rede só viram aviso. */
  async rodar() {
    mkdirSync(this.dir, { recursive: true });
    // sem disco (hospedagem gratuita), as conversas ficam no banco do LeadSage, cifradas: sobrevivem a reinícios
    this.historico = this.authFabrica && this.segredo
      ? criarHistorico('', { maxMensagens: 25, maxChats: 120, ...guardaRemota({ site: this.site, segredo: this.segredo, uid: this.uid, aviso: this.aviso }) })
      : criarHistorico(join(this.dir, 'historico.json'));
    await this.historico.carregar();
    this.inicioS = Math.floor(Date.now() / 1000);
    this.vistos = new Set();
    this.roboAtivo = true;
    this.proximaSaida = 0;
    this.ultimoPing = 0;
    this.ultimaVarredura = Date.now();
    this.ultimoEspelhoMsgs = new Map();
    this.agrupador = criarAgrupador((c) => this.responderAgora(c));

    try {
      const p0 = await this.ls.ping('', 'iniciando', { fase: 'iniciando' });
      this.lerPing(p0);
      this.pareando = this.pedidos.parear || '';
      await this.ligar(this.pareando);
    } catch (e) {
      this.aviso('Erro ao iniciar:', e.message);
      return;
    }

    try {
      await this.laco();
    } finally {
      // saiu do laço por qualquer motivo (chave revogada, erro, parar): o WhatsApp DESTA sessão fecha junto.
      // Sem isso ficava um socket órfão conectado e a sessão nova da mesma conta brigava com ele (440 "conflict" sem fim).
      if (!this.parou) { this.parou = true; try { await this.wa?.parar(); } catch { /* já fechou */ } }
    }
  }

  async laco() {
    while (!this.parou) {
      try {
        if (this.pronto && Date.now() >= this.proximaSaida) {
          const r = await enviarPendentes(this.ls, this.wa, this.aviso);
          this.proximaSaida = Date.now() + r.proximaEm * 1000;
          this.pedidos = r.pedidos || this.pedidos;
        }
        if (this.pronto && this.pedidos.remoto) await this.espelhar();
        else if (this.pronto) await this.espelharSozinho();
        if (this.pronto && Date.now() - this.ultimaVarredura > 15 * 60 * 1000) { this.ultimaVarredura = Date.now(); this.ls.reprocessar('').catch(() => {}); }
        if (!this.pronto && Date.now() - this.ultimoPing > 15000) await this.empurrar();
        if (this.pronto && Date.now() - this.ultimoPing > 60000) await this.empurrar();
        // pedido de "conectar pelo número": vale em qualquer fase; se há outro número ligado, sai dele antes
        // Um número já conectado NUNCA é derrubado por um pedido de código: só o botão Desligar desconecta.
        const quer = this.pedidos.parear;
        if (quer && quer !== this.pareando && !this.pronto) {
          this.pareando = quer;
          this.aviso(`Conectar pelo número ${quer}...`);
          this.estado = { ...this.estado, fase: 'iniciando', codigo: '', qr: '' };
          await this.wa?.parar();
          await this.ligar(quer);
          this.empurrar().catch(() => {});
        }
      } catch (e) {
        if (/revogada|errada/.test(String(e.message))) { this.aviso(e.message); return; }
        this.aviso('Aviso:', e.message);
      }
      await dormir(1500);
    }
  }

  /** Para a sessão. `sair`: também desconecta o WhatsApp do usuário e apaga a sessão guardada. */
  async parar({ sair = false } = {}) {
    this.parou = true;
    if (sair) await this.wa?.sair(); else await this.wa?.parar();
  }
}

// ------------------------------------------------------------------ o gerente de sessões

/**
 * Concessão do WhatsApp de cada usuário: com vários serviços da nuvem rodando (hospedagens gratuitas diferentes), só um atende
 * cada número por vez. `tomar` devolve true (é nosso), false (é de outro) ou null (não deu para perguntar: não mexe em nada).
 */
export function criarConcessao({ site, segredo, quem }) {
  const chamar = async (caminho) => {
    try {
      const r = await fetch(`${site}/api/worker/lease/${caminho}`, {
        method: 'POST', headers: { 'x-worker-secret': segredo, 'content-type': 'application/json' },
        body: JSON.stringify({ quem, ttl_s: 120 }), signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) return null;
      return (await r.json()).ok === true;
    } catch { return null; }
  };
  return {
    quem,
    tomar: (uid) => chamar(encodeURIComponent(uid)),
    liberar: (uid) => chamar(`${encodeURIComponent(uid)}/liberar`),
  };
}

export function criarGerente({ site, segredo, dados, aviso = console.log, sessaoNoBanco = false, fabricaSessao = null, desconectar = async () => {}, concessao = null }) {
  // sem concessão (um serviço só): tudo é nosso
  concessao = concessao || { quem: 'unico', tomar: async () => true, liberar: async () => true };
  const authFabrica = sessaoNoBanco ? (uid) => authRemoto({ site, segredo, uid, aviso }) : null;
  fabricaSessao = fabricaSessao || ((o) => new Sessao({ ...o, authFabrica, segredo }));
  const ativas = new Map(); // uid -> { sessao, chave }

  async function lista() {
    try {
      const r = await fetch(`${site}/api/worker/sessoes`, { headers: { 'x-worker-secret': segredo }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) { aviso(`LeadSage respondeu ${r.status} ao pedir as sessões.`); return null; }
      const j = await r.json();
      return { sessoes: j.sessoes || [], desligar: j.desligar || [], parcial: Boolean(j.parcial) };
    } catch (e) {
      aviso('Sem resposta do LeadSage:', e.message);
      return null; // sem lista: não mexe em ninguém
    }
  }

  const avisarDesligada = (uid) => fetch(`${site}/api/worker/desligadas/${encodeURIComponent(uid)}`, {
    method: 'POST', headers: { 'x-worker-secret': segredo }, signal: AbortSignal.timeout(20000),
  }).catch(() => {});

  async function sincronizar() {
    const alvo = await lista();
    if (alvo === null) return;
    // 1) quem clicou em Desligar: este é o ÚNICO caso em que o WhatsApp é desconectado
    for (const uid of alvo.desligar) {
      const atual = ativas.get(uid);
      if (!atual && (await concessao.tomar(uid)) !== true) continue; // o serviço que atende este usuário cuida do pedido
      aviso(`Desconectando ${uid.slice(0, 6)} (o usuário pediu).`);
      ativas.delete(uid);
      try {
        if (atual) await atual.sessao.parar({ sair: true });
        else await desconectar(uid);
        await avisarDesligada(uid);
        await concessao.liberar(uid);
      } catch (e) { aviso('Não consegui desconectar agora; tento de novo:', e.message); }
    }
    const pediramSair = new Set(alvo.desligar);
    // 2) quem está na lista fica ligado
    const uids = new Set(alvo.sessoes.map((s) => s.uid));
    for (const { uid, chave } of alvo.sessoes) {
      if (pediramSair.has(uid)) continue;
      const atual = ativas.get(uid);
      if (atual && atual.chave === chave) continue;
      if (!atual && (await concessao.tomar(uid)) !== true) continue; // outro serviço atende este usuário agora
      if (atual) await atual.sessao.parar(); // a chave mudou: recomeça com a nova (a sessão do WhatsApp continua)
      const sessao = fabricaSessao({ uid, chave, site, dados, aviso });
      ativas.set(uid, { sessao, chave });
      aviso(`Sessão ligada: ${uid.slice(0, 6)}`);
      sessao.rodar().catch((e) => aviso('Sessão caiu:', e.message)).finally(() => {
        if (ativas.get(uid)?.sessao === sessao) { ativas.delete(uid); void concessao.liberar(uid); } // volta na próxima rodada
      });
    }
    // 3) sumiu da lista sem pedir para desligar (falha momentânea, banco): só para de atender aqui.
    //    A sessão do WhatsApp continua guardada e conectada; nada é desconectado.
    //    Lista parcial (o banco principal está sem cota): só liga quem aparece, ninguém é parado.
    for (const [uid, { sessao }] of ativas) {
      if (alvo.parcial) break;
      if (!uids.has(uid) && !pediramSair.has(uid)) {
        aviso(`Fora da lista, sem pedido de desligar: mantendo o WhatsApp conectado (${uid.slice(0, 6)}).`);
        ativas.delete(uid);
        await sessao.parar();
        await concessao.liberar(uid);
      }
    }
  }

  /** Renova a concessão de quem atendemos; se outro serviço a tomou, para por aqui (sem desconectar o número). */
  async function renovar() {
    for (const [uid, { sessao }] of [...ativas]) {
      const r = await concessao.tomar(uid);
      if (r === false) {
        aviso(`Outro serviço assumiu ${uid.slice(0, 6)}: parando aqui (o número continua conectado).`);
        ativas.delete(uid);
        await sessao.parar();
      }
    }
  }

  /** Serviço desligando: devolve as concessões para outro assumir já, sem esperar o prazo. */
  async function liberarTodas() {
    for (const [uid, { sessao }] of [...ativas]) {
      ativas.delete(uid);
      try { await sessao.parar(); } catch { /* já parou */ }
      await concessao.liberar(uid);
    }
  }

  return { sincronizar, renovar, liberarTodas, ativas, total: () => ativas.size };
}

// ------------------------------------------------------------------ principal

async function principal() {
  const site = (process.env.LEADSAGE_URL || '').replace(/\/+$/, '');
  const segredo = process.env.WORKER_SECRET || '';
  const dados = resolve(process.env.DADOS_DIR || './dados');
  if (!/^https?:\/\//.test(site) || segredo.length < 16) {
    console.error('Defina LEADSAGE_URL (https://...) e WORKER_SECRET (16+ caracteres).');
    process.exit(1);
  }
  mkdirSync(dados, { recursive: true });
  const aviso = (...a) => console.log(agora(), ...a);
  // padrão: a sessão do WhatsApp fica no banco do LeadSage (criptografada), então o serviço roda em
  // hospedagem sem disco. AUTH=disco guarda em arquivos (VM com disco próprio).
  const sessaoNoBanco = (process.env.AUTH || 'banco') !== 'disco';
  const desconectar = async (uid) => {
    // abre a sessão guardada só para sair dela direito (some da lista de aparelhos do celular) e apaga o que foi guardado
    const auth = await authRemoto({ site, segredo, uid, aviso });
    if (!auth.state.creds.account) { await auth.apagar(); return; } // nada conectado: só limpa
    await new Promise((resolve, reject) => {
      const limite = setTimeout(() => reject(new Error('o WhatsApp não abriu a tempo')), 90000);
      iniciarBaileys({
        dir: join(dados, 'saindo'), auth, historico: criarHistorico(''), aviso,
        aoQr() {}, aoCodigo() {}, aoCair() {}, aoReceber() {},
        aoPronto: async () => { clearTimeout(limite); try { await wa.sair(); resolve(); } catch (e) { reject(e); } },
      }).then((x) => { wa = x; }).catch(reject);
      let wa;
    });
  };
  const quem = `${process.env.RENDER_SERVICE_NAME || process.env.HOSTNAME || 'servico'}-${process.pid}-${Math.random().toString(36).slice(2, 7)}`;
  const gerente = criarGerente({ site, segredo, dados, aviso, sessaoNoBanco, desconectar, concessao: criarConcessao({ site, segredo, quem }) });
  setInterval(() => { gerente.renovar().catch(() => {}); }, 30000).unref();
  const sair = async () => { aviso('Desligando: devolvendo os números para outro serviço assumir.'); await Promise.race([gerente.liberarTodas(), dormir(8000)]); process.exit(0); };
  process.on('SIGTERM', sair);
  process.on('SIGINT', sair);

  // a plataforma (Fly, Railway...) confere se o processo está vivo por aqui
  http.createServer(criarApiChat({ gerente, segredo }))
    .listen(Number(process.env.PORT) || 8080, '0.0.0.0');

  aviso(`LeadSage Nuvem ligado. Site: ${site}`);
  for (;;) {
    await gerente.sincronizar();
    await dormir(45000);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.on('unhandledRejection', (e) => console.log('Aviso (promessa):', e?.message || e));
  principal();
}
