const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function testCorrectVariables() {
  console.log('🔍 PROBANDO CON VARIABLES CORRECTAS\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const contentSid = 'HX164c5aa2918cc699bedbe253ba2bf805';
  const testPhone = '+573108800753';
  
  // Variables con nombres correctos como espera Twilio
  const contentVariables = {
    "nombre": "Juan Pérez",
    "empresa": "Clínica Colombia",
    "servicio": "Pediatría",
    "fecha": "28 de Agosto 2025",
    "lugar": "Bogotá - Sede Norte",
    "hora": "10:30 AM"
  };
  
  console.log('📋 Configuración:');
  console.log('   Content SID:', contentSid);
  console.log('   Teléfono:', testPhone);
  console.log('   Variables:', JSON.stringify(contentVariables, null, 2));
  console.log('');
  
  try {
    console.log('📤 Enviando mensaje...');
    
    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${testPhone}`,
      contentSid: contentSid,
      contentVariables: JSON.stringify(contentVariables)
    });
    
    console.log('✅ Mensaje enviado exitosamente');
    console.log('   Message SID:', message.sid);
    console.log('   Estado inicial:', message.status);
    
    // Esperar 5 segundos y verificar estado
    console.log('\n⏳ Esperando 5 segundos para verificar estado...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const updatedMessage = await client.messages(message.sid).fetch();
    console.log('📊 Estado actualizado:', updatedMessage.status);
    
    if (updatedMessage.errorCode) {
      console.log('❌ Error Code:', updatedMessage.errorCode);
      console.log('❌ Error Message:', updatedMessage.errorMessage);
      
      if (updatedMessage.errorCode === 63016) {
        console.log('\n⚠️ SIGUE EL ERROR 63016 - La plantilla no está usando las variables correctamente');
      }
    } else if (updatedMessage.status === 'delivered' || updatedMessage.status === 'sent') {
      console.log('✅ ¡ÉXITO! El mensaje se envió como plantilla correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error enviando mensaje:', error.message);
    console.error('   Código:', error.code);
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

testCorrectVariables();