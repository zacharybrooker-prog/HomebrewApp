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
export function BestiaryCompendium({ role, store, onExit }: { role: string | null, store: any, onExit?: () => void }) {
  const [items, setItems] = useState<BestiaryItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterCR, setFilterCR] = useState('');
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
          name: String(data.name || 'Unknown Monster'),
          cr: String(data.cr || data.Challenge || ''),
          hp: String(data.hp || data['Hit Points'] || ''),
          ac: String(data.ac || data['Armor Class'] || ''),
          size: String(data.size || (data.meta ? String(data.meta).split(' ')[0] : 'Medium')),
          type: String(data.type || (data.meta ? String(data.meta).split(',')[0].split(' ').slice(1).join(' ') : 'Unknown')),
          alignment: String(data.alignment || (data.meta ? (String(data.meta).split(',')[1] || '').trim() : 'Unknown')),
          dexMod: String(data.dexMod || data.DEX_mod || '(+0)'),
          stats: {
            str: String(data.stats?.str || data.STR || "10"), str_mod: String(data.stats?.str_mod || data.STR_mod || "(+0)"),
            dex: String(data.stats?.dex || data.DEX || "10"), dex_mod: String(data.stats?.dex_mod || data.DEX_mod || "(+0)"),
            con: String(data.stats?.con || data.CON || "10"), con_mod: String(data.stats?.con_mod || data.CON_mod || "(+0)"),
            int: String(data.stats?.int || data.INT || "10"), int_mod: String(data.stats?.int_mod || data.INT_mod || "(+0)"),
            wis: String(data.stats?.wis || data.WIS || "10"), wis_mod: String(data.stats?.wis_mod || data.WIS_mod || "(+0)"),
            cha: String(data.stats?.cha || data.CHA || "10"), cha_mod: String(data.stats?.cha_mod || data.CHA_mod || "(+0)"),
          }
        } as unknown as BestiaryItem;
      });
      allItems.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      setItems(allItems);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterCR, filterType]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Visibility:
      if (role !== 'dm' && !item.isRevealed) return false;

      if (search && !String(item.name).toLowerCase().includes(search.toLowerCase())) return false;
      
      if (filterCR && !String(item.cr).includes(filterCR)) return false;
      if (filterType && String(item.type).toLowerCase() !== filterType.toLowerCase()) return false;
      
      return true;
    });
  }, [items, search, filterCR, filterType, role]);

  const uniqueCRs = useMemo(() => {
    // Extract CR strings, handle "1/4", "10", etc.
    const crs = new Set(items.map(i => String(i.cr || '').split(' ')[0])); // "10 (5,900 XP)" -> "10"
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
    const match = String(dexModString || '').match(/[-+]\d+/);
    const mod = match ? parseInt(match[0], 10) : 0;
    return Math.floor(Math.random() * 20) + 1 + mod;
  };

  const handleAddToCombat = () => {
    if (!selectedItem) return;
    
    // Parse HP: e.g. "135 (18d10 + 36)" -> 135
    const hpMatch = String(selectedItem.hp || '').match(/^\d+/);
    const hpVal = hpMatch ? parseInt(hpMatch[0], 10) : 10;
    
    // Parse AC: e.g. "17 (Natural Armor)" -> 17
    const acMatch = String(selectedItem.ac || '').match(/^\d+/);
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

  const getFallbackImage = (typeStr: string) => {
    const t = String(typeStr).toLowerCase();
    if (t.includes('aberration')) return '/monster_types/aberration.png';
    if (t.includes('beast')) return '/monster_types/beast.png';
    if (t.includes('celestial')) return '/monster_types/celestial.png';
    if (t.includes('construct')) return '/monster_types/construct.png';
    if (t.includes('dragon')) return '/monster_types/dragon.png';
    if (t.includes('elemental')) return '/monster_types/elemental.png';
    if (t.includes('fey')) return '/monster_types/fey.png';
    if (t.includes('fiend')) return '/monster_types/fiend.png';
    if (t.includes('giant')) return '/monster_types/giant.png';
    if (t.includes('humanoid')) return '/monster_types/humanoid.png';
    if (t.includes('monstrosity')) return '/monster_types/monstrosity.png';
    if (t.includes('ooze')) return '/monster_types/ooze.png';
    if (t.includes('plant')) return '/monster_types/plant.png';
    if (t.includes('undead')) return '/monster_types/undead.png';
    return '/monster_types/monstrosity.png';
  };

  const ITEMS_PER_PAGE = 20; // 20 rows per page fits well
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const currentItems = filteredItems.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col md:flex-row w-full h-full min-h-[60vh] max-w-7xl mx-auto rounded-lg overflow-hidden bg-[#121212] border border-[#2a2a2a] shadow-2xl font-sans text-gray-200">
      
      {/* LEFT COLUMN: Filters & Monster List */}
      <div className={`w-full md:w-[350px] lg:w-[400px] flex flex-col bg-[#1A1A1A] border-r border-[#2a2a2a] md:min-h-[70vh] shadow-[inset_-10px_0_20px_rgba(0,0,0,0.5)] z-10 shrink-0 ${selectedItem ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header / Search Controls */}
        <div className="p-4 bg-[#121212] border-b border-[#2a2a2a] flex flex-col gap-3 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest m-0">Bestiary</h2>
            <div className="flex gap-2">
              {role === 'dm' && (
                <button className="text-[10px] uppercase font-bold text-accent border border-accent/30 bg-accent/10 px-2 py-1 rounded hover:bg-accent hover:text-black transition-colors">
                  + Custom
                </button>
              )}
              {onExit && (
                <button onClick={onExit} className="text-[10px] uppercase font-bold text-gray-500 border border-[#333] px-3 py-1 rounded hover:bg-gray-800 transition-colors">
                  EXIT
                </button>
              )}
            </div>
          </div>
          <input 
            type="text" 
            placeholder="Search monsters..." 
            className="w-full bg-[#1A1A1A] text-sm text-gray-200 border border-[#333] rounded px-3 py-2 outline-none focus:border-red-500 transition-colors placeholder:text-gray-600"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
          <div className="flex gap-2">
            <select className="flex-1 bg-[#1A1A1A] text-xs text-gray-300 border border-[#333] rounded px-2 py-1.5 outline-none focus:border-red-500" value={filterCR} onChange={e => { setFilterCR(e.target.value); setCurrentPage(1); }}>
              <option value="">All CR</option>
              {uniqueCRs.map(c => <option key={c} value={c}>CR {c}</option>)}
            </select>
            <select className="flex-1 bg-[#1A1A1A] text-xs text-gray-300 border border-[#333] rounded px-2 py-1.5 outline-none focus:border-red-500" value={filterType} onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}>
              <option value="">All Types</option>
              {['Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental', 'Fey', 'Fiend', 'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Undead'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* List of Monsters */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#1A1A1A]">
          {currentItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => setSelectedItem(item)}
              className={`w-full text-left p-3 border-b border-[#2a2a2a] transition-colors flex gap-3 items-center group relative ${
                selectedItem?.id === item.id ? 'bg-[#242424] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-red-500' : 'hover:bg-[#1a1a1a]'
              }`}
            >
              <div className="w-12 h-12 shrink-0 bg-black rounded-md overflow-hidden relative border border-[#333] shadow-md">
                <img src={item.imgUrl || getFallbackImage(String(item.type))} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <h3 className={`font-bold text-sm truncate ${selectedItem?.id === item.id ? 'text-red-400' : 'text-gray-200 group-hover:text-red-400'}`}>{item.name}</h3>
                  <span className="text-[10px] font-bold text-accent shrink-0 ml-2">CR {String(item.cr || '').split(' ')[0]}</span>
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest truncate">{item.size} {item.type}</div>
              </div>
              
              {/* DM Fog of War Indicator */}
              {role === 'dm' && !item.isRevealed && (
                <div className="absolute top-1 right-1 text-[8px] bg-red-900/80 backdrop-blur text-red-200 px-1 rounded uppercase tracking-tighter">Hidden</div>
              )}
            </button>
          ))}
          
          {filteredItems.length === 0 && (
            <div className="text-center text-gray-600 py-10 text-xs italic">No monsters found.</div>
          )}
          
          {/* List Pagination */}
          {filteredItems.length > 0 && (
            <div className="flex items-center justify-between p-3 border-t border-[#2a2a2a] bg-[#121212] sticky bottom-0 z-10 mt-auto">
              <button 
                className="text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                &larr; PREV
              </button>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">{safePage} / {totalPages}</span>
              <button 
                className="text-xs font-bold text-gray-400 hover:text-white disabled:opacity-30 disabled:hover:text-gray-400"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                NEXT &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Detail View */}
      <div className={`flex-1 flex flex-col bg-[#242424] relative shadow-[inset_10px_0_20px_rgba(0,0,0,0.3)] ${!selectedItem ? 'hidden md:flex' : 'flex'}`}>
        {!selectedItem ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <div className="text-6xl mb-4 opacity-10">🐉</div>
            <p className="text-sm uppercase tracking-widest font-bold">Select a monster to view details</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col pb-10">
            
            {/* Mobile Back Button */}
            <div className="md:hidden sticky top-0 bg-[#121212] border-b border-[#2a2a2a] p-3 z-20 flex justify-between items-center shadow-lg">
              <button onClick={() => setSelectedItem(null)} className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-2">
                &larr; Back to List
              </button>
            </div>

            {/* Huge Header Banner */}
            <div className="relative w-full h-64 sm:h-80 bg-black border-b border-[#2a2a2a] shrink-0">
              <img src={selectedItem.imgUrl || getFallbackImage(String(selectedItem.type))} alt={selectedItem.name} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/40 to-transparent" />
              
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-5xl font-heading font-bold text-white mb-2 drop-shadow-lg">{selectedItem.name}</h1>
                  <p className="text-sm sm:text-base text-gray-300 uppercase tracking-widest font-bold opacity-80">{selectedItem.size} {selectedItem.type}, {selectedItem.alignment}</p>
                </div>
                {role === 'dm' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => toggleFogOfWar(e, selectedItem)}
                      className={`px-3 py-2 text-[10px] font-bold uppercase tracking-widest rounded border transition-colors ${selectedItem.isRevealed ? 'border-gray-500 text-gray-400 hover:text-white' : 'bg-red-900/50 border-red-700 text-red-300 hover:bg-red-900'}`}
                    >
                      {selectedItem.isRevealed ? "Hide from Players" : "Reveal to Players"}
                    </button>
                    <button 
                      onClick={handleAddToCombat} 
                      className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded bg-red-600 text-white hover:bg-red-500 transition-colors shadow-lg"
                    >
                      + Combat
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Lore & Stat Block */}
            <div className="p-6 sm:p-8 max-w-4xl mx-auto w-full">
              {/* Lore Section */}
              {(selectedItem as any).flavorText && (
                <div className="mb-10 p-6 bg-[#1A1A1A] border border-[#2a2a2a] rounded-lg border-l-4 border-l-red-600 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl">📖</div>
                  <p className="italic text-gray-300 leading-relaxed font-serif text-lg relative z-10">
                    "{(selectedItem as any).flavorText}"
                  </p>
                </div>
              )}

              {/* 5e Stat Block Styling */}
              <div className="bg-[#fdf1dc] text-[#58180d] p-6 sm:p-8 rounded-lg shadow-2xl border-4 border-[#d6a053] font-serif" style={{ fontFamily: "'Georgia', serif" }}>
                <h2 className="text-3xl font-bold font-heading text-[#58180d] mb-1 leading-tight">{selectedItem.name}</h2>
                <p className="italic text-sm text-[#000] opacity-80 mb-4">{selectedItem.size} {selectedItem.type}, {selectedItem.alignment}</p>
                
                <hr className="border-[#d6a053] border-t-2 mb-4" />
                
                <div className="text-base mb-4 space-y-1">
                  <p><strong>Armor Class</strong> {selectedItem.ac}</p>
                  <p><strong>Hit Points</strong> {selectedItem.hp}</p>
                  <p><strong>Speed</strong> {selectedItem.speed}</p>
                </div>
                
                <hr className="border-[#d6a053] border-t-2 mb-4" />
                
                <div className="grid grid-cols-6 text-center text-sm mb-4">
                  <div><strong className="text-lg">STR</strong><br/>{selectedItem.stats.str} {selectedItem.stats.str_mod}</div>
                  <div><strong className="text-lg">DEX</strong><br/>{selectedItem.stats.dex} {selectedItem.stats.dex_mod}</div>
                  <div><strong className="text-lg">CON</strong><br/>{selectedItem.stats.con} {selectedItem.stats.con_mod}</div>
                  <div><strong className="text-lg">INT</strong><br/>{selectedItem.stats.int} {selectedItem.stats.int_mod}</div>
                  <div><strong className="text-lg">WIS</strong><br/>{selectedItem.stats.wis} {selectedItem.stats.wis_mod}</div>
                  <div><strong className="text-lg">CHA</strong><br/>{selectedItem.stats.cha} {selectedItem.stats.cha_mod}</div>
                </div>
                
                <hr className="border-[#d6a053] border-t-2 mb-4" />
                
                <div className="text-sm mb-5 space-y-1.5">
                  {selectedItem.savingThrows && <p><strong>Saving Throws</strong> {selectedItem.savingThrows}</p>}
                  {selectedItem.skills && <p><strong>Skills</strong> {selectedItem.skills}</p>}
                  {selectedItem.damageVulnerabilities && <p><strong>Damage Vulnerabilities</strong> {selectedItem.damageVulnerabilities}</p>}
                  {selectedItem.damageResistances && <p><strong>Damage Resistances</strong> {selectedItem.damageResistances}</p>}
                  {selectedItem.damageImmunities && <p><strong>Damage Immunities</strong> {selectedItem.damageImmunities}</p>}
                  {selectedItem.conditionImmunities && <p><strong>Condition Immunities</strong> {selectedItem.conditionImmunities}</p>}
                  {selectedItem.senses && <p><strong>Senses</strong> {selectedItem.senses}</p>}
                  {selectedItem.languages && <p><strong>Languages</strong> {selectedItem.languages}</p>}
                  <p className="text-base mt-2"><strong>Challenge</strong> {selectedItem.cr}</p>
                </div>
                
                <hr className="border-[#d6a053] border-t-4 mb-5" />
                
                {selectedItem.traits && (
                  <div className="mb-5 text-sm leading-relaxed prose prose-sm max-w-none text-[#58180d] marker:text-[#d6a053]" dangerouslySetInnerHTML={{ __html: selectedItem.traits }} />
                )}
                
                {selectedItem.actions && (
                  <>
                    <h3 className="text-2xl font-bold font-heading mb-3 mt-8 border-b-2 border-[#d6a053] pb-1">Actions</h3>
                    <div className="text-sm leading-relaxed space-y-3 prose prose-sm max-w-none text-[#58180d] marker:text-[#d6a053]" dangerouslySetInnerHTML={{ __html: selectedItem.actions }} />
                  </>
                )}
                
                {selectedItem.legendaryActions && (
                  <>
                    <h3 className="text-2xl font-bold font-heading mb-3 mt-8 border-b-2 border-[#d6a053] pb-1">Legendary Actions</h3>
                    <div className="text-sm leading-relaxed space-y-3 prose prose-sm max-w-none text-[#58180d] marker:text-[#d6a053]" dangerouslySetInnerHTML={{ __html: selectedItem.legendaryActions }} />
                  </>
                )}
              </div>
            </div>
            
          </div>
        )}
      </div>

    </div>
  );
}
