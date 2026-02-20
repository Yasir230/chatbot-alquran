import { mockDb } from './src/db/mockDatabase';

async function testMockDatabase() {
  console.log('🧪 Testing Mock Database...');
  
  try {
    // Test user creation
    console.log('1. Testing user creation...');
    const user = await mockDb.createUser('test@example.com', 'Test User', 'hashed_password');
    console.log('✅ User created:', user.id);
    
    // Test conversation creation
    console.log('2. Testing conversation creation...');
    const conversation = await mockDb.createConversation(user.id, 'Test Conversation');
    console.log('✅ Conversation created:', conversation.id);
    
    // Test message creation
    console.log('3. Testing message creation...');
    const message1 = await mockDb.createMessage(conversation.id, 'user', 'Hello, this is a test message');
    const message2 = await mockDb.createMessage(conversation.id, 'assistant', 'Hello! How can I help you?');
    console.log('✅ Messages created:', message1.id, message2.id);
    
    // Test message retrieval
    console.log('4. Testing message retrieval...');
    const messages = await mockDb.getMessages(conversation.id);
    console.log('✅ Retrieved messages:', messages.length);
    
    // Test conversation retrieval
    console.log('5. Testing conversation retrieval...');
    const conversations = await mockDb.getConversations(user.id);
    console.log('✅ Retrieved conversations:', conversations.length);
    
    // Test memorization session
    console.log('6. Testing memorization session...');
    const session = await mockDb.createMemorizationSession(user.id, 1, 1, 'forward', 'medium');
    console.log('✅ Memorization session created:', session.id);
    
    // Test memorization attempt
    console.log('7. Testing memorization attempt...');
    const attempt = await mockDb.createMemorizationAttempt(session.id, 1, 1, 'Test input', true, 0.95, 0);
    console.log('✅ Memorization attempt created:', attempt.id);
    
    // Test memorization stats
    console.log('8. Testing memorization stats...');
    const attempts = await mockDb.getMemorizationAttempts(session.id);
    console.log('✅ Retrieved attempts:', attempts.length);
    
    console.log('\n🎉 All mock database tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMockDatabase();