// src/templates/sites/base.ts
var TIPOGRAFIAS = {
  editorial: {
    nome: "Editorial",
    titulos: 'Georgia,"Times New Roman",serif',
    corpo: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif',
    espacamento: "-0.5px",
    caixa: "none"
  },
  moderna: {
    nome: "Moderna",
    titulos: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
    corpo: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
    espacamento: "-1.2px",
    caixa: "none"
  },
  classica: {
    nome: "Cl\xE1ssica",
    titulos: '"Palatino Linotype","Book Antiqua",Palatino,Georgia,serif',
    corpo: '"Segoe UI",Tahoma,Geneva,Verdana,sans-serif',
    espacamento: "0px",
    caixa: "none"
  },
  tecnica: {
    nome: "T\xE9cnica",
    titulos: '"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
    corpo: '"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif',
    espacamento: "1.5px",
    caixa: "uppercase"
  },
  acolhedora: {
    nome: "Acolhedora",
    titulos: '"Trebuchet MS","Lucida Grande",Verdana,sans-serif',
    corpo: '"Trebuchet MS","Lucida Grande",Verdana,sans-serif',
    espacamento: "-0.3px",
    caixa: "none"
  }
};
var CANTOS = {
  reto: { nome: "Reto", caixa: "2px", botao: "4px" },
  suave: { nome: "Suave", caixa: "14px", botao: "10px" },
  redondo: { nome: "Redondo", caixa: "22px", botao: "999px" }
};
var esc = (texto) => String(texto ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
var telefoneLegivel = (valor) => {
  const bruto = String(valor ?? "").trim();
  let n = bruto.replace(/\D/g, "");
  if (n.startsWith("55") && (n.length === 12 || n.length === 13)) n = n.slice(2);
  if (/[()]/.test(bruto) && n.length >= 10) return bruto;
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return bruto;
};
var digitos = (valor) => String(valor ?? "").replace(/\D/g, "");
var linkWhatsapp = (numero, empresa) => {
  const n = digitos(numero);
  if (!n) return "";
  const texto = encodeURIComponent(`Ol\xE1! Vim pelo site da ${empresa}.`);
  return `https://wa.me/${n}?text=${texto}`;
};
var linkInstagram = (valor) => {
  if (!valor) return "";
  if (valor.startsWith("http")) return valor;
  return `https://instagram.com/${valor.replace(/^@/, "")}`;
};
var ajustarCor = (hex, quantidade) => {
  const limpo = (hex || "#2563eb").replace("#", "");
  const cheio = limpo.length === 3 ? limpo.split("").map((c) => c + c).join("") : limpo;
  const num2 = parseInt(cheio, 16);
  if (Number.isNaN(num2)) return hex;
  const ajusta = (canal) => Math.max(0, Math.min(255, Math.round(canal + quantidade)));
  const r = ajusta(num2 >> 16 & 255);
  const g = ajusta(num2 >> 8 & 255);
  const b = ajusta(num2 & 255);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
};
var corDoTexto = (hex) => {
  const limpo = (hex || "#2563eb").replace("#", "");
  const cheio = limpo.length === 3 ? limpo.split("").map((c) => c + c).join("") : limpo;
  const num2 = parseInt(cheio, 16);
  if (Number.isNaN(num2)) return "#ffffff";
  const r = num2 >> 16 & 255;
  const g = num2 >> 8 & 255;
  const b = num2 & 255;
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const comBranco = 1.05 / (L + 0.05);
  const comGrafite = (L + 0.05) / (0.0108 + 0.05);
  return comBranco >= comGrafite ? "#ffffff" : "#111827";
};
var marca = (d, tamanho = 44) => {
  if (d.logo) {
    return `<img class="marca-img" src="${d.logo}" alt="${esc(d.empresa)}" style="height:${tamanho}px">`;
  }
  const iniciais2 = esc(
    d.empresa.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?"
  );
  return `<span class="marca-iniciais" style="width:${tamanho}px;height:${tamanho}px;font-size:${Math.round(
    tamanho * 0.4
  )}px">${iniciais2}</span>`;
};
var cssBase = (d) => `
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
/* O fundo precisa ser declarado. Sem isto a pagina herda o padrao do
   navegador, e em ambiente com tema escuro forcado as secoes sem cor
   propria saem pretas \u2014 com texto escuro por cima, ilegivel. Apareceu
   na previa: a capa (que tem fundo proprio) abria certo e o resto da
   pagina sumia. */
body{margin:0;background:#ffffff;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
  color:var(--tinta);line-height:1.6;-webkit-font-smoothing:antialiased;
  color-scheme:light}
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
var botaoZap = (d) => {
  const url = linkWhatsapp(d.whatsapp || d.telefone, d.empresa);
  if (!url) return "";
  return `<a class="zap" href="${url}" target="_blank" rel="noopener" aria-label="Falar no WhatsApp">
  <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.9 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
</a>`;
};
var selo = (d) => d.selo ? '<div class="selo-leadsage">Site criado com <a href="https://leadsageofc.vercel.app" target="_blank" rel="noopener">LeadSage</a></div>' : "";
var cssSelo = `
.selo-leadsage{background:#0f172a;color:#94a3b8;text-align:center;
  padding:10px 16px;font-size:12.5px;letter-spacing:.2px}
.selo-leadsage a{color:#e2e8f0;font-weight:700;text-decoration:none}
.selo-leadsage a:hover{text-decoration:underline}
`;
var cssIdentidade = (d) => {
  if (!d.tipografia && !d.cantos) return "";
  const t = TIPOGRAFIAS[d.tipografia || "moderna"];
  const c = CANTOS[d.cantos || "suave"];
  return `
body{font-family:${t.corpo}}
h1,h2,h3,.marca,.marca-iniciais,.btn{font-family:${t.titulos}}
h1,h2{letter-spacing:${t.espacamento}}
h3,.titulo-secao,.etiqueta{text-transform:${t.caixa}}
.btn{border-radius:${c.botao}}
figure,blockquote,.galeria figure,[class*="cart"],[class*="card"],[class*="caixa"],
[class*="bloco"],[class*="item"],[class*="servico"]{border-radius:${c.caixa}}
`;
};
var documento = (d, css, corpo) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(d.empresa)}${d.categoria ? ` \u2014 ${esc(d.categoria)}` : ""}</title>
<meta name="description" content="${esc(d.slogan || d.sobre).slice(0, 155)}">
<style>${cssBase(d)}${css}${cssIdentidade(d)}${d.selo ? cssSelo : ""}</style>
</head>
<body>
${corpo}
${selo(d)}
${botaoZap(d)}
</body>
</html>`;
var rodape = (d) => {
  const ig = linkInstagram(d.instagram);
  const tel = digitos(d.telefone);
  return `<footer class="rodape">
  <div class="container">
    <div style="display:flex;flex-wrap:wrap;gap:32px;justify-content:space-between">
      <div style="max-width:320px">
        <div class="marca" style="color:#fff;margin-bottom:12px">${marca(d, 36)}<span>${esc(d.empresa)}</span></div>
        ${d.sobre ? `<p style="color:#94a3b8">${esc(d.sobre).slice(0, 160)}</p>` : ""}
      </div>
      <div>
        <h3 style="color:#fff;font-size:15px;margin-bottom:12px">Contato</h3>
        ${tel ? `<p style="margin:0 0 6px"><a href="tel:+${tel}">${esc(d.telefone)}</a></p>` : ""}
        ${d.email ? `<p style="margin:0 0 6px"><a href="mailto:${esc(d.email)}">${esc(d.email)}</a></p>` : ""}
        ${ig ? `<p style="margin:0"><a href="${ig}" target="_blank" rel="noopener">Instagram</a></p>` : ""}
      </div>
      <div>
        ${d.endereco ? `<h3 style="color:#fff;font-size:15px;margin-bottom:12px">Onde estamos</h3><p style="color:#94a3b8;margin:0 0 6px">${esc(d.endereco)}</p>` : ""}
        ${d.horario ? `<p style="color:#94a3b8;margin:0">${esc(d.horario)}</p>` : ""}
      </div>
    </div>
    <div class="rodape-linha">\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${esc(d.empresa)}. Todos os direitos reservados.</div>
  </div>
</footer>`;
};
var fundoDeCapa = (d) => d.capa ? `background-image:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.65)),url('${d.capa}');background-size:cover;background-position:center` : `background-image:radial-gradient(circle at 15% 20%,${ajustarCor(d.corPrimaria, 40)} 0%,transparent 45%),radial-gradient(circle at 85% 75%,${d.corDestaque}55 0%,transparent 40%),linear-gradient(140deg,${d.corPrimaria},${ajustarCor(d.corPrimaria, -55)})`;
var temGaleria = (d) => Boolean(d.galeria && d.galeria.filter(Boolean).length);
var galeria = (d, classe = "galeria") => {
  const fotos2 = (d.galeria || []).filter(Boolean).slice(0, 4);
  if (!fotos2.length) return "";
  return `<div class="${classe}">${fotos2.map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} ${i + 1}" loading="lazy"></figure>`).join("")}</div>`;
};
var depoimentos = (d) => {
  const lista = (d.depoimentos || []).filter((x) => x.texto.trim());
  if (!lista.length) return "";
  return `<div class="depoimentos">${lista.slice(0, 3).map(
    (x) => `<blockquote>
      <p>${esc(x.texto)}</p>
      <cite>${esc(x.autor)}</cite>
    </blockquote>`
  ).join("")}</div>`;
};
var cssMidia = `
figure{margin:0;overflow:hidden;border-radius:16px;background:#e5e7eb}
figure img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .5s ease}
figure:hover img{transform:scale(1.04)}
.galeria{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.galeria figure{aspect-ratio:4/3}
.depoimentos{display:grid;gap:20px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.depoimentos blockquote{margin:0;background:#fff;border:1px solid var(--linha);border-radius:18px;
  padding:26px;position:relative;box-shadow:0 1px 2px rgba(16,24,40,.04)}
.depoimentos blockquote::before{content:'"';position:absolute;top:6px;left:18px;
  font-size:58px;line-height:1;color:var(--destaque);opacity:.35;font-family:Georgia,serif}
.depoimentos p{margin:0 0 14px;position:relative;color:var(--tinta-suave);font-style:italic}
.depoimentos cite{font-style:normal;font-weight:700;font-size:14px}
`;

// src/templates/sites/profissional.ts
var paraRgb = (hex) => {
  const limpo = (hex || "#000000").replace("#", "");
  const cheio = limpo.length === 3 ? limpo.split("").map((c) => c + c).join("") : limpo.padEnd(6, "0");
  const n = parseInt(cheio.slice(0, 6), 16);
  return Number.isNaN(n) ? [0, 0, 0] : [n >> 16 & 255, n >> 8 & 255, n & 255];
};
var luminancia = (hex) => {
  const [r, g, b] = paraRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
var razaoDeContraste = (a, b) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
var garantirContraste = (cor, fundo = "#ffffff", minimo = 4.5) => {
  if (razaoDeContraste(cor, fundo) >= minimo) return cor;
  const passo = luminancia(fundo) > 0.5 ? -8 : 8;
  let atual = cor;
  for (let i = 0; i < 40 && razaoDeContraste(atual, fundo) < minimo; i++) atual = ajustarCor(atual, passo);
  return atual;
};
var marcaLegivel = (hex) => {
  if (Math.max(razaoDeContraste(hex, "#ffffff"), razaoDeContraste(hex, "#111827")) >= 4.5) return hex;
  let atual = hex;
  for (let i = 0; i < 40 && razaoDeContraste(atual, "#ffffff") < 4.5; i++) atual = ajustarCor(atual, -6);
  return atual;
};
var letraSobre = (hex) => razaoDeContraste(hex, "#ffffff") >= razaoDeContraste(hex, "#111827") ? "#ffffff" : "#111827";
var escalaFluida = () => {
  const linhas = [];
  for (let n = -2; n <= 5; n++) {
    const min = 16 * Math.pow(1.2, n);
    const max = 18 * Math.pow(1.333, n);
    const inclinacao = (max - min) / (1500 - 320);
    const base = min - inclinacao * 320;
    const r = (v) => Math.round(v * 1e3) / 1e3;
    linhas.push(`--t${n < 0 ? "n" + -n : n}:clamp(${r(min / 16)}rem,${r(base / 16)}rem + ${r(inclinacao * 100)}vw,${r(max / 16)}rem)`);
  }
  return linhas.join(";");
};
var DIAS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
var ROTULO_DIA = ["Seg", "Ter", "Qua", "Qui", "Sex", "S\xE1b", "Dom"];
var semAcento = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
var indiceDoDia = (palavra) => {
  const p = semAcento(palavra);
  if (p.startsWith("seg")) return 0;
  if (p.startsWith("ter")) return 1;
  if (p.startsWith("qua")) return 2;
  if (p.startsWith("qui")) return 3;
  if (p.startsWith("sex")) return 4;
  if (p.startsWith("sab")) return 5;
  if (p.startsWith("dom")) return 6;
  return -1;
};
var hhmm = (h, m) => `${h.padStart(2, "0")}:${(m || "00").padStart(2, "0")}`;
var resumirSemana = (linhas) => {
  const por = [];
  for (const l of linhas) {
    const i = l.indexOf(":");
    if (i < 0) continue;
    const dia = indiceDoDia(l.slice(0, i));
    if (dia < 0) continue;
    const resto = l.slice(i + 1).trim();
    const horas = /fechado/i.test(resto) ? "fechado" : /24 horas/i.test(resto) ? "24 horas" : resto.replace(/\s*[–—-]\s*/g, "\u2013").replace(/\s+/g, " ");
    por[dia] = { dia, horas };
  }
  const grupos = [];
  for (let d = 0; d < 7; d++) {
    const x = por[d];
    if (!x) continue;
    const ult = grupos[grupos.length - 1];
    if (ult && ult.horas === x.horas && ult.ate === d - 1) ult.ate = d;
    else grupos.push({ de: d, ate: d, horas: x.horas });
  }
  return grupos.map((g) => `${ROTULO_DIA[g.de]}${g.ate > g.de ? (g.ate - g.de === 1 ? " e " : " a ") + ROTULO_DIA[g.ate] : ""} ${g.horas}`).join(" \xB7 ");
};
var lerHorario = (texto) => {
  const saida = [];
  const DIA = "seg(?:unda)?|ter(?:[\xE7c]a)?|qua(?:rta)?|qui(?:nta)?|sex(?:ta)?|s[a\xE1]b(?:ado)?|dom(?:ingo)?";
  const reDia = new RegExp(`(${DIA})(?:-feira)?`, "gi");
  const reHora = /(\d{1,2})(?:[:h](\d{2}))?\s*h?\s*(?:às|as|a|até|ate|-|–|—)\s*(\d{1,2})(?:[:h](\d{2}))?\s*h?/i;
  for (const parte of String(texto || "").split(/[;·|\n]+/)) {
    if (/fechado/i.test(parte)) continue;
    const h = parte.match(reHora);
    if (!h) continue;
    const abre = Number(h[1]), fecha = Number(h[3]);
    if (abre > 23 || fecha > 24) continue;
    const trechoDias = parte.slice(0, h.index);
    const achados = [...trechoDias.matchAll(reDia)].map((m) => ({ i: indiceDoDia(m[1]), pos: m.index ?? 0 }));
    if (!achados.length) continue;
    let dias = [];
    const ligacao = trechoDias.match(new RegExp(`(${DIA})(?:-feira)?\\s*(?:a|\xE0|at\xE9|ate|-|\u2013|\u2014)\\s*(${DIA})(?:-feira)?`, "i"));
    if (ligacao) {
      const [de, ate] = [indiceDoDia(ligacao[1]), indiceDoDia(ligacao[2])];
      for (let d = de; ; d = (d + 1) % 7) {
        dias.push(d);
        if (d === ate || dias.length > 7) break;
      }
    } else {
      dias = achados.map((a) => a.i);
    }
    dias = [...new Set(dias)].filter((d) => d >= 0);
    if (!dias.length) continue;
    saida.push({
      dayOfWeek: dias.map((d) => DIAS[d]),
      opens: hhmm(h[1], h[2]),
      closes: hhmm(String(fecha === 24 ? 23 : fecha), fecha === 24 ? "59" : h[4])
    });
  }
  return saida;
};
var ehUrl = (v) => !!v && /^https:\/\/[^\s"'<>\\]+$/.test(v);
var imagemPublica = (d) => [d.capa, d.fotoSobre, ...d.galeria || []].filter(ehUrl);
var ldSeguro = (obj) => JSON.stringify(obj).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
var jsonLd = (d, tipo = "LocalBusiness") => {
  const tel = digitos(d.telefone || d.whatsapp);
  const horarios = lerHorario(d.horario);
  const ig = d.instagram ? d.instagram.startsWith("http") ? d.instagram : `https://instagram.com/${d.instagram.replace(/^@/, "")}` : "";
  const imagens3 = imagemPublica(d);
  const dados = {
    "@context": "https://schema.org",
    "@type": tipo,
    name: d.empresa,
    ...d.slogan || d.sobre ? { description: (d.slogan || d.sobre).slice(0, 300) } : {},
    ...imagens3.length ? { image: imagens3 } : {},
    ...tel.length >= 10 ? { telephone: `+${tel.startsWith("55") ? tel : "55" + tel}` } : {},
    ...d.email ? { email: d.email } : {},
    ...d.endereco ? { address: { "@type": "PostalAddress", streetAddress: d.endereco, ...d.cidade ? { addressLocality: d.cidade } : {}, addressCountry: "BR" } } : {},
    ...horarios.length ? { openingHoursSpecification: horarios.map((h) => ({ "@type": "OpeningHoursSpecification", ...h })) } : {},
    // só com dado real: a nota vem do Google quando o site nasce de um lead
    ...d.nota && d.avaliacoes && d.avaliacoes > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: d.nota, reviewCount: d.avaliacoes, bestRating: 5 } } : {},
    ...ig ? { sameAs: [ig] } : {}
  };
  return `<script type="application/ld+json">${ldSeguro(dados)}</script>`;
};
var faviconSvg = (d) => {
  const letra = (d.empresa || "S").trim().charAt(0).toUpperCase() || "S";
  const fundo = d.corPrimaria || "#2563eb";
  const svg2 = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='${fundo}'/><text x='32' y='45' font-size='36' text-anchor='middle' font-family='Arial,sans-serif' font-weight='700' fill='${letraSobre(fundo)}'>${esc(letra)}</text></svg>`;
  return `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(svg2)}">`;
};
var cabecaSEO = (d, tipo = "LocalBusiness") => {
  const titulo2 = `${d.empresa}${d.categoria ? ` \u2014 ${d.categoria}` : ""}${d.cidade ? ` em ${d.cidade}` : ""}`.slice(0, 70);
  const descricao = esc((d.slogan && d.sobre ? `${d.slogan}. ${d.sobre}` : d.slogan || d.sobre || `${d.empresa}${d.cidade ? ` em ${d.cidade}` : ""}`).slice(0, 158));
  const imagem = imagemPublica(d)[0];
  return `<title>${esc(titulo2)}</title>
<meta name="description" content="${descricao}">
<meta name="robots" content="index,follow">
<meta name="theme-color" content="${esc(d.corPrimaria)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(d.empresa)}">
<meta property="og:title" content="${esc(titulo2)}">
<meta property="og:description" content="${descricao}">
${imagem ? `<meta property="og:image" content="${esc(imagem)}">` : ""}
<meta name="twitter:card" content="${imagem ? "summary_large_image" : "summary"}">
${faviconSvg(d)}
${jsonLd(d, tipo)}`;
};
var cssProfissional = () => `
:root{${escalaFluida()}}
.pular{position:absolute;left:-9999px;top:8px;z-index:200;background:#fff;color:#111827;padding:12px 18px;border-radius:10px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.pular:focus{left:12px}
:focus-visible{outline:3px solid var(--d);outline-offset:3px;border-radius:4px}
::selection{background:var(--p);color:var(--sobre-p)}
html{scroll-padding-top:84px;-webkit-text-size-adjust:100%}
h1,h2,h3{text-wrap:balance}
p,li,blockquote,figcaption{text-wrap:pretty}
.estrelas{color:#d97706}
main:focus{outline:none}
.acao-movel{display:none}
@media(max-width:760px){
  .acao-movel{position:fixed;left:0;right:0;bottom:0;z-index:70;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:10px;
    padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.96);backdrop-filter:blur(10px);
    border-top:1px solid rgba(15,23,42,.1)}
  .acao-movel a{display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;border-radius:12px;font-weight:700;font-size:16px;width:auto}
  .acao-movel svg{width:20px;height:20px}
  .acao-movel .am-zap{background:#0f7a43;color:#fff}
  .acao-movel .am-tel{background:#fff;color:var(--p-texto);border:1.5px solid var(--p)}
  body{padding-bottom:78px}
  .zap-fixo{display:none}
  /* a barra de baixo ja cobre o gesto; o botao do topo so tirava espaco do nome da empresa */
  .topo .btn{display:none}
}
@media print{.acao-movel,.zap-fixo,.pular{display:none}}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;
var barraAcaoMovel = (tel, zap, iconeTel, iconeZap) => {
  if (!tel && !zap) return "";
  return `<nav class="acao-movel" aria-label="Contato r\xE1pido">${tel ? `<a class="am-tel" href="${tel}">${iconeTel}Ligar</a>` : ""}${zap ? `<a class="am-zap" href="${zap}" target="_blank" rel="noopener">${iconeZap}WhatsApp</a>` : ""}</nav>`;
};
var envolverMain = (corpo) => {
  const fimCabecalho = corpo.indexOf("</header>");
  const inicioRodape = corpo.lastIndexOf("<footer");
  if (fimCabecalho < 0 || inicioRodape < 0 || fimCabecalho + 9 >= inicioRodape) return { html: corpo, temMain: false };
  const a = fimCabecalho + "</header>".length;
  return {
    html: `${corpo.slice(0, a)}<main id="conteudo" tabindex="-1">${corpo.slice(a, inicioRodape)}</main>${corpo.slice(inicioRodape)}`,
    temMain: true
  };
};
var prepararDados = (d) => {
  const linhas = String(d.horario || "").split(/\n|;(?=\s*(?:seg|ter|qua|qui|sex|s[aá]b|dom))/i).map((l) => l.trim()).filter(Boolean);
  const estiloGoogle = linhas.length > 0 && linhas.every((l) => /^(segunda|ter[çc]a|quarta|quinta|sexta|s[aá]bado|domingo)(-feira)?\s*:/i.test(l));
  return {
    ...d,
    horario: estiloGoogle ? resumirSemana(linhas) : String(d.horario || "").trim(),
    telefone: telefoneLegivel(d.telefone)
  };
};

// src/templates/sites/conteudo-nichos.ts
var P = (pergunta, resposta) => ({ pergunta, resposta });
var I = (titulo2, texto) => ({ titulo: titulo2, texto });
var S = (titulo2, descricao) => ({ titulo: titulo2, descricao });
var BANCO = [
  {
    id: "padaria",
    nome: "Padaria e confeitaria",
    chaves: ["padaria", "panificadora", "confeitaria", "doceria", "cafeteria", "bolo", "confeiteir", "doceir", "cafe "],
    schema: "Bakery",
    layout: "forno",
    paleta: { primaria: "#8a4b1f", destaque: "#e9a23b" },
    cta: { principal: "Fazer meu pedido", secundario: "Ver como chegar" },
    etiqueta: "Feito todos os dias",
    titulos: ["P\xE3o quente e doces feitos com carinho", "O sabor que {cidade} procura, todo dia", "Do forno para a sua mesa"],
    subtitulo: "P\xE3es, bolos e salgados frescos, para o caf\xE9 da manh\xE3, o lanche ou aquela encomenda especial.",
    sobre: "Uma padaria de bairro faz diferen\xE7a no dia: o cheiro de p\xE3o saindo do forno, o atendimento que lembra o seu nome e o produto fresquinho. Venha conhecer.",
    servicos: [
      S("P\xE3es frescos", "Variedades assadas ao longo do dia, para sair sempre quentinho."),
      S("Bolos e tortas", "Para o caf\xE9 da tarde, o anivers\xE1rio ou qualquer ocasi\xE3o que merece doce."),
      S("Salgados", "Assados e fritos na hora, \xF3timos para o lanche ou para a festa."),
      S("Encomendas", "Bolos decorados, cestas e kits para festas, combinados com anteced\xEAncia."),
      S("Caf\xE9 e lanches", "Um cantinho para o caf\xE9, o p\xE3o na chapa e o bate-papo."),
      S("Frios e mercearia", "Itens do dia a dia para completar a sua compra.")
    ],
    diferenciais: [I("Produ\xE7\xE3o pr\xF3pria", "Receitas feitas aqui, com ingredientes escolhidos com cuidado."), I("Sempre fresco", "Fornadas ao longo do dia para voc\xEA levar o melhor."), I("Encomenda sob medida", "Conte o que precisa e a gente combina o tamanho, o sabor e a data."), I("Perto de voc\xEA", "F\xE1cil de chegar e de pedir pelo WhatsApp.")],
    passos: [I("Escolha", "Veja o que temos hoje ou diga o que voc\xEA precisa."), I("Combine", "Para encomendas, fale com a gente pelo WhatsApp e acerte data e sabor."), I("Retire ou receba", "Passe aqui para buscar, ou combine a entrega.")],
    faq: [
      P("Voc\xEAs aceitam encomendas?", "Sim. Fale com a gente pelo WhatsApp com a data e o que precisa, e combinamos os detalhes."),
      P("Com quanta anteced\xEAncia devo encomendar?", "Depende do produto. Para bolos e festas, quanto antes melhor; confirme o prazo pelo WhatsApp."),
      P("Fazem entrega?", "Confirme pelo WhatsApp se a entrega est\xE1 dispon\xEDvel para o seu endere\xE7o."),
      P("Qual o hor\xE1rio de funcionamento?", "Est\xE1 logo abaixo, na se\xE7\xE3o de contato, e tamb\xE9m no Google."),
      P("Atendem pedidos para empresas e eventos?", "Atendemos. Chame no WhatsApp contando a quantidade e a data.")
    ],
    imagens: ["padaria p\xE3es", "bolo confeitaria", "bakery bread", "pastry cake"]
  },
  {
    id: "restaurante",
    nome: "Restaurante, pizzaria e lanchonete",
    chaves: ["restaurante", "pizzaria", "lanchonete", "hamburgueria", "bar ", "churrascaria", "cantina", "marmitaria", "japones", "sushi", "boteco", "pub", "choperia", "espetaria", "self service", "por quilo", "rotisseria"],
    schema: "Restaurant",
    layout: "mesa",
    paleta: { primaria: "#9b2c1a", destaque: "#f0a82b" },
    cta: { principal: "Pedir pelo WhatsApp", secundario: "Ver o card\xE1pio" },
    etiqueta: "Pe\xE7a sem complica\xE7\xE3o",
    titulos: ["Comida boa, do jeito que voc\xEA gosta", "O prato que resolve o seu dia", "Venha comer bem em {cidade}"],
    subtitulo: "Veja o card\xE1pio, escolha o que quer e pe\xE7a pelo WhatsApp, para comer aqui ou receber em casa.",
    sobre: "Boa comida \xE9 feita com tempero, capricho e atendimento que faz voc\xEA querer voltar. Aqui o prato chega bonito, no ponto e sem demora.",
    servicos: [
      S("Pratos do dia", "Op\xE7\xF5es que mudam ao longo da semana, sempre feitas na hora."),
      S("Card\xE1pio completo", "Do cl\xE1ssico ao especial, com op\xE7\xF5es para todos os gostos."),
      S("Para comer aqui", "Ambiente pensado para a sua refei\xE7\xE3o ser tranquila."),
      S("Para levar", "Pe\xE7a pelo WhatsApp e retire sem esperar."),
      S("Entrega", "Consulte a regi\xE3o atendida e o prazo pelo WhatsApp."),
      S("Eventos e grupos", "Mesas grandes e pedidos para confraterniza\xE7\xF5es, combinados com anteced\xEAncia.")
    ],
    diferenciais: [I("Feito na hora", "Pratos preparados quando voc\xEA pede, para chegar quentes."), I("Pe\xE7a em segundos", "Mande a mensagem pelo WhatsApp e a gente cuida do resto."), I("Para todos os gostos", "Op\xE7\xF5es para a fam\xEDlia, o casal, o grupo e o almo\xE7o r\xE1pido."), I("Atendimento pr\xF3ximo", "Gente de verdade responde o seu pedido.")],
    passos: [I("Escolha", "Veja o card\xE1pio e decida o que vai ser."), I("Pe\xE7a", "Mande a mensagem pelo WhatsApp com o seu pedido."), I("Aproveite", "Coma aqui, retire ou receba em casa.")],
    faq: [P("Como fa\xE7o um pedido?", "Pelo bot\xE3o de WhatsApp desta p\xE1gina. Basta dizer o que quer e se \xE9 para comer aqui, retirar ou entregar."), P("Voc\xEAs entregam?", "Confirme pelo WhatsApp se a entrega chega ao seu endere\xE7o e qual o prazo."), P("D\xE1 para reservar mesa?", "Chame no WhatsApp com o dia, o hor\xE1rio e o n\xFAmero de pessoas."), P("Quais as formas de pagamento?", "Pergunte pelo WhatsApp: as formas aceitas est\xE3o sempre atualizadas por l\xE1."), P("T\xEAm op\xE7\xF5es para quem tem restri\xE7\xE3o alimentar?", "Conte a sua necessidade pelo WhatsApp para indicarmos a melhor op\xE7\xE3o.")],
    imagens: ["restaurante comida", "prato refei\xE7\xE3o", "restaurant food", "pizza"]
  },
  {
    id: "saude-medica",
    nome: "Cl\xEDnica m\xE9dica e consult\xF3rio",
    chaves: ["clinica medica", "clinica geral", "clinica popular", "clinica de saude", "medic", "consultorio", "dermato", "pediatr", "ortoped", "cardio", "oftalmo", "ginecolog", "urolog", "endocrin", "neurolog", "psiquiatr", "otorrino", "geriatr", "laboratorio", "diagnostico"],
    schema: "MedicalClinic",
    layout: "clinica",
    paleta: { primaria: "#0f7c8a", destaque: "#2f9e6f" },
    cta: { principal: "Agendar consulta", secundario: "Como chegar" },
    etiqueta: "Atendimento com hora marcada",
    titulos: ["Cuidar da sua sa\xFAde come\xE7a aqui", "Aten\xE7\xE3o de verdade, com hora marcada", "Sua consulta sem complica\xE7\xE3o em {cidade}"],
    subtitulo: "Atendimento atencioso, explica\xE7\xE3o clara em cada etapa e agendamento f\xE1cil pelo WhatsApp.",
    sobre: "Cuidar de pessoas come\xE7a por ouvir. Aqui a consulta tem tempo, a explica\xE7\xE3o \xE9 clara e o atendimento acolhe desde a recep\xE7\xE3o.",
    servicos: [
      S("Consultas", "Avalia\xE7\xE3o completa, com tempo para ouvir voc\xEA e tirar as d\xFAvidas."),
      S("Exames", "Orienta\xE7\xE3o sobre os exames necess\xE1rios e acompanhamento dos resultados."),
      S("Check-up", "Acompanhamento preventivo para cuidar da sa\xFAde antes do problema."),
      S("Acompanhamento", "Retornos e seguimento do tratamento, com orienta\xE7\xE3o a cada etapa."),
      S("Atendimento para a fam\xEDlia", "Cuidado para diferentes idades, conforme a especialidade."),
      S("Orienta\xE7\xE3o e preven\xE7\xE3o", "Informa\xE7\xE3o clara para voc\xEA decidir com seguran\xE7a.")
    ],
    diferenciais: [I("Escuta atenta", "Voc\xEA \xE9 ouvido antes de qualquer conduta."), I("Explica\xE7\xE3o clara", "Cada etapa explicada sem termos dif\xEDceis."), I("Agendamento f\xE1cil", "Marque pelo WhatsApp, sem ficar preso ao telefone."), I("Ambiente acolhedor", "Um espa\xE7o pensado para o seu conforto.")],
    passos: [I("Agende", "Chame pelo WhatsApp e escolha o melhor dia e hor\xE1rio."), I("Seja atendido", "Venha no hor\xE1rio marcado e conte o que est\xE1 sentindo."), I("Acompanhe", "Receba a orienta\xE7\xE3o e combine os pr\xF3ximos passos.")],
    faq: [P("Como agendo uma consulta?", "Pelo bot\xE3o de WhatsApp desta p\xE1gina: escolha o dia e o hor\xE1rio que preferir."), P("Voc\xEAs atendem por conv\xEAnio?", "Confirme pelo WhatsApp quais conv\xEAnios s\xE3o aceitos e as condi\xE7\xF5es."), P("Preciso levar algum documento?", "Leve um documento com foto e, se tiver, exames e receitas anteriores."), P("Posso remarcar ou cancelar?", "Pode. Avise com anteced\xEAncia pelo WhatsApp para liberar o hor\xE1rio a outra pessoa."), P("Qual o endere\xE7o e o hor\xE1rio de atendimento?", "Est\xE3o na se\xE7\xE3o de contato logo abaixo, com o caminho no mapa.")],
    imagens: ["cl\xEDnica m\xE9dica consult\xF3rio", "m\xE9dico atendimento", "medical clinic doctor", "health care"]
  },
  {
    id: "odonto",
    nome: "Dentista e odontologia",
    chaves: ["odonto", "dentista", "ortodont", "implante dent", "endodont", "periodont"],
    schema: "Dentist",
    layout: "sorriso",
    paleta: { primaria: "#1e6fd9", destaque: "#18b8a4" },
    cta: { principal: "Agendar avalia\xE7\xE3o", secundario: "Como chegar" },
    etiqueta: "Sorrisos cuidados com aten\xE7\xE3o",
    titulos: ["Cuide do seu sorriso sem medo", "Um sorriso saud\xE1vel come\xE7a com uma boa avalia\xE7\xE3o", "Odontologia com aten\xE7\xE3o em {cidade}"],
    subtitulo: "Tratamentos explicados com calma, agendamento r\xE1pido pelo WhatsApp e um atendimento que respeita o seu tempo.",
    sobre: "Ir ao dentista pode ser tranquilo. Aqui voc\xEA entende cada etapa do tratamento, tira as d\xFAvidas e decide com seguran\xE7a.",
    servicos: [
      S("Avalia\xE7\xE3o e limpeza", "Preven\xE7\xE3o e cuidado de rotina para manter a sa\xFAde bucal em dia."),
      S("Restaura\xE7\xF5es", "Tratamento de c\xE1ries com aten\xE7\xE3o ao conforto."),
      S("Clareamento", "Op\xE7\xF5es para um sorriso mais claro, indicadas ap\xF3s avalia\xE7\xE3o."),
      S("Ortodontia", "Avalia\xE7\xE3o e acompanhamento do alinhamento dos dentes."),
      S("Implantes e pr\xF3teses", "Solu\xE7\xF5es para repor dentes, com planejamento individual."),
      S("Urg\xEAncia odontol\xF3gica", "Em caso de dor, chame pelo WhatsApp para orienta\xE7\xE3o.")
    ],
    diferenciais: [I("Sem pressa", "Tempo para explicar e tirar as d\xFAvidas antes do tratamento."), I("Plano claro", "Voc\xEA sabe o que ser\xE1 feito, em quais etapas."), I("Atendimento humano", "Cuidado com o conforto de quem tem receio."), I("Agendamento simples", "Escolha o hor\xE1rio pelo WhatsApp.")],
    passos: [I("Agende a avalia\xE7\xE3o", "Chame pelo WhatsApp e escolha o hor\xE1rio."), I("Receba o plano", "Explicamos o que precisa ser feito e as op\xE7\xF5es."), I("Inicie o tratamento", "Com calma, no seu ritmo e com acompanhamento.")],
    faq: [P("A primeira consulta d\xF3i?", "A avalia\xE7\xE3o \xE9 tranquila. Se tiver receio, conte na hora: o atendimento \xE9 adaptado ao seu conforto."), P("Voc\xEAs atendem conv\xEAnio?", "Confirme pelo WhatsApp os conv\xEAnios aceitos e as condi\xE7\xF5es."), P("Posso parcelar o tratamento?", "Consulte as formas de pagamento dispon\xEDveis pelo WhatsApp."), P("Atendem urg\xEAncia?", "Em caso de dor, chame pelo WhatsApp para orienta\xE7\xE3o sobre o melhor hor\xE1rio."), P("Atendem crian\xE7as?", "Confirme pelo WhatsApp a faixa et\xE1ria atendida.")],
    imagens: ["dentista sorriso", "consult\xF3rio odontol\xF3gico", "dentist smile", "dental clinic"]
  },
  {
    id: "psicologia",
    nome: "Psicologia e terapias",
    chaves: ["psicolog", "terapeut", "psicanal", "neuropsic", "psicopedag", "fonoaudi", "terapia"],
    schema: "MedicalBusiness",
    layout: "natural",
    paleta: { primaria: "#5b7fa6", destaque: "#c58b6b" },
    cta: { principal: "Marcar uma conversa", secundario: "Saiba mais" },
    etiqueta: "Atendimento com sigilo e acolhimento",
    titulos: ["Um espa\xE7o seguro para cuidar de voc\xEA", "Conversar pode ser o primeiro passo", "Acolhimento e escuta em {cidade}"],
    subtitulo: "Atendimento com sigilo, respeito ao seu tempo e agendamento discreto pelo WhatsApp.",
    sobre: "Procurar ajuda \xE9 um ato de cuidado. Aqui voc\xEA encontra escuta, respeito e um ambiente seguro para falar do que importa.",
    servicos: [
      S("Atendimento individual", "Sess\xF5es para voc\xEA, no seu ritmo, com acolhimento e sigilo."),
      S("Atendimento online", "Sess\xF5es por v\xEDdeo, para quem prefere conforto ou mora longe."),
      S("Orienta\xE7\xE3o de pais", "Apoio para fam\xEDlias que buscam entender e acompanhar os filhos."),
      S("Acompanhamento cont\xEDnuo", "Processo com regularidade e metas combinadas.")
    ],
    diferenciais: [I("Sigilo", "O que \xE9 dito na sess\xE3o fica na sess\xE3o."), I("Sem julgamentos", "Escuta respeitosa, no seu tempo."), I("Flexibilidade", "Presencial ou online, conforme a sua rotina."), I("Primeiro contato leve", "Uma conversa inicial para entender se faz sentido.")],
    passos: [I("Entre em contato", "Mande uma mensagem, sem compromisso."), I("Converse", "Uma primeira conversa para entender sua necessidade."), I("Comece no seu ritmo", "Combinamos dia, hor\xE1rio e formato.")],
    faq: [P("Como funciona a primeira sess\xE3o?", "\xC9 uma conversa para nos conhecermos e entender o que voc\xEA busca. Sem pressa e sem julgamento."), P("As sess\xF5es s\xE3o sigilosas?", "Sim. O sigilo \xE9 parte essencial do trabalho."), P("Atendem online?", "Confirme pelo WhatsApp a disponibilidade de sess\xF5es por v\xEDdeo."), P("Qual a dura\xE7\xE3o e a frequ\xEAncia?", "Combinamos na primeira conversa, conforme a sua necessidade."), P("Como agendar?", "Pelo bot\xE3o de WhatsApp: escolhemos o melhor hor\xE1rio para voc\xEA.")],
    imagens: ["psicologia acolhimento", "consult\xF3rio terapia", "therapy counseling", "calm room"]
  },
  {
    id: "estetica",
    nome: "Est\xE9tica, sal\xE3o e barbearia",
    chaves: ["estetic", "salao", "barbearia", "barbeiro", "manicure", "cabeleir", "beleza", "sobrancelha", "depila", "spa", "massag", "cilios", "unhas", "maquiador", "micropigment", "podolog"],
    schema: "BeautySalon",
    layout: "ritual",
    paleta: { primaria: "#8a3f5d", destaque: "#d9a35b" },
    cta: { principal: "Agendar hor\xE1rio", secundario: "Ver servi\xE7os" },
    etiqueta: "Hor\xE1rio marcado, sem espera",
    titulos: ["Realce o que voc\xEA tem de melhor", "Beleza e cuidado, no seu hor\xE1rio", "Seu momento de cuidado em {cidade}"],
    subtitulo: "Servi\xE7os feitos com aten\xE7\xE3o ao detalhe e agendamento f\xE1cil pelo WhatsApp.",
    sobre: "Sair daqui se sentindo bem \xE9 o que importa. Cuidamos de cada detalhe, do atendimento ao resultado.",
    servicos: [
      S("Cabelo", "Corte, colora\xE7\xE3o e tratamentos para cada tipo de fio."),
      S("Unhas", "Manicure e pedicure com cuidado e higiene."),
      S("Sobrancelhas e c\xEDlios", "Design e cuidado que valorizam o olhar."),
      S("Est\xE9tica facial e corporal", "Procedimentos indicados ap\xF3s avalia\xE7\xE3o."),
      S("Barba e acabamento", "Para quem gosta de estar sempre em dia."),
      S("Pacotes e noivas", "Combine uma experi\xEAncia completa para o seu dia especial.")
    ],
    diferenciais: [I("Hora marcada", "Voc\xEA \xE9 atendida no hor\xE1rio combinado."), I("Higiene e cuidado", "Materiais preparados com aten\xE7\xE3o."), I("Aten\xE7\xE3o ao detalhe", "O resultado \xE9 pensado para voc\xEA."), I("Atendimento pr\xF3ximo", "A gente lembra do que voc\xEA gosta.")],
    passos: [I("Escolha o servi\xE7o", "Veja as op\xE7\xF5es abaixo ou tire d\xFAvidas pelo WhatsApp."), I("Agende", "Combine o melhor dia e hor\xE1rio."), I("Aproveite", "Venha relaxar e sair se sentindo bem.")],
    faq: [P("Como agendo?", "Pelo WhatsApp: informe o servi\xE7o e o melhor dia e hor\xE1rio."), P("Preciso confirmar o hor\xE1rio?", "Confirmamos pelo WhatsApp um pouco antes do atendimento."), P("Voc\xEAs atendem noivas e eventos?", "Chame no WhatsApp para combinar data e servi\xE7os."), P("Quais as formas de pagamento?", "Consulte pelo WhatsApp as formas aceitas."), P("Posso remarcar?", "Pode. Avise com anteced\xEAncia pelo WhatsApp.")],
    imagens: ["sal\xE3o de beleza", "barbearia", "beauty salon", "barber shop"]
  },
  {
    id: "academia",
    nome: "Academia e treino",
    chaves: ["academia", "pilates", "crossfit", "personal", "fitness", "muscula", "yoga", "danca", "natacao", "treino", "jiu", "boxe", "muay", "karate", "judo", "capoeira", "funcional"],
    schema: "HealthClub",
    layout: "impacto",
    paleta: { primaria: "#e0451f", destaque: "#facc15" },
    cta: { principal: "Quero uma aula experimental", secundario: "Ver modalidades" },
    etiqueta: "Comece hoje",
    titulos: ["Treine com orienta\xE7\xE3o e resultado", "O primeiro passo \xE9 o mais importante", "Sua melhor vers\xE3o come\xE7a em {cidade}"],
    subtitulo: "Treino com acompanhamento, ambiente motivador e hor\xE1rios que cabem na sua rotina.",
    sobre: "Treinar \xE9 mais f\xE1cil com orienta\xE7\xE3o e um ambiente que motiva. Aqui voc\xEA \xE9 acompanhado e evolui no seu ritmo.",
    servicos: [
      S("Muscula\xE7\xE3o", "Treino orientado, com acompanhamento dos professores."),
      S("Aulas coletivas", "Variedade de modalidades para treinar em grupo."),
      S("Treino personalizado", "Plano pensado para o seu objetivo e a sua rotina."),
      S("Avalia\xE7\xE3o f\xEDsica", "Ponto de partida para acompanhar a sua evolu\xE7\xE3o."),
      S("Planos flex\xEDveis", "Consulte as op\xE7\xF5es pelo WhatsApp."),
      S("Aula experimental", "Conhe\xE7a o espa\xE7o e as aulas antes de decidir.")
    ],
    diferenciais: [I("Orienta\xE7\xE3o de verdade", "Equipe que acompanha o seu treino."), I("Ambiente motivador", "Espa\xE7o pensado para voc\xEA querer voltar."), I("Hor\xE1rios variados", "Op\xE7\xF5es para manh\xE3, tarde e noite."), I("Comece sem compromisso", "Conhe\xE7a com uma aula experimental.")],
    passos: [I("Conhe\xE7a", "Pe\xE7a sua aula experimental pelo WhatsApp."), I("Escolha seu plano", "Veja a modalidade e o hor\xE1rio ideais."), I("Treine", "Comece com acompanhamento desde o primeiro dia.")],
    faq: [P("Posso fazer uma aula experimental?", "Consulte pelo WhatsApp a disponibilidade e os hor\xE1rios."), P("Preciso ter experi\xEAncia?", "N\xE3o. Atendemos iniciantes e quem j\xE1 treina, com orienta\xE7\xE3o."), P("Quais os planos e valores?", "Chame no WhatsApp para receber as op\xE7\xF5es atualizadas."), P("Voc\xEAs t\xEAm avalia\xE7\xE3o f\xEDsica?", "Confirme pelo WhatsApp a disponibilidade e como funciona."), P("Quais os hor\xE1rios?", "Est\xE3o na se\xE7\xE3o de contato e podem ser confirmados pelo WhatsApp.")],
    imagens: ["academia treino", "muscula\xE7\xE3o", "gym workout", "fitness class"]
  },
  {
    id: "advocacia",
    nome: "Advocacia",
    chaves: ["advoca", "advogad", "juridic", "direito"],
    schema: "LegalService",
    layout: "classico",
    paleta: { primaria: "#1b2a4a", destaque: "#b08d57" },
    cta: { principal: "Falar com um advogado", secundario: "\xC1reas de atua\xE7\xE3o" },
    etiqueta: "Atendimento sigiloso",
    titulos: ["Orienta\xE7\xE3o jur\xEDdica clara, com respeito ao seu caso", "Seus direitos explicados sem complica\xE7\xE3o", "Advocacia atenta em {cidade}"],
    subtitulo: "Atendimento individual, linguagem simples e um primeiro contato para entender o seu caso.",
    sobre: "Cada caso tem a sua hist\xF3ria. Aqui o atendimento \xE9 pr\xF3ximo, a explica\xE7\xE3o \xE9 clara e a atua\xE7\xE3o segue a \xE9tica da profiss\xE3o.",
    servicos: [
      S("Direito de fam\xEDlia", "Orienta\xE7\xE3o em div\xF3rcio, guarda, pens\xE3o e partilha."),
      S("Direito do trabalho", "An\xE1lise de direitos e acompanhamento de demandas trabalhistas."),
      S("Direito previdenci\xE1rio", "Orienta\xE7\xE3o sobre benef\xEDcios e aposentadoria."),
      S("Direito civil e do consumidor", "Contratos, cobran\xE7as e problemas com produtos e servi\xE7os."),
      S("Direito imobili\xE1rio", "Compra, venda, loca\xE7\xE3o e regulariza\xE7\xE3o de im\xF3veis."),
      S("Consultoria preventiva", "An\xE1lise de documentos e contratos antes do problema.")
    ],
    diferenciais: [I("Sigilo profissional", "Seu caso \xE9 tratado com total discri\xE7\xE3o."), I("Linguagem simples", "Voc\xEA entende o que est\xE1 acontecendo."), I("Atendimento pr\xF3ximo", "Contato direto para tirar d\xFAvidas."), I("An\xE1lise individual", "Cada caso recebe estrat\xE9gia pr\xF3pria.")],
    passos: [I("Entre em contato", "Conte o seu caso pelo WhatsApp."), I("An\xE1lise inicial", "Avaliamos a situa\xE7\xE3o e explicamos as possibilidades."), I("Acompanhamento", "Voc\xEA \xE9 informado a cada etapa do processo.")],
    faq: [P("Como funciona o primeiro contato?", "Voc\xEA conta o seu caso pelo WhatsApp e combinamos uma conversa para avaliar a situa\xE7\xE3o."), P("Atendem online?", "Confirme pelo WhatsApp as op\xE7\xF5es de atendimento remoto."), P("Quais documentos devo reunir?", "Depende do caso. Informamos a lista no primeiro contato."), P("O atendimento \xE9 sigiloso?", "Sim. O sigilo profissional \xE9 um dever da advocacia."), P("Quanto tempo leva?", "Varia conforme o caso e o andamento da Justi\xE7a. Explicamos na an\xE1lise inicial.")],
    imagens: ["advocacia escrit\xF3rio", "balan\xE7a justi\xE7a", "law office", "lawyer meeting"]
  },
  {
    id: "contabilidade",
    nome: "Contabilidade",
    chaves: ["contab", "contad", "fiscal", "bpo", "abertura de empresa"],
    schema: "AccountingService",
    layout: "classico",
    paleta: { primaria: "#0f4c5c", destaque: "#e08e45" },
    cta: { principal: "Pedir um or\xE7amento", secundario: "Nossos servi\xE7os" },
    etiqueta: "Contabilidade sem dor de cabe\xE7a",
    titulos: ["Contabilidade que cuida do seu neg\xF3cio", "Menos burocracia, mais tempo para vender", "Seu contador de confian\xE7a em {cidade}"],
    subtitulo: "Abertura de empresa, impostos e obriga\xE7\xF5es em dia, com atendimento que explica em linguagem simples.",
    sobre: "Quem empreende precisa de tranquilidade com os n\xFAmeros. Cuidamos da parte fiscal para voc\xEA cuidar do neg\xF3cio.",
    servicos: [
      S("Abertura de empresa", "Orienta\xE7\xE3o e registro, do tipo de empresa ao CNPJ."),
      S("Contabilidade mensal", "Escritura\xE7\xE3o, impostos e obriga\xE7\xF5es em dia."),
      S("MEI e pequenas empresas", "Acompanhamento adequado ao porte do seu neg\xF3cio."),
      S("Folha de pagamento", "Rotinas de funcion\xE1rios e encargos."),
      S("Planejamento tribut\xE1rio", "An\xE1lise para escolher o melhor enquadramento."),
      S("Regulariza\xE7\xE3o", "Ajuda para colocar pend\xEAncias em ordem.")
    ],
    diferenciais: [I("Prazos em dia", "Obriga\xE7\xF5es acompanhadas para evitar multas."), I("Linguagem simples", "Voc\xEA entende o que paga e por qu\xEA."), I("Atendimento direto", "D\xFAvidas resolvidas pelo WhatsApp."), I("Vis\xE3o do seu neg\xF3cio", "Orienta\xE7\xE3o al\xE9m da guia de imposto.")],
    passos: [I("Conversa inicial", "Entendemos o seu neg\xF3cio e o que voc\xEA precisa."), I("Proposta", "Voc\xEA recebe as condi\xE7\xF5es, sem surpresa."), I("Contabilidade em dia", "Cuidamos das rotinas e avisamos o que importa.")],
    faq: [P("Atendem MEI?", "Confirme pelo WhatsApp as condi\xE7\xF5es para o seu caso."), P("Como funciona a abertura de empresa?", "Entendemos a sua atividade, indicamos o enquadramento e cuidamos do registro."), P("Posso trocar de contador?", "Pode. Cuidamos da transi\xE7\xE3o para n\xE3o haver pend\xEAncias."), P("Como recebo meus documentos e guias?", "Combinamos o melhor formato na contrata\xE7\xE3o."), P("Como pe\xE7o um or\xE7amento?", "Pelo WhatsApp, contando o tipo e o porte do seu neg\xF3cio.")],
    imagens: ["contabilidade escrit\xF3rio", "calculadora documentos", "accounting office", "business papers"]
  },
  {
    id: "imobiliaria",
    nome: "Imobili\xE1ria e corretor",
    chaves: ["imobiliaria", "corretor", "imoveis", "imovel", "incorporadora", "loteamento", "construtora"],
    schema: "RealEstateAgent",
    layout: "escritorio",
    paleta: { primaria: "#13405b", destaque: "#d6a03c" },
    cta: { principal: "Falar com um corretor", secundario: "Ver im\xF3veis" },
    etiqueta: "Atendimento personalizado",
    titulos: ["Encontre o im\xF3vel certo em {cidade}", "Comprar, vender ou alugar com seguran\xE7a", "Seu pr\xF3ximo endere\xE7o come\xE7a aqui"],
    subtitulo: "Atendimento pr\xF3ximo, orienta\xE7\xE3o em cada etapa e agilidade para voc\xEA decidir com seguran\xE7a.",
    sobre: "Negociar um im\xF3vel \xE9 uma decis\xE3o importante. Aqui voc\xEA tem acompanhamento do in\xEDcio \xE0 entrega das chaves.",
    servicos: [
      S("Venda de im\xF3veis", "Avalia\xE7\xE3o, divulga\xE7\xE3o e acompanhamento da negocia\xE7\xE3o."),
      S("Compra", "Busca orientada pelo seu perfil e or\xE7amento."),
      S("Loca\xE7\xE3o", "Intermedia\xE7\xE3o segura entre propriet\xE1rio e inquilino."),
      S("Avalia\xE7\xE3o", "Estimativa de valor com base no mercado da regi\xE3o."),
      S("Documenta\xE7\xE3o", "Orienta\xE7\xE3o sobre a papelada de cada etapa."),
      S("Administra\xE7\xE3o de im\xF3veis", "Cuidado com o im\xF3vel enquanto voc\xEA cuida da vida.")
    ],
    diferenciais: [I("Acompanhamento completo", "Do primeiro contato \xE0 entrega das chaves."), I("Conhecimento da regi\xE3o", "Orienta\xE7\xE3o sobre bairros e valores."), I("Transpar\xEAncia", "Voc\xEA sabe cada passo e custo da negocia\xE7\xE3o."), I("Agilidade", "Respostas r\xE1pidas pelo WhatsApp.")],
    passos: [I("Conte o que procura", "Perfil, regi\xE3o e or\xE7amento."), I("Veja as op\xE7\xF5es", "Apresentamos im\xF3veis que combinam com voc\xEA."), I("Feche com seguran\xE7a", "Cuidamos da negocia\xE7\xE3o e da documenta\xE7\xE3o.")],
    faq: [P("Como avalio o meu im\xF3vel para vender?", "Chame pelo WhatsApp para combinar uma avalia\xE7\xE3o."), P("Voc\xEAs ajudam com financiamento?", "Orientamos o caminho. Confirme as condi\xE7\xF5es no primeiro contato."), P("Quais documentos preciso para alugar ou vender?", "Depende do caso. Enviamos a lista no atendimento."), P("Atendem em quais regi\xF5es?", "Consulte pelo WhatsApp as regi\xF5es atendidas."), P("Posso marcar uma visita?", "Pode. Combine o melhor dia e hor\xE1rio pelo WhatsApp.")],
    imagens: ["im\xF3vel casa", "apartamento moderno", "real estate house", "modern home"]
  },
  {
    id: "oficina",
    nome: "Oficina mec\xE2nica e auto center",
    chaves: ["oficina", "mecanic", "auto center", "autocenter", "funilaria", "lava jato", "lavajato", "borracharia", "pneus", "auto pecas", "autopecas", "estetica automotiva", "auto eletric", "martelinho", "retifica", "alinhamento", "insulfilm", "som automotivo"],
    schema: "AutoRepair",
    layout: "oficina",
    paleta: { primaria: "#c2410c", destaque: "#facc15" },
    cta: { principal: "Pedir or\xE7amento", secundario: "Como chegar" },
    etiqueta: "Or\xE7amento sem compromisso",
    titulos: ["Seu carro em boas m\xE3os, sem susto na conta", "Conserto honesto, or\xE7amento claro", "A oficina de confian\xE7a em {cidade}"],
    subtitulo: "Diagn\xF3stico explicado, or\xE7amento antes do servi\xE7o e acompanhamento pelo WhatsApp.",
    sobre: "Confian\xE7a \xE9 tudo em uma oficina. Aqui voc\xEA sabe o que o carro tem, o que ser\xE1 feito e quanto vai custar antes de come\xE7ar.",
    servicos: [
      S("Mec\xE2nica geral", "Revis\xE3o, freios, suspens\xE3o e motor, com diagn\xF3stico claro."),
      S("Troca de \xF3leo e filtros", "Manuten\xE7\xE3o preventiva para evitar problemas."),
      S("El\xE9trica e inje\xE7\xE3o", "Diagn\xF3stico de falhas e reparo."),
      S("Freios e suspens\xE3o", "Seguran\xE7a em primeiro lugar."),
      S("Alinhamento e balanceamento", "Mais conforto e durabilidade dos pneus."),
      S("Ar-condicionado", "Manuten\xE7\xE3o e higieniza\xE7\xE3o.")
    ],
    diferenciais: [I("Or\xE7amento antes", "Voc\xEA aprova antes de qualquer servi\xE7o."), I("Explica\xE7\xE3o clara", "Mostramos o que foi encontrado."), I("Acompanhe pelo WhatsApp", "Atualiza\xE7\xF5es do servi\xE7o sem ligar."), I("Pe\xE7as com proced\xEAncia", "Informamos as op\xE7\xF5es dispon\xEDveis.")],
    passos: [I("Conte o problema", "Por WhatsApp ou aqui na oficina."), I("Receba o or\xE7amento", "Com o que ser\xE1 feito e o valor."), I("Retire o carro", "Pronto, testado e explicado.")],
    faq: [P("Voc\xEAs fazem or\xE7amento?", "Sim. Chame no WhatsApp ou traga o ve\xEDculo para avalia\xE7\xE3o."), P("Quanto tempo leva o servi\xE7o?", "Depende do reparo. Informamos o prazo junto com o or\xE7amento."), P("D\xE3o garantia do servi\xE7o?", "Pergunte pelo WhatsApp: informamos as condi\xE7\xF5es de cada servi\xE7o."), P("Aceitam cart\xE3o?", "Consulte as formas de pagamento pelo WhatsApp."), P("Posso acompanhar o conserto?", "Pode. Combinamos a melhor forma de voc\xEA acompanhar.")],
    imagens: ["oficina mec\xE2nica", "mec\xE2nico carro", "car repair", "auto mechanic"]
  },
  {
    id: "pet",
    nome: "Pet shop e veterin\xE1ria",
    chaves: ["pet", "veterin", "banho e tosa", "agropet", "racao", "adestr"],
    schema: "PetStore",
    layout: "patinhas",
    paleta: { primaria: "#2a7de1", destaque: "#f5a524" },
    cta: { principal: "Agendar banho ou consulta", secundario: "Ver servi\xE7os" },
    etiqueta: "Cuidado de quem ama pets",
    titulos: ["Quem ama pet cuida com a gente", "Banho, sa\xFAde e carinho para o seu melhor amigo", "O cantinho do seu pet em {cidade}"],
    subtitulo: "Banho e tosa, consultas e tudo para o seu pet, com agendamento f\xE1cil pelo WhatsApp.",
    sobre: "Pet \xE9 da fam\xEDlia. Cuidamos dele com paci\xEAncia, higiene e aten\xE7\xE3o, para voc\xEA deixar com tranquilidade.",
    servicos: [
      S("Banho e tosa", "Com carinho e cuidado com o bem-estar do animal."),
      S("Consultas veterin\xE1rias", "Avalia\xE7\xE3o e acompanhamento da sa\xFAde do seu pet."),
      S("Vacinas", "Orienta\xE7\xE3o sobre o calend\xE1rio de vacina\xE7\xE3o."),
      S("Ra\xE7\xE3o e acess\xF3rios", "Produtos para a rotina do seu pet."),
      S("Hospedagem e creche", "Confirme a disponibilidade pelo WhatsApp."),
      S("Leva e traz", "Consulte a regi\xE3o atendida.")
    ],
    diferenciais: [I("Aten\xE7\xE3o ao bem-estar", "Cada pet \xE9 tratado com paci\xEAncia."), I("Higiene", "Cuidado com o ambiente e os materiais."), I("Agendamento f\xE1cil", "Marque pelo WhatsApp."), I("Orienta\xE7\xE3o ao tutor", "Dicas para o dia a dia do seu pet.")],
    passos: [I("Agende", "Escolha o servi\xE7o e o hor\xE1rio pelo WhatsApp."), I("Deixe com a gente", "Cuidamos do seu pet com aten\xE7\xE3o."), I("Busque feliz", "Avisamos quando estiver pronto.")],
    faq: [P("Como agendo o banho?", "Pelo WhatsApp: informe o porte e a ra\xE7a do pet e o melhor hor\xE1rio."), P("Atendem gatos?", "Confirme pelo WhatsApp os servi\xE7os dispon\xEDveis para cada esp\xE9cie."), P("T\xEAm veterin\xE1rio?", "Consulte a disponibilidade de consultas pelo WhatsApp."), P("Fazem leva e traz?", "Consulte a regi\xE3o atendida pelo WhatsApp."), P("Preciso levar a carteirinha de vacina?", "Para alguns servi\xE7os, sim. Confirme pelo WhatsApp.")],
    imagens: ["pet shop cachorro", "banho e tosa", "dog grooming", "puppy"]
  },
  {
    id: "loja-moda",
    nome: "Loja de roupas e acess\xF3rios",
    chaves: ["roupa", "moda", "boutique", "vestuario", "calcado", "sapato", "acessorio", "lingerie", "jeans", "bolsa", "brecho", "semijoia", "joalheria", "otica"],
    schema: "ClothingStore",
    layout: "estudio",
    paleta: { primaria: "#1f1f1f", destaque: "#c9a227" },
    cta: { principal: "Ver novidades no WhatsApp", secundario: "Como chegar" },
    etiqueta: "Novidades toda semana",
    titulos: ["Estilo que combina com voc\xEA", "Pe\xE7as escolhidas com cuidado", "A sua loja de moda em {cidade}"],
    subtitulo: "Veja as novidades, tire d\xFAvidas de tamanho e pe\xE7a pelo WhatsApp, para retirar ou receber.",
    sobre: "Vestir bem \xE9 se sentir bem. Selecionamos pe\xE7as com qualidade e atendemos com aten\xE7\xE3o, sem pressa.",
    servicos: [
      S("Cole\xE7\xE3o atual", "Pe\xE7as da esta\xE7\xE3o, selecionadas para o seu estilo."),
      S("Atendimento personalizado", "Ajudamos a combinar pe\xE7as e encontrar o tamanho certo."),
      S("Acess\xF3rios", "Detalhes que completam o look."),
      S("Presentes", "Sugest\xF5es e embrulho para presentear."),
      S("Compra pelo WhatsApp", "Receba fotos e detalhes das pe\xE7as sem sair de casa."),
      S("Trocas", "Consulte a pol\xEDtica pelo WhatsApp.")
    ],
    diferenciais: [I("Sele\xE7\xE3o curada", "Pe\xE7as escolhidas com cuidado."), I("Atendimento pr\xF3ximo", "Ajuda real para escolher."), I("Compre pelo WhatsApp", "Praticidade para quem n\xE3o pode passar na loja."), I("Novidades constantes", "Siga para ver o que chegou.")],
    passos: [I("Escolha", "Veja as novidades ou pe\xE7a sugest\xF5es."), I("Combine", "Tamanho, cor e forma de pagamento pelo WhatsApp."), I("Receba ou retire", "Passe na loja ou combine a entrega.")],
    faq: [P("Como compro pelo WhatsApp?", "Mande uma mensagem com a pe\xE7a que quer ver. Enviamos fotos, tamanhos e valores."), P("T\xEAm provador?", "Sim, na loja. Se preferir, separamos pe\xE7as para voc\xEA experimentar."), P("Fazem trocas?", "Consulte a pol\xEDtica pelo WhatsApp."), P("Entregam?", "Confirme a regi\xE3o e o prazo pelo WhatsApp."), P("Aceitam cart\xE3o?", "Consulte as formas de pagamento aceitas.")],
    imagens: ["loja de roupas", "moda feminina", "fashion store", "clothing"]
  },
  {
    id: "construcao",
    nome: "Constru\xE7\xE3o, reforma e arquitetura",
    chaves: ["construc", "reforma", "marcenaria", "arquitet", "engenhar", "pintura", "gesso", "moveis planejados", "serralheria", "vidracaria", "pedreiro", "empreiteira", "paisagismo", "piscina", "material de construcao", "marmoraria", "energia solar", "decoracao", "interiores"],
    schema: "HomeAndConstructionBusiness",
    layout: "planta",
    paleta: { primaria: "#374151", destaque: "#f59e0b" },
    cta: { principal: "Pedir or\xE7amento", secundario: "Ver servi\xE7os" },
    etiqueta: "Projeto e obra com acompanhamento",
    titulos: ["Sua obra entregue com capricho e transpar\xEAncia", "Do projeto \xE0 \xFAltima pincelada", "Reformas e projetos em {cidade}"],
    subtitulo: "Or\xE7amento claro, cronograma combinado e acompanhamento do in\xEDcio ao fim.",
    sobre: "Obra boa tem planejamento, comunica\xE7\xE3o e acabamento cuidadoso. Voc\xEA sabe o que ser\xE1 feito e acompanha cada etapa.",
    servicos: [
      S("Reformas", "Do pequeno reparo \xE0 reforma completa."),
      S("Projetos", "Planejamento para aproveitar melhor cada espa\xE7o."),
      S("Acabamento", "Pintura, revestimentos e detalhes que fazem diferen\xE7a."),
      S("Instala\xE7\xF5es", "El\xE9trica e hidr\xE1ulica com seguran\xE7a."),
      S("Marcenaria sob medida", "Solu\xE7\xF5es feitas para o seu espa\xE7o."),
      S("Acompanhamento de obra", "Visitas e relat\xF3rios para voc\xEA acompanhar.")
    ],
    diferenciais: [I("Or\xE7amento detalhado", "Voc\xEA sabe o que est\xE1 inclu\xEDdo."), I("Cronograma combinado", "Etapas e prazos definidos antes de come\xE7ar."), I("Comunica\xE7\xE3o direta", "Atualiza\xE7\xF5es pelo WhatsApp."), I("Cuidado com a limpeza", "Obra organizada do come\xE7o ao fim.")],
    passos: [I("Visita e conversa", "Entendemos o que voc\xEA quer e conhecemos o local."), I("Or\xE7amento", "Proposta clara, com escopo e prazo."), I("Execu\xE7\xE3o", "Obra acompanhada at\xE9 a entrega.")],
    faq: [P("Voc\xEAs fazem visita t\xE9cnica?", "Combine pelo WhatsApp o melhor dia para visitarmos o local."), P("Como \xE9 feito o or\xE7amento?", "Ap\xF3s a visita, enviamos uma proposta com escopo, prazo e valor."), P("Quanto tempo leva uma reforma?", "Depende do tamanho. O prazo \xE9 combinado no or\xE7amento."), P("Voc\xEAs cuidam da compra dos materiais?", "Combinamos as op\xE7\xF5es na proposta: por conta do cliente ou intermediada."), P("Podem ver exemplos de trabalhos anteriores?", "Pode. Pe\xE7a pelo WhatsApp que enviamos o que for adequado.")],
    imagens: ["obra reforma", "constru\xE7\xE3o civil", "home renovation", "architecture"]
  },
  {
    id: "servicos-residenciais",
    nome: "Servi\xE7os residenciais",
    chaves: ["eletricist", "encanador", "dedetiz", "limpeza", "ar condicionado", "chaveiro", "desentup", "diarista", "jardinagem", "impermeabiliza", "mudanca", "frete", "lavanderia", "costureir", "assistencia tecnica", "manutencao"],
    schema: "HomeAndConstructionBusiness",
    layout: "oficina",
    paleta: { primaria: "#1d4ed8", destaque: "#f97316" },
    cta: { principal: "Chamar agora", secundario: "Ver servi\xE7os" },
    etiqueta: "Atendimento r\xE1pido",
    titulos: ["Problema em casa? Resolvemos r\xE1pido", "Servi\xE7o bem feito, com hora combinada", "Atendimento \xE1gil em {cidade}"],
    subtitulo: "Chame pelo WhatsApp, combine o hor\xE1rio e receba o atendimento com or\xE7amento antes do servi\xE7o.",
    sobre: "Quando surge um problema, voc\xEA precisa de algu\xE9m que responda e resolva. Aqui o atendimento \xE9 direto e o combinado \xE9 cumprido.",
    servicos: [
      S("Atendimento r\xE1pido", "Chame e combine o melhor hor\xE1rio."),
      S("Or\xE7amento antes do servi\xE7o", "Voc\xEA sabe o valor antes de aprovar."),
      S("Servi\xE7o residencial", "Solu\xE7\xF5es para a sua casa."),
      S("Servi\xE7o comercial", "Atendimento para empresas, lojas e condom\xEDnios."),
      S("Manuten\xE7\xE3o preventiva", "Evite problemas maiores."),
      S("Emerg\xEAncias", "Consulte a disponibilidade pelo WhatsApp.")
    ],
    diferenciais: [I("Resposta r\xE1pida", "Atendimento direto pelo WhatsApp."), I("Or\xE7amento claro", "Valor combinado antes de come\xE7ar."), I("Pontualidade", "Hor\xE1rio combinado, hor\xE1rio cumprido."), I("Servi\xE7o limpo e organizado", "Cuidado com a sua casa.")],
    passos: [I("Chame", "Conte o problema pelo WhatsApp."), I("Combine", "Or\xE7amento e hor\xE1rio do atendimento."), I("Resolvido", "Servi\xE7o feito e explicado.")],
    faq: [P("Atendem em emerg\xEAncia?", "Chame pelo WhatsApp para saber a disponibilidade no momento."), P("Quanto custa?", "Depende do servi\xE7o. Enviamos o or\xE7amento antes de come\xE7ar."), P("Qual a regi\xE3o atendida?", "Consulte pelo WhatsApp se atendemos o seu endere\xE7o."), P("D\xE3o garantia?", "Pergunte pelo WhatsApp as condi\xE7\xF5es do servi\xE7o."), P("Como pago?", "Combinamos as formas de pagamento no or\xE7amento.")],
    imagens: ["servi\xE7os residenciais", "manuten\xE7\xE3o casa", "home repair", "plumber electrician"]
  },
  {
    id: "educacao",
    nome: "Escola, cursos e idiomas",
    chaves: ["escola", "curso", "idioma", "ingles", "autoescola", "cfc", "colegio", "creche", "faculdade", "treinamento", "reforco", "musica", "violao", "ber\xE7ario", "bercario", "pre vestibular"],
    schema: "EducationalOrganization",
    layout: "vibrante",
    paleta: { primaria: "#6d28d9", destaque: "#f59e0b" },
    cta: { principal: "Quero saber mais", secundario: "Conhecer a escola" },
    etiqueta: "Matr\xEDculas abertas? Confirme pelo WhatsApp",
    titulos: ["Aprender aqui faz diferen\xE7a", "Educa\xE7\xE3o com acompanhamento pr\xF3ximo", "O lugar certo para aprender em {cidade}"],
    subtitulo: "Turmas acompanhadas de perto, professores atenciosos e informa\xE7\xF5es f\xE1ceis pelo WhatsApp.",
    sobre: "Aprender \xE9 mais f\xE1cil com acompanhamento e um ambiente acolhedor. Conhe\xE7a o nosso jeito de ensinar.",
    servicos: [
      S("Turmas e hor\xE1rios", "Op\xE7\xF5es que cabem na rotina de cada aluno."),
      S("Acompanhamento individual", "Aten\xE7\xE3o ao ritmo e \xE0s dificuldades de cada um."),
      S("Material did\xE1tico", "Conte\xFAdo organizado para o aprendizado."),
      S("Avalia\xE7\xE3o inicial", "Para indicar o melhor ponto de partida."),
      S("Aula experimental", "Consulte a disponibilidade pelo WhatsApp."),
      S("Atendimento aos respons\xE1veis", "Comunica\xE7\xE3o clara com a fam\xEDlia.")
    ],
    diferenciais: [I("Turmas acompanhadas", "Aten\xE7\xE3o ao desenvolvimento de cada aluno."), I("Professores atenciosos", "Ensino com paci\xEAncia e clareza."), I("Comunica\xE7\xE3o com a fam\xEDlia", "Retorno claro sobre o aprendizado."), I("Informa\xE7\xF5es f\xE1ceis", "Tire d\xFAvidas pelo WhatsApp.")],
    passos: [I("Conhe\xE7a", "Fale com a gente e tire as d\xFAvidas."), I("Escolha a turma", "Veja o hor\xE1rio e o n\xEDvel ideais."), I("Comece", "Matr\xEDcula simples e acompanhamento desde o in\xEDcio.")],
    faq: [P("Como fa\xE7o a matr\xEDcula?", "Chame pelo WhatsApp: informamos a documenta\xE7\xE3o e os pr\xF3ximos passos."), P("Posso conhecer antes de decidir?", "Consulte a disponibilidade de visita ou aula experimental."), P("Quais os valores?", "Chame pelo WhatsApp para receber as condi\xE7\xF5es atualizadas."), P("Quais os hor\xE1rios das turmas?", "Confirme pelo WhatsApp as turmas dispon\xEDveis."), P("Atendem todas as idades?", "Informe a idade pelo WhatsApp para indicarmos a turma ideal.")],
    imagens: ["escola sala de aula", "estudantes", "classroom students", "learning"]
  },
  {
    id: "eventos",
    nome: "Eventos, buffet e fotografia",
    chaves: ["evento", "buffet", "fotograf", "cerimonial", "festa", "casamento", "filmagem", "som e luz", "espaco de eventos", "decoracao de festa", "dj ", "salao de festas"],
    schema: "EventVenue",
    layout: "estudio",
    paleta: { primaria: "#7a2e5c", destaque: "#d4a24c" },
    cta: { principal: "Pedir or\xE7amento", secundario: "Ver trabalhos" },
    etiqueta: "Seu evento, do seu jeito",
    titulos: ["Seu grande dia merece cuidado em cada detalhe", "Eventos que ficam na mem\xF3ria", "Festas e celebra\xE7\xF5es em {cidade}"],
    subtitulo: "Conte a data e o tipo de evento, e receba um or\xE7amento pensado para voc\xEA.",
    sobre: "Cada celebra\xE7\xE3o \xE9 \xFAnica. Planejamos junto com voc\xEA, cuidamos dos detalhes e entregamos tranquilidade.",
    servicos: [
      S("Casamentos", "Planejamento e execu\xE7\xE3o com aten\xE7\xE3o ao que importa para o casal."),
      S("Anivers\xE1rios e festas", "Do infantil ao adulto, no seu estilo."),
      S("Eventos corporativos", "Confraterniza\xE7\xF5es e encontros de empresa."),
      S("Decora\xE7\xE3o", "Ambienta\xE7\xE3o para cada tipo de evento."),
      S("Cobertura fotogr\xE1fica", "Registro dos momentos importantes."),
      S("Pacotes personalizados", "Montamos a proposta conforme o seu or\xE7amento.")
    ],
    diferenciais: [I("Aten\xE7\xE3o a cada detalhe", "Planejamento antes do grande dia."), I("Proposta personalizada", "Or\xE7amento conforme a sua necessidade."), I("Comunica\xE7\xE3o clara", "Tudo combinado por escrito."), I("Equipe presente", "Acompanhamento no dia do evento.")],
    passos: [I("Conte sobre o evento", "Data, local e n\xFAmero de convidados."), I("Receba a proposta", "Com o que est\xE1 incluso e o valor."), I("Aproveite", "Cuidamos do resto no grande dia.")],
    faq: [P("Com quanta anteced\xEAncia devo contratar?", "Quanto antes melhor, para garantir a data. Consulte a disponibilidade pelo WhatsApp."), P("Como funciona o or\xE7amento?", "Voc\xEA informa data, local e convidados e enviamos a proposta."), P("Posso ver trabalhos anteriores?", "Pode. Pe\xE7a pelo WhatsApp que enviamos exemplos."), P("Atendem em outras cidades?", "Consulte pelo WhatsApp a regi\xE3o e poss\xEDveis custos de deslocamento."), P("Como reservo a data?", "Combinamos as condi\xE7\xF5es no contrato.")],
    imagens: ["festa evento", "casamento decora\xE7\xE3o", "wedding party", "event decoration"]
  },
  {
    id: "turismo",
    nome: "Hotel, pousada e turismo",
    chaves: ["hotel", "hoteis", "pousada", "hospedagem", "turismo", "agencia de viagens", "hostel", "chale", "resort", "camping", "apart hotel", "flat"],
    schema: "LodgingBusiness",
    layout: "aurora",
    paleta: { primaria: "#0b6e6e", destaque: "#e7a33e" },
    cta: { principal: "Reservar pelo WhatsApp", secundario: "Ver acomoda\xE7\xF5es" },
    etiqueta: "Reserve direto, sem intermedi\xE1rio",
    titulos: ["Descanse do jeito que voc\xEA merece", "Sua estadia come\xE7a com um bom acolhimento", "Hospedagem confort\xE1vel em {cidade}"],
    subtitulo: "Veja as acomoda\xE7\xF5es, tire d\xFAvidas e reserve direto pelo WhatsApp.",
    sobre: "Hospedar bem \xE9 receber com carinho. Cuidamos do conforto, da limpeza e do atendimento para a sua estadia ser tranquila.",
    servicos: [
      S("Acomoda\xE7\xF5es", "Quartos e op\xE7\xF5es para casal, fam\xEDlia e grupos."),
      S("Caf\xE9 da manh\xE3", "Confirme o que est\xE1 incluso pelo WhatsApp."),
      S("\xC1rea de lazer", "Espa\xE7os para descansar e se divertir."),
      S("Passeios e dicas", "Indica\xE7\xF5es do que fazer na regi\xE3o."),
      S("Reserva direta", "Fale com a gente e combine datas e condi\xE7\xF5es."),
      S("Eventos e grupos", "Consulte condi\xE7\xF5es para grupos.")
    ],
    diferenciais: [I("Reserva direta", "Conversa direta, sem intermedi\xE1rio."), I("Acolhimento", "Atendimento atencioso do in\xEDcio ao fim."), I("Conforto", "Ambientes pensados para o descanso."), I("Localiza\xE7\xE3o", "Confira o endere\xE7o e o mapa abaixo.")],
    passos: [I("Escolha as datas", "Informe o per\xEDodo e o n\xFAmero de pessoas."), I("Confirme a reserva", "Combinamos valores e condi\xE7\xF5es."), I("Aproveite", "Chegue e descanse, o resto \xE9 com a gente.")],
    faq: [P("Como fa\xE7o a reserva?", "Pelo WhatsApp, informando as datas e o n\xFAmero de h\xF3spedes."), P("O caf\xE9 da manh\xE3 est\xE1 incluso?", "Confirme pelo WhatsApp o que cada tarifa inclui."), P("Aceitam pets?", "Consulte a pol\xEDtica pelo WhatsApp."), P("Qual o hor\xE1rio de entrada e sa\xEDda?", "Informamos na confirma\xE7\xE3o da reserva."), P("H\xE1 estacionamento?", "Confirme pelo WhatsApp a disponibilidade.")],
    imagens: ["pousada hotel quarto", "hospedagem", "hotel room", "resort pool"]
  },
  {
    id: "agro",
    nome: "Agro e rural",
    chaves: ["agro", "fazenda", "rural", "insumo", "sementes", "implement", "cooperativa", "pecuaria", "trator", "fertiliz", "defensivo", "granja", "viveiro"],
    schema: "LocalBusiness",
    layout: "oficina",
    paleta: { primaria: "#2f6b3a", destaque: "#d97706" },
    cta: { principal: "Pedir cota\xE7\xE3o", secundario: "Como chegar" },
    etiqueta: "Atendimento de quem entende do campo",
    titulos: ["Tudo para o campo, com atendimento de confian\xE7a", "Cota\xE7\xE3o r\xE1pida, entrega combinada", "Seu parceiro do campo em {cidade}"],
    subtitulo: "Insumos, produtos e orienta\xE7\xE3o para o seu dia a dia, com cota\xE7\xE3o pelo WhatsApp.",
    sobre: "No campo, tempo e confian\xE7a valem muito. Atendemos com agilidade e conhecimento do que o produtor precisa.",
    servicos: [
      S("Insumos e produtos", "Itens para a lavoura e a cria\xE7\xE3o."),
      S("Ra\xE7\xF5es e suplementos", "Op\xE7\xF5es para diferentes animais."),
      S("Ferramentas e equipamentos", "Para o trabalho no dia a dia."),
      S("Cota\xE7\xE3o pelo WhatsApp", "Pe\xE7a o pre\xE7o sem sair da propriedade."),
      S("Entrega", "Consulte a regi\xE3o atendida."),
      S("Orienta\xE7\xE3o", "Ajuda para escolher o produto certo.")
    ],
    diferenciais: [I("Cota\xE7\xE3o r\xE1pida", "Resposta pelo WhatsApp."), I("Conhecimento do campo", "Atendimento de quem entende."), I("Variedade", "Produtos para diferentes necessidades."), I("Entrega combinada", "Consulte prazos e regi\xF5es.")],
    passos: [I("Pe\xE7a a cota\xE7\xE3o", "Diga o produto e a quantidade."), I("Combine", "Valores, prazo e forma de pagamento."), I("Receba ou retire", "Entrega ou retirada na loja.")],
    faq: [P("Como pe\xE7o uma cota\xE7\xE3o?", "Pelo WhatsApp, informando o produto e a quantidade."), P("Entregam na propriedade?", "Consulte a regi\xE3o atendida pelo WhatsApp."), P("Quais as formas de pagamento?", "Combinamos no atendimento."), P("Trabalham com prazo para pagamento?", "Consulte as condi\xE7\xF5es pelo WhatsApp."), P("Posso retirar na loja?", "Pode. Veja o hor\xE1rio e o endere\xE7o abaixo.")],
    imagens: ["campo agropecu\xE1ria", "fazenda lavoura", "farm field", "tractor"]
  },
  {
    id: "varejo",
    nome: "Com\xE9rcio e varejo em geral",
    chaves: ["loja", "mercado", "supermercado", "papelaria", "livraria", "floricultura", "presente", "utilidades", "eletro", "moveis", "colchoes", "informatica", "celular", "material", "distribuidora", "atacado", "farmac", "drogaria"],
    schema: "Store",
    layout: "estudio",
    paleta: { primaria: "#0f5132", destaque: "#f2a900" },
    cta: { principal: "Falar no WhatsApp", secundario: "Como chegar" },
    etiqueta: "Atendimento na loja e pelo WhatsApp",
    titulos: ["Tudo o que voc\xEA precisa, com atendimento de verdade", "Boas escolhas, bom pre\xE7o e aten\xE7\xE3o", "Sua loja de confian\xE7a em {cidade}"],
    subtitulo: "Veja o que temos, tire d\xFAvidas e pe\xE7a pelo WhatsApp, para retirar na loja ou combinar a entrega.",
    sobre: "Com\xE9rcio de bairro \xE9 feito de confian\xE7a. Aqui voc\xEA encontra o que precisa e \xE9 atendido por quem conhece o produto.",
    servicos: [
      S("Produtos selecionados", "Variedade pensada para o dia a dia."),
      S("Atendimento no balc\xE3o", "Ajuda para escolher o produto certo."),
      S("Compra pelo WhatsApp", "Pe\xE7a sem sair de casa."),
      S("Encomendas", "N\xE3o achou? A gente busca para voc\xEA."),
      S("Entrega", "Consulte a regi\xE3o atendida."),
      S("Condi\xE7\xF5es de pagamento", "Consulte as op\xE7\xF5es.")
    ],
    diferenciais: [I("Atendimento pr\xF3ximo", "Gente que conhece o que vende."), I("Praticidade", "Pe\xE7a pelo WhatsApp."), I("Variedade", "Op\xE7\xF5es para diferentes necessidades."), I("Localiza\xE7\xE3o f\xE1cil", "Veja o endere\xE7o e o hor\xE1rio abaixo.")],
    passos: [I("Escolha", "Veja o que precisa ou pergunte pelo WhatsApp."), I("Combine", "Valor, pagamento e retirada ou entrega."), I("Receba", "Retire na loja ou receba em casa.")],
    faq: [P("Como compro pelo WhatsApp?", "Mande uma mensagem com o que procura e enviamos op\xE7\xF5es e valores."), P("T\xEAm entrega?", "Consulte a regi\xE3o atendida pelo WhatsApp."), P("Quais as formas de pagamento?", "Consulte as op\xE7\xF5es pelo WhatsApp."), P("Posso trocar o produto?", "Consulte a pol\xEDtica de troca no atendimento."), P("Qual o hor\xE1rio de funcionamento?", "Est\xE1 na se\xE7\xE3o de contato, logo abaixo.")],
    imagens: ["loja com\xE9rcio", "varejo atendimento", "retail store", "shop"]
  },
  {
    id: "tecnologia-marketing",
    nome: "Tecnologia, marketing e servi\xE7os profissionais",
    chaves: ["software", "desenvolv", "ti ", "tecnologia", "marketing", "agencia", "publicidade", "design", "grafica", "consultoria", "coach", "treinamento corporativo", "seguranca eletronica", "cftv", "provedor", "informatica", "rh", "recrutamento"],
    schema: "ProfessionalService",
    layout: "bento",
    paleta: { primaria: "#2d3a8c", destaque: "#00b8a9" },
    cta: { principal: "Pedir uma proposta", secundario: "Ver servi\xE7os" },
    etiqueta: "Resultado combinado antes de come\xE7ar",
    titulos: ["Solu\xE7\xF5es que resolvem o problema de verdade", "Do briefing \xE0 entrega, com acompanhamento", "Parceiro de neg\xF3cios em {cidade}"],
    subtitulo: "Conte o seu desafio e receba uma proposta clara, com escopo, prazo e valor.",
    sobre: "Bons projetos nascem de entender o problema. Ouvimos, propomos e acompanhamos a entrega com transpar\xEAncia.",
    servicos: [
      S("Diagn\xF3stico", "Entendemos o seu cen\xE1rio antes de propor."),
      S("Planejamento", "Escopo, etapas e prazos combinados."),
      S("Execu\xE7\xE3o", "Entrega acompanhada, com comunica\xE7\xE3o clara."),
      S("Suporte", "Apoio depois da entrega."),
      S("Treinamento", "Para sua equipe usar bem a solu\xE7\xE3o."),
      S("Melhoria cont\xEDnua", "Ajustes com base nos resultados.")
    ],
    diferenciais: [I("Proposta clara", "Escopo, prazo e valor por escrito."), I("Comunica\xE7\xE3o direta", "Atualiza\xE7\xF5es no canal que voc\xEA preferir."), I("Foco no resultado", "Decis\xF5es ligadas ao seu objetivo."), I("Transpar\xEAncia", "Voc\xEA acompanha cada etapa.")],
    passos: [I("Conversa inicial", "Entendemos o seu desafio."), I("Proposta", "Escopo, prazo e investimento."), I("Entrega", "Execu\xE7\xE3o acompanhada e ajustes.")],
    faq: [P("Como funciona a contrata\xE7\xE3o?", "Conversamos, enviamos a proposta e, aprovada, iniciamos o projeto."), P("Quanto tempo leva?", "Depende do escopo. O prazo vem na proposta."), P("H\xE1 suporte ap\xF3s a entrega?", "Combinamos as condi\xE7\xF5es na proposta."), P("Como \xE9 a comunica\xE7\xE3o durante o projeto?", "No canal que voc\xEA preferir, com retornos regulares."), P("Posso come\xE7ar por algo menor?", "Pode. Conversamos sobre um primeiro passo.")],
    imagens: ["escrit\xF3rio equipe", "trabalho notebook", "office team", "laptop workspace"]
  },
  {
    id: "concessionaria",
    nome: "Concession\xE1ria e revenda de ve\xEDculos",
    chaves: ["concessionaria", "revenda", "carros usados", "veiculos novos", "veiculo novo", "seminovo", "multimarcas", "automoveis", "automovel", "revendedora", "motos novas", "veiculos"],
    schema: "AutoDealer",
    layout: "showroom",
    paleta: { primaria: "#b4121b", destaque: "#cbd5e1" },
    cta: { principal: "Falar com um vendedor", secundario: "Ver como chegar" },
    etiqueta: "Atendimento direto pelo WhatsApp",
    titulos: ["Seu pr\xF3ximo carro come\xE7a aqui", "Encontre o ve\xEDculo certo em {cidade}", "Compre com atendimento de verdade"],
    subtitulo: "Ve\xEDculos novos e seminovos, avalia\xE7\xE3o do seu usado e atendimento direto pelo WhatsApp.",
    sobre: "Comprar um ve\xEDculo \xE9 uma decis\xE3o grande e merece uma conversa clara. Aqui voc\xEA tira d\xFAvidas, conhece as op\xE7\xF5es e negocia com transpar\xEAncia.",
    servicos: [
      S("Ve\xEDculos novos", "Consulte as op\xE7\xF5es dispon\xEDveis e as condi\xE7\xF5es do momento."),
      S("Seminovos", "Ve\xEDculos selecionados, com informa\xE7\xF5es claras sobre cada um."),
      S("Avalia\xE7\xE3o do seu usado", "Pe\xE7a a avalia\xE7\xE3o do seu ve\xEDculo para usar na negocia\xE7\xE3o."),
      S("Financiamento", "Simula\xE7\xE3o com as condi\xE7\xF5es do momento, sujeita \xE0 an\xE1lise de cr\xE9dito."),
      S("Test drive", "Consulte a disponibilidade e agende pelo WhatsApp."),
      S("P\xF3s-venda", "Consulte os servi\xE7os de acompanhamento dispon\xEDveis.")
    ],
    diferenciais: [I("Atendimento direto", "Fale com um vendedor pelo WhatsApp, sem formul\xE1rio."), I("Avalia\xE7\xE3o transparente", "Seu usado avaliado, com explica\xE7\xE3o de como o valor foi pensado."), I("Documenta\xE7\xE3o orientada", "Orienta\xE7\xE3o sobre a papelada de cada etapa."), I("Test drive agendado", "Combine dia e hor\xE1rio para conhecer o ve\xEDculo.")],
    passos: [I("Escolha", "Diga o que procura e veja as op\xE7\xF5es dispon\xEDveis."), I("Simule", "Avalia\xE7\xE3o do usado e financiamento, sujeitos \xE0 an\xE1lise."), I("Leve", "Documenta\xE7\xE3o orientada e entrega combinada.")],
    faq: [
      P("Como sei quais ve\xEDculos est\xE3o dispon\xEDveis?", "O estoque muda com frequ\xEAncia. Chame no WhatsApp e informamos o que h\xE1 no momento."),
      P("Voc\xEAs avaliam o meu usado?", "Consulte pelo WhatsApp: informe modelo, ano e quilometragem para iniciarmos a avalia\xE7\xE3o."),
      P("Posso financiar o ve\xEDculo?", "Consulte as condi\xE7\xF5es pelo WhatsApp. O financiamento depende de an\xE1lise de cr\xE9dito."),
      P("Quais documentos preciso para comprar?", "Depende da forma de pagamento. Orientamos a lista completa no atendimento."),
      P("Posso fazer test drive?", "Consulte a disponibilidade pelo WhatsApp e agende o hor\xE1rio.")
    ],
    imagens: ["concession\xE1ria carros", "car dealership", "used cars", "car showroom"]
  },
  {
    id: "credito",
    nome: "Credi\xE1rio, financeira e cr\xE9dito",
    chaves: ["crediario", "credito", "financeira", "emprestimo", "consignado", "consorcio", "financiamento", "microcredito", "cooperativa de credito", "fintech", "correspondente bancario", "cobranca", "renegociacao"],
    schema: "FinancialService",
    layout: "credito",
    paleta: { primaria: "#0a6b52", destaque: "#f2b705" },
    cta: { principal: "Simular pelo WhatsApp", secundario: "Como funciona" },
    etiqueta: "Atendimento direto pelo WhatsApp",
    titulos: ["Cr\xE9dito com condi\xE7\xF5es explicadas antes de contratar", "Entenda cada etapa e simule pelo WhatsApp", "Cr\xE9dito com atendimento claro em {cidade}"],
    subtitulo: "Tire d\xFAvidas, veja os documentos necess\xE1rios e fa\xE7a a sua simula\xE7\xE3o pelo WhatsApp. Cr\xE9dito sujeito \xE0 an\xE1lise e aprova\xE7\xE3o.",
    sobre: "Contratar cr\xE9dito exige clareza. Aqui voc\xEA entende as condi\xE7\xF5es, os prazos e os documentos antes de decidir.",
    servicos: [
      S("Credi\xE1rio", "Consulte as condi\xE7\xF5es para compras a prazo."),
      S("Cr\xE9dito pessoal", "Consulte as modalidades e condi\xE7\xF5es dispon\xEDveis."),
      S("Cr\xE9dito consignado", "Para quem atende aos requisitos da modalidade; consulte."),
      S("Financiamento", "Condi\xE7\xF5es conforme o bem financiado e a an\xE1lise de cr\xE9dito."),
      S("Simula\xE7\xE3o", "Veja como ficaria a parcela antes de decidir."),
      S("Renegocia\xE7\xE3o", "Consulte as possibilidades para organizar pend\xEAncias.")
    ],
    diferenciais: [I("Condi\xE7\xF5es explicadas", "Valor, prazo e parcelas apresentados com clareza."), I("Simula\xE7\xE3o antes de contratar", "Voc\xEA v\xEA como fica antes de decidir."), I("Atendimento direto", "Tire d\xFAvidas pelo WhatsApp com quem atende."), I("Contrato por escrito", "Tudo o que foi combinado fica registrado no contrato.")],
    passos: [I("Simule", "Informe o que precisa pelo WhatsApp e veja as condi\xE7\xF5es."), I("Envie os documentos", "Orientamos a lista conforme a modalidade."), I("Receba a resposta", "A an\xE1lise define a aprova\xE7\xE3o e voc\xEA \xE9 avisado do resultado.")],
    faq: [
      P("Como funciona a an\xE1lise de cr\xE9dito?", "Avaliamos as informa\xE7\xF5es e os documentos enviados. A aprova\xE7\xE3o depende da an\xE1lise."),
      P("Quais documentos preciso?", "Em geral, documento com foto, CPF e comprovantes. Confirmamos a lista pelo WhatsApp."),
      P("Como saber os juros e as parcelas?", "Dependem da modalidade e da an\xE1lise. Informamos tudo por escrito antes da contrata\xE7\xE3o."),
      P("Posso pagar antes do prazo?", "Consulte as condi\xE7\xF5es de antecipa\xE7\xE3o da modalidade escolhida."),
      P("A aprova\xE7\xE3o \xE9 autom\xE1tica?", "N\xE3o. Toda concess\xE3o passa por an\xE1lise e aprova\xE7\xE3o.")
    ],
    imagens: ["financeira cr\xE9dito", "dinheiro finan\xE7as", "financial advisor", "credit loan"]
  }
];
var GENERICO = {
  id: "generico",
  nome: "Neg\xF3cio local",
  chaves: [],
  schema: "LocalBusiness",
  layout: "clinica",
  paleta: { primaria: "#1f4fd8", destaque: "#f59e0b" },
  cta: { principal: "Falar no WhatsApp", secundario: "Como chegar" },
  etiqueta: "Atendimento direto pelo WhatsApp",
  titulos: ["Atendimento de confian\xE7a em {cidade}", "Fale com a gente e resolva sem complica\xE7\xE3o", "Qualidade e aten\xE7\xE3o no que fazemos"],
  subtitulo: "Conhe\xE7a o que fazemos, tire suas d\xFAvidas e fale direto com a gente pelo WhatsApp.",
  sobre: "Trabalhamos para entregar um bom atendimento, com clareza e aten\xE7\xE3o ao que voc\xEA precisa.",
  servicos: [
    S("Atendimento personalizado", "Entendemos o que voc\xEA precisa antes de propor."),
    S("Or\xE7amento claro", "Voc\xEA sabe o que est\xE1 inclu\xEDdo e o valor."),
    S("Atendimento pelo WhatsApp", "Respostas r\xE1pidas, sem burocracia."),
    S("Acompanhamento", "Do primeiro contato ao p\xF3s-atendimento."),
    S("Condi\xE7\xF5es combinadas", "Prazo e forma de pagamento acertados antes."),
    S("Suporte", "Estamos por perto se precisar.")
  ],
  diferenciais: [I("Aten\xE7\xE3o ao cliente", "Voc\xEA \xE9 ouvido e entendido."), I("Clareza", "Tudo combinado antes de come\xE7ar."), I("Agilidade", "Contato direto pelo WhatsApp."), I("Localiza\xE7\xE3o f\xE1cil", "Veja o endere\xE7o e o hor\xE1rio abaixo.")],
  passos: [I("Fale com a gente", "Conte o que voc\xEA precisa."), I("Receba a proposta", "Com o que est\xE1 inclu\xEDdo e o valor."), I("Resolva", "Atendimento feito e acompanhado.")],
  faq: [P("Como entro em contato?", "Pelo bot\xE3o de WhatsApp desta p\xE1gina ou pelo telefone."), P("Qual o hor\xE1rio de atendimento?", "Est\xE1 na se\xE7\xE3o de contato, logo abaixo."), P("Fazem or\xE7amento?", "Sim. Chame no WhatsApp contando o que precisa."), P("Quais as formas de pagamento?", "Consulte as op\xE7\xF5es pelo WhatsApp."), P("Onde voc\xEAs ficam?", "O endere\xE7o e o mapa est\xE3o na se\xE7\xE3o de contato.")],
  imagens: ["atendimento cliente", "pequeno neg\xF3cio", "small business", "customer service"]
};
var normalizar = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
function achar(nicho) {
  const alvo = ` ${normalizar(nicho || "")} `;
  if (!alvo.trim()) return GENERICO;
  let melhor = null;
  let pontos = 0;
  for (const c of BANCO) {
    for (const k of c.chaves) {
      const chave = normalizar(k);
      if (!chave) continue;
      const padrao = k.endsWith(" ") ? ` ${chave} ` : ` ${chave}`;
      if (alvo.includes(padrao) && chave.length > pontos) {
        melhor = c;
        pontos = chave.length;
      }
    }
  }
  return melhor || GENERICO;
}
var preencher = (texto, empresa, cidade) => texto.replace(/\{empresa\}/g, empresa || "n\xF3s").replace(/\{cidade\}/g, cidade || "sua regi\xE3o");
var SOBRE_COMPLEMENTO = {
  padaria: "Do p\xE3o de todo dia \xE0 encomenda especial, \xE9 s\xF3 chegar ou chamar no WhatsApp.",
  restaurante: "Pe\xE7a pelo WhatsApp ou venha comer com a gente.",
  "saude-medica": "O agendamento \xE9 simples e o contato \xE9 direto, pelo WhatsApp.",
  odonto: "Agende uma avalia\xE7\xE3o e tire todas as d\xFAvidas antes de come\xE7ar.",
  psicologia: "O ritmo \xE9 o seu. Se fizer sentido, mande uma mensagem e conversamos sem compromisso.",
  estetica: "Escolha o servi\xE7o, marque o hor\xE1rio e venha relaxar.",
  academia: "Pe\xE7a uma aula experimental e conhe\xE7a o espa\xE7o.",
  advocacia: "O primeiro contato serve para entender a sua situa\xE7\xE3o e explicar as possibilidades.",
  contabilidade: "Pe\xE7a um or\xE7amento e conte a rotina da sua empresa.",
  imobiliaria: "Orientamos sobre documenta\xE7\xE3o e negocia\xE7\xE3o. Fale com um corretor.",
  oficina: "Acompanhe tudo pelo WhatsApp e traga o seu carro para uma avalia\xE7\xE3o.",
  pet: "Agende pelo WhatsApp e deixe o seu pet em boas m\xE3os.",
  "loja-moda": "Venha conhecer a loja ou pe\xE7a sugest\xF5es pelo WhatsApp.",
  construcao: "Agende uma visita para conversarmos sobre o seu projeto.",
  "servicos-residenciais": "Voc\xEA explica o problema, recebe o or\xE7amento e combina o hor\xE1rio.",
  educacao: "Fale com a gente para conhecer as turmas e tirar as d\xFAvidas.",
  eventos: "Conte a data e o tipo de evento para receber uma proposta.",
  turismo: "Reserve direto e tire as d\xFAvidas pelo WhatsApp.",
  agro: "Pe\xE7a a sua cota\xE7\xE3o pelo WhatsApp e combine retirada ou entrega.",
  varejo: "Venha conhecer ou pe\xE7a pelo WhatsApp.",
  concessionaria: "Pe\xE7a a avalia\xE7\xE3o do seu usado e tire as d\xFAvidas pelo WhatsApp.",
  credito: "Chame no WhatsApp e fa\xE7a a sua simula\xE7\xE3o.",
  "tecnologia-marketing": "Combinamos escopo, prazo e investimento antes de iniciar. Pe\xE7a uma proposta.",
  generico: "Fale com a gente pelo WhatsApp e conte o que voc\xEA precisa."
};

// src/templates/sites/semear.ts
var vazio = (v) => !(v || "").trim();
var listaVazia = (l, campo) => !l || l.length === 0 || l.every((x) => campo ? vazio(campo(x)) : false);
var indiceEstavel = (texto, n) => {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = h * 31 + texto.charCodeAt(i) >>> 0;
  return h % Math.max(1, n);
};
function semearConteudo(d, opcoes = {}) {
  const c = achar(d.categoria);
  const { sobrescrever = false } = opcoes;
  const sub = (t) => preencher(t, d.empresa, d.cidade || "");
  const saida = { ...d, schema: d.schema || c.schema };
  if (sobrescrever || vazio(d.slogan)) {
    saida.slogan = sub(c.titulos[indiceEstavel(d.empresa, c.titulos.length)]);
  }
  if (sobrescrever || vazio(d.sobre)) saida.sobre = sub(`${c.sobre} ${SOBRE_COMPLEMENTO[c.id] || ""}`.trim());
  if (sobrescrever || listaVazia(d.servicos, (s) => s.titulo + s.descricao)) {
    saida.servicos = c.servicos.map((s) => ({ titulo: s.titulo, descricao: sub(s.descricao) }));
  }
  if (sobrescrever || listaVazia(d.diferenciais, (x) => x.titulo + x.texto)) {
    saida.diferenciais = c.diferenciais.map((x) => ({ titulo: x.titulo, texto: sub(x.texto) }));
  }
  if (sobrescrever || listaVazia(d.passos, (x) => x.titulo + x.texto)) {
    saida.passos = c.passos.map((x) => ({ titulo: x.titulo, texto: sub(x.texto) }));
  }
  if (sobrescrever || listaVazia(d.faq, (x) => x.pergunta + x.resposta)) {
    saida.faq = c.faq.map((x) => ({ pergunta: sub(x.pergunta), resposta: sub(x.resposta) }));
  }
  if (opcoes.cores) {
    saida.corPrimaria = c.paleta.primaria;
    saida.corDestaque = c.paleta.destaque;
  }
  return saida;
}

// src/templates/sites/premium-base.ts
var FONTES = {
  elegante: {
    nome: "Elegante",
    tom: "serifa cl\xE1ssica e texto limpo",
    titulos: '"Playfair Display",Georgia,serif',
    corpo: '"Inter",system-ui,sans-serif',
    google: "family=Playfair+Display:wght@500;700&family=Inter:wght@400;500;600;700"
  },
  artesanal: {
    nome: "Artesanal",
    tom: "calor de coisa feita \xE0 m\xE3o",
    titulos: '"Fraunces",Georgia,serif',
    corpo: '"Inter",system-ui,sans-serif',
    google: "family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600;700"
  },
  moderna: {
    nome: "Moderna",
    tom: "geom\xE9trica e direta",
    titulos: '"Plus Jakarta Sans",system-ui,sans-serif',
    corpo: '"Plus Jakarta Sans",system-ui,sans-serif',
    google: "family=Plus+Jakarta+Sans:wght@400;500;600;700;800"
  },
  forte: {
    nome: "Forte",
    tom: "larga e impactante",
    titulos: '"Archivo",system-ui,sans-serif',
    corpo: '"Inter",system-ui,sans-serif',
    google: "family=Archivo:wdth,wght@112,700;112,800;112,900&family=Inter:wght@400;500;600"
  },
  luxo: {
    nome: "Luxo",
    tom: "serifa fina, ar de boutique",
    titulos: '"Cormorant Garamond",Georgia,serif',
    corpo: '"Jost",system-ui,sans-serif',
    google: "family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@300;400;500;600"
  },
  sobria: {
    nome: "S\xF3bria",
    tom: "livro e escrit\xF3rio",
    titulos: '"Libre Baskerville",Georgia,serif',
    corpo: '"Source Sans 3",system-ui,sans-serif',
    google: "family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700"
  },
  amigavel: {
    nome: "Amig\xE1vel",
    tom: "arredondada e leve",
    titulos: '"Outfit",system-ui,sans-serif',
    corpo: '"Nunito",system-ui,sans-serif',
    google: "family=Outfit:wght@600;700;800;900&family=Nunito:wght@400;600;700"
  },
  editorial: {
    nome: "Editorial",
    tom: "revista, contraste alto",
    titulos: '"DM Serif Display",Georgia,serif',
    corpo: '"DM Sans",system-ui,sans-serif',
    google: "family=DM+Serif+Display&family=DM+Sans:wght@400;500;700"
  },
  tecnologica: {
    nome: "Tecnol\xF3gica",
    tom: "precisa, de startup",
    titulos: '"Space Grotesk",system-ui,sans-serif',
    corpo: '"Inter",system-ui,sans-serif',
    google: "family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600"
  }
};
var linkFontes = (f) => `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${f.google}&display=swap">`;
var urlImagem = (valor) => {
  const v = String(valor || "").trim();
  if (/^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(v)) return v;
  if (/^https:\/\/[^\s"'<>()\\]+$/.test(v)) return esc(v);
  return "";
};
var partirSobre = (d, capaPadrao, sobrePadrao) => {
  const texto = (d.sobre || "").trim();
  if (!texto) return [esc(capaPadrao), esc(sobrePadrao)];
  const frases3 = texto.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [texto];
  if (frases3.length >= 2) {
    return [esc(frases3[0].trim()), esc(frases3.slice(1).join(" ").replace(/\s+/g, " ").trim())];
  }
  return [esc(capaPadrao), esc(texto)];
};
var fotos = (d) => (d.galeria || []).map(urlImagem).filter(Boolean).slice(0, 6);
var fundoFoto = (src, cor, veu = "rgba(0,0,0,.35),rgba(0,0,0,.7)") => src ? `background-image:linear-gradient(180deg,${veu}),url('${src}');background-size:cover;background-position:center` : `background-image:radial-gradient(circle at 20% 20%,${ajustarCor(cor, 50)} 0%,transparent 45%),linear-gradient(135deg,${cor},${ajustarCor(cor, -60)})`;
var iniciais = (empresa) => esc(empresa.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?");
var logo = (d, classe = "logo") => {
  const src = urlImagem(d.logo);
  return src ? `<img class="${classe}-img" src="${src}" alt="${esc(d.empresa)}">` : `<span class="${classe}-iniciais">${iniciais(d.empresa)}</span>`;
};
var linkZap = (d) => linkWhatsapp(d.whatsapp || d.telefone, d.empresa);
var linkTel = (d) => digitos(d.telefone) ? `tel:+${digitos(d.telefone)}` : "";
var linkMapa = (d) => d.endereco ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${d.empresa} ${d.endereco}`)}` : "";
var linkInsta = (d) => {
  const u = linkInstagram(d.instagram);
  return /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9_.]+\/?$/.test(u) ? u : "";
};
var ctaPrincipal = (d, texto = "Falar no WhatsApp", classe = "btn btn-1") => {
  const zap = linkZap(d);
  if (zap) return `<a class="${classe}" href="${zap}" target="_blank" rel="noopener">${ICONES.zap}${esc(d.ctaPrincipal?.trim() || texto)}</a>`;
  const tel = linkTel(d);
  if (tel) return `<a class="${classe}" href="${tel}">${ICONES.tel}Ligar agora</a>`;
  return "";
};
var servicosValidos = (d) => (d.servicos || []).filter((s) => s.titulo.trim() || s.descricao.trim()).slice(0, 6);
var depoimentosValidos = (d) => (d.depoimentos || []).filter((x) => x.texto.trim()).slice(0, 3);
var seloGoogle = (d, classe = "selo-google") => {
  const nota = Number(d.nota);
  if (!nota || nota < 3.5) return "";
  const qtd = d.avaliacoes ? `${Number(d.avaliacoes).toLocaleString("pt-BR")} avalia\xE7\xF5es no Google` : "no Google";
  return `<div class="${classe}"><span class="estrelas">\u2605\u2605\u2605\u2605\u2605</span><b>${nota.toFixed(1).replace(".", ",")}</b><span>${esc(qtd)}</span></div>`;
};
var svg = (d) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
var ICONES = {
  zap: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.2l-.9 1.2c-.2.2-.3.2-.6.1-1.6-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.6.7.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3M12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.9 9.9 0 1112 21.8M20.5 3.5A11.8 11.8 0 0012 0C5.5 0 .2 5.3.2 11.9c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.7c1.7.9 3.7 1.4 5.7 1.4 6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.4-8.3"/></svg>',
  tel: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>'),
  mapa: svg('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
  relogio: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
  insta: svg('<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.4A4 4 0 1 1 12.6 8 4 4 0 0 1 16 11.4z"/><path d="M17.5 6.5h.01"/>'),
  email: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
  seta: svg('<path d="M5 12h14M13 5l7 7-7 7"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  estrela: svg('<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>'),
  coracao: svg('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.8 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>'),
  escudo: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
  brilho: svg('<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>')
};
var iconeDoServico = (i) => [ICONES.brilho, ICONES.escudo, ICONES.coracao, ICONES.estrela, ICONES.check, ICONES.relogio][i % 6];
var cssRaiz = (d, f) => `
:root{--p:${marcaLegivel(d.corPrimaria)};--p-esc:${ajustarCor(marcaLegivel(d.corPrimaria), -40)};--p-cla:${ajustarCor(d.corPrimaria, 175)};
  --p-texto:${garantirContraste(d.corPrimaria)};
  --d:${marcaLegivel(d.corDestaque)};--sobre-p:${letraSobre(marcaLegivel(d.corPrimaria))};--sobre-d:${letraSobre(marcaLegivel(d.corDestaque))};
  --fonte-t:${f.titulos};--fonte-c:${f.corpo}}
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:#fff;color:#16181d;font-family:var(--fonte-c);font-size:var(--t0,17px);line-height:1.6;
  -webkit-font-smoothing:antialiased;color-scheme:light}
img{max-width:100%;display:block}
a{color:inherit;text-decoration:none}
h1,h2,h3{font-family:var(--fonte-t);line-height:1.1;margin:0 0 .5em;font-weight:700}
p{margin:0 0 1em}
.wrap{width:min(1180px,90vw);margin:0 auto}
.btn{display:inline-flex;align-items:center;gap:10px;padding:16px 28px;font-weight:700;font-size:16px;
  border:0;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease,background .2s}
.btn:hover{transform:translateY(-2px)}
.btn svg{flex:none}
@keyframes sobe{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
.sobe{animation:sobe .9s cubic-bezier(.2,.7,.2,1) both}
.sobe-2{animation-delay:.12s}.sobe-3{animation-delay:.24s}.sobe-4{animation-delay:.36s}
.estrelas{color:#f5b301;letter-spacing:2px}
@media(prefers-reduced-motion:reduce){.sobe{animation:none}}
@media(max-width:760px){.btn{width:100%;justify-content:center}}
`;
var rodapePremium = (d, classe = "rp") => {
  const tel = linkTel(d), zap = linkZap(d), mapa = linkMapa(d), ig = linkInsta(d);
  return `<footer class="${classe}"><div class="wrap ${classe}-grade">
  <div><div class="${classe}-marca">${logo(d, `${classe}-logo`)}<b>${esc(d.empresa)}</b></div>
    ${d.slogan ? `<p class="${classe}-sub">${esc(d.slogan)}</p>` : ""}</div>
  <div><h4>Contato</h4>
    ${tel ? `<a href="${tel}">${ICONES.tel}${esc(d.telefone)}</a>` : ""}
    ${zap ? `<a href="${zap}" target="_blank" rel="noopener">${ICONES.zap}WhatsApp</a>` : ""}
    ${d.email ? `<a href="mailto:${esc(d.email)}">${ICONES.email}${esc(d.email)}</a>` : ""}
    ${ig ? `<a href="${ig}" target="_blank" rel="noopener">${ICONES.insta}Instagram</a>` : ""}</div>
  <div><h4>Visite</h4>
    ${d.endereco ? `<a href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}${esc(d.endereco)}</a>` : ""}
    ${d.horario ? `<span>${ICONES.relogio}${esc(d.horario)}</span>` : ""}</div>
</div><div class="wrap ${classe}-linha">\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${esc(d.empresa)}</div></footer>`;
};
var cssRodape = (classe = "rp", fundo = "#0e1014", texto = "#c6cad3") => `
.${classe}{background:${fundo};color:${texto};padding:72px 0 28px;font-size:15px}
.${classe}-grade{display:grid;gap:40px;grid-template-columns:1.4fr 1fr 1fr}
.${classe} h4{font-family:var(--fonte-t);color:#fff;font-size:15px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 16px}
.${classe} a,.${classe} span{display:flex;align-items:flex-start;gap:10px;margin:0 0 12px;color:${texto}}
.${classe} a:hover{color:#fff}
.${classe}-marca{display:flex;align-items:center;gap:12px;color:#fff;font-family:var(--fonte-t);font-size:20px;margin-bottom:12px}
.${classe}-logo-img{height:44px;width:auto}
.${classe}-logo-iniciais{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:800}
.${classe}-sub{color:${texto};max-width:340px}
.${classe}-linha{border-top:1px solid rgba(255,255,255,.1);margin-top:40px;padding-top:20px;font-size:13px;opacity:.7}
@media(max-width:760px){.${classe}-grade{grid-template-columns:1fr}}
`;

// src/templates/sites/secoes-extras.ts
var ICONES_DIF = [ICONES.escudo, ICONES.relogio, ICONES.estrela, ICONES.coracao, ICONES.check, ICONES.brilho];
var aparece = (d, id) => d.secoes?.[id] !== false;
var itens = (lista, max = 6) => (lista || []).filter((i) => (i.titulo || "").trim() && (i.texto || "").trim()).slice(0, max);
var secoesQueEntram = (d, jaTem) => {
  const tem2 = (id) => jaTem.includes(`id="${id}"`);
  const saida = [];
  if (aparece(d, "diferenciais") && itens(d.diferenciais).length && !tem2("diferenciais")) saida.push("diferenciais");
  if (aparece(d, "passos") && itens(d.passos, 4).length && !tem2("passos")) saida.push("passos");
  if (aparece(d, "faq") && (d.faq || []).some((p) => p.pergunta?.trim() && p.resposta?.trim()) && !tem2("faq")) saida.push("faq");
  if (aparece(d, "ctaFinal") && (linkTel(d) || d.whatsapp || d.telefone) && !tem2("chamada")) saida.push("ctaFinal");
  return saida;
};
var secoesExtras = (d, jaTem) => {
  const entram = secoesQueEntram(d, jaTem);
  const partes = [];
  let cedo = "";
  let alt = true;
  const caixa = (classe) => {
    const c = `sx ${alt ? "sx-alt " : ""}${classe}`;
    alt = !alt;
    return c;
  };
  if (entram.includes("diferenciais")) {
    partes.push(`<section class="${caixa("sx-dif")}" id="diferenciais"><div class="wrap">
  <div class="sx-cab"><p class="sx-pre">Diferenciais</p><h2>Por que escolher a ${esc(d.empresa)}</h2></div>
  <ul class="sx-grade">${itens(d.diferenciais).map((x, i) => `<li><span class="sx-ic">${ICONES_DIF[i % ICONES_DIF.length]}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></li>`).join("")}</ul>
</div></section>`);
    cedo = partes.pop();
  }
  if (entram.includes("passos")) {
    partes.push(`<section class="${caixa("sx-pas")}" id="passos"><div class="wrap">
  <div class="sx-cab"><p class="sx-pre">Passo a passo</p><h2>Como funciona</h2><p>Simples, do primeiro contato at\xE9 o resultado.</p></div>
  <ol class="sx-passos">${itens(d.passos, 4).map((x) => `<li><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></li>`).join("")}</ol>
</div></section>`);
  }
  if (entram.includes("faq")) {
    const perguntas = (d.faq || []).filter((p) => p.pergunta?.trim() && p.resposta?.trim()).slice(0, 8);
    partes.push(`<section class="${caixa("sx-faq")}" id="faq"><div class="wrap">
  <div class="sx-cab"><p class="sx-pre">D\xFAvidas</p><h2>Perguntas frequentes</h2><p>As respostas para o que mais perguntam antes de entrar em contato.</p></div>
  <div class="sx-lista">${perguntas.map((p) => `<details><summary>${esc(p.pergunta)}</summary><div><p>${esc(p.resposta)}</p></div></details>`).join("")}</div>
</div></section>`);
  }
  if (entram.includes("ctaFinal")) {
    const tel = linkTel(d), mapa = linkMapa(d);
    partes.push(`<section class="sx sx-cta" id="chamada"><div class="wrap"><div class="sx-cta-in">
  <h2>Pronto para come\xE7ar?</h2><p>Chame no WhatsApp e conte o que voc\xEA precisa.</p>
  <div class="sx-cta-btns">${ctaPrincipal(d, "Falar no WhatsApp", "sx-btn sx-btn-1")}${tel ? `<a class="sx-btn sx-btn-2" href="${tel}">${ICONES.tel}Ligar agora</a>` : mapa ? `<a class="sx-btn sx-btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div>
</div></div></section>`);
  }
  return { cedo, resto: partes.join("\n") };
};
var cssExtras = (escuro = false) => `
:root{${escuro ? "--sx-fundo:#0f1115;--sx-alt:#14171c;--sx-texto:#eef0f4;--sx-suave:#a9b0bd;--sx-card:#181c23;--sx-borda:rgba(255,255,255,.1);--sx-icone:var(--d)" : "--sx-fundo:#ffffff;--sx-alt:#f5f6f8;--sx-texto:#1b1f27;--sx-suave:#566070;--sx-card:#ffffff;--sx-borda:#e4e8ee;--sx-icone:var(--p-texto)"};--sx-raio:18px}
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

// src/templates/sites/documento.ts
var REVELACAO = `
@supports (animation-timeline:view()){
  @keyframes rv-padrao{from{opacity:0;transform:translateY(34px)}to{opacity:1;transform:none}}
  main>section:not(:first-of-type) .wrap>*,body>section:not(:first-of-type) .wrap>*{animation:rv-padrao linear both;animation-timeline:view();animation-range:entry 3% entry 46%}
}
@media(prefers-reduced-motion:reduce){main>section .wrap>*,body>section .wrap>*{animation:none!important}}
`;
var pontoDeInsercao = (corpo) => {
  const contato = corpo.indexOf('id="contato"');
  if (contato >= 0) {
    const inicio = corpo.lastIndexOf("<section", contato);
    if (inicio >= 0) return inicio;
  }
  const rodape3 = corpo.lastIndexOf("<footer");
  return rodape3 >= 0 ? rodape3 : corpo.length;
};
var depoisDosServicos = (corpo) => {
  const m = /<section[^>]*(?:id="(?:servicos|menu|areas)"|class="[^"]*\b(?:servicos|cartoes|menu|areas)\b[^"]*")/.exec(corpo);
  if (!m) return -1;
  const fim2 = corpo.indexOf("</section>", m.index);
  return fim2 < 0 ? -1 : fim2 + "</section>".length;
};
var fundoEscuro = (css) => {
  const m = /body\{[^}]*?background:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b/.exec(css);
  return !!m && luminancia(m[1]) < 0.12;
};
var documentoPremium = (d, padrao, css, corpo, opcoes = {}) => {
  const f = d.fonte && FONTES[d.fonte] || padrao;
  const { cedo, resto } = secoesExtras(d, corpo);
  const extras = cedo + resto;
  let miolo = corpo;
  if (resto) {
    const i = pontoDeInsercao(corpo);
    miolo = `${corpo.slice(0, i)}${resto}
${corpo.slice(i)}`;
  }
  if (cedo) {
    const i = depoisDosServicos(miolo);
    miolo = i >= 0 ? `${miolo.slice(0, i)}${cedo}
${miolo.slice(i)}` : `${miolo.slice(0, pontoDeInsercao(miolo))}${cedo}
${miolo.slice(pontoDeInsercao(miolo))}`;
  }
  const { html, temMain } = envolverMain(miolo);
  const barra = barraAcaoMovel(linkTel(d), linkZap(d), ICONES.tel, ICONES.zap);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${cabecaSEO(d, d.schema || "LocalBusiness")}
${linkFontes(f)}
<style>${cssRaiz(d, f)}${cssProfissional()}${extras ? cssExtras(opcoes.escuro ?? fundoEscuro(css)) : ""}${css}${opcoes.semRevelacao ? "" : REVELACAO}</style>
</head>
<body>
${temMain ? '<a class="pular" href="#conteudo">Pular para o conte\xFAdo</a>' : ""}
${html}
${barra}
</body>
</html>`;
};

// src/templates/sites/premium.ts
var blocoContato = (d, classe, titulo2 = "Venha nos visitar") => {
  const mapa = linkMapa(d), tel = linkTel(d), ig = linkInsta(d);
  return `<section class="${classe}" id="contato"><div class="wrap ${classe}-in">
  <div><h2>${titulo2}</h2>
    ${d.endereco ? `<p class="${classe}-linha">${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ""}
    ${d.horario ? `<p class="${classe}-linha">${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ""}
    ${tel ? `<p class="${classe}-linha">${ICONES.tel}<a href="${tel}">${esc(d.telefone)}</a></p>` : ""}
    ${ig ? `<p class="${classe}-linha">${ICONES.insta}<a href="${ig}" target="_blank" rel="noopener">${esc(d.instagram)}</a></p>` : ""}
  </div>
  <div class="${classe}-acoes">
    ${ctaPrincipal(d, "Chamar no WhatsApp")}
    ${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}
  </div></div></section>`;
};
var depoimentosHtml = (d, classe, titulo2 = "Quem j\xE1 \xE9 cliente") => {
  const lista = depoimentosValidos(d);
  if (!lista.length) return "";
  return `<section class="${classe}"><div class="wrap"><h2>${titulo2}</h2><div class="${classe}-grade">${lista.map((x) => `<figure><span class="estrelas">\u2605\u2605\u2605\u2605\u2605</span><blockquote>\u201C${esc(x.texto)}\u201D</blockquote>${x.autor ? `<figcaption>${esc(x.autor)}</figcaption>` : ""}</figure>`).join("")}</div></div></section>`;
};
var galeriaHtml = (d, classe, titulo2 = "") => {
  const lista = fotos(d);
  if (!lista.length) return "";
  return `<section class="${classe}"><div class="wrap">${titulo2 ? `<h2>${titulo2}</h2>` : ""}<div class="${classe}-grade">${lista.map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} \u2014 foto ${i + 1}" loading="lazy"></figure>`).join("")}</div></div></section>`;
};
var zapFlutuante = (d) => {
  const zap = linkZap(d);
  return zap ? `<a class="zap-fixo" href="${zap}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICONES.zap}</a>` : "";
};
var cssComum = (d) => `
.zap-fixo{position:fixed;right:22px;bottom:22px;width:60px;height:60px;border-radius:50%;background:#25D366;color:#fff;
  display:grid;place-items:center;box-shadow:0 12px 30px -8px rgba(0,0,0,.45);z-index:60}
.zap-fixo svg{width:30px;height:30px}
${d.selo ? `.selo-leadsage{background:#0b0c0f;color:#8b90a0;text-align:center;padding:10px;font-size:12.5px}
.selo-leadsage a{color:#e2e5ec;font-weight:700}` : ""}
`;
var seloLeadsage = (d) => d.selo ? '<div class="selo-leadsage">Site criado com <a href="https://leadsageofc.vercel.app" target="_blank" rel="noopener">LeadSage</a></div>' : "";
var fim = (d, rodape3) => `${rodape3}${seloLeadsage(d)}${zapFlutuante(d)}`;
var slogan = (d, padrao) => esc(d.slogan || padrao);
var destaques = (d, padrao) => {
  const dados = (d.diferenciais || []).map((x) => x.titulo.trim()).filter(Boolean).slice(0, 3);
  return dados.length ? dados : padrao;
};
var passosDaClinica = (d) => {
  const lista = (d.passos || []).filter((p) => p.titulo.trim() && p.texto.trim()).slice(0, 4);
  return lista.length ? lista : [
    { titulo: "Voc\xEA chama", texto: "Pelo WhatsApp ou telefone, no hor\xE1rio que for melhor para voc\xEA." },
    { titulo: "Avalia\xE7\xE3o", texto: "Ouvimos e explicamos as op\xE7\xF5es com calma." },
    { titulo: "Acompanhamento", texto: "Plano combinado e acompanhamento de perto." }
  ];
};
var jaPergunta = (d, raiz) => (d.faq || []).some((p) => p.pergunta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(raiz));
var faqDaClinica = (d) => {
  const lista = (d.faq || []).filter((p) => p.pergunta.trim() && p.resposta.trim()).slice(0, 8);
  return lista.length ? lista : [
    { pergunta: "Como fa\xE7o para agendar?", resposta: "Pelo WhatsApp ou telefone. Encontramos o melhor hor\xE1rio para voc\xEA." }
  ];
};
var F_AURORA = {
  titulos: '"Fraunces",Georgia,serif',
  corpo: '"Inter",system-ui,sans-serif',
  google: "family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600;700"
};
var aurora = {
  id: "aurora",
  nome: "Aurora",
  descricao: "Foto em tela cheia, serifa elegante e card\xE1pio em lista. Feito para dar fome.",
  nichos: ["Padarias", "Cafeterias", "Restaurantes", "Confeitarias", "Pizzarias"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#1a1410"/><rect width="160" height="62" fill="${corPrimaria}" opacity=".55"/>
    <rect x="12" y="8" width="22" height="5" rx="2" fill="#fff" opacity=".9"/><rect x="110" y="8" width="38" height="5" rx="2" fill="#fff" opacity=".6"/>
    <rect x="40" y="26" width="80" height="9" rx="2" fill="#fff"/><rect x="58" y="40" width="44" height="4" rx="2" fill="#fff" opacity=".7"/>
    <rect x="64" y="49" width="32" height="7" rx="3.5" fill="${corDestaque}"/>
    <rect x="12" y="72" width="62" height="3" fill="#fff" opacity=".5"/><rect x="12" y="80" width="62" height="3" fill="#fff" opacity=".5"/>
    <rect x="86" y="70" width="62" height="32" rx="3" fill="#fff" opacity=".18"/></svg>`,
  render: (d) => {
    const partes = partirSobre(d, "Receitas da casa, ingredientes escolhidos e aquele cheiro que chama de longe.", "Come\xE7amos com uma receita de fam\xEDlia e a vontade de servir o bairro todos os dias. Hoje cada fornada carrega o mesmo cuidado.");
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || "";
    const servicos = servicosValidos(d);
    return documentoPremium(d, F_AURORA, `
.topo{position:absolute;inset:0 0 auto;z-index:5;padding:26px 0}
.topo .wrap{display:flex;align-items:center;justify-content:space-between}
.topo-marca{display:flex;align-items:center;gap:12px;color:#fff;font-family:var(--fonte-t);font-size:22px}
.logo-img{height:46px;width:auto}
.logo-iniciais{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;border:1.5px solid rgba(255,255,255,.7);color:#fff;font-weight:700}
.topo nav{display:flex;gap:28px;color:rgba(255,255,255,.85);font-size:15px}
.topo nav a:hover{color:#fff}
.capa{min-height:100vh;display:grid;place-items:center;text-align:center;color:#fff;padding:140px 0 100px;${fundoFoto(capa, d.corPrimaria, "rgba(10,8,6,.35),rgba(10,8,6,.75)")}}
.capa .pre{letter-spacing:.32em;text-transform:uppercase;font-size:13px;color:#fff;margin-bottom:18px;display:inline-block;padding:7px 14px;border:1px solid rgba(255,255,255,.45);border-radius:999px;backdrop-filter:blur(4px)}
.capa h1{font-size:clamp(44px,7.5vw,96px);font-weight:500;max-width:14ch;margin:0 auto 22px;letter-spacing:-.02em}
.capa p{font-size:19px;max-width:560px;margin:0 auto 34px;color:rgba(255,255,255,.85)}
.capa .btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.btn-1{background:var(--d);color:var(--sobre-d);border-radius:999px}
.btn-2{background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.6);border-radius:999px}
.selo-google{display:inline-flex;gap:10px;align-items:center;margin-top:34px;font-size:14px;color:rgba(255,255,255,.85)}
.historia{padding:120px 0}
.historia .wrap{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center}
.historia .foto{aspect-ratio:4/5;border-radius:4px;overflow:hidden;background:#eee;box-shadow:24px 24px 0 var(--p-cla)}
.historia .foto img{width:100%;height:100%;object-fit:cover}
.historia .pre{color:var(--p);letter-spacing:.25em;text-transform:uppercase;font-size:13px;font-weight:600}
.historia h2{font-size:clamp(34px,4.5vw,54px);font-weight:500}
.historia p{color:#4a4f5a;font-size:18px}
.menu{background:#faf6f0;padding:110px 0}
.menu h2{text-align:center;font-size:clamp(34px,4.5vw,52px);font-weight:500;margin-bottom:56px}
.menu-grade{display:grid;grid-template-columns:1fr 1fr;gap:12px 72px;max-width:980px;margin:0 auto}
.prato{padding:20px 0;border-bottom:1px solid #e8dfd2}
.prato-topo{display:flex;align-items:baseline;gap:12px}
.prato h3{font-size:22px;font-weight:600;margin:0;padding-left:16px;border-left:3px solid var(--d)}
.prato p{color:#6b6257;margin:6px 0 0 19px;font-size:16px}
.galeria{padding:110px 0}
.galeria h2{text-align:center;font-size:clamp(32px,4vw,48px);font-weight:500;margin-bottom:44px}
.galeria-grade{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:240px;gap:14px}
.galeria-grade figure{margin:0;overflow:hidden;border-radius:4px}
.galeria-grade figure:nth-child(1){grid-column:span 2;grid-row:span 2}
.galeria-grade img{width:100%;height:100%;object-fit:cover;transition:transform .6s}
.galeria-grade figure:hover img{transform:scale(1.06)}
.vozes{background:var(--p);color:var(--sobre-p);padding:110px 0}
.vozes h2{text-align:center;font-size:clamp(32px,4vw,48px);font-weight:500;margin-bottom:48px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:28px}
.vozes figure{margin:0;padding:34px;background:rgba(255,255,255,.08);border-radius:4px}
.vozes blockquote{margin:12px 0 18px;font-family:var(--fonte-t);font-size:21px;line-height:1.45}
.vozes figcaption{opacity:.75;font-size:14px;letter-spacing:.1em;text-transform:uppercase}
.visita{padding:110px 0}
.visita-in{display:grid;grid-template-columns:1.2fr 1fr;gap:60px;align-items:center}
.visita h2{font-size:clamp(34px,4.5vw,52px);font-weight:500}
.visita-linha{display:flex;gap:14px;align-items:flex-start;font-size:18px;color:#3a3f4a}
.visita-linha svg{color:var(--p);margin-top:4px}
.visita-acoes{display:flex;flex-direction:column;gap:14px;align-items:stretch}
.visita .btn-1{justify-content:center}
.visita .btn-2{color:var(--p);border-color:var(--p);justify-content:center}
${cssRodape("rp", "#14110e")}${cssComum(d)}
@media(max-width:860px){.topo nav{display:none}.historia .wrap,.visita-in,.menu-grade{grid-template-columns:1fr;gap:40px}
  .galeria-grade{grid-template-columns:1fr 1fr;grid-auto-rows:170px}}
`, `
<header class="topo"><div class="wrap">
  <a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav><a href="#historia">Nossa hist\xF3ria</a>${servicos.length ? '<a href="#menu">Card\xE1pio</a>' : ""}<a href="#contato">Visite</a></nav>
</div></header>
<section class="capa"><div class="wrap">
  <div class="pre sobe">${esc(d.categoria || "Feito com carinho")}</div>
  <h1 class="sobe sobe-2">${slogan(d, d.empresa)}</h1>
  <p class="sobe sobe-3">${partes[0]}</p>
  <div class="btns sobe sobe-4">${ctaPrincipal(d, "Fazer pedido")}${linkMapa(d) ? `<a class="btn btn-2" href="${linkMapa(d)}" target="_blank" rel="noopener">Como chegar</a>` : ""}</div>
  ${seloGoogle(d)}
</div></section>
<section class="historia" id="historia"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ""}
  <div><div class="pre">Nossa hist\xF3ria</div><h2>${esc(d.empresa)}</h2>
  <p>${partes[1]}</p></div>
</div></section>
${servicos.length ? `<section class="menu" id="menu"><div class="wrap"><h2>Da nossa cozinha</h2><div class="menu-grade">${servicos.map((s) => `<div class="prato"><div class="prato-topo"><h3>${esc(s.titulo)}</h3></div>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ""}</div>`).join("")}</div></div></section>` : ""}
${galeriaHtml(d, "galeria", "Um pouco do nosso dia")}
${depoimentosHtml(d, "vozes", "O que dizem por a\xED")}
${blocoContato(d, "visita", "Passe por aqui")}
${fim(d, rodapePremium(d))}`);
  }
};
var F_CLINICA = {
  titulos: '"Plus Jakarta Sans",system-ui,sans-serif',
  corpo: '"Plus Jakarta Sans",system-ui,sans-serif',
  google: "family=Plus+Jakarta+Sans:wght@400;500;600;700;800"
};
var clinica = {
  id: "clinica",
  nome: "Cl\xEDnica",
  descricao: "Capa dividida com selo do Google, passos do atendimento e perguntas frequentes. Passa confian\xE7a.",
  nichos: ["Cl\xEDnicas Odontol\xF3gicas", "Cl\xEDnicas M\xE9dicas", "Fisioterapia", "Est\xE9tica", "Psicologia", "Nutri\xE7\xE3o"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#fff"/><rect width="160" height="7" fill="${corPrimaria}"/>
    <rect x="10" y="12" width="26" height="5" rx="2" fill="${corPrimaria}"/><rect x="118" y="11" width="32" height="7" rx="3.5" fill="${corDestaque}"/>
    <rect x="10" y="32" width="64" height="8" rx="2" fill="#1f2937"/><rect x="10" y="44" width="54" height="4" rx="2" fill="#9ca3af"/>
    <rect x="10" y="56" width="30" height="8" rx="4" fill="${corPrimaria}"/>
    <rect x="86" y="26" width="64" height="52" rx="10" fill="${corPrimaria}" opacity=".22"/><rect x="78" y="62" width="36" height="14" rx="5" fill="#fff" stroke="#e5e7eb"/>
    <rect x="10" y="86" width="40" height="18" rx="5" fill="#f3f4f6"/><rect x="60" y="86" width="40" height="18" rx="5" fill="#f3f4f6"/><rect x="110" y="86" width="40" height="18" rx="5" fill="#f3f4f6"/></svg>`,
  render: (d) => {
    const partes = partirSobre(d, "Atendimento atencioso, explica\xE7\xE3o clara de cada etapa e estrutura pensada no seu conforto.", "Uma equipe que acredita que bom atendimento \xE9 ouvir antes de tratar.");
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || "";
    const servicos = servicosValidos(d);
    const tel = linkTel(d);
    return documentoPremium(d, F_CLINICA, `
.barra{background:var(--p-esc);color:#fff;font-size:14px}
.barra .wrap{display:flex;gap:28px;justify-content:flex-end;padding:9px 0}
.barra span,.barra a{display:flex;align-items:center;gap:8px;opacity:.9}
.barra svg{width:16px;height:16px}
.topo{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid #eef0f3}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;padding:16px 0}
.topo-marca{display:flex;align-items:center;gap:12px;font-weight:800;font-size:19px;color:#0f172a}
.logo-img{height:42px;width:auto}
.logo-iniciais{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:800}
.topo nav{display:flex;gap:30px;font-weight:600;font-size:15px;color:#475569}
.btn-1{background:var(--p);color:var(--sobre-p);border-radius:14px;box-shadow:0 14px 30px -12px var(--p)}
.btn-2{background:#fff;color:var(--p);border:1.5px solid #dbe1ea;border-radius:14px}
.capa{padding:80px 0 100px;background:linear-gradient(180deg,var(--p-cla),#fff)}
.capa .wrap{display:grid;grid-template-columns:1.05fr 1fr;gap:64px;align-items:center}
.etiqueta{display:inline-flex;gap:8px;align-items:center;background:#fff;border:1px solid #e6eaf0;padding:8px 14px;border-radius:999px;font-size:14px;font-weight:600;color:var(--p)}
.capa h1{font-size:clamp(38px,5.4vw,64px);letter-spacing:-.03em;color:#0b1220;margin:22px 0 20px;font-weight:800}
.capa h1 em{font-style:normal;color:var(--p)}
.capa p{font-size:19px;color:#4b5565;max-width:520px;margin-bottom:32px}
.capa .btns{display:flex;gap:14px;flex-wrap:wrap}
.capa-foto{position:relative}
.capa-foto .img{aspect-ratio:1/1.05;border-radius:28px;overflow:hidden;${fundoFoto(capa, d.corPrimaria, "rgba(0,0,0,0),rgba(0,0,0,.05)")}}
.selo-google{position:absolute;left:-28px;bottom:36px;background:#fff;border-radius:18px;padding:16px 20px;box-shadow:0 24px 50px -20px rgba(15,23,42,.35);
  display:grid;gap:2px;font-size:13px;color:#64748b}
.selo-google b{font-size:28px;color:#0b1220;line-height:1}
.selo-google .estrelas{font-size:14px}
.servicos{padding:110px 0}
.titulo{text-align:center;max-width:640px;margin:0 auto 56px}
.titulo h2{font-size:clamp(32px,4vw,46px);letter-spacing:-.02em;font-weight:800;color:#0b1220}
.titulo p{color:#64748b;font-size:18px}
.cartoes{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.cartao{padding:32px;border:1px solid #edf0f4;border-radius:22px;background:#fff;transition:box-shadow .25s,transform .25s}
.cartao:hover{transform:translateY(-4px);box-shadow:0 30px 60px -30px rgba(15,23,42,.3)}
.cartao .ic{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;background:var(--p-cla);color:var(--p);margin-bottom:22px}
.cartao h3{font-size:21px;color:#0b1220}
.cartao p{color:#64748b;margin:0}
.passos{background:#0b1220;color:#fff;padding:110px 0}
.passos .titulo h2{color:#fff}.passos .titulo p{color:#94a3b8}
.passos-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;counter-reset:passo}
.passo{padding:30px;border-radius:22px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
.passo::before{counter-increment:passo;content:'0' counter(passo);font-weight:800;font-size:40px;color:var(--d);display:block;margin-bottom:10px}
.passo h3{font-size:20px}.passo p{color:#94a3b8;margin:0}
.sobre{padding:110px 0}
.sobre .wrap{display:grid;grid-template-columns:1fr 1.1fr;gap:72px;align-items:center}
.sobre .foto{aspect-ratio:5/4;border-radius:26px;overflow:hidden;background:var(--p-cla)}
.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(30px,3.6vw,42px);font-weight:800;color:#0b1220;letter-spacing:-.02em}
.sobre p{color:#4b5565;font-size:18px}
.lista{list-style:none;padding:0;margin:24px 0 0;display:grid;gap:12px}
.lista li{display:flex;gap:12px;font-weight:600;color:#1e293b}
.lista svg{color:var(--p);flex:none}
.vozes{background:var(--p-cla);padding:110px 0}
.vozes h2{text-align:center;font-size:clamp(30px,3.6vw,42px);font-weight:800;color:#0b1220;margin-bottom:44px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}
.vozes figure{margin:0;background:#fff;border-radius:22px;padding:30px}
.vozes blockquote{margin:12px 0 16px;color:#334155;font-size:17px}
.vozes figcaption{font-weight:700;color:#0b1220}
.galeria{padding:0 0 110px}
.galeria h2{text-align:center;font-size:clamp(30px,3.6vw,42px);font-weight:800;color:#0b1220;margin-bottom:40px}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.galeria-grade figure{margin:0;aspect-ratio:4/3;border-radius:20px;overflow:hidden}
.galeria-grade img{width:100%;height:100%;object-fit:cover}
.faq{padding:110px 0}
.faq-lista{max-width:780px;margin:0 auto}
.faq details{border-bottom:1px solid #e6eaf0;padding:22px 0}
.faq summary{cursor:pointer;font-weight:700;font-size:18px;color:#0b1220;list-style:none;display:flex;justify-content:space-between}
.faq summary::after{content:'+';color:var(--p);font-size:24px;line-height:1}
.faq details[open] summary::after{content:'\u2212'}
.faq p{color:#64748b;margin:12px 0 0}
.chamada{padding:0 0 110px}
.chamada-in{background:linear-gradient(120deg,var(--p),var(--p-esc));color:var(--sobre-p);border-radius:32px;padding:64px;display:flex;
  gap:32px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.chamada h2{font-size:clamp(28px,3.4vw,40px);font-weight:800;margin:0;max-width:18ch}
.chamada .btn-1{background:#fff;color:var(--p)}
${cssRodape("rp", "#0b1220", "#94a3b8")}${cssComum(d)}
@media(max-width:900px){.barra{display:none}.topo nav{display:none}.capa .wrap,.sobre .wrap{grid-template-columns:1fr}.galeria-grade{grid-template-columns:1fr 1fr}
  .cartoes,.passos-grade{grid-template-columns:1fr}.selo-google{left:16px}.chamada-in{padding:40px}}
`, `
${d.horario || d.endereco ? `<div class="barra"><div class="wrap">${d.horario ? `<span>${ICONES.relogio}${esc(d.horario)}</span>` : ""}${d.endereco ? `<span>${ICONES.mapa}${esc(d.endereco)}</span>` : ""}${tel ? `<a href="${tel}">${ICONES.tel}${esc(d.telefone)}</a>` : ""}</div></div>` : ""}
<header class="topo"><div class="wrap">
  <a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav><a href="#servicos">Tratamentos</a><a href="#sobre">A cl\xEDnica</a><a href="#contato">Contato</a></nav>
  ${ctaPrincipal(d, "Agendar")}
</div></header>
<section class="capa"><div class="wrap">
  <div><span class="etiqueta sobe">${ICONES.escudo}${esc(d.categoria || "Atendimento humanizado")}</span>
    <h1 class="sobe sobe-2">${slogan(d, "Cuidado de verdade, do primeiro contato ao resultado")}</h1>
    <p class="sobe sobe-3">${partes[0]}</p>
    <div class="btns sobe sobe-4">${ctaPrincipal(d, "Agendar avalia\xE7\xE3o")}<a class="btn btn-2" href="#servicos">Ver tratamentos</a></div></div>
  <div class="capa-foto sobe sobe-2"><div class="img"></div>${seloGoogle(d)}</div>
</div></section>
${servicos.length ? `<section class="servicos" id="servicos"><div class="wrap"><div class="titulo"><h2>Como podemos ajudar</h2><p>Cada tratamento come\xE7a por uma conversa: entender o que voc\xEA precisa antes de propor qualquer coisa.</p></div>
<div class="cartoes">${servicos.map((s, i) => `<div class="cartao"><div class="ic">${iconeDoServico(i)}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join("")}</div></div></section>` : ""}
${d.secoes?.passos === false ? "" : `<section class="passos" id="passos"><div class="wrap"><div class="titulo"><h2>Como funciona</h2><p>Sem surpresa: voc\xEA sabe o que acontece em cada etapa.</p></div>
<div class="passos-grade">${passosDaClinica(d).map((p) => `<div class="passo"><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join("")}</div></div></section>`}
<section class="sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ""}
  <div><h2>Sobre a ${esc(d.empresa)}</h2><p>${partes[1]}</p>
  <ul class="lista">${destaques(d, ["Agendamento pelo WhatsApp", "Explica\xE7\xE3o de cada etapa", "Atendimento com aten\xE7\xE3o"]).map((t) => `<li>${ICONES.check}${esc(t)}</li>`).join("")}</ul></div>
</div></section>
${galeriaHtml(d, "galeria", "Nossa estrutura")}
${depoimentosHtml(d, "vozes", "Pacientes que confiam")}
${d.secoes?.faq === false ? "" : `<section class="faq" id="faq"><div class="wrap"><div class="titulo"><h2>Perguntas frequentes</h2></div><div class="faq-lista">
  ${faqDaClinica(d).map((p) => `<details><summary>${esc(p.pergunta)}</summary><p>${esc(p.resposta)}</p></details>`).join("")}
  ${d.horario && !jaPergunta(d, "horario") ? `<details><summary>Qual o hor\xE1rio de atendimento?</summary><p>${esc(d.horario)}.</p></details>` : ""}
  ${d.endereco && !jaPergunta(d, "endereco") ? `<details><summary>Onde voc\xEAs ficam?</summary><p>${esc(d.endereco)}.</p></details>` : ""}
</div></div></section>`}
${d.secoes?.ctaFinal === false ? "" : `<section class="chamada" id="chamada"><div class="wrap"><div class="chamada-in"><h2>Agende sua avalia\xE7\xE3o</h2>${ctaPrincipal(d, "Agendar pelo WhatsApp")}</div></div></section>`}
${fim(d, rodapePremium(d))}`);
  }
};
var F_OFICINA = {
  titulos: '"Archivo",system-ui,sans-serif',
  corpo: '"Inter",system-ui,sans-serif',
  google: "family=Archivo:wdth,wght@112,700;112,800;112,900&family=Inter:wght@400;500;600"
};
var oficina = {
  id: "oficina",
  nome: "Oficina",
  descricao: "Capa escura em diagonal, letras fortes e telefone em destaque. Para servi\xE7o que resolve.",
  nichos: ["Mec\xE2nicas", "Constru\xE7\xE3o", "Reformas", "El\xE9trica", "Funilaria", "Materiais de Constru\xE7\xE3o"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#f4f4f5"/><path d="M0 0h160v60L0 76z" fill="#111"/><path d="M0 0h70v70L0 76z" fill="${corPrimaria}" opacity=".5"/>
    <rect x="10" y="22" width="76" height="10" fill="#fff"/><rect x="10" y="36" width="56" height="10" fill="${corDestaque}"/>
    <rect x="10" y="52" width="34" height="8" fill="${corDestaque}"/>
    <rect x="0" y="80" width="160" height="12" fill="${corDestaque}"/><rect x="10" y="96" width="40" height="8" fill="#d4d4d8"/><rect x="60" y="96" width="40" height="8" fill="#d4d4d8"/><rect x="110" y="96" width="40" height="8" fill="#d4d4d8"/></svg>`,
  render: (d) => {
    const partes = partirSobre(d, "Or\xE7amento combinado antes do servi\xE7o e atendimento direto pelo WhatsApp.", "Conte o problema, receba o or\xE7amento e combine o hor\xE1rio. Sem enrola\xE7\xE3o.");
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || "";
    const servicos = servicosValidos(d);
    const tel = linkTel(d);
    const nota = Number(d.nota);
    return documentoPremium(d, F_OFICINA, `
h1,h2,h3{text-transform:uppercase;font-stretch:112%;letter-spacing:-.01em}
.topo{position:absolute;inset:0 0 auto;z-index:5}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;padding:22px 0}
.topo-marca{display:flex;align-items:center;gap:12px;color:#fff;font-family:var(--fonte-t);font-weight:900;font-size:20px;text-transform:uppercase}
.logo-img{height:44px;width:auto}
.logo-iniciais{width:44px;height:44px;display:grid;place-items:center;background:var(--d);color:var(--sobre-d);font-weight:900;font-family:var(--fonte-t)}
.topo-tel{color:#fff;font-family:var(--fonte-t);font-weight:800;font-size:18px;display:flex;gap:10px;align-items:center}
.topo-tel svg{color:var(--d)}
.capa{position:relative;color:#fff;padding:170px 0 150px;clip-path:polygon(0 0,100% 0,100% 86%,0 100%);
  ${fundoFoto(capa, "#111", "rgba(8,8,10,.6),rgba(8,8,10,.88)")}}
.capa h1{font-size:clamp(46px,8vw,104px);font-weight:900;line-height:.95;max-width:12ch;margin-bottom:24px}
.capa h1 span{color:var(--d)}
.capa p{font-size:19px;max-width:540px;color:#d4d4d8;margin-bottom:36px}
.btn-1{background:var(--d);color:var(--sobre-d);font-family:var(--fonte-t);text-transform:uppercase;letter-spacing:.04em}
.btn-2{background:transparent;color:#fff;border:2px solid #fff;font-family:var(--fonte-t);text-transform:uppercase;letter-spacing:.04em}
.capa .btns{display:flex;gap:14px;flex-wrap:wrap}
.numeros{margin-top:-60px;position:relative;z-index:3}
.numeros .wrap{display:grid;grid-template-columns:repeat(3,1fr);background:var(--p);color:var(--sobre-p)}
.num{padding:34px 28px;border-right:1px solid rgba(255,255,255,.15)}
.num b{display:block;font-family:var(--fonte-t);font-size:44px;font-weight:900;line-height:1}
.num span{opacity:.85;font-size:15px}
.servicos{padding:120px 0 100px}
.cab{display:flex;justify-content:space-between;align-items:end;gap:30px;margin-bottom:50px;flex-wrap:wrap}
.cab h2{font-size:clamp(34px,5vw,62px);font-weight:900;margin:0;max-width:14ch}
.cab p{max-width:420px;color:#52525b;margin:0}
.grade{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;background:#e4e4e7;border:2px solid #e4e4e7}
.item{background:#fff;padding:38px 32px;position:relative}
.item .n{display:block;font-family:var(--fonte-t);font-weight:900;font-size:15px;color:var(--d);background:#111;padding:4px 8px;width:max-content;margin-bottom:16px;letter-spacing:.08em}
.item h3{font-size:22px;font-weight:800;margin-bottom:10px;position:relative}
.item p{color:#52525b;margin:0;position:relative}
.item:hover{background:#111;color:#fff}.item:hover p{color:#a1a1aa}.item:hover .n{background:var(--d);color:#111}
.sobre{background:#111;color:#fff;padding:120px 0}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center}
.sobre .foto{aspect-ratio:4/3;overflow:hidden;border-left:8px solid var(--d)}
.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(32px,4.4vw,54px);font-weight:900}
.sobre p{color:#a1a1aa;font-size:18px}
.lista{list-style:none;padding:0;margin:24px 0 0;display:grid;gap:14px}
.lista li{display:flex;gap:12px;font-weight:600}.lista svg{color:var(--d)}
.galeria{padding:110px 0}
.galeria h2{font-size:clamp(32px,4.4vw,54px);font-weight:900;margin-bottom:40px}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.galeria-grade figure{margin:0;aspect-ratio:1;overflow:hidden}
.galeria-grade img{width:100%;height:100%;object-fit:cover;filter:grayscale(.2);transition:transform .5s,filter .5s}
.galeria-grade figure:hover img{transform:scale(1.05);filter:none}
.vozes{background:#f4f4f5;padding:110px 0}
.vozes h2{font-size:clamp(32px,4.4vw,54px);font-weight:900;margin-bottom:40px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.vozes figure{margin:0;background:#fff;padding:32px;border-top:5px solid var(--d)}
.vozes blockquote{margin:12px 0 16px;font-size:17px;color:#27272a}
.vozes figcaption{font-family:var(--fonte-t);font-weight:800;text-transform:uppercase}
.ligue{background:var(--d);color:var(--sobre-d);padding:90px 0;text-align:center}
.ligue h2{font-size:clamp(30px,4.4vw,52px);font-weight:900}
.ligue a.tel{display:inline-block;font-family:var(--fonte-t);font-weight:900;font-size:clamp(36px,7vw,84px);margin:8px 0 24px}
.ligue .btn-1{background:#111;color:#fff}
${cssRodape("rp", "#09090b", "#a1a1aa")}${cssComum(d)}
@media(max-width:860px){.topo-tel{display:none}.numeros .wrap,.grade,.sobre .wrap,.galeria-grade{grid-template-columns:1fr}
  .num{border-right:0;border-bottom:1px solid rgba(255,255,255,.15)}}
`, `
<header class="topo"><div class="wrap">
  <a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  ${tel ? `<a class="topo-tel" href="${tel}">${ICONES.tel}${esc(d.telefone)}</a>` : ""}
</div></header>
<section class="capa"><div class="wrap">
  <h1 class="sobe">${esc(d.slogan || "Servi\xE7o bem feito,")} ${d.slogan ? "" : "<span>sem enrola\xE7\xE3o</span>"}</h1>
  <p class="sobe sobe-2">${partes[0]}</p>
  <div class="btns sobe sobe-3">${ctaPrincipal(d, "Pedir or\xE7amento")}${servicos.length ? '<a class="btn btn-2" href="#servicos">Nossos servi\xE7os</a>' : ""}</div>
</div></section>
<section class="numeros"><div class="wrap">
  <div class="num"><b>${nota >= 3.5 ? nota.toFixed(1).replace(".", ",") + "\u2605" : "Or\xE7amento"}</b><span>${nota >= 3.5 ? `${d.avaliacoes || ""} avalia\xE7\xF5es no Google` : "or\xE7amento antes do servi\xE7o"}</span></div>
  <div class="num"><b>${servicos.length || "+"}</b><span>${servicos.length ? "tipos de servi\xE7o" : "servi\xE7os sob medida"}</span></div>
  <div class="num"><b>\u2713</b><span>${d.whatsapp ? "atendimento pelo WhatsApp" : "contato por telefone"}</span></div>
</div></section>
${servicos.length ? `<section class="servicos" id="servicos"><div class="wrap"><div class="cab"><h2>O que a gente resolve</h2><p>Veja o que fazemos e pe\xE7a o seu or\xE7amento.</p></div>
<div class="grade">${servicos.map((s, i) => `<div class="item"><span class="n">${String(i + 1).padStart(2, "0")}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join("")}</div></div></section>` : ""}
<section class="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ""}
  <div><h2>Por que a ${esc(d.empresa)}</h2><p>${partes[1]}</p>
  <ul class="lista">${destaques(d, ["Atendimento direto pelo WhatsApp", "Or\xE7amento combinado antes do servi\xE7o", "Explica\xE7\xE3o do que ser\xE1 feito"]).map((t) => `<li>${ICONES.check}${esc(t)}</li>`).join("")}</ul></div>
</div></section>
${galeriaHtml(d, "galeria", "Trabalhos recentes")}
${depoimentosHtml(d, "vozes", "Clientes falando")}
<section class="ligue" id="contato"><div class="wrap"><h2>Precisa resolver hoje?</h2>
  ${tel ? `<a class="tel" href="${tel}">${esc(d.telefone)}</a><br>` : ""}${ctaPrincipal(d, "Chamar no WhatsApp")}
  ${d.endereco ? `<p style="margin-top:22px">${esc(d.endereco)}${d.horario ? ` \xB7 ${esc(d.horario)}` : ""}</p>` : ""}
</div></section>
${fim(d, rodapePremium(d))}`);
  }
};
var F_ESTUDIO = {
  titulos: '"Cormorant Garamond",Georgia,serif',
  corpo: '"Jost",system-ui,sans-serif',
  google: "family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Jost:wght@300;400;500;600"
};
var estudio = {
  id: "estudio",
  nome: "Est\xFAdio",
  descricao: "Fundo escuro, detalhes dourados e serifa fina. Para quem vende estilo.",
  nichos: ["Barbearias", "Sal\xF5es de Beleza", "Est\xE9tica", "Tatuagem", "Moda", "Joalherias"],
  miniatura: ({ corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#0d0c0b"/><rect x="66" y="8" width="28" height="5" rx="1" fill="${corDestaque}"/>
    <rect x="30" y="30" width="100" height="10" fill="#f5efe6"/><rect x="50" y="44" width="60" height="4" fill="#8a8178"/>
    <rect x="62" y="54" width="36" height="8" fill="none" stroke="${corDestaque}"/>
    <rect x="12" y="72" width="40" height="32" fill="#2a2622"/><rect x="60" y="72" width="40" height="32" fill="#3a342e"/><rect x="108" y="72" width="40" height="32" fill="#2a2622"/></svg>`,
  render: (d) => {
    const partes = partirSobre(d, "T\xE9cnica, aten\xE7\xE3o aos detalhes e um ambiente feito para voc\xEA relaxar.", "Mais do que um servi\xE7o, uma experi\xEAncia: hora marcada, aten\xE7\xE3o total e o resultado que voc\xEA imaginou.");
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || "";
    const servicos = servicosValidos(d);
    return documentoPremium(d, F_ESTUDIO, `
body{background:#0d0c0b;color:#e9e3da;font-weight:300}
h1,h2,h3{font-weight:500}
.topo{position:absolute;inset:0 0 auto;z-index:5;padding:30px 0;text-align:center}
.topo-marca{display:inline-flex;flex-direction:column;align-items:center;gap:10px;font-family:var(--fonte-t);font-size:26px;letter-spacing:.18em;text-transform:uppercase;color:#f5efe6}
.logo-img{height:54px;width:auto}
.logo-iniciais{width:54px;height:54px;border:1px solid var(--d);color:var(--d);display:grid;place-items:center;font-family:var(--fonte-t);font-size:22px}
.capa{min-height:100vh;display:grid;place-items:center;text-align:center;padding:180px 0 120px;${fundoFoto(capa, "#1a1715", "rgba(13,12,11,.45),rgba(13,12,11,.92)")}}
.capa .linha{width:1px;height:70px;background:var(--d);margin:0 auto 30px}
.capa h1{font-size:clamp(46px,8vw,110px);line-height:.95;font-style:italic;color:#f5efe6;max-width:13ch;margin:0 auto 26px}
.capa p{max-width:520px;margin:0 auto 40px;color:#b8afa3;font-size:18px;letter-spacing:.02em}
.btn-1{background:var(--d);color:var(--sobre-d);text-transform:uppercase;letter-spacing:.18em;font-size:13px;font-weight:500;padding:18px 34px}
.btn-2{border:1px solid var(--d);color:var(--d);text-transform:uppercase;letter-spacing:.18em;font-size:13px;font-weight:500;padding:18px 34px;background:transparent}
.selo-google{display:inline-flex;gap:10px;align-items:center;margin-top:36px;color:#b8afa3;font-size:14px;letter-spacing:.05em}
.sec{padding:130px 0}
.pre{color:var(--d);letter-spacing:.35em;text-transform:uppercase;font-size:12px;font-weight:500;margin-bottom:18px}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:90px;align-items:center}
.sobre .foto{aspect-ratio:3/4;overflow:hidden;position:relative}
.sobre .foto::after{content:'';position:absolute;inset:18px;border:1px solid rgba(255,255,255,.35);pointer-events:none}
.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(38px,5vw,64px);color:#f5efe6;line-height:1}
.sobre p{color:#b8afa3;font-size:18px}
.servicos{background:#141210}
.servicos h2{text-align:center;font-size:clamp(38px,5vw,64px);color:#f5efe6;margin-bottom:64px}
.lista{max-width:860px;margin:0 auto}
.linha-s{display:grid;grid-template-columns:1fr auto;gap:20px;padding:26px 0;border-bottom:1px solid #2a2622;align-items:baseline}
.linha-s h3{font-size:28px;color:#f5efe6;margin:0}
.linha-s p{grid-column:1/-1;color:#8a8178;margin:4px 0 0}
.linha-s span{color:var(--d);font-size:13px;letter-spacing:.2em;text-transform:uppercase}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.galeria-grade figure{margin:0;aspect-ratio:3/4;overflow:hidden}
.galeria-grade figure:nth-child(2){transform:translateY(48px)}
.galeria-grade figure:nth-child(5){transform:translateY(48px)}
.galeria-grade img{width:100%;height:100%;object-fit:cover;transition:transform .8s}
.galeria-grade figure:hover img{transform:scale(1.05)}
.galeria h2{text-align:center;font-size:clamp(38px,5vw,64px);color:#f5efe6;margin-bottom:60px}
.vozes h2{text-align:center;font-size:clamp(36px,4.6vw,56px);color:#f5efe6;margin-bottom:50px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:40px;text-align:center}
.vozes figure{margin:0}
.vozes blockquote{font-family:var(--fonte-t);font-style:italic;font-size:24px;color:#e9e3da;margin:14px 0 18px;line-height:1.4}
.vozes figcaption{color:var(--d);letter-spacing:.2em;text-transform:uppercase;font-size:12px}
.agenda{text-align:center;border-top:1px solid #2a2622;border-bottom:1px solid #2a2622}
.agenda h2{font-size:clamp(38px,5vw,68px);font-style:italic;color:#f5efe6}
.agenda p{color:#b8afa3}
.agenda .btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:30px}
${cssRodape("rp", "#090808", "#8a8178")}${cssComum(d)}
@media(max-width:860px){.sobre .wrap{grid-template-columns:1fr;gap:50px}.galeria-grade{grid-template-columns:1fr 1fr}
  .galeria-grade figure:nth-child(n){transform:none}}
`, `
<header class="topo"><a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a></header>
<section class="capa"><div class="wrap">
  <div class="linha sobe"></div>
  <h1 class="sobe sobe-2">${slogan(d, "O seu melhor, todos os dias")}</h1>
  <p class="sobe sobe-3">${partes[0]}</p>
  <div class="sobe sobe-4">${ctaPrincipal(d, "Agendar hor\xE1rio")}</div>
  ${seloGoogle(d)}
</div></section>
<section class="sec sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ""}
  <div><div class="pre">${esc(d.categoria || "O est\xFAdio")}</div><h2>Cada detalhe pensado</h2>
  <p>${partes[1]}</p></div>
</div></section>
${servicos.length ? `<section class="sec servicos"><div class="wrap"><div class="pre" style="text-align:center">Servi\xE7os</div><h2>O que fazemos</h2><div class="lista">${servicos.map((s) => `<div class="linha-s"><h3>${esc(s.titulo)}</h3><span>Agendar</span>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ""}</div>`).join("")}</div></div></section>` : ""}
${galeriaHtml(d, "sec galeria", "Trabalhos")}
${depoimentosHtml(d, "sec vozes", "Palavra de cliente")}
<section class="sec agenda" id="contato"><div class="wrap"><div class="pre">Agenda aberta</div><h2>Reserve o seu hor\xE1rio</h2>
  ${d.endereco ? `<p>${esc(d.endereco)}${d.horario ? ` \xB7 ${esc(d.horario)}` : ""}</p>` : ""}
  <div class="btns">${ctaPrincipal(d, "Agendar pelo WhatsApp")}${linkMapa(d) ? `<a class="btn btn-2" href="${linkMapa(d)}" target="_blank" rel="noopener">Como chegar</a>` : ""}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  }
};
var F_ESCRITORIO = {
  titulos: '"Libre Baskerville",Georgia,serif',
  corpo: '"Source Sans 3",system-ui,sans-serif',
  google: "family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700"
};
var escritorio = {
  id: "escritorio",
  nome: "Escrit\xF3rio",
  descricao: "S\xF3brio e editorial: \xE1reas de atua\xE7\xE3o em colunas e muito espa\xE7o em branco. Passa credibilidade.",
  nichos: ["Advogados", "Contabilidade", "Imobili\xE1rias", "Arquitetura", "Consultoria", "Psicologia"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#fbfaf7"/><rect x="10" y="10" width="30" height="5" fill="${corPrimaria}"/><rect x="100" y="10" width="50" height="5" fill="#cbd5e1"/>
    <rect x="10" y="20" width="140" height="1" fill="#e2e8f0"/>
    <rect x="10" y="32" width="84" height="9" fill="#0f172a"/><rect x="10" y="45" width="70" height="9" fill="#0f172a"/><rect x="10" y="60" width="26" height="3" fill="${corDestaque}"/>
    <rect x="104" y="30" width="46" height="36" fill="${corPrimaria}" opacity=".25"/>
    <rect x="10" y="76" width="42" height="26" fill="none" stroke="#cbd5e1"/><rect x="59" y="76" width="42" height="26" fill="none" stroke="#cbd5e1"/><rect x="108" y="76" width="42" height="26" fill="none" stroke="#cbd5e1"/></svg>`,
  render: (d) => {
    const partes = partirSobre(d, "Atendimento pr\xF3ximo, linguagem simples e compromisso com cada caso.", "Experi\xEAncia, \xE9tica e dedica\xE7\xE3o a cada cliente. Acreditamos que confian\xE7a se constr\xF3i com transpar\xEAncia.");
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || "";
    const servicos = servicosValidos(d);
    return documentoPremium(d, F_ESCRITORIO, `
body{background:#fbfaf7;color:#1c2230}
.topo{position:sticky;top:0;z-index:20;background:#fbfaf7;border-bottom:1px solid #e6e2d9}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;padding:20px 0}
.topo-marca{display:flex;align-items:center;gap:14px;font-family:var(--fonte-t);font-size:19px;color:#111827}
.logo-img{height:40px;width:auto}
.logo-iniciais{width:40px;height:40px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-family:var(--fonte-t)}
.topo nav{display:flex;gap:34px;font-weight:600;font-size:15px;color:#4b5563}
.btn-1{background:var(--p);color:var(--sobre-p);border-radius:2px}
.btn-2{background:transparent;color:var(--p);border:1px solid var(--p);border-radius:2px}
.capa{padding:110px 0 90px}
.capa .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:70px;align-items:center}
.pre{font-size:13px;letter-spacing:.24em;text-transform:uppercase;color:var(--p);font-weight:700}
.capa h1{font-size:clamp(36px,5vw,62px);line-height:1.12;margin:20px 0 26px;color:#0f1420}
.capa .traco{width:70px;height:3px;background:var(--d);margin-bottom:26px}
.capa p{font-size:19px;color:#4b5563;max-width:560px;margin-bottom:34px}
.capa .btns{display:flex;gap:14px;flex-wrap:wrap}
.capa .img{aspect-ratio:4/5;${fundoFoto(capa, d.corPrimaria, "rgba(0,0,0,0),rgba(0,0,0,.1)")};box-shadow:-22px 22px 0 #ece8df}
.selo-google{display:inline-flex;gap:10px;align-items:center;margin-top:28px;color:#4b5563;font-size:14px}
.areas{padding:110px 0;border-top:1px solid #e6e2d9}
.cab{display:grid;grid-template-columns:1fr 1fr;gap:50px;margin-bottom:60px;align-items:end}
.cab h2{font-size:clamp(30px,4vw,48px);margin:10px 0 0;color:#0f1420}
.cab p{color:#6b7280;margin:0;font-size:18px}
.colunas{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #d9d4c8}
.area{padding:36px 30px 40px 0;border-bottom:1px solid #d9d4c8}
.area:not(:nth-child(3n+1)){padding-left:30px;border-left:1px solid #d9d4c8}
.area h3{font-size:21px;color:#0f1420;margin-bottom:12px}
.area p{color:#6b7280;margin:0}
.area .ic{color:var(--p);margin-bottom:18px}
.sobre{background:#0f1420;color:#e5e7eb;padding:110px 0}
.sobre .wrap{display:grid;grid-template-columns:1fr 1.2fr;gap:80px;align-items:center}
.sobre .foto{aspect-ratio:1;overflow:hidden}
.sobre .foto img{width:100%;height:100%;object-fit:cover;filter:grayscale(.3)}
.sobre h2{font-size:clamp(30px,4vw,46px);color:#fff}
.sobre p{color:#9ca3af;font-size:18px}
.sobre .pre{color:var(--d)}
.sobre .assina{font-family:var(--fonte-t);font-style:italic;color:var(--d);font-size:20px;margin-top:24px}
.vozes{padding:110px 0}
.vozes h2{font-size:clamp(30px,4vw,46px);text-align:center;margin-bottom:50px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:30px}
.vozes figure{margin:0;border-top:3px solid var(--d);padding-top:26px}
.vozes blockquote{font-family:var(--fonte-t);font-size:19px;line-height:1.55;margin:10px 0 16px;color:#1f2937}
.vozes figcaption{font-weight:700;color:#4b5563}
.galeria{padding:110px 0 0}
.galeria h2{font-size:clamp(30px,4vw,46px);text-align:center;margin-bottom:44px}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.galeria-grade figure{margin:0;aspect-ratio:3/2;overflow:hidden}
.galeria-grade img{width:100%;height:100%;object-fit:cover;filter:grayscale(.15)}
.contato{padding:110px 0;background:#f2efe8}
.contato-in{display:grid;grid-template-columns:1.2fr 1fr;gap:60px;align-items:center}
.contato h2{font-size:clamp(30px,4vw,46px);color:#0f1420}
.contato-linha{display:flex;gap:14px;align-items:flex-start;color:#374151;font-size:18px}
.contato-linha svg{color:var(--p);margin-top:4px}
.contato-acoes{display:flex;flex-direction:column;gap:14px}
.contato .btn{justify-content:center}
${cssRodape("rp", "#0b0f19", "#9ca3af")}${cssComum(d)}
@media(max-width:900px){.topo nav{display:none}.capa .wrap,.cab,.sobre .wrap,.contato-in{grid-template-columns:1fr}.galeria-grade{grid-template-columns:1fr 1fr}
  .colunas{grid-template-columns:1fr}.area:not(:nth-child(3n+1)){padding-left:0;border-left:0}}
`, `
<header class="topo"><div class="wrap">
  <a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav><a href="#areas">Atua\xE7\xE3o</a><a href="#sobre">Sobre</a><a href="#contato">Contato</a></nav>
</div></header>
<section class="capa"><div class="wrap">
  <div><div class="pre sobe">${esc(d.categoria || "Atendimento especializado")}</div>
    <h1 class="sobe sobe-2">${slogan(d, "Orienta\xE7\xE3o clara para decis\xF5es importantes")}</h1>
    <div class="traco"></div>
    <p class="sobe sobe-3">${partes[0]}</p>
    <div class="btns sobe sobe-4">${ctaPrincipal(d, "Agendar conversa")}${servicos.length ? '<a class="btn btn-2" href="#areas">\xC1reas de atua\xE7\xE3o</a>' : ""}</div>
    ${seloGoogle(d)}</div>
  <div class="img sobe sobe-2"></div>
</div></section>
${servicos.length ? `<section class="areas" id="areas"><div class="wrap"><div class="cab"><div><div class="pre">Atua\xE7\xE3o</div><h2>Como podemos ajudar</h2></div>
<p>Cada caso come\xE7a por entender o seu contexto. S\xF3 depois vem a proposta.</p></div><div class="colunas">${servicos.map((s, i) => `<div class="area"><div class="ic">${iconeDoServico(i)}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join("")}</div></div></section>` : ""}
<section class="sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ""}
  <div><div class="pre">Quem somos</div><h2>${esc(d.empresa)}</h2>
  <p>${partes[1]}</p>
  <div class="assina">${esc(d.empresa)}</div></div>
</div></section>
${galeriaHtml(d, "galeria", "O escrit\xF3rio")}
${depoimentosHtml(d, "vozes", "Depoimentos")}
${blocoContato(d, "contato", "Vamos conversar")}
${fim(d, rodapePremium(d))}`);
  }
};
var F_VIBRANTE = {
  titulos: '"Outfit",system-ui,sans-serif',
  corpo: '"Nunito",system-ui,sans-serif',
  google: "family=Outfit:wght@600;700;800;900&family=Nunito:wght@400;600;700"
};
var vibrante = {
  id: "vibrante",
  nome: "Vibrante",
  descricao: "Cores fortes, formas arredondadas e muita energia. Para academia, pet shop e escola.",
  nichos: ["Academias", "Pet Shops", "Escolas", "Cursos", "Sorveterias", "Lazer"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#fff"/><circle cx="130" cy="20" r="36" fill="${corDestaque}" opacity=".35"/><circle cx="18" cy="96" r="26" fill="${corPrimaria}" opacity=".2"/>
    <rect x="10" y="10" width="28" height="7" rx="3.5" fill="${corPrimaria}"/>
    <rect x="10" y="30" width="78" height="11" rx="5" fill="#111"/><rect x="10" y="45" width="60" height="11" rx="5" fill="${corPrimaria}"/>
    <rect x="10" y="62" width="40" height="10" rx="5" fill="${corDestaque}"/>
    <rect x="96" y="30" width="54" height="50" rx="18" fill="${corPrimaria}" opacity=".5"/>
    <rect x="10" y="84" width="40" height="18" rx="9" fill="#f3f4f6"/><rect x="58" y="84" width="40" height="18" rx="9" fill="#f3f4f6"/></svg>`,
  render: (d) => {
    const partes = partirSobre(d, "Estrutura completa, equipe animada e atendimento que faz voc\xEA querer voltar.", "Aqui cada pessoa \xE9 recebida pelo nome. Ambiente leve, equipe preparada e resultado de verdade.");
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || "";
    const servicos = servicosValidos(d);
    return documentoPremium(d, F_VIBRANTE, `
h1,h2,h3{font-weight:800;letter-spacing:-.02em}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;padding:22px 0}
.topo-marca{display:flex;align-items:center;gap:12px;font-family:var(--fonte-t);font-weight:800;font-size:22px}
.logo-img{height:46px;width:auto}
.logo-iniciais{width:46px;height:46px;border-radius:16px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-family:var(--fonte-t);font-weight:900;transform:rotate(-6deg)}
.btn-1{background:var(--p);color:var(--sobre-p);border-radius:999px;box-shadow:0 10px 0 var(--p-esc)}
.btn-1:hover{box-shadow:0 6px 0 var(--p-esc);transform:translateY(4px)}
.btn-2{background:var(--d);color:var(--sobre-d);border-radius:999px}
.capa{position:relative;overflow:hidden;padding:60px 0 110px}
.capa::before{content:'';position:absolute;width:620px;height:620px;border-radius:50%;background:var(--d);opacity:.22;right:-160px;top:-200px}
.capa .wrap{position:relative;display:grid;grid-template-columns:1.1fr 1fr;gap:50px;align-items:center}
.capa h1{font-size:clamp(44px,7vw,92px);line-height:.98;margin-bottom:22px}
.capa h1 span{color:var(--p);display:block}
.capa p{font-size:20px;color:#4b5563;max-width:520px;margin-bottom:34px}
.capa .btns{display:flex;gap:14px;flex-wrap:wrap}
.capa .img{aspect-ratio:1;border-radius:46% 54% 42% 58%/52% 44% 56% 48%;${fundoFoto(capa, d.corPrimaria, "rgba(0,0,0,0),rgba(0,0,0,.08)")};
  box-shadow:0 0 0 14px #fff,0 0 0 18px var(--p)}
.selo-google{display:inline-flex;gap:10px;align-items:center;margin-top:26px;background:#fff;border-radius:999px;padding:10px 18px;box-shadow:0 10px 30px -12px rgba(0,0,0,.25);font-size:14px}
.cartoes{padding:100px 0;background:var(--p-cla)}
.cartoes h2{text-align:center;font-size:clamp(34px,5vw,58px);margin-bottom:50px}
.cartoes-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.cartao{background:#fff;border-radius:30px;padding:34px;border:3px solid transparent;transition:border-color .2s,transform .2s}
.cartao:hover{border-color:var(--p);transform:rotate(-1deg)}
.cartao .ic{width:60px;height:60px;border-radius:20px;display:grid;place-items:center;background:var(--d);color:var(--sobre-d);margin-bottom:20px}
.cartao h3{font-size:24px}.cartao p{color:#4b5563;margin:0}
.sobre{padding:110px 0}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:70px;align-items:center}
.sobre .foto{aspect-ratio:1;border-radius:40px;overflow:hidden;transform:rotate(-3deg);box-shadow:20px 20px 0 var(--d)}
.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(34px,4.6vw,54px)}
.sobre p{font-size:19px;color:#4b5563}
.galeria{padding:0 0 110px}
.galeria h2{text-align:center;font-size:clamp(34px,4.6vw,54px);margin-bottom:40px}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.galeria-grade figure{margin:0;aspect-ratio:1;border-radius:28px;overflow:hidden}
.galeria-grade img{width:100%;height:100%;object-fit:cover;transition:transform .4s}
.galeria-grade figure:hover img{transform:scale(1.08) rotate(2deg)}
.vozes{background:#111;color:#fff;padding:110px 0}
.vozes h2{text-align:center;font-size:clamp(34px,4.6vw,54px);margin-bottom:46px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}
.vozes figure{margin:0;background:#1f1f1f;border-radius:30px;padding:32px}
.vozes blockquote{margin:12px 0 16px;font-size:18px}
.vozes figcaption{color:var(--d);font-weight:800;font-family:var(--fonte-t)}
.final{padding:110px 0}
.final-in{background:var(--p);color:var(--sobre-p);border-radius:44px;padding:70px;text-align:center;position:relative;overflow:hidden}
.final-in::after{content:'';position:absolute;width:300px;height:300px;border-radius:50%;background:var(--d);opacity:.35;left:-80px;bottom:-140px}
.final h2{font-size:clamp(34px,5vw,64px);position:relative}
.final p{position:relative;font-size:19px;opacity:.9}
.final .btn-1{background:#fff;color:var(--p);box-shadow:0 10px 0 rgba(0,0,0,.2);position:relative}
${cssRodape("rp", "#111", "#a3a3a3")}${cssComum(d)}
@media(max-width:860px){.capa .wrap,.sobre .wrap{grid-template-columns:1fr}.cartoes-grade,.galeria-grade{grid-template-columns:1fr 1fr}.final-in{padding:44px 24px}}
@media(max-width:560px){.cartoes-grade,.galeria-grade{grid-template-columns:1fr}}
`, `
<header class="topo"><div class="wrap"><a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>${ctaPrincipal(d, "Fale com a gente")}</div></header>
<section class="capa"><div class="wrap">
  <div><h1 class="sobe">${esc(d.empresa)}<span>${slogan(d, "do jeito que voc\xEA merece")}</span></h1>
    <p class="sobe sobe-2">${partes[0]}</p>
    <div class="btns sobe sobe-3">${ctaPrincipal(d, "Quero conhecer")}${servicos.length ? '<a class="btn btn-2" href="#servicos">Ver tudo</a>' : ""}</div>
    ${seloGoogle(d)}</div>
  <div class="img sobe sobe-2"></div>
</div></section>
${servicos.length ? `<section class="cartoes" id="servicos"><div class="wrap"><h2>O que tem aqui</h2><div class="cartoes-grade">${servicos.map((s, i) => `<div class="cartao"><div class="ic">${iconeDoServico(i)}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join("")}</div></div></section>` : ""}
<section class="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ""}
  <div><h2>Feito pra voc\xEA</h2><p>${partes[1]}</p>
  ${ctaPrincipal(d, "Bora come\xE7ar")}</div>
</div></section>
${galeriaHtml(d, "galeria", "Por dentro")}
${depoimentosHtml(d, "vozes", "Quem vem, volta")}
<section class="final" id="contato"><div class="wrap"><div class="final-in"><h2>Vem fazer parte!</h2>
  ${d.endereco ? `<p>${esc(d.endereco)}${d.horario ? ` \xB7 ${esc(d.horario)}` : ""}</p>` : ""}${ctaPrincipal(d, "Chamar no WhatsApp")}</div></div></section>
${fim(d, rodapePremium(d))}`);
  }
};
var LAYOUTS_PREMIUM = [aurora, clinica, oficina, estudio, escritorio, vibrante];

// src/templates/sites/premium2.ts
var contatoLinhas = (d, classe) => {
  const mapa = linkMapa(d), tel = linkTel(d), ig = linkInsta(d);
  return `${d.endereco ? `<p class="${classe}">${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ""}
    ${d.horario ? `<p class="${classe}">${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ""}
    ${tel ? `<p class="${classe}">${ICONES.tel}<a href="${tel}">${esc(d.telefone)}</a></p>` : ""}
    ${ig ? `<p class="${classe}">${ICONES.insta}<a href="${ig}" target="_blank" rel="noopener">${esc(d.instagram)}</a></p>` : ""}
    ${mapa ? "" : ""}`;
};
var blocoContato2 = (d, classe, titulo2, texto) => {
  const mapa = linkMapa(d);
  return `<section class="${classe}" id="contato"><div class="wrap ${classe}-in">
  <div><h2>${titulo2}</h2><p class="${classe}-sub">${texto}</p>${contatoLinhas(d, `${classe}-linha`)}</div>
  <div class="${classe}-acoes">${ctaPrincipal(d, "Chamar no WhatsApp")}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div>
</div></section>`;
};
var cssContato = (classe, caixa, texto, sub, borda = "rgba(0,0,0,.1)") => `
.${classe}{padding:clamp(64px,9vw,104px) 0}
.${classe}-in{display:grid;grid-template-columns:1.2fr 1fr;gap:48px;align-items:center;${caixa}}
.${classe} h2{font-size:var(--t4);color:${texto};letter-spacing:-.02em}
.${classe}-sub{color:${sub};font-size:var(--t1);margin-bottom:24px;max-width:46ch}
.${classe}-linha{display:flex;gap:12px;align-items:flex-start;margin:0 0 12px;color:${texto}}
.${classe}-linha svg{flex:none;margin-top:4px;opacity:.75}
.${classe}-acoes{display:grid;gap:12px;align-content:center}
.${classe}-acoes .btn{justify-content:center;border-color:${borda}}
@media(max-width:860px){.${classe}-in{grid-template-columns:1fr;gap:28px}}`;
var menu = (itens2) => `<nav aria-label="Se\xE7\xF5es">${itens2.map(([href, rotulo]) => `<a href="${href}">${rotulo}</a>`).join("")}</nav>`;
var F_BENTO = {
  titulos: '"Plus Jakarta Sans",system-ui,sans-serif',
  corpo: '"Plus Jakarta Sans",system-ui,sans-serif',
  google: "family=Plus+Jakarta+Sans:wght@400;500;600;700;800"
};
var bento = {
  id: "bento",
  nome: "Bento",
  descricao: "Cart\xF5es arredondados em grade modular, leve e moderno. Para quem quer parecer atual.",
  nichos: ["Tecnologia", "Marketing", "Cl\xEDnicas modernas", "Educa\xE7\xE3o", "Pet shops", "Coworking"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#f4f6fb"/><rect x="10" y="9" width="24" height="6" rx="3" fill="${corPrimaria}"/><rect x="118" y="8" width="32" height="8" rx="4" fill="${corPrimaria}"/>
    <rect x="10" y="30" width="62" height="8" rx="2" fill="#1f2937"/><rect x="10" y="42" width="48" height="4" rx="2" fill="#9ca3af"/><rect x="10" y="54" width="28" height="9" rx="4.5" fill="${corPrimaria}"/>
    <rect x="84" y="24" width="66" height="44" rx="9" fill="${corPrimaria}" opacity=".25"/><rect x="84" y="72" width="31" height="16" rx="6" fill="#fff"/><rect x="119" y="72" width="31" height="16" rx="6" fill="${corDestaque}"/>
    <rect x="10" y="78" width="30" height="24" rx="6" fill="#fff"/><rect x="44" y="78" width="30" height="24" rx="6" fill="#fff"/></svg>`,
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Solu\xE7\xF5es pensadas para o seu dia a dia, com atendimento direto e sem complica\xE7\xE3o.", "Trabalhamos com clareza: voc\xEA sabe o que ser\xE1 feito, quando e por quanto.");
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || "";
    const servicos = servicosValidos(d);
    const tel = linkTel(d);
    return documentoPremium(d, F_BENTO, `
body{background:#f4f6fb;color:#111827}
.topo{position:sticky;top:0;z-index:30;background:rgba(244,246,251,.82);backdrop-filter:blur(14px);border-bottom:1px solid #e6eaf3}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 0}
.topo-marca{display:flex;align-items:center;gap:12px;font-weight:800;font-size:var(--t1);color:#0b1220}
.logo-img{height:40px;width:auto}.logo-iniciais{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:800}
.topo nav{display:flex;gap:28px;font-weight:600;font-size:15px;color:#475569}.topo nav a:hover{color:var(--p-texto)}
.btn-1{background:var(--p);color:var(--sobre-p);border-radius:999px;box-shadow:0 14px 30px -14px var(--p)}
.btn-2{background:#fff;color:var(--p-texto);border:1.5px solid #dbe2ee;border-radius:999px}
.capa{padding:clamp(48px,7vw,96px) 0 clamp(48px,6vw,80px);background:radial-gradient(900px 420px at 85% -10%,var(--p-cla),transparent 65%),radial-gradient(700px 360px at -10% 20%,color-mix(in srgb,var(--d) 14%,transparent),transparent 60%)}
.capa .wrap{display:grid;grid-template-columns:1.05fr 1fr;gap:clamp(32px,5vw,72px);align-items:center}
.pilula{display:inline-flex;gap:8px;align-items:center;background:#fff;border:1px solid #e3e8f2;border-radius:999px;padding:8px 16px;font-size:14px;font-weight:700;color:var(--p-texto)}
.pilula svg{width:16px;height:16px}
.capa h1{font-size:var(--t5);letter-spacing:-.035em;line-height:1.04;margin:22px 0 18px;color:#0b1220;font-weight:800}
.capa p{font-size:var(--t1);color:#4b5563;max-width:48ch;margin-bottom:30px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.mosaico{display:grid;grid-template-columns:1.2fr 1fr;grid-template-rows:auto auto auto;gap:14px}
.m{border-radius:28px;background:#fff;border:1px solid #e6eaf3;box-shadow:0 20px 40px -28px rgba(15,23,42,.35);padding:22px;overflow:hidden}
.m-foto{grid-row:1/4;min-height:380px;padding:0;${fundoFoto(capa, d.corPrimaria, "rgba(0,0,0,0),rgba(0,0,0,.12)")}}
.m-nota{display:grid;gap:2px;align-content:center}.m-nota b{font-size:34px;line-height:1;color:#0b1220}.m-nota span{font-size:13px;color:#64748b}
.m-hora{display:flex;gap:12px;align-items:flex-start;font-size:14px;font-weight:600;color:#334155}.m-hora svg{flex:none;color:var(--p-texto);margin-top:2px}
.m-acao{background:var(--p);color:var(--sobre-p);border:0;display:grid;gap:10px;align-content:center}.m-acao b{font-size:var(--t2);line-height:1.15}.m-acao a{font-weight:700;display:inline-flex;gap:8px;align-items:center}
.sec{padding:clamp(56px,8vw,100px) 0}
.cab{max-width:640px;margin:0 0 clamp(28px,4vw,48px)}
.cab h2{font-size:var(--t4);letter-spacing:-.025em;color:#0b1220;font-weight:800}.cab p{color:#5b6475;font-size:var(--t1)}
.grade{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.cx{border-radius:26px;background:#fff;border:1px solid #e6eaf3;padding:28px;transition:transform .25s,box-shadow .25s}
.cx:hover{transform:translateY(-4px);box-shadow:0 28px 50px -30px rgba(15,23,42,.4)}
.cx .ic{width:50px;height:50px;border-radius:15px;display:grid;place-items:center;background:var(--p-cla);color:var(--p-texto);margin-bottom:20px}
.cx h3{font-size:var(--t2);color:#0b1220;margin-bottom:8px}.cx p{color:#5b6475;margin:0}
.n5 .cx:first-child,.n6 .cx:first-child,.n4 .cx:first-child{grid-column:span 2;grid-row:span 2;background:var(--p);color:var(--sobre-p);border-color:transparent;display:flex;flex-direction:column;justify-content:flex-end;min-height:280px}
.cx:first-child{background:var(--p);color:var(--sobre-p);border-color:transparent}.cx:first-child .ic{background:rgba(255,255,255,.18);color:inherit}.cx:first-child h3,.cx:first-child p{color:inherit}
.n5 .cx:first-child h3,.n6 .cx:first-child h3,.n4 .cx:first-child h3{font-size:var(--t3)}
.n6 .cx:last-child{grid-column:1/-1;display:grid;grid-template-columns:auto 1fr;gap:6px 20px;align-items:center}.n6 .cx:last-child .ic{grid-row:span 2;margin:0}.n6 .cx:last-child h3{margin:0}
.n3 .grade,.n2 .grade,.n1 .grade{grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,5vw,72px);align-items:center}
.sobre .foto{aspect-ratio:5/4;border-radius:32px;overflow:hidden;background:var(--p-cla);border:1px solid #e6eaf3}.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:var(--t4);letter-spacing:-.025em;color:#0b1220;font-weight:800}.sobre p{color:#4b5563;font-size:var(--t1)}
.lista{list-style:none;padding:0;margin:22px 0 0;display:grid;gap:12px}.lista li{display:flex;gap:12px;font-weight:600;color:#1f2937}.lista svg{color:var(--p-texto);flex:none}
.vozes{padding:clamp(56px,8vw,100px) 0}.vozes h2{font-size:var(--t4);letter-spacing:-.025em;color:#0b1220;margin-bottom:36px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.vozes figure{margin:0;background:#fff;border:1px solid #e6eaf3;border-radius:26px;padding:28px}.vozes blockquote{margin:12px 0 16px;color:#334155}.vozes figcaption{font-weight:700;color:#0b1220}
.galeria{padding:0 0 clamp(56px,8vw,100px)}.galeria h2{font-size:var(--t4);color:#0b1220;margin-bottom:28px}
.galeria-grade{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.galeria-grade figure{margin:0;aspect-ratio:1;border-radius:24px;overflow:hidden}.galeria-grade img{width:100%;height:100%;object-fit:cover}
.galeria-grade figure:first-child{grid-column:span 2;grid-row:span 2}
${cssContato("contato", "background:#fff;border:1px solid #e6eaf3;border-radius:36px;padding:clamp(28px,5vw,56px)", "#0b1220", "#5b6475", "#dbe2ee")}
.contato{padding-top:0}
${cssRodape("rp", "#0b1220", "#aab2c3")}
@media(max-width:900px){.capa .wrap,.sobre .wrap{grid-template-columns:1fr}.grade{grid-template-columns:repeat(2,1fr)}.topo nav{display:none}.galeria-grade{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.grade{grid-template-columns:1fr}.n4 .cx:first-child,.n5 .cx:first-child,.n6 .cx:first-child{grid-column:auto;grid-row:auto}.n6 .cx:last-child{display:block}.mosaico{grid-template-columns:1fr}.m-foto{grid-row:auto;min-height:260px}}
`, `
<header class="topo"><div class="wrap"><a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  ${menu([["#servicos", "Servi\xE7os"], ["#sobre", "Sobre"], ["#contato", "Contato"]])}${ctaPrincipal(d, "Falar agora")}</div></header>
<section class="capa"><div class="wrap">
  <div><span class="pilula">${ICONES.brilho}${esc(d.categoria || "Atendimento direto")}</span>
    <h1>${slogan(d, "Solu\xE7\xF5es simples para o que voc\xEA precisa")}</h1><p>${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, "Falar no WhatsApp")}<a class="btn btn-2" href="#servicos">Ver servi\xE7os</a></div></div>
  <div class="mosaico">
    <div class="m m-foto" role="img" aria-label="${esc(d.empresa)}"></div>
    ${seloGoogle(d, "m m-nota") || ""}
    ${d.horario ? `<div class="m m-hora">${ICONES.relogio}<span>${esc(d.horario)}</span></div>` : ""}
    <div class="m m-acao"><b>Fale com a gente</b>${tel ? `<a href="${tel}">${ICONES.tel}${esc(d.telefone)}</a>` : ""}</div>
  </div>
</div></section>
${servicos.length ? `<section class="sec" id="servicos"><div class="wrap"><div class="cab"><h2>O que fazemos</h2><p>Tudo o que voc\xEA precisa em um s\xF3 lugar.</p></div>
<div class="grade n${servicos.length}">${servicos.map((s, i) => `<div class="cx"><div class="ic">${iconeDoServico(i)}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join("")}</div></div></section>` : ""}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ""}
  <div><h2>Sobre a ${esc(d.empresa)}</h2><p>${sobreTxt}</p></div>
</div></section>
${galeriaHtml(d, "galeria", "Em imagens")}
${depoimentosHtml(d, "vozes", "Quem j\xE1 \xE9 cliente")}
${blocoContato2(d, "contato", "Vamos conversar?", "Conte o que voc\xEA precisa e respondemos pelo WhatsApp.")}
${fim(d, rodapePremium(d))}`);
  }
};
var F_NATURAL = {
  titulos: '"DM Serif Display",Georgia,serif',
  corpo: '"DM Sans",system-ui,sans-serif',
  google: "family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700"
};
var natural = {
  id: "natural",
  nome: "Natural",
  descricao: "Bege, serifa suave e foto em arco. Acolhe e passa cuidado. Para bem-estar e est\xE9tica.",
  nichos: ["Est\xE9tica", "Nutri\xE7\xE3o", "Psicologia", "Terapias", "Floriculturas", "Cafeterias"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#f5efe6"/><rect x="10" y="9" width="22" height="5" rx="2.5" fill="${corPrimaria}"/><rect x="120" y="8" width="30" height="8" rx="4" fill="${corPrimaria}"/>
    <rect x="10" y="32" width="58" height="9" rx="2" fill="#3b3128"/><rect x="10" y="45" width="46" height="4" rx="2" fill="#a3978a"/><rect x="10" y="58" width="28" height="9" rx="4.5" fill="${corPrimaria}"/>
    <path d="M92 94V52a24 24 0 0 1 48 0v42z" fill="${corPrimaria}" opacity=".28"/><circle cx="130" cy="38" r="9" fill="${corDestaque}" opacity=".7"/>
    <rect x="10" y="80" width="26" height="20" rx="10" fill="#fff"/><rect x="40" y="80" width="26" height="20" rx="10" fill="#fff"/></svg>`,
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Um espa\xE7o pensado para voc\xEA se sentir bem, com aten\xE7\xE3o e tempo para cada pessoa.", "Acreditamos em cuidado sem pressa: ouvimos, explicamos e acompanhamos de perto.");
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || "";
    const servicos = servicosValidos(d);
    return documentoPremium(d, F_NATURAL, `
body{background:#f6f0e7;color:#2f2a24}
.topo{position:sticky;top:0;z-index:30;background:rgba(246,240,231,.9);backdrop-filter:blur(10px);border-bottom:1px solid #e8dfd1}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 0}
.topo-marca{display:flex;align-items:center;gap:12px;font-family:var(--fonte-t);font-size:var(--t2);color:#2f2a24}
.logo-img{height:42px;width:auto}.logo-iniciais{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:700}
.topo nav{display:flex;gap:30px;font-weight:600;font-size:15px;color:#5e5447}.topo nav a:hover{color:var(--p-texto)}
.btn-1{background:var(--p);color:var(--sobre-p);border-radius:999px}
.btn-2{background:transparent;color:var(--p-texto);border:1.5px solid color-mix(in srgb,var(--p) 40%,transparent);border-radius:999px}
.capa{padding:clamp(40px,6vw,80px) 0 clamp(56px,7vw,96px)}
.capa .wrap{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(32px,5vw,80px);align-items:center}
.eyebrow{display:inline-block;font-size:14px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--p-texto);margin-bottom:18px}
.capa h1{font-size:var(--t5);line-height:1.06;letter-spacing:-.02em;color:#2a241e;font-weight:400;margin-bottom:20px}
.capa p{font-size:var(--t1);color:#5e5447;max-width:46ch;margin-bottom:30px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.arco{position:relative;margin-left:auto;width:min(100%,440px)}
.arco .img{aspect-ratio:4/5;border-radius:999px 999px 28px 28px;overflow:hidden;${fundoFoto(capa, d.corPrimaria, "rgba(0,0,0,0),rgba(0,0,0,.06)")}}
.arco::before{content:'';position:absolute;inset:-14px -14px auto auto;width:62%;height:62%;border-radius:999px 999px 28px 28px;background:color-mix(in srgb,var(--p) 18%,transparent);z-index:-1}
.arco .selo-google{position:absolute;left:-26px;bottom:34px;background:#fffaf2;border-radius:20px;padding:14px 18px;box-shadow:0 18px 40px -22px rgba(60,40,10,.5);display:grid;gap:2px;font-size:13px;color:#6b6054}
.arco .selo-google b{font-size:26px;color:#2a241e;line-height:1}
.sec{padding:clamp(56px,8vw,96px) 0}
.cab{text-align:center;max-width:620px;margin:0 auto clamp(32px,4vw,52px)}
.cab h2{font-size:var(--t4);font-weight:400;color:#2a241e;letter-spacing:-.01em}.cab p{color:#6b6054;font-size:var(--t1)}
.itens{display:flex;flex-wrap:wrap;justify-content:center;gap:18px}
.item{flex:0 1 calc((100% - 36px)/3);min-width:250px;background:#fffaf2;border:1px solid #eadfcf;border-radius:28px;padding:30px;text-align:left}
.item .ic{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--p) 14%,#fffaf2);color:var(--p-texto);margin-bottom:20px}
.item h3{font-family:var(--fonte-t);font-weight:400;font-size:var(--t2);color:#2a241e;margin-bottom:8px}.item p{color:#6b6054;margin:0}
.sobre{background:#efe6d8}.sobre .wrap{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(32px,5vw,80px);align-items:center}
.sobre .foto{aspect-ratio:1;border-radius:50%;overflow:hidden;background:var(--p-cla);max-width:460px;margin:0 auto;width:100%}.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:var(--t4);font-weight:400;color:#2a241e}.sobre p{color:#5e5447;font-size:var(--t1)}
.vozes{padding:clamp(56px,8vw,96px) 0}.vozes h2{text-align:center;font-weight:400;font-size:var(--t4);color:#2a241e;margin-bottom:36px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
.vozes figure{margin:0;background:#fffaf2;border:1px solid #eadfcf;border-radius:28px;padding:28px}.vozes blockquote{margin:12px 0 16px;color:#4a4036;font-family:var(--fonte-t);font-size:var(--t1)}.vozes figcaption{font-weight:700;color:#2a241e}
.galeria{padding:clamp(56px,8vw,96px) 0}.galeria h2{text-align:center;font-weight:400;font-size:var(--t4);color:#2a241e;margin-bottom:32px}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.galeria-grade figure{margin:0;aspect-ratio:4/5;overflow:hidden;border-radius:999px 999px 22px 22px}.galeria-grade img{width:100%;height:100%;object-fit:cover}
${cssContato("contato", "background:#fffaf2;border:1px solid #eadfcf;border-radius:36px;padding:clamp(28px,5vw,56px)", "#2a241e", "#6b6054", "#e0d3bf")}
.contato{padding-top:0}.contato h2{font-weight:400}
${cssRodape("rp", "#2a241e", "#cfc4b4")}
@media(max-width:900px){.capa .wrap,.sobre .wrap{grid-template-columns:1fr}.item{flex-basis:calc((100% - 18px)/2)}.topo nav{display:none}.arco{margin:0 auto}.arco .selo-google{left:8px}}
@media(max-width:560px){.item{flex-basis:100%}.galeria-grade{grid-template-columns:1fr 1fr}}
`, `
<header class="topo"><div class="wrap"><a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  ${menu([["#servicos", "Cuidados"], ["#sobre", "Sobre"], ["#contato", "Contato"]])}${ctaPrincipal(d, "Agendar")}</div></header>
<section class="capa"><div class="wrap">
  <div><span class="eyebrow">${esc(d.categoria || "Bem-estar")}</span>
    <h1>${slogan(d, "Cuidar de voc\xEA \xE9 o nosso jeito de trabalhar")}</h1><p>${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, "Agendar hor\xE1rio")}<a class="btn btn-2" href="#servicos">Conhecer os cuidados</a></div></div>
  <div class="arco"><div class="img" role="img" aria-label="${esc(d.empresa)}"></div>${seloGoogle(d)}</div>
</div></section>
${servicos.length ? `<section class="sec" id="servicos"><div class="wrap"><div class="cab"><h2>Como podemos cuidar de voc\xEA</h2><p>Cada atendimento come\xE7a por uma conversa.</p></div>
<div class="itens">${servicos.map((s, i) => `<div class="item"><div class="ic">${iconeDoServico(i)}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join("")}</div></div></section>` : ""}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ""}
  <div><span class="eyebrow">Nossa hist\xF3ria</span><h2>${esc(d.empresa)}</h2><p>${sobreTxt}</p></div>
</div></section>
${galeriaHtml(d, "galeria", "Um pouco do nosso espa\xE7o")}
${depoimentosHtml(d, "vozes", "Palavras de quem j\xE1 esteve aqui")}
${blocoContato2(d, "contato", "Vamos marcar o seu hor\xE1rio?", "Chame no WhatsApp e escolhemos juntos o melhor dia.")}
${fim(d, rodapePremium(d))}`);
  }
};
var F_IMPACTO = {
  titulos: '"Anton",Impact,system-ui,sans-serif',
  corpo: '"Inter",system-ui,sans-serif',
  google: "family=Anton&family=Inter:wght@400;500;600;700"
};
var impacto = {
  id: "impacto",
  nome: "Impacto",
  descricao: "Preto, letra condensada gigante e faixa em movimento. Direto e en\xE9rgico.",
  nichos: ["Academias", "Barbearias", "Eventos", "Motos e carros", "Esportes", "Casas noturnas"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#0a0a0a"/><rect x="10" y="9" width="26" height="6" fill="${corDestaque}"/><rect x="120" y="8" width="30" height="8" fill="${corDestaque}"/>
    <rect x="10" y="28" width="104" height="14" fill="#fff"/><rect x="10" y="46" width="84" height="14" fill="#fff"/><rect x="10" y="66" width="30" height="9" fill="${corDestaque}"/>
    <rect y="84" width="160" height="12" fill="${corDestaque}"/><rect x="8" y="87" width="30" height="5" fill="#0a0a0a"/><rect x="46" y="87" width="30" height="5" fill="#0a0a0a"/><rect x="84" y="87" width="30" height="5" fill="#0a0a0a"/>
    <rect x="112" y="26" width="38" height="52" fill="${corPrimaria}" opacity=".5"/></svg>`,
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Sem enrola\xE7\xE3o: voc\xEA chega, a gente resolve e voc\xEA sai melhor do que entrou.", "Aqui o foco \xE9 resultado, atendimento direto e const\xE2ncia. Venha conhecer.");
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || "";
    const servicos = servicosValidos(d);
    const faixa2 = (servicos.length ? servicos.map((s) => s.titulo) : [d.categoria || d.empresa, d.empresa]).filter(Boolean).slice(0, 6);
    const repetida = [...faixa2, ...faixa2, ...faixa2, ...faixa2].map((t) => `<span>${esc(t)}</span>`).join("");
    return documentoPremium(d, F_IMPACTO, `
body{background:#0a0a0a;color:#f4f4f5}
h1,h2,h3{font-weight:400;text-transform:uppercase;letter-spacing:.01em;line-height:1}
.topo{position:sticky;top:0;z-index:30;background:rgba(10,10,10,.88);backdrop-filter:blur(12px);border-bottom:1px solid #1f1f23}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 0}
.topo-marca{display:flex;align-items:center;gap:12px;font-family:var(--fonte-t);font-size:var(--t2);text-transform:uppercase;color:#fff}
.logo-img{height:40px;width:auto}.logo-iniciais{width:40px;height:40px;display:grid;place-items:center;background:var(--d);color:var(--sobre-d);font-family:var(--fonte-t)}
.topo nav{display:flex;gap:28px;font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#a1a1aa}.topo nav a:hover{color:var(--d)}
.btn{border-radius:0;text-transform:uppercase;letter-spacing:.08em;font-size:14px}
.btn-1{background:var(--d);color:var(--sobre-d)}
.btn-2{background:transparent;color:#fff;border:2px solid #3f3f46}.btn-2:hover{border-color:var(--d)}
.capa{position:relative;padding:clamp(72px,12vw,160px) 0 clamp(72px,10vw,130px);overflow:hidden;${fundoFoto(capa, "#18181b", "rgba(10,10,10,.55),rgba(10,10,10,.92)")}}
.capa h1{font-size:clamp(3.2rem,11vw,9rem);color:#fff;max-width:14ch;margin:0 0 26px}
.capa h1 em{font-style:normal;color:var(--d)}
.capa p{font-size:var(--t1);color:#d4d4d8;max-width:46ch;margin-bottom:34px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.faixa{background:var(--d);color:var(--sobre-d);overflow:hidden;white-space:nowrap;padding:16px 0;transform:rotate(-1.2deg);margin:-26px -2% 0;position:relative;z-index:2}
.faixa div{display:inline-flex;gap:46px;animation:corre 38s linear infinite}
.faixa span{font-family:var(--fonte-t);font-size:var(--t3);text-transform:uppercase}.faixa span::after{content:'\u2726';margin-left:46px}
@keyframes corre{to{transform:translateX(-50%)}}
.sec{padding:clamp(72px,10vw,120px) 0}
.cab{margin-bottom:clamp(32px,5vw,56px)}.cab h2{font-size:var(--t5);color:#fff}.cab p{color:#a1a1aa;font-size:var(--t1);max-width:50ch;margin-top:12px}
.linhas{border-top:1px solid #27272a}
.linha{display:grid;grid-template-columns:90px 1fr 1.3fr;gap:28px;align-items:baseline;padding:28px 0;border-bottom:1px solid #27272a;transition:background .2s,padding .2s}
.linha:hover{background:#111113;padding-left:14px}
.linha .n{font-family:var(--fonte-t);font-size:var(--t3);color:var(--d)}
.linha h3{font-size:var(--t3);color:#fff}.linha p{color:#a1a1aa;margin:0}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,5vw,72px);align-items:center}
.sobre .foto{aspect-ratio:4/5;overflow:hidden;background:#18181b;position:relative}.sobre .foto img{width:100%;height:100%;object-fit:cover;filter:grayscale(.35) contrast(1.05)}
.sobre .foto::after{content:'';position:absolute;inset:auto 0 0 0;height:8px;background:var(--d)}
.sobre h2{font-size:var(--t5);color:#fff}.sobre p{color:#d4d4d8;font-size:var(--t1);margin-top:20px}
.num{display:flex;gap:28px;flex-wrap:wrap;margin-top:28px}.num div{border-left:4px solid var(--d);padding-left:16px}.num b{display:block;font-family:var(--fonte-t);font-size:var(--t4);font-weight:400;color:#fff;line-height:1}.num span{font-size:13px;color:#a1a1aa;text-transform:uppercase;letter-spacing:.08em}
.vozes{padding:clamp(72px,10vw,120px) 0;background:#111113}.vozes h2{font-size:var(--t5);color:#fff;margin-bottom:36px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
.vozes figure{margin:0;border:1px solid #27272a;padding:28px;background:#0a0a0a}.vozes blockquote{margin:12px 0 16px;color:#e4e4e7}.vozes figcaption{font-weight:700;color:var(--d);text-transform:uppercase;letter-spacing:.06em;font-size:13px}
.estrelas{color:var(--d)}
.galeria{padding:clamp(72px,10vw,120px) 0 0}.galeria h2{font-size:var(--t5);color:#fff;margin-bottom:28px}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.galeria-grade figure{margin:0;aspect-ratio:1;overflow:hidden}.galeria-grade img{width:100%;height:100%;object-fit:cover;filter:grayscale(.4);transition:filter .3s,transform .5s}.galeria-grade figure:hover img{filter:none;transform:scale(1.04)}
.contato{background:var(--d);color:var(--sobre-d);padding:clamp(72px,10vw,120px) 0;margin-top:clamp(72px,10vw,120px)}
.contato-in{display:grid;grid-template-columns:1.3fr 1fr;gap:48px;align-items:center}
.contato h2{font-size:clamp(2.6rem,8vw,6.5rem);color:inherit;margin-bottom:18px}.contato-sub{font-size:var(--t1);color:inherit;max-width:42ch;margin-bottom:24px}
.contato-linha{display:flex;gap:12px;align-items:flex-start;margin:0 0 10px;font-weight:600;color:inherit}.contato-linha svg{flex:none;margin-top:4px}
.contato-acoes{display:grid;gap:12px}.contato-acoes .btn{justify-content:center}
.contato .btn-1{background:#0a0a0a;color:#fff}.contato .btn-2{border-color:currentColor;color:inherit}
${cssRodape("rp", "#050505", "#a1a1aa")}
@media(max-width:900px){.linha{grid-template-columns:60px 1fr}.linha p{grid-column:2}.sobre .wrap,.contato-in{grid-template-columns:1fr}.topo nav{display:none}}
@media(prefers-reduced-motion:reduce){.faixa div{animation:none}}
`, `
<header class="topo"><div class="wrap"><a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  ${menu([["#servicos", "Servi\xE7os"], ["#sobre", "Sobre"], ["#contato", "Contato"]])}${ctaPrincipal(d, "Chamar agora")}</div></header>
<section class="capa"><div class="wrap">
  <h1>${slogan(d, esc(d.categoria || "Fa\xE7a acontecer"))}</h1><p>${capaTxt}</p>
  <div class="btns">${ctaPrincipal(d, "Falar no WhatsApp")}<a class="btn btn-2" href="#servicos">Ver servi\xE7os</a></div>
</div></section>
<div class="faixa" aria-hidden="true"><div>${repetida}${repetida}</div></div>
${servicos.length ? `<section class="sec" id="servicos"><div class="wrap"><div class="cab"><h2>O que a gente faz</h2></div>
<div class="linhas">${servicos.map((s, i) => `<div class="linha"><span class="n">${String(i + 1).padStart(2, "0")}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join("")}</div></div></section>` : ""}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ""}
  <div><h2>Sobre a ${esc(d.empresa)}</h2><p>${sobreTxt}</p>
  ${Number(d.nota) >= 3.5 ? `<div class="num"><div><b>${Number(d.nota).toFixed(1).replace(".", ",")}</b><span>nota no Google</span></div>${d.avaliacoes ? `<div><b>${Number(d.avaliacoes).toLocaleString("pt-BR")}</b><span>avalia\xE7\xF5es</span></div>` : ""}</div>` : ""}</div>
</div></section>
${galeriaHtml(d, "galeria", "Dentro da casa")}
${depoimentosHtml(d, "vozes", "Quem treina com a gente")}
${blocoContato2(d, "contato", "Bora?", "Chame no WhatsApp e combine o seu primeiro dia.")}
${fim(d, rodapePremium(d))}`, { escuro: true });
  }
};
var F_CLASSICO = {
  titulos: '"Libre Baskerville",Georgia,serif',
  corpo: '"Source Sans 3",system-ui,sans-serif',
  google: "family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;600;700"
};
var classico = {
  id: "classico",
  nome: "Cl\xE1ssico",
  descricao: "Simetria, serifa de livro e detalhes dourados. Tradi\xE7\xE3o e confian\xE7a.",
  nichos: ["Advocacia", "Contabilidade", "Imobili\xE1rias", "Igrejas", "Cart\xF3rios", "Consultorias"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#fbfaf7"/><rect x="62" y="8" width="36" height="6" rx="1" fill="${corPrimaria}"/><rect x="20" y="20" width="120" height="1" fill="${corDestaque}"/>
    <rect x="34" y="32" width="92" height="8" fill="#1f2937"/><rect x="50" y="45" width="60" height="4" fill="#9ca3af"/><rect x="62" y="56" width="36" height="9" fill="${corPrimaria}"/>
    <rect x="50" y="68" width="60" height="1" fill="${corDestaque}"/><rect x="12" y="78" width="40" height="24" fill="#fff" stroke="#e5e7eb"/><rect x="60" y="78" width="40" height="24" fill="#fff" stroke="#e5e7eb"/><rect x="108" y="78" width="40" height="24" fill="#fff" stroke="#e5e7eb"/></svg>`,
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Atendimento s\xE9rio, explica\xE7\xE3o clara e acompanhamento em cada etapa.", "Atuamos com \xE9tica, transpar\xEAncia e dedica\xE7\xE3o a cada cliente.");
    const capa = urlImagem(d.capa), foto2 = urlImagem(d.fotoSobre) || fotos(d)[0] || "";
    const servicos = servicosValidos(d);
    const orn = '<div class="orn" aria-hidden="true"><i></i><b>\u25C6</b><i></i></div>';
    return documentoPremium(d, F_CLASSICO, `
body{background:#fbfaf7;color:#1f2430}
.topo{background:#fbfaf7;border-bottom:1px solid #e7dfce}
.topo .wrap{display:flex;flex-direction:column;align-items:center;gap:14px;padding:22px 0 16px}
.topo-marca{display:flex;align-items:center;gap:14px;font-family:var(--fonte-t);font-size:var(--t3);color:var(--p-esc);letter-spacing:.02em}
.logo-img{height:48px;width:auto}.logo-iniciais{width:48px;height:48px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-family:var(--fonte-t);border-radius:2px}
.topo nav{display:flex;gap:34px;font-weight:600;font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:#4b5563}.topo nav a:hover{color:var(--p-texto)}
.btn{border-radius:2px;letter-spacing:.06em}
.btn-1{background:var(--p);color:var(--sobre-p)}
.btn-2{background:transparent;color:var(--p-texto);border:1.5px solid var(--p)}
.orn{display:flex;align-items:center;gap:14px;justify-content:center;color:var(--d);margin:0 auto}.orn i{display:block;width:72px;height:1px;background:currentColor}.orn b{font-size:11px}
.capa{padding:clamp(56px,8vw,104px) 0;text-align:center;background:linear-gradient(180deg,#fbfaf7,#f4efe3)}
.capa .wrap{max-width:860px}
.etiqueta{display:inline-block;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--p-texto);margin-bottom:22px}
.capa h1{font-size:var(--t5);line-height:1.12;color:var(--p-esc);font-weight:400;margin:0 0 22px}
.capa p{font-size:var(--t1);color:#4b5563;max-width:54ch;margin:22px auto 32px}
.btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.moldura{margin:clamp(40px,6vw,64px) auto 0;max-width:980px;padding:10px;border:1px solid #d9cfb9;background:#fff}
.moldura .img{aspect-ratio:16/8;${fundoFoto(capa, d.corPrimaria, "rgba(0,0,0,0),rgba(0,0,0,.05)")}}
.selo-google{display:inline-grid;gap:2px;margin-top:26px;font-size:13px;color:#6b7280}.selo-google b{font-size:24px;color:var(--p-esc);line-height:1}
.sec{padding:clamp(56px,8vw,100px) 0}
.cab{text-align:center;max-width:640px;margin:0 auto clamp(32px,5vw,56px)}
.cab h2{font-size:var(--t4);font-weight:400;color:var(--p-esc);margin:18px 0 12px}.cab p{color:#6b7280;font-size:var(--t1)}
.colunas{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:1px solid #e0d7c3;background:#fff}
.col{padding:36px 30px;border-right:1px solid #e0d7c3;border-bottom:1px solid #e0d7c3;margin:0 -1px -1px 0}
.col .ic{color:var(--d);margin-bottom:18px}
.col h3{font-size:var(--t2);font-weight:400;color:var(--p-esc);margin-bottom:10px}.col p{color:#5b6472;margin:0}
.sobre{background:var(--p-esc);color:#e8e6df}.sobre .wrap{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(32px,5vw,72px);align-items:center}
.sobre .foto{aspect-ratio:4/5;padding:10px;border:1px solid color-mix(in srgb,var(--d) 55%,transparent)}.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:var(--t4);font-weight:400;color:#fff;margin:18px 0}.sobre p{font-size:var(--t1);color:#d9d6cc}
.sobre .orn{justify-content:flex-start;margin:0}
.vozes{padding:clamp(56px,8vw,100px) 0}.vozes h2{text-align:center;font-weight:400;font-size:var(--t4);color:var(--p-esc);margin-bottom:40px}
.vozes-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px}
.vozes figure{margin:0;background:#fff;border:1px solid #e0d7c3;padding:30px;text-align:center}.vozes blockquote{margin:12px 0 16px;color:#3b4252;font-family:var(--fonte-t);font-style:italic}.vozes figcaption{font-weight:700;color:var(--p-esc);letter-spacing:.06em;text-transform:uppercase;font-size:13px}
.galeria{padding:clamp(56px,8vw,100px) 0}.galeria h2{text-align:center;font-weight:400;font-size:var(--t4);color:var(--p-esc);margin-bottom:32px}
.galeria-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.galeria-grade figure{margin:0;aspect-ratio:4/3;overflow:hidden;border:1px solid #e0d7c3;padding:6px;background:#fff}.galeria-grade img{width:100%;height:100%;object-fit:cover}
${cssContato("contato", "border:1px solid #d9cfb9;background:#fff;padding:clamp(28px,5vw,56px)", "var(--p-esc)", "#5b6472", "#d9cfb9")}
.contato{padding-top:0}.contato h2{font-weight:400}
${cssRodape("rp", "#171b26", "#b9bdc8")}
@media(max-width:900px){.colunas{grid-template-columns:1fr 1fr}.sobre .wrap{grid-template-columns:1fr}.topo nav{gap:18px;font-size:12px;flex-wrap:wrap;justify-content:center}}
@media(max-width:560px){.colunas{grid-template-columns:1fr}.galeria-grade{grid-template-columns:1fr}}
`, `
<header class="topo"><div class="wrap"><a class="topo-marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  ${menu([["#servicos", "Atua\xE7\xE3o"], ["#sobre", "Quem somos"], ["#contato", "Contato"]])}</div></header>
<section class="capa"><div class="wrap">
  <span class="etiqueta">${esc(d.categoria || "Atendimento")}</span>${orn}
  <h1>${slogan(d, "Tradi\xE7\xE3o, seriedade e aten\xE7\xE3o a cada caso")}</h1><p>${capaTxt}</p>
  <div class="btns">${ctaPrincipal(d, "Falar com a gente")}<a class="btn btn-2" href="#servicos">Conhecer a atua\xE7\xE3o</a></div>
  ${seloGoogle(d)}
  <div class="moldura"><div class="img" role="img" aria-label="${esc(d.empresa)}"></div></div>
</div></section>
${servicos.length ? `<section class="sec" id="servicos"><div class="wrap"><div class="cab">${orn}<h2>\xC1reas de atua\xE7\xE3o</h2><p>Atendimento individual, com clareza em cada etapa.</p></div>
<div class="colunas">${servicos.map((s, i) => `<div class="col"><div class="ic">${iconeDoServico(i)}</div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>`).join("")}</div></div></section>` : ""}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ""}
  <div>${orn}<h2>Quem somos</h2><p>${sobreTxt}</p></div>
</div></section>
${galeriaHtml(d, "galeria", "O ambiente")}
${depoimentosHtml(d, "vozes", "Depoimentos")}
${blocoContato2(d, "contato", "Entre em contato", "Conte o seu caso e retornamos pelo WhatsApp.")}
${fim(d, rodapePremium(d))}`);
  }
};
var LAYOUTS_PREMIUM_2 = [bento, natural, impacto, classico];

// src/templates/sites/cenas-base.ts
var secaoLigada = (d, id) => d.secoes?.[id] !== false;
var tem = (t) => !!(t || "").trim();
var diferenciaisDe = (d, max = 4) => (d.diferenciais || []).filter((x) => tem(x.titulo) && tem(x.texto)).slice(0, max);
var passosDe = (d, max = 4) => (d.passos || []).filter((x) => tem(x.titulo) && tem(x.texto)).slice(0, max);
var zapTexto = (d, mensagem) => {
  const n = digitos(d.whatsapp || d.telefone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(mensagem)}` : "";
};
var horarioCurto = (d) => {
  const h = (d.horario || "").trim();
  if (!h) return "";
  const primeiro = h.split(/ · |;|\n/)[0].trim();
  return primeiro.length > 34 ? primeiro.slice(0, 33) + "\u2026" : primeiro;
};
var notaReal = (d) => {
  const n = Number(d.nota);
  if (!n || n < 3.5) return null;
  return {
    nota: n.toFixed(1).replace(".", ","),
    avaliacoes: d.avaliacoes ? Number(d.avaliacoes).toLocaleString("pt-BR") : ""
  };
};
var num = (i) => String(i + 1).padStart(2, "0");
var partirDestaque = (texto) => {
  const frases3 = texto.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [texto];
  return { destaque: (frases3[0] || texto).trim(), resto: frases3.slice(1).join(" ").trim() };
};
var galeriaCena = (fotosLista, empresa, titulo2) => {
  const f = fotosLista.slice(0, 6);
  if (f.length < 2) return "";
  return `<section class="sec" style="padding-top:0"><div class="wrap"><div class="cab"><h2>${titulo2}</h2></div><div class="gal-cena">${f.map((src, i) => `<figure><img src="${src}" alt="${empresa} \u2014 foto ${i + 1}" loading="lazy"></figure>`).join("")}</div></div></section>`;
};
var cssGaleriaCena = (raio = "14px", borda = "transparent") => `.gal-cena{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr));gap:14px}.gal-cena figure{margin:0;aspect-ratio:4/3;border-radius:${raio};overflow:hidden;box-shadow:0 0 0 1px ${borda}}.gal-cena img{width:100%;height:100%;object-fit:cover;transition:transform .5s}.gal-cena figure:hover img{transform:scale(1.04)}`;

// src/templates/sites/cena-ritual.ts
var FONTES_RITUAL = {
  titulos: '"Bodoni Moda","Playfair Display",Georgia,serif',
  corpo: '"Figtree",system-ui,sans-serif',
  google: "family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,600;1,6..96,400;1,6..96,500&family=Figtree:wght@400;500;600;700&family=Allura"
};
var fraseCurta = (texto) => (texto.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || [texto]).slice(0, 2).join(" ").trim();
var ritual = {
  id: "ritual",
  nome: "Ritual",
  descricao: "T\xEDtulo de revista, fotos em arco e menu de tratamentos. Para est\xE9tica, sal\xE3o e cl\xEDnicas de beleza.",
  nichos: ["Est\xE9tica", "Sal\xF5es de beleza", "Cl\xEDnicas de est\xE9tica", "Spas", "C\xEDlios e sobrancelhas"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#fbf4ef"/><rect x="58" y="8" width="44" height="5" rx="2" fill="#2a1f23"/>
    <rect x="10" y="26" width="76" height="13" fill="#2a1f23"/><rect x="10" y="43" width="58" height="13" fill="${corPrimaria}"/><rect x="10" y="62" width="30" height="8" rx="4" fill="#2a1f23"/>
    <path d="M100 98V56a20 20 0 0 1 40 0v42z" fill="${corPrimaria}" opacity=".35"/><circle cx="96" cy="76" r="14" fill="${corDestaque}" opacity=".6"/>
    <rect x="10" y="82" width="70" height="1" fill="#d8c6bc"/><rect x="10" y="90" width="70" height="1" fill="#d8c6bc"/><rect x="10" y="98" width="70" height="1" fill="#d8c6bc"/></svg>`,
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Um espa\xE7o para cuidar de voc\xEA com tempo, t\xE9cnica e aten\xE7\xE3o a cada detalhe.", "Do primeiro atendimento ao resultado, cada etapa \xE9 pensada para voc\xEA se sentir bem.");
    const capa = urlImagem(d.capa);
    const galeria2 = fotos(d);
    const foto2 = urlImagem(d.fotoSobre) || galeria2[0] || "";
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const horario = horarioCurto(d);
    const mapa = linkMapa(d);
    const palavras2 = (d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : "Realce o que voc\xEA tem de melhor").split(" ");
    const ultima = palavras2.pop() || "";
    const titulo2 = `${palavras2.join(" ")} <em>${ultima}</em>`;
    const difs = secaoLigada(d, "diferenciais") ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, "passos") ? passosDe(d, 3) : [];
    const voz = depoimentosValidos(d);
    const trio = galeria2.slice(0, 3);
    return documentoPremium(d, FONTES_RITUAL, `
:root{--r-fundo:#fbf4ef;--r-tinta:#2a1f23;--r-suave:#6e5d63;--r-linha:#e6d5cb;--r-cartao:#fffaf6}
body{background:var(--r-fundo);color:var(--r-tinta)}
h1,h2,h3{font-family:var(--fonte-t);font-weight:400;letter-spacing:-.015em}
.linha .n,.dif-item small,.passo .gde,.fato b{font-variant-numeric:lining-nums}
em{font-style:italic;color:var(--p-texto)}
.topo{position:sticky;top:0;z-index:40;background:color-mix(in srgb,var(--r-fundo) 90%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--r-linha)}
.topo-in{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:20px;padding:16px 0}
.topo nav{display:flex;gap:30px;font-size:13px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--r-suave)}
.topo nav a:hover{color:var(--p-texto)}
.marca{display:flex;align-items:center;gap:12px;justify-self:center;font-family:var(--fonte-t);font-size:clamp(1.2rem,2.4vw,1.7rem);font-style:italic;color:var(--r-tinta)}
.logo-img{height:40px;width:auto}.logo-iniciais{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-style:normal;font-weight:600;font-size:15px}
.topo-d{justify-self:end}
.btn{border-radius:999px;font-weight:600}
.btn-1{background:var(--r-tinta);color:#fff}.btn-1:hover{background:var(--p)}
.btn-2{background:transparent;color:var(--r-tinta);border:1.5px solid var(--r-tinta)}
.capa{position:relative;padding:clamp(40px,6vw,88px) 0 clamp(64px,8vw,120px);overflow:hidden}
.capa-in{display:grid;grid-template-columns:1.25fr 1fr;gap:clamp(24px,4vw,64px);align-items:center}
.eyebrow{display:flex;align-items:center;gap:14px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--p-texto);margin:0 0 22px}
.eyebrow::before{content:'';width:44px;height:1px;background:currentColor}
.capa h1{font-size:clamp(3.4rem,9.2vw,8.4rem);line-height:.96;letter-spacing:-.035em;margin:0 0 28px;color:var(--r-tinta);text-wrap:balance}
.capa .lead{font-size:var(--t1);color:var(--r-suave);max-width:44ch;margin:0 0 32px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.colagem{position:relative;aspect-ratio:4/5;max-width:520px;width:100%;margin-left:auto}
.arco{position:absolute;inset:0 8% 10% 12%;border-radius:999px 999px 28px 28px;overflow:hidden;${fundoFoto(capa, d.corPrimaria, "rgba(0,0,0,0),rgba(0,0,0,.08)")}}
.oval{position:absolute;left:0;bottom:0;width:46%;aspect-ratio:1;border-radius:50%;border:8px solid var(--r-fundo);overflow:hidden;${fundoFoto(foto2, d.corDestaque, "rgba(0,0,0,0),rgba(0,0,0,.05)")}}
.giro{position:absolute;right:-2%;top:6%;width:clamp(96px,14vw,140px);height:auto;animation:gira 24s linear infinite}
.giro text{font:600 9.6px var(--fonte-c);letter-spacing:.14em;fill:var(--r-tinta);text-transform:uppercase}
.giro circle{fill:var(--r-fundo)}
@keyframes gira{to{transform:rotate(360deg)}}
.capa .selo-google{position:absolute;right:0;bottom:6%;background:var(--r-cartao);border-radius:18px;padding:14px 18px;box-shadow:0 18px 40px -22px rgba(60,30,20,.45);display:grid;gap:2px;font-size:13px;color:var(--r-suave)}
.capa .selo-google b{font-size:26px;color:var(--r-tinta);line-height:1;font-family:var(--fonte-t)}
.marca-agua{position:absolute;left:0;right:0;bottom:-.34em;text-align:center;font-family:var(--fonte-t);font-style:italic;font-size:clamp(5rem,18vw,17rem);line-height:1;color:transparent;-webkit-text-stroke:1px var(--r-linha);white-space:nowrap;pointer-events:none;user-select:none;z-index:0}
.fatos{border-top:1px solid var(--r-linha);border-bottom:1px solid var(--r-linha);background:var(--r-cartao)}
.fatos .wrap{display:grid;grid-template-columns:repeat(3,1fr)}
.fato{padding:26px clamp(14px,2vw,32px);border-right:1px solid var(--r-linha)}.fato:last-child{border-right:0}
.fato small{display:block;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--p-texto);margin-bottom:6px}
.fato b{font-family:var(--fonte-t);font-weight:400;font-size:var(--t2);color:var(--r-tinta)}
.sec{padding:clamp(72px,10vw,140px) 0}
.menu .wrap{display:grid;grid-template-columns:.8fr 1.5fr;gap:clamp(32px,6vw,96px)}
.menu-cab{position:sticky;top:110px;align-self:start}
.menu-cab h2{font-size:clamp(2.6rem,6vw,5.2rem);line-height:1;margin:0 0 18px}
.menu-cab p{color:var(--r-suave);font-size:var(--t1);max-width:30ch}
.linha{display:grid;grid-template-columns:56px 1fr auto;gap:8px 22px;align-items:baseline;padding:28px 0;border-top:1px solid var(--r-linha);transition:padding .3s}
.linha:last-child{border-bottom:1px solid var(--r-linha)}
.linha:hover{padding-left:12px}.linha:hover h3{color:var(--p-texto)}
.linha .n{font-family:var(--fonte-t);font-style:italic;color:var(--p-texto);font-size:var(--t1)}
.linha h3{font-size:clamp(1.5rem,3vw,2.3rem);line-height:1.1;margin:0;transition:color .2s}
.linha p{grid-column:2;margin:6px 0 0;color:var(--r-suave);max-width:46ch}
.linha a{font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--p-texto);white-space:nowrap;border-bottom:1px solid currentColor;padding-bottom:3px}
.frase{text-align:center;padding:clamp(72px,10vw,140px) 0 clamp(40px,6vw,80px)}
.frase blockquote{margin:0 auto;max-width:22ch;font-family:var(--fonte-t);font-style:italic;font-size:clamp(2.2rem,5.6vw,4.6rem);line-height:1.08;letter-spacing:-.02em;color:var(--r-tinta);text-wrap:balance}
.frase .assina{margin-top:26px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--p-texto)}
.trio{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(14px,3vw,40px);align-items:start;padding-bottom:clamp(72px,10vw,140px)}
.trio figure{margin:0;overflow:hidden;background:var(--p-cla)}
.trio figure:nth-child(1){aspect-ratio:3/4;border-radius:999px 999px 0 0;margin-top:48px}
.trio figure:nth-child(2){aspect-ratio:1;border-radius:50%}
.trio figure:nth-child(3){aspect-ratio:3/4;border-radius:0 0 999px 999px;margin-top:-24px}
.trio img{width:100%;height:100%;object-fit:cover}
.dif{background:var(--r-cartao);border-top:1px solid var(--r-linha);border-bottom:1px solid var(--r-linha)}
.dif-grade{display:grid;grid-template-columns:repeat(4,1fr)}
.dif-item{padding:36px clamp(14px,2vw,32px);border-right:1px solid var(--r-linha)}.dif-item:last-child{border-right:0}
.dif-item small{font-family:var(--fonte-t);font-style:italic;color:var(--p-texto);font-size:var(--t1)}
.dif-item h3{font-size:var(--t2);margin:10px 0 8px}.dif-item p{margin:0;color:var(--r-suave)}
.passos .titulo{text-align:center;margin-bottom:clamp(36px,5vw,64px)}.passos .titulo h2{font-size:clamp(2.4rem,5.4vw,4.6rem)}
.passos-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(20px,4vw,56px)}
.passo .gde{display:block;font-family:var(--fonte-t);font-size:clamp(5rem,12vw,10rem);line-height:.9;color:transparent;-webkit-text-stroke:1.5px var(--p);margin-bottom:8px}
.passo h3{font-size:var(--t3);margin:0 0 8px}.passo p{color:var(--r-suave);margin:0}
.vozes{padding:clamp(72px,10vw,140px) 0;background:var(--p);color:var(--sobre-p)}
.vozes blockquote{margin:0 auto;max-width:28ch;text-align:center;font-family:var(--fonte-t);font-style:italic;font-size:clamp(1.8rem,4vw,3.2rem);line-height:1.15;color:inherit}
.vozes figcaption{text-align:center;margin-top:22px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;opacity:.85}
.vozes .estrelas{display:block;text-align:center;margin-bottom:18px;color:var(--sobre-p)}
.chamada{padding:clamp(72px,10vw,140px) 0;text-align:center}
.chamada h2{font-size:clamp(3rem,8vw,7rem);line-height:.98;margin:0 0 30px}
.contato .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(24px,5vw,72px);align-items:end;padding:clamp(56px,8vw,96px) 0;border-top:1px solid var(--r-linha)}
.contato h2{font-size:clamp(2rem,4.4vw,3.6rem);margin:0 0 18px}
.contato p{display:flex;gap:12px;align-items:flex-start;margin:0 0 10px;color:var(--r-suave)}.contato svg{flex:none;margin-top:4px;color:var(--p-texto)}
.contato .acoes{display:grid;gap:12px}.contato .btn{justify-content:center}
.sx{--sx-fundo:var(--r-fundo);--sx-alt:var(--r-cartao);--sx-texto:var(--r-tinta);--sx-suave:var(--r-suave);--sx-card:var(--r-cartao);--sx-borda:var(--r-linha);--sx-raio:22px}
.sx-cab h2{font-family:var(--fonte-t);font-weight:400;font-style:italic;font-size:clamp(2.2rem,5vw,4rem)}
.sx-lista details{border-radius:22px}
${cssRodape("rp", "#2a1f23", "#d8c6bc")}
@media(max-width:900px){.capa-in{grid-template-columns:1fr}.colagem{margin:12px auto 0;max-width:420px}.menu .wrap{grid-template-columns:1fr}.menu-cab{position:static}
  .topo-in{grid-template-columns:auto 1fr}.topo nav{display:none}.marca{justify-self:start}.dif-grade{grid-template-columns:1fr 1fr}.passos-grade{grid-template-columns:1fr}
  .contato .wrap{grid-template-columns:1fr}.trio{grid-template-columns:1fr 1fr}.trio figure:nth-child(3){display:none}.fatos .wrap{grid-template-columns:1fr}.fato{border-right:0;border-bottom:1px solid var(--r-linha)}}
@media(max-width:560px){.linha{grid-template-columns:40px 1fr}.linha a{grid-column:2;justify-self:start}.dif-grade{grid-template-columns:1fr}.dif-item{border-right:0;border-bottom:1px solid var(--r-linha)}}
@media(prefers-reduced-motion:reduce){.giro{animation:none}}
`, `
<header class="topo"><div class="wrap topo-in">
  <nav aria-label="Se\xE7\xF5es"><a href="#servicos">Tratamentos</a><a href="#sobre">Sobre</a><a href="#contato">Contato</a></nav>
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <div class="topo-d">${ctaPrincipal(d, "Agendar")}</div>
</div></header>
<section class="capa"><div class="wrap capa-in">
  <div><p class="eyebrow">${esc(d.categoria || "Beleza e bem-estar")}${d.cidade ? ` \xB7 ${esc(d.cidade)}` : ""}</p>
    <h1>${titulo2}</h1><p class="lead">${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, "Agendar hor\xE1rio")}<a class="btn btn-2" href="#servicos">Ver tratamentos</a></div></div>
  <div class="colagem">
    <div class="arco" role="img" aria-label="${esc(d.empresa)}"></div><div class="oval" aria-hidden="true"></div>
    <svg class="giro" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="58"/><defs><path id="giro-c" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs><text><textPath href="#giro-c" textLength="270">agende o seu hor\xE1rio \u2726 agende o seu hor\xE1rio \u2726</textPath></text></svg>
    ${seloGoogle(d)}
  </div>
</div><div class="marca-agua" aria-hidden="true">${esc(d.empresa)}</div></section>
${nota || horario || d.endereco ? `<section class="fatos"><div class="wrap">
  ${nota ? `<div class="fato"><small>Avalia\xE7\xE3o no Google</small><b>${nota.nota}${nota.avaliacoes ? ` \xB7 ${nota.avaliacoes} avalia\xE7\xF5es` : ""}</b></div>` : ""}
  ${horario ? `<div class="fato"><small>Hor\xE1rio</small><b>${esc(horario)}</b></div>` : ""}
  ${d.endereco ? `<div class="fato"><small>Visite</small><b>${esc(d.cidade || d.endereco.split(",").slice(-1)[0].trim())}</b></div>` : ""}
</div></section>` : ""}
${servicos.length ? `<section class="sec menu" id="servicos"><div class="wrap">
  <div class="menu-cab"><h2>Nossos <em>tratamentos</em></h2><p>Escolha um cuidado e chame direto: a mensagem j\xE1 vai pronta.</p></div>
  <div>${servicos.map((s, i) => `<div class="linha"><span class="n">${num(i)}</span><h3>${esc(s.titulo)}</h3>${zapTexto(d, `Ol\xE1! Quero agendar: ${s.titulo}`) ? `<a href="${zapTexto(d, `Ol\xE1! Quero agendar: ${s.titulo}`)}" target="_blank" rel="noopener">Agendar</a>` : ""}<p>${esc(s.descricao)}</p></div>`).join("")}</div>
</div></section>` : ""}
${difs.length ? `<section class="dif" id="diferenciais"><div class="wrap"><div class="dif-grade">${difs.map((x, i) => `<div class="dif-item"><small>${num(i)}</small><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join("")}</div></div></section>` : ""}
<section class="frase" id="sobre"><div class="wrap"><p class="eyebrow" style="justify-content:center">Nossa filosofia</p>
  <blockquote>${fraseCurta(sobreTxt)}</blockquote><p class="assina">${esc(d.empresa)}</p></div></section>
${trio.length ? `<div class="wrap trio">${trio.map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} \u2014 foto ${i + 1}" loading="lazy"></figure>`).join("")}</div>` : ""}
${passos.length ? `<section class="sec passos" id="passos"><div class="wrap"><div class="titulo"><p class="eyebrow" style="justify-content:center">Passo a passo</p><h2>Como \xE9 o <em>seu ritual</em></h2></div>
  <div class="passos-grade">${passos.map((p, i) => `<div class="passo"><span class="gde" aria-hidden="true">${num(i)}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join("")}</div></div></section>` : ""}
${voz.length ? `<section class="vozes"><div class="wrap"><figure style="margin:0"><span class="estrelas" aria-hidden="true">\u2605\u2605\u2605\u2605\u2605</span><blockquote>\u201C${esc(voz[0].texto)}\u201D</blockquote>${voz[0].autor ? `<figcaption>${esc(voz[0].autor)}</figcaption>` : ""}</figure></div></section>` : ""}
${secaoLigada(d, "ctaFinal") ? `<section class="chamada" id="chamada"><div class="wrap"><h2>Seu momento <em>come\xE7a aqui</em></h2>${ctaPrincipal(d, "Agendar agora")}</div></section>` : ""}
<section class="contato" id="contato"><div class="wrap">
  <div><h2>Venha nos <em>visitar</em></h2>
    ${d.endereco ? `<p>${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ""}${d.horario ? `<p>${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ""}</div>
  <div class="acoes">${ctaPrincipal(d, "Chamar no WhatsApp")}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  }
};
var CENAS_RITUAL = [ritual];

// src/templates/sites/cena-mesa.ts
var FONTES_MESA = {
  titulos: '"Instrument Serif","Playfair Display",Georgia,serif',
  corpo: '"Inter",system-ui,sans-serif',
  google: "family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700"
};
var mesa = {
  id: "mesa",
  nome: "Mesa",
  descricao: "Capa em tela cheia, serifa it\xE1lica gigante e card\xE1pio de papel. Para restaurantes, pizzarias e bares.",
  nichos: ["Restaurantes", "Pizzarias", "Bares", "Hamburguerias", "Churrascarias", "Cafeterias"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#120e0c"/><rect width="160" height="64" fill="${corPrimaria}" opacity=".45"/>
    <rect x="10" y="9" width="24" height="5" rx="2" fill="#f3eadc"/><rect x="120" y="8" width="30" height="8" rx="4" fill="${corDestaque}"/>
    <rect x="10" y="34" width="86" height="12" fill="#f3eadc"/><rect x="10" y="50" width="60" height="12" fill="${corDestaque}"/>
    <rect x="22" y="72" width="116" height="32" fill="#f3eadc"/><rect x="30" y="79" width="40" height="3" fill="#120e0c"/><rect x="30" y="86" width="40" height="3" fill="#120e0c"/><rect x="30" y="93" width="40" height="3" fill="#120e0c"/>
    <rect x="90" y="79" width="40" height="3" fill="#120e0c"/><rect x="90" y="86" width="40" height="3" fill="#120e0c"/><rect x="90" y="93" width="40" height="3" fill="#120e0c"/></svg>`,
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Comida de verdade, feita com tempero e aten\xE7\xE3o, para comer aqui ou pedir pelo WhatsApp.", "Aqui o prato chega no ponto, o atendimento \xE9 pr\xF3ximo e a vontade \xE9 que voc\xEA volte.");
    const capa = urlImagem(d.capa);
    const galeria2 = fotos(d);
    const foto2 = urlImagem(d.fotoSobre);
    const todas = [foto2, ...galeria2].filter(Boolean).slice(0, 4);
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const horario = horarioCurto(d);
    const mapa = linkMapa(d);
    const palavras2 = (d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : "Venha comer bem").split(" ");
    const ultimas = palavras2.splice(Math.max(1, palavras2.length - 2)).join(" ");
    const titulo2 = `${palavras2.join(" ")} <em>${ultimas}</em>`;
    const difs = secaoLigada(d, "diferenciais") ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, "passos") ? passosDe(d, 3) : [];
    const voz = depoimentosValidos(d);
    const legendas = ["Feito na hora", "Do forno \xE0 mesa", "Para dividir", "Tempero da casa", "Venha provar"];
    return documentoPremium(d, FONTES_MESA, `
:root{--m-fundo:#120e0c;--m-papel:#f3eadc;--m-tinta:#2b1f17;--m-creme:#f3eadc;--m-suave:#b9ab98;--m-linha:rgba(243,234,220,.16)}
body{background:var(--m-fundo);color:var(--m-creme)}
h1,h2,h3{font-family:var(--fonte-t);font-weight:400;letter-spacing:-.01em}
em{font-style:italic;color:var(--d)}
.topo{position:absolute;inset:0 0 auto 0;z-index:30}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:22px 0}
.marca{display:flex;align-items:center;gap:12px;font-family:var(--fonte-t);font-style:italic;font-size:clamp(1.4rem,2.6vw,2rem);color:var(--m-creme)}
.logo-img{height:44px;width:auto}.logo-iniciais{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--d);color:var(--sobre-d);font-style:normal;font-weight:700;font-size:15px;font-family:var(--fonte-c)}
.topo nav{display:flex;gap:34px;font-size:13px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--m-creme)}
.topo nav a{opacity:.8}.topo nav a:hover{opacity:1;color:var(--d)}
.btn{border-radius:999px;font-weight:700}
.btn-1{background:var(--d);color:var(--sobre-d)}.btn-1:hover{filter:brightness(1.08)}
.btn-2{background:transparent;color:var(--m-creme);border:1.5px solid rgba(243,234,220,.4)}.btn-2:hover{border-color:var(--d);color:var(--d)}
.capa{position:relative;min-height:100svh;display:flex;flex-direction:column;justify-content:flex-end;padding:140px 0 clamp(40px,6vw,72px);${fundoFoto(capa, d.corPrimaria, "rgba(18,14,12,.35),rgba(18,14,12,.94)")}}
.capa::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 20% 100%,rgba(18,14,12,.85),transparent 60%);pointer-events:none}
.capa-in{position:relative;z-index:2;display:grid;grid-template-columns:1fr auto;gap:40px;align-items:end}
.eyebrow{font-size:13px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:var(--d);margin:0 0 18px}
.capa h1{font-size:clamp(4rem,13vw,12rem);line-height:.86;letter-spacing:-.03em;margin:0 0 26px;color:var(--m-creme);text-wrap:balance}
.capa .lead{font-size:var(--t1);color:var(--m-creme);opacity:.86;max-width:46ch;margin:0 0 30px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.hoje{background:rgba(18,14,12,.72);backdrop-filter:blur(10px);border:1px solid var(--m-linha);border-radius:22px;padding:22px 26px;min-width:240px;display:grid;gap:12px}
.hoje small{font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--d)}
.hoje b{font-family:var(--fonte-t);font-weight:400;font-size:var(--t2);color:var(--m-creme);display:block;line-height:1.15}
.hoje .estrelas{color:var(--d)}
.cardapio{padding:clamp(72px,10vw,140px) 0}
.papel{max-width:1080px;margin:0 auto;background:var(--m-papel);color:var(--m-tinta);padding:clamp(10px,1.4vw,18px);border-radius:6px}
.papel-in{border:1px solid rgba(43,31,23,.5);outline:1px solid rgba(43,31,23,.25);outline-offset:-7px;padding:clamp(28px,5vw,72px) clamp(20px,5vw,72px)}
.papel .orn{display:flex;align-items:center;justify-content:center;gap:14px;color:var(--p-texto);margin-bottom:10px}.papel .orn i{width:60px;height:1px;background:currentColor}
.papel h2{text-align:center;font-size:clamp(3rem,8vw,6.4rem);line-height:.95;color:var(--m-tinta);margin:0 0 8px}
.papel .sub{text-align:center;font-style:italic;font-family:var(--fonte-t);font-size:var(--t2);color:rgba(43,31,23,.7);margin:0 0 clamp(32px,5vw,56px)}
.pratos{display:grid;grid-template-columns:1fr 1fr;gap:0 clamp(28px,5vw,72px)}
.prato{padding:16px 0;border-bottom:1px dotted rgba(43,31,23,.4)}
.prato-topo{display:flex;align-items:baseline;gap:12px}
.prato h3{font-size:var(--t2);color:var(--m-tinta);margin:0;white-space:normal}
.prato .pt{flex:1;border-bottom:1px dotted rgba(43,31,23,.45);transform:translateY(-4px);min-width:20px}
.prato a{font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--p-texto)}
.prato a:hover{text-decoration:underline}
.prato p{margin:6px 0 0;font-style:italic;color:rgba(43,31,23,.72);font-family:var(--fonte-t);font-size:var(--t1)}
.papel .rodape-papel{text-align:center;margin-top:36px}
.papel .btn-1{background:var(--m-tinta);color:var(--m-papel)}
.mosaico{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:clamp(140px,18vw,260px);gap:12px;padding-bottom:clamp(72px,10vw,140px)}
.mosaico figure{margin:0;position:relative;overflow:hidden;border-radius:14px;background:#1c1612}
.mosaico figure:nth-child(1){grid-column:span 2;grid-row:span 2}
.m4 figure:nth-child(4),.m3 figure:nth-child(2),.m3 figure:nth-child(3){grid-column:span 2}
.mosaico img{width:100%;height:100%;object-fit:cover;transition:transform .8s}.mosaico figure:hover img{transform:scale(1.05)}
.mosaico figcaption{position:absolute;left:0;right:0;bottom:0;padding:34px 18px 14px;background:linear-gradient(transparent,rgba(18,14,12,.85));font-family:var(--fonte-t);font-style:italic;font-size:var(--t2)}
.historia{padding:0 0 clamp(72px,10vw,140px)}
.historia .wrap{display:grid;grid-template-columns:1.5fr 1fr;gap:clamp(32px,6vw,96px);align-items:center}
.historia blockquote{margin:0;font-family:var(--fonte-t);font-size:clamp(2.2rem,5.4vw,4.8rem);line-height:1.04;letter-spacing:-.02em;text-wrap:balance}
.hist-resto{font-size:var(--t1);color:var(--m-suave);max-width:50ch;margin:24px 0 0}
.reserva{border:1px solid var(--m-linha);border-radius:22px;padding:30px;display:grid;gap:18px}
.reserva small{font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--d)}
.reserva b{font-family:var(--fonte-t);font-weight:400;font-size:var(--t2);display:block;line-height:1.2}
.dif{border-top:1px solid var(--m-linha);border-bottom:1px solid var(--m-linha)}
.dif-grade{display:grid;grid-template-columns:repeat(4,1fr)}
.dif-item{padding:40px clamp(14px,2vw,30px);border-right:1px solid var(--m-linha)}.dif-item:last-child{border-right:0}
.dif-item h3{font-size:var(--t3);color:var(--m-creme);margin:0 0 8px}.dif-item p{margin:0;color:var(--m-suave)}
.dif-item i{display:block;font-family:var(--fonte-t);color:var(--d);margin-bottom:12px;font-size:var(--t1);font-variant-numeric:lining-nums}
.passos{padding:clamp(72px,10vw,140px) 0}.passos .titulo{margin-bottom:clamp(32px,5vw,56px)}.passos .titulo h2{font-size:clamp(2.6rem,6vw,5.2rem)}
.passos-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:clamp(20px,4vw,56px)}
.passo .gde{display:block;font-family:var(--fonte-t);font-style:italic;font-size:clamp(4.5rem,10vw,8rem);line-height:.9;color:var(--d);font-variant-numeric:lining-nums}
.passo h3{font-size:var(--t3);margin:8px 0}.passo p{margin:0;color:var(--m-suave)}
.vozes{padding:clamp(72px,10vw,140px) 0;text-align:center;border-top:1px solid var(--m-linha)}
.vozes .aspas{display:block;font-family:var(--fonte-t);font-size:clamp(5rem,10vw,9rem);line-height:.6;color:var(--d)}
.vozes blockquote{margin:0 auto;max-width:26ch;font-family:var(--fonte-t);font-size:clamp(2rem,4.6vw,3.8rem);line-height:1.08}
.vozes figcaption{margin-top:22px;font-size:13px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:var(--m-suave)}
.chamada{background:var(--d);color:var(--sobre-d);padding:clamp(64px,9vw,120px) 0;text-align:center}
.chamada h2{font-size:clamp(2.8rem,8vw,7rem);line-height:.95;margin:0 0 28px;color:var(--sobre-d)}.chamada h2 em{color:var(--sobre-d);opacity:.7}
.chamada .btn-1{background:var(--m-fundo);color:var(--m-creme)}
.onde{padding:clamp(72px,10vw,140px) 0}
.onde .wrap{display:grid;grid-template-columns:1.3fr 1fr;gap:clamp(32px,6vw,96px);align-items:end}
.onde h2{font-size:clamp(2.6rem,6vw,5.2rem);margin:0 0 20px}.onde .end{font-family:var(--fonte-t);font-size:var(--t3);line-height:1.2;margin:0 0 8px}
.onde .hor{color:var(--m-suave);margin:0}.onde .acoes{display:grid;gap:12px}.onde .btn{justify-content:center}
.sx{--sx-fundo:var(--m-fundo);--sx-alt:#17120f;--sx-card:#1c1612;--sx-borda:var(--m-linha);--sx-texto:var(--m-creme);--sx-suave:var(--m-suave);--sx-icone:var(--d);--sx-raio:16px}
.sx-cab h2{font-family:var(--fonte-t);font-weight:400;font-size:clamp(2.4rem,5.4vw,4.4rem)}
${cssRodape("rp", "#0a0706", "#a99b88")}
@media(max-width:900px){.topo nav{display:none}.capa-in{grid-template-columns:1fr}.hoje{min-width:0}.pratos{grid-template-columns:1fr}.mosaico{grid-template-columns:1fr 1fr}.mosaico figure:nth-child(1){grid-column:span 2}.historia .wrap,.onde .wrap{grid-template-columns:1fr}.dif-grade{grid-template-columns:1fr 1fr}.passos-grade{grid-template-columns:1fr}}
@media(max-width:560px){.dif-grade{grid-template-columns:1fr}.dif-item{border-right:0;border-bottom:1px solid var(--m-linha)}.prato a{display:none}}
`, `
<header class="topo"><div class="wrap">
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav aria-label="Se\xE7\xF5es"><a href="#cardapio">Card\xE1pio</a><a href="#sobre">A casa</a><a href="#contato">Visite</a></nav>
  ${ctaPrincipal(d, "Pedir agora")}
</div></header>
<section class="capa"><div class="wrap capa-in">
  <div><p class="eyebrow">${esc(d.categoria || "Card\xE1pio e pedidos")}${d.cidade ? ` \xB7 ${esc(d.cidade)}` : ""}</p>
    <h1>${titulo2}</h1><p class="lead">${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, "Pedir pelo WhatsApp")}<a class="btn btn-2" href="#cardapio">Ver o card\xE1pio</a></div></div>
  ${horario || nota ? `<aside class="hoje" aria-label="Informa\xE7\xF5es">
    ${horario ? `<div><small>Funcionamento</small><b>${esc(horario)}</b></div>` : ""}
    ${nota ? `<div><small>No Google</small><b><span class="estrelas" aria-hidden="true">\u2605</span> ${nota.nota}${nota.avaliacoes ? ` \xB7 ${nota.avaliacoes} avalia\xE7\xF5es` : ""}</b></div>` : ""}</aside>` : ""}
</div></section>
${servicos.length ? `<section class="cardapio" id="cardapio"><div class="wrap"><div class="papel"><div class="papel-in">
  <div class="orn" aria-hidden="true"><i></i>\u2726<i></i></div><h2>Card\xE1pio</h2><p class="sub">Escolha e pe\xE7a: a mensagem j\xE1 vai pronta.</p>
  <div class="pratos">${servicos.map((s) => `<div class="prato"><div class="prato-topo"><h3>${esc(s.titulo)}</h3><span class="pt" aria-hidden="true"></span>${zapTexto(d, `Ol\xE1! Quero pedir: ${s.titulo}`) ? `<a href="${zapTexto(d, `Ol\xE1! Quero pedir: ${s.titulo}`)}" target="_blank" rel="noopener">Pedir</a>` : ""}</div><p>${esc(s.descricao)}</p></div>`).join("")}</div>
  <div class="rodape-papel">${ctaPrincipal(d, "Fazer meu pedido")}</div>
</div></div></div></section>` : ""}
${todas.length >= 3 ? `<div class="wrap mosaico m${todas.length}" aria-label="Fotos">${todas.map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} \u2014 foto ${i + 1}" loading="lazy"><figcaption>${legendas[i % legendas.length]}</figcaption></figure>`).join("")}</div>` : ""}
<section class="historia" id="sobre"><div class="wrap"><div><blockquote>${partirDestaque(sobreTxt).destaque}</blockquote>${partirDestaque(sobreTxt).resto ? `<p class="hist-resto">${partirDestaque(sobreTxt).resto}</p>` : ""}</div>
  <div class="reserva">${d.endereco ? `<div><small>Onde</small><b>${esc(d.endereco)}</b></div>` : ""}${d.horario ? `<div><small>Quando</small><b>${esc(horario || d.horario)}</b></div>` : ""}</div></div></section>
${difs.length ? `<section class="dif" id="diferenciais"><div class="wrap"><div class="dif-grade">${difs.map((x, i) => `<div class="dif-item"><i>${num(i)}</i><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join("")}</div></div></section>` : ""}
${passos.length ? `<section class="passos" id="passos"><div class="wrap"><div class="titulo"><p class="eyebrow">Passo a passo</p><h2>Como <em>pedir</em></h2></div>
  <div class="passos-grade">${passos.map((p, i) => `<div class="passo"><span class="gde" aria-hidden="true">${num(i)}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join("")}</div></div></section>` : ""}
${voz.length ? `<section class="vozes"><div class="wrap"><figure style="margin:0"><span class="aspas" aria-hidden="true">\u201C</span><blockquote>${esc(voz[0].texto)}</blockquote>${voz[0].autor ? `<figcaption>${esc(voz[0].autor)}</figcaption>` : ""}</figure></div></section>` : ""}
${secaoLigada(d, "ctaFinal") ? `<section class="chamada" id="chamada"><div class="wrap"><h2>A mesa est\xE1 <em>posta</em></h2>${ctaPrincipal(d, "Pedir agora")}</div></section>` : ""}
<section class="onde" id="contato"><div class="wrap">
  <div><h2>Venha <em>comer</em></h2>${d.endereco ? `<p class="end">${esc(d.endereco)}</p>` : ""}${d.horario ? `<p class="hor">${esc(d.horario)}</p>` : ""}</div>
  <div class="acoes">${ctaPrincipal(d, "Chamar no WhatsApp")}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  }
};
var CENAS_MESA = [mesa];

// src/templates/sites/cena-planta.ts
var FONTES_PLANTA = {
  titulos: '"Barlow Condensed","Arial Narrow",Impact,sans-serif',
  corpo: '"Barlow",system-ui,sans-serif',
  google: "family=Barlow+Condensed:wght@600;700;800&family=Barlow:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500"
};
var planta = {
  id: "planta",
  nome: "Planta",
  descricao: "Prancha de projeto: t\xEDtulo industrial, ficha da empresa, escopo em c\xE9lulas e etapas da obra.",
  nichos: ["Constru\xE7\xE3o", "Reformas", "Marcenarias", "Arquitetura", "Engenharia", "Materiais de constru\xE7\xE3o"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#e9e7e2"/><rect width="160" height="58" fill="${corPrimaria}"/>
    <rect y="58" width="160" height="5" fill="${corDestaque}"/>
    <rect x="10" y="14" width="84" height="11" fill="#fff"/><rect x="10" y="29" width="62" height="11" fill="${corDestaque}"/>
    <rect x="108" y="12" width="42" height="38" fill="none" stroke="#fff" stroke-width="1"/><rect x="112" y="17" width="34" height="2" fill="#fff"/><rect x="112" y="23" width="34" height="2" fill="#fff"/><rect x="112" y="29" width="34" height="2" fill="#fff"/>
    <rect x="10" y="72" width="44" height="30" fill="none" stroke="#14181d"/><rect x="58" y="72" width="44" height="30" fill="none" stroke="#14181d"/><rect x="106" y="72" width="44" height="30" fill="none" stroke="#14181d"/></svg>`,
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Or\xE7amento combinado antes do servi\xE7o, comunica\xE7\xE3o direta e acompanhamento da obra.", "Conte o que precisa, receba o or\xE7amento e combine as etapas: assim a obra anda com clareza.");
    const capa = urlImagem(d.capa);
    const galeria2 = fotos(d);
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const horario = horarioCurto(d);
    const mapa = linkMapa(d);
    const tel = linkTel(d);
    const palavras2 = (d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : "Obras com clareza do in\xEDcio ao fim").split(" ");
    const ultimas = palavras2.splice(Math.max(1, palavras2.length - 2)).join(" ");
    const titulo2 = `${palavras2.join(" ")} <em>${ultimas}</em>`;
    const difs = secaoLigada(d, "diferenciais") ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, "passos") ? passosDe(d, 4) : [];
    const voz = depoimentosValidos(d).slice(0, 3);
    const obras = galeria2.slice(0, 6);
    return documentoPremium(d, FONTES_PLANTA, `
:root{--c-fundo:#e9e7e2;--c-tinta:#14181d;--c-suave:#4f5762;--c-linha:rgba(20,24,29,.28);--c-escuro:#161b21;--c-mono:"IBM Plex Mono",ui-monospace,monospace}
body{background:var(--c-fundo);color:var(--c-tinta);background-image:linear-gradient(rgba(20,24,29,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(20,24,29,.045) 1px,transparent 1px);background-size:32px 32px}
h1,h2,h3{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;letter-spacing:.005em;line-height:.95}
em{font-style:normal;color:var(--d)}
.mono{font-family:var(--c-mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase}
.info{background:#0d1014;color:#aab2bd}.info .wrap{display:flex;justify-content:space-between;gap:20px;padding:8px 0;flex-wrap:wrap}
.info a{color:#e5e9ee}.info a:hover{color:var(--d)}
.topo{position:sticky;top:0;z-index:40;background:var(--c-escuro);border-bottom:3px solid var(--d)}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px 0}
.marca{display:flex;align-items:center;gap:12px;font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;font-size:clamp(1.3rem,2.4vw,1.8rem);color:#fff;letter-spacing:.02em}
.logo-img{height:42px;width:auto}.logo-iniciais{width:42px;height:42px;display:grid;place-items:center;background:var(--d);color:var(--sobre-d);font-weight:800}
.topo nav{display:flex;gap:30px;font-family:var(--fonte-t);font-weight:600;font-size:17px;letter-spacing:.1em;text-transform:uppercase;color:#cfd5dc}
.topo nav a:hover{color:var(--d)}
.btn{border-radius:0;font-family:var(--fonte-t);font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:17px;padding:14px 26px}
.btn-1{background:var(--d);color:var(--sobre-d)}.btn-1:hover{filter:brightness(1.07)}
.btn-2{background:transparent;color:#fff;border:2px solid rgba(255,255,255,.5)}.btn-2:hover{border-color:var(--d);color:var(--d)}
.capa{position:relative;color:#fff;padding:clamp(64px,9vw,128px) 0 clamp(56px,8vw,104px);${fundoFoto(capa, "#1c2128", "rgba(15,19,23,.6),rgba(15,19,23,.94)")}}
.capa-in{display:grid;grid-template-columns:1.6fr 1fr;gap:clamp(28px,5vw,72px);align-items:end}
.capa .cod{color:var(--d);margin-bottom:18px;display:flex;gap:12px;align-items:center}.capa .cod::before{content:'';width:34px;height:3px;background:var(--d)}
.capa h1{font-size:clamp(3.4rem,10vw,9rem);color:#fff;margin:0 0 24px;text-wrap:balance}
.capa .lead{font-size:var(--t1);color:#d8dde3;max-width:46ch;margin:0 0 30px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.ficha{position:relative;border:1px solid rgba(255,255,255,.35);padding:22px 24px;background:rgba(15,19,23,.55);backdrop-filter:blur(6px)}
.ficha::before,.ficha::after{content:'';position:absolute;width:22px;height:22px;border:3px solid var(--d)}
.ficha::before{left:-3px;top:-3px;border-right:0;border-bottom:0}.ficha::after{right:-3px;bottom:-3px;border-left:0;border-top:0}
.ficha h2{font-size:22px;color:var(--d);margin:0 0 12px}
.ficha dl{margin:0}.ficha dt{font-family:var(--c-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#9aa4b0;margin-top:12px}
.ficha dd{margin:2px 0 0;font-family:var(--fonte-t);font-weight:600;font-size:21px;text-transform:uppercase;color:#fff;letter-spacing:.02em}
.hazard{height:14px;background:repeating-linear-gradient(-45deg,var(--d) 0 18px,#14181d 18px 36px)}
.sec{padding:clamp(64px,9vw,120px) 0}
.cab{display:flex;align-items:end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:clamp(28px,4vw,48px);border-bottom:3px solid var(--c-tinta);padding-bottom:16px}
.cab h2{font-size:clamp(2.6rem,6vw,5rem);margin:0}.cab .mono{color:var(--c-suave)}
.celulas{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--c-tinta);border-left:1px solid var(--c-tinta)}
.celula{position:relative;padding:28px 26px 30px;border-right:1px solid var(--c-tinta);border-bottom:1px solid var(--c-tinta);background:rgba(233,231,226,.7);transition:background .25s,color .25s;display:flex;flex-direction:column;gap:10px;min-height:220px}
.celula:hover{background:var(--d);color:var(--sobre-d)}.celula:hover .mono,.celula:hover p{color:inherit}
.celula .mono{color:var(--c-suave)}.celula h3{font-size:clamp(1.7rem,3vw,2.3rem);margin:0}.celula p{margin:0;color:var(--c-suave)}
.celula a{margin-top:auto;font-family:var(--fonte-t);font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:16px;border-bottom:2px solid currentColor;align-self:flex-start}
.dif .wrap{display:grid;grid-template-columns:1fr 1.4fr;gap:clamp(28px,6vw,96px)}
.dif h2{font-size:clamp(2.6rem,6vw,5rem)}
.dif ul{list-style:none;margin:0;padding:0;border-top:1px solid var(--c-tinta)}
.dif li{display:grid;grid-template-columns:44px 1fr;gap:16px;padding:22px 0;border-bottom:1px solid var(--c-tinta)}
.dif li .box{width:30px;height:30px;border:2px solid var(--c-tinta);display:grid;place-items:center;background:var(--d);color:var(--sobre-d)}
.dif li h3{font-size:clamp(1.5rem,2.6vw,2rem);margin:0 0 4px}.dif li p{margin:0;color:var(--c-suave)}
.proc{background:var(--c-escuro);color:#fff;border-top:3px solid var(--d)}
.proc .cab{border-color:#fff}.proc .cab h2{color:#fff}.proc .cab .mono{color:#9aa4b0}
.etapas{display:grid;grid-template-columns:repeat(var(--n,3),1fr);position:relative}
.etapas::before{content:'';position:absolute;left:0;right:0;top:19px;height:2px;background:repeating-linear-gradient(90deg,#4b5563 0 8px,transparent 8px 14px)}
.etapa{position:relative;padding-right:28px}
.etapa .no{position:relative;z-index:1;display:grid;place-items:center;width:40px;height:40px;background:var(--d);color:var(--sobre-d);font-family:var(--fonte-t);font-weight:800;font-size:20px;margin-bottom:22px}
.etapa .mono{color:var(--d);display:block;margin-bottom:6px}.etapa h3{font-size:clamp(1.6rem,2.8vw,2.2rem);margin:0 0 8px;color:#fff}.etapa p{margin:0;color:#b6bec8}
.fig{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
.fig figure{margin:0;position:relative;background:#cfcdc7;grid-column:span 2;display:flex}
.fig img{width:100%;height:100%;aspect-ratio:4/3;object-fit:cover;filter:grayscale(.55) contrast(1.05);transition:filter .4s}.fig figure:hover img{filter:none}
.fig figcaption{position:absolute;left:0;bottom:0;background:var(--c-escuro);color:#fff;padding:6px 12px}
.f2 figure{grid-column:span 3}
.f3 figure:nth-child(1),.f4 figure:nth-child(1),.f5 figure:nth-child(1),.f6 figure:nth-child(1){grid-column:span 4;grid-row:span 2}
.f3 figure:nth-child(1) img,.f4 figure:nth-child(1) img,.f5 figure:nth-child(1) img,.f6 figure:nth-child(1) img{aspect-ratio:auto}
.f4 figure:nth-child(4){grid-column:span 6}.f4 figure:nth-child(4) img{aspect-ratio:16/6}
.f5 figure:nth-child(n+4){grid-column:span 3}
.sobre .wrap{display:grid;grid-template-columns:1.3fr 1fr;gap:clamp(28px,6vw,96px);align-items:center}
.sobre blockquote{margin:0;font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;font-size:clamp(2.2rem,5vw,4.2rem);line-height:1;text-wrap:balance}
.sobre-resto{font-size:var(--t1);color:var(--c-suave);max-width:54ch;margin:22px 0 0}
.nums{display:grid;gap:0;border:1px solid var(--c-tinta);background:rgba(233,231,226,.7)}
.nums div{padding:22px 24px;border-bottom:1px solid var(--c-tinta)}.nums div:last-child{border-bottom:0}
.nums b{display:block;font-family:var(--fonte-t);font-weight:700;font-size:clamp(2.4rem,5vw,3.6rem);line-height:1}.nums .mono{color:var(--c-suave)}
.vozes .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
.vozes figure{margin:0;padding:24px 24px 24px 22px;border-left:6px solid var(--d);background:rgba(255,255,255,.6)}
.vozes blockquote{margin:0 0 12px;font-size:var(--t1)}.vozes figcaption{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;letter-spacing:.08em}
.chamada{background:var(--d);color:var(--sobre-d)}
.chamada .wrap{display:flex;align-items:center;justify-content:space-between;gap:28px;flex-wrap:wrap;padding:clamp(40px,6vw,72px) 0}
.chamada h2{font-size:clamp(2.6rem,7vw,5.6rem);margin:0;color:var(--sobre-d)}
.chamada .btn-1{background:var(--c-escuro);color:#fff}
.contato{background:var(--c-escuro);color:#fff}
.contato .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(28px,5vw,72px);padding:clamp(56px,8vw,96px) 0;align-items:end}
.contato h2{font-size:clamp(2.6rem,6vw,5rem);margin:0 0 20px;color:#fff}.contato p{display:flex;gap:12px;margin:0 0 10px;color:#c3cad2}.contato svg{flex:none;margin-top:4px;color:var(--d)}
.contato .acoes{display:grid;gap:12px}.contato .btn{justify-content:center}
.sx{--sx-fundo:transparent;--sx-alt:rgba(255,255,255,.35);--sx-card:#f4f2ed;--sx-borda:var(--c-tinta);--sx-texto:var(--c-tinta);--sx-suave:var(--c-suave);--sx-icone:var(--c-tinta);--sx-raio:0px}
.sx-cab h2{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;font-size:clamp(2.6rem,6vw,5rem);line-height:.95}
.sx-pre{font-family:var(--c-mono);letter-spacing:.14em}
.sx-lista details{border-width:1px}.sx-cta-in{border-radius:0}
${cssRodape("rp", "#0d1014", "#9aa4b0")}
@media(max-width:900px){.info .wrap{justify-content:center}.topo nav{display:none}.capa-in,.sobre .wrap,.dif .wrap,.contato .wrap{grid-template-columns:1fr}.celulas{grid-template-columns:1fr 1fr}.etapas{grid-template-columns:1fr 1fr;gap:28px 0}.etapas::before{display:none}.fig figure,.f4 figure:nth-child(4),.f5 figure:nth-child(n+4),.f2 figure{grid-column:span 6!important;grid-row:auto!important}.fig img{aspect-ratio:4/3!important}}
@media(max-width:560px){.celulas{grid-template-columns:1fr}.etapas{grid-template-columns:1fr}}
`, `
<div class="info mono"><div class="wrap"><span>${d.cidade ? `Atendemos ${esc(d.cidade)} e regi\xE3o` : "Or\xE7amento pelo WhatsApp"}</span><span>${tel ? `<a href="${tel}">${esc(d.telefone)}</a>` : ""}${horario ? ` \xB7 ${esc(horario)}` : ""}</span></div></div>
<header class="topo"><div class="wrap">
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav aria-label="Se\xE7\xF5es"><a href="#servicos">Servi\xE7os</a><a href="#processo">Processo</a><a href="#sobre">Quem somos</a><a href="#contato">Contato</a></nav>
  ${ctaPrincipal(d, "Pedir or\xE7amento")}
</div></header>
<section class="capa"><div class="wrap capa-in">
  <div><p class="cod mono">${esc(d.categoria || "Obras e projetos")}</p><h1>${titulo2}</h1><p class="lead">${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, "Pedir or\xE7amento")}<a class="btn btn-2" href="#servicos">Ver servi\xE7os</a></div></div>
  <aside class="ficha" aria-label="Ficha da empresa"><h2>Ficha da empresa</h2><dl>
    ${d.categoria ? `<dt>Atua\xE7\xE3o</dt><dd>${esc(d.categoria)}</dd>` : ""}${d.cidade ? `<dt>Regi\xE3o</dt><dd>${esc(d.cidade)}</dd>` : ""}
    <dt>Atendimento</dt><dd>${d.whatsapp || d.telefone ? "WhatsApp e telefone" : "Consulte"}</dd>
    ${horario ? `<dt>Hor\xE1rio</dt><dd>${esc(horario)}</dd>` : ""}${nota ? `<dt>Google</dt><dd>${nota.nota} \u2605${nota.avaliacoes ? ` \xB7 ${nota.avaliacoes}` : ""}</dd>` : ""}</dl></aside>
</div></section>
<div class="hazard" aria-hidden="true"></div>
${servicos.length ? `<section class="sec" id="servicos"><div class="wrap"><div class="cab"><h2>Escopo de servi\xE7os</h2><span class="mono">${servicos.length} frentes de trabalho</span></div>
  <div class="celulas">${servicos.map((s, i) => `<div class="celula"><span class="mono">S-${num(i)}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p>${zapTexto(d, `Ol\xE1! Quero um or\xE7amento de: ${s.titulo}`) ? `<a href="${zapTexto(d, `Ol\xE1! Quero um or\xE7amento de: ${s.titulo}`)}" target="_blank" rel="noopener">Pedir or\xE7amento</a>` : ""}</div>`).join("")}</div>
</div></section>` : ""}
${difs.length ? `<section class="sec dif" id="diferenciais"><div class="wrap"><div><span class="mono" style="color:var(--c-suave)">Como trabalhamos</span><h2>O que voc\xEA <em style="color:var(--c-tinta);background:var(--d);padding:0 .15em">encontra</em></h2></div>
  <ul>${difs.map((x) => `<li><span class="box" aria-hidden="true">${ICONES.check}</span><div><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div></li>`).join("")}</ul></div></section>` : ""}
${passos.length ? `<section class="sec proc" id="processo"><div class="wrap"><div class="cab"><h2>Etapas da obra</h2><span class="mono">do primeiro contato \xE0 entrega</span></div>
  <div class="etapas" style="--n:${passos.length}" id="passos">${passos.map((p, i) => `<div class="etapa"><span class="no">${i + 1}</span><span class="mono">Etapa ${num(i)}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join("")}</div></div></section>` : ""}
${obras.length >= 2 ? `<section class="sec"><div class="wrap"><div class="cab"><h2>Obras e projetos</h2><span class="mono">registro fotogr\xE1fico</span></div>
  <div class="fig f${obras.length}">${obras.map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} \u2014 obra ${i + 1}" loading="lazy"><figcaption class="mono">Fig. ${num(i)}</figcaption></figure>`).join("")}</div></div></section>` : ""}
<section class="sec sobre" id="sobre"><div class="wrap"><div><blockquote>${partirDestaque(sobreTxt).destaque}</blockquote>${partirDestaque(sobreTxt).resto ? `<p class="sobre-resto">${partirDestaque(sobreTxt).resto}</p>` : ""}</div>
  ${nota || horario ? `<div class="nums">${nota ? `<div><b>${nota.nota}\u2605</b><span class="mono">${nota.avaliacoes ? `${nota.avaliacoes} avalia\xE7\xF5es no Google` : "nota no Google"}</span></div>` : ""}${horario ? `<div><b>${esc(horario)}</b><span class="mono">hor\xE1rio de atendimento</span></div>` : ""}</div>` : ""}</div></section>
${voz.length ? `<section class="sec vozes"><div class="wrap"><div class="cab"><h2>Quem j\xE1 contratou</h2></div><div class="grade">${voz.map((x) => `<figure><blockquote>\u201C${esc(x.texto)}\u201D</blockquote>${x.autor ? `<figcaption>${esc(x.autor)}</figcaption>` : ""}</figure>`).join("")}</div></div></section>` : ""}
${secaoLigada(d, "ctaFinal") ? `<section class="chamada" id="chamada"><div class="wrap"><h2>Fale sobre a sua obra</h2>${ctaPrincipal(d, "Pedir or\xE7amento")}</div></section>` : ""}
<section class="contato" id="contato"><div class="wrap">
  <div><h2>Onde estamos</h2>${d.endereco ? `<p>${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ""}${d.horario ? `<p>${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ""}</div>
  <div class="acoes">${ctaPrincipal(d, "Chamar no WhatsApp")}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  }
};
var CENAS_PLANTA = [planta];

// src/templates/sites/cena-sorriso.ts
var FONTES_SORRISO = {
  titulos: '"Outfit",system-ui,sans-serif',
  corpo: '"Outfit",system-ui,sans-serif',
  google: "family=Outfit:wght@300;400;500;600;700;800"
};
var sorriso = {
  id: "sorriso",
  nome: "Sorriso",
  descricao: "P\xEDlula flutuante, foto com chips, carrossel de tratamentos e linha do tempo da consulta. Para odontologia e sa\xFAde.",
  nichos: ["Odontologia", "Ortodontia", "Cl\xEDnicas m\xE9dicas", "Fisioterapia", "Psicologia", "Nutri\xE7\xE3o"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#f3f9ff"/><rect x="16" y="7" width="128" height="14" rx="7" fill="#fff" stroke="#e1ebf5"/><rect x="24" y="11" width="22" height="6" rx="3" fill="${corPrimaria}"/><rect x="112" y="10" width="26" height="8" rx="4" fill="${corPrimaria}"/>
    <rect x="12" y="34" width="68" height="9" rx="2" fill="#0c2340"/><rect x="12" y="47" width="54" height="9" rx="2" fill="#0c2340"/><rect x="12" y="60" width="40" height="9" rx="2" fill="${corDestaque}" opacity=".6"/><rect x="12" y="76" width="30" height="9" rx="4.5" fill="${corPrimaria}"/>
    <rect x="92" y="30" width="56" height="58" rx="16" fill="${corPrimaria}" opacity=".3"/><rect x="84" y="36" width="26" height="11" rx="5.5" fill="#fff"/><rect x="124" y="72" width="26" height="11" rx="5.5" fill="#fff"/>
    <rect x="12" y="94" width="40" height="12" rx="5" fill="#fff" stroke="#e1ebf5"/><rect x="58" y="94" width="40" height="12" rx="5" fill="#fff" stroke="#e1ebf5"/><rect x="104" y="94" width="40" height="12" rx="5" fill="#fff" stroke="#e1ebf5"/></svg>`,
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Tratamentos explicados com calma, agendamento f\xE1cil e um atendimento que respeita o seu tempo.", "Aqui voc\xEA entende cada etapa, tira as d\xFAvidas e decide com seguran\xE7a.");
    const capa = urlImagem(d.capa);
    const galeria2 = fotos(d);
    const foto2 = urlImagem(d.fotoSobre) || galeria2[0] || "";
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const horario = horarioCurto(d);
    const mapa = linkMapa(d);
    const palavras2 = (d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : "Cuide do seu sorriso sem medo").split(" ");
    const ultimas = palavras2.splice(Math.max(1, palavras2.length - 2)).join(" ");
    const titulo2 = `${palavras2.join(" ")} <span class="marca-texto">${ultimas}</span>`;
    const difs = secaoLigada(d, "diferenciais") ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, "passos") ? passosDe(d, 4) : [];
    const voz = depoimentosValidos(d).slice(0, 3);
    return documentoPremium(d, FONTES_SORRISO, `
:root{--s-fundo:#f4f9ff;--s-tinta:#0c2340;--s-suave:#4a6078;--s-borda:#dce8f4;--s-branco:#fff}
body{background:var(--s-fundo);color:var(--s-tinta)}
h1,h2,h3{font-family:var(--fonte-t);font-weight:700;letter-spacing:-.025em;line-height:1.04}
.marca-texto{background:linear-gradient(transparent 62%,color-mix(in srgb,var(--d) 38%,transparent) 62%);padding:0 .08em}
.topo{position:sticky;top:14px;z-index:40;padding:0 14px}
.topo .pilula{max-width:1180px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:20px;background:rgba(255,255,255,.92);backdrop-filter:blur(14px);border:1px solid var(--s-borda);border-radius:999px;padding:10px 12px 10px 22px;box-shadow:0 18px 40px -24px rgba(12,35,64,.4)}
.marca{display:flex;align-items:center;gap:10px;font-weight:700;font-size:var(--t1);color:var(--s-tinta)}
.logo-img{height:36px;width:auto}.logo-iniciais{width:36px;height:36px;border-radius:12px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:700;font-size:14px}
.topo nav{display:flex;gap:28px;font-weight:500;font-size:15px;color:var(--s-suave)}.topo nav a:hover{color:var(--p-texto)}
.btn{border-radius:999px;font-weight:600}
.btn-1{background:var(--p);color:var(--sobre-p);box-shadow:0 14px 30px -14px var(--p)}.btn-1:hover{transform:translateY(-2px)}
.btn-2{background:var(--s-branco);color:var(--p-texto);border:1.5px solid var(--s-borda)}
.capa{position:relative;padding:clamp(40px,6vw,88px) 0 clamp(56px,8vw,112px);overflow:hidden}
.capa::before,.capa::after{content:'';position:absolute;border-radius:50%;filter:blur(2px);z-index:0}
.capa::before{width:620px;height:620px;right:-180px;top:-200px;background:radial-gradient(circle,color-mix(in srgb,var(--p) 18%,transparent),transparent 70%)}
.capa::after{width:480px;height:480px;left:-160px;bottom:-200px;background:radial-gradient(circle,color-mix(in srgb,var(--d) 22%,transparent),transparent 70%)}
.capa-in{position:relative;z-index:1;display:grid;grid-template-columns:1.05fr 1fr;gap:clamp(32px,5vw,80px);align-items:center}
.eyebrow{display:inline-flex;align-items:center;gap:10px;background:var(--s-branco);border:1px solid var(--s-borda);border-radius:999px;padding:8px 16px 8px 12px;font-size:14px;font-weight:600;color:var(--p-texto)}
.eyebrow::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--d)}
.capa h1{font-size:clamp(2.8rem,6.4vw,5.6rem);margin:22px 0 20px}
.capa .lead{font-size:var(--t1);color:var(--s-suave);max-width:46ch;margin:0 0 30px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.foto-wrap{position:relative;max-width:560px;margin-left:auto;width:100%}
.foto-wrap .img{aspect-ratio:4/5;border-radius:48px 48px 48px 140px;overflow:hidden;box-shadow:0 40px 80px -40px rgba(12,35,64,.55);${fundoFoto(capa, d.corPrimaria, "rgba(0,0,0,0),rgba(0,0,0,.06)")}}
.chip{position:absolute;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.95);backdrop-filter:blur(8px);border:1px solid var(--s-borda);border-radius:18px;padding:12px 16px;box-shadow:0 20px 40px -22px rgba(12,35,64,.5);font-size:14px;font-weight:600;color:var(--s-tinta)}
.chip b{font-size:22px;line-height:1;display:block}.chip small{display:block;font-size:12px;color:var(--s-suave);font-weight:500}
.chip svg{color:var(--p-texto);flex:none}
.chip.c1{left:-28px;top:12%}.chip.c2{right:-14px;bottom:20%}.chip.c3{left:6%;bottom:-18px}
.sec{padding:clamp(64px,9vw,120px) 0}
.cab{display:flex;align-items:end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:clamp(28px,4vw,48px)}
.cab h2{font-size:clamp(2.2rem,4.8vw,3.8rem);margin:0;max-width:16ch}.cab p{margin:0;color:var(--s-suave);max-width:36ch;font-size:var(--t1)}
.carrossel{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;--recuo:max(5vw,calc((100vw - 1180px)/2));padding:6px var(--recuo) 28px;scroll-padding-inline:var(--recuo);scrollbar-width:thin;scrollbar-color:var(--p) transparent}
.trat{flex:0 0 min(330px,80vw);scroll-snap-align:start;background:var(--s-branco);border:1px solid var(--s-borda);border-radius:32px;padding:30px;display:flex;flex-direction:column;gap:12px;min-height:360px;transition:transform .3s,box-shadow .3s}
.trat:hover{transform:translateY(-6px);box-shadow:0 30px 50px -30px rgba(12,35,64,.4)}
.trat .topo-card{display:flex;justify-content:space-between;align-items:flex-start}
.trat .ic{width:56px;height:56px;border-radius:18px;display:grid;place-items:center;background:color-mix(in srgb,var(--p) 11%,#fff);color:var(--p-texto)}
.trat .n{font-size:3.4rem;font-weight:800;line-height:.9;color:transparent;-webkit-text-stroke:1.5px var(--s-borda)}
.trat h3{font-size:var(--t3);margin:18px 0 0}.trat p{margin:0;color:var(--s-suave)}
.trat a{margin-top:auto;font-weight:600;color:var(--p-texto);display:inline-flex;gap:8px;align-items:center}.trat a:hover{gap:12px}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,6vw,96px);align-items:center}
.sobre .foto{position:relative;aspect-ratio:1;border-radius:140px 48px 48px 48px;overflow:hidden;background:var(--p-cla)}.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(2.2rem,4.6vw,3.6rem);margin:0 0 18px}.sobre p{color:var(--s-suave);font-size:var(--t1)}
.lista{list-style:none;padding:0;margin:22px 0 0;display:grid;gap:12px}.lista li{display:flex;gap:12px;align-items:center;font-weight:500}.lista svg{flex:none;background:color-mix(in srgb,var(--d) 22%,#fff);color:var(--p-texto);border-radius:50%;padding:5px;width:28px;height:28px}
.dif-grade{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.dif-card{background:var(--s-branco);border:1px solid var(--s-borda);border-radius:28px;padding:28px}
.dif-card .ic{width:50px;height:50px;border-radius:50%;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);margin-bottom:18px}
.dif-card h3{font-size:var(--t2);margin:0 0 8px}.dif-card p{margin:0;color:var(--s-suave)}
.linha{position:relative;max-width:860px;margin:0 auto;display:grid;gap:22px}
.linha::before{content:'';position:absolute;left:27px;top:8px;bottom:8px;width:2px;background:linear-gradient(var(--p),var(--d))}
.etapa{position:relative;display:grid;grid-template-columns:56px 1fr;gap:22px;align-items:start}
.etapa .no{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:var(--s-branco);border:2px solid var(--p);color:var(--p-texto);font-weight:800;font-size:20px;z-index:1}
.etapa .cx{background:var(--s-branco);border:1px solid var(--s-borda);border-radius:24px;padding:22px 26px}
.etapa h3{font-size:var(--t2);margin:0 0 6px}.etapa p{margin:0;color:var(--s-suave)}
.vozes .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
.vozes figure{margin:0;background:var(--s-branco);border:1px solid var(--s-borda);border-radius:28px;padding:28px}
.vozes blockquote{margin:12px 0 18px;color:var(--s-tinta);font-size:var(--t1)}.vozes figcaption{display:flex;gap:12px;align-items:center;font-weight:600}
.vozes .av{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:700;font-size:14px}
.chamada .cartao{position:relative;overflow:hidden;background:var(--p);color:var(--sobre-p);border-radius:44px;padding:clamp(40px,7vw,88px) clamp(24px,6vw,80px);text-align:center}
.chamada .cartao::before,.chamada .cartao::after{content:'';position:absolute;border-radius:50%;background:var(--d);opacity:.28}
.chamada .cartao::before{width:320px;height:320px;right:-80px;top:-120px}.chamada .cartao::after{width:220px;height:220px;left:-60px;bottom:-100px}
.chamada h2{position:relative;font-size:clamp(2.4rem,5.6vw,4.4rem);margin:0 0 12px;color:inherit}.chamada p{position:relative;margin:0 auto 28px;max-width:44ch;font-size:var(--t1);opacity:.92}
.chamada .btn-1{position:relative;background:#fff;color:var(--p-texto);box-shadow:none}
.contato .wrap{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:clamp(48px,7vw,88px) 0}
.contato .cx{background:var(--s-branco);border:1px solid var(--s-borda);border-radius:32px;padding:clamp(24px,4vw,44px)}
.contato h2{font-size:clamp(1.8rem,3.4vw,2.6rem);margin:0 0 16px}.contato p{display:flex;gap:12px;margin:0 0 10px;color:var(--s-suave)}.contato svg{flex:none;margin-top:4px;color:var(--p-texto)}
.contato .acoes{display:grid;gap:12px;align-content:center}.contato .btn{justify-content:center}
${cssGaleriaCena("28px", "var(--s-borda)")}
.sx{--sx-fundo:transparent;--sx-alt:transparent;--sx-card:#fff;--sx-borda:var(--s-borda);--sx-texto:var(--s-tinta);--sx-suave:var(--s-suave);--sx-icone:var(--p-texto);--sx-raio:26px}
.sx-cab h2{font-family:var(--fonte-t);letter-spacing:-.025em}
${cssRodape("rp", "#0c2340", "#a9bbd0")}
@media(max-width:900px){.topo nav{display:none}.capa-in,.sobre .wrap,.contato .wrap{grid-template-columns:1fr}.foto-wrap{margin:8px auto 0;max-width:460px}.chip.c1{left:-8px}.chip.c2{right:-4px}.dif-grade{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.dif-grade{grid-template-columns:1fr}.chip.c3{display:none}.topo .pilula{padding-left:14px}}
`, `
<header class="topo"><div class="pilula">
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav aria-label="Se\xE7\xF5es"><a href="#tratamentos">Tratamentos</a><a href="#sobre">A cl\xEDnica</a><a href="#consulta">A consulta</a><a href="#contato">Contato</a></nav>
  ${ctaPrincipal(d, "Agendar")}
</div></header>
<section class="capa"><div class="wrap capa-in">
  <div><span class="eyebrow">${esc(d.categoria || "Atendimento com hora marcada")}${d.cidade ? ` \xB7 ${esc(d.cidade)}` : ""}</span>
    <h1>${titulo2}</h1><p class="lead">${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, "Agendar avalia\xE7\xE3o")}<a class="btn btn-2" href="#tratamentos">Ver tratamentos</a></div></div>
  <div class="foto-wrap"><div class="img" role="img" aria-label="${esc(d.empresa)}"></div>
    ${nota ? `<div class="chip c1"><span class="estrelas" aria-hidden="true">\u2605</span><div><b>${nota.nota}</b><small>${nota.avaliacoes ? `${nota.avaliacoes} avalia\xE7\xF5es no Google` : "no Google"}</small></div></div>` : ""}
    ${horario ? `<div class="chip c2">${ICONES.relogio}<div><small>Atendimento</small>${esc(horario)}</div></div>` : ""}
    ${zapTexto(d, "Ol\xE1! Gostaria de agendar uma avalia\xE7\xE3o.") ? `<a class="chip c3" href="${zapTexto(d, "Ol\xE1! Gostaria de agendar uma avalia\xE7\xE3o.")}" target="_blank" rel="noopener">${ICONES.zap}<span>Agende pelo WhatsApp</span></a>` : ""}
  </div>
</div></section>
${servicos.length ? `<section class="sec" id="tratamentos"><div class="wrap"><div class="cab"><h2>Cuidados para cada fase do seu sorriso</h2><p>Deslize para conhecer. Cada tratamento come\xE7a com uma avalia\xE7\xE3o.</p></div></div>
<div class="carrossel" tabindex="0" aria-label="Tratamentos">${servicos.map((s, i) => `<article class="trat"><div class="topo-card"><span class="ic">${iconeDoServico(i)}</span><span class="n" aria-hidden="true">${num(i)}</span></div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p>${zapTexto(d, `Ol\xE1! Quero saber mais sobre: ${s.titulo}`) ? `<a href="${zapTexto(d, `Ol\xE1! Quero saber mais sobre: ${s.titulo}`)}" target="_blank" rel="noopener">Quero saber mais ${ICONES.seta}</a>` : ""}</article>`).join("")}</div></section>` : ""}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ""}
  <div><h2>Uma cl\xEDnica pensada para voc\xEA se sentir <span class="marca-texto">\xE0 vontade</span></h2><p>${sobreTxt}</p>
    ${difs.length ? "" : `<ul class="lista"><li>${ICONES.check}Agendamento pelo WhatsApp</li><li>${ICONES.check}Explica\xE7\xE3o de cada etapa</li><li>${ICONES.check}Atendimento com aten\xE7\xE3o</li></ul>`}</div>
</div></section>
${difs.length ? `<section class="sec" id="diferenciais" style="padding-top:0"><div class="wrap"><div class="dif-grade">${difs.map((x, i) => `<div class="dif-card"><span class="ic">${[ICONES.escudo, ICONES.relogio, ICONES.estrela, ICONES.coracao][i % 4]}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join("")}</div></div></section>` : ""}
${galeriaCena(galeria2, esc(d.empresa), "O espa\xE7o por dentro")}
${passos.length ? `<section class="sec" id="passos"><div class="wrap"><div class="cab" style="justify-content:center;text-align:center"><div><span class="eyebrow">Sua primeira consulta</span><h2 style="max-width:none;margin:18px 0 0">Como \xE9 o <span class="marca-texto">atendimento</span></h2></div></div>
  <div class="linha" id="consulta">${passos.map((p, i) => `<div class="etapa"><span class="no">${i + 1}</span><div class="cx"><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div></div>`).join("")}</div></div></section>` : ""}
${voz.length ? `<section class="sec vozes"><div class="wrap"><div class="cab"><h2>Quem j\xE1 passou por aqui</h2></div><div class="grade">${voz.map((x) => `<figure><span class="estrelas" aria-hidden="true">\u2605\u2605\u2605\u2605\u2605</span><blockquote>\u201C${esc(x.texto)}\u201D</blockquote><figcaption>${x.autor ? `<span class="av">${esc(x.autor.trim().charAt(0).toUpperCase())}</span><span>${esc(x.autor)}</span>` : ""}</figcaption></figure>`).join("")}</div></div></section>` : ""}
${secaoLigada(d, "ctaFinal") ? `<section class="sec chamada" id="chamada"><div class="wrap"><div class="cartao"><h2>Pronto para cuidar do seu sorriso?</h2><p>Chame no WhatsApp, conte o que voc\xEA precisa e escolha o melhor hor\xE1rio.</p>${ctaPrincipal(d, "Agendar avalia\xE7\xE3o")}</div></div></section>` : ""}
<section class="contato" id="contato"><div class="wrap">
  <div class="cx"><h2>Venha nos visitar</h2>${d.endereco ? `<p>${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ""}${d.horario ? `<p>${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ""}</div>
  <div class="cx acoes">${ctaPrincipal(d, "Chamar no WhatsApp")}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  }
};
var CENAS_SORRISO = [sorriso];

// src/templates/sites/cena-patinhas.ts
var FONTES_PATINHAS = {
  titulos: '"Baloo 2","Fredoka",system-ui,sans-serif',
  corpo: '"Nunito",system-ui,sans-serif',
  google: "family=Baloo+2:wght@600;700;800&family=Nunito:wght@400;600;700;800"
};
var PATA = `<svg viewBox="0 0 64 64" aria-hidden="true" fill="currentColor"><ellipse cx="20" cy="18" rx="7" ry="10"/><ellipse cx="44" cy="18" rx="7" ry="10"/><ellipse cx="8" cy="35" rx="6" ry="8"/><ellipse cx="56" cy="35" rx="6" ry="8"/><path d="M32 29c-10 0-18 9-18 17 0 7 6 9 12 8 4-1 8-1 12 0 6 1 12-1 12-8 0-8-8-17-18-17z"/></svg>`;
var patinhas = {
  id: "patinhas",
  nome: "Patinhas",
  descricao: "Cor chapada, tipografia gordinha, adesivos e polaroides. Alegre e acolhedor. Para pet shops e veterin\xE1rias.",
  nichos: ["Pet shops", "Banho e tosa", "Veterin\xE1rias", "Agropecu\xE1rias", "Hotel para pets"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#fff7ea"/><rect width="160" height="66" fill="${corPrimaria}"/><path d="M0 62q20 10 40 0t40 0 40 0 40 0v10H0z" fill="#fff7ea"/>
    <rect x="12" y="14" width="22" height="6" rx="3" fill="#fff7ea"/><rect x="118" y="12" width="30" height="9" rx="4.5" fill="${corDestaque}" stroke="#1d2340" stroke-width="1.2"/>
    <rect x="12" y="28" width="60" height="11" rx="5" fill="#fff7ea"/><rect x="12" y="43" width="42" height="11" rx="5" fill="${corDestaque}" stroke="#1d2340" stroke-width="1.2"/>
    <path d="M100 56c-8-4-10-16-4-24s20-10 28-4 8 18 0 26-16 6-24 2z" fill="#fff7ea" stroke="#1d2340" stroke-width="1.5"/>
    <rect x="12" y="80" width="40" height="24" rx="7" fill="#ffd6e0" stroke="#1d2340" stroke-width="1.2"/><rect x="60" y="80" width="40" height="24" rx="7" fill="#c9f1dd" stroke="#1d2340" stroke-width="1.2"/><rect x="108" y="80" width="40" height="24" rx="7" fill="#e2d9ff" stroke="#1d2340" stroke-width="1.2"/></svg>`,
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Banho, sa\xFAde e carinho para o seu melhor amigo, com agendamento f\xE1cil pelo WhatsApp.", "Cuidamos de cada pet com paci\xEAncia, higiene e aten\xE7\xE3o, para voc\xEA deixar com tranquilidade.");
    const capa = urlImagem(d.capa);
    const galeria2 = fotos(d).slice(0, 4);
    const foto2 = urlImagem(d.fotoSobre);
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const mapa = linkMapa(d);
    const palavras2 = (d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : "Quem ama pet cuida com a gente").split(" ");
    const ultima = palavras2.splice(Math.max(1, palavras2.length - 1)).join(" ");
    const titulo2 = `${palavras2.join(" ")} <span class="destaque">${ultima}</span>`;
    const difs = secaoLigada(d, "diferenciais") ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, "passos") ? passosDe(d, 3) : [];
    const voz = depoimentosValidos(d).slice(0, 3);
    const cores = ["#ffd6e0", "#c9f1dd", "#e2d9ff", "#ffe9b8", "#cfe6ff", "#ffd9c2"];
    return documentoPremium(d, FONTES_PATINHAS, `
:root{--k-fundo:#fff7ea;--k-ink:#1d2340;--k-suave:#566079}
body{background:var(--k-fundo);color:var(--k-ink)}
h1,h2,h3{font-family:var(--fonte-t);font-weight:800;line-height:1.02;letter-spacing:-.01em}
.pop{border:3px solid var(--k-ink);box-shadow:6px 6px 0 var(--k-ink)}
.topo{position:sticky;top:0;z-index:40;background:var(--k-fundo);border-bottom:3px solid var(--k-ink)}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:12px 0}
.marca{display:flex;align-items:center;gap:12px;font-family:var(--fonte-t);font-weight:800;font-size:clamp(1.3rem,2.4vw,1.8rem);color:var(--k-ink)}
.logo-img{height:44px;width:auto}.logo-iniciais{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:var(--d);color:var(--sobre-d);border:3px solid var(--k-ink);font-weight:800}
.topo nav{display:flex;gap:10px}.topo nav a{padding:8px 16px;border-radius:999px;font-weight:700;border:2px solid transparent}.topo nav a:hover{border-color:var(--k-ink);background:#fff}
.btn{border-radius:999px;font-family:var(--fonte-t);font-weight:800;font-size:18px;border:3px solid var(--k-ink);box-shadow:4px 4px 0 var(--k-ink);padding:12px 26px;transition:transform .15s,box-shadow .15s}
.btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--k-ink)}
.btn-1{background:var(--d);color:var(--k-ink)}
.btn-2{background:#fff;color:var(--k-ink)}
.capa{position:relative;background:var(--p);color:var(--sobre-p);padding:clamp(48px,7vw,96px) 0 clamp(110px,12vw,170px);overflow:hidden}
.capa-in{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(28px,5vw,72px);align-items:center;position:relative;z-index:2}
.eyebrow{display:inline-block;background:var(--k-fundo);color:var(--k-ink);border:3px solid var(--k-ink);border-radius:999px;padding:6px 16px;font-weight:800;font-size:14px;transform:rotate(-2deg);margin-bottom:20px}
.capa h1{font-size:clamp(3rem,7.4vw,6.4rem);color:inherit;margin:0 0 20px;text-wrap:balance}
.destaque{display:inline-block;background:var(--d);color:var(--k-ink);padding:0 .18em;border:3px solid var(--k-ink);border-radius:.3em;transform:rotate(-2deg);box-shadow:5px 5px 0 var(--k-ink)}
.capa .lead{font-size:var(--t1);color:inherit;max-width:44ch;margin:0 0 30px;font-weight:600}
.btns{display:flex;gap:14px;flex-wrap:wrap}
.blob-wrap{position:relative;max-width:520px;margin-left:auto;width:100%}
.blob{aspect-ratio:1;border-radius:58% 42% 55% 45%/46% 52% 48% 54%;border:4px solid var(--k-ink);box-shadow:12px 12px 0 var(--k-ink);overflow:hidden;${fundoFoto(capa, d.corDestaque, "rgba(0,0,0,0),rgba(0,0,0,.05)")}}
.adesivo{position:absolute;right:-6px;top:4%;width:clamp(100px,14vw,132px);aspect-ratio:1;border-radius:50%;background:var(--d);border:3px solid var(--k-ink);box-shadow:4px 4px 0 var(--k-ink);display:grid;place-items:center;text-align:center;font-family:var(--fonte-t);font-weight:800;font-size:clamp(14px,1.8vw,18px);line-height:1.05;color:var(--k-ink);transform:rotate(12deg);padding:12px}
.nota-chip{position:absolute;left:-10px;bottom:10%;background:#fff;border:3px solid var(--k-ink);box-shadow:4px 4px 0 var(--k-ink);border-radius:18px;padding:10px 16px;font-weight:800;color:var(--k-ink);transform:rotate(-4deg)}
.nota-chip b{font-family:var(--fonte-t);font-size:26px;line-height:1;display:block}.nota-chip small{font-weight:700;color:var(--k-suave)}
.nota-chip .estrelas{color:#d97706}
.pata{position:absolute;color:rgba(255,255,255,.14);z-index:1}.pata svg{width:100%;height:auto}
.onda{position:absolute;left:0;right:0;bottom:-1px;height:clamp(60px,8vw,110px);z-index:2}.onda svg{display:block;width:100%;height:100%}
.sec{padding:clamp(56px,8vw,104px) 0}
.cab{text-align:center;max-width:680px;margin:0 auto clamp(28px,4vw,52px)}
.cab h2{font-size:clamp(2.4rem,5.4vw,4.4rem);margin:0 0 10px}.cab p{margin:0;color:var(--k-suave);font-size:var(--t1);font-weight:600}
.cartoes{display:grid;grid-template-columns:repeat(3,1fr);gap:26px}
.cartao{position:relative;border:3px solid var(--k-ink);border-radius:30px;box-shadow:6px 6px 0 var(--k-ink);padding:28px;display:flex;flex-direction:column;gap:10px;transition:transform .2s}
.cartao:nth-child(odd){transform:rotate(-1deg)}.cartao:nth-child(even){transform:rotate(1deg)}.cartao:hover{transform:rotate(0) translateY(-4px)}
.cartao .ic{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:#fff;border:3px solid var(--k-ink);color:var(--k-ink)}
.cartao h3{font-size:var(--t3);margin:8px 0 0}.cartao p{margin:0;font-weight:600;color:#38405a}
.cartao a{margin-top:auto;align-self:flex-start;font-family:var(--fonte-t);font-weight:800;border-bottom:3px solid var(--k-ink)}
.dif-grade{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.dif-card{background:#fff;border:3px solid var(--k-ink);border-radius:26px;box-shadow:5px 5px 0 var(--k-ink);padding:24px;text-align:center}
.dif-card .ic{width:60px;height:60px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;border:3px solid var(--k-ink);color:var(--k-ink)}
.dif-card h3{font-size:var(--t2);margin:0 0 6px}.dif-card p{margin:0;font-weight:600;color:var(--k-suave)}
.trilha{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;position:relative}
.trilha::before{content:'';position:absolute;left:8%;right:8%;top:34px;border-top:4px dashed var(--k-ink);opacity:.35}
.passo{text-align:center;position:relative}
.passo .bolha{width:70px;height:70px;margin:0 auto 16px;border-radius:50%;display:grid;place-items:center;background:var(--d);color:var(--k-ink);border:3px solid var(--k-ink);box-shadow:4px 4px 0 var(--k-ink);font-family:var(--fonte-t);font-weight:800;font-size:28px}
.passo h3{font-size:var(--t3);margin:0 0 6px}.passo p{margin:0 auto;max-width:28ch;font-weight:600;color:var(--k-suave)}
.polaroides{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;align-items:start}
.polaroides figure{margin:0;background:#fff;padding:10px 10px 38px;border:3px solid var(--k-ink);box-shadow:5px 5px 0 var(--k-ink);position:relative;transition:transform .25s}
.polaroides figure:nth-child(1){transform:rotate(-3deg)}.polaroides figure:nth-child(2){transform:rotate(2deg) translateY(14px)}.polaroides figure:nth-child(3){transform:rotate(-2deg)}.polaroides figure:nth-child(4){transform:rotate(3deg) translateY(10px)}
.polaroides figure:hover{transform:rotate(0) scale(1.04);z-index:2}
.polaroides figure::before{content:'';position:absolute;left:50%;top:-14px;width:84px;height:26px;background:rgba(255,220,120,.85);transform:translateX(-50%) rotate(-3deg);border:1px solid rgba(29,35,64,.2)}
.polaroides img{width:100%;aspect-ratio:1;object-fit:cover;display:block}
.sobre .wrap{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(28px,5vw,80px);align-items:center}
.sobre .foto{aspect-ratio:1;border-radius:42% 58% 46% 54%/55% 45% 55% 45%;border:4px solid var(--k-ink);box-shadow:10px 10px 0 var(--k-ink);overflow:hidden;background:var(--p-cla)}.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(2.2rem,4.8vw,3.8rem);margin:0 0 14px}.sobre p{font-size:var(--t1);font-weight:600;color:var(--k-suave)}
.baloes{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:26px}
.balao{position:relative;background:#fff;border:3px solid var(--k-ink);border-radius:26px;box-shadow:5px 5px 0 var(--k-ink);padding:24px 26px;margin:0}
.balao::after{content:'';position:absolute;left:34px;bottom:-18px;width:26px;height:26px;background:#fff;border-right:3px solid var(--k-ink);border-bottom:3px solid var(--k-ink);transform:rotate(45deg)}
.balao blockquote{margin:6px 0 0;font-weight:700;font-size:var(--t1)}
.balao-autor{margin:26px 0 0 20px;font-family:var(--fonte-t);font-weight:800}
.chamada .cartao-cta{background:var(--d);border:3px solid var(--k-ink);border-radius:40px;box-shadow:10px 10px 0 var(--k-ink);padding:clamp(36px,6vw,72px);text-align:center;position:relative;overflow:hidden;color:var(--k-ink)}
.chamada h2{font-size:clamp(2.4rem,6vw,4.8rem);margin:0 0 20px;color:var(--k-ink)}
.chamada .btn-1{background:var(--k-ink);color:#fff}
.contato .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:26px;padding:clamp(40px,6vw,80px) 0}
.contato .cx{background:#fff;border:3px solid var(--k-ink);border-radius:30px;box-shadow:6px 6px 0 var(--k-ink);padding:clamp(24px,4vw,44px)}
.contato h2{font-size:clamp(2rem,4vw,3rem);margin:0 0 14px}.contato p{display:flex;gap:12px;margin:0 0 10px;font-weight:600;color:var(--k-suave)}.contato svg{flex:none;margin-top:4px;color:var(--p-texto)}
.contato .acoes{display:grid;gap:14px;align-content:center;background:var(--p);color:var(--sobre-p)}.contato .btn{justify-content:center}
.sx{--sx-fundo:transparent;--sx-alt:transparent;--sx-card:#fff;--sx-borda:var(--k-ink);--sx-texto:var(--k-ink);--sx-suave:var(--k-suave);--sx-icone:var(--p-texto);--sx-raio:24px}
.sx-cab h2{font-family:var(--fonte-t);font-weight:800}.sx-lista details{border-width:3px;box-shadow:4px 4px 0 var(--k-ink)}
${cssRodape("rp", "#1d2340", "#c6cce0")}
@media(max-width:900px){.topo nav{display:none}.capa-in,.sobre .wrap,.contato .wrap{grid-template-columns:1fr}.blob-wrap{margin:8px auto 0;max-width:400px}.cartoes{grid-template-columns:1fr 1fr}.dif-grade{grid-template-columns:1fr 1fr}.polaroides{grid-template-columns:1fr 1fr}.trilha{grid-template-columns:1fr}.trilha::before{display:none}}
@media(max-width:560px){.cartoes,.dif-grade{grid-template-columns:1fr}.cartao{transform:none!important}}
`, `
<header class="topo"><div class="wrap">
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav aria-label="Se\xE7\xF5es"><a href="#servicos">Servi\xE7os</a><a href="#sobre">Sobre</a><a href="#contato">Contato</a></nav>
  ${ctaPrincipal(d, "Agendar")}
</div></header>
<section class="capa"><div class="pata" style="left:2%;top:46%;width:90px;transform:rotate(-20deg)">${PATA}</div><div class="pata" style="left:44%;top:6%;width:64px;transform:rotate(18deg)">${PATA}</div>
  <div class="wrap capa-in">
  <div><span class="eyebrow">${esc(d.categoria || "Cuidado de quem ama pets")}${d.cidade ? ` \xB7 ${esc(d.cidade)}` : ""}</span>
    <h1>${titulo2}</h1><p class="lead">${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, "Agendar pelo WhatsApp")}<a class="btn btn-2" href="#servicos">Ver servi\xE7os</a></div></div>
  <div class="blob-wrap"><div class="blob" role="img" aria-label="${esc(d.empresa)}"></div>
    ${zapTexto(d, "Ol\xE1! Quero agendar para o meu pet.") ? `<a class="adesivo" href="${zapTexto(d, "Ol\xE1! Quero agendar para o meu pet.")}" target="_blank" rel="noopener">Agende pelo<br>WhatsApp!</a>` : ""}
    ${nota ? `<div class="nota-chip"><span class="estrelas" aria-hidden="true">\u2605\u2605\u2605\u2605\u2605</span><b>${nota.nota}</b><small>${nota.avaliacoes ? `${nota.avaliacoes} avalia\xE7\xF5es no Google` : "no Google"}</small></div>` : ""}</div>
</div><div class="onda" aria-hidden="true"><svg viewBox="0 0 1440 110" preserveAspectRatio="none"><path d="M0 60C120 100 240 20 360 50s240 60 360 30 240-60 360-20 240 50 360 10v50H0z" fill="#fff7ea"/></svg></div></section>
${servicos.length ? `<section class="sec" id="servicos"><div class="wrap"><div class="cab"><h2>Do banho ao <span class="destaque" style="font-size:.9em">carinho</span></h2><p>Escolha o servi\xE7o e chame: a mensagem j\xE1 vai pronta.</p></div>
  <div class="cartoes">${servicos.map((s, i) => `<article class="cartao" style="background:${cores[i % cores.length]}"><span class="ic">${iconeDoServico(i)}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p>${zapTexto(d, `Ol\xE1! Quero agendar: ${s.titulo}`) ? `<a href="${zapTexto(d, `Ol\xE1! Quero agendar: ${s.titulo}`)}" target="_blank" rel="noopener">Agendar</a>` : ""}</article>`).join("")}</div></div></section>` : ""}
${difs.length ? `<section class="sec" id="diferenciais" style="padding-top:0"><div class="wrap"><div class="dif-grade">${difs.map((x, i) => `<div class="dif-card"><span class="ic" style="background:${cores[(i + 2) % cores.length]}">${[ICONES.coracao, ICONES.escudo, ICONES.relogio, ICONES.estrela][i % 4]}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join("")}</div></div></section>` : ""}
${passos.length ? `<section class="sec" id="passos"><div class="wrap"><div class="cab"><h2>\xC9 f\xE1cil <span class="destaque" style="font-size:.9em">assim</span></h2></div>
  <div class="trilha">${passos.map((p, i) => `<div class="passo"><span class="bolha">${i + 1}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join("")}</div></div></section>` : ""}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ""}
  <div><h2>Pet \xE9 da <span class="destaque" style="font-size:.9em">fam\xEDlia</span></h2><p>${sobreTxt}</p></div>
</div></section>
${galeria2.length >= 2 ? `<section class="sec" style="padding-top:0"><div class="wrap"><div class="cab"><h2>Carinha de quem \xE9 feliz</h2></div><div class="polaroides">${galeria2.map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} \u2014 foto ${i + 1}" loading="lazy"></figure>`).join("")}</div></div></section>` : ""}
${voz.length ? `<section class="sec"><div class="wrap"><div class="cab"><h2>Os tutores falam</h2></div><div class="baloes">${voz.map((x) => `<figure class="balao"><blockquote>\u201C${esc(x.texto)}\u201D</blockquote>${x.autor ? `<figcaption>${esc(x.autor)}</figcaption>` : ""}</figure>`).join("")}</div></div></section>` : ""}
${secaoLigada(d, "ctaFinal") ? `<section class="sec chamada" id="chamada"><div class="wrap"><div class="cartao-cta"><h2>Vamos cuidar do seu pet?</h2>${ctaPrincipal(d, "Agendar agora")}</div></div></section>` : ""}
<section class="contato" id="contato"><div class="wrap">
  <div class="cx"><h2>Venha nos visitar</h2>${d.endereco ? `<p>${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ""}${d.horario ? `<p>${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ""}</div>
  <div class="cx acoes">${ctaPrincipal(d, "Chamar no WhatsApp")}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  }
};
var CENAS_PATINHAS = [patinhas];

// src/templates/sites/cena-showroom.ts
var FONTES_SHOWROOM = {
  titulos: '"Barlow Condensed",system-ui,sans-serif',
  corpo: '"Barlow",system-ui,sans-serif',
  google: "family=Barlow+Condensed:wght@500;600;700;800&family=Barlow:wght@400;500;600"
};
var showroom = {
  id: "showroom",
  nome: "Showroom",
  descricao: "Vitrine escura, nome da marca em contorno atr\xE1s da foto, faixa de dados e categorias com WhatsApp pronto. Para concession\xE1rias e revendas.",
  nichos: ["Concession\xE1rias", "Revendas de ve\xEDculos", "Motos", "Seminovos", "Multimarcas"],
  miniatura: ({ corPrimaria }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#0b0c10"/><rect x="10" y="8" width="26" height="6" rx="2" fill="#fff"/><rect x="112" y="6" width="38" height="10" rx="2" fill="${corPrimaria}"/>
    <text x="12" y="62" font-size="38" font-weight="800" fill="none" stroke="#2a2d36" stroke-width="1.2" font-family="sans-serif">MARCA</text>
    <rect x="42" y="38" width="86" height="34" rx="10" fill="${corPrimaria}" opacity=".55"/><rect x="12" y="30" width="54" height="9" rx="2" fill="#fff"/><rect x="12" y="44" width="30" height="9" rx="2" fill="${corPrimaria}"/>
    <rect x="8" y="82" width="144" height="10" fill="#16181f"/><rect x="12" y="97" width="30" height="10" rx="2" fill="#16181f"/><rect x="46" y="97" width="30" height="10" rx="2" fill="#16181f"/><rect x="80" y="97" width="30" height="10" rx="2" fill="#16181f"/><rect x="114" y="97" width="30" height="10" rx="2" fill="#16181f"/></svg>`,
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Ve\xEDculos novos e seminovos, avalia\xE7\xE3o do seu usado e atendimento direto pelo WhatsApp.", "Aqui voc\xEA tira as d\xFAvidas, conhece as op\xE7\xF5es e negocia com transpar\xEAncia.");
    const capa = urlImagem(d.capa);
    const galeria2 = fotos(d);
    const foto2 = urlImagem(d.fotoSobre) || galeria2[0] || "";
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const horario = horarioCurto(d);
    const mapa = linkMapa(d);
    const marca2 = esc((d.empresa || "").split(/\s+/).slice(0, 2).join(" ")).toUpperCase();
    const difs = secaoLigada(d, "diferenciais") ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, "passos") ? passosDe(d, 4) : [];
    const voz = depoimentosValidos(d).slice(0, 3);
    const temFinanc = servicos.some((s) => /financ|credito|crédito/i.test(`${s.titulo} ${s.descricao}`));
    const dados = [];
    if (nota) dados.push(`<div><b>${nota.nota} \u2605</b><small>${nota.avaliacoes ? `${nota.avaliacoes} avalia\xE7\xF5es no Google` : "avalia\xE7\xE3o no Google"}</small></div>`);
    if (horario) dados.push(`<div><b>${esc(horario)}</b><small>Hor\xE1rio de atendimento</small></div>`);
    if (d.cidade) dados.push(`<div><b>${esc(d.cidade)}</b><small>Venha conhecer</small></div>`);
    if (d.telefone || d.whatsapp) dados.push(`<div><b>WhatsApp</b><small>Fale com um vendedor</small></div>`);
    return documentoPremium(d, FONTES_SHOWROOM, `
:root{--v-fundo:#0b0c10;--v-card:#14161d;--v-borda:#262932;--v-tinta:#f4f5f7;--v-suave:#a4a9b6}
body{background:#0b0c10;color:var(--v-tinta)}
h1,h2,h3{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;letter-spacing:.005em;line-height:.95}
.topo{position:sticky;top:0;z-index:40;background:rgba(11,12,16,.88);backdrop-filter:blur(12px);border-bottom:1px solid var(--v-borda)}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 0}
.marca{display:flex;align-items:center;gap:10px;font-family:var(--fonte-t);font-weight:700;font-size:1.35rem;text-transform:uppercase;letter-spacing:.04em;color:#fff}
.logo-img{height:34px;width:auto}.logo-iniciais{width:34px;height:34px;border-radius:6px;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:700;font-size:14px}
.topo nav{display:flex;gap:28px;font-size:15px;font-weight:500;color:var(--v-suave)}.topo nav a:hover{color:#fff}
.btn{border-radius:4px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;font-size:14px}
.btn-1{background:var(--p);color:var(--sobre-p)}.btn-1:hover{filter:brightness(1.12)}
.btn-2{background:transparent;color:#fff;border:1.5px solid #3a3e4a}.btn-2:hover{border-color:#fff}
.capa{position:relative;overflow:hidden;padding:clamp(40px,6vw,80px) 0 0;isolation:isolate}
.capa .gigante{position:absolute;left:50%;top:clamp(20px,4vw,60px);transform:translateX(-50%);z-index:-1;font-family:var(--fonte-t);font-weight:800;font-size:clamp(6rem,24vw,22rem);line-height:.85;white-space:nowrap;color:transparent;-webkit-text-stroke:2px #23262f;user-select:none;max-width:100%;overflow:hidden}
.capa-in{display:grid;grid-template-columns:1fr 1.15fr;gap:clamp(24px,4vw,64px);align-items:center;min-height:min(560px,70vh)}
.etq{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--v-suave)}
.etq::before{content:'';width:28px;height:3px;background:var(--p)}
.capa h1{font-size:clamp(3.2rem,8vw,7rem);margin:18px 0 18px;color:#fff}
.capa h1 em{font-style:normal;color:var(--p)}
.capa .lead{color:var(--v-suave);font-size:var(--t1);max-width:44ch;margin:0 0 28px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.vitrine{position:relative}
.vitrine .img{aspect-ratio:16/10;border-radius:14px;overflow:hidden;box-shadow:0 50px 90px -40px rgba(0,0,0,.9),0 0 0 1px var(--v-borda);${fundoFoto(capa, d.corPrimaria, "rgba(11,12,16,0),rgba(11,12,16,.28)")}}
.vitrine::after{content:'';position:absolute;left:8%;right:8%;bottom:-18px;height:30px;background:radial-gradient(ellipse at center,var(--p) 0,transparent 70%);opacity:.35;filter:blur(14px);z-index:-1}
.faixa{margin-top:clamp(32px,5vw,64px);border-top:1px solid var(--v-borda);border-bottom:1px solid var(--v-borda);background:var(--v-card)}
.faixa .wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}
.faixa .wrap>div{padding:22px 24px;border-left:1px solid var(--v-borda)}.faixa .wrap>div:first-child{border-left:0;padding-left:0}
.faixa b{display:block;font-family:var(--fonte-t);font-size:1.7rem;text-transform:uppercase;line-height:1;letter-spacing:.02em}.faixa small{color:var(--v-suave);font-size:13px}
.sec{padding:clamp(64px,9vw,120px) 0}
.cab{display:flex;align-items:end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:clamp(28px,4vw,48px)}
.cab h2{font-size:clamp(2.6rem,6vw,5rem);margin:0;max-width:14ch}.cab p{margin:0;color:var(--v-suave);max-width:38ch;font-size:var(--t1)}
.cats{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:14px}
.cat{position:relative;display:flex;flex-direction:column;gap:10px;background:var(--v-card);border:1px solid var(--v-borda);border-radius:10px;padding:26px;min-height:240px;overflow:hidden;transition:transform .25s,border-color .25s}
.cat:hover{transform:translateY(-4px);border-color:var(--p)}
.cat .n{font-family:var(--fonte-t);font-weight:800;font-size:4.6rem;line-height:.8;color:transparent;-webkit-text-stroke:1.5px #343845}
.cat h3{font-size:1.9rem;margin:6px 0 0;color:#fff}.cat p{margin:0;color:var(--v-suave)}
.cat a{margin-top:auto;display:inline-flex;gap:8px;align-items:center;font-weight:600;color:var(--p-texto-escuro,#fff);text-transform:uppercase;font-size:13px;letter-spacing:.08em}
.cat a svg{color:var(--p)}.cat:hover a{gap:14px}
.aviso{margin:22px 0 0;color:var(--v-suave);font-size:13px;max-width:70ch}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,6vw,96px);align-items:center}
.sobre .foto{aspect-ratio:4/3;border-radius:10px;overflow:hidden;box-shadow:0 0 0 1px var(--v-borda);background:var(--v-card)}.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(2.4rem,5vw,4rem);margin:0 0 18px}.sobre p{color:var(--v-suave);font-size:var(--t1)}
.dif-grade{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border:1px solid var(--v-borda);border-radius:10px;overflow:hidden}
.dif-card{padding:28px;border-left:1px solid var(--v-borda);background:var(--v-card)}.dif-card:first-child{border-left:0}
.dif-card .ic{color:var(--p);margin-bottom:16px;display:block}
.dif-card h3{font-size:1.5rem;margin:0 0 8px}.dif-card p{margin:0;color:var(--v-suave)}
.trilha{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;counter-reset:p}
.trilha .p{background:var(--v-card);border:1px solid var(--v-borda);border-top:3px solid var(--p);border-radius:10px;padding:26px}
.trilha .p span{font-family:var(--fonte-t);font-weight:800;font-size:2.6rem;color:var(--p);line-height:1}
.trilha h3{font-size:1.6rem;margin:10px 0 8px}.trilha p{margin:0;color:var(--v-suave)}
.vozes .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.vozes figure{margin:0;background:var(--v-card);border:1px solid var(--v-borda);border-radius:10px;padding:26px}
.vozes blockquote{margin:12px 0 18px;font-size:var(--t1)}.vozes figcaption{font-weight:600;color:var(--v-suave)}
.chamada .cartao{position:relative;overflow:hidden;border-radius:14px;background:var(--p);color:var(--sobre-p);padding:clamp(40px,7vw,88px) clamp(24px,6vw,80px);display:flex;gap:28px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.chamada h2{font-size:clamp(2.6rem,6vw,5rem);margin:0;color:inherit;max-width:14ch}.chamada p{margin:10px 0 0;max-width:42ch;opacity:.92}
.chamada .btn-1{background:#0b0c10;color:#fff}
.contato .wrap{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:clamp(48px,7vw,88px) 0}
.contato .cx{background:var(--v-card);border:1px solid var(--v-borda);border-radius:10px;padding:clamp(24px,4vw,44px)}
.contato h2{font-size:clamp(2rem,3.6vw,2.8rem);margin:0 0 16px}.contato p{display:flex;gap:12px;margin:0 0 10px;color:var(--v-suave)}.contato svg{flex:none;margin-top:4px;color:var(--p)}
.contato .acoes{display:grid;gap:12px;align-content:center}.contato .btn{justify-content:center}
${cssGaleriaCena("10px", "#262932")}
.sx{--sx-fundo:#0b0c10;--sx-alt:#101218;--sx-card:#14161d;--sx-borda:#262932;--sx-texto:#f4f5f7;--sx-suave:#a4a9b6;--sx-icone:var(--p);--sx-raio:10px}
.sx-cab h2{font-family:var(--fonte-t);text-transform:uppercase}
${cssRodape("rp", "#07080b", "#a4a9b6")}
@media(max-width:900px){.topo nav{display:none}.capa-in,.sobre .wrap,.contato .wrap{grid-template-columns:1fr}.dif-grade{grid-template-columns:1fr 1fr}.dif-card{border-top:1px solid var(--v-borda)}.faixa .wrap>div{border-left:0;padding-left:0;border-top:1px solid var(--v-borda)}.faixa .wrap>div:first-child{border-top:0}}
@media(max-width:560px){.dif-grade{grid-template-columns:1fr}.capa .gigante{top:10px}}
`, `
<header class="topo"><div class="wrap">
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav aria-label="Se\xE7\xF5es"><a href="#categorias">Ve\xEDculos</a><a href="#sobre">A loja</a><a href="#compra">Como comprar</a><a href="#contato">Contato</a></nav>
  ${ctaPrincipal(d, "Falar com vendedor")}
</div></header>
<section class="capa"><div class="gigante" aria-hidden="true">${marca2}</div>
  <div class="wrap capa-in">
    <div><span class="etq">${esc(d.categoria || "Ve\xEDculos novos e seminovos")}${d.cidade ? ` \xB7 ${esc(d.cidade)}` : ""}</span>
      <h1>${d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : "Seu pr\xF3ximo carro <em>come\xE7a aqui</em>"}</h1>
      <p class="lead">${capaTxt}</p>
      <div class="btns">${ctaPrincipal(d, "Falar com vendedor")}<a class="btn btn-2" href="#categorias">Ver op\xE7\xF5es</a></div></div>
    <div class="vitrine"><div class="img" role="img" aria-label="${esc(d.empresa)}"></div></div>
  </div>
  ${dados.length ? `<div class="faixa"><div class="wrap">${dados.join("")}</div></div>` : ""}
</section>
${servicos.length ? `<section class="sec" id="categorias"><div class="wrap"><div class="cab"><h2>O que voc\xEA procura</h2><p>Escolha a categoria e chame um vendedor com a mensagem j\xE1 pronta.</p></div>
<div class="cats">${servicos.map((s, i) => `<article class="cat"><span class="n" aria-hidden="true">${num(i)}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p>${zapTexto(d, `Ol\xE1! Quero saber mais sobre: ${s.titulo}`) ? `<a href="${zapTexto(d, `Ol\xE1! Quero saber mais sobre: ${s.titulo}`)}" target="_blank" rel="noopener">Quero ver ${ICONES.seta}</a>` : ""}</article>`).join("")}</div>
${temFinanc ? '<p class="aviso">Financiamento sujeito \xE0 an\xE1lise de cr\xE9dito. Condi\xE7\xF5es conforme o momento e o perfil de cada cliente.</p>' : ""}</div></section>` : ""}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ""}
  <div><h2>Atendimento de quem entende de carro</h2><p>${sobreTxt}</p></div>
</div></section>
${difs.length ? `<section class="sec" id="diferenciais" style="padding-top:0"><div class="wrap"><div class="dif-grade">${difs.map((x, i) => `<div class="dif-card"><span class="ic">${[ICONES.escudo, ICONES.relogio, ICONES.estrela, ICONES.check][i % 4]}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join("")}</div></div></section>` : ""}
${galeriaCena(galeria2, esc(d.empresa), "Nossa loja")}
${passos.length ? `<section class="sec" id="passos"><div class="wrap"><div class="cab"><h2 id="compra">Como comprar</h2></div><div class="trilha">${passos.map((p, i) => `<div class="p"><span>${num(i)}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join("")}</div></div></section>` : ""}
${voz.length ? `<section class="sec vozes"><div class="wrap"><div class="cab"><h2>Quem j\xE1 comprou</h2></div><div class="grade">${voz.map((x) => `<figure><span class="estrelas" aria-hidden="true">\u2605\u2605\u2605\u2605\u2605</span><blockquote>\u201C${esc(x.texto)}\u201D</blockquote><figcaption>${esc(x.autor || "")}</figcaption></figure>`).join("")}</div></div></section>` : ""}
${secaoLigada(d, "ctaFinal") ? `<section class="sec chamada" id="chamada"><div class="wrap"><div class="cartao"><div><h2>Qual vai ser o seu?</h2><p>Chame no WhatsApp, conte o que procura e receba as op\xE7\xF5es dispon\xEDveis.</p></div>${ctaPrincipal(d, "Falar com vendedor")}</div></div></section>` : ""}
<section class="contato" id="contato"><div class="wrap">
  <div class="cx"><h2>Venha conhecer</h2>${d.endereco ? `<p>${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ""}${d.horario ? `<p>${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ""}</div>
  <div class="cx acoes">${ctaPrincipal(d, "Chamar no WhatsApp")}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  }
};
var CENAS_SHOWROOM = [showroom];

// src/templates/sites/cena-credito.ts
var FONTES_CREDITO = {
  titulos: '"Plus Jakarta Sans",system-ui,sans-serif',
  corpo: '"Plus Jakarta Sans",system-ui,sans-serif',
  google: "family=Plus+Jakarta+Sans:wght@400;500;600;700;800"
};
var credito = {
  id: "credito",
  nome: "Cr\xE9dito",
  descricao: "Claro e confi\xE1vel, com cart\xE3o desenhado, passo a passo e checklist de documentos. Para credi\xE1rios, financeiras e correspondentes.",
  nichos: ["Credi\xE1rios", "Financeiras", "Cons\xF3rcios", "Correspondentes banc\xE1rios", "Cooperativas de cr\xE9dito"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#f6faf8"/><rect x="10" y="8" width="24" height="7" rx="3" fill="${corPrimaria}"/><rect x="112" y="7" width="38" height="10" rx="5" fill="${corPrimaria}"/>
    <rect x="12" y="32" width="64" height="9" rx="2" fill="#0d2b22"/><rect x="12" y="45" width="46" height="9" rx="2" fill="${corPrimaria}"/><rect x="12" y="62" width="30" height="9" rx="4.5" fill="${corPrimaria}"/>
    <rect x="86" y="28" width="62" height="40" rx="8" fill="${corPrimaria}"/><rect x="92" y="36" width="12" height="9" rx="2" fill="${corDestaque}"/><rect x="92" y="54" width="40" height="4" rx="2" fill="#fff" opacity=".7"/>
    <rect x="12" y="82" width="42" height="22" rx="6" fill="#fff" stroke="#dbe9e2"/><rect x="59" y="82" width="42" height="22" rx="6" fill="#fff" stroke="#dbe9e2"/><rect x="106" y="82" width="42" height="22" rx="6" fill="#fff" stroke="#dbe9e2"/></svg>`,
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Tire as d\xFAvidas, veja os documentos necess\xE1rios e fa\xE7a a sua simula\xE7\xE3o pelo WhatsApp.", "Aqui voc\xEA entende as condi\xE7\xF5es, os prazos e os documentos antes de decidir.");
    const capa = urlImagem(d.capa);
    const galeria2 = fotos(d);
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const horario = horarioCurto(d);
    const mapa = linkMapa(d);
    const difs = secaoLigada(d, "diferenciais") ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, "passos") ? passosDe(d, 4) : [];
    const voz = depoimentosValidos(d).slice(0, 3);
    const zapSimular = zapTexto(d, "Ol\xE1! Gostaria de fazer uma simula\xE7\xE3o.");
    const aviso = "Cr\xE9dito sujeito \xE0 an\xE1lise e aprova\xE7\xE3o. As condi\xE7\xF5es, prazos e valores s\xE3o informados por escrito antes da contrata\xE7\xE3o.";
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
${cssGaleriaCena("22px", "var(--c-borda)")}
.sx{--sx-fundo:transparent;--sx-alt:transparent;--sx-card:#fff;--sx-borda:var(--c-borda);--sx-texto:var(--c-tinta);--sx-suave:var(--c-suave);--sx-icone:var(--p-texto);--sx-raio:22px}
.sx-cab h2{font-family:var(--fonte-t);letter-spacing:-.03em}
${cssRodape("rp", "#0d2b22", "#a8c2b8")}
@media(max-width:900px){.topo nav{display:none}.capa-in,.docs .wrap,.contato .wrap{grid-template-columns:1fr}.cena{margin:8px auto 0;max-width:440px}.dif-grade{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.dif-grade{grid-template-columns:1fr}.cena .hora{display:none}}
`, `
<header class="topo"><div class="wrap">
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav aria-label="Se\xE7\xF5es"><a href="#modalidades">Modalidades</a><a href="#como">Como funciona</a><a href="#documentos">Documentos</a><a href="#contato">Contato</a></nav>
  ${ctaPrincipal(d, "Simular")}
</div></header>
<section class="capa"><div class="wrap capa-in">
  <div><span class="etq">${esc(d.categoria || "Cr\xE9dito com atendimento claro")}${d.cidade ? ` \xB7 ${esc(d.cidade)}` : ""}</span>
    <h1>${d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : "Cr\xE9dito explicado <em>antes de contratar</em>"}</h1>
    <p class="lead">${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, "Simular pelo WhatsApp")}<a class="btn btn-2" href="#como">Como funciona</a></div>
    <p class="legal">${aviso}</p></div>
  <div class="cena${capa ? " com-foto" : ""}">${capa ? `<div class="foto-fundo" role="img" aria-label="${esc(d.empresa)}" style="${fundoFoto(capa, d.corPrimaria, "rgba(0,0,0,0),rgba(0,0,0,.08)").replace(/"/g, "&quot;")}"></div>` : ""}<div class="cartao-cred" role="img" aria-label="Ilustra\xE7\xE3o de um cart\xE3o"><span class="chip"></span><div><small>Atendimento</small><span class="nome">${esc(d.empresa)}</span></div></div>
    ${nota ? `<div class="nota"><b>${nota.nota} \u2605</b>${nota.avaliacoes ? `${nota.avaliacoes} avalia\xE7\xF5es no Google` : "no Google"}</div>` : ""}
    ${horario ? `<div class="hora">${ICONES.relogio}<span>${esc(horario)}</span></div>` : ""}</div>
</div></section>
${servicos.length ? `<section class="sec" id="modalidades"><div class="wrap"><div class="cab"><h2>Modalidades de cr\xE9dito</h2><p>Escolha o assunto e chame no WhatsApp com a mensagem j\xE1 escrita.</p></div>
<div class="mods">${servicos.map((s, i) => `<article class="mod"><span class="ic">${[ICONES.escudo, ICONES.brilho, ICONES.coracao, ICONES.estrela, ICONES.check, ICONES.relogio][i % 6]}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p>${zapTexto(d, `Ol\xE1! Quero saber mais sobre: ${s.titulo}`) ? `<a href="${zapTexto(d, `Ol\xE1! Quero saber mais sobre: ${s.titulo}`)}" target="_blank" rel="noopener">Consultar ${ICONES.seta}</a>` : ""}</article>`).join("")}</div></div></section>` : ""}
${passos.length ? `<section class="sec" id="passos" style="padding-top:0"><div class="wrap"><div class="cab"><h2 id="como">Como funciona</h2><p>Tr\xEAs etapas, sem letra mi\xFAda.</p></div><div class="passo-grade">${passos.map((p, i) => `<div class="passo"><span class="no">${i + 1}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join("")}</div></div></section>` : ""}
<section class="sec docs" id="documentos"><div class="wrap">
  <div><h2>Saiba o que levar antes de vir</h2><p>${sobreTxt}</p>${zapSimular ? `<p><a class="btn btn-1" href="${zapSimular}" target="_blank" rel="noopener">${ICONES.zap}Confirmar a lista no WhatsApp</a></p>` : ""}</div>
  <ul class="check"><li>${ICONES.check}<span>Documento oficial com foto<small>RG ou CNH</small></span></li><li>${ICONES.check}<span>CPF</span></li><li>${ICONES.check}<span>Comprovante de resid\xEAncia</span></li><li>${ICONES.check}<span>Comprovante de renda<small>A lista exata \xE9 confirmada conforme a modalidade</small></span></li></ul>
</div></section>
${difs.length ? `<section class="sec" id="diferenciais" style="padding-top:0"><div class="wrap"><div class="dif-grade">${difs.map((x, i) => `<div class="dif-card"><span class="ic">${[ICONES.escudo, ICONES.check, ICONES.coracao, ICONES.estrela][i % 4]}</span><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join("")}</div></div></section>` : ""}
${galeriaCena(galeria2, esc(d.empresa), "Nosso atendimento")}
${voz.length ? `<section class="sec vozes"><div class="wrap"><div class="cab"><h2>Quem j\xE1 foi atendido</h2></div><div class="grade">${voz.map((x) => `<figure><span class="estrelas" aria-hidden="true">\u2605\u2605\u2605\u2605\u2605</span><blockquote>\u201C${esc(x.texto)}\u201D</blockquote><figcaption>${esc(x.autor || "")}</figcaption></figure>`).join("")}</div></div></section>` : ""}
${secaoLigada(d, "ctaFinal") ? `<section class="sec chamada" id="chamada"><div class="wrap"><div class="cartao"><h2>Fa\xE7a a sua simula\xE7\xE3o</h2><p>Chame no WhatsApp e tire as d\xFAvidas antes de decidir.</p>${ctaPrincipal(d, "Simular pelo WhatsApp")}</div></div></section>` : ""}
<section class="contato" id="contato"><div class="wrap">
  <div class="cx"><h2>Fale com a gente</h2>${d.endereco ? `<p>${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ""}${d.horario ? `<p>${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ""}</div>
  <div class="cx acoes">${ctaPrincipal(d, "Chamar no WhatsApp")}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div>
</div></section>
<div class="aviso-legal"><div class="wrap"><p><strong>Aviso:</strong> ${aviso}</p></div></div>
${fim(d, rodapePremium(d))}`);
  }
};
var CENAS_CREDITO = [credito];

// src/templates/sites/cena-forno.ts
var FONTES_FORNO = {
  titulos: '"Young Serif",Georgia,serif',
  corpo: '"Figtree",system-ui,sans-serif',
  google: "family=Young+Serif&family=Figtree:wght@400;500;600;700"
};
var forno = {
  id: "forno",
  nome: "Forno",
  descricao: "Papel kraft, serifa acolhedora, foto em arco e card\xE1pio de balc\xE3o com pedido no WhatsApp. Para padarias, confeitarias e caf\xE9s.",
  nichos: ["Padarias", "Confeitarias", "Cafeterias", "Docerias", "Bolos e doces"],
  miniatura: ({ corPrimaria, corDestaque }) => `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg">
    <rect width="160" height="110" fill="#f7efe3"/><rect x="10" y="8" width="26" height="6" rx="3" fill="#3b2418"/><rect x="112" y="6" width="38" height="10" rx="5" fill="${corPrimaria}"/>
    <path d="M92 94V54a28 28 0 0 1 56 0v40z" fill="${corPrimaria}" opacity=".55"/><circle cx="96" cy="40" r="9" fill="${corDestaque}"/>
    <rect x="12" y="30" width="62" height="10" rx="2" fill="#3b2418"/><rect x="12" y="44" width="44" height="10" rx="2" fill="#3b2418"/><rect x="12" y="62" width="30" height="9" rx="4.5" fill="${corPrimaria}"/>
    <rect x="12" y="98" width="60" height="3" fill="#d9c7ad"/><rect x="82" y="98" width="66" height="3" fill="#d9c7ad"/></svg>`,
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "P\xE3o quentinho, bolos e doces feitos todo dia, com encomenda f\xE1cil pelo WhatsApp.", "Cada fornada \xE9 pensada para voc\xEA levar sabor para casa e voltar sempre.");
    const capa = urlImagem(d.capa);
    const galeria2 = fotos(d);
    const foto2 = urlImagem(d.fotoSobre) || galeria2[0] || "";
    const servicos = servicosValidos(d);
    const nota = notaReal(d);
    const horario = horarioCurto(d);
    const mapa = linkMapa(d);
    const difs = secaoLigada(d, "diferenciais") ? diferenciaisDe(d) : [];
    const passos = secaoLigada(d, "passos") ? passosDe(d, 4) : [];
    const voz = depoimentosValidos(d).slice(0, 3);
    const pedidoGeral = zapTexto(d, "Ol\xE1! Gostaria de fazer uma encomenda.");
    return documentoPremium(d, FONTES_FORNO, `
:root{--f-papel:#f7efe3;--f-tinta:#3b2418;--f-suave:#6f5847;--f-borda:#e2d2ba;--f-claro:#fffaf1}
body{background:#f7efe3;color:var(--f-tinta)}
h1,h2,h3{font-family:var(--fonte-t);font-weight:400;letter-spacing:-.01em;line-height:1.06}
.topo{position:sticky;top:0;z-index:40;background:rgba(247,239,227,.92);backdrop-filter:blur(10px);border-bottom:1px dashed var(--f-borda)}
.topo .wrap{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 0}
.marca{display:flex;align-items:center;gap:10px;font-family:var(--fonte-t);font-size:1.3rem;color:var(--f-tinta)}
.logo-img{height:38px;width:auto}.logo-iniciais{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:var(--p);color:var(--sobre-p);font-weight:700;font-size:14px}
.topo nav{display:flex;gap:28px;font-weight:500;font-size:15px;color:var(--f-suave)}.topo nav a:hover{color:var(--p-texto)}
.btn{border-radius:999px;font-weight:700}
.btn-1{background:var(--p);color:var(--sobre-p)}.btn-1:hover{transform:translateY(-2px)}
.btn-2{background:transparent;color:var(--f-tinta);border:1.5px solid var(--f-tinta)}
.capa{padding:clamp(40px,6vw,84px) 0 clamp(56px,8vw,104px)}
.capa-in{display:grid;grid-template-columns:1.05fr 1fr;gap:clamp(32px,5vw,80px);align-items:center}
.etq{display:inline-flex;align-items:center;gap:8px;font-weight:700;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--p-texto)}
.etq::before{content:'';width:22px;height:2px;background:currentColor}
.capa h1{font-size:clamp(2.8rem,6.2vw,5.4rem);margin:18px 0 18px}
.capa h1 em{font-style:italic;color:var(--p-texto)}
.capa .lead{color:var(--f-suave);font-size:var(--t1);max-width:44ch;margin:0 0 28px}
.btns{display:flex;gap:12px;flex-wrap:wrap}
.hoje{margin-top:28px;display:inline-flex;gap:12px;align-items:center;background:var(--f-claro);border:1.5px dashed var(--f-borda);border-radius:16px;padding:12px 18px;font-weight:600}.hoje svg{color:var(--p-texto)}.hoje small{display:block;color:var(--f-suave);font-weight:500}
.arco{position:relative;max-width:480px;margin-left:auto;width:100%}
.arco .img{aspect-ratio:4/5;border-radius:999px 999px 28px 28px;overflow:hidden;box-shadow:0 36px 60px -36px rgba(59,36,24,.55);border:8px solid var(--f-claro);${fundoFoto(capa, d.corPrimaria, "rgba(0,0,0,0),rgba(59,36,24,.1)")}}
.selo{position:absolute;right:-14px;top:12%;width:112px;height:112px;border-radius:50%;background:var(--d);color:#2a170d;display:grid;place-items:center;text-align:center;font-family:var(--fonte-t);font-size:15px;line-height:1.1;transform:rotate(10deg);box-shadow:0 14px 26px -14px rgba(0,0,0,.5);padding:12px}
.nota-fl{position:absolute;left:-14px;bottom:8%;background:var(--f-claro);border:1.5px dashed var(--f-borda);border-radius:16px;padding:12px 16px;box-shadow:0 20px 36px -24px rgba(59,36,24,.5);font-size:13px;color:var(--f-suave)}.nota-fl b{display:block;font-size:1.5rem;color:var(--f-tinta);font-family:var(--fonte-t);line-height:1}
.sec{padding:clamp(56px,8vw,104px) 0}
.cab{display:flex;align-items:end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:clamp(24px,4vw,44px)}
.cab h2{font-size:clamp(2.2rem,4.8vw,3.8rem);margin:0;max-width:16ch}.cab p{margin:0;color:var(--f-suave);max-width:36ch;font-size:var(--t1)}
.cardapio{background:var(--f-claro);border:1.5px dashed var(--f-borda);border-radius:28px;padding:clamp(24px,4vw,52px);display:grid;grid-template-columns:1fr 1fr;gap:6px clamp(28px,5vw,72px)}
.item{display:flex;flex-direction:column;gap:4px;padding:18px 0;border-bottom:1px dotted #cdb89a}
.item .linha{display:flex;align-items:baseline;gap:10px}
.item h3{font-size:1.45rem;margin:0}.item .pontos{flex:1;border-bottom:2px dotted #cdb89a;transform:translateY(-4px)}
.item a{font-weight:700;font-size:14px;color:var(--p-texto);white-space:nowrap}.item a:hover{text-decoration:underline}
.item p{margin:0;color:var(--f-suave);max-width:46ch}
.sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(32px,6vw,96px);align-items:center}
.sobre .foto{aspect-ratio:1;border-radius:28px 28px 200px 28px;overflow:hidden;border:8px solid var(--f-claro);box-shadow:0 30px 50px -34px rgba(59,36,24,.5);background:var(--p-cla)}.sobre .foto img{width:100%;height:100%;object-fit:cover}
.sobre h2{font-size:clamp(2.2rem,4.6vw,3.6rem);margin:0 0 18px}.sobre p{color:var(--f-suave);font-size:var(--t1)}
.etiquetas{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.etiqueta{background:var(--f-claro);border:1.5px dashed var(--f-borda);border-radius:20px;padding:26px;position:relative}
.etiqueta::before{content:'';position:absolute;left:50%;top:-8px;width:44px;height:14px;border-radius:7px;background:var(--d);transform:translateX(-50%) rotate(-3deg);opacity:.85}
.etiqueta h3{font-size:1.35rem;margin:6px 0 8px}.etiqueta p{margin:0;color:var(--f-suave)}
.encomenda{background:var(--f-tinta);color:#f7efe3;border-radius:36px;padding:clamp(32px,6vw,72px)}
.encomenda h2{font-size:clamp(2.2rem,4.6vw,3.6rem);margin:0 0 28px;color:#fff}
.encomenda .passos{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr));gap:24px}
.encomenda .n{font-family:var(--fonte-t);font-size:3.6rem;line-height:1;color:var(--d)}
.encomenda h3{font-size:1.4rem;margin:8px 0;color:#fff}.encomenda p{margin:0;color:#d8c7b3}
.vozes .grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(280px,100%),1fr));gap:16px}
.vozes figure{margin:0;background:var(--f-claro);border:1.5px dashed var(--f-borda);border-radius:24px;padding:28px}
.vozes blockquote{margin:12px 0 18px;font-family:var(--fonte-t);font-size:1.25rem;line-height:1.3}.vozes figcaption{font-weight:600;color:var(--f-suave)}
.chamada .cartao{background:var(--p);color:var(--sobre-p);border-radius:36px;padding:clamp(40px,7vw,84px) clamp(24px,6vw,80px);text-align:center;border:8px solid var(--f-claro)}
.chamada h2{font-size:clamp(2.4rem,5.4vw,4.2rem);margin:0 0 12px;color:inherit}.chamada p{margin:0 auto 26px;max-width:44ch;opacity:.94;font-size:var(--t1)}
.chamada .btn-1{background:var(--f-claro);color:var(--f-tinta)}
.contato .wrap{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:clamp(48px,7vw,88px) 0}
.contato .cx{background:var(--f-claro);border:1.5px dashed var(--f-borda);border-radius:26px;padding:clamp(24px,4vw,44px)}
.contato h2{font-size:clamp(1.8rem,3.4vw,2.6rem);margin:0 0 16px}.contato p{display:flex;gap:12px;margin:0 0 10px;color:var(--f-suave)}.contato svg{flex:none;margin-top:4px;color:var(--p-texto)}
.contato .acoes{display:grid;gap:12px;align-content:center}.contato .btn{justify-content:center}
${cssGaleriaCena("24px", "var(--f-borda)")}
.sx{--sx-fundo:transparent;--sx-alt:transparent;--sx-card:#fffaf1;--sx-borda:var(--f-borda);--sx-texto:var(--f-tinta);--sx-suave:var(--f-suave);--sx-icone:var(--p-texto);--sx-raio:24px}
.sx-cab h2{font-family:var(--fonte-t)}
${cssRodape("rp", "#2a170d", "#d8c7b3")}
@media(max-width:900px){.topo nav{display:none}.capa-in,.sobre .wrap,.contato .wrap,.cardapio{grid-template-columns:1fr}.arco{margin:8px auto 0;max-width:420px}.etiquetas{grid-template-columns:1fr 1fr}.selo{right:-6px}.nota-fl{left:-6px}}
@media(max-width:560px){.etiquetas{grid-template-columns:1fr}.selo{width:92px;height:92px;font-size:13px}}
`, `
<header class="topo"><div class="wrap">
  <a class="marca" href="#">${logo(d)}<span>${esc(d.empresa)}</span></a>
  <nav aria-label="Se\xE7\xF5es"><a href="#cardapio">Card\xE1pio</a><a href="#sobre">A casa</a><a href="#encomendas">Encomendas</a><a href="#contato">Contato</a></nav>
  ${ctaPrincipal(d, "Encomendar")}
</div></header>
<section class="capa"><div class="wrap capa-in">
  <div><span class="etq">${esc(d.categoria || "Feito todo dia")}${d.cidade ? ` \xB7 ${esc(d.cidade)}` : ""}</span>
    <h1>${d.slogan && d.slogan.trim() ? esc(d.slogan.trim()) : "Cheirinho de p\xE3o <em>saindo do forno</em>"}</h1>
    <p class="lead">${capaTxt}</p>
    <div class="btns">${ctaPrincipal(d, "Fazer encomenda")}<a class="btn btn-2" href="#cardapio">Ver card\xE1pio</a></div>
    ${horario ? `<div class="hoje">${ICONES.relogio}<span><small>Aberto</small>${esc(horario)}</span></div>` : ""}</div>
  <div class="arco"><div class="img" role="img" aria-label="${esc(d.empresa)}"></div><span class="selo" aria-hidden="true">Feito todo dia</span>
    ${nota ? `<div class="nota-fl"><b>${nota.nota} \u2605</b>${nota.avaliacoes ? `${nota.avaliacoes} avalia\xE7\xF5es no Google` : "no Google"}</div>` : ""}</div>
</div></section>
${servicos.length ? `<section class="sec" id="cardapio"><div class="wrap"><div class="cab"><h2>O que sai do nosso balc\xE3o</h2><p>Toque em \u201CPedir\u201D e o WhatsApp abre com a mensagem pronta.</p></div>
<div class="cardapio">${servicos.map((s) => `<div class="item"><div class="linha"><h3>${esc(s.titulo)}</h3><span class="pontos" aria-hidden="true"></span>${zapTexto(d, `Ol\xE1! Quero pedir/encomendar: ${s.titulo}`) ? `<a href="${zapTexto(d, `Ol\xE1! Quero pedir/encomendar: ${s.titulo}`)}" target="_blank" rel="noopener">Pedir</a>` : ""}</div><p>${esc(s.descricao)}</p></div>`).join("")}</div></div></section>` : ""}
<section class="sec sobre" id="sobre"><div class="wrap">
  ${foto2 ? `<div class="foto"><img src="${foto2}" alt="${esc(d.empresa)}" loading="lazy"></div>` : ""}
  <div><h2>Uma padaria de bairro, feita com capricho</h2><p>${sobreTxt}</p>${pedidoGeral ? `<p><a class="btn btn-1" href="${pedidoGeral}" target="_blank" rel="noopener">${ICONES.zap}Falar com a gente</a></p>` : ""}</div>
</div></section>
${difs.length ? `<section class="sec" id="diferenciais" style="padding-top:0"><div class="wrap"><div class="etiquetas">${difs.map((x) => `<div class="etiqueta"><h3>${esc(x.titulo)}</h3><p>${esc(x.texto)}</p></div>`).join("")}</div></div></section>` : ""}
${galeriaCena(galeria2, esc(d.empresa), "Direto da vitrine")}
${passos.length ? `<section class="sec" id="passos" style="padding-top:0"><div class="wrap"><div class="encomenda" id="encomendas"><h2>Como encomendar</h2><div class="passos">${passos.map((p, i) => `<div><span class="n">${num(i)}</span><h3>${esc(p.titulo)}</h3><p>${esc(p.texto)}</p></div>`).join("")}</div></div></div></section>` : ""}
${voz.length ? `<section class="sec vozes"><div class="wrap"><div class="cab"><h2>Quem j\xE1 provou</h2></div><div class="grade">${voz.map((x) => `<figure><span class="estrelas" aria-hidden="true">\u2605\u2605\u2605\u2605\u2605</span><blockquote>\u201C${esc(x.texto)}\u201D</blockquote><figcaption>${esc(x.autor || "")}</figcaption></figure>`).join("")}</div></div></section>` : ""}
${secaoLigada(d, "ctaFinal") ? `<section class="sec chamada" id="chamada"><div class="wrap"><div class="cartao"><h2>J\xE1 est\xE1 com \xE1gua na boca?</h2><p>Chame no WhatsApp, conte o que quer e combine a retirada.</p>${ctaPrincipal(d, "Fazer encomenda")}</div></div></section>` : ""}
<section class="contato" id="contato"><div class="wrap">
  <div class="cx"><h2>Venha nos visitar</h2>${d.endereco ? `<p>${ICONES.mapa}<span>${esc(d.endereco)}</span></p>` : ""}${d.horario ? `<p>${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ""}</div>
  <div class="cx acoes">${ctaPrincipal(d, "Chamar no WhatsApp")}${mapa ? `<a class="btn btn-2" href="${mapa}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div>
</div></section>
${fim(d, rodapePremium(d))}`);
  }
};
var CENAS_FORNO = [forno];

// src/templates/sites/cenas.ts
var CENAS = [...CENAS_RITUAL, ...CENAS_MESA, ...CENAS_PLANTA, ...CENAS_SORRISO, ...CENAS_PATINHAS, ...CENAS_SHOWROOM, ...CENAS_CREDITO, ...CENAS_FORNO];

// src/templates/sites/cinema-base.ts
var PARES = {
  instrument: {
    titulos: '"Instrument Serif",Georgia,serif',
    corpo: '"Inter",system-ui,sans-serif',
    google: "family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700"
  },
  anton: {
    titulos: '"Anton",Impact,"Arial Narrow",sans-serif',
    corpo: '"Inter",system-ui,sans-serif',
    google: "family=Anton&family=Condiment&family=Inter:wght@400;500;600;700"
  },
  sora: {
    titulos: '"Sora",system-ui,sans-serif',
    corpo: '"Inter",system-ui,sans-serif',
    google: "family=Sora:wght@300;400;600;700&family=Inter:wght@400;500;600"
  },
  archivo: {
    titulos: '"Archivo",system-ui,sans-serif',
    corpo: '"Inter",system-ui,sans-serif',
    google: "family=Archivo:wdth,wght@100,300;125,800;125,900&family=Inter:wght@400;500;600"
  },
  grotesk: {
    titulos: '"Space Grotesk",system-ui,sans-serif',
    corpo: '"Inter",system-ui,sans-serif',
    google: "family=Space+Grotesk:wght@400;500;700&family=Inter:wght@400;500;600"
  },
  cormorant: {
    titulos: '"Cormorant Garamond",Georgia,serif',
    corpo: '"Jost",system-ui,sans-serif',
    google: "family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,500&family=Jost:wght@300;400;500;600"
  },
  syne: {
    titulos: '"Syne",system-ui,sans-serif',
    corpo: '"Manrope",system-ui,sans-serif',
    google: "family=Syne:wght@500;700;800&family=Manrope:wght@300;400;500;600;700"
  }
};
var palavras = (texto, inicio = 0, passo = 1) => esc(texto).split(/\s+/).filter(Boolean).map((p, i) => `<span class="pal" style="--i:${inicio + i * passo}">${p}</span>`).join(" ");
var letras = (texto, inicio = 0) => esc(texto).split(" ").map((palavra, w, todas) => {
  const base = todas.slice(0, w).join(" ").length + (w ? w : 0);
  return `<span class="pal-g">${[...palavra].map((c, i) => `<span class="let" style="--i:${inicio + base + i}">${c}</span>`).join("")}</span>`;
}).join(" ");
var titulo = (d, padrao) => (d.slogan || "").trim() || padrao;
var eyebrow = (d) => [d.categoria, d.cidade].map((x) => (x || "").trim()).filter(Boolean).join(" \xB7 ");
var frases = (texto) => (texto || "").match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [];
var imagens = (d) => {
  const todas = [urlImagem(d.capa), urlImagem(d.fotoSobre), ...fotos(d)].filter(Boolean);
  return [...new Set(todas)];
};
var fotoDe = (d, i) => {
  const lista = imagens(d);
  return lista.length ? lista[i % lista.length] : "";
};
var fundoImagem = (src, variante = 0) => src ? `background-image:url('${src}')` : `--cena:${variante}`;
var classeImagem = (src, base) => `${base} ${src ? "tem-foto" : "cena"}`;
var nav = (d, itens2, classe = "nv") => {
  const zap = ctaPrincipal(d, "Falar agora", `${classe}-cta vidro-bt`);
  return `<header class="${classe}"><input type="checkbox" id="${classe}-chk" class="menu-chk" aria-label="Abrir menu">
  <a class="${classe}-marca" href="#topo">${logo(d, `${classe}-logo`)}<span>${esc(d.empresa)}</span></a>
  <nav class="${classe}-links" aria-label="Se\xE7\xF5es">${itens2.map(([h, r]) => `<a href="${h}">${r}</a>`).join("")}</nav>
  ${zap}
  <label for="${classe}-chk" class="menu-btn" aria-hidden="true"><i></i><i></i><i></i></label>
</header>`;
};
var contatoLinhas2 = (d, classe) => {
  const tel = linkTel(d), ig = linkInsta(d), mapa = linkMapa(d);
  return `${d.endereco ? `<p class="${classe}">${ICONES.mapa}<span>${mapa ? `<a href="${mapa}" target="_blank" rel="noopener">${esc(d.endereco)}</a>` : esc(d.endereco)}</span></p>` : ""}
${d.horario ? `<p class="${classe}">${ICONES.relogio}<span>${esc(d.horario)}</span></p>` : ""}
${tel ? `<p class="${classe}">${ICONES.tel}<a href="${tel}">${esc(d.telefone)}</a></p>` : ""}
${ig ? `<p class="${classe}">${ICONES.insta}<a href="${ig}" target="_blank" rel="noopener">${esc(d.instagram)}</a></p>` : ""}
${d.email ? `<p class="${classe}">${ICONES.email}<a href="mailto:${esc(d.email)}">${esc(d.email)}</a></p>` : ""}`;
};
var faixa = (itens2, classe = "marq") => {
  const lista = itens2.filter(Boolean);
  if (!lista.length) return "";
  const trilha = lista.map((t) => `<span>${esc(t)}</span><i aria-hidden="true">\u2726</i>`).join("");
  return `<div class="${classe}" aria-hidden="true"><div class="marq-t">${trilha}${trilha}${trilha}${trilha}</div></div>`;
};
var contador = (valor, rotulo, classe = "ct") => `<div class="${classe}"><b class="cont" style="--n:${Math.round(valor)}" aria-label="${Math.round(valor)}"></b><span>${esc(rotulo)}</span></div>`;
var numerosReais = (d) => {
  const saida = [];
  const nota = Number(d.nota);
  if (nota >= 3.5) saida.push({ texto: nota.toFixed(1).replace(".", ","), rotulo: "nota no Google" });
  if (Number(d.avaliacoes) > 0) saida.push({ texto: "", valor: Number(d.avaliacoes), rotulo: "avalia\xE7\xF5es de clientes" });
  const n = servicosValidos(d).length;
  if (n >= 2) saida.push({ texto: "", valor: n, rotulo: n === 1 ? "servi\xE7o" : "servi\xE7os" });
  return saida;
};
var rodape2 = (d, classe = "rd") => {
  const tel = linkTel(d), zap = linkZap(d), ig = linkInsta(d), mapa = linkMapa(d);
  return `<footer class="${classe}"><div class="wrap ${classe}-in">
  <div class="${classe}-marca">${logo(d, `${classe}-logo`)}<b>${esc(d.empresa)}</b>${d.slogan ? `<p>${esc(d.slogan)}</p>` : ""}</div>
  <div class="${classe}-col"><h4>Contato</h4>
    ${tel ? `<a href="${tel}">${esc(d.telefone)}</a>` : ""}
    ${zap ? `<a href="${zap}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
    ${d.email ? `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : ""}
    ${ig ? `<a href="${ig}" target="_blank" rel="noopener">Instagram</a>` : ""}</div>
  <div class="${classe}-col"><h4>Visite</h4>
    ${d.endereco ? mapa ? `<a href="${mapa}" target="_blank" rel="noopener">${esc(d.endereco)}</a>` : `<span>${esc(d.endereco)}</span>` : ""}
    ${d.horario ? `<span>${esc(d.horario)}</span>` : ""}</div>
</div><div class="wrap ${classe}-fim">\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${esc(d.empresa)}${d.cidade ? ` \xB7 ${esc(d.cidade)}` : ""}</div></footer>`;
};
var vozes = (d, classe, tit = "O que dizem de n\xF3s") => {
  const lista = depoimentosValidos(d);
  if (!lista.length) return "";
  return `<section class="${classe}" id="vozes"><div class="wrap"><h2 class="rev">${tit}</h2><div class="${classe}-lista">${lista.map((x, i) => `<figure class="${classe}-v rev" style="--r:${i}"><span class="estrelas">\u2605\u2605\u2605\u2605\u2605</span><blockquote>\u201C${esc(x.texto)}\u201D</blockquote>${x.autor ? `<figcaption>${esc(x.autor)}</figcaption>` : ""}</figure>`).join("")}</div></div></section>`;
};
var cssBaseEscura = (d, fundo = "#07080c") => `
:root{--c1:${d.corPrimaria};--c2:${d.corDestaque};
  --bg:${fundo};--fg:#f4f5f7;--mudo:rgba(244,245,247,.64);--linha:rgba(255,255,255,.13);
  --c1c:color-mix(in srgb,var(--c1) 58%,#fff);--c2c:color-mix(in srgb,var(--c2) 72%,#fff);
  --raio:26px;--ease:cubic-bezier(.2,.7,.2,1)}
@supports (background:color-mix(in srgb,red,blue)){:root{--bg:color-mix(in srgb,var(--c1) 8%,${fundo})}}
body{background:${fundo};background:var(--bg);color:var(--fg);-webkit-font-smoothing:antialiased;overflow-x:hidden}
::selection{background:var(--c2);color:#111}
.wrap{width:min(1200px,90vw);margin:0 auto}
h1,h2,h3{color:#fff;letter-spacing:-.02em}
a{color:inherit}
${cssMovimento()}
${cssVidro()}
${cssMenu()}
`;
var cssBaseClara = (d, fundo = "#f6f3ee") => `
:root{--c1:${d.corPrimaria};--c2:${d.corDestaque};--bg:${fundo};--fg:#14161a;--mudo:#5d6370;--linha:rgba(20,22,26,.12);
  --c1c:color-mix(in srgb,var(--c1) 80%,#000);--c2c:var(--c2);--raio:26px;--ease:cubic-bezier(.2,.7,.2,1)}
body{background:${fundo};color:var(--fg);-webkit-font-smoothing:antialiased;overflow-x:hidden}
.wrap{width:min(1200px,90vw);margin:0 auto}
h1,h2,h3{color:#0d0f13;letter-spacing:-.02em}
${cssMovimento()}
${cssVidro()}
${cssMenu()}
`;
var cssMovimento = () => `
html{scroll-behavior:smooth}
/* t\xEDtulo palavra por palavra */
@keyframes palavra{from{opacity:0;filter:blur(14px);transform:translateY(.45em)}to{opacity:1;filter:blur(0);transform:none}}
.pal,.let{display:inline-block;animation:palavra .9s var(--ease) both;animation-delay:calc(var(--i,0) * 70ms + .15s)}
.let{animation-duration:.7s;animation-delay:calc(var(--i,0) * 38ms + .2s)}
.pal-g{display:inline-block;white-space:nowrap}
@keyframes sobe{from{opacity:0;transform:translateY(22px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
.entra{animation:sobe 1s var(--ease) both;animation-delay:calc(var(--d,0) * 120ms + .5s)}
/* revela\xE7\xE3o ao rolar: onde n\xE3o h\xE1 suporte, o conte\xFAdo s\xF3 aparece */
@keyframes rev{from{opacity:0;transform:translateY(44px) scale(.98);filter:blur(10px)}to{opacity:1;transform:none;filter:none}}
@keyframes rev-l{from{opacity:0;transform:translateX(-60px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
@keyframes rev-r{from{opacity:0;transform:translateX(60px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
@supports (animation-timeline:view()){
  .rev{animation:rev linear both;animation-timeline:view();animation-range:entry 4% entry 52%}
  .rev-l{animation:rev-l linear both;animation-timeline:view();animation-range:entry 4% entry 52%}
  .rev-r{animation:rev-r linear both;animation-timeline:view();animation-range:entry 4% entry 52%}
  .par{animation:par linear both;animation-timeline:view();animation-range:cover 0% cover 100%}
  .par-l{animation:par-l linear both;animation-timeline:view();animation-range:cover 0% cover 100%}
}
@keyframes par{from{transform:translateY(-8%) scale(1.12)}to{transform:translateY(8%) scale(1.12)}}
@keyframes par-l{from{transform:translateY(60px)}to{transform:translateY(-60px)}}
/* Ken Burns e crossfade */
@keyframes kb{from{transform:scale(1.04) translate(0,0)}to{transform:scale(1.2) translate(-2%,-1.5%)}}
.kb{animation:kb 22s ease-in-out infinite alternate}
@keyframes cf{0%{opacity:0}6%{opacity:1}34%{opacity:1}42%{opacity:0}100%{opacity:0}}
.cf{opacity:0;animation:cf 21s ease-in-out infinite}
.cf:nth-child(2){animation-delay:7s}.cf:nth-child(3){animation-delay:14s}.cf:first-child{opacity:1;animation-delay:0s}
/* faixa em movimento */
.marq{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.marq-t{display:flex;align-items:center;gap:clamp(24px,4vw,56px);width:max-content;animation:marq 38s linear infinite}
.marq:hover .marq-t{animation-play-state:paused}
.marq span{white-space:nowrap}
@keyframes marq{to{transform:translateX(-25%)}}
@keyframes marq-r{from{transform:translateX(-25%)}to{transform:translateX(0)}}
/* contador: o n\xFAmero final est\xE1 em --n; a anima\xE7\xE3o parte de zero */
@property --n{syntax:'<integer>';initial-value:0;inherits:false}
@keyframes conta{from{--n:0}}
.cont{counter-reset:n var(--n);font-variant-numeric:tabular-nums}
.cont::after{content:counter(n)}
@supports (animation-timeline:view()){.cont{animation:conta linear both;animation-timeline:view();animation-range:entry 10% entry 80%}}
@supports not (animation-timeline:view()){.cont{animation:conta 2.2s var(--ease) both}}
/* brilho que passa pelo bot\xE3o */
@keyframes brilho{from{transform:translateX(-120%) skewX(-18deg)}to{transform:translateX(260%) skewX(-18deg)}}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
  .pal,.let,.entra,.rev,.rev-l,.rev-r{opacity:1!important;filter:none!important;transform:none!important}
  .cf:not(:first-child){display:none}
}
`;
var cssVidro = () => `
.vidro{position:relative;background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.035));
  -webkit-backdrop-filter:blur(22px) saturate(170%);backdrop-filter:blur(22px) saturate(170%);
  border:1px solid rgba(255,255,255,.16);border-radius:var(--raio);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 0 -1px 0 rgba(255,255,255,.04),0 30px 60px -28px rgba(0,0,0,.65)}
.vidro::before{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;
  background:radial-gradient(120% 70% at 0% 0%,rgba(255,255,255,.2),transparent 45%);mix-blend-mode:soft-light}
.vidro-bt{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:10px;
  padding:15px 28px;border-radius:999px;font-weight:600;font-size:15px;color:#fff;cursor:pointer;
  background:linear-gradient(160deg,rgba(255,255,255,.22),rgba(255,255,255,.06));
  -webkit-backdrop-filter:blur(18px) saturate(170%);backdrop-filter:blur(18px) saturate(170%);
  border:1px solid rgba(255,255,255,.28);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 18px 38px -18px rgba(0,0,0,.7);
  transition:transform .3s var(--ease),box-shadow .3s var(--ease),background .3s}
.vidro-bt:hover{transform:translateY(-3px);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 26px 46px -18px rgba(0,0,0,.75)}
.vidro-bt::after{content:"";position:absolute;top:0;bottom:0;width:38%;left:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);
  transform:translateX(-120%) skewX(-18deg)}
.vidro-bt:hover::after{animation:brilho .9s var(--ease)}
.vidro-bt svg{width:18px;height:18px;flex:none}
.bt-cheio{display:inline-flex;align-items:center;gap:10px;padding:16px 30px;border-radius:999px;font-weight:700;font-size:15px;
  background:linear-gradient(135deg,var(--c1c),var(--c2));color:#0b0c10;border:0;cursor:pointer;
  box-shadow:0 20px 40px -16px color-mix(in srgb,var(--c2) 70%,transparent);transition:transform .3s var(--ease),filter .3s}
.bt-cheio:hover{transform:translateY(-3px);filter:brightness(1.08)}
.bt-cheio svg{width:18px;height:18px}
.grao{position:relative}
.grao::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.09;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
/* cena gerada com as cores da marca, no lugar de uma foto que n\xE3o existe */
.cena{position:relative;background-color:#080a10;
  background-image:radial-gradient(60% 80% at 18% 12%,color-mix(in srgb,var(--c1) 75%,transparent),transparent 62%),
  radial-gradient(55% 70% at 92% 88%,color-mix(in srgb,var(--c2) 52%,transparent),transparent 62%),
  radial-gradient(40% 50% at 60% 40%,color-mix(in srgb,var(--c1c) 24%,transparent),transparent 70%),
  linear-gradient(160deg,#0c0f17,#05060a)}
.cena[style*="--cena:1"]{background-image:radial-gradient(70% 80% at 85% 15%,color-mix(in srgb,var(--c2) 60%,transparent),transparent 62%),radial-gradient(60% 70% at 10% 90%,color-mix(in srgb,var(--c1) 70%,transparent),transparent 62%),linear-gradient(200deg,#0c0f17,#05060a)}
.cena[style*="--cena:2"]{background-image:radial-gradient(80% 60% at 50% 0%,color-mix(in srgb,var(--c1c) 55%,transparent),transparent 65%),radial-gradient(50% 60% at 15% 85%,color-mix(in srgb,var(--c2) 45%,transparent),transparent 62%),linear-gradient(120deg,#0c0f17,#05060a)}
.tem-foto{background-size:cover;background-position:center;background-color:#0b0d12}
`;
var cssMenu = () => `
.menu-chk{position:absolute;opacity:0;pointer-events:none}
.menu-btn{display:none;width:44px;height:44px;border-radius:50%;cursor:pointer;place-items:center;align-content:center;gap:5px;
  background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.menu-btn i{display:block;width:18px;height:2px;border-radius:2px;background:currentColor;transition:transform .3s var(--ease),opacity .2s}
.menu-chk:checked~.menu-btn i:nth-child(1){transform:translateY(7px) rotate(45deg)}
.menu-chk:checked~.menu-btn i:nth-child(2){opacity:0}
.menu-chk:checked~.menu-btn i:nth-child(3){transform:translateY(-7px) rotate(-45deg)}
`;
var cssRodapeEscuro = (classe = "rd") => `
.${classe}{padding:72px 0 28px;border-top:1px solid var(--linha);background:rgba(0,0,0,.28)}
.${classe}-in{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:44px}
.${classe}-marca{display:grid;gap:10px;align-content:start}
.${classe}-marca b{font-family:var(--fonte-t);font-size:26px;color:#fff;font-weight:400}
.${classe}-marca p{color:var(--mudo);max-width:34ch;margin:0}
.${classe}-logo-img{height:46px;width:auto;border-radius:10px}
.${classe}-logo-iniciais{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--c1c),var(--c2));color:#0b0c10;font-weight:800}
.${classe}-col{display:grid;gap:10px;align-content:start}
.${classe}-col h4{margin:0 0 6px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--mudo);font-weight:600}
.${classe}-col a,.${classe}-col span{color:#e9ebf0;font-size:15px}
.${classe}-col a:hover{color:var(--c2c)}
.${classe}-fim{margin-top:48px;padding-top:20px;border-top:1px solid var(--linha);font-size:13px;color:var(--mudo)}
@media(max-width:800px){.${classe}-in{grid-template-columns:1fr;gap:30px}}
`;
var cssNavVidro = (classe = "nv") => `
.${classe}{position:fixed;z-index:50;top:16px;left:50%;transform:translateX(-50%);width:min(1120px,calc(100vw - 28px));
  display:flex;align-items:center;gap:22px;padding:10px 12px 10px 22px;border-radius:999px;
  background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.05));
  -webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%);
  border:1px solid rgba(255,255,255,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 24px 50px -24px rgba(0,0,0,.7)}
.${classe}-marca{display:flex;align-items:center;gap:12px;font-family:var(--fonte-t);font-size:21px;color:#fff;white-space:nowrap;min-width:0}
.${classe}-marca span{overflow:hidden;text-overflow:ellipsis}
.${classe}-logo-img{height:38px;width:auto;border-radius:10px}
.${classe}-logo-iniciais{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,var(--c1c),var(--c2));color:#0b0c10;font-weight:800;font-size:14px;font-family:var(--fonte-c)}
.${classe}-links{display:flex;gap:26px;margin-left:auto;font-size:14px;font-weight:500;color:rgba(255,255,255,.78)}
.${classe}-links a{transition:color .2s}.${classe}-links a:hover{color:#fff}
.${classe}-cta{padding:11px 22px;font-size:14px}
@media(max-width:860px){
  .${classe}{gap:12px;border-radius:30px;flex-wrap:wrap;padding:10px 12px 10px 18px}
  .${classe}-marca{flex:1}
  .${classe}-cta{display:none}
  .menu-btn{display:grid;color:#fff}
  .${classe}-links{display:none;order:5;width:100%;flex-direction:column;gap:2px;margin:0;padding:6px 4px 10px;font-size:17px}
  .${classe}-links a{padding:12px 8px;border-top:1px solid rgba(255,255,255,.1)}
  .menu-chk:checked~.${classe}-links{display:flex}
}
`;
var cssVozesEscuras = (familia = "", it\u00E1lico = false) => `
.nr-vozes{padding:clamp(56px,8vw,110px) 0}
.nr-vozes h2{font-family:var(--fonte-t);font-weight:${it\u00E1lico ? "400" : "700"};${it\u00E1lico ? "font-style:italic;" : ""}font-size:clamp(32px,5vw,64px);margin:0 0 30px;line-height:1}
.nr-vozes-lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.nr-vozes-v{margin:0;padding:32px;border-radius:var(--raio);border:1px solid var(--linha);
  background:linear-gradient(160deg,rgba(255,255,255,.08),rgba(255,255,255,.02));-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
.nr-vozes-v blockquote{margin:12px 0 16px;font-size:20px;line-height:1.45;color:#fff${familia ? "" : ""}}
.nr-vozes-v figcaption{color:var(--mudo);font-size:14px}
.nr-nota{display:inline-flex;gap:12px;align-items:center;padding:12px 20px;border-radius:999px;font-size:14px;margin-top:18px}
.nr-nota b{font-size:18px;color:#fff}.nr-nota span:last-child{color:var(--mudo)}
`;
var cssExtrasCinema = (escuro = true, serifa = true) => `
.sx{background:transparent;color:var(--fg);position:relative}
.sx-alt{background:${escuro ? "rgba(255,255,255,.025)" : "rgba(0,0,0,.025)"}}
.sx-pre{color:var(--c2c);letter-spacing:.22em;font-weight:600;font-size:12px}
.sx-cab h2{font-family:var(--fonte-t);${serifa ? "font-weight:400;font-style:italic;font-size:clamp(34px,5vw,64px);line-height:1" : ""}}
.sx-cab p:not(.sx-pre){color:var(--mudo)}
.sx-grade li,.sx-lista details{background:${escuro ? "linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.03))" : "rgba(255,255,255,.7)"};
  border:1px solid var(--linha);border-radius:var(--raio);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);
  transition:transform .4s var(--ease),border-color .3s}
.sx-grade li:hover{transform:translateY(-6px);border-color:color-mix(in srgb,var(--c2) 55%,transparent)}
.sx-ic{background:color-mix(in srgb,var(--c2) 16%,transparent);color:var(--c2c)}
.sx-grade h3,.sx-passos h3{font-family:var(--fonte-t);font-weight:${serifa ? "400" : "700"};color:inherit}
.sx-grade p,.sx-passos p,.sx-lista details>div{color:var(--mudo)}
.sx-passos li::before{background:linear-gradient(135deg,var(--c1c),var(--c2));color:#0b0c10}
.sx-lista summary{color:inherit}.sx-lista summary::after{color:var(--c2c)}
.sx-cta{background:transparent}
.sx-cta-in{background:linear-gradient(135deg,color-mix(in srgb,var(--c1) 70%,#000),color-mix(in srgb,var(--c2) 55%,#000));color:#fff;border:1px solid rgba(255,255,255,.18);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.3),0 40px 80px -40px rgba(0,0,0,.7)}
.sx-cta-in h2{font-family:var(--fonte-t);${serifa ? "font-weight:400;font-style:italic" : ""};color:#fff}
.sx-btn-1{background:#fff;color:#0b0c10}.sx-btn-2{color:#fff;border-color:rgba(255,255,255,.55)}
`;
var galeriaQueSobrou = (d, corpo) => {
  const faltam = fotos(d).filter((src) => !corpo.includes(src));
  if (!faltam.length) return "";
  return `<section class="cn-gal"><div class="wrap"><div class="cn-gal-g">${faltam.map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} \u2014 foto ${i + 1}" loading="lazy"></figure>`).join("")}</div></div></section>`;
};
var cssGaleriaQueSobrou = `
.cn-gal{padding:clamp(40px,6vw,80px) 0}
.cn-gal-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.cn-gal figure{margin:0;aspect-ratio:4/3;border-radius:var(--raio,24px);overflow:hidden;border:1px solid var(--linha,rgba(0,0,0,.1))}
.cn-gal img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease,ease)}.cn-gal figure:hover img{transform:scale(1.05)}
`;
var documentoCinema = (d, par, css, corpo, escuro = true, serifa = true) => {
  const rodapeAt = corpo.lastIndexOf("<footer");
  const extra = galeriaQueSobrou(d, corpo);
  const miolo = extra && rodapeAt >= 0 ? `${corpo.slice(0, rodapeAt)}${extra}
${corpo.slice(rodapeAt)}` : corpo;
  return documentoPremium(
    d,
    par,
    `${css}${cssComum(d)}${cssGaleriaQueSobrou}${cssExtrasCinema(escuro, serifa)}`,
    `<div id="topo"></div>${miolo}${fim(d, "")}`,
    { escuro, semRevelacao: true }
  );
};
var miniaturaCinema = (estilo, forma) => ({ corPrimaria, corDestaque }) => {
  const fundo = estilo === "claro" ? "#f6f3ee" : "#07080c";
  const tinta = estilo === "claro" ? "#14161a" : "#ffffff";
  const miolo = {
    her\u00F3i: `<rect x="14" y="34" width="86" height="9" rx="4" fill="${tinta}" opacity=".95"/><rect x="14" y="48" width="58" height="9" rx="4" fill="${tinta}" opacity=".7"/>
        <rect x="14" y="68" width="34" height="11" rx="5.5" fill="${corDestaque}"/><rect x="104" y="30" width="44" height="50" rx="8" fill="${corPrimaria}" opacity=".55"/>`,
    bento: `<rect x="12" y="30" width="62" height="38" rx="7" fill="${corPrimaria}" opacity=".7"/><rect x="78" y="30" width="32" height="18" rx="5" fill="${tinta}" opacity=".22"/>
        <rect x="114" y="30" width="34" height="38" rx="7" fill="${corDestaque}" opacity=".8"/><rect x="78" y="52" width="32" height="16" rx="5" fill="${tinta}" opacity=".14"/>
        <rect x="12" y="72" width="50" height="14" rx="5" fill="${tinta}" opacity=".16"/><rect x="66" y="72" width="82" height="14" rx="5" fill="${tinta}" opacity=".24"/>`,
    colunas: `<rect x="12" y="32" width="40" height="52" rx="6" fill="${tinta}" opacity=".16"/><rect x="60" y="32" width="40" height="52" rx="6" fill="${corPrimaria}" opacity=".6"/>
        <rect x="108" y="32" width="40" height="52" rx="6" fill="${tinta}" opacity=".16"/><rect x="12" y="90" width="136" height="6" rx="3" fill="${corDestaque}" opacity=".8"/>`,
    orbita: `<ellipse cx="80" cy="62" rx="60" ry="22" fill="none" stroke="${tinta}" opacity=".3"/><circle cx="80" cy="46" r="12" fill="${corDestaque}"/>
        <circle cx="34" cy="64" r="8" fill="${corPrimaria}" opacity=".8"/><circle cx="126" cy="64" r="8" fill="${corPrimaria}" opacity=".8"/>`,
    camadas: `<rect x="14" y="24" width="132" height="22" rx="4" fill="${tinta}" opacity=".12"/><rect x="34" y="44" width="92" height="46" rx="8" fill="${corPrimaria}" opacity=".7"/>
        <rect x="46" y="98" width="68" height="6" rx="3" fill="${corDestaque}"/>`
  }[forma];
  return `<svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg"><rect width="160" height="110" fill="${fundo}"/>
      <rect x="22" y="7" width="116" height="13" rx="6.5" fill="${tinta}" opacity=".14"/>${miolo}</svg>`;
};

// src/templates/sites/cinema-1.ts
var pad2 = (n) => String(n).padStart(2, "0");
var noir = {
  id: "noir",
  nome: "Noir Vidro",
  descricao: "Escuro e luxuoso: t\xEDtulo em serifa it\xE1lica, vidro l\xEDquido e revela\xE7\xF5es suaves. Para quem vende confian\xE7a e sofistica\xE7\xE3o.",
  nichos: ["Est\xE9tica", "Cl\xEDnicas", "Advocacia", "Joalherias", "Imobili\xE1rias", "Arquitetura", "Odontologia premium"],
  miniatura: miniaturaCinema("escuro", "her\xF3i"),
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Atendimento de verdade, com cuidado em cada detalhe.", "Do primeiro contato ao resultado, cada etapa \xE9 pensada para voc\xEA se sentir bem atendido e voltar sempre.");
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1) || capa;
    const nums = numerosReais(d);
    const fotosGal = imagens(d).slice(1);
    const h1 = titulo(d, `${d.categoria || "Excel\xEAncia"}${d.cidade ? ` em ${d.cidade}` : ""}, do jeito que deveria ser`);
    return documentoCinema(d, PARES.instrument, `
${cssBaseEscura(d, "#06070b")}
${cssNavVidro("nv")}
${cssRodapeEscuro("rd")}
.nr-hero{position:relative;min-height:100svh;display:grid;align-items:end;padding:150px 0 clamp(48px,7vw,84px);overflow:hidden;isolation:isolate}
.nr-bg{position:absolute;inset:-4%;z-index:-3}
.nr-bg.tem-foto{animation:kb 24s ease-in-out infinite alternate}
.nr-hero::before{content:"";position:absolute;inset:0;z-index:-2;background:linear-gradient(180deg,rgba(6,7,11,.55) 0%,rgba(6,7,11,.2) 38%,rgba(6,7,11,.92) 100%),radial-gradient(70% 60% at 20% 100%,rgba(6,7,11,.75),transparent)}
.nr-hero::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.09;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
.nr-etq{display:inline-flex;align-items:center;gap:10px;padding:9px 18px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;border-radius:999px;color:#fff}
.nr-etq i{width:7px;height:7px;border-radius:50%;background:var(--c2);box-shadow:0 0 14px var(--c2)}
.nr-h1{font-family:var(--fonte-t);font-style:italic;font-weight:400;font-size:clamp(46px,8.6vw,132px);line-height:.94;letter-spacing:-.035em;word-spacing:.12em;margin:26px 0 24px;max-width:15ch;text-wrap:balance}
.nr-sub{font-size:clamp(17px,1.6vw,21px);line-height:1.6;color:rgba(255,255,255,.78);max-width:52ch;margin:0 0 34px}
.nr-btns{display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.nr-nota{margin-top:clamp(36px,6vw,64px);display:inline-flex;gap:14px;align-items:center;padding:14px 22px;border-radius:999px}
.nr-nota .estrelas{font-size:15px}.nr-nota b{font-size:20px;color:#fff}.nr-nota span:last-child{color:var(--mudo);font-size:14px}
.nr-rolar{position:absolute;right:5vw;bottom:44px;width:1px;height:90px;background:linear-gradient(var(--c2),transparent);animation:sobe 2s var(--ease) 1.2s both}
.sec{padding:clamp(72px,10vw,150px) 0;position:relative}
.rot{font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--c2c);margin:0 0 18px;display:flex;gap:12px;align-items:center}
.rot::before{content:"";width:34px;height:1px;background:var(--c2c)}
.nr-sobre .wrap{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(36px,6vw,96px);align-items:center}
.nr-sobre h2{font-family:var(--fonte-t);font-style:italic;font-weight:400;font-size:clamp(34px,5vw,72px);line-height:1;margin:0 0 26px}
.nr-sobre p{color:var(--mudo);font-size:clamp(16px,1.4vw,19px);line-height:1.75;max-width:54ch}
.nr-foto{position:relative;aspect-ratio:4/5;overflow:hidden;border-radius:calc(var(--raio) + 8px);padding:10px}
.nr-foto>div{position:absolute;inset:10px;border-radius:calc(var(--raio) - 2px);overflow:hidden}
.nr-foto .par{position:absolute;inset:-8%;background-size:cover;background-position:center}
.nr-serv h2{font-family:var(--fonte-t);font-style:italic;font-weight:400;font-size:clamp(34px,5vw,72px);line-height:1;margin:0 0 clamp(30px,4vw,56px);max-width:16ch}
.nr-grade{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.nr-card{padding:34px 30px 38px;min-height:260px;display:flex;flex-direction:column;transition:transform .5s var(--ease),border-color .4s}
.nr-card:hover{transform:translateY(-8px);border-color:color-mix(in srgb,var(--c2) 60%,#fff 10%)}
.nr-card::after{content:"";position:absolute;inset:-1px;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .5s;
  background:radial-gradient(60% 60% at 50% 0%,color-mix(in srgb,var(--c2) 38%,transparent),transparent 70%)}
.nr-card:hover::after{opacity:1}
.nr-n{font-family:var(--fonte-t);font-style:italic;font-size:46px;line-height:1;color:var(--c2c);opacity:.9}
.nr-card h3{font-family:var(--fonte-t);font-weight:400;font-size:clamp(25px,2.3vw,32px);margin:auto 0 10px;line-height:1.05}
.nr-card p{color:var(--mudo);margin:0;font-size:15.5px;line-height:1.65}
.nr-faixa{padding:26px 0;border-block:1px solid var(--linha);font-family:var(--fonte-t);font-style:italic;font-size:clamp(34px,5vw,64px);color:rgba(255,255,255,.9)}
.nr-faixa i{color:var(--c2);font-style:normal;font-size:.5em}
.nr-num .vidro{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));padding:clamp(32px,5vw,56px)}
.nr-ct{padding:8px 30px;border-left:1px solid var(--linha)}.nr-ct:first-child{border-left:0}
.nr-ct b{display:block;font-family:var(--fonte-t);font-style:italic;font-weight:400;font-size:clamp(56px,7vw,96px);line-height:1;background:linear-gradient(135deg,#fff,var(--c2c));-webkit-background-clip:text;background-clip:text;color:transparent}
.nr-ct span{color:var(--mudo);font-size:14px;letter-spacing:.06em}
.nr-gal{overflow:hidden;padding:0 0 clamp(60px,8vw,120px)}
.nr-gal .marq-t{gap:18px}
.nr-gal figure{margin:0;flex:none;width:clamp(240px,28vw,420px);aspect-ratio:4/5;border-radius:var(--raio);overflow:hidden;border:1px solid var(--linha)}
.nr-gal figure:nth-child(even){margin-top:46px}
.nr-gal img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}.nr-gal figure:hover img{transform:scale(1.08)}
.nr-vozes h2{font-family:var(--fonte-t);font-style:italic;font-weight:400;font-size:clamp(34px,5vw,64px);margin:0 0 36px}
.nr-vozes-lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px}
.nr-vozes-v{margin:0;padding:34px 30px;border-radius:var(--raio);background:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.025));border:1px solid var(--linha);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}
.nr-vozes-v blockquote{margin:14px 0 18px;font-family:var(--fonte-t);font-style:italic;font-size:22px;line-height:1.35;color:#fff}
.nr-vozes-v figcaption{color:var(--mudo);font-size:14px}
.nr-cta{padding:clamp(50px,8vw,120px) 0}
.nr-cta-in{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(30px,5vw,70px);align-items:center;padding:clamp(34px,6vw,76px);border-radius:calc(var(--raio) + 10px);overflow:hidden}
.nr-cta-in h2{font-family:var(--fonte-t);font-style:italic;font-weight:400;font-size:clamp(38px,6vw,84px);line-height:.98;margin:0 0 20px}
.nr-cta-in>div:first-child p{color:var(--mudo);max-width:42ch;font-size:18px}
.nr-info p{display:flex;gap:14px;align-items:flex-start;margin:0 0 14px;color:#e9ebf0}.nr-info svg{flex:none;margin-top:3px;color:var(--c2c)}
.nr-info a:hover{color:var(--c2c)}
.nr-acoes{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
@media(max-width:900px){
  .nr-sobre .wrap,.nr-cta-in{grid-template-columns:1fr}.nr-grade{grid-template-columns:1fr}.nr-foto{aspect-ratio:4/3}
  .nr-ct{border-left:0;border-top:1px solid var(--linha);padding:22px 8px}.nr-ct:first-child{border-top:0}
  .nr-rolar{display:none}
}
`, `
${nav(d, [["#sobre", "Sobre"], ["#servicos", "Servi\xE7os"], ["#contato", "Contato"]])}
<section class="nr-hero">
  <div class="${classeImagem(capa, "nr-bg")}" style="${fundoImagem(capa, 0)}"></div>
  <div class="wrap">
    <span class="nr-etq vidro entra"><i></i>${esc(eyebrow(d) || d.empresa)}</span>
    <h1 class="nr-h1">${palavras(h1, 1)}</h1>
    <p class="nr-sub entra" style="--d:5">${capaTxt}</p>
    <div class="nr-btns entra" style="--d:6">${ctaPrincipal(d, "Falar no WhatsApp", "bt-cheio")}<a class="vidro-bt" href="#servicos">Conhecer os servi\xE7os${ICONES.seta}</a></div>
    ${seloGoogle(d, "nr-nota vidro entra")}
  </div>
  <span class="nr-rolar" aria-hidden="true"></span>
</section>
<section class="sec nr-sobre" id="sobre"><div class="wrap">
  <div class="rev-l"><p class="rot">Quem somos</p><h2>${esc(d.empresa)}</h2><p>${sobreTxt}</p></div>
  <div class="nr-foto vidro rev-r"><div><div class="${classeImagem(foto2, "par")}" style="${fundoImagem(foto2, 1)}"></div></div></div>
</div></section>
${servicos.length ? `<section class="sec nr-serv" id="servicos"><div class="wrap"><p class="rot rev">O que fazemos</p><h2 class="rev">Cuidado em cada servi\xE7o</h2>
  <div class="nr-grade">${servicos.map((s, i) => `<article class="nr-card vidro rev" style="--r:${i}"><span class="nr-n">${pad2(i + 1)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ""}</article>`).join("")}</div></div></section>
${faixa(servicos.map((s) => s.titulo), "marq nr-faixa")}` : ""}
${nums.length >= 2 ? `<section class="sec nr-num"><div class="wrap"><div class="vidro rev">${nums.map((n) => n.valor !== void 0 ? contador(n.valor, n.rotulo, "nr-ct") : `<div class="nr-ct"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join("")}</div></div></section>` : ""}
${fotosGal.length >= 2 ? `<section class="nr-gal"><div class="marq"><div class="marq-t">${[0, 1, 2].map(() => fotosGal.map((src, i) => `<figure><img src="${src}" alt="${esc(d.empresa)} \u2014 foto ${i + 1}" loading="lazy"></figure>`).join("")).join("")}</div></div></section>` : ""}
${vozes(d, "nr-vozes")}
<section class="nr-cta" id="contato"><div class="wrap"><div class="nr-cta-in vidro rev">
  <div><p class="rot">Contato</p><h2>${palavras("Vamos conversar?", 0)}</h2><p>Chame agora e receba atendimento direto, sem rob\xF4 e sem complica\xE7\xE3o.</p>
    <div class="nr-acoes">${ctaPrincipal(d, "Chamar no WhatsApp", "bt-cheio")}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div></div>
  <div class="nr-info">${contatoLinhas2(d, "nr-lin")}</div>
</div></div></section>
${rodape2(d, "rd")}
`);
  }
};
var LAYOUTS_CINEMA_1 = [noir];

// src/templates/sites/cinema-2.ts
var pad22 = (n) => String(n).padStart(2, "0");
var portfolio = {
  id: "portfolio",
  nome: "Portf\xF3lio Bento",
  descricao: "Contador de carregamento, nome gigante, grade bento e galeria que se move com a rolagem. Para est\xFAdios e marcas com identidade.",
  nichos: ["Barbearias", "Est\xFAdios", "Tatuagem", "Fotografia", "Design", "Academias", "Moda"],
  miniatura: miniaturaCinema("escuro", "bento"),
  render: (d) => {
    const [capaTxt] = partirSobre(d, "Trabalho autoral, feito com cuidado e entregue com orgulho.", "");
    const servicos = servicosValidos(d);
    const fotosD = imagens(d);
    const capa = fotoDe(d, 0);
    const nums = numerosReais(d);
    const spans = [7, 5, 5, 7, 4, 4, 4];
    const gigante = [0, 1, 2, 3].map(() => '<span class="pf-gigante">Vamos conversar</span><i class="pf-gigante" aria-hidden="true">\u2726</i>').join("");
    return documentoCinema(d, PARES.syne, `
${cssBaseEscura(d, "#050506")}
${cssNavVidro("nv")}
${cssRodapeEscuro("rd")}
.pf-carga{position:fixed;inset:0;z-index:200;background:#050506;display:grid;place-items:center;pointer-events:none;animation:carga-sai .7s ease 2.35s both}
@keyframes carga-sai{to{opacity:0;visibility:hidden}}
.pf-carga-in{text-align:center}
.pf-n{--n:100;counter-reset:h calc(round(down,var(--n)/100,1)) t calc(round(down,mod(var(--n),100)/10,1)) u calc(mod(var(--n),10));
  font-family:var(--fonte-t);font-weight:800;font-size:clamp(90px,22vw,260px);line-height:.9;letter-spacing:-.04em;font-variant-numeric:tabular-nums;
  background:linear-gradient(135deg,var(--c1c),var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent;
  animation:conta 2.2s cubic-bezier(.65,0,.25,1) both}
.pf-n::after{content:counter(h) counter(t) counter(u)}
.pf-carga p{margin:18px 0 0;letter-spacing:.3em;font-size:12px;text-transform:uppercase;color:var(--mudo)}
.pf-hero{position:relative;min-height:100svh;padding:140px 0 60px;display:grid;align-content:end;overflow:hidden;isolation:isolate}
.pf-hero .pal{animation-delay:calc(var(--i,0) * 70ms + 2.55s)}.pf-hero .entra{animation-delay:calc(var(--d,0) * 120ms + 2.9s)}
.pf-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(60% 55% at 85% 20%,color-mix(in srgb,var(--c1) 55%,transparent),transparent 70%),radial-gradient(50% 50% at 5% 100%,color-mix(in srgb,var(--c2) 40%,transparent),transparent 70%)}
.pf-topo{display:grid;grid-template-columns:1.5fr 1fr;gap:clamp(24px,4vw,64px);align-items:end}
.pf-h1{font-family:var(--fonte-t);font-weight:800;font-size:clamp(44px,9.6vw,150px);line-height:.9;letter-spacing:-.045em;text-transform:uppercase;margin:0;overflow-wrap:break-word}
.pf-h1.m{font-size:clamp(38px,7vw,112px)}.pf-h1.g{font-size:clamp(34px,5.6vw,88px)}
.pf-h1 .pal{display:inline-block;background:linear-gradient(100deg,#fff 10%,var(--c1c) 60%,var(--c2) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:.06em}
.pf-lado{display:grid;gap:22px;align-content:end}
.pf-lado p{margin:0;color:var(--mudo);font-size:clamp(16px,1.4vw,19px);line-height:1.65}
.pf-moldura{position:relative;aspect-ratio:5/4;border-radius:calc(var(--raio) + 6px);overflow:hidden;border:1px solid var(--linha)}
.pf-moldura>div:first-child{position:absolute;inset:0}
.pf-moldura .vidro{position:absolute;left:14px;bottom:14px;padding:10px 16px;border-radius:999px;display:flex;gap:10px;align-items:center;font-size:14px}
.pf-btns{display:flex;flex-wrap:wrap;gap:12px}
.pf-faixa{margin-top:clamp(36px,6vw,70px);padding:20px 0;border-block:1px solid var(--linha);font-family:var(--fonte-t);font-weight:800;font-size:clamp(22px,3vw,40px);text-transform:uppercase;letter-spacing:-.02em;color:rgba(255,255,255,.88)}
.pf-faixa i{color:var(--c2);font-style:normal}
.sec{padding:clamp(64px,9vw,130px) 0}
.pf-cab{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-bottom:clamp(26px,4vw,50px);flex-wrap:wrap}
.pf-cab h2{font-family:var(--fonte-t);font-weight:800;font-size:clamp(34px,6vw,84px);line-height:.95;letter-spacing:-.04em;text-transform:uppercase;margin:0}
.pf-cab p{margin:0;color:var(--mudo);max-width:34ch}
.pf-bento{display:grid;grid-template-columns:repeat(12,1fr);gap:14px;grid-auto-rows:minmax(300px,auto)}
.pf-t{position:relative;border-radius:var(--raio);overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:26px;isolation:isolate;border:1px solid var(--linha);min-height:300px;transition:transform .6s var(--ease)}
.pf-t:hover{transform:translateY(-6px)}
.pf-t .fundo{position:absolute;inset:0;z-index:-2;transition:transform 1.4s var(--ease)}
.pf-t:hover .fundo{transform:scale(1.07)}
.pf-t::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,transparent 30%,rgba(5,5,6,.85))}
.pf-t .num{position:absolute;top:22px;left:26px;font-family:var(--fonte-t);font-weight:800;font-size:15px;letter-spacing:.14em;color:#fff;opacity:.8}
.pf-t h3{font-family:var(--fonte-t);font-weight:800;font-size:clamp(24px,2.6vw,38px);letter-spacing:-.03em;text-transform:uppercase;line-height:1;margin:0 0 8px}
.pf-t p{margin:0;color:rgba(255,255,255,.78);font-size:15px;max-width:44ch}
.pf-t .seta{position:absolute;top:18px;right:18px;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;transition:transform .5s var(--ease)}
.pf-t:hover .seta{transform:rotate(-45deg) scale(1.08)}
.pf-ex{height:240vh;position:relative}
.pf-palco{position:sticky;top:0;height:100svh;overflow:hidden;display:grid;align-content:end;gap:16px;padding-bottom:5vh}
.pf-palco h2{position:absolute;z-index:2;left:5vw;top:12vh;font-family:var(--fonte-t);font-weight:800;font-size:clamp(34px,6vw,84px);line-height:.95;letter-spacing:-.04em;text-transform:uppercase;margin:0;color:#fff;text-shadow:0 8px 40px rgba(0,0,0,.6)}
.pf-fila{display:flex;gap:16px;width:max-content;padding-left:8vw}
.pf-fila figure{margin:0;flex:none;width:clamp(240px,27vw,400px);aspect-ratio:16/11;border-radius:var(--raio);overflow:hidden;border:1px solid var(--linha)}
.pf-fila figure>div{width:100%;height:100%}
.pf-fila.b{padding-left:0;margin-left:-14vw}
@keyframes desliza{from{transform:translateX(0)}to{transform:translateX(-34%)}}
@keyframes desliza-r{from{transform:translateX(-34%)}to{transform:translateX(0)}}
@supports (animation-timeline:view()){
  .pf-ex{view-timeline-name:--pfex;view-timeline-axis:block}
  .pf-fila.a{animation:desliza linear both;animation-timeline:--pfex;animation-range:cover 10% cover 90%}
  .pf-fila.b{animation:desliza-r linear both;animation-timeline:--pfex;animation-range:cover 10% cover 90%}
}
.pf-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
.pf-ct{padding:34px 30px;border-radius:var(--raio);border:1px solid var(--linha);background:rgba(255,255,255,.03)}
.pf-ct b{display:block;font-family:var(--fonte-t);font-weight:800;font-size:clamp(54px,7vw,100px);letter-spacing:-.05em;line-height:1;
  background:linear-gradient(135deg,var(--c1c),var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent}
.pf-ct span{color:var(--mudo);font-size:14px}
.pf-fim{padding:clamp(56px,8vw,110px) 0 0;overflow:hidden}
.pf-fim .marq-t{gap:46px}
.pf-gigante{font-family:var(--fonte-t);font-weight:800;font-size:clamp(70px,16vw,240px);line-height:1;letter-spacing:-.05em;text-transform:uppercase;white-space:nowrap;
  background:linear-gradient(100deg,var(--c1c),var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent}
.pf-ctt{display:grid;grid-template-columns:1fr 1fr;gap:clamp(24px,5vw,80px);padding:clamp(34px,5vw,64px) 0 clamp(50px,7vw,90px)}
.pf-ctt p{display:flex;gap:12px;align-items:flex-start;margin:0 0 12px;color:#e9ebf0}.pf-ctt svg{flex:none;margin-top:3px;color:var(--c2c)}
.pf-ctt-acoes{display:flex;flex-wrap:wrap;gap:12px;align-content:start}
.nr-vozes{padding:clamp(56px,8vw,110px) 0}.nr-vozes h2{font-family:var(--fonte-t);font-weight:800;text-transform:uppercase;font-size:clamp(30px,5vw,64px);margin:0 0 30px}
.nr-vozes-lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
.nr-vozes-v{margin:0;padding:30px;border-radius:var(--raio);border:1px solid var(--linha);background:rgba(255,255,255,.03)}
.nr-vozes-v blockquote{margin:12px 0 16px;font-size:19px;line-height:1.45;color:#fff}.nr-vozes-v figcaption{color:var(--mudo);font-size:14px}
@media(max-width:900px){.pf-topo,.pf-ctt{grid-template-columns:1fr}.pf-bento{grid-template-columns:1fr}.pf-t{grid-column:auto!important}.pf-ex{height:auto}.pf-palco{position:relative;height:auto;padding:60px 0}.pf-palco h2{position:static;padding:0 5vw 20px}.pf-fila.b{margin-left:0}}
@media(max-width:900px){.pf-palco h2,.pf-cab h2,.pf-t h3{font-size:clamp(24px,7.2vw,40px);overflow-wrap:anywhere}}
@media(prefers-reduced-motion:reduce){.pf-carga{display:none}}
`, `
<div class="pf-carga" aria-hidden="true"><div class="pf-carga-in"><div class="pf-n"></div><p>${esc(d.empresa)}</p></div></div>
${nav(d, [["#trabalhos", "Servi\xE7os"], ["#explore", "Galeria"], ["#contato", "Contato"]])}
<section class="pf-hero"><div class="wrap">
  <div class="pf-topo">
    <h1 class="pf-h1 ${d.empresa.length > 20 ? "g" : d.empresa.length > 12 ? "m" : ""}">${palavras(d.empresa, 1)}</h1>
    <div class="pf-lado">
      <p class="entra" style="--d:2">${esc(titulo(d, d.categoria || ""))}</p>
      <div class="pf-moldura entra" style="--d:3"><div class="${classeImagem(capa, "kb")}" style="${fundoImagem(capa, 2)}"></div>${seloGoogle(d, "vidro")}</div>
      <div class="pf-btns entra" style="--d:4">${ctaPrincipal(d, "Falar no WhatsApp", "bt-cheio")}<a class="vidro-bt" href="#trabalhos">Ver servi\xE7os${ICONES.seta}</a></div>
    </div>
  </div>
  ${faixa([d.categoria || d.empresa, ...servicos.map((s) => s.titulo), d.cidade || ""], "marq pf-faixa")}
</div></section>
${servicos.length ? `<section class="sec" id="trabalhos"><div class="wrap">
  <div class="pf-cab rev"><h2>O que a gente faz</h2><p>${capaTxt}</p></div>
  <div class="pf-bento">${servicos.map((s, i) => {
      const f = fotoDe(d, i + 1);
      return `<article class="pf-t rev" style="grid-column:span ${spans[i % spans.length]}">
    <div class="${classeImagem(f, "fundo")}" style="${fundoImagem(f, i % 3)}"></div><span class="num">${pad22(i + 1)}</span><span class="seta vidro">${ICONES.seta}</span>
    <h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ""}</article>`;
    }).join("")}</div></div></section>` : ""}
${fotosD.length >= 3 ? `<section class="pf-ex" id="explore"><div class="pf-palco"><h2>Explore<br>o nosso mundo</h2>
  <div class="pf-fila a">${[...fotosD, ...fotosD].map((src) => `<figure><div class="tem-foto" style="background-image:url('${src}')"></div></figure>`).join("")}</div>
  <div class="pf-fila b">${[...fotosD].reverse().concat([...fotosD].reverse()).map((src) => `<figure><div class="tem-foto" style="background-image:url('${src}')"></div></figure>`).join("")}</div>
</div></section>` : ""}
${nums.length >= 2 ? `<section class="sec"><div class="wrap"><div class="pf-num">${nums.map((n) => n.valor !== void 0 ? contador(n.valor, n.rotulo, "pf-ct") : `<div class="pf-ct"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join("")}</div></div></section>` : ""}
${vozes(d, "nr-vozes")}
<section class="pf-fim" id="contato">
  <div class="marq"><div class="marq-t">${gigante}</div></div>
  <div class="wrap pf-ctt"><div>${contatoLinhas2(d, "pf-lin")}</div><div class="pf-ctt-acoes">${ctaPrincipal(d, "Chamar no WhatsApp", "bt-cheio")}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div></div>
</section>
${rodape2(d, "rd")}
`);
  }
};
var editorial = {
  id: "editorial",
  nome: "Editorial Cruzado",
  descricao: "Capa em tela cheia com fotos que se cruzam, texto de revista e se\xE7\xF5es About, Destaque, Filosofia e Servi\xE7os. Para marcas que contam hist\xF3ria.",
  nichos: ["Restaurantes", "Cafeterias", "Padarias premium", "Hot\xE9is", "Vin\xEDcolas", "Floriculturas", "Eventos"],
  miniatura: miniaturaCinema("escuro", "colunas"),
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Um lugar para quem aprecia o que \xE9 bem feito.", "Cada detalhe \xE9 pensado para que a sua experi\xEAncia seja inesquec\xEDvel, do primeiro ao \xFAltimo momento.");
    const servicos = servicosValidos(d);
    const lista = imagens(d);
    const camadas = lista.length >= 2 ? lista.slice(0, 3).map((src) => `<div class="cf tem-foto" style="background-image:url('${src}')"></div>`).join("") : lista.length === 1 ? `<div class="cf tem-foto" style="background-image:url('${lista[0]}')"></div>` : [0, 1, 2].map((i) => `<div class="cf cena" style="--cena:${i}"></div>`).join("");
    const destaque = fotoDe(d, 1), terceira = fotoDe(d, 2);
    const nums = numerosReais(d);
    const fil = frases(d.sobre);
    const manifesto = (fil.length >= 3 ? fil.slice(1) : [`${d.categoria || "Nosso trabalho"} feito com verdade.`, "Atendimento de perto, sem pressa e sem improviso.", `${d.empresa}${d.cidade ? `, em ${d.cidade}` : ""}.`]).slice(0, 3);
    const depo = (d.depoimentos || []).find((x) => x.texto?.trim());
    const h1 = titulo(d, d.empresa);
    return documentoCinema(d, PARES.instrument, `
${cssBaseEscura(d, "#0a0806")}
${cssNavVidro("nv")}
${cssRodapeEscuro("rd")}
.ed-hero{position:relative;min-height:100svh;display:grid;place-items:center;text-align:center;padding:150px 0 100px;overflow:hidden;isolation:isolate}
.ed-fundo{position:absolute;inset:0;z-index:-2}
.ed-fundo>div{position:absolute;inset:-3%;background-size:cover;background-position:center}
.ed-fundo>.cf{animation:cf 21s ease-in-out infinite,kb 21s ease-in-out infinite alternate}
.ed-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(80% 60% at 50% 45%,rgba(10,8,6,.15),rgba(10,8,6,.75)),linear-gradient(180deg,rgba(10,8,6,.5),transparent 30%,rgba(10,8,6,.9))}
.ed-pre{font-size:13px;letter-spacing:.32em;text-transform:uppercase;color:rgba(255,255,255,.8);margin:0 0 26px}
.ed-h1{font-family:var(--fonte-t);font-weight:400;font-size:clamp(52px,10vw,160px);line-height:.92;letter-spacing:-.04em;margin:0 auto 28px;max-width:14ch;word-spacing:.1em;text-wrap:balance}
.ed-sub{max-width:52ch;margin:0 auto 38px;font-size:clamp(17px,1.5vw,20px);color:rgba(255,255,255,.8);line-height:1.65}
.ed-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.ed-pontos{position:absolute;bottom:34px;left:50%;transform:translateX(-50%);display:flex;gap:10px}
.ed-pontos i{width:34px;height:2px;background:rgba(255,255,255,.3);overflow:hidden;position:relative;border-radius:2px}
.ed-pontos i::after{content:"";position:absolute;inset:0;background:#fff;transform:scaleX(0);transform-origin:left;animation:ponto 21s linear infinite}
.ed-pontos i:nth-child(2)::after{animation-delay:7s}.ed-pontos i:nth-child(3)::after{animation-delay:14s}
@keyframes ponto{0%{transform:scaleX(0)}33%{transform:scaleX(1)}33.1%,100%{transform:scaleX(0)}}
.sec{padding:clamp(80px,11vw,170px) 0}
.rot{font-size:12px;letter-spacing:.26em;text-transform:uppercase;color:var(--c2c);margin:0 0 20px}
.ed-sobre .wrap{display:grid;grid-template-columns:.8fr 1.2fr;gap:clamp(30px,6vw,100px);align-items:start}
.ed-sobre h2{font-family:var(--fonte-t);font-weight:400;font-size:clamp(40px,6vw,92px);line-height:.95;margin:0}
.ed-sobre p:not(.rot){font-size:clamp(19px,2vw,28px);line-height:1.5;color:rgba(255,255,255,.82);margin:0 0 24px;font-family:var(--fonte-t)}
.ed-nota{margin-top:10px;display:inline-flex;gap:12px;align-items:center;padding:12px 20px;border-radius:999px;font-size:14px}
.ed-nota b{font-size:18px;color:#fff}.ed-nota span:last-child{color:var(--mudo)}
.ed-destaque{position:relative;min-height:90svh;display:grid;align-items:end;overflow:hidden;isolation:isolate}
.ed-destaque .par{position:absolute;inset:-10% 0;z-index:-2;background-size:cover;background-position:center}
.ed-destaque::before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(10,8,6,.5),rgba(10,8,6,.2) 40%,rgba(10,8,6,.92))}
.ed-destaque .wrap{padding:90px 0 clamp(40px,6vw,80px);display:grid;grid-template-columns:1.4fr 1fr;gap:40px;align-items:end}
.ed-destaque blockquote{margin:0;font-family:var(--fonte-t);font-size:clamp(30px,4.6vw,66px);line-height:1.02;letter-spacing:-.02em}
.ed-destaque cite{display:block;margin-top:18px;font:500 14px var(--fonte-c);letter-spacing:.14em;text-transform:uppercase;color:var(--mudo)}
.ed-stats{display:grid;gap:14px}
.ed-st{padding:20px 24px;border-radius:20px}
.ed-st b{display:block;font-family:var(--fonte-t);font-size:46px;line-height:1;font-weight:400}.ed-st span{color:var(--mudo);font-size:14px}
.ed-filo{text-align:center}
.ed-filo-l{font-family:var(--fonte-t);font-size:clamp(34px,6.4vw,98px);line-height:1.02;letter-spacing:-.03em;margin:0 auto 14px;max-width:18ch;text-wrap:balance}
.ed-filo-l:nth-of-type(even){font-style:italic;color:var(--c2c)}
.ed-filo .vidro-bt{margin-top:40px}
.ed-serv h2{font-family:var(--fonte-t);font-weight:400;font-size:clamp(40px,6vw,92px);line-height:.95;margin:0 0 clamp(28px,4vw,56px)}
.ed-lin{display:grid;grid-template-columns:90px 1fr 1.1fr 40px;gap:24px;align-items:center;padding:30px 4px;border-top:1px solid var(--linha);transition:padding .5s var(--ease),background .4s}
.ed-lin:last-child{border-bottom:1px solid var(--linha)}
.ed-lin:hover{padding-left:20px;background:linear-gradient(90deg,color-mix(in srgb,var(--c2) 10%,transparent),transparent)}
.ed-lin .n{font-family:var(--fonte-t);font-size:30px;color:var(--c2c)}
.ed-lin h3{font-family:var(--fonte-t);font-weight:400;font-size:clamp(28px,3.4vw,50px);margin:0;line-height:1}
.ed-lin p{margin:0;color:var(--mudo)}
.ed-lin .s{color:var(--c2c);transition:transform .5s var(--ease)}.ed-lin:hover .s{transform:translateX(8px)}
.ed-ctt{padding:clamp(60px,9vw,130px) 0}
.ed-ctt .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(30px,6vw,90px);align-items:center}
.ed-ctt h2{font-family:var(--fonte-t);font-weight:400;font-size:clamp(44px,7vw,110px);line-height:.92;margin:0 0 24px}
.ed-t{color:var(--mudo);font-size:18px;max-width:40ch;margin:0 0 28px}
.ed-info{padding:34px;display:grid;gap:4px}
.ed-info p{display:flex;gap:14px;margin:0 0 12px;color:#ececf1}.ed-info svg{flex:none;margin-top:3px;color:var(--c2c)}
.ed-foto3{margin-top:30px;aspect-ratio:16/9;border-radius:var(--raio);overflow:hidden;border:1px solid var(--linha)}.ed-foto3>div{width:100%;height:100%}
.nr-vozes{padding:clamp(56px,8vw,110px) 0}.nr-vozes h2{font-family:var(--fonte-t);font-weight:400;font-size:clamp(34px,5vw,64px);margin:0 0 30px}
.nr-vozes-lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.nr-vozes-v{margin:0;padding:32px;border-radius:var(--raio);border:1px solid var(--linha);background:rgba(255,255,255,.035)}
.nr-vozes-v blockquote{margin:12px 0 16px;font-family:var(--fonte-t);font-size:22px;line-height:1.35;color:#fff}.nr-vozes-v figcaption{color:var(--mudo);font-size:14px}
@media(max-width:900px){.ed-sobre .wrap,.ed-destaque .wrap,.ed-ctt .wrap{grid-template-columns:1fr}.ed-lin{grid-template-columns:50px 1fr;gap:6px 14px}.ed-lin p{grid-column:2}.ed-lin .s{display:none}}
`, `
${nav(d, [["#historia", "Sobre"], ["#filosofia", "Filosofia"], ["#servicos", "Servi\xE7os"], ["#contato", "Contato"]])}
<section class="ed-hero"><div class="ed-fundo">${camadas}</div>
  <div class="wrap"><p class="ed-pre entra">${esc(eyebrow(d) || "Bem-vindo")}</p>
    <h1 class="ed-h1">${palavras(h1, 1)}</h1>
    <p class="ed-sub entra" style="--d:5">${capaTxt}</p>
    <div class="ed-btns entra" style="--d:6">${ctaPrincipal(d, "Falar no WhatsApp", "bt-cheio")}<a class="vidro-bt" href="#servicos">Ver o que oferecemos${ICONES.seta}</a></div></div>
  ${lista.length >= 2 || !lista.length ? '<div class="ed-pontos" aria-hidden="true"><i></i><i></i><i></i></div>' : ""}
</section>
<section class="sec ed-sobre" id="historia"><div class="wrap">
  <div class="rev-l"><p class="rot">Nossa hist\xF3ria</p><h2>${esc(d.empresa)}</h2></div>
  <div class="rev-r"><p>${sobreTxt}</p>${seloGoogle(d, "ed-nota vidro")}</div>
</div></section>
<section class="ed-destaque"><div class="${classeImagem(destaque, "par")}" style="${fundoImagem(destaque, 1)}"></div>
  <div class="wrap"><div class="rev"><blockquote>${esc(depo?.texto || titulo(d, d.categoria || d.empresa))}</blockquote>
    <cite>${esc(depo?.autor || d.empresa)}</cite></div>
    ${nums.length ? `<div class="ed-stats rev-r">${nums.map((n) => n.valor !== void 0 ? contador(n.valor, n.rotulo, "ed-st vidro") : `<div class="ed-st vidro"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join("")}</div>` : ""}</div></section>
<section class="sec ed-filo" id="filosofia"><div class="wrap"><p class="rot rev">Filosofia</p>
  ${manifesto.map((f) => `<p class="ed-filo-l rev">${esc(f)}</p>`).join("")}
  <a class="vidro-bt rev" href="#contato">Vamos conversar${ICONES.seta}</a></div></section>
${servicos.length ? `<section class="sec ed-serv" id="servicos"><div class="wrap"><h2 class="rev">O que <em style="font-style:italic;color:var(--c2c)">oferecemos</em></h2>
  <div>${servicos.map((s, i) => `<article class="ed-lin rev"><span class="n">${pad22(i + 1)}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p><span class="s">${ICONES.seta}</span></article>`).join("")}</div></div></section>` : ""}
${vozes(d, "nr-vozes")}
<section class="ed-ctt" id="contato"><div class="wrap">
  <div class="rev-l"><p class="rot">Contato</p><h2>${palavras("Venha nos conhecer", 0)}</h2><p class="ed-t">Chame agora e receba atendimento direto.</p>
    <div class="ed-btns" style="justify-content:flex-start">${ctaPrincipal(d, "Chamar no WhatsApp", "bt-cheio")}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div></div>
  <div class="rev-r"><div class="ed-info vidro">${contatoLinhas2(d, "ed-lin2")}</div>${terceira ? `<div class="ed-foto3"><div class="tem-foto" style="background-image:url('${terceira}')"></div></div>` : ""}</div>
</div></section>
${rodape2(d, "rd")}
`);
  }
};
var LAYOUTS_CINEMA_2 = [portfolio, editorial];

// src/templates/sites/cinema-3.ts
var pad23 = (n) => String(n).padStart(2, "0");
var estrelas = (semente, n) => {
  let h = 0;
  for (const c of semente) h = h * 31 + c.charCodeAt(0) >>> 0;
  const rnd = () => {
    h = h * 1664525 + 1013904223 >>> 0;
    return h / 4294967296;
  };
  return Array.from({ length: n }, () => `${Math.round(rnd() * 2400)}px ${Math.round(rnd() * 1600)}px 0 ${rnd() > 0.8 ? 1 : 0}px rgba(255,255,255,${(0.35 + rnd() * 0.65).toFixed(2)})`).join(",");
};
var neon = {
  id: "neon",
  nome: "Neon Espacial",
  descricao: "C\xE9u estrelado, letras condensadas gigantes e luz neon. Para neg\xF3cios com energia: academias, bares, eventos e moda jovem.",
  nichos: ["Academias", "Bares", "Eventos", "Moda", "Barbearias", "Games", "Casas noturnas"],
  miniatura: miniaturaCinema("escuro", "her\xF3i"),
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Energia de verdade, do primeiro ao \xFAltimo minuto.", "Aqui o clima \xE9 bom, o atendimento \xE9 de perto e a gente faz quest\xE3o de voc\xEA voltar.");
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1);
    const fotosGal = imagens(d);
    const nums = numerosReais(d);
    const stars = estrelas(d.empresa, 90);
    return documentoCinema(d, PARES.anton, `
${cssBaseEscura(d, "#03040a")}
${cssNavVidro("nv")}
${cssRodapeEscuro("rd")}
${cssVozesEscuras("Anton")}
:root{--neon:color-mix(in srgb,var(--c2) 78%,#5dffb0);--neon2:color-mix(in srgb,var(--c1) 60%,#b04bff)}
.nx-ceu{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.nx-ceu::before,.nx-ceu::after{content:"";position:absolute;width:2px;height:2px;border-radius:50%;box-shadow:${stars};animation:brilha 6s ease-in-out infinite alternate}
.nx-ceu::after{box-shadow:${estrelas(d.empresa + "b", 60)};animation-duration:9s;animation-delay:-3s;transform:translate(40px,30px)}
@keyframes brilha{from{opacity:.45}to{opacity:1}}
.nx-nebulosa{position:fixed;inset:0;z-index:-2;background:radial-gradient(50% 40% at 80% 10%,color-mix(in srgb,var(--c1) 40%,transparent),transparent 70%),radial-gradient(45% 40% at 10% 85%,color-mix(in srgb,var(--neon) 22%,transparent),transparent 70%)}
.nx-hero{position:relative;min-height:100svh;display:grid;align-content:center;padding:150px 0 90px;overflow:hidden;isolation:isolate}
.nx-foto{position:absolute;inset:0;z-index:-1;background-size:cover;background-position:center;opacity:.34;-webkit-mask-image:linear-gradient(180deg,#000 40%,transparent);mask-image:linear-gradient(180deg,#000 40%,transparent)}
.nx-ola{font-family:"Condiment",cursive;font-size:clamp(26px,3.4vw,46px);color:var(--neon);text-shadow:0 0 22px color-mix(in srgb,var(--neon) 70%,transparent);margin:0 0 4px;transform:rotate(-3deg);display:inline-block}
.nx-h1{font-family:var(--fonte-t);font-weight:400;text-transform:uppercase;font-size:clamp(54px,12.5vw,210px);line-height:.88;letter-spacing:.005em;margin:0 0 26px;word-spacing:.08em}
.nx-h1 .pal{background:linear-gradient(180deg,#fff 20%,color-mix(in srgb,#fff 40%,var(--neon)) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 30px color-mix(in srgb,var(--neon) 35%,transparent))}
.nx-sub{font-size:clamp(17px,1.5vw,20px);color:rgba(255,255,255,.76);max-width:50ch;line-height:1.65;margin:0 0 34px}
.nx-btns{display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.nx-btn{display:inline-flex;align-items:center;gap:12px;padding:17px 34px;border-radius:999px;font-weight:800;font-size:15px;letter-spacing:.06em;text-transform:uppercase;color:#04050a;
  background:var(--neon);box-shadow:0 0 0 0 color-mix(in srgb,var(--neon) 60%,transparent),0 18px 40px -14px var(--neon);animation:pulso 2.8s ease-out infinite;transition:transform .3s var(--ease)}
.nx-btn:hover{transform:translateY(-3px) scale(1.03)}.nx-btn svg{width:18px;height:18px}
@keyframes pulso{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--neon) 55%,transparent),0 18px 40px -14px var(--neon)}70%,100%{box-shadow:0 0 0 22px transparent,0 18px 40px -14px var(--neon)}}
.nx-faixa{padding:22px 0;background:var(--neon);color:#04050a;font-family:var(--fonte-t);font-size:clamp(24px,3.4vw,46px);text-transform:uppercase;transform:rotate(-1.2deg);margin:0 -2vw}
.nx-faixa i{color:#04050a;opacity:.55}
.sec{padding:clamp(70px,10vw,140px) 0;position:relative}
.nx-t{font-family:var(--fonte-t);font-weight:400;text-transform:uppercase;font-size:clamp(40px,7vw,110px);line-height:.92;margin:0 0 clamp(26px,4vw,52px)}
.nx-t em{font-style:normal;color:var(--neon);text-shadow:0 0 28px color-mix(in srgb,var(--neon) 55%,transparent)}
.nx-sobre .wrap{display:grid;grid-template-columns:1.1fr 1fr;gap:clamp(30px,5vw,80px);align-items:center}
.nx-sobre p{color:rgba(255,255,255,.8);font-size:clamp(17px,1.5vw,20px);line-height:1.75;max-width:52ch}
.nx-moldura{aspect-ratio:4/5;border-radius:var(--raio);overflow:hidden;position:relative;border:1px solid color-mix(in srgb,var(--neon) 55%,transparent);box-shadow:0 0 60px -10px color-mix(in srgb,var(--neon) 40%,transparent)}
.nx-moldura .par{position:absolute;inset:-8%;background-size:cover;background-position:center}
.nx-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
.nx-card{padding:32px 28px;min-height:250px;display:flex;flex-direction:column;border:1px solid var(--linha);transition:transform .5s var(--ease),border-color .4s,box-shadow .5s}
.nx-card:hover{transform:translateY(-8px);border-color:var(--neon);box-shadow:0 0 50px -10px color-mix(in srgb,var(--neon) 55%,transparent)}
.nx-card .ic{width:50px;height:50px;border-radius:14px;display:grid;place-items:center;color:var(--neon);background:color-mix(in srgb,var(--neon) 14%,transparent);margin-bottom:auto}
.nx-card h3{font-family:var(--fonte-t);font-weight:400;text-transform:uppercase;font-size:clamp(26px,2.4vw,34px);margin:26px 0 8px;line-height:1}
.nx-card p{color:var(--mudo);margin:0;font-size:15.5px;line-height:1.6}
.nx-card .n{position:absolute;top:22px;right:26px;font-family:var(--fonte-t);font-size:24px;color:rgba(255,255,255,.2)}
.nx-gal{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.nx-gal figure{margin:0;aspect-ratio:3/4;border-radius:var(--raio);overflow:hidden;border:1px solid var(--linha);transition:transform .6s var(--ease),border-color .4s}
.nx-gal figure:nth-child(even){transform:translateY(34px)}
.nx-gal figure:hover{border-color:var(--neon);transform:translateY(-6px) scale(1.02)}
.nx-gal img{width:100%;height:100%;object-fit:cover}
.nx-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px;text-align:center}
.nx-ct b{display:block;font-family:var(--fonte-t);font-weight:400;font-size:clamp(70px,10vw,150px);line-height:1;color:var(--neon);text-shadow:0 0 40px color-mix(in srgb,var(--neon) 50%,transparent)}
.nx-ct span{text-transform:uppercase;letter-spacing:.18em;font-size:13px;color:var(--mudo)}
.nx-cta{padding:clamp(60px,9vw,130px) 0}
.nx-cta-in{display:grid;grid-template-columns:1.3fr 1fr;gap:40px;align-items:center;padding:clamp(34px,6vw,76px);border-radius:calc(var(--raio) + 10px);border:1px solid color-mix(in srgb,var(--neon) 50%,transparent);box-shadow:0 0 90px -20px color-mix(in srgb,var(--neon) 45%,transparent)}
.nx-info p{display:flex;gap:14px;margin:0 0 14px;color:#ececf1}.nx-info svg{flex:none;margin-top:3px;color:var(--neon)}
@media(max-width:900px){.nx-sobre .wrap,.nx-cta-in{grid-template-columns:1fr}.nx-gal{grid-template-columns:repeat(2,1fr)}.nx-gal figure:nth-child(even){transform:none}}
`, `
<div class="nx-nebulosa" aria-hidden="true"></div><div class="nx-ceu" aria-hidden="true"></div>
${nav(d, [["#sobre", "Sobre"], ["#servicos", "Servi\xE7os"], ["#contato", "Contato"]])}
<section class="nx-hero">
  ${capa ? `<div class="nx-foto" style="background-image:url('${capa}')"></div>` : ""}
  <div class="wrap">
    <span class="nx-ola entra">${esc(eyebrow(d) || d.empresa)}</span>
    <h1 class="nx-h1">${palavras(titulo(d, d.empresa), 1)}</h1>
    <p class="nx-sub entra" style="--d:5">${capaTxt}</p>
    <div class="nx-btns entra" style="--d:6">${ctaPrincipal(d, "Quero participar", "nx-btn")}<a class="vidro-bt" href="#servicos">Ver o que rola${ICONES.seta}</a></div>
  </div>
</section>
<div style="overflow:hidden;padding:18px 0">${faixa([d.categoria || d.empresa, ...servicos.map((s) => s.titulo), d.cidade || ""], "marq nx-faixa")}</div>
<section class="sec nx-sobre" id="sobre"><div class="wrap">
  <div class="rev-l"><h2 class="nx-t">Quem \xE9 <em>${esc(d.empresa)}</em></h2><p>${sobreTxt}</p>${seloGoogle(d, "nr-nota vidro")}</div>
  <div class="nx-moldura rev-r"><div class="${classeImagem(foto2 || capa, "par")}" style="${fundoImagem(foto2 || capa, 1)}"></div></div>
</div></section>
${servicos.length ? `<section class="sec" id="servicos"><div class="wrap"><h2 class="nx-t rev">O que <em>rola</em> aqui</h2>
  <div class="nx-grade">${servicos.map((s, i) => `<article class="nx-card vidro rev"><span class="n">${pad23(i + 1)}</span><span class="ic">${iconeDoServico(i)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ""}</article>`).join("")}</div></div></section>` : ""}
${fotosGal.length >= 3 ? `<section class="sec"><div class="wrap"><h2 class="nx-t rev">D\xE1 uma <em>olhada</em></h2><div class="nx-gal">${fotosGal.slice(0, 4).map((src, i) => `<figure class="rev"><img src="${src}" alt="${esc(d.empresa)} \u2014 foto ${i + 1}" loading="lazy"></figure>`).join("")}</div></div></section>` : ""}
${nums.length >= 2 ? `<section class="sec"><div class="wrap"><div class="nx-num">${nums.map((n) => n.valor !== void 0 ? contador(n.valor, n.rotulo, "nx-ct") : `<div class="nx-ct"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join("")}</div></div></section>` : ""}
${vozes(d, "nr-vozes")}
<section class="nx-cta" id="contato"><div class="wrap"><div class="nx-cta-in rev">
  <div><h2 class="nx-t">Bora <em>conversar?</em></h2><div class="nx-btns">${ctaPrincipal(d, "Chamar no WhatsApp", "nx-btn")}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div></div>
  <div class="nx-info">${contatoLinhas2(d, "nx-lin")}</div>
</div></div></section>
${rodape2(d, "rd")}
`, true, false);
  }
};
var b2b = {
  id: "b2b",
  nome: "B2B Elipse",
  descricao: "A foto se abre em elipse conforme a p\xE1gina rola, t\xEDtulos letra por letra e texto que acende ao rolar. Para empresas, ind\xFAstrias e servi\xE7os t\xE9cnicos.",
  nichos: ["Ind\xFAstrias", "Oficinas", "Constru\xE7\xE3o", "Log\xEDstica", "Contabilidade", "Engenharia", "Tecnologia"],
  miniatura: miniaturaCinema("escuro", "camadas"),
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Solu\xE7\xF5es profissionais para empresas que n\xE3o podem parar.", "Trabalhamos com m\xE9todo, prazo combinado e atendimento direto com quem entende do assunto.");
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0);
    const fotosGal = imagens(d);
    const nums = numerosReais(d);
    const apresentacao = esc(sobreTxt.replace(/&[a-z#0-9]+;/gi, " ")).split(/\s+/).filter(Boolean).slice(0, 60).map((p, i) => `<span class="leit" style="--i:${i}">${p}</span>`).join(" ");
    return documentoCinema(d, PARES.archivo, `
${cssBaseEscura(d, "#05090f")}
${cssNavVidro("nv")}
${cssRodapeEscuro("rd")}
${cssVozesEscuras("Archivo")}
.b2-palco{position:relative;height:230vh}
.b2-fixo{position:sticky;top:0;height:100svh;overflow:hidden;display:grid;place-items:center;isolation:isolate}
.b2-img{position:absolute;inset:0;z-index:-1;clip-path:ellipse(34% 26% at 50% 54%);background-size:cover;background-position:center}
.b2-fixo::before{content:"";position:absolute;inset:0;z-index:-2;background:radial-gradient(60% 50% at 50% 50%,color-mix(in srgb,var(--c1) 28%,transparent),transparent 70%)}
@keyframes elipse{from{clip-path:ellipse(34% 26% at 50% 54%)}to{clip-path:ellipse(130% 110% at 50% 50%)}}
@supports (animation-timeline:view()){
  .b2-palco{view-timeline-name:--b2;view-timeline-axis:block}
  .b2-img{animation:elipse linear both;animation-timeline:--b2;animation-range:cover 8% cover 62%}
}
@supports not (animation-timeline:view()){.b2-palco{height:auto}.b2-fixo{min-height:100svh;position:relative}.b2-img{clip-path:none}}
.b2-veu{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(5,9,15,.35),rgba(5,9,15,.6))}
.b2-conteudo{text-align:center;padding:0 5vw}
.b2-pre{font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:var(--c2c);margin:0 0 22px}
.b2-h1{font-family:var(--fonte-t);font-weight:800;font-size:clamp(40px,8.4vw,132px);line-height:.95;letter-spacing:-.035em;margin:0 auto 26px;max-width:16ch;text-wrap:balance}
.b2-h1 .pal-g{margin-right:.14em}
.b2-sub{max-width:54ch;margin:0 auto 34px;color:rgba(255,255,255,.82);font-size:clamp(17px,1.5vw,20px);line-height:1.65}
.b2-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.sec{padding:clamp(70px,10vw,150px) 0}
.rot{font-size:12px;letter-spacing:.26em;text-transform:uppercase;color:var(--c2c);margin:0 0 20px}
.b2-leit{font-family:var(--fonte-t);font-weight:700;font-size:clamp(28px,4.6vw,66px);line-height:1.12;letter-spacing:-.025em;max-width:24ch}
.leit{opacity:.18;display:inline-block}
@keyframes acende{to{opacity:1}}
@supports (animation-timeline:view()){.leit{animation:acende linear both;animation-timeline:view();animation-range:entry calc(var(--i) * 1.1%) entry calc(46% + var(--i) * 1.1%)}}
@supports not (animation-timeline:view()){.leit{opacity:1}}
.b2-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:clamp(30px,4vw,56px)}
.b2-card{padding:36px 30px;border-radius:var(--raio);border:1px solid var(--linha);background:linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.015));transition:transform .5s var(--ease),border-color .3s;position:relative;overflow:hidden}
.b2-card::before{content:"";position:absolute;left:0;top:0;height:2px;width:0;background:linear-gradient(90deg,var(--c1c),var(--c2));transition:width .7s var(--ease)}
.b2-card:hover{transform:translateY(-6px);border-color:rgba(255,255,255,.28)}.b2-card:hover::before{width:100%}
.b2-card .ic{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;background:color-mix(in srgb,var(--c1) 30%,transparent);color:#fff;margin-bottom:26px}
.b2-card h3{font-family:var(--fonte-t);font-weight:700;font-size:24px;letter-spacing:-.02em;margin:0 0 10px}
.b2-card p{margin:0;color:var(--mudo);line-height:1.65;font-size:15.5px}
.b2-mosaico{columns:3;column-gap:14px}
.b2-mosaico figure{margin:0 0 14px;border-radius:var(--raio);overflow:hidden;break-inside:avoid;border:1px solid var(--linha)}
.b2-mosaico img{width:100%;display:block;transition:transform 1.2s var(--ease)}.b2-mosaico figure:hover img{transform:scale(1.06)}
.b2-mosaico figure:nth-child(3n+1) img{aspect-ratio:3/4;object-fit:cover}.b2-mosaico figure:nth-child(3n+2) img{aspect-ratio:1;object-fit:cover}.b2-mosaico figure:nth-child(3n) img{aspect-ratio:4/5;object-fit:cover}
.b2-tit{font-family:var(--fonte-t);font-weight:800;font-size:clamp(34px,5.4vw,76px);line-height:1;letter-spacing:-.035em;margin:0 0 clamp(26px,4vw,48px);max-width:18ch}
.b2-faixa{padding:26px 0;border-block:1px solid var(--linha);font-family:var(--fonte-t);font-weight:700;font-size:clamp(20px,2.6vw,34px);color:rgba(255,255,255,.55);letter-spacing:-.01em;text-transform:uppercase}
.b2-faixa i{color:var(--c2);font-style:normal}
.b2-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));border-block:1px solid var(--linha)}
.b2-ct{padding:40px 30px;border-left:1px solid var(--linha)}.b2-ct:first-child{border-left:0}
.b2-ct b{display:block;font-family:var(--fonte-t);font-weight:800;font-size:clamp(54px,7vw,104px);letter-spacing:-.05em;line-height:1}
.b2-ct span{color:var(--mudo);font-size:14px}
.b2-fim{padding:clamp(60px,9vw,120px) 0;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--c1) 14%,transparent))}
.b2-fim .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(30px,5vw,80px);align-items:center}
.b2-fim h2{font-family:var(--fonte-t);font-weight:800;font-size:clamp(38px,6vw,90px);line-height:.95;letter-spacing:-.04em;margin:0 0 24px}
.b2-info{padding:34px}.b2-info p{display:flex;gap:14px;margin:0 0 14px;color:#e8ebf2}.b2-info svg{flex:none;margin-top:3px;color:var(--c2c)}
@media(max-width:900px){.b2-fim .wrap{grid-template-columns:1fr}.b2-mosaico{columns:2}.b2-ct{border-left:0;border-top:1px solid var(--linha)}.b2-ct:first-child{border-top:0}}
`, `
${nav(d, [["#empresa", "A empresa"], ["#solucoes", "Solu\xE7\xF5es"], ["#contato", "Contato"]])}
<section class="b2-palco"><div class="b2-fixo">
  <div class="${classeImagem(capa, "b2-img")}" style="${fundoImagem(capa, 0)}"></div><div class="b2-veu"></div>
  <div class="b2-conteudo">
    <p class="b2-pre entra">${esc(eyebrow(d) || d.empresa)}</p>
    <h1 class="b2-h1">${letras(titulo(d, d.empresa), 4)}</h1>
    <p class="b2-sub entra" style="--d:8">${capaTxt}</p>
    <div class="b2-btns entra" style="--d:9">${ctaPrincipal(d, "Solicitar contato", "bt-cheio")}<a class="vidro-bt" href="#solucoes">Conhecer as solu\xE7\xF5es${ICONES.seta}</a></div>
  </div>
</div></section>
<section class="sec" id="empresa"><div class="wrap"><p class="rot">A empresa</p><p class="b2-leit">${apresentacao}</p>${seloGoogle(d, "nr-nota vidro")}</div></section>
${faixa([d.categoria || d.empresa, ...servicos.map((s) => s.titulo), d.cidade || ""], "marq b2-faixa")}
${servicos.length ? `<section class="sec" id="solucoes"><div class="wrap"><p class="rot rev">Solu\xE7\xF5es</p><h2 class="b2-tit rev">O que entregamos para o seu neg\xF3cio</h2>
  <div class="b2-grade">${servicos.map((s, i) => `<article class="b2-card rev"><span class="ic">${iconeDoServico(i)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ""}</article>`).join("")}</div></div></section>` : ""}
${fotosGal.length >= 3 ? `<section class="sec"><div class="wrap"><h2 class="b2-tit rev">Na pr\xE1tica</h2><div class="b2-mosaico">${fotosGal.slice(0, 6).map((src, i) => `<figure class="rev"><img src="${src}" alt="${esc(d.empresa)} \u2014 foto ${i + 1}" loading="lazy"></figure>`).join("")}</div></div></section>` : ""}
${nums.length >= 2 ? `<section><div class="wrap"><div class="b2-num">${nums.map((n) => n.valor !== void 0 ? contador(n.valor, n.rotulo, "b2-ct") : `<div class="b2-ct"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join("")}</div></div></section>` : ""}
${vozes(d, "nr-vozes")}
<section class="b2-fim" id="contato"><div class="wrap">
  <div class="rev-l"><h2>${palavras("Vamos tirar o seu projeto do papel?", 0)}</h2><div class="b2-btns" style="justify-content:flex-start">${ctaPrincipal(d, "Falar com um especialista", "bt-cheio")}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div></div>
  <div class="b2-info vidro rev-r">${contatoLinhas2(d, "b2-lin")}</div>
</div></section>
${rodape2(d, "rd")}
`, true, false);
  }
};
var campus = {
  id: "campus",
  nome: "Campus Grid",
  descricao: "Mai\xFAsculas com destaque, brilho central, linhas de grade e cart\xE3o de vidro. Para escolas, cursos, tecnologia e consultorias.",
  nichos: ["Escolas", "Cursos", "Tecnologia", "Consultorias", "Coaching", "Idiomas", "Coworking"],
  miniatura: miniaturaCinema("escuro", "colunas"),
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "M\xE9todo claro, acompanhamento de perto e resultado que d\xE1 para ver.", "Cada pessoa aprende e evolui no pr\xF3prio ritmo, com orienta\xE7\xE3o de quem faz.");
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0);
    const nums = numerosReais(d);
    const fotosGal = imagens(d);
    return documentoCinema(d, PARES.grotesk, `
${cssBaseEscura(d, "#040608")}
${cssNavVidro("nv")}
${cssRodapeEscuro("rd")}
${cssVozesEscuras("Space Grotesk")}
:root{--verde:color-mix(in srgb,var(--c2) 80%,#7dff9a)}
.cg-hero{position:relative;min-height:100svh;display:grid;place-items:center;padding:150px 0 90px;overflow:hidden;isolation:isolate}
.cg-hero::before{content:"";position:absolute;inset:0;z-index:-2;background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:84px 84px;-webkit-mask-image:radial-gradient(70% 70% at 50% 45%,#000,transparent);mask-image:radial-gradient(70% 70% at 50% 45%,#000,transparent)}
.cg-hero::after{content:"";position:absolute;left:50%;top:44%;width:min(900px,90vw);height:min(900px,90vw);transform:translate(-50%,-50%);z-index:-1;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--verde) 34%,transparent),transparent 62%);filter:blur(30px);animation:respira 7s ease-in-out infinite alternate}
@keyframes respira{from{opacity:.65;transform:translate(-50%,-50%) scale(.94)}to{opacity:1;transform:translate(-50%,-50%) scale(1.06)}}
.cg-foto{position:absolute;inset:0;z-index:-3;background-size:cover;background-position:center;opacity:.2}
.cg-in{text-align:center;display:grid;justify-items:center;gap:26px}
.cg-pre{display:inline-flex;gap:10px;align-items:center;padding:9px 18px;border-radius:999px;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--verde)}
.cg-h1{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;font-size:clamp(40px,8vw,128px);line-height:.96;letter-spacing:-.03em;margin:0;max-width:16ch;text-wrap:balance}
.cg-h1 .pal:nth-child(3n){color:var(--verde);text-shadow:0 0 40px color-mix(in srgb,var(--verde) 55%,transparent)}
.cg-card{display:grid;grid-template-columns:1fr auto;gap:30px;align-items:center;padding:26px 30px;max-width:760px;width:100%;text-align:left;border-radius:calc(var(--raio) + 6px)}
.cg-card p{margin:0;color:rgba(255,255,255,.8);font-size:16px;line-height:1.6}
.cg-btn{display:inline-flex;align-items:center;gap:10px;padding:16px 28px;border-radius:999px;background:var(--verde);color:#03140a;font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:13px;white-space:nowrap;transition:transform .3s var(--ease),box-shadow .3s}
.cg-btn:hover{transform:translateY(-3px);box-shadow:0 20px 40px -14px var(--verde)}.cg-btn svg{width:18px;height:18px}
.sec{padding:clamp(70px,10vw,140px) 0;position:relative}
.cg-t{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;font-size:clamp(34px,5.6vw,84px);line-height:.98;letter-spacing:-.03em;margin:0 0 clamp(26px,4vw,50px);max-width:18ch}
.cg-t em{font-style:normal;color:var(--verde)}
.cg-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:1px;background:var(--linha);border:1px solid var(--linha);border-radius:var(--raio);overflow:hidden}
.cg-trilha{background:#050709;padding:34px 30px;min-height:260px;display:flex;flex-direction:column;transition:background .4s}
.cg-trilha:hover{background:color-mix(in srgb,var(--verde) 9%,#050709)}
.cg-trilha .n{font-size:13px;letter-spacing:.2em;color:var(--verde);margin-bottom:auto}
.cg-trilha h3{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;font-size:clamp(22px,2vw,28px);letter-spacing:-.02em;margin:34px 0 10px;line-height:1.05}
.cg-trilha p{margin:0;color:var(--mudo);font-size:15.5px;line-height:1.65}
.cg-sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(30px,5vw,80px);align-items:center}
.cg-sobre p:not(.rot){color:rgba(255,255,255,.78);font-size:clamp(17px,1.5vw,20px);line-height:1.75}
.rot{font-size:12px;letter-spacing:.24em;text-transform:uppercase;color:var(--verde);margin:0 0 20px}
.cg-gal{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.cg-gal figure{margin:0;aspect-ratio:4/3;border-radius:var(--raio);overflow:hidden;border:1px solid var(--linha)}.cg-gal img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}.cg-gal figure:hover img{transform:scale(1.06)}
.cg-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
.cg-ct{padding:34px 30px;border:1px solid var(--linha);border-radius:var(--raio);background:rgba(255,255,255,.025)}
.cg-ct b{display:block;font-family:var(--fonte-t);font-weight:700;font-size:clamp(54px,7vw,100px);line-height:1;color:var(--verde);letter-spacing:-.04em}.cg-ct span{color:var(--mudo);font-size:14px}
.cg-fim{padding:clamp(60px,9vw,130px) 0}
.cg-fim-in{display:grid;grid-template-columns:1.2fr 1fr;gap:40px;align-items:center;padding:clamp(34px,6vw,70px);border-radius:calc(var(--raio) + 10px)}
.cg-fim h2{font-family:var(--fonte-t);font-weight:700;text-transform:uppercase;font-size:clamp(36px,5.6vw,84px);line-height:.96;letter-spacing:-.03em;margin:0 0 22px}
.cg-info p{display:flex;gap:14px;margin:0 0 14px;color:#ececf1}.cg-info svg{flex:none;margin-top:3px;color:var(--verde)}
@media(max-width:900px){.cg-card{grid-template-columns:1fr}.cg-sobre .wrap,.cg-fim-in{grid-template-columns:1fr}.cg-gal{grid-template-columns:1fr 1fr}}
@media(max-width:600px){.cg-hero::before{background-size:56px 56px}}
`, `
${nav(d, [["#sobre", "Sobre"], ["#trilhas", "Servi\xE7os"], ["#contato", "Contato"]])}
<section class="cg-hero">${capa ? `<div class="cg-foto" style="background-image:url('${capa}')"></div>` : ""}
  <div class="wrap cg-in">
    <span class="cg-pre vidro entra">${esc(eyebrow(d) || d.empresa)}</span>
    <h1 class="cg-h1">${palavras(titulo(d, d.empresa), 1)}</h1>
    <div class="cg-card vidro entra" style="--d:5"><p>${capaTxt}</p>${ctaPrincipal(d, "Quero come\xE7ar", "cg-btn")}</div>
    ${seloGoogle(d, "nr-nota vidro entra")}
  </div>
</section>
<section class="sec cg-sobre" id="sobre"><div class="wrap"><div class="rev-l"><p class="rot">Sobre</p><h2 class="cg-t">${esc(d.empresa)}</h2></div><div class="rev-r"><p>${sobreTxt}</p></div></div></section>
${servicos.length ? `<section class="sec" id="trilhas"><div class="wrap"><p class="rot rev">O que oferecemos</p><h2 class="cg-t rev">Escolha o seu <em>caminho</em></h2>
  <div class="cg-grade">${servicos.map((s, i) => `<article class="cg-trilha rev"><span class="n">${pad23(i + 1)} /</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ""}</article>`).join("")}</div></div></section>` : ""}
${fotosGal.length >= 3 ? `<section class="sec"><div class="wrap"><div class="cg-gal">${fotosGal.slice(0, 6).map((src, i) => `<figure class="rev"><img src="${src}" alt="${esc(d.empresa)} \u2014 foto ${i + 1}" loading="lazy"></figure>`).join("")}</div></div></section>` : ""}
${nums.length >= 2 ? `<section class="sec"><div class="wrap"><div class="cg-num">${nums.map((n) => n.valor !== void 0 ? contador(n.valor, n.rotulo, "cg-ct") : `<div class="cg-ct"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join("")}</div></div></section>` : ""}
${vozes(d, "nr-vozes")}
<section class="cg-fim" id="contato"><div class="wrap"><div class="cg-fim-in vidro rev">
  <div><h2>Pronto para <em style="font-style:normal;color:var(--verde)">come\xE7ar?</em></h2><div style="display:flex;flex-wrap:wrap;gap:12px">${ctaPrincipal(d, "Chamar no WhatsApp", "cg-btn")}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div></div>
  <div class="cg-info">${contatoLinhas2(d, "cg-lin")}</div>
</div></div></section>
${rodape2(d, "rd")}
`, true, false);
  }
};
var LAYOUTS_CINEMA_3 = [neon, b2b, campus];

// src/templates/sites/cinema-4.ts
var pad24 = (n) => String(n).padStart(2, "0");
var agro = {
  id: "agro",
  nome: "Agro Contraste",
  descricao: "Se\xE7\xF5es escuras e claras que se alternam, n\xFAmeros que sobem e cart\xF5es de servi\xE7o sobre foto. Para quem trabalha com campo, obra e produto.",
  nichos: ["Agro", "Jardinagem", "Constru\xE7\xE3o", "Materiais", "Pet shops", "Transportes", "Ind\xFAstrias"],
  miniatura: miniaturaCinema("misto", "colunas"),
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Trabalho s\xE9rio, no prazo e com quem entende do assunto.", "Experi\xEAncia de campo, equipe pr\xF3xima e compromisso com o que foi combinado.");
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1);
    const nums = numerosReais(d);
    return documentoCinema(d, PARES.sora, `
${cssBaseClara(d, "#f3f1ea")}
${cssNavVidro("nv")}
${cssVozesEscuras("Sora")}
${cssRodapeEscuro("rd")}
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
${nav(d, [["#sobre", "Sobre"], ["#servicos", "Servi\xE7os"], ["#contato", "Contato"]])}
<section class="ag-hero"><div class="${classeImagem(capa, "ag-bg")}" style="${fundoImagem(capa, 0)}"></div>
  <div class="wrap"><span class="ag-pre entra">${esc(eyebrow(d) || d.empresa)}</span>
    <h1 class="ag-h1">${palavras(titulo(d, d.empresa), 1)}</h1>
    <p class="ag-sub entra" style="--d:5">${capaTxt}</p>
    <div class="ag-btns entra" style="--d:6">${ctaPrincipal(d, "Pedir or\xE7amento", "bt-cheio")}<a class="vidro-bt" href="#servicos">Ver servi\xE7os${ICONES.seta}</a></div>
    ${seloGoogle(d, "nr-nota vidro entra")}</div></section>
<section class="ag-sec ag-sobre" id="sobre"><div class="wrap">
  <div class="rev-l"><p class="ag-rot">Quem somos</p><h2 class="ag-t">${esc(d.empresa)}</h2><p>${sobreTxt}</p></div>
  <div class="ag-foto rev-r"><div class="${classeImagem(foto2 || capa, "par")}" style="${fundoImagem(foto2 || capa, 1)}"></div></div>
</div></section>
${nums.length >= 2 ? `<section class="ag-sec ag-esc"><div class="wrap"><p class="ag-rot rev">Em n\xFAmeros</p><div class="ag-num rev">${nums.map((n) => n.valor !== void 0 ? contador(n.valor, n.rotulo, "ag-ct") : `<div class="ag-ct"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join("")}</div></div></section>` : ""}
<div style="overflow:hidden">${faixa([d.categoria || d.empresa, ...servicos.map((s) => s.titulo), d.cidade || ""], "marq ag-faixa")}</div>
${servicos.length ? `<section class="ag-sec" id="servicos"><div class="wrap"><p class="ag-rot rev">O que fazemos</p><h2 class="ag-t rev">Solu\xE7\xF5es para o seu dia a dia</h2>
  <div class="ag-cards">${servicos.map((s, i) => {
      const f = fotoDe(d, i + 2);
      return `<article class="ag-card rev"><div class="${classeImagem(f, "fundo")}" style="${fundoImagem(f, i % 3)}"></div><span class="n">${pad24(i + 1)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ""}</article>`;
    }).join("")}</div></div></section>` : ""}
<div class="ag-esc">${vozes(d, "nr-vozes")}</div>
<section class="ag-sec ag-esc ag-fim" id="contato"><div class="wrap">
  <div class="rev-l"><p class="ag-rot">Contato</p><h2>${palavras("Vamos conversar sobre o seu projeto?", 0)}</h2><div class="ag-btns">${ctaPrincipal(d, "Chamar no WhatsApp", "bt-cheio")}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div></div>
  <div class="ag-info vidro rev-r" style="padding:34px">${contatoLinhas2(d, "ag-lin")}</div>
</div></section>
${rodape2(d, "rd")}
`, false, false);
  }
};
var fintech = {
  id: "fintech",
  nome: "Fintech Flutuante",
  descricao: "Capa que vai e volta, cart\xF5es de vidro flutuando com a nota do Google em anel e depoimento em duas colunas. Para servi\xE7os modernos e de confian\xE7a.",
  nichos: ["Contabilidade", "Seguros", "Financeiras", "Cl\xEDnicas modernas", "Imobili\xE1rias", "Tecnologia", "Consultoria"],
  miniatura: miniaturaCinema("escuro", "bento"),
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Clareza, agilidade e atendimento de verdade para o seu dia a dia.", "Tratamos cada cliente com transpar\xEAncia, do primeiro contato ao resultado.");
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1), foto3 = fotoDe(d, 2);
    const nota = Number(d.nota) || 0;
    const aval = Number(d.avaliacoes) || 0;
    const depo = depoimentosValidos(d);
    const anel = nota >= 3.5 ? Math.round(nota / 5 * 100) : 0;
    return documentoCinema(d, PARES.sora, `
${cssBaseEscura(d, "#050912")}
${cssNavVidro("nv")}
${cssRodapeEscuro("rd")}
${cssVozesEscuras("Sora")}
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
${nav(d, [["#sobre", "Sobre"], ["#solucoes", "Solu\xE7\xF5es"], ["#contato", "Contato"]])}
<section class="ft-hero"><div class="${classeImagem(capa, "ft-bg")}" style="${fundoImagem(capa, 2)}"></div>
  <div class="wrap ft-grade">
    <div><span class="rot entra">${esc(eyebrow(d) || d.empresa)}</span><h1 class="ft-h1">${palavras(titulo(d, d.empresa), 1)}</h1>
      <p class="ft-sub entra" style="--d:5">${capaTxt}</p>
      <div class="ft-btns entra" style="--d:6">${ctaPrincipal(d, "Falar com a equipe", "bt-cheio")}<a class="vidro-bt" href="#solucoes">Ver solu\xE7\xF5es${ICONES.seta}</a></div></div>
    <div class="ft-flut" aria-hidden="false">
      ${anel ? `<div class="ft-c ft-c1 vidro entra" style="--d:3"><div class="ft-linha"><div style="position:relative;width:96px;height:96px;flex:none"><div class="ft-anel"></div><div class="ft-anel-n">${nota.toFixed(1).replace(".", ",")}</div></div><div><small>Nota no Google</small><b>${aval ? `${aval.toLocaleString("pt-BR")} avalia\xE7\xF5es` : "de clientes"}</b></div></div></div>` : ""}
      <div class="ft-c ft-c2 vidro entra" style="--d:4"><small style="color:var(--mudo)">Atendimento</small><div style="font-size:20px;font-weight:600;margin-top:2px">${esc(d.horario || "Fale agora pelo WhatsApp")}</div>
        <svg class="ft-spark" viewBox="0 0 200 60" preserveAspectRatio="none"><path d="M0 48 C 25 44, 35 20, 60 26 S 95 52, 120 30 S 160 6, 200 12"/></svg></div>
      <div class="ft-c ft-c3 vidro entra" style="--d:5"><small style="color:var(--mudo)">Servi\xE7os</small><div style="font-size:20px;font-weight:600;margin-top:2px">${servicos.length ? `${servicos.length} ${servicos.length === 1 ? "servi\xE7o" : "servi\xE7os"} para voc\xEA` : esc(d.categoria || d.empresa)}</div>
        <div class="ft-barras"><i style="--h:38%"></i><i style="--h:60%;animation-delay:.1s"></i><i style="--h:46%;animation-delay:.2s"></i><i style="--h:82%;animation-delay:.3s"></i><i style="--h:68%;animation-delay:.4s"></i><i style="--h:100%;animation-delay:.5s"></i></div></div>
    </div>
  </div>
</section>
<section class="sec" id="sobre"><div class="wrap ft-dup">
  <div class="rev-l"><p class="rot">Quem somos</p><h2 class="ft-t">${esc(d.empresa)}</h2><p class="t">${sobreTxt}</p>${seloGoogle(d, "nr-nota vidro")}</div>
  <div class="ft-quad rev-r">${[foto2 || capa, foto3 || foto2 || capa].map((f, i) => `<div class="cf ${f ? "tem-foto" : "cena"}" style="${f ? `background-image:url('${f}')` : `--cena:${i}`}"></div>`).join("")}</div>
</div></section>
${servicos.length ? `<section class="sec" id="solucoes"><div class="wrap"><p class="rot rev">Solu\xE7\xF5es</p><h2 class="ft-t rev">Tudo o que voc\xEA precisa em um s\xF3 lugar</h2>
  <div class="ft-4">${servicos.slice(0, 4).map((s, i) => {
      const f = fotoDe(d, i + 1);
      return `<article class="ft-f rev"><div class="${classeImagem(f, "fundo")}" style="${fundoImagem(f, i % 3)}"></div><span class="ic">${iconeDoServico(i)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ""}</article>`;
    }).join("")}</div></div></section>` : ""}
${depo.length ? `<section class="sec"><div class="wrap ft-dup"><div class="ft-voz rev-l"><p class="rot">Quem j\xE1 \xE9 cliente</p><blockquote>\u201C${esc(depo[0].texto)}\u201D</blockquote><cite>${esc(depo[0].autor)}</cite></div>
  ${depo[1] ? `<div class="ft-voz rev-r"><p class="rot">&nbsp;</p><blockquote>\u201C${esc(depo[1].texto)}\u201D</blockquote><cite>${esc(depo[1].autor)}</cite></div>` : ""}</div></section>` : ""}
<section class="sec" id="contato"><div class="wrap"><div class="ft-fim-in vidro rev">
  <div><h2>${palavras("Vamos conversar sobre o seu caso?", 0)}</h2><div class="ft-btns">${ctaPrincipal(d, "Chamar no WhatsApp", "bt-cheio")}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div></div>
  <div class="ft-info">${contatoLinhas2(d, "ft-lin")}</div></div></div></section>
${rodape2(d, "rd")}
`);
  }
};
var premio = {
  id: "premio",
  nome: "Pr\xEAmio Chanfrado",
  descricao: "Moldura branca arredondada, bot\xE3o com corte em \xE2ngulo, colunas com cart\xF5es angulares e n\xFAmeros em gradiente. Para consultorias, advocacia e marcas de prest\xEDgio.",
  nichos: ["Advocacia", "Consultorias", "Escolas premium", "Corretores", "Cl\xEDnicas", "Contabilidade", "Eventos corporativos"],
  miniatura: miniaturaCinema("claro", "colunas"),
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Excel\xEAncia reconhecida por quem j\xE1 passou por aqui.", "Atuamos com \xE9tica, m\xE9todo e aten\xE7\xE3o a cada detalhe, para que voc\xEA decida com seguran\xE7a.");
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1);
    const nums = numerosReais(d);
    return documentoCinema(d, PARES.syne, `
${cssBaseClara(d, "#11141b")}
${cssNavVidro("nv")}
${cssVozesEscuras("Syne")}
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
${nav(d, [["#sobre", "Sobre"], ["#servicos", "Servi\xE7os"], ["#contato", "Contato"]])}
<section class="pm-hero"><div class="${classeImagem(capa, "pm-bg")}" style="${fundoImagem(capa, 0)}"></div>
  <div class="wrap"><p class="pm-pre entra">${esc(eyebrow(d) || d.empresa)}</p><h1 class="pm-h1">${palavras(titulo(d, d.empresa), 1)}</h1>
    <p class="pm-sub entra" style="--d:5">${capaTxt}</p>
    <div class="entra" style="--d:6;display:flex;gap:16px;flex-wrap:wrap;align-items:center">${ctaPrincipal(d, "Agendar conversa", "pm-cta")}${seloGoogle(d, "nr-nota vidro")}</div></div></section>
<section class="sec" id="sobre"><div class="wrap"><p class="pm-rot rev">Quem somos</p><h2 class="pm-t rev">${esc(d.empresa)}</h2>
  <div class="pm-tres">
    <div class="rev-l">${servicos.slice(0, 2).map((s, i) => `<div class="pm-ang"><span class="n">${pad24(i + 1)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ""}</div>`).join("") || `<div class="pm-ang"><span class="n">01</span><h3>Atendimento</h3><p>${sobreTxt}</p></div>`}</div>
    <div class="pm-quad rev"><div class="${classeImagem(foto2 || capa, "par")}" style="${fundoImagem(foto2 || capa, 1)}"></div></div>
    <div class="rev-r">${servicos.slice(2, 4).map((s, i) => `<div class="pm-ang"><span class="n">${pad24(i + 3)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ""}</div>`).join("") || `<div class="pm-ang"><span class="n">02</span><h3>Compromisso</h3><p>${sobreTxt}</p></div>`}</div>
  </div></div></section>
${servicos.length > 4 ? `<section class="sec" id="servicos" style="padding-top:0"><div class="wrap"><h2 class="pm-t rev">Outras \xE1reas de atua\xE7\xE3o</h2><div class="pm-tres" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr))">${servicos.slice(4).map((s, i) => `<div class="pm-ang rev"><span class="n">${pad24(i + 5)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ""}</div>`).join("")}</div></div></section>` : '<span id="servicos"></span>'}
</div>
${nums.length >= 2 ? `<div class="pm-esc"><section class="sec"><div class="wrap"><p class="pm-rot rev" style="color:var(--c2)">Em n\xFAmeros</p><div class="pm-stats">${nums.map((n) => n.valor !== void 0 ? contador(n.valor, n.rotulo, "pm-st rev") : `<div class="pm-st rev"><b>${n.texto}</b><span>${esc(n.rotulo)}</span></div>`).join("")}</div></div></section></div>` : ""}
<div class="pm-folha" style="margin-top:${nums.length >= 2 ? "clamp(8px,1.2vw,16px)" : "0"}">
${vozes(d, "nr-vozes").replace('<section class="nr-vozes"', '<section class="nr-vozes" style="color:#14161a"')}
<section class="pm-fim" id="contato"><div class="wrap">
  <div class="rev-l"><p class="pm-rot">Contato</p><h2>${palavras("Vamos conversar?", 0)}</h2><div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center">${ctaPrincipal(d, "Chamar no WhatsApp", "pm-cta")}</div></div>
  <div class="pm-info rev-r">${contatoLinhas2(d, "pm-lin")}</div></div></section>
<footer class="pm-rod"><div class="wrap"><b>${esc(d.empresa)}</b>${d.cidade ? ` \xB7 ${esc(d.cidade)}` : ""} \xB7 \xA9 ${(/* @__PURE__ */ new Date()).getFullYear()}</div></footer>
</div>
`, false, false);
  }
};
var LAYOUTS_CINEMA_4 = [agro, fintech, premio];

// src/templates/sites/cinema-5.ts
var pad25 = (n) => String(n).padStart(2, "0");
var fragrancia = {
  id: "fragrancia",
  nome: "Fragr\xE2ncia Orbital",
  descricao: "Luxo quente: a foto se abre em elipse ao rolar e os servi\xE7os giram em anel. Para perfumaria, joalheria, floricultura, confeitaria e boutiques.",
  nichos: ["Perfumaria", "Joalherias", "Floriculturas", "Confeitarias", "Boutiques", "Spas", "Decora\xE7\xE3o"],
  miniatura: miniaturaCinema("escuro", "orbita"),
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Pequenos luxos para os melhores momentos.", "Cada pe\xE7a \xE9 escolhida com cuidado, para que o presente, ou o seu momento, seja lembrado.");
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1) || capa;
    const nums = numerosReais(d);
    const itens2 = servicos.length ? servicos : [];
    const n = Math.max(itens2.length, 1);
    return documentoCinema(d, PARES.cormorant, `
${cssBaseEscura(d, "#0d0a08")}
${cssNavVidro("nv")}
${cssRodapeEscuro("rd")}
${cssVozesEscuras("Cormorant", true)}
:root{--ouro:color-mix(in srgb,var(--c2) 70%,#f1d9a0)}
body{--fonte-c:"Jost",system-ui,sans-serif}
.fr-hero{position:relative;min-height:100svh;display:grid;place-items:center;text-align:center;padding:150px 0 100px;overflow:hidden;isolation:isolate}
.fr-bg{position:absolute;inset:-4%;z-index:-2;background-size:cover;background-position:center}.fr-bg.tem-foto{animation:kb 26s ease-in-out infinite alternate}
.fr-hero::before{content:"";position:absolute;inset:0;z-index:-1;background:radial-gradient(70% 60% at 50% 50%,rgba(13,10,8,.2),rgba(13,10,8,.82)),linear-gradient(180deg,rgba(13,10,8,.5),transparent 35%,rgba(13,10,8,.95))}
.fr-pre{font-size:12px;letter-spacing:.42em;text-transform:uppercase;color:var(--ouro);margin:0 0 28px}
.fr-h1{font-family:var(--fonte-t);font-weight:400;font-size:clamp(50px,10.4vw,168px);line-height:.9;letter-spacing:-.02em;margin:0 auto 26px;max-width:13ch;word-spacing:.08em;text-wrap:balance}
.fr-h1 .pal:nth-child(even){font-style:italic;color:var(--ouro)}
.fr-sub{max-width:48ch;margin:0 auto 38px;color:rgba(255,255,255,.78);font-size:clamp(17px,1.5vw,20px);line-height:1.7;font-weight:300}
.fr-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.fr-ouro{display:inline-flex;align-items:center;gap:10px;padding:16px 36px;border-radius:999px;color:#1a120a;font-weight:500;letter-spacing:.14em;text-transform:uppercase;font-size:12px;background:linear-gradient(135deg,#f1d9a0,var(--c2));box-shadow:0 20px 40px -18px var(--c2);transition:transform .3s var(--ease)}
.fr-ouro:hover{transform:translateY(-3px)}.fr-ouro svg{width:16px;height:16px}
.fr-ell{position:relative;height:230vh}
.fr-ell-fixo{position:sticky;top:0;height:100svh;overflow:hidden;display:grid;place-items:center;isolation:isolate}
.fr-ell-img{position:absolute;inset:0;z-index:-1;clip-path:ellipse(26% 34% at 50% 52%);background-size:cover;background-position:center}
@keyframes elipse2{from{clip-path:ellipse(26% 34% at 50% 52%)}to{clip-path:ellipse(140% 120% at 50% 50%)}}
@supports (animation-timeline:view()){.fr-ell{view-timeline-name:--fr;view-timeline-axis:block}.fr-ell-img{animation:elipse2 linear both;animation-timeline:--fr;animation-range:cover 6% cover 60%}}
@supports not (animation-timeline:view()){.fr-ell{height:auto}.fr-ell-fixo{position:relative;min-height:100svh}.fr-ell-img{clip-path:none}}
.fr-ell-fixo::after{content:"";position:absolute;inset:0;z-index:-1;background:rgba(13,10,8,.45)}
.fr-ell-txt{text-align:center;padding:0 6vw;max-width:900px}
.fr-ell-txt p{font-family:var(--fonte-t);font-size:clamp(28px,4.4vw,64px);line-height:1.1;font-style:italic;margin:0}
.fr-ell-txt .selo{margin-top:26px}
.sec{padding:clamp(80px,11vw,160px) 0}
.fr-rot{font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:var(--ouro);margin:0 0 20px}
.fr-t{font-family:var(--fonte-t);font-weight:400;font-size:clamp(38px,6vw,92px);line-height:.95;margin:0 0 clamp(26px,4vw,52px)}
.fr-t em{color:var(--ouro)}
.fr-sobre .wrap{display:grid;grid-template-columns:1fr 1fr;gap:clamp(30px,6vw,100px);align-items:center}
.fr-sobre p:not(.fr-rot){font-size:clamp(17px,1.5vw,20px);line-height:1.8;color:rgba(255,255,255,.76);font-weight:300;max-width:50ch}
.fr-arco{aspect-ratio:3/4;border-radius:999px 999px var(--raio) var(--raio);overflow:hidden;position:relative;border:1px solid color-mix(in srgb,var(--ouro) 40%,transparent)}
.fr-arco .par{position:absolute;inset:-8%;background-size:cover;background-position:center}
.fr-orb{padding:clamp(70px,9vw,130px) 0;overflow:hidden;text-align:center}
.fr-cena{perspective:1500px;height:clamp(380px,46vw,520px);display:grid;place-items:center;margin-top:20px}
.fr-anel{position:relative;width:min(230px,56vw);height:clamp(280px,34vw,380px);transform-style:preserve-3d;animation:gira 46s linear infinite}
.fr-anel:hover{animation-play-state:paused}
@keyframes gira{to{transform:rotateY(-360deg)}}
.fr-cart{position:absolute;inset:0;transform:rotateY(calc(var(--i) * (360deg / var(--n)))) translateZ(clamp(260px,34vw,440px));padding:26px 22px;border-radius:var(--raio);text-align:left;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;
  background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.04));border:1px solid color-mix(in srgb,var(--ouro) 45%,transparent);-webkit-backface-visibility:hidden;backface-visibility:hidden;
  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.fr-cart .fundo{position:absolute;inset:0;z-index:-1;opacity:.5;background-size:cover;background-position:center}
.fr-cart .n{position:absolute;top:20px;left:22px;font-family:var(--fonte-t);font-style:italic;font-size:30px;color:var(--ouro)}
.fr-cart h3{font-family:var(--fonte-t);font-weight:400;font-size:28px;line-height:1;margin:0 0 8px}.fr-cart p{margin:0;font-size:14px;color:rgba(255,255,255,.75);line-height:1.55;font-weight:300}
.fr-lista{display:none}
@media(max-width:800px){.fr-cena{display:none}.fr-lista{display:grid;gap:14px;text-align:left;margin-top:20px}.fr-lista article{padding:24px;border-radius:var(--raio);border:1px solid var(--linha);background:rgba(255,255,255,.04)}.fr-lista h3{font-family:var(--fonte-t);font-weight:400;font-size:28px;margin:0 0 6px}.fr-lista p{margin:0;color:var(--mudo)}}
.fr-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;text-align:center}
.fr-ct b{display:block;font-family:var(--fonte-t);font-weight:400;font-style:italic;font-size:clamp(64px,9vw,130px);line-height:1;color:var(--ouro)}.fr-ct span{font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:var(--mudo)}
.fr-vip{padding:clamp(60px,9vw,130px) 0;text-align:center}
.fr-vip-in{max-width:780px;margin:0 auto;padding:clamp(34px,6vw,70px);border-radius:calc(var(--raio) + 10px)}
.fr-vip-in h2{font-family:var(--fonte-t);font-weight:400;font-size:clamp(36px,5.4vw,72px);line-height:1;margin:0 0 16px}.fr-vip-in p{color:var(--mudo);margin:0 auto 28px;max-width:44ch;font-weight:300}
.fr-perg{background:#e9dfcf;color:#2a211b;padding:clamp(60px,8vw,100px) 0}
.fr-perg-in{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:40px}
.fr-perg h4{font-size:12px;letter-spacing:.24em;text-transform:uppercase;margin:0 0 14px;color:#8a6a3f}
.fr-perg b{font-family:var(--fonte-t);font-weight:400;font-size:34px;display:block;margin-bottom:8px}
.fr-perg a,.fr-perg span,.fr-perg p{display:block;color:#3a2f26;margin:0 0 8px;font-weight:300}.fr-perg a:hover{color:#8a6a3f}
.fr-perg-fim{margin-top:40px;padding-top:18px;border-top:1px solid rgba(42,33,27,.18);font-size:13px;color:#6b5a49}
@media(max-width:900px){.fr-sobre .wrap,.fr-perg-in{grid-template-columns:1fr}}
`, `
${nav(d, [["#essencia", "Ess\xEAncia"], ["#colecao", "Cole\xE7\xE3o"], ["#contato", "Contato"]])}
<section class="fr-hero"><div class="${classeImagem(capa, "fr-bg")}" style="${fundoImagem(capa, 0)}"></div>
  <div class="wrap"><p class="fr-pre entra">${esc(eyebrow(d) || d.empresa)}</p><h1 class="fr-h1">${palavras(titulo(d, d.empresa), 1)}</h1>
    <p class="fr-sub entra" style="--d:5">${capaTxt}</p>
    <div class="fr-btns entra" style="--d:6">${ctaPrincipal(d, "Falar no WhatsApp", "fr-ouro")}<a class="vidro-bt" href="#colecao">Ver a cole\xE7\xE3o${ICONES.seta}</a></div></div></section>
<section class="fr-ell" id="essencia"><div class="fr-ell-fixo"><div class="${classeImagem(foto2, "fr-ell-img")}" style="${fundoImagem(foto2, 1)}"></div>
  <div class="fr-ell-txt"><p>${esc(sobreTxt)}</p>${seloGoogle(d, "nr-nota vidro selo")}</div></div></section>
<section class="sec fr-sobre"><div class="wrap">
  <div class="rev-l"><p class="fr-rot">Quem somos</p><h2 class="fr-t">${esc(d.empresa)}</h2><p>${capaTxt}</p></div>
  <div class="fr-arco rev-r"><div class="${classeImagem(fotoDe(d, 2) || foto2, "par")}" style="${fundoImagem(fotoDe(d, 2) || foto2, 2)}"></div></div>
</div></section>
${itens2.length ? `<section class="fr-orb" id="colecao"><div class="wrap"><p class="fr-rot rev">A cole\xE7\xE3o</p><h2 class="fr-t rev">Escolha a sua <em>favorita</em></h2></div>
  <div class="fr-cena" style="--n:${n}"><div class="fr-anel" style="--n:${n}">${itens2.map((s, i) => {
      const f = fotoDe(d, i + 1);
      return `<article class="fr-cart" style="--i:${i};--n:${n}"><div class="${classeImagem(f, "fundo")}" style="${fundoImagem(f, i % 3)}"></div><span class="n">${pad25(i + 1)}</span><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ""}</article>`;
    }).join("")}</div></div>
  <div class="wrap fr-lista">${itens2.map((s) => `<article><h3>${esc(s.titulo)}</h3>${s.descricao ? `<p>${esc(s.descricao)}</p>` : ""}</article>`).join("")}</div></section>` : ""}
${nums.length >= 2 ? `<section class="sec"><div class="wrap"><div class="fr-num">${nums.map((x) => x.valor !== void 0 ? contador(x.valor, x.rotulo, "fr-ct") : `<div class="fr-ct"><b>${x.texto}</b><span>${esc(x.rotulo)}</span></div>`).join("")}</div></div></section>` : ""}
${vozes(d, "nr-vozes")}
<section class="fr-vip" id="contato"><div class="wrap"><div class="fr-vip-in vidro rev"><p class="fr-rot">Lista VIP</p><h2>Receba novidades em <em style="color:var(--ouro)">primeira m\xE3o</em></h2><p>Chame no WhatsApp e entre para a lista de quem recebe lan\xE7amentos e condi\xE7\xF5es especiais.</p>
  <div class="fr-btns">${ctaPrincipal(d, "Quero entrar na lista", "fr-ouro")}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div></div></div></section>
<footer class="fr-perg"><div class="wrap"><div class="fr-perg-in"><div><b>${esc(d.empresa)}</b>${d.slogan ? `<p>${esc(d.slogan)}</p>` : ""}</div><div><h4>Contato</h4>${contatoLinhas2(d, "fr-lin").replace(/<svg[\s\S]*?<\/svg>/g, "")}</div></div>
  <div class="fr-perg-fim">\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} ${esc(d.empresa)}${d.cidade ? ` \xB7 ${esc(d.cidade)}` : ""}</div></div></footer>
`, true, true);
  }
};
var arquitetura = {
  id: "arquitetura",
  nome: "Arquitetura em Camadas",
  descricao: "O nome da marca gigante atr\xE1s de uma laje em parallax, p\xEDlulas de navega\xE7\xE3o e pain\xE9is de vidro fosco. Para arquitetura, imobili\xE1rias, engenharia e decora\xE7\xE3o.",
  nichos: ["Arquitetura", "Imobili\xE1rias", "Engenharia", "Decora\xE7\xE3o", "Paisagismo", "Construtoras", "Design de interiores"],
  miniatura: miniaturaCinema("escuro", "camadas"),
  render: (d) => {
    const [capaTxt, sobreTxt] = partirSobre(d, "Espa\xE7os pensados com m\xE9todo, luz e prop\xF3sito.", "Do primeiro tra\xE7o \xE0 entrega, cada decis\xE3o serve a quem vai viver o espa\xE7o.");
    const servicos = servicosValidos(d);
    const capa = fotoDe(d, 0), foto2 = fotoDe(d, 1) || capa;
    const nums = numerosReais(d);
    const fotosGal = imagens(d);
    return documentoCinema(d, PARES.syne, `
${cssBaseEscura(d, "#0b0c0e")}
${cssNavVidro("nv")}
${cssRodapeEscuro("rd")}
${cssVozesEscuras("Syne")}
.ar-hero{position:relative;min-height:112svh;overflow:hidden;isolation:isolate;display:grid;align-items:end}
.ar-bg{position:absolute;inset:-6% 0;z-index:-3;background-size:cover;background-position:center}
.ar-bg.tem-foto{animation:kb 28s ease-in-out infinite alternate}
.ar-hero::before{content:"";position:absolute;inset:0;z-index:-2;background:linear-gradient(180deg,rgba(11,12,14,.55),rgba(11,12,14,.15) 40%,rgba(11,12,14,.9))}
.ar-gigante{position:absolute;z-index:-1;left:50%;top:26%;transform:translateX(-50%);width:max-content;max-width:150vw;font-family:var(--fonte-t);font-weight:800;text-transform:uppercase;font-size:clamp(70px,19vw,320px);letter-spacing:-.06em;line-height:.8;white-space:nowrap;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.35);opacity:.9}
@supports (animation-timeline:view()){.ar-gigante{animation:ar-sobe linear both;animation-timeline:view();animation-range:exit 0% exit 100%}}
@keyframes ar-sobe{to{transform:translateX(-50%) translateY(-18vh);opacity:.2}}
.ar-laje{position:relative;margin:0 auto;width:min(980px,86vw);aspect-ratio:16/8;border-radius:var(--raio);overflow:hidden;border:1px solid rgba(255,255,255,.2);box-shadow:0 60px 120px -40px rgba(0,0,0,.8);transform:translateY(0)}
.ar-laje .par{position:absolute;inset:-10%;background-size:cover;background-position:center}
.ar-info{display:grid;grid-template-columns:1fr auto;gap:30px;align-items:end;padding:44px 0 clamp(50px,6vw,84px)}
.ar-pre{font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:var(--c2c);margin:0 0 16px}
.ar-h1{font-family:var(--fonte-t);font-weight:700;font-size:clamp(30px,4.8vw,70px);line-height:1;letter-spacing:-.04em;margin:0;max-width:20ch}
.ar-painel{padding:26px 28px;max-width:340px}.ar-painel p{margin:0 0 18px;color:rgba(255,255,255,.8);font-size:15.5px;line-height:1.65}
.sec{padding:clamp(70px,10vw,150px) 0}
.ar-rot{font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:var(--c2c);margin:0 0 18px}
.ar-t{font-family:var(--fonte-t);font-weight:700;font-size:clamp(32px,5vw,70px);line-height:1;letter-spacing:-.045em;margin:0 0 clamp(26px,4vw,50px);max-width:18ch}
.ar-sobre .wrap{display:grid;grid-template-columns:1fr 1.1fr;gap:clamp(30px,6vw,100px);align-items:start}
.ar-sobre p:not(.ar-rot){font-size:clamp(17px,1.5vw,20px);line-height:1.8;color:rgba(255,255,255,.76)}
.ar-lista{border-top:1px solid var(--linha)}
.ar-lin{display:grid;grid-template-columns:70px 1fr 1.2fr;gap:24px;align-items:baseline;padding:30px 0;border-bottom:1px solid var(--linha);transition:padding .5s var(--ease),background .4s}
.ar-lin:hover{padding-left:18px;background:linear-gradient(90deg,color-mix(in srgb,var(--c2) 9%,transparent),transparent)}
.ar-lin .n{font-weight:700;color:var(--c2c);font-size:14px;letter-spacing:.14em}
.ar-lin h3{font-family:var(--fonte-t);font-weight:700;font-size:clamp(22px,2.6vw,36px);letter-spacing:-.035em;margin:0}.ar-lin p{margin:0;color:var(--mudo)}
.ar-seg{position:relative;min-height:100svh;display:grid;place-items:center;text-align:center;overflow:hidden;isolation:isolate}
.ar-seg .par{position:absolute;inset:-12% 0;z-index:-2;background-size:cover;background-position:center}
.ar-seg::before{content:"";position:absolute;inset:0;z-index:-1;background:rgba(11,12,14,.6)}
.ar-seg h2{font-family:var(--fonte-t);font-weight:700;font-size:clamp(40px,8vw,128px);line-height:.95;letter-spacing:-.05em;max-width:14ch;margin:0 auto 26px}
.ar-gal{display:grid;grid-template-columns:repeat(12,1fr);gap:14px}
.ar-gal figure{margin:0;border-radius:var(--raio);overflow:hidden;border:1px solid var(--linha)}.ar-gal img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease)}.ar-gal figure:hover img{transform:scale(1.06)}
.ar-gal figure:nth-child(1){grid-column:span 7;aspect-ratio:16/10}.ar-gal figure:nth-child(2){grid-column:span 5;aspect-ratio:4/5}.ar-gal figure:nth-child(3){grid-column:span 5;aspect-ratio:4/5}.ar-gal figure:nth-child(4){grid-column:span 7;aspect-ratio:16/10}
.ar-num{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));border-block:1px solid var(--linha)}
.ar-ct{padding:40px 28px;border-left:1px solid var(--linha)}.ar-ct:first-child{border-left:0}
.ar-ct b{display:block;font-family:var(--fonte-t);font-weight:700;font-size:clamp(54px,7vw,104px);letter-spacing:-.06em;line-height:1}.ar-ct span{color:var(--mudo);font-size:14px}
.ar-fim .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:clamp(30px,5vw,80px);align-items:center}
.ar-fim h2{font-family:var(--fonte-t);font-weight:700;font-size:clamp(38px,6vw,92px);line-height:.95;letter-spacing:-.05em;margin:0 0 24px}
.ar-cont{padding:34px}.ar-cont p{display:flex;gap:14px;margin:0 0 14px;color:#ececf1}.ar-cont svg{flex:none;margin-top:3px;color:var(--c2c)}
@media(max-width:900px){.ar-info,.ar-sobre .wrap,.ar-fim .wrap{grid-template-columns:1fr}.ar-lin{grid-template-columns:44px 1fr}.ar-lin p{grid-column:2}.ar-gal figure{grid-column:span 12!important}.ar-ct{border-left:0;border-top:1px solid var(--linha)}.ar-ct:first-child{border-top:0}.ar-gigante{top:18%}}
`, `
${nav(d, [["#projeto", "Sobre"], ["#servicos", "Servi\xE7os"], ["#contato", "Contato"]])}
<section class="ar-hero"><div class="${classeImagem(capa, "ar-bg")}" style="${fundoImagem(capa, 2)}"></div><div class="ar-gigante" aria-hidden="true">${esc(d.empresa.split(/\s+/).slice(0, 2).join(" "))}</div>
  <div class="wrap" style="padding-top:200px">
    <div class="ar-laje vidro"><div class="${classeImagem(foto2, "par")}" style="${fundoImagem(foto2, 0)}"></div></div>
    <div class="ar-info"><div><p class="ar-pre entra">${esc(eyebrow(d) || d.empresa)}</p><h1 class="ar-h1">${palavras(titulo(d, d.empresa), 1)}</h1></div>
      <div class="ar-painel vidro entra" style="--d:5"><p>${capaTxt}</p>${ctaPrincipal(d, "Falar com a equipe", "bt-cheio")}</div></div>
  </div></section>
<section class="sec ar-sobre" id="projeto"><div class="wrap"><div class="rev-l"><p class="ar-rot">O escrit\xF3rio</p><h2 class="ar-t">${esc(d.empresa)}</h2>${seloGoogle(d, "nr-nota vidro")}</div><div class="rev-r"><p>${sobreTxt}</p></div></div></section>
${servicos.length ? `<section class="sec" id="servicos" style="padding-top:0"><div class="wrap"><p class="ar-rot rev">\xC1reas de atua\xE7\xE3o</p><div class="ar-lista">${servicos.map((s, i) => `<article class="ar-lin rev"><span class="n">${pad25(i + 1)}</span><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></article>`).join("")}</div></div></section>` : ""}
<section class="ar-seg"><div class="${classeImagem(fotoDe(d, 2) || capa, "par")}" style="${fundoImagem(fotoDe(d, 2) || capa, 1)}"></div><div class="wrap"><h2 class="rev">${esc(d.slogan || `${d.categoria || "Projetos"} com assinatura`)}</h2>${ctaPrincipal(d, "Conversar sobre o projeto", "vidro-bt")}</div></section>
${fotosGal.length >= 4 ? `<section class="sec"><div class="wrap"><h2 class="ar-t rev">Em obra e em uso</h2><div class="ar-gal">${fotosGal.slice(0, 4).map((src, i) => `<figure class="rev"><img src="${src}" alt="${esc(d.empresa)} \u2014 projeto ${i + 1}" loading="lazy"></figure>`).join("")}</div></div></section>` : ""}
${nums.length >= 2 ? `<section><div class="wrap"><div class="ar-num">${nums.map((x) => x.valor !== void 0 ? contador(x.valor, x.rotulo, "ar-ct") : `<div class="ar-ct"><b>${x.texto}</b><span>${esc(x.rotulo)}</span></div>`).join("")}</div></div></section>` : ""}
${vozes(d, "nr-vozes")}
<section class="sec ar-fim" id="contato"><div class="wrap">
  <div class="rev-l"><p class="ar-rot">Contato</p><h2>${palavras("Vamos desenhar o seu espa\xE7o?", 0)}</h2><div style="display:flex;gap:12px;flex-wrap:wrap">${ctaPrincipal(d, "Chamar no WhatsApp", "bt-cheio")}${linkMapa(d) ? `<a class="vidro-bt" href="${linkMapa(d)}" target="_blank" rel="noopener">${ICONES.mapa}Como chegar</a>` : ""}</div></div>
  <div class="ar-cont vidro rev-r">${contatoLinhas2(d, "ar-lin2")}</div>
</div></section>
${rodape2(d, "rd")}
`, true, false);
  }
};
var LAYOUTS_CINEMA_5 = [fragrancia, arquitetura];

// src/templates/sites/textos-editaveis.ts
var desescapar = (t) => t.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
var slug = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
var IGNORAR = /\b(estrelas|logo-iniciais|rp-logo-iniciais|zap-fixo|num|n)\b/;
var camposDoFormulario = (d) => {
  const m = /* @__PURE__ */ new Map();
  const por = (chave, valor) => {
    const v = (valor || "").trim();
    if (v && !m.has(v)) m.set(v, chave);
  };
  por("empresa", d.empresa);
  por("slogan", d.slogan);
  por("categoria", d.categoria);
  por("sobre", d.sobre);
  por("horario", d.horario);
  por("endereco", d.endereco);
  por("telefone", d.telefone);
  (d.servicos || []).forEach((s, i) => {
    por(`servicos.${i}.titulo`, s.titulo);
    por(`servicos.${i}.descricao`, s.descricao);
  });
  (d.depoimentos || []).forEach((x, i) => {
    por(`depoimentos.${i}.texto`, x.texto);
    por(`depoimentos.${i}.autor`, x.autor);
  });
  return m;
};
var FOLHA = /<(h1|h2|h3|h4|p|span|a|figcaption|blockquote|summary|b|em|label|div)(\s[^>]*)?>([^<]{1,700})<\/\1>/g;
var APOS_ICONE = /(<\/svg>)([^<]{2,90})(<\/a>)/g;
function aplicarTextos(html, d) {
  const corte = html.indexOf("<body>");
  if (corte < 0) return html;
  const cabeca = html.slice(0, corte), corpo = html.slice(corte);
  const formulario = camposDoFormulario(d);
  const sobrescritos = d.textos || {};
  const vezes = /* @__PURE__ */ new Map();
  const chaveDe = (texto) => {
    const original = desescapar(texto).trim();
    const doFormulario = formulario.get(original);
    if (doFormulario) return doFormulario;
    const base = `t.${slug(original)}`;
    const n = (vezes.get(base) || 0) + 1;
    vezes.set(base, n);
    return n === 1 ? base : `${base}.${n}`;
  };
  const conteudo = (chave, original) => Object.prototype.hasOwnProperty.call(sobrescritos, chave) ? esc(sobrescritos[chave]) : original;
  let saida = corpo.replace(FOLHA, (todo, tag, attrs = "", texto) => {
    if (!/[A-Za-zÀ-ú]/.test(texto) || IGNORAR.test(attrs) || attrs.includes("data-campo") || attrs.includes("leadsageofc")) return todo;
    const chave = chaveDe(texto);
    return `<${tag}${attrs} data-campo="${chave}">${conteudo(chave, texto)}</${tag}>`;
  });
  saida = saida.replace(APOS_ICONE, (todo, svgFim, texto, fim2) => {
    if (!/[A-Za-zÀ-ú]/.test(texto)) return todo;
    const chave = chaveDe(texto);
    return `${svgFim}<span data-campo="${chave}">${conteudo(chave, texto)}</span>${fim2}`;
  });
  return cabeca + saida;
}

// src/templates/sites/layouts.ts
var servicosValidos2 = (d) => d.servicos.filter((s) => s.titulo.trim());
var temDepoimento = (d) => (d.depoimentos || []).some((x) => x.texto?.trim());
var vazio2 = (texto) => `<p style="grid-column:1/-1;text-align:center;color:#9ca3af">${texto}</p>`;
var botoesContato = (d, classe = "btn-principal") => {
  const zap = linkWhatsapp(d.whatsapp || d.telefone, d.empresa);
  const tel = digitos(d.telefone);
  return `
    ${zap ? `<a class="btn ${classe}" href="${zap}" target="_blank" rel="noopener">Falar no WhatsApp</a>` : ""}
    ${tel ? `<a class="btn btn-vazado" href="tel:+${tel}">Ligar agora</a>` : ""}`;
};
var fotoOuTextura = (src, d, alt) => src ? `<img src="${src}" alt="${esc(alt)}">` : `<div style="width:100%;height:100%;${fundoDeCapa({ ...d, capa: void 0 })}"></div>`;
var vitrine = {
  id: "vitrine",
  nome: "Vitrine",
  descricao: "Foto grande no topo, produtos em destaque e prova social. Para quem vende olhando o cliente.",
  nichos: ["Padarias", "Restaurantes", "Pizzarias", "Cafeterias", "Lojas", "Pet Shops", "Floriculturas"],
  miniatura: ({ corPrimaria, corDestaque }) => `
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="120" fill="#fff"/>
      <rect width="160" height="11" fill="#fff" stroke="#e5e7eb" stroke-width="0.5"/>
      <circle cx="11" cy="5.5" r="3.2" fill="${corPrimaria}"/>
      <rect x="122" y="3" width="28" height="5.5" rx="2.75" fill="${corPrimaria}"/>
      <rect x="0" y="11" width="160" height="48" fill="${corPrimaria}"/>
      <rect x="0" y="11" width="160" height="48" fill="#000" opacity="0.22"/>
      <rect x="13" y="20" width="34" height="6" rx="3" fill="#fff" opacity="0.35"/>
      <rect x="13" y="31" width="78" height="8" rx="4" fill="#fff" opacity="0.95"/>
      <rect x="13" y="45" width="28" height="7" rx="3.5" fill="${corDestaque}"/>
      <rect x="0" y="59" width="160" height="10" fill="${corPrimaria}" opacity="0.85"/>
      <rect x="13" y="76" width="31" height="21" rx="3" fill="#eef0f3"/>
      <rect x="46" y="76" width="31" height="21" rx="3" fill="#eef0f3"/>
      <rect x="79" y="76" width="31" height="21" rx="3" fill="#eef0f3"/>
      <rect x="112" y="76" width="31" height="21" rx="3" fill="#eef0f3"/>
      <rect x="0" y="104" width="160" height="16" fill="#0f172a"/>
    </svg>`,
  render: (d) => documento(
    d,
    cssMidia + `
.topo{position:sticky;top:0;background:rgba(255,255,255,.9);backdrop-filter:blur(12px);
  border-bottom:1px solid var(--linha);z-index:40}
.topo .container{display:flex;align-items:center;justify-content:space-between;padding:14px 0;gap:16px}

.heroi{position:relative;min-height:min(76vh,620px);display:flex;align-items:flex-end;
  color:#fff;padding-bottom:clamp(44px,7vw,84px)}
.heroi .container{position:relative;z-index:2}
.heroi .etiqueta{display:inline-block;background:rgba(255,255,255,.15);
  border:1px solid rgba(255,255,255,.3);backdrop-filter:blur(6px);
  padding:7px 16px;border-radius:999px;font-size:13px;font-weight:600;margin-bottom:20px}
.heroi h1{font-size:clamp(34px,6.2vw,62px);letter-spacing:-1.4px;max-width:16ch;
  text-shadow:0 2px 24px rgba(0,0,0,.35);margin-bottom:18px}
.heroi p{font-size:clamp(16px,2vw,20px);max-width:52ch;opacity:.95;margin-bottom:32px}
.heroi .btn-vazado{color:#fff;border-color:rgba(255,255,255,.55)}

.tiras{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
  background:var(--primaria);color:var(--sobre-primaria)}
.tiras div{padding:22px 20px;text-align:center;border-right:1px solid rgba(255,255,255,.16)}
.tiras div:last-child{border-right:0}
.tiras strong{display:block;font-size:12px;letter-spacing:1.6px;text-transform:uppercase;
  opacity:.7;margin-bottom:5px}

.grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:22px}
.cartao{background:#fff;border:1px solid var(--linha);border-radius:20px;padding:30px 26px;
  position:relative;overflow:hidden;transition:transform .25s ease,box-shadow .25s ease}
.cartao::before{content:'';position:absolute;top:0;left:0;width:100%;height:3px;
  background:var(--destaque);transform:scaleX(0);transform-origin:left;transition:transform .3s ease}
.cartao:hover{transform:translateY(-4px);box-shadow:0 20px 44px -24px rgba(16,24,40,.4)}
.cartao:hover::before{transform:scaleX(1)}
.cartao-num{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;
  border-radius:12px;background:var(--primaria-clara);color:var(--primaria);
  font-weight:800;font-size:14px;margin-bottom:16px}
.cartao h3{font-size:19px;margin:0 0 8px}
.cartao p{color:var(--tinta-suave);margin:0;font-size:15px}

.sobre{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,64px);align-items:center}
.sobre figure{aspect-ratio:4/3;box-shadow:0 34px 64px -34px rgba(16,24,40,.45)}
.sobre .selo{display:inline-block;background:var(--destaque);color:var(--sobre-destaque);
  padding:6px 14px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:1.2px;
  text-transform:uppercase;margin-bottom:14px}
.sobre h2{font-size:clamp(26px,3.6vw,38px);text-align:left;margin-bottom:14px}
.sobre p{color:var(--tinta-suave);font-size:16.5px}
.sobre .dado{margin:0 0 4px;font-size:15px}

.chamada{background:linear-gradient(135deg,var(--primaria),var(--primaria-escura));
  color:var(--sobre-primaria);text-align:center;padding:clamp(56px,8vw,86px) 0}
.chamada h2{font-size:clamp(26px,4vw,40px);margin-bottom:12px}
.chamada p{opacity:.9;max-width:46ch;margin:0 auto 30px}
.chamada .btn-vazado{color:var(--sobre-primaria);border-color:var(--sobre-primaria)}

@media(max-width:820px){
  .sobre{grid-template-columns:1fr}
  .heroi{min-height:66vh}
}
`,
    `
<header class="topo">
  <div class="container">
    <a class="marca" href="#">${marca(d, 40)}<span>${esc(d.empresa)}</span></a>
    ${digitos(d.telefone) ? `<a class="btn btn-principal" style="padding:10px 20px" href="tel:+${digitos(d.telefone)}">${esc(d.telefone)}</a>` : ""}
  </div>
</header>

<section class="heroi" style="${fundoDeCapa(d)}">
  <div class="container">
    ${d.categoria ? `<span class="etiqueta">${esc(d.categoria)}${d.endereco ? ` &middot; ${esc(d.endereco.split(",")[0])}` : ""}</span>` : ""}
    <h1>${esc(d.slogan || d.empresa)}</h1>
    ${d.sobre ? `<p>${esc(d.sobre)}</p>` : ""}
    <div style="display:flex;gap:14px;flex-wrap:wrap">${botoesContato(d, "btn-destaque")}</div>
  </div>
</section>

<div class="tiras">
  ${d.horario ? `<div><strong>Hor\xE1rio</strong>${esc(d.horario)}</div>` : ""}
  ${d.endereco ? `<div><strong>Onde estamos</strong>${esc(d.endereco)}</div>` : ""}
  ${d.telefone ? `<div><strong>Pedidos</strong>${esc(d.telefone)}</div>` : ""}
</div>

<section class="secao">
  <div class="container">
    <h2 class="titulo-secao">O que oferecemos</h2>
    <p class="sub-secao">Feito todo dia, do jeito que o cliente espera.</p>
    <div class="grade">
      ${servicosValidos2(d).map((s, i) => `<article class="cartao">
        <span class="cartao-num">${String(i + 1).padStart(2, "0")}</span>
        <h3>${esc(s.titulo)}</h3>
        <p>${esc(s.descricao)}</p>
      </article>`).join("") || vazio2("Adicione os servi\xE7os no editor.")}
    </div>
  </div>
</section>

${temGaleria(d) ? `<section class="secao secao-suave">
  <div class="container">
    <h2 class="titulo-secao">Um pouco do nosso trabalho</h2>
    <p class="sub-secao">Imagens reais de quem faz.</p>
    ${galeria(d)}
  </div>
</section>` : ""}

<section class="secao">
  <div class="container sobre">
    <figure>${fotoOuTextura(d.fotoSobre, d, d.empresa)}</figure>
    <div>
      <span class="selo">Sobre n\xF3s</span>
      <h2>${esc(d.empresa)}</h2>
      ${d.sobre ? `<p>${esc(d.sobre)}</p>` : ""}
      ${d.endereco ? `<p class="dado"><strong>Onde:</strong> ${esc(d.endereco)}</p>` : ""}
      ${d.horario ? `<p class="dado"><strong>Quando:</strong> ${esc(d.horario)}</p>` : ""}
    </div>
  </div>
</section>

${temDepoimento(d) ? `<section class="secao secao-suave">
  <div class="container">
    <h2 class="titulo-secao">Quem j\xE1 provou</h2>
    <p class="sub-secao">O que dizem nossos clientes.</p>
    ${depoimentos(d)}
  </div>
</section>` : ""}

<section class="chamada">
  <div class="container">
    <h2>Vamos fazer o seu pedido?</h2>
    <p>${d.horario ? esc(d.horario) : "Chame no WhatsApp e a gente responde na hora."}</p>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">${botoesContato(d, "btn-destaque")}</div>
  </div>
</section>

${rodape(d)}`
  )
};
var profissional = {
  id: "profissional",
  nome: "Profissional",
  descricao: "Topo dividido com foto, credenciais em destaque e agendamento. Para quem vende confian\xE7a.",
  nichos: ["Cl\xEDnicas M\xE9dicas", "Cl\xEDnicas Odontol\xF3gicas", "Advogados", "Contabilidades", "Consultorias", "Nutricionistas", "Fisioterapeutas"],
  miniatura: ({ corPrimaria, corDestaque }) => `
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="120" fill="#fff"/>
      <rect width="160" height="12" fill="#fff" stroke="#e5e7eb" stroke-width="0.5"/>
      <rect x="10" y="4" width="26" height="5" rx="2.5" fill="${corPrimaria}"/>
      <rect x="120" y="3" width="30" height="6" rx="3" fill="${corPrimaria}"/>
      <rect x="10" y="24" width="20" height="4" rx="2" fill="${corDestaque}"/>
      <rect x="10" y="33" width="62" height="8" rx="4" fill="#1f2937"/>
      <rect x="10" y="46" width="52" height="3.5" rx="1.75" fill="#cbd5e1"/>
      <rect x="10" y="53" width="40" height="3.5" rx="1.75" fill="#cbd5e1"/>
      <rect x="10" y="63" width="32" height="7" rx="3.5" fill="${corPrimaria}"/>
      <rect x="88" y="20" width="62" height="56" rx="6" fill="${corPrimaria}" opacity="0.3"/>
      <rect x="0" y="84" width="160" height="9" fill="#f3f4f6"/>
      <rect x="10" y="86.5" width="26" height="4" rx="2" fill="#9ca3af"/>
      <rect x="46" y="86.5" width="26" height="4" rx="2" fill="#9ca3af"/>
      <rect x="82" y="86.5" width="26" height="4" rx="2" fill="#9ca3af"/>
      <rect x="0" y="100" width="160" height="20" fill="${corPrimaria}"/>
    </svg>`,
  render: (d) => documento(
    d,
    cssMidia + `
.topo{background:#fff;border-bottom:1px solid var(--linha);position:sticky;top:0;z-index:40}
.topo .container{display:flex;align-items:center;justify-content:space-between;padding:18px 0;gap:16px}

.heroi{display:grid;grid-template-columns:1.05fr .95fr;align-items:center;
  gap:clamp(28px,5vw,60px);padding:clamp(52px,7vw,86px) 0}
.heroi .rotulo{color:var(--destaque);font-weight:800;letter-spacing:2px;
  text-transform:uppercase;font-size:12.5px}
.heroi h1{font-size:clamp(30px,4.4vw,50px);letter-spacing:-1px;margin:14px 0 18px}
.heroi p{color:var(--tinta-suave);font-size:17.5px;max-width:50ch;margin-bottom:30px}
.heroi figure{aspect-ratio:4/5;border-radius:24px;
  box-shadow:0 40px 70px -40px rgba(16,24,40,.5)}

.credenciais{background:var(--fundo-suave);border-top:1px solid var(--linha);
  border-bottom:1px solid var(--linha)}
.credenciais .container{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));
  gap:6px;padding:26px 0}
.credenciais div{padding:8px 20px;border-left:3px solid var(--destaque)}
.credenciais strong{display:block;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;
  color:var(--primaria);margin-bottom:3px}
.credenciais span{color:var(--tinta-suave);font-size:15px}

.lista-servicos{display:grid;gap:2px;background:var(--linha);
  border:1px solid var(--linha);border-radius:20px;overflow:hidden}
.lista-servicos article{background:#fff;padding:28px 30px;display:grid;
  grid-template-columns:auto 1fr;gap:22px;align-items:start;transition:background .2s ease}
.lista-servicos article:hover{background:var(--fundo-suave)}
.lista-servicos .marcador{width:42px;height:42px;border-radius:50%;background:var(--primaria);
  color:var(--sobre-primaria);display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:15px}
.lista-servicos h3{font-size:18px;margin:0 0 6px;color:var(--primaria)}
.lista-servicos p{color:var(--tinta-suave);margin:0;font-size:15.5px}

.sobre{display:grid;grid-template-columns:.9fr 1.1fr;gap:clamp(28px,5vw,60px);align-items:center}
.sobre figure{aspect-ratio:1;border-radius:24px;box-shadow:0 30px 60px -34px rgba(16,24,40,.4)}
.sobre h2{text-align:left;font-size:clamp(25px,3.4vw,36px)}
.sobre p{color:var(--tinta-suave);font-size:16.5px}

.cta{background:var(--primaria);color:var(--sobre-primaria);text-align:center;
  padding:clamp(56px,8vw,84px) 0}
.cta h2{font-size:clamp(26px,3.8vw,38px)}
.cta p{opacity:.9;max-width:46ch;margin:0 auto 28px}
.cta .btn-vazado{color:var(--sobre-primaria);border-color:var(--sobre-primaria)}

@media(max-width:880px){
  .heroi,.sobre{grid-template-columns:1fr}
  .heroi figure{aspect-ratio:16/10;order:-1}
}
`,
    `
<header class="topo">
  <div class="container">
    <a class="marca" href="#">${marca(d, 42)}<span>${esc(d.empresa)}</span></a>
    ${linkWhatsapp(d.whatsapp || d.telefone, d.empresa) ? `<a class="btn btn-principal" style="padding:11px 22px" href="${linkWhatsapp(d.whatsapp || d.telefone, d.empresa)}" target="_blank" rel="noopener">Agendar</a>` : ""}
  </div>
</header>

<section class="container heroi">
  <div>
    <span class="rotulo">${esc(d.categoria || "Atendimento especializado")}</span>
    <h1>${esc(d.slogan || d.empresa)}</h1>
    ${d.sobre ? `<p>${esc(d.sobre)}</p>` : ""}
    <div style="display:flex;gap:12px;flex-wrap:wrap">${botoesContato(d)}</div>
  </div>
  <figure>${fotoOuTextura(d.capa, d, d.empresa)}</figure>
</section>

<div class="credenciais">
  <div class="container">
    ${d.endereco ? `<div><strong>Endere\xE7o</strong><span>${esc(d.endereco)}</span></div>` : ""}
    ${d.horario ? `<div><strong>Atendimento</strong><span>${esc(d.horario)}</span></div>` : ""}
    ${d.telefone ? `<div><strong>Contato</strong><span>${esc(d.telefone)}</span></div>` : ""}
  </div>
</div>

<section class="secao">
  <div class="container">
    <h2 class="titulo-secao">Como podemos ajudar</h2>
    <p class="sub-secao">Servi\xE7os pensados para o seu caso.</p>
    <div class="lista-servicos">
      ${servicosValidos2(d).map((s, i) => `<article>
        <span class="marcador">${String(i + 1).padStart(2, "0")}</span>
        <div><h3>${esc(s.titulo)}</h3><p>${esc(s.descricao)}</p></div>
      </article>`).join("") || `<article><div>${vazio2("Adicione os servi\xE7os no editor.")}</div></article>`}
    </div>
  </div>
</section>

<section class="secao secao-suave">
  <div class="container sobre">
    <figure>${fotoOuTextura(d.fotoSobre, d, d.empresa)}</figure>
    <div>
      <h2>Sobre ${esc(d.empresa)}</h2>
      ${d.sobre ? `<p>${esc(d.sobre)}</p>` : ""}
      ${linkInstagram(d.instagram) ? `<p><a href="${linkInstagram(d.instagram)}" target="_blank" rel="noopener" style="color:var(--primaria);font-weight:700">${esc(d.instagram)}</a></p>` : ""}
    </div>
  </div>
</section>

${temGaleria(d) ? `<section class="secao">
  <div class="container">
    <h2 class="titulo-secao">Nossa estrutura</h2>
    <p class="sub-secao">Onde voc\xEA ser\xE1 atendido.</p>
    ${galeria(d)}
  </div>
</section>` : ""}

${temDepoimento(d) ? `<section class="secao secao-suave">
  <div class="container">
    <h2 class="titulo-secao">Quem j\xE1 foi atendido</h2>
    <p class="sub-secao">Relatos de pacientes e clientes.</p>
    ${depoimentos(d)}
  </div>
</section>` : ""}

<section class="cta">
  <div class="container">
    <h2>Vamos conversar?</h2>
    <p>${d.horario ? esc(d.horario) : "Entre em contato e agende um hor\xE1rio."}</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">${botoesContato(d, "btn-destaque")}</div>
  </div>
</section>

${rodape(d)}`
  )
};
var servicoLocal = {
  id: "servico-local",
  nome: "Servi\xE7o Local",
  descricao: "Telefone gritando do topo ao rodap\xE9, com portf\xF3lio de trabalhos. Para quem \xE9 chamado com urg\xEAncia.",
  nichos: ["Mec\xE2nicas", "Oficinas", "Empreiteiras", "Materiais de Constru\xE7\xE3o", "Chaveiros", "Transportadoras", "Marcenarias"],
  miniatura: ({ corPrimaria, corDestaque }) => `
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="120" fill="#fff"/>
      <rect width="160" height="14" fill="${corDestaque}"/>
      <rect x="48" y="5" width="64" height="5" rx="2.5" fill="#fff" opacity="0.9"/>
      <rect x="0" y="14" width="160" height="46" fill="${corPrimaria}"/>
      <rect x="0" y="14" width="160" height="46" fill="#000" opacity="0.15"/>
      <rect x="12" y="24" width="86" height="9" rx="4" fill="#fff" opacity="0.95"/>
      <rect x="12" y="38" width="58" height="4" rx="2" fill="#fff" opacity="0.55"/>
      <rect x="12" y="47" width="36" height="7" rx="3.5" fill="${corDestaque}"/>
      <rect x="12" y="68" width="44" height="24" rx="3" fill="#f3f4f6"/>
      <rect x="12" y="68" width="3" height="24" fill="${corDestaque}"/>
      <rect x="60" y="68" width="44" height="24" rx="3" fill="#f3f4f6"/>
      <rect x="60" y="68" width="3" height="24" fill="${corDestaque}"/>
      <rect x="108" y="68" width="40" height="24" rx="3" fill="#f3f4f6"/>
      <rect x="108" y="68" width="3" height="24" fill="${corDestaque}"/>
      <rect x="0" y="98" width="160" height="22" fill="#0f172a"/>
      <rect x="46" y="105" width="68" height="8" rx="4" fill="${corDestaque}"/>
    </svg>`,
  render: (d) => documento(
    d,
    cssMidia + `
.barra{background:var(--destaque);color:var(--sobre-destaque);text-align:center;
  padding:12px 0;font-weight:800;font-size:15px;letter-spacing:.3px}
.barra a{text-decoration:none}
.topo{background:var(--primaria);color:var(--sobre-primaria)}
.topo .container{display:flex;align-items:center;justify-content:space-between;
  padding:20px 0;gap:16px;flex-wrap:wrap}

.heroi{position:relative;color:#fff;padding:clamp(52px,8vw,96px) 0 clamp(60px,9vw,108px)}
.heroi .container{position:relative;z-index:2}
.heroi h1{font-size:clamp(32px,5.6vw,58px);max-width:18ch;letter-spacing:-1.2px;
  text-shadow:0 2px 20px rgba(0,0,0,.35)}
.heroi p{font-size:clamp(16px,2vw,19px);max-width:50ch;opacity:.95;margin-bottom:30px}
.heroi .btn-vazado{color:#fff;border-color:rgba(255,255,255,.55)}
.selos{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:22px}
.selos span{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.26);
  padding:6px 14px;border-radius:8px;font-size:13px;font-weight:600}

.grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
.cartao{background:#fff;border:1px solid var(--linha);border-left:4px solid var(--destaque);
  border-radius:0 16px 16px 0;padding:26px;transition:transform .2s ease,box-shadow .2s ease}
.cartao:hover{transform:translateX(4px);box-shadow:0 16px 34px -20px rgba(16,24,40,.4)}
.cartao-num{color:var(--destaque);font-weight:800;font-size:12px;letter-spacing:2px}
.cartao h3{font-size:18px;margin:8px 0 6px}
.cartao p{color:var(--tinta-suave);margin:0;font-size:15px}

.telefonao{background:#0f172a;color:#fff;text-align:center;padding:clamp(56px,8vw,80px) 0}
.telefonao .aviso{opacity:.7;letter-spacing:2.4px;text-transform:uppercase;font-size:12.5px}
.telefonao .numero{font-size:clamp(30px,6vw,56px);font-weight:900;color:var(--destaque);
  text-decoration:none;display:block;margin:12px 0 20px;letter-spacing:-1px}
.telefonao p{color:#94a3b8;margin:0}

.atendimento{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}
.atendimento div{background:#fff;border:1px solid var(--linha);border-radius:16px;padding:24px}
.atendimento strong{display:block;color:var(--primaria);font-size:12.5px;letter-spacing:1.4px;
  text-transform:uppercase;margin-bottom:6px}
`,
    `
${digitos(d.telefone) ? `<div class="barra"><a href="tel:+${digitos(d.telefone)}">Atendimento agora: ${esc(d.telefone)}</a></div>` : ""}

<header class="topo">
  <div class="container">
    <a class="marca" href="#" style="color:var(--sobre-primaria)">${marca(d, 40)}<span>${esc(d.empresa)}</span></a>
    ${d.horario ? `<span style="opacity:.9;font-size:14px">${esc(d.horario)}</span>` : ""}
  </div>
</header>

<section class="heroi" style="${fundoDeCapa(d)}">
  <div class="container">
    <div class="selos">
      ${d.categoria ? `<span>${esc(d.categoria)}</span>` : ""}
      ${d.endereco ? `<span>${esc(d.endereco.split(",")[0])}</span>` : ""}
      ${d.horario ? `<span>${esc(d.horario)}</span>` : ""}
    </div>
    <h1>${esc(d.slogan || d.empresa)}</h1>
    ${d.sobre ? `<p>${esc(d.sobre)}</p>` : ""}
    <div style="display:flex;gap:12px;flex-wrap:wrap">${botoesContato(d, "btn-destaque")}</div>
  </div>
</section>

<section class="secao">
  <div class="container">
    <h2 class="titulo-secao">Nossos servi\xE7os</h2>
    <p class="sub-secao">Resolvemos com rapidez e sem enrola\xE7\xE3o.</p>
    <div class="grade">
      ${servicosValidos2(d).map((s, i) => `<article class="cartao">
        <span class="cartao-num">${String(i + 1).padStart(2, "0")}</span>
        <h3>${esc(s.titulo)}</h3>
        <p>${esc(s.descricao)}</p>
      </article>`).join("") || vazio2("Adicione os servi\xE7os no editor.")}
    </div>
  </div>
</section>

${temGaleria(d) ? `<section class="secao secao-suave">
  <div class="container">
    <h2 class="titulo-secao">Trabalhos que j\xE1 fizemos</h2>
    <p class="sub-secao">Servi\xE7o entregue \xE9 o melhor argumento.</p>
    ${galeria(d)}
  </div>
</section>` : ""}

${digitos(d.telefone) ? `<section class="telefonao">
  <div class="container">
    <span class="aviso">Precisa agora?</span>
    <a class="numero" href="tel:+${digitos(d.telefone)}">${esc(d.telefone)}</a>
    ${d.horario ? `<p>${esc(d.horario)}</p>` : ""}
  </div>
</section>` : ""}

<section class="secao">
  <div class="container">
    <h2 class="titulo-secao">Onde atendemos</h2>
    <p class="sub-secao">Fale com a gente pelo canal que preferir.</p>
    <div class="atendimento">
      ${d.endereco ? `<div><strong>Endere\xE7o</strong>${esc(d.endereco)}</div>` : ""}
      ${d.telefone ? `<div><strong>Telefone</strong>${esc(d.telefone)}</div>` : ""}
      ${d.email ? `<div><strong>E-mail</strong>${esc(d.email)}</div>` : ""}
      ${d.horario ? `<div><strong>Hor\xE1rio</strong>${esc(d.horario)}</div>` : ""}
    </div>
  </div>
</section>

${temDepoimento(d) ? `<section class="secao secao-suave">
  <div class="container">
    <h2 class="titulo-secao">Quem j\xE1 chamou</h2>
    <p class="sub-secao">Clientes que voltaram.</p>
    ${depoimentos(d)}
  </div>
</section>` : ""}

${rodape(d)}`
  )
};
var essencial = {
  id: "essencial",
  nome: "Essencial",
  descricao: "P\xE1gina \xFAnica escura, com mosaico de fotos. Boa como pr\xE9via r\xE1pida para mostrar ao cliente.",
  nichos: ["Barbearias", "Sal\xF5es de Beleza", "Academias", "Est\xFAdios", "Fot\xF3grafos", "Designers"],
  miniatura: ({ corPrimaria, corDestaque }) => `
    <svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="120" fill="#0b1120"/>
      <rect x="0" y="0" width="160" height="62" fill="${corPrimaria}" opacity="0.35"/>
      <circle cx="80" cy="24" r="11" fill="${corPrimaria}"/>
      <rect x="44" y="42" width="72" height="8" rx="4" fill="#fff" opacity="0.92"/>
      <rect x="56" y="54" width="48" height="3.5" rx="1.75" fill="#94a3b8"/>
      <rect x="58" y="64" width="44" height="8" rx="4" fill="${corDestaque}"/>
      <rect x="14" y="82" width="30" height="22" rx="3" fill="#1e293b"/>
      <rect x="48" y="82" width="30" height="22" rx="3" fill="#1e293b"/>
      <rect x="82" y="82" width="30" height="22" rx="3" fill="#1e293b"/>
      <rect x="116" y="82" width="30" height="22" rx="3" fill="#1e293b"/>
      <rect x="30" y="110" width="100" height="3" rx="1.5" fill="#334155"/>
    </svg>`,
  render: (d) => documento(
    d,
    cssMidia + `
body{background:#0b1120;color:#e2e8f0}
/* Fundo escuro: o bot\xE3o vazado herdaria a cor prim\xE1ria e sumiria. */
.btn-vazado{color:#e2e8f0;border-color:rgba(226,232,240,.45)}
.btn-vazado:hover{border-color:#e2e8f0}

.capa{position:relative;min-height:100vh;display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;padding:72px 5vw}
.capa::after{content:'';position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(11,17,32,.35) 0%,rgba(11,17,32,.9) 78%,#0b1120 100%)}
.capa > *{position:relative;z-index:2}
.capa .etiqueta{display:inline-block;border:1px solid rgba(226,232,240,.28);
  padding:6px 16px;border-radius:999px;font-size:12.5px;letter-spacing:2px;
  text-transform:uppercase;color:#cbd5e1;margin:22px 0 18px}
.capa h1{font-size:clamp(36px,7.5vw,72px);color:#fff;letter-spacing:-2px;margin:0 0 16px}
.capa p{font-size:clamp(16px,2.2vw,20px);color:#cbd5e1;max-width:46ch;margin:0 auto 34px}
.capa .marca-iniciais{background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.2);border-radius:20px}
.rolar{position:absolute;bottom:26px;left:50%;transform:translateX(-50%);
  color:#64748b;font-size:12px;letter-spacing:2px;text-transform:uppercase;z-index:2}

.bloco{padding:clamp(56px,9vw,110px) 0}
.bloco .container{width:min(1040px,90vw)}
.bloco h2{font-size:clamp(24px,3.6vw,38px);color:#fff;text-align:center;margin-bottom:10px}
.bloco .legenda{text-align:center;color:#94a3b8;margin-bottom:44px}

.lista{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}
.cartao{background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.09);
  border-radius:18px;padding:26px;transition:background .25s ease,transform .25s ease}
.cartao:hover{background:rgba(255,255,255,.075);transform:translateY(-3px)}
.cartao-num{color:var(--destaque);font-weight:800;font-size:12px;letter-spacing:2.2px}
.cartao h3{font-size:17px;color:#fff;margin:10px 0 7px}
.cartao p{color:#94a3b8;margin:0;font-size:14.5px}

.galeria figure{background:#1e293b;aspect-ratio:1}
.depoimentos blockquote{background:rgba(255,255,255,.045);border-color:rgba(255,255,255,.09);
  box-shadow:none}
.depoimentos p{color:#cbd5e1}
.depoimentos cite{color:#fff}

.contatos{display:flex;flex-wrap:wrap;gap:14px 34px;justify-content:center;
  color:#94a3b8;font-size:14.5px}
.contatos a{color:#e2e8f0;text-decoration:none;border-bottom:1px solid rgba(226,232,240,.25)}
.rodape{background:transparent;border-top:1px solid rgba(255,255,255,.08)}
`,
    `
<main class="capa" style="${fundoDeCapa(d)}">
  ${marca(d, 76)}
  ${d.categoria ? `<span class="etiqueta">${esc(d.categoria)}</span>` : ""}
  <h1>${esc(d.empresa)}</h1>
  ${d.slogan || d.sobre ? `<p>${esc(d.slogan || d.sobre)}</p>` : ""}
  <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">${botoesContato(d, "btn-destaque")}</div>
  <span class="rolar">Role para ver mais</span>
</main>

<section class="bloco">
  <div class="container">
    <h2>O que fazemos</h2>
    <p class="legenda">Servi\xE7os do est\xFAdio.</p>
    <div class="lista">
      ${servicosValidos2(d).map((s, i) => `<article class="cartao">
        <span class="cartao-num">${String(i + 1).padStart(2, "0")}</span>
        <h3>${esc(s.titulo)}</h3>
        <p>${esc(s.descricao)}</p>
      </article>`).join("") || vazio2("Adicione os servi\xE7os no editor.")}
    </div>
  </div>
</section>

${temGaleria(d) ? `<section class="bloco">
  <div class="container">
    <h2>Nosso trabalho</h2>
    <p class="legenda">Alguns registros recentes.</p>
    ${galeria(d)}
  </div>
</section>` : ""}

${temDepoimento(d) ? `<section class="bloco">
  <div class="container">
    <h2>O que dizem</h2>
    <p class="legenda">Clientes que voltaram.</p>
    ${depoimentos(d)}
  </div>
</section>` : ""}

<section class="bloco" style="padding-top:0">
  <div class="container">
    <div class="contatos">
      ${digitos(d.telefone) ? `<a href="tel:+${digitos(d.telefone)}">${esc(d.telefone)}</a>` : ""}
      ${d.email ? `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : ""}
      ${linkInstagram(d.instagram) ? `<a href="${linkInstagram(d.instagram)}" target="_blank" rel="noopener">${esc(d.instagram)}</a>` : ""}
      ${d.endereco ? `<span>${esc(d.endereco)}</span>` : ""}
      ${d.horario ? `<span>${esc(d.horario)}</span>` : ""}
    </div>
  </div>
</section>

${rodape(d)}`
  )
};
var SITE_TEMPLATES = [
  ...LAYOUTS_CINEMA_1,
  ...LAYOUTS_CINEMA_2,
  ...LAYOUTS_CINEMA_3,
  ...LAYOUTS_CINEMA_4,
  ...LAYOUTS_CINEMA_5,
  ...CENAS,
  ...LAYOUTS_PREMIUM,
  ...LAYOUTS_PREMIUM_2,
  vitrine,
  profissional,
  servicoLocal,
  essencial
].map((t) => ({
  ...t,
  // Todo texto marcado e com as edições do usuário aplicadas — na prévia
  // e no site publicado.
  render: (d) => {
    const p = prepararDados(d);
    return aplicarTextos(t.render(p), p);
  }
}));
var semAcento2 = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
var POR_RAMO = [
  ["aurora", ["padaria", "panific", "confeit", "cafe", "restaurante", "pizz", "lanch", "hamburg", "bistro", "doceria", "sorvet", "acai", "gastronom", "bar "]],
  ["clinica", ["odonto", "dentist", "clinic", "medic", "saude", "fisio", "nutri", "psicolog", "estetica", "harmoniz", "laborat", "farmac"]],
  ["oficina", ["mecan", "oficina", "auto", "funilar", "constru", "reforma", "eletric", "encanad", "pintor", "tinta", "serralher", "vidrac", "material"]],
  ["estudio", ["barbear", "salao", "cabelei", "beleza", "manicure", "unha", "tatuag", "tattoo", "moda", "boutique", "joalher", "maquiag", "sobrancelha"]],
  ["escritorio", ["advoga", "advoca", "juridic", "contab", "contador", "imobili", "corretor", "arquitet", "consult", "engenhar", "seguro"]],
  ["vibrante", ["academia", "fitness", "crossfit", "pilates", "pet", "veterin", "escola", "curso", "idioma", "infantil", "brinqued", "festa", "buffet", "danca", "natacao"]]
];
var sugerirTemplate = (nicho) => {
  const alvo = semAcento2(nicho);
  for (const [id, palavras2] of POR_RAMO) {
    if (palavras2.some((p) => alvo.includes(p))) return SITE_TEMPLATES.find((t) => t.id === id);
  }
  return SITE_TEMPLATES.find((t) => t.id === "clinica");
};

// src/templates/sites/previa.ts
var dadosDoLead = (lead) => {
  const base = {
    empresa: lead?.company || lead?.name || "Minha Empresa",
    // o ramo da busca ("Dentistas") casa melhor com o banco do que o cargo do contato
    categoria: lead?.niche || lead?.role || "",
    cidade: lead?.city || "",
    slogan: "",
    sobre: "",
    servicos: [
      { titulo: "", descricao: "" },
      { titulo: "", descricao: "" },
      { titulo: "", descricao: "" }
    ],
    galeria: [],
    depoimentos: [{ texto: "", autor: "" }],
    telefone: lead?.phone ? `+${String(lead.phone).replace(/^\+/, "")}` : "",
    whatsapp: lead?.whatsapp && lead?.phone ? String(lead.phone) : "",
    email: lead?.email || "",
    endereco: lead?.address || lead?.location || "",
    // a semana inteira resumida ("Seg a Sex 08:00–18:00 · Sáb ..."), não só os 3 primeiros dias
    horario: lead?.opening_hours_week?.length ? resumirSemana(lead.opening_hours_week) : lead?.opening_hours || "",
    instagram: lead?.socials?.instagram || lead?.instagram || "",
    corPrimaria: "#2563eb",
    corDestaque: "#f59e0b",
    // a nota do Google vira o selo de prova social no site
    nota: lead?.rating ?? null,
    avaliacoes: lead?.rating_count ?? null
  };
  return lead ? semearConteudo(base, { cores: true }) : base;
};
var semAcento3 = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
var POR_RAMO2 = [
  [["padaria", "panific", "confeit", "doceria", "cafe", "restaurante", "pizz", "lanch", "hamburg", "bistro", "sorvet", "acai", "gastronom", "bar "], ["editorial", "noir", "aurora"]],
  [["odonto", "dentist", "clinic", "medic", "saude", "fisio", "nutri", "psicolog", "laborat", "farmac", "veterin"], ["noir", "fintech", "premio", "clinica"]],
  [["estetica", "harmoniz", "spa", "massagem", "depila", "sobrancelha", "maquiag"], ["noir", "fragrancia", "fintech"]],
  [["barbear", "salao", "cabelei", "beleza", "manicure", "unha", "tatuag", "tattoo"], ["portfolio", "neon", "noir"]],
  [["advoga", "advoca", "juridic", "contab", "contador", "seguro", "consult"], ["premio", "fintech", "arquitetura"]],
  [["imobili", "corretor", "arquitet", "engenhar", "decoracao", "interior", "paisag", "construtora"], ["arquitetura", "premio", "b2b"]],
  [["mecan", "oficina", "auto", "funilar", "eletric", "encanad", "pintor", "serralher", "vidrac", "material", "constru", "reforma", "industri", "logist", "transport"], ["b2b", "agro", "neon"]],
  [["academia", "fitness", "crossfit", "pilates", "danca", "natacao", "evento", "festa", "buffet", "game", "noturna"], ["neon", "campus", "portfolio"]],
  [["escola", "curso", "idioma", "infantil", "coaching", "tecnolog", "software", "coworking"], ["campus", "fintech", "b2b"]],
  [["pet", "agro", "rural", "jardin", "floricult", "planta"], ["agro", "editorial", "fragrancia"]],
  [["joalher", "perfum", "boutique", "moda", "brinqued", "presente"], ["fragrancia", "noir", "editorial"]]
];
var indiceEstavel2 = (texto, n) => {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = h * 31 + texto.charCodeAt(i) >>> 0;
  return h % Math.max(1, n);
};
var escolherTemplate = (nicho, empresa) => {
  const alvo = semAcento3(nicho);
  for (const [palavras2, ids] of POR_RAMO2) {
    if (palavras2.some((p) => alvo.includes(p))) {
      const validos = ids.map((id) => SITE_TEMPLATES.find((t) => t.id === id)).filter(Boolean);
      if (validos.length) return validos[indiceEstavel2(empresa, validos.length)];
    }
  }
  const padrao = ["noir", "fintech", "premio", "editorial"].map((id) => SITE_TEMPLATES.find((t) => t.id === id)).filter(Boolean);
  return padrao.length ? padrao[indiceEstavel2(empresa, padrao.length)] : sugerirTemplate(nicho);
};
var urlHttps = (u) => /^https:\/\/[^\s"'<>()\\]+$/.test(String(u || "")) ? String(u) : "";
var montarPrevia = (lead, fotos2 = []) => {
  const dados = dadosDoLead(lead);
  const urls = [...new Set((fotos2 || []).map(urlHttps).filter(Boolean))];
  if (urls.length) {
    dados.capa = dados.capa || urls[0];
    dados.fotoSobre = dados.fotoSobre || urls[1] || urls[0];
    if (!(dados.galeria || []).length) dados.galeria = urls.slice(2, 6);
  }
  const ramo = lead?.niche || lead?.role || "";
  const template = escolherTemplate(ramo, dados.empresa);
  const html = template.render({ ...dados, selo: true });
  return { company: dados.empresa, html, template: template.nome, lead_id: String(lead?.id || ""), builder_data: JSON.stringify(dados) };
};

// src/templates/sites/render-entry.ts
var renderizarPrevia = (lead, fotos2 = []) => montarPrevia(lead, fotos2);
export {
  renderizarPrevia
};
