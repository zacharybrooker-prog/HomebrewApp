import { chromium } from '@playwright/test';
import { exec } from 'child_process';

(async () => {
  console.log('Starting preview server...');
  const server = exec('pnpm dlx vite preview --port 4173');
  
  await new Promise(r => setTimeout(r, 3000));

  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  
  console.log('Navigating...');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });

  // Wait for the app to render
  await new Promise(r => setTimeout(r, 1000));

  // Host a campaign to get to the lobby
  console.log('Clicking Host Campaign...');
  await page.getByRole('button', { name: 'Host Campaign' }).click();
  
  await new Promise(r => setTimeout(r, 1000));

  console.log('Clicking Connect to Cloud Server...');
  await page.getByRole('button', { name: 'Connect to Cloud Server' }).click();

  // Wait to observe any errors
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
  server.kill();
  console.log('Done');
})();
