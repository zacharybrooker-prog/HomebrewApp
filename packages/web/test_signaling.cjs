const WebSocket = require('ws');

const servers = [
  'wss://signaling.yjs.dev',
  'wss://y-webrtc-signaling-eu.herokuapp.com',
  'wss://y-webrtc-signaling-us.herokuapp.com',
  'wss://y-webrtc-eu.fly.dev',
  'wss://y-webrtc-us.fly.dev',
  'wss://yjs-webrtc-signaling.fly.dev',
  'wss://webrtc.yjs.dev',
  'wss://signaling.tiptap.dev',
  'wss://y-webrtc.fly.dev',
  'wss://y-webrtc-signaling.fly.dev',
  'wss://demos.yjs.dev/webrtc'
];

async function checkServer(url) {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(url, { handshakeTimeout: 5000 });
      
      ws.on('open', () => {
        console.log(`[SUCCESS] ${url} is ONLINE`);
        ws.close();
        resolve(true);
      });
      
      ws.on('error', (err) => {
        // console.log(`[ERROR] ${url}: ${err.message}`);
        resolve(false);
      });
      
      ws.on('close', () => {
        resolve(false);
      });
    } catch(e) {
      resolve(false);
    }
  });
}

(async () => {
  console.log('Testing public signaling servers...');
  for (const url of servers) {
    await checkServer(url);
  }
  console.log('Done testing.');
})();
