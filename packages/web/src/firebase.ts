import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCcLsf3ERBdcxsbNT7MzO8PcBRqaHIoqAk",
  authDomain: "master-app-ee17a.firebaseapp.com",
  projectId: "master-app-ee17a",
  storageBucket: "master-app-ee17a.firebasestorage.app",
  messagingSenderId: "876639423482",
  appId: "1:876639423482:web:efe9957fa31c2fefe4b243",
  measurementId: "G-5H9TH57MD9"
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
