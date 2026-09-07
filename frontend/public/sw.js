/**
 * Service worker do LeadSage.
 *
 * Existe para o app ser instalável (requisito da Play Store via TWA) e
 * para abrir mesmo sem rede. O que ele NÃO faz é decidir sozinho o que
 * mostrar: um service worker guloso é a forma mais rápida de deixar o
 * usuário preso numa versão antiga do app, sem entender por quê.
 *
 * Por isso a política é conservadora:
 *
 *  - navegação e API: rede primeiro. Só cai no cache se a rede falhar.
 *  - assets com hash no nome (/assets/index-CsAjdlpF.js): cache primeiro,
 *    porque o nome muda a cada build — servir do cache nunca envelhece.
 *  - qualquer outra coisa: rede, sem cache.
 *
 * Um deploy novo troca CACHE e os caches antigos são apagados no activate.
 */

const CACHE = 'leadsage-v1';
const CASCA = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', evento => {
  // Assume o controle já no primeiro carregamento, senão o usuário só
  // teria app instalável na segunda visita.
  self.skipWaiting();
  evento.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CASCA)).catch(() => {
      // Um recurso indisponível não pode impedir o worker de instalar.
    })
  );
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches
      .keys()
      .then(nomes => Promise.all(nomes.filter(n => n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/** Assets de build levam hash no nome: o conteúdo nunca muda. */
const temHashNoNome = url => /\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(js|css|woff2?)$/.test(url.pathname);

self.addEventListener('fetch', evento => {
  const req = evento.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Sites publicados são servidos pelo backend e mudam quando o usuário
  // edita. Nunca guardar em cache.
  if (url.pathname.startsWith('/s/') || url.pathname.startsWith('/api/')) return;

  if (temHashNoNome(url)) {
    evento.respondWith(
      caches.match(req).then(
        guardado =>
          guardado ||
          fetch(req).then(resposta => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(CACHE).then(c => c.put(req, copia));
            }
            return resposta;
          })
      )
    );
    return;
  }

  // Navegação e o resto: rede primeiro, cache só como rede de segurança.
  evento.respondWith(
    fetch(req)
      .then(resposta => {
        if (resposta.ok && (req.mode === 'navigate' || CASCA.includes(url.pathname))) {
          const copia = resposta.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(req).then(guardado => guardado || caches.match('/index.html')))
  );
});
