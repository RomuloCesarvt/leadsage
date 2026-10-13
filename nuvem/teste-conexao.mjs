// Teste manual: abre uma conexão nova (sem número) e diz se o WhatsApp entrega o QR ou derruba (428).
// Uso: node teste-conexao.mjs   (não precisa de login; nada é conectado)
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarHistorico } from '../conector/leadsage-conector.mjs';
import { iniciarBaileys } from './adaptador-baileys.mjs';

const dir = mkdtempSync(join(tmpdir(), 'ls-conexao-'));
const t0 = Date.now();
const log = (...a) => console.log(`+${Math.round((Date.now() - t0) / 1000)}s`, ...a);
const wa = await iniciarBaileys({
  dir, auth: null, historico: criarHistorico(''), aviso: log,
  aoQr: () => { log('QR RECEBIDO: a conexão funciona'); setTimeout(() => process.exit(0), 500); },
  aoCodigo() {}, aoCair: (m) => log('caiu', m), aoReceber() {}, aoPronto: () => {},
});
setTimeout(() => { log('sem QR em 40s'); wa.parar().finally(() => process.exit(1)); }, 40000);
