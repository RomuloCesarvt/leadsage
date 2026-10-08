/**
 * Pergunta ao servidor de tempos em tempos, mas só com a aba à vista.
 *
 * O Firestore cobra por documento lido; uma tela esquecida em segundo plano
 * consultando a cada 10 s gastava a cota do dia inteiro sem ninguém olhar.
 * Ao voltar para a aba, atualiza na hora.
 */
export function sondar(fn: () => void, intervaloMs: number): () => void {
  const visivel = () => typeof document === 'undefined' || document.visibilityState === 'visible';
  const id = setInterval(() => { if (visivel()) fn(); }, intervaloMs);
  const aoVoltar = () => { if (visivel()) fn(); };
  document.addEventListener('visibilitychange', aoVoltar);
  return () => {
    clearInterval(id);
    document.removeEventListener('visibilitychange', aoVoltar);
  };
}
