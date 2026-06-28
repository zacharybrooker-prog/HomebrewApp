import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
const MicIcon = Mic as any;

export interface Note { 
  id: string; 
  title: string; 
  content?: string; 
  body?: string; 
  inGameDateString?: string; 
  inGameDayNumber?: number; 
  category?: string; 
  authorId?: string; 
}

export interface Handout { 
  id: string; 
  title: string; 
  textContent?: string; 
  imageBase64?: string; 
  isRevealed: boolean; 
}

export interface JournalProps {
  role: 'dm' | 'player';
  activeCharId?: string | null;
  notes: Note[];
  handouts: Handout[];
  revealedHandouts: Handout[];
  onSaveNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onSaveHandout: (handout: Handout) => void;
  onDeleteHandout: (id: string) => void;
  onToggleReveal: (handoutId: string, isRevealed: boolean) => void;
}

const TABS = ['Campaign Lore', 'Session Notes', 'NPCs', 'Custom Recipes', 'Handouts'];

export function Journal({ 
  role, activeCharId, notes, handouts, revealedHandouts,
  onSaveNote, onDeleteNote, onSaveHandout, onDeleteHandout, onToggleReveal 
}: JournalProps) {
  const [activeTab, setActiveTab] = useState<string>('Campaign Lore');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingHandoutId, setEditingHandoutId] = useState<string | null>(null);

  // Master-Detail State
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [inGameDateString, setInGameDateString] = useState('');
  const [inGameDayNumber, setInGameDayNumber] = useState<number | ''>('');
  const [imageBase64, setImageBase64] = useState<string | undefined>();

  const [isRecording, setIsRecording] = useState(false);
  const [hasSpeechSupport, setHasSpeechSupport] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setContent(prev => {
              const prevTrimmed = prev.trim();
              const transcript = event.results[i][0].transcript.trim();
              if (!prevTrimmed) return transcript;
              return prevTrimmed + ' ' + transcript;
            });
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      setHasSpeechSupport(true);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (!editingNoteId && recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.abort();
        setIsRecording(false);
      } catch (e) {}
    }
  }, [editingNoteId, isRecording]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    
    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {}
    }
  };

  const filteredNotes = useMemo(() => {
    return notes
      .filter(n => {
        // Players only see their own notes. DM sees their own notes.
        const currentAuthor = role === 'dm' ? 'dm' : (activeCharId || 'unknown');
        return n.authorId === currentAuthor;
      })
      .filter(n => (n.category || 'Campaign Lore') === activeTab)
      .filter(n => {
        if (!searchKeyword) return true;
        return n.title.toLowerCase().includes(searchKeyword.toLowerCase()) || 
               (n.body || n.content || '').toLowerCase().includes(searchKeyword.toLowerCase());
      })
      .sort((a, b) => {
        const dayA = a.inGameDayNumber ?? 0;
        const dayB = b.inGameDayNumber ?? 0;
        return dayA - dayB; // chronological
      });
  }, [notes, activeTab, searchKeyword, role, activeCharId]);

  const handleCreateNote = () => {
    setTitle('');
    setContent('');
    setInGameDateString('');
    setInGameDayNumber('');
    const newId = `note-${Date.now()}`;
    setEditingNoteId(newId);
    setSelectedNoteId(newId);
  };

  const handleEditNote = (note: Note) => {
    setTitle(note.title);
    setContent(note.body || note.content || '');
    setInGameDateString(note.inGameDateString || '');
    setInGameDayNumber(note.inGameDayNumber ?? '');
    setEditingNoteId(note.id);
  };

  const handleCommitNote = () => {
    if (!editingNoteId) return;
    
    let finalDay: number | undefined = undefined;
    if (inGameDayNumber !== '') {
      const parsed = Number(inGameDayNumber);
      if (!isNaN(parsed)) finalDay = parsed;
    }

    onSaveNote({
      id: editingNoteId,
      title: title || 'Untitled Note',
      body: content || '',
      content: content || '',
      inGameDateString: inGameDateString || undefined,
      inGameDayNumber: finalDay,
      category: activeTab,
      authorId: role === 'dm' ? 'dm' : (activeCharId || 'unknown')
    });
    setEditingNoteId(null);
  };

  const handleCreateHandout = () => {
    setTitle('');
    setContent('');
    setImageBase64(undefined);
    setEditingHandoutId(`handout-${Date.now()}`);
  };

  const handleEditHandout = (handout: Handout) => {
    setTitle(handout.title);
    setContent(handout.textContent || '');
    setImageBase64(handout.imageBase64);
    setEditingHandoutId(handout.id);
  };

  const handleCommitHandout = () => {
    if (!editingHandoutId) return;
    const existing = handouts.find(h => h.id === editingHandoutId);
    
    onSaveHandout({
      id: editingHandoutId,
      title: title || 'Untitled Handout',
      textContent: content || undefined,
      imageBase64: imageBase64,
      isRevealed: existing ? existing.isRevealed : false
    });
    setEditingHandoutId(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;
        if (width > height && width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setImageBase64(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const isHandoutsTab = activeTab === 'Handouts';

  return (
    <div className="flex flex-col md:flex-row w-full h-full min-h-[60vh] max-w-7xl mx-auto rounded-lg overflow-hidden bg-[#121212] border border-[#2a2a2a] shadow-2xl font-sans text-gray-200">
      
      {/* LEFT COLUMN: Tabs & Master List (The "Index Page") */}
      <div className={`w-full md:w-1/3 flex flex-col bg-[#1A1A1A] border-r border-[#2a2a2a] md:min-h-[70vh] shadow-[inset_-10px_0_20px_rgba(0,0,0,0.5)] z-10 
        ${(selectedNoteId || editingNoteId || editingHandoutId) ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Mobile Tabs: Sticky Horizontal Bar */}
        <div className="md:hidden flex overflow-x-auto custom-scrollbar bg-[#121212] border-b border-[#2a2a2a] sticky top-0 z-20">
          {TABS.map(tabName => (
            <button
              key={tabName}
              onClick={() => { setActiveTab(tabName); setEditingNoteId(null); setSelectedNoteId(null); setEditingHandoutId(null); }}
              className={`flex-none px-4 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                activeTab === tabName ? 'text-red-500 border-b-2 border-red-500 bg-[#242424]' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tabName}
            </button>
          ))}
        </div>

        {/* Desktop Layout Inner: Side Tabs + List */}
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop Vertical Tabs */}
          <div className="hidden md:flex flex-col w-12 border-r border-[#2a2a2a] bg-[#121212] overflow-hidden">
            {TABS.map((tabName) => (
              <button
                key={tabName}
                onClick={() => { setActiveTab(tabName); setEditingNoteId(null); setSelectedNoteId(null); setEditingHandoutId(null); }}
                className={`flex items-center justify-center h-40 w-12 border-b border-[#2a2a2a] transition-colors relative group ${
                  activeTab === tabName ? 'bg-[#242424]' : 'hover:bg-[#1a1a1a]'
                }`}
              >
                <div 
                  className={`origin-center -rotate-90 whitespace-nowrap text-xs font-bold uppercase tracking-widest ${
                    activeTab === tabName ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'text-gray-600 group-hover:text-gray-400'
                  }`}
                >
                  {tabName}
                </div>
                {activeTab === tabName && (
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                )}
              </button>
            ))}
          </div>

          {/* List Area */}
          <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar bg-[#1A1A1A]">
            <h2 className="text-xl font-bold mb-4 text-white uppercase tracking-wider">{activeTab}</h2>
            
            {!isHandoutsTab && (
              <>
                <input 
                  type="text" 
                  placeholder="Search entries..." 
                  className="w-full bg-[#242424] border border-[#333] rounded px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none mb-4 shadow-inner"
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                />
                <button 
                  className="w-full bg-[#242424] hover:bg-[#2a2a2a] border border-[#333] rounded py-2 text-sm font-bold text-gray-300 transition-colors mb-4 shadow-sm"
                  onClick={handleCreateNote}
                >
                  + New Entry
                </button>
                
                <div className="flex flex-col gap-2">
                  {filteredNotes.map(note => {
                    const isSelected = selectedNoteId === note.id;
                    return (
                      <div 
                        key={note.id} 
                        className={`p-3 rounded border cursor-pointer transition-all ${
                          isSelected ? 'bg-[#242424] border-red-900/50 shadow-md' : 'bg-[#121212] border-[#222] hover:border-[#333]'
                        }`}
                        onClick={() => { setSelectedNoteId(note.id); setEditingNoteId(null); }}
                      >
                        <h4 className="font-bold text-gray-200 truncate">{note.title}</h4>
                        {(note.inGameDateString || note.inGameDayNumber !== undefined) && (
                          <div className="text-xs text-gray-500 italic mt-1">
                            {note.inGameDateString} {note.inGameDayNumber !== undefined && `(Day ${note.inGameDayNumber})`}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredNotes.length === 0 && (
                    <div className="text-sm italic text-gray-600 text-center mt-8">No entries found.</div>
                  )}
                </div>
              </>
            )}

            {isHandoutsTab && (
              <div className="flex flex-col gap-4">
                {role === 'dm' && (
                  <button 
                    className="w-full bg-[#242424] hover:bg-[#2a2a2a] border border-[#333] rounded py-2 text-sm font-bold text-gray-300 transition-colors shadow-sm"
                    onClick={handleCreateHandout}
                  >
                    + New Handout
                  </button>
                )}
                
                {role === 'dm' ? (
                  handouts.map(h => (
                    <div key={h.id} className="p-3 bg-[#121212] rounded border border-[#222] hover:border-[#333] flex flex-col gap-2 transition-all">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-200 cursor-pointer hover:text-red-400" onClick={() => handleEditHandout(h)}>{h.title}</h4>
                        <button className="text-gray-500 hover:text-red-500 text-xs" onClick={() => onDeleteHandout(h.id)}>✕</button>
                      </div>
                      {h.imageBase64 && (
                        <div className="h-16 w-full overflow-hidden rounded border border-[#333] cursor-pointer" onClick={() => handleEditHandout(h)}>
                          <img src={h.imageBase64} className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                      <label className="flex items-center gap-2 mt-2 pt-2 border-t border-[#222] text-xs cursor-pointer">
                        <input type="checkbox" checked={h.isRevealed} onChange={e => onToggleReveal(h.id, e.target.checked)} className="rounded border-gray-600 bg-[#222] text-red-500 focus:ring-red-500" />
                        <span className={h.isRevealed ? "text-red-400 font-bold" : "text-gray-500"}>
                          {h.isRevealed ? "👁️ Revealed" : "🙈 Hidden"}
                        </span>
                      </label>
                    </div>
                  ))
                ) : (
                  revealedHandouts.map(h => (
                    <div key={h.id} className="p-3 bg-[#121212] rounded border border-[#222] flex flex-col gap-2 shadow-md">
                      <h4 className="font-bold text-gray-200">{h.title}</h4>
                      {h.imageBase64 && <img src={h.imageBase64} className="w-full rounded border border-[#333]" />}
                      {h.textContent && <p className="text-sm text-gray-400 mt-2 whitespace-pre-wrap">{h.textContent}</p>}
                    </div>
                  ))
                )}
                {role === 'dm' && handouts.length === 0 && <div className="text-sm italic text-gray-600 text-center mt-8">No handouts created.</div>}
                {role === 'player' && revealedHandouts.length === 0 && <div className="text-sm italic text-gray-600 text-center mt-8">No handouts revealed yet.</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Active Editor/Viewer (The "Reading Page") */}
      <div className={`w-full md:w-2/3 flex flex-col bg-[#242424] relative shadow-[inset_10px_0_20px_rgba(0,0,0,0.3)]
        ${!(selectedNoteId || editingNoteId || editingHandoutId) ? 'hidden md:flex' : 'flex'}`}>
        
        {editingNoteId ? (
          // NOTE EDIT MODE
          <div className="p-6 md:p-10 flex flex-col flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <button className="md:hidden text-gray-400 hover:text-white flex items-center gap-1 text-sm font-bold uppercase tracking-wider" onClick={() => setEditingNoteId(null)}>← Back</button>
              <div className="text-xs font-bold text-red-500 uppercase tracking-widest hidden md:block">Editing Mode</div>
            </div>
            
            <input 
              type="text" 
              className="w-full bg-transparent border-b border-[#444] text-3xl font-bold font-serif text-white pb-2 mb-6 focus:outline-none focus:border-red-500 transition-colors" 
              placeholder="Entry Title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            
            <div className="flex gap-4 mb-6">
              <input 
                type="text" 
                className="flex-1 bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-red-500" 
                placeholder="In-game Date (e.g. 15th of Flamerule)"
                value={inGameDateString}
                onChange={e => setInGameDateString(e.target.value)}
              />
              <input 
                type="number" 
                className="w-24 bg-[#1A1A1A] border border-[#333] rounded px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-red-500" 
                placeholder="Day #"
                value={inGameDayNumber}
                onChange={e => setInGameDayNumber(e.target.value ? Number(e.target.value) : '')}
              />
            </div>
            
            <div className="flex-1 relative flex flex-col min-h-[300px] bg-[#1A1A1A] rounded-lg border border-[#333] p-1 shadow-inner">
              <button 
                type="button"
                onClick={hasSpeechSupport ? toggleRecording : undefined}
                disabled={!hasSpeechSupport}
                className={`absolute right-4 bottom-4 p-3 flex items-center justify-center rounded-full border transition-all z-10 shadow-lg ${
                  !hasSpeechSupport 
                    ? 'border-[#444] text-[#444] bg-[#222] cursor-not-allowed'
                    : isRecording 
                      ? 'border-red-500 text-red-500 bg-[#121212] animate-pulse' 
                      : 'border-[#444] text-gray-400 hover:text-white hover:bg-[#333] bg-[#222]'
                }`}
                title={!hasSpeechSupport ? "Dictation not supported" : isRecording ? "Stop dictating" : "Start dictating"}
              >
                <MicIcon size={18} />
              </button>
              <textarea 
                className="flex-1 w-full bg-transparent resize-none font-serif text-lg leading-relaxed text-gray-300 p-4 pb-16 focus:outline-none" 
                placeholder="Transcribe your lore, notes, or secrets here..."
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-6 py-2 rounded font-bold text-sm text-gray-400 hover:bg-[#333] transition-colors" onClick={() => setEditingNoteId(null)}>Cancel</button>
              <button className="px-6 py-2 rounded font-bold text-sm bg-red-900/50 text-red-200 border border-red-900 hover:bg-red-900/80 transition-colors shadow-[0_0_15px_rgba(153,27,27,0.4)]" onClick={handleCommitNote}>Save Entry</button>
            </div>
          </div>
        ) : selectedNoteId ? (
          // NOTE READ MODE
          (() => {
            const note = notes.find(n => n.id === selectedNoteId);
            if (!note) {
              return (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                  <div className="text-4xl mb-4 opacity-20">📜</div>
                  Entry not found.
                </div>
              );
            }
            return (
              <div className="p-6 md:p-10 flex flex-col flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-start mb-8 pb-6 border-b border-[#333]">
                  <div className="flex flex-col gap-2">
                    <button className="md:hidden text-gray-400 hover:text-white flex items-center gap-1 text-xs font-bold uppercase tracking-wider mb-2" onClick={() => setSelectedNoteId(null)}>← Back</button>
                    <h2 className="text-4xl font-bold text-white font-serif tracking-wide">{note.title}</h2>
                    {(note.inGameDateString || note.inGameDayNumber !== undefined) && (
                      <div className="text-sm text-gray-400 italic">
                        {note.inGameDateString} {note.inGameDayNumber !== undefined && `(Day ${note.inGameDayNumber})`}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button className="px-3 py-1.5 rounded bg-[#333] text-gray-300 hover:bg-[#444] text-xs font-bold uppercase tracking-wider transition-colors" onClick={() => handleEditNote(note)}>Edit</button>
                    <button 
                      className="px-3 py-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/60 border border-red-900/50 text-xs font-bold uppercase tracking-wider transition-colors"
                      onClick={() => {
                        if (confirm('Permanently delete this entry?')) {
                          onDeleteNote(note.id);
                          setSelectedNoteId(null);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="font-serif text-lg leading-relaxed whitespace-pre-wrap text-gray-300 px-2 md:px-8">
                  {note.body || note.content}
                </div>
              </div>
            );
          })()
        ) : editingHandoutId ? (
          // HANDOUT EDIT MODE
          <div className="p-6 md:p-10 flex flex-col flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <button className="md:hidden text-gray-400 hover:text-white flex items-center gap-1 text-sm font-bold uppercase tracking-wider" onClick={() => setEditingHandoutId(null)}>← Back</button>
              <div className="text-xs font-bold text-red-500 uppercase tracking-widest hidden md:block">Handout Editor</div>
            </div>
            
            <input 
              type="text" 
              className="w-full bg-transparent border-b border-[#444] text-2xl font-bold text-white pb-2 mb-6 focus:outline-none focus:border-red-500 transition-colors" 
              placeholder="Handout Title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            
            <div className="mb-6 p-6 border-2 border-dashed border-[#444] rounded-lg text-center flex flex-col items-center justify-center min-h-[200px] bg-[#1A1A1A] transition-colors hover:border-[#555]">
              {imageBase64 ? (
                <div className="relative group max-w-full">
                  <img src={imageBase64} className="max-h-64 object-contain rounded shadow-lg border border-[#333]" alt="Preview" />
                  <button 
                    className="absolute top-2 right-2 bg-red-600/90 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    onClick={() => setImageBase64(undefined)}
                    title="Remove Image"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-sm text-gray-400 mb-4">Upload an image for this handout (Map, Letter, Art)</div>
                  <label className="px-4 py-2 bg-[#333] hover:bg-[#444] text-white rounded font-bold text-sm cursor-pointer transition-colors shadow-md">
                    Choose Image
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </>
              )}
            </div>

            <textarea 
              className="w-full min-h-[150px] bg-[#1A1A1A] border border-[#333] rounded-lg p-4 text-gray-300 focus:outline-none focus:border-red-500 resize-y shadow-inner" 
              placeholder="Optional text description or letter contents..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
            
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-6 py-2 rounded font-bold text-sm text-gray-400 hover:bg-[#333] transition-colors" onClick={() => setEditingHandoutId(null)}>Cancel</button>
              <button className="px-6 py-2 rounded font-bold text-sm bg-red-900/50 text-red-200 border border-red-900 hover:bg-red-900/80 transition-colors shadow-[0_0_15px_rgba(153,27,27,0.4)]" onClick={handleCommitHandout}>Save Handout</button>
            </div>
          </div>
        ) : (
          // EMPTY STATE (Nothing selected)
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 opacity-50">
            <div className="w-16 h-16 mb-4 border-2 border-dashed border-gray-600 rounded-full flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
            </div>
            <div className="font-serif italic text-lg tracking-wide">
              {isHandoutsTab ? "Select a handout to view" : "Select an entry to read"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
