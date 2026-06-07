import { test, expect } from '@playwright/test';

test('Phase 2 & 4: Time-based statuses and Theme transition', async ({ context }) => {
  const dmPage = await context.newPage();
  const playerPage = await context.newPage();

  await dmPage.goto('/');
  await playerPage.goto('/');

  // Setup DM Page
  await dmPage.getByRole('button', { name: 'Switch Role' }).click();
  await expect(dmPage.getByText('Dungeon Master')).toBeVisible();

  // Initially: Witching Hour Phase (Block 0)
  await expect(dmPage.getByText('Witching Hour')).toBeVisible();
  
  await playerPage.reload();
  await expect(playerPage.getByText('Witching Hour')).toBeVisible();

  // Test the pure Effect Engine via Equipping an Item
  // The stat field shows '10' - use .first() to target the stat display
  await expect(playerPage.getByText('10').first()).toBeVisible();

  // Player equips Ring of Strength
  await playerPage.getByRole('checkbox').check();
  await expect(playerPage.getByRole('checkbox')).toBeChecked();

  // Stat mutates physically via EffectEngine (+2 STR from ring)
  await expect(playerPage.getByText('12')).toBeVisible();

  // DM advances time by 6 Hours (1 block)
  await dmPage.getByRole('button', { name: /\+6 Hours/i }).click();

  // Phase changes to Blood Dawn (Block 1)
  await expect(dmPage.getByText('Blood Dawn')).toBeVisible();
  await playerPage.reload();
  await expect(playerPage.getByText('Blood Dawn')).toBeVisible();

  // Item is still equipped
  await expect(playerPage.getByText('12')).toBeVisible();

  // Player unequips
  await playerPage.getByRole('checkbox').uncheck();

  // Stat physically reverts via EffectEngine revertData!
  await expect(playerPage.getByText('10').first()).toBeVisible();
});
