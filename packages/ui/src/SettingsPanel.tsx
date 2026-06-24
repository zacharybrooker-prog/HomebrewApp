import { useState } from 'react';

export interface CurrencyDef {
  id: string;
  name: string;
  abbreviation: string;
  order: number;
}

interface SettingsPanelProps {
  currencies: CurrencyDef[];
  onAddCurrency: (def: CurrencyDef) => void;
  onRemoveCurrency: (id: string) => void;
  databaseControls?: any;
  settings: { strictSpells: boolean };
  onUpdateSettings: (updates: Partial<{ strictSpells: boolean }>) => void;
  onClose: () => void;
}

export function SettingsPanel({ currencies, onAddCurrency, onRemoveCurrency, databaseControls, settings, onUpdateSettings, onClose }: SettingsPanelProps) {
  const [tab, setTab] = useState<'currencies' | 'schema' | 'database' | 'rules'>('currencies');
  const [newCurrencyName, setNewCurrencyName] = useState('');
  const [newCurrencyAbbr, setNewCurrencyAbbr] = useState('');

  const handleAddCurrency = () => {
    if (!newCurrencyName || !newCurrencyAbbr) return alert('Name and abbreviation required');
    onAddCurrency({
      id: `curr-${Date.now()}`,
      name: newCurrencyName,
      abbreviation: newCurrencyAbbr,
      order: currencies.length
    });
    setNewCurrencyName('');
    setNewCurrencyAbbr('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up">
      <div className="glass-panel w-full max-w-md max-h-[90vh] flex flex-col relative overflow-hidden" style={{ border: '1px solid var(--border-accent)' }}>
        
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-black/40">
          <h2 className="font-heading text-lg text-accent" style={{ textShadow: '0 0 10px var(--accent-glow)' }}>Campaign Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 bg-black/20 gap-2 border-b border-[var(--border)]">
          <button 
            className={`tab-pill ${tab === 'currencies' ? 'tab-pill-active' : ''}`}
            onClick={() => setTab('currencies')}
          >
            Currencies
          </button>
          <button 
            className={`tab-pill ${tab === 'schema' ? 'tab-pill-active' : ''}`}
            onClick={() => setTab('schema')}
          >
            Stat Schema
          </button>
          <button 
            className={`tab-pill ${tab === 'rules' ? 'tab-pill-active' : ''}`}
            onClick={() => setTab('rules')}
          >
            Rules
          </button>
          <button 
            className={`tab-pill ${tab === 'database' ? 'tab-pill-active' : ''}`}
            onClick={() => setTab('database')}
          >
            Database
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {tab === 'currencies' && (
            <div className="flex flex-col gap-4">
              <div className="text-sm text-muted-foreground mb-2">
                Define the global currencies used in this campaign (e.g. Gold, Space Credits).
              </div>
              
              <div className="flex flex-col gap-2">
                {currencies.map(c => (
                  <div key={c.id} className="flex justify-between items-center bg-black/40 border border-[var(--border)] p-2 rounded-lg">
                    <div>
                      <div className="font-bold text-sm text-secondary">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.abbreviation}</div>
                    </div>
                    <button onClick={() => onRemoveCurrency(c.id)} className="btn-danger text-xs py-1 px-2">Delete</button>
                  </div>
                ))}
                {currencies.length === 0 && <div className="text-sm italic text-muted-foreground text-center py-4">No currencies defined.</div>}
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-col gap-3">
                <div className="text-xs font-bold text-accent uppercase tracking-widest">Add Currency</div>
                <div className="flex gap-2">
                  <input 
                    className="input-fantasy flex-1" 
                    placeholder="Name (e.g. Platinum)" 
                    value={newCurrencyName}
                    onChange={e => setNewCurrencyName(e.target.value)}
                  />
                  <input 
                    className="input-fantasy w-20" 
                    placeholder="Abbr (pt)" 
                    value={newCurrencyAbbr}
                    onChange={e => setNewCurrencyAbbr(e.target.value)}
                  />
                </div>
                <button className="btn-fantasy" onClick={handleAddCurrency}>+ Add Currency</button>
              </div>
            </div>
          )}
          
          {tab === 'schema' && (
            <div className="text-center py-8 text-muted-foreground italic text-sm">
              Stat Schema editing is currently handled in the main view.
            </div>
          )}

          {tab === 'rules' && (
            <div className="flex flex-col gap-4">
               <div className="text-sm text-muted-foreground mb-4">
                 Configure campaign rules and strictness.
               </div>
               
               <div className="flex items-center justify-between bg-black/40 border border-[var(--border)] p-4 rounded-lg">
                 <div>
                   <div className="font-bold text-secondary">Strict Spells</div>
                   <div className="text-xs text-muted-foreground mt-1">If enabled, players can only add spells that exist in the compendium. If disabled, they can create custom spells on the fly.</div>
                 </div>
                 <button 
                   onClick={() => onUpdateSettings({ strictSpells: !settings.strictSpells })}
                   className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${settings.strictSpells ? 'bg-success' : 'bg-stone-700'}`}
                 >
                   <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.strictSpells ? 'translate-x-6' : 'translate-x-0'}`} />
                 </button>
               </div>
            </div>
          )}
          
          {tab === 'database' && (
            <div className="flex flex-col gap-4">
               <div className="text-sm text-muted-foreground mb-4">
                 Manage bulk database operations.
               </div>
               
               {/* Manual seeding buttons removed in favor of auto-seeding pipeline */}
               
               {databaseControls}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
