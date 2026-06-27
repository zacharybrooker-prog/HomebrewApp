

export function AnalogClock({ phaseIndex }: { phaseIndex: number }) {
  // Map phaseIndex (0=Dawn, 1=Day, 2=Dusk, 3=Night) to hours (6, 12, 18, 24)
  const hours = (phaseIndex * 6) + 6;
  
  // Calculate rotation for the hour hand.
  // 12 hours = 360 degrees. 1 hour = 30 degrees.
  const hourDegrees = hours * 30;
  
  // Minute hand is always at 0 degrees since blocks are 6 exact hours.
  const minuteDegrees = 0;

  return (
    <div className="relative w-full h-full rounded-full border-2 border-yellow-900/50 bg-zinc-950 flex items-center justify-center shadow-inner overflow-hidden">
      {/* Clock Face Details (Tick marks) */}
      <div className="absolute inset-0">
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
          <div 
            key={deg}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 origin-bottom"
            style={{ 
              height: '50%', 
              transform: `translateX(-50%) rotate(${deg}deg)`,
            }}
          >
            {/* The actual tick mark at the outer edge */}
            <div className={`w-full ${i % 3 === 0 ? 'h-2.5 bg-yellow-700/80' : 'h-1.5 bg-yellow-900/50'}`} />
          </div>
        ))}
      </div>

      {/* Center Pivot */}
      <div className="absolute z-10 w-2 h-2 rounded-full bg-yellow-500 shadow-md border border-yellow-700"></div>

      {/* Hour Hand */}
      <div 
        className="absolute bottom-1/2 left-1/2 -translate-x-1/2 w-1 rounded-t-full bg-yellow-600 origin-bottom transition-transform duration-1000 ease-in-out z-0"
        style={{ height: '30%', transform: `translateX(-50%) rotate(${hourDegrees}deg)` }}
      ></div>

      {/* Minute Hand */}
      <div 
        className="absolute bottom-1/2 left-1/2 -translate-x-1/2 w-0.5 rounded-t-full bg-yellow-500/80 origin-bottom transition-transform duration-1000 ease-in-out z-0"
        style={{ height: '40%', transform: `translateX(-50%) rotate(${minuteDegrees}deg)` }}
      ></div>
    </div>
  );
}
