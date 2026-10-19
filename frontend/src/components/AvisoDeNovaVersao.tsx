import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/** O arquivo principal do app que esta aberto (o nome muda a cada versao publicada). */
const arquivoAberto = (): string => {
  const s = Array.from(document.scripts).map(x => x.src).find(u => /\/assets\/index-[^/]+\.js/.test(u));
  return s ? (s.match(/\/assets\/(index-[^/]+\.js)/)?.[1] || '') : '';
};

/**
 * Quem deixa o LeadSage aberto durante um deploy continua rodando o código antigo (foi o que fez o "continua a mesma coisa":
 * a tela antiga ainda gerava os sites do jeito de antes). Aqui o app confere de tempos em tempos se saiu versão nova e avisa.
 */
export const AvisoDeNovaVersao = () => {
  const [nova, setNova] = useState(false);

  useEffect(() => {
    const aberto = arquivoAberto();
    if (!aberto) return; // desenvolvimento ou app nativo: não há o que conferir
    let parado = false;
    const conferir = async () => {
      try {
        const r = await fetch('/', { cache: 'no-store' });
        const html = await r.text();
        const atual = html.match(/\/assets\/(index-[^"'/]+\.js)/)?.[1];
        if (!parado && atual && atual !== aberto) setNova(true);
      } catch { /* sem rede: confere na próxima */ }
    };
    const ao = () => { if (document.visibilityState === 'visible') void conferir(); };
    const t = setInterval(conferir, 3 * 60 * 1000);
    document.addEventListener('visibilitychange', ao);
    void conferir();
    return () => { parado = true; clearInterval(t); document.removeEventListener('visibilitychange', ao); };
  }, []);

  if (!nova) return null;
  return (
    <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] max-w-[92vw] flex items-center gap-3 bg-slate-900 text-white rounded-2xl shadow-xl px-4 py-3 text-sm">
      <span>Saiu uma versão nova do LeadSage. Recarregue para usar as melhorias.</span>
      <button onClick={() => window.location.reload()} className="shrink-0 flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg px-3 py-1.5 font-bold">
        <RefreshCw className="w-4 h-4" /> Recarregar
      </button>
    </div>
  );
};
