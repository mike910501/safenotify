const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findSofia() {
  try {
    // Find all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true }
    });
    
    console.log('📋 TODOS LOS USUARIOS:');
    users.forEach(u => {
      console.log(`   - ${u.email} (${u.name || 'Sin nombre'}) - ID: ${u.id}`);
    });
    
    // Find all agents named Sofia
    const sofiaAgents = await prisma.userAIAgent.findMany({
      where: {
        name: {
          contains: 'sofia',
          mode: 'insensitive'
        }
      },
      include: {
        user: {
          select: { email: true, name: true }
        }
      }
    });
    
    console.log(`\n🔍 AGENTES SOFIA ENCONTRADOS: ${sofiaAgents.length}`);
    sofiaAgents.forEach(agent => {
      console.log(`   - ${agent.name} (ID: ${agent.id})`);
      console.log(`     Usuario: ${agent.user.email}`);
      console.log(`     MCP: ${agent.mcpEnabled}, Functions: ${agent.useFunctionCalling}`);
    });
    
    // Find all agents
    const allAgents = await prisma.userAIAgent.findMany({
      include: {
        user: {
          select: { email: true, name: true }
        }
      }
    });
    
    console.log(`\n📋 TODOS LOS AGENTES: ${allAgents.length}`);
    allAgents.forEach(agent => {
      console.log(`   - ${agent.name} (ID: ${agent.id})`);
      console.log(`     Usuario: ${agent.user.email}`);
      console.log(`     MCP: ${agent.mcpEnabled}, Functions: ${agent.useFunctionCalling}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findSofia();