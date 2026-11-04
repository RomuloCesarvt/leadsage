/**
 * O modo da conta: "agencia" (vende sites, Google e marketing para outros negócios) ou "empresa" (vende o próprio serviço,
 * por exemplo ar-condicionado, sem site nem prévia). Muda só a apresentação (menus, oferta do robô), nunca a permissão.
 * Conta sem modo gravado é conta antiga e continua como agência.
 */
import type { UserProfile } from '../types';

export type ModoDaConta = 'agencia' | 'empresa';

const CHAVE_PENDENTE = 'leadsage_modo_novo';

export const modoDaConta = (user?: Pick<UserProfile, 'modo'> | null): ModoDaConta => (user?.modo === 'empresa' ? 'empresa' : 'agencia');
export const ehEmpresa = (user?: Pick<UserProfile, 'modo'> | null): boolean => modoDaConta(user) === 'empresa';

/** Telas que só fazem sentido para agência: o modo empresa não vende site. */
export const TELAS_SO_DA_AGENCIA = ['create-site', 'my-sites', 'calculator'] as const;
export const telaVale = (tela: string, user?: Pick<UserProfile, 'modo'> | null): boolean =>
  !(ehEmpresa(user) && (TELAS_SO_DA_AGENCIA as readonly string[]).includes(tela));

/** A escolha feita na entrada, guardada até o perfil da conta nova existir. Só vale para cadastro novo. */
export const lembrarModoNovo = (modo: ModoDaConta): void => {
  try { localStorage.setItem(CHAVE_PENDENTE, modo); } catch { /* navegador sem armazenamento */ }
};
export const lerModoNovo = (): ModoDaConta | null => {
  try {
    const v = localStorage.getItem(CHAVE_PENDENTE);
    return v === 'empresa' || v === 'agencia' ? v : null;
  } catch { return null; }
};
export const esquecerModoNovo = (): void => { try { localStorage.removeItem(CHAVE_PENDENTE); } catch { /* ok */ } };

/** A última escolha da pessoa, guardada neste aparelho: se o servidor não gravou (cota, queda), o modo não volta sozinho para o antigo. */
const chaveLocal = (uid: string) => `leadsage_modo_${uid}`;
export const gravarModoLocal = (uid: string, modo: ModoDaConta): void => { try { localStorage.setItem(chaveLocal(uid), modo); } catch { /* sem armazenamento */ } };
export const lerModoLocal = (uid: string): ModoDaConta | null => {
  try { const v = localStorage.getItem(chaveLocal(uid)); return v === 'empresa' || v === 'agencia' ? v : null; } catch { return null; }
};

/** O perfil do servidor com a escolha local por cima, desde que a conta possa usar esse modo (ou o servidor não tenha dito quais tem). */
export const comModoLocal = <T extends { id?: string; modo?: string; modos?: string[]; semDados?: boolean }>(perfil: T): T => {
  const local = perfil?.id ? lerModoLocal(perfil.id) : null;
  if (!local || perfil.modo === local) return perfil;
  const sabe = Array.isArray(perfil.modos) && perfil.modos.length > 0 && !perfil.semDados;
  return !sabe || perfil.modos!.includes(local) ? { ...perfil, modo: local } : perfil;
};

/** A chave do espaço de trabalho de um modo: agência usa o uid de sempre (nada muda para quem já tem dados); empresa tem a sua. Igual ao servidor (espaco.py). */
export const espacoDoModo = (uid: string, modo: ModoDaConta): string => (modo === 'empresa' ? `${uid}~empresa` : uid);
