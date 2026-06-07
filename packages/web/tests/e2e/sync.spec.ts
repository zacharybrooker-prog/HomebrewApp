import { test, expect } from '@playwright/test';

test('Phase 1 Patch: Authority, Schema, and Effects', async ({ context }) => {
  const dmPage = await context.newPage();
  const playerPage = await context.newPage();

  await dmPage.goto('/');
  await playerPage.goto('/');

  // Setup DM Page
  await dmPage.getByRole('button', { name: 'Switch Role' }).click(); // Becomes DM
  await expect(dmPage.getByText('Role: DM')).toBeVisible();

  // 1. Schema Editor propagates
  await dmPage.getByPlaceholder('New Stat (e.g. DEX)').fill('DEX');
  await dmPage.getByRole('button', { name: 'Add' }).click();
  await expect(dmPage.getByText('DEX', { exact: true })).toBeVisible();
  
  await playerPage.reload();
  await expect(playerPage.getByText('DEX', { exact: true })).toBeVisible();

  // 2. Equip Effect modifies stat
  await expect(playerPage.getByText('12')).not.toBeVisible();
  await playerPage.locator('input[type="checkbox"]').check(); // Equips the ring
  
  // STR should become 12 (Base 10 + Ring 2)
  await expect(playerPage.getByText('12')).toBeVisible();

  // 3. Authority Layer protects against player edits when locked
  await dmPage.getByText('Lock Sheet').click();
  await expect(dmPage.getByText('Unlock Sheet')).toBeVisible();
  
  await playerPage.reload(); // Sync lock state
  playerPage.on('dialog', dialog => dialog.accept()); // accept alert

  // Player tries to increment STR base
  // Click the '+' button for STR
  await playerPage.locator('button', { hasText: '+' }).first().click();
  
  // Should still be 12, not 13.
  await expect(playerPage.getByText('12')).toBeVisible();
  await expect(playerPage.getByText('13')).not.toBeVisible();
});
