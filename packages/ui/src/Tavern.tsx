import { useState, useEffect, useRef } from 'react';
import type { ChatMessage, CharacterProfile } from '@frogs-world/shared';
import { Send, Scroll, MessageCircle } from 'lucide-react';

interface TavernProps {
  store: any;
  role: 'dm' | 'player';
  activeCharId: string | null;
  characterProfiles: CharacterProfile[];
  onExit?: () => void;
}

export function Tavern({ store, role, activeCharId, characterProfiles, onExit }: TavernProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isIC, setIsIC] = useState(true);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setMessages(store.getChatMessages());
    };
    handleUpdate(); // Initial load
    store.doc.on('update', handleUpdate);
    return () => store.doc.off('update', handleUpdate);
  }, [store]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    let authorName = role === 'dm' ? 'Dungeon Master' : 'Player';
    let charId = undefined;

    if (isIC) {
      if (role === 'dm') {
        authorName = 'The Universe (DM)';
      } else {
        const char = characterProfiles.find(c => c.id === activeCharId);
        if (char) {
          authorName = char.name;
          charId = char.id;
        }
      }
    }

    store.sendChatMessage({
      authorId: 'local-user', // Simplified for this context
      authorName,
      characterId: charId,
      isIC,
      content: inputText.trim()
    });

    setInputText('');
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div 
      className="flex flex-col h-full w-full max-w-7xl mx-auto rounded-lg overflow-hidden border border-[#3e2723] shadow-2xl relative"
      style={{ 
        backgroundImage: 'url(/tavern-background.png)', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Warm vignette overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at 50% 100%, rgba(212, 90, 0, 0.15) 0%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.85) 100%)'
      }} />

      {/* Header */}
      <div className="relative z-10 bg-black/60 backdrop-blur-sm border-b border-[#3e2723] p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="text-amber-500">🍺</div>
          <h2 className="text-xl font-serif font-bold text-amber-100 tracking-wider m-0" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            The Tavern
          </h2>
        </div>
        {onExit && (
          <button onClick={onExit} className="text-xs font-bold text-[#bcaaa4] hover:text-white uppercase tracking-wider bg-[#3e2723]/80 px-3 py-1.5 rounded transition-colors shadow-md">
            Leave Tavern
          </button>
        )}
      </div>

      {/* Chat Feed */}
      <div ref={feedRef} className="relative z-10 flex-1 overflow-y-auto p-4 flex flex-col gap-4 tavern-scrollbar">
        {messages.length === 0 && (
          <div className="m-auto text-center p-8 bg-black/40 backdrop-blur-sm rounded-lg border border-[#3e2723] shadow-xl max-w-sm">
            <h3 className="text-amber-200 font-serif text-lg mb-2">The hearth is quiet...</h3>
            <p className="text-[#a1887f] text-sm font-serif">Pull up a chair and be the first to speak.</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.isIC ? 'items-start' : 'items-end'} animate-fade-in-up`}>
            {msg.isIC ? (
              // In-Character Style (Parchment)
              <div className="flex items-end gap-3 max-w-[85%] sm:max-w-[70%]">
                {/* Stylized Crest / Portrait */}
                <div className="flex-none w-10 h-10 rounded-full bg-gradient-to-br from-[#5d4037] to-[#3e2723] border-2 border-[#8d6e63] flex items-center justify-center shadow-lg transform translate-y-2">
                  <span className="font-serif font-bold text-[#d7ccc8] text-lg" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                    {getInitials(msg.authorName)}
                  </span>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-xs font-serif font-bold text-amber-200 ml-2 mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{msg.authorName}</span>
                  <div className="bg-[#e6d0a7] text-[#2c1e16] p-4 rounded-2xl rounded-bl-none shadow-xl border border-[#c4a976]"
                       style={{ backgroundImage: 'url(/artifact-parchment-bg.png)', backgroundSize: 'cover' }}>
                    <p className="font-serif text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              </div>
            ) : (
              // Out-of-Character Style (Dark Wood/Leather Plaque)
              <div className="flex flex-col items-end max-w-[85%] sm:max-w-[70%]">
                <span className="text-xs font-sans font-bold text-gray-400 mr-2 mb-1">{msg.authorName} (OOC)</span>
                <div className="bg-[#1c1c1e]/90 backdrop-blur-md text-[#e5e5ea] p-3 rounded-2xl rounded-br-none shadow-xl border border-[#3a3a3c]">
                  <p className="font-sans text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="relative z-10 bg-[#2d1b15]/95 backdrop-blur-md border-t-2 border-[#1a0f0c] p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          
          {/* IC / OOC Toggle */}
          <button 
            onClick={() => setIsIC(!isIC)}
            className={`flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold uppercase tracking-wider text-xs transition-all shadow-inner ${
              isIC 
                ? 'bg-gradient-to-b from-[#8d6e63] to-[#5d4037] text-amber-100 border border-[#a1887f]' 
                : 'bg-gradient-to-b from-[#3a3a3c] to-[#1c1c1e] text-gray-300 border border-[#48484a]'
            }`}
          >
            {isIC ? <Scroll size={16} className="text-amber-200" /> : <MessageCircle size={16} className="text-gray-400" />}
            {isIC ? 'In Character' : 'OOC'}
          </button>

          {/* Text Input */}
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isIC ? "Speak thy mind..." : "Chat out of character..."}
            className={`flex-1 min-h-[48px] max-h-[120px] resize-y rounded-lg p-3 custom-scrollbar transition-colors ${
              isIC 
                ? 'bg-[#f4e4bc] text-[#2c1e16] placeholder:text-[#8d6e63] font-serif border border-[#c4a976] focus:ring-2 focus:ring-amber-500' 
                : 'bg-[#1c1c1e] text-white placeholder:text-gray-500 font-sans border border-[#3a3a3c] focus:ring-2 focus:ring-gray-500'
            }`}
          />

          {/* Send Button */}
          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="flex-none bg-gradient-to-br from-amber-600 to-red-900 text-amber-100 p-3 rounded-lg border border-amber-500/50 hover:from-amber-500 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center"
          >
            <Send size={20} />
          </button>

        </div>
      </div>
    </div>
  );
}
