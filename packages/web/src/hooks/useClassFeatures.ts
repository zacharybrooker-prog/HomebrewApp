import { useState, useEffect } from 'react';

export interface ClassFeature {
  id: string;
  className: string;
  level: number;
  name: string;
  description: string;
  type: "passive" | "active" | "resource" | "choice";
  modifiers?: Record<string, any>;
  resource?: { max: number; recharge: string; current: number };
}

export function useClassFeatures(charClass: string, level: number, baseStats: Record<string, number>) {
  const [allFeatures, setAllFeatures] = useState<ClassFeature[]>([]);
  const [unlockedFeatures, setUnlockedFeatures] = useState<ClassFeature[]>([]);
  const [computedStats, setComputedStats] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/data/srd-5.2-classFeatures.json')
      .then(res => res.json())
      .then(data => setAllFeatures(data))
      .catch(e => console.error("Failed to load class features", e));
  }, []);

  useEffect(() => {
    if (!charClass || !level || allFeatures.length === 0) {
      setUnlockedFeatures([]);
      setComputedStats({});
      return;
    }

    const filtered = allFeatures.filter(f => f.className.toLowerCase() === charClass.toLowerCase() && f.level <= level);
    setUnlockedFeatures(filtered);

    // Compute stats
    const newComputed: Record<string, number> = {};
    const dexMod = Math.floor(((baseStats.dex || 10) - 10) / 2);
    const conMod = Math.floor(((baseStats.con || 10) - 10) / 2);

    filtered.forEach(f => {
      if (f.modifiers) {
        if (f.modifiers.ac_calc === '10+dex+con') {
          newComputed['ac'] = 10 + dexMod + conMod;
        }
        if (f.modifiers.speed_bonus) {
          // Assuming base speed is 30 for most races unless overridden
          newComputed['speed'] = (baseStats.speed || 30) + f.modifiers.speed_bonus;
        }
      }
    });

    setComputedStats(newComputed);
  }, [charClass, level, allFeatures, baseStats]);

  return { unlockedFeatures, computedStats };
}
