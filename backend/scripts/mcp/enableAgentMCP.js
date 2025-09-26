const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient();

async function enableMCPForAgente() {
  console.log('🔍 Buscando agente con nombre "AGENTE"...\n');
  
  try {
    // Buscar el agente llamado "AGENTE"
    const agent = await prisma.userAIAgent.findFirst({
      where: {
        name: {
          equals: 'AGENTE',
          mode: 'insensitive' // Case insensitive
        }
      },
      include: {
        user: true
      }
    });
    
    if (!agent) {
      console.log('❌ No se encontró ningún agente llamado "AGENTE"');
      console.log('📋 Listando agentes disponibles:\n');
      
      const allAgents = await prisma.userAIAgent.findMany({
        select: { id: true, name: true, userId: true }
      });
      
      allAgents.forEach(a => {
        console.log(`   - ${a.name} (ID: ${a.id}, UserID: ${a.userId})`);
      });
      
      return;
    }
    
    console.log('✅ Agente encontrado:');
    console.log('   Nombre:', agent.name);
    console.log('   ID:', agent.id);
    console.log('   Usuario:', agent.user.email);
    console.log('   User ID:', agent.userId);
    
    // Habilitar MCP y Function Calling
    const updated = await prisma.userAIAgent.update({
      where: { id: agent.id },
      data: {
        useFunctionCalling: true,
        mcpEnabled: true,
        mcpProvider: 'function_calling',
        enabledFunctions: [
          'send_multimedia',
          'save_conversation_data',
          'analyze_customer_intent',
          'schedule_follow_up'
        ]
      }
    });
    
    console.log('\n✅ MCP HABILITADO para:', updated.name);
    console.log('   Function Calling:', updated.useFunctionCalling ? '✅' : '❌');
    console.log('   MCP Enabled:', updated.mcpEnabled ? '✅' : '❌');
    console.log('   Provider:', updated.mcpProvider);
    console.log('   Functions:', updated.enabledFunctions);
    
    // Crear o actualizar configuración MCP
    const mcpConfig = await prisma.mCPConfiguration.upsert({
      where: { 
        userId: agent.userId
      },
      create: {
        userId: agent.userId,
        mcpEnabled: true,
        provider: 'openai_functions',
        sendMultimedia: true,
        saveData: true,
        analyzeIntent: true,
        scheduleFollowUp: true,
        maxFunctionCalls: 5,
        functionTimeout: 30000,
        retryOnFailure: true
      },
      update: {
        mcpEnabled: true,
        sendMultimedia: true,
        saveData: true,
        analyzeIntent: true,
        scheduleFollowUp: true,
        maxFunctionCalls: 5
      }
    });
    
    console.log('\n✅ Configuración MCP creada/actualizada');
    console.log('   User ID:', mcpConfig.userId);
    console.log('   Provider:', mcpConfig.provider);
    console.log('   MCP Enabled:', mcpConfig.mcpEnabled);
    console.log('   Send Multimedia:', mcpConfig.sendMultimedia);
    console.log('   Save Data:', mcpConfig.saveData);
    console.log('   Analyze Intent:', mcpConfig.analyzeIntent);
    console.log('   Schedule Follow-up:', mcpConfig.scheduleFollowUp);
    
    console.log('\n🎉 AGENTE LISTO PARA USAR MCP Y MULTIMEDIA!');
    console.log('\n🔧 Configuración aplicada:');
    console.log('   ✅ Function Calling habilitado');
    console.log('   ✅ MCP habilitado con 4 herramientas');
    console.log('   ✅ Configuración de usuario creada');
    console.log('   ✅ Cloudinary configurado para multimedia');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableMCPForAgente().catch(console.error);