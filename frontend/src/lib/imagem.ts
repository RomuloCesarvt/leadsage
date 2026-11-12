/**
 * Preparo de imagem para entrar no site gerado.
 *
 * As fotos viajam embutidas no HTML como data URI, porque o site
 * publicado precisa abrir sozinho, sem depender de servidor de imagem.
 * Isso impõe um limite duro: o documento inteiro precisa caber no
 * armazenamento (o Firestore corta em 1 MB).
 *
 * Foto de celular tem 3 a 6 MB. Sem redimensionar, uma única imagem
 * estouraria tudo. Por isso a imagem é reduzida e recomprimida no
 * próprio navegador antes de virar data URI.
 */

export type OpcoesImagem = {
  larguraMaxima?: number;
  qualidade?: number;
  /** teto do resultado em bytes; abaixa a qualidade até caber */
  tetoBytes?: number;
};

const PADRAO: Required<OpcoesImagem> = {
  larguraMaxima: 1600,
  qualidade: 0.82,
  tetoBytes: 260 * 1024,
};

const carregar = (arquivo: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Arquivo não parece ser uma imagem válida.'));
      img.src = String(leitor.result);
    };
    leitor.readAsDataURL(arquivo);
  });

/** Tamanho aproximado, em bytes, de um data URI base64. */
export const tamanhoDataUri = (dataUri: string): number => {
  const virgula = dataUri.indexOf(',');
  if (virgula < 0) return 0;
  return Math.round((dataUri.length - virgula - 1) * 0.75);
};

export const formatarBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;

/**
 * Reduz, recomprime e devolve o data URI.
 *
 * SVG passa direto: é vetor, já é pequeno, e rasterizar destruiria a
 * nitidez de uma logo.
 */
export async function prepararImagem(
  arquivo: File,
  opcoes: OpcoesImagem = {}
): Promise<string> {
  const cfg = { ...PADRAO, ...opcoes };

  if (arquivo.type === 'image/svg+xml') {
    if (arquivo.size > cfg.tetoBytes) {
      throw new Error(`Este SVG tem ${formatarBytes(arquivo.size)}; o limite é ${formatarBytes(cfg.tetoBytes)}.`);
    }
    return await new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result));
      leitor.onerror = () => reject(new Error('Não foi possível ler o SVG.'));
      leitor.readAsDataURL(arquivo);
    });
  }

  const img = await carregar(arquivo);
  const escala = Math.min(1, cfg.larguraMaxima / (img.naturalWidth || cfg.larguraMaxima));
  const largura = Math.max(1, Math.round((img.naturalWidth || cfg.larguraMaxima) * escala));
  const altura = Math.max(1, Math.round((img.naturalHeight || largura) * escala));

  const tela = document.createElement('canvas');
  tela.width = largura;
  tela.height = altura;
  const ctx = tela.getContext('2d');
  if (!ctx) throw new Error('O navegador não conseguiu processar a imagem.');

  // Fundo branco: PNG com transparência viraria preto ao virar JPEG.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, largura, altura);
  ctx.drawImage(img, 0, 0, largura, altura);

  // Vai baixando a qualidade até caber no teto.
  let qualidade = cfg.qualidade;
  let saida = tela.toDataURL('image/jpeg', qualidade);
  while (tamanhoDataUri(saida) > cfg.tetoBytes && qualidade > 0.4) {
    qualidade -= 0.1;
    saida = tela.toDataURL('image/jpeg', qualidade);
  }

  if (tamanhoDataUri(saida) > cfg.tetoBytes) {
    throw new Error(
      `Não consegui reduzir esta imagem abaixo de ${formatarBytes(cfg.tetoBytes)}. ` +
        'Tente uma foto menor ou menos detalhada.'
    );
  }

  return saida;
}

/** Teto do site inteiro: o Firestore recusa documento acima de 1 MB. */
export const TETO_SITE_BYTES = 900 * 1024;

/* ---------------------------------------------------------------- logo */

export type ResultadoLogo = { dataUri: string; fundoRemovido: boolean };

/**
 * Logo é diferente de foto: precisa de transparência.
 *
 * `prepararImagem` pinta o fundo de branco e salva JPEG — certo para foto,
 * errado para logo: uma logo PNG transparente virava um retângulo branco
 * em cima da capa escura do site. Aqui a logo sai em PNG e, quando ela
 * vem com fundo liso (o caso mais comum: logo exportada em fundo branco),
 * o fundo é removido.
 *
 * A remoção só acontece quando os quatro cantos têm a mesma cor — sinal de
 * fundo liso. Logo com foto ou degradê atrás fica como está: remover ali
 * comeria pedaço do desenho.
 */
export async function prepararLogo(
  arquivo: File,
  opcoes: { larguraMaxima?: number; tetoBytes?: number; removerFundo?: boolean } = {}
): Promise<ResultadoLogo> {
  const larguraMaxima = opcoes.larguraMaxima ?? 600;
  const tetoBytes = opcoes.tetoBytes ?? 120 * 1024;

  if (arquivo.type === 'image/svg+xml') {
    return { dataUri: await prepararImagem(arquivo, { tetoBytes }), fundoRemovido: false };
  }

  const img = await carregar(arquivo);
  const escala = Math.min(1, larguraMaxima / (img.naturalWidth || larguraMaxima));
  const w = Math.max(1, Math.round((img.naturalWidth || larguraMaxima) * escala));
  const h = Math.max(1, Math.round((img.naturalHeight || w) * escala));

  const tela = document.createElement('canvas');
  tela.width = w;
  tela.height = h;
  const ctx = tela.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('O navegador não conseguiu processar a imagem.');
  ctx.drawImage(img, 0, 0, w, h);

  let fundoRemovido = false;
  if (opcoes.removerFundo !== false) {
    const dados = ctx.getImageData(0, 0, w, h);
    fundoRemovido = removerFundoLiso(dados);
    if (fundoRemovido) ctx.putImageData(dados, 0, 0);
  }

  const recortada = recortarBordasVazias(tela) || tela;
  let saida = recortada.toDataURL('image/png');
  if (tamanhoDataUri(saida) > tetoBytes) {
    // PNG grande demais: WebP mantém a transparência com bem menos peso
    saida = recortada.toDataURL('image/webp', 0.9);
  }
  if (tamanhoDataUri(saida) > tetoBytes) {
    throw new Error(`Esta logo ficou com ${formatarBytes(tamanhoDataUri(saida))}; envie uma versão menor.`);
  }
  return { dataUri: saida, fundoRemovido };
}

/**
 * Apaga o fundo liso a partir das bordas (preenchimento por inundação),
 * para não furar o miolo da logo quando ele tem a mesma cor do fundo — a
 * letra "O" branca numa logo de fundo branco continua inteira.
 * Devolve false (sem mexer em nada) quando o fundo não é liso.
 */
export function removerFundoLiso(dados: ImageData, tolerancia = 38): boolean {
  const { width: w, height: h, data } = dados;
  const px = (x: number, y: number) => (y * w + x) * 4;
  const cantos = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)];

  // Já transparente: nada a fazer.
  if (cantos.every(i => data[i + 3] < 20)) return false;

  const [r0, g0, b0] = [data[cantos[0]], data[cantos[0] + 1], data[cantos[0] + 2]];
  const distancia = (i: number) =>
    Math.abs(data[i] - r0) + Math.abs(data[i + 1] - g0) + Math.abs(data[i + 2] - b0);
  if (!cantos.every(i => distancia(i) <= tolerancia)) return false;

  const visitado = new Uint8Array(w * h);
  const fila: number[] = [];
  const empilhar = (x: number, y: number) => {
    const k = y * w + x;
    if (!visitado[k]) { visitado[k] = 1; fila.push(k); }
  };
  for (let x = 0; x < w; x++) { empilhar(x, 0); empilhar(x, h - 1); }
  for (let y = 0; y < h; y++) { empilhar(0, y); empilhar(w - 1, y); }

  let apagados = 0;
  while (fila.length) {
    const k = fila.pop()!;
    const i = k * 4;
    const d = distancia(i);
    if (d > tolerancia * 2) continue;
    // borda suave: perto do limite fica semitransparente, sem serrilhado
    data[i + 3] = d <= tolerancia ? 0 : Math.round(data[i + 3] * ((d - tolerancia) / tolerancia));
    apagados++;
    if (d > tolerancia) continue;
    const x = k % w, y = (k - x) / w;
    if (x > 0) empilhar(x - 1, y);
    if (x < w - 1) empilhar(x + 1, y);
    if (y > 0) empilhar(x, y - 1);
    if (y < h - 1) empilhar(x, y + 1);
  }
  return apagados > 0;
}

/** Corta a margem transparente, para a logo não ficar pequena dentro de uma caixa vazia. */
function recortarBordasVazias(tela: HTMLCanvasElement): HTMLCanvasElement | null {
  const ctx = tela.getContext('2d');
  if (!ctx) return null;
  const { width: w, height: h } = tela;
  const { data } = ctx.getImageData(0, 0, w, h);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 12) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const margem = 2;
  x0 = Math.max(0, x0 - margem); y0 = Math.max(0, y0 - margem);
  x1 = Math.min(w - 1, x1 + margem); y1 = Math.min(h - 1, y1 + margem);
  const nova = document.createElement('canvas');
  nova.width = x1 - x0 + 1;
  nova.height = y1 - y0 + 1;
  nova.getContext('2d')!.drawImage(tela, x0, y0, nova.width, nova.height, 0, 0, nova.width, nova.height);
  return nova;
}

/**
 * Tira as margens vazias de uma logo: a cor do canto é o "fundo", e o que sobra é o desenho com uma folga de 14%.
 * Logo quadrada com o desenho pequeno no meio vira uma marca que ocupa a caixa e parece feita para o documento.
 * Se não der para recortar (imagem sem fundo liso, canvas indisponível), devolve o arquivo como veio.
 */
export async function recortarMargens(arquivo: File): Promise<File> {
  try {
    const url = URL.createObjectURL(arquivo);
    const img = await new Promise<HTMLImageElement>((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
    URL.revokeObjectURL(url);
    const L = Math.min(img.naturalWidth, 800), esc = L / img.naturalWidth, A = Math.round(img.naturalHeight * esc);
    const c = document.createElement('canvas'); c.width = L; c.height = A;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) return arquivo;
    g.drawImage(img, 0, 0, L, A);
    const d = g.getImageData(0, 0, L, A).data;
    const px = (x: number, y: number) => { const k = (y * L + x) * 4; return [d[k], d[k + 1], d[k + 2], d[k + 3]]; };
    const cantos = [px(0, 0), px(L - 1, 0), px(0, A - 1), px(L - 1, A - 1)];
    const longe = (a: number[], b: number[]) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 60 || Math.abs(a[3] - b[3]) > 60;
    const fundo = cantos[0];
    if (cantos.some(k => longe(k, fundo))) return arquivo;                 // cantos diferentes: não há fundo liso para recortar
    let x0 = L, y0 = A, x1 = -1, y1 = -1;
    for (let y = 0; y < A; y++) for (let x = 0; x < L; x++) if (longe(px(x, y), fundo)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return arquivo;
    const w = x1 - x0 + 1, h = y1 - y0 + 1, folga = Math.round(Math.max(w, h) * 0.14);
    if (w + 2 * folga >= L * 0.97 && h + 2 * folga >= A * 0.97) return arquivo;   // já ocupa a imagem toda
    const saida = document.createElement('canvas'); saida.width = w + 2 * folga; saida.height = h + 2 * folga;
    const s = saida.getContext('2d');
    if (!s) return arquivo;
    if (fundo[3] > 0) { s.fillStyle = `rgb(${fundo[0]},${fundo[1]},${fundo[2]})`; s.fillRect(0, 0, saida.width, saida.height); }
    s.drawImage(c, x0, y0, w, h, folga, folga, w, h);
    const blob: Blob | null = await new Promise(ok => saida.toBlob(ok, 'image/png'));
    return blob ? new File([blob], 'logo.png', { type: 'image/png' }) : arquivo;
  } catch {
    return arquivo;
  }
}
