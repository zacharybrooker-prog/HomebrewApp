import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, writeBatch, doc, updateDoc, getDocs, setDoc } from 'firebase/firestore';
import type { ClassFeature, Feat, Character } from '@frogs-world/shared/src/schema';

// ====== ONE-TIME SEEDING SCRIPTS ======
export const seedFeatsJSON = async () => {
  console.log("Triggering Fetch Seeder for Feats...");
  alert("Seed Feats execution triggered! Please check the console for progress.");
  
  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`/srd-5.2-feats.json?t=${timestamp}`, { cache: "no-store" });
    
    // 1. Check if the response is actually JSON
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Path Error: Server returned non-JSON content. First 100 chars:", text.substring(0, 100));
      throw new Error(`Expected JSON but received ${contentType}. Check the file path.`);
    }
    
    const data = await response.json();
    console.log(`Successfully parsed ${data.length} feats. Beginning upload...`);
    
    // Step 1: Nuke existing feats
    const featsCollection = collection(db, 'feats');
    const existingFeats = await getDocs(query(featsCollection));
    console.log(`Deleting ${existingFeats.size} existing feats...`);
    
    const deleteBatch = writeBatch(db);
    existingFeats.docs.forEach((d) => {
      deleteBatch.delete(d.ref);
    });
    await deleteBatch.commit();
    console.log("Old feats cleared. Beginning ingestion...");

    let successCount = 0;
    for (const item of data) {
      const safePrereq = item.prerequisite ? item.prerequisite : null;
      try {
        const docRef = doc(collection(db, 'feats'));
        await setDoc(docRef, {
          id: docRef.id,
          name: item.name || 'Unknown Feat',
          prerequisite: safePrereq,
          description: Array.isArray(item.description) ? item.description.join('\n') : item.description || '',
          isCustom: false,
          isShared: true,
          authorId: "SYSTEM"
        });
        console.log(`✅ Success: ${item.name}`);
        successCount++;
      } catch (error) {
        console.error(`❌ FAILED on ${item.name}:`, error);
      }
    }
    
    console.log(`Successfully seeded ${successCount} out of ${data.length} feats!`);
    alert(`Successfully seeded ${successCount} out of ${data.length} feats!`);
  } catch (err: any) {
    console.error("Firestore Feats Seeding Failed:", err);
    alert(`Seeding failed: ${err.message}`);
  }
};

export const seedClassFeaturesJSON = async () => {
  console.log("Triggering Fetch Seeder for Class Features...");
  alert("Seed Class Features execution triggered! Please check the console for progress.");
  
  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`/srd-5.2-classFeatures.json?t=${timestamp}`, { cache: "no-store" });
    
    // 1. Check if the response is actually JSON
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Path Error: Server returned non-JSON content. First 100 chars:", text.substring(0, 100));
      throw new Error(`Expected JSON but received ${contentType}. Check the file path.`);
    }
    
    const data = await response.json();
    console.log(`Successfully parsed ${data.length} class features. Beginning upload...`);
    
    // Step 1: Nuke existing class features
    const collectionRef = collection(db, 'classFeatures');
    const existingDocs = await getDocs(query(collectionRef));
    console.log(`Deleting ${existingDocs.size} existing class features...`);
    
    const deleteBatch = writeBatch(db);
    existingDocs.docs.forEach((d) => {
      deleteBatch.delete(d.ref);
    });
    await deleteBatch.commit();
    console.log("Old class features cleared. Beginning ingestion...");

    let successCount = 0;
    for (const item of data) {
      try {
        const docRef = doc(collection(db, 'classFeatures'));
        await setDoc(docRef, {
          id: docRef.id,
          name: item.name || 'Unknown Feature',
          className: item.className || 'Unknown',
          levelRequired: parseInt(item.levelRequired as any) || 1,
          description: Array.isArray(item.description) ? item.description.join('\n') : item.description || '',
          isCustom: false,
          isShared: true,
          authorId: "SYSTEM"
        });
        console.log(`✅ Success: ${item.name}`);
        successCount++;
      } catch (error) {
        console.error(`❌ FAILED on ${item.name}:`, error);
      }
    }
    
    console.log(`Successfully seeded ${successCount} out of ${data.length} class features!`);
    alert(`Successfully seeded ${successCount} out of ${data.length} class features!`);
  } catch (err: any) {
    console.error("Firestore Class Features Seeding Failed:", err);
    alert(`Seeding failed: ${err.message}`);
  }
};

// ====== COMPONENT ======
export function FeaturesTraitsTab({ character, store }: { character: Character, store: any }) {
  const [classFeatures, setClassFeatures] = useState<ClassFeature[]>([]);
  const [isFeatModalOpen, setIsFeatModalOpen] = useState(false);
  
  const [localClass, setLocalClass] = useState((character as any)?.className || (character as any)?.charClass || '');
  const [localLevel, setLocalLevel] = useState(character?.level ? Number(character.level) : 1);

  useEffect(() => {
    if (character) {
      const charAny = character as any;
      if (charAny.className || charAny.charClass) setLocalClass(charAny.className || charAny.charClass);
      if (character.level) setLocalLevel(character.level);
    }
  }, [character?.id]);
  
  // Real-time query for class features
  useEffect(() => {
    if (!localClass) {
      setClassFeatures([]);
      return;
    }
    
    const currentLevel = localLevel ? Number(localLevel) : 1;
    
    const q = query(collection(db, 'classFeatures'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allFeatures = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          name: String(data.name || ''),
          className: String(data.className || ''),
          description: String(data.description || '')
        } as unknown as ClassFeature;
      });
      
      // Filter by class and level
      const activeFeatures = allFeatures
        .filter(f => String(f.className || '').toLowerCase() === localClass.toLowerCase())
        .filter(f => f.levelRequired <= currentLevel)
        .sort((a, b) => b.levelRequired - a.levelRequired); // Descending
        
      setClassFeatures(activeFeatures);
    });
    return () => unsubscribe();
  }, [localClass, localLevel]);

  const handleRemoveFeat = async (featId: string) => {
    const updatedFeats = (character.feats || []).filter((f: any) => f.id !== featId);
    store.updateCharacter(character.id, { feats: updatedFeats });
    try {
      await updateDoc(doc(db, 'characters', character.id), { feats: updatedFeats });
    } catch(err) { console.error("Firestore sync failed", err); }
  };

  return (
    <div className="flex flex-col gap-6 pt-4 animate-fade-in">
      {/* Class & Level Inputs */}
      <div className="flex flex-wrap gap-4 items-center bg-[var(--surface-dark)] p-4 rounded-lg border border-[var(--border)]">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">Class</label>
          <select 
            className="input-fantasy text-sm py-1 min-w-[150px]"
            value={localClass}
            onChange={async (e) => {
              const val = e.target.value;
              setLocalClass(val);
              store.updateCharacter(character.id, { charClass: val, className: val });
              try {
                if (character?.id) {
                  await updateDoc(doc(db, 'characters', character.id), { className: val, charClass: val });
                  console.log("Class successfully updated in DB");
                }
              } catch(err) { 
                console.error("Firestore Update Failed:", err); 
              }
            }}
          >
            <option value="">Select Class</option>
            <option value="Barbarian">Barbarian</option>
            <option value="Bard">Bard</option>
            <option value="Cleric">Cleric</option>
            <option value="Druid">Druid</option>
            <option value="Fighter">Fighter</option>
            <option value="Monk">Monk</option>
            <option value="Paladin">Paladin</option>
            <option value="Ranger">Ranger</option>
            <option value="Rogue">Rogue</option>
            <option value="Sorcerer">Sorcerer</option>
            <option value="Warlock">Warlock</option>
            <option value="Wizard">Wizard</option>
          </select>
        </div>
        
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-[var(--text-muted)] tracking-widest font-bold">Level</label>
          <input 
            type="number" 
            className="input-fantasy text-sm py-1 w-20"
            min={1} max={20}
            value={localLevel}
            onChange={async (e) => {
              const val = parseInt(e.target.value, 10) || 1;
              setLocalLevel(val);
              store.updateCharacter(character.id, { level: val });
              try {
                if (character?.id) {
                  await updateDoc(doc(db, 'characters', character.id), { level: val });
                  console.log("Level successfully updated in DB");
                }
              } catch(err) { 
                console.error("Firestore Update Failed:", err); 
              }
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* LEFT: Class Features */}
        <div className="glass-panel p-4 flex flex-col gap-4">
          <div className="section-heading flex justify-between items-center border-b border-[var(--border)] pb-2 mb-2">
            <h3 className="m-0 text-secondary" style={{ textShadow: '0 0 10px var(--secondary-glow)' }}>🛡️ Class Features</h3>
            <span className="badge-fantasy">Level {localLevel} {localClass}</span>
          </div>
          
          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {classFeatures.length === 0 ? (
              <div className="text-center text-sm text-[var(--text-muted)] italic p-4">No features unlocked yet.</div>
            ) : (
              classFeatures.map(feat => (
                <div key={feat.id} className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-darker)] shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-accent">{feat.name}</span>
                    <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded">Level {feat.levelRequired}</span>
                  </div>
                  <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{feat.description}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Feats */}
        <div className="glass-panel p-4 flex flex-col gap-4">
          <div className="section-heading flex justify-between items-center border-b border-[var(--border)] pb-2 mb-2">
            <h3 className="m-0 text-secondary" style={{ textShadow: '0 0 10px var(--secondary-glow)' }}>⭐ Feats</h3>
            <button 
              className="btn-fantasy py-1 px-3 text-xs"
              onClick={() => setIsFeatModalOpen(true)}
            >
              + Learn New Feat
            </button>
          </div>
          
          <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
            {(!character.feats || character.feats.length === 0) ? (
              <div className="text-center text-sm text-[var(--text-muted)] italic p-4">No feats acquired yet.</div>
            ) : (
              character.feats.map((feat: any) => (
                <div key={feat.id} className="p-3 rounded-lg border border-[var(--border)] bg-purple-900/10 shadow-sm relative group">
                  <button 
                    onClick={() => handleRemoveFeat(feat.id)}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕ Remove
                  </button>
                  <div className="flex flex-col mb-2 pr-12">
                    <span className="font-bold text-purple-300">{feat.name}</span>
                    {feat.prerequisite && <span className="text-[10px] text-purple-400/60 italic">Requires: {feat.prerequisite}</span>}
                  </div>
                  <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{feat.description}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isFeatModalOpen && (
        <FeatCompendiumModal 
          onClose={() => setIsFeatModalOpen(false)} 
          character={character}
          store={store}
        />
      )}
    </div>
  );
}

// ====== MODAL COMPENDIUM ======
function FeatCompendiumModal({ onClose, character, store }: { onClose: () => void, character: Character, store: any }) {
  const [feats, setFeats] = useState<Feat[]>([]);
  const [search, setSearch] = useState('');
  
  useEffect(() => {
    const q = query(collection(db, 'feats'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allFeats = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: String(data.name || ''),
          description: String(data.description || ''),
          prerequisite: String(data.prerequisite || '')
        } as unknown as Feat;
      });
      allFeats.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      setFeats(allFeats);
    });
    return () => unsubscribe();
  }, []);

  const filteredFeats = useMemo(() => {
    return feats.filter(f => !search || String(f.name || '').toLowerCase().includes(search.toLowerCase()));
  }, [feats, search]);

  const handleLearnFeat = async (feat: Feat) => {
    const currentFeats = character.feats || [];
    if (currentFeats.find((f: any) => f.name === feat.name)) {
      return alert("You already have this feat.");
    }

    const updatedFeats = [...currentFeats, feat];
    store.updateCharacter(character.id, { feats: updatedFeats });
    try {
      await updateDoc(doc(db, 'characters', character.id), { feats: updatedFeats });
    } catch(err) { console.error("Firestore sync failed", err); }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="glass-panel w-full max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-[var(--border-accent)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-darker)]">
          <div className="flex flex-col">
            <h2 className="font-heading text-xl text-accent m-0">Compendium: Feats</h2>
            <div className="text-xs text-[var(--text-muted)] mt-1">Total Feats Loaded: {feats.length}</div>
          </div>
          <button className="text-[var(--text-muted)] hover:text-white" onClick={onClose}>✕</button>
        </div>
        
        <div className="p-4 bg-[var(--surface-dark)] border-b border-[var(--border)]">
          <input 
            type="text" 
            placeholder="Search feats..." 
            className="input-fantasy w-full"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-3 bg-[var(--bg-dark)]">
          {filteredFeats.map(feat => (
            <div key={feat.id} className="p-4 rounded-lg border border-[var(--border)] bg-[var(--surface-light)] flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="font-bold text-lg text-white">{feat.name}</span>
                  {feat.prerequisite && <span className="text-[10px] text-yellow-500/80 uppercase tracking-widest mt-1">Prerequisite: {feat.prerequisite}</span>}
                </div>
                <button 
                  className="btn-fantasy py-1 px-4 text-xs shadow-[0_0_10px_var(--secondary-glow)]"
                  onClick={() => handleLearnFeat(feat)}
                >
                  Learn Feat
                </button>
              </div>
              <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap mt-2">{feat.description}</div>
            </div>
          ))}
          {filteredFeats.length === 0 && (
            <div className="text-center p-8 text-[var(--text-muted)]">No feats found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
