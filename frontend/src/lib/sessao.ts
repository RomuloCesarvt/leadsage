/**
 * "Eu estava logado": uma marca local, só para a tela saber que o login SUMIU quando recarregar (F5) e não mostrar a tela de entrada
 * antes da hora nem sem explicar.
 *
 * Quem decide se há sessão é o Firebase (que guarda a dele no navegador). Esta marca não autentica nada: só diz "nesta máquina houve
 * um login recente". Se o Firebase responder "ninguém logado" mas a marca existe, o app espera um instante pela sessão que pode estar
 * chegando e, se ela não vier, avisa que o navegador não devolveu a sessão, em vez de parecer que o F5 deslogou sem motivo.
 */
const CHAVE = 'LEADSAGE_SESSAO';
const VALIDADE_DIAS = 60;

/** Quanto o app espera pela sessão restaurada antes de mostrar o login (só quando a marca existe). */
export const ESPERA_DA_SESSAO_MS = 3500;

export interface SessaoLembrada { uid: string; email: string; em: number }

type Guarda = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const padrao = (): Guarda | null => {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
};

export function lembrarSessao(uid: string, email: string | null | undefined, guarda: Guarda | null = padrao(), agora = Date.now()): void {
  try { guarda?.setItem(CHAVE, JSON.stringify({ uid, email: email || '', em: agora } satisfies SessaoLembrada)); } catch { /* sem armazenamento: segue sem a marca */ }
}

export function esquecerSessao(guarda: Guarda | null = padrao()): void {
  try { guarda?.removeItem(CHAVE); } catch { /* idem */ }
}

export function sessaoLembrada(guarda: Guarda | null = padrao(), agora = Date.now()): SessaoLembrada | null {
  try {
    const bruto = guarda?.getItem(CHAVE);
    if (!bruto) return null;
    const s = JSON.parse(bruto) as Partial<SessaoLembrada>;
    if (!s || typeof s.uid !== 'string' || !s.uid || typeof s.em !== 'number') return null;
    if (agora - s.em > VALIDADE_DIAS * 24 * 3600 * 1000) return null;
    return { uid: s.uid, email: String(s.email || ''), em: s.em };
  } catch {
    return null;
  }
}

/** Pede ao navegador para não apagar o armazenamento do site (login incluído) quando faltar espaço. Falhar não tem consequência. */
export async function pedirArmazenamentoDurável(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
