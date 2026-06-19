import { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from '../firebase';
import { collection, query, onSnapshot, writeBatch, doc, getDocs, addDoc } from 'firebase/firestore';
import type { Spell } from '@frogs-world/shared/src/schema';

// ====== ONE-TIME SEEDING SCRIPT ======
export const seedSRDSpells = async () => {
  console.log("Triggering Fetch Seeder for Spells...");
  alert("Seed Spells execution triggered! Please check the console for progress.");
  
  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`/srd-5.2-spells.json?t=${timestamp}`, { cache: "no-store" });
    
    // 1. Check if the response is actually JSON
    const contentType = response.headers.get("content-type");
    if (!response.ok || !contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Path Error: Server returned non-JSON content. First 100 chars:", text.substring(0, 100));
      throw new Error(`Expected JSON but received ${contentType}. Check the file path.`);
    }
    
    const data = await response.json();
    console.log(`Successfully parsed ${data.length} spells. Beginning upload...`);
    
    // Step 1: Nuke existing spells
    const collectionRef = collection(db, 'spells');
    const existingDocs = await getDocs(query(collectionRef));
    console.log(`Deleting ${existingDocs.size} existing spells...`);
    
    const deleteBatch = writeBatch(db);
    existingDocs.docs.forEach((d) => {
      deleteBatch.delete(d.ref);
    });
    await deleteBatch.commit();
    console.log("Old spells cleared. Beginning ingestion...");

    // Chunk data into arrays of 400 (Firestore limit is 500)
    const chunkSize = 400;
    let successCount = 0;
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      const batch = writeBatch(db);
      
      for (const raw of chunk) {
        const docRef = doc(collection(db, 'spells'));
        batch.set(docRef, {
          name: raw.name || 'Unknown Spell',
          level: raw.level || 0,
          school: raw.school || 'evocation',
          classes: raw.classes || [],
          castingTime: raw.actionType || '1 action',
          concentration: raw.concentration || false,
          ritual: raw.ritual || false,
          range: raw.range || 'Self',
          components: raw.components || [],
          duration: raw.duration || 'Instantaneous',
          description: raw.description || '',
          upgradeText: raw.cantripUpgrade || null,
          higherLevelSlot: raw.higherLevelSlot || null,
          material: raw.material || null,
          isCustom: false,
          isShared: true,
          authorId: 'SYSTEM'
        });
        successCount++;
      }
      
      await batch.commit();
      console.log(`Committed chunk of ${chunk.length} spells.`);
    }
    
    console.log(`Successfully seeded ${successCount} out of ${data.length} spells!`);
    alert(`Successfully seeded ${successCount} out of ${data.length} spells!`);
  } catch (error: any) {
    console.error("Firestore Spells Seeding Failed:", error);
    alert('Error seeding spells: ' + error.message);
  }
};

// ====== COMPONENT ======
export function SpellsCompendium({ role }: { role: 'dm' | 'player' | null }) {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch spells
  useEffect(() => {
    const q = query(collection(db, 'spells'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allSpells = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          name: String(data.name || ''),
          school: String(data.school || ''),
          castingTime: String(data.castingTime || ''),
          range: String(data.range || ''),
          duration: String(data.duration || ''),
          description: String(data.description || '')
        } as unknown as Spell;
      });
      
      // Apply privacy rules on client side since Firestore OR queries require specific indices
      const userId = auth.currentUser?.uid;
      const visibleSpells = allSpells.filter(s => {
        if (!s.isCustom) return true;
        if (s.isShared) return true;
        if (role === 'dm') return true;
        if (s.authorId === userId) return true;
        return false;
      });
      
      setSpells(visibleSpells);
    });
    return () => unsubscribe();
  }, [role]);

  const filteredSpells = useMemo(() => {
    return spells.filter(s => {
      const safeName = String(s.name || '');
      const safeSchool = String(s.school || '');
      
      if (searchQuery && !safeName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterLevel !== 'all' && String(s.level) !== filterLevel) return false;
      if (filterSchool !== 'all' && safeSchool.toLowerCase() !== filterSchool.toLowerCase()) return false;
      if (filterClass !== 'all' && !(s.classes || []).some(c => String(c || '').toLowerCase() === filterClass.toLowerCase())) return false;
      return true;
    }).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [spells, searchQuery, filterLevel, filterClass, filterSchool]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterLevel, filterClass, filterSchool]);

  const paginatedSpells = useMemo(() => {
    return filteredSpells.slice((currentPage - 1) * 20, currentPage * 20);
  }, [filteredSpells, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredSpells.length / 20));

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* HEADER CONTROLS */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10">
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
          <input 
            type="text" 
            placeholder="Search spells..." 
            className="input-fantasy min-w-[200px]"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <select className="input-fantasy" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
            <option value="all">All Levels</option>
            <option value="0">Cantrip</option>
            {[1,2,3,4,5,6,7,8,9].map(lvl => <option key={lvl} value={lvl.toString()}>Level {lvl}</option>)}
          </select>
          <select className="input-fantasy capitalize" value={filterSchool} onChange={e => setFilterSchool(e.target.value)}>
            <option value="all">All Schools</option>
            {['abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation'].map(sch => (
              <option key={sch} value={sch}>{sch}</option>
            ))}
          </select>
          <select className="input-fantasy capitalize" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="all">All Classes</option>
            {['artificer', 'bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'].map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>
        </div>
        
        <button onClick={() => setShowCreator(true)} className="btn-fantasy whitespace-nowrap">
          + Add Custom Spell
        </button>
      </div>

      {/* LIST RENDERING */}
      <div className="glass-panel p-0 flex flex-col flex-1 relative overflow-hidden h-[600px]">
        <div className="grid grid-cols-[1fr_80px_120px] gap-4 px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-[var(--border)] bg-black/40">
          <div>Spell Name</div>
          <div>Level</div>
          <div>School</div>
        </div>
        <div ref={listRef} className="flex flex-col flex-1 overflow-y-auto custom-scrollbar p-2">
          {paginatedSpells.map(spell => (
            <div 
              key={spell.id} 
              className="grid grid-cols-[1fr_80px_120px] gap-4 px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors items-center"
              onClick={() => setSelectedSpell(spell)}
            >
              <div className="font-bold text-accent">{spell.name} {spell.isCustom && <span className="text-[10px] bg-secondary/30 text-secondary px-1 py-0.5 rounded ml-2 uppercase">Custom</span>}</div>
              <div className="text-sm">{spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}</div>
              <div className="text-sm capitalize text-muted-foreground">{spell.school}</div>
            </div>
          ))}
          {filteredSpells.length === 0 && <div className="text-center py-8 text-muted-foreground italic">No spells found matching filters.</div>}
        </div>
        
        {/* Pagination Controls */}
        {filteredSpells.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-t border-[var(--border)] bg-black/60 backdrop-blur-md">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Showing {(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, filteredSpells.length)} of {filteredSpells.length} spells
            </span>
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <button 
                className="btn-fantasy py-1 px-4 text-sm"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                Previous
              </button>
              <span className="text-sm font-bold text-secondary">Page {currentPage} of {totalPages}</span>
              <button 
                className="btn-fantasy py-1 px-4 text-sm"
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* READ OVERLAY */}
      {selectedSpell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up">
          <div className="glass-panel max-w-2xl w-full max-h-[90vh] flex flex-col relative overflow-hidden">
            <button onClick={() => setSelectedSpell(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-white text-xl z-10">✕</button>
            <div className="p-6 border-b border-[var(--border)] bg-black/40">
              <h2 className="font-heading text-3xl text-accent mb-1">{selectedSpell.name}</h2>
              <div className="text-sm italic text-muted-foreground capitalize">
                {selectedSpell.level === 0 ? `${selectedSpell.school} Cantrip` : `Level ${selectedSpell.level} ${selectedSpell.school}`}
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar text-sm">
              <div className="grid grid-cols-2 gap-4 mb-6 bg-black/20 p-4 rounded border border-[var(--border)]">
                <div><span className="font-bold text-secondary">Casting Time:</span> {selectedSpell.castingTime}</div>
                <div><span className="font-bold text-secondary">Range:</span> {selectedSpell.range}</div>
                <div><span className="font-bold text-secondary">Components:</span> {(selectedSpell.components || []).join(', ').toUpperCase()}</div>
                <div><span className="font-bold text-secondary">Duration:</span> {selectedSpell.duration}</div>
              </div>
              
              <div className="whitespace-pre-wrap leading-relaxed mt-4">
                {selectedSpell.description}
              </div>
              
              {selectedSpell.material && (
                <div className="mt-4 pt-4 border-t border-[var(--border)] text-muted-foreground text-xs">
                  <span className="font-bold text-secondary">Materials:</span> {selectedSpell.material}
                </div>
              )}
              
              {selectedSpell.upgradeText && (
                <div className="mt-4 pt-4 border-t border-[var(--border)] text-muted-foreground italic">
                  <span className="font-bold text-secondary not-italic">At Higher Levels:</span> {selectedSpell.upgradeText}
                </div>
              )}
              
              {selectedSpell.higherLevelSlot && (
                <div className="mt-4 pt-4 border-t border-[var(--border)] text-muted-foreground italic">
                  <span className="font-bold text-secondary not-italic">At Higher Levels:</span> {selectedSpell.higherLevelSlot}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WRITE OVERLAY */}
      {showCreator && (
        <SpellCreatorModal onClose={() => setShowCreator(false)} />
      )}
    </div>
  );
}

function SpellCreatorModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState<Partial<Spell>>({
    name: '',
    level: 0,
    school: 'evocation',
    classes: ['wizard'],
    castingTime: '1 action',
    range: '60 feet',
    components: ['V', 'S'],
    duration: 'Instantaneous',
    description: '',
    isShared: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.description) return alert('Name and Description are required!');
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'spells'), {
        ...formData,
        isCustom: true,
        authorId: auth.currentUser?.uid || 'unknown'
      });
      onClose();
    } catch (e: any) {
      alert('Error creating spell: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up">
      <div className="glass-panel max-w-2xl w-full max-h-[90vh] flex flex-col relative overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-black/40">
          <h2 className="font-heading text-xl text-accent">Create Custom Spell</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">✕</button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-secondary font-bold">Spell Name</span>
              <input className="input-fantasy" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-secondary font-bold">Level</span>
              <input type="number" min="0" max="9" className="input-fantasy" value={formData.level} onChange={e => setFormData({ ...formData, level: parseInt(e.target.value) || 0 })} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-secondary font-bold">School</span>
              <input className="input-fantasy" value={formData.school} onChange={e => setFormData({ ...formData, school: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-secondary font-bold">Casting Time</span>
              <input className="input-fantasy" value={formData.castingTime} onChange={e => setFormData({ ...formData, castingTime: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-secondary font-bold">Range</span>
              <input className="input-fantasy" value={formData.range} onChange={e => setFormData({ ...formData, range: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-secondary font-bold">Duration</span>
              <input className="input-fantasy" value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} />
            </label>
          </div>
          
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-secondary font-bold">Description</span>
            <textarea 
              className="input-fantasy min-h-[150px] custom-scrollbar" 
              value={formData.description} 
              onChange={e => setFormData({ ...formData, description: e.target.value })} 
              placeholder="Use newlines for paragraph breaks..."
            />
          </label>
          
          <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox" 
              id="shareToggle" 
              checked={formData.isShared} 
              onChange={e => setFormData({ ...formData, isShared: e.target.checked })}
              className="w-4 h-4 accent-secondary"
            />
            <label htmlFor="shareToggle" className="text-sm cursor-pointer select-none">Share with Campaign (visible to all players)</label>
          </div>
          
          <button onClick={handleSubmit} disabled={isSubmitting} className="btn-fantasy mt-4">
            {isSubmitting ? 'Saving...' : 'Save Spell'}
          </button>
        </div>
      </div>
    </div>
  );
}
