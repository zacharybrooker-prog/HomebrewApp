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

async function seedItems() {
  try {
    const filePath = path.join(__dirname, 'public', 'srd-5.2-items.json');
    const rawData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    // The JSON is: { "Magic Items": { "Amulet of Health": { content: ["*Wondrous item...", "Your Constitution..."] } } }
    const magicItemsGroup = rawData["Magic Items"];
    const itemsArray = [];
    
    if (magicItemsGroup) {
      for (const [itemName, itemData] of Object.entries(magicItemsGroup)) {
        if (itemName === 'content') continue;
        
        // Flatten content into a single string description
        let description = '';
        if (Array.isArray(itemData.content)) {
          description = itemData.content.join('\n\n');
        } else if (typeof itemData.content === 'string') {
          description = itemData.content;
        }
        
        itemsArray.push({
          name: itemName,
          description: description,
          equipmentCategory: 'Magic Item',
        });
      }
    }
    
    console.log(`Parsed ${itemsArray.length} items. Seeding to Firestore...`);
    
    const chunks = chunkArray(itemsArray, 499);
    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(item => {
        const docRef = doc(db, 'items', normalizeId(item.name));
        batch.set(docRef, item, { merge: true });
      });
      await batch.commit();
    }
    
    console.log('Successfully seeded items!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding items:', err);
    process.exit(1);
  }
}

seedItems();
