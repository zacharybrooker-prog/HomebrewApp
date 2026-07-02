import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const normalizeId = (name = '') => 
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `unknown-${Date.now()}`;

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function forceSeedBestiary() {
  try {
    console.log("Force seeding Bestiary to push newly generated Lore...");
    const filePath = path.join(__dirname, 'src', 'data', 'srd_5e_monsters.json');
    
    if (!fs.existsSync(filePath)) {
      console.warn(`WARNING: File not found: ${filePath}`);
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const chunks = chunkArray(data, 400); // Max 500
    
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(item => {
        const docRef = doc(db, 'bestiary', normalizeId(item.name));
        batch.set(docRef, item, { merge: true });
      });
      await batch.commit();
      console.log(`Pushed chunk of ${chunk.length} monsters to Firebase!`);
    }
    
    console.log('Successfully force-seeded Bestiary with Lore text!');
    process.exit(0);

  } catch (error) {
    console.error('Error during auto-seed:', error);
    process.exit(1);
  }
}

forceSeedBestiary();
