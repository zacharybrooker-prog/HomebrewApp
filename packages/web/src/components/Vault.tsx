import { useState, useEffect } from 'react';
import { auth, db, googleProvider, discordProvider } from '../firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, signInAnonymously } from 'firebase/auth';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { ManualCreator, GuidedCreator } from './CharacterCreator';
import { DndBeyondImport } from './DndBeyondImport';

export function Vault({ onHost, onJoin }: { onHost: (id: string) => void, onJoin: (id: string, char?: any) => void }) {
  const [user, setUser] = useState(auth.currentUser);
  const [characters, setCharacters] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [view, setView] = useState<'login' | 'vault' | 'create-choice' | 'manual' | 'guided' | 'import'>('login');
  const [editingCharacter, setEditingCharacter] = useState<any>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    let unsubSnapshot: () => void;
    let unsubCampaigns: () => void;
    
    const unsubAuth = auth.onAuthStateChanged(u => {
      setUser(u);
      if (u) {
        setView('vault');
        const q = query(collection(db, `users/${u.uid}/characters`));
        unsubSnapshot = onSnapshot(q, (snap) => {
          setCharacters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        const cQ = query(collection(db, `users/${u.uid}/campaigns`));
        unsubCampaigns = onSnapshot(cQ, (snap) => {
          setCampaigns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
      } else {
        setView('login');
        if (unsubSnapshot) unsubSnapshot();
        if (unsubCampaigns) unsubCampaigns();
      }
    });
    
    return () => {
      unsubAuth();
      if (unsubSnapshot) unsubSnapshot();
      if (unsubCampaigns) unsubCampaigns();
    };
  }, []);

  const handleCreateCampaign = async () => {
    if (!user) return;
    const name = prompt("Enter a name for your new campaign:");
    if (!name || name.trim() === "") return;
    
    const newCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    await addDoc(collection(db, `users/${user.uid}/campaigns`), {
      name,
      code: newCode,
      createdAt: new Date().toISOString()
    });
    onHost(newCode);
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!user) return;
    if (confirm("Are you sure you want to remove this campaign from your Vault?")) {
      await deleteDoc(doc(db, `users/${user.uid}/campaigns`, id));
    }
  };

  const handleGoogle = async () => {
    try { await signInWithPopup(auth, googleProvider); } catch (e) { console.error(e); }
  };

  const handleDiscord = async () => {
    try { await signInWithPopup(auth, discordProvider); } catch (e) { console.error(e); }
  };

  const handleAnonymous = async () => {
    try { await signInAnonymously(auth); } catch (e: any) { 
       console.error(e);
       if (e.code === 'auth/unauthorized-domain') {
          alert("Error: This domain is not authorized in Firebase. Please add this URL to your Firebase Console under Authentication -> Settings -> Authorized Domains.");
       }
    }
  };

  const handleEmailLogin = async () => {
    try { await signInWithEmailAndPassword(auth, email, password); } 
    catch (e) {
      try { await createUserWithEmailAndPassword(auth, email, password); }
      catch (e2) { alert("Failed to login or create account."); }
    }
  };

  const handleSaveCharacter = async (charData: any) => {
    if (!user) return;
    
    // If editing, charData might have an id
    if (editingCharacter && editingCharacter.id) {
      try {
        await updateDoc(doc(db, `users/${user.uid}/characters/${editingCharacter.id}`), {
           ...charData.activeCharacter,
           stats: charData.stats,
           hp: charData.hp
        });
        setEditingCharacter(null);
        setView('vault');
      } catch (e) {
        console.error(e);
        alert("Failed to update character");
      }
      return;
    }

    if (characters.length >= 3) {
      alert("You can only have 3 characters.");
      setView('vault');
      return;
    }
    try {
      const charsRef = collection(db, `users/${user.uid}/characters`);
      await addDoc(charsRef, {
         ...charData.activeCharacter,
         stats: charData.stats,
         hp: charData.hp
      });
      setView('vault');
    } catch (e) {
      console.error(e);
      alert("Failed to save character");
    }
  };

  const handleDeleteCharacter = async (charId: string) => {
    if (!user) return;
    if (confirm("Are you sure you want to delete this character forever?")) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/characters/${charId}`));
      } catch (e) {
        console.error(e);
        alert("Failed to delete character");
      }
    }
  };

  const handleJoinCampaign = async (campaignId: string, char: any) => {
    if (user) {
      try {
        await updateDoc(doc(db, `users/${user.uid}/characters/${char.id}`), { lastCampaignId: campaignId });
      } catch (e) { console.error(e); }
    }
    onJoin(campaignId, char);
  };

  if (view === 'login') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black/90 text-white font-body p-6" style={{ backgroundImage: 'url(/artifact-leather-bg.png)', backgroundSize: 'cover', boxShadow: 'inset 0 0 200px rgba(0,0,0,0.95)' }}>
        <div className="w-full max-w-md p-8 flex flex-col items-center rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(255,255,255,0.05)] border border-yellow-900/50" style={{ background: 'linear-gradient(135deg, rgba(28,25,23,0.95), rgba(12,10,9,0.95))' }}>
          <h1 className="text-4xl font-heading font-black mb-8 text-center text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            FROG'S WORLD
          </h1>
          <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-6">Authenticate to enter</h2>
          
          <input className="w-full bg-stone-900/80 border border-stone-800 text-stone-200 px-4 py-3 rounded mb-3 focus:outline-none focus:border-yellow-700 transition-colors" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="w-full bg-stone-900/80 border border-stone-800 text-stone-200 px-4 py-3 rounded mb-6 focus:outline-none focus:border-yellow-700 transition-colors" placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          
          <button onClick={handleEmailLogin} className="w-full py-3 bg-yellow-900 hover:bg-yellow-800 text-stone-100 font-bold uppercase tracking-widest rounded shadow-md transition-colors mb-4 border border-yellow-700">Login / Sign Up</button>
          
          <div className="flex items-center w-full mb-4">
            <div className="flex-1 border-t border-stone-800"></div>
            <span className="px-3 text-xs uppercase text-stone-500 font-bold tracking-widest">OR</span>
            <div className="flex-1 border-t border-stone-800"></div>
          </div>

          <div className="flex gap-4 w-full mb-4">
            <button onClick={handleGoogle} className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold uppercase tracking-widest rounded transition-colors text-xs border border-stone-700">Google</button>
            <button onClick={handleDiscord} className="flex-1 py-3 bg-[#5865F2]/20 hover:bg-[#5865F2]/40 text-[#5865F2] font-bold uppercase tracking-widest rounded transition-colors text-xs border border-[#5865F2]/50">Discord</button>
          </div>
          
          <button onClick={handleAnonymous} className="w-full py-4 bg-stone-900/50 hover:bg-stone-800 text-stone-400 hover:text-yellow-500 font-bold uppercase tracking-widest rounded transition-colors text-xs border border-stone-800 border-dashed">
            Play as Guest (Saves to device)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-black/90 text-white font-body p-6" style={{ backgroundImage: 'url(/artifact-leather-bg.png)', backgroundSize: 'cover', boxShadow: 'inset 0 0 200px rgba(0,0,0,0.95)' }}>
      <div className="w-full max-w-4xl flex justify-between items-center mb-12 mt-6">
        <h1 className="text-3xl font-heading font-black text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
          FROG'S WORLD
        </h1>
        <button onClick={() => signOut(auth)} className="text-xs uppercase font-bold tracking-widest text-stone-500 hover:text-stone-300 transition-colors">Sign Out</button>
      </div>

      {view === 'vault' && (
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-end mb-6 border-b-2 border-yellow-900/50 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-stone-200 drop-shadow-md">Character Vault</h2>
              <p className="text-sm text-stone-500 mt-1">{characters.length} / 3 Characters Created</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <input 
                  className="input-fantasy w-24 text-center font-mono uppercase tracking-widest text-xs" 
                  maxLength={4}
                  placeholder="CODE"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                />
                <button onClick={() => joinCode.length === 4 && onJoin(joinCode)} disabled={joinCode.length !== 4} className="btn-gold px-4 py-2 text-xs disabled:opacity-50">Join</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {/* Render 3 slots */}
            {[0, 1, 2].map(i => {
              const char = characters[i];
              if (char) {
                return (
                  <div key={char.id} className="tome-card h-96 p-6 flex flex-col relative group cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 rounded-lg pointer-events-none"></div>
                    <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => {
                          setEditingCharacter({
                             id: char.id,
                             activeCharacter: { name: char.name, charClass: char.charClass, race: char.race, level: char.level, proficiencies: char.proficiencies || [] },
                             stats: char.stats,
                             hp: char.hp
                          });
                          setView('manual');
                       }} className="w-8 h-8 flex items-center justify-center bg-stone-800 text-stone-300 hover:text-yellow-500 rounded-full border border-stone-600 shadow-md">
                         ✎
                       </button>
                       <button onClick={() => handleDeleteCharacter(char.id)} className="w-8 h-8 flex items-center justify-center bg-stone-800 text-stone-300 hover:text-red-500 rounded-full border border-stone-600 shadow-md">
                         ✕
                       </button>
                    </div>
                    {/* Text Stage Container */}
                    <div className="relative z-10 flex flex-col items-center justify-center p-4 mt-8 mx-2 rounded-lg border border-yellow-900/30" 
                         style={{ 
                           background: 'linear-gradient(to bottom, rgba(15,15,15,0.8), rgba(0,0,0,0.4))',
                           backdropFilter: 'blur(3px)',
                           boxShadow: '0 4px 15px rgba(0,0,0,0.8)'
                         }}>
                      <h3 className="font-bold text-yellow-500 text-center leading-tight w-full" 
                          style={{ 
                            fontSize: 'clamp(1.2rem, 5vw, 1.7rem)',
                            textShadow: '2px 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(234,179,8,0.3)',
                            wordWrap: 'break-word'
                          }}>
                        {char.name || 'Unnamed'}
                      </h3>
                      <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mt-2 text-center" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                         {char.race || 'Unknown'} {char.charClass}
                      </p>
                      <div className="mt-3 flex gap-2">
                         <span className="px-3 py-1 bg-stone-900/90 rounded border border-stone-700 text-xs text-stone-300 font-mono shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">LVL {char.level || 1}</span>
                      </div>
                    </div>
                    
                    <div className="relative z-10 flex gap-2 mt-auto pt-4">
                      <button onClick={() => {
                        const newCampaignId = prompt("Enter the 4-digit code of the new campaign to join with this character:", "");
                        if (newCampaignId && newCampaignId.length === 4) {
                           handleJoinCampaign(newCampaignId.toUpperCase(), char);
                        }
                      }} className="btn-fantasy flex-1 py-3 text-xs mr-2">Join New</button>
                      <button onClick={() => handleJoinCampaign(char.lastCampaignId || 'NONE', char)} disabled={!char.lastCampaignId} className="btn-gold flex-1 py-3 text-xs disabled:opacity-50">Rejoin Last</button>
                    </div>
                  </div>
                );
              } else {
                return (
                  <div onClick={() => setView('create-choice')} key={`empty-${i}`} className="h-96 rounded-lg flex items-center justify-center cursor-pointer group shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_0_50px_rgba(0,0,0,0.9)] transition-all hover:shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_0_50px_rgba(234,179,8,0.2)] border-2 border-dashed border-stone-800 hover:border-yellow-700/50 bg-black/40">
                     <div className="flex flex-col items-center">
                       <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all group-hover:scale-110 shadow-[0_0_20px_rgba(0,0,0,0.8)] border border-stone-800 group-hover:border-yellow-700 group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] bg-stone-900">
                         <span className="text-3xl text-stone-600 group-hover:text-yellow-500 drop-shadow-md">+</span>
                       </div>
                       <span className="text-xs uppercase font-bold tracking-widest text-stone-600 group-hover:text-yellow-600 transition-colors">Create Character</span>
                     </div>
                  </div>
                );
              }
            })}
          </div>
          </div>

          {/* Hosted Campaigns Section */}
          <div className="mt-16">
            <div className="flex justify-between items-end mb-6 border-b-2 border-yellow-900/50 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-stone-200 drop-shadow-md">Hosted Campaigns</h2>
                <p className="text-sm text-stone-500 mt-1">{campaigns.length} / 3 Campaigns Hosted</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[0, 1, 2].map(i => {
                const camp = campaigns[i];
                if (camp) {
                  return (
                    <div key={camp.id} className="tome-card h-64 p-6 flex flex-col relative group cursor-pointer">
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 rounded-lg pointer-events-none"></div>
                      <div className="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => handleDeleteCampaign(camp.id)} className="w-8 h-8 flex items-center justify-center bg-stone-800 text-stone-300 hover:text-red-500 rounded-full border border-stone-600 shadow-md">
                           ✕
                         </button>
                      </div>
                      {/* Text Stage Container */}
                      <div className="relative z-10 flex flex-col items-center justify-center p-4 mt-8 mx-2 rounded-lg border border-yellow-900/30"
                           style={{ 
                             background: 'linear-gradient(to bottom, rgba(15,15,15,0.8), rgba(0,0,0,0.4))',
                             backdropFilter: 'blur(3px)',
                             boxShadow: '0 4px 15px rgba(0,0,0,0.8)'
                           }}>
                        <h3 className="font-bold text-yellow-500 text-center leading-tight w-full"
                            style={{ 
                              fontSize: 'clamp(1.2rem, 5vw, 1.7rem)',
                              textShadow: '2px 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(234,179,8,0.3)',
                              wordWrap: 'break-word'
                            }}>
                          {camp.name}
                        </h3>
                        <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mt-2 text-center" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>Room Code</p>
                        <div className="mt-3 flex gap-2">
                           <span className="px-4 py-2 bg-stone-900/90 rounded border border-stone-700 text-lg text-stone-300 font-mono tracking-widest shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">{camp.code}</span>
                        </div>
                      </div>
                      
                      <div className="relative z-10 flex gap-2 mt-auto pt-4">
                        <button onClick={() => onHost(camp.code)} className="btn-gold flex-1 py-3 text-xs">Resume Campaign</button>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div onClick={handleCreateCampaign} key={`empty-camp-${i}`} className="h-64 rounded-lg flex items-center justify-center cursor-pointer group shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_0_50px_rgba(0,0,0,0.9)] transition-all hover:shadow-[0_10px_30px_rgba(0,0,0,0.8),inset_0_0_50px_rgba(234,179,8,0.2)] border-2 border-dashed border-stone-800 hover:border-yellow-700/50 bg-black/40">
                       <div className="flex flex-col items-center">
                         <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all group-hover:scale-110 shadow-[0_0_20px_rgba(0,0,0,0.8)] border border-stone-800 group-hover:border-yellow-700 group-hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] bg-stone-900">
                           <span className="text-3xl text-stone-600 group-hover:text-yellow-500 drop-shadow-md">+</span>
                         </div>
                         <span className="text-xs uppercase font-bold tracking-widest text-stone-600 group-hover:text-yellow-600 transition-colors">Create New Campaign</span>
                       </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>
      )}

      {view === 'create-choice' && (
        <div className="w-full max-w-2xl flex flex-col items-center animate-fade-in-up">
          <h2 className="text-3xl font-heading font-black text-yellow-500 mb-2 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">Create Character</h2>
          <p className="text-stone-400 mb-12">How would you like to build your hero?</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <div onClick={() => setView('guided')} className="p-8 rounded-lg cursor-pointer group shadow-[0_10px_30px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(120,53,15,0.3)] transition-all hover:-translate-y-2 border border-yellow-900/50" style={{ backgroundImage: 'url(/artifact-parchment-bg.png)', backgroundSize: 'cover' }}>
              <h3 className="text-xl font-bold text-yellow-950 mb-3 drop-shadow-sm">Guided Path</h3>
              <p className="text-yellow-900/80 text-sm leading-relaxed mb-6">A step-by-step wizard using standard OGL 5e rules. Perfect for newcomers or rapid character generation.</p>
              <div className="flex items-center text-xs font-bold uppercase tracking-widest text-yellow-800 group-hover:text-yellow-950">Begin Journey &rarr;</div>
            </div>

            <div onClick={() => setView('manual')} className="p-8 rounded-lg cursor-pointer group shadow-[0_10px_30px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(255,255,255,0.05)] transition-all hover:-translate-y-2 border border-stone-700" style={{ backgroundImage: 'url(/artifact-wood-bg.png)', backgroundSize: 'cover' }}>
              <h3 className="text-xl font-bold text-stone-200 mb-3 drop-shadow-md">Manual Entry</h3>
              <p className="text-stone-400 text-sm leading-relaxed mb-6">A beautifully blank artifact sheet. Full homebrew flexibility. You type exactly what you want.</p>
              <div className="flex items-center text-xs font-bold uppercase tracking-widest text-stone-500 group-hover:text-yellow-500">Forge Destiny &rarr;</div>
            </div>
            <div onClick={() => setView('import')} className="p-8 rounded-lg cursor-pointer group shadow-[0_10px_30px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(255,255,255,0.05)] transition-all hover:-translate-y-2 border border-blue-900/50" style={{ backgroundImage: 'url(/artifact-wood-bg.png)', backgroundSize: 'cover' }}>
              <h3 className="text-xl font-bold text-blue-400 mb-3 drop-shadow-md">D&D Beyond Import</h3>
              <p className="text-stone-400 text-sm leading-relaxed mb-6">Paste a character JSON directly from D&D Beyond to instantly migrate your hero into Frog's World.</p>
              <div className="flex items-center text-xs font-bold uppercase tracking-widest text-blue-500 group-hover:text-blue-300">Migrate Hero &rarr;</div>
            </div>
          </div>
          
          <button onClick={() => setView('vault')} className="mt-12 text-xs uppercase font-bold tracking-widest text-stone-500 hover:text-stone-300 transition-colors">Cancel</button>
        </div>
      )}

      {view === 'import' && (
        <div className="w-full flex justify-center animate-fade-in-up pt-12">
           <DndBeyondImport onImport={handleSaveCharacter} onCancel={() => setView('create-choice')} />
        </div>
      )}

      {view === 'manual' && (
        <div className="w-full flex justify-center animate-fade-in-up">
           <ManualCreator 
             onSave={handleSaveCharacter} 
             onCancel={() => { setView('create-choice'); setEditingCharacter(null); }} 
             initialCharacter={editingCharacter}
           />
        </div>
      )}

      {view === 'guided' && (
        <div className="w-full flex justify-center animate-fade-in-up pt-12">
           <GuidedCreator onSave={handleSaveCharacter} onCancel={() => setView('create-choice')} />
        </div>
      )}
    </div>
  );
}
