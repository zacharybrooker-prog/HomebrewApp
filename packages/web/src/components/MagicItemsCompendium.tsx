import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, writeBatch, doc } from 'firebase/firestore';
import type { MagicItem, CharacterProfile } from '@frogs-world/shared/src/schema';
import { v4 as uuidv4 } from 'uuid';
import itemsData from '../data/srd-5.2-items.json';

// ====== ONE-TIME SEEDING SCRIPT ======
export const seedMagicItemsJSON = async () => {
  try {
    let batch = writeBatch(db);
    let count = 0;
    
    const magicItemsGroup = (itemsData as any)["Magic Items"];
    if (!magicItemsGroup) throw new Error("Could not find 'Magic Items' key in JSON.");

    for (const key of Object.keys(magicItemsGroup)) {
      if (key === 'content') continue;
      
      const raw = magicItemsGroup[key];
      const contentArr = raw.content;
      if (!Array.isArray(contentArr) || contentArr.length === 0) continue;

      const firstLine = contentArr.length > 0 && typeof contentArr[0] === 'string' ? contentArr[0] : "";
      const metaString = firstLine.replace(/\*/g, '').trim();
      
      const requiresAttunement = metaString ? metaString.toLowerCase().includes('requires attunement') : false;
      
      const rarityMatch = metaString ? metaString.match(/(uncommon|very rare|rare|legendary|artifact|varies|common)/i) : null;
      const rarity = rarityMatch ? rarityMatch[0].toLowerCase() : 'unknown';
      
      const typeStr = metaString ? metaString.split(/[(,]/)[0].trim() : '';
      const type = typeStr ? typeStr : 'Wondrous Item';

      const startIndex = (contentArr.length > 0 && typeof contentArr[0] === 'string' && contentArr[0].startsWith('*')) ? 1 : 0;
      const descLines = contentArr.slice(startIndex).map((line: any) => {
        if (typeof line === 'string') return line;
        if (typeof line === 'object' && line !== null) {
          if (line.table) return JSON.stringify(line.table, null, 2);
          return JSON.stringify(line);
        }
        return '';
      }).filter(Boolean);
      const description = descLines.join('\n\n');

      const itemData: MagicItem = {
        name: key,
        type,
        rarity,
        requiresAttunement,
        description
      };

      const docRef = doc(collection(db, 'magicItems'));
      batch.set(docRef, itemData);
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
    
    alert(`Successfully seeded magic items to Firestore!`);
  } catch (err: any) {
    console.error("Seeding error:", err);
    alert(`Seeding failed: ${err.message}`);
  }
};

// ====== COMPONENT ======
export function MagicItemsCompendium({ role, store, activeCharId, characterProfiles }: { role: string | null, store: any, activeCharId: string | null, characterProfiles: CharacterProfile[] }) {
  const [items, setItems] = useState<MagicItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchLetter, setSearchLetter] = useState('');
  const [filterRarity, setFilterRarity] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAttunement, setFilterAttunement] = useState('');
  
  const [selectedItem, setSelectedItem] = useState<MagicItem | null>(null);
  const [showDMPopoverId, setShowDMPopoverId] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const q = query(collection(db, 'magicItems'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MagicItem));
      allItems.sort((a, b) => a.name.localeCompare(b.name));
      setItems(allItems);
    });
    return () => unsubscribe();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, searchLetter, filterRarity, filterType, filterAttunement]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (searchLetter && !item.name.toUpperCase().startsWith(searchLetter)) return false;
      if (filterRarity && item.rarity !== filterRarity) return false;
      if (filterType && item.type.toLowerCase() !== filterType.toLowerCase()) return false;
      if (filterAttunement) {
        if (filterAttunement === 'yes' && !item.requiresAttunement) return false;
        if (filterAttunement === 'no' && item.requiresAttunement) return false;
      }
      return true;
    });
  }, [items, search, searchLetter, filterRarity, filterType, filterAttunement]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(items.map(i => i.type));
    return Array.from(types).sort();
  }, [items]);

  // Safe Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / 10));
  const safePage = Math.min(currentPage, totalPages);
  const currentItems = filteredItems.slice((safePage - 1) * 10, safePage * 10);

  const handleGrant = (targetCharId: string, item: MagicItem) => {
    if (!targetCharId) return;
    
    const instance = {
      id: uuidv4(),
      templateId: item.id,
      name: item.name,
      type: item.type,
      attunement: item.requiresAttunement,
      effectDescription: item.description,
      quantity: 1,
      equipped: false,
      effectsOnEquip: []
    };
    
    try {
      const charMap = store.getCharacterMap(targetCharId);
      const mainStorage = charMap.get('mainStorage') || [];
      const extraPlanarStorage = charMap.get('extraPlanarStorage') || [];
      
      if (mainStorage.length < 20) { 
        charMap.set('mainStorage', [...mainStorage, instance]);
      } else {
        charMap.set('extraPlanarStorage', [...extraPlanarStorage, instance]);
      }
      
      alert(`Granted ${item.name} to character!`);
    } catch (e: any) {
      console.error(e);
      alert('Failed to grant item.');
    }
  };

  const getItemIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('weapon')) return '⚔️';
    if (t.includes('armor') || t.includes('shield')) return '🛡️';
    if (t.includes('potion')) return '🧪';
    if (t.includes('ring')) return '💍';
    if (t.includes('scroll')) return '📜';
    if (t.includes('staff') || t.includes('wand') || t.includes('rod')) return '🦯';
    if (t.includes('wondrous')) return '🔮';
    return '🎒';
  };

  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'uncommon': return { badge: 'bg-green-900/50 text-green-400 border-green-700/50', aura: 'hover:border-green-400 hover:shadow-[0_0_15px_rgba(74,222,128,0.2)] hover:border-l-[3px]', glow: 'rgba(74,222,128,0.6)' };
      case 'rare': return { badge: 'bg-blue-900/50 text-blue-400 border-blue-700/50', aura: 'hover:border-blue-400 hover:shadow-[0_0_15px_rgba(96,165,250,0.2)] hover:border-l-[3px]', glow: 'rgba(96,165,250,0.6)' };
      case 'very rare': return { badge: 'bg-purple-900/50 text-purple-400 border-purple-700/50', aura: 'hover:border-purple-400 hover:shadow-[0_0_15px_rgba(192,132,252,0.2)] hover:border-l-[3px]', glow: 'rgba(192,132,252,0.6)' };
      case 'legendary': return { badge: 'bg-yellow-900/50 text-yellow-400 border-yellow-700/50', aura: 'hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(250,204,21,0.2)] hover:border-l-[3px]', glow: 'rgba(250,204,21,0.6)' };
      case 'artifact': return { badge: 'bg-red-900/50 text-red-400 border-red-700/50', aura: 'hover:border-red-400 hover:shadow-[0_0_15px_rgba(248,113,113,0.2)] hover:border-l-[3px]', glow: 'rgba(248,113,113,0.6)' };
      default: return { badge: 'bg-gray-800 text-gray-300 border-gray-600', aura: 'hover:border-gray-400 hover:shadow-[0_0_15px_rgba(156,163,175,0.2)] hover:border-l-[3px]', glow: 'rgba(156,163,175,0.6)' };
    }
  };

  return (
    <div className="w-full flex flex-col items-center animate-fade-in-up pb-20">
      
      {/* HEADER CONTROLS */}
      <div className="w-full max-w-5xl sticky top-[70px] z-[50] p-4 mb-4 rounded-b-xl border-x border-b shadow-lg glass-panel flex flex-col gap-3" 
           style={{ borderColor: 'var(--border-accent)', background: 'rgba(10, 15, 25, 0.85)', backdropFilter: 'blur(12px)' }}>
        
        <div className="flex flex-col md:flex-row gap-3">
          <input 
            type="text"
            placeholder="Search items..."
            className="input-fantasy flex-1"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="select-fantasy w-full md:w-40" value={filterRarity} onChange={e => setFilterRarity(e.target.value)}>
            <option value="">All Rarities</option>
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="very rare">Very Rare</option>
            <option value="legendary">Legendary</option>
            <option value="artifact">Artifact</option>
            <option value="varies">Varies</option>
          </select>
          <select className="select-fantasy w-full md:w-40" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="select-fantasy w-full md:w-40" value={filterAttunement} onChange={e => setFilterAttunement(e.target.value)}>
            <option value="">Attunement: Any</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        {/* A-Z Quick Jump */}
        <div className="flex flex-wrap gap-1 justify-center mt-2">
          {['All', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')].map(letter => (
            <button 
              key={letter} 
              onClick={() => setSearchLetter(letter === 'All' ? '' : letter)} 
              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${searchLetter === letter || (letter === 'All' && !searchLetter) ? 'bg-accent text-black font-bold border-accent shadow-[0_0_8px_var(--accent-glow)]' : 'bg-black/40 text-white/70 border-white/20 hover:bg-white/10'}`}
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* ITEMS LIST (Vertical Flexbox) */}
      <div className="w-full max-w-5xl flex flex-col gap-2 px-2">
        {currentItems.map(item => {
          const rStyle = getRarityStyles(item.rarity);
          return (
            <div 
              key={item.id} 
              onClick={() => setSelectedItem(item)}
              className={`flex justify-between items-center px-4 py-3 cursor-pointer select-none rounded-lg bg-[#161618]/70 backdrop-blur-md border-b border-[#b8860b]/15 border-l-[3px] border-l-transparent transition-all duration-300 ease-out hover:translate-x-1 ${rStyle.aura}`}
            >
              {/* Left Section: Icon & Stacked Text */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 shrink-0 flex justify-center items-center rounded-lg bg-black/60 shadow-[inset_0_0_8px_rgba(0,0,0,0.8)] border border-white/5 relative overflow-hidden">
                   <div className="absolute inset-0 opacity-20 animate-pulse bg-gradient-to-tr from-transparent via-white to-transparent" />
                   <span className="text-xl relative z-10" style={{ filter: `drop-shadow(0 0 5px ${rStyle.glow})` }}>
                     {getItemIcon(item.type)}
                   </span>
                </div>
                <div className="flex flex-col justify-center">
                  <span className="font-heading font-semibold text-gray-100 text-md truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px]">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest truncate">
                    {item.type}
                  </span>
                </div>
              </div>

              {/* Right Section: Badges & Indicators */}
              <div className="flex items-center gap-3">
                {item.requiresAttunement && (
                  <span className="text-sm text-accent animate-pulse" title="Requires Attunement">🔗</span>
                )}
                <span className={`hidden sm:inline-block px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${rStyle.badge}`}>
                  {item.rarity}
                </span>
                <span className="text-gray-500 font-bold ml-1 opacity-50">&gt;</span>
              </div>
            </div>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="text-center text-muted-foreground py-10 italic border border-dashed border-white/10 rounded-lg">
            No magic items found matching your criteria...
          </div>
        )}
      </div>

      {/* PAGINATION CONTROLS */}
      {filteredItems.length > 0 && (
        <div className="flex items-center gap-4 mt-6 glass-panel px-4 py-2 border-[var(--border-accent)] rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <button 
            disabled={safePage === 1} 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="btn-ghost px-3 py-1 text-sm disabled:opacity-30"
          >
            ◀ Prev
          </button>
          
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold font-mono min-w-[100px] text-center">
            <span className="text-white">{safePage}</span> / {totalPages}
          </div>
          
          <button 
            disabled={safePage === totalPages} 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="btn-ghost px-3 py-1 text-sm disabled:opacity-30"
          >
            Next ▶
          </button>
        </div>
      )}

      {/* FLOATING ITEM CARD MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => { setSelectedItem(null); setShowDMPopoverId(null); }}>
          <div 
            className="w-full max-w-lg glass-panel p-0 flex flex-col max-h-[85vh] shadow-[0_0_40px_rgba(0,0,0,0.8)] border-[var(--border-accent)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--border)] bg-black/40 flex justify-between items-start rounded-t-xl">
              <div>
                <h2 className="font-heading font-bold text-2xl text-secondary" style={{ textShadow: '0 0 10px var(--secondary-glow)' }}>
                  {selectedItem.name}
                </h2>
                <div className="text-sm text-muted-foreground italic mt-1">
                  {selectedItem.type}, {selectedItem.rarity} {selectedItem.requiresAttunement ? '(requires attunement)' : ''}
                </div>
              </div>
              <button onClick={() => { setSelectedItem(null); setShowDMPopoverId(null); }} className="text-muted-foreground hover:text-white transition-colors text-2xl leading-none">&times;</button>
            </div>
            
            {/* Modal Body */}
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
              {selectedItem.description}
            </div>

            {/* Modal Footer / Loot Hook */}
            <div className="p-4 border-t border-[var(--border)] bg-black/40 rounded-b-xl relative">
              {role === 'dm' ? (
                <>
                  <button onClick={() => setShowDMPopoverId(showDMPopoverId === selectedItem.id ? null : (selectedItem.id || null))} className="btn-fantasy w-full py-2 uppercase tracking-widest font-bold">
                    Grant to Player
                  </button>
                  {showDMPopoverId === selectedItem.id && (
                    <div className="absolute bottom-full left-0 w-full mb-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-2 z-50 flex flex-col gap-1">
                      <div className="text-xs text-center text-muted-foreground uppercase tracking-widest font-bold mb-1">Select Character</div>
                      {characterProfiles.map(p => (
                        <button key={p.id} onClick={() => { handleGrant(p.id, selectedItem); setShowDMPopoverId(null); setSelectedItem(null); }} className="text-left px-3 py-2 rounded hover:bg-gray-800 text-sm font-bold text-white transition-colors">
                          <span className="block truncate">{p.name}</span>
                          <span className="text-[10px] text-gray-500 font-normal">{p.charClass}</span>
                        </button>
                      ))}
                      {characterProfiles.length === 0 && <div className="text-xs text-center p-2 text-gray-500">No active characters.</div>}
                    </div>
                  )}
                </>
              ) : (
                <button 
                  onClick={() => {
                    if (activeCharId) {
                      handleGrant(activeCharId, selectedItem);
                      setSelectedItem(null);
                    } else {
                      alert("No active character selected.");
                    }
                  }} 
                  className="btn-gold w-full py-2 uppercase tracking-widest font-bold"
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
