import React, { useState } from 'react';
export interface Note { id: string; title: string; content: string; }
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

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageBase64, setImageBase64] = useState<string | undefined>();

  const handleCreateNote = () => {
    setTitle('');
    setContent('');
    setEditingNoteId(`note-${Date.now()}`);
  };

  const handleEditNote = (note: Note) => {
    setTitle(note.title);
    setContent(note.content);
    setEditingNoteId(note.id);
  };

  const handleCommitNote = () => {
    if (!editingNoteId) return;
    onSaveNote({
      id: editingNoteId,
      title: title || 'Untitled Note',
      content: content || ''
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
          className={`tab-pill ${tab === 'notes' ? 'tab-pill-active' : ''}`}
          onClick={() => { setTab('notes'); setEditingNoteId(null); setEditingHandoutId(null); }}
        >
          My Private Notes
        </button>
        <button 
          className={`tab-pill ${tab === 'handouts' ? 'tab-pill-active' : ''}`}
          onClick={() => { setTab('handouts'); setEditingNoteId(null); setEditingHandoutId(null); }}
        >
          Handouts
        </button>
      </div>

      {tab === 'notes' && (
        <div className="flex-1 flex flex-col gap-4">
          {!editingNoteId ? (
            <>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-muted-foreground">Private Campaign Notes</h3>
                <button className="btn-fantasy py-1 px-3 text-xs" onClick={handleCreateNote}>+ New Note</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {notes.map(note => (
                  <div key={note.id} className="glass-panel p-4 flex flex-col cursor-pointer hover:border-accent/40 transition-colors" onClick={() => handleEditNote(note)}>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold">{note.title}</h4>
                      <button 
                        className="text-red-500 hover:text-red-400 text-xs"
                        onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
                {notes.length === 0 && <div className="text-sm italic text-muted-foreground">No private notes yet.</div>}
              </div>
            </>
          ) : (
            <div className="glass-panel p-4 flex flex-col gap-3 flex-1">
              <input 
                type="text" 
                className="input-fantasy text-lg font-bold" 
                placeholder="Note Title..."
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
              <textarea 
                className="input-fantasy flex-1 resize-none font-mono text-sm leading-relaxed" 
                placeholder="Write your secret campaign notes here..."
                value={content}
                onChange={e => setContent(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button className="btn-ghost" onClick={() => setEditingNoteId(null)}>Cancel</button>
                <button className="btn-fantasy" onClick={handleCommitNote}>Save Note</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'handouts' && (
        <div className="flex-1 flex flex-col gap-4">
          {!editingHandoutId ? (
            <>
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-muted-foreground">Campaign Handouts</h3>
                <button className="btn-fantasy py-1 px-3 text-xs" onClick={handleCreateHandout}>+ New Handout</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {handouts.map(handout => (
                  <div key={handout.id} className="glass-panel p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold cursor-pointer hover:text-accent" onClick={() => handleEditHandout(handout)}>{handout.title}</h4>
                      <button 
                        className="text-red-500 hover:text-red-400 text-xs"
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
                      className="absolute top-2 right-2 bg-red-500 text-white rounded p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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
                <button className="btn-ghost" onClick={() => setEditingHandoutId(null)}>Cancel</button>
                <button className="btn-fantasy" onClick={handleCommitHandout}>Save Handout</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
