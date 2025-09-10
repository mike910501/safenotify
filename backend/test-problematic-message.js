require('dotenv').config();
const axios = require('axios');

async function testProblematicMessage() {
  console.log('🔍 Testing the problematic "Con 100" message...\n');
  
  console.log('⏳ Waiting for server to start...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const data = {
    From: 'whatsapp:+573133592457',
    To: 'whatsapp:+573002843765',
    Body: 'Con 100',  // El mensaje problemático exacto
    ProfileName: 'Test Customer',
    MessageSid: `PROBLEM_TEST_${Date.now()}`
  };
  
  console.log('📤 Sending problematic message:', data.Body);
  
  try {
    const response = await axios.post('http://localhost:3005/api/webhooks/user-crm', 
      new URLSearchParams(data),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000 // 30 seconds to catch the error
      }
    );
    
    console.log('✅ Response status:', response.status);
    console.log('✅ Response data:', response.data);
    
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.log('⏳ Request timed out - check server logs for detailed error');
    } else {
      console.error('❌ Error:', error.response?.data || error.message);
    }
  }
  
  console.log('\n🔍 Check server logs above for the CRITICAL ERROR details!');
}

testProblematicMessage();