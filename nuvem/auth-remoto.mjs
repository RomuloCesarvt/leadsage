/**
 * A sessão do WhatsApp (credenciais e chaves do Baileys) guardada no banco do LeadSage, criptografada.
 *
 * Servidores gratuitos não guardam arquivos: a cada reinício a pasta some, e o usuário teria de
 * escanear o QR de novo. Guardando a sessão no banco, o serviço pode ser reiniciado, trocado de
 * servidor ou ficar adormecido sem derrubar ninguém. O LeadSage só vê um texto cifrado: a chave
 * vem do WORKER_SECRET, que só o serviço tem.
 *
 * Regra de ouro: se não conseguir LER a sessão (rede, banco fora), NÃO começa uma nova — isso
 * apagaria a sessão que existe. Só começa do zero quando o LeadSage confirma que não há nada.
 */
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import * as B from '@whiskeysockets/baileys';

const MAX_BLOB = 900_000; // o banco aceita ~1 MB por documento

// O Render grátis dá só 5 GB de saída por mês por conta: a sessão e o histórico são regravados inteiros,
// então cada gravação conta. Por isso: compactar antes de cifrar, agrupar mudanças e não regravar o que não mudou.
const ESPERA_SESSAO_MS = 45_000;
const ESPERA_HISTORICO_MS = 60_000;
export { ESPERA_HISTORICO_MS };

/** `zip`: compacta antes de cifrar (texto JSON encolhe bastante). Quem lê reconhece sozinho: blobs antigos, sem compactar, continuam valendo. */
export function cifrar(texto, segredo, zip = false) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', scryptSync(segredo, 'leadsage-nuvem', 32), iv);
  const claro = zip ? gzipSync(Buffer.from(texto, 'utf8')) : Buffer.from(texto, 'utf8');
  const dados = Buffer.concat([c.update(claro), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), dados]).toString('base64');
}

export function decifrar(blob, segredo) {
  const b = Buffer.from(blob, 'base64');
  const d = createDecipheriv('aes-256-gcm', scryptSync(segredo, 'leadsage-nuvem', 32), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  const claro = Buffer.concat([d.update(b.subarray(28)), d.final()]);
  // JSON/texto nunca começa com os bytes 1f 8b; gzip sempre
  return (claro[0] === 0x1f && claro[1] === 0x8b ? gunzipSync(claro) : claro).toString('utf8');
}

/** Ler e gravar um texto cifrado no LeadSage (usado pelo histórico das conversas). */
export function guardaRemota({ site, segredo, uid, tipo = 'historico', buscar = fetch, aviso = () => {} }) {
  const url = `${site}/api/worker/${tipo}/${encodeURIComponent(uid)}`;
  const cab = { 'x-worker-secret': segredo, 'content-type': 'application/json' };
  let ultimo = null; // o que já está no banco: igual ao anterior, não manda de novo
  return {
    async ler() {
      const r = await buscar(url, { headers: cab, signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { blob } = await r.json();
      return blob ? decifrar(blob, segredo) : '{"chats":{}}';
    },
    async gravar(texto) {
      if (texto === ultimo) return;
      const cifrado = cifrar(texto, segredo, true);
      if (cifrado.length > MAX_BLOB) { aviso('O histórico ficou grande demais para guardar; guardando só o mais recente.'); return; }
      const r = await buscar(url, { method: 'PUT', headers: cab, body: JSON.stringify({ blob: cifrado }), signal: AbortSignal.timeout(20000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      ultimo = texto;
    },
  };
}

export async function authRemoto({ site, segredo, uid, aviso = () => {}, esperaMs = ESPERA_SESSAO_MS, buscar = fetch }) {
  const url = `${site}/api/worker/auth/${encodeURIComponent(uid)}`;
  const cab = { 'x-worker-secret': segredo, 'content-type': 'application/json' };

  const r = await buscar(url, { headers: cab, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Não consegui ler a sessão guardada (HTTP ${r.status}).`);
  const { blob } = await r.json();

  // Só vale uma sessão que terminou de parear (`account` aparece quando o WhatsApp confirma o aparelho).
  // Credenciais de um pareamento pela metade, carregadas de novo, fazem o WhatsApp responder "desconectado" em ciclo.
  const completa = (c) => Boolean(c && c.account);
  let creds = null;
  let keys = {};
  if (blob) {
    const j = JSON.parse(decifrar(blob, segredo), B.BufferJSON.reviver);
    if (completa(j.creds)) { creds = j.creds; keys = j.keys || {}; }
  }
  if (!creds) creds = B.initAuthCreds();

  let sujo = false;
  let timer = null;
  let gravando = Promise.resolve();
  let ultimo = null; // a última sessão que chegou ao banco: se nada mudou de verdade, não manda de novo

  async function gravar() {
    if (!sujo) return;
    sujo = false;
    const claro = JSON.stringify({ creds, keys }, B.BufferJSON.replacer);
    if (claro === ultimo) return;
    const texto = cifrar(claro, segredo, true);
    if (texto.length > MAX_BLOB) { aviso('A sessão ficou grande demais para guardar no banco.'); return; }
    try {
      const resp = await buscar(url, { method: 'PUT', headers: cab, body: JSON.stringify({ blob: texto }), signal: AbortSignal.timeout(20000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      ultimo = claro;
    } catch (e) {
      sujo = true; // tenta de novo na próxima
      aviso('Não consegui guardar a sessão:', e.message);
    }
  }

  const marcar = () => {
    if (!completa(creds)) return; // pareamento em andamento: nada a guardar ainda
    sujo = true;
    if (timer) return;
    timer = setTimeout(() => { timer = null; gravando = gravando.then(gravar); }, esperaMs);
    timer.unref?.();
  };

  return {
    state: {
      creds,
      keys: {
        get: async (tipo, ids) => {
          const saida = {};
          for (const id of ids) {
            let v = keys[tipo]?.[id];
            if (tipo === 'app-state-sync-key' && v) v = B.proto.Message.AppStateSyncKeyData.fromObject(v);
            saida[id] = v;
          }
          return saida;
        },
        set: async (dados) => {
          for (const tipo of Object.keys(dados)) {
            keys[tipo] = keys[tipo] || {};
            for (const id of Object.keys(dados[tipo])) {
              const v = dados[tipo][id];
              if (v) keys[tipo][id] = v; else delete keys[tipo][id];
            }
          }
          marcar();
        },
      },
    },
    saveCreds: async () => { marcar(); },
    /** Grava agora o que estiver pendente (antes de o processo parar). */
    async descarregar() { if (timer) { clearTimeout(timer); timer = null; } gravando = gravando.then(gravar); await gravando; },
    /** O usuário desconectou: apaga a sessão guardada. */
    async apagar() {
      if (timer) { clearTimeout(timer); timer = null; }
      sujo = false;
      ultimo = null;
      try { await buscar(url, { method: 'DELETE', headers: cab, signal: AbortSignal.timeout(20000) }); } catch (e) { aviso('Não consegui apagar a sessão guardada:', e.message); }
      // volta ao zero na memória (o mesmo objeto, que o Baileys já segura): a próxima conexão pede QR ou código de novo
      for (const k of Object.keys(creds)) delete creds[k];
      Object.assign(creds, B.initAuthCreds());
      keys = {};
    },
  };
}
