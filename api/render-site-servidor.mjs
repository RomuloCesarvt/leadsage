// O motor de sites (api/render-site.mjs) como servidor HTTP, para hospedagens que não têm "funções" (Render).
// Escuta só em 127.0.0.1: quem chama é o backend do LeadSage, na mesma máquina, com o cabeçalho x-render-secret.
import http from 'node:http';
import handler from './render-site.mjs';

const PORTA = Number(process.env.RENDER_SITE_PORTA) || 3001;
const LIMITE = 2_000_000; // bytes

http.createServer((req, res) => {
  const chunks = [];
  let tamanho = 0;
  req.on('data', (c) => {
    tamanho += c.length;
    if (tamanho > LIMITE) { res.writeHead(413).end(); req.destroy(); return; }
    chunks.push(c);
  });
  req.on('end', () => {
    // o mesmo formato (req/res) que a função da Vercel recebe
    const reqF = { method: req.method, headers: req.headers, body: Buffer.concat(chunks).toString('utf8') };
    let codigo = 200;
    const resF = {
      status(c) { codigo = c; return resF; },
      json(obj) { res.writeHead(codigo, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); },
    };
    try { handler(reqF, resF); } catch (e) { res.writeHead(500).end(JSON.stringify({ erro: String(e?.message || e).slice(0, 200) })); }
  });
}).listen(PORTA, '127.0.0.1', () => console.log(`Motor de sites ouvindo em 127.0.0.1:${PORTA}`));
