import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api';

async function testAPIEndpoints() {
  console.log('🧪 Testing API Endpoints...');
  
  try {
    // Test registration
    console.log('1. Testing registration...');
    const timestamp = Date.now();
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email: `testuser${timestamp}@example.com`,
      username: 'Test User',
      password: 'password123'
    });
    console.log('✅ Registration successful:', registerResponse.data.user.id);
    
    // Test login
    console.log('2. Testing login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: `testuser${timestamp}@example.com`,
      password: 'password123'
    });
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Test sending first message (creates conversation automatically)
    console.log('3. Testing first message (creates conversation)...');
    const messageResponse = await axios.post(`${BASE_URL}/chat`, {
      message: 'Halo, saya ingin belajar tentang Al-Quran'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const conversationId = messageResponse.data.conversationId;
    console.log('✅ First message sent, conversation created:', conversationId);
    
    // Test getting conversations
    console.log('4. Testing conversation retrieval...');
    const conversationsResponse = await axios.get(`${BASE_URL}/chat/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Retrieved conversations:', conversationsResponse.data.conversations.length);
    
    // Test getting messages
    console.log('5. Testing message retrieval...');
    const messagesResponse = await axios.get(`${BASE_URL}/chat/conversations/${conversationId}/messages`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Retrieved messages:', messagesResponse.data.messages.length);
    
    // Test tafsir mode
    console.log('6. Testing tafsir mode...');
    const tafsirResponse = await axios.post(`${BASE_URL}/chat/tafsir/start`, {
      surahNumber: 1,
      ayatNumber: 1
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Tafsir mode response received');
    
    // Test hafalan mode
    console.log('7. Testing hafalan mode...');
    const hafalanResponse = await axios.post(`${BASE_URL}/chat/hafalan/start`, {
      surah: 1,
      ayat: 1,
      mode: 'forward',
      difficulty: 'medium'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Hafalan session started');
    
    // Test hafalan attempt
    console.log('8. Testing hafalan attempt...');
    const attemptResponse = await axios.post(`${BASE_URL}/chat/hafalan/evaluate`, {
      sessionId: hafalanResponse.data.sessionId,
      userInput: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      surahNumber: 1,
      ayatNumber: 1
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Hafalan attempt submitted, score:', attemptResponse.data.score);
    
    console.log('\n🎉 All API tests passed!');
    
  } catch (error: any) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  }
}

testAPIEndpoints();