

export function AnalogClock({ timeMs }: { timeMs: number }) {
  // Calculate total hours elapsed
  const totalHours = timeMs / (1000 * 60 * 60);
  
  // Calculate exact rotation for the hour hand.
  // 1 hour = 30 degrees. 
  // We don't modulo 12 or 360 here because the CSS transition will spin backward 
  // if the value drops (e.g. from 330 to 0). By continuously increasing the degrees,
  // the clock hands will always advance forward cleanly in CSS!
  const hourDegrees = totalHours * 30;
  
  // Calculate total minutes elapsed
  const totalMinutes = timeMs / (1000 * 60);
  // 1 minute = 6 degrees
  const minuteDegrees = totalMinutes * 6;

  return (
    <div className="relative w-full h-full rounded-full flex items-center justify-center shadow-inner overflow-hidden pointer-events-none">
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
            <div className={`w-full ${i % 3 === 0 ? 'h-2.5 bg-blue-700/80' : 'h-1.5 bg-blue-900/50'}`} />
          </div>
        ))}
      </div>

      {/* Center Pivot */}
      <div className="absolute z-10 w-2 h-2 rounded-full bg-blue-500 shadow-md border border-blue-700"></div>

      {/* Hour Hand */}
      <div 
        className="absolute bottom-1/2 left-1/2 -translate-x-1/2 w-1 rounded-t-full bg-blue-600 origin-bottom z-0"
        style={{ height: '30%', transform: `translateX(-50%) rotate(${hourDegrees}deg)` }}
      ></div>

      {/* Minute Hand */}
      <div 
        className="absolute bottom-1/2 left-1/2 -translate-x-1/2 w-0.5 rounded-t-full bg-blue-500/80 origin-bottom z-0"
        style={{ height: '40%', transform: `translateX(-50%) rotate(${minuteDegrees}deg)` }}
      ></div>
    </div>
  );
}
