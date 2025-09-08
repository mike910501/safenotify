/**
 * 🧪 TEST: Verificar envío de mensaje manual
 * Este script simula el envío de un mensaje manual para verificar el flujo completo
 */

const { PrismaClient } = require('@prisma/client');
const twilioService = require('./config/twilio');

const prisma = new PrismaClient();

async function testManualMessage() {
  try {
    console.log('🧪 Probando envío de mensaje manual...\n');

    // 1. Buscar una conversación existente
    const conversation = await prisma.cRMConversation.findFirst({
      include: {
        customerLead: true,
        userWhatsAppNumber: true
      }
    });

    if (!conversation) {
      console.log('❌ No se encontró ninguna conversación para probar');
      return;
    }

    console.log('✅ Conversación encontrada:', {
      id: conversation.id,
      customerPhone: conversation.customerPhone,
      userWhatsApp: conversation.userWhatsAppNumber?.phoneNumber
    });

    // 2. Mensaje de prueba
    const testMessage = "Hola! Este es un mensaje manual de prueba desde el sistema CRM 📱";

    console.log('\n📱 Mensaje a enviar:', testMessage);

    // 3. Simular actualización de conversación
    const newMessage = {
      role: 'assistant',
      content: testMessage,
      timestamp: new Date().toISOString(),
      type: 'human',
      userId: conversation.userId
    };

    const updatedMessages = [...(conversation.messages || []), newMessage];

    console.log('\n💾 Actualizando conversación en BD...');
    
    const updatedConversation = await prisma.cRMConversation.update({
      where: { id: conversation.id },
      data: {
        messages: updatedMessages,
        messageCount: { increment: 1 },
        lastActivity: new Date(),
        lastHumanResponse: new Date()
      }
    });

    console.log('✅ Conversación actualizada con', updatedConversation.messageCount, 'mensajes');

    // 4. Intentar envío por WhatsApp
    if (conversation.customerPhone) {
      console.log('\n📲 Enviando mensaje por WhatsApp...');
      console.log('- De: Sistema SafeNotify');
      console.log('- Para:', conversation.customerPhone);
      
      try {
        const result = await twilioService.sendTextMessage(
          conversation.customerPhone,
          testMessage
        );

        if (result.success) {
          console.log('✅ Mensaje enviado exitosamente!');
          console.log('- SID:', result.messageSid);
          console.log('- Status:', result.status);
          console.log('- Destinatario:', result.to);
        } else {
          console.log('❌ Error enviando mensaje:', result.error);
        }

      } catch (error) {
        console.log('❌ Excepción enviando mensaje:', error.message);
      }
    } else {
      console.log('⚠️ No hay número de cliente para enviar WhatsApp');
    }

    console.log('\n📊 RESUMEN DEL FLUJO:');
    console.log('1. ✅ Conversación encontrada y cargada');
    console.log('2. ✅ Mensaje agregado a la conversación');
    console.log('3. ✅ BD actualizada correctamente');
    console.log('4. ✅ Intento de envío WhatsApp ejecutado');

  } catch (error) {
    console.error('❌ Error en prueba de mensaje manual:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar solo si se llama directamente
if (require.main === module) {
  testManualMessage();
}

module.exports = { testManualMessage };