/**
 * Base dos templates de site.
 *
 * Antes o "template" era apenas uma palavra injetada no prompt da IA, e a
 * miniatura na tela era um quadrado cinza com um ícone. Não havia layout
 * nenhum: cada geração saía diferente e não dava para editar.
 *
 * Agora cada template é um layout de verdade: HTML autocontido, com o CSS
 * embutido e sem nenhuma dependência externa — o site publicado precisa
 * abrir sozinho, sem CDN, sem fonte remota, sem JavaScript de terceiros.
 */

export type Servico = {
  titulo: string;
  descricao: string;
};

export type SiteData = {
  empresa: string;
  categoria: string;
  slogan: string;
  sobre: string;
  servicos: Servico[];
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  horario: string;
  instagram: string;
  /** logo enviada pelo usuário, como data URI */
  logo?: string;
  corPrimaria: string;
  corDestaque: string;
};

export type SiteTemplate = {
  id: string;
  nome: string;
  descricao: string;
  /** nichos em que este layout costuma cair bem */
  nichos: string[];
  /** miniatura em SVG, desenhada no próprio código (sem arquivo de imagem) */
  miniatura: (d: Pick<SiteData, 'corPrimaria' | 'corDestaque'>) => string;
  render: (d: SiteData) => string;
};

/** Escapa texto do usuário antes de entrar no HTML gerado. */
export const esc = (texto: string): string =>
  String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Só dígitos, para montar links de telefone e WhatsApp. */
export const digitos = (valor: string): string => String(valor ?? '').replace(/\D/g, '');

export const linkWhatsapp = (numero: string, empresa: string): string => {
  const n = digitos(numero);
  if (!n) return '';
  const texto = encodeURIComponent(`Olá! Vim pelo site da ${empresa}.`);
  return `https://wa.me/${n}?text=${texto}`;
};

export const linkInstagram = (valor: string): string => {
  if (!valor) return '';
  if (valor.startsWith('http')) return valor;
  return `https://instagram.com/${valor.replace(/^@/, '')}`;
};

/** Clareia ou escurece uma cor hex — usado nos gradientes e nas bordas. */
export const ajustarCor = (hex: string, quantidade: number): string => {
  const limpo = (hex || '#2563eb').replace('#', '');
  const cheio = limpo.length === 3 ? limpo.split('').map(c => c + c).join('') : limpo;
  const num = parseInt(cheio, 16);
  if (Number.isNaN(num)) return hex;

  const ajusta = (canal: number) => Math.max(0, Math.min(255, Math.round(canal + quantidade)));
  const r = ajusta((num >> 16) & 0xff);
  const g = ajusta((num >> 8) & 0xff);
  const b = ajusta(num & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

/** Preto ou branco, conforme o que tiver mais contraste sobre a cor dada. */
export const corDoTexto = (hex: string): string => {
  const limpo = (hex || '#2563eb').replace('#', '');
  const cheio = limpo.length === 3 ? limpo.split('').map(c => c + c).join('') : limpo;
  const num = parseInt(cheio, 16);
  if (Number.isNaN(num)) return '#ffffff';
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  // luminância relativa aproximada
  const luz = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luz > 0.6 ? '#111827' : '#ffffff';
};

/** Marca da empresa: a logo enviada, ou as iniciais num círculo. */
export const marca = (d: SiteData, tamanho = 44): string => {
  if (d.logo) {
    return `<img class="marca-img" src="${d.logo}" alt="${esc(d.empresa)}" style="height:${tamanho}px">`;
  }
  const iniciais = esc(
    d.empresa
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0])
      .join('')
      .toUpperCase() || '?'
  );
  return `<span class="marca-iniciais" style="width:${tamanho}px;height:${tamanho}px;font-size:${Math.round(
    tamanho * 0.4
  )}px">${iniciais}</span>`;
};

/**
 * CSS comum a todos os layouts: reset, tipografia do sistema (sem fonte
 * remota) e as variáveis de cor que o usuário controla.
 */
export const cssBase = (d: SiteData): string => `
:root{
  --primaria:${d.corPrimaria};
  --primaria-escura:${ajustarCor(d.corPrimaria, -35)};
  --primaria-clara:${ajustarCor(d.corPrimaria, 180)};
  --destaque:${d.corDestaque};
  --sobre-primaria:${corDoTexto(d.corPrimaria)};
  --sobre-destaque:${corDoTexto(d.corDestaque)};
  --tinta:#111827;
  --tinta-suave:#4b5563;
  --linha:#e5e7eb;
  --fundo-suave:#f9fafb;
}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  color:var(--tinta);line-height:1.6;-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}
a{color:inherit}
h1,h2,h3{line-height:1.2;margin:0 0 .5em}
p{margin:0 0 1em}
.container{width:min(1120px,92vw);margin:0 auto}
.marca{display:flex;align-items:center;gap:12px;font-weight:800;text-decoration:none}
.marca-img{width:auto;object-fit:contain}
.marca-iniciais{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;
  background:var(--primaria);color:var(--sobre-primaria);font-weight:800;letter-spacing:.5px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 26px;
  border-radius:999px;font-weight:700;text-decoration:none;border:0;cursor:pointer;
  transition:transform .15s ease,box-shadow .15s ease;font-size:15px}
.btn:hover{transform:translateY(-1px)}
.btn-principal{background:var(--primaria);color:var(--sobre-primaria);box-shadow:0 8px 20px -8px var(--primaria)}
.btn-destaque{background:var(--destaque);color:var(--sobre-destaque);box-shadow:0 8px 20px -8px var(--destaque)}
.btn-vazado{background:transparent;color:var(--primaria);border:2px solid var(--primaria)}
.secao{padding:88px 0}
.secao-suave{background:var(--fundo-suave)}
.titulo-secao{font-size:clamp(26px,4vw,38px);text-align:center;margin-bottom:12px}
.sub-secao{text-align:center;color:var(--tinta-suave);max-width:620px;margin:0 auto 48px}
.rodape{background:#0f172a;color:#cbd5e1;padding:56px 0 32px;font-size:14px}
.rodape a{color:#e2e8f0;text-decoration:none}
.rodape a:hover{text-decoration:underline}
.rodape-linha{border-top:1px solid #1e293b;margin-top:32px;padding-top:20px;color:#64748b;font-size:13px}
.zap{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;
  background:#25D366;display:flex;align-items:center;justify-content:center;
  box-shadow:0 10px 25px -8px rgba(0,0,0,.4);z-index:50}
@media(max-width:720px){
  .secao{padding:56px 0}
  .btn{width:100%}
}
`;

/** Botão flutuante de WhatsApp, comum a todos os layouts. */
export const botaoZap = (d: SiteData): string => {
  const url = linkWhatsapp(d.whatsapp || d.telefone, d.empresa);
  if (!url) return '';
  return `<a class="zap" href="${url}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
  <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.9 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
</a>`;
};

/** Envelope HTML final. */
export const documento = (d: SiteData, css: string, corpo: string): string =>
  `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.empresa)}${d.categoria ? ` — ${esc(d.categoria)}` : ''}</title>
<meta name="description" content="${esc(d.slogan || d.sobre).slice(0, 155)}">
<style>${cssBase(d)}${css}</style>
</head>
<body>
${corpo}
${botaoZap(d)}
</body>
</html>`;

/** Rodapé compartilhado. */
export const rodape = (d: SiteData): string => {
  const ig = linkInstagram(d.instagram);
  const tel = digitos(d.telefone);
  return `<footer class="rodape">
  <div class="container">
    <div style="display:flex;flex-wrap:wrap;gap:32px;justify-content:space-between">
      <div style="max-width:320px">
        <div class="marca" style="color:#fff;margin-bottom:12px">${marca(d, 36)}<span>${esc(d.empresa)}</span></div>
        ${d.sobre ? `<p style="color:#94a3b8">${esc(d.sobre).slice(0, 160)}</p>` : ''}
      </div>
      <div>
        <h3 style="color:#fff;font-size:15px;margin-bottom:12px">Contato</h3>
        ${tel ? `<p style="margin:0 0 6px"><a href="tel:+${tel}">${esc(d.telefone)}</a></p>` : ''}
        ${d.email ? `<p style="margin:0 0 6px"><a href="mailto:${esc(d.email)}">${esc(d.email)}</a></p>` : ''}
        ${ig ? `<p style="margin:0"><a href="${ig}" target="_blank" rel="noopener">Instagram</a></p>` : ''}
      </div>
      <div>
        ${d.endereco ? `<h3 style="color:#fff;font-size:15px;margin-bottom:12px">Onde estamos</h3><p style="color:#94a3b8;margin:0 0 6px">${esc(d.endereco)}</p>` : ''}
        ${d.horario ? `<p style="color:#94a3b8;margin:0">${esc(d.horario)}</p>` : ''}
      </div>
    </div>
    <div class="rodape-linha">© ${new Date().getFullYear()} ${esc(d.empresa)}. Todos os direitos reservados.</div>
  </div>
</footer>`;
};
