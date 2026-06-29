import { useState } from 'react';

export const STANDARD_MOON_PHASES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'
];

interface MoonConfig {
  id: string;
  name: string;
  cycleLengthDays: number;
  phaseOffsetDays: number;
  color?: string;
  customPhases?: [string, string, string, string, string, string, string, string];
  isVisibleToPlayers: boolean;
}

function calculateMoonPhases(totalDaysPassed: number, moons: MoonConfig[]) {
  return moons.map(moon => {
    const cycleLength = Math.max(1, moon.cycleLengthDays);
    const effectiveDay = (totalDaysPassed + moon.phaseOffsetDays) % cycleLength;
    const normalizedDay = effectiveDay < 0 ? effectiveDay + cycleLength : effectiveDay;
    const progressPercent = normalizedDay / cycleLength;
    
    let phaseIndex = Math.floor(progressPercent * 8);
    if (phaseIndex >= 8) phaseIndex = 7;
    if (phaseIndex < 0) phaseIndex = 0;
    
    const phaseName = moon.customPhases?.[phaseIndex] || STANDARD_MOON_PHASES[phaseIndex];
    
    return {
      config: moon,
      phaseIndex,
      phaseName,
      progressPercent
    };
  });
}

// ===================== CALENDAR EDITOR =====================

interface MonthConfig {
  name: string;
  days: number;
}

interface CalendarEditorProps {
  startYear: number;
  weekdays: string[];
  months: MonthConfig[];
  moons?: MoonConfig[];
  onUpdate: (config: { startYear: number; weekdays: string[]; months: MonthConfig[]; moons?: MoonConfig[] }) => void;
}

export function CalendarEditor({ startYear, weekdays, months, moons, onUpdate }: CalendarEditorProps) {
  const [draft, setDraft] = useState({ startYear, weekdays, months, moons: moons || [] });

  const save = () => {
    onUpdate(draft);
  };

  const updateMonthDays = (idx: number, days: number) => {
    const newMonths = [...draft.months];
    newMonths[idx].days = days;
    setDraft({ ...draft, months: newMonths });
  };
  
  const updateMonthName = (idx: number, name: string) => {
    const newMonths = [...draft.months];
    newMonths[idx].name = name;
    setDraft({ ...draft, months: newMonths });
  };

  const updateWeekday = (idx: number, name: string) => {
    const newWd = [...draft.weekdays];
    newWd[idx] = name;
    setDraft({ ...draft, weekdays: newWd });
  };

  const updateMoon = (idx: number, updates: Partial<MoonConfig>) => {
    const newMoons = [...draft.moons];
    newMoons[idx] = { ...newMoons[idx], ...updates };
    setDraft({ ...draft, moons: newMoons });
  };

  const addMoon = () => {
    setDraft({
      ...draft,
      moons: [...draft.moons, { id: `moon-${Date.now()}`, name: 'New Moon', cycleLengthDays: 28, phaseOffsetDays: 0, color: '#e2e8f0', isVisibleToPlayers: false }]
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <div className="glass-panel flex flex-col gap-4">
        <h3 className="section-heading" style={{ margin: 0 }}>⚙️ Calendar Settings (DM Only)</h3>
        
        <div className="flex flex-col gap-2">
          <label className="sub-label">Starting Year</label>
          <input 
            type="number" 
            className="input-fantasy" 
            value={draft.startYear}
            onChange={(e) => setDraft({ ...draft, startYear: Number(e.target.value) })}
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <label className="sub-label">Days of the Week ({draft.weekdays.length})</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {draft.weekdays.map((wd: string, i: number) => (
              <input 
                key={i} 
                type="text" 
                className="input-fantasy text-sm" 
                value={wd} 
                onChange={(e) => updateWeekday(i, e.target.value)} 
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs py-1" onClick={() => setDraft({ ...draft, weekdays: [...draft.weekdays, 'New Day'] })}>+ Add Day</button>
            <button className="btn-ghost text-xs py-1" onClick={() => setDraft({ ...draft, weekdays: draft.weekdays.slice(0, -1) })} disabled={draft.weekdays.length <= 1}>- Remove Day</button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="sub-label">Months ({draft.months.length})</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {draft.months.map((m: MonthConfig, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" className="input-fantasy flex-1" value={m.name} onChange={(e) => updateMonthName(i, e.target.value)} />
                <input type="number" className="input-fantasy w-20 text-center" value={m.days} onChange={(e) => updateMonthDays(i, Number(e.target.value))} title="Days in month" />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost text-xs py-1" onClick={() => setDraft({ ...draft, months: [...draft.months, { name: 'New Month', days: 30 }] })}>+ Add Month</button>
            <button className="btn-ghost text-xs py-1" onClick={() => setDraft({ ...draft, months: draft.months.slice(0, -1) })} disabled={draft.months.length <= 1}>- Remove Month</button>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="sub-label">Celestial Bodies ({draft.moons.length})</label>
          <div className="flex flex-col gap-3">
            {draft.moons.map((m: MoonConfig, i: number) => (
              <div key={m.id} className="p-3 rounded bg-white/5 border border-white/10 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <input type="text" className="input-fantasy flex-1" value={m.name} onChange={e => updateMoon(i, { name: e.target.value })} placeholder="Moon Name" />
                  <input type="number" className="input-fantasy w-24 text-center" value={m.cycleLengthDays} onChange={e => updateMoon(i, { cycleLengthDays: Number(e.target.value) })} title="Cycle Length (Days)" />
                  <input type="number" className="input-fantasy w-24 text-center" value={m.phaseOffsetDays} onChange={e => updateMoon(i, { phaseOffsetDays: Number(e.target.value) })} title="Phase Offset (Days)" />
                  <input type="color" className="w-8 h-8 rounded cursor-pointer bg-transparent border-0" value={m.color || '#ffffff'} onChange={e => updateMoon(i, { color: e.target.value })} title="Moon Color" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" className="checkbox-fantasy" checked={m.isVisibleToPlayers} onChange={e => updateMoon(i, { isVisibleToPlayers: e.target.checked })} />
                    Show on Calendar Grid
                  </label>
                  <button className="btn-ghost text-red-400 text-xs py-1 ml-auto" onClick={() => setDraft({ ...draft, moons: draft.moons.filter((_, idx) => idx !== i) })}>Delete</button>
                </div>
                <div className="mt-2 flex flex-col gap-1 border-t border-white/10 pt-2">
                  <span className="text-[10px] uppercase text-muted-foreground tracking-widest">Custom Phase Names (Optional)</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                    {STANDARD_MOON_PHASES.map((p, pIdx) => (
                      <input 
                        key={pIdx} 
                        type="text" 
                        className="input-fantasy text-[10px] py-1 px-2" 
                        placeholder={p} 
                        value={m.customPhases?.[pIdx] || ''} 
                        onChange={(e) => {
                          const newPhases = m.customPhases ? [...m.customPhases] as [string, string, string, string, string, string, string, string] : [...STANDARD_MOON_PHASES] as [string, string, string, string, string, string, string, string];
                          newPhases[pIdx] = e.target.value;
                          updateMoon(i, { customPhases: newPhases });
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-ghost text-xs py-1 self-start" onClick={addMoon}>+ Add Moon</button>
        </div>

        <button onClick={save} className="btn-fantasy mt-2">💾 Save Settings</button>
      </div>
    </div>
  );
}

// ===================== CALENDAR VIEW =====================

interface CalendarViewProps {
  role: 'dm' | 'player';
  year: number;
  monthName: string;
  daysInMonth: number;
  currentDayOfMonth: number;
  weekdays: string[];
  firstDayOfWeekIndex: number;
  totalDaysPassedAtMonthStart: number;
  events: Record<number, string[]>;
  moons?: MoonConfig[];
  onAddEvent: (dayOffset: number, evt: string) => void;
  onRemoveEvent: (dayOffset: number, index: number) => void;
  onExit?: () => void;
  allMonths?: string[];
  viewedMonthIndex?: number;
  onNextMonth?: () => void;
  onPrevMonth?: () => void;
  onSelectMonthIndex?: (index: number) => void;
}

export function CalendarView({ 
  role, year, monthName, daysInMonth, currentDayOfMonth, 
  weekdays, firstDayOfWeekIndex, totalDaysPassedAtMonthStart, 
  events, moons, onAddEvent, onRemoveEvent,
  onExit, allMonths = [], viewedMonthIndex = 0, onNextMonth, onPrevMonth, onSelectMonthIndex
}: CalendarViewProps) {
  
  const blankDaysBefore = firstDayOfWeekIndex;
  const totalCells = blankDaysBefore + daysInMonth;
  const weeks = Math.ceil(totalCells / weekdays.length);

  const handleCellClick = (dayOfMonth: number) => {
    if (role !== 'dm') return;
    const evt = window.prompt(`Add event for ${dayOfMonth} of ${monthName}:`);
    if (evt) {
      const dayOffset = totalDaysPassedAtMonthStart + (dayOfMonth - 1);
      onAddEvent(dayOffset, evt);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up max-w-6xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white uppercase tracking-wider m-0">Campaign Calendar</h2>
        {onExit && (
          <button onClick={onExit} className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-wider bg-[#242424] px-3 py-1.5 rounded border border-[#333] transition-colors">
            Exit
          </button>
        )}
      </div>

      <div className="flex items-center justify-between bg-[#1A1A1A] p-2 rounded-lg border border-[#2a2a2a]">
        <button onClick={onPrevMonth} className="px-4 py-2 text-gray-400 hover:text-white bg-[#242424] rounded border border-[#333]">&lt; Prev</button>
        
        <div className="flex-1 flex overflow-x-auto custom-scrollbar mx-4">
          {allMonths.map((mName, idx) => (
            <button
              key={mName + idx}
              onClick={() => onSelectMonthIndex?.(idx)}
              className={`flex-none px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                viewedMonthIndex === idx ? 'text-red-500 border-red-500 bg-[#242424]' : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {mName}
            </button>
          ))}
        </div>

        <button onClick={onNextMonth} className="px-4 py-2 text-gray-400 hover:text-white bg-[#242424] rounded border border-[#333]">Next &gt;</button>
      </div>

      <div className="text-center mt-2">
        <h2 className="font-heading text-4xl" style={{ color: 'var(--secondary)', textShadow: '0 0 10px var(--secondary-glow)' }}>
          {monthName}
        </h2>
        <div className="text-base uppercase tracking-widest text-muted-foreground mt-2 font-bold">
          Year {year}
        </div>
      </div>
      
      <div className="glass-panel p-2 md:p-6 shadow-2xl" style={{ borderColor: 'var(--border-accent)', backgroundColor: '#121212' }}>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${weekdays.length}, minmax(0, 1fr))` }}>
          {/* Header */}
          {weekdays.map((wd: string) => (
            <div key={wd} className="text-center font-heading text-[10px] sm:text-xs uppercase p-2 border-b border-[var(--border)] text-muted-foreground">
              {wd.substring(0, 3)}
            </div>
          ))}
          
          {/* Blank Days */}
          {Array.from({ length: blankDaysBefore }).map((_, i) => (
            <div key={`blank-${i}`} className="p-2 sm:p-4 border-b border-r border-[var(--glass-border)] opacity-30 bg-black/20" />
          ))}
          
          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const isToday = dayNum === currentDayOfMonth;
            const absoluteDayOffset = totalDaysPassedAtMonthStart + i;
            const dayEvents = events[absoluteDayOffset] || [];
            const dayMoons = moons ? calculateMoonPhases(absoluteDayOffset, moons).filter(m => m.config.isVisibleToPlayers || role === 'dm') : [];
            
            return (
              <div 
                key={dayNum} 
                className={`relative flex flex-col p-2 min-h-[100px] border-b border-r border-[#2a2a2a] group ${isToday ? 'bg-red-900/10' : 'hover:bg-[#1a1a1a] transition-colors'} ${role === 'dm' ? 'cursor-pointer' : ''}`}
                onClick={() => handleCellClick(dayNum)}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm md:text-lg font-bold font-serif ${isToday ? 'text-red-500' : 'text-gray-400'}`}>
                    {dayNum}
                  </span>
                  <div className="flex flex-col gap-1">
                    {dayMoons.map(m => (
                      <span key={m.config.id} className="text-[10px]" title={`${m.config.name}: ${m.phaseName}`} style={{ color: m.config.color || '#fff', textShadow: `0 0 5px ${m.config.color || '#fff'}` }}>
                        🌑
                      </span>
                    ))}
                    {isToday && (
                      <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                    )}
                  </div>
                </div>
                
                <div className="mt-2 flex flex-col gap-1 overflow-y-auto">
                  {dayEvents.map((evt: string, eIdx: number) => (
                    <div key={eIdx} className="text-xs bg-[#242424] text-gray-300 p-1.5 rounded border border-[#333] shadow flex justify-between group/evt hover:border-[#444]">
                      <span className="truncate">{evt}</span>
                      {role === 'dm' && (
                        <button 
                          className="w-4 h-4 bg-red-900/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover/evt:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); onRemoveEvent(absoluteDayOffset, eIdx); }}
                        >✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {/* Padding End */}
          {Array.from({ length: (weeks * weekdays.length) - totalCells }).map((_, i) => (
            <div key={`end-blank-${i}`} className="p-2 sm:p-4 border-b border-r border-[var(--glass-border)] opacity-30 bg-black/20" />
          ))}
        </div>
      </div>
    </div>
  );
}
