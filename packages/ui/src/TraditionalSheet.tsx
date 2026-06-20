import { useState } from 'react';
import { Shield as ShieldIcon, User as UserIcon, Scroll as ScrollIcon, Wand2 as Wand2Icon, BookOpen as BookOpenIcon, Plus, Minus } from 'lucide-react';

const Shield = ShieldIcon as any;
const User = UserIcon as any;
const Scroll = ScrollIcon as any;
const Wand2 = Wand2Icon as any;
const BookOpen = BookOpenIcon as any;
const PlusIcon = Plus as any;
const MinusIcon = Minus as any;

export interface TraditionalSheetProps {
  activeCharacter?: any;
  hp: {
    current: number;
    max: number;
    temp: number;
  };
  stats: Record<string, number>;
  equipment?: Array<{ id?: string; name: string; description?: string }>;
  features?: Array<{ id?: string; name: string; description?: string }>;
  onNavigate: (tab: string) => void;
  onUpdateStat?: (stat: string, value: number) => void;
  onUpdateHp?: (current: number, max: number, temp: number) => void;
  onToggleProficiency?: (skillOrSave: string) => void;
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
  activeCharacter, hp, stats, equipment = [], features = [], 
  onNavigate, onUpdateStat, onUpdateHp, onToggleProficiency, onAddItem 
}: TraditionalSheetProps) {

  const [editingStat, setEditingStat] = useState<string | null>(null);
  const [editingHp, setEditingHp] = useState(false);

  const getMod = (score: number) => Math.floor((score - 10) / 2);
  const formatMod = (mod: number) => mod >= 0 ? `+${mod}` : `${mod}`;

  const charName = activeCharacter?.name || 'Adventurer';
  const charClass = activeCharacter?.charClass || 'Unknown Class';
  const level = activeCharacter?.level || 1;
  const profBonus = Math.ceil(level / 4) + 1;
  const proficiencies = activeCharacter?.proficiencies || [];

  const isProficient = (name: string) => proficiencies.includes(name.toLowerCase());

  const getSkillTotal = (skillName: string) => {
    const statKey = SKILL_MAP[skillName];
    const baseStat = stats[statKey] ?? 10;
    const mod = getMod(baseStat);
    return mod + (isProficient(skillName) ? profBonus : 0) + (isProficient(skillName + '_expertise') ? profBonus : 0);
  };

  const getSaveTotal = (statName: string) => {
    const baseStat = stats[statName.toLowerCase().slice(0,3)] ?? 10;
    const mod = getMod(baseStat);
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
    <div className="min-h-screen text-stone-200 font-serif pb-20 relative" style={{ backgroundImage: 'url(/artifact-leather-bg.png)', backgroundSize: 'cover', backgroundAttachment: 'fixed', boxShadow: 'inset 0 0 200px rgba(0,0,0,0.95)' }}>
      
      {/* Header */}
      <div className="p-4 border-b-2 flex justify-between items-center shadow-[0_5px_20px_rgba(0,0,0,0.8)] relative" style={{ borderBottomColor: '#b45309', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.2))' }}>
        <div>
          <h1 className="text-2xl font-bold text-yellow-500 tracking-wide">{charName}</h1>
          <p className="text-sm text-stone-400 italic">Level {level} {charClass}</p>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Stats & Skills */}
        <div className="md:col-span-4 flex gap-4">
          {/* Stats Column */}
          <div className="flex flex-col gap-4 w-24">
            {STAT_NAMES.map(stat => {
              const statKey = stat.toLowerCase().slice(0, 3);
              const score = stats[statKey] ?? 10;
              return (
                <button 
                  key={stat} 
                  onClick={() => setEditingStat(statKey)}
                  className="relative flex flex-col items-center justify-center p-2 rounded-t-full rounded-b-lg shadow-[0_6px_12px_rgba(0,0,0,0.9),inset_0_0_15px_rgba(0,0,0,0.9)] hover:brightness-110 transition-all cursor-pointer group"
                  style={{ background: 'linear-gradient(145deg, #3f2e1e 0%, #1a140f 100%)', border: '1px solid #b45309' }}
                >
                  <span className="text-[10px] uppercase tracking-wider text-yellow-600 font-bold mb-1">{statKey}</span>
                  <span className="text-3xl font-bold text-stone-100 group-hover:text-yellow-400">{score}</span>
                  <div className="absolute -bottom-3 rounded-full px-3 py-0.5 text-sm font-bold text-yellow-500 shadow-[0_2px_8px_rgba(0,0,0,0.8)]" style={{ background: 'linear-gradient(to bottom, #292524, #0c0a09)', border: '1px solid #d97706' }}>
                    {formatMod(getMod(score))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Saving Throws & Skills */}
          <div className="flex-1 space-y-4">
            {/* Proficiency Bonus */}
            <div className="flex items-center gap-3 p-2 rounded-lg shadow-[0_4px_10px_rgba(0,0,0,0.8),inset_0_0_8px_rgba(0,0,0,0.9)]" style={{ backgroundImage: 'url(/artifact-wood-bg.png)', backgroundSize: 'cover', border: '1px solid #b45309' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-yellow-500 shadow-[0_2px_5px_rgba(0,0,0,0.9)]" style={{ background: 'radial-gradient(circle, #b45309 0%, #451a03 100%)', border: '2px solid #fcd34d' }}>+{profBonus}</div>
              <span className="text-sm font-bold tracking-widest uppercase text-yellow-600 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Proficiency Bonus</span>
            </div>

            {/* Saving Throws */}
            <div className="p-3 rounded-lg shadow-[0_6px_15px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(0,0,0,0.95)]" style={{ backgroundImage: 'url(/artifact-wood-bg.png)', backgroundSize: 'cover', border: '1px solid #b45309' }}>
              <h3 className="text-xs uppercase tracking-widest text-yellow-600 mb-3 font-bold border-b border-yellow-900/50 pb-1 drop-shadow-md">Saving Throws</h3>
              {STAT_NAMES.map(stat => {
                const isProf = isProficient(stat);
                return (
                  <div key={stat} className="flex items-center gap-2 mb-1.5">
                    <button 
                      onClick={() => onToggleProficiency?.(stat.toLowerCase())}
                      className={`w-3.5 h-3.5 rounded-full border cursor-pointer ${isProf ? 'bg-yellow-400 border-yellow-200 shadow-[0_0_8px_#facc15]' : 'bg-stone-800 border-stone-600 shadow-inner'}`}
                    />
                    <span className="w-6 text-right text-sm font-semibold text-stone-200 drop-shadow-md">{formatMod(getSaveTotal(stat))}</span>
                    <span className="text-sm text-stone-300 cursor-pointer" onClick={() => onToggleProficiency?.(stat.toLowerCase())}>{stat}</span>
                  </div>
                );
              })}
            </div>

            {/* Skills */}
            <div className="p-3 rounded-lg shadow-[0_6px_15px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(0,0,0,0.95)]" style={{ backgroundImage: 'url(/artifact-wood-bg.png)', backgroundSize: 'cover', border: '1px solid #b45309' }}>
              <h3 className="text-xs uppercase tracking-widest text-yellow-600 mb-3 font-bold border-b border-yellow-900/50 pb-1 drop-shadow-md">Skills</h3>
              {Object.keys(SKILL_MAP).map(skill => {
                const isProf = isProficient(skill);
                return (
                  <div key={skill} className="flex items-center gap-2 mb-1.5">
                    <button 
                      onClick={() => onToggleProficiency?.(skill.toLowerCase())}
                      className={`w-3.5 h-3.5 rounded-full border cursor-pointer ${isProf ? 'bg-yellow-400 border-yellow-200 shadow-[0_0_8px_#facc15]' : 'bg-stone-800 border-stone-600 shadow-inner'}`}
                    />
                    <span className="w-6 text-right text-sm font-semibold text-stone-200 drop-shadow-md">{formatMod(getSkillTotal(skill))}</span>
                    <span className="text-sm text-stone-300 cursor-pointer" onClick={() => onToggleProficiency?.(skill.toLowerCase())}>{skill}</span>
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
            <button onClick={() => setEditingStat('ac')} className="relative flex items-center justify-center w-24 h-28 drop-shadow-[0_8px_10px_rgba(0,0,0,0.8)] group cursor-pointer">
              <Shield className="absolute inset-0 w-full h-full text-yellow-900 group-hover:text-yellow-800 transition-colors drop-shadow-md" strokeWidth={1} fill="url(#metalGradient)" />
              <div className="z-10 flex flex-col items-center mt-2">
                <span className="text-xs font-bold text-yellow-600 uppercase tracking-widest">AC</span>
                <span className="text-3xl font-bold text-stone-100 group-hover:text-yellow-400">{stats['ac'] ?? 10 + getMod(stats['dex'] ?? 10)}</span>
              </div>
            </button>

            <button onClick={() => setEditingStat('init')} className="flex flex-col items-center justify-center w-24 h-24 border-2 rounded-lg shadow-[0_6px_10px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(0,0,0,0.9)] hover:brightness-110 cursor-pointer group" style={{ background: 'linear-gradient(135deg, #1c1917 0%, #0c0a09 100%)', borderColor: '#b45309' }}>
               <span className="text-4xl font-bold text-yellow-300 drop-shadow-[0_0_10px_#fde047] group-hover:drop-shadow-[0_0_15px_#fef08a] transition-all">{formatMod(stats['init'] ?? getMod(stats['dex'] ?? 10))}</span>
               <span className="text-[10px] font-bold text-yellow-600 uppercase mt-2 tracking-widest drop-shadow-md">Initiative</span>
            </button>

            <button onClick={() => setEditingStat('speed')} className="flex flex-col items-center justify-center w-24 h-24 border-2 rounded-lg shadow-[0_6px_10px_rgba(0,0,0,0.8),inset_0_0_15px_rgba(255,255,255,0.1)] hover:brightness-110 cursor-pointer group" style={{ background: 'linear-gradient(135deg, #57534e 0%, #292524 100%)', borderColor: '#a8a29e' }}>
               <span className="text-3xl font-bold text-stone-200 drop-shadow-md group-hover:text-white transition-all">{stats['speed'] ?? 30}</span>
               <span className="text-[10px] font-bold text-stone-400 uppercase mt-1 tracking-widest drop-shadow-md">Speed</span>
            </button>
          </div>

          {/* Health Section */}
          <div className="p-5 rounded-lg shadow-[0_10px_25px_rgba(0,0,0,0.9),inset_0_0_30px_rgba(0,0,0,0.95)] relative group" style={{ backgroundImage: 'url(/artifact-wood-bg.png)', backgroundSize: 'cover', border: '2px solid #b45309' }}>
            <button 
              onClick={() => setEditingHp(true)}
              className="absolute inset-0 w-full h-full bg-stone-800/0 hover:bg-stone-800/30 transition-colors z-10 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
            >
              <div className="bg-stone-900 border border-yellow-600 text-yellow-500 px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
                <PlusIcon size={16} /> Edit Health <MinusIcon size={16} />
              </div>
            </button>

            <div className="flex justify-between items-center mb-2">
               <span className="text-sm uppercase tracking-widest text-yellow-600 font-bold drop-shadow-md">Hit Points</span>
               <span className="text-sm text-yellow-600 font-semibold drop-shadow-md">Max: {hp.max}</span>
            </div>
            <div className="flex items-end justify-center py-6 rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,1)]" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.9))', border: '1px solid #78350f' }}>
               <span className={`text-8xl font-bold drop-shadow-[0_0_20px_rgba(234,179,8,0.5)] ${hp.current <= hp.max * 0.25 ? 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'text-yellow-500'}`}>{hp.current}</span>
            </div>
            <div className="flex justify-between mt-5 pt-5 border-t-2" style={{ borderTopColor: '#78350f' }}>
              <div className="text-center w-1/3 border-r-2" style={{ borderRightColor: '#78350f' }}>
                <span className="block text-[10px] uppercase text-yellow-600 font-bold tracking-widest mb-1 drop-shadow-md">Temp HP</span>
                <span className="text-2xl font-bold text-stone-300 drop-shadow-md">{hp.temp ?? 0}</span>
              </div>
              <div className="text-center w-1/3 border-r-2" style={{ borderRightColor: '#78350f' }}>
                <span className="block text-[10px] uppercase text-yellow-600 font-bold tracking-widest mb-1 drop-shadow-md">Hit Dice</span>
                <span className="text-2xl font-bold text-stone-300 drop-shadow-md">{activeCharacter?.hitDice || '1d10'}</span>
              </div>
              <div className="text-center w-1/3">
                <span className="block text-[10px] uppercase text-yellow-600 font-bold tracking-widest mb-2 drop-shadow-md">Death Saves</span>
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-full mx-auto w-32 shadow-[inset_0_4px_6px_rgba(0,0,0,0.8)]" style={{ background: 'linear-gradient(to right, #451a03, #78350f, #451a03)', border: '1px solid #b45309' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-yellow-500 uppercase font-bold drop-shadow-md">Succ</span>
                    <div className="flex gap-1">
                      {[1,2,3].map(i => <div key={`s-${i}`} className="w-3.5 h-3.5 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_0_5px_rgba(255,255,255,0.4)]" style={{ background: 'radial-gradient(circle at 30% 30%, #fef08a, #ca8a04)' }}></div>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-400 uppercase font-bold drop-shadow-md">Fail</span>
                    <div className="flex gap-1">
                      {[1,2,3].map(i => <div key={`f-${i}`} className="w-3.5 h-3.5 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)]" style={{ background: 'radial-gradient(circle at 30% 30%, #a8a29e, #292524)' }}></div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features and Inventory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Features Panel */}
            <div className="rounded-lg flex flex-col h-72 shadow-[0_6px_15px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(120,53,15,0.3)] relative group text-stone-900" style={{ backgroundImage: 'url(/artifact-parchment-bg.png)', backgroundSize: 'cover', border: '1px solid #b45309' }}>
              <div className="p-3 border-b-2 rounded-t-lg flex justify-between items-center shadow-sm" style={{ borderBottomColor: '#b45309', background: 'linear-gradient(to bottom, rgba(254,240,138,0.2), transparent)' }}>
                <span className="w-6"></span>
                <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-900 text-center drop-shadow-sm">Features & Traits</h3>
                <button onClick={() => onAddItem?.()} className="w-6 h-6 flex justify-center items-center rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.5)] hover:brightness-125 transition-all text-yellow-950 cursor-pointer" style={{ background: 'radial-gradient(circle at 30% 30%, #fcd34d, #b45309)', border: '1px solid #78350f' }}>
                  <PlusIcon size={14} />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                {features.length > 0 ? features.map((f, i) => (
                  <div key={i} className="border-b border-yellow-900/30 pb-3 last:border-0">
                    <div className="font-bold text-yellow-950 text-sm">{f.name}</div>
                    {f.description && <div className="text-xs text-yellow-900/80 mt-1.5 leading-relaxed font-sans">{f.description}</div>}
                  </div>
                )) : (
                  <div className="text-yellow-900/50 text-center text-sm mt-4 italic font-serif">Feats and special abilities</div>
                )}
              </div>
            </div>

            {/* Inventory Panel */}
            <div className="rounded-lg flex flex-col h-72 shadow-[0_6px_15px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(120,53,15,0.3)] relative text-stone-900" style={{ backgroundImage: 'url(/artifact-parchment-bg.png)', backgroundSize: 'cover', border: '1px solid #b45309' }}>
              <div className="p-3 border-b-2 rounded-t-lg flex justify-between items-center shadow-sm" style={{ borderBottomColor: '#b45309', background: 'linear-gradient(to bottom, rgba(254,240,138,0.2), transparent)' }}>
                <span className="w-6"></span>
                <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-900 text-center drop-shadow-sm">Equipment</h3>
                <button onClick={() => onAddItem?.()} className="w-6 h-6 flex justify-center items-center rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.5)] hover:brightness-125 transition-all text-yellow-950 cursor-pointer" style={{ background: 'radial-gradient(circle at 30% 30%, #fcd34d, #b45309)', border: '1px solid #78350f' }}>
                  <PlusIcon size={14} />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-2">
                {equipment.length > 0 ? equipment.map((e, i) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b border-yellow-900/30 pb-2 last:border-0">
                    <span className="text-yellow-950 font-bold">{e.name}</span>
                  </div>
                )) : (
                  <div className="text-yellow-900/50 text-center text-sm mt-4 italic font-serif">Gear and items</div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modals */}

      {/* Stat Editor Modal */}
      {editingStat && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-yellow-700/50 rounded-lg p-6 max-w-sm w-full shadow-[0_0_30px_rgba(161,98,7,0.15)] flex flex-col items-center">
            <h2 className="text-xl font-bold text-yellow-500 uppercase tracking-widest mb-6">Edit {editingStat}</h2>
            
            <div className="flex items-center gap-6 mb-8">
              <button 
                onClick={() => onUpdateStat?.(editingStat, (stats[editingStat] ?? 10) - 1)}
                className="w-14 h-14 rounded-full bg-stone-800 border border-stone-600 flex items-center justify-center text-2xl font-bold hover:bg-stone-700 hover:border-yellow-600 transition-all text-stone-300 cursor-pointer"
              >
                <MinusIcon size={24} />
              </button>
              
              <div className="w-24 h-24 rounded-lg bg-stone-950 border-2 border-stone-700 flex flex-col items-center justify-center shadow-inner">
                <span className="text-4xl font-bold text-stone-100">{stats[editingStat] ?? 10}</span>
                {['str','dex','con','int','wis','cha'].includes(editingStat) && (
                  <span className="text-sm font-bold text-yellow-600 mt-1">{formatMod(getMod(stats[editingStat] ?? 10))}</span>
                )}
              </div>

              <button 
                onClick={() => onUpdateStat?.(editingStat, (stats[editingStat] ?? 10) + 1)}
                className="w-14 h-14 rounded-full bg-stone-800 border border-stone-600 flex items-center justify-center text-2xl font-bold hover:bg-stone-700 hover:border-yellow-600 transition-all text-stone-300 cursor-pointer"
              >
                <PlusIcon size={24} />
              </button>
            </div>

            <button 
              onClick={() => setEditingStat(null)}
              className="w-full py-3 bg-stone-800 hover:bg-yellow-800 text-stone-200 font-bold uppercase tracking-widest rounded transition-colors border border-stone-700 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Damage/Heal Modal */}
      {editingHp && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-stone-900 border border-yellow-700/50 rounded-lg p-6 max-w-sm w-full shadow-[0_0_30px_rgba(161,98,7,0.15)] flex flex-col items-center">
            <h2 className="text-xl font-bold text-yellow-500 uppercase tracking-widest mb-6">Manage Health</h2>
            
            <div className="flex gap-4 mb-6 w-full justify-center">
              <div className="flex flex-col items-center">
                <span className="text-xs uppercase text-stone-500 font-bold mb-1">Current</span>
                <span className="text-3xl font-bold text-yellow-500">{hp.current}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs uppercase text-stone-500 font-bold mb-1">Max</span>
                <span className="text-3xl font-bold text-stone-300">{hp.max}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs uppercase text-stone-500 font-bold mb-1">Temp</span>
                <span className="text-2xl font-bold text-stone-100">{hp.temp ?? 0}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 w-full mb-6">
              {[1, 5, 10, 20].map(amt => (
                <div key={amt} className="flex gap-2 w-full">
                  <button onClick={() => handleHealDamage(amt, false)} className="flex-1 py-2 bg-red-900/40 hover:bg-red-800/60 border border-red-900/50 text-red-400 font-bold rounded transition-colors text-sm cursor-pointer">
                    -{amt}
                  </button>
                  <button onClick={() => handleHealDamage(amt, true)} className="flex-1 py-2 bg-green-900/40 hover:bg-green-800/60 border border-green-900/50 text-green-400 font-bold rounded transition-colors text-sm cursor-pointer">
                    +{amt}
                  </button>
                </div>
              ))}
            </div>

            <div className="w-full flex gap-3 mb-6">
              <button onClick={() => onUpdateHp?.(hp.max, hp.max, 0)} className="flex-1 py-2 bg-stone-800 border border-stone-700 text-stone-400 font-bold text-xs uppercase tracking-widest rounded hover:bg-stone-700 transition-colors cursor-pointer">
                Full Rest
              </button>
              <button onClick={() => {
                const addTemp = parseInt(window.prompt('Enter Temp HP to add:') || '0', 10);
                if (!isNaN(addTemp) && addTemp > 0) {
                  onUpdateHp?.(hp.current, hp.max, Math.max(hp.temp ?? 0, addTemp));
                }
              }} className="flex-1 py-2 bg-stone-800 border border-stone-700 text-stone-400 font-bold text-xs uppercase tracking-widest rounded hover:bg-stone-700 transition-colors cursor-pointer">
                + Temp HP
              </button>
            </div>

            <button 
              onClick={() => setEditingHp(false)}
              className="w-full py-3 bg-stone-800 hover:bg-yellow-800 text-stone-200 font-bold uppercase tracking-widest rounded transition-colors border border-stone-700 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-stone-950 border-t-2 border-yellow-700/50 pb-safe pt-2 flex justify-around items-center z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
        <button onClick={() => onNavigate('Overview')} className="flex flex-col items-center gap-1 p-2 w-full text-stone-500 hover:text-stone-300 hover:bg-stone-900/50 rounded-lg transition-all">
          <User size={20} />
          <span className="text-[10px] uppercase font-bold tracking-widest">Overview</span>
        </button>
        <button onClick={() => onNavigate('Sheet')} className="flex flex-col items-center gap-1 p-2 w-full text-yellow-500 bg-stone-900/30 rounded-lg transition-all">
          <Scroll size={24} />
          <span className="text-[10px] uppercase font-bold tracking-widest">Sheet</span>
        </button>
        <button onClick={() => onNavigate('Spells')} className="flex flex-col items-center gap-1 p-2 w-full text-stone-500 hover:text-stone-300 hover:bg-stone-900/50 rounded-lg transition-all">
          <Wand2 size={20} />
          <span className="text-[10px] uppercase font-bold tracking-widest">Spells</span>
        </button>
        <button onClick={() => onNavigate('Journal')} className="flex flex-col items-center gap-1 p-2 w-full text-stone-500 hover:text-stone-300 hover:bg-stone-900/50 rounded-lg transition-all">
          <BookOpen size={20} />
          <span className="text-[10px] uppercase font-bold tracking-widest">Journal</span>
        </button>
      </div>

    </div>
  );
}
