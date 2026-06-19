import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, writeBatch, doc, updateDoc } from 'firebase/firestore';
import type { BestiaryItem, Combatant } from '@frogs-world/shared/src/schema';
import { v4 as uuidv4 } from 'uuid';
import monstersData from '../data/srd_5e_monsters.json';

// ====== ONE-TIME SEEDING SCRIPT ======
export const seedBestiaryJSON = async () => {
  try {
    console.log(`Starting Bestiary Seed... Parsing ${monstersData.length} monsters.`);
    let batch = writeBatch(db);
    let count = 0;
    
    for (const raw of monstersData as any[]) {
      try {
        const metaStr = raw.meta || "";
        const commaSplit = metaStr.split(',');
        const sizeType = commaSplit[0] ? commaSplit[0].trim() : "Unknown";
        const alignment = commaSplit[1] ? commaSplit[1].trim() : "Unknown";
        
        const spaceIndex = sizeType.indexOf(' ');
        const size = spaceIndex > -1 ? sizeType.substring(0, spaceIndex).trim() : sizeType || "Unknown";
        const type = spaceIndex > -1 ? sizeType.substring(spaceIndex + 1).trim() : "Unknown";

        const hpRaw = raw["Hit Points"] || "10 (3d6)";
        
        const stats = {
          str: raw["STR"] || "10", str_mod: raw["STR_mod"] || "(+0)",
          dex: raw["DEX"] || "10", dex_mod: raw["DEX_mod"] || "(+0)",
          con: raw["CON"] || "10", con_mod: raw["CON_mod"] || "(+0)",
          int: raw["INT"] || "10", int_mod: raw["INT_mod"] || "(+0)",
          wis: raw["WIS"] || "10", wis_mod: raw["WIS_mod"] || "(+0)",
          cha: raw["CHA"] || "10", cha_mod: raw["CHA_mod"] || "(+0)",
        };

        const itemData: BestiaryItem = {
          name: raw.name || "Unknown Monster",
          size,
          type,
          alignment,
          ac: raw["Armor Class"] || "10",
          hp: hpRaw,
          speed: raw["Speed"] || "30 ft.",
          stats,
          savingThrows: raw["Saving Throws"] || "",
          skills: raw["Skills"] || "",
          damageResistances: raw["Damage Resistances"] || "",
          damageVulnerabilities: raw["Damage Vulnerabilities"] || "",
          damageImmunities: raw["Damage Immunities"] || "",
          conditionImmunities: raw["Condition Immunities"] || "",
          senses: raw["Senses"] || "",
          languages: raw["Languages"] || "",
          cr: raw["Challenge"] || "0",
          traits: raw["Traits"] || "",
          actions: raw["Actions"] || "",
          legendaryActions: raw["Legendary Actions"] || "",
          imgUrl: raw["img_url"] || null,
          isCustom: false,
          isShared: true,
          authorId: "SYSTEM",
          isRevealed: false
        };

        const docRef = doc(collection(db, 'bestiary'));
        batch.set(docRef, itemData);
        count++;

        if (count === 400) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      } catch (err) {
        console.error(`Failed to parse monster:`, raw, err);
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
    
    console.log(`Successfully seeded bestiary to Firestore!`);
    alert(`Bestiary seeded successfully!`);
  } catch (err: any) {
    console.error("Seeding error:", err);
    alert(`Seeding failed: ${err.message}`);
  }
};

// ====== COMPONENT ======
export function BestiaryCompendium({ role, store }: { role: string | null, store: any }) {
  const [items, setItems] = useState<BestiaryItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchLetter, setSearchLetter] = useState('');
  const [filterCR, setFilterCR] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterType, setFilterType] = useState('');
  
  const [selectedItem, setSelectedItem] = useState<BestiaryItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const q = query(collection(db, 'bestiary'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allItems = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          cr: data.cr || data.Challenge || '',
          hp: data.hp || data['Hit Points'] || '',
          ac: data.ac || data['Armor Class'] || '',
          size: data.size || (data.meta ? data.meta.split(' ')[0] : 'Medium'),
          type: data.type || (data.meta ? data.meta.split(',')[0].split(' ').slice(1).join(' ') : 'Unknown'),
          dexMod: data.dexMod || data.DEX_mod || '(+0)'
        } as BestiaryItem;
      });
      allItems.sort((a, b) => a.name.localeCompare(b.name));
      setItems(allItems);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, searchLetter, filterCR, filterSize, filterType]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Visibility:
      if (role !== 'dm' && !item.isRevealed) return false;

      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (searchLetter && !item.name.toUpperCase().startsWith(searchLetter)) return false;
      
      if (filterCR && !item.cr.includes(filterCR)) return false;
      if (filterSize && item.size.toLowerCase() !== filterSize.toLowerCase()) return false;
      if (filterType && item.type.toLowerCase() !== filterType.toLowerCase()) return false;
      
      return true;
    });
  }, [items, search, searchLetter, filterCR, filterSize, filterType, role]);

  const uniqueCRs = useMemo(() => {
    // Extract CR strings, handle "1/4", "10", etc.
    const crs = new Set(items.map(i => i.cr.split(' ')[0])); // "10 (5,900 XP)" -> "10"
    return Array.from(crs).sort((a, b) => {
      const parseFraction = (s: string) => {
        if (!s.includes('/')) return parseFloat(s) || 0;
        const [n, d] = s.split('/');
        return (parseFloat(n) || 0) / (parseFloat(d) || 1);
      };
      const numA = parseFraction(a);
      const numB = parseFraction(b);
      return numA - numB;
    });
  }, [items]);
  
  const uniqueSizes = useMemo(() => Array.from(new Set(items.map(i => i.size))).sort(), [items]);
  const uniqueTypes = useMemo(() => Array.from(new Set(items.map(i => i.type))).sort(), [items]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / 10));
  const safePage = Math.min(currentPage, totalPages);
  const currentItems = filteredItems.slice((safePage - 1) * 10, safePage * 10);

  const toggleFogOfWar = async (e: React.MouseEvent, item: BestiaryItem) => {
    e.stopPropagation();
    if (!item.id) return;
    try {
      await updateDoc(doc(db, 'bestiary', item.id), { isRevealed: !item.isRevealed });
    } catch (err) {
      console.error(err);
    }
  };

  const rollInitiative = (dexModString: string) => {
    // e.g., "(+2)" -> 2, "(-1)" -> -1
    const match = dexModString.match(/[-+]\d+/);
    const mod = match ? parseInt(match[0], 10) : 0;
    return Math.floor(Math.random() * 20) + 1 + mod;
  };

  const handleAddToCombat = () => {
    if (!selectedItem) return;
    
    // Parse HP: e.g. "135 (18d10 + 36)" -> 135
    const hpMatch = selectedItem.hp.match(/^\d+/);
    const hpVal = hpMatch ? parseInt(hpMatch[0], 10) : 10;
    
    // Parse AC: e.g. "17 (Natural Armor)" -> 17
    const acMatch = selectedItem.ac.match(/^\d+/);
    const acVal = acMatch ? parseInt(acMatch[0], 10) : 10;

    const init = rollInitiative(selectedItem.stats.dex_mod);

    const combatant: Combatant = {
      id: uuidv4(),
      source: 'monster',
      refId: selectedItem.id || selectedItem.name,
      label: selectedItem.name,
      initiative: init,
      ac: acVal,
      hp: { current: hpVal, max: hpVal },
      statuses: [],
      conditions: [],
    };
    
    try {
      store.addCombatant(combatant);
      // Optional: close modal on add? Let's leave it open so DM can add multiple.
      alert(`Added ${selectedItem.name} to combat (Init: ${init})`);
    } catch (err) {
      console.error(err);
      alert('Failed to add to combat.');
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
            placeholder="Search bestiary..."
            className="input-fantasy flex-1"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="select-fantasy w-full md:w-32" value={filterCR} onChange={e => setFilterCR(e.target.value)}>
            <option value="">All CR</option>
            {uniqueCRs.map(c => <option key={c} value={c}>CR {c}</option>)}
          </select>
          <select className="select-fantasy w-full md:w-32" value={filterSize} onChange={e => setFilterSize(e.target.value)}>
            <option value="">All Sizes</option>
            {uniqueSizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="select-fantasy w-full md:w-40" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          
          {role === 'dm' && (
            <button className="btn-accent whitespace-nowrap text-xs">
              + Custom
            </button>
          )}
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

      {/* ITEMS LIST */}
      <div className="w-full max-w-5xl flex flex-col gap-2 px-2">
        {currentItems.map(item => (
          <div 
            key={item.id} 
            onClick={() => setSelectedItem(item)}
            className={`flex justify-between items-center px-4 py-3 cursor-pointer select-none rounded-lg bg-[#161618]/70 backdrop-blur-md border-b border-[#b8860b]/15 border-l-[3px] border-l-transparent transition-all duration-300 ease-out hover:translate-x-1 hover:border-[var(--accent)] hover:shadow-[0_0_15px_rgba(225,29,72,0.2)]`}
          >
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 shrink-0 flex justify-center items-center rounded-full bg-black/60 shadow-[inset_0_0_8px_rgba(0,0,0,0.8)] border border-[var(--border-accent)] overflow-hidden relative">
                {item.imgUrl ? (
                  <img src={item.imgUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">💀</span>
                )}
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-heading font-semibold text-gray-100 text-md truncate max-w-[200px] sm:max-w-[300px] md:max-w-[400px] flex items-center gap-2">
                  {item.name}
                  {role === 'dm' && !item.isRevealed && (
                    <span className="text-[10px] bg-red-900/50 text-red-400 border border-red-700/50 px-1 rounded-sm uppercase tracking-widest">Hidden</span>
                  )}
                </span>
                <span className="text-[10px] text-gray-400 uppercase tracking-widest truncate">
                  {item.size} {item.type}, {item.alignment}
                </span>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {role === 'dm' && (
                <button 
                  onClick={(e) => toggleFogOfWar(e, item)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full bg-black/50 border transition-colors text-sm ${item.isRevealed ? 'border-accent text-accent' : 'border-white/10 text-white/30 hover:border-white/30 hover:text-white/80'}`}
                  title={item.isRevealed ? "Hide from players" : "Reveal to players"}
                >
                  {item.isRevealed ? "👁️" : "👁️‍🗨️"}
                </button>
              )}
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full border border-[var(--border-accent)] bg-black/50 text-[10px] font-bold uppercase tracking-widest text-secondary">
                CR {item.cr.split(' ')[0]}
              </span>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <div className="text-center text-muted-foreground py-10 italic border border-dashed border-white/10 rounded-lg">
            No monsters found matching your criteria...
          </div>
        )}
      </div>

      {/* PAGINATION */}
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

      {/* FLOATING CARD MODAL (5e Stat Block) */}
      {selectedItem && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in" onClick={() => setSelectedItem(null)}>
          <div 
            className="w-full max-w-2xl bg-[#fdf1dc] text-[#58180d] p-0 flex flex-col max-h-[90vh] shadow-[0_0_60px_rgba(0,0,0,1)] border-4 border-[#d6a053]"
            style={{ fontFamily: "'Georgia', serif" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header Area */}
            <div className="p-6 pb-2 relative border-b-2 border-[#d6a053]">
              <button onClick={() => setSelectedItem(null)} className="absolute top-2 right-4 text-3xl font-sans font-bold opacity-50 hover:opacity-100">&times;</button>
              
              <div className="flex gap-4 items-center">
                {selectedItem.imgUrl && (
                  <img src={selectedItem.imgUrl} alt={selectedItem.name} className="w-24 h-24 rounded-lg object-cover border-2 border-[#58180d] shadow-md" />
                )}
                <div>
                  <h1 className="text-4xl font-bold font-heading text-[#58180d] mb-1 leading-none">{selectedItem.name}</h1>
                  <p className="italic text-sm text-[#000] opacity-80">{selectedItem.size} {selectedItem.type}, {selectedItem.alignment}</p>
                </div>
              </div>

              {role === 'dm' && (
                <div className="mt-4 flex gap-2">
                  <button onClick={handleAddToCombat} className="px-4 py-1.5 bg-[#58180d] text-[#fdf1dc] font-bold text-sm tracking-widest uppercase rounded hover:bg-[#852514] transition-colors shadow-sm font-sans">
                    + Add to Combat
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[url('/parchment-texture.png')] bg-cover">
              {/* Top Stats */}
              <div className="text-sm border-b-2 border-[#d6a053] pb-3 mb-3">
                <p><strong>Armor Class</strong> {selectedItem.ac}</p>
                <p><strong>Hit Points</strong> {selectedItem.hp}</p>
                <p><strong>Speed</strong> {selectedItem.speed}</p>
              </div>

              {/* 6 Core Stats */}
              <div className="grid grid-cols-6 text-center text-sm mb-3 border-b-2 border-[#d6a053] pb-3">
                <div><div className="font-bold">STR</div><div>{selectedItem.stats.str} {selectedItem.stats.str_mod}</div></div>
                <div><div className="font-bold">DEX</div><div>{selectedItem.stats.dex} {selectedItem.stats.dex_mod}</div></div>
                <div><div className="font-bold">CON</div><div>{selectedItem.stats.con} {selectedItem.stats.con_mod}</div></div>
                <div><div className="font-bold">INT</div><div>{selectedItem.stats.int} {selectedItem.stats.int_mod}</div></div>
                <div><div className="font-bold">WIS</div><div>{selectedItem.stats.wis} {selectedItem.stats.wis_mod}</div></div>
                <div><div className="font-bold">CHA</div><div>{selectedItem.stats.cha} {selectedItem.stats.cha_mod}</div></div>
              </div>

              {/* Extra Stats */}
              <div className="text-sm border-b-2 border-[#d6a053] pb-3 mb-4 space-y-1">
                {selectedItem.savingThrows && <p><strong>Saving Throws</strong> {selectedItem.savingThrows}</p>}
                {selectedItem.skills && <p><strong>Skills</strong> {selectedItem.skills}</p>}
                {selectedItem.damageVulnerabilities && <p><strong>Damage Vulnerabilities</strong> {selectedItem.damageVulnerabilities}</p>}
                {selectedItem.damageResistances && <p><strong>Damage Resistances</strong> {selectedItem.damageResistances}</p>}
                {selectedItem.damageImmunities && <p><strong>Damage Immunities</strong> {selectedItem.damageImmunities}</p>}
                {selectedItem.conditionImmunities && <p><strong>Condition Immunities</strong> {selectedItem.conditionImmunities}</p>}
                {selectedItem.senses && <p><strong>Senses</strong> {selectedItem.senses}</p>}
                {selectedItem.languages && <p><strong>Languages</strong> {selectedItem.languages}</p>}
                <p><strong>Challenge</strong> {selectedItem.cr}</p>
              </div>

              {/* Traits (HTML) */}
              {selectedItem.traits && (
                <div 
                  className="mb-4 text-sm leading-relaxed prose prose-sm max-w-none text-[#000]"
                  dangerouslySetInnerHTML={{ __html: selectedItem.traits }}
                />
              )}

              {/* Actions (HTML) */}
              {selectedItem.actions && (
                <div className="mb-4">
                  <h3 className="text-2xl font-heading text-[#58180d] border-b border-[#d6a053] mb-2 pb-1">Actions</h3>
                  <div 
                    className="text-sm leading-relaxed prose prose-sm max-w-none text-[#000]"
                    dangerouslySetInnerHTML={{ __html: selectedItem.actions }}
                  />
                </div>
              )}

              {/* Legendary Actions (HTML) */}
              {selectedItem.legendaryActions && (
                <div className="mb-4">
                  <h3 className="text-2xl font-heading text-[#58180d] border-b border-[#d6a053] mb-2 pb-1">Legendary Actions</h3>
                  <div 
                    className="text-sm leading-relaxed prose prose-sm max-w-none text-[#000]"
                    dangerouslySetInnerHTML={{ __html: selectedItem.legendaryActions }}
                  />
                </div>
              )}

            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
