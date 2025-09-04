require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClientConversation() {
  try {
    const phone = '+573112516049';
    console.log('🔍 BUSCANDO CONVERSACIÓN CON:', phone);
    
    // Buscar lead
    const lead = await prisma.safeNotifyLead.findFirst({
      where: { phone: phone },
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        conversationPrompts: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });
    
    if (!lead) {
      console.log('❌ No se encontró lead con ese número');
      return;
    }
    
    console.log('\n📋 LEAD ENCONTRADO:');
    console.log('Nombre:', lead.name || 'Sin nombre');
    console.log('Teléfono:', lead.phone);
    console.log('Estado:', lead.status);
    console.log('Conversaciones:', lead.conversations.length);
    
    if (lead.conversations.length === 0) {
      console.log('❌ No hay conversaciones registradas');
      return;
    }
    
    console.log('\n💬 CONVERSACIONES:');
    if (lead.conversations.length > 0) {
      const lastConv = lead.conversations[0];
      console.log('ID:', lastConv.id);
      console.log('Fecha:', lastConv.createdAt);
      console.log('SessionID:', lastConv.sessionId);
      console.log('Activa:', lastConv.isActive);
      console.log('Mensajes en conversación:', Array.isArray(lastConv.messages) ? lastConv.messages.length : 0);
      
      // Mostrar mensajes de la conversación
      if (Array.isArray(lastConv.messages) && lastConv.messages.length > 0) {
        console.log('\n📱 MENSAJES DE LA CONVERSACIÓN:');
        lastConv.messages.forEach((message, index) => {
          console.log(`${index + 1}. [${message.role?.toUpperCase() || 'UNKNOWN'}] ${message.timestamp || 'Sin fecha'}`);
          console.log(`   "${message.content || 'Sin contenido'}"`);
          console.log('   ---');
        });
        
        // Buscar el último mensaje del usuario
        const userMessages = lastConv.messages.filter(m => m.role === 'user');
        if (userMessages.length > 0) {
          const lastUserMessage = userMessages[userMessages.length - 1];
          console.log('\n🎯 ÚLTIMO MENSAJE DEL CLIENTE:');
          console.log(`Contenido: "${lastUserMessage.content}"`);
          console.log(`Fecha: ${lastUserMessage.timestamp || 'Sin fecha'}`);
        }
      }
    }
    
    // Mostrar prompts de conversación
    console.log('\n🤖 PROMPTS DE CONVERSACIÓN:');
    if (lead.conversationPrompts.length > 0) {
      lead.conversationPrompts.forEach((prompt, index) => {
        console.log(`${index + 1}. [${prompt.createdAt.toLocaleString()}]`);
        console.log(`   Resumen: "${prompt.conversationSummary || 'Sin resumen'}"`);
        console.log(`   Contexto: ${JSON.stringify(prompt.businessContext)}`);
        console.log('   ---');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClientConversation().catch(console.error);