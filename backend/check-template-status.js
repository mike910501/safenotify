const twilio = require('twilio');
require('dotenv').config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

async function checkTemplateStatus() {
  console.log('🔍 VERIFICACIÓN COMPLETA DE PLANTILLA\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const contentSid = 'HX164c5aa2918cc699bedbe253ba2bf805';
  
  try {
    // 1. Fetch content details
    console.log('1️⃣ DETALLES DE LA PLANTILLA:');
    const content = await client.content.v1.contents(contentSid).fetch();
    
    console.log('   Nombre:', content.friendlyName);
    console.log('   SID:', content.sid);
    console.log('   Idioma:', content.language);
    console.log('   Estado:', content.status || 'No especificado');
    console.log('   Creado:', content.dateCreated);
    console.log('   Actualizado:', content.dateUpdated);
    console.log('');
    
    // 2. Check approval status
    console.log('2️⃣ ESTADO DE APROBACIÓN:');
    if (content.approvalRequests) {
      const approvals = await client.content.v1
        .contents(contentSid)
        .approvalRequests
        .list();
      
      approvals.forEach(approval => {
        console.log('   Canal:', approval.channelType);
        console.log('   Estado:', approval.status);
        console.log('   Fecha:', approval.dateCreated);
      });
    } else {
      console.log('   No hay información de aprobación disponible');
    }
    console.log('');
    
    // 3. Get content details
    console.log('3️⃣ ESTRUCTURA DE LA PLANTILLA:');
    if (content.types) {
      console.log('   Tipos:', JSON.stringify(content.types, null, 2));
    }
    if (content.variables) {
      console.log('   Variables esperadas:', JSON.stringify(content.variables, null, 2));
    }
    console.log('');
    
    // 4. Test with actual API
    console.log('4️⃣ PRUEBA DE ENVÍO REAL:');
    try {
      const testVariables = {
        "1": "TEST_NOMBRE",
        "2": "TEST_CLINICA", 
        "3": "TEST_TIPO",
        "4": "TEST_FECHA",
        "5": "TEST_LUGAR",
        "6": "TEST_HORA"
      };
      
      console.log('   Variables de prueba:', testVariables);
      
      const message = await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:+573108800753`,
        contentSid: contentSid,
        contentVariables: JSON.stringify(testVariables)
      });
      
      console.log('   ✅ Mensaje enviado:', message.sid);
      console.log('   Estado:', message.status);
      
      // Wait 3 seconds then check status
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const updatedMessage = await client.messages(message.sid).fetch();
      console.log('   Estado actualizado:', updatedMessage.status);
      if (updatedMessage.errorCode) {
        console.log('   ❌ Error Code:', updatedMessage.errorCode);
        console.log('   ❌ Error Message:', updatedMessage.errorMessage);
      }
      
    } catch (error) {
      console.log('   ❌ Error en envío:', error.message);
      console.log('   Código:', error.code);
      if (error.code === 63016) {
        console.log('\n   ⚠️ ERROR 63016 CONFIRMADO');
        console.log('   Posibles causas:');
        console.log('   1. La plantilla no está aprobada para WhatsApp');
        console.log('   2. El formato de variables es incorrecto');
        console.log('   3. La plantilla fue creada pero no activada');
        console.log('   4. Problema con el sender (número de WhatsApp)');
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 DIAGNÓSTICO FINAL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('Si recibes error 63016, verifica en Twilio Console:');
    console.log('1. Que la plantilla esté APROBADA para WhatsApp');
    console.log('2. Que el estado sea "approved" o "active"');
    console.log('3. Que las variables coincidan exactamente');
    console.log('4. Que el número de WhatsApp esté activo');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTemplateStatus();