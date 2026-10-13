/**
 * O WhatsApp do usuário, de onde ele estiver.
 *
 * No computador onde o Conector roda, lê direto dele (rápido, nada vai para a nuvem). Em outro
 * aparelho, como o celular, o Conector local não existe para o navegador: lê o espelho curto que o
 * Conector mantém no servidor enquanto alguém olha, e responde pela fila que ele envia.
 */
import { api } from '../services/api';
import { conectorLocal, type ChatWhats, type EstadoConector, type FonteLista, type MensagemWhats } from './conectorLocal';

export type ListaWhats = { chats: ChatWhats[]; fonte: FonteLista; remoto: boolean; idade_s: number | null };

const paraEstado = (e: Awaited<ReturnType<typeof api.whatsEstado>>): EstadoConector | null => {
  if (!e.conectado) return null;
  const fase = e.fase || (e.online ? 'pronto' : 'iniciando');
  const mensagem = !e.online
    ? 'O computador com o Conector parece desligado. Ligue-o e abra o Conector de novo.'
    : fase === 'pronto' ? 'Buscando as conversas no computador…' : 'Conectando o WhatsApp…';
  return { fase: e.online ? fase : 'offline', qr: e.qr || '', codigo: e.codigo || '', mensagem, numero: e.numero || '' };
};

type Acesso = { url: string; token: string; ate: number };
let acesso: Acesso | null = null; // endereço + token do worker da nuvem (vale ~12 h; renova antes)
let semNuvemAte = 0; // depois de uma falha, não insiste por alguns segundos
let direto = false; // a última lista veio direto do worker

async function acessoNuvem(): Promise<Acesso | null> {
  if (acesso && acesso.ate > Date.now()) return acesso;
  const r = await api.whatsAcesso().catch(() => null);
  if (!r?.nuvem || !r.url || !r.token) { acesso = null; return null; }
  acesso = { url: r.url, token: r.token, ate: Date.now() + 11 * 3600 * 1000 };
  return acesso;
}

/** Fala direto com o worker da nuvem (as conversas não passam pelo banco, então não somem quando a cota estoura). */
async function doWorker<T>(caminho: string, init?: RequestInit): Promise<T | null> {
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const a = await acessoNuvem();
    if (!a) return null;
    try {
      const r = await fetch(`${a.url}/chat${caminho}`, {
        cache: 'no-store', ...init,
        headers: { ...(init?.headers || {}), authorization: `Bearer ${a.token}` },
        signal: AbortSignal.timeout(20000),
      });
      if (r.status === 401) { acesso = null; continue; } // token vencido: pega outro e tenta de novo
      if (!r.ok) return null;
      return (await r.json()) as T;
    } catch { return null; }
  }
  return null;
}

export const whats = {
  /** null: sem Conector em lugar nenhum. */
  async estado(): Promise<EstadoConector | null> {
    const local = await conectorLocal.estado().catch(() => null);
    if (local) return local;
    return paraEstado(await api.whatsEstado().catch(() => ({ conectado: false, online: false })));
  },

  async chats(limite = 80): Promise<ListaWhats | null> {
    const l = await conectorLocal.chats(limite).catch(() => null);
    if (l) return { ...l, remoto: false, idade_s: 0 };
    if (Date.now() > semNuvemAte) {
      const d = await doWorker<{ chats: ChatWhats[] }>(`?limite=${limite}`);
      if (d && Array.isArray(d.chats)) { direto = true; return { chats: d.chats, fonte: '', remoto: true, idade_s: 0 }; }
      direto = false;
      if (acesso) semNuvemAte = Date.now() + 15000; // worker fora do ar agora: usa o espelho um tempo
    }
    const r = await api.whatsChats();
    if (!r.conectado || r.idade_s === null) return null; // ainda sem espelho: mostra "conectando"
    return { chats: r.chats as ChatWhats[], fonte: '', remoto: true, idade_s: r.idade_s };
  },

  async mensagens(id: string, limite: number, remoto: boolean): Promise<MensagemWhats[] | null> {
    if (!remoto) return conectorLocal.mensagens(id, limite);
    if (direto) {
      const d = await doWorker<{ mensagens: MensagemWhats[] }>(`/${encodeURIComponent(id)}/mensagens?limite=${limite}`);
      if (d && Array.isArray(d.mensagens)) return d.mensagens;
    }
    const r = await api.whatsMensagens(id);
    return r.idade_s === null ? null : (r.mensagens as MensagemWhats[]);
  },

  async enviar(id: string, texto: string, remoto: boolean, telefone = ''): Promise<MensagemWhats | null> {
    if (!remoto) return conectorLocal.enviar(id, texto);
    if (direto) {
      const d = await doWorker<{ mensagem: MensagemWhats }>(`/${encodeURIComponent(id)}/enviar`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ texto }),
      });
      if (d?.mensagem) return d.mensagem;
    }
    await api.whatsEnviar(id, texto, telefone);
    // a mensagem sai em poucos segundos; mostra já, como o WhatsApp faz
    return { id: `p${Date.now()}`, texto, minha: true, quando: Math.floor(Date.now() / 1000), tipo: 'chat', midia: false, status: 0 };
  },

  async lida(id: string, remoto: boolean): Promise<void> {
    if (!remoto) { await conectorLocal.lida(id); return; }
    if (direto) await doWorker(`/${encodeURIComponent(id)}/lida`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  },
};
