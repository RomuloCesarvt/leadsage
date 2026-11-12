import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { emAndamento } from '../lib/trabalhoEmAndamento';

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
  // enquanto uma geração está rodando, recarregar derrubaria o trabalho: o botão espera
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { if (!nova) return; const t = setInterval(() => setOcupado(emAndamento()), 1000); return () => clearInterval(t); }, [nova]);

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
  // celular: faixa na largura da tela, ACIMA do menu de baixo (texto à esquerda, botão grande à direita); computador: cartão centralizado
  return (
    <div role="status" className="fixed z-[100] inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-4 md:w-auto md:max-w-xl flex items-center gap-3 bg-slate-900 text-white rounded-2xl shadow-xl p-3.5 md:px-4 md:py-3">
      <RefreshCw className="w-5 h-5 text-blue-300 shrink-0 hidden min-[380px]:block" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] md:text-sm font-bold leading-tight">Versão nova disponível</p>
        <p className="text-[13px] md:text-xs text-slate-300 leading-snug mt-0.5">
          {ocupado ? <span className="text-amber-300 font-semibold">Termine a geração em andamento para recarregar.</span> : 'Recarregue para usar as melhorias.'}
        </p>
      </div>
      {!ocupado && (
        <button onClick={() => window.location.reload()} className="shrink-0 min-h-12 md:min-h-0 px-5 md:px-3 md:py-1.5 rounded-xl md:rounded-lg bg-blue-500 hover:bg-blue-600 active:bg-blue-600 text-[15px] md:text-sm font-bold whitespace-nowrap">
          Recarregar
        </button>
      )}
    </div>
  );
};
