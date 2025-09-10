require('dotenv').config();
const axios = require('axios');

async function testMessages() {
  console.log('🔍 Testing multiple messages...\n');
  
  const messages = [
    { body: 'Un salón de belleza', description: 'Simple message' },
    { body: '100', description: 'Number only' },
    { body: '?', description: 'Single character' },
    { body: 'No envío', description: 'Short answer' },
    { body: 'Por qué ?', description: 'Question' }
  ];
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    console.log(`\n📤 Test ${i + 1}: ${msg.description}`);
    console.log(`   Message: "${msg.body}"`);
    console.log(`   Length: ${msg.body.length} characters`);
    
    const data = {
      From: 'whatsapp:+573133592457',
      To: 'whatsapp:+573002843765',
      Body: msg.body,
      ProfileName: 'Test Customer',
      MessageSid: `TEST_${Date.now()}_${i}`
    };
    
    try {
      const response = await axios.post('http://localhost:3005/api/webhooks/user-crm', 
        new URLSearchParams(data),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000 // 10 second timeout
        }
      );
      
      console.log(`   ✅ Response status: ${response.status}`);
      
    } catch (error) {
      console.error(`   ❌ Error:`, error.response?.data || error.message);
    }
    
    // Wait between messages
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n✅ Test completed. Check server logs for details.');
}

testMessages();