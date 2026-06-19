import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin (relies on Application Default Credentials or FIREBASE_SERVICE_ACCOUNT env var)
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      console.log('Using Application Default Credentials (ensure GOOGLE_APPLICATION_CREDENTIALS is set if this fails)');
      admin.initializeApp(); 
    }
  } catch (error) {
    console.error('Firebase Admin init error:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

// Helper to normalize names into doc IDs
const normalizeId = (name = '') => 
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `unknown-${Date.now()}`;

// Helper to chunk arrays (Firestore batch limit is 500)
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function seedData() {
  try {
    const statusRef = db.collection('system').doc('db_status');
    const statusSnap = await statusRef.get();
    const status = statusSnap.data() || {};

    let didSeed = false;

    const publicDir = path.join(__dirname, 'packages', 'web', 'public');

    const datasets = [
      { key: 'isSpellsSeeded', collection: 'spells', file: 'srd-5.2-spells.json' },
      { key: 'isBestiarySeeded', collection: 'bestiary', file: 'srd_5e_monsters.json' },
      { key: 'isItemsSeeded', collection: 'items', file: 'srd-5.2-items.json' },
      { key: 'isEquipmentSeeded', collection: 'equipment', file: 'srd-5.2-equipment.json' },
      { key: 'isFeatsSeeded', collection: 'feats', file: 'srd-5.2-feats.json' },
      { key: 'isClassFeaturesSeeded', collection: 'features', file: 'srd-5.2-classFeatures.json' }
    ];

    for (const dataset of datasets) {
      if (!status[dataset.key]) {
        console.log(`Seeding ${dataset.collection}...`);
        const filePath = path.join(publicDir, dataset.file);
        
        if (!fs.existsSync(filePath)) {
          console.warn(`WARNING: File not found: ${filePath}`);
          continue;
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const chunks = chunkArray(data, 499);
        
        for (const chunk of chunks) {
          const batch = db.batch();
          chunk.forEach(item => {
            const docRef = db.collection(dataset.collection).doc(normalizeId(item.name));
            batch.set(docRef, item, { merge: true });
          });
          await batch.commit();
        }
        await statusRef.set({ [dataset.key]: true }, { merge: true });
        didSeed = true;
        console.log(`Successfully seeded ${dataset.collection}!`);
      } else {
        console.log(`${dataset.collection} already seeded. Skipping.`);
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
