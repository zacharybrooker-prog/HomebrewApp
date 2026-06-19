import { useEffect, useRef } from 'react';

interface ConditionPopoverProps {
  condition: string;
  rulesText: string;
  onClose: () => void;
  onRemove?: () => void; // DM only
}

export function ConditionPopover({ condition, rulesText, onClose, onRemove }: ConditionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    // Delay adding listener to prevent immediate closure if opened via click
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div 
      ref={popoverRef}
      className="absolute z-[9999] w-64 p-4 rounded-lg shadow-2xl glass-panel animate-fade-in"
      style={{ 
        background: 'rgba(15, 15, 20, 0.95)', 
        border: '1px solid var(--border-accent)',
        backdropFilter: 'blur(10px)',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: '8px'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-2 border-b border-white/10 pb-2">
        <h3 className="font-heading text-secondary font-bold tracking-widest uppercase text-sm">
          {condition}
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-white">&times;</button>
      </div>
      
      <p className="text-xs text-gray-300 leading-relaxed mb-3">
        {rulesText}
      </p>

      {onRemove && (
        <button 
          onClick={() => {
            onRemove();
            onClose();
          }} 
          className="btn-danger w-full py-1 text-xs tracking-widest font-bold"
        >
          ✕ Remove Status
        </button>
      )}
    </div>
  );
}
