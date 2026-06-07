import { test, expect } from '@playwright/test';

test('Phase 3 & 5: Event generation automatically populates Combat Tracker and ticks statuses', async ({ context }) => {
  const dmPage = await context.newPage();
  const playerPage = await context.newPage();

  await dmPage.goto('/');
  await playerPage.goto('/');

  // 1. Setup DM Page
  await dmPage.getByRole('button', { name: 'Switch Role' }).click();
  await expect(dmPage.getByText('Dungeon Master')).toBeVisible();

  // 2. Go to Monsters Tab and Add a Monster Template
  await dmPage.getByRole('button', { name: /monsters/i }).click();
  await dmPage.getByPlaceholder('Monster Name').fill('Dire Wolf');
  await dmPage.locator('input[type="number"]').last().fill('20');
  await dmPage.getByRole('button', { name: 'Add' }).click();
  await expect(dmPage.getByText('Dire Wolf')).toBeVisible();

  // 3. Go to Events Tab and Create an Event Table
  await dmPage.getByRole('button', { name: /events/i }).click();
  await dmPage.getByPlaceholder('New Table Name').fill('Forest Encounters');
  await dmPage.getByRole('button', { name: 'Create' }).click();
  
  // Verify default event entry is created: "A pack of wolves attacks!"
  await expect(dmPage.getByText('A pack of wolves attacks!')).toBeVisible();

  // 4. Roll the Event
  await dmPage.getByRole('button', { name: /Roll/i }).click();

  // Result modal appears
  await expect(dmPage.getByText('Fate Speaks')).toBeVisible();
  await expect(dmPage.locator('.fixed').getByText('A pack of wolves attacks!')).toBeVisible();

  // 5. Confirm & Apply
  await dmPage.getByRole('button', { name: /Confirm/i }).click();
  await expect(dmPage.getByText('Fate Speaks!')).not.toBeVisible();

  // 6. Go to Combat Tab
  await dmPage.getByRole('button', { name: /combat/i }).click();
  
  // Verify wolves were instantiated!
  await expect(dmPage.getByText('Dire Wolf 1')).toBeVisible();
  await expect(dmPage.getByText('Dire Wolf 2')).toBeVisible();
  await expect(dmPage.getByText('Dire Wolf 3')).toBeVisible();

  // 7. Start Combat
  await dmPage.getByRole('button', { name: 'Start Combat' }).click();
  await expect(dmPage.getByText('Round 1')).toBeVisible();

  // Player page should now see the combat tracker
  await playerPage.reload();
  await expect(playerPage.getByText('Combat')).toBeVisible();
  await expect(playerPage.getByText('Round 1')).toBeVisible();
  await expect(playerPage.getByText('Dire Wolf 1')).toBeVisible();

  // 8. Next Turn cycle to test Next Round
  await dmPage.getByRole('button', { name: /Next Turn/i }).click();
  await dmPage.getByRole('button', { name: /Next Turn/i }).click();
  await dmPage.getByRole('button', { name: /Next Turn/i }).click();

  await expect(dmPage.getByText('Round 2')).toBeVisible();
  
  await playerPage.reload();
  await expect(playerPage.getByText('Round 2')).toBeVisible();
});
