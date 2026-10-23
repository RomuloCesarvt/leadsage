import { initializeApp } from 'firebase/app';
import {
  getAuth, initializeAuth, browserLocalPersistence, indexedDBLocalPersistence, browserSessionPersistence, browserPopupRedirectResolver,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAiX9dyw9bCVthc5Zo1-r2Z0E6uLuLfSd0",
  authDomain: "leadsage-84600.firebaseapp.com",
  projectId: "leadsage-84600",
  storageBucket: "leadsage-84600.firebasestorage.app",
  messagingSenderId: "41320860203",
  appId: "1:41320860203:web:8e9b1c61127c0c15af386e"
};

const app = initializeApp(firebaseConfig);

/**
 * A sessão fica guardada no navegador. O padrão do Firebase tenta o IndexedDB primeiro, e o IndexedDB é justamente o que falha em silêncio em
 * alguns navegadores (conexão perdida depois de hibernar, perfil corrompido, extensões): a pessoa recarrega com F5 e volta para o login.
 * O localStorage é simples e não tem essa falha, então vai primeiro; quem já tinha sessão no IndexedDB continua logado (o Firebase procura
 * a sessão em todos os lugares, na ordem, e a leva para o primeiro). Sem nenhum dos dois, cai para a sessão da aba.
 */
function criarAuth() {
  try {
    return initializeAuth(app, {
      persistence: [browserLocalPersistence, indexedDBLocalPersistence, browserSessionPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);   // já inicializado, ou ambiente sem navegador (testes)
  }
}

export const auth = criarAuth();
export const db = getFirestore(app);
