import React, { useEffect, useState } from 'react';

/**
 * Foto redonda com iniciais de reserva.
 *
 * Um <img> sem src, ou com a foto fora do ar, mostra o ícone quebrado e o
 * texto do `alt` vazando do círculo. Aqui, sem foto utilizável, aparecem as
 * iniciais — sempre dentro da caixa.
 */
export const Avatar: React.FC<{ src?: string; nome?: string; className?: string }> = ({ src, nome = '', className = 'w-9 h-9' }) => {
  const [falhou, setFalhou] = useState(false);
  useEffect(() => { setFalhou(false); }, [src]);

  const iniciais = nome
    .trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '?';

  if (src && !falhou) {
    return (
      <img src={src} alt={nome} referrerPolicy="no-referrer" onError={() => setFalhou(true)}
        className={`${className} rounded-full object-cover shrink-0`} />
    );
  }
  return (
    <span aria-label={nome} role="img"
      className={`${className} rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 select-none`}>
      {iniciais}
    </span>
  );
};
