const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkMessageStatus() {
  try {
    console.log('🔍 Verificando estado del mensaje enviado...');
    console.log('Message SID: MMb4b34d9ee646155c239df60df8e981e6');
    console.log('');
    
    const message = await client.messages('MMb4b34d9ee646155c239df60df8e981e6').fetch();
    
    console.log('📊 ESTADO DEL MENSAJE:');
    console.log('Estado:', message.status);
    console.log('Dirección:', message.direction);
    console.log('From:', message.from);
    console.log('To:', message.to);
    console.log('Fecha enviado:', message.dateSent);
    console.log('Fecha actualizado:', message.dateUpdated);
    console.log('Precio:', message.price, message.priceUnit);
    console.log('');
    
    console.log('🔍 ERRORES:');
    console.log('Código error:', message.errorCode || 'Ninguno');
    console.log('Mensaje error:', message.errorMessage || 'Ninguno');
    console.log('');
    
    console.log('📱 INFORMACIÓN TÉCNICA:');
    console.log('Canal:', message.messagingServiceSid || 'N/A');
    console.log('Body:', message.body?.substring(0, 100) + '...' || 'N/A');
    console.log('');
    
    // Análisis del resultado
    if (message.errorCode === 63016) {
      console.log('❌ DIAGNÓSTICO: ERROR 63016');
      console.log('- La plantilla NO está aprobada por WhatsApp Business');
      console.log('- El mensaje fue enviado pero WhatsApp lo rechazó');
      console.log('- Necesitas contactar soporte de Twilio para sincronización');
    } else if (message.status === 'delivered') {
      console.log('✅ ¡PLANTILLA FUNCIONA PERFECTAMENTE\!');
      console.log('- El mensaje fue entregado exitosamente');
      console.log('- La plantilla está aprobada y operacional');
    } else if (message.status === 'sent') {
      console.log('✅ PLANTILLA ENVIADA CORRECTAMENTE');
      console.log('- El mensaje fue enviado exitosamente');
      console.log('- Esperando confirmación de entrega');
    } else if (message.status === 'failed') {
      console.log('❌ MENSAJE FALLÓ');
      console.log('- Revisar código de error específico');
    } else if (message.status === 'queued') {
      console.log('⏳ MENSAJE EN COLA');
      console.log('- El mensaje está esperando ser procesado');
    }
    
  } catch (error) {
    console.error('❌ Error verificando estado:', error.message);
  }
}

checkMessageStatus();
