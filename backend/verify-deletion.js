// Verificar que los datos fueron eliminados correctamente
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyDeletion() {
  try {
    console.log('🔍 Verificando eliminación del número +573133592457...');
    
    // Buscar lead por número
    const lead = await prisma.safeNotifyLead.findUnique({
      where: { phone: '+573133592457' }
    });

    if (!lead) {
      console.log('✅ PERFECTO: No se encontraron datos para +573133592457');
      console.log('🎯 El número está listo para hacer pruebas reales con Sofia');
    } else {
      console.log('❌ ERROR: Aún existen datos para este número');
      console.log('Lead encontrado:', lead);
    }

    // Mostrar estadísticas actuales
    console.log('\n📊 Estado actual de la base de datos:');
    const totalLeads = await prisma.safeNotifyLead.count();
    const totalConversations = await prisma.safeNotifyConversation.count();
    
    console.log(`📈 Total leads: ${totalLeads}`);
    console.log(`💬 Total conversaciones: ${totalConversations}`);
    
  } catch (error) {
    console.error('❌ Error verificando:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDeletion();