const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient();

async function createCorrectUserAndSofia() {
  console.log('🚀 CREANDO USUARIO CORRECTO Y AGENTE SOFIA...\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Create the correct user mikehuertas91@gmail.com
    console.log('1️⃣ Creando usuario mikehuertas91@gmail.com...');
    
    let user = await prisma.user.findFirst({
      where: { email: 'mikehuertas91@gmail.com' }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'mikehuertas91@gmail.com',
          password: 'secure_password_2024',
          name: 'Mike Huertas',
          role: 'user',
          planType: 'premium',
          messagesLimit: 5000,
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
    
    console.log('   Nombre:', user.name);
    console.log('   CRM Enabled:', user.crmEnabled);
    console.log('   Plan CRM:', user.crmPlan);
    console.log('   Max Agents:', user.maxAgents);
    
    // Step 2: Create WhatsApp number for user
    console.log('\n2️⃣ Configurando número de WhatsApp...');
    
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
          displayName: 'SafeNotify Sofia',
          isActive: true,
          isPrimary: true,
          timezone: 'America/Bogota'
        }
      });
      console.log('✅ Número WhatsApp configurado:', whatsappNumber.phoneNumber);
    } else {
      console.log('✅ Número WhatsApp ya existe:', whatsappNumber.phoneNumber);
    }
    
    // Step 3: Create Sofia agent with MCP enabled
    console.log('\n3️⃣ Creando agente Sofia con MCP...');
    
    let sofia = await prisma.userAIAgent.findFirst({
      where: {
        userId: user.id,
        name: {
          contains: 'sofia',
          mode: 'insensitive'
        }
      }
    });
    
    if (!sofia) {
      sofia = await prisma.userAIAgent.create({
        data: {
          userId: user.id,
          name: 'Sofia',
          description: 'Asistente IA Sofia con capacidades MCP avanzadas - Especialista en atención al cliente, multimedia y análisis',
          role: 'assistant',
          isActive: true,
          isDefault: true,
          personalityPrompt: 'Soy Sofia, tu asistente de IA muy profesional, empática y eficiente. Tengo capacidades avanzadas para ayudar con multimedia, análisis de clientes y gestión de datos.',
          businessPrompt: 'Trabajo para SafeNotify ayudando negocios con WhatsApp. Puedo enviar multimedia automáticamente, analizar intenciones de clientes, guardar datos importantes y programar seguimientos.',
          objectivesPrompt: 'Mis objetivos son: 1) Brindar excelente atención, 2) Enviar multimedia cuando sea útil, 3) Analizar y calificar leads, 4) Guardar información valiosa, 5) Programar seguimientos automáticos.',
          model: 'gpt-4o-mini',
          temperature: 0.8,
          maxTokensPerMessage: 600,
          reasoningEffort: 'medium',
          verbosity: 'medium',
          // ✅ MCP COMPLETO HABILITADO
          useFunctionCalling: true,
          mcpEnabled: true,
          mcpProvider: 'function_calling',
          enabledFunctions: [
            'send_multimedia',
            'save_conversation_data', 
            'analyze_customer_intent',
            'schedule_follow_up'
          ],
          // Business rules for Sofia
          businessRules: {
            autoSendMultimedia: true,
            saveImportantData: true,
            qualifyLeads: true,
            scheduleFollowUps: true,
            maxFunctionCallsPerMessage: 4,
            personalityType: 'professional_empathetic'
          },
          triggerKeywords: [
            'menu', 'menú', 'catalogo', 'catálogo', 'productos', 'servicios',
            'precios', 'lista', 'pedido', 'orden', 'comprar', 'cotizar',
            'información', 'ayuda', 'soporte'
          ]
        }
      });
      console.log('✅ Sofia creada exitosamente:', sofia.id);
    } else {
      // Update existing Sofia with MCP
      sofia = await prisma.userAIAgent.update({
        where: { id: sofia.id },
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
          isDefault: true,
          description: 'Asistente IA Sofia con capacidades MCP avanzadas - Especialista en atención al cliente, multimedia y análisis'
        }
      });
      console.log('✅ Sofia actualizada con MCP:', sofia.id);
    }
    
    console.log('   Nombre:', sofia.name);
    console.log('   MCP Enabled:', sofia.mcpEnabled);
    console.log('   Function Calling:', sofia.useFunctionCalling);
    console.log('   Provider:', sofia.mcpProvider);
    console.log('   Functions:', sofia.enabledFunctions.join(', '));
    
    // Step 4: Set Sofia as default for WhatsApp number
    await prisma.userWhatsAppNumber.update({
      where: { id: whatsappNumber.id },
      data: { defaultAgentId: sofia.id }
    });
    console.log('✅ Sofia configurada como agente default para WhatsApp');
    
    // Step 5: Create MCP Configuration for user
    console.log('\n4️⃣ Configurando MCP para usuario...');
    
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
    console.log('\n5️⃣ Creando lead de prueba...');
    
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
          name: 'Cliente de Prueba Sofia',
          email: 'test@cliente.com',
          source: 'whatsapp',
          status: 'NEW',
          qualificationScore: 60,
          tags: ['test_lead', 'sofia_ready']
        }
      });
      console.log('✅ Lead de prueba creado:', testLead.phone);
    } else {
      console.log('✅ Lead de prueba ya existe:', testLead.phone);
    }
    
    // Step 7: Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 SOFIA Y USUARIO CONFIGURADOS EXITOSAMENTE!');
    
    console.log('\n📊 RESUMEN COMPLETO:');
    console.log('   ✅ Usuario:', user.email, '(' + user.name + ')');
    console.log('   ✅ WhatsApp:', whatsappNumber.phoneNumber);
    console.log('   ✅ Agente:', sofia.name, '(ID:', sofia.id + ')');
    console.log('   ✅ MCP Habilitado:', sofia.mcpEnabled);
    console.log('   ✅ Function Calling:', sofia.useFunctionCalling);
    console.log('   ✅ Funciones:', sofia.enabledFunctions.length);
    console.log('   ✅ Configuración MCP:', mcpConfig.mcpEnabled);
    console.log('   ✅ Lead de prueba:', testLead.phone);
    
    console.log('\n🚀 SOFIA LISTA PARA USAR MCP!');
    console.log('\n📱 NÚMERO PARA PRUEBAS:', whatsappNumber.phoneNumber);
    console.log('   Agente default: Sofia');
    console.log('   MCP Functions: 4 habilitadas');
    console.log('   Multimedia: Automático');
    console.log('   Data saving: Automático');
    console.log('   Intent analysis: Automático');
    console.log('   Follow-up scheduling: Automático');
    
    console.log('\n💬 MENSAJES DE PRUEBA:');
    console.log('   • "Hola Sofia, ¿tienen menú?"');
    console.log('   • "Muéstrame sus productos"');
    console.log('   • "¿Qué servicios ofrecen?"');
    console.log('   • "Quiero hacer un pedido"');
    console.log('   • "¿Cuáles son sus precios?"');
    
    return {
      user,
      whatsappNumber,
      sofia,
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

createCorrectUserAndSofia().catch(console.error);