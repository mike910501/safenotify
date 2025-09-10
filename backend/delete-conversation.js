const { PrismaClient } = require('@prisma/client');

async function deleteConversation() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Buscando conversaciones del número +573133592457...\n');
    
    // Buscar el lead por teléfono
    const customerLead = await prisma.customerLead.findFirst({
      where: {
        phone: '+573133592457'
      }
    });
    
    if (!customerLead) {
      console.log('❌ No se encontró lead con ese número');
      return;
    }
    
    console.log(`📱 Lead encontrado: ${customerLead.name || 'Sin nombre'} (${customerLead.phone})`);
    
    // Buscar conversaciones de ese lead
    const conversations = await prisma.cRMConversation.findMany({
      where: {
        customerLeadId: customerLead.id
      }
    });
    
    console.log(`💬 Conversaciones encontradas: ${conversations.length}`);
    
    if (conversations.length === 0) {
      console.log('✅ No hay conversaciones que eliminar');
      return;
    }
    
    // Mostrar detalles de las conversaciones
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      console.log(`\n🗣️ Conversación ${i + 1}:`);
      console.log(`   ID: ${conv.id}`);
      console.log(`   Status: ${conv.status}`);
      console.log(`   Mensajes: ${conv.messageCount}`);
      console.log(`   Última actividad: ${conv.lastActivity?.toISOString()}`);
    }
    
    console.log('\n🗑️ Eliminando conversaciones...');
    
    // Eliminar conversaciones
    const deleteResult = await prisma.cRMConversation.deleteMany({
      where: {
        customerLeadId: customerLead.id
      }
    });
    
    console.log(`✅ Conversaciones eliminadas: ${deleteResult.count}`);
    
    // Opcionalmente, también eliminar el lead
    console.log('\n🗑️ ¿Eliminar también el lead? Eliminando...');
    
    await prisma.customerLead.delete({
      where: {
        id: customerLead.id
      }
    });
    
    console.log('✅ Lead eliminado completamente');
    console.log('\n🎉 Limpieza completada - El número +573133592457 ya no existe en el sistema');
    
  } catch (error) {
    console.error('❌ Error eliminando conversación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteConversation();