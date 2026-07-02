import React from 'react';
import { X } from 'lucide-react';
import { TimeDial } from '@frogs-world/ui';

interface GlobalNavMenuProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'dm' | 'player' | null;
  onNavigate: (tab: string) => void;
  activeTab: string;
  locationName: string;
  setLocationName: (name: string) => void;
  visualTimeMs: number;
  currentVisualBlock: number;
  activePhase: string;
  timeState: any;
  store: any;
  calendarConfig: any;
  formatClockTime: (ms: number) => string;
  formatCalendarDate: (block: number, config: any) => string;
  handleAdvanceTime: (hours: number) => void;
}

const GlobalNavMenu: React.FC<GlobalNavMenuProps> = ({ 
  isOpen, onClose, role, onNavigate, activeTab,
  locationName, setLocationName, visualTimeMs, currentVisualBlock,
  activePhase, timeState, store, calendarConfig, formatClockTime,
  formatCalendarDate, handleAdvanceTime
}) => {
  if (!isOpen) return null;

  const tabs = role === 'dm'
    ? ['sheet', 'combat', 'events', 'calendar', 'tavern', 'journal', 'map', 'inventory', 'mount', 'abilities', 'bestiary', 'glossary', 'settings']
    : ['sheet', 'combat', 'calendar', 'tavern', 'journal', 'map', 'inventory', 'mount', 'abilities', 'bestiary', 'glossary', 'settings'];

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'sheet': return 'Character Sheet';
      case 'combat': return 'Combat & Encounter';
      case 'events': return 'Event Deck';
      case 'calendar': return 'Calendar & Time';
      case 'tavern': return 'The Tavern';
      case 'journal': return 'Journal & Lore';
      case 'map': return 'World Map';
      case 'inventory': return 'Inventory & Loot';
      case 'mount': return 'Mounts & Pets';
      case 'abilities': return 'Abilities & Spells';
      case 'bestiary': return 'Bestiary';
      case 'glossary': return 'Glossary';
      case 'settings': return 'Settings';
      default: return tab;
    }
  };

  const getTabIcon = (tab: string) => {
    switch(tab) {
      case 'sheet': return '📜';
      case 'combat': return '⚔️';
      case 'events': return '🃏';
      case 'calendar': return '📅';
      case 'tavern': return '🍻';
      case 'journal': return '📖';
      case 'map': return '🗺️';
      case 'inventory': return '🎒';
      case 'mount': return '🐎';
      case 'abilities': return '✨';
      case 'bestiary': return '🐉';
      case 'glossary': return '📚';
      case 'settings': return '⚙️';
      default: return '📌';
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
        onClick={onClose}
        aria-hidden="true"
      ></div>
      
      {/* Drawer */}
      <div 
        className="relative w-full md:w-[360px] h-full bg-stone-950 border-r-2 border-yellow-700/50 shadow-[20px_0_50px_rgba(0,0,0,0.9)] flex flex-col animate-slide-in-left"
        style={{ backgroundImage: 'url(/artifact-leather-bg.png)', backgroundSize: 'cover' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-yellow-900/50 bg-black/60">
          <h2 className="text-xl font-heading font-black text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)] tracking-widest">
            NAVIGATION
          </h2>
          <button 
            onClick={onClose} 
            className="text-stone-400 hover:text-yellow-500 p-2 transition-colors bg-stone-900 rounded-full border border-stone-700 hover:border-yellow-600 shadow-md"
            aria-label="Close Navigation Menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Time and Location Widget */}
        <div className="p-4 bg-black/80 border-b border-yellow-900/50 shadow-inner flex flex-col gap-4">
          {/* Location */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-yellow-600/70 uppercase font-bold tracking-widest">Location</span>
            {role === 'dm' ? (
              <input 
                className="bg-stone-900 text-yellow-500 border border-yellow-900/50 rounded px-3 py-2 focus:outline-none focus:border-yellow-500 text-sm font-semibold w-full shadow-inner"
                value={locationName}
                onChange={e => {
                  setLocationName(e.target.value);
                  store.setLocationName(e.target.value);
                }}
                placeholder="Where are they?"
              />
            ) : (
              <span className="text-yellow-500 text-lg font-heading font-bold">{locationName || "Unknown"}</span>
            )}
          </div>

          <div className="flex gap-4 items-center">
            {/* Time Dial */}
            <div className="shrink-0 flex items-center justify-center bg-stone-900 border border-yellow-900/50 rounded-full w-16 h-16 shadow-inner">
               <div style={{ transform: 'scale(0.55)', transformOrigin: 'center' }}>
                 <TimeDial phaseIndex={currentVisualBlock % 4} />
               </div>
            </div>

            {/* Time Info */}
            <div className="flex flex-col flex-1">
              <span className="text-[10px] text-yellow-600/70 uppercase font-bold tracking-widest">{activePhase}</span>
              <span className="font-mono text-yellow-500 font-bold tracking-widest text-lg">{formatClockTime(visualTimeMs)}</span>
              <span className="text-xs text-stone-400 mt-1">{formatCalendarDate(currentVisualBlock, calendarConfig || undefined)}</span>
            </div>
          </div>
          
          {/* DM Time Controls */}
          {role === 'dm' && (
            <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-yellow-900/30">
              <span className="text-[10px] text-yellow-600/70 uppercase font-bold tracking-widest">Time Controls</span>
              <div className="flex gap-2">
                <button onClick={() => timeState.isRunning ? store.pauseClock() : store.playClock()} className="flex-1 py-1 rounded bg-stone-800 border border-stone-700 hover:border-yellow-600 text-yellow-500 text-xs font-bold uppercase tracking-widest min-h-[36px]">
                  {timeState.isRunning ? 'PAUSE' : 'PLAY'}
                </button>
                <select 
                  className="flex-1 bg-stone-800 border border-stone-700 rounded text-xs text-yellow-500 font-bold p-1 outline-none min-h-[36px]"
                  value={timeState.timeScale || 60}
                  onChange={e => store.setTimeScale(Number(e.target.value))}
                >
                  <option value="1">1:1 Real</option>
                  <option value="60">1m = 1h</option>
                  <option value="3600">1s = 1h</option>
                </select>
              </div>
              <div className="flex gap-1 text-[10px] font-bold mt-1">
                <button onClick={() => handleAdvanceTime(1)} className="flex-1 py-1 bg-stone-900 border border-stone-800 hover:border-yellow-700 text-stone-400 hover:text-yellow-500 rounded transition-colors">+6H</button>
                <button onClick={() => handleAdvanceTime(2)} className="flex-1 py-1 bg-stone-900 border border-stone-800 hover:border-yellow-700 text-stone-400 hover:text-yellow-500 rounded transition-colors">+12H</button>
                <button onClick={() => handleAdvanceTime(4)} className="flex-1 py-1 bg-stone-900 border border-stone-800 hover:border-yellow-700 text-stone-400 hover:text-yellow-500 rounded transition-colors">+24H</button>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => {
                onNavigate(tab);
                onClose();
              }}
              className={`flex items-center gap-4 w-full p-4 rounded-lg border transition-all ${
                activeTab === tab 
                  ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-400 shadow-[inset_0_0_15px_rgba(234,179,8,0.2)]'
                  : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-800 hover:border-yellow-700/50 hover:text-yellow-500 hover:-translate-y-0.5 shadow-md'
              }`}
            >
              <span className="text-2xl drop-shadow-md">{getTabIcon(tab)}</span>
              <span className="font-bold tracking-wide uppercase text-sm font-body text-left">{getTabLabel(tab)}</span>
            </button>
          ))}
          
          <button
             onClick={() => {
                onNavigate('home');
                onClose();
             }}
             className={`flex items-center gap-4 w-full p-4 mt-4 rounded-lg border transition-all ${
                activeTab === 'home'
                  ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-400 shadow-[inset_0_0_15px_rgba(234,179,8,0.2)]'
                  : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-800 hover:border-yellow-700/50 hover:text-yellow-500 hover:-translate-y-0.5 shadow-md'
             }`}
          >
             <span className="text-2xl drop-shadow-md">🏠</span>
             <span className="font-bold tracking-wide uppercase text-sm font-body text-left">Return to Hub</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlobalNavMenu;
