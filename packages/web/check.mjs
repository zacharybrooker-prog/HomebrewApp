import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

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
const db = getFirestore(app);

async function check() {
  const collections = ['spells', 'bestiary', 'items', 'equipment', 'feats', 'features'];
  for (const c of collections) {
    const snap = await getDocs(collection(db, c));
    console.log(`${c} count: ${snap.size}`);
  }
  process.exit(0);
}
check();
