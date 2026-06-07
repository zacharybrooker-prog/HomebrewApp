import { useState } from 'react';

export interface ItemTemplate {
  id?: string;
  name: string;
  type: string;
  attunement: boolean;
  damage?: string;
  effectDescription?: string;
  effectsOnEquip?: any[];
  visibleToAll: boolean;
  creatorId?: string;
}

interface ItemManagerProps {
  characters: Array<{ id: string; name: string }>;
  catalogItems: ItemTemplate[];
  schema: Array<{ id: string; label: string }>;
  onAddItem: (template: ItemTemplate, recipientId: string) => void;
  onCreateItem: (template: Omit<ItemTemplate, 'id'>, recipientId: string) => void;
  onClose: () => void;
  currentPlayerId?: string;
}

const FIXED_TYPES = ['Weapon', 'Armor', 'Potion', 'Gear', 'Magic Item', 'Homebrew/Other'];

export function ItemManager({ characters, catalogItems, schema, onAddItem, onCreateItem, onClose, currentPlayerId }: ItemManagerProps) {
  const [tab, setTab] = useState<'search' | 'create'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  
  const defaultRecipient = currentPlayerId || (characters.length > 0 ? characters[0].id : '');
  const [recipientId, setRecipientId] = useState(defaultRecipient);

  // Create Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('Gear');
  const [customType, setCustomType] = useState('');
  const [attunement, setAttunement] = useState(false);
  const [damage, setDamage] = useState('');
  const [effectDescription, setEffectDescription] = useState('');
  const [statEffectId, setStatEffectId] = useState('');
  const [statEffectAmount, setStatEffectAmount] = useState('');
  const [visibleToAll, setVisibleToAll] = useState(true);

  const handleCreate = () => {
    if (!name) return alert('Name is required.');
    if (!recipientId) return alert('You must select a recipient character.');
    
    const finalType = type === 'Homebrew/Other' ? (customType || 'Other') : type;
    
    let finalEffectDescription = effectDescription;
    const effectsOnEquip: any[] = [];
    
    if (statEffectId && statEffectAmount) {
      const parsedAmount = parseInt(statEffectAmount);
      if (!isNaN(parsedAmount)) {
        effectsOnEquip.push({
          id: `effect-${Math.random().toString(36).substring(2, 9)}`,
          type: 'modify_stat',
          target: { kind: 'self' },
          payload: { statId: statEffectId, modifier: parsedAmount }
        });
        
        const statLabel = schema.find(s => s.id === statEffectId)?.label || statEffectId;
        const sign = parsedAmount >= 0 ? '+' : '';
        const effectText = `[Grants ${sign}${parsedAmount} to ${statLabel} when equipped]`;
        finalEffectDescription = finalEffectDescription ? `${finalEffectDescription}\n\n${effectText}` : effectText;
      }
    }
    
    onCreateItem({
      name,
      type: finalType,
      attunement,
      damage: damage || undefined,
      effectDescription: finalEffectDescription || undefined,
      effectsOnEquip: effectsOnEquip.length > 0 ? effectsOnEquip : undefined,
      visibleToAll,
      creatorId: currentPlayerId || 'dm'
    }, recipientId);
    onClose();
  };

  const visibleCatalog = catalogItems.filter(item => 
    (item.visibleToAll || item.creatorId === currentPlayerId || item.creatorId === 'dm') && 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up">
      <div className="glass-panel w-full max-w-md max-h-[90vh] flex flex-col relative overflow-hidden" style={{ border: '1px solid var(--border-accent)' }}>
        
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-black/40">
          <h2 className="font-heading text-lg text-accent" style={{ textShadow: '0 0 10px var(--accent-glow)' }}>Item Manager</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">✕</button>
        </div>

        {/* Global Recipient Selection */}
        {characters.length > 0 && (
          <div className="p-3 bg-black/60 border-b border-[var(--border)] flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Give to:</span>
            <select 
              className="select-fantasy w-full" 
              value={recipientId} 
              onChange={e => setRecipientId(e.target.value)}
            >
              {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="flex p-2 bg-black/20 gap-2 border-b border-[var(--border)]">
          <button 
            className={`tab-pill ${tab === 'search' ? 'tab-pill-active' : ''}`}
            onClick={() => setTab('search')}
          >
            Catalog
          </button>
          <button 
            className={`tab-pill ${tab === 'create' ? 'tab-pill-active' : ''}`}
            onClick={() => setTab('create')}
          >
            Create New
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {tab === 'search' ? (
            <div className="flex flex-col gap-4">
              <input 
                type="text" 
                className="input-fantasy w-full" 
                placeholder="Search items..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <div className="flex flex-col gap-2">
                {visibleCatalog.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground italic text-sm">
                    No items found.
                  </div>
                ) : (
                  visibleCatalog.map(item => (
                    <div key={item.id} className="bg-black/40 border border-[var(--border)] p-3 rounded-lg flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-sm flex items-center gap-2">
                            {item.name}
                            {item.attunement && <span className="text-[9px] uppercase tracking-widest text-secondary border border-secondary/30 px-1 py-0.5 rounded">Attuned</span>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">{item.type}</div>
                        </div>
                        <button 
                          onClick={() => { 
                            if (!recipientId) return alert('Please select a recipient character first.');
                            onAddItem(item, recipientId); 
                            onClose(); 
                          }}
                          className="btn-ghost text-xs py-1 px-2"
                        >
                          + Give
                        </button>
                      </div>
                      {item.damage && <div className="text-xs text-accent font-bold">Damage: {item.damage}</div>}
                      {item.effectDescription && <div className="text-xs text-muted-foreground italic leading-relaxed">{item.effectDescription}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Item Name</label>
                <input className="input-fantasy" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sword of Truth" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Type</label>
                <select className="select-fantasy" value={type} onChange={e => setType(e.target.value)}>
                  {FIXED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {type === 'Homebrew/Other' && (
                <div className="flex flex-col gap-1 animate-fade-in-up">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Custom Type</label>
                  <input className="input-fantasy" value={customType} onChange={e => setCustomType(e.target.value)} placeholder="e.g. Relic" />
                </div>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Damage (Optional)</label>
                <input className="input-fantasy" value={damage} onChange={e => setDamage(e.target.value)} placeholder="e.g. 1d8 + 2 Slashing" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Stat Bonus / Debuff (Optional)</label>
                <div className="flex gap-2">
                  <select className="select-fantasy flex-1" value={statEffectId} onChange={e => setStatEffectId(e.target.value)}>
                    <option value="">-- No Stat Effect --</option>
                    {schema.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <input 
                    type="text" 
                    className="input-fantasy w-20 text-center" 
                    placeholder="+1 / -1" 
                    value={statEffectAmount} 
                    onChange={e => setStatEffectAmount(e.target.value)} 
                    disabled={!statEffectId}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Effect Description</label>
                <textarea 
                  className="input-fantasy min-h-[80px] resize-none" 
                  value={effectDescription} 
                  onChange={e => setEffectDescription(e.target.value)} 
                  placeholder="Describe the magical properties or effects..." 
                />
              </div>

              <div className="flex items-center gap-3 bg-black/20 p-3 rounded-lg border border-[var(--border)]">
                <input type="checkbox" className="checkbox-fantasy" checked={attunement} onChange={e => setAttunement(e.target.checked)} id="attunement-toggle" />
                <label htmlFor="attunement-toggle" className="text-sm cursor-pointer select-none">Requires Attunement</label>
              </div>

              <div className="flex items-center gap-3 bg-black/20 p-3 rounded-lg border border-[var(--border)]">
                <input type="checkbox" className="checkbox-fantasy" checked={visibleToAll} onChange={e => setVisibleToAll(e.target.checked)} id="visibility-toggle" />
                <label htmlFor="visibility-toggle" className="text-sm cursor-pointer select-none">
                  <div className="font-bold">Visible to All Players</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Allows others to find this in the catalog</div>
                </label>
              </div>

              <button className="btn-fantasy mt-2 w-full py-3" onClick={handleCreate}>
                Forge Item
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
