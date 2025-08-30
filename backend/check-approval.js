const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function checkApprovalStatus() {
  try {
    console.log('Verificando estado de aprobación de WhatsApp...');
    console.log('Content SID: HXbc1e5efe4e4da98d9fcb19a1c76be1b1');
    console.log('');
    
    // Verificar solicitudes de aprobación
    const contentApprovalRequests = await client.content.v1
      .contents('HXbc1e5efe4e4da98d9fcb19a1c76be1b1')
      .approvalRequests
      .list();
    
    console.log('SOLICITUDES DE APROBACIÓN:');
    console.log('Total encontradas:', contentApprovalRequests.length);
    console.log('');
    
    if (contentApprovalRequests.length > 0) {
      contentApprovalRequests.forEach((request, index) => {
        console.log('Solicitud', index + 1 + ':');
        console.log('  SID:', request.sid);
        console.log('  Estado:', request.status);
        console.log('  Nombre:', request.name);
        console.log('  Categoría:', request.category);
        console.log('  Fecha Creación:', request.dateCreated);
        console.log('  Fecha Actualización:', request.dateUpdated);
        if (request.allowCategoryChange !== undefined) {
          console.log('  Permite Cambio Categoría:', request.allowCategoryChange);
        }
        console.log('');
      });
    } else {
      console.log('No se encontraron solicitudes de aprobación para esta plantilla.');
      console.log('');
      console.log('POSIBLES RAZONES:');
      console.log('- La plantilla aún no ha sido enviada para aprobación a WhatsApp');
      console.log('- Es una plantilla de solo texto (no necesita aprobación de WhatsApp)');
      console.log('- La plantilla fue creada recientemente y aún se está procesando');
    }
    
    // Intentar también verificar el estado en WhatsApp Business API
    console.log('VERIFICANDO DISPONIBILIDAD PARA WHATSAPP...');
    try {
      const testMessage = await client.messages.create({
        contentSid: 'HXbc1e5efe4e4da98d9fcb19a1c76be1b1',
        from: process.env.TWILIO_WHATSAPP_NUMBER,
        to: 'whatsapp:+573108800753', // Número de prueba
        contentVariables: JSON.stringify({
          nombre: 'TEST',
          empresa: 'TEST EMPRESA',
          servicio: 'TEST SERVICIO', 
          fecha: 'TEST FECHA',
          lugar: 'TEST LUGAR',
          hora: 'TEST HORA'
        }),
        messagingServiceSid: undefined,
        statusCallback: undefined,
        dryRun: true // Solo simular, no enviar realmente
      });
      
      console.log('✅ RESULTADO: La plantilla está disponible para uso en WhatsApp');
      console.log('SID del mensaje de prueba:', testMessage.sid);
      
    } catch (testError) {
      console.log('❌ ERROR AL PROBAR LA PLANTILLA:');
      console.log('Código:', testError.code);
      console.log('Mensaje:', testError.message);
      
      if (testError.code === 63016) {
        console.log('');
        console.log('DIAGNÓSTICO:');
        console.log('- Error 63016 indica que la plantilla no está aprobada para WhatsApp');
        console.log('- O hay un problema con el formato de las variables');
        console.log('- La ventana de 24 horas podría haber expirado');
      }
    }
    
  } catch (error) {
    console.error('Error verificando estado de aprobación:');
    console.error('Código:', error.code);
    console.error('Mensaje:', error.message);
  }
}

checkApprovalStatus();
