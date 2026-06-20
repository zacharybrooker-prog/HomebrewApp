import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch, getDoc, setDoc } from 'firebase/firestore';
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

async function seedData() {
  try {
    const statusRef = doc(db, 'system', 'db_status');
    const statusSnap = await getDoc(statusRef);
    const status = statusSnap.exists() ? statusSnap.data() : {};

    let didSeed = false;
    const publicDir = path.join(__dirname, 'public');

    const datasets = [
      { key: 'isSpellsSeeded', collectionName: 'spells', file: 'srd-5.2-spells.json' },
      { key: 'isBestiarySeeded', collectionName: 'bestiary', file: 'srd_5e_monsters.json' },
      { key: 'isItemsSeeded', collectionName: 'items', file: 'srd-5.2-items.json' },
      { key: 'isEquipmentSeeded', collectionName: 'equipment', file: 'srd-5.2-equipment.json' },
      { key: 'isFeatsSeeded', collectionName: 'feats', file: 'srd-5.2-feats.json' },
      { key: 'isClassFeaturesSeeded', collectionName: 'features', file: 'srd-5.2-classFeatures.json' }
    ];

    for (const dataset of datasets) {
      if (!status[dataset.key]) {
        console.log(`Seeding ${dataset.collectionName}...`);
        const filePath = path.join(publicDir, dataset.file);
        
        if (!fs.existsSync(filePath)) {
          console.warn(`WARNING: File not found: ${filePath}`);
          continue;
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const chunks = chunkArray(data, 499);
        
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(item => {
            const docRef = doc(db, dataset.collectionName, normalizeId(item.name));
            batch.set(docRef, item, { merge: true });
          });
          await batch.commit();
        }
        await setDoc(statusRef, { [dataset.key]: true }, { merge: true });
        didSeed = true;
        console.log(`Successfully seeded ${dataset.collectionName}!`);
      } else {
        console.log(`${dataset.collectionName} already seeded. Skipping.`);
      }
    }

    if (!didSeed) {
      console.log('Database already fully seeded!');
    } else {
      console.log('Database seeding complete!');
    }
    
    process.exit(0);

  } catch (error) {
    console.error('Error during auto-seed:', error);
    process.exit(1);
  }
}

seedData();
