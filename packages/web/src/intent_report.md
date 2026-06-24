# Architectural Strategy: Smart Features vs Homebrew Overrides

To allow "Smart Features" (like auto-calculating Unarmored Defense AC) without breaking manual Homebrew overrides, we must separate computed state from explicitly overridden state.

### 1. State Structure Refactoring
Currently, `TraditionalSheet.tsx` receives a single `stats: Record<string, number>` prop. This should be expanded:

```typescript
export interface TraditionalSheetProps {
  // Base ability scores (STR, DEX, etc.)
  baseStats: Record<string, number>;
  
  // Values dynamically calculated by Smart Features
  computedStats?: Record<string, number>;
  
  // Explicit manual overrides by the user/DM
  overrideStats?: Record<string, number | null>;
  
  // ... existing props
}
```

### 2. Value Resolution Hierarchy
When displaying a value like Armor Class or Initiative, `TraditionalSheet` should resolve it using this strict priority order:
1. **Manual Override (Highest):** If `overrideStats['ac']` is present, always use it.
2. **Computed Feature:** If no override, use `computedStats['ac']`.
3. **Default Calculation:** If neither exists, use standard rules (e.g., `10 + getMod(baseStats['dex'])`).

```typescript
const getResolvedStat = (statKey: string, fallback: number) => {
  if (overrideStats?.[statKey] != null) return overrideStats[statKey];
  if (computedStats?.[statKey] != null) return computedStats[statKey];
  return fallback;
};

// Usage:
const displayAc = getResolvedStat('ac', 10 + getMod(baseStats['dex'] ?? 10));
```

### 3. Handling User Edits
When a user clicks a stat and edits it via the modal (using `Plus`/`Minus`), the `onUpdateStat` callback should update the **override state**, not the base state. This ensures manual edits are always treated as Homebrew overrides that take precedence over Smart Features.

### 4. Clearing Overrides
To allow users to revert a custom Homebrew value back to the Smart Feature logic, the editing modal needs a "Restore Default" button. This button would invoke `onUpdateStat(editingStat, null)` to clear the override and let `computedStats` take over again.
