# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: combat-events.spec.ts >> Phase 3 & 5: Event generation automatically populates Combat Tracker and ticks statuses
- Location: tests\e2e\combat-events.spec.ts:3:1

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
  3  | test('Phase 3 & 5: Event generation automatically populates Combat Tracker and ticks statuses', async ({ context }) => {
  4  |   const dmPage = await context.newPage();
  5  |   const playerPage = await context.newPage();
  6  | 
  7  |   await dmPage.goto('/');
  8  |   await playerPage.goto('/');
  9  | 
  10 |   // 1. Setup DM Page
> 11 |   await dmPage.getByRole('button', { name: 'Switch Role' }).click();
     |                                                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  12 |   await expect(dmPage.getByText('Dungeon Master')).toBeVisible();
  13 | 
  14 |   // 2. Go to Monsters Tab and Add a Monster Template
  15 |   await dmPage.getByRole('button', { name: /monsters/i }).click();
  16 |   await dmPage.getByPlaceholder('Monster Name').fill('Dire Wolf');
  17 |   await dmPage.locator('input[type="number"]').last().fill('20');
  18 |   await dmPage.getByRole('button', { name: 'Add' }).click();
  19 |   await expect(dmPage.getByText('Dire Wolf')).toBeVisible();
  20 | 
  21 |   // 3. Go to Events Tab and Create an Event Table
  22 |   await dmPage.getByRole('button', { name: /events/i }).click();
  23 |   await dmPage.getByPlaceholder('New Table Name').fill('Forest Encounters');
  24 |   await dmPage.getByRole('button', { name: 'Create' }).click();
  25 |   
  26 |   // Verify default event entry is created: "A pack of wolves attacks!"
  27 |   await expect(dmPage.getByText('A pack of wolves attacks!')).toBeVisible();
  28 | 
  29 |   // 4. Roll the Event
  30 |   await dmPage.getByRole('button', { name: /Roll/i }).click();
  31 | 
  32 |   // Result modal appears
  33 |   await expect(dmPage.getByText('Fate Speaks')).toBeVisible();
  34 |   await expect(dmPage.locator('.fixed').getByText('A pack of wolves attacks!')).toBeVisible();
  35 | 
  36 |   // 5. Confirm & Apply
  37 |   await dmPage.getByRole('button', { name: /Confirm/i }).click();
  38 |   await expect(dmPage.getByText('Fate Speaks!')).not.toBeVisible();
  39 | 
  40 |   // 6. Go to Combat Tab
  41 |   await dmPage.getByRole('button', { name: /combat/i }).click();
  42 |   
  43 |   // Verify wolves were instantiated!
  44 |   await expect(dmPage.getByText('Dire Wolf 1')).toBeVisible();
  45 |   await expect(dmPage.getByText('Dire Wolf 2')).toBeVisible();
  46 |   await expect(dmPage.getByText('Dire Wolf 3')).toBeVisible();
  47 | 
  48 |   // 7. Start Combat
  49 |   await dmPage.getByRole('button', { name: 'Start Combat' }).click();
  50 |   await expect(dmPage.getByText('Round 1')).toBeVisible();
  51 | 
  52 |   // Player page should now see the combat tracker
  53 |   await playerPage.reload();
  54 |   await expect(playerPage.getByText('Combat')).toBeVisible();
  55 |   await expect(playerPage.getByText('Round 1')).toBeVisible();
  56 |   await expect(playerPage.getByText('Dire Wolf 1')).toBeVisible();
  57 | 
  58 |   // 8. Next Turn cycle to test Next Round
  59 |   await dmPage.getByRole('button', { name: /Next Turn/i }).click();
  60 |   await dmPage.getByRole('button', { name: /Next Turn/i }).click();
  61 |   await dmPage.getByRole('button', { name: /Next Turn/i }).click();
  62 | 
  63 |   await expect(dmPage.getByText('Round 2')).toBeVisible();
  64 |   
  65 |   await playerPage.reload();
  66 |   await expect(playerPage.getByText('Round 2')).toBeVisible();
  67 | });
  68 | 
```