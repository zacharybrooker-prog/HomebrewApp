import React from 'react';
import { X } from 'lucide-react';

interface GlobalNavMenuProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'dm' | 'player' | null;
  onNavigate: (tab: string) => void;
  activeTab: string;
}

const GlobalNavMenu: React.FC<GlobalNavMenuProps> = ({ isOpen, onClose, role, onNavigate, activeTab }) => {
  if (!isOpen) return null;

  const tabs = role === 'dm'
    ? ['sheet', 'combat', 'events', 'calendar', 'tavern', 'journal', 'map', 'inventory', 'mount', 'abilities', 'glossary', 'settings']
    : ['sheet', 'combat', 'calendar', 'tavern', 'journal', 'map', 'inventory', 'mount', 'abilities', 'glossary', 'settings'];

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
        className="relative w-full md:w-80 h-full bg-stone-950 border-r-2 border-yellow-700/50 shadow-[20px_0_50px_rgba(0,0,0,0.9)] flex flex-col animate-slide-in-left"
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
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
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
