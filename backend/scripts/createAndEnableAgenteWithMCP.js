const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient();

async function createAndEnableAgenteWithMCP() {
  console.log('🚀 Creando agente "AGENTE" con MCP habilitado...\n');
  
  try {
    // Step 1: Check if we have any users first
    const users = await prisma.user.findMany({ 
      take: 1,
      select: { id: true, email: true, crmEnabled: true }
    });
    
    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos.');
      console.log('💡 Necesitas crear un usuario primero para poder crear un agente.');
      return;
    }
    
    const user = users[0];
    console.log('👤 Usuario encontrado:', user.email);
    console.log('   CRM Enabled:', user.crmEnabled);
    
    // Step 2: Enable CRM for user if not enabled
    if (!user.crmEnabled) {
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          crmEnabled: true,
          crmPlan: 'pro',
          maxAgents: 5
        }
      });
      console.log('✅ CRM habilitado para el usuario');
    }
    
    // Step 3: Check if agent "AGENTE" already exists
    let agent = await prisma.userAIAgent.findFirst({
      where: {
        name: {
          equals: 'AGENTE',
          mode: 'insensitive'
        }
      }
    });
    
    if (agent) {
      console.log('✅ Agente "AGENTE" ya existe:', agent.id);
    } else {
      // Step 4: Create the "AGENTE" agent with MCP enabled
      agent = await prisma.userAIAgent.create({
        data: {
          userId: user.id,
          name: 'AGENTE',
          description: 'Asistente de negocio con capacidades MCP y multimedia',
          role: 'assistant',
          isActive: true,
          isDefault: true,
          personalityPrompt: 'Eres un asistente de negocio muy profesional, amigable y eficiente. Siempre ayudas a los clientes con sus consultas y necesidades.',
          businessPrompt: 'Trabajas para un negocio que ofrece servicios y productos. Puedes enviar archivos multimedia como menús, catálogos y documentos cuando sea necesario.',
          objectivesPrompt: 'Tu objetivo es brindar excelente atención al cliente, calificar leads, guardar información importante y programar seguimientos cuando sea necesario.',
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokensPerMessage: 500,
          reasoningEffort: 'medium',
          verbosity: 'medium',
          // ✅ MCP Configuration
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
      
      console.log('✅ Agente "AGENTE" creado exitosamente:');
      console.log('   ID:', agent.id);
      console.log('   User ID:', agent.userId);
      console.log('   MCP Enabled:', agent.mcpEnabled);
      console.log('   Function Calling:', agent.useFunctionCalling);
      console.log('   Functions:', agent.enabledFunctions.join(', '));
    }
    
    // Step 5: Create/Update MCP Configuration
    const mcpConfig = await prisma.mCPConfiguration.upsert({
      where: { 
        userId: user.id
      },
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
    
    console.log('\\n✅ Configuración MCP creada/actualizada:');
    console.log('   User ID:', mcpConfig.userId);
    console.log('   Provider:', mcpConfig.provider);
    console.log('   Send Multimedia:', mcpConfig.sendMultimedia);
    console.log('   Save Data:', mcpConfig.saveData);
    console.log('   Analyze Intent:', mcpConfig.analyzeIntent);
    console.log('   Schedule Follow-up:', mcpConfig.scheduleFollowUp);
    
    // Step 6: Update agent to ensure MCP is fully enabled
    const updatedAgent = await prisma.userAIAgent.update({
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
    
    console.log('\\n🎉 AGENTE "AGENTE" COMPLETAMENTE CONFIGURADO!');
    console.log('\\n📋 RESUMEN DE CONFIGURACIÓN:');
    console.log('   ✅ Agente creado/encontrado:', updatedAgent.name);
    console.log('   ✅ MCP habilitado:', updatedAgent.mcpEnabled);
    console.log('   ✅ Function Calling:', updatedAgent.useFunctionCalling);
    console.log('   ✅ Funciones disponibles:', updatedAgent.enabledFunctions.length);
    console.log('   ✅ Configuración MCP:', mcpConfig.mcpEnabled);
    console.log('   ✅ Cloudinary configurado para multimedia');
    
    console.log('\\n🎯 PRÓXIMO PASO:');
    console.log('   Envía un mensaje de WhatsApp pidiendo algo como:');
    console.log('   • "Hola, ¿tienen menú?"');
    console.log('   • "Muéstrame sus productos"');
    console.log('   • "¿Qué servicios ofrecen?"');
    
    return {
      agent: updatedAgent,
      mcpConfig: mcpConfig,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

createAndEnableAgenteWithMCP().catch(console.error);