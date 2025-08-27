const https = require('https');
require('dotenv').config();

// Configuración
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

async function testDirectAPI() {
  console.log('🔍 Probando envío directo a API de Twilio...\n');
  console.log('📋 Configuración:');
  console.log('   Account SID:', accountSid);
  console.log('   WhatsApp:', process.env.TWILIO_WHATSAPP_NUMBER);
  console.log('');

  // Probar diferentes formatos de contentVariables
  const tests = [
    {
      name: 'Formato 1: Objeto con números como strings',
      contentVariables: JSON.stringify({
        "1": "Juan Pérez",
        "2": "Clínica Central", 
        "3": "Consulta General",
        "4": "28 de Agosto",
        "5": "Calle 123",
        "6": "10:00 AM"
      })
    },
    {
      name: 'Formato 2: Objeto con nombres de variables',
      contentVariables: JSON.stringify({
        "nombre": "Juan Pérez",
        "empresa": "Clínica Central",
        "tipo": "Consulta General",
        "fecha": "28 de Agosto",
        "lugar": "Calle 123",
        "hora": "10:00 AM"
      })
    },
    {
      name: 'Formato 3: Sin contentVariables',
      contentVariables: undefined
    }
  ];

  for (const test of tests) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📝 ${test.name}`);
    console.log(`   Variables:`, test.contentVariables ? JSON.parse(test.contentVariables) : 'None');
    
    // Construir el cuerpo de la solicitud
    const params = new URLSearchParams({
      From: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      To: 'whatsapp:+573108800753',
      ContentSid: 'HX164c5aa2918cc699bedbe253ba2bf805'
    });
    
    if (test.contentVariables) {
      params.append('ContentVariables', test.contentVariables);
    }

    const postData = params.toString();

    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    await new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.sid) {
              console.log(`   ✅ Éxito: ${response.sid}`);
              console.log(`   Status: ${response.status}`);
            } else if (response.code) {
              console.log(`   ❌ Error ${response.code}: ${response.message}`);
              if (response.code === 63016) {
                console.log(`   ⚠️  Se está enviando como mensaje libre`);
              } else if (response.code === 21655) {
                console.log(`   ⚠️  Content SID no válido`);
              }
            }
          } catch (e) {
            console.log(`   ❌ Error parsing response:`, data);
          }
          resolve();
        });
      });

      req.on('error', (e) => {
        console.log(`   ❌ Request error:`, e.message);
        resolve();
      });

      req.write(postData);
      req.end();
    });
  }
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  console.log('📊 Resumen:');
  console.log('   - Si todos fallan con error 21655: El Content SID no existe en tu cuenta');
  console.log('   - Si todos fallan con error 63016: Se está enviando como mensaje libre');
  console.log('   - Si alguno funciona: Ese es el formato correcto de variables');
}

// Ejecutar
testDirectAPI();