const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient();

async function setupCompleteAgenteSystem() {
  console.log('🚀 CONFIGURACIÓN COMPLETA DEL SISTEMA AGENTE MCP\n');
  console.log('=' . repeat(60));
  
  try {
    // Step 1: Create user if needed
    console.log('1️⃣ Verificando/Creando usuario...');
    
    let user = await prisma.user.findFirst({
      where: { email: 'agente@safenotify.com' }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'agente@safenotify.com',
          password: 'agente123',
          name: 'Usuario AGENTE MCP',
          role: 'user',
          planType: 'premium',
          messagesLimit: 1000,
          crmEnabled: true,
          crmPlan: 'pro',
          maxAgents: 10,
          maxWhatsAppNumbers: 5
        }
      });
      console.log('✅ Usuario creado:', user.email);
    } else {
      // Update existing user to ensure CRM is enabled
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          crmEnabled: true,
          crmPlan: 'pro',
          maxAgents: 10
        }
      });
      console.log('✅ Usuario encontrado y actualizado:', user.email);
    }
    
    // Step 2: Create WhatsApp number for user
    console.log('\\n2️⃣ Configurando número de WhatsApp...');
    
    let whatsappNumber = await prisma.userWhatsAppNumber.findFirst({
      where: { 
        userId: user.id,
        phoneNumber: process.env.TWILIO_WHATSAPP_NUMBER
      }
    });
    
    if (!whatsappNumber) {
      whatsappNumber = await prisma.userWhatsAppNumber.create({
        data: {
          userId: user.id,
          phoneNumber: process.env.TWILIO_WHATSAPP_NUMBER || '+573002843765',
          displayName: 'SafeNotify AGENTE',
          isActive: true,
          isPrimary: true,
          timezone: 'America/Bogota'
        }
      });
      console.log('✅ Número WhatsApp configurado:', whatsappNumber.phoneNumber);
    } else {
      console.log('✅ Número WhatsApp ya existe:', whatsappNumber.phoneNumber);
    }
    
    // Step 3: Create AGENTE agent
    console.log('\\n3️⃣ Creando/Actualizando agente AGENTE...');
    
    let agent = await prisma.userAIAgent.findFirst({
      where: {
        userId: user.id,
        name: 'AGENTE'
      }
    });
    
    if (!agent) {
      agent = await prisma.userAIAgent.create({
        data: {
          userId: user.id,
          name: 'AGENTE',
          description: 'Asistente de negocio con capacidades MCP avanzadas - Puede enviar multimedia, guardar datos y calificar clientes',
          role: 'assistant',
          isActive: true,
          isDefault: true,
          personalityPrompt: 'Eres AGENTE, un asistente de negocio muy profesional, amigable y eficiente. Tienes capacidades avanzadas para ayudar a los clientes con multimedia, información estructurada y seguimientos.',
          businessPrompt: 'Trabajas para SafeNotify, ayudando a negocios con WhatsApp. Puedes enviar menús, catálogos, documentos, guardar pedidos, calificar leads y programar seguimientos automáticos.',
          objectivesPrompt: 'Tu objetivo es: 1) Brindar excelente atención, 2) Enviar multimedia cuando sea útil, 3) Guardar información importante, 4) Calificar la calidad del lead, 5) Programar seguimientos.',
          model: 'gpt-4o-mini',
          temperature: 0.8,
          maxTokensPerMessage: 600,
          reasoningEffort: 'medium',
          verbosity: 'medium',
          // ✅ MCP HABILITADO
          useFunctionCalling: true,
          mcpEnabled: true,
          mcpProvider: 'function_calling',
          enabledFunctions: [
            'send_multimedia',
            'save_conversation_data', 
            'analyze_customer_intent',
            'schedule_follow_up'
          ],
          // Business rules
          businessRules: {
            autoSendMultimedia: true,
            saveImportantData: true,
            qualifyLeads: true,
            scheduleFollowUps: true,
            maxFunctionCallsPerMessage: 3
          },
          triggerKeywords: [
            'menu', 'menú', 'catalogo', 'catálogo', 'productos', 'servicios',
            'precios', 'lista', 'pedido', 'orden', 'comprar', 'cotizar'
          ]
        }
      });
      console.log('✅ Agente AGENTE creado:', agent.id);
    } else {
      // Update existing agent
      agent = await prisma.userAIAgent.update({
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
          ],
          isActive: true,
          isDefault: true
        }
      });
      console.log('✅ Agente AGENTE actualizado:', agent.id);
    }
    
    // Step 4: Set agent as default for WhatsApp number
    await prisma.userWhatsAppNumber.update({
      where: { id: whatsappNumber.id },
      data: { defaultAgentId: agent.id }
    });
    console.log('✅ Agente configurado como default para WhatsApp');
    
    // Step 5: Create MCP Configuration
    console.log('\\n4️⃣ Configurando MCP...');
    
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
    console.log('✅ Configuración MCP creada/actualizada');
    
    // Step 6: Create sample customer lead for testing
    console.log('\\n5️⃣ Creando lead de prueba...');
    
    let testLead = await prisma.customerLead.findFirst({
      where: {
        userId: user.id,
        phone: '+573001234567'
      }
    });
    
    if (!testLead) {
      testLead = await prisma.customerLead.create({
        data: {
          userId: user.id,
          phone: '+573001234567',
          name: 'Cliente de Prueba',
          email: 'test@cliente.com',
          source: 'whatsapp',
          status: 'NEW',
          qualificationScore: 50,
          tags: ['test_lead', 'mcp_ready']
        }
      });
      console.log('✅ Lead de prueba creado:', testLead.phone);
    } else {
      console.log('✅ Lead de prueba ya existe:', testLead.phone);
    }
    
    // Step 7: Final verification
    console.log('\\n' + '=' . repeat(60));
    console.log('🎉 SISTEMA AGENTE MCP COMPLETAMENTE CONFIGURADO!');
    
    console.log('\\n📊 RESUMEN DE CONFIGURACIÓN:');
    console.log('   ✅ Usuario:', user.email);
    console.log('   ✅ WhatsApp:', whatsappNumber.phoneNumber);
    console.log('   ✅ Agente AGENTE:', agent.name, '(ID:', agent.id + ')');
    console.log('   ✅ MCP Habilitado:', agent.mcpEnabled);
    console.log('   ✅ Function Calling:', agent.useFunctionCalling);
    console.log('   ✅ Funciones:', agent.enabledFunctions.length);
    console.log('   ✅ Configuración MCP:', mcpConfig.mcpEnabled);
    console.log('   ✅ Lead de prueba:', testLead.phone);
    
    console.log('\\n🚀 LISTO PARA PROBAR!');
    console.log('\\n📱 Envía un mensaje de WhatsApp a:', whatsappNumber.phoneNumber);
    console.log('   Desde el número de prueba:', testLead.phone);
    console.log('   Mensajes de prueba:');
    console.log('     • "Hola, ¿tienen menú?"');
    console.log('     • "Muéstrame sus productos"'); 
    console.log('     • "Quiero hacer un pedido"');
    console.log('     • "¿Qué servicios ofrecen?"');
    
    return {
      user,
      whatsappNumber,
      agent,
      mcpConfig,
      testLead,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Error en configuración:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

setupCompleteAgenteSystem().catch(console.error);