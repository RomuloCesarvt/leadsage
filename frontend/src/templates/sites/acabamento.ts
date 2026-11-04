/**
 * O acabamento de toda prévia: o que as skills de design (emil-design-eng, mobile-native, high-end-visual-design) pedem de um
 * site que parece feito à mão e não saído de um modelo. É aplicado por cima do HTML de QUALQUER layout, então vale para todos.
 *
 *  - toque: sem o clarão cinza ao tocar, sem atraso de 300 ms, texto que não "pula" de tamanho, `100dvh` no lugar de `100vh`
 *    (a barra do Safari/Chrome no celular não corta a capa) e campos de 16 px (o iPhone não dá zoom ao digitar);
 *  - tipografia: títulos equilibrados (`text-wrap: balance`), parágrafos sem linha órfã, suavização de fonte;
 *  - movimento: uma curva forte de saída (`cubic-bezier(.23,1,.32,1)`) em tudo que reage ao toque, botão que "afunda" ao
 *    apertar, e seções que sobem com leveza ao entrar na tela, uma a uma, só com transform e opacity;
 *  - segurança: com `prefers-reduced-motion` ou sem JavaScript o conteúdo aparece pronto, e depois de 4 s tudo se revela
 *    mesmo se o navegador não avisar a rolagem (captura de tela, impressão).
 */
const CSS = `
:root{-webkit-text-size-adjust:100%;text-size-adjust:100%}
html{-webkit-tap-highlight-color:transparent}
body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;text-rendering:optimizeLegibility;overflow-x:hidden}
a,button,summary,label,.btn,[role=button]{touch-action:manipulation}
h1,h2,h3{text-wrap:balance}
p,li,figcaption{text-wrap:pretty}
img,video{max-width:100%}
input,select,textarea{font-size:16px}
a,button,.btn,summary{transition-timing-function:cubic-bezier(.23,1,.32,1)}
.btn,.bt-cheio,.vidro-bt,button{-webkit-user-select:none;user-select:none}
.btn:active,.bt-cheio:active,.vidro-bt:active,button:active{scale:.97;transition-duration:.12s}
:focus-visible{outline:2px solid currentColor;outline-offset:3px;border-radius:6px}
html.ac-js .ac-rev{opacity:0;transform:translate3d(0,16px,0);will-change:transform,opacity}
html.ac-js .ac-rev.ac-in{opacity:1;transform:none;transition:opacity .7s cubic-bezier(.23,1,.32,1) var(--ac-d,0s),transform .7s cubic-bezier(.23,1,.32,1) var(--ac-d,0s);will-change:auto}
@media(prefers-reduced-motion:reduce){html.ac-js .ac-rev{opacity:1;transform:none}.btn:active,button:active{scale:1}}
`;

const JS = `(function(){try{
var d=document.documentElement;
if(!('IntersectionObserver' in window)||(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches))return;
var alvos=[].slice.call(document.querySelectorAll('section h2,section figure,section li,section details,section article,section [class*="card"],section [class*="cart"]'));
alvos=alvos.filter(function(e){if(e.closest('.rev,.sobe,[class*="rev-"],nav,header'))return false;var r=e.getBoundingClientRect();return r.top>innerHeight*0.92});
if(!alvos.length)return;
d.classList.add('ac-js');
var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('ac-in');io.unobserve(x.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
var porSecao=new Map();
alvos.forEach(function(e){var s=e.closest('section')||document.body;var n=porSecao.get(s)||0;porSecao.set(s,n+1);e.style.setProperty('--ac-d',(Math.min(n,5)*60)+'ms');e.classList.add('ac-rev');io.observe(e)});
var tudo=function(){alvos.forEach(function(e){e.classList.add('ac-in')})};
setTimeout(tudo,4000);addEventListener('beforeprint',tudo);
}catch(e){}})();`;

/** Aplica o acabamento a um documento HTML completo. Não repete se já foi aplicado. */
export const acabamento = (html: string): string => {
  if (!html || html.includes('id="acabamento"')) return html;
  let out = html.replace(/min-height:\s*100vh(?!;\s*min-height)/g, 'min-height:100vh;min-height:100dvh');
  const estilo = `<style id="acabamento">${CSS}</style>`;
  const script = `<script id="acabamento-js">${JS}</script>`;
  out = out.includes('</head>') ? out.replace('</head>', `${estilo}</head>`) : estilo + out;
  out = out.includes('</body>') ? out.replace('</body>', `${script}</body>`) : out + script;
  return out;
};
