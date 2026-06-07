import { useState } from 'react';
import type { EventTable, MonsterTemplate, EventEntry } from '@frogs-world/shared/src/schema';

interface EventEditorProps {
  tables: EventTable[];
  templates: MonsterTemplate[];
  onAddTable: (table: EventTable) => void;
  onUpdateTable: (table: EventTable) => void;
  onDeleteTable: (tableId: string) => void;
  onRoll: (tableId: string) => void;
  onSelectEntry: (tableId: string, entryId: string) => void;
  onImport: (tables: EventTable[]) => void;
}

export function EventEditor({ tables, onAddTable, onUpdateTable, onDeleteTable, onRoll, onSelectEntry, onImport }: EventEditorProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'enemies' | 'weather'>('enemies');
  const [expandedTableId, setExpandedTableId] = useState<string | null>(null);

  // Edit Entry State
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryLabel, setEntryLabel] = useState('');
  const [entryDescription, setEntryDescription] = useState('');
  const [entryWeight, setEntryWeight] = useState(1);

  const handleAdd = () => {
    if (!name) return;
    onAddTable({
      id: `table-${Date.now()}`,
      name,
      category,
      entries: []
    });
    setName('');
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tables));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "events.json");
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

  const startAddEntry = (tableId: string) => {
    setExpandedTableId(tableId);
    setEditingEntryId(`entry-${Date.now()}`);
    setEntryLabel('');
    setEntryDescription('');
    setEntryWeight(1);
  };

  const startEditEntry = (tableId: string, entry: EventEntry) => {
    setExpandedTableId(tableId);
    setEditingEntryId(entry.id);
    setEntryLabel(entry.label);
    setEntryDescription(entry.description || '');
    setEntryWeight(entry.weight);
  };

  const saveEntry = (table: EventTable) => {
    if (!editingEntryId || !entryLabel) return;
    const existingIndex = table.entries.findIndex(e => e.id === editingEntryId);
    const newEntry: EventEntry = {
      id: editingEntryId,
      label: entryLabel,
      description: entryDescription || undefined,
      weight: entryWeight,
      effects: [], // Effects editor omitted for brevity
    };

    let newEntries = [...table.entries];
    if (existingIndex >= 0) {
      newEntries[existingIndex] = { ...table.entries[existingIndex], ...newEntry };
    } else {
      newEntries.push(newEntry);
    }

    onUpdateTable({ ...table, entries: newEntries });
    setEditingEntryId(null);
  };

  const deleteEntry = (table: EventTable, entryId: string) => {
    if (!window.confirm('Delete this entry?')) return;
    onUpdateTable({ ...table, entries: table.entries.filter(e => e.id !== entryId) });
  };

  return (
    <div className="flex flex-col gap-4 glass-panel p-5 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h2 className="font-heading text-lg uppercase tracking-wide">🎲 Fate Tables</h2>
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
        <select value={category} onChange={e => setCategory(e.target.value as 'enemies'|'weather')} className="select-fantasy">
          <option value="enemies">⚔ Enemies</option>
          <option value="weather">🌩 Weather</option>
        </select>
        <input placeholder="New Table Name" value={name} onChange={e => setName(e.target.value)} className="input-fantasy flex-1" />
        <button onClick={handleAdd} className="btn-fantasy">Create</button>
      </div>

      <div className="flex flex-col gap-4 mt-2">
        {tables.map(table => (
          <div key={table.id} className="p-4 rounded-lg flex flex-col gap-3 animate-fade-in-up transition-all" 
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-accent)' }}>
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedTableId(expandedTableId === table.id ? null : table.id)}>
              <div>
                <span className="font-heading text-base hover:text-accent transition-colors">{table.name}</span>
                <span className="text-[10px] font-heading uppercase tracking-widest ml-2" style={{ color: 'var(--text-muted)' }}>{table.category}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); onRoll(table.id); }} className="btn-gold py-1 px-3 text-xs">
                  🎲 Roll
                </button>
                <button onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete Table?')) onDeleteTable(table.id); }} className="btn-ghost text-red-500 py-1 px-2 text-xs">
                  ×
                </button>
              </div>
            </div>
            
            {expandedTableId === table.id && (
              <div className="mt-2 pl-4 flex flex-col gap-2" style={{ borderLeft: '2px solid var(--border-accent)' }}>
                {table.entries.map(e => (
                  <div key={e.id} className="text-sm flex flex-col gap-1 p-2 rounded glass-panel">
                    {editingEntryId === e.id ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <input type="number" min="1" className="input-fantasy w-16 text-xs" value={entryWeight} onChange={ev => setEntryWeight(parseInt(ev.target.value) || 1)} title="Weight" />
                          <input className="input-fantasy flex-1 text-xs" value={entryLabel} onChange={ev => setEntryLabel(ev.target.value)} placeholder="Event Label (e.g. Heavy Rain)" />
                        </div>
                        <textarea className="input-fantasy text-xs" rows={2} value={entryDescription} onChange={ev => setEntryDescription(ev.target.value)} placeholder="Description/Mechanics (e.g. -2 to Ranged Attacks)" />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingEntryId(null)} className="btn-ghost text-xs py-1 px-2">Cancel</button>
                          <button onClick={() => saveEntry(table)} className="btn-fantasy text-xs py-1 px-2">Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2 items-center">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.3)', color: 'var(--secondary)' }}>{e.weight}</span>
                            <span className="font-bold" style={{ color: 'var(--text)' }}>{e.label}</span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 hover-visible">
                            <button onClick={() => onSelectEntry(table.id, e.id)} className="btn-ghost py-0.5 px-2 text-[10px] text-green-400 border-green-500/30">Set</button>
                            <button onClick={() => startEditEntry(table.id, e)} className="btn-ghost py-0.5 px-2 text-[10px]">Edit</button>
                            <button onClick={() => deleteEntry(table, e.id)} className="btn-ghost py-0.5 px-2 text-[10px] text-red-500">×</button>
                          </div>
                        </div>
                        {e.description && <div className="text-xs text-muted-foreground ml-7 whitespace-pre-wrap">{e.description}</div>}
                      </>
                    )}
                  </div>
                ))}
                
                {editingEntryId?.startsWith('entry-') && !table.entries.find(e => e.id === editingEntryId) ? (
                  <div className="flex flex-col gap-2 p-2 rounded glass-panel">
                    <div className="flex gap-2">
                      <input type="number" min="1" className="input-fantasy w-16 text-xs" value={entryWeight} onChange={ev => setEntryWeight(parseInt(ev.target.value) || 1)} title="Weight" />
                      <input className="input-fantasy flex-1 text-xs" value={entryLabel} onChange={ev => setEntryLabel(ev.target.value)} placeholder="Event Label" />
                    </div>
                    <textarea className="input-fantasy text-xs" rows={2} value={entryDescription} onChange={ev => setEntryDescription(ev.target.value)} placeholder="Description/Mechanics" />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingEntryId(null)} className="btn-ghost text-xs py-1 px-2">Cancel</button>
                      <button onClick={() => saveEntry(table)} className="btn-fantasy text-xs py-1 px-2">Add</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => startAddEntry(table.id)} className="btn-ghost text-xs mt-2 self-start">+ Add Entry</button>
                )}
              </div>
            )}
          </div>
        ))}
        {tables.length === 0 && <span className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>No fate tables yet. Create one above.</span>}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hover-visible { opacity: 1 !important; }
      `}} />
    </div>
  );
}
