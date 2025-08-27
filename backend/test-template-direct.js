const twilio = require('twilio');
require('dotenv').config();

// Configuración de Twilio con credenciales de subcuenta
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function testTemplate() {
  try {
    console.log('🔧 Configuración:');
    console.log('   Account SID:', accountSid);
    console.log('   WhatsApp Number:', process.env.TWILIO_WHATSAPP_NUMBER);
    console.log('');
    
    // Datos de prueba
    const testPhone = '+573108800753'; // Tu número de prueba
    const contentSid = 'HX164c5aa2918cc699bedbe253ba2bf805';
    
    // Variables para la plantilla - usando números como keys
    const contentVariables = {
      "1": "Juan Pérez",
      "2": "Clínica Central",
      "3": "Consulta General",
      "4": "28 de Agosto 2025",
      "5": "Calle 123 #45-67",
      "6": "10:00 AM"
    };
    
    console.log('📱 Enviando mensaje de prueba...');
    console.log('   Para:', testPhone);
    console.log('   Content SID:', contentSid);
    console.log('   Variables:', JSON.stringify(contentVariables, null, 2));
    console.log('');
    
    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${testPhone}`,
      contentSid: contentSid,
      contentVariables: JSON.stringify(contentVariables)
    });
    
    console.log('✅ Mensaje enviado exitosamente');
    console.log('   Message SID:', message.sid);
    console.log('   Status:', message.status);
    console.log('   Date Created:', message.dateCreated);
    
  } catch (error) {
    console.error('❌ Error enviando mensaje:');
    console.error('   Código:', error.code);
    console.error('   Mensaje:', error.message);
    
    if (error.code === 63016) {
      console.error('\n⚠️  Error 63016: El mensaje se está enviando como texto libre');
      console.error('   Posibles causas:');
      console.error('   1. El Content SID no es válido');
      console.error('   2. La plantilla no está aprobada');
      console.error('   3. El formato de contentVariables es incorrecto');
      console.error('   4. La plantilla fue creada en una cuenta diferente');
    }
  }
}

// Ejecutar
testTemplate();