import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Aviso } from '../types';

const CHAVE_VISTO = 'leadsage_avisos_visto';
const A_CADA_MS = 60_000;

type Estado = { avisos: Aviso[]; visto: string; carregado: boolean };

let estado: Estado = { avisos: [], visto: lerVisto(), carregado: false };
const ouvintes = new Set<(e: Estado) => void>();
let relogio: ReturnType<typeof setInterval> | null = null;

function lerVisto(): string {
  try { return localStorage.getItem(CHAVE_VISTO) || ''; } catch { return ''; }
}

function publicar(novo: Estado) {
  estado = novo;
  ouvintes.forEach((f) => f(estado));
}

/** Avisa pelo sistema (se a pessoa permitiu) o que chegou desde a última consulta. */
function avisarNoNavegador(novos: Aviso[]) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !novos.length) return;
    const primeiro = novos[0];
    new Notification(novos.length > 1 ? `${novos.length} avisos novos no LeadSage` : primeiro.titulo, {
      body: novos.length > 1 ? primeiro.titulo : primeiro.texto, tag: 'leadsage-avisos',
    });
  } catch { /* o aviso do navegador é um extra: nunca atrapalha a tela */ }
}

export async function atualizarAvisos() {
  try {
    const avisos = await api.avisos();
    const conhecidos = new Set(estado.avisos.map((a) => a.id));
    if (estado.carregado) avisarNoNavegador(avisos.filter((a) => !conhecidos.has(a.id) && a.quando > estado.visto));
    publicar({ ...estado, avisos, carregado: true });
  } catch { /* sem rede ou sem login agora: tenta de novo no próximo ciclo */ }
}

export function marcarAvisosComoVistos() {
  const visto = estado.avisos[0]?.quando || new Date().toISOString();
  try { localStorage.setItem(CHAVE_VISTO, visto); } catch { /* sem armazenamento: vale só nesta aba */ }
  publicar({ ...estado, visto });
}

export function naoLidos(e: Pick<Estado, 'avisos' | 'visto'>): number {
  return e.avisos.filter((a) => a.quando > e.visto).length;
}

export function useAvisos(): Estado {
  const [e, setE] = useState(estado);
  useEffect(() => {
    ouvintes.add(setE);
    if (!relogio) {
      atualizarAvisos();
      relogio = setInterval(() => { if (!document.hidden) atualizarAvisos(); }, A_CADA_MS);
    } else {
      setE(estado);
    }
    return () => {
      ouvintes.delete(setE);
      if (!ouvintes.size && relogio) { clearInterval(relogio); relogio = null; }
    };
  }, []);
  return e;
}
