const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function debugAndTest() {
  try {
    console.log('🔍 VERIFICANDO CONFIGURACIÓN');
    console.log('Account SID:', process.env.TWILIO_ACCOUNT_SID?.substring(0, 10) + '...');
    console.log('WhatsApp Number:', process.env.TWILIO_WHATSAPP_NUMBER);
    console.log('');
    
    // Corregir el formato del número de WhatsApp
    let fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    if (\!fromNumber.startsWith('whatsapp:')) {
      fromNumber = 'whatsapp:' + fromNumber;
    }
    
    console.log('🧪 PROBANDO PLANTILLA');
    console.log('Content SID: HXbc1e5efe4e4da98d9fcb19a1c76be1b1');
    console.log('From (corregido):', fromNumber);
    console.log('To: whatsapp:+573108800753');
    console.log('');
    
    const message = await client.messages.create({
      contentSid: 'HXbc1e5efe4e4da98d9fcb19a1c76be1b1',
      from: fromNumber,
      to: 'whatsapp:+573108800753',
      contentVariables: JSON.stringify({
        nombre: 'TEST USUARIO',
        empresa: 'TEST CLINICA',
        servicio: 'TEST SERVICIO',
        fecha: 'TEST FECHA',
        lugar: 'TEST LUGAR',
        hora: 'TEST HORA'
      })
    });
    
    console.log('✅ MENSAJE CREADO');
    console.log('Message SID:', message.sid);
    console.log('Estado inicial:', message.status);
    console.log('');
    
    // Esperar y verificar estado final
    console.log('⏳ Esperando 5 segundos para verificar estado...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const finalMessage = await client.messages(message.sid).fetch();
    console.log('📊 ESTADO FINAL:');
    console.log('Estado:', finalMessage.status);
    console.log('Código error:', finalMessage.errorCode || 'Ninguno');
    console.log('Mensaje error:', finalMessage.errorMessage || 'Ninguno');
    console.log('Precio:', finalMessage.price || 'N/A');
    console.log('Fecha actualización:', finalMessage.dateUpdated);
    
    // Análisis del resultado
    if (finalMessage.errorCode === 63016) {
      console.log('');
      console.log('❌ ERROR 63016 DETECTADO:');
      console.log('La plantilla NO está aprobada por WhatsApp Business');
      console.log('Aunque Twilio la muestre como válida, WhatsApp la rechaza');
      console.log('Necesitas contactar soporte de Twilio para sincronización');
    } else if (finalMessage.status === 'sent' || finalMessage.status === 'delivered') {
      console.log('');
      console.log('🎉 ¡PLANTILLA FUNCIONA CORRECTAMENTE\!');
      console.log('Está aprobada y lista para uso en producción');
    } else if (finalMessage.status === 'failed') {
      console.log('');
      console.log('❌ MENSAJE FALLÓ');
      console.log('Revisar código de error específico arriba');
    }
    
  } catch (error) {
    console.error('❌ ERROR EN LA PRUEBA:');
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
    
    // Análisis específico de errores comunes
    switch(error.code) {
      case 21910:
        console.log('');
        console.log('💡 Error 21910: Problema de formato de números');
        console.log('- Verificar que el número From tenga formato whatsapp:+1234567890');
        console.log('- Verificar que el número To tenga formato whatsapp:+1234567890');
        break;
      case 63016:
        console.log('');
        console.log('💡 Error 63016: Plantilla no aprobada');
        console.log('- La plantilla no está aprobada por WhatsApp Business');
        console.log('- Problema de sincronización Twilio-WhatsApp');
        break;
      case 21211:
        console.log('');
        console.log('💡 Error 21211: Número de teléfono inválido');
        break;
    }
  }
}

debugAndTest();
