import { useState } from 'react';
import type { MonsterTemplate } from '@frogs-world/shared/src/schema';

interface MonsterLibraryProps {
  templates: MonsterTemplate[];
  onAdd: (template: MonsterTemplate) => void;
  onSendToCombat: (template: MonsterTemplate) => void;
  onImport: (templates: MonsterTemplate[]) => void;
}

export function MonsterLibrary({ templates, onAdd, onSendToCombat, onImport }: MonsterLibraryProps) {
  const [name, setName] = useState('');
  const [hp, setHp] = useState(10);

  const handleCreate = () => {
    if (!name) return;
    onAdd({
      id: `mt-${Date.now()}`,
      name,
      hp: { current: hp, max: hp },
      statValues: {},
      statuses: []
    });
    setName('');
    setHp(10);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(templates));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "monsters.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        onImport(json);
      } catch (err: any) {
        window.alert('Failed to import: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-4 glass-panel p-5 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h2 className="font-heading text-lg uppercase tracking-wide">🐉 Bestiary</h2>
        <div className="flex gap-2">
          <label className="btn-ghost cursor-pointer" style={{ fontSize: '11px' }}>
            ↑ Import
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          <button onClick={handleExport} className="btn-ghost" style={{ fontSize: '11px' }}>
            ↓ Export
          </button>
        </div>
      </div>
      
      <div className="flex gap-2 items-center">
        <input placeholder="Monster Name" value={name} onChange={e => setName(e.target.value)} className="input-fantasy flex-1" />
        <input type="number" placeholder="HP" value={hp} onChange={e => setHp(Number(e.target.value))} className="input-fantasy" style={{ width: '80px' }} />
        <button onClick={handleCreate} className="btn-fantasy">Add</button>
      </div>

      <div className="flex flex-col gap-2 mt-2">
        {templates.map(t => (
          <div key={t.id} className="flex justify-between items-center p-3 rounded-lg transition-all duration-200 animate-fade-in-up"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-accent)'; e.currentTarget.style.boxShadow = '0 0 10px var(--accent-glow)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
            <div className="flex items-center gap-3">
              <span className="text-lg">💀</span>
              <div>
                <span className="font-heading text-sm">{t.name}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>HP: {t.hp.max}</span>
              </div>
            </div>
            <button onClick={() => onSendToCombat(t)} className="btn-fantasy" style={{ padding: '4px 12px', fontSize: '11px' }}>
              ⚔ Deploy
            </button>
          </div>
        ))}
        {templates.length === 0 && <span className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No creatures in your bestiary yet.</span>}
      </div>
    </div>
  );
}
