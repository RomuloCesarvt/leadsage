/**
 * Trabalho longo em andamento na tela (gerar mensagens para vários leads, por exemplo).
 * Enquanto houver, o aviso de "versão nova" não pede para recarregar e o navegador pergunta antes de fechar a aba:
 * recarregar no meio fazia a geração parar e a seleção se perder.
 */
let ocupados = 0;
const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };

export const emAndamento = (): boolean => ocupados > 0;

/** Marca um trabalho como em andamento; devolve a função que o encerra. */
export const iniciarTrabalho = (): (() => void) => {
  if (ocupados === 0 && typeof window !== 'undefined') window.addEventListener('beforeunload', aviso);
  ocupados++;
  let feito = false;
  return () => {
    if (feito) return;
    feito = true;
    ocupados = Math.max(0, ocupados - 1);
    if (ocupados === 0 && typeof window !== 'undefined') window.removeEventListener('beforeunload', aviso);
  };
};

/** A seleção de leads para contato sobrevive a uma atualização do app (guardada por usuário). */
const chaveSelecao = (uid: string) => `leadsage:fila:selecionados:${uid || 'anon'}`;
export const lerSelecao = (uid: string): string[] => {
  try { const v = JSON.parse(localStorage.getItem(chaveSelecao(uid)) || '[]'); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; } catch { return []; }
};
export const guardarSelecao = (uid: string, ids: string[]): void => {
  try { if (ids.length) localStorage.setItem(chaveSelecao(uid), JSON.stringify(ids.slice(0, 500))); else localStorage.removeItem(chaveSelecao(uid)); } catch { /* sem armazenamento: segue sem guardar */ }
};
