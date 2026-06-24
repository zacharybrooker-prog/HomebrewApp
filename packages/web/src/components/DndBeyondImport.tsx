import { useState } from 'react';

export function DndBeyondImport({ onImport, onCancel }: { onImport: (char: any) => void, onCancel: () => void }) {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');

  const handleParse = () => {
    try {
      setError('');
      const data = JSON.parse(jsonInput);
      
      // Attempt to map the structure provided safely
      if (!data || typeof data !== 'object') {
        throw new Error("Invalid JSON structure");
      }

      const stats = {
        str: data.ability_scores?.strength?.score ?? 10,
        dex: data.ability_scores?.dexterity?.score ?? 10,
        con: data.ability_scores?.constitution?.score ?? 10,
        int: data.ability_scores?.intelligence?.score ?? 10,
        wis: data.ability_scores?.wisdom?.score ?? 10,
        cha: data.ability_scores?.charisma?.score ?? 10,
        init: data.vitals?.initiative ?? 0,
        ac: data.vitals?.armor_class ?? 10,
        speed: parseInt(data.vitals?.speed) || 30
      };

      const hp = {
        current: data.vitals?.hit_points?.current ?? 10,
        max: data.vitals?.hit_points?.max ?? 10,
        temp: data.vitals?.hit_points?.temp ?? 0
      };

      const classParts = (data.header?.class_and_level || '').split(' ');
      const level = parseInt(classParts[classParts.length - 1]) || 1;
      const charClass = classParts.slice(0, classParts.length - 1).join(' ') || 'Unknown Class';

      const proficiencies: string[] = [];
      if (data.skills) {
        for (const [skill, val] of Object.entries(data.skills)) {
           // We'll roughly map high values to proficiency for this import
           if (typeof val === 'number' && val >= (data.vitals?.proficiency_bonus ?? 2)) {
             proficiencies.push(skill.replace('_', ' '));
           }
        }
      }

      const equipment = Array.isArray(data.equipment?.items) ? data.equipment.items.map((i: any) => ({
        id: Math.random().toString(36).substring(2),
        name: i.name || 'Unknown Item',
        quantity: i.quantity || 1,
        weight: parseFloat(i.weight) || 0
      })) : [];

      const activeCharacter = {
        name: data.header?.character_name || 'Unnamed',
        charClass: charClass,
        race: data.header?.species || 'Unknown Race',
        level: level,
        proficiencies: proficiencies,
        avatar: '',
        hp: hp.current,
        maxHp: hp.max,
        tempHp: hp.temp,
        stats: stats,
        equipment: equipment
      };

      onImport({ activeCharacter, stats, hp });

    } catch (e) {
      console.error("Parse Error:", e);
      setError("Invalid JSON format. Please paste valid D&D Beyond export data.");
    }
  };

  return (
    <div className="w-full max-w-2xl bg-stone-900 rounded-lg p-8 shadow-[0_10px_30px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(120,53,15,0.3)] border border-yellow-900 text-stone-900" style={{ backgroundImage: 'url(/artifact-parchment-bg.png)', backgroundSize: 'cover' }}>
      <div className="flex justify-between items-center mb-8 border-b-2 border-yellow-900/50 pb-4 shadow-sm" style={{ borderBottomColor: '#b45309', background: 'linear-gradient(to bottom, rgba(254,240,138,0.2), transparent)' }}>
         <h2 className="text-2xl font-bold text-yellow-950 drop-shadow-sm">Import Character</h2>
         <button onClick={onCancel} className="text-xs uppercase font-bold tracking-widest text-yellow-800 hover:text-yellow-950">Cancel</button>
      </div>

      <div className="flex flex-col gap-4 animate-fade-in-up">
        <p className="text-sm text-yellow-900">Paste your D&D Beyond JSON export below:</p>
        <textarea 
          className="w-full h-64 bg-yellow-50/50 border border-yellow-900/50 rounded p-4 text-xs font-mono text-yellow-950 focus:outline-none focus:border-yellow-700 custom-scrollbar"
          value={jsonInput}
          onChange={e => setJsonInput(e.target.value)}
          placeholder='{"header": {"character_name": "Caspian"...'
        />
        {error && <div className="text-red-700 text-sm font-bold">{error}</div>}

        <div className="flex justify-end mt-4">
          <button onClick={handleParse} disabled={!jsonInput.trim()} className="px-8 py-3 bg-yellow-900 hover:bg-yellow-800 text-stone-100 font-bold uppercase tracking-widest rounded shadow-md border border-yellow-700 disabled:opacity-50">Import JSON</button>
        </div>
      </div>
    </div>
  );
}
