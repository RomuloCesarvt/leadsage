// Monta o site (HTML) de um lead com o MESMO motor de sites do navegador.
// Só o backend do LeadSage chama isto (cabeçalho x-render-secret). O pacote _sites.bundle.mjs é gerado por `npm run bundle:sites`.
import { timingSafeEqual } from 'node:crypto';
import { renderizarPrevia } from './_sites.bundle.mjs';

const igual = (a, b) => {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
};

export default function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ erro: 'Use POST.' }); return; }
  if (!igual(req.headers['x-render-secret'], process.env.WORKER_SECRET)) { res.status(401).json({ erro: 'Não autorizado.' }); return; }
  try {
    const corpo = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!corpo.lead || typeof corpo.lead !== 'object') { res.status(400).json({ erro: 'Faltou o lead.' }); return; }
    const saida = renderizarPrevia(corpo.lead, Array.isArray(corpo.fotos) ? corpo.fotos.slice(0, 8) : [], String(corpo.modelo || '').slice(0, 60), corpo.anterior && typeof corpo.anterior === 'object' ? corpo.anterior : null);
    res.status(200).json(saida);
  } catch (e) {
    res.status(500).json({ erro: String(e && e.message || e).slice(0, 200) });
  }
}
