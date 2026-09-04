/**
 * Marca do LeadSage.
 *
 * Antes o logo era a letra "L" numa caixinha azul — o mesmo desenho que
 * qualquer app tem no primeiro dia. E o favicon nem era nosso: um raio
 * roxo herdado de outro produto aparecia na aba do navegador.
 *
 * O símbolo é um pino de mapa com barras crescendo dentro. É o que o
 * produto faz: acha o negócio local e mostra onde ele pode crescer. A
 * barra mais alta sai em âmbar, a mesma cor de destaque das propostas.
 *
 * Desenhado para sobreviver a 16px: três barras cheias, sem contorno
 * fino e sem detalhe que suma quando encolhe.
 */
import React from 'react';

type Props = {
  /** lado do quadrado, em px */
  size?: number;
  /** sobre fundo escuro o miolo das barras acompanha o fundo */
  fundo?: 'claro' | 'escuro';
  className?: string;
};

export const LogoMark: React.FC<Props> = ({ size = 32, fundo = 'claro', className }) => {
  const azul = fundo === 'escuro' ? '#3b82f6' : '#2563eb';
  const vazado = fundo === 'escuro' ? '#0b1220' : '#ffffff';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="LeadSage"
    >
      <path
        d="M24 3c-9.39 0-17 7.61-17 17 0 11.9 15.2 24.1 15.85 24.62a1.85 1.85 0 0 0 2.3 0C25.8 44.1 41 31.9 41 20c0-9.39-7.61-17-17-17z"
        fill={azul}
      />
      <rect x="15.4" y="23" width="4.8" height="7" rx="1.3" fill={vazado} />
      <rect x="21.6" y="18.6" width="4.8" height="11.4" rx="1.3" fill={vazado} />
      <rect x="27.8" y="13.6" width="4.8" height="16.4" rx="1.3" fill="#f59e0b" />
    </svg>
  );
};

type LockupProps = Props & {
  /** tamanho do texto ao lado */
  texto?: string;
};

/** Símbolo + nome, do jeito que aparece no menu e no login. */
export const Logo: React.FC<LockupProps> = ({
  size = 32,
  fundo = 'claro',
  texto = 'text-xl',
  className,
}) => (
  <div className={`flex items-center gap-2 ${className || ''}`}>
    <LogoMark size={size} fundo={fundo} />
    <span
      className={`font-bold tracking-tight ${texto} ${
        fundo === 'escuro' ? 'text-white' : 'text-slate-800'
      }`}
    >
      LeadSage
    </span>
  </div>
);
