import { useEffect, useState, useRef } from 'react';
import { CampaignStore, formatCalendarDate, calculateDate, FirebaseProvider } from '@frogs-world/shared';
import type { StatFieldDef, Item, CombatState, MonsterTemplate, EventTable, EventResult, CalendarConfig, CharacterProfile, Note, Handout, EventEntry, GlobalEffect, TimeState, EquipmentMap } from '@frogs-world/shared/src/schema';
import { ThemeProvider, PHASES, CalendarView, CalendarEditor, Lobby, ItemManager, SettingsPanel, Journal, TraditionalSheet, Tavern } from '@frogs-world/ui';
import { User as UserIcon, Scroll as ScrollIcon, Wand2 as Wand2Icon, BookOpen as BookOpenIcon, CalendarDays as CalendarDaysIcon, Beer as BeerIcon, Menu as MenuIcon } from 'lucide-react';

const User = UserIcon as any;
const Scroll = ScrollIcon as any;
const Wand2 = Wand2Icon as any;
const BookOpen = BookOpenIcon as any;
const CalendarDays = CalendarDaysIcon as any;
const Beer = BeerIcon as any;
import { auth, db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

import { CombatTracker } from './components/CombatTracker';
import { SpellsCompendium } from './components/SpellsCompendium';
import { BestiaryCompendium } from './components/BestiaryCompendium';
import { EventEditor } from './components/EventEditor';
import { MapTab } from './components/MapTab';
import { MagicItemsCompendium } from './components/MagicItemsCompendium';
import { EquipmentCompendium } from './components/EquipmentCompendium';
import { FeatsCompendium } from './components/FeatsCompendium';

import { CsvImporter } from './components/CsvImporter';
import { Vault } from './components/Vault';
import GlobalNavMenu from './components/GlobalNavMenu';
import { useClassFeatures } from './hooks/useClassFeatures';

export function GameApp({ store, initialRole, campaignId, initialCharacterId, initialCharacterData }: { store: CampaignStore, initialRole: 'dm' | 'player', campaignId: string, initialCharacterId?: string, initialCharacterData?: any }) {
  const [role, setRole] = useState<'dm' | 'player' | null>(initialRole);
  const [activeTab, setActiveTab] = useState<'sheet' | 'combat' | 'bestiary' | 'events' | 'calendar' | 'journal' | 'tavern' | 'settings' | 'map' | 'inventory' | 'mount' | 'abilities' | 'botany' | 'spells' | 'items' | 'equipment' | 'curses' | 'diseases' | 'recipes' | 'glossary' | 'feats'>('sheet');

  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [schema, setSchema] = useState<StatFieldDef[]>([]);

  const [timeState, setTimeState] = useState<TimeState>({ blocks: 0 });
  const [isNavMenuOpen, setIsNavMenuOpen] = useState(false);



  const [showItemManager, setShowItemManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [feed, setFeed] = useState<{id: string, message: string}[]>([]);
  const [settings, setSettings] = useState<{ strictSpells: boolean }>({ strictSpells: true });
  const [unreadTavern, setUnreadTavern] = useState(false);
  const tavernCountRef = useRef(0);

  // Inventory UI State
  const [showExtraPlanar, setShowExtraPlanar] = useState(false);
  const [equipMenuTarget, setEquipMenuTarget] = useState<Item | null>(null);

  const PaperDollSlot = ({ item, label, top, left, right, tx, onUnequip }: any) => {
    return (
      <div 
        className="absolute w-16 h-16 flex flex-col items-center justify-center border border-[var(--border)] rounded bg-black/40 backdrop-blur transition-all duration-300 hover:border-[var(--accent)] cursor-pointer group"
        style={{ 
          top, 
          left, 
          right, 
          transform: `translateX(${tx})`,
          boxShadow: item ? '0 0 15px rgba(225,29,72,0.15)' : 'none'
        }}
        onClick={() => item && onUnequip()}
      >
        <span className="text-[9px] font-heading uppercase text-muted-foreground absolute -top-4">{label}</span>
        {item ? (
          <div className="text-center p-1">
            <span className="text-xs font-bold text-accent leading-tight line-clamp-2" style={{ textShadow: '0 0 5px rgba(0,0,0,1)' }}>{item.name}</span>
          </div>
        ) : (
          <span className="text-white/10 text-xl opacity-30">+</span>
        )}
        {item && (
          <div className="absolute inset-0 bg-danger/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
            <span className="text-xs font-bold text-white">Unequip</span>
          </div>
        )}
      </div>
    );
  };
  const [combatState, setCombatState] = useState<CombatState>({ active: false, round: 1, turnIndex: 0, combatants: [] });
  const [monsterTemplates, setMonsterTemplates] = useState<MonsterTemplate[]>([]);
  const [eventTables, setEventTables] = useState<EventTable[]>([]);
  const [pendingEventResult, setPendingEventResult] = useState<{result: EventResult, entry: EventEntry} | null>(null);
  const [calendarConfig, setCalendarConfig] = useState<CalendarConfig | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<Record<number, string[]>>({});
  const [calendarViewOffset, setCalendarViewOffset] = useState<number>(0);
  const [characterProfiles, setCharacterProfiles] = useState<CharacterProfile[]>([]);
  const [activeCharId, setActiveCharId] = useState<string | null>(initialCharacterId || null);

  const [baseStats, setBaseStats] = useState<Record<string, any>>({});

  const [mainStorage, setMainStorage] = useState<Item[]>([]);
  const [extraPlanarStorage, setExtraPlanarStorage] = useState<Item[]>([]);
  const [equipment, setEquipment] = useState<EquipmentMap>({} as EquipmentMap);

  const [activeCharacter, setActiveCharacter] = useState<any>(null);
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [handouts, setHandouts] = useState<Handout[]>([]);
  const [revealedHandouts, setRevealedHandouts] = useState<Handout[]>([]);
  const [activeGlobalEffect, setActiveGlobalEffect] = useState<GlobalEffect | null>(null);
  const [activeEncounters, setActiveEncounters] = useState<GlobalEffect[]>([]);
  const [bloodMoon, setBloodMoon] = useState(false);
  const [showBloodMoonBanner, setShowBloodMoonBanner] = useState<string | null>(null);

  const { unlockedFeatures, computedStats } = useClassFeatures(activeCharacter?.charClass, activeCharacter?.level, baseStats);

  useEffect(() => {
    store.setRole(role || 'player');
  }, [role, store]);

  // Vault -> Game Pipeline (Inject initial data on load)
  useEffect(() => {
    if (initialCharacterData && initialCharacterId) {
      store.importVaultCharacter(initialCharacterData);
    }
  }, [initialCharacterData, initialCharacterId, store]);

  // Silently trigger auto-seed pipeline on startup
  useEffect(() => {
    // Only run if we are in production or if configured to run
    fetch('/api/init-database', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        if (data.didSeed) {
          console.log('[Auto-Seed] Database was successfully seeded.');
        } else {
          console.log('[Auto-Seed] Database already seeded or initialization failed.', data);
        }
      })
      .catch(err => console.error('[Auto-Seed] Error triggering init-database:', err));
  }, []);

  useEffect(() => {
    if (bloodMoon) {
      document.body.className = 'theme-blood-moon';
    } else {
      document.body.className = '';
    }
  }, [bloodMoon]);
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
      setSchema([...(sharedMap.get('schema') || [])]);
      setTimeState({ ...(sharedMap.get('timeState') || { blocks: 0 }) });
      setFeed([...(sharedMap.get('feed') || [])]);
      
      const cs = sharedMap.get('combatState');
      setCombatState(cs ? JSON.parse(JSON.stringify(cs)) : { active: false, round: 1, turnIndex: 0, combatants: [] });
      
      const cc = store.getCalendarConfig();
      setCalendarConfig(cc ? JSON.parse(JSON.stringify(cc)) : null);
      
      setCalendarEvents({ ...store.getCalendarEvents() });
      setCharacterProfiles([...store.getCharacterProfiles()]);
      setRevealedHandouts([...store.getRevealedHandouts()]);
      setNotes([...store.getNotes()]);
      
      setSettings(sharedMap.get('settings') || { strictSpells: true });
      const age = store.getActiveGlobalEffect();
      setActiveGlobalEffect(age ? { ...age } : null);
      
      setActiveEncounters([...store.getActiveEncounters()]);
      setBloodMoon(sharedMap.get('bloodMoon') || false);
      setLocationName(sharedMap.get('locationName') || 'Unknown Location');
    };
    
    const updateDmState = () => {
      setMonsterTemplates([...(dmMap.get('monsterTemplates') || [])]);
      setEventTables([...(dmMap.get('eventTables') || [])]);
      setHandouts([...store.getHandouts()]);
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

  // Tavern Unread tracking
  useEffect(() => {
    if (!store) return;
    const updateUnread = () => {
      const msgs = store.getChatMessages();
      if (activeTab === 'tavern') {
        tavernCountRef.current = msgs.length;
        setUnreadTavern(false);
      } else {
        if (msgs.length > tavernCountRef.current) {
          setUnreadTavern(true);
        }
      }
    };
    // Sync when component loads
    updateUnread();
    store.doc.on('update', updateUnread);
    return () => store.doc.off('update', updateUnread);
  }, [store, activeTab]);

  const [locationName, setLocationName] = useState('Unknown Location');
  const [visualTimeMs, setVisualTimeMs] = useState(0);

  const formatClockTime = (ms: number) => {
    const msInDay = Math.floor(ms % (24 * 60 * 60 * 1000));
    const totalMinutes = Math.floor(msInDay / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Real-time Visual Clock rendering loop
  useEffect(() => {
    let animationFrame: number;
    const tick = () => {
      if (timeState.gameTimeMs !== undefined) {
        if (timeState.isRunning && timeState.lastRealTimeMs) {
          const elapsedReal = Date.now() - timeState.lastRealTimeMs;
          const scale = timeState.timeScale || 60;
          setVisualTimeMs(timeState.gameTimeMs + elapsedReal * scale);
        } else {
          setVisualTimeMs(timeState.gameTimeMs);
        }
      } else {
        const BLOCK_MS = 6 * 60 * 60 * 1000;
        setVisualTimeMs(timeState.blocks * BLOCK_MS);
      }
      animationFrame = requestAnimationFrame(tick);
    };
    animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [timeState]);

  // DM Auto-Progression Natural Tick Loop
  useEffect(() => {
    if (role !== 'dm') return;
    const BLOCK_MS = 6 * 60 * 60 * 1000;
    const currentBlockFloat = visualTimeMs / BLOCK_MS;
    
    if (Math.floor(currentBlockFloat) > timeState.blocks) {
      store.syncNaturalTime(visualTimeMs);
    }
  }, [visualTimeMs, role, timeState.blocks, store]);

  useEffect(() => {
    if (!activeCharId) return;
    const charMap = store.getCharacterMap(activeCharId);
    
    const updateCharState = () => {
      setBaseStats({ ...(charMap.get('stats') || {}) });
      setMainStorage([...(charMap.get('mainStorage') || [])]);
      setExtraPlanarStorage([...(charMap.get('extraPlanarStorage') || [])]);
      setEquipment({ ...(charMap.get('equipment') || {}) } as EquipmentMap);
      
      const p = (store.getCharacterProfiles() as any).find((c:any) => c.id === activeCharId) || {};
      setActiveCharacter({
        id: activeCharId,
        name: charMap.get('name') || p.name || 'Unknown',
        charClass: charMap.get('charClass') || p.charClass || '',
        level: charMap.get('level') || 1,
        species: charMap.get('species') || '',
        feats: charMap.get('feats') || [],
        hp: charMap.get('hp') || { current: 10, max: 10 },
        proficiencies: p.proficiencies || []
      });
    };
    
    charMap.observe(updateCharState);
    updateCharState();
    
    // Reverse Sync: Yjs -> Firebase Vault
    // If we have an active user, we debounce saving the charMap changes back to Firebase
    let syncTimeout: any;
    const syncToFirebase = () => {
      if (auth.currentUser && activeCharId) {
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(async () => {
           try {
              const currentHp = charMap.get('hp') || { current: 10, max: 10 };
              const currentStats = charMap.get('stats') || {};
              const currentLevel = charMap.get('level') || 1;
              const p = (store.getCharacterProfiles() as any).find((c:any) => c.id === activeCharId) || {};
              
              await updateDoc(doc(db, `users/${auth.currentUser!.uid}/characters/${activeCharId}`), {
                 hp: currentHp,
                 stats: currentStats,
                 level: currentLevel,
                 activeCharacter: {
                    name: charMap.get('name') || p.name || 'Unnamed',
                    charClass: charMap.get('charClass') || p.charClass || '',
                    level: currentLevel,
                    proficiencies: p.proficiencies || []
                 }
              });
           } catch (e) {
              console.error("Failed to reverse sync character to Vault", e);
           }
        }, 2000); // 2 second debounce
      }
    };
    charMap.observe(syncToFirebase);
    
    return () => {
      charMap.unobserve(updateCharState);
      charMap.unobserve(syncToFirebase);
      if (syncTimeout) clearTimeout(syncTimeout);
    };
  }, [store, activeCharId]);

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

  useEffect(() => {
    let isMounted = true;
    let provider: FirebaseProvider | null = null;
    
    const handleCampaignNotFound = () => {
      alert("Campaign not found or you do not have access. Please check the code.");
      window.location.reload();
    };
    
    window.addEventListener('campaign-not-found', handleCampaignNotFound);
    
    const connectToCloud = async () => {
      try {
        provider = new FirebaseProvider(
          db,
          campaignId,
          store.doc,
          role === 'dm'
        );
        
        if (isMounted) {
          setSyncStatus('connecting');
          provider.onStatusChange(setSyncStatus);
          store.connectSync(provider);
        } else {
          provider.disconnect();
        }
      } catch (e) {
        console.error('Firebase Connect Error:', e);
      }
    };

    connectToCloud();

    return () => {
      isMounted = false;
      window.removeEventListener('campaign-not-found', handleCampaignNotFound);
      store.disconnectSync();
    };
  }, [campaignId, store, role]);

  const BLOCK_MS = 6 * 60 * 60 * 1000;
  const currentVisualBlock = Math.floor(visualTimeMs / BLOCK_MS);
  const activePhase = PHASES[currentVisualBlock % 4]?.name || 'Unknown';

  const TAB_ICONS: Record<string, string> = {
    sheet: '📜',
    combat: '⚔️',
    monsters: '🐉',
    events: '🎲',
    calendar: '📆',
    journal: '📖',
    settings: '⚙️',
    map: '🗺️',
    inventory: '🎒',
    mount: '🐎',
    abilities: '✨',
    glossary: '📚',
    bestiary: '🐉',
    botany: '🌿',
    spells: '🔮',
    items: '💍',
    equipment: '🗡️',
    curses: '🩸',
    diseases: '🦠',
    recipes: '🧪',
    feats: '⭐',
    tavern: '🍺'
  };

  if (role === null || (role === 'player' && !activeCharId)) {
    return (
      <ThemeProvider phaseIndex={currentVisualBlock % 4}>
        <div className="w-full min-h-screen flex flex-col items-center p-4">
          <Lobby 
            characters={characterProfiles as any[]}
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
    <ThemeProvider phaseIndex={currentVisualBlock % 4}>
      <GlobalNavMenu 
        isOpen={isNavMenuOpen} 
        onClose={() => setIsNavMenuOpen(false)} 
        role={role} 
        onNavigate={(tab) => {
          if (tab === 'glossary') setIsGlossaryOpen(true);
          else if (tab === 'home') setActiveTab('home' as any);
          else setActiveTab(tab as any);
        }} 
        activeTab={activeTab} 
        locationName={locationName}
        setLocationName={setLocationName}
        visualTimeMs={visualTimeMs}
        currentVisualBlock={currentVisualBlock}
        activePhase={activePhase}
        timeState={timeState}
        store={store}
        calendarConfig={calendarConfig}
        formatClockTime={formatClockTime}
        formatCalendarDate={formatCalendarDate}
        handleAdvanceTime={handleAdvanceTime}
      />
      {activeTab !== 'sheet' && (
        <button 
          onClick={() => setIsNavMenuOpen(true)}
          className="fixed top-4 left-4 z-[1000] p-3 rounded-full bg-stone-900/80 backdrop-blur border border-stone-700 text-stone-300 hover:text-yellow-500 hover:bg-stone-900 hover:border-yellow-600 transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] group"
          aria-label="Open Navigation Menu"
        >
          <MenuIcon size={24} className="group-hover:scale-110 transition-transform" />
        </button>
      )}

      {activeTab === 'sheet' && (
        <div className="w-full min-h-screen bg-stone-950 pb-[80px] relative">
          <button 
            onClick={() => setIsNavMenuOpen(true)}
            className="absolute top-4 left-4 z-[2000] text-white hover:text-yellow-500 bg-stone-900/80 p-3 rounded-full border border-yellow-700/50 shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-sm transition-all hover:scale-110"
            aria-label="Open Navigation Menu"
          >
            <MenuIcon size={24} />
          </button>
          {role === 'dm' && (
            <div className="p-4 bg-stone-900 border-b border-yellow-700/50">
              <div className="flex justify-between items-center max-w-6xl mx-auto">
                <h3 className="text-yellow-500 font-bold m-0 text-sm">⚙ DM Controls</h3>
                <select 
                  className="bg-stone-950 text-stone-300 border border-yellow-700/50 rounded px-2 py-1 text-sm"
                  value={activeCharId || ''}
                  onChange={e => setActiveCharId(e.target.value || null)}
                >
                  <option value="">-- Select Sheet --</option>
                  {(Array.isArray(characterProfiles) ? characterProfiles : []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className="animate-fade-in-up">
            {(() => {
              const activeProfile = (Array.isArray(characterProfiles) ? characterProfiles : []).find(c => c.id === activeCharId) as any || {};
              const mergedCharacter = activeCharacter ? { ...activeCharacter, proficiencies: activeProfile.proficiencies || [] } : activeProfile;
              return (
                <TraditionalSheet 
                  activeCharacter={mergedCharacter}
                  hp={{ current: activeCharacter?.hp?.current ?? 10, max: activeCharacter?.hp?.max ?? 10, temp: activeCharacter?.hp?.temp ?? 0 }}
                  baseStats={baseStats}
                  overrideStats={baseStats as any}
                  computedStats={computedStats}
                  features={unlockedFeatures}
                  equipment={Object.values(equipment).filter(Boolean) as any}
                  role={role || 'player'}
                  phaseIndex={currentVisualBlock % 4}
                  timeMs={visualTimeMs}
                  activeGlobalEffect={activeGlobalEffect}
                  activeEncounters={activeEncounters}
                  eventTables={eventTables}
                  onClearGlobalEffect={() => store.setActiveGlobalEffect(null)}
                  onClearEncounter={(id) => store.removeActiveEncounter(id)}
                  onRollEvent={(tableId) => handleRollEvent(tableId)}
                  onNavigate={(tab) => {
                    if (tab === 'Overview') {
                      setActiveTab(null as any);
                    } else {
                      setActiveTab(tab.toLowerCase() as any);
                    }
                  }}
                  onUpdateStat={(stat, value) => {
                    if (activeCharId) {
                       const map = store.getCharacterMap(activeCharId);
                       const currentStats = map.get('stats') || {};
                       if (value === null) {
                           delete currentStats[stat];
                           map.set('stats', { ...currentStats });
                       } else {
                           map.set('stats', { ...currentStats, [stat]: value });
                       }
                    }
                  }}
              onUpdateHp={(current, max, temp) => {
                if (activeCharId) store.updateCharacterHp(activeCharId, current, max, temp);
              }}
              onToggleProficiency={(skill) => {
                if (activeCharId) {
                  const activeProfile = (Array.isArray(characterProfiles) ? characterProfiles : []).find(c => c.id === activeCharId) as any || {};
                  const profs = activeProfile.proficiencies || [];
                  const newProfs = profs.includes(skill) 
                    ? profs.filter((p: string) => p !== skill)
                    : [...profs, skill];
                  store.updateCharacterProfile(activeCharId, { proficiencies: newProfs });
                }
              }}
              onAddItem={() => {
                setActiveTab('items' as any);
              }}
            />
            );
          })()}
          </div>
        </div>
      )}

      {activeTab === 'journal' && (
        <div className="w-full min-h-[100dvh] bg-[#121212] pt-[110px] pb-[100px] px-2 md:px-6">
          <Journal 
            role={role}
            activeCharId={activeCharId}
            notes={notes as any[]}
            handouts={handouts as any[]}
            revealedHandouts={revealedHandouts as any[]}
            onSaveNote={(note) => store.saveNote(note)}
            onDeleteNote={(id) => store.deleteNote(id)}
            onSaveHandout={(handout) => store.saveHandout(handout)}
            onDeleteHandout={(id) => store.deleteHandout(id)}
            onToggleReveal={(id, isRevealed) => {
              const h = handouts.find(x => x.id === id);
              if (h) store.saveHandout({ ...h, isRevealed });
            }}
            onExit={() => setActiveTab(null as any)}
          />
        </div>
      )}

      {activeTab === 'calendar' && calendarConfig && (() => {
        const currentDate = calculateDate(currentVisualBlock, calendarConfig);
        const totalMonths = calendarConfig.months.length;
        const currentAbsoluteMonth = currentDate.year * totalMonths + currentDate.monthIndex;
        const viewedAbsoluteMonth = currentAbsoluteMonth + calendarViewOffset;
        
        const viewedYear = Math.floor(viewedAbsoluteMonth / totalMonths);
        const viewedMonthIndex = ((viewedAbsoluteMonth % totalMonths) + totalMonths) % totalMonths;
        const currentMonthData = calendarConfig.months[viewedMonthIndex];
        
        const daysPerYear = calendarConfig.months.reduce((acc, m) => acc + m.days, 0);
        let daysPassedForViewedStart = (viewedYear - calendarConfig.startYear) * daysPerYear;
        for (let i = 0; i < viewedMonthIndex; i++) {
          daysPassedForViewedStart += calendarConfig.months[i].days;
        }
        
        const firstDayOfWeekIndex = ((daysPassedForViewedStart % calendarConfig.weekdays.length) + calendarConfig.weekdays.length) % calendarConfig.weekdays.length;
        const activeDayOfMonth = (calendarViewOffset === 0) ? currentDate.dayOfMonth : -1;

        return (
          <div className="w-full min-h-[100dvh] bg-[#121212] pt-[110px] pb-[100px] px-2 md:px-6">
            <CalendarView 
              role={role}
              year={viewedYear}
              monthName={currentMonthData.name}
              daysInMonth={currentMonthData.days}
              currentDayOfMonth={activeDayOfMonth}
              weekdays={calendarConfig.weekdays}
              firstDayOfWeekIndex={firstDayOfWeekIndex}
              totalDaysPassedAtMonthStart={daysPassedForViewedStart}
              events={calendarEvents}
              moons={calendarConfig.moons as any}
              onAddEvent={(offset, evt) => { try { store.addCalendarEvent(offset, evt); } catch(e:any){alert(e.message);} }}
              onRemoveEvent={(offset, idx) => { try { store.removeCalendarEvent(offset, idx); } catch(e:any){alert(e.message);} }}
              onExit={() => setActiveTab(null as any)}
              allMonths={calendarConfig.months.map(m => m.name)}
              viewedMonthIndex={viewedMonthIndex}
              onNextMonth={() => setCalendarViewOffset(prev => prev + 1)}
              onPrevMonth={() => setCalendarViewOffset(prev => prev - 1)}
              onSelectMonthIndex={(idx) => {
                const diff = idx - viewedMonthIndex;
                setCalendarViewOffset(prev => prev + diff);
              }}
            />
            
            {role === 'dm' && (
              <div className="flex flex-col gap-4 items-center mt-8 max-w-xl mx-auto">
                <button 
                  onClick={() => {
                    const el = document.getElementById('calendar-settings-container');
                    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                  }} 
                  className="px-6 py-2 rounded font-bold text-sm bg-stone-900 text-stone-300 border border-yellow-700/50 hover:bg-stone-800 transition-colors"
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
        );
      })()}

      {activeTab === 'spells' && (
        <div className="w-full min-h-[100dvh] bg-[#121212] pt-[110px] pb-[100px] px-2 md:px-6">
          <SpellsCompendium role={role} settings={settings} onExit={() => setActiveTab(null as any)} />
        </div>
      )}

      {activeTab === 'tavern' && (
        <div className="w-full h-[100dvh] overflow-hidden flex flex-col bg-black pb-[70px] sm:pb-[90px] px-0 md:px-4">
          <Tavern store={store} role={role!} activeCharId={activeCharId} characterProfiles={characterProfiles} onExit={() => setActiveTab(null as any)} />
        </div>
      )}

      {activeTab === 'bestiary' && (
        <div className="w-full h-[100dvh] overflow-hidden flex flex-col bg-black pb-[70px] sm:pb-[90px] px-0 md:px-4">
          <BestiaryCompendium role={role} store={store} onExit={() => setActiveTab(null as any)} />
        </div>
      )}

      {activeTab !== 'sheet' && activeTab !== 'journal' && activeTab !== 'calendar' && activeTab !== 'spells' && activeTab !== 'tavern' && activeTab !== 'bestiary' && (
      <div className="w-full min-h-screen flex flex-col items-center pb-[100px] pt-[60px] px-4">
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

          {/* Old Title and TimeDial removed in favor of sticky header */}

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
                    <button onClick={() => store.setActiveGlobalEffect(null)} className="btn-ghost text-red-400 border-red-500/30 text-xs py-1 px-2 hover:bg-red-500/20 min-h-[44px]">
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {(activeEncounters || []).map(encounter => (
            <div key={encounter.id} className="w-full max-w-2xl mb-4 relative animate-fade-in-up">
              <div className="p-4 rounded-lg border shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(50,20,20,0.8) 0%, rgba(30,10,10,0.9) 100%)', borderColor: 'rgba(225,29,72,0.3)', boxShadow: '0 0 15px rgba(225,29,72,0.1)' }}>
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] font-heading uppercase tracking-widest text-red-300">Active Encounter</div>
                    <div className="text-lg font-heading font-bold text-white">{encounter.name}</div>
                    {encounter.description && <div className="text-sm text-red-100/70 mt-1 whitespace-pre-wrap">{encounter.description}</div>}
                  </div>
                  {role === 'dm' && (
                    <button onClick={() => store.removeActiveEncounter(encounter.id)} className="btn-ghost text-red-400 border-red-500/30 text-xs py-1 px-2 hover:bg-red-500/20 min-h-[44px]">
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="w-full max-w-2xl mb-6"></div>

          {/* Old Phase and World Time removed in favor of sticky header */}

          <div className="glass-panel flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{role === 'dm' ? '👑' : '🛡️'}</span>
              <div>
                <div className="sub-label">Role</div>
                <div style={{ fontFamily: 'var(--font-decorative)', fontSize: '1rem', fontWeight: 700, color: 'var(--secondary)', textShadow: '0 0 10px var(--secondary-glow)', letterSpacing: '0.04em' }}>
                  {role === 'dm' ? 'Dungeon Master' : (characterProfiles || []).find(c => c.id === activeCharId)?.name || 'Adventurer'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {role === 'dm' && (
                <>
                  <button onClick={() => setShowSettings(true)} className="btn-ghost min-h-[44px]" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                    ⚙️ Settings
                  </button>
                  <button onClick={() => setShowItemManager(true)} className="btn-fantasy min-h-[44px]" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                    🎁 Loot
                  </button>
                  <button 
                    onClick={() => store.setBloodMoon(!bloodMoon)} 
                    className={`blood-moon-toggle ${bloodMoon ? 'active' : ''} min-h-[44px] min-w-[44px]`}
                    title={bloodMoon ? 'Deactivate Blood Moon' : 'Activate Blood Moon'}
                  >
                    <div className="moon-icon" />
                  </button>
                </>
              )}
              <button onClick={() => { setRole(null); setActiveCharId(null); }} className="btn-ghost min-h-[44px]">
                Exit
              </button>
            </div>
          </div>

          <div className="glass-panel flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div>
                <div className="sub-label flex items-center gap-2 mb-1">
                  Multiplayer Sync
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-mono bg-black/60 px-3 py-1.5 rounded-lg text-lg font-bold text-accent tracking-widest border-2 border-accent/40 shadow-[0_0_10px_var(--accent-glow)] select-all cursor-pointer hover:bg-black/80 transition-colors" title="Copy to clipboard" onClick={() => navigator.clipboard.writeText(campaignId)}>
                    CODE: {campaignId}
                  </div>
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${syncStatus === 'connected' ? 'bg-success shadow-[0_0_10px_var(--success)]' : syncStatus === 'connecting' ? 'bg-secondary animate-pulse' : 'bg-danger'}`}></span>
                    {syncStatus === 'connected' ? 'Connected' : syncStatus === 'connecting' ? 'Connecting...' : 'Offline'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 sm:grid-cols-3 gap-3">
            {(role === 'dm' 
              ? ['sheet', 'combat', 'events', 'calendar', 'tavern', 'journal', 'map', 'inventory', 'mount', 'abilities', 'glossary', 'settings']
              : ['sheet', 'combat', 'calendar', 'tavern', 'journal', 'map', 'inventory', 'mount', 'abilities', 'glossary', 'settings']
            ).map(tab => (
              <button 
                key={tab}
                onClick={() => {
                  if (tab === 'glossary') {
                    setIsGlossaryOpen(true);
                  } else {
                    setActiveTab(tab as any);
                    if (tab === 'calendar') setCalendarViewOffset(0);
                  }
                }}
                className={`master-grid-btn min-h-[44px] ${activeTab === tab && tab !== 'glossary' ? 'active' : ''}`}
              >
                <div className="icon">{TAB_ICONS[tab] || '⭐'}</div>
                <div className="text-[10px] uppercase tracking-widest font-bold mt-1">{tab}</div>
              </button>
            ))}
          </div>

          {activeTab === 'map' && (
            <div className="w-full animate-fade-in-up">
              <MapTab store={store} role={role as 'dm' | 'player'} campaignId={campaignId} />
            </div>
          )}

        {activeTab === 'combat' && (
          <CombatTracker 
            role={role || 'player'}
            combatState={combatState} 
            monsterTemplates={monsterTemplates}
            onAddCombatant={(c) => store.addCombatant(c)}
            onImport={(templates) => {
              const dmMap = store.getDmMap();
              dmMap.set('monsterTemplates', templates);
            }}
            onStart={() => store.startCombat()} 
            onEnd={() => store.endCombat()} 
            onNextTurn={() => store.nextTurn()} 
            onRemove={(id) => store.removeCombatant(id)} 
            onUpdateInitiative={(id, val) => store.updateCombatantInitiative(id, val)} 
            onUpdateAc={(id, val) => store.updateCombatantAc(id, val)}
            onUpdateHp={(id, curr, max) => store.updateCombatantHp(id, { current: curr, max })}
            onUpdateConditions={(id, conds) => store.updateCombatantConditions(id, conds)}
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

          {activeTab === 'settings' && (
            <div className="glass-panel flex flex-col gap-6 animate-fade-in-up">
              <div className="section-heading">
                <h2 style={{ margin: 0 }}>Visual Settings</h2>
              </div>
              <div>
                <div className="sub-label">Theme</div>
                <div className="text-xs text-muted-foreground mb-3">Grimdark global theme is now applied to all screens. Local themes are disabled.</div>
              </div>
            </div>
          )}

          {/* ── Global Item Manager Modal ── */}
          {showItemManager && (
            <ItemManager 
              characters={characterProfiles as any[]}
              currentPlayerId={activeCharId || undefined}
              catalogItems={store.getItemTemplates() as any[]}
              schema={Array.isArray(schema) ? schema as any[] : []}
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
              databaseControls={<CsvImporter />}
              settings={settings}
              onUpdateSettings={(updates) => store.updateSettings(updates)}
              onClose={() => setShowSettings(false)}
            />
          )}

        {/* --- INVENTORY (BAG OF HOLDING) --- */}
        {activeTab === 'inventory' && (
          <div className="animate-fade-in-up flex flex-col gap-6">
            
            {/* PAPER DOLL SECTION */}
            <div className="glass-panel p-6 relative flex justify-center items-center overflow-hidden" style={{ minHeight: '600px', borderColor: 'var(--border-accent)' }}>
              {/* Silhouette Background */}
              <div 
                className="absolute inset-0 opacity-10 bg-center bg-no-repeat bg-contain pointer-events-none" 
                style={{ backgroundImage: `url('/paper_doll_silhouette_1781326152255.png')`, mixBlendMode: 'screen' }}
              />
              
              <h2 className="absolute top-6 left-6 font-heading text-2xl text-accent tracking-widest" style={{ textShadow: '0 0 10px var(--accent-glow)' }}>Equipment</h2>
              
              <div className="relative w-full max-w-[400px] h-[550px]">
                <PaperDollSlot item={equipment.head} label="Head" top="5%" left="50%" tx="-50%" onUnequip={() => store.unequipItem(activeCharId!, 'head')} />
                <PaperDollSlot item={equipment.mask} label="Mask" top="18%" left="50%" tx="-50%" onUnequip={() => store.unequipItem(activeCharId!, 'mask')} />
                <PaperDollSlot item={equipment.amulet} label="Amulet" top="28%" left="50%" tx="-50%" onUnequip={() => store.unequipItem(activeCharId!, 'amulet')} />
                <PaperDollSlot item={equipment.torso} label="Torso" top="42%" left="50%" tx="-50%" onUnequip={() => store.unequipItem(activeCharId!, 'torso')} />
                <PaperDollSlot item={equipment.belt} label="Belt" top="60%" left="50%" tx="-50%" onUnequip={() => store.unequipItem(activeCharId!, 'belt')} />
                <PaperDollSlot item={equipment.feet} label="Feet" top="85%" left="50%" tx="-50%" onUnequip={() => store.unequipItem(activeCharId!, 'feet')} />
                
                <PaperDollSlot item={equipment.mainHand} label="Main Hand" top="42%" left="5%" tx="0" onUnequip={() => store.unequipItem(activeCharId!, 'mainHand')} />
                <PaperDollSlot item={equipment.hands} label="Hands" top="58%" left="10%" tx="0" onUnequip={() => store.unequipItem(activeCharId!, 'hands')} />
                <PaperDollSlot item={equipment.ring1} label="Ring 1" top="75%" left="15%" tx="0" onUnequip={() => store.unequipItem(activeCharId!, 'ring1')} />
                
                <PaperDollSlot item={equipment.offHand} label="Off-Hand" top="42%" right="5%" tx="0" onUnequip={() => store.unequipItem(activeCharId!, 'offHand')} />
                <PaperDollSlot item={equipment.ring2} label="Ring 2" top="75%" right="15%" tx="0" onUnequip={() => store.unequipItem(activeCharId!, 'ring2')} />
              </div>
            </div>

            {/* MAIN STORAGE SECTION */}
            <div className="glass-panel p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-4">
                <div>
                  <h2 className="font-heading text-lg text-secondary">Bag of Holding</h2>
                  <span className="text-xs text-muted-foreground">{mainStorage.length} / 15 Capacity</span>
                </div>
                <button onClick={() => setShowExtraPlanar(true)} className="btn-fantasy text-sm py-1.5 px-4 shadow-[0_0_15px_var(--secondary-glow)]">
                  🌌 ExtraPlanar Storage
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {mainStorage.map(item => (
                  <div key={item.id} className="bg-black/30 border border-[var(--border)] p-3 rounded-lg flex justify-between items-center hover:border-accent transition-colors">
                    <div>
                      <div className="font-bold text-sm text-white/90">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{item.type}</div>
                    </div>
                    <button 
                      onClick={() => setEquipMenuTarget(item)} 
                      className="text-xs btn-ghost py-1 px-3 border border-[var(--border)]"
                    >
                      Equip
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Click-to-Equip Context Menu Modal */}
        {equipMenuTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEquipMenuTarget(null)}>
            <div className="glass-panel w-[300px] flex flex-col p-4 animate-fade-in-up" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-accent mb-4 border-b border-[var(--border)] pb-2 text-center">{equipMenuTarget.name}</h3>
              <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                {['head', 'mask', 'torso', 'hands', 'belt', 'feet', 'ring1', 'ring2', 'amulet', 'mainHand', 'offHand'].map(slot => (
                  <button 
                    key={slot} 
                    className="btn-ghost text-sm text-left px-3 py-2 border border-[var(--border)] hover:border-accent hover:bg-accent/10 transition-colors"
                    onClick={() => {
                      store.equipItem(activeCharId!, equipMenuTarget.id, slot);
                      setEquipMenuTarget(null);
                    }}
                  >
                    Equip to <span className="font-bold capitalize">{slot.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EXTRAPLANAR OVERLAY */}
        {showExtraPlanar && (
           <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col animate-fade-in-up p-8">
             <div className="flex justify-between items-center mb-6 border-b border-secondary/30 pb-4">
               <div>
                 <h1 className="font-heading text-3xl text-secondary" style={{ textShadow: '0 0 20px var(--secondary-glow)' }}>🌌 ExtraPlanar Storage</h1>
                 <span className="text-sm text-white/50">{extraPlanarStorage.length} / 150 Capacity</span>
               </div>
               <button onClick={() => setShowExtraPlanar(false)} className="text-3xl text-white/50 hover:text-white transition-colors">✕</button>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                 {extraPlanarStorage.map(item => (
                   <div 
                     key={item.id} 
                     className="glass-panel p-3 cursor-pointer hover:border-secondary transition-colors flex flex-col justify-between h-32 bg-black/40 relative group"
                     onClick={() => { setEquipMenuTarget(item); setShowExtraPlanar(false); }}
                   >
                     <div className="font-bold text-sm text-white/90 line-clamp-2">{item.name}</div>
                     <div className="text-xs text-secondary mt-1">{item.type}</div>
                     {item.damage && <div className="text-xs text-accent mt-auto pt-2">{item.damage}</div>}
                     <div className="absolute inset-0 bg-secondary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                        <span className="text-xs font-bold text-white bg-black/80 px-2 py-1 rounded">Equip</span>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
           </div>
        )}
        {activeTab === 'mount' && (
          <div className="glass-panel animate-fade-in-up text-center p-8">
            <h2 className="text-2xl font-bold mb-4 text-accent">🐎 Mount & Vehicle</h2>
            <p className="text-muted-foreground">Manage your steeds, carts, and ships here.</p>
          </div>
        )}
        {activeTab === 'abilities' && (
          <div className="glass-panel animate-fade-in-up text-center p-8">
            <h2 className="text-2xl font-bold mb-4 text-accent">✨ Abilities</h2>
            <p className="text-muted-foreground">Track your class features, feats, and unique skills.</p>
          </div>
        )}
        {activeTab === 'botany' && (
          <div className="glass-panel animate-fade-in-up text-center p-8">
            <h2 className="text-2xl font-bold mb-4 text-accent">🌿 Botany</h2>
            <p className="text-muted-foreground">Discover and document flora, herbs, and natural ingredients.</p>
          </div>
        )}

        {activeTab === 'items' && (
          <MagicItemsCompendium role={role} store={store} activeCharId={activeCharId} characterProfiles={characterProfiles} />
        )}
        {activeTab === 'equipment' && (
          <EquipmentCompendium role={role} store={store} activeCharId={activeCharId} characterProfiles={characterProfiles} />
        )}
        {activeTab === 'feats' && (
          <FeatsCompendium />
        )}
        {activeTab === 'curses' && (
          <div className="glass-panel animate-fade-in-up text-center p-8">
            <h2 className="text-2xl font-bold mb-4 text-danger">🩸 Curses & Afflictions</h2>
            <p className="text-muted-foreground">Track ongoing diseases, curses, and their stage progressions here.</p>
          </div>
        )}
        {activeTab === 'diseases' && (
          <div className="glass-panel animate-fade-in-up text-center p-8">
            <h2 className="text-2xl font-bold mb-4 text-warning">🦠 Diseases</h2>
            <p className="text-muted-foreground">Medical codex and disease rules.</p>
          </div>
        )}
        {activeTab === 'recipes' && (
          <div className="glass-panel animate-fade-in-up text-center p-8">
            <h2 className="text-2xl font-bold mb-4 text-success">🧪 Recipes</h2>
            <p className="text-muted-foreground">Crafting formulas and alchemy recipes.</p>
          </div>
        )}

        </div>
      </div>
      )}

      {/* Glossary Full-Screen Overlay */}
      {isGlossaryOpen && (
          <div className="glossary-overlay">
            <div className="glossary-header">
              <button className="glossary-close-btn" onClick={() => setIsGlossaryOpen(false)}>
                <span>◀</span> Return to Menu
              </button>
            </div>
            
            <h2 style={{ fontFamily: 'var(--font-decorative)', fontSize: '2rem', color: 'var(--secondary)', textShadow: '0 0 20px var(--secondary-glow)', marginBottom: '2rem' }}>
              Glossary & Lore
            </h2>

            <div className="glossary-grid">
              {(role === 'dm'
                ? ['bestiary', 'botany', 'spells', 'items', 'equipment', 'curses', 'diseases', 'recipes', 'feats']
                : ['botany', 'spells', 'items', 'equipment', 'curses', 'diseases', 'recipes', 'feats']
              ).map(tab => (
                <button 
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab as any);
                    setIsGlossaryOpen(false);
                  }}
                  className={`master-grid-btn ${activeTab === tab ? 'active' : ''}`}
                  style={{ padding: '1.5rem' }}
                >
                  <div className="icon text-3xl">{TAB_ICONS[tab] || '📖'}</div>
                  <div className="text-xs uppercase tracking-widest font-bold mt-2">{tab}</div>
                </button>
              ))}
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

      <div className="fixed bottom-0 left-0 right-0 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.95)]" style={{ backgroundImage: 'url(/grimdark-iron-border.png)', backgroundSize: 'cover', borderTop: '4px solid #450a0a' }}>
        <div className="flex justify-around items-center w-full max-w-4xl mx-auto pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
        <button onClick={() => setActiveTab(null as any)} className={`flex flex-col items-center gap-1 p-1 sm:p-2 min-w-0 flex-1 rounded-lg transition-all ${!activeTab ? 'text-yellow-500 bg-stone-900/30' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900/50'}`}>
          <User size={20} />
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest truncate w-full text-center">Overview</span>
        </button>
        <button onClick={() => setActiveTab('sheet')} className={`flex flex-col items-center gap-1 p-1 sm:p-2 min-w-0 flex-1 rounded-lg transition-all ${activeTab === 'sheet' ? 'text-yellow-500 bg-stone-900/30' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900/50'}`}>
          <Scroll size={24} />
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest truncate w-full text-center">Sheet</span>
        </button>
        <button onClick={() => setActiveTab('spells')} className={`flex flex-col items-center gap-1 p-1 sm:p-2 min-w-0 flex-1 rounded-lg transition-all ${activeTab === 'spells' ? 'text-yellow-500 bg-stone-900/30' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900/50'}`}>
          <Wand2 size={20} />
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest truncate w-full text-center">Spells</span>
        </button>
        <button onClick={() => setActiveTab('journal')} className={`flex flex-col items-center gap-1 p-1 sm:p-2 min-w-0 flex-1 rounded-lg transition-all ${activeTab === 'journal' ? 'text-yellow-500 bg-stone-900/30' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900/50'}`}>
          <BookOpen size={20} />
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest truncate w-full text-center">Journal</span>
        </button>
        <button onClick={() => { setActiveTab('calendar'); setCalendarViewOffset(0); }} className={`flex flex-col items-center gap-1 p-1 sm:p-2 min-w-0 flex-1 rounded-lg transition-all ${activeTab === 'calendar' ? 'text-yellow-500 bg-stone-900/30' : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900/50'}`}>
          <CalendarDays size={20} />
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest truncate w-full text-center">Calendar</span>
        </button>
        <button onClick={() => setActiveTab('tavern')} className={`relative flex flex-col items-center gap-1 p-1 sm:p-2 min-w-0 flex-1 rounded-lg transition-all ${activeTab === 'tavern' ? 'text-amber-500 bg-[#3e2723]/60' : 'text-stone-500 hover:text-[#d7ccc8] hover:bg-[#3e2723]/30'}`}>
          <div className="relative">
            <Beer size={20} />
            {unreadTavern && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full border border-[#2d1b15] shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse" />
            )}
          </div>
          <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest truncate w-full text-center">Tavern</span>
        </button>
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

  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [selectedCharData, setSelectedCharData] = useState<any>(null);

  const initCampaign = (id: string, r: 'dm' | 'player', char?: any) => {
    if (store) store.destroy();
    const s = new CampaignStore(`frogs-world-db-${id}`);
    s.setRole(r);
    setStore(s);
    setRole(r);
    setCampaignId(id);
    setSelectedCharId(char?.id || null);
    setSelectedCharData(char || null);
    setAppState('game');
  };

  if (appState === 'landing') {
    return (
      <Vault 
        onHost={(id) => initCampaign(id, 'dm')} 
        onJoin={(id, char) => initCampaign(id, 'player', char)} 
      />
    );
  }

  if (!store || !campaignId) return null;

  return <GameApp key={campaignId} store={store} initialRole={role} campaignId={campaignId} initialCharacterId={selectedCharId || undefined} initialCharacterData={selectedCharData} />;
}
