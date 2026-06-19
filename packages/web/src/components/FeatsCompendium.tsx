import { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import type { Feat } from '@frogs-world/shared/src/schema';

export function FeatsCompendium() {
  const [feats, setFeats] = useState<Feat[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFeat, setSelectedFeat] = useState<Feat | null>(null);

  // Fetch feats from Firestore
  useEffect(() => {
    // No .limit() constraint! Pull the entire collection.
    const q = query(collection(db, 'feats'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allFeats = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          name: String(data.name || ''),
          description: String(data.description || ''),
          prerequisite: String(data.prerequisite || '')
        } as unknown as Feat;
      });
      setFeats(allFeats.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))));
    });
    return () => unsubscribe();
  }, []);

  const filteredFeats = useMemo(() => {
    return feats.filter(f => !searchQuery || String(f.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [feats, searchQuery]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      {/* HEADER CONTROLS */}
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10">
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
          <input 
            type="text" 
            placeholder="Search feats..." 
            className="input-fantasy min-w-[200px]"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* LIST RENDERING */}
      <div className="glass-panel p-2 flex-1">
        <div className="grid grid-cols-[1fr_200px] gap-4 px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-[var(--border)]">
          <div>Feat Name</div>
          <div>Prerequisite</div>
        </div>
        <div className="flex flex-col max-h-[600px] overflow-y-auto custom-scrollbar">
          {filteredFeats.map(feat => (
            <div 
              key={feat.id} 
              className="grid grid-cols-[1fr_200px] gap-4 px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors items-center"
              onClick={() => setSelectedFeat(feat)}
            >
              <div className="font-bold text-accent">{feat.name}</div>
              <div className="text-sm text-yellow-500/80 italic">{feat.prerequisite || 'None'}</div>
            </div>
          ))}
          {filteredFeats.length === 0 && <div className="text-center py-8 text-muted-foreground italic">No feats found.</div>}
        </div>
      </div>

      {/* READ OVERLAY */}
      {selectedFeat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in-up" onClick={() => setSelectedFeat(null)}>
          <div 
            className="glass-panel max-w-2xl w-full max-h-[90vh] flex flex-col relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setSelectedFeat(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-white text-xl z-10">✕</button>
            <div className="p-6 border-b border-[var(--border)] bg-black/40">
              <h2 className="font-heading text-3xl text-accent mb-1">{selectedFeat.name}</h2>
              {selectedFeat.prerequisite && (
                <div className="text-sm italic text-yellow-500/80 mt-2 uppercase tracking-widest">
                  Prerequisite: {selectedFeat.prerequisite}
                </div>
              )}
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar text-sm">
              <div className="whitespace-pre-wrap leading-relaxed">
                {selectedFeat.description}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
