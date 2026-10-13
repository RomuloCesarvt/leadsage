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
import * as B from '@whiskeysockets/baileys';

const MAX_BLOB = 900_000; // o banco aceita ~1 MB por documento

export function cifrar(texto, segredo) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', scryptSync(segredo, 'leadsage-nuvem', 32), iv);
  const dados = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), dados]).toString('base64');
}

export function decifrar(blob, segredo) {
  const b = Buffer.from(blob, 'base64');
  const d = createDecipheriv('aes-256-gcm', scryptSync(segredo, 'leadsage-nuvem', 32), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8');
}

export async function authRemoto({ site, segredo, uid, aviso = () => {}, esperaMs = 4000, buscar = fetch }) {
  const url = `${site}/api/worker/auth/${encodeURIComponent(uid)}`;
  const cab = { 'x-worker-secret': segredo, 'content-type': 'application/json' };

  const r = await buscar(url, { headers: cab, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`Não consegui ler a sessão guardada (HTTP ${r.status}).`);
  const { blob } = await r.json();

  let creds = null;
  let keys = {};
  if (blob) {
    const j = JSON.parse(decifrar(blob, segredo), B.BufferJSON.reviver);
    creds = j.creds; keys = j.keys || {};
  }
  if (!creds) creds = B.initAuthCreds();

  let sujo = false;
  let encerrado = false; // depois de apagar, nada pode ressuscitar a sessão
  let timer = null;
  let gravando = Promise.resolve();

  async function gravar() {
    if (!sujo) return;
    sujo = false;
    const texto = cifrar(JSON.stringify({ creds, keys }, B.BufferJSON.replacer), segredo);
    if (texto.length > MAX_BLOB) { aviso('A sessão ficou grande demais para guardar no banco.'); return; }
    try {
      const resp = await buscar(url, { method: 'PUT', headers: cab, body: JSON.stringify({ blob: texto }), signal: AbortSignal.timeout(20000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch (e) {
      sujo = true; // tenta de novo na próxima
      aviso('Não consegui guardar a sessão:', e.message);
    }
  }

  const marcar = () => {
    if (encerrado) return;
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
      encerrado = true;
      if (timer) { clearTimeout(timer); timer = null; }
      sujo = false;
      try { await buscar(url, { method: 'DELETE', headers: cab, signal: AbortSignal.timeout(20000) }); } catch (e) { aviso('Não consegui apagar a sessão guardada:', e.message); }
    },
  };
}
