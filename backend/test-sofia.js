require('dotenv').config();
const axios = require('axios');

async function testSofia() {
  console.log('🔍 Testing Sofia webhook...');
  console.log('TWILIO_WHATSAPP_NUMBER:', process.env.TWILIO_WHATSAPP_NUMBER);
  
  const data = {
    From: 'whatsapp:+573133592457',
    To: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    Body: 'Hola Sofia, necesito información sobre SafeNotify',
    ProfileName: 'Test User'
  };
  
  console.log('📤 Sending test data:', data);
  
  try {
    const response = await axios.post('http://localhost:3005/api/webhooks/sofia-sales', 
      new URLSearchParams(data),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('✅ Response:', response.data);
    console.log('✅ Status:', response.status);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSofia();