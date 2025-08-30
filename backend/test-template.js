const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function testTemplate() {
  try {
    console.log('🧪 PROBANDO PLANTILLA DIRECTAMENTE');
    console.log('Content SID: HXbc1e5efe4e4da98d9fcb19a1c76be1b1');
    console.log('Teléfono destino: +573108800753');
    console.log('');
    
    const message = await client.messages.create({
      contentSid: 'HXbc1e5efe4e4da98d9fcb19a1c76be1b1',
      from: process.env.TWILIO_WHATSAPP_NUMBER,
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
    
    console.log('✅ MENSAJE ENVIADO EXITOSAMENTE\!');
    console.log('Message SID:', message.sid);
    console.log('Estado:', message.status);
    console.log('Precio:', message.price);
    console.log('Dirección:', message.direction);
    console.log('');
    
    // Esperar un poco y verificar el estado
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const updatedMessage = await client.messages(message.sid).fetch();
    console.log('📊 ESTADO ACTUALIZADO:');
    console.log('Estado:', updatedMessage.status);
    console.log('Código de error:', updatedMessage.errorCode || 'Ninguno');
    console.log('Mensaje de error:', updatedMessage.errorMessage || 'Ninguno');
    
    if (updatedMessage.status === 'delivered' || updatedMessage.status === 'sent' || updatedMessage.status === 'queued') {
      console.log('');
      console.log('🎉 ¡LA PLANTILLA FUNCIONA CORRECTAMENTE\!');
      console.log('La plantilla está aprobada y puede ser usada en WhatsApp Business.');
    } else if (updatedMessage.errorCode) {
      console.log('');
      console.log('❌ LA PLANTILLA TIENE PROBLEMAS:');
      console.log('Código de error:', updatedMessage.errorCode);
      console.log('Mensaje:', updatedMessage.errorMessage);
      
      if (updatedMessage.errorCode === 63016) {
        console.log('');
        console.log('💡 ANÁLISIS DEL ERROR 63016:');
        console.log('- La plantilla no está aprobada por WhatsApp Business');
        console.log('- O las variables no coinciden exactamente');
        console.log('- O la ventana de mensaje de 24 horas expiró');
      }
    }
    
  } catch (error) {
    console.error('❌ ERROR AL ENVIAR MENSAJE:');
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
    console.error('Detalles:', error.details);
    
    if (error.code === 63016) {
      console.log('');
      console.log('🔍 DIAGNÓSTICO ERROR 63016:');
      console.log('- La plantilla no está aprobada para uso en WhatsApp Business');
      console.log('- Twilio muestra la plantilla como válida, pero WhatsApp no la acepta');
      console.log('- Problema de sincronización entre Twilio y WhatsApp Business Manager');
    } else if (error.code === 21211) {
      console.log('');
      console.log('🔍 DIAGNÓSTICO ERROR 21211:');
      console.log('- Número de teléfono no válido');
    } else if (error.code === 63007) {
      console.log('');
      console.log('🔍 DIAGNÓSTICO ERROR 63007:');
      console.log('- Variables de la plantilla no coinciden');
    }
  }
}

testTemplate();
