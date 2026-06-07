import { chromium } from '@playwright/test';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));
  
  console.log('Testing WebSocket...');
  await page.evaluate(() => {
    return new Promise((resolve) => {
      console.log('Attempting connection to wss://signaling.tiptap.dev...');
      const ws = new WebSocket('wss://signaling.tiptap.dev');
      
      ws.onopen = () => {
        console.log('WS OPENED SUCCESSFULLY!');
        ws.close();
        resolve(true);
      };
      
      ws.onerror = (err) => {
        console.log('WS ERROR:', err);
        resolve(false);
      };
      
      ws.onclose = (event) => {
        console.log(`WS CLOSED: Code=${event.code}, Reason=${event.reason}`);
        resolve(false);
      };
    });
  });
  
  await browser.close();
  console.log('Done');
})();
