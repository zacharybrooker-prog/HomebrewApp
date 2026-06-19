import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
      admin.initializeApp(); // Fallback for environments with Application Default Credentials
    }
  } catch (error) {
    console.error('Firebase Admin init error:', error);
  }
}

const db = admin.firestore();

// Helper to normalize names into doc IDs
const normalizeId = (name: string = '') => 
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `unknown-${Date.now()}`;

// Helper to chunk arrays
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Basic security check (Optional: require a secret token in headers)
  const authHeader = req.headers.authorization;
  if (process.env.INIT_DB_SECRET && authHeader !== `Bearer ${process.env.INIT_DB_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const statusRef = db.collection('system').doc('db_status');
    const statusSnap = await statusRef.get();
    const status = statusSnap.data() || {};

    let didSeed = false;

    // Seed Spells
    if (!status.isSpellsSeeded) {
      const spellsData = require('../packages/web/public/srd-5.2-spells.json');
      const chunks = chunkArray(spellsData, 499);
      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach((spell: any) => {
          const docRef = db.collection('spells').doc(normalizeId(spell.name));
          batch.set(docRef, spell, { merge: true });
        });
        await batch.commit();
      }
      await statusRef.set({ isSpellsSeeded: true }, { merge: true });
      didSeed = true;
    }

    // Seed Bestiary
    if (!status.isBestiarySeeded) {
      const bestiaryData = require('../packages/web/public/srd_5e_monsters.json');
      const chunks = chunkArray(bestiaryData, 499);
      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach((monster: any) => {
          const docRef = db.collection('bestiary').doc(normalizeId(monster.name));
          batch.set(docRef, monster, { merge: true });
        });
        await batch.commit();
      }
      await statusRef.set({ isBestiarySeeded: true }, { merge: true });
      didSeed = true;
    }

    // Seed Items
    if (!status.isItemsSeeded) {
      const itemsData = require('../packages/web/public/srd-5.2-items.json');
      const chunks = chunkArray(itemsData, 499);
      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach((item: any) => {
          const docRef = db.collection('items').doc(normalizeId(item.name));
          batch.set(docRef, item, { merge: true });
        });
        await batch.commit();
      }
      await statusRef.set({ isItemsSeeded: true }, { merge: true });
      didSeed = true;
    }

    // Seed Equipment
    if (!status.isEquipmentSeeded) {
      const equipmentData = require('../packages/web/public/srd-5.2-equipment.json');
      const chunks = chunkArray(equipmentData, 499);
      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach((eq: any) => {
          const docRef = db.collection('equipment').doc(normalizeId(eq.name));
          batch.set(docRef, eq, { merge: true });
        });
        await batch.commit();
      }
      await statusRef.set({ isEquipmentSeeded: true }, { merge: true });
      didSeed = true;
    }

    // Seed Feats
    if (!status.isFeatsSeeded) {
      const featsData = require('../packages/web/public/srd-5.2-feats.json');
      const chunks = chunkArray(featsData, 499);
      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach((feat: any) => {
          const docRef = db.collection('feats').doc(normalizeId(feat.name));
          batch.set(docRef, feat, { merge: true });
        });
        await batch.commit();
      }
      await statusRef.set({ isFeatsSeeded: true }, { merge: true });
      didSeed = true;
    }

    // Seed Features/Traits
    if (!status.isClassFeaturesSeeded) {
      const featuresData = require('../packages/web/public/srd-5.2-classFeatures.json');
      const chunks = chunkArray(featuresData, 499);
      for (const chunk of chunks) {
        const batch = db.batch();
        chunk.forEach((feature: any) => {
          const docRef = db.collection('features').doc(normalizeId(feature.name));
          batch.set(docRef, feature, { merge: true });
        });
        await batch.commit();
      }
      await statusRef.set({ isClassFeaturesSeeded: true }, { merge: true });
      didSeed = true;
    }

    return res.status(200).json({ success: true, didSeed, message: didSeed ? 'Database seeded successfully' : 'Database already seeded' });

  } catch (error) {
    console.error('Error during auto-seed:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
