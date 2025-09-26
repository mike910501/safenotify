const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient();

async function enableSofiaMCP() {
  console.log('🔍 BUSCANDO AGENTE SOFIA PARA USUARIO mikehuertas91@gmail.com...\n');
  
  try {
    // Step 1: Find the correct user
    console.log('1️⃣ Buscando usuario mikehuertas91@gmail.com...');
    
    const user = await prisma.user.findUnique({
      where: { email: 'mikehuertas91@gmail.com' },
      include: {
        aiAgents: {
          select: {
            id: true,
            name: true,
            isActive: true,
            mcpEnabled: true,
            useFunctionCalling: true,
            enabledFunctions: true
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ Usuario mikehuertas91@gmail.com NO ENCONTRADO');
      console.log('💡 Verificando todos los usuarios en la base de datos...');
      
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, name: true },
        take: 10
      });
      
      console.log('\n📋 Usuarios encontrados:');
      allUsers.forEach(u => {
        console.log(`   - ${u.email} (${u.name || 'Sin nombre'}) - ID: ${u.id}`);
      });
      
      return { success: false, error: 'Usuario no encontrado' };
    }
    
    console.log('✅ Usuario encontrado:', user.email);
    console.log('   Nombre:', user.name);
    console.log('   ID:', user.id);
    console.log('   CRM Enabled:', user.crmEnabled);
    console.log('   Agentes:', user.aiAgents.length);
    
    // Step 2: Find Sofia agent
    console.log('\n2️⃣ Buscando agente Sofia...');
    
    const sofiaAgent = user.aiAgents.find(agent => 
      agent.name.toLowerCase().includes('sofia')
    );
    
    if (!sofiaAgent) {
      console.log('❌ Agente Sofia NO ENCONTRADO para este usuario');
      console.log('\n📋 Agentes disponibles para este usuario:');
      user.aiAgents.forEach(agent => {
        console.log(`   - ${agent.name} (ID: ${agent.id})`);
        console.log(`     Active: ${agent.isActive}, MCP: ${agent.mcpEnabled}, Functions: ${agent.useFunctionCalling}`);
      });
      
      // Look for Sofia in ALL agents
      console.log('\n🔍 Buscando Sofia en TODOS los agentes...');
      const allSofiaAgents = await prisma.userAIAgent.findMany({
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
      
      if (allSofiaAgents.length > 0) {
        console.log('\n📋 Agentes Sofia encontrados:');
        allSofiaAgents.forEach(agent => {
          console.log(`   - ${agent.name} (ID: ${agent.id})`);
          console.log(`     Usuario: ${agent.user.email}`);
          console.log(`     MCP: ${agent.mcpEnabled}, Functions: ${agent.useFunctionCalling}`);
        });
      }
      
      return { success: false, error: 'Sofia no encontrada para usuario correcto' };
    }
    
    console.log('✅ Agente Sofia encontrado:', sofiaAgent.name);
    console.log('   ID:', sofiaAgent.id);
    console.log('   Active:', sofiaAgent.isActive);
    console.log('   MCP Enabled:', sofiaAgent.mcpEnabled);
    console.log('   Function Calling:', sofiaAgent.useFunctionCalling);
    console.log('   Enabled Functions:', sofiaAgent.enabledFunctions?.length || 0);
    
    // Step 3: Enable MCP for Sofia if not already enabled
    console.log('\n3️⃣ Habilitando MCP para Sofia...');
    
    let mcpUpdateNeeded = false;
    const updateData = {};
    
    if (!sofiaAgent.mcpEnabled) {
      updateData.mcpEnabled = true;
      mcpUpdateNeeded = true;
    }
    
    if (!sofiaAgent.useFunctionCalling) {
      updateData.useFunctionCalling = true;
      mcpUpdateNeeded = true;
    }
    
    if (!sofiaAgent.enabledFunctions || sofiaAgent.enabledFunctions.length === 0) {
      updateData.enabledFunctions = [
        'send_multimedia',
        'save_conversation_data',
        'analyze_customer_intent',
        'schedule_follow_up'
      ];
      mcpUpdateNeeded = true;
    }
    
    if (updateData.enabledFunctions || !sofiaAgent.enabledFunctions?.includes('send_multimedia')) {
      updateData.enabledFunctions = [
        'send_multimedia',
        'save_conversation_data',
        'analyze_customer_intent',
        'schedule_follow_up'
      ];
      updateData.mcpProvider = 'function_calling';
      mcpUpdateNeeded = true;
    }
    
    if (mcpUpdateNeeded) {
      const updatedSofia = await prisma.userAIAgent.update({
        where: { id: sofiaAgent.id },
        data: updateData
      });
      
      console.log('✅ Sofia actualizada con MCP:');
      console.log('   MCP Enabled:', updatedSofia.mcpEnabled);
      console.log('   Function Calling:', updatedSofia.useFunctionCalling);
      console.log('   Provider:', updatedSofia.mcpProvider);
      console.log('   Functions:', updatedSofia.enabledFunctions.join(', '));
    } else {
      console.log('✅ Sofia ya tenía MCP habilitado correctamente');
    }
    
    // Step 4: Ensure user has CRM enabled
    console.log('\n4️⃣ Verificando CRM del usuario...');
    
    if (!user.crmEnabled) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          crmEnabled: true,
          crmPlan: 'pro',
          maxAgents: 10
        }
      });
      console.log('✅ CRM habilitado para el usuario');
    } else {
      console.log('✅ Usuario ya tiene CRM habilitado');
    }
    
    // Step 5: Create/Update MCP Configuration
    console.log('\n5️⃣ Configurando MCP...');
    
    const mcpConfig = await prisma.mCPConfiguration.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
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
        scheduleFollowUp: true
      }
    });
    
    console.log('✅ Configuración MCP actualizada');
    
    // Step 6: Final verification
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SOFIA MCP HABILITADO EXITOSAMENTE!');
    
    console.log('\n📊 RESUMEN:');
    console.log('   ✅ Usuario:', user.email);
    console.log('   ✅ Agente:', sofiaAgent.name);
    console.log('   ✅ MCP Enabled:', true);
    console.log('   ✅ Function Calling:', true);
    console.log('   ✅ Functions:', updateData.enabledFunctions?.length || sofiaAgent.enabledFunctions?.length || 0);
    console.log('   ✅ MCP Configuration:', mcpConfig.mcpEnabled);
    
    console.log('\n🚀 SOFIA LISTA PARA MCP!');
    console.log('   📱 Puede enviar multimedia automáticamente');
    console.log('   💾 Puede guardar datos de conversaciones');
    console.log('   🧠 Puede analizar intenciones de clientes');
    console.log('   ⏰ Puede programar seguimientos');
    
    return {
      success: true,
      user: user,
      agent: sofiaAgent,
      mcpConfig: mcpConfig,
      mcpUpdateNeeded: mcpUpdateNeeded
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

enableSofiaMCP().catch(console.error);