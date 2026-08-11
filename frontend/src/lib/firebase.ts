import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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
export const auth = getAuth(app);
export const db = getFirestore(app);
