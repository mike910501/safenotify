/**
 * Script para habilitar CRM para el usuario
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function enableCRM() {
  try {
    console.log('🔧 Habilitando CRM para usuarios...\n');
    
    // Buscar el usuario principal (Mike)
    const user = await prisma.user.findFirst({
      where: {
        email: 'mikehuertas91@gmail.com'
      }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:', user.email);
    console.log('   CRM Enabled actual:', user.crmEnabled);
    console.log('   CRM Plan actual:', user.crmPlan);
    
    // Habilitar CRM con plan completo
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        crmEnabled: true,
        crmPlan: 'ENTERPRISE', // Plan más alto con todas las features
        maxAgents: 10
      }
    });

    console.log('\n✅ CRM habilitado exitosamente!');
    console.log('   CRM Enabled:', updatedUser.crmEnabled);
    console.log('   CRM Plan:', updatedUser.crmPlan);
    console.log('   Max Agentes:', updatedUser.maxAgents);

    // Verificar que el agente esté configurado
    const agents = await prisma.userAIAgent.findMany({
      where: { userId: user.id }
    });

    console.log('\n📊 Agentes configurados:', agents.length);
    agents.forEach(agent => {
      console.log(`   - ${agent.name} (${agent.isActive ? 'Activo' : 'Inactivo'})`);
    });

    // Verificar conversaciones
    const conversations = await prisma.cRMConversation.count({
      where: { userId: user.id }
    });

    console.log('\n💬 Total conversaciones:', conversations);

    // Verificar leads
    const leads = await prisma.customerLead.count({
      where: { userId: user.id }
    });

    console.log('👥 Total leads:', leads);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
enableCRM();