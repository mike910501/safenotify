require('dotenv').config();
const axios = require('axios');

async function testWebhookFixed() {
  console.log('🧪 Testing webhook with fixed userWhatsApp error...\n');
  
  const data = {
    From: 'whatsapp:+573133592457',
    To: 'whatsapp:+573002843765',
    Body: 'Hola, necesito información',
    ProfileName: 'Test Customer',
    MessageSid: `FIXED_TEST_${Date.now()}`
  };
  
  console.log('📤 Sending test message to webhook...');
  
  try {
    const response = await axios.post('http://localhost:3005/api/webhooks/user-crm', 
      new URLSearchParams(data),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      }
    );
    
    console.log('✅ Response status:', response.status);
    console.log('✅ Response data:', response.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testWebhookFixed();