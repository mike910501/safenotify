// Script para eliminar datos de prueba del número 3133592457
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteTestData() {
  try {
    console.log('🔍 Buscando datos del número +573133592457...');
    
    // Buscar lead por número
    const lead = await prisma.safeNotifyLead.findUnique({
      where: { phone: '+573133592457' },
      include: {
        conversations: true,
        demoAppointments: true
      }
    });

    if (!lead) {
      console.log('ℹ️ No se encontraron datos para el número +573133592457');
      return;
    }

    console.log(`📊 Encontrado lead: ${lead.id}`);
    console.log(`💬 Conversaciones: ${lead.conversations.length}`);
    console.log(`📅 Demos: ${lead.demoAppointments.length}`);
    console.log(`📈 Score: ${lead.qualificationScore}, Grado: ${lead.grade}`);

    // Eliminar conversaciones primero (relación)
    if (lead.conversations.length > 0) {
      console.log('🗑️ Eliminando conversaciones...');
      await prisma.safeNotifyConversation.deleteMany({
        where: { leadId: lead.id }
      });
      console.log(`✅ ${lead.conversations.length} conversaciones eliminadas`);
    }

    // Eliminar demos si existen
    if (lead.demoAppointments.length > 0) {
      console.log('🗑️ Eliminando demos...');
      await prisma.safeNotifyDemo.deleteMany({
        where: { leadId: lead.id }
      });
      console.log(`✅ ${lead.demoAppointments.length} demos eliminados`);
    }

    // Eliminar el lead
    console.log('🗑️ Eliminando lead...');
    await prisma.safeNotifyLead.delete({
      where: { id: lead.id }
    });

    console.log('🎉 ¡Datos eliminados exitosamente!');
    console.log(`📱 Número +573133592457 listo para pruebas reales`);
    
  } catch (error) {
    console.error('❌ Error eliminando datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestData();