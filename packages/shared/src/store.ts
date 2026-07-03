import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import type { StatFieldDef, CharacterProfile, Item, StatusInstance, CalendarConfig, ItemTemplate, Note, Handout, GlobalEffect, MapPin, CombatState, TimeState, BestiaryItem } from './schema';
import { NoteSchema, HandoutSchema } from './schema';
import { computeEffects, computeRevertEffects, type EffectMutation } from './effects/engine';

import type { SyncProvider } from './sync';

export class CampaignStore {
  public readonly doc: Y.Doc;
  public readonly provider: IndexeddbPersistence;
  public syncProvider?: SyncProvider;
  public role: 'dm' | 'player' = 'player';

  constructor(campaignId: string) {
    this.doc = new Y.Doc();
    this.provider = new IndexeddbPersistence(campaignId, this.doc);
  }

  public connectSync(provider: SyncProvider) {
    if (this.syncProvider) this.syncProvider.disconnect();
    this.syncProvider = provider;
    this.syncProvider.connect();
  }

  public disconnectSync() {
    if (this.syncProvider) {
      this.syncProvider.disconnect();
      this.syncProvider = undefined;
    }
  }

  public setRole(role: 'dm' | 'player') {
    this.role = role;
  }

  public getSharedMap(): Y.Map<any> {
    return this.doc.getMap('shared');
  }

  public getDmMap(): Y.Map<any> {
    return this.doc.getMap('dm');
  }

  public importVaultCharacter(charData: any): void {
    if (!charData || !charData.id) return;
    const shared = this.getSharedMap();
    const characters: CharacterProfile[] = shared.get('characters') || [];
    
    // Check if character profile exists
    if (!characters.find(c => c.id === charData.id)) {
      shared.set('characters', [...characters, { 
        id: charData.id, 
        name: charData.name || 'Unnamed', 
        charClass: charData.charClass || '',
        proficiencies: charData.proficiencies || []
      }]);
    } else {
      // Update existing profile name/class
      const newChars = characters.map(c => 
        c.id === charData.id ? { ...c, name: charData.name || c.name, charClass: charData.charClass || c.charClass, proficiencies: charData.proficiencies || c.proficiencies || [] } : c
      );
      shared.set('characters', newChars);
    }
    
    const charMap = this.getCharacterMap(charData.id);
    
    // Safely write stats and HP
    if (charData.stats) {
      charMap.set('stats', charData.stats);
    }
    if (charData.hp) {
      charMap.set('hp', charData.hp);
    }
    
    // Handle level
    if (charData.level) {
      charMap.set('level', charData.level);
    }
  }

  public getCharacterMap(characterId: string): Y.Map<any> {
    return this.doc.getMap(`character:${characterId}`);
  }

  // --- Location ---
  public getLocationName(): string {
    return this.getSharedMap().get('locationName') || 'Unknown Location';
  }

  public setLocationName(name: string) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    this.getSharedMap().set('locationName', name);
  }

  public clearLog() {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    this.getSharedMap().set('rolls', []);
  }

  // ================= Tavern Chat =================

  public getChatMessages(): any[] {
    const shared = this.getSharedMap();
    return shared.get('chatMessages') || [];
  }

  public sendChatMessage(message: Omit<any, 'id' | 'timestamp'>) {
    const shared = this.getSharedMap();
    const messages = shared.get('chatMessages') || [];
    const newMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now()
    };
    
    // Add new message and slice to keep only the last 150 messages
    const updatedMessages = [...messages, newMessage].slice(-150);
    shared.set('chatMessages', updatedMessages);
  }

  // --- Settings ---
  public getSettings(): { strictSpells: boolean } {
    const defaultSettings = { strictSpells: true };
    return this.getSharedMap().get('settings') || defaultSettings;
  }

  public updateSettings(updates: Partial<{ strictSpells: boolean }>) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const current = this.getSettings();
    this.getSharedMap().set('settings', { ...current, ...updates });
  }

  // --- Interactive Map ---
  public getMapPins(): Y.Map<MapPin> {
    return this.doc.getMap('interactive_map_pins');
  }

  public addMapPin(pin: MapPin) {
    // Everyone can drop pins as per spec
    const pins = this.getMapPins();
    pins.set(pin.id, pin);
  }

  public updateMapPin(id: string, updates: Partial<MapPin>) {
    const pins = this.getMapPins();
    const existing = pins.get(id);
    if (existing) {
      pins.set(id, { ...existing, ...updates });
    }
  }

  public removeMapPin(id: string) {
    const pins = this.getMapPins();
    pins.delete(id);
  }
  // -----------------------


  public getCharacterProfiles(): CharacterProfile[] {
    const shared = this.getSharedMap();
    return shared.get('characters') || [];
  }

  public createCharacter(name: string, charClass: string, ac: number, init: number, maxHp: number): string {
    const shared = this.getSharedMap();
    const characters: CharacterProfile[] = shared.get('characters') || [];
    
    const id = `char-${Math.random().toString(36).substring(2, 9)}`;
    shared.set('characters', [...characters, { id, name, charClass }]);

    const charMap = this.getCharacterMap(id);
    charMap.set('stats', { ac, init });
    charMap.set('hp', { current: maxHp, max: maxHp });
    charMap.set('statuses', []);
    charMap.set('mainStorage', []);
    charMap.set('extraPlanarStorage', []);
    charMap.set('equipment', {
      head: null, mask: null, torso: null, hands: null,
      belt: null, feet: null, ring1: null, ring2: null,
      amulet: null, mainHand: null, offHand: null
    });
    charMap.set('conditions', []);
    return id;
  }

  public deleteCharacter(id: string) {
    const shared = this.getSharedMap();
    const characters: CharacterProfile[] = shared.get('characters') || [];
    shared.set('characters', characters.filter(c => c.id !== id));
    // Yjs doesn't easily delete top-level maps, but we can clear it
    const charMap = this.getCharacterMap(id);
    charMap.clear();
  }

  public updateCharacterProfile(id: string, updates: Partial<CharacterProfile>) {
    const shared = this.getSharedMap();
    const characters: CharacterProfile[] = shared.get('characters') || [];
    const idx = characters.findIndex(c => c.id === id);
    if (idx !== -1) {
      characters[idx] = { ...characters[idx], ...updates };
      shared.set('characters', [...characters]);
    }
  }

  public toggleLock() {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    shared.set('locked', !shared.get('locked'));
  }

  public addStatFieldDef(def: StatFieldDef) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const schema = shared.get('schema') || [];
    shared.set('schema', [...schema, def]);
  }

  public removeStatFieldDef(id: string) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const schema: StatFieldDef[] = shared.get('schema') || [];
    shared.set('schema', schema.filter(s => s.id !== id));
  }

  public updateCharacterStat(charId: string, statId: string, val: number) {
    const shared = this.getSharedMap();
    if (this.role === 'player' && shared.get('locked')) {
      throw new Error('Sheet is locked by DM');
    }
    const charMap = this.getCharacterMap(charId);
    const stats = charMap.get('stats') || {};
    charMap.set('stats', { ...stats, [statId]: val });

    // Sync with combat tracker if active
    if (statId === 'init' || statId === 'ac') {
      const combatState = shared.get('combatState');
      if (combatState && combatState.active) {
        const cIdx = combatState.combatants.findIndex((c: any) => c.id === charId);
        if (cIdx !== -1) {
          if (statId === 'init') {
            combatState.combatants[cIdx].initiative = val;
            combatState.combatants.sort((a: any, b: any) => b.initiative - a.initiative);
          } else if (statId === 'ac') {
            combatState.combatants[cIdx].ac = val;
          }
          shared.set('combatState', { ...combatState });
        }
      }
    }
  }

  public updateCharacterHp(charId: string, current: number, max: number, temp: number = 0) {
    const shared = this.getSharedMap();
    if (this.role === 'player' && shared.get('locked')) {
      throw new Error('Sheet is locked by DM');
    }
    const charMap = this.getCharacterMap(charId);
    charMap.set('hp', { current, max, temp });

    // Sync with combat tracker if active
    const combatState = shared.get('combatState');
    if (combatState && combatState.active) {
      const cIdx = combatState.combatants.findIndex((c: any) => c.id === charId);
      if (cIdx !== -1) {
        combatState.combatants[cIdx].hp = { current, max, temp };
        shared.set('combatState', { ...combatState });
      }
    }
  }

  // --- Currency Methods ---
  
  public addCurrencyDef(def: { id: string; name: string; abbreviation: string; order: number }) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const currencies = shared.get('currencies') || [];
    shared.set('currencies', [...currencies, def]);
  }

  public removeCurrencyDef(id: string) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const currencies: any[] = shared.get('currencies') || [];
    shared.set('currencies', currencies.filter(c => c.id !== id));
  }

  public getCurrencyDefs(): any[] {
    const shared = this.getSharedMap();
    return shared.get('currencies') || [];
  }

  public updateCurrency(activeCharId: string, charId: string, currencyId: string, amount: number) {
    if (this.role === 'player' && activeCharId !== charId) {
      throw new Error('Unauthorized: Cannot edit another players currency');
    }
    const shared = this.getSharedMap();
    if (this.role === 'player' && shared.get('locked')) {
      throw new Error('Sheet is locked by DM');
    }
    const charMap = this.getCharacterMap(charId);
    const currencies = charMap.get('currencies') || {};
    charMap.set('currencies', { ...currencies, [currencyId]: amount });
  }

  public transferCurrency(activeCharId: string, fromCharId: string, toCharId: string, currencyId: string, amount: number) {
    if (amount <= 0) throw new Error("Transfer amount must be positive");
    if (fromCharId === toCharId) throw new Error("Cannot transfer to yourself");
    if (this.role === 'player' && activeCharId !== fromCharId) {
      throw new Error("Unauthorized: Cannot transfer funds you do not own");
    }

    const shared = this.getSharedMap();
    if (this.role === 'player' && shared.get('locked')) {
      throw new Error('Sheet is locked by DM');
    }
    
    const fromCharMap = this.getCharacterMap(fromCharId);
    const fromCurrencies = fromCharMap.get('currencies') || {};
    const currentFromAmount = fromCurrencies[currencyId] || 0;
    
    if (currentFromAmount < amount) {
      throw new Error("Insufficient funds");
    }

    const toCharMap = this.getCharacterMap(toCharId);
    const toCurrencies = toCharMap.get('currencies') || {};
    const currentToAmount = toCurrencies[currencyId] || 0;

    this.doc.transact(() => {
      fromCharMap.set('currencies', { ...fromCurrencies, [currencyId]: currentFromAmount - amount });
      toCharMap.set('currencies', { ...toCurrencies, [currencyId]: currentToAmount + amount });
    });
  }

  public commitMutations(mutations: EffectMutation[]) {
    this.doc.transact(() => {
      for (const mut of mutations) {
        const shared = this.getSharedMap();
        let combatState = shared.get('combatState');
        let isCombatant = false;
        let combatantIndex = -1;

        if (combatState && combatState.active && mut.type !== 'notify' && mut.type !== 'set_theme') {
          combatantIndex = combatState.combatants.findIndex((c: any) => c.id === (mut as any).targetId);
          if (combatantIndex !== -1) {
            isCombatant = true;
          }
        }

        if (mut.type === 'modify_stat') {
          if (!isCombatant || (isCombatant && combatState.combatants[combatantIndex].source === 'character')) {
            const targetCharId = isCombatant ? combatState.combatants[combatantIndex].refId : mut.targetId;
            if (targetCharId === 'scene') continue; // scene cannot have stats
            const charMap = this.getCharacterMap(targetCharId);
            const stats = charMap.get('stats') || {};
            const current = stats[mut.statId] || 0;
            const newVal = mut.isDelta ? current + mut.amount : mut.amount;
            charMap.set('stats', { ...stats, [mut.statId]: newVal });
            
            if (isCombatant) {
               const c = combatState.combatants[combatantIndex];
               if (mut.statId === 'ac') c.ac = newVal;
               if (mut.statId === 'init') c.initiative = newVal;
               shared.set('combatState', { ...combatState });
            }
          } else if (isCombatant && combatState.combatants[combatantIndex].source === 'monster') {
            const c = combatState.combatants[combatantIndex];
            const current = mut.statId === 'ac' ? c.ac : (mut.statId === 'init' ? c.initiative : 0);
            const newVal = mut.isDelta ? current + mut.amount : mut.amount;
            if (mut.statId === 'ac') c.ac = newVal;
            if (mut.statId === 'init') c.initiative = newVal;
            shared.set('combatState', { ...combatState });
          }
        } else if (mut.type === 'modify_hp') {
          if (isCombatant) {
            const hp = { ...combatState.combatants[combatantIndex].hp };
            if (mut.op === 'damage') hp.current = Math.max(0, hp.current - mut.amount);
            else if (mut.op === 'heal') hp.current = Math.min(hp.max, hp.current + mut.amount);
            else if (mut.op === 'set') hp.current = mut.amount;
            combatState.combatants[combatantIndex] = { ...combatState.combatants[combatantIndex], hp };
            shared.set('combatState', { ...combatState });
            
            const c = combatState.combatants[combatantIndex];
            if (c.source === 'character') {
               if (c.refId === 'scene') continue;
               const charMap = this.getCharacterMap(c.refId);
               charMap.set('hp', { ...hp });
            }
          } else {
            if (mut.targetId === 'scene') continue; // scene has no hp
            const charMap = this.getCharacterMap(mut.targetId);
            const hp = charMap.get('hp') || { current: 10, max: 10 };
            if (mut.op === 'damage') hp.current = Math.max(0, hp.current - mut.amount);
            else if (mut.op === 'heal') hp.current = Math.min(hp.max, hp.current + mut.amount);
            else if (mut.op === 'set') hp.current = mut.amount;
            charMap.set('hp', { ...hp });
          }
        } else if (mut.type === 'apply_status') {
          if (isCombatant) {
            const c = combatState.combatants[combatantIndex];
            const statuses = [...(c.statuses || []), mut.status];
            combatState.combatants[combatantIndex] = { ...c, statuses };
            shared.set('combatState', { ...combatState });
            
            if (c.source === 'character') {
               if (c.refId === 'scene') continue;
               const charMap = this.getCharacterMap(c.refId);
               charMap.set('statuses', statuses);
            }
          } else {
            if (mut.targetId === 'scene') {
               // Global effect status
               this.setActiveGlobalEffect({
                 id: mut.status.id || Date.now().toString(),
                 name: mut.status.nameSnapshot || 'Global Effect',
                 description: mut.status.nameSnapshot
               });
               continue;
            }
            const charMap = this.getCharacterMap(mut.targetId);
            const statuses = charMap.get('statuses') || [];
            charMap.set('statuses', [...statuses, mut.status]);
          }
        } else if (mut.type === 'notify') {
          const feed = shared.get('feed') || [];
          shared.set('feed', [...feed, { id: Date.now().toString(), message: mut.message }].slice(-20));
        } else if (mut.type === 'set_theme') {
          shared.set('activeThemeOverride', mut.themeIndex);
        }
      }
    }, 'effect-engine');
  }

  public equipItem(charId: string, itemId: string, targetSlot: string) {
    const shared = this.getSharedMap();
    if (this.role === 'player' && shared.get('locked')) throw new Error('Sheet is locked by DM');
    
    const charMap = this.getCharacterMap(charId);
    let mainStorage: Item[] = charMap.get('mainStorage') || [];
    let extraPlanarStorage: Item[] = charMap.get('extraPlanarStorage') || [];
    let equipment = charMap.get('equipment') || {};
    
    let targetItem = mainStorage.find(i => i.id === itemId);
    let sourceArray = 'main';
    if (!targetItem) {
       targetItem = extraPlanarStorage.find(i => i.id === itemId);
       sourceArray = 'extra';
    }
    
    if (!targetItem) return;
    
    if (sourceArray === 'main') {
       mainStorage = mainStorage.filter(i => i.id !== itemId);
    } else {
       extraPlanarStorage = extraPlanarStorage.filter(i => i.id !== itemId);
    }
    
    const occupant = equipment[targetSlot];
    if (occupant) {
       if (occupant.revertData) {
         const revMutations = computeRevertEffects(occupant.effectsOnEquip || [], { sourceId: charId, store: this }, occupant.revertData);
         this.commitMutations(revMutations);
       }
       const unequippedItem = { ...occupant, revertData: undefined, equipped: false };
       if (mainStorage.length < 15) {
         mainStorage.push(unequippedItem);
       } else {
         extraPlanarStorage.push(unequippedItem);
       }
    }
    
    targetItem.equipped = true;
    const { mutations, revertData } = computeEffects(targetItem.effectsOnEquip || [], { sourceId: charId, store: this });
    targetItem.revertData = revertData;
    this.commitMutations(mutations);
    
    equipment = { ...equipment, [targetSlot]: targetItem };
    
    charMap.set('mainStorage', mainStorage);
    charMap.set('extraPlanarStorage', extraPlanarStorage);
    charMap.set('equipment', equipment);
  }

  public unequipItem(charId: string, targetSlot: string) {
    const shared = this.getSharedMap();
    if (this.role === 'player' && shared.get('locked')) throw new Error('Sheet is locked by DM');
    
    const charMap = this.getCharacterMap(charId);
    const mainStorage: Item[] = charMap.get('mainStorage') || [];
    const extraPlanarStorage: Item[] = charMap.get('extraPlanarStorage') || [];
    let equipment = charMap.get('equipment') || {};
    
    const occupant = equipment[targetSlot];
    if (!occupant) return;
    
    if (occupant.revertData) {
       const revMutations = computeRevertEffects(occupant.effectsOnEquip || [], { sourceId: charId, store: this }, occupant.revertData);
       this.commitMutations(revMutations);
    }
    const unequippedItem = { ...occupant, revertData: undefined, equipped: false };
    
    if (mainStorage.length < 15) {
      mainStorage.push(unequippedItem);
    } else {
      extraPlanarStorage.push(unequippedItem);
    }
    
    equipment = { ...equipment, [targetSlot]: null };
    
    charMap.set('mainStorage', mainStorage);
    charMap.set('extraPlanarStorage', extraPlanarStorage);
    charMap.set('equipment', equipment);
  }

  public advanceTime(blocks: number) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    this.doc.transact(() => {
      const shared = this.getSharedMap();
      const original = shared.get('timeState') as TimeState | undefined;
      const timeState: TimeState = original ? structuredClone(original) : { blocks: 0 };
      
      timeState.blocks += blocks;
      
      // Jump the real-time clock forward by exactly `blocks`
      const BLOCK_MS = 6 * 60 * 60 * 1000;
      if (timeState.gameTimeMs !== undefined) {
        // Calculate any elapsed running time before resetting the anchor
        if (timeState.isRunning && timeState.lastRealTimeMs) {
          const elapsedReal = Date.now() - timeState.lastRealTimeMs;
          timeState.gameTimeMs += elapsedReal * (timeState.timeScale || 60);
        }
        timeState.gameTimeMs += blocks * BLOCK_MS;
        timeState.lastRealTimeMs = Date.now();
      } else {
        timeState.gameTimeMs = timeState.blocks * BLOCK_MS;
        timeState.lastRealTimeMs = Date.now();
        timeState.timeScale = 60;
        timeState.isRunning = false;
      }

      shared.set('timeState', timeState);
      this._applyTimePassage(blocks, timeState);
    });
  }

  public syncNaturalTime(currentVisualTimeMs: number) {
    if (this.role !== 'dm') return;
    this.doc.transact(() => {
      const shared = this.getSharedMap();
      const original = shared.get('timeState') as TimeState | undefined;
      if (!original) return;
      
      const BLOCK_MS = 6 * 60 * 60 * 1000;
      const expectedBlocks = Math.floor(currentVisualTimeMs / BLOCK_MS);
      
      if (expectedBlocks > original.blocks) {
        const timeState = structuredClone(original);
        const blocksPassed = expectedBlocks - timeState.blocks;
        
        timeState.blocks = expectedBlocks;
        shared.set('timeState', timeState);
        this._applyTimePassage(blocksPassed, timeState);
      }
    });
  }

  private _applyTimePassage(blocks: number, timeState: TimeState) {
    // 2. Tick Statuses
    for (const key of this.doc.share.keys()) {
      if (key.startsWith('character:')) {
        const charId = key.replace('character:', '');
        const charMap = this.getCharacterMap(charId);
        const statuses: StatusInstance[] = charMap.get('statuses') || [];
        
        let changedStatuses = false;
        const newStatuses = statuses.map(s => {
          if (s.remaining !== undefined) {
            s.remaining -= blocks;
            changedStatuses = true;
          }
          return s;
        }).filter(s => {
          if (s.remaining !== undefined && s.remaining <= 0) {
            // Expired!
            if (s.revertData) {
              const mutations = computeRevertEffects(s.effects, { sourceId: charId, store: this }, s.revertData);
              this.commitMutations(mutations);
            }
            changedStatuses = true;
            return false;
          }
          return true;
        });

        if (changedStatuses) {
          charMap.set('statuses', newStatuses);
        }

        // 3. Auto-Progress Curses/Afflictions
        const afflictions: any[] = charMap.get('afflictions') || [];
        
        let changedAfflictions = false;
        const newAfflictions = afflictions.map(a => {
          if (!a.autoProgressIntervalBlocks || a.autoProgressIntervalBlocks <= 0) return a;
          if (a.currentStage >= a.maxStages) return a;

          const lastBlock = a.lastProgressedAtBlock ?? (timeState.blocks - blocks);
          const blocksPassed = timeState.blocks - lastBlock;
          
          if (blocksPassed >= a.autoProgressIntervalBlocks) {
            const intervals = Math.floor(blocksPassed / a.autoProgressIntervalBlocks);
            a.currentStage = Math.min(a.maxStages, a.currentStage + intervals);
            a.lastProgressedAtBlock = lastBlock + (intervals * a.autoProgressIntervalBlocks);
            changedAfflictions = true;
          }
          return a;
        });

        if (changedAfflictions) {
          charMap.set('afflictions', newAfflictions);
        }
      }
    }
  }

  // ================= Calendar =================

  public getCalendarConfig(): CalendarConfig {
    const shared = this.getSharedMap();
    let config = shared.get('calendarConfig');
    if (!config) {
      config = {
        weekdays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        months: [
          { name: 'January', days: 31 },
          { name: 'February', days: 28 },
          { name: 'March', days: 31 },
          { name: 'April', days: 30 },
          { name: 'May', days: 31 },
          { name: 'June', days: 30 },
          { name: 'July', days: 31 },
          { name: 'August', days: 31 },
          { name: 'September', days: 30 },
          { name: 'October', days: 31 },
          { name: 'November', days: 30 },
          { name: 'December', days: 31 }
        ],
        startYear: 1
      };
      shared.set('calendarConfig', config);
    }
    return config as CalendarConfig;
  }

  public updateCalendarConfig(config: CalendarConfig) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    this.getSharedMap().set('calendarConfig', config);
  }

  public getCalendarEvents(): Record<number, string[]> {
    return this.getSharedMap().get('calendarEvents') || {};
  }

  public addCalendarEvent(dayOffset: number, event: string) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const events = shared.get('calendarEvents') || {};
    if (!events[dayOffset]) events[dayOffset] = [];
    events[dayOffset] = [...events[dayOffset], event];
    shared.set('calendarEvents', events);
  }

  public removeCalendarEvent(dayOffset: number, index: number) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const events = shared.get('calendarEvents') || {};
    if (events[dayOffset]) {
      events[dayOffset] = events[dayOffset].filter((_: string, i: number) => i !== index);
      if (events[dayOffset].length === 0) {
        delete events[dayOffset];
      }
      shared.set('calendarEvents', { ...events });
    }
  }

  // ================= Combat =================

  public startCombat() {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const original = shared.get('combatState') as CombatState;
    const combatState = original ? structuredClone(original) : { active: false, round: 1, turnIndex: 0, combatants: [] };
    combatState.active = true;
    combatState.round = 1;
    combatState.turnIndex = 0;

    const profiles = this.getCharacterProfiles();
    
    for (const profile of profiles) {
      const charMap = this.getCharacterMap(profile.id);
      const hp = charMap.get('hp') || { current: 10, max: 10 };
      const stats = charMap.get('stats') || {};
      const statuses = charMap.get('statuses') || [];
      const conditions = charMap.get('conditions') || [];
      
      const existingIdx = combatState.combatants.findIndex((c: any) => c.id === profile.id);
      if (existingIdx === -1) {
        combatState.combatants.push({
          id: profile.id,
          source: 'character',
          refId: profile.id,
          label: profile.name,
          initiative: stats.init || 10,
          ac: stats.ac || 10,
          hp: { ...hp },
          statuses: [...statuses],
          conditions: [...conditions]
        });
      } else {
        combatState.combatants[existingIdx].initiative = stats.init || 10;
        combatState.combatants[existingIdx].ac = stats.ac || 10;
        combatState.combatants[existingIdx].hp = { ...hp };
      }
    }

    // Sort combatants by initiative descending
    combatState.combatants.sort((a: any, b: any) => b.initiative - a.initiative);
    shared.set('combatState', { ...combatState, combatants: [...combatState.combatants] });
  }

  public endCombat() {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const original = shared.get('combatState') as CombatState;
    const combatState = original ? structuredClone(original) : { active: false, round: 1, turnIndex: 0, combatants: [] };
    combatState.active = false;
    shared.set('combatState', { ...combatState, combatants: [...combatState.combatants] });
  }

  public nextTurn() {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    
    this.doc.transact(() => {
        const shared = this.getSharedMap();
        const original = shared.get('combatState') as CombatState;
        if (!original) return;
        let combatState = structuredClone(original);
        if (!combatState.active || combatState.combatants.length === 0) return;

      let newCombatants = combatState.combatants;
      let mutationsToCommit: EffectMutation[] = [];

      combatState.turnIndex++;
      if (combatState.turnIndex >= combatState.combatants.length) {
        combatState.turnIndex = 0;
        combatState.round++;
        
        // Tick rounds for combatants IN MEMORY
        newCombatants = combatState.combatants.map((c: any) => {
          let changed = false;
          const newStatuses = (c.statuses || []).map((s: any) => {
            if (s.remaining !== undefined) {
              s.remaining -= 1;
              changed = true;
            }
            return s;
          }).filter((s: any) => {
            if (s.remaining !== undefined && s.remaining <= 0) {
              if (s.revertData) {
                // Collect revert mutations
                mutationsToCommit.push(...computeRevertEffects(s.effects, { sourceId: c.id, store: this }, s.revertData));
              }
              changed = true;
              return false;
            }
            return true;
          });
          if (changed) {
            return { ...c, statuses: newStatuses };
          }
          return c;
        });
      }
      
      // Save the updated statuses and turn index to the store FIRST
      shared.set('combatState', { 
        ...combatState, 
        round: combatState.round, 
        turnIndex: combatState.turnIndex, 
        combatants: (combatState.turnIndex === 0 && combatState.round > 1) ? newCombatants : combatState.combatants 
      });

      // THEN commit the mutations on top of the saved state
      if (typeof mutationsToCommit !== 'undefined' && mutationsToCommit.length > 0) {
        this.commitMutations(mutationsToCommit);
      }

    }, 'next-turn');
  }

  public addCombatant(combatant: any) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const original = shared.get('combatState') as CombatState;
    const combatState = original ? structuredClone(original) : { active: false, round: 1, turnIndex: 0, combatants: [] };
    combatState.combatants.push({ ...combatant, conditions: combatant.conditions || [] });
    combatState.combatants.sort((a: any, b: any) => b.initiative - a.initiative);
    shared.set('combatState', { ...combatState });
  }

  public removeCombatant(id: string) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const combatState = shared.get('combatState');
    if (!combatState) return;
    const indexToRemove = combatState.combatants.findIndex((c: any) => c.id === id);
    if (indexToRemove === -1) return;
    combatState.combatants.splice(indexToRemove, 1);
    if (indexToRemove < combatState.turnIndex) {
      combatState.turnIndex--;
    } else if (combatState.turnIndex >= combatState.combatants.length) {
      combatState.turnIndex = 0;
    }
    shared.set('combatState', { ...combatState });
  }

  public updateCombatantInitiative(id: string, initiative: number) {
    const shared = this.getSharedMap();
    const combatState = shared.get('combatState');
    if (!combatState) return;
    const c = combatState.combatants.find((c: any) => c.id === id);
    if (c) {
      c.initiative = initiative;
      combatState.combatants.sort((a: any, b: any) => b.initiative - a.initiative);
      shared.set('combatState', { ...combatState });
      
      if (c.source === 'character') {
        const charMap = this.getCharacterMap(c.refId);
        const stats = charMap.get('stats') || {};
        charMap.set('stats', { ...stats, init: initiative });
      }
    }
  }

  public updateCombatantAc(id: string, ac: number) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const combatState = shared.get('combatState');
    if (!combatState) return;
    const c = combatState.combatants.find((c: any) => c.id === id);
    if (c) {
      c.ac = ac;
      shared.set('combatState', { ...combatState });
      
      if (c.source === 'character') {
        const charMap = this.getCharacterMap(c.refId);
        const stats = charMap.get('stats') || {};
        charMap.set('stats', { ...stats, ac: ac });
      }
    }
  }

  public updateCombatantConditions(id: string, conditions: string[]) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const combatState = shared.get('combatState');
    if (!combatState) return;
    const c = combatState.combatants.find((c: any) => c.id === id);
    if (c) {
      c.conditions = conditions;
      shared.set('combatState', { ...combatState });
      
      if (c.source === 'character') {
        const charMap = this.getCharacterMap(c.refId);
        charMap.set('conditions', conditions);
      }
    }
  }

  public updateCombatantHp(id: string, hp: { current: number, max: number }) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const combatState = shared.get('combatState');
    if (!combatState) return;
    const c = combatState.combatants.find((c: any) => c.id === id);
    if (c) {
      c.hp = { ...hp };
      shared.set('combatState', { ...combatState });
      
      if (c.source === 'character') {
        const charMap = this.getCharacterMap(c.refId);
        charMap.set('hp', { ...hp });
      }
    }
  }

  public confirmEvent(entry: any) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    // 1. Compute & commit effects
    if (entry.effects && entry.effects.length > 0) {
      const { mutations } = computeEffects(entry.effects, { sourceId: 'event', store: this });
      this.commitMutations(mutations);
    }
    // 2. Add monsters to combat if any
    if (entry.monsters && entry.monsters.length > 0) {
      const dmMap = this.getDmMap();
      const templates = dmMap.get('monsterTemplates') || [];
      const shared = this.getSharedMap();
      const original = shared.get('combatState') as CombatState;
      const combatState = original ? structuredClone(original) : { active: false, round: 1, turnIndex: 0, combatants: [] };
      
      for (const m of entry.monsters) {
        const template = templates.find((t: any) => t.id === m.templateId);
        if (template) {
          const maxHp = template.hp?.max || 10;
          for (let i = 0; i < m.count; i++) {
            combatState.combatants.push({
              id: `monster-${Date.now()}-${Math.random()}`,
              source: 'monster',
              refId: template.id,
              label: `${template.name} ${i + 1}`,
              initiative: Math.floor(Math.random() * 20) + 1, // roll 1d20
              ac: template.stats?.ac || 10,
              hp: { current: maxHp, max: maxHp },
              statuses: [],
              conditions: []
            });
          }
        }
      }
      combatState.combatants.sort((a: any, b: any) => b.initiative - a.initiative);
      shared.set('combatState', { ...combatState });
    }
  }

  // ================= Items =================
  
  public createItemTemplate(template: Omit<ItemTemplate, 'id'>) {
    const shared = this.getSharedMap();
    const templates = shared.get('itemTemplates') || [];
    const newTemplate = { ...template, id: `item-${Date.now()}-${Math.random()}` };
    shared.set('itemTemplates', [...templates, newTemplate]);
    return newTemplate.id;
  }

  public getItemTemplates(): ItemTemplate[] {
    const shared = this.getSharedMap();
    return shared.get('itemTemplates') || [];
  }

  public deleteItemTemplate(id: string) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const templates = shared.get('itemTemplates') || [];
    shared.set('itemTemplates', templates.filter((t: any) => t.id !== id));
  }

  public addItemToInventory(charId: string, itemData: any) {
    const shared = this.getSharedMap();
    if (this.role === 'player' && shared.get('locked')) throw new Error('Sheet is locked by DM');
    
    const charMap = this.getCharacterMap(charId);
    const mainStorage = charMap.get('mainStorage') || [];
    const extraPlanarStorage = charMap.get('extraPlanarStorage') || [];
    const newItem = {
      ...itemData,
      id: itemData.id || `inv-${Date.now()}-${Math.random()}`,
      quantity: itemData.quantity ?? 1,
      equipped: false,
      effectsOnEquip: itemData.effectsOnEquip ?? []
    };
    if (mainStorage.length < 15) {
      charMap.set('mainStorage', [...mainStorage, newItem]);
    } else {
      charMap.set('extraPlanarStorage', [...extraPlanarStorage, newItem]);
    }
  }

  public removeInventoryItem(charId: string, itemId: string) {
    const shared = this.getSharedMap();
    if (this.role === 'player' && shared.get('locked')) throw new Error('Sheet is locked by DM');
    
    const charMap = this.getCharacterMap(charId);
    const mainStorage: Item[] = charMap.get('mainStorage') || [];
    const extraPlanarStorage: Item[] = charMap.get('extraPlanarStorage') || [];
    const equipment = charMap.get('equipment') || {};
    
    let foundEqSlot: string | null = null;
    let eqItem: Item | null = null;
    for (const [slot, item] of Object.entries(equipment)) {
       if (item && (item as Item).id === itemId) {
           foundEqSlot = slot;
           eqItem = item as Item;
           break;
       }
    }
    
    if (eqItem && eqItem.revertData) {
       const mutations = computeRevertEffects(eqItem.effectsOnEquip, { sourceId: charId, store: this }, eqItem.revertData);
       this.commitMutations(mutations);
       charMap.set('equipment', { ...equipment, [foundEqSlot!]: null });
       return;
    }
    
    charMap.set('mainStorage', mainStorage.filter(i => i.id !== itemId));
    charMap.set('extraPlanarStorage', extraPlanarStorage.filter(i => i.id !== itemId));
  }

  // ================= Blood Moon Global Override =================

  public setBloodMoon(active: boolean) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    shared.set('bloodMoon', active);
  }

  public getBloodMoon(): boolean {
    return this.getSharedMap().get('bloodMoon') || false;
  }

  // ================= Phase 9: Journal & Handouts =================

  private getNotesMap(): Y.Map<any> {
    const sharedMap = this.getSharedMap();
    if (!sharedMap.has('notesMap')) {
      sharedMap.set('notesMap', new Y.Map());
    }
    return sharedMap.get('notesMap') as Y.Map<any>;
  }

  private getHandoutsMap(): Y.Map<any> {
    const dmMap = this.getDmMap();
    if (!dmMap.has('handoutsMap')) {
      dmMap.set('handoutsMap', new Y.Map());
    }
    return dmMap.get('handoutsMap') as Y.Map<any>;
  }

  private getRevealedHandoutsMap(): Y.Map<any> {
    const sharedMap = this.getSharedMap();
    if (!sharedMap.has('revealedHandoutsMap')) {
      sharedMap.set('revealedHandoutsMap', new Y.Map());
    }
    return sharedMap.get('revealedHandoutsMap') as Y.Map<any>;
  }

  public getNotes(): Note[] {
    return Array.from(this.getNotesMap().values());
  }

  public saveNote(note: Note) {
    const validated = NoteSchema.parse(note);
    this.getNotesMap().set(validated.id, validated);
  }

  public deleteNote(noteId: string) {
    this.getNotesMap().delete(noteId);
  }

  public getHandouts(): Handout[] {
    if (this.role !== 'dm') return [];
    return Array.from(this.getHandoutsMap().values());
  }

  public saveHandout(handout: Handout) {
    if (this.role !== 'dm') throw new Error("Unauthorized");
    const validated = HandoutSchema.parse(handout);
    
    // Save to private DM map
    this.getHandoutsMap().set(validated.id, validated);

    // Sync to shared map if revealed
    if (validated.isRevealed) {
      this.getRevealedHandoutsMap().set(validated.id, validated);
    } else {
      this.getRevealedHandoutsMap().delete(validated.id);
    }
  }

  public deleteHandout(handoutId: string) {
    if (this.role !== 'dm') throw new Error("Unauthorized");
    this.getHandoutsMap().delete(handoutId);
    this.getRevealedHandoutsMap().delete(handoutId);
  }

  public getRevealedHandouts(): Handout[] {
    return Array.from(this.getRevealedHandoutsMap().values());
  }

  public getActiveGlobalEffect(): GlobalEffect | null {
    const sharedMap = this.getSharedMap();
    return sharedMap.get('activeGlobalEffect') as GlobalEffect | null || null;
  }

  public setActiveGlobalEffect(effect: GlobalEffect | null) {
    if (this.role !== 'dm') throw new Error("Unauthorized");
    const sharedMap = this.getSharedMap();
    if (effect) {
      sharedMap.set('activeGlobalEffect', effect);
    } else {
      sharedMap.delete('activeGlobalEffect');
    }
  }

  public getActiveEncounters(): GlobalEffect[] {
    const sharedMap = this.getSharedMap();
    return sharedMap.get('activeEncounters') as GlobalEffect[] || [];
  }

  public addActiveEncounter(encounter: GlobalEffect) {
    if (this.role !== 'dm') throw new Error("Unauthorized");
    const sharedMap = this.getSharedMap();
    const encounters = this.getActiveEncounters();
    sharedMap.set('activeEncounters', [...encounters, encounter]);
  }

  public removeActiveEncounter(id: string) {
    if (this.role !== 'dm') throw new Error("Unauthorized");
    const sharedMap = this.getSharedMap();
    const encounters = this.getActiveEncounters();
    sharedMap.set('activeEncounters', encounters.filter(e => e.id !== id));
  }

  // --- Real-Time Clock Controls ---
  public playClock() {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const original = shared.get('timeState') as TimeState | undefined;
    const timeState: TimeState = original ? structuredClone(original) : { blocks: 0 };
    
    if (timeState.isRunning) return; // Already running
    
    if (timeState.gameTimeMs === undefined) {
      const BLOCK_MS = 6 * 60 * 60 * 1000;
      timeState.gameTimeMs = timeState.blocks * BLOCK_MS;
    }

    timeState.isRunning = true;
    timeState.lastRealTimeMs = Date.now();
    timeState.timeScale = timeState.timeScale ?? 60;
    
    shared.set('timeState', timeState);
  }

  public pauseClock() {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const original = shared.get('timeState') as TimeState | undefined;
    const timeState: TimeState = original ? structuredClone(original) : { blocks: 0 };
    
    if (!timeState.isRunning) return;
    
    if (timeState.lastRealTimeMs && timeState.gameTimeMs !== undefined) {
      const elapsedReal = Date.now() - timeState.lastRealTimeMs;
      timeState.gameTimeMs += elapsedReal * (timeState.timeScale || 60);
    }
    
    timeState.isRunning = false;
    timeState.lastRealTimeMs = Date.now();
    
    shared.set('timeState', timeState);
  }

  public setTimeScale(scale: number) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const shared = this.getSharedMap();
    const original = shared.get('timeState') as TimeState | undefined;
    const timeState: TimeState = original ? structuredClone(original) : { blocks: 0 };
    
    if (timeState.isRunning && timeState.lastRealTimeMs && timeState.gameTimeMs !== undefined) {
      const elapsedReal = Date.now() - timeState.lastRealTimeMs;
      timeState.gameTimeMs += elapsedReal * (timeState.timeScale || 60);
    }
    
    timeState.lastRealTimeMs = Date.now();
    timeState.timeScale = scale;
    
    shared.set('timeState', timeState);
  }

  // ================= Phase 11: Custom Bestiary =================
  private getCustomMonstersMap(): Y.Map<BestiaryItem> {
    const dmMap = this.getDmMap();
    if (!dmMap.has('customMonsters')) {
      dmMap.set('customMonsters', new Y.Map());
    }
    return dmMap.get('customMonsters') as Y.Map<BestiaryItem>;
  }

  private getRevealedMonstersMap(): Y.Map<boolean> {
    const dmMap = this.getDmMap();
    if (!dmMap.has('revealedMonsters')) {
      dmMap.set('revealedMonsters', new Y.Map());
    }
    return dmMap.get('revealedMonsters') as Y.Map<boolean>;
  }

  public getCustomMonsters(): BestiaryItem[] {
    return Array.from(this.getCustomMonstersMap().values());
  }

  public getRevealedMonsterIds(): Set<string> {
    const ids = new Set<string>();
    for (const [id, isRevealed] of this.getRevealedMonstersMap().entries()) {
      if (isRevealed) ids.add(id);
    }
    return ids;
  }

  public saveCustomMonster(monster: BestiaryItem) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    if (!monster.id) throw new Error('Monster must have an ID');
    this.getCustomMonstersMap().set(monster.id, monster);
  }

  public deleteCustomMonster(id: string) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    this.getCustomMonstersMap().delete(id);
    this.getRevealedMonstersMap().delete(id);
  }

  public toggleMonsterVisibility(id: string) {
    if (this.role !== 'dm') throw new Error('Unauthorized');
    const revealedMap = this.getRevealedMonstersMap();
    const currentState = revealedMap.get(id) || false;
    revealedMap.set(id, !currentState);
  }

  public destroy(): void {
    this.disconnectSync();
    this.provider.destroy();
    this.doc.destroy();
  }
}
