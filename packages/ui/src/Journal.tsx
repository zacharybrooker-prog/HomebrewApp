import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Mic } from 'lucide-react';
const MicIcon = Mic as any;
export interface Note { id: string; title: string; content?: string; body?: string; inGameDateString?: string; inGameDayNumber?: number; }
export interface Handout { id: string; title: string; textContent?: string; imageBase64?: string; isRevealed: boolean; }

export interface JournalProps {
  role: 'dm' | 'player';
  notes: Note[];
  handouts: Handout[];
  revealedHandouts: Handout[];
  onSaveNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onSaveHandout: (handout: Handout) => void;
  onDeleteHandout: (id: string) => void;
  onToggleReveal: (handoutId: string, isRevealed: boolean) => void;
}

export function Journal({ 
  role, notes, handouts, revealedHandouts,
  onSaveNote, onDeleteNote, onSaveHandout, onDeleteHandout, onToggleReveal 
}: JournalProps) {
  const [tab, setTab] = useState<'notes' | 'handouts'>('notes');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingHandoutId, setEditingHandoutId] = useState<string | null>(null);

  // Master-Detail State
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchDate, setSearchDate] = useState('');

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

  // Abort recording if we change notes or exit edit mode
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
      } catch (e) {
        console.error("Failed to stop recording:", e);
      }
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Failed to start recording:", e);
      }
    }
  };

  const sortedAndFilteredNotes = useMemo(() => {
    return notes
      .filter(n => {
        const keywordMatch = !searchKeyword || 
          n.title.toLowerCase().includes(searchKeyword.toLowerCase()) || 
          (n.body || n.content || '').toLowerCase().includes(searchKeyword.toLowerCase());
        const dateMatch = !searchDate || 
          (n.inGameDateString || '').toLowerCase().includes(searchDate.toLowerCase()) ||
          (n.inGameDayNumber !== undefined && String(n.inGameDayNumber).includes(searchDate));
        return keywordMatch && dateMatch;
      })
      .sort((a, b) => {
        const dayA = a.inGameDayNumber ?? 0;
        const dayB = b.inGameDayNumber ?? 0;
        return dayA - dayB; // chronological
      });
  }, [notes, searchKeyword, searchDate]);

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
      inGameDayNumber: finalDay
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
    
    // Find if it was already revealed
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
        // Compress heavily to keep Yjs payloads small
        setImageBase64(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (role === 'player') {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold text-accent border-b border-[var(--border)] pb-2 mb-4">📖 Revealed Handouts</h2>
        {revealedHandouts.length === 0 ? (
          <div className="text-muted-foreground text-sm italic">The DM has not revealed any handouts to the party yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {revealedHandouts.map(h => (
              <div key={h.id} className="glass-panel p-4 flex flex-col gap-3 border-accent/20">
                <h3 className="font-bold text-lg">{h.title}</h3>
                {h.imageBase64 && (
                  <img src={h.imageBase64} alt={h.title} className="w-full rounded-md border border-[var(--border)] object-cover" />
                )}
                {h.textContent && (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{h.textContent}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex gap-2 mb-6 border-b border-[var(--border)] pb-2">
        <button 
          className={`tab-pill min-h-[44px] ${tab === 'notes' ? 'tab-pill-active' : ''}`}
          onClick={() => { setTab('notes'); setEditingNoteId(null); setEditingHandoutId(null); }}
        >
          My Private Notes
        </button>
        <button 
          className={`tab-pill min-h-[44px] ${tab === 'handouts' ? 'tab-pill-active' : ''}`}
          onClick={() => { setTab('handouts'); setEditingNoteId(null); setEditingHandoutId(null); }}
        >
          Handouts
        </button>
      </div>

      {tab === 'notes' && (
        <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden">
          {/* LEFT COLUMN: Master List */}
          <div className={`${selectedNoteId || editingNoteId ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 flex-col gap-4 md:border-r border-[var(--border)] md:pr-4`}>
            <div className="flex flex-col gap-2">
              <input 
                type="text" 
                placeholder="Search keywords..." 
                className="input-fantasy text-sm"
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Search date (e.g. 15th of Flamerule)" 
                className="input-fantasy text-sm"
                value={searchDate}
                onChange={e => setSearchDate(e.target.value)}
              />
              <button className="btn-fantasy py-2 mt-2 min-h-[44px]" onClick={handleCreateNote}>
                + New Journal Entry
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-2">
              {sortedAndFilteredNotes.map(note => {
                const isSelected = selectedNoteId === note.id;
                return (
                  <div 
                    key={note.id} 
                    className={`p-4 border rounded cursor-pointer transition-colors min-h-[44px] ${isSelected ? 'bg-secondary/20 border-secondary' : 'glass-panel hover:bg-white/5 border-transparent'}`}
                    onClick={() => {
                      setSelectedNoteId(note.id);
                      if (editingNoteId) setEditingNoteId(null);
                    }}
                  >
                    <h4 className="font-bold text-accent truncate">{note.title}</h4>
                    {(note.inGameDateString || note.inGameDayNumber !== undefined) && (
                      <div className="text-xs text-muted-foreground italic truncate">
                        {note.inGameDateString} {note.inGameDayNumber !== undefined && `(Day ${note.inGameDayNumber})`}
                      </div>
                    )}
                  </div>
                );
              })}
              {sortedAndFilteredNotes.length === 0 && (
                <div className="text-sm italic text-muted-foreground text-center mt-8">No notes found.</div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Detail View */}
          <div className={`${!(selectedNoteId || editingNoteId) ? 'hidden md:flex' : 'flex'} w-full md:w-2/3 flex-col bg-gray-900/50 rounded-lg border border-[var(--border)] overflow-hidden relative`}>
            {editingNoteId ? (
              // EDIT MODE
              <div className="p-6 flex flex-col gap-4 flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <button className="md:hidden btn-ghost px-2 py-1 min-h-[44px]" onClick={() => setEditingNoteId(null)}>← Back</button>
                    <h3 className="font-bold text-accent">Editing Entry</h3>
                  </div>
                </div>
                <input 
                  type="text" 
                  className="input-fantasy text-xl font-bold font-serif" 
                  placeholder="Journal Title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    className="input-fantasy flex-1" 
                    placeholder="Date String (e.g. 15th of Flamerule)"
                    value={inGameDateString}
                    onChange={e => setInGameDateString(e.target.value)}
                  />
                  <input 
                    type="number" 
                    className="input-fantasy w-32" 
                    placeholder="Day #"
                    value={inGameDayNumber}
                    onChange={e => setInGameDayNumber(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
                <div className="flex flex-col flex-1 relative min-h-[200px]">
                  <button 
                    type="button"
                    onClick={hasSpeechSupport ? toggleRecording : undefined}
                    disabled={!hasSpeechSupport}
                    className={`absolute right-4 bottom-4 p-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border transition-all z-10 shadow-lg ${
                      !hasSpeechSupport 
                        ? 'border-gray-700 text-gray-600 bg-gray-900/50 cursor-not-allowed'
                        : isRecording 
                          ? 'border-pink-500 text-pink-500 animate-pulse bg-gray-900' 
                          : 'border-[var(--border)] text-muted-foreground hover:bg-white/5 bg-gray-900/50'
                    }`}
                    title={!hasSpeechSupport ? "Dictation not supported in this browser" : isRecording ? "Stop dictating" : "Start dictating"}
                  >
                    <MicIcon size={20} />
                  </button>
                  <textarea 
                    className="input-fantasy flex-1 resize-none font-serif text-base leading-relaxed p-4 pb-16" 
                    placeholder="Write your lore or campaign notes here..."
                    value={content}
                    onChange={e => setContent(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <button className="btn-ghost min-h-[44px]" onClick={() => setEditingNoteId(null)}>Cancel</button>
                  <button className="btn-fantasy min-h-[44px]" onClick={handleCommitNote}>Save Entry</button>
                </div>
              </div>
            ) : selectedNoteId ? (
              // READ MODE
              (() => {
                const note = notes.find(n => n.id === selectedNoteId);
                if (!note) {
                  return (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground italic">
                      Entry not found or was deleted remotely.
                    </div>
                  );
                }
                return (
                  <div className="p-8 flex flex-col flex-1 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-start mb-6 border-b border-[var(--border)] pb-4">
                      <div className="flex flex-col items-start gap-2">
                        <button className="md:hidden btn-ghost px-2 py-1 min-h-[44px] -ml-2" onClick={() => setSelectedNoteId(null)}>← Back</button>
                        <div>
                          <h2 className="text-3xl font-bold text-accent font-serif mb-1">{note.title}</h2>
                          {(note.inGameDateString || note.inGameDayNumber !== undefined) && (
                            <div className="text-sm text-muted-foreground italic">
                              {note.inGameDateString} {note.inGameDayNumber !== undefined && `(Day ${note.inGameDayNumber})`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-ghost text-xs min-h-[44px]" onClick={() => handleEditNote(note)}>Edit</button>
                        <button 
                          className="btn-ghost text-xs text-red-500 hover:text-red-400 min-h-[44px]"
                          onClick={() => {
                            if (confirm('Delete this entry?')) {
                              onDeleteNote(note.id);
                              setSelectedNoteId(null);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="font-serif text-lg leading-relaxed whitespace-pre-wrap text-gray-200">
                      {note.body || note.content}
                    </div>
                  </div>
                );
              })()
            ) : (
              // EMPTY STATE
              <div className="flex-1 flex items-center justify-center text-muted-foreground italic">
                Select a journal entry from the list to read.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'handouts' && (
        <div className="flex-1 flex flex-col gap-4">
          {!editingHandoutId ? (
            <>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-muted-foreground">Campaign Handouts</h3>
                <button className="btn-fantasy py-1 px-3 text-xs min-h-[44px]" onClick={handleCreateHandout}>+ New Handout</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {handouts.map(handout => (
                  <div key={handout.id} className="glass-panel p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold cursor-pointer hover:text-accent" onClick={() => handleEditHandout(handout)}>{handout.title}</h4>
                      <button 
                        className="text-red-500 hover:text-red-400 text-xs min-h-[44px] p-2"
                        onClick={(e) => { e.stopPropagation(); onDeleteHandout(handout.id); }}
                      >
                        Delete
                      </button>
                    </div>
                    {handout.imageBase64 && (
                      <div className="h-24 w-full overflow-hidden rounded border border-[var(--border)] cursor-pointer" onClick={() => handleEditHandout(handout)}>
                        <img src={handout.imageBase64} className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                    <label className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--border)] text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="checkbox-fantasy" 
                        checked={handout.isRevealed} 
                        onChange={e => onToggleReveal(handout.id, e.target.checked)}
                      />
                      <span className={handout.isRevealed ? "text-accent font-bold" : "text-muted-foreground"}>
                        {handout.isRevealed ? "👁️ Revealed to Players" : "🙈 Hidden from Players"}
                      </span>
                    </label>
                  </div>
                ))}
                {handouts.length === 0 && <div className="text-sm italic text-muted-foreground">No handouts yet.</div>}
              </div>
            </>
          ) : (
            <div className="glass-panel p-4 flex flex-col gap-3 flex-1">
              <input 
                type="text" 
                className="input-fantasy text-lg font-bold" 
                placeholder="Handout Title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              
              <div className="p-4 border border-dashed border-[var(--border)] rounded-lg text-center flex flex-col items-center gap-2 bg-black/20">
                {imageBase64 ? (
                  <div className="relative group">
                    <img src={imageBase64} className="max-h-48 rounded border border-[var(--border)]" />
                    <button 
                      className="absolute top-2 right-2 bg-red-500 text-white rounded p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity min-h-[44px] min-w-[44px]"
                      onClick={() => setImageBase64(undefined)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-muted-foreground mb-2">Upload an image for this handout (Map, Letter, Art)</div>
                    <label className="btn-ghost cursor-pointer">
                      Choose Image
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </>
                )}
              </div>

              <textarea 
                className="input-fantasy flex-1 resize-none text-sm leading-relaxed mt-2" 
                placeholder="Optional text description or letter contents..."
                value={content}
                onChange={e => setContent(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button className="btn-ghost min-h-[44px]" onClick={() => setEditingHandoutId(null)}>Cancel</button>
                <button className="btn-fantasy min-h-[44px]" onClick={handleCommitHandout}>Save Handout</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
