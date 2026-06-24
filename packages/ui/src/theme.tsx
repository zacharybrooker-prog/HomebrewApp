import React, { useEffect } from 'react';

export const PHASES = [
  {
    name: 'Witching Hour',
    tokens: {
      '--background': '#050505',
      '--surface': 'rgba(10, 10, 12, 0.95)',
      '--surface-solid': '#0a0a0c',
      '--text': '#d4d4d8',
      '--text-muted': '#52525b',
      '--accent': '#7f1d1d',
      '--accent-glow': 'rgba(127, 29, 29, 0.4)',
      '--secondary': '#450a0a',
      '--secondary-glow': 'rgba(69, 10, 10, 0.3)',
      '--danger': '#991b1b',
      '--border': '#27272a',
      '--border-accent': 'rgba(127, 29, 29, 0.3)',
    }
  },
  {
    name: 'Blood Dawn',
    tokens: {
      '--background': '#0f0505',
      '--surface': 'rgba(20, 10, 10, 0.9)',
      '--surface-solid': '#140a0a',
      '--text': '#e4e4e7',
      '--text-muted': '#71717a',
      '--accent': '#991b1b',
      '--accent-glow': 'rgba(153, 27, 27, 0.5)',
      '--secondary': '#7f1d1d',
      '--secondary-glow': 'rgba(127, 29, 29, 0.4)',
      '--danger': '#b91c1c',
      '--border': '#3f3f46',
      '--border-accent': 'rgba(153, 27, 27, 0.4)',
    }
  },
  {
    name: 'Ashen Noon',
    tokens: {
      '--background': '#0a0a0a',
      '--surface': 'rgba(15, 15, 15, 0.85)',
      '--surface-solid': '#0f0f0f',
      '--text': '#f4f4f5',
      '--text-muted': '#a1a1aa',
      '--accent': '#b91c1c',
      '--accent-glow': 'rgba(185, 28, 28, 0.6)',
      '--secondary': '#991b1b',
      '--secondary-glow': 'rgba(153, 27, 27, 0.5)',
      '--danger': '#dc2626',
      '--border': '#52525b',
      '--border-accent': 'rgba(185, 28, 28, 0.5)',
    }
  },
  {
    name: 'Dusk Veil',
    tokens: {
      '--background': '#08080a',
      '--surface': 'rgba(12, 12, 15, 0.9)',
      '--surface-solid': '#0c0c0f',
      '--text': '#e4e4e7',
      '--text-muted': '#71717a',
      '--accent': '#7f1d1d',
      '--accent-glow': 'rgba(127, 29, 29, 0.4)',
      '--secondary': '#450a0a',
      '--secondary-glow': 'rgba(69, 10, 10, 0.3)',
      '--danger': '#991b1b',
      '--border': '#3f3f46',
      '--border-accent': 'rgba(127, 29, 29, 0.3)',
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
