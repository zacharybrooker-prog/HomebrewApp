import React, { useState, useEffect, useRef } from 'react';
import type { CampaignStore } from '@frogs-world/shared/src/store';
import type { MapPin } from '@frogs-world/shared/src/schema';

export function MapTab({ store, role }: { store: CampaignStore, role: 'dm' | 'player' }) {
  const [mapImage, setMapImage] = useState<string | null>(null);
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
    const mapState = store.getMapState();
    const mapPins = store.getMapPins();

    const updateMap = () => {
      setMapImage(mapState.get('image') || null);
      
      const updatedPins: MapPin[] = [];
      mapPins.forEach((pin) => updatedPins.push(pin as MapPin));
      setPins(updatedPins);
    };

    mapState.observeDeep(updateMap);
    mapPins.observeDeep(updateMap);
    updateMap();

    return () => {
      mapState.unobserveDeep(updateMap);
      mapPins.unobserveDeep(updateMap);
    };
  }, [store]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1920;

        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.6);
          store.setMapImage(base64);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAdjust = e.deltaY > 0 ? 0.9 : 1.1;
    let newScale = scale * scaleAdjust;
    if (newScale < 0.1) newScale = 0.1;
    if (newScale > 5) newScale = 5;
    setScale(newScale);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // If clicking on a pin to drag it, don't pan the map
    if ((e.target as HTMLElement).closest('.map-pin')) {
      if (e.button !== 0) return; // Only drag on left click
      const pinEl = (e.target as HTMLElement).closest('.map-pin') as HTMLElement;
      setDraggingPinId(pinEl.dataset.pinid || null);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
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
      // Calculate new pin position relative to map coords
      const rect = mapRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      // We don't save to store on every move to avoid spamming Yjs.
      // We'll visually update it locally or just save on move for now.
      // Actually, Yjs is fast enough for low-freq updates. 
      // Let's just update the store directly.
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
    } catch (err) {
      // Ignore capture release errors
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPendingPinCoords({ x, y });
  };

  const savePendingPin = () => {
    if (!pendingPinCoords) return;
    store.addMapPin({
      id: `pin-${Date.now()}`,
      x: pendingPinCoords.x,
      y: pendingPinCoords.y,
      color: newPinColor,
      label: newPinLabel,
      createdBy: role
    });
    setPendingPinCoords(null);
    setNewPinLabel('');
  };

  if (!mapImage) {
    return (
      <div className="glass-panel p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="font-heading text-2xl mb-4">Interactive Map</h2>
        {role === 'dm' ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-muted-foreground">Upload a map image to begin (will be compressed to save sync bandwidth).</p>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="map-upload" />
            <label htmlFor="map-upload" className="btn-fantasy cursor-pointer">
              Choose Image
            </label>
          </div>
        ) : (
          <p className="text-muted-foreground">Waiting for the Dungeon Master to set a map...</p>
        )}
      </div>
    );
  }

  return (
    <div className="glass-panel relative overflow-hidden h-[70vh] flex flex-col p-0">
      {/* Map Toolbar */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button className="btn-ghost bg-surface/80 px-3 py-1" onClick={() => setScale(s => s * 1.2)}>➕</button>
        <button className="btn-ghost bg-surface/80 px-3 py-1" onClick={() => setScale(s => s * 0.8)}>➖</button>
        <button className="btn-ghost bg-surface/80 px-3 py-1" onClick={() => { setScale(1); setPan({x:0, y:0}); }}>Reset</button>
        {role === 'dm' && (
          <button className="btn-danger bg-surface/80 px-3 py-1 text-xs" onClick={() => store.setMapImage(null)}>Clear Map</button>
        )}
      </div>

      {/* Map Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
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
          <img src={mapImage} alt="Campaign Map" draggable={false} className="max-w-none shadow-2xl border-4 border-border/50 rounded" />
          
          {/* Pins Layer */}
          {pins.map(pin => (
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
              className="absolute z-50 p-3 glass-panel transform -translate-x-1/2 -translate-y-full flex flex-col gap-2 min-w-[200px]"
              style={{ left: `${pendingPinCoords.x}%`, top: `${pendingPinCoords.y}%` }}
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
            >
              <div className="text-xs font-bold mb-1">Place Pin</div>
              <input 
                type="text" 
                placeholder="Label (optional)" 
                className="input-fantasy text-xs px-2 py-1"
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
                <button className="btn-ghost text-[10px] py-1 flex-1" onClick={() => setPendingPinCoords(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-2 text-center text-xs text-muted-foreground border-t border-border/30 bg-surface/50 backdrop-blur-sm">
        Double-click to drop a pin. Drag a pin to move it. Right-click a pin to delete it. Scroll to zoom.
      </div>
    </div>
  );
}
