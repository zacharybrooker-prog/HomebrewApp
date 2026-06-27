import { useState } from 'react';
export { AnalogClock } from './AnalogClock';

export function TimeDial({ phaseIndex }: { phaseIndex: number }) {
  return (
    <div className="time-dial-wrapper flex justify-center mb-6">
      <div className="time-dial-container">
        {[0, 1, 2, 3].map(i => (
          <img 
            key={i}
            src={`/phase-${i}.png`} 
            alt={`Time Phase ${i}`} 
            className={`time-dial-image ${phaseIndex === i ? 'active' : ''}`} 
          />
        ))}
        {/* Decorative inner arch/overlay to give a brass bezel look */}
        <div className="time-dial-bezel" />
      </div>
    </div>
  );
}

export function HPGauge({ current, max, onChangeCurrent, onChangeMax }: { current: number; max: number; onChangeCurrent?: (val: number) => void; onChangeMax?: (val: number) => void }) {
  const percentage = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const isLow = percentage <= 25;
  const isMid = percentage > 25 && percentage <= 50;
  
  const barColor = isLow 
    ? 'bg-danger' 
    : isMid 
      ? 'bg-amber-500' 
      : 'bg-emerald-500';

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex justify-between items-end">
        {/* HP Controls */}
        <div className="flex flex-col gap-1 items-center">
          <span className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground">Current</span>
          <div className="flex items-center gap-2">
            <button onClick={() => onChangeCurrent?.(current - 1)} className="w-6 h-6 flex items-center justify-center rounded bg-black/40 border border-border text-danger hover:border-danger hover:shadow-[0_0_8px_var(--danger)] transition-all font-bold font-heading">−</button>
            <span className="text-2xl font-black font-heading tabular-nums w-10 text-center" style={{ color: isLow ? 'var(--danger)' : 'var(--text)' }}>{current}</span>
            <button onClick={() => onChangeCurrent?.(current + 1)} className="w-6 h-6 flex items-center justify-center rounded bg-black/40 border border-border text-success hover:border-success hover:shadow-[0_0_8px_var(--success)] transition-all font-bold font-heading">+</button>
          </div>
        </div>

        {/* Max HP Controls */}
        <div className="flex flex-col gap-1 items-center">
          <span className="text-[10px] font-heading uppercase tracking-widest text-muted-foreground">Max HP</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => onChangeMax?.(max - 1)} className="w-5 h-5 flex items-center justify-center rounded border border-border bg-black/40 text-muted-foreground hover:text-white transition-all text-xs font-bold">−</button>
            <span className="text-sm font-bold text-muted-foreground tabular-nums w-8 text-center">{max}</span>
            <button onClick={() => onChangeMax?.(max + 1)} className="w-5 h-5 flex items-center justify-center rounded border border-border bg-black/40 text-muted-foreground hover:text-white transition-all text-xs font-bold">+</button>
          </div>
        </div>
      </div>

      <div className="w-full bg-black/60 border border-border rounded-lg h-3 overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] mt-1">
        <div 
          className={`h-full ${barColor} transition-all duration-500 ease-out ${isLow ? 'animate-hp-low' : ''}`}
          style={{ 
            width: `${percentage}%`,
            boxShadow: isLow ? '0 0 12px rgba(220,38,38,0.6)' : isMid ? '0 0 8px rgba(245,158,11,0.4)' : '0 0 8px rgba(34,197,94,0.3)',
          }}
        />
      </div>
    </div>
  );
}

export function StatField({ label, value, baseValue, onDecrement, onIncrement, variant = 'default' }: { label: string; value: number | string; baseValue?: number | string; onDecrement?: () => void; onIncrement?: () => void; variant?: 'default' | 'steel' }) {
  const isModified = typeof value === 'number' && typeof baseValue === 'number' && value !== baseValue;
  
  const glassStyle = variant === 'steel' 
    ? { background: 'linear-gradient(135deg, rgba(160, 170, 180, 0.1) 0%, rgba(100, 110, 120, 0.3) 100%)', border: '1px solid rgba(180, 190, 200, 0.4)', boxShadow: '0 0 10px rgba(180, 190, 200, 0.1)' }
    : {};

  return (
    <div className="flex flex-col items-center p-3 rounded-lg glass-panel relative" style={{ minWidth: '72px', ...glassStyle }}>
      <span className="text-[10px] font-heading uppercase tracking-widest" style={{ color: variant === 'steel' ? '#e2e8f0' : 'var(--text-muted)' }}>{label}</span>
      <div className="flex items-center gap-2 mt-1.5">
        {onDecrement && (
          <button 
            onClick={onDecrement} 
            className="w-7 h-7 flex items-center justify-center rounded-full text-lg font-heading font-bold transition-all hover:scale-110" 
            style={{ 
              color: 'var(--accent)', 
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(225, 29, 72, 0.4)',
              boxShadow: '0 0 8px var(--accent-glow)'
            }}
          >
            −
          </button>
        )}
        <span className={`w-14 text-center text-4xl font-black font-heading tabular-nums`} style={{ color: isModified ? 'var(--secondary)' : (variant === 'steel' ? '#cbd5e1' : 'var(--text)'), textShadow: isModified ? '0 0 15px var(--secondary-glow)' : 'none' }}>
          {value}
        </span>
        {onIncrement && (
          <button 
            onClick={onIncrement} 
            className="w-7 h-7 flex items-center justify-center rounded-full text-lg font-heading font-bold transition-all hover:scale-110" 
            style={{ 
              color: 'var(--secondary)', 
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              boxShadow: '0 0 8px var(--secondary-glow)'
            }}
          >
            +
          </button>
        )}
      </div>
    </div>
  );
}

export function CurrencyRow({ label, amount }: { label: string; amount: number }) {
  const safeLabel = label || '';
  const icon = safeLabel.toLowerCase() === 'gold' ? '🪙' : safeLabel.toLowerCase() === 'silver' ? '🥈' : '💎';
  return (
    <div className="flex justify-between items-center py-2.5">
      <span className="font-medium text-sm flex items-center gap-2">
        <span>{icon}</span>
        <span>{label}</span>
      </span>
      <span className="font-black font-body tabular-nums" style={{ color: 'var(--secondary)', textShadow: '0 0 8px var(--secondary-glow)' }}>{amount}</span>
    </div>
  );
}

export function ItemRow({ item, onToggleEquip, onRemove }: { item: any; onToggleEquip: () => void; onRemove?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="flex flex-col py-2.5 px-3 rounded-lg mb-1.5 last:mb-0 transition-all duration-200" 
      style={{ 
        background: item.equipped ? 'rgba(225, 29, 72, 0.08)' : 'rgba(0,0,0,0.2)', 
        border: `1px solid ${item.equipped ? 'var(--border-accent)' : 'var(--border)'}`,
        boxShadow: item.equipped ? '0 0 12px var(--accent-glow)' : 'none'
      }}>
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <input type="checkbox" checked={item.equipped} onChange={(e) => { e.stopPropagation(); onToggleEquip(); }} className="checkbox-fantasy" />
          <span className="font-medium text-sm" style={{ color: item.equipped ? 'var(--text)' : 'var(--text-muted)' }}>{item.name}</span>
          {item.attunement && <span className="text-[9px] uppercase font-bold tracking-widest text-secondary border border-secondary/30 px-1.5 py-0.5 rounded">Attuned</span>}
        </div>
        <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>×{item.quantity}</span>
      </div>
      
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2 text-sm animate-fade-in-up">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground uppercase text-[10px] tracking-widest font-heading">{item.type || 'Gear'}</span>
            {item.damage && <span className="font-bold text-accent">Damage: {item.damage}</span>}
          </div>
          {item.effectDescription && (
            <div className="text-text-muted italic text-xs leading-relaxed border-l-2 pl-2" style={{ borderColor: 'var(--border-accent)' }}>
              {item.effectDescription}
            </div>
          )}
          {onRemove && (
            <div className="flex justify-end mt-1">
              <button 
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="text-xs font-bold px-2 py-1 rounded transition-colors text-danger border border-danger/20 hover:bg-danger/20"
              >
                Drop Item
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StatusList({ statuses }: { statuses: Array<{ nameSnapshot: string; color?: string }> }) {
  if (!statuses || statuses.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 py-2">
      {statuses.map((s, i) => (
        <span key={i} className="px-2.5 py-1 text-[10px] font-heading font-bold uppercase tracking-wider rounded-full text-white animate-fade-in-up" 
          style={{ 
            backgroundColor: s.color || 'var(--accent)',
            boxShadow: `0 0 10px ${s.color || 'var(--accent-glow)'}`,
          }}>
          {s.nameSnapshot}
        </span>
      ))}
    </div>
  );
}

export function SchemaEditor({ onAddStat }: { onAddStat: (name: string) => void }) {
  const [newStat, setNewStat] = useState('');
  
  return (
    <div className="p-4 glass-panel" style={{ borderColor: 'var(--border-accent)' }}>
      <h3 className="font-heading text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--secondary)' }}>⚙ Schema Editor</h3>
      <div className="flex gap-2">
        <input 
          value={newStat} 
          onChange={e => setNewStat(e.target.value)}
          placeholder="New Stat (e.g. DEX)"
          className="input-fantasy flex-1"
        />
        <button 
          onClick={() => { if(newStat) { onAddStat(newStat); setNewStat(''); } }}
          className="btn-gold"
        >
          Add
        </button>
      </div>
    </div>
  );
}
