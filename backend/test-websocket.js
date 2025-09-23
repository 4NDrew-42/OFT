const WebSocket = require('ws');

console.log('🧪 Testing WebSocket connection...');

const ws = new WebSocket('ws://localhost:3004/?userId=test-user');

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  
  // Send a ping
  ws.send(JSON.stringify({ type: 'ping' }));
  
  // Request some content
  setTimeout(() => {
    ws.send(JSON.stringify({ 
      type: 'request_content', 
      count: 2,
      requestId: 'test-123'
    }));
  }, 1000);
  
  // Close after 5 seconds
  setTimeout(() => {
    ws.close();
  }, 5000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('📨 Received:', message.type, message.data ? '(with data)' : '');
});

ws.on('close', () => {
  console.log('🔌 WebSocket disconnected');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});
