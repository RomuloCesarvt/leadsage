import { useEffect, useState } from 'react';

/** true em tela de celular (menos de 768 px). Sem matchMedia (testes), vale computador. */
export const useCelular = (): boolean => {
  const consulta = '(max-width: 767px)';
  const [celular, setCelular] = useState(() => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(consulta).matches : false));
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const m = window.matchMedia(consulta);
    const aoMudar = () => setCelular(m.matches);
    aoMudar();
    m.addEventListener?.('change', aoMudar);
    return () => m.removeEventListener?.('change', aoMudar);
  }, []);
  return celular;
};
