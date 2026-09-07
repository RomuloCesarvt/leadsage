/**
 * Registro do service worker.
 *
 * Só em produção e só quando servido por HTTPS: em desenvolvimento um
 * service worker ativo é a causa mais comum de "editei e não mudou nada".
 *
 * Também fica fora quando o app roda dentro do invólucro nativo
 * (Capacitor): lá o conteúdo já vem do próprio pacote instalado, e um
 * worker interceptando isso só cria uma segunda fonte de verdade.
 */

export const rodandoNativo = (): boolean =>
  typeof window !== 'undefined' &&
  (Boolean((window as any).Capacitor?.isNativePlatform?.()) ||
    /^(capacitor|ionic):/.test(window.location.protocol));

export function registrarServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;
  if (rodandoNativo()) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(erro => {
      // Falhar aqui não pode derrubar o app: sem worker ele continua
      // funcionando, só deixa de abrir offline.
      console.warn('Service worker não registrou:', erro);
    });
  });
}
