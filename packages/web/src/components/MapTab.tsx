import React, { useState, useEffect, useRef } from 'react';
import type { CampaignStore } from '@frogs-world/shared/src/store';
import type { MapPin } from '@frogs-world/shared/src/schema';
import { db, storage } from '../firebase';
import { collection, onSnapshot, query, addDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface FirestoreMap {
  id: string;
  mapName: string;
  imageUrl: string;
  isVisibleToPlayers: boolean;
  createdAt: number;
}

export function MapTab({ store, role, campaignId }: { store: CampaignStore, role: 'dm' | 'player', campaignId?: string }) {
  const [maps, setMaps] = useState<FirestoreMap[]>([]);
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);

  // Viewport State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Pin Creation State
  const [pendingPinCoords, setPendingPinCoords] = useState<{x: number, y: number} | null>(null);
  const [newPinLabel, setNewPinLabel] = useState('');
  const [newPinColor, setNewPinColor] = useState('#e11d48');

  // Dragging existing pin state
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!campaignId) return;
    const mapsRef = collection(db, `campaigns/${campaignId}/maps`);
    const q = query(mapsRef);

    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedMaps: FirestoreMap[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        fetchedMaps.push({
          id: d.id,
          mapName: data.mapName,
          imageUrl: data.imageUrl,
          isVisibleToPlayers: data.isVisibleToPlayers,
          createdAt: data.createdAt
        });
      });
      // Sort by creation time
      fetchedMaps.sort((a, b) => a.createdAt - b.createdAt);
      setMaps(fetchedMaps);
    });

    return () => unsub();
  }, [campaignId]);

  // Set default map if none selected
  useEffect(() => {
    if (!currentMapId && maps.length > 0) {
      const availableMaps = role === 'dm' ? maps : maps.filter(m => m.isVisibleToPlayers);
      if (availableMaps.length > 0) {
        setCurrentMapId(availableMaps[0].id);
      }
    }
  }, [maps, currentMapId, role]);

  useEffect(() => {
    const mapPins = store.getMapPins();

    const updatePins = () => {
      const updatedPins: MapPin[] = [];
      mapPins.forEach((pin) => updatedPins.push(pin as MapPin));
      setPins(updatedPins);
    };

    mapPins.observeDeep(updatePins);
    updatePins();

    return () => {
      mapPins.unobserveDeep(updatePins);
    };
  }, [store]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId) return;

    const mapName = window.prompt("Enter a name for this map:", "New Map");
    if (!mapName) return; // User cancelled

    const fileRef = ref(storage, `campaigns/${campaignId}/maps/${Date.now()}_${file.name}`);
    try {
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      const mapsRef = collection(db, `campaigns/${campaignId}/maps`);
      const newDoc = await addDoc(mapsRef, {
        mapName,
        imageUrl: url,
        isVisibleToPlayers: true,
        createdAt: Date.now()
      });
      setCurrentMapId(newDoc.id);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Map upload failed. Make sure Firebase Storage rules are configured.");
    }
  };

  const handleToggleVisibility = async (mId: string, currentVis: boolean) => {
    if (!campaignId) return;
    const docRef = doc(db, `campaigns/${campaignId}/maps`, mId);
    await updateDoc(docRef, { isVisibleToPlayers: !currentVis });
  };

  const currentViewedMap = maps.find(m => m.id === currentMapId) || null;
  const filteredPins = pins.filter(p => p.mapId === currentMapId);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAdjust = e.deltaY > 0 ? 0.9 : 1.1;
    let newScale = scale * scaleAdjust;
    if (newScale < 0.1) newScale = 0.1;
    if (newScale > 5) newScale = 5;
    setScale(newScale);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.map-pin') || (e.target as HTMLElement).closest('.banner-controls')) {
      if ((e.target as HTMLElement).closest('.map-pin')) {
        if (e.button !== 0) return;
        const pinEl = (e.target as HTMLElement).closest('.map-pin') as HTMLElement;
        setDraggingPinId(pinEl.dataset.pinid || null);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
      return;
    }

    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingPinId && mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      store.updateMapPin(draggingPinId, { x, y });
      return;
    }

    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    setDraggingPinId(null);
    try {
      const target = e.target as HTMLElement;
      if (target.hasPointerCapture && target.hasPointerCapture(e.pointerId)) {
        target.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!mapRef.current || !currentMapId) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPinCoords({ x, y });
  };

  const savePendingPin = () => {
    if (!pendingPinCoords || !currentMapId) return;
    store.addMapPin({
      id: `pin-${Date.now()}`,
      mapId: currentMapId,
      x: pendingPinCoords.x,
      y: pendingPinCoords.y,
      color: newPinColor,
      label: newPinLabel,
      createdBy: role
    });
    setPendingPinCoords(null);
    setNewPinLabel('');
  };

  const availableMaps = role === 'dm' ? maps : maps.filter(m => m.isVisibleToPlayers);

  return (
    <div className="glass-panel relative overflow-hidden h-[70vh] flex flex-col p-0 border border-border/50 shadow-2xl">
      {/* Absolute Control Banner */}
      <div className="banner-controls absolute top-0 left-0 right-0 z-[40] flex items-center justify-between px-4 py-2 bg-black/90 border-b border-white/10 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white/70">Map:</span>
          {availableMaps.length > 0 ? (
             <select 
               className="bg-black/50 border border-white/20 text-white text-sm rounded px-2 py-1 outline-none focus:border-accent"
               value={currentMapId || ''}
               onChange={(e) => setCurrentMapId(e.target.value)}
             >
               {availableMaps.map(m => (
                 <option key={m.id} value={m.id}>{m.mapName} {!m.isVisibleToPlayers ? '(Hidden)' : ''}</option>
               ))}
             </select>
          ) : (
            <span className="text-sm text-red-400">No maps available.</span>
          )}
          
          {role === 'dm' && currentViewedMap && (
            <button 
              className={`text-xs px-2 py-1 rounded border transition-colors ${currentViewedMap.isVisibleToPlayers ? 'bg-green-900/50 hover:bg-green-800/50 text-green-300 border-green-500/30' : 'bg-red-900/50 hover:bg-red-800/50 text-red-300 border-red-500/30'}`}
              onClick={() => handleToggleVisibility(currentViewedMap.id, currentViewedMap.isVisibleToPlayers)}
            >
              {currentViewedMap.isVisibleToPlayers ? 'Visible to Players' : 'Hidden from Players'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {role === 'dm' && (
            <>
               <input type="file" accept="image/*" onChange={handleUpload} className="hidden" id="map-upload-banner" />
               <label htmlFor="map-upload-banner" className="btn-fantasy text-xs py-1 px-3 cursor-pointer mr-4">
                 Upload Map
               </label>
            </>
          )}
          <button className="btn-ghost bg-surface/80 px-2 py-0.5 text-xs rounded hover:bg-surface" onClick={() => setScale(s => s * 1.2)}>➕ Zoom In</button>
          <button className="btn-ghost bg-surface/80 px-2 py-0.5 text-xs rounded hover:bg-surface" onClick={() => setScale(s => s * 0.8)}>➖ Zoom Out</button>
          <button className="btn-ghost bg-surface/80 px-2 py-0.5 text-xs rounded hover:bg-surface" onClick={() => { setScale(1); setPan({x:0, y:0}); }}>Reset View</button>
        </div>
      </div>

      {/* Map Container - Panning Window */}
      {!currentViewedMap ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#050505] pt-12">
           <h2 className="font-heading text-xl text-white/50 mb-2">No Map Selected</h2>
           {role === 'dm' && <p className="text-sm text-white/30">Upload a map using the button in the top banner.</p>}
        </div>
      ) : (
        <div 
          ref={containerRef}
          className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing bg-[#050505] pt-12"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onDoubleClick={handleDoubleClick}
        >
          <div 
            ref={mapRef}
            className="absolute transform-gpu origin-center"
            style={{ 
              top: '50%', left: '50%',
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          >
            <img src={currentViewedMap.imageUrl} alt={currentViewedMap.mapName} draggable={false} className="max-w-none shadow-[0_0_50px_rgba(0,0,0,1)] border-[4px] border-[#222] rounded" />
            
            {/* Pins Layer */}
            {filteredPins.map(pin => (
              <div 
                key={pin.id}
                className="map-pin absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-full cursor-pointer hover:z-50"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                data-pinid={pin.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (window.confirm('Delete this pin?')) {
                    store.removeMapPin(pin.id);
                  }
                }}
              >
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-[0_0_10px_rgba(0,0,0,0.8)]"
                  style={{ backgroundColor: pin.color }}
                />
                <div className="w-1 h-3" style={{ backgroundColor: pin.color }} />
                {pin.label && (
                  <div className="mt-1 px-2 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded whitespace-nowrap shadow-lg">
                    {pin.label}
                  </div>
                )}
              </div>
            ))}

            {/* Pending Pin Dialog */}
            {pendingPinCoords && (
              <div 
                className="absolute z-50 p-3 glass-panel transform -translate-x-1/2 -translate-y-full flex flex-col gap-2 min-w-[200px] shadow-2xl"
                style={{ left: `${pendingPinCoords.x}%`, top: `${pendingPinCoords.y}%` }}
                onClick={e => e.stopPropagation()}
                onPointerDown={e => e.stopPropagation()}
              >
                <div className="text-xs font-bold mb-1 text-white">Place Pin</div>
                <input 
                  type="text" 
                  placeholder="Label (optional)" 
                  className="input-fantasy text-xs px-2 py-1 w-full"
                  value={newPinLabel}
                  onChange={e => setNewPinLabel(e.target.value)}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') savePendingPin();
                    if (e.key === 'Escape') setPendingPinCoords(null);
                  }}
                />
                <div className="flex gap-2 my-1">
                  {['#e11d48', '#3b82f6', '#22c55e', '#eab308', '#a855f7'].map(c => (
                    <button 
                      key={c}
                      className={`w-5 h-5 rounded-full ${newPinColor === c ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewPinColor(c)}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button className="btn-fantasy text-[10px] py-1 flex-1" onClick={savePendingPin}>Place</button>
                  <button className="btn-ghost text-[10px] py-1 flex-1 border-white/20" onClick={() => setPendingPinCoords(null)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="p-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground border-t border-border/30 bg-black/80 backdrop-blur-sm z-50 relative">
        Double-click to drop a pin. Drag a pin to move it. Right-click to delete. Scroll to zoom.
      </div>
    </div>
  );
}
