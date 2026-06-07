import type { CombatState, Combatant } from '@frogs-world/shared/src/schema';
import { HPGauge, StatusList } from '@frogs-world/ui';

interface CombatTrackerProps {
  role: 'dm' | 'player';
  combatState: CombatState;
  onStart: () => void;
  onEnd: () => void;
  onNextTurn: () => void;
  onRemove: (id: string) => void;
  onUpdateInitiative: (id: string, val: number) => void;
  onUpdateAc: (id: string, val: number) => void;
  onUpdateHp: (id: string, current: number, max: number) => void;
}

export function CombatTracker({ role, combatState, onStart, onEnd, onNextTurn, onRemove, onUpdateInitiative, onUpdateAc, onUpdateHp }: CombatTrackerProps) {
  if (!combatState.active && role === 'player') {
    return <div className="p-6 glass-panel text-center" style={{ color: 'var(--text-muted)' }}>⚔️ No active combat.</div>;
  }

  return (
    <div className="flex flex-col gap-4 glass-panel p-5 animate-fade-in-up" style={{ borderColor: 'var(--border-accent)' }}>
      <div className="flex justify-between items-center">
        <h2 className="font-heading text-lg uppercase tracking-wide" style={{ color: 'var(--text)' }}>⚔️ Combat</h2>
        <div className="flex gap-3 items-center">
          {combatState.active && (
            <span className="font-heading text-sm uppercase tracking-wider px-3 py-1 rounded-full" 
              style={{ color: 'var(--secondary)', border: '1px solid var(--secondary-glow)', background: 'rgba(212,175,55,0.08)', boxShadow: '0 0 10px var(--secondary-glow)' }}>
              Round {combatState.round}
            </span>
          )}
          {role === 'dm' && (
            combatState.active 
              ? <button onClick={onEnd} className="btn-danger">End Combat</button>
              : <button onClick={onStart} className="btn-fantasy">Start Combat</button>
          )}
        </div>
      </div>

      {(combatState.active || role === 'dm') && (
        <div className="flex flex-col gap-2">
          {combatState.combatants.map((c: Combatant, i: number) => {
            const isTurn = combatState.active && i === combatState.turnIndex;
            return (
              <div key={c.id} 
                className={`flex items-center gap-4 p-3 rounded-lg transition-all duration-300 animate-fade-in-up ${isTurn ? 'animate-glow-pulse' : ''}`}
                style={{ 
                  background: isTurn ? 'rgba(225,29,72,0.1)' : 'rgba(0,0,0,0.25)',
                  border: `1px solid ${isTurn ? 'var(--border-accent)' : 'var(--border)'}`,
                  boxShadow: isTurn ? '0 0 20px var(--accent-glow)' : 'none',
                }}>
                <div className="flex flex-col items-center" style={{ minWidth: '48px' }}>
                  <span className="text-[10px] font-heading uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Init</span>
                  {role === 'dm' ? (
                    <input 
                      type="number" 
                      value={c.initiative} 
                      onChange={e => onUpdateInitiative(c.id, Number(e.target.value))}
                      className="w-12 text-center font-black text-lg tabular-nums" 
                      style={{ background: 'transparent', border: 'none', borderBottom: '2px solid var(--accent)', color: 'var(--text)', outline: 'none' }}
                    />
                  ) : (
                    <span className="font-black text-lg tabular-nums" style={{ color: 'var(--text)' }}>{c.initiative}</span>
                  )}
                </div>

                {(role === 'dm' || c.source === 'character') && (
                  <div className="flex flex-col items-center" style={{ minWidth: '40px' }}>
                    <span className="text-[10px] font-heading uppercase tracking-widest" style={{ color: 'var(--secondary)' }}>AC</span>
                    {role === 'dm' ? (
                      <input 
                        type="number" 
                        value={c.ac} 
                        onChange={e => onUpdateAc(c.id, Number(e.target.value))}
                        className="w-10 text-center font-black text-lg tabular-nums" 
                        style={{ background: 'transparent', border: 'none', borderBottom: '2px solid var(--secondary)', color: 'var(--secondary)', outline: 'none' }}
                      />
                    ) : (
                      <span className="font-black text-lg tabular-nums" style={{ color: 'var(--secondary)' }}>{c.ac}</span>
                    )}
                  </div>
                )}
                
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-heading text-base" style={{ color: isTurn ? 'var(--accent)' : 'var(--text)' }}>
                      {c.label} {isTurn && '🎯'}
                    </span>
                    {role === 'dm' && (
                      <button onClick={() => onRemove(c.id)} className="text-xs font-bold px-2 py-0.5 rounded transition-colors" 
                        style={{ color: 'var(--danger)', border: '1px solid rgba(220,38,38,0.2)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        ✕ Remove
                      </button>
                    )}
                  </div>
                  {(role === 'dm' || c.source === 'character') && (
                    <>
                      <HPGauge current={c.hp.current} max={c.hp.max} />
                      {role === 'dm' && (
                        <div className="flex gap-2 mt-1">
                          <button onClick={() => onUpdateHp(c.id, Math.max(0, c.hp.current - 1), c.hp.max)} 
                            className="btn-ghost" style={{ padding: '2px 10px', fontSize: '11px', color: 'var(--danger)' }}>−1 HP</button>
                          <button onClick={() => onUpdateHp(c.id, Math.min(c.hp.max, c.hp.current + 1), c.hp.max)} 
                            className="btn-ghost" style={{ padding: '2px 10px', fontSize: '11px', color: 'var(--success, #22c55e)' }}>+1 HP</button>
                        </div>
                      )}
                    </>
                  )}
                  <StatusList statuses={c.statuses} />
                </div>
              </div>
            );
          })}

          {role === 'dm' && combatState.combatants.length > 0 && (
            <button onClick={onNextTurn} className="btn-gold mt-2 w-full py-3">
              ⚡ Next Turn
            </button>
          )}
        </div>
      )}
    </div>
  );
}
