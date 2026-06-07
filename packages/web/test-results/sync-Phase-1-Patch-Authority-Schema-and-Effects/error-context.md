# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sync.spec.ts >> Phase 1 Patch: Authority, Schema, and Effects
- Location: tests\e2e\sync.spec.ts:3:1

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
  3  | test('Phase 1 Patch: Authority, Schema, and Effects', async ({ context }) => {
  4  |   const dmPage = await context.newPage();
  5  |   const playerPage = await context.newPage();
  6  | 
  7  |   await dmPage.goto('/');
  8  |   await playerPage.goto('/');
  9  | 
  10 |   // Setup DM Page
> 11 |   await dmPage.getByRole('button', { name: 'Switch Role' }).click(); // Becomes DM
     |                                                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
  12 |   await expect(dmPage.getByText('Role: DM')).toBeVisible();
  13 | 
  14 |   // 1. Schema Editor propagates
  15 |   await dmPage.getByPlaceholder('New Stat (e.g. DEX)').fill('DEX');
  16 |   await dmPage.getByRole('button', { name: 'Add' }).click();
  17 |   await expect(dmPage.getByText('DEX', { exact: true })).toBeVisible();
  18 |   
  19 |   await playerPage.reload();
  20 |   await expect(playerPage.getByText('DEX', { exact: true })).toBeVisible();
  21 | 
  22 |   // 2. Equip Effect modifies stat
  23 |   await expect(playerPage.getByText('12')).not.toBeVisible();
  24 |   await playerPage.locator('input[type="checkbox"]').check(); // Equips the ring
  25 |   
  26 |   // STR should become 12 (Base 10 + Ring 2)
  27 |   await expect(playerPage.getByText('12')).toBeVisible();
  28 | 
  29 |   // 3. Authority Layer protects against player edits when locked
  30 |   await dmPage.getByText('Lock Sheet').click();
  31 |   await expect(dmPage.getByText('Unlock Sheet')).toBeVisible();
  32 |   
  33 |   await playerPage.reload(); // Sync lock state
  34 |   playerPage.on('dialog', dialog => dialog.accept()); // accept alert
  35 | 
  36 |   // Player tries to increment STR base
  37 |   // Click the '+' button for STR
  38 |   await playerPage.locator('button', { hasText: '+' }).first().click();
  39 |   
  40 |   // Should still be 12, not 13.
  41 |   await expect(playerPage.getByText('12')).toBeVisible();
  42 |   await expect(playerPage.getByText('13')).not.toBeVisible();
  43 | });
  44 | 
```