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
