// Gera as artes de oferta por nicho (1080x1350) a partir das prévias reais de cada segmento.
// Uso (na raiz do repositório):
//   cd frontend && npx tsx qa/render-nichos.ts && cd ..
//   node docs/artes-por-nicho/gerar.cjs
// Saída: docs/artes-por-nicho/<nicho>.png
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const PRECO = '347';
const AQUI = __dirname;
const PREVIAS = path.join(AQUI, '..', '..', 'frontend', 'qa', 'saida', 'nichos');

const NICHOS = [
  { id: 'dentista', rotulo: 'dentistas', pill: 'SITE PARA DENTISTAS', cor: '#7fb2ff', cor2: '#2f6bff',
    itens: ['Agendamento direto pelo WhatsApp', 'Tratamentos e equipe em destaque', 'Avaliações do Google no site', 'Perfeito no celular'] },
  { id: 'estetica', rotulo: 'clínicas de estética', pill: 'SITE PARA CLÍNICAS DE ESTÉTICA', cor: '#f0b8d0', cor2: '#c9609a',
    itens: ['Procedimentos com visual de alto padrão', 'Agenda pelo WhatsApp', 'Galeria de resultados', 'Perfeito no celular'] },
  { id: 'advocacia', rotulo: 'advogados', pill: 'SITE PARA ADVOGADOS', cor: '#f1d38a', cor2: '#c9a24a',
    itens: ['Áreas de atuação com clareza', 'Visual que passa credibilidade', 'Contato direto pelo WhatsApp', 'Perfeito no celular'] },
  { id: 'oficina', rotulo: 'oficinas mecânicas', pill: 'SITE PARA OFICINAS MECÂNICAS', cor: '#ffd84d', cor2: '#f59e0b',
    itens: ['Orçamento pelo WhatsApp', 'Serviços e localização no Google Maps', 'Avaliações dos clientes', 'Perfeito no celular'] },
  { id: 'pet', rotulo: 'pet shops', pill: 'SITE PARA PET SHOPS E VETERINÁRIAS', cor: '#9fe3b5', cor2: '#2fb86b',
    itens: ['Banho, tosa e consultas com agendamento', 'Botão de WhatsApp em todas as telas', 'Fotos e serviços do seu pet shop', 'Perfeito no celular'] },
];

const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');

const html = (n, desk, mob) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700;1,800&family=Inter:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:1080px;height:1350px;font-family:'Inter',sans-serif;color:#fff;position:relative;overflow:hidden;
 background:radial-gradient(900px 700px at 85% 8%, ${n.cor2}55, transparent 60%),radial-gradient(800px 600px at 0% 100%, ${n.cor2}33, transparent 60%),linear-gradient(160deg,#0b0d12,#14161d 55%,#0a0b0f)}
.grao{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.015) 0 1px,transparent 1px 3px);pointer-events:none}
.top{padding:64px 64px 0}
.pill{display:inline-block;border:2px solid ${n.cor};color:${n.cor};border-radius:14px;padding:14px 26px;font-weight:700;letter-spacing:.22em;font-size:23px}
h1{font-family:'Playfair Display',serif;font-weight:800;font-size:116px;line-height:.98;margin-top:28px;letter-spacing:-.02em}
h1 em{display:block;color:${n.cor};font-style:italic;font-size:${n.rotulo.length > 14 ? 84 : 116}px;margin-top:6px}
.preco{display:flex;align-items:center;gap:30px;margin:28px 64px 0;border:2px solid ${n.cor2};background:linear-gradient(90deg,#3a0f1acc,#5a1424cc);border-radius:18px;padding:18px 34px;width:max-content;max-width:952px}
.preco .rs{font-size:46px;font-weight:700;font-family:'Playfair Display',serif}
.preco .v{font-size:104px;font-weight:800;font-family:'Playfair Display',serif;line-height:1}
.preco .v small{font-size:44px}
.preco .t{border-left:2px solid #ffffff44;padding-left:30px;font-size:35px;font-weight:600;line-height:1.15}
.preco .t b{display:block;font-weight:800}
.itens{display:grid;grid-template-columns:1fr 1fr;gap:12px 28px;margin:24px 64px 0}
.itens div{display:flex;gap:14px;align-items:center;font-size:26px;font-weight:600;color:#e9ecf3;line-height:1.2}
.itens i{flex:none;width:34px;height:34px;border-radius:50%;background:${n.cor};color:#111;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:800;font-size:22px}
.palco{position:absolute;left:0;right:0;top:770px;height:410px}
.notebook{position:absolute;left:64px;top:20px;width:650px}
.tela{width:650px;height:372px;border:12px solid #1b1d24;border-bottom-width:16px;border-radius:16px 16px 0 0;background:#000 center top/cover no-repeat;box-shadow:0 30px 80px #000a,0 0 0 2px #3a3d48}
.base{width:780px;height:22px;margin-left:-65px;background:linear-gradient(#cfd3dc,#8d929e);border-radius:0 0 24px 24px;box-shadow:0 24px 50px #000b}
.cel{position:absolute;left:690px;top:0;width:250px;height:410px;border:10px solid #15171d;border-radius:44px;background:#000 center top/cover no-repeat;box-shadow:0 30px 70px #000c,0 0 0 2px #3a3d48}
.cta{position:absolute;left:64px;right:64px;bottom:40px;height:100px;border:3px solid ${n.cor};border-radius:60px;background:#0b0d12e6;display:flex;align-items:center;justify-content:center;gap:24px;font-size:36px;font-weight:800;letter-spacing:.01em}
.cta svg{width:56px;height:56px}
.cta span{color:${n.cor}}
</style></head><body><div class="grao"></div>
<div class="top"><span class="pill">${n.pill}</span><h1>Site para<em>${n.rotulo}</em></h1></div>
<div class="preco"><span class="rs">R$</span><span class="v">${PRECO}<small>,00</small></span><span class="t"><b>só se você</b>gostar do resultado</span></div>
<div class="itens">${n.itens.map((t) => `<div><i>✓</i>${t}</div>`).join('')}</div>
<div class="palco"><div class="notebook"><div class="tela" style="background-image:url(${desk})"></div><div class="base"></div></div><div class="cel" style="background-image:url(${mob})"></div></div>
<div class="cta"><svg viewBox="0 0 24 24" fill="${n.cor}"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.8-.2 1.4z"/></svg>Nos envie <span>uma mensagem</span> ➜</div>
</body></html>`;

(async () => {
  const b = await chromium.launch();
  for (const n of NICHOS) {
    const shot = async (w, h, esc, nome) => {
      const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: esc });
      await p.goto('file://' + path.join(PREVIAS, n.id + '.html'), { waitUntil: 'load' });
      await p.waitForTimeout(4200);
      const f = path.join(AQUI, `.tmp_${n.id}_${nome}.png`);
      await p.screenshot({ path: f });
      await p.close();
      return b64(f);
    };
    const desk = await shot(1440, 860, 1, 'd');
    const mob = await shot(390, 844, 2, 'm');
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
    await p.setContent(html(n, desk, mob), { waitUntil: 'networkidle' });
    await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(AQUI, `${n.id}.png`) });
    await p.close();
    console.log('ok', n.id);
  }
  await b.close();
  for (const f of fs.readdirSync(AQUI)) if (f.startsWith('.tmp_')) fs.rmSync(path.join(AQUI, f));
})();
