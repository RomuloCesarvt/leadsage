// Dobra do firebase/auth para o QA de layout: entra sempre como um usuario fixo.
const usuario = { uid: 'qa', email: 'qa@leadsage.test', displayName: 'QA', getIdToken: async () => 'token-de-teste' };
export const getAuth = () => ({ currentUser: usuario });
export const onAuthStateChanged = (_auth: unknown, cb: (u: unknown) => void) => { setTimeout(() => cb(usuario), 0); return () => {}; };
export const signInWithEmailAndPassword = async () => ({ user: usuario });
export const createUserWithEmailAndPassword = async () => ({ user: usuario });
export const signOut = async () => {};
export class GoogleAuthProvider {}
export const signInWithPopup = async () => ({ user: usuario });
export const signInWithRedirect = async () => {};
export const getRedirectResult = async () => null;
export type UserCredential = unknown;
export type User = typeof usuario;
export const browserLocalPersistence = {};
export const indexedDBLocalPersistence = {};
export const setPersistence = async () => {};
export const initializeAuth = () => ({ currentUser: usuario });
export const sendPasswordResetEmail = async () => {};
export const updateProfile = async () => {};
export const browserSessionPersistence = {};
export const browserPopupRedirectResolver = {};
