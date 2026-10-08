/**
 * Fala com o Conector que roda no computador do usuário (http://127.0.0.1:2790).
 *
 * O chat do WhatsApp mora no computador dele: o LeadSage só mostra. O Conector só
 * responde a este site. Se ele estiver fechado, ou o navegador bloquear o acesso à
 * máquina local, as funções devolvem null e a tela mostra como conectar.
 */
export const CONECTOR_URL = 'http://127.0.0.1:2790';

export type EstadoConector = { fase: string; qr: string; mensagem: string; numero: string; versao?: string };

/** De onde o Conector tirou a lista: da página do WhatsApp Web, da biblioteca ou do histórico que ele mesmo guardou. */
export type FonteLista = 'pagina' | 'biblioteca' | 'historico' | '';

/** A versão mínima do Conector que tem o chat completo. */
export const VERSAO_MINIMA = '2.2.0';

export const versaoAntiga = (v?: string) => {
  const a = (v || '0').split('.').map(Number);
  const b = VERSAO_MINIMA.split('.').map(Number);
  for (let i = 0; i < 3; i++) { if ((a[i] || 0) !== b[i]) return (a[i] || 0) < b[i]; }
  return false;
};

export type ChatWhats = {
  id: string;
  nome: string;
  grupo: boolean;
  telefone: string;
  naoLidas: number;
  quando: number;
  ultima: { texto: string; minha: boolean } | null;
};

export type MensagemWhats = {
  id: string;
  texto: string;
  minha: boolean;
  quando: number;
  tipo: string;
  midia: boolean;
  /** miniatura que o próprio WhatsApp mandou junto (data URL), quando é foto, vídeo ou figurinha */
  miniatura?: string;
  status: number;
};

// Só para testes automáticos: outra porta, para não esbarrar num Conector de verdade aberto.
const base = () => {
  try { return localStorage.getItem('LEADSAGE_CONECTOR_URL') || CONECTOR_URL; } catch { return CONECTOR_URL; }
};

async function chamar<T>(caminho: string, init?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(`${base()}${caminho}`, { cache: 'no-store', ...init });
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      throw new Error(corpo.erro || `Erro ${r.status}`);
    }
    return (await r.json()) as T;
  } catch (e: any) {
    if (e instanceof TypeError) return null; // fechado ou bloqueado pelo navegador
    throw e;
  }
}

export const conectorLocal = {
  estado: () => chamar<EstadoConector>('/estado'),
  async chats(limite = 60): Promise<{ chats: ChatWhats[]; fonte: FonteLista } | null> {
    const r = await chamar<{ chats: ChatWhats[]; fonte?: FonteLista }>(`/chats?limite=${limite}`);
    return r ? { chats: r.chats, fonte: r.fonte || '' } : null;
  },
  diagnostico: () => chamar<Record<string, any>>('/diagnostico'),
  async mensagens(id: string, limite = 80): Promise<MensagemWhats[] | null> {
    const r = await chamar<{ mensagens: MensagemWhats[] }>(`/chats/${encodeURIComponent(id)}/mensagens?limite=${limite}`);
    return r ? r.mensagens : null;
  },
  async enviar(id: string, texto: string): Promise<MensagemWhats | null> {
    const r = await chamar<{ mensagem: MensagemWhats }>(`/chats/${encodeURIComponent(id)}/enviar`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ texto }),
    });
    return r ? r.mensagem : null;
  },
  async lida(id: string): Promise<void> {
    await chamar(`/chats/${encodeURIComponent(id)}/lida`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    });
  },
};
