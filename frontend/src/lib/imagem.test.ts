/**
 * Remoção de fundo da logo — sem navegador: ImageData é só largura,
 * altura e um vetor RGBA.
 *
 *   npx tsx src/lib/imagem.test.ts
 */
import { removerFundoLiso } from './imagem';

let falhas = 0;
const checar = (nome: string, ok: boolean) => {
  if (ok) console.log(`  PASS  ${nome}`);
  else { falhas++; console.log(`  FALHA ${nome}`); }
};

/** Quadro 40x40: fundo (fundo), anel escuro do raio 8 ao 14, miolo branco. */
const logo = (fundo: [number, number, number]) => {
  const w = 40, h = 40, data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, r = Math.hypot(x - 20, y - 20);
    const cor = r >= 8 && r <= 14 ? [20, 40, 120] : r < 8 ? [255, 255, 255] : fundo;
    data.set([...cor, 255], i);
  }
  return { width: w, height: h, data } as unknown as ImageData;
};
const alfa = (img: ImageData, x: number, y: number) => img.data[(y * img.width + x) * 4 + 3];

const branca = logo([255, 255, 255]);
checar('fundo branco liso é removido', removerFundoLiso(branca));
checar('canto ficou transparente', alfa(branca, 0, 0) === 0);
checar('o desenho continua opaco', alfa(branca, 20, 9) === 255);
checar('o miolo branco dentro do anel NÃO é apagado', alfa(branca, 20, 20) === 255);

const colorida = logo([250, 200, 30]);
checar('fundo liso de outra cor também sai', removerFundoLiso(colorida) && alfa(colorida, 39, 39) === 0);

const foto = logo([255, 255, 255]);
foto.data.set([10, 200, 10, 255], 0);   // um canto diferente: não é fundo liso
checar('fundo que não é liso fica intacto', !removerFundoLiso(foto) && alfa(foto, 39, 0) === 255);

const transparente = logo([255, 255, 255]);
for (const [x, y] of [[0, 0], [39, 0], [0, 39], [39, 39]]) transparente.data[(y * 40 + x) * 4 + 3] = 0;
checar('logo já transparente não é mexida', !removerFundoLiso(transparente));

console.log(`\n=========== ${falhas === 0 ? 'TUDO PASSOU' : falhas + ' FALHARAM'} ===========`);
if (falhas) process.exit(1);
