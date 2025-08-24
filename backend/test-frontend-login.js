// Test que simula exactamente el frontend
require('dotenv').config();

async function testFrontendLogin() {
  try {
    console.log('🔐 Simulando login del frontend...');
    
    const response = await fetch('http://localhost:3005/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ 
        email: 'admin@safenotify.com', 
        password: 'password123' 
      })
    });

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers));
    
    const data = await response.json();
    console.log('Response:', data);
    
    if (response.ok) {
      console.log('✅ Login exitoso');
    } else {
      console.log('❌ Login fallido');
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
  }
}

testFrontendLogin();