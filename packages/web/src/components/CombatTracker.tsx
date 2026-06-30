import { useState, useMemo, useRef, useEffect } from 'react';
import type { CombatState, Combatant, MonsterTemplate } from '@frogs-world/shared/src/schema';
import { HPGauge, StatusList, ConditionPopover } from '@frogs-world/ui';
import { CONDITIONS_DATA } from '@frogs-world/shared';

interface CombatTrackerProps {
  role: 'dm' | 'player';
  combatState: CombatState;
  monsterTemplates: MonsterTemplate[];
  onStart: () => void;
  onEnd: () => void;
  onNextTurn: () => void;
  onRemove: (id: string) => void;
  onUpdateInitiative: (id: string, val: number) => void;
  onUpdateAc: (id: string, val: number) => void;
  onUpdateHp: (id: string, current: number, max: number) => void;
  onAddCombatant: (c: any) => void;
  onImport: (templates: MonsterTemplate[]) => void;
  onUpdateConditions: (id: string, conditions: string[]) => void;
}

export function CombatTracker({ role, combatState, monsterTemplates, onStart, onEnd, onNextTurn, onRemove, onUpdateInitiative, onUpdateAc, onUpdateHp, onAddCombatant, onImport, onUpdateConditions }: CombatTrackerProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [initiative, setInitiative] = useState(10);
  
  const [isExpandedMode, setIsExpandedMode] = useState(true);
  const [centerIndex, setCenterIndex] = useState(0);
  const [activePopover, setActivePopover] = useState<{ id: string, condition: string } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Sync scroll to active turn
  useEffect(() => {
    if (combatState.active && combatState.turnIndex >= 0 && cardsRef.current[combatState.turnIndex]) {
      cardsRef.current[combatState.turnIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setCenterIndex(combatState.turnIndex);
    }
  }, [combatState.active, combatState.turnIndex, combatState.combatants.length]);

  // Throttled scroll logic
  const throttledScrollRef = useRef<number | null>(null);
  const onScroll = () => {
    if (throttledScrollRef.current) return;
    throttledScrollRef.current = window.setTimeout(() => {
      if (containerRef.current) {
        const container = containerRef.current;
        const centerY = container.scrollTop + container.clientHeight / 2;

        let closestIdx = 0;
        let minDiff = Infinity;

        cardsRef.current.forEach((card, idx) => {
          if (!card) return;
          const cardCenter = card.offsetTop + card.clientHeight / 2;
          const diff = Math.abs(centerY - cardCenter);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = idx;
          }
        });

        setCenterIndex(closestIdx);
      }
      throttledScrollRef.current = null;
    }, 32);
  };

  const filteredTemplates = useMemo(() => {
    if (!searchQuery) return [];
    return monsterTemplates.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5);
  }, [searchQuery, monsterTemplates]);

  const handleAdd = () => {
    if (!searchQuery) return;
    const template = monsterTemplates.find(t => t.name.toLowerCase() === searchQuery.toLowerCase());
    
    let baseName = template ? template.name : searchQuery;
    let maxHp = template ? template.hp.max : 10;
    
    const regex = new RegExp(`^${baseName}( \\d+)?$`, 'i');
    const existingCount = combatState.combatants.filter((c: any) => c.source === 'monster' && regex.test(c.label)).length;
    const label = existingCount > 0 ? `${baseName} ${existingCount + 1}` : baseName;

    onAddCombatant({
      id: `monster-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      label,
      source: 'monster',
      refId: template ? template.id : '',
      initiative,
      ac: template ? (template.statValues?.ac || 10) : 10,
      hp: { current: maxHp, max: maxHp },
      statuses: [],
      conditions: []
    });

    setSearchQuery('');
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(monsterTemplates));
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

  if (!combatState.active && role === 'player') {
    return <div className="p-6 glass-panel text-center" style={{ color: 'var(--text-muted)' }}>⚔️ No active combat.</div>;
  }

  return (
    <div className="flex flex-col gap-4 glass-panel p-5 animate-fade-in-up relative" style={{ borderColor: 'var(--border-accent)' }}>
      <div className="flex justify-between items-center">
        <h2 className="font-heading text-lg uppercase tracking-wide" style={{ color: 'var(--text)' }}>⚔️ Combat</h2>
        <div className="flex gap-3 items-center">
          {combatState.active && (
            <span className="font-heading text-sm uppercase tracking-wider px-3 py-1 rounded-full" 
              style={{ color: 'var(--secondary)', border: '1px solid var(--secondary-glow)', background: 'rgba(212,175,55,0.08)', boxShadow: '0 0 10px var(--secondary-glow)' }}>
              Round {combatState.round}
            </span>
          )}
          {role === 'dm' && (
            <>
              <button 
                onClick={() => setIsExpandedMode(!isExpandedMode)} 
                className="btn-ghost" 
                style={{ padding: '6px 12px' }}
              >
                {isExpandedMode ? '⊟ Reduce' : '⊞ Expand'}
              </button>
              <button onClick={() => setIsDrawerOpen(true)} className="btn-ghost" style={{ padding: '6px 12px' }}>💀 Enemies</button>
              {combatState.active 
                ? <button onClick={onEnd} className="btn-danger">End Combat</button>
                : <button onClick={onStart} className="btn-fantasy">Start Combat</button>}
            </>
          )}
        </div>
      </div>

      {/* Slide-out Drawer */}
      {role === 'dm' && (
        <div 
          className="absolute top-[65px] right-0 w-[300px] z-50 flex flex-col p-4 shadow-2xl transition-all duration-300 ease-in-out rounded-bl-lg rounded-br-lg"
          style={{ 
            background: 'rgba(15, 10, 20, 0.95)', 
            backdropFilter: 'blur(8px)',
            borderLeft: '1px solid var(--border-accent)',
            borderBottom: '1px solid var(--border-accent)',
            transform: isDrawerOpen ? 'translateX(0)' : 'translateX(100%)',
            pointerEvents: isDrawerOpen ? 'auto' : 'none',
            opacity: isDrawerOpen ? 1 : 0
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-heading text-secondary text-sm uppercase tracking-widest">Enemies</h3>
            <button onClick={() => setIsDrawerOpen(false)} className="text-white/50 hover:text-white">✕</button>
          </div>
          
          <div className="flex gap-2 mb-4">
            <label className="btn-ghost flex-1 text-center cursor-pointer" style={{ fontSize: '11px', padding: '4px' }}>
              ↑ Import
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button onClick={handleExport} className="btn-ghost flex-1" style={{ fontSize: '11px', padding: '4px' }}>
              ↓ Export
            </button>
          </div>

          <div className="flex flex-col gap-3 relative">
            <input 
              placeholder="Monster Name" 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="input-fantasy w-full" 
            />
            {filteredTemplates.length > 0 && !filteredTemplates.some(t => t.name.toLowerCase() === searchQuery.toLowerCase()) && (
              <div className="absolute top-[40px] left-0 w-full bg-black/90 border border-secondary/50 rounded z-[60] flex flex-col p-1 shadow-lg">
                {filteredTemplates.map(t => (
                  <div 
                    key={t.id} 
                    className="p-2 hover:bg-white/10 cursor-pointer text-sm text-white flex justify-between"
                    onClick={() => { setSearchQuery(t.name); }}
                  >
                    <span>{t.name}</span>
                    <span className="text-white/50 text-xs">HP {t.hp.max}</span>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/70">INIT:</span>
              <input 
                type="number" 
                value={initiative} 
                onChange={e => setInitiative(Number(e.target.value))} 
                className="input-fantasy w-16 text-center" 
              />
              <button onClick={handleAdd} className="btn-danger flex-1 font-bold tracking-widest">ADD</button>
            </div>
          </div>
        </div>
      )}

      {(combatState.active || role === 'dm') && (
        <>
          <div 
            ref={containerRef}
            onScroll={onScroll}
            className="flex flex-col gap-4 overflow-y-auto relative"
            style={{ 
              maxHeight: '400px', 
              scrollSnapType: 'y mandatory',
              scrollbarWidth: 'none', // Firefox
              msOverflowStyle: 'none', // IE
              paddingBlock: '150px' // Padding to allow first and last items to reach center
            }}
          >
            {/* Inject CSS to hide scrollbar in Chrome/Safari */}
            <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>

            {combatState.combatants.map((c: Combatant, i: number) => {
              const isTurn = combatState.active && i === combatState.turnIndex;
              const distance = Math.abs(i - centerIndex);
              
              let scale = 1;
              let opacity = 1;
              let zIndex = 10;
              
              if (distance === 1) {
                scale = 0.85;
                opacity = 0.6;
                zIndex = 5;
              } else if (distance > 1) {
                scale = 0.7;
                opacity = 0.3;
                zIndex = 1;
              }

              const isExpanded = role === 'dm' && isExpandedMode;

              return (
                <div 
                  key={c.id} 
                  ref={(el) => { cardsRef.current[i] = el; }}
                  className={`scrollbar-hide flex items-center gap-4 p-3 rounded-lg transition-all duration-300 ${isTurn ? 'animate-glow-pulse' : ''}`}
                  style={{ 
                    background: isTurn ? 'rgba(225,29,72,0.1)' : 'rgba(0,0,0,0.25)',
                    border: `1px solid ${isTurn ? 'var(--border-accent)' : 'var(--border)'}`,
                    boxShadow: isTurn ? '0 0 20px var(--accent-glow)' : 'none',
                    transform: `scale(${scale})`,
                    opacity,
                    zIndex,
                    scrollSnapAlign: 'center',
                    transformOrigin: 'center'
                  }}>
                  
                  <div className="flex flex-col items-center" style={{ minWidth: '48px' }}>
                    <span className="text-[10px] font-heading uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Init</span>
                    {isExpanded ? (
                      <input 
                        type="number" 
                        value={c.initiative} 
                        onChange={e => onUpdateInitiative(c.id, Number(e.target.value))}
                        className="w-12 text-center font-black text-lg tabular-nums" 
                        style={{ background: 'transparent', border: 'none', borderBottom: '2px solid var(--accent)', color: 'var(--text)', outline: 'none' }}
                      />
                    ) : (
                      <span className="font-black text-lg tabular-nums" style={{ color: 'var(--text)' }}>{c.initiative}</span>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="flex flex-col items-center" style={{ minWidth: '40px' }}>
                      <span className="text-[10px] font-heading uppercase tracking-widest" style={{ color: 'var(--secondary)' }}>AC</span>
                      <input 
                        type="number" 
                        value={c.ac} 
                        onChange={e => onUpdateAc(c.id, Number(e.target.value))}
                        className="w-10 text-center font-black text-lg tabular-nums" 
                        style={{ background: 'transparent', border: 'none', borderBottom: '2px solid var(--secondary)', color: 'var(--secondary)', outline: 'none' }}
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-heading text-base" style={{ color: isTurn ? 'var(--accent)' : 'var(--text)' }}>
                        {c.label} {isTurn && '🎯'}
                      </span>
                      {isExpanded && (
                        <button onClick={() => onRemove(c.id)} className="text-xs font-bold px-2 py-0.5 rounded transition-colors" 
                          style={{ color: 'var(--danger)', border: '1px solid rgba(220,38,38,0.2)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.15)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    {isExpanded ? (
                      <>
                        <HPGauge current={c.hp.current} max={c.hp.max} />
                        <div className="flex gap-2 mt-1">
                          <button onClick={() => onUpdateHp(c.id, Math.max(0, c.hp.current - 1), c.hp.max)} 
                            className="btn-ghost" style={{ padding: '2px 10px', fontSize: '11px', color: 'var(--danger)' }}>−1 HP</button>
                          <button onClick={() => onUpdateHp(c.id, Math.min(c.hp.max, c.hp.current + 1), c.hp.max)} 
                            className="btn-ghost" style={{ padding: '2px 10px', fontSize: '11px', color: 'var(--success, #22c55e)' }}>+1 HP</button>
                        </div>
                        <StatusList statuses={c.statuses as any[]} />

                        {/* Add Condition Dropdown */}
                        <div className="mt-2 flex items-center gap-2">
                          <select 
                            className="select-fantasy text-xs flex-1 bg-black/40"
                            value=""
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const currentConditions = c.conditions || [];
                              if (!currentConditions.includes(e.target.value)) {
                                onUpdateConditions(c.id, [...currentConditions, e.target.value]);
                              }
                            }}
                          >
                            <option value="">+ Add Status Condition</option>
                            {Object.keys(CONDITIONS_DATA).map(cond => (
                              <option key={cond} value={cond}>{cond}</option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : (
                      // Slim HP Bar for Reduced Mode
                      <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="h-full transition-all duration-300"
                          style={{ 
                            width: `${Math.max(0, Math.min(100, (c.hp.current / c.hp.max) * 100))}%`,
                            backgroundColor: c.hp.current > c.hp.max / 2 ? 'var(--success, #22c55e)' : c.hp.current > c.hp.max / 4 ? 'var(--warning, #eab308)' : 'var(--danger)'
                          }}
                        />
                      </div>
                    )}

                    {/* Condition Badges (Visible in both Expanded and Reduced) */}
                    {(c?.conditions?.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1 relative">
                        {(c?.conditions || []).map((cond: string) => (
                          <div key={cond} className="relative">
                            <button
                              onClick={() => setActivePopover({ id: c.id, condition: cond })}
                              className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border shadow-sm transition-colors"
                              style={{
                                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                                color: '#eab308',
                                borderColor: 'rgba(234, 179, 8, 0.3)'
                              }}
                            >
                              {cond}
                            </button>
                            {activePopover?.id === c.id && activePopover?.condition === cond && (
                              <ConditionPopover 
                                condition={cond} 
                                rulesText={CONDITIONS_DATA[cond] || 'No rules available.'}
                                onClose={() => setActivePopover(null)} 
                                onRemove={role === 'dm' ? () => {
                                  onUpdateConditions(c.id, c.conditions.filter((x: string) => x !== cond));
                                } : undefined}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {role === 'dm' && combatState.combatants.length > 0 && (
            <button onClick={onNextTurn} className="btn-gold mt-2 w-full py-3">
              ⚡ Next Turn
            </button>
          )}
        </>
      )}
    </div>
  );
}
