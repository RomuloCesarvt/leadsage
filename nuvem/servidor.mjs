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
import http from 'node:http';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clienteLeadsage, criarAgrupador, criarHistorico, enviarPendentes, entregarMensagem, tentarDeNovo,
} from '../conector/leadsage-conector.mjs';
import { iniciarBaileys } from './adaptador-baileys.mjs';
import { authRemoto, guardaRemota } from './auth-remoto.mjs';

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const agora = () => new Date().toISOString().slice(11, 19);

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
      aoQr: async (qr) => {
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
      ? criarHistorico('', { maxMensagens: 40, maxChats: 60, ...guardaRemota({ site: this.site, segredo: this.segredo, uid: this.uid, aviso: this.aviso }) })
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

    while (!this.parou) {
      try {
        if (this.pronto && Date.now() >= this.proximaSaida) {
          const r = await enviarPendentes(this.ls, this.wa, this.aviso);
          this.proximaSaida = Date.now() + r.proximaEm * 1000;
          this.pedidos = r.pedidos || this.pedidos;
        }
        if (this.pronto && this.pedidos.remoto) await this.espelhar();
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

export function criarGerente({ site, segredo, dados, aviso = console.log, sessaoNoBanco = false, fabricaSessao = null, desconectar = async () => {} }) {
  const authFabrica = sessaoNoBanco ? (uid) => authRemoto({ site, segredo, uid, aviso }) : null;
  fabricaSessao = fabricaSessao || ((o) => new Sessao({ ...o, authFabrica, segredo }));
  const ativas = new Map(); // uid -> { sessao, chave }

  async function lista() {
    try {
      const r = await fetch(`${site}/api/worker/sessoes`, { headers: { 'x-worker-secret': segredo }, signal: AbortSignal.timeout(20000) });
      if (!r.ok) { aviso(`LeadSage respondeu ${r.status} ao pedir as sessões.`); return null; }
      const j = await r.json();
      return { sessoes: j.sessoes || [], desligar: j.desligar || [] };
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
      aviso(`Desconectando ${uid.slice(0, 6)} (o usuário pediu).`);
      ativas.delete(uid);
      try {
        if (atual) await atual.sessao.parar({ sair: true });
        else await desconectar(uid);
        await avisarDesligada(uid);
      } catch (e) { aviso('Não consegui desconectar agora; tento de novo:', e.message); }
    }
    const pediramSair = new Set(alvo.desligar);
    // 2) quem está na lista fica ligado
    const uids = new Set(alvo.sessoes.map((s) => s.uid));
    for (const { uid, chave } of alvo.sessoes) {
      if (pediramSair.has(uid)) continue;
      const atual = ativas.get(uid);
      if (atual && atual.chave === chave) continue;
      if (atual) await atual.sessao.parar(); // a chave mudou: recomeça com a nova (a sessão do WhatsApp continua)
      const sessao = fabricaSessao({ uid, chave, site, dados, aviso });
      ativas.set(uid, { sessao, chave });
      aviso(`Sessão ligada: ${uid.slice(0, 6)}`);
      sessao.rodar().catch((e) => aviso('Sessão caiu:', e.message)).finally(() => {
        if (ativas.get(uid)?.sessao === sessao) ativas.delete(uid); // volta na próxima rodada
      });
    }
    // 3) sumiu da lista sem pedir para desligar (falha momentânea, banco): só para de atender aqui.
    //    A sessão do WhatsApp continua guardada e conectada; nada é desconectado.
    for (const [uid, { sessao }] of ativas) {
      if (!uids.has(uid) && !pediramSair.has(uid)) {
        aviso(`Fora da lista, sem pedido de desligar: mantendo o WhatsApp conectado (${uid.slice(0, 6)}).`);
        ativas.delete(uid);
        await sessao.parar();
      }
    }
  }

  return { sincronizar, ativas, total: () => ativas.size };
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
  const gerente = criarGerente({ site, segredo, dados, aviso, sessaoNoBanco, desconectar });

  // a plataforma (Fly, Railway...) confere se o processo está vivo por aqui
  http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, sessoes: gerente.total() })); })
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
