import React, { useEffect } from 'react';

export const PHASES = [
  {
    name: 'Witching Hour',
    tokens: {
      '--background': '#06060a',
      '--surface': 'rgba(12, 12, 18, 0.85)',
      '--surface-solid': '#0c0c12',
      '--text': '#e8e6e3',
      '--text-muted': '#5a5a6e',
      '--accent': '#a855f7',
      '--accent-glow': 'rgba(168, 85, 247, 0.4)',
      '--secondary': '#c084fc',
      '--secondary-glow': 'rgba(192, 132, 252, 0.3)',
      '--danger': '#ef4444',
      '--border': 'rgba(168, 85, 247, 0.12)',
      '--border-accent': 'rgba(168, 85, 247, 0.3)',
    }
  },
  {
    name: 'Blood Dawn',
    tokens: {
      '--background': '#0a0608',
      '--surface': 'rgba(18, 10, 14, 0.85)',
      '--surface-solid': '#120a0e',
      '--text': '#f0e6ea',
      '--text-muted': '#7a5a6a',
      '--accent': '#e11d48',
      '--accent-glow': 'rgba(225, 29, 72, 0.4)',
      '--secondary': '#d4af37',
      '--secondary-glow': 'rgba(212, 175, 55, 0.3)',
      '--danger': '#dc2626',
      '--border': 'rgba(225, 29, 72, 0.12)',
      '--border-accent': 'rgba(225, 29, 72, 0.3)',
    }
  },
  {
    name: 'Ashen Noon',
    tokens: {
      '--background': '#0a0a0c',
      '--surface': 'rgba(18, 18, 22, 0.85)',
      '--surface-solid': '#12121a',
      '--text': '#e8e6e3',
      '--text-muted': '#6b6b7b',
      '--accent': '#d4af37',
      '--accent-glow': 'rgba(212, 175, 55, 0.4)',
      '--secondary': '#e11d48',
      '--secondary-glow': 'rgba(225, 29, 72, 0.3)',
      '--danger': '#dc2626',
      '--border': 'rgba(212, 175, 55, 0.12)',
      '--border-accent': 'rgba(212, 175, 55, 0.3)',
    }
  },
  {
    name: 'Dusk Veil',
    tokens: {
      '--background': '#080810',
      '--surface': 'rgba(14, 14, 24, 0.85)',
      '--surface-solid': '#0e0e18',
      '--text': '#ddd8e8',
      '--text-muted': '#5e5e78',
      '--accent': '#3b82f6',
      '--accent-glow': 'rgba(59, 130, 246, 0.4)',
      '--secondary': '#60a5fa',
      '--secondary-glow': 'rgba(96, 165, 250, 0.3)',
      '--danger': '#ef4444',
      '--border': 'rgba(59, 130, 246, 0.12)',
      '--border-accent': 'rgba(59, 130, 246, 0.3)',
    }
  }
];

export function ThemeProvider({ phaseIndex, children }: { phaseIndex: number, children: React.ReactNode }) {
  useEffect(() => {
    const phase = PHASES[phaseIndex % PHASES.length];
    if (phase) {
      for (const [key, value] of Object.entries(phase.tokens)) {
        document.documentElement.style.setProperty(key, value);
      }
      document.body.style.transition = 'background-color 0.8s ease, color 0.5s ease';
    }
  }, [phaseIndex]);

  return <>{children}</>;
}
