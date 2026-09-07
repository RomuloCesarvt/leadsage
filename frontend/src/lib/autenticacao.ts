/**
 * Entrada com Google, na estratégia que cada plataforma aceita.
 *
 * `signInWithPopup` abre uma janela separada e conversa com ela. Isso
 * existe no navegador; dentro do WebView do app empacotado, não — a
 * janela ou não abre, ou abre sem conseguir devolver o resultado, e o
 * login trava sem mensagem. É a falha número um de app web empacotado, e
 * só aparece no aparelho.
 *
 * No nativo o caminho é redirecionar e recolher o resultado quando o app
 * volta. Aqui isso fica isolado num lugar só, para a tela de login não
 * precisar saber onde está rodando.
 *
 * Quando o Capacitor entrar de fato, o passo seguinte é trocar o ramo
 * nativo por `@capacitor-firebase/authentication`, que usa a tela de
 * login nativa do aparelho — exigência da Apple para "Entrar com Google".
 * A troca é dentro desta função, e mais nada muda.
 */
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type UserCredential,
} from 'firebase/auth';

import { auth } from './firebase';
import { rodandoNativo } from './pwa';

const provedorGoogle = new GoogleAuthProvider();

/**
 * Inicia a entrada com Google.
 *
 * Devolve as credenciais na web. No nativo devolve `null`: o app sai da
 * tela e o resultado chega depois, por `colherRedirecionamento()`.
 */
export async function entrarComGoogle(): Promise<UserCredential | null> {
  if (rodandoNativo()) {
    await signInWithRedirect(auth, provedorGoogle);
    return null;
  }
  return await signInWithPopup(auth, provedorGoogle);
}

/**
 * Recolhe o resultado de um redirecionamento, se houve um.
 *
 * Precisa ser chamada quando o app abre. Sem isso o usuário volta do
 * Google para uma tela de login em branco, como se nada tivesse
 * acontecido.
 */
export async function colherRedirecionamento(): Promise<UserCredential | null> {
  try {
    return await getRedirectResult(auth);
  } catch {
    // Não houve redirecionamento, ou ele falhou. Em nenhum dos casos
    // isso pode impedir o app de abrir na tela de login normal.
    return null;
  }
}
