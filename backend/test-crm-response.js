require('dotenv').config();
const axios = require('axios');

async function testCRM() {
  console.log('🔍 Testing CRM webhook response...');
  
  const data = {
    From: 'whatsapp:+573133592457', // Customer phone
    To: 'whatsapp:+573002843765',    // User WhatsApp number
    Body: 'Un salón de belleza con 5 estilistas',
    ProfileName: 'Test Customer'
  };
  
  console.log('📤 Sending test data:', data);
  
  try {
    const response = await axios.post('http://localhost:3005/api/webhooks/user-crm', 
      new URLSearchParams(data),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('✅ Response status:', response.status);
    console.log('✅ Response data:', response.data);
    
    // Wait a moment to see logs
    console.log('⏳ Check server logs for debug messages...');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testCRM();