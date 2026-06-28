import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCcLsf3ERBdcxsbNT7MzO8PcBRqaHIoqAk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "master-app-ee17a.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "master-app-ee17a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "master-app-ee17a.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "876639423482",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:876639423482:web:efe9957fa31c2fefe4b243",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5H9TH57MD9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

import { GoogleAuthProvider, OAuthProvider } from 'firebase/auth';

export const googleProvider = new GoogleAuthProvider();
export const discordProvider = new OAuthProvider('discord.com');

export const signIn = () => signInAnonymously(auth);

export const observeAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const getToken = async (): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
};
