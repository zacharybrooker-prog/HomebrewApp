import { chromium } from 'playwright';
import { exec } from 'child_process';

(async () => {
  console.log('Starting preview server...');
  const server = exec('pnpm dlx vite preview --port 4173');
  
  await new Promise(r => setTimeout(r, 4000));

  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  
  console.log('Navigating...');
  try {
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  } catch (e) {
    console.log('Navigation error:', e.message);
  }
  
  await browser.close();
  server.kill();
  console.log('Done');
})();
