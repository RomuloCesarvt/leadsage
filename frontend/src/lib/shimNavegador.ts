/** Só para os testes de renderização no Node: o mínimo de `window` que o app lê ao desenhar a primeira tela. Deve ser o PRIMEIRO import do teste. */
const g = globalThis as any;
if (!g.window) {
  g.window = { innerWidth: 1280, location: { search: '', hostname: 'localhost', origin: 'http://localhost', href: 'http://localhost/' },
    addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  g.document = g.document || { createElement: () => ({}), documentElement: { style: {} }, getElementById: () => null, addEventListener() {} };
  try { g.navigator = g.navigator || { userAgent: 'node', language: 'pt-BR' }; } catch { /* navigator já existe e é só leitura */ }
}
export {};
