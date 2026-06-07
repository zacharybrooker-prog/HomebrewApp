# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: time.spec.ts >> Phase 2 & 4: Time-based statuses and Theme transition
- Location: tests\e2e\time.spec.ts:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Switch Role' })

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - heading "FROG'S WORLD" [level=1] [ref=e5]
  - generic [ref=e6]:
    - button "Host Campaign" [ref=e7] [cursor=pointer]
    - button "Join Campaign" [ref=e8] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Phase 2 & 4: Time-based statuses and Theme transition', async ({ context }) => {
  4  |   const dmPage = await context.newPage();
  5  |   const playerPage = await context.newPage();
  6  | 
  7  |   await dmPage.goto('/');
  8  |   await playerPage.goto('/');
  9  | 
  10 |   // Setup DM Page
> 11 |   await dmPage.getByRole('button', { name: 'Switch Role' }).click();
     |                                                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  12 |   await expect(dmPage.getByText('Dungeon Master')).toBeVisible();
  13 | 
  14 |   // Initially: Witching Hour Phase (Block 0)
  15 |   await expect(dmPage.getByText('Witching Hour')).toBeVisible();
  16 |   
  17 |   await playerPage.reload();
  18 |   await expect(playerPage.getByText('Witching Hour')).toBeVisible();
  19 | 
  20 |   // Test the pure Effect Engine via Equipping an Item
  21 |   // The stat field shows '10' - use .first() to target the stat display
  22 |   await expect(playerPage.getByText('10').first()).toBeVisible();
  23 | 
  24 |   // Player equips Ring of Strength
  25 |   await playerPage.getByRole('checkbox').check();
  26 |   await expect(playerPage.getByRole('checkbox')).toBeChecked();
  27 | 
  28 |   // Stat mutates physically via EffectEngine (+2 STR from ring)
  29 |   await expect(playerPage.getByText('12')).toBeVisible();
  30 | 
  31 |   // DM advances time by 6 Hours (1 block)
  32 |   await dmPage.getByRole('button', { name: /\+6 Hours/i }).click();
  33 | 
  34 |   // Phase changes to Blood Dawn (Block 1)
  35 |   await expect(dmPage.getByText('Blood Dawn')).toBeVisible();
  36 |   await playerPage.reload();
  37 |   await expect(playerPage.getByText('Blood Dawn')).toBeVisible();
  38 | 
  39 |   // Item is still equipped
  40 |   await expect(playerPage.getByText('12')).toBeVisible();
  41 | 
  42 |   // Player unequips
  43 |   await playerPage.getByRole('checkbox').uncheck();
  44 | 
  45 |   // Stat physically reverts via EffectEngine revertData!
  46 |   await expect(playerPage.getByText('10').first()).toBeVisible();
  47 | });
  48 | 
```