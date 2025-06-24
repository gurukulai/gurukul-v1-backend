const io = require('socket.io-client');

// Configuration
const WS_URL = 'ws://localhost:3000/ws';
const JWT_TOKEN = 'your-jwt-token-here'; // Replace with actual token
const CHAT_ID = 'test-chat-id'; // Replace with actual chat ID

// Connect to WebSocket server
const socket = io(WS_URL, {
  query: { token: JWT_TOKEN },
  transports: ['websocket'],
});

// Connection event handlers
socket.on('connect', () => {
  console.log('✅ Connected to WebSocket server');
  console.log('Socket ID:', socket.id);

  // Join a chat room
  joinChatRoom();
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from WebSocket server');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

// Message event handlers
socket.on('message', (data) => {
  console.log('📨 Received message:', JSON.stringify(data, null, 2));
});

socket.on('typing', (data) => {
  console.log('⌨️  Typing indicator:', JSON.stringify(data, null, 2));
});

socket.on('read_receipt', (data) => {
  console.log('👁️  Read receipt:', JSON.stringify(data, null, 2));
});

socket.on('chat_update', (data) => {
  console.log('💬 Chat update:', JSON.stringify(data, null, 2));
});

socket.on('error', (data) => {
  console.error('❌ Error:', JSON.stringify(data, null, 2));
});

socket.on('pong', (data) => {
  console.log('🏓 Pong received:', JSON.stringify(data, null, 2));
});

// Helper functions
function joinChatRoom() {
  console.log('🚪 Joining chat room:', CHAT_ID);

  socket.emit('chat_update', {
    type: 'chat_update',
    data: {
      action: 'join',
      chatId: CHAT_ID,
    },
    timestamp: Date.now(),
  });
}

function sendMessage(content, agentId = 'therapist') {
  const messageId = `temp-${Date.now()}`;

  console.log('📤 Sending message:', content);

  socket.emit('message', {
    type: 'message',
    data: {
      chatId: CHAT_ID,
      content: content,
      agentId: agentId,
      messageId: messageId,
    },
    timestamp: Date.now(),
    messageId: messageId,
  });
}

function sendTypingIndicator(isTyping = true) {
  console.log('⌨️  Sending typing indicator:', isTyping);

  socket.emit('typing', {
    type: 'typing',
    data: {
      chatId: CHAT_ID,
      agentId: 'therapist',
      isTyping: isTyping,
    },
    timestamp: Date.now(),
  });
}

function sendReadReceipt(messageIds) {
  console.log('👁️  Sending read receipt for messages:', messageIds);

  socket.emit('read_receipt', {
    type: 'read_receipt',
    data: {
      chatId: CHAT_ID,
      messageIds: messageIds,
    },
    timestamp: Date.now(),
  });
}

function sendPing() {
  console.log('🏓 Sending ping');

  socket.emit('ping', {
    type: 'ping',
    data: {
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  });
}

// Test scenarios
function runTests() {
  console.log('\n🧪 Starting WebSocket tests...\n');

  // Wait for connection
  setTimeout(() => {
    // Test 1: Send a message
    setTimeout(() => {
      sendMessage('Hello, this is a test message!');
    }, 1000);

    // Test 2: Send typing indicator
    setTimeout(() => {
      sendTypingIndicator(true);
    }, 2000);

    // Test 3: Stop typing indicator
    setTimeout(() => {
      sendTypingIndicator(false);
    }, 3000);

    // Test 4: Send another message
    setTimeout(() => {
      sendMessage('This is another test message!');
    }, 4000);

    // Test 5: Send read receipt
    setTimeout(() => {
      sendReadReceipt(['msg-123', 'msg-124']);
    }, 5000);

    // Test 6: Send ping
    setTimeout(() => {
      sendPing();
    }, 6000);

    // Test 7: Leave chat room
    setTimeout(() => {
      console.log('🚪 Leaving chat room');
      socket.emit('chat_update', {
        type: 'chat_update',
        data: {
          action: 'leave',
          chatId: CHAT_ID,
        },
        timestamp: Date.now(),
      });
    }, 7000);

    // Test 8: Disconnect
    setTimeout(() => {
      console.log('🔌 Disconnecting...');
      socket.disconnect();
    }, 8000);
  }, 1000);
}

// Interactive mode
function startInteractiveMode() {
  console.log('\n🎮 Interactive mode started!');
  console.log('Available commands:');
  console.log('  message <content> - Send a message');
  console.log('  typing <true|false> - Send typing indicator');
  console.log('  read <messageIds> - Send read receipt');
  console.log('  ping - Send ping');
  console.log('  join - Join chat room');
  console.log('  leave - Leave chat room');
  console.log('  quit - Disconnect and exit\n');

  process.stdin.on('data', (data) => {
    const input = data.toString().trim();
    const parts = input.split(' ');
    const command = parts[0];
    const args = parts.slice(1);

    switch (command) {
      case 'message':
        if (args.length > 0) {
          sendMessage(args.join(' '));
        } else {
          console.log('❌ Please provide message content');
        }
        break;

      case 'typing':
        const isTyping = args[0] === 'true';
        sendTypingIndicator(isTyping);
        break;

      case 'read':
        if (args.length > 0) {
          sendReadReceipt(args);
        } else {
          console.log('❌ Please provide message IDs');
        }
        break;

      case 'ping':
        sendPing();
        break;

      case 'join':
        joinChatRoom();
        break;

      case 'leave':
        socket.emit('chat_update', {
          type: 'chat_update',
          data: {
            action: 'leave',
            chatId: CHAT_ID,
          },
          timestamp: Date.now(),
        });
        break;

      case 'quit':
        console.log('👋 Goodbye!');
        socket.disconnect();
        process.exit(0);
        break;

      default:
        console.log('❌ Unknown command. Type "quit" to exit.');
    }
  });
}

// Main execution
if (process.argv.includes('--interactive')) {
  startInteractiveMode();
} else {
  runTests();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  socket.disconnect();
  process.exit(0);
});

console.log('🚀 WebSocket test client started');
console.log('URL:', WS_URL);
console.log('Chat ID:', CHAT_ID);
console.log('Use --interactive flag for interactive mode\n');
