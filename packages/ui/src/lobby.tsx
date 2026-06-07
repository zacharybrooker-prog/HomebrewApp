import { useState } from 'react';

export interface CharacterProfile {
  id: string;
  name: string;
  charClass: string;
}

interface LobbyProps {
  characters: CharacterProfile[];
  onSelectCharacter: (id: string) => void;
  onCreateCharacter: (name: string, charClass: string, ac: number, init: number, maxHp: number) => void;
  onDeleteCharacter: (id: string) => void;
  onJoinAsDM: () => void;
}

export function Lobby({ characters, onSelectCharacter, onCreateCharacter, onDeleteCharacter, onJoinAsDM }: LobbyProps) {
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [charClass, setCharClass] = useState('');
  const [ac, setAc] = useState(10);
  const [init, setInit] = useState(0);
  const [hp, setHp] = useState(10);

  const handleCreate = () => {
    if (!name || !charClass) return alert('Name and Class are required.');
    onCreateCharacter(name, charClass, ac, init, hp);
    setCreating(false);
    setName('');
    setCharClass('');
  };

  if (creating) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in-up w-full max-w-md mx-auto">
        <div className="text-center">
          <h2 className="font-heading text-3xl text-secondary" style={{ textShadow: '0 0 15px var(--secondary-glow)' }}>
            Forge Your Hero
          </h2>
        </div>
        
        <div className="glass-panel flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="sub-label">Character Name</label>
            <input className="input-fantasy" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Thorin Oakenshield" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="sub-label">Class</label>
            <input className="input-fantasy" value={charClass} onChange={e => setCharClass(e.target.value)} placeholder="e.g. Fighter, Mage, Rogue" />
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="sub-label">Max HP</label>
              <input type="number" className="input-fantasy text-center" value={hp} onChange={e => setHp(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="sub-label">Armor Class</label>
              <input type="number" className="input-fantasy text-center" value={ac} onChange={e => setAc(Number(e.target.value))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="sub-label">Initiative</label>
              <input type="number" className="input-fantasy text-center" value={init} onChange={e => setInit(Number(e.target.value))} />
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button className="btn-ghost flex-1" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn-fantasy flex-1" onClick={handleCreate}>Create Character</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up w-full max-w-md mx-auto mt-8">
      <div className="text-center">
        <h1 className="font-heading text-4xl mb-2 text-accent" style={{ textShadow: '0 0 20px var(--accent-glow)' }}>
          Frog's World
        </h1>
        <p className="text-muted-foreground text-sm tracking-widest uppercase font-heading">
          Select Your Path
        </p>
      </div>

      <div className="glass-panel flex flex-col gap-3">
        <h3 className="section-heading" style={{ margin: 0, paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
          Adventurers
        </h3>
        
        {characters.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground italic text-sm">
            No heroes have been forged yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {characters.map(p => (
              <div key={p.id} className="flex gap-2">
                <button 
                  className="flex-1 bg-black/40 hover:bg-black/60 border border-border hover:border-accent p-3 rounded-lg text-left transition-all group flex justify-between items-center"
                  onClick={() => onSelectCharacter(p.id)}
                >
                  <div>
                    <div className="font-bold text-text group-hover:text-accent transition-colors">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.charClass}</div>
                  </div>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-accent">➔</span>
                </button>
                <button 
                  className="p-3 bg-black/40 border border-border hover:border-danger hover:bg-danger/20 text-danger rounded-lg transition-all"
                  onClick={() => {
                    const confirmation = window.prompt(`Type the character's name "${p.name}" to confirm deletion:`);
                    if (confirmation === p.name) {
                      onDeleteCharacter(p.id);
                    } else if (confirmation !== null) {
                      window.alert('Character name did not match. Deletion cancelled.');
                    }
                  }}
                  title="Delete Character"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        <button className="btn-fantasy mt-4" onClick={() => setCreating(true)}>
          + Create New Character
        </button>
      </div>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-[var(--border)]"></div>
        <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs uppercase tracking-widest">OR</span>
        <div className="flex-grow border-t border-[var(--border)]"></div>
      </div>

      <button className="btn-gold" onClick={onJoinAsDM}>
        👑 Enter as Dungeon Master
      </button>
    </div>
  );
}
