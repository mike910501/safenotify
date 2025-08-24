// Test del login directo
require('dotenv').config();

async function testLogin() {
  try {
    console.log('🔐 Probando login...');
    
    const response = await fetch('http://localhost:3005/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@safenotify.com',
        password: 'password123'
      })
    });

    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    if (data.success) {
      console.log('✅ Login exitoso');
      console.log('Usuario:', data.user);
      console.log('Token:', data.token ? 'Token recibido' : 'Sin token');
    } else {
      console.log('❌ Login fallido:', data.error);
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error.message);
  }
}

testLogin();