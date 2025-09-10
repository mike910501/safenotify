const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAgents() {
  try {
    const agents = await prisma.userAIAgent.findMany({ 
      select: { 
        id: true, 
        name: true, 
        userId: true,
        isActive: true,
        mcpEnabled: true,
        useFunctionCalling: true
      } 
    });
    
    console.log('📋 Agentes encontrados:', agents.length);
    agents.forEach(a => {
      console.log(`- ${a.name} (ID: ${a.id}, UserID: ${a.userId})`);
      console.log(`  Active: ${a.isActive}, MCP: ${a.mcpEnabled}, Functions: ${a.useFunctionCalling}`);
    });
    
    if (agents.length === 0) {
      console.log('\n⚠️ No hay agentes en la base de datos.');
      console.log('💡 Necesitas crear un agente primero o verificar la conexión a BD.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAgents();