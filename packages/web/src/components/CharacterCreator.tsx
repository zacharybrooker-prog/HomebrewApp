import { useState, useEffect } from 'react';
import { TraditionalSheet } from '@frogs-world/ui';
import { useClassFeatures } from '../hooks/useClassFeatures';

export function ManualCreator({ onSave, onCancel, initialCharacter }: { onSave: (char: any) => void, onCancel: () => void, initialCharacter?: any }) {
  const [activeCharacter, setActiveCharacter] = useState<any>(initialCharacter?.activeCharacter || { name: 'Unnamed Hero', race: 'Human', charClass: 'Fighter', level: 1, proficiencies: [] });
  const [stats, setStats] = useState<Record<string, number>>(initialCharacter?.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, init: null, ac: null, speed: null } as any);
  const [hp, setHp] = useState({ current: initialCharacter?.hp?.current ?? 10, max: initialCharacter?.hp?.max ?? 10, temp: initialCharacter?.hp?.temp ?? 0 });

  const { unlockedFeatures, computedStats } = useClassFeatures(activeCharacter.charClass, activeCharacter.level, stats);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex justify-between w-full max-w-4xl mb-4">
        <button onClick={onCancel} className="px-4 py-2 bg-stone-800 text-stone-300 font-bold uppercase tracking-widest rounded border border-stone-700 text-xs shadow-md">Cancel</button>
        <button onClick={() => onSave({ activeCharacter, stats, hp })} className="px-6 py-2 bg-yellow-900 hover:bg-yellow-800 text-stone-100 font-bold uppercase tracking-widest rounded shadow-[0_0_15px_rgba(234,179,8,0.3)] border border-yellow-700 text-xs">Save Character to Vault</button>
      </div>
      
      <div className="w-full max-w-4xl flex gap-4 mb-4 bg-stone-900/50 p-4 rounded-lg border border-yellow-900/50 shadow-md">
         <div className="flex-1 flex flex-col">
           <span className="text-xs text-yellow-600 font-bold uppercase tracking-widest mb-1">Character Name</span>
           <input className="bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-200" value={activeCharacter.name} onChange={e => setActiveCharacter({...activeCharacter, name: e.target.value})} />
         </div>
         <div className="flex-1 flex flex-col">
           <span className="text-xs text-yellow-600 font-bold uppercase tracking-widest mb-1">Race</span>
           <input className="bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-200" value={activeCharacter.race} onChange={e => setActiveCharacter({...activeCharacter, race: e.target.value})} />
         </div>
         <div className="flex-1 flex flex-col">
           <span className="text-xs text-yellow-600 font-bold uppercase tracking-widest mb-1">Class</span>
           <input className="bg-stone-950 border border-stone-800 rounded px-3 py-2 text-stone-200" value={activeCharacter.charClass} onChange={e => setActiveCharacter({...activeCharacter, charClass: e.target.value})} />
         </div>
      </div>

      <TraditionalSheet 
        activeCharacter={activeCharacter}
        hp={hp}
        baseStats={stats}
        overrideStats={stats as any}
        computedStats={computedStats}
        features={unlockedFeatures}
        equipment={[]}
        onNavigate={() => {}}
        onUpdateStat={(statId, val) => {
           setStats(prev => {
             const newStats = { ...prev };
             if (val === null) delete newStats[statId];
             else newStats[statId] = val;
             return newStats;
           });
        }}
        onUpdateHp={(curr, max, temp) => setHp({ current: curr, max, temp: temp ?? 0 })}
        onToggleProficiency={(name) => {
          const lName = name.toLowerCase();
          const has = activeCharacter.proficiencies.includes(lName);
          setActiveCharacter({
            ...activeCharacter,
            proficiencies: has 
              ? activeCharacter.proficiencies.filter((p: string) => p !== lName)
              : [...activeCharacter.proficiencies, lName]
          });
        }}
      />
    </div>
  );
}

const POINT_BUY_COSTS: Record<number, number> = { 8:0, 9:1, 10:2, 11:3, 12:4, 13:5, 14:7, 15:9 };
const STAT_NAMES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;

export function GuidedCreator({ onSave, onCancel }: { onSave: (char: any) => void, onCancel: () => void }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [raceObj, setRaceObj] = useState<any>(null);
  const [classObj, setClassObj] = useState<any>(null);

  const [races, setRaces] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Stats Mode
  const [statsMode, setStatsMode] = useState<'standard'|'pointbuy'|'manual'>('standard');
  const [stats, setStats] = useState<Record<string, number>>({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 });

  useEffect(() => {
    fetch('/data/srd-5.2-races.json').then(r => r.json()).then(setRaces).catch(console.error);
    fetch('/data/srd-5.2-classes.json').then(r => r.json()).then(setClasses).catch(console.error);
  }, []);

  const calculatePointsUsed = () => {
    let used = 0;
    for (const key of STAT_NAMES) {
      if (stats[key] < 8) return 999; // invalid
      used += POINT_BUY_COSTS[stats[key]] || 0;
    }
    return used;
  };

  const handleStatChange = (stat: string, val: number) => {
    if (statsMode === 'pointbuy') {
      if (val < 8 || val > 15) return;
    }
    setStats(prev => ({ ...prev, [stat]: val }));
  };

  const handleFinish = () => {
    const finalStats = { ...stats };
    // Apply racial bonuses
    if (raceObj && raceObj.abilityScoreBonuses) {
      for (const [key, bonus] of Object.entries(raceObj.abilityScoreBonuses)) {
        if (key === 'CHOICE_1' || key === 'CHOICE_2') continue; // Simplified for now
        const statKey = key.toLowerCase();
        if (finalStats[statKey]) finalStats[statKey] += (bonus as number);
      }
    }
    
    // Level 1 HP
    let maxHp = (classObj?.hitDie || 8) + Math.floor((finalStats.con - 10) / 2);
    
    onSave({
      activeCharacter: { 
        name: name || 'Unnamed Hero', 
        charClass: classObj?.name || 'Fighter', 
        race: raceObj?.name || 'Human', 
        level: 1, 
        proficiencies: [] 
      },
      stats: { 
        ...finalStats, 
        init: Math.floor((finalStats.dex - 10) / 2), 
        ac: 10 + Math.floor((finalStats.dex - 10) / 2), 
        speed: raceObj?.speed || 30 
      },
      hp: { current: maxHp, max: maxHp, temp: 0 }
    });
  };

  return (
    <div className="w-full max-w-4xl bg-stone-900 rounded-lg p-8 shadow-[0_10px_30px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(120,53,15,0.3)] border border-yellow-900 text-stone-900" style={{ backgroundImage: 'url(/artifact-parchment-bg.png)', backgroundSize: 'cover' }}>
      <div className="flex justify-between items-center mb-8 border-b-2 border-yellow-900/50 pb-4 shadow-sm" style={{ borderBottomColor: '#b45309', background: 'linear-gradient(to bottom, rgba(254,240,138,0.2), transparent)' }}>
         <h2 className="text-2xl font-bold text-yellow-950 drop-shadow-sm">Guided Path - Step {step} of 3</h2>
         <button onClick={onCancel} className="text-xs uppercase font-bold tracking-widest text-yellow-800 hover:text-yellow-950">Cancel</button>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-6 animate-fade-in-up">
          <div>
            <label className="block text-sm font-bold uppercase tracking-widest text-yellow-900 mb-2">What is your name?</label>
            <input className="w-full bg-yellow-50/50 border border-yellow-900/50 rounded px-4 py-3 text-yellow-950 focus:outline-none focus:border-yellow-700" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alaric" />
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-yellow-900 mb-2">Choose your Race</label>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {races.map(r => (
                  <button key={r.name} onClick={() => setRaceObj(r)} className={`text-left py-3 px-4 rounded border font-bold ${raceObj?.name === r.name ? 'bg-yellow-900 text-stone-100 border-yellow-950 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]' : 'bg-transparent text-yellow-950 border-yellow-900/30 hover:bg-yellow-900/10'}`}>
                    {r.name}
                    {raceObj?.name === r.name && <span className="block text-xs font-normal opacity-80 mt-1">Speed {r.speed} | Size {r.size}</span>}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold uppercase tracking-widest text-yellow-900 mb-2">Choose your Class</label>
              <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {classes.map(c => (
                  <button key={c.name} onClick={() => setClassObj(c)} className={`text-left py-3 px-4 rounded border font-bold ${classObj?.name === c.name ? 'bg-yellow-900 text-stone-100 border-yellow-950 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]' : 'bg-transparent text-yellow-950 border-yellow-900/30 hover:bg-yellow-900/10'}`}>
                    {c.name}
                    {classObj?.name === c.name && <span className="block text-xs font-normal opacity-80 mt-1">Hit Die: d{c.hitDie} | Saves: {c.savingThrows?.join(', ')}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={() => setStep(2)} disabled={!name || !raceObj || !classObj} className="px-8 py-3 bg-yellow-900 hover:bg-yellow-800 text-stone-100 font-bold uppercase tracking-widest rounded shadow-md border border-yellow-700 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6 animate-fade-in-up">
          <label className="block text-sm font-bold uppercase tracking-widest text-yellow-900 mb-2">Determine Ability Scores</label>
          <div className="flex gap-4 mb-4">
            <button onClick={() => { setStatsMode('standard'); setStats({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 }); }} className={`flex-1 py-2 rounded font-bold border ${statsMode === 'standard' ? 'bg-yellow-900 text-white' : 'border-yellow-900/50 text-yellow-900'}`}>Standard Array</button>
            <button onClick={() => { setStatsMode('pointbuy'); setStats({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }); }} className={`flex-1 py-2 rounded font-bold border ${statsMode === 'pointbuy' ? 'bg-yellow-900 text-white' : 'border-yellow-900/50 text-yellow-900'}`}>Point Buy</button>
            <button onClick={() => { setStatsMode('manual'); }} className={`flex-1 py-2 rounded font-bold border ${statsMode === 'manual' ? 'bg-yellow-900 text-white' : 'border-yellow-900/50 text-yellow-900'}`}>Manual Roll</button>
          </div>

          {statsMode === 'pointbuy' && (
            <div className="text-center font-bold text-lg mb-4 text-yellow-950">
              Points Used: {calculatePointsUsed()} / 27
            </div>
          )}

          <div className="grid grid-cols-6 gap-4 text-center">
            {STAT_NAMES.map(s => (
              <div key={s} className="flex flex-col items-center">
                <span className="font-bold uppercase text-yellow-950 mb-2">{s}</span>
                <input 
                  type="number" 
                  value={stats[s]} 
                  onChange={e => handleStatChange(s, parseInt(e.target.value) || 0)}
                  disabled={statsMode === 'standard'}
                  className="w-16 h-16 text-center text-2xl font-bold bg-yellow-50/50 border-2 border-yellow-900/30 rounded focus:border-yellow-900 text-yellow-950"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <button onClick={() => setStep(1)} className="px-8 py-3 bg-stone-300 hover:bg-stone-400 text-yellow-950 font-bold uppercase tracking-widest rounded border border-stone-400">Back</button>
            <button onClick={() => setStep(3)} disabled={statsMode === 'pointbuy' && calculatePointsUsed() > 27} className="px-8 py-3 bg-yellow-900 hover:bg-yellow-800 text-stone-100 font-bold uppercase tracking-widest rounded shadow-md border border-yellow-700 disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6 animate-fade-in-up">
          <div className="text-center p-6 border border-yellow-900/50 rounded bg-yellow-50/50">
            <h3 className="text-2xl font-bold text-yellow-950 mb-2">{name}</h3>
            <p className="text-yellow-900 font-bold uppercase tracking-widest">{raceObj?.name} {classObj?.name}</p>
            <div className="mt-4 flex gap-4 justify-center">
              {STAT_NAMES.map(s => (
                <div key={s} className="text-center">
                  <span className="block text-xs uppercase font-bold text-yellow-900/70">{s}</span>
                  <span className="font-bold text-lg text-yellow-950">
                    {stats[s] + (raceObj?.abilityScoreBonuses?.[s.toUpperCase()] || 0)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-yellow-900/80 italic">Starting Hit Points will be maximized (d{classObj?.hitDie} + CON). For future level ups, you can choose to take the average or roll.</p>
          </div>
          <div className="flex justify-between mt-4">
            <button onClick={() => setStep(2)} className="px-8 py-3 bg-stone-300 hover:bg-stone-400 text-yellow-950 font-bold uppercase tracking-widest rounded border border-stone-400">Back</button>
            <button onClick={handleFinish} className="px-8 py-3 bg-yellow-900 hover:bg-yellow-800 text-stone-100 font-bold uppercase tracking-widest rounded shadow-md border border-yellow-700">Finalize & Save</button>
          </div>
        </div>
      )}
    </div>
  );
}
