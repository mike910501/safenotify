const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
dotenv.config();

const prisma = new PrismaClient();

async function transferWhatsAppToSofia() {
  console.log('🔄 TRANSFIRIENDO WHATSAPP A SOFIA...\n');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Find the correct user
    console.log('1️⃣ Encontrando usuario mikehuertas91@gmail.com...');
    
    const correctUser = await prisma.user.findFirst({
      where: { email: 'mikehuertas91@gmail.com' }
    });
    
    if (!correctUser) {
      console.log('❌ Usuario mikehuertas91@gmail.com no encontrado');
      return { success: false, error: 'Usuario no encontrado' };
    }
    
    console.log('✅ Usuario encontrado:', correctUser.email);
    
    // Step 2: Find existing WhatsApp number
    console.log('\n2️⃣ Encontrando número de WhatsApp existente...');
    
    const existingWhatsApp = await prisma.userWhatsAppNumber.findFirst({
      where: { 
        phoneNumber: process.env.TWILIO_WHATSAPP_NUMBER || '+573002843765'
      },
      include: { user: true }
    });
    
    if (!existingWhatsApp) {
      console.log('❌ Número WhatsApp no encontrado');
      return { success: false, error: 'WhatsApp number not found' };
    }
    
    console.log('✅ WhatsApp encontrado:', existingWhatsApp.phoneNumber);
    console.log('   Usuario actual:', existingWhatsApp.user.email);
    console.log('   ID:', existingWhatsApp.id);
    
    // Step 3: Create Sofia agent first
    console.log('\n3️⃣ Creando agente Sofia...');
    
    let sofia = await prisma.userAIAgent.findFirst({
      where: {
        userId: correctUser.id,
        name: {
          contains: 'sofia',
          mode: 'insensitive'
        }
      }
    });
    
    if (!sofia) {
      sofia = await prisma.userAIAgent.create({
        data: {
          userId: correctUser.id,
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
          triggerKeywords: [
            'menu', 'menú', 'catalogo', 'catálogo', 'productos', 'servicios',
            'precios', 'lista', 'pedido', 'orden', 'comprar', 'cotizar'
          ]
        }
      });
      console.log('✅ Sofia creada:', sofia.id);
    } else {
      console.log('✅ Sofia ya existe:', sofia.id);
    }
    
    // Step 4: Transfer WhatsApp number to correct user
    console.log('\n4️⃣ Transfiriendo WhatsApp number...');
    
    const updatedWhatsApp = await prisma.userWhatsAppNumber.update({
      where: { id: existingWhatsApp.id },
      data: { 
        userId: correctUser.id,
        defaultAgentId: sofia.id,
        displayName: 'SafeNotify Sofia'
      }
    });
    
    console.log('✅ WhatsApp transferido exitosamente');
    console.log('   Nuevo usuario:', correctUser.email);
    console.log('   Nuevo agente default:', sofia.name);
    
    // Step 5: Create MCP Configuration
    console.log('\n5️⃣ Configurando MCP...');
    
    const mcpConfig = await prisma.mCPConfiguration.upsert({
      where: { userId: correctUser.id },
      create: {
        userId: correctUser.id,
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
    
    // Step 6: Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 WHATSAPP TRANSFERIDO A SOFIA EXITOSAMENTE!');
    
    console.log('\n📊 NUEVA CONFIGURACIÓN:');
    console.log('   ✅ Usuario:', correctUser.email);
    console.log('   ✅ WhatsApp:', updatedWhatsApp.phoneNumber);
    console.log('   ✅ Agente default:', sofia.name);
    console.log('   ✅ MCP habilitado:', sofia.mcpEnabled);
    console.log('   ✅ Function calling:', sofia.useFunctionCalling);
    console.log('   ✅ Funciones:', sofia.enabledFunctions.length);
    
    console.log('\n🚀 SOFIA LISTA PARA MCP!');
    console.log('   📱 WhatsApp:', updatedWhatsApp.phoneNumber);
    console.log('   🤖 Agente: Sofia con MCP');
    console.log('   📎 Multimedia automática: Sí');
    console.log('   💾 Guardar datos: Sí');
    console.log('   🧠 Análisis de intención: Sí');
    console.log('   ⏰ Programar seguimientos: Sí');
    
    return {
      user: correctUser,
      sofia,
      whatsapp: updatedWhatsApp,
      mcpConfig,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

transferWhatsAppToSofia().catch(console.error);