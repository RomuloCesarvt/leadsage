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
    const r = await api.whatsChats();
    if (!r.conectado || r.idade_s === null) return null; // ainda sem espelho: mostra "conectando"
    return { chats: r.chats as ChatWhats[], fonte: '', remoto: true, idade_s: r.idade_s };
  },

  async mensagens(id: string, limite: number, remoto: boolean): Promise<MensagemWhats[] | null> {
    if (!remoto) return conectorLocal.mensagens(id, limite);
    const r = await api.whatsMensagens(id);
    return r.idade_s === null ? null : (r.mensagens as MensagemWhats[]);
  },

  async enviar(id: string, texto: string, remoto: boolean, telefone = ''): Promise<MensagemWhats | null> {
    if (!remoto) return conectorLocal.enviar(id, texto);
    await api.whatsEnviar(id, texto, telefone);
    // a mensagem sai em poucos segundos; mostra já, como o WhatsApp faz
    return { id: `p${Date.now()}`, texto, minha: true, quando: Math.floor(Date.now() / 1000), tipo: 'chat', midia: false, status: 0 };
  },

  async lida(id: string, remoto: boolean): Promise<void> {
    if (!remoto) await conectorLocal.lida(id);
  },
};
