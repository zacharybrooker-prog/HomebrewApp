import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import type { EquipmentItem, CharacterProfile } from '@frogs-world/shared/src/schema';
import { v4 as uuidv4 } from 'uuid';
import equipmentData from '../data/srd-5.2-equipment.json';

// ====== ONE-TIME SEEDING SCRIPT ======
export const seedStandardGearJSON = async () => {
  try {
    let batch = writeBatch(db);
    let count = 0;
    
    if (!Array.isArray(equipmentData)) {
        throw new Error("Invalid equipment JSON format. Expected an array.");
    }

    for (const item of equipmentData) {
      
      const itemData: EquipmentItem = {
        id: uuidv4(),
        name: item.name || 'Unknown',
        equipmentCategory: item.equipmentCategory || 'Gear',
        cost: item.cost,
        weight: item.weight ? parseFloat(item.weight.toString()) || item.weight : undefined,
        description: Array.isArray(item.description) ? item.description.join('\n') : item.description || '',
        damage: item.damage,
        properties: item.properties,
        armorClass: item.armorClass,
        stealthDisadvantage: item.stealthDisadvantage,
        strengthRequirement: item.strengthRequirement,
        isCustom: false,
        isShared: true,
        authorId: "SYSTEM"
      };

      const docRef = doc(collection(db, 'equipment'));
      const cleanData = Object.fromEntries(Object.entries(itemData).filter(([_, v]) => v !== undefined));
      batch.set(docRef, cleanData);
      count++;

      if (count === 490) {
        await batch.commit();
        batch = writeBatch(db);
        count = 0;
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
    
    alert(`Successfully seeded ${equipmentData.length} standard gear items to Firestore!`);
  } catch (err: any) {
    console.error("Seeding error:", err);
    alert(`Seeding failed: ${err.message}`);
  }
};

// ====== COMPONENT ======
export function EquipmentCompendium({ role, store, activeCharId, characterProfiles }: { role: string | null, store: any, activeCharId: string | null, characterProfiles: CharacterProfile[] }) {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  const [showDMPopoverId, setShowDMPopoverId] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const q = query(collection(db, 'equipment'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allItems = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          name: String(data.name || ''),
          equipmentCategory: String(data.equipmentCategory || ''),
          description: String(data.description || '')
        } as unknown as EquipmentItem;
      });
      allItems.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      setItems(allItems);
    });
    return () => unsubscribe();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCategory]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const safeName = String(item.name || '');
      const safeCat = String(item.equipmentCategory || '');

      if (search && !safeName.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory && safeCat !== filterCategory) return false;
      return true;
    });
  }, [items, search, filterCategory]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const determineValidSlots = (category: string, name: string): string[] => {
    const cat = (category || '').toLowerCase();
    const n = (name || '').toLowerCase();
    
    if (n.includes('helm') || n.includes('hat') || n.includes('crown') || n.includes('hood')) {
        return ['head'];
    }
    if (n.includes('boots') || n.includes('shoes')) {
        return ['feet'];
    }
    if (n.includes('ring')) {
        return ['ring1', 'ring2'];
    }
    if (n.includes('amulet') || n.includes('necklace')) {
        return ['amulet'];
    }
    if (n.includes('belt')) {
        return ['belt'];
    }
    if (n.includes('mask')) {
        return ['mask'];
    }
    if (n.includes('gloves') || n.includes('gauntlets')) {
        return ['hands'];
    }
    if (cat.includes('weapon') || cat.includes('shield')) {
        return ['mainHand', 'offHand'];
    }
    if (cat.includes('armor')) {
        return ['torso'];
    }
    return []; // Storage only
  };

  const handleGrantItem = (item: EquipmentItem, targetCharId: string) => {
    const instance = {
      id: uuidv4(),
      templateId: item.id,
      name: item.name,
      type: 'Gear',
      attunement: false,
      damage: item.damage,
      effectDescription: item.description,
      quantity: 1,
      equipped: false,
      effectsOnEquip: [],
      validSlots: determineValidSlots(item.equipmentCategory, item.name)
    };

    const targetChar = store.getCharacterMap(targetCharId);
    if (!targetChar) return alert('Character not found');

    const storage = targetChar.get('mainStorage') || [];
    if (storage.length >= 15) {
        const extraPlanar = targetChar.get('extraPlanarStorage') || [];
        targetChar.set('extraPlanarStorage', [...extraPlanar, instance]);
    } else {
        targetChar.set('mainStorage', [...storage, instance]);
    }

    setShowDMPopoverId(null);
    setSelectedItem(null);
  };

  return (
    <div className="w-full max-w-5xl mx-auto h-full flex flex-col pt-4">
      
      {/* HEADER CONTROLS */}
      <div className="mb-4 flex flex-col md:flex-row gap-3">
        <input 
          type="text" 
          placeholder="Search gear..." 
          className="input-fantasy flex-1"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        
        <select 
          className="input-fantasy"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          <option value="Weapon">Weapons</option>
          <option value="Armor">Armor</option>
          <option value="Adventuring Gear">Adventuring Gear</option>
          <option value="Tools">Tools</option>
          <option value="Mounts and Vehicles">Mounts and Vehicles</option>
        </select>
        
        {role === 'dm' && (
          <button className="btn-fantasy text-sm py-1 px-3" onClick={() => alert('Custom gear creator coming soon')}>
            Add Custom Gear
          </button>
        )}
      </div>

      {/* LIST UI */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-2">
        {paginatedItems.map(item => (
          <div 
            key={item.id} 
            className="flex items-center justify-between p-3 rounded-lg border border-[var(--border)] cursor-pointer transition-all bg-[var(--surface-dark)] hover:bg-[var(--surface-light)] hover:border-[var(--accent)]"
            onClick={() => setSelectedItem(item)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-[var(--bg-darker)] flex items-center justify-center border border-[var(--border-accent)] text-xl">
                 {item.equipmentCategory === 'Weapon' ? '⚔️' : item.equipmentCategory === 'Armor' ? '🛡️' : '🎒'}
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-semibold text-gray-100 text-md truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">
                  {item.name}
                </span>
                <span className="text-xs text-[var(--text-muted)] uppercase tracking-wider">{item.equipmentCategory}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              {item.damage && <span className="badge-fantasy text-[10px] whitespace-nowrap bg-red-900/40 text-red-200 border-red-900/30">Dmg: {typeof item.damage === 'object' ? JSON.stringify(item.damage) : item.damage}</span>}
              {item.armorClass && <span className="badge-fantasy text-[10px] whitespace-nowrap bg-blue-900/40 text-blue-200 border-blue-900/30">AC: {typeof item.armorClass === 'object' ? JSON.stringify(item.armorClass) : item.armorClass}</span>}
              {!item.damage && !item.armorClass && item.cost && <span className="badge-fantasy text-[10px] whitespace-nowrap bg-yellow-900/40 text-yellow-200 border-yellow-900/30">{typeof item.cost === 'string' ? item.cost : JSON.stringify(item.cost)}</span>}
            </div>
          </div>
        ))}
        {paginatedItems.length === 0 && (
          <div className="text-center p-8 text-[var(--text-muted)] font-heading">
            No equipment found matching criteria.
          </div>
        )}
      </div>

      {/* PAGINATION */}
      <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4 pb-2">
        <button 
          className="btn-ghost px-4 py-1 disabled:opacity-50"
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
        >
          &larr; Prev
        </button>
        <span className="font-heading text-sm text-[var(--text-muted)]">
          Page {currentPage} of {totalPages}
        </span>
        <button 
          className="btn-ghost px-4 py-1 disabled:opacity-50"
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
        >
          Next &rarr;
        </button>
      </div>

      {/* FLOATING GEAR CARD */}
      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedItem(null)}>
          <div 
            className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl border border-[var(--border-accent)] bg-[var(--surface-dark)] shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border)] bg-gradient-to-b from-[var(--surface-light)] to-transparent relative">
              <button 
                className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-white transition-colors"
                onClick={() => setSelectedItem(null)}
              >
                ✕
              </button>
              <div className="flex flex-col gap-1 pr-6">
                <h2 className="font-heading font-bold text-2xl text-secondary" style={{ textShadow: '0 0 10px var(--secondary-glow)' }}>
                  {selectedItem.name}
                </h2>
                <div className="flex flex-wrap gap-2 items-center text-xs font-heading tracking-widest text-[var(--text-muted)] uppercase">
                  <span>{selectedItem.equipmentCategory}</span>
                  {selectedItem.weight && (
                    <>
                      <span>•</span>
                      <span>{selectedItem.weight} lb</span>
                    </>
                  )}
                  {selectedItem.cost && (
                    <>
                      <span>•</span>
                      <span className="text-yellow-400/80">{typeof selectedItem.cost === 'string' ? selectedItem.cost : JSON.stringify(selectedItem.cost)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4">
              
              {/* Conditional Middle Section */}
              {selectedItem.equipmentCategory === 'Weapon' && (
                <div className="flex flex-col gap-2 p-3 rounded bg-[var(--bg-darker)] border border-[var(--border)]">
                  {selectedItem.damage && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase font-heading tracking-widest text-[var(--text-muted)]">Damage</span>
                      <span className="font-bold text-red-400">{typeof selectedItem.damage === 'object' ? JSON.stringify(selectedItem.damage) : selectedItem.damage}</span>
                    </div>
                  )}
                  {selectedItem.properties && Array.isArray(selectedItem.properties) && selectedItem.properties.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedItem.properties.map((prop, i) => (
                        <span key={`${prop}-${i}`} className="text-[10px] px-2 py-0.5 rounded-full border border-[var(--border-accent)] text-[var(--text-muted)]">
                          {typeof prop === 'object' ? JSON.stringify(prop) : prop}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedItem.equipmentCategory === 'Armor' && (
                <div className="flex flex-col gap-2 p-3 rounded bg-[var(--bg-darker)] border border-[var(--border)]">
                  {selectedItem.armorClass && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase font-heading tracking-widest text-[var(--text-muted)]">Armor Class</span>
                      <span className="font-bold text-blue-400">{typeof selectedItem.armorClass === 'object' ? JSON.stringify(selectedItem.armorClass) : selectedItem.armorClass}</span>
                    </div>
                  )}
                  {(selectedItem.strengthRequirement || selectedItem.stealthDisadvantage) && (
                    <div className="flex justify-between items-center border-t border-[var(--border)] pt-2 mt-1">
                      {selectedItem.strengthRequirement ? <span className="text-xs text-[var(--text-muted)]">Requires Str {selectedItem.strengthRequirement}</span> : <span />}
                      {selectedItem.stealthDisadvantage && <span className="text-xs text-red-400/80">Stealth Disadvantage</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap mt-2">
                {typeof selectedItem.description === 'object' ? JSON.stringify(selectedItem.description) : selectedItem.description}
              </div>
            </div>

            {/* Modal Footer / Actions */}
            <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-darker)] flex justify-end gap-2 relative">
              {role === 'dm' ? (
                <>
                  <button 
                    className="btn-fantasy py-2 px-6"
                    onClick={() => setShowDMPopoverId(selectedItem.id || null)}
                  >
                    Grant to Player
                  </button>
                  {showDMPopoverId === selectedItem.id && (
                    <div className="absolute bottom-full mb-2 right-4 glass-panel p-3 animate-fade-in-up w-64 z-50">
                      <h4 className="font-heading text-xs uppercase tracking-widest text-secondary mb-2">Select Player</h4>
                      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                        {characterProfiles.map(p => (
                          <button 
                            key={p.id}
                            className="text-left text-sm px-3 py-2 rounded hover:bg-[var(--accent)] hover:text-black transition-colors"
                            onClick={() => handleGrantItem(selectedItem, p.id)}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button 
                  className="btn-fantasy py-2 px-6"
                  onClick={() => {
                    if (activeCharId) handleGrantItem(selectedItem, activeCharId);
                  }}
                >
                  Add to Inventory
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
