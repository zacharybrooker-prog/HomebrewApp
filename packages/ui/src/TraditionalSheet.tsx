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
  const [editingHp, setEditingHp] = useState(false);

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
                      className={`w-4 h-4 rounded-full border cursor-pointer flex-shrink-0 ${isProf ? 'bg-zinc-400 border-zinc-300' : 'bg-transparent border-zinc-600'}`}
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
                      className={`w-4 h-4 rounded-full border cursor-pointer flex-shrink-0 ${isProf ? 'bg-zinc-400 border-zinc-300' : 'bg-transparent border-zinc-600'}`}
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

          {/* Health Section */}
          <div className="p-6 rounded-lg bg-zinc-900 border border-zinc-800 relative group shadow-sm">
            <button 
              onClick={() => setEditingHp(true)}
              className="absolute inset-0 w-full h-full bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors z-10 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
            >
              <div className="bg-zinc-800 border border-zinc-700 text-zinc-200 px-5 py-2 rounded-full font-bold shadow-sm flex items-center gap-2">
                <PlusIcon size={16} /> Edit Health <MinusIcon size={16} />
              </div>
            </button>

            <div className="flex justify-between items-center mb-4">
               <span className="text-sm uppercase tracking-widest text-zinc-500 font-bold">Hit Points</span>
               <span className="text-sm text-zinc-500 font-semibold">Max: {hp.max}</span>
            </div>
            <div className="flex items-end justify-center py-8 rounded-lg bg-[#111113] border border-zinc-800/50 shadow-inner">
               <span className={`text-8xl font-bold tracking-tighter ${hp.current <= hp.max * 0.25 ? 'text-red-500' : 'text-zinc-100'}`}>{hp.current}</span>
            </div>
            <div className="flex justify-between mt-6 pt-6 border-t border-zinc-800/50">
              <div className="text-center w-1/3 border-r border-zinc-800/50">
                <span className="block text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-2">Temp HP</span>
                <span className="text-2xl font-bold text-zinc-300">{hp.temp ?? 0}</span>
              </div>
              <div className="text-center w-1/3 border-r border-zinc-800/50">
                <span className="block text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-2">Hit Dice</span>
                <span className="text-2xl font-bold text-zinc-300">{activeCharacter?.hitDice || '1d10'}</span>
              </div>
              <div className="text-center w-1/3">
                <span className="block text-[10px] uppercase text-zinc-500 font-bold tracking-widest mb-3">Death Saves</span>
                <div className="flex flex-col items-center gap-2 mx-auto w-32">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold w-6">Succ</span>
                    <div className="flex gap-1.5">
                      {[1,2,3].map(i => <div key={`s-${i}`} className="w-3.5 h-3.5 rounded-full border border-zinc-600 bg-transparent"></div>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold w-6">Fail</span>
                    <div className="flex gap-1.5">
                      {[1,2,3].map(i => <div key={`f-${i}`} className="w-3.5 h-3.5 rounded-full border border-zinc-600 bg-transparent"></div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resource Trackers Bar */}
          {features.filter(f => f.type === 'resource' || f.type === 'active').length > 0 && (
             <div className="flex flex-wrap gap-4 justify-center md:justify-start">
               {features.filter(f => f.type === 'resource' || f.type === 'active').map(f => (
                 <div key={f.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col items-center min-w-[100px] shadow-sm">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 text-center leading-tight">{f.name}</span>
                    {f.type === 'resource' && f.resource && (
                      <div className="flex gap-1.5">
                        {Array.from({length: f.resource.max}).map((_, i) => (
                           <button key={i} className={`w-4 h-4 rounded-full border ${i < f.resource!.current ? 'bg-zinc-400 border-zinc-300' : 'bg-transparent border-zinc-600'}`} />
                        ))}
                      </div>
                    )}
                    {f.type === 'active' && (
                      <button className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase rounded border border-zinc-700 transition-colors">
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
                className="w-16 h-16 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 transition-colors"
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
                className="w-14 h-14 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 transition-colors cursor-pointer"
              >
                <PlusIcon size={24} />
              </button>
            </div>
            <div className="flex gap-3 w-full">
              <button onClick={() => { setEditingStat(null); }} className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase tracking-widest rounded transition-colors text-sm border border-zinc-700">Close</button>
              <button onClick={() => { onUpdateStat?.(editingStat, null); setEditingStat(null); }} className="flex-1 px-4 py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 font-bold uppercase tracking-widest rounded transition-colors text-sm border border-red-900/30">Restore Auto</button>
            </div>
          </div>
        </div>
      )}

      {/* Damage/Heal Modal */}
      {editingHp && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <h2 className="text-xl font-bold text-zinc-300 uppercase tracking-widest mb-6">Manage Health</h2>
            
            <div className="flex gap-4 mb-6 w-full justify-center">
              <div className="flex flex-col items-center">
                <span className="text-xs uppercase text-zinc-500 font-bold mb-1">Current</span>
                <span className="text-3xl font-bold text-zinc-100">{hp.current}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs uppercase text-zinc-500 font-bold mb-1">Max</span>
                <span className="text-3xl font-bold text-zinc-400">{hp.max}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs uppercase text-zinc-500 font-bold mb-1">Temp</span>
                <span className="text-2xl font-bold text-zinc-300">{hp.temp ?? 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full mb-6">
              {[1, 5, 10, 20].map(amt => (
                <div key={amt} className="flex gap-2 w-full">
                  <button onClick={() => handleHealDamage(amt, false)} className="flex-1 py-2 bg-red-900/20 hover:bg-red-900/40 border border-red-900/30 text-red-400 font-bold rounded transition-colors text-sm cursor-pointer">
                    -{amt}
                  </button>
                  <button onClick={() => handleHealDamage(amt, true)} className="flex-1 py-2 bg-green-900/20 hover:bg-green-900/40 border border-green-900/30 text-green-400 font-bold rounded transition-colors text-sm cursor-pointer">
                    +{amt}
                  </button>
                </div>
              ))}
            </div>

            <div className="w-full flex gap-3 mb-6">
              <button onClick={() => onUpdateHp?.(hp.max, hp.max, 0)} className="flex-1 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold text-xs uppercase tracking-widest rounded hover:bg-zinc-700 transition-colors cursor-pointer">
                Full Rest
              </button>
              <button onClick={() => {
                const addTemp = parseInt(window.prompt('Enter Temp HP to add:') || '0', 10);
                if (!isNaN(addTemp) && addTemp > 0) {
                  onUpdateHp?.(hp.current, hp.max, Math.max(hp.temp ?? 0, addTemp));
                }
              }} className="flex-1 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold text-xs uppercase tracking-widest rounded hover:bg-zinc-700 transition-colors cursor-pointer">
                + Temp HP
              </button>
            </div>

            <button 
              onClick={() => setEditingHp(false)}
              className="w-full py-3 bg-zinc-100 hover:bg-white text-zinc-900 font-bold uppercase tracking-widest rounded transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
