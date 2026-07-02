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
  }, [search, searchLetter, filterCR, filterSize, filterType]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Visibility:
      if (role !== 'dm' && !item.isRevealed) return false;

      if (search && !String(item.name).toLowerCase().includes(search.toLowerCase())) return false;
      if (searchLetter && !String(item.name).toUpperCase().startsWith(searchLetter)) return false;
      
      if (filterCR && !String(item.cr).includes(filterCR)) return false;
      if (filterSize && String(item.size).toLowerCase() !== filterSize.toLowerCase()) return false;
      if (filterType && String(item.type).toLowerCase() !== filterType.toLowerCase()) return false;
      
      return true;
    });
  }, [items, search, searchLetter, filterCR, filterSize, filterType, role]);

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
  
  const uniqueSizes = useMemo(() => Array.from(new Set(items.map(i => String(i.size || '')))).sort(), [items]);
  const uniqueTypes = useMemo(() => Array.from(new Set(items.map(i => String(i.type || '')))).sort(), [items]);


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

  const ITEMS_PER_PAGE = 24; // 24 cards fits nicely (e.g. 4x6 grid)
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const currentItems = filteredItems.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up h-full max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider m-0">Bestiary Compendium</h2>
      </div>

      {/* TYPE TABS */}
      <div className="flex items-center bg-[#1A1A1A] p-2 rounded-lg border border-[#2a2a2a] overflow-x-auto custom-scrollbar">
        {['All', 'Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon', 'Elemental', 'Fey', 'Fiend', 'Giant', 'Humanoid', 'Monstrosity', 'Ooze', 'Plant', 'Undead'].map(t => (
          <button
            key={t}
            onClick={() => {
              setFilterType(t === 'All' ? '' : t);
              setCurrentPage(1);
            }}
            className={`flex-none px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              (filterType === t || (t === 'All' && !filterType)) ? 'text-accent border-accent bg-[#242424]' : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* HEADER CONTROLS */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 justify-between items-center z-10" style={{ backgroundColor: '#121212' }}>
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
          <input 
            type="text" 
            placeholder="Search bestiary..." 
            className="input-fantasy min-w-[200px]"
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          />
          <select className="input-fantasy" value={filterCR} onChange={e => { setFilterCR(e.target.value); setCurrentPage(1); }}>
            <option value="">All CR</option>
            {uniqueCRs.map(c => <option key={c} value={c}>CR {c}</option>)}
          </select>
          <select className="input-fantasy" value={filterSize} onChange={e => { setFilterSize(e.target.value); setCurrentPage(1); }}>
            <option value="">All Sizes</option>
            {uniqueSizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        
        {role === 'dm' && (
          <button className="btn-fantasy whitespace-nowrap">
            + Add Custom Monster
          </button>
        )}
      </div>
      
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

      {/* LIST RENDERING */}
      <div className="glass-panel p-0 flex flex-col flex-1 relative overflow-hidden" style={{ minHeight: '500px' }}>
        <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {currentItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)}
                className={`flex flex-col cursor-pointer select-none rounded-xl bg-[#161618] border border-white/5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)] hover:shadow-[0_10px_20px_rgba(225,29,72,0.2)]`}
              >
                {/* Card Image Header */}
                <div className="w-full aspect-[4/3] bg-black relative overflow-hidden">
                  <img 
                    src={item.imgUrl || getFallbackImage(String(item.type))} 
                    alt={item.name} 
                    className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" 
                  />
                  {/* CR Badge */}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-black/80 backdrop-blur border border-[var(--border-accent)] rounded text-[10px] font-bold text-secondary tracking-widest uppercase">
                    CR {String(item.cr || '').split(' ')[0]}
                  </div>
                  {/* Hidden Badge */}
                  {role === 'dm' && !item.isRevealed && (
                    <div className="absolute top-2 left-2 bg-red-900/80 backdrop-blur text-red-300 border border-red-700 px-2 py-1 rounded text-[10px] uppercase tracking-widest">
                      Hidden
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 flex flex-col gap-1 relative">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-heading font-bold text-lg text-gray-100 leading-tight truncate" title={item.name}>
                      {item.name}
                    </h3>
                    {role === 'dm' && (
                      <button 
                        onClick={(e) => toggleFogOfWar(e, item)}
                        className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-black/50 border transition-colors text-sm ${item.isRevealed ? 'border-accent text-accent' : 'border-white/10 text-white/30 hover:border-white/30 hover:text-white/80'}`}
                        title={item.isRevealed ? "Hide from players" : "Reveal to players"}
                      >
                        {item.isRevealed ? "👁️" : "👁️‍🗨️"}
                      </button>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 uppercase tracking-widest truncate">
                    {item.size} {item.type}
                  </div>
                  <div className="text-[11px] text-gray-500 italic truncate mt-1">
                    {item.alignment}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredItems.length === 0 && (
            <div className="text-center text-muted-foreground py-20 italic">
              No monsters found matching your filters.
            </div>
          )}
        </div>
        
        {/* Pagination Controls */}
        {filteredItems.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-t border-[var(--border)] bg-black/60 backdrop-blur-md shrink-0">
            <span className="text-sm text-muted-foreground hidden sm:block">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length} monsters
            </span>
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <button 
                className="btn-fantasy py-1 px-4 text-sm disabled:opacity-30"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              
              <div className="text-xs uppercase tracking-widest text-white font-bold font-mono">
                {safePage} / {totalPages}
              </div>
              
              <button 
                className="btn-fantasy py-1 px-4 text-sm disabled:opacity-30"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

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
                <img src={selectedItem.imgUrl || getFallbackImage(String(selectedItem.type))} alt={selectedItem.name} className="w-24 h-24 rounded-lg object-cover border-2 border-[#58180d] shadow-md" />
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
