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
