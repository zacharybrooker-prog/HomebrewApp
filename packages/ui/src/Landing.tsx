import { useState, useEffect } from 'react';

interface CampaignMeta {
  id: string;
  name: string;
  lastPlayed: number;
}

export function Landing({ onHost, onJoin }: { onHost: (id: string) => void; onJoin: (id: string) => void }) {
  const [view, setView] = useState<'main' | 'host' | 'join'>('main');
  const [campaigns, setCampaigns] = useState<CampaignMeta[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [newCampaignName, setNewCampaignName] = useState('');

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('frogs-world-campaigns') || '[]');
      setCampaigns(saved);
    } catch (e) {
      setCampaigns([]);
    }
  }, []);

  const saveCampaigns = (list: CampaignMeta[]) => {
    setCampaigns(list);
    localStorage.setItem('frogs-world-campaigns', JSON.stringify(list));
  };

  const handleCreateCampaign = () => {
    if (!newCampaignName.trim() || campaigns.length >= 5) return;
    const id = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCamp = { id, name: newCampaignName, lastPlayed: Date.now() };
    saveCampaigns([...campaigns, newCamp]);
    onHost(id);
  };

  const handleSelectCampaign = (id: string) => {
    const list = [...campaigns];
    const idx = list.findIndex(c => c.id === id);
    if (idx >= 0) {
      list[idx].lastPlayed = Date.now();
      saveCampaigns(list);
    }
    onHost(id);
  };

  const handleDeleteCampaign = (id: string) => {
    if (!window.confirm("Are you sure you want to delete this campaign? This cannot be undone.")) return;
    saveCampaigns(campaigns.filter(c => c.id !== id));
    // Ideally we'd also delete the IndexedDB here: indexedDB.deleteDatabase(`frogs-world-db-${id}`)
    try {
      indexedDB.deleteDatabase(`frogs-world-db-${id}`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black/90 text-white font-body p-6">
      <div className="w-full max-w-md glass-panel p-8 flex flex-col items-center animate-fade-in-up">
        <h1 className="text-4xl font-heading font-black mb-8 text-center" style={{ color: 'var(--accent)', textShadow: '0 0 20px var(--accent-glow)' }}>
          FROG'S WORLD
        </h1>

        {view === 'main' && (
          <div className="flex flex-col gap-4 w-full">
            <button onClick={() => setView('host')} className="btn-fantasy py-4 text-xl">Host Campaign</button>
            <button onClick={() => setView('join')} className="btn-ghost border-white/20 py-4 text-xl hover:bg-white/5 hover:border-white/40">Join Campaign</button>
          </div>
        )}

        {view === 'join' && (
          <div className="flex flex-col w-full animate-fade-in-up">
            <h2 className="font-heading text-xl mb-4 text-center">Enter Join Code</h2>
            <input 
              className="input-fantasy text-center text-3xl font-mono tracking-widest uppercase mb-6 py-4" 
              maxLength={4}
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              placeholder="A3F9" 
            />
            <div className="flex flex-col gap-3">
              <button onClick={() => onJoin(joinCode)} disabled={joinCode.length !== 4} className="btn-fantasy py-3">Connect</button>
              <button onClick={() => setView('main')} className="btn-ghost py-3">Back</button>
            </div>
          </div>
        )}

        {view === 'host' && (
          <div className="flex flex-col w-full animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-heading text-xl">Your Campaigns</h2>
              <span className="text-xs text-muted-foreground">{campaigns.length} / 5</span>
            </div>
            
            <div className="flex flex-col gap-3 mb-6">
              {campaigns.sort((a, b) => b.lastPlayed - a.lastPlayed).map(c => (
                <div key={c.id} className="flex flex-col p-3 rounded bg-white/5 border border-white/10 group hover:border-white/30 transition-all">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">{c.name}</span>
                    <span className="font-mono text-sm text-secondary bg-black/40 px-2 py-1 rounded">Code: {c.id}</span>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-muted-foreground">Played: {new Date(c.lastPlayed).toLocaleDateString()}</span>
                    <div className="flex gap-2">
                      <button onClick={() => handleDeleteCampaign(c.id)} className="btn-ghost text-red-400 py-1 px-3 text-xs">Delete</button>
                      <button onClick={() => handleSelectCampaign(c.id)} className="btn-fantasy py-1 px-4 text-xs">Launch</button>
                    </div>
                  </div>
                </div>
              ))}
              {campaigns.length === 0 && <div className="text-center text-muted-foreground py-4 text-sm">No campaigns yet.</div>}
            </div>

            {campaigns.length < 5 && (
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-white/10">
                <h3 className="font-heading text-sm text-muted-foreground">New Campaign</h3>
                <div className="flex gap-2">
                  <input className="input-fantasy flex-1" value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} placeholder="Campaign Name" />
                  <button onClick={handleCreateCampaign} disabled={!newCampaignName.trim()} className="btn-fantasy px-4">Create</button>
                </div>
              </div>
            )}
            
            <button onClick={() => setView('main')} className="btn-ghost py-3 mt-6 w-full">Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
