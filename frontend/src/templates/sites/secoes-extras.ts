/**
 * Seções que todo site de negócio local precisa e que o layout não trouxe:
 * diferenciais, como funciona, perguntas frequentes e a chamada final.
 *
 * Seguem a anatomia de uma página que converte: promessa, prova, benefício,
 * tratamento de objeções (o FAQ responde o que o cliente perguntaria antes
 * de ligar) e um último convite à ação. Entram antes do contato, só quando
 * há conteúdo, e só as que o layout ainda não tem.
 *
 * Os textos fixos aqui (títulos de seção) não afirmam nada sobre o negócio.
 */
import type { SiteData } from './base';
import { esc } from './base';
import { ICONES, ctaPrincipal, linkMapa, linkTel } from './premium-base';

const ICONES_DIF = [ICONES.escudo, ICONES.relogio, ICONES.estrela, ICONES.coracao, ICONES.check, ICONES.brilho];

const aparece = (d: SiteData, id: 'diferenciais' | 'passos' | 'faq' | 'ctaFinal'): boolean => d.secoes?.[id] !== false;

const itens = <T extends { titulo?: string; texto?: string }>(lista?: T[], max = 6): T[] =>
  (lista || []).filter(i => (i.titulo || '').trim() && (i.texto || '').trim()).slice(0, max);

export type SecaoExtra = 'diferenciais' | 'passos' | 'faq' | 'ctaFinal';

/** Quais seções extras este site vai mostrar, na ordem. */
export const secoesQueEntram = (d: SiteData, jaTem: string): SecaoExtra[] => {
  const tem = (id: string) => jaTem.includes(`id="${id}"`);
  const saida: SecaoExtra[] = [];
  if (aparece(d, 'diferenciais') && itens(d.diferenciais).length && !tem('diferenciais')) saida.push('diferenciais');
  if (aparece(d, 'passos') && itens(d.passos, 4).length && !tem('passos')) saida.push('passos');
  if (aparece(d, 'faq') && (d.faq || []).some(p => p.pergunta?.trim() && p.resposta?.trim()) && !tem('faq')) saida.push('faq');
  if (aparece(d, 'ctaFinal') && (linkTel(d) || d.whatsapp || d.telefone) && !tem('chamada')) saida.push('ctaFinal');
  return saida;
};

export const secoesExtras = (d: SiteData, jaTem: string): { cedo: string; resto: string } => {
  const entram = secoesQueEntram(d, jaTem);
  const partes: string[] = [];
  let cedo = '';
  let alt = true;
  const caixa = (classe: string) => { const c = `sx ${alt ? 'sx-alt ' : ''}${classe}`; alt = !alt; return c; };

  if (entram.includes('diferenciais')) {
    partes.push(`<section class="${caixa('sx-dif')}" id="diferenciais"><div class="wrap">
  <div class="sx-cab"><p class="sx-pre">Diferenciais</p><h2>Por que escolher a ${esc(d.empresa)}</h2></div>
  <ul class="sx-grade">${itens(d.diferenciais).map((x, i) => `<li><span class="sx-ic">${ICONES_DIF[i % ICONES_DIF.length]}</span><h3>${esc(x.titulo!)}</h3><p>${esc(x.texto!)}</p></li>`).join('')}</ul>
</div></section>`);
    // "por que nos" vem logo depois dos servicos, antes do resto: e a ordem de uma
    // pagina que converte (o que fazemos -> por que escolher -> como funciona)
    cedo = partes.pop() as string;
  }

  if (entram.includes('passos')) {
    partes.push(`<section class="${caixa('sx-pas')}" id="passos"><div class="wrap">
  <div class="sx-cab"><p class="sx-pre">Passo a passo</p><h2>Como funciona</h2><p>Simples, do primeiro contato até o resultado.</p></div>
  <ol class="sx-passos">${itens(d.passos, 4).map(x => `<li><h3>${esc(x.titulo!)}</h3><p>${esc(x.texto!)}</p></li>`).join('')}</ol>
</div></section>`);
  }

  if (entram.includes('faq')) {
    const perguntas = (d.faq || []).filter(p => p.pergunta?.trim() && p.resposta?.trim()).slice(0, 8);
    partes.push(`<section class="${caixa('sx-faq')}" id="faq"><div class="wrap">
  <div class="sx-cab"><p class="sx-pre">Dúvidas</p><h2>Perguntas frequentes</h2><p>As respostas para o que mais perguntam antes de entrar em contato.</p></div>
  <div class="sx-lista">${perguntas.map(p => `<details><summary>${esc(p.pergunta)}</summary><div><p>${esc(p.resposta)}</p></div></details>`).join('')}</div>
</div></section>`);
  }

  if (entram.includes('ctaFinal')) {
    const tel = linkTel(d), mapa = linkMapa(d);
    partes.push(`<section class="sx sx-cta" id="chamada"><div class="wrap"><div class="sx-cta-in">
  <h2>Pronto para começar?</h2><p>Chame no WhatsApp e conte o que você precisa.</p>
  <div class="sx-cta-btns">${ctaPrincipal(d, 'Falar no WhatsApp', 'sx-btn sx-btn-1')}${
    tel ? `<a class="sx-btn sx-btn-2" href="${tel}">${ICONES.tel}Ligar agora</a>` : (mapa ? `<a class="sx-btn sx-btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : '')}</div>
</div></div></section>`);
  }
  return { cedo, resto: partes.join('\n') };
};

export const cssExtras = (escuro = false): string => `
:root{${escuro
    ? '--sx-fundo:#0f1115;--sx-alt:#14171c;--sx-texto:#eef0f4;--sx-suave:#a9b0bd;--sx-card:#181c23;--sx-borda:rgba(255,255,255,.1);--sx-icone:var(--d)'
    : '--sx-fundo:#ffffff;--sx-alt:#f5f6f8;--sx-texto:#1b1f27;--sx-suave:#566070;--sx-card:#ffffff;--sx-borda:#e4e8ee;--sx-icone:var(--p-texto)'};--sx-raio:18px}
.sx{padding:clamp(64px,9vw,112px) 0;background:var(--sx-fundo);color:var(--sx-texto)}
.sx-alt{background:var(--sx-alt)}
.sx-cab{max-width:680px;margin:0 auto clamp(36px,5vw,60px);text-align:center}
.sx-pre{margin:0 0 14px;font:700 var(--tn1)/1 var(--fonte-c);letter-spacing:.1em;text-transform:uppercase;color:var(--sx-icone)}
.sx-cab h2{margin:0 0 14px;font-size:var(--t4);letter-spacing:-.02em}
.sx-cab p:not(.sx-pre){margin:0;color:var(--sx-suave);font-size:var(--t1)}
.sx-grade{list-style:none;margin:0;padding:0;display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))}
.sx-grade li{padding:30px;border:1px solid var(--sx-borda);border-radius:var(--sx-raio);background:var(--sx-card)}
.sx-ic{display:grid;place-items:center;width:48px;height:48px;margin-bottom:20px;border-radius:14px;background:color-mix(in srgb,var(--sx-icone) 12%,transparent);color:var(--sx-icone)}
.sx-grade h3,.sx-passos h3{margin:0 0 8px;font-size:var(--t2)}
.sx-grade p,.sx-passos p{margin:0;color:var(--sx-suave)}
.sx-passos{list-style:none;margin:0;padding:0;counter-reset:passo;display:grid;gap:24px;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr))}
.sx-passos li{position:relative;padding:28px 28px 28px 0}
.sx-passos li::before{counter-increment:passo;content:counter(passo);display:grid;place-items:center;width:46px;height:46px;margin-bottom:18px;border-radius:50%;background:var(--p);color:var(--sobre-p);font:800 var(--t1)/1 var(--fonte-t)}
.sx-lista{max-width:800px;margin:0 auto;display:grid;gap:12px}
.sx-lista details{border:1px solid var(--sx-borda);border-radius:var(--sx-raio);background:var(--sx-card);overflow:hidden}
.sx-lista summary{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:20px 24px;cursor:pointer;list-style:none;font-weight:700;font-size:var(--t0)}
.sx-lista summary::-webkit-details-marker{display:none}
.sx-lista summary::after{content:'+';flex:none;font-size:1.6em;line-height:1;color:var(--sx-icone);transition:transform .2s}
.sx-lista details[open] summary::after{transform:rotate(45deg)}
.sx-lista details>div{padding:0 24px 22px;color:var(--sx-suave)}
.sx-lista details p{margin:0;max-width:62ch}
.sx-cta{background:var(--sx-fundo);padding-top:0}
.sx-cta-in{background:var(--p);color:var(--sobre-p);border-radius:calc(var(--sx-raio) + 10px);padding:clamp(40px,6vw,72px) clamp(24px,5vw,64px);text-align:center}
.sx-cta-in h2{margin:0 0 10px;font-size:var(--t4);color:inherit}
.sx-cta-in p{margin:0 auto 28px;max-width:46ch;font-size:var(--t1);color:inherit;opacity:.92}
.sx-cta-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.sx-btn{display:inline-flex;align-items:center;gap:10px;min-height:52px;padding:14px 28px;border-radius:999px;font-weight:700;font-size:var(--t0);cursor:pointer;border:2px solid transparent;transition:transform .2s ease}
.sx-btn:hover{transform:translateY(-2px)}
.sx-btn-1{background:#fff;color:var(--p-texto)}
.sx-btn-2{background:transparent;color:var(--sobre-p);border-color:currentColor}
@media(max-width:760px){.sx-btn{width:100%;justify-content:center}.sx-passos li{padding-right:0}}
`;
