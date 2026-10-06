/**
 * CRÉDITO — crediários, financeiras e correspondentes.
 *
 * Direção de arte (referências de fintech no Behance): claro, arejado, verde
 * de confiança com um toque de amarelo; um "cartão" desenhado em CSS na capa
 * e a lista de documentos como checklist. Crédito é decisão de confiança:
 * a página explica cada etapa e nunca promete aprovação.
 *
 * Regra fixa: aviso legal no rodapé ("sujeito à análise e aprovação") e
 * nenhum número inventado (taxas, prazos, valores).
 */
import type { SiteTemplate } from './base';
import { esc } from './base';
import { documentoPremium } from './documento';
import { fim } from './premium';
import {
  type ParFontes, ICONES, ctaPrincipal, cssRodape, depoimentosValidos, fotos, fundoFoto, linkMapa, logo,
  partirSobre, rodapePremium, servicosValidos, urlImagem,
} from './premium-base';
import { cssGaleriaCena, diferenciaisDe, galeriaCena, horarioCurto, notaReal, passosDe, secaoLigada, zapTexto } from './cenas-base';

const FONTES_CREDITO: ParFontes = {
  titulos: '"Plus Jakarta Sans",system-ui,sans-serif', corpo: '"Plus Jakarta Sans",system-ui,sans-serif',
  google: 'family=Plus+Jakarta+Sans:wght@400;500;600;700;800',
};

export const credito: SiteTemplate = {
  id: 'credito',
  nome: 'Crédito',
  descricao: 'Claro e confiável, com cartão desenhado, passo a passo e checklist de documentos. Para crediários, financeiras e correspondentes.',
  nichos: ['Crediários', 'Financeiras', 'Consórcios', 'Correspondentes bancários', 'Cooperativas de crédito'],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#f6faf8"/><rect x="10" y="8" width="24" height="7" rx="3" fill="${corPrimaria}"/><rect x="112" y="7" width="38" height="10" rx="5" fill="${corPrimaria}"/>
    <rect x="12" y="32" width="64" height="9" rx="2" fill="#0d2b22"/><rect x="12" y="45" width="46" height="9" rx="2" fill="${corPrimaria}"/><rect x="12" y="62" width="30" height="9" rx="4.5" fill="${corPrimaria}"/>
    <rect x="86" y="28" width="62" height="40" rx="8" fill="${corPrimaria}"/><rect x="92" y="36" width="12" height="9" rx="2" fill="${corDestaque}"/><rect x="92" y="54" width="40" height="4" rx="2" fill="#fff" opacity=".7"/>
    <rect x="12" y="82" width="42" height="22" rx="6" fill="#fff" stroke="#dbe9e2"/><rect x="59" y="82" width="42" height="22" rx="6" fill="#fff" stroke="#dbe9e2"/><rect x="106" y="82" width="42" height="22" rx="6" fill="#fff" stroke="#dbe9e2"/></svg>`,
  render: d => {
    const [capaTxt, sobreTxt] = partirSobre(d, 'Tire as dúvidas, veja os documentos necessários e faça a sua simulação pelo WhatsApp.', 'Aqui você entende as condições, os prazos e os documentos antes de decidir.');
    const capa = urlImagem(d.capa);
    const galeria = fotos(d);
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const horario = horarioCurto(d);
    const mapa = linkMapa(d);
    const difs = secaoLigada(d, 'diferenciais') ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, 'passos') ? passosDe(d, 4) : [];
    const voz = depoimentosValidos(d).slice(0, 3);
    const zapSimular = zapTexto(d, 'Olá! Gostaria de fazer uma simulação.');
    const aviso = 'Crédito sujeito à análise e aprovação. As condições, prazos e valores são informados por escrito antes da contratação.';

    return documentoPremium(d, FONTES_CREDITO, `
:root{--c-fundo:#f6faf8;--c-tinta:#0d2b22;--c-suave:#506a60;--c-borda:#dbe9e2;--c-branco:#fff}
body{background:#f6faf8;color:var(--c-tinta)}
h1,h2,h3{font-family:var(--fonte-t);font-weight:800;letter-spacing:-.03em;line-height:1.05}
.topo{position:sticky;top:0;z-index:40;background:rgba(246,250,248,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--c-borda)}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 0}
.marca{display:flex;align-items:center;gap:10px;font-weight:800;font-size:var(--t1);color:var(--c-tinta)}
.logo-img{height:36px;width:auto}.logo-iniciais{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:800;font-size:14px}
.topo nav{display:flex;gap:28px;font-weight:600;font-size:15px;color:var(--c-suave)}.topo nav a:hover{color:var(--p-texto)}
.btn{border-radius:12px;font-weight:700}
.btn-1{background:var(--p);color:var(--sobre-p);box-shadow:0 14px 28px -16px var(--p)}.btn-1:hover{transform:translateY(-2px)}
.btn-2{background:var(--c-branco);color:var(--p-texto);border:1.5px solid var(--c-borda)}
.capa{padding:clamp(40px,6vw,88px) 0 clamp(40px,6vw,72px);overflow-x:clip}
.capa-in{display:grid;grid-template-columns:1.05fr 1fr;gap:clamp(32px,5vw,80px);align-items:center}
.etq{display:inline-flex;align-items:center;gap:10px;background:color-mix(in srgb,var(--p) 10%,#fff);border-radius:999px;padding:8px 16px;font-size:14px;font-weight:700;color:var(--p-texto)}
.capa h1{font-size:clamp(2.6rem,5.8vw,5rem);margin:22px 0 18px}
.capa h1 em{font-style:normal;background:linear-gradient(transparent 64%,color-mix(in srgb,var(--d) 55%,transparent) 64%)}
.capa .lead{color:var(--c-suave);font-size:var(--t1);max-width:46ch;margin:0 0 28px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.legal{margin:20px 0 0;color:var(--c-suave);font-size:13px;max-width:52ch}
.cena{position:relative;max-width:520px;margin-left:auto;width:100%;padding:24px 0 80px}
.cena::before{content:'';position:absolute;inset:0 -6% 10% -6%;border-radius:40px;background:radial-gradient(circle at 70% 30%,color-mix(in srgb,var(--d) 30%,transparent),transparent 62%),radial-gradient(circle at 20% 80%,color-mix(in srgb,var(--p) 14%,transparent),transparent 60%);z-index:0}
.foto-fundo{position:relative;z-index:1;aspect-ratio:5/4;border-radius:32px;overflow:hidden;box-shadow:0 30px 60px -36px rgba(13,43,34,.5)}
.cena.com-foto .cartao-cred{position:absolute;z-index:2;left:-6%;bottom:84px;width:62%;aspect-ratio:1.6;padding:18px;border-radius:18px}
.cena.com-foto .cartao-cred .chip{width:36px;height:26px}
.cena.com-foto .cartao-cred .nome{font-size:.95rem}
.cartao-cred{position:relative;z-index:1;aspect-ratio:1.6;border-radius:24px;padding:26px;color:var(--sobre-p);background:linear-gradient(135deg,var(--p),color-mix(in srgb,var(--p) 55%,#000));box-shadow:0 40px 70px -34px var(--p);display:flex;flex-direction:column;justify-content:space-between;transform:rotate(-3deg)}
.cartao-cred .chip{width:46px;height:34px;border-radius:8px;background:linear-gradient(135deg,var(--d),color-mix(in srgb,var(--d) 60%,#fff))}
.cartao-cred .nome{font-weight:700;font-size:1.15rem;letter-spacing:.02em}.cartao-cred small{display:block;opacity:.8;font-weight:500;font-size:12px;letter-spacing:.14em;text-transform:uppercase}
.cartao-cred::after{content:'';position:absolute;right:-30px;top:-30px;width:150px;height:150px;border-radius:50%;background:var(--d);opacity:.22}
.cena .nota{z-index:3;position:absolute;right:0;bottom:0;background:var(--c-branco);border:1px solid var(--c-borda);border-radius:18px;padding:14px 18px;box-shadow:0 22px 40px -24px rgba(13,43,34,.4);font-size:13px;color:var(--c-suave)}
.cena .nota b{display:block;font-size:1.6rem;color:var(--c-tinta);line-height:1}
.cena .hora{z-index:3;position:absolute;left:0;bottom:8px;background:var(--c-branco);border:1px solid var(--c-borda);border-radius:18px;padding:12px 16px;box-shadow:0 22px 40px -24px rgba(13,43,34,.4);font-size:14px;font-weight:600;display:flex;gap:10px;align-items:center}.cena .hora svg{color:var(--p-texto)}
.sec{padding:clamp(56px,8vw,104px) 0}
.cab{display:flex;align-items:end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:clamp(28px,4vw,48px)}
.cab h2{font-size:clamp(2.2rem,4.8vw,3.8rem);margin:0;max-width:18ch}.cab p{margin:0;color:var(--c-suave);max-width:38ch;font-size:var(--t1)}
.mods{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:16px}
.mod{display:flex;flex-direction:column;gap:10px;background:var(--c-branco);border:1px solid var(--c-borda);border-radius:22px;padding:28px;transition:transform .25s,box-shadow .25s}
.mod:hover{transform:translateY(-5px);box-shadow:0 28px 50px -34px rgba(13,43,34,.5)}
.mod .ic{width:50px;height:50px;border-radius:14px;display:grid;place-items:center;background:color-mix(in srgb,var(--p) 11%,#fff);color:var(--p-texto)}
.mod h3{font-size:clamp(1.3rem,2vw,1.6rem);margin:12px 0 0;overflow-wrap:anywhere}.mod p{margin:0;color:var(--c-suave)}
.mod a{margin-top:auto;padding-top:8px;font-weight:700;color:var(--p-texto);display:inline-flex;gap:8px;align-items:center}.mod a:hover{gap:12px}
.passo-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0;position:relative}
.passo{position:relative;padding:8px 28px 8px 0}
.passo .no{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:800;font-size:18px;margin-bottom:16px;box-shadow:0 0 0 8px color-mix(in srgb,var(--p) 12%,transparent)}
.passo h3{font-size:var(--t2);margin:0 0 8px}.passo p{margin:0;color:var(--c-suave)}
.docs .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,6vw,96px);align-items:center}
.docs h2{font-size:clamp(2.2rem,4.6vw,3.6rem);margin:0 0 16px}.docs p{color:var(--c-suave);font-size:var(--t1)}
.check{list-style:none;margin:0;padding:clamp(24px,3.4vw,40px);background:var(--c-branco);border:1px solid var(--c-borda);border-radius:26px;display:grid;gap:16px;box-shadow:0 30px 60px -44px rgba(13,43,34,.5)}
.check li{display:flex;gap:14px;align-items:center;font-weight:600}
.check svg{flex:none;width:30px;height:30px;padding:6px;border-radius:50%;background:var(--p);color:var(--sobre-p)}
.check small{display:block;color:var(--c-suave);font-weight:500;font-size:13px;margin-top:2px}
.dif-grade{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.dif-card{background:var(--c-branco);border:1px solid var(--c-borda);border-radius:22px;padding:26px}
.dif-card .ic{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);margin-bottom:16px}
.dif-card h3{font-size:var(--t2);margin:0 0 8px}.dif-card p{margin:0;color:var(--c-suave)}
.vozes .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.vozes figure{margin:0;background:var(--c-branco);border:1px solid var(--c-borda);border-radius:22px;padding:28px}
.vozes blockquote{margin:12px 0 18px;font-size:var(--t1)}.vozes figcaption{font-weight:700}
.chamada .cartao{position:relative;overflow:hidden;background:var(--p);color:var(--sobre-p);border-radius:32px;padding:clamp(40px,7vw,84px) clamp(24px,6vw,80px);text-align:center}
.chamada .cartao::before{content:'';position:absolute;right:-70px;top:-110px;width:300px;height:300px;border-radius:50%;background:var(--d);opacity:.25}
.chamada h2{position:relative;font-size:clamp(2.2rem,5vw,4rem);margin:0 0 12px;color:inherit}.chamada p{position:relative;margin:0 auto 26px;max-width:46ch;opacity:.92;font-size:var(--t1)}
.chamada .btn-1{position:relative;background:#fff;color:var(--p-texto);box-shadow:none}
.contato .wrap{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:clamp(48px,7vw,88px) 0 24px}
.contato .cx{background:var(--c-branco);border:1px solid var(--c-borda);border-radius:26px;padding:clamp(24px,4vw,44px)}
.contato h2{font-size:clamp(1.8rem,3.4vw,2.6rem);margin:0 0 16px}.contato p{display:flex;gap:12px;margin:0 0 10px;color:var(--c-suave)}.contato svg{flex:none;margin-top:4px;color:var(--p-texto)}
.contato .acoes{display:grid;gap:12px;align-content:center}.contato .btn{justify-content:center}
.aviso-legal{padding:0 0 clamp(32px,5vw,56px)}.aviso-legal p{margin:0;padding:16px 20px;border-radius:16px;background:color-mix(in srgb,var(--d) 16%,#fff);border:1px solid color-mix(in srgb,var(--d) 40%,#fff);color:var(--c-tinta);font-size:14px}
${cssGaleriaCena('22px', 'var(--c-borda)')}
.sx{--sx-fundo:transparent;--sx-alt:transparent;--sx-card:#fff;--sx-borda:var(--c-borda);--sx-texto:var(--c-tinta);--sx-suave:var(--c-suave);--sx-icone:var(--p-texto);--sx-raio:22px}
.sx-cab h2{font-family:var(--fonte-t);letter-spacing:-.03em}
${cssRodape('rp', '#0d2b22', '#a8c2b8')}
@media(max-width:900px){.topo nav{display:none}.capa-in,.docs .wrap,.contato .wrap{grid-template-columns:1fr}.cena{margin:8px auto 0;max-width:440px}.dif-grade{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.dif-grade{grid-template-columns:1fr}.cena .hora{display:none}}
`, `
<header class="topo"><div class="wrap">
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav aria-label="Seções"><a href="#modalidades">Modalidades</a><a href="#como">Como funciona</a><a href="#documentos">Documentos</a><a href="#contato">Contato</a></nav>
  ${ctaPrincipal(d, 'Simular')}
</div></header>
<section class="capa"><div class="wrap capa-in">
  <div><span class="etq">${esc(d.categoria || 'Crédito com atendimento claro')}${d.cidade ? ` · ${esc(d.cidade)}` : ''}</span>
    <h1>${d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : 'Crédito explicado <em>antes de contratar</em>'}</h1>
    <p class="lead">${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, 'Simular pelo WhatsApp')}<a class="btn btn-2" href="#como">Como funciona</a></div>
    <p class="legal">${aviso}</p></div>
  <div class="cena${capa ? ' com-foto' : ''}">${capa ? `<div class="foto-fundo" role="img" aria-label="${esc(d.empresa)}" style="${fundoFoto(capa, d.corPrimaria, 'rgba(0,0,0,0),rgba(0,0,0,.08)').replace(/"/g, '&quot;')}"></div>` : ''}<div class="cartao-cred" role="img" aria-label="Ilustração de um cartão"><span class="chip"></span><div><small>Atendimento</small><span class="nome">${esc(d.empresa)}</span></div></div>
    ${nota ? `<div class="nota"><b>${nota.nota} ★</b>${nota.avaliacoes ? `${nota.avaliacoes} avaliações no Google` : 'no Google'}</div>` : ''}
    ${horario ? `<div class="hora">${ICONES.relogio}<span>${esc(horario)}</span></div>` : ''}</div>
</div></section>
${servicos.length ? `<section class="sec" id="modalidades"><div class="wrap"><div class="cab"><h2>Modalidades de crédito</h2><p>Escolha o assunto e chame no WhatsApp com a mensagem já escrita.</p></div>
<div class="mods">${servicos.map((s, i) => `<article class="mod"><span class="ic">${[ICONES.escudo, ICONES.brilho, ICONES.coracao, ICONES.estrela, ICONES.check, ICONES.relogio][i % 6]}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p>${
    zapTexto(d, `Olá! Quero saber mais sobre: ${s.titulo}`) ? `<a href="${zapTexto(d, `Olá! Quero saber mais sobre: ${s.titulo}`)}" target="_blank" rel="noopener">Consultar ${ICONES.seta}</a>` : ''}</article>`).join('')}</div></div></section>` : ''}
${passos.length ? `<section class="sec" id="passos" style="padding-top:0"><div class="wrap"><div class="cab"><h2 id="como">Como funciona</h2><p>Três etapas, sem letra miúda.</p></div><div class="passo-grade">${passos.map((p, i) => `<div class="passo"><span class="no">${i + 1}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join('')}</div></div></section>` : ''}
<section class="sec docs" id="documentos"><div class="wrap">
  <div><h2>Saiba o que levar antes de vir</h2><p>${sobreTxt}</p>${zapSimular ? `<p><a class="btn btn-1" href="${zapSimular}" target="_blank" rel="noopener">${ICONES.zap}Confirmar a lista no WhatsApp</a></p>` : ''}</div>
  <ul class="check"><li>${ICONES.check}<span>Documento oficial com foto<small>RG ou CNH</small></span></li><li>${ICONES.check}<span>CPF</span></li><li>${ICONES.check}<span>Comprovante de residência</span></li><li>${ICONES.check}<span>Comprovante de renda<small>A lista exata é confirmada conforme a modalidade</small></span></li></ul>
</div></section>
${difs.length ? `<section class="sec" id="diferenciais" style="padding-top:0"><div class="wrap"><div class="dif-grade">${difs.map((x, i) => `<div class="dif-card"><span class="ic">${[ICONES.escudo, ICONES.check, ICONES.coracao, ICONES.estrela][i % 4]}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join('')}</div></div></section>` : ''}
${galeriaCena(galeria, esc(d.empresa), 'Nosso atendimento')}
${voz.length ? `<section class="sec vozes"><div class="wrap"><div class="cab"><h2>Quem já foi atendido</h2></div><div class="grade">${voz.map(x => `<figure><span class="estrelas" aria-hidden="true">★★★★★</span><blockquote>“${esc(x.texto)}”</blockquote><figcaption>${esc(x.autor || '')}</figcaption></figure>`).join('')}</div></div></section>` : ''}
${secaoLigada(d, 'ctaFinal') ? `<section class="sec chamada" id="chamada"><div class="wrap"><div class="cartao"><h2>Faça a sua simulação</h2><p>Chame no WhatsApp e tire as dúvidas antes de decidir.</p>${ctaPrincipal(d, 'Simular pelo WhatsApp')}</div></div></section>` : ''}
<section class="contato" id="contato"><div class="wrap">
  <div class="cx"><h2>Fale com a gente</h2>${d.endereco ? `<p>${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ''}${d.horario ? `<p>${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ''}</div>
  <div class="cx acoes">${ctaPrincipal(d, 'Chamar no WhatsApp')}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ''}</div>
</div></section>
<div class="aviso-legal"><div class="wrap"><p><strong>Aviso:</strong> ${aviso}</p></div></div>
${fim(d, rodapePremium(d))}`);
  },
};

export const CENAS_CREDITO: SiteTemplate[] = [credito];
