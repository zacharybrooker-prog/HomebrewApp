import { useState } from 'react';
import { Shield as ShieldIcon, Plus, Minus, Swords, Compass } from 'lucide-react';

const Shield = ShieldIcon as any;
const PlusIcon = Plus as any;
const MinusIcon = Minus as any;

export interface TraditionalSheetProps {
  activeCharacter?: any;
  hp: {
    current: number;
    max: number;
    temp: number;
  };
  baseStats: Record<string, number>;
  computedStats?: Record<string, number>;
  overrideStats?: Record<string, number | null>;
  equipment?: Array<{ id?: string; name: string; description?: string }>;
  features?: Array<{ id?: string; name: string; description?: string; resource?: any; type?: string }>;
  onNavigate?: (tab: string) => void;
  onUpdateStat?: (stat: string, value: number | null) => void;
  onUpdateHp?: (current: number, max: number, temp: number) => void;
  onToggleProficiency?: (skill: string) => void;
  onAddItem?: () => void;
}

const SKILL_MAP: Record<string, string> = {
  'Acrobatics': 'dex', 'Animal Handling': 'wis', 'Arcana': 'int',
  'Athletics': 'str', 'Deception': 'cha', 'History': 'int',
  'Insight': 'wis', 'Intimidation': 'cha', 'Investigation': 'int',
  'Medicine': 'wis', 'Nature': 'int', 'Perception': 'wis',
  'Performance': 'cha', 'Persuasion': 'cha', 'Religion': 'int',
  'Sleight of Hand': 'dex', 'Stealth': 'dex', 'Survival': 'wis'
};

const STAT_NAMES = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma'];

export function TraditionalSheet({ 
  activeCharacter, hp, baseStats, computedStats = {}, overrideStats = {}, equipment = [], features = [], 
  onUpdateStat, onUpdateHp, onToggleProficiency, onAddItem 
}: TraditionalSheetProps) {

  const [editingStat, setEditingStat] = useState<string | null>(null);
  
  // Health Modals State
  const [editingHp, setEditingHp] = useState(false);
  const [editingTempHp, setEditingTempHp] = useState(false);
  const [editingHitDice, setEditingHitDice] = useState(false);
  
  // Local Trackers State
  const [tempHpInput, setTempHpInput] = useState(0);
  const [deathSaves, setDeathSaves] = useState({ successes: 0, failures: 0 });
  const [spentHitDice, setSpentHitDice] = useState(0);
  const [activeResources, setActiveResources] = useState<Record<string, boolean>>({});

  const getResolvedStat = (statKey: string, fallback: number) => {
    if (overrideStats[statKey] != null) return overrideStats[statKey] as number;
    if (computedStats[statKey] != null) return computedStats[statKey];
    return fallback;
  };

  const getMod = (score: number) => Math.floor((score - 10) / 2);
  const formatMod = (mod: number) => mod >= 0 ? `+${mod}` : `${mod}`;

  const charName = activeCharacter?.name || "ADVENTURER'S COMPENDIUM";
  const charClass = activeCharacter?.charClass || 'Unknown Class';
  const level = activeCharacter?.level || 1;
  const profBonus = Math.ceil(level / 4) + 1;
  const proficiencies = activeCharacter?.proficiencies || [];

  const isProficient = (name: string) => proficiencies.includes(name.toLowerCase());

  const getSkillTotal = (skillName: string) => {
    const statKey = SKILL_MAP[skillName];
    const statValue = getResolvedStat(statKey, baseStats[statKey] ?? 10);
    const mod = getMod(statValue);
    return mod + (isProficient(skillName) ? profBonus : 0) + (isProficient(skillName + '_expertise') ? profBonus : 0);
  };

  const getSaveTotal = (statName: string) => {
    const statKey = statName.toLowerCase().slice(0,3);
    const statValue = getResolvedStat(statKey, baseStats[statKey] ?? 10);
    const mod = getMod(statValue);
    return mod + (isProficient(statName) ? profBonus : 0);
  };

  const handleHealDamage = (amount: number, isHeal: boolean) => {
    let newCurrent = hp.current;
    let newTemp = hp.temp ?? 0;
    
    if (isHeal) {
      newCurrent = Math.min(hp.max, newCurrent + amount);
    } else {
      if (newTemp > 0) {
        if (amount >= newTemp) {
          amount -= newTemp;
          newTemp = 0;
        } else {
          newTemp -= amount;
          amount = 0;
        }
      }
      newCurrent = Math.max(0, newCurrent - amount);
    }
    onUpdateHp?.(newCurrent, hp.max, newTemp);
  };

  const handleRollHitDice = () => {
    const hdStr = activeCharacter?.hitDice || '1d10';
    const match = hdStr.match(/(\d+)d(\d+)/i);
    let dieSize = 10;
    let maxHd = 1;
    if (match) {
      maxHd = parseInt(match[1], 10);
      dieSize = parseInt(match[2], 10);
    }
    
    if (spentHitDice < maxHd) {
      const roll = Math.floor(Math.random() * dieSize) + 1;
      const conMod = getMod(getResolvedStat('con', baseStats['con'] ?? 10));
      const healAmount = Math.max(1, roll + conMod);
      handleHealDamage(healAmount, true);
      setSpentHitDice(prev => prev + 1);
      alert(`Rolled 1d${dieSize} + ${conMod} (CON) = Healed for ${healAmount} HP!`);
      setEditingHitDice(false);
    } else {
      alert("No hit dice remaining!");
    }
  };

  const handleTempHpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (isNaN(val)) setTempHpInput(0);
    else setTempHpInput(Math.max(0, val));
  };

  const handleLongRest = () => {
    onUpdateHp?.(hp.max, hp.max, 0);
    setSpentHitDice(Math.max(0, spentHitDice - Math.max(1, Math.floor(parseInt(activeCharacter?.hitDice || '1') / 2))));
    setEditingHp(false);
  };

  return (
    <div className="min-h-screen text-zinc-100 font-sans pb-20 relative bg-[#18181b]">
      
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-zinc-900 border-b border-zinc-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-wide uppercase">{charName}</h1>
          <p className="text-sm text-zinc-400">Level {level} {charClass}</p>
        </div>
        <div className="flex gap-3 text-zinc-600">
          <Swords size={24} className="opacity-50" />
          <Compass size={24} className="opacity-50" />
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 mt-4">
        
        {/* Left Column: Stats & Skills */}
        <div className="md:col-span-4 flex gap-4">
          {/* Stats Column */}
          <div className="flex flex-col gap-4 w-24">
            {STAT_NAMES.map(stat => {
              const statKey = stat.toLowerCase().substring(0,3);
              const score = getResolvedStat(statKey, baseStats[statKey] ?? 10);
              return (
                <button 
                  key={stat} 
                  onClick={() => setEditingStat(statKey)}
                  className="relative flex flex-col items-center justify-center p-3 rounded-t-full rounded-b-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer group shadow-sm"
                >
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1">{statKey}</span>
                  <span className="text-3xl font-bold text-zinc-200">{score}</span>
                  <div className="absolute -bottom-3 rounded-full px-3 py-0.5 text-sm font-bold text-zinc-300 bg-zinc-800 border border-zinc-700 shadow-sm">
                    {formatMod(getMod(score))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Saving Throws & Skills (Combined Panel) */}
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-6 shadow-sm">
            
            {/* Proficiency Bonus Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-zinc-900 bg-yellow-500 shadow-sm">+{profBonus}</div>
              <span className="text-sm font-bold tracking-widest uppercase text-zinc-300">Proficiency Bonus</span>
            </div>

            {/* Saving Throws */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-3 font-bold border-b border-zinc-800 pb-2">Saving Throws</h3>
              {STAT_NAMES.map(stat => {
                const isProf = isProficient(stat);
                return (
                  <div key={stat} className="flex items-center gap-3 mb-2">
                    <button 
                      onClick={() => onToggleProficiency?.(stat.toLowerCase())}
                      className={`w-4 h-4 rounded-full border cursor-pointer flex-shrink-0 transition-colors ${isProf ? 'bg-zinc-400 border-zinc-300' : 'bg-transparent border-zinc-600'}`}
                    />
                    <span className="w-8 text-right text-sm font-semibold text-zinc-200">{formatMod(getSaveTotal(stat))}</span>
                    <span className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-300" onClick={() => onToggleProficiency?.(stat.toLowerCase())}>{stat}</span>
                  </div>
                );
              })}
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-xs uppercase tracking-widest text-zinc-500 mb-3 font-bold border-b border-zinc-800 pb-2">Skills</h3>
              {Object.keys(SKILL_MAP).map(skill => {
                const statKey = SKILL_MAP[skill].toUpperCase();
                const isProf = isProficient(skill);
                return (
                  <div key={skill} className="flex items-center gap-3 mb-2">
                    <button 
                      onClick={() => onToggleProficiency?.(skill.toLowerCase())}
                      className={`w-4 h-4 rounded-full border cursor-pointer flex-shrink-0 transition-colors ${isProf ? 'bg-zinc-400 border-zinc-300' : 'bg-transparent border-zinc-600'}`}
                    />
                    <span className="w-8 text-right text-sm font-semibold text-zinc-200">{formatMod(getSkillTotal(skill))}</span>
                    <div className="flex items-center gap-1.5">
                       <span className="text-sm text-zinc-400 cursor-pointer hover:text-zinc-300" onClick={() => onToggleProficiency?.(skill.toLowerCase())}>{skill}</span>
                       <span className="text-[10px] text-zinc-600 font-bold">({statKey})</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Center/Right Column: Combat & Vitals */}
        <div className="md:col-span-8 space-y-6">
          
          {/* Top Row: AC, Initiative, Speed */}
          <div className="flex gap-6 justify-center md:justify-start">
            <button onClick={() => setEditingStat('ac')} className="flex flex-col items-center justify-center w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm relative overflow-hidden group">
              <Shield className="absolute inset-0 w-full h-full text-zinc-800/20 group-hover:text-zinc-700/30 transition-colors" strokeWidth={1} />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 z-10">Armor Class</span>
              <span className="text-3xl font-bold text-zinc-100 z-10">
                 {getResolvedStat('ac', 10 + getMod(getResolvedStat('dex', baseStats['dex'] ?? 10)))}
              </span>
            </button>

            <button onClick={() => setEditingStat('init')} className="flex flex-col items-center justify-center w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm">
               <span className="text-3xl font-bold text-zinc-100">
                  {formatMod(getResolvedStat('init', getMod(getResolvedStat('dex', baseStats['dex'] ?? 10))))}
               </span>
               <span className="text-[10px] font-bold text-zinc-500 uppercase mt-2 tracking-widest">Initiative</span>
            </button>

            <button onClick={() => setEditingStat('speed')} className="flex flex-col items-center justify-center w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer shadow-sm">
               <span className="text-3xl font-bold text-zinc-100">
                  {getResolvedStat('speed', 30)}
               </span>
               <span className="text-[10px] font-bold text-zinc-500 uppercase mt-2 tracking-widest">Speed</span>
            </button>
          </div>

          {/* Health Section Modular Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            
            {/* Main HP (Red Box) */}
            <div 
               className="md:col-span-6 p-4 rounded-lg bg-red-950/20 border border-red-900/40 hover:border-red-500/50 cursor-pointer transition-colors flex flex-col justify-between min-h-[160px] shadow-sm"
               onClick={() => setEditingHp(true)}
            >
               <div className="flex justify-between items-center mb-2">
                 <span className="text-sm uppercase tracking-widest text-red-500/80 font-bold">Hit Points</span>
                 <span className="text-xs text-red-500/60 font-semibold uppercase">Max {hp.max}</span>
               </div>
               <div className="flex items-end justify-center py-4">
                 <span className={`text-6xl font-bold tracking-tighter ${hp.current <= hp.max * 0.25 ? 'text-red-500' : 'text-zinc-100'}`}>{hp.current}</span>
               </div>
            </div>

            <div className="md:col-span-6 grid grid-cols-2 gap-4">
               {/* Temp HP (Orange Box) */}
               <div 
                 className="p-3 rounded-lg bg-orange-950/20 border border-orange-900/40 hover:border-orange-500/50 cursor-pointer transition-colors flex flex-col justify-between shadow-sm"
                 onClick={() => { setTempHpInput(hp.temp ?? 0); setEditingTempHp(true); }}
               >
                 <span className="text-[10px] uppercase tracking-widest text-orange-500/80 font-bold text-center">Temp HP</span>
                 <div className="flex justify-center items-center h-full mt-2">
                    <span className="text-3xl font-bold text-zinc-100">{hp.temp ?? 0}</span>
                 </div>
               </div>

               {/* Hit Dice (Green Box) */}
               <div 
                 className="p-3 rounded-lg bg-green-950/20 border border-green-900/40 hover:border-green-500/50 cursor-pointer transition-colors flex flex-col justify-between shadow-sm"
                 onClick={() => setEditingHitDice(true)}
               >
                 <span className="text-[10px] uppercase tracking-widest text-green-500/80 font-bold text-center">Hit Dice</span>
                 <div className="flex flex-col justify-center items-center h-full mt-2">
                    <span className="text-2xl font-bold text-zinc-100">{activeCharacter?.hitDice || '1d10'}</span>
                    <span className="text-[10px] text-green-500/60 font-bold mt-1 uppercase">Spent: {spentHitDice}</span>
                 </div>
               </div>

               {/* Death Saves (Pink Box) - NON-INTERACTIVE BACKGROUND */}
               <div className="p-3 rounded-lg bg-pink-950/10 border border-pink-900/30 flex flex-col justify-between pointer-events-none shadow-sm col-span-2">
                 <span className="text-[10px] uppercase tracking-widest text-pink-500/60 font-bold text-center mb-2">Death Saves</span>
                 <div className="flex items-center justify-around mt-1">
                    <div className="flex items-center gap-2 pointer-events-auto">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold">Succ</span>
                      <div className="flex gap-1.5">
                        {[1,2,3].map(i => (
                           <button 
                             key={`s-${i}`} 
                             onClick={() => setDeathSaves(prev => ({ ...prev, successes: prev.successes === i ? i - 1 : i }))}
                             className={`w-4 h-4 rounded-full border cursor-pointer transition-colors ${deathSaves.successes >= i ? 'bg-[#ff5200] border-[#ff5200]' : 'bg-transparent border-zinc-600 hover:border-zinc-500'}`} 
                           />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pointer-events-auto">
                      <span className="text-[10px] text-zinc-400 uppercase font-bold">Fail</span>
                      <div className="flex gap-1.5">
                        {[1,2,3].map(i => (
                           <button 
                             key={`f-${i}`} 
                             onClick={() => setDeathSaves(prev => ({ ...prev, failures: prev.failures === i ? i - 1 : i }))}
                             className={`w-4 h-4 rounded-full border cursor-pointer transition-colors ${deathSaves.failures >= i ? 'bg-[#ff5200] border-[#ff5200]' : 'bg-transparent border-zinc-600 hover:border-zinc-500'}`} 
                           />
                        ))}
                      </div>
                    </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Resource Trackers Bar (Rage, etc.) */}
          {features.filter(f => f.type === 'resource' || f.type === 'active').length > 0 && (
             <div className="flex flex-wrap gap-4 justify-center md:justify-start">
               {features.filter(f => f.type === 'resource' || f.type === 'active').map(f => (
                 <div key={f.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col items-center min-w-[100px] shadow-sm">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 text-center leading-tight">{f.name}</span>
                    {f.type === 'resource' && f.resource && (
                      <div className="flex gap-1.5">
                        {Array.from({length: f.resource.max}).map((_, i) => {
                           const resourceKey = `${f.id}-${i}`;
                           const isActive = activeResources[resourceKey] || false;
                           return (
                             <button 
                               key={i} 
                               onClick={() => setActiveResources(prev => ({ ...prev, [resourceKey]: !isActive }))}
                               className={`w-4 h-4 rounded-full border cursor-pointer transition-colors ${isActive ? 'bg-[#ff5200] border-[#ff5200]' : 'bg-transparent border-zinc-600 hover:border-zinc-500'}`} 
                             />
                           );
                        })}
                      </div>
                    )}
                    {f.type === 'active' && (
                      <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase rounded border border-zinc-700 transition-colors cursor-pointer">
                        Activate
                      </button>
                    )}
                 </div>
               ))}
             </div>
          )}

          {/* Features and Inventory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Features Panel */}
            <div className="rounded-lg flex flex-col h-72 bg-zinc-900 border border-zinc-800 shadow-sm">
              <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/30 rounded-t-lg">
                <span className="w-6"></span>
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 text-center">Features & Traits</h3>
                <button onClick={() => onAddItem?.()} className="w-6 h-6 flex justify-center items-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors cursor-pointer border border-zinc-700">
                  <PlusIcon size={14} />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                {features.length > 0 ? features.map((f, i) => (
                  <div key={i} className="border-b border-zinc-800/50 pb-3 last:border-0">
                    <div className="font-bold text-zinc-200 text-sm">{f.name}</div>
                    {f.description && <div className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{f.description}</div>}
                  </div>
                )) : (
                  <div className="text-zinc-600 text-center text-sm mt-4 italic">Feats and special abilities</div>
                )}
              </div>
            </div>

            {/* Inventory Panel */}
            <div className="rounded-lg flex flex-col h-72 bg-zinc-900 border border-zinc-800 shadow-sm">
              <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/30 rounded-t-lg">
                <span className="w-6"></span>
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400 text-center">Equipment</h3>
                <button onClick={() => onAddItem?.()} className="w-6 h-6 flex justify-center items-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors cursor-pointer border border-zinc-700">
                  <PlusIcon size={14} />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-2">
                {equipment.length > 0 ? equipment.map((e, i) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2 last:border-0">
                    <span className="text-zinc-200 font-bold">{e.name}</span>
                  </div>
                )) : (
                  <div className="text-zinc-600 text-center text-sm mt-4 italic">Gear and items</div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modals */}

      {/* Stat Editor Modal */}
      {editingStat && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <h2 className="text-xl font-bold text-zinc-300 uppercase tracking-widest mb-6">Edit {editingStat}</h2>
            
            <div className="flex items-center gap-6 mb-8">
              <button 
                onClick={() => onUpdateStat?.(editingStat, getResolvedStat(editingStat, baseStats[editingStat] ?? 10) - 1)}
                className="w-16 h-16 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 transition-colors cursor-pointer"
              >
                <MinusIcon size={32} />
              </button>
              <div className="flex flex-col items-center justify-center w-24">
                <span className="text-4xl font-bold text-zinc-100">{getResolvedStat(editingStat, baseStats[editingStat] ?? 10)}</span>
                {['str','dex','con','int','wis','cha'].includes(editingStat) && (
                  <span className="text-sm font-bold text-zinc-500 mt-1">{formatMod(getMod(getResolvedStat(editingStat, baseStats[editingStat] ?? 10)))}</span>
                )}
              </div>

              <button 
                onClick={() => onUpdateStat?.(editingStat, getResolvedStat(editingStat, baseStats[editingStat] ?? 10) + 1)}
                className="w-16 h-16 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 transition-colors cursor-pointer"
              >
                <PlusIcon size={32} />
              </button>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => { setEditingStat(null); }} className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase tracking-widest rounded transition-colors text-sm border border-zinc-700 cursor-pointer">Close</button>
              <button onClick={() => { onUpdateStat?.(editingStat, null); setEditingStat(null); }} className="flex-1 px-4 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 font-bold uppercase tracking-widest rounded transition-colors text-sm border border-red-900/30 cursor-pointer">Restore Auto</button>
            </div>
          </div>
        </div>
      )}

      {/* Main HP Modal */}
      {editingHp && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <h2 className="text-xl font-bold text-zinc-300 uppercase tracking-widest mb-6">Manage Hit Points</h2>
            
            <div className="flex gap-6 mb-6 w-full justify-center">
              <div className="flex flex-col items-center">
                <span className="text-xs uppercase text-red-500/70 font-bold mb-1">Current</span>
                <span className="text-4xl font-bold text-zinc-100">{hp.current}</span>
              </div>
              <div className="flex flex-col items-center opacity-50">
                <span className="text-xs uppercase text-zinc-500 font-bold mb-1">Max</span>
                <span className="text-4xl font-bold text-zinc-100">{hp.max}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full mb-6">
              {[1, 5, 10, 20].map(amt => (
                <div key={amt} className="flex gap-2 w-full">
                  <button onClick={() => handleHealDamage(amt, false)} className="flex-1 py-3 bg-red-950/40 hover:bg-red-900/60 border border-red-900/50 text-red-400 font-bold rounded transition-colors text-sm cursor-pointer">
                    -{amt}
                  </button>
                  <button onClick={() => handleHealDamage(amt, true)} className="flex-1 py-3 bg-green-950/40 hover:bg-green-900/60 border border-green-900/50 text-green-400 font-bold rounded transition-colors text-sm cursor-pointer">
                    +{amt}
                  </button>
                </div>
              ))}
            </div>

            <div className="w-full mb-6">
              <button 
                onClick={handleLongRest}
                className="w-full py-3 bg-blue-900/20 hover:bg-blue-900/40 border border-blue-900/40 text-blue-400 font-bold text-xs uppercase tracking-widest rounded transition-colors cursor-pointer"
              >
                Long Rest (Restore All)
              </button>
            </div>

            <button 
              onClick={() => setEditingHp(false)}
              className="w-full py-4 bg-zinc-100 hover:bg-white text-zinc-900 font-bold uppercase tracking-widest rounded transition-colors cursor-pointer shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Temp HP Modal */}
      {editingTempHp && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-[280px] w-full shadow-2xl flex flex-col items-center">
            <h2 className="text-lg font-bold text-orange-500/80 uppercase tracking-widest mb-6">Temp HP</h2>
            
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => setTempHpInput(Math.max(0, tempHpInput - 1))}
                className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 transition-colors cursor-pointer"
              >
                <MinusIcon size={24} />
              </button>
              
              <input 
                 type="number"
                 className="w-20 text-center bg-zinc-950 border border-zinc-800 text-2xl font-bold text-zinc-100 py-2 rounded focus:outline-none focus:border-orange-500/50"
                 value={tempHpInput.toString()}
                 onChange={handleTempHpChange}
              />

              <button 
                onClick={() => setTempHpInput(tempHpInput + 1)}
                className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 transition-colors cursor-pointer"
              >
                <PlusIcon size={24} />
              </button>
            </div>

            <div className="flex gap-3 w-full">
              <button onClick={() => setEditingTempHp(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold uppercase tracking-widest rounded transition-colors text-xs border border-zinc-700 cursor-pointer">Cancel</button>
              <button onClick={() => { onUpdateHp?.(hp.current, hp.max, tempHpInput); setEditingTempHp(false); }} className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-widest rounded transition-colors text-xs border border-orange-500 cursor-pointer">Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Hit Dice Modal */}
      {editingHitDice && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-[320px] w-full shadow-2xl flex flex-col items-center">
            <h2 className="text-lg font-bold text-green-500/80 uppercase tracking-widest mb-2">Short Rest</h2>
            <p className="text-xs text-zinc-500 font-semibold mb-6 text-center uppercase">Spend Hit Dice to Heal</p>
            
            <div className="flex flex-col items-center mb-8 bg-zinc-950 p-4 rounded-lg border border-zinc-800 w-full">
               <span className="text-xs uppercase text-zinc-500 font-bold mb-2">Available Dice</span>
               <span className="text-3xl font-bold text-zinc-100">{activeCharacter?.hitDice || '1d10'}</span>
               <div className="flex items-center gap-2 mt-4 text-xs font-bold uppercase tracking-widest">
                  <span className="text-green-500/70">Spent</span>
                  <span className="text-zinc-300">{spentHitDice}</span>
               </div>
            </div>

            <div className="flex gap-3 w-full">
              <button onClick={() => setEditingHitDice(false)} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold uppercase tracking-widest rounded transition-colors text-xs border border-zinc-700 cursor-pointer">Close</button>
              <button 
                 onClick={handleRollHitDice} 
                 className="flex-1 py-3 bg-green-700 hover:bg-green-600 text-white font-bold uppercase tracking-widest rounded transition-colors text-xs border border-green-600 cursor-pointer"
              >
                Roll Die
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
