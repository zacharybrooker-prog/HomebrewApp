import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function run() {
  try {
    console.log("Fetching bestiary...");
    const snapshot = await getDocs(collection(db, 'bestiary'));
    const monsters = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      monsters.push({ id: doc.id, name: data.name });
    });
    
    console.log(`Found ${monsters.length} monsters.`);
    
    // Sort alphabetically for consistency
    monsters.sort((a, b) => a.name.localeCompare(b.name));
    
    // Split into 4 chunks
    const numAgents = 4;
    const chunkSize = Math.ceil(monsters.length / numAgents);
    
    const chunks = [];
    for (let i = 0; i < monsters.length; i += chunkSize) {
      chunks.push(monsters.slice(i, i + chunkSize));
    }
    
    const outDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\50d39066-b59e-4c6c-a836-6094bb6795d1\\scratch';
    
    for (let i = 0; i < chunks.length; i++) {
      const filepath = path.join(outDir, `monsters_chunk_${i}.json`);
      fs.writeFileSync(filepath, JSON.stringify(chunks[i], null, 2));
      console.log(`Wrote ${chunks[i].length} monsters to ${filepath}`);
    }
    
    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error("Error fetching monsters:", err);
    process.exit(1);
  }
}

run();
