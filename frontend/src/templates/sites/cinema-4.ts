/**
 * Cinema, parte 4: Agro Contraste, Fintech Flutuante e Prêmio Chanfrado.
 *
 * - **Agro Contraste**: seções escuras e claras alternadas, grade de números animada, faixa infinita e cartões de serviço sobre foto.
 * - **Fintech Flutuante**: capa que vai e volta, cartões de vidro flutuando com a nota do Google em anel, depoimento em duas colunas.
 * - **Prêmio Chanfrado**: moldura branca arredondada, botão com corte em ângulo, colunas com cartões angulares e números em gradiente.
 */
import type { SiteTemplate } from './base';
import { iconeDoServico, partirSobre } from './premium-base';
import {
  PARES, ICONES, classeImagem, contador, contatoLinhas, cssBaseClara, cssBaseEscura, cssNavVidro, cssRodapeEscuro, cssVozesEscuras, ctaPrincipal,
  documentoCinema, esc, eyebrow, faixa, fotoDe, fundoImagem, linkMapa, miniaturaCinema,
  nav, numerosReais, palavras, rodape, seloGoogle, servicosValidos, titulo, vozes,
} from './cinema-base';
import { depoimentosValidos } from './premium-base';

const pad2 = (n: number) => String(n).padStart(2, '0');

/* ====================================================== AGRO CONTRASTE */

const agro: SiteTemplate = {
  id: 'agro',
  nome: 'Agro Contraste',
  descricao: 'Seções escuras e claras que se alternam, números que sobem e cartões de serviço sobre foto. Para quem trabalha com campo, obra e produto.',
  nichos: ['Agro', 'Jardinagem', 'Construção', 'Materiais', 'Pet shops', 'Transportes', 'Indústrias'],
  miniatura: miniaturaCinema('misto', 'colunas'),
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Trabalho sério, no prazo e com quem entende do assunto.', 'Experiência de campo, equipe próxima e compromisso com o que foi combinado.');
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1);
    const nums = numerosReais(d);
    return documentoCinema(d, PARES.sora, `
${cssBaseClara(d, '#f3f1ea')}
${cssNavVidro('nv')}
${cssVozesEscuras('Sora')}
${cssRodapeEscuro('rd')}
.nv{background:linear-gradient(160deg,rgba(15,18,16,.55),rgba(15,18,16,.3));color:#fff}
.nv-marca{color:#fff;font-family:var(--fonte-t);font-weight:600}
.ag-hero{position:relative;min-height:100svh;display:grid;align-content:end;padding:150px 0 clamp(56px,7vw,90px);overflow:hidden;isolation:isolate;color:#fff}
.ag-bg{position:absolute;inset:-4%;z-index:-2;background-size:cover;background-position:center}
.ag-bg.tem-foto{animation:kb 26s ease-in-out infinite alternate}
.ag-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(8,12,9,.5),rgba(8,12,9,.25) 40%,rgba(8,12,9,.88))}
.ag-pre{display:inline-flex;gap:10px;align-items:center;font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.85);margin-bottom:22px}
.ag-pre::before{content:"";width:40px;height:2px;background:var(--c2)}
.ag-h1{font-family:var(--fonte-t);font-weight:700;color:#fff;font-size:clamp(44px,8.6vw,136px);line-height:.95;letter-spacing:-.045em;max-width:15ch;margin:0 0 26px;text-wrap:balance}
.ag-sub{max-width:52ch;font-size:clamp(17px,1.5vw,20px);color:rgba(255,255,255,.82);line-height:1.65;margin:0 0 34px}
.ag-btns{display:flex;flex-wrap:wrap;gap:14px}
.ag-sec{padding:clamp(70px,10vw,150px) 0}
.ag-esc{background:#0d1210;color:#f4f5f2}.ag-esc h2{color:#fff}
.ag-rot{font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:var(--c1c);margin:0 0 18px;font-weight:600}
.ag-esc .ag-rot{color:var(--c2)}
.ag-t{font-family:var(--fonte-t);font-weight:700;font-size:clamp(32px,5vw,70px);line-height:1;letter-spacing:-.04em;margin:0 0 clamp(24px,4vw,48px);max-width:18ch}
.ag-sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(30px,6vw,90px);align-items:center}
.ag-sobre p:not(.ag-rot){font-size:clamp(17px,1.5vw,20px);line-height:1.75;color:#3a4140}
.ag-foto{position:relative;aspect-ratio:4/5;border-radius:var(--raio);overflow:hidden}.ag-foto .par{position:absolute;inset:-8%;background-size:cover;background-position:center}
.ag-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.14);border-radius:var(--raio);overflow:hidden}
.ag-ct{background:#0d1210;padding:44px 34px}
.ag-ct b{display:block;font-family:var(--fonte-t);font-weight:700;font-size:clamp(56px,7.4vw,112px);letter-spacing:-.05em;line-height:1;background:linear-gradient(135deg,#fff,var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent}
.ag-ct span{color:rgba(255,255,255,.6);font-size:14px}
.ag-faixa{padding:22px 0;background:var(--c2);color:#0d1210;font-family:var(--fonte-t);font-weight:700;font-size:clamp(20px,2.6vw,34px);text-transform:uppercase;letter-spacing:-.01em}
.ag-faixa i{color:#0d1210;opacity:.5;font-style:normal}
.ag-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.ag-card{position:relative;min-height:380px;border-radius:var(--raio);overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:30px;color:#fff;isolation:isolate}
.ag-card .fundo{position:absolute;inset:0;z-index:-2;background-size:cover;background-position:center;transition:transform 1.4s var(--ease)}
.ag-card:hover .fundo{transform:scale(1.08)}
.ag-card::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(8,12,9,.1),rgba(8,12,9,.88))}
.ag-card .n{position:absolute;top:24px;left:30px;font-weight:600;font-size:13px;letter-spacing:.14em;opacity:.8}
.ag-card h3{font-family:var(--fonte-t);font-weight:700;color:#fff;font-size:clamp(24px,2.4vw,32px);letter-spacing:-.03em;line-height:1.05;margin:0 0 8px}
.ag-card p{margin:0;color:rgba(255,255,255,.8);font-size:15px}
.ag-info p{display:flex;gap:14px;margin:0 0 14px;color:#eceee9}.ag-info svg{flex:none;margin-top:3px;color:var(--c2)}
.ag-fim .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(30px,5vw,80px);align-items:center}
.ag-fim h2{font-family:var(--fonte-t);font-weight:700;font-size:clamp(38px,6vw,88px);line-height:.95;letter-spacing:-.045em;margin:0 0 24px}
@media(max-width:900px){.ag-sobre .wrap,.ag-fim .wrap{grid-template-columns:1fr}}
`, `
${nav(d, [['#sobre', 'Sobre'], ['#servicos', 'Serviços'], ['#contato', 'Contato']])}
<section class="ag-hero"><div class="${classeImagem(capa, 'ag-bg')}" style="${fundoImagem(capa, 0)}"></div>
  <div class="wrap"><span class="ag-pre entra">${esc(eyebrow(d) || d.empresa)}</span>
    <h1 class="ag-h1">${palavras(titulo(d, d.empresa), 1)}</h1>
    <p class="ag-sub entra" style="--d:5">${capaTxt}</p>
    <div class="ag-btns entra" style="--d:6">${ctaPrincipal(d, 'Pedir orçamento', 'bt-cheio')}<a class="vidro-bt" href="#servicos">Ver serviços${ICONES.seta}</a></div>
    ${seloGoogle(d, 'nr-nota vidro entra')}</div></section>
<section class="ag-sec ag-sobre" id="sobre"><div class="wrap">
  <div class="rev-l"><p class="ag-rot">Quem somos</p><h2 class="ag-t">${esc(d.empresa)}</h2><p>${sobreTxt}</p></div>
  <div class="ag-foto rev-r"><div class="${classeImagem(foto2 || capa, 'par')}" style="${fundoImagem(foto2 || capa, 1)}"></div></div>
</div></section>
${nums.length >= 2 ? `<section class="ag-sec ag-esc"><div class="wrap"><p class="ag-rot rev">Em números</p><div class="ag-num rev">${nums.map(n => n.valor !== undefined ? contador(n.valor, n.rotulo, 'ag-ct') : `<div class="ag-ct"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join('')}</div></div></section>` : ''}
<div style="overflow:hidden">${faixa([d.categoria || d.empresa, ...servicos.map(s => s.titulo), d.cidade || ''], 'marq ag-faixa')}</div>
${servicos.length ? `<section class="ag-sec" id="servicos"><div class="wrap"><p class="ag-rot rev">O que fazemos</p><h2 class="ag-t rev">Soluções para o seu dia a dia</h2>
  <div class="ag-cards">${servicos.map((s, i) => { const f = fotoDe(d, i + 2); return `<article class="ag-card rev"><div class="${classeImagem(f, 'fundo')}" style="${fundoImagem(f, i % 3)}"></div><span class="n">${pad2(i + 1)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</article>`; }).join('')}</div></div></section>` : ''}
<div class="ag-esc">${vozes(d, 'nr-vozes')}</div>
<section class="ag-sec ag-esc ag-fim" id="contato"><div class="wrap">
  <div class="rev-l"><p class="ag-rot">Contato</p><h2>${palavras('Vamos conversar sobre o seu projeto?', 0)}</h2><div class="ag-btns">${ctaPrincipal(d, 'Chamar no WhatsApp', 'bt-cheio')}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div></div>
  <div class="ag-info vidro rev-r" style="padding:34px">${contatoLinhas(d, 'ag-lin')}</div>
</div></section>
${rodape(d, 'rd')}
`, false, false);
  },
};

/* ====================================================== FINTECH FLUTUANTE */

const fintech: SiteTemplate = {
  id: 'fintech',
  nome: 'Fintech Flutuante',
  descricao: 'Capa que vai e volta, cartões de vidro flutuando com a nota do Google em anel e depoimento em duas colunas. Para serviços modernos e de confiança.',
  nichos: ['Contabilidade', 'Seguros', 'Financeiras', 'Clínicas modernas', 'Imobiliárias', 'Tecnologia', 'Consultoria'],
  miniatura: miniaturaCinema('escuro', 'bento'),
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Clareza, agilidade e atendimento de verdade para o seu dia a dia.', 'Tratamos cada cliente com transparência, do primeiro contato ao resultado.');
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1), foto3 = fotoDe(d, 2);
    const nota = Number(d.nota) || 0;
    const aval = Number(d.avaliacoes) || 0;
    const depo = depoimentosValidos(d);
    const anel = nota >= 3.5 ? Math.round((nota / 5) * 100) : 0;
    return documentoCinema(d, PARES.sora, `
${cssBaseEscura(d, '#050912')}
${cssNavVidro('nv')}
${cssRodapeEscuro('rd')}
${cssVozesEscuras('Sora')}
.ft-hero{position:relative;min-height:100svh;display:grid;align-items:center;padding:140px 0 80px;overflow:hidden;isolation:isolate}
.ft-bg{position:absolute;inset:-5%;z-index:-2;background-size:cover;background-position:center;animation:vaivem 18s ease-in-out infinite alternate}
@keyframes vaivem{from{transform:scale(1.04) translateX(-1.5%)}to{transform:scale(1.18) translateX(1.5%)}}
.ft-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,rgba(5,9,18,.92) 8%,rgba(5,9,18,.5) 55%,rgba(5,9,18,.2)),linear-gradient(180deg,transparent 60%,rgba(5,9,18,.9))}
.ft-grade{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(30px,5vw,80px);align-items:center}
.ft-h1{font-family:var(--fonte-t);font-weight:600;font-size:clamp(38px,6.6vw,104px);line-height:1;letter-spacing:-.045em;margin:0 0 24px}
.ft-sub{color:rgba(255,255,255,.78);font-size:clamp(17px,1.5vw,20px);line-height:1.65;max-width:48ch;margin:0 0 32px}
.ft-btns{display:flex;flex-wrap:wrap;gap:14px}
.ft-flut{position:relative;min-height:440px}
.ft-c{position:absolute;padding:22px 24px;animation:flutua 7s ease-in-out infinite alternate}
.ft-c1{top:0;right:6%;width:min(300px,70%)}.ft-c2{top:150px;left:0;width:min(280px,70%);animation-delay:-2s}.ft-c3{bottom:0;right:0;width:min(300px,76%);animation-delay:-4s}
@keyframes flutua{from{transform:translateY(-10px)}to{transform:translateY(12px)}}
.ft-anel{--p:${anel};width:96px;height:96px;border-radius:50%;display:grid;place-items:center;flex:none;
  background:conic-gradient(var(--c2) calc(var(--p) * 1%),rgba(255,255,255,.12) 0);-webkit-mask:radial-gradient(circle,transparent 58%,#000 60%);mask:radial-gradient(circle,transparent 58%,#000 60%)}
.ft-anel-n{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--fonte-t);font-weight:600;font-size:26px}
.ft-linha{display:flex;gap:18px;align-items:center}.ft-linha small{display:block;color:var(--mudo);font-size:13px}.ft-linha b{font-size:22px}
.ft-spark{width:100%;height:60px;margin-top:14px}.ft-spark path{fill:none;stroke:var(--c2);stroke-width:3;stroke-linecap:round;stroke-dasharray:400;stroke-dashoffset:400;animation:tracar 2.4s var(--ease) .8s forwards}
@keyframes tracar{to{stroke-dashoffset:0}}
.ft-barras{display:flex;gap:8px;align-items:end;height:70px;margin-top:12px}.ft-barras i{flex:1;border-radius:6px;background:linear-gradient(180deg,var(--c2),color-mix(in srgb,var(--c1) 70%,transparent));height:var(--h);animation:cresce 1.4s var(--ease) both;transform-origin:bottom}
@keyframes cresce{from{transform:scaleY(.1)}}
.sec{padding:clamp(70px,10vw,140px) 0}
.rot{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--c2c);margin:0 0 18px}
.ft-t{font-family:var(--fonte-t);font-weight:600;font-size:clamp(32px,5vw,70px);line-height:1.02;letter-spacing:-.04em;margin:0 0 clamp(26px,4vw,50px);max-width:18ch}
.ft-dup{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,5vw,70px);align-items:center}
.ft-dup p.t{font-size:clamp(17px,1.5vw,20px);line-height:1.75;color:rgba(255,255,255,.78)}
.ft-quad{position:relative;aspect-ratio:1;border-radius:calc(var(--raio) + 6px);overflow:hidden;border:1px solid var(--linha)}
.ft-quad>div{position:absolute;inset:0}
.ft-quad .cf:nth-child(1){animation-delay:0s}.ft-quad .cf{animation:cf 12s ease-in-out infinite}.ft-quad .cf:nth-child(2){animation-delay:6s}
.ft-4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.ft-f{position:relative;min-height:340px;border-radius:var(--raio);overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:26px;border:1px solid var(--linha);isolation:isolate;transition:transform .5s var(--ease)}
.ft-f:hover{transform:translateY(-8px)}
.ft-f .fundo{position:absolute;inset:0;z-index:-2;background-size:cover;background-position:center;opacity:.55;transition:transform 1.2s var(--ease)}.ft-f:hover .fundo{transform:scale(1.07)}
.ft-f::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(5,9,18,.15),rgba(5,9,18,.9))}
.ft-f .ic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.12);color:var(--c2c);margin-bottom:auto}
.ft-f h3{font-family:var(--fonte-t);font-weight:600;font-size:22px;letter-spacing:-.03em;margin:22px 0 8px}.ft-f p{margin:0;color:rgba(255,255,255,.72);font-size:14.5px;line-height:1.6}
.ft-voz blockquote{margin:0 0 22px;font-family:var(--fonte-t);font-weight:500;font-size:clamp(22px,2.6vw,36px);line-height:1.25;letter-spacing:-.02em}
.ft-voz cite{display:block;color:var(--mudo);font-style:normal;font-size:15px}
.ft-fim-in{display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:center;padding:clamp(34px,6vw,76px)}
.ft-fim-in h2{font-family:var(--fonte-t);font-weight:600;font-size:clamp(34px,5.4vw,80px);line-height:1;letter-spacing:-.045em;margin:0 0 22px}
.ft-info p{display:flex;gap:14px;margin:0 0 14px;color:#ececf1}.ft-info svg{flex:none;margin-top:3px;color:var(--c2c)}
@media(max-width:900px){.ft-grade,.ft-dup,.ft-fim-in{grid-template-columns:1fr}.ft-flut{min-height:380px}.ft-4{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.ft-4{grid-template-columns:1fr}}
`, `
${nav(d, [['#sobre', 'Sobre'], ['#solucoes', 'Soluções'], ['#contato', 'Contato']])}
<section class="ft-hero"><div class="${classeImagem(capa, 'ft-bg')}" style="${fundoImagem(capa, 2)}"></div>
  <div class="wrap ft-grade">
    <div><span class="rot entra">${esc(eyebrow(d) || d.empresa)}</span><h1 class="ft-h1">${palavras(titulo(d, d.empresa), 1)}</h1>
      <p class="ft-sub entra" style="--d:5">${capaTxt}</p>
      <div class="ft-btns entra" style="--d:6">${ctaPrincipal(d, 'Falar com a equipe', 'bt-cheio')}<a class="vidro-bt" href="#solucoes">Ver soluções${ICONES.seta}</a></div></div>
    <div class="ft-flut" aria-hidden="false">
      ${anel ? `<div class="ft-c ft-c1 vidro entra" style="--d:3"><div class="ft-linha"><div style="position:relative;width:96px;height:96px;flex:none"><div class="ft-anel"></div><div class="ft-anel-n">${nota.toFixed(1).replace('.', ',')}</div></div><div><small>Nota no Google</small><b>${aval ? `${aval.toLocaleString('pt-BR')} avaliações` : 'de clientes'}</b></div></div></div>` : ''}
      <div class="ft-c ft-c2 vidro entra" style="--d:4"><small style="color:var(--mudo)">Atendimento</small><div style="font-size:20px;font-weight:600;margin-top:2px">${esc(d.horario || 'Fale agora pelo WhatsApp')}</div>
        <svg class="ft-spark" viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M0 48 C 25 44, 35 20, 60 26 S 95 52, 120 30 S 160 6, 200 12"/></svg></div>
      <div class="ft-c ft-c3 vidro entra" style="--d:5"><small style="color:var(--mudo)">Serviços</small><div style="font-size:20px;font-weight:600;margin-top:2px">${servicos.length ? `${servicos.length} ${servicos.length === 1 ? 'serviço' : 'serviços'} para você` : esc(d.categoria || d.empresa)}</div>
        <div class="ft-barras"><i style="--h:38%"></i><i style="--h:60%;animation-delay:.1s"></i><i style="--h:46%;animation-delay:.2s"></i><i style="--h:82%;animation-delay:.3s"></i><i style="--h:68%;animation-delay:.4s"></i><i style="--h:100%;animation-delay:.5s"></i></div></div>
    </div>
  </div>
</section>
<section class="sec" id="sobre"><div class="wrap ft-dup">
  <div class="rev-l"><p class="rot">Quem somos</p><h2 class="ft-t">${esc(d.empresa)}</h2><p class="t">${sobreTxt}</p>${seloGoogle(d, 'nr-nota vidro')}</div>
  <div class="ft-quad rev-r">${[foto2 || capa, foto3 || foto2 || capa].map((f, i) => `<div class="cf ${f ? 'tem-foto' : 'cena'}" style="${f ? `background-image:url('${f}')` : `--cena:${i}`}"></div>`).join('')}</div>
</div></section>
${servicos.length ? `<section class="sec" id="solucoes"><div class="wrap"><p class="rot rev">Soluções</p><h2 class="ft-t rev">Tudo o que você precisa em um só lugar</h2>
  <div class="ft-4">${servicos.slice(0, 4).map((s, i) => { const f = fotoDe(d, i + 1); return `<article class="ft-f rev"><div class="${classeImagem(f, 'fundo')}" style="${fundoImagem(f, i % 3)}"></div><span class="ic">${iconeDoServico(i)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</article>`; }).join('')}</div></div></section>` : ''}
${depo.length ? `<section class="sec"><div class="wrap ft-dup"><div class="ft-voz rev-l"><p class="rot">Quem já é cliente</p><blockquote>“${esc(depo[0].texto)}”</blockquote><cite>${esc(depo[0].autor)}</cite></div>
  ${depo[1] ? `<div class="ft-voz rev-r"><p class="rot">&nbsp;</p><blockquote>“${esc(depo[1].texto)}”</blockquote><cite>${esc(depo[1].autor)}</cite></div>` : ''}</div></section>` : ''}
<section class="sec" id="contato"><div class="wrap"><div class="ft-fim-in vidro rev">
  <div><h2>${palavras('Vamos conversar sobre o seu caso?', 0)}</h2><div class="ft-btns">${ctaPrincipal(d, 'Chamar no WhatsApp', 'bt-cheio')}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div></div>
  <div class="ft-info">${contatoLinhas(d, 'ft-lin')}</div></div></div></section>
${rodape(d, 'rd')}
`);
  },
};

/* ====================================================== PRÊMIO CHANFRADO */

const premio: SiteTemplate = {
  id: 'premio',
  nome: 'Prêmio Chanfrado',
  descricao: 'Moldura branca arredondada, botão com corte em ângulo, colunas com cartões angulares e números em gradiente. Para consultorias, advocacia e marcas de prestígio.',
  nichos: ['Advocacia', 'Consultorias', 'Escolas premium', 'Corretores', 'Clínicas', 'Contabilidade', 'Eventos corporativos'],
  miniatura: miniaturaCinema('claro', 'colunas'),
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Excelência reconhecida por quem já passou por aqui.', 'Atuamos com ética, método e atenção a cada detalhe, para que você decida com segurança.');
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1);
    const nums = numerosReais(d);
    return documentoCinema(d, PARES.syne, `
${cssBaseClara(d, '#11141b')}
${cssNavVidro('nv')}
${cssVozesEscuras('Syne')}
body{background:#11141b}
.pm-folha{margin:clamp(8px,1.2vw,16px);border-radius:clamp(22px,3vw,40px);background:#fbfaf7;overflow:hidden;color:#14161a;position:relative}
.nv{top:calc(clamp(8px,1.2vw,16px) + 12px)}
.pm-hero{position:relative;min-height:calc(100svh - 24px);display:grid;align-content:end;padding:150px 0 clamp(50px,6vw,84px);overflow:hidden;isolation:isolate;color:#fff;border-radius:clamp(22px,3vw,40px) clamp(22px,3vw,40px) 0 0}
.pm-bg{position:absolute;inset:-4%;z-index:-2;background-size:cover;background-position:center}.pm-bg.tem-foto{animation:kb 24s ease-in-out infinite alternate}
.pm-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(10,12,18,.45),rgba(10,12,18,.2) 40%,rgba(10,12,18,.88))}
.pm-pre{font-size:13px;letter-spacing:.24em;text-transform:uppercase;color:rgba(255,255,255,.85);margin:0 0 22px}
.pm-h1{font-family:var(--fonte-t);font-weight:800;color:#fff;font-size:clamp(42px,8vw,128px);line-height:.94;letter-spacing:-.045em;max-width:15ch;margin:0 0 26px;text-wrap:balance}
.pm-sub{max-width:52ch;color:rgba(255,255,255,.82);font-size:clamp(17px,1.5vw,20px);line-height:1.65;margin:0 0 34px}
.pm-cta{display:inline-flex;align-items:center;gap:12px;padding:20px 44px 20px 34px;font-weight:700;font-size:15px;color:#fff;background:linear-gradient(135deg,var(--c1),color-mix(in srgb,var(--c1) 60%,var(--c2)));
  clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px));transition:transform .3s var(--ease),filter .3s}
.pm-cta:hover{transform:translateX(6px);filter:brightness(1.12)}.pm-cta svg{width:18px;height:18px}
.sec{padding:clamp(70px,10vw,140px) 0}
.pm-rot{font-size:12px;letter-spacing:.26em;text-transform:uppercase;color:var(--c1c);margin:0 0 18px;font-weight:700}
.pm-t{font-family:var(--fonte-t);font-weight:800;color:#0d0f13;font-size:clamp(32px,5vw,70px);line-height:1;letter-spacing:-.045em;margin:0 0 clamp(24px,4vw,48px);max-width:18ch}
.pm-tres{display:grid;grid-template-columns:1fr 1.15fr 1fr;gap:clamp(18px,3vw,40px);align-items:center}
.pm-quad{aspect-ratio:1;border-radius:6px;overflow:hidden;position:relative}.pm-quad .par{position:absolute;inset:-8%;background-size:cover;background-position:center}
.pm-ang{position:relative;padding:28px 26px;background:#fff;border:1px solid #e5e2da;margin-bottom:16px;clip-path:polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px));transition:transform .4s var(--ease),background .3s}
.pm-ang:hover{transform:translateY(-4px);background:#fff7e6}
.pm-ang .n{font-family:var(--fonte-t);font-weight:800;font-size:13px;letter-spacing:.14em;color:var(--c1c)}
.pm-ang h3{font-family:var(--fonte-t);font-weight:800;color:#0d0f13;font-size:21px;letter-spacing:-.03em;margin:10px 0 6px}.pm-ang p{margin:0;color:#59606b;font-size:15px}
.pm-esc{background:#0e1117;color:#fff;margin:0 clamp(8px,1.2vw,16px);border-radius:clamp(22px,3vw,40px);overflow:hidden}
.pm-esc .sec{padding:clamp(60px,9vw,120px) 0}
.pm-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
.pm-st{position:relative;padding:40px 32px;border-radius:24px;overflow:hidden;isolation:isolate;border:1px solid rgba(255,255,255,.12)}
.pm-st::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(160deg,color-mix(in srgb,var(--c1) 45%,#0e1117),#0e1117)}
.pm-st b{display:block;font-family:var(--fonte-t);font-weight:800;font-size:clamp(58px,7.4vw,112px);letter-spacing:-.05em;line-height:1;background:linear-gradient(135deg,#fff,var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent}
.pm-st span{color:rgba(255,255,255,.65);font-size:14px}
.pm-fim{padding:clamp(60px,9vw,120px) 0}
.pm-fim .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(30px,5vw,80px);align-items:center}
.pm-fim h2{font-family:var(--fonte-t);font-weight:800;color:#0d0f13;font-size:clamp(36px,5.6vw,84px);line-height:.96;letter-spacing:-.045em;margin:0 0 24px}
.pm-info p{display:flex;gap:14px;margin:0 0 14px;color:#2a2f38}.pm-info svg{flex:none;margin-top:3px;color:var(--c1c)}
.pm-folha .nr-vozes h2{color:#0d0f13}.pm-folha .nr-vozes-v{background:#fff;border-color:#e5e2da;-webkit-backdrop-filter:none;backdrop-filter:none}.pm-folha .nr-vozes-v blockquote{color:#14161a}.pm-folha .nr-vozes-v figcaption{color:#59606b}
.pm-rod{padding:30px 0 40px;color:#6a7079;font-size:13px;border-top:1px solid #e5e2da}
.pm-rod b{color:#0d0f13}
@media(max-width:900px){.pm-tres,.pm-fim .wrap{grid-template-columns:1fr}.pm-quad{order:-1;max-height:320px;aspect-ratio:16/10}}
`, `
<div class="pm-folha">
${nav(d, [['#sobre', 'Sobre'], ['#servicos', 'Serviços'], ['#contato', 'Contato']])}
<section class="pm-hero"><div class="${classeImagem(capa, 'pm-bg')}" style="${fundoImagem(capa, 0)}"></div>
  <div class="wrap"><p class="pm-pre entra">${esc(eyebrow(d) || d.empresa)}</p><h1 class="pm-h1">${palavras(titulo(d, d.empresa), 1)}</h1>
    <p class="pm-sub entra" style="--d:5">${capaTxt}</p>
    <div class="entra" style="--d:6;display:flex;gap:16px;flex-wrap:wrap;align-items:center">${ctaPrincipal(d, 'Agendar conversa', 'pm-cta')}${seloGoogle(d, 'nr-nota vidro')}</div></div></section>
<section class="sec" id="sobre"><div class="wrap"><p class="pm-rot rev">Quem somos</p><h2 class="pm-t rev">${esc(d.empresa)}</h2>
  <div class="pm-tres">
    <div class="rev-l">${servicos.slice(0, 2).map((s, i) => `<div class="pm-ang"><span class="n">${pad2(i + 1)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</div>`).join('') || `<div class="pm-ang"><span class="n">01</span><h3>Atendimento</h3><p>${sobreTxt}</p></div>`}</div>
    <div class="pm-quad rev"><div class="${classeImagem(foto2 || capa, 'par')}" style="${fundoImagem(foto2 || capa, 1)}"></div></div>
    <div class="rev-r">${servicos.slice(2, 4).map((s, i) => `<div class="pm-ang"><span class="n">${pad2(i + 3)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</div>`).join('') || `<div class="pm-ang"><span class="n">02</span><h3>Compromisso</h3><p>${sobreTxt}</p></div>`}</div>
  </div></div></section>
${servicos.length > 4 ? `<section class="sec" id="servicos" style="padding-top:0"><div class="wrap"><h2 class="pm-t rev">Outras áreas de atuação</h2><div class="pm-tres" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">${servicos.slice(4).map((s, i) => `<div class="pm-ang rev"><span class="n">${pad2(i + 5)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ''}</div>`).join('')}</div></div></section>` : '<span id="servicos"></span>'}
</div>
${nums.length >= 2 ? `<div class="pm-esc"><section class="sec"><div class="wrap"><p class="pm-rot rev" style="color:var(--c2)">Em números</p><div class="pm-stats">${nums.map(n => n.valor !== undefined ? contador(n.valor, n.rotulo, 'pm-st rev') : `<div class="pm-st rev"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join('')}</div></div></section></div>` : ''}
<div class="pm-folha" style="margin-top:${nums.length >= 2 ? 'clamp(8px,1.2vw,16px)' : '0'}">
${vozes(d, 'nr-vozes').replace('<section class="nr-vozes"', '<section class="nr-vozes" style="color:#14161a"')}
<section class="pm-fim" id="contato"><div class="wrap">
  <div class="rev-l"><p class="pm-rot">Contato</p><h2>${palavras('Vamos conversar?', 0)}</h2><div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">${ctaPrincipal(d, 'Chamar no WhatsApp', 'pm-cta')}</div></div>
  <div class="pm-info rev-r">${contatoLinhas(d, 'pm-lin')}</div></div></section>
<footer class="pm-rod"><div class="wrap"><b>${esc(d.empresa)}</b>${d.cidade ? ` · ${esc(d.cidade)}` : ''} · © ${new Date().getFullYear()}</div></footer>
</div>
`, false, false);
  },
};

export const LAYOUTS_CINEMA_4: SiteTemplate[] = [agro, fintech, premio];
