const https = require('https');

async function testProductionAPI() {
  console.log('🔍 Probando API de producción directamente...\n');

  // Test data
  const testData = {
    to: '+573108800753',
    contentSid: 'HX164c5aa2918cc699bedbe253ba2bf805',
    variables: {
      "1": "Juan Pérez",
      "2": "Clínica Central",
      "3": "Consulta General",
      "4": "28 de Agosto 2025",
      "5": "Calle 123 #45-67",
      "6": "10:00 AM"
    }
  };

  const postData = JSON.stringify({
    testData: testData
  });

  const options = {
    hostname: 'api.safenotify.co',
    port: 443,
    path: '/api/test-template',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📡 Response Status:', res.statusCode);
        console.log('📄 Response:', data);
        
        try {
          const jsonResponse = JSON.parse(data);
          if (jsonResponse.success) {
            console.log('✅ Test exitoso');
          } else {
            console.log('❌ Error:', jsonResponse.error);
          }
        } catch (e) {
          console.log('Raw response:', data);
        }
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.error('❌ Request error:', e);
      reject(e);
    });
    
    req.write(postData);
    req.end();
  });
}

// Execute
testProductionAPI().catch(console.error);