import { useEffect, useState, useRef } from 'react';
import { CampaignStore, LocalProvider, CloudProvider, formatCalendarDate, calculateDate, calculateMoonPhases } from '@frogs-world/shared';
import type { StatFieldDef, Item, StatusInstance, CombatState, MonsterTemplate, EventTable, EventResult, CalendarConfig, CharacterProfile, Note, Handout, EventEntry, GlobalEffect } from '@frogs-world/shared/src/schema';
import { HPGauge, StatField, CurrencyRow, ItemRow, SchemaEditor, StatusList, ThemeProvider, PHASES, TimeDial, CalendarView, CalendarEditor, Lobby, ItemManager, SettingsPanel, Journal } from '@frogs-world/ui';

import { CombatTracker } from './components/CombatTracker';
import { MonsterLibrary } from './components/MonsterLibrary';
import { EventEditor } from './components/EventEditor';
import { MapTab } from './components/MapTab';

import { Landing } from '@frogs-world/ui';

export function GameApp({ store, initialRole, campaignId }: { store: CampaignStore, initialRole: 'dm' | 'player', campaignId: string }) {
  const [role, setRole] = useState<'dm' | 'player' | null>(initialRole);
  const [activeTab, setActiveTab] = useState<'sheet' | 'combat' | 'monsters' | 'events' | 'calendar' | 'journal' | 'settings' | 'map'>('sheet');
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [lanTarget, setLanTarget] = useState(`ws://localhost:3000/campaign/${campaignId}`);
  
  const [schema, setSchema] = useState<StatFieldDef[]>([]);
  const [locked, setLocked] = useState(false);
  const [timeState, setTimeState] = useState({ blocks: 0 });
  const [showItemManager, setShowItemManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [feed, setFeed] = useState<{id: string, message: string}[]>([]);
  const [combatState, setCombatState] = useState<CombatState>({ active: false, round: 1, turnIndex: 0, combatants: [] });
  const [monsterTemplates, setMonsterTemplates] = useState<MonsterTemplate[]>([]);
  const [eventTables, setEventTables] = useState<EventTable[]>([]);
  const [pendingEventResult, setPendingEventResult] = useState<{result: EventResult, entry: EventEntry} | null>(null);
  const [calendarConfig, setCalendarConfig] = useState<CalendarConfig | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<Record<number, string[]>>({});
  const [characterProfiles, setCharacterProfiles] = useState<CharacterProfile[]>([]);
  const [activeCharId, setActiveCharId] = useState<string | null>(null);
  
  const [localTheme, setLocalTheme] = useState(localStorage.getItem('frogs_theme') || 'mycelium');
  
  const [hp, setHp] = useState({ current: 10, max: 10 });
  const [baseStats, setBaseStats] = useState<Record<string, any>>({});
  const [currencies, setCurrencies] = useState<Record<string, number>>({});
  const [inventory, setInventory] = useState<Item[]>([]);
  const [statuses, setStatuses] = useState<StatusInstance[]>([]);
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [handouts, setHandouts] = useState<Handout[]>([]);
  const [revealedHandouts, setRevealedHandouts] = useState<Handout[]>([]);
  const [activeGlobalEffect, setActiveGlobalEffect] = useState<GlobalEffect | null>(null);
  const [activeEncounters, setActiveEncounters] = useState<GlobalEffect[]>([]);
  const [bloodMoon, setBloodMoon] = useState(false);
  const [showBloodMoonBanner, setShowBloodMoonBanner] = useState<string | null>(null);

  useEffect(() => {
    store.setRole(role || 'player');
  }, [role, store]);

  useEffect(() => {
    const isLobby = role === null || (role === 'player' && !activeCharId);
    if (isLobby) {
      document.body.className = 'theme-classic-dark';
    } else if (bloodMoon) {
      document.body.className = 'theme-blood-moon';
    } else {
      document.body.className = `theme-${localTheme}`;
      localStorage.setItem('frogs_theme', localTheme);
    }
  }, [role, activeCharId, localTheme, bloodMoon]);

  const initialBloodMoonMount = useRef(true);
  useEffect(() => {
    if (initialBloodMoonMount.current) {
      initialBloodMoonMount.current = false;
      return;
    }
    
    if (bloodMoon) {
      setShowBloodMoonBanner('The blood moon rises...');
      const t = setTimeout(() => setShowBloodMoonBanner(null), 5000);
      return () => clearTimeout(t);
    } else {
      setShowBloodMoonBanner('The blood moon fades...');
      const t = setTimeout(() => setShowBloodMoonBanner(null), 5000);
      return () => clearTimeout(t);
    }
  }, [bloodMoon]);

  useEffect(() => {
    const sharedMap = store.getSharedMap();
    const dmMap = store.getDmMap();

    const updateSharedState = () => {
      setSchema(sharedMap.get('schema') || []);
      setLocked(sharedMap.get('locked') || false);
      setTimeState(sharedMap.get('timeState') || { blocks: 0 });
      setFeed(sharedMap.get('feed') || []);
      setCombatState(sharedMap.get('combatState') || { active: false, round: 1, turnIndex: 0, combatants: [] });
      setCalendarConfig(store.getCalendarConfig());
      setCalendarEvents(store.getCalendarEvents());
      setCharacterProfiles(store.getCharacterProfiles());
      setRevealedHandouts(store.getRevealedHandouts());
      setActiveGlobalEffect(store.getActiveGlobalEffect());
      setActiveEncounters(store.getActiveEncounters());
      setBloodMoon(sharedMap.get('bloodMoon') || false);
    };
    
    const updateDmState = () => {
      setMonsterTemplates(dmMap.get('monsterTemplates') || []);
      setEventTables(dmMap.get('eventTables') || []);
      setNotes(store.getNotes());
      setHandouts(store.getHandouts());
    };

    sharedMap.observeDeep(updateSharedState);
    dmMap.observeDeep(updateDmState);
    
    updateSharedState();
    updateDmState();

    const handleSynced = () => {
      const shared = store.getSharedMap();
      if (!shared.has('schema') || shared.get('schema').length === 0) {
        shared.set('schema', [
          { id: 'str', label: 'STR', type: 'number', order: 0 },
          { id: 'init', label: 'INIT', type: 'number', order: 1 },
          { id: 'ac', label: 'AC', type: 'number', order: 2 }
        ]);
      }
      updateSharedState();
    };
    store.provider.on('synced', handleSynced);

    return () => {
      sharedMap.unobserveDeep(updateSharedState);
      dmMap.unobserveDeep(updateDmState);
      store.provider.off('synced', handleSynced);
    };
  }, [store]);

  useEffect(() => {
    if (!activeCharId) return;
    const charMap = store.getCharacterMap(activeCharId);
    
    const updateCharState = () => {
      setHp(charMap.get('hp') || { current: 10, max: 10 });
      setBaseStats(charMap.get('stats') || {});
      setCurrencies(charMap.get('currencies') || {});
      setInventory(charMap.get('inventory') || []);
      setStatuses(charMap.get('statuses') || []);
    };
    
    charMap.observe(updateCharState);
    updateCharState();
    
    return () => {
      charMap.unobserve(updateCharState);
    };
  }, [store, activeCharId]);

  const handleUpdateStat = (statId: string, val: number) => {
    if (!activeCharId) return;
    try { store.updateCharacterStat(activeCharId, statId, val); } catch (e: any) { window.alert(e.message); }
  };
  const handleUpdateHpCurrent = (val: number) => {
    if (!activeCharId) return;
    try { store.updateCharacterHp(activeCharId, val, hp.max); } catch (e: any) { window.alert(e.message); }
  };
  const handleUpdateHpMax = (val: number) => {
    if (!activeCharId) return;
    try { store.updateCharacterHp(activeCharId, hp.current, val); } catch (e: any) { window.alert(e.message); }
  };
  const handleToggleEquip = (itemId: string) => {
    if (!activeCharId) return;
    try { store.toggleItemEquip(activeCharId, itemId); } catch (e: any) { window.alert(e.message); }
  };
  const handleToggleLock = () => {
    try { store.toggleLock(); } catch (e: any) { window.alert(e.message); }
  };

  const handleAddStat = (name: string) => {
    try { store.addStatFieldDef({ id: name.toLowerCase().replace(/\s+/g, '_'), label: name, type: 'number', order: schema.length }); } catch (e: any) { window.alert(e.message); }
  };

  const handleAdvanceTime = (blocks: number) => {
    if (role !== 'dm') return;
    store.advanceTime(blocks);
  };

  const handleRollEvent = (tableId: string) => {
    const table = eventTables.find(t => t.id === tableId);
    if (!table || table.entries.length === 0) return;
    
    const entry = table.entries[0];
    const result: EventResult = {
      id: `res-${Date.now()}`,
      tableId,
      entryId: entry.id,
      rolledAt: new Date().toISOString(),
      appliedEffectIds: entry.effects.map(e => e.id)
    };
    setPendingEventResult({ result, entry });
  };

  const handleConfirmEvent = () => {
    if (!pendingEventResult) return;
    const { result, entry } = pendingEventResult;
    store.confirmEvent(result);
    const table = eventTables.find(t => t.id === result.tableId);
    if (table && table.category === 'weather') {
      store.setActiveGlobalEffect({
        id: `weather-${Date.now()}`,
        name: entry.label,
        description: entry.description || '',
        sourceTableId: table.id,
      });
    } else if (table && table.category === 'enemies') {
      store.addActiveEncounter({
        id: `encounter-${Date.now()}`,
        name: entry.label,
        description: entry.description || '',
        sourceTableId: table.id,
      });
    }
    setPendingEventResult(null);
  };

  const handleSelectEntry = (tableId: string, entryId: string) => {
    const table = eventTables.find(t => t.id === tableId);
    if (!table) return;
    const entry = table.entries.find(e => e.id === entryId);
    if (!entry) return;
    setPendingEventResult({
      result: { id: `res-${Date.now()}`, tableId, entryId: entry.id, rolledAt: new Date().toISOString(), appliedEffectIds: [] },
      entry
    });
  };

  const handleConnectLan = () => {
    try {
      const provider = new LocalProvider({
        doc: store.doc,
        url: lanTarget,
        campaignId,
        role: role || 'player',
        participantId: activeCharId || `user-${Math.random().toString(36).substring(2, 9)}`
      });
      store.connectSync(provider);
      setSyncStatus('connecting');
      provider.onStatusChange(setSyncStatus);
    } catch (e) {
      console.error('LAN Connect Error:', e);
    }
  };

  const handleConnectCloud = () => {
    try {
      const provider = new CloudProvider({
        doc: store.doc,
        url: 'wss://cloud.frogs-world.com',
        campaignId,
        role: role || 'player',
        participantId: activeCharId || `user-${Math.random().toString(36).substring(2, 9)}`,
        token: 'placeholder-jwt'
      });
      store.connectSync(provider);
      setSyncStatus('connecting');
      provider.onStatusChange(setSyncStatus);
    } catch (e) {
      console.error('Cloud Connect Error:', e);
    }
  };

  const handleDisconnect = () => {
    store.disconnectSync();
    setSyncStatus('disconnected');
  };

  const activePhase = PHASES[timeState.blocks % 4]?.name || 'Unknown';

  const TAB_ICONS: Record<string, string> = {
    sheet: '📜',
    combat: '⚔️',
    monsters: '🐉',
    events: '🎲',
    calendar: '📆',
    journal: '📖',
    settings: '⚙️',
    map: '🗺️'
  };

  if (role === null || (role === 'player' && !activeCharId)) {
    return (
      <ThemeProvider phaseIndex={timeState.blocks % 4}>
        <div className="w-full min-h-screen flex flex-col items-center p-4">
          <Lobby 
            characters={characterProfiles}
            onSelectCharacter={id => { setActiveCharId(id); setRole('player'); setActiveTab('sheet'); }}
            onJoinAsDM={() => { setRole('dm'); setActiveTab('combat'); }}
            onCreateCharacter={(name, charClass, ac, init, maxHp) => {
              const id = store.createCharacter(name, charClass, ac, init, maxHp);
              setActiveCharId(id);
              setRole('player');
              setActiveTab('sheet');
            }}
            onDeleteCharacter={id => store.deleteCharacter(id)}
          />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider phaseIndex={timeState.blocks % 4}>
      <div className="w-full min-h-screen flex flex-col items-center pb-16 pt-8 px-4">
        <div className="w-full flex flex-col gap-6" style={{ maxWidth: '520px' }}>
        
          <div className="fixed top-4 right-4 flex flex-col gap-2 z-50" style={{ maxWidth: '280px' }}>
            {feed.slice(-3).map(f => (
              <div key={f.id} className="glass-panel p-3 text-sm font-medium animate-fade-in-up"
                style={{ borderColor: 'var(--border-accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>
                ⚡ {f.message}
              </div>
            ))}
          </div>

          {showBloodMoonBanner && (
            <div className="blood-moon-banner" key={showBloodMoonBanner}>
              <div className="eclipse-icon" />
              <span className="banner-text">{showBloodMoonBanner}</span>
              <div className="eclipse-icon" />
            </div>
          )}

          <div className="text-center">
            <h1 style={{ fontFamily: 'var(--font-decorative)', fontSize: '1.75rem', fontWeight: 900, letterSpacing: '0.08em', color: 'var(--secondary)', textShadow: '0 0 20px var(--secondary-glow)', margin: 0 }}>
              Homebrew Companion
            </h1>
            <p className="mt-1" style={{ fontFamily: 'var(--font-heading)', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Companion App
            </p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <TimeDial phaseIndex={timeState.blocks % 4} />
            {(timeState.blocks % 4 === 0 || timeState.blocks % 4 === 3) && calendarConfig?.moons && (
              <div className="flex gap-2 animate-fade-in-up">
                {calculateMoonPhases(Math.floor(timeState.blocks / 4), calendarConfig.moons).map(moon => (
                  <div 
                    key={moon.config.id} 
                    className="text-xs font-bold px-2 py-1 rounded-full border shadow-sm flex items-center gap-1"
                    style={{ 
                      borderColor: moon.config.color || '#fff', 
                      color: moon.config.color || '#fff',
                      boxShadow: `0 0 8px ${moon.config.color || '#ffffff'}40`,
                      background: 'rgba(0,0,0,0.4)'
                    }}
                    title={moon.config.name}
                  >
                    🌑 {moon.phaseName}
                  </div>
                ))}
              </div>
            )}
          </div>

          {activeGlobalEffect && (
            <div className="w-full max-w-2xl mb-4 relative animate-fade-in-up">
              <div className="p-4 rounded-lg border shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(20,30,50,0.8) 0%, rgba(10,15,30,0.9) 100%)', borderColor: 'rgba(100,150,255,0.3)', boxShadow: '0 0 15px rgba(100,150,255,0.1)' }}>
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-heading uppercase tracking-widest text-blue-300">Active Weather / Effect</div>
                    <div className="text-lg font-heading font-bold text-white">{activeGlobalEffect.name}</div>
                    {activeGlobalEffect.description && <div className="text-sm text-blue-100/70 mt-1 whitespace-pre-wrap">{activeGlobalEffect.description}</div>}
                  </div>
                  {role === 'dm' && (
                    <button onClick={() => store.setActiveGlobalEffect(null)} className="btn-ghost text-red-400 border-red-500/30 text-xs py-1 px-2 hover:bg-red-500/20">
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeEncounters.map(encounter => (
            <div key={encounter.id} className="w-full max-w-2xl mb-4 relative animate-fade-in-up">
              <div className="p-4 rounded-lg border shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(50,20,20,0.8) 0%, rgba(30,10,10,0.9) 100%)', borderColor: 'rgba(225,29,72,0.3)', boxShadow: '0 0 15px rgba(225,29,72,0.1)' }}>
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-heading uppercase tracking-widest text-red-300">Active Encounter</div>
                    <div className="text-lg font-heading font-bold text-white">{encounter.name}</div>
                    {encounter.description && <div className="text-sm text-red-100/70 mt-1 whitespace-pre-wrap">{encounter.description}</div>}
                  </div>
                  {role === 'dm' && (
                    <button onClick={() => store.removeActiveEncounter(encounter.id)} className="btn-ghost text-red-400 border-red-500/30 text-xs py-1 px-2 hover:bg-red-500/20">
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="w-full max-w-2xl mb-6"></div>

          <div className="glass-panel flex justify-between items-center">
            <div>
              <div className="sub-label">Current Phase</div>
              <div style={{ fontFamily: 'var(--font-decorative)', fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent)', textShadow: '0 0 15px var(--accent-glow)', letterSpacing: '0.04em' }}>
                {activePhase}
              </div>
            </div>
            <div className="text-right">
              <div className="sub-label">World Time</div>
              <div className="font-body text-sm font-semibold" style={{ color: 'var(--text)' }}>
                {calendarConfig ? formatCalendarDate(timeState.blocks, calendarConfig) : `Day ${Math.floor(timeState.blocks / 4) + 1}`}
              </div>
            </div>
          </div>

          <div className="glass-panel flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{role === 'dm' ? '👑' : '🛡️'}</span>
              <div>
                <div className="sub-label">Role</div>
                <div style={{ fontFamily: 'var(--font-decorative)', fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)', textShadow: '0 0 10px var(--secondary-glow)', letterSpacing: '0.04em' }}>
                  {role === 'dm' ? 'Dungeon Master' : characterProfiles.find(c => c.id === activeCharId)?.name || 'Adventurer'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {role === 'dm' && (
                <>
                  <button onClick={() => setShowSettings(true)} className="btn-ghost" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                    ⚙️ Settings
                  </button>
                  <button onClick={() => setShowItemManager(true)} className="btn-fantasy" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                    🎁 Loot
                  </button>
                  <button 
                    onClick={() => store.setBloodMoon(!bloodMoon)} 
                    className={`blood-moon-toggle ${bloodMoon ? 'active' : ''}`}
                    title={bloodMoon ? 'Deactivate Blood Moon' : 'Activate Blood Moon'}
                  >
                    <div className="moon-icon" />
                  </button>
                </>
              )}
              <button onClick={() => { setRole(null); setActiveCharId(null); }} className="btn-ghost">
                Exit
              </button>
            </div>
          </div>

          <div className="glass-panel flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="sub-label">Multiplayer Sync</div>
                <div className="text-sm font-semibold flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${syncStatus === 'connected' ? 'bg-success shadow-[0_0_8px_var(--success)]' : syncStatus === 'connecting' ? 'bg-secondary animate-pulse' : 'bg-danger'}`}></span>
                  {syncStatus === 'connected' ? 'Connected to Campaign' : syncStatus === 'connecting' ? 'Connecting...' : 'Offline (Local Only)'}
                </div>
              </div>
              {syncStatus !== 'connected' ? (
                <div className="flex gap-2">
                  <button onClick={handleConnectLan} className="btn-fantasy" style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem' }}>
                    Connect LAN
                  </button>
                  <button onClick={handleConnectCloud} className="btn-gold" style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem' }}>
                    Connect Cloud
                  </button>
                </div>
              ) : (
                <button onClick={handleDisconnect} className="btn-danger" style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem' }}>
                  Disconnect
                </button>
              )}
            </div>
            {syncStatus !== 'connected' && (
              <div className="flex gap-2 items-center">
                <input 
                  type="text" 
                  value={lanTarget} 
                  onChange={e => setLanTarget(e.target.value)} 
                  className="input-fantasy text-xs flex-1" 
                  placeholder="ws://ip:port/campaign/id"
                />
              </div>
            )}
          </div>

          <div className="glass-panel flex flex-wrap gap-1.5" style={{ padding: '0.5rem' }}>
            {(role === 'dm' 
              ? ['sheet', 'combat', 'monsters', 'events', 'calendar', 'journal', 'map', 'settings']
              : ['sheet', 'combat', 'calendar', 'journal', 'map', 'settings']
            ).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`tab-pill ${activeTab === tab ? 'tab-pill-active' : ''}`}
              >
                {TAB_ICONS[tab]} {tab}
              </button>
            ))}
          </div>

          {activeTab === 'map' && (
            <div className="w-full animate-fade-in-up">
              <MapTab store={store} role={role as 'dm' | 'player'} />
            </div>
          )}

          {role === 'dm' && activeTab === 'sheet' && (
            <div className="flex flex-col gap-4 animate-fade-in-up">
              <div className="section-heading flex justify-between items-center">
                <h3 style={{ margin: 0 }}>⚙ DM Controls</h3>
                <select 
                  className="select-fantasy text-xs w-48"
                  value={activeCharId || ''}
                  onChange={e => setActiveCharId(e.target.value || null)}
                >
                  <option value="">-- Select Sheet --</option>
                  {(Array.isArray(characterProfiles) ? characterProfiles : []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={handleToggleLock} className="btn-danger flex-1">
                  {locked ? '🔒 Unlock' : '🔓 Lock'}
                </button>
                <button onClick={() => handleAdvanceTime(1)} className="btn-gold flex-1">
                  ⏳ +6 Hours
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleAdvanceTime(2)} className="btn-ghost flex-1 text-xs py-1">
                  +12 Hours
                </button>
                <button onClick={() => handleAdvanceTime(4)} className="btn-ghost flex-1 text-xs py-1">
                  +24 Hours
                </button>
                <button onClick={() => {
                  const daysInWeek = calendarConfig ? calendarConfig.weekdays.length : 7;
                  handleAdvanceTime(4 * daysInWeek);
                }} className="btn-ghost flex-1 text-xs py-1 border-secondary/30 text-secondary hover:bg-secondary/10">
                  +1 Week
                </button>
              </div>
              
              <div className="flex gap-3">
                <button disabled className="btn-ghost flex-1 opacity-40 cursor-not-allowed" style={{ fontSize: '11px' }}>
                  ⭐ Custom Calendar
                </button>
                <button disabled className="btn-ghost flex-1 opacity-40 cursor-not-allowed" style={{ fontSize: '11px' }}>
                  ⭐ Custom Cycles
                </button>
              </div>

              <SchemaEditor onAddStat={handleAddStat} />
            </div>
          )}

          {(role === 'player' || activeTab === 'sheet') && (
            <div className="glass-panel flex flex-col gap-5 animate-fade-in-up">
              
              <div className="section-heading">
                <h2 style={{ margin: 0 }}>
                  {(Array.isArray(characterProfiles) ? characterProfiles : []).find(c => c.id === activeCharId)?.name || 'Adventurer'}
                </h2>
                <div className="text-xs text-muted-foreground uppercase tracking-widest mt-1">
                  {(Array.isArray(characterProfiles) ? characterProfiles : []).find(c => c.id === activeCharId)?.charClass || 'Unknown Class'}
                </div>
              </div>
            
              <StatusList statuses={statuses} />
            

              <div>
                <div className="sub-label">Hit Points</div>
                <HPGauge current={hp.current} max={hp.max} onChangeCurrent={handleUpdateHpCurrent} onChangeMax={handleUpdateHpMax} />
              </div>
            
              {(() => {
                const getStatBonus = (statId: string) => {
                  let bonus = 0;
                  for (const item of (Array.isArray(inventory) ? inventory : [])) {
                    if (item.equipped && Array.isArray(item.effectsOnEquip)) {
                      for (const eff of item.effectsOnEquip) {
                        if (eff.type === 'modify_stat' && eff.payload && eff.payload.statId === statId) {
                          bonus += eff.payload.modifier || eff.payload.amount || 0;
                        }
                      }
                    }
                  }
                  return bonus;
                };

                return (
                  <div>
                    <div className="sub-label">Ability Scores</div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {['ac', 'init'].map(coreId => {
                        const def = (Array.isArray(schema) ? schema : []).find(s => s.id === coreId);
                        if (!def) return null;
                        const displayValue = baseStats[def.id] || 0;
                        const trueBaseValue = displayValue - getStatBonus(def.id);
                        return (
                          <StatField 
                            key={def.id}
                            label={def.label} 
                            value={displayValue} 
                            baseValue={trueBaseValue}
                            variant="steel"
                            onDecrement={() => handleUpdateStat(def.id, trueBaseValue - 1)} 
                            onIncrement={() => handleUpdateStat(def.id, trueBaseValue + 1)} 
                          />
                        );
                      })}
                      
                      {(Array.isArray(schema) ? schema : []).filter(s => s.id !== 'ac' && s.id !== 'init').map(def => {
                        const displayValue = baseStats[def.id] || 0;
                        const trueBaseValue = displayValue - getStatBonus(def.id);
                        return (
                          <div key={def.id} className="relative group">
                        {role === 'dm' && (
                          <button 
                            onClick={() => { if(window.confirm(`Delete ${def.label}?`)) { try { store.removeStatFieldDef(def.id); } catch(e:any){ alert(e.message); } } }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full flex justify-center items-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:scale-110 shadow-md border border-red-700"
                            title="Delete Stat"
                          >
                            ×
                          </button>
                        )}
                        <StatField 
                          label={def.label} 
                          value={displayValue} 
                          baseValue={trueBaseValue}
                          onDecrement={() => handleUpdateStat(def.id, trueBaseValue - 1)} 
                          onIncrement={() => handleUpdateStat(def.id, trueBaseValue + 1)} 
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

              <hr className="divider-fantasy" />
              
              <div>
                <div className="sub-label">💰 Treasury</div>
                {store.getCurrencyDefs().map(def => {
                  const amount = currencies[def.id] || 0;
                  return (
                    <CurrencyRow 
                      key={def.id} 
                      label={def.name || def.id} 
                      amount={amount} 
                    />
                  );
                })}
              </div>

              <hr className="divider-fantasy" />

              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="sub-label mb-0">🎒 Inventory</div>
                  <button 
                    onClick={() => setShowItemManager(true)}
                    className="text-xs font-bold font-heading uppercase text-accent border border-accent/30 px-2 py-1 rounded hover:bg-accent/10 transition-colors"
                  >
                    + Add Item
                  </button>
                </div>
                {(Array.isArray(inventory) ? inventory : []).map(item => (
                  <ItemRow 
                    key={item.id} 
                    item={item}
                    onToggleEquip={() => handleToggleEquip(item.id)}
                    onRemove={() => store.removeInventoryItem(activeCharId!, item.id)}
                  />
                ))}
              </div>
            </div>
          )}

        {activeTab === 'combat' && (
          <CombatTracker 
            role={role || 'player'}
            combatState={combatState} 
            onStart={() => store.startCombat()} 
            onEnd={() => store.endCombat()} 
            onNextTurn={() => store.nextTurn()} 
            onRemove={(id) => store.removeCombatant(id)} 
            onUpdateInitiative={(id, val) => store.updateCombatantInitiative(id, val)} 
            onUpdateAc={(id, val) => store.updateCombatantAc(id, val)}
            onUpdateHp={(id, curr, max) => store.updateCombatantHp(id, { current: curr, max })}
          />
        )}

        {activeTab === 'monsters' && (
          <MonsterLibrary 
            templates={monsterTemplates}
            onAdd={(t) => {
              const dmMap = store.getDmMap();
              dmMap.set('monsterTemplates', [...monsterTemplates, t]);
            }}
            onSendToCombat={(t) => {
              store.addCombatant({
                id: `monster-${Date.now()}`,
                source: 'monster',
                refId: t.id,
                label: t.name,
                initiative: 10,
                hp: { ...t.hp },
                statuses: []
              });
            }}
            onImport={(templates) => {
              const dmMap = store.getDmMap();
              dmMap.set('monsterTemplates', templates);
            }}
          />
        )}

        {role === 'dm' && activeTab === 'events' && (
          <EventEditor 
            tables={eventTables}
            templates={monsterTemplates}
            onAddTable={(t) => {
              const dmMap = store.getDmMap();
              dmMap.set('eventTables', [...eventTables, t]);
            }}
            onUpdateTable={(t) => {
              const dmMap = store.getDmMap();
              dmMap.set('eventTables', eventTables.map(existing => existing.id === t.id ? t : existing));
            }}
            onDeleteTable={(id) => {
              const dmMap = store.getDmMap();
              dmMap.set('eventTables', eventTables.filter(existing => existing.id !== id));
            }}
            onRoll={handleRollEvent}
            onSelectEntry={handleSelectEntry}
            onImport={(tables) => {
              const dmMap = store.getDmMap();
              dmMap.set('eventTables', tables);
            }}
          />
        )}

        {activeTab === 'calendar' && calendarConfig && (
          <div className="flex flex-col gap-6">
            {(() => {
              const date = calculateDate(timeState.blocks, calendarConfig);
              const currentMonth = calendarConfig.months[date.monthIndex];
              if (!currentMonth) return <div>Invalid Config</div>;
              const totalDaysPassedAtMonthStart = date.totalDaysPassed - (date.dayOfMonth - 1);
              const firstDayOfWeekIndex = ((totalDaysPassedAtMonthStart % calendarConfig.weekdays.length) + calendarConfig.weekdays.length) % calendarConfig.weekdays.length;

              return (
                <CalendarView 
                  role={role || 'player'}
                  year={date.year}
                  monthName={currentMonth.name}
                  daysInMonth={currentMonth.days}
                  currentDayOfMonth={date.dayOfMonth}
                  weekdays={calendarConfig.weekdays}
                  firstDayOfWeekIndex={firstDayOfWeekIndex}
                  totalDaysPassedAtMonthStart={totalDaysPassedAtMonthStart}
                  events={calendarEvents}
                  moons={calendarConfig.moons}
                  onAddEvent={(offset, evt) => {
                    try { store.addCalendarEvent(offset, evt); } catch(e:any) { alert(e.message); }
                  }}
                  onRemoveEvent={(offset, idx) => {
                    try { store.removeCalendarEvent(offset, idx); } catch(e:any) { alert(e.message); }
                  }}
                />
              );
            })()}
            {role === 'dm' && (
              <div className="flex flex-col gap-4 items-center">
                <button 
                  onClick={() => {
                    const el = document.getElementById('calendar-settings-container');
                    if (el) {
                      el.style.display = el.style.display === 'none' ? 'block' : 'none';
                    }
                  }} 
                  className="btn-ghost"
                >
                  ⚙️ Adjust Calendar Settings
                </button>
                <div id="calendar-settings-container" style={{ display: 'none', width: '100%' }}>
                  <CalendarEditor 
                    startYear={calendarConfig.startYear}
                    weekdays={calendarConfig.weekdays}
                    months={calendarConfig.months}
                    onUpdate={(cfg) => {
                      try { 
                        store.updateCalendarConfig(cfg); 
                        const el = document.getElementById('calendar-settings-container');
                        if (el) el.style.display = 'none';
                      } catch(e:any) { alert(e.message); }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'journal' && (
            <div className="glass-panel animate-fade-in-up" style={{ minHeight: '60vh' }}>
              <Journal 
                role={role}
                notes={notes}
                handouts={handouts}
                revealedHandouts={revealedHandouts}
                onSaveNote={(note) => store.saveNote(note)}
                onDeleteNote={(id) => store.deleteNote(id)}
                onSaveHandout={(handout) => store.saveHandout(handout)}
                onDeleteHandout={(id) => store.deleteHandout(id)}
                onToggleReveal={(id, isRevealed) => {
                  const h = handouts.find(x => x.id === id);
                  if (h) store.saveHandout({ ...h, isRevealed });
                }}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="glass-panel flex flex-col gap-6 animate-fade-in-up">
              <div className="section-heading">
                <h2 style={{ margin: 0 }}>Visual Settings</h2>
              </div>
              <div>
                <div className="sub-label">Select Local Theme</div>
                <div className="text-xs text-muted-foreground mb-3">This only affects your personal screen.</div>
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => setLocalTheme('high-noon')}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${localTheme === 'high-noon' ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_15px_var(--accent-glow)]' : 'border-[var(--border)] hover:border-[var(--accent)]/50'}`}
                    style={{ background: 'linear-gradient(135deg, rgba(210, 180, 140, 0.9) 0%, rgba(180, 150, 110, 0.95) 100%)' }}
                  >
                    <div className="font-heading font-bold text-lg mb-1 tracking-wider" style={{ color: '#5C4033', textShadow: '1px 1px 0 rgba(245,230,204,0.5)' }}>High Noon Scorch</div>
                    <div className="text-xs" style={{ color: '#5C4033' }}>Bleached bone backgrounds, eroded umber borders, drifting sand, and glowing burnt copper.</div>
                  </button>
                  <button 
                    onClick={() => setLocalTheme('arctic')}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${localTheme === 'arctic' ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_15px_var(--accent-glow)]' : 'border-[var(--border)] hover:border-[var(--accent)]/50'}`}
                    style={{ background: 'linear-gradient(135deg, rgba(28, 35, 43, 0.9) 0%, rgba(16, 20, 25, 0.95) 100%)' }}
                  >
                    <div className="font-heading font-bold text-lg mb-1 uppercase tracking-wider" style={{ color: '#F0F8FF' }}>Arctic Permafrost</div>
                    <div className="text-xs" style={{ color: '#8c9ea8' }}>Harsh survival slate, creeping jagged frost, and deep aurora green/violet glows.</div>
                  </button>
                  <button 
                    onClick={() => setLocalTheme('eldritch')}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${localTheme === 'eldritch' ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_15px_var(--accent-glow)]' : 'border-[var(--border)] hover:border-[var(--accent)]/50'}`}
                    style={{ background: 'linear-gradient(135deg, rgba(26, 15, 46, 0.9) 0%, rgba(13, 6, 20, 0.95) 100%)' }}
                  >
                    <div className="font-heading font-bold text-lg mb-1" style={{ color: '#00F5FF' }}>Abyssal Eldritch</div>
                    <div className="text-xs" style={{ color: '#6b8c96' }}>Deep oceanic purples, glowing tentacles, and pulsing bioluminescent biolife.</div>
                  </button>
                  <button 
                    onClick={() => setLocalTheme('volcanic')}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${localTheme === 'volcanic' ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_15px_var(--accent-glow)]' : 'border-[var(--border)] hover:border-[var(--accent)]/50'}`}
                    style={{ background: 'linear-gradient(145deg, rgba(20, 10, 8, 0.95) 0%, rgba(10, 3, 2, 0.98) 100%)' }}
                  >
                    <div className="font-heading font-bold text-lg mb-1" style={{ color: '#f97316' }}>Volcanic Ash</div>
                    <div className="text-xs" style={{ color: '#9a6851' }}>Abyssal black backgrounds, smoldering rough charcoal panels, and pulsing magma cracks.</div>
                  </button>
                  <button 
                    onClick={() => setLocalTheme('enchanted-forest')}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${localTheme === 'enchanted-forest' ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_15px_var(--accent-glow)]' : 'border-[var(--border)] hover:border-[var(--accent)]/50'}`}
                    style={{ background: 'linear-gradient(135deg, rgba(6, 15, 10, 0.9) 0%, rgba(2, 10, 6, 0.95) 100%)' }}
                  >
                    <div className="font-heading font-bold text-lg mb-1" style={{ color: '#ec4899' }}>Enchanted Forest</div>
                    <div className="text-xs" style={{ color: '#5c8570' }}>Deep woods woven with thorny vines, vibrant floral pinks, golden sunlight, and glowing fae butterflies.</div>
                  </button>
                  <button 
                    onClick={() => setLocalTheme('mycelium')}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${localTheme === 'mycelium' ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_15px_var(--accent-glow)]' : 'border-[var(--border)] hover:border-[var(--accent)]/50'}`}
                    style={{ background: 'linear-gradient(135deg, rgba(10, 15, 20, 0.8) 0%, rgba(5, 8, 12, 0.9) 100%)' }}
                  >
                    <div className="font-heading font-bold text-lg mb-1" style={{ color: '#00ff9d' }}>Mycelium</div>
                    <div className="text-xs" style={{ color: '#6b8583' }}>Deep underground, bioluminescent fungal decay. Highly organic buttons and hollowed-out containers.</div>
                  </button>
                  <button 
                    onClick={() => setLocalTheme('classic-dark')}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${localTheme === 'classic-dark' ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_15px_var(--accent-glow)]' : 'border-[var(--border)] hover:border-[var(--accent)]/50'}`}
                    style={{ background: 'linear-gradient(135deg, rgba(18, 18, 22, 0.8) 0%, rgba(12, 12, 18, 0.9) 100%)' }}
                  >
                    <div className="font-heading font-bold text-lg mb-1" style={{ color: '#e11d48' }}>Classic Dark</div>
                    <div className="text-xs" style={{ color: '#6b6b7b' }}>The original dark glass UI with crimson accents and clean geometric lines.</div>
                  </button>
                  <button 
                    onClick={() => setLocalTheme('classic-light')}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${localTheme === 'classic-light' ? 'border-[var(--accent)] bg-[var(--accent)]/10 shadow-[0_0_15px_var(--accent-glow)]' : 'border-[var(--border)] hover:border-[var(--accent)]/50'}`}
                    style={{ background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(240, 240, 245, 0.9) 100%)' }}
                  >
                    <div className="font-heading font-bold text-lg mb-1" style={{ color: '#b91c1c' }}>Classic Light</div>
                    <div className="text-xs" style={{ color: '#52525b' }}>A bright, parchment-like UI perfect for well-lit rooms or players who prefer dark text.</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Event Roll Modal ── */}
          {pendingEventResult && (
            <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
              <div className="glass-panel flex flex-col gap-5 animate-fade-in-up" style={{ maxWidth: '400px', width: '90%', padding: '2rem', borderColor: 'var(--border-accent)', boxShadow: '0 0 50px var(--accent-glow)' }}>
                <div className="text-center">
                  <span className="text-5xl">🎲</span>
                  <div className="section-heading mt-3"><h2>Fate Speaks</h2></div>
                </div>
                <p className="font-body text-base text-center font-medium" style={{ color: 'var(--text)', lineHeight: '1.6' }}>
                  {pendingEventResult.entry.label}
                </p>
                <div className="flex justify-center gap-3 mt-3">
                  <button onClick={() => setPendingEventResult(null)} className="btn-ghost">Dismiss</button>
                  <button onClick={handleConfirmEvent} className="btn-fantasy">⚡ Confirm & Apply</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Global Item Manager Modal ── */}
          {showItemManager && (
            <ItemManager 
              characters={characterProfiles}
              currentPlayerId={activeCharId || undefined}
              catalogItems={store.getItemTemplates()}
              schema={Array.isArray(schema) ? schema : []}
              onClose={() => setShowItemManager(false)}
              onAddItem={(template, recipientId) => store.addItemToInventory(recipientId, template)}
              onCreateItem={(template, recipientId) => {
                store.createItemTemplate(template);
                store.addItemToInventory(recipientId, template);
              }}
            />
          )}

          {/* ── Global Settings Panel ── */}
          {showSettings && role === 'dm' && (
            <SettingsPanel 
              currencies={store.getCurrencyDefs()}
              onAddCurrency={(def) => store.addCurrencyDef(def)}
              onRemoveCurrency={(id) => store.removeCurrencyDef(id)}
              onClose={() => setShowSettings(false)}
            />
          )}

        </div>
      </div>
    </ThemeProvider>
  );
}

export default function App() {
  const [appState, setAppState] = useState<'landing' | 'lobby' | 'game'>('landing');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [role, setRole] = useState<'dm' | 'player'>('player');
  const [store, setStore] = useState<CampaignStore | null>(null);

  const initCampaign = (id: string, r: 'dm' | 'player') => {
    if (store) store.destroy();
    const s = new CampaignStore(`frogs-world-db-${id}`);
    s.setRole(r);
    setStore(s);
    setRole(r);
    setCampaignId(id);
    setAppState('game');
  };

  if (appState === 'landing') {
    return (
      <Landing 
        onHost={(id) => initCampaign(id, 'dm')} 
        onJoin={(id) => initCampaign(id, 'player')} 
      />
    );
  }

  if (!store || !campaignId) return null;

  return <GameApp key={campaignId} store={store} initialRole={role} campaignId={campaignId} />;
}
