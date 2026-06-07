const WebSocket = require('ws');

const ws = new WebSocket('wss://demos.yjs.dev/ws');

ws.on('open', function open() {
  console.log('Connected to wss://demos.yjs.dev/ws');
  ws.close();
});

ws.on('error', function error(err) {
  console.log('Error with /ws:', err.message);
  
  const ws2 = new WebSocket('wss://demos.yjs.dev');
  ws2.on('open', function open() {
    console.log('Connected to wss://demos.yjs.dev');
    ws2.close();
  });
  ws2.on('error', function error(err2) {
    console.log('Error with root:', err2.message);
  });
});
