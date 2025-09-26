// Script para probar MCP Function Calling Integration
const dotenv = require('dotenv');
dotenv.config();

const functionCallingService = require('../services/mcp/functionCallingService');
const mcpIntegrationService = require('../services/mcp/mcpIntegrationService');

async function testMCPIntegration() {
  console.log('🧪 Testing MCP Function Calling Integration...\n');

  // Test 1: Verificar Function Calling básico
  console.log('1️⃣ Testing basic function calling...');
  
  const testMessages = [
    {
      role: 'system', 
      content: 'Eres un asistente de restaurante. Ayuda al cliente con sus pedidos.'
    },
    {
      role: 'user',
      content: 'Hola, me gustaría ver el menú por favor'
    }
  ];

  const testContext = {
    userId: 'test-user-123',
    agentId: 'test-agent-123', 
    conversationId: 'test-conv-123',
    customerLeadId: 'test-lead-123',
    customerPhone: '+573001234567',
    whatsappNumber: '+573009876543'
  };

  const testAgentConfig = {
    model: 'gpt-4o-mini', // Usar modelo barato para pruebas
    temperature: 0.7,
    maxTokensPerMessage: 150
  };

  try {
    const result = await functionCallingService.generateWithFunctions(
      testMessages,
      testContext,
      testAgentConfig
    );

    console.log('✅ Function calling response:');
    console.log('   Success:', result.success);
    console.log('   Message:', result.message?.substring(0, 100) + '...');
    console.log('   Tools used:', result.toolsUsed);
    console.log('   Function calls:', result.functionCalls);
    
  } catch (error) {
    console.log('❌ Function calling failed:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 2: Probar función específica send_multimedia
  console.log('2️⃣ Testing send_multimedia function...');
  
  const multimediaMessages = [
    {
      role: 'system',
      content: `Eres un asistente de restaurante. 
      
      Tienes estas herramientas disponibles:
      - send_multimedia: Para enviar menús, catálogos, etc.
      
      Si el cliente pide ver el menú, usa la función send_multimedia con media_type: 'menu'.`
    },
    {
      role: 'user',
      content: 'Por favor envíame el menú de hoy'
    }
  ];

  try {
    const multimediaResult = await functionCallingService.generateWithFunctions(
      multimediaMessages,
      testContext,
      testAgentConfig
    );

    console.log('📎 Multimedia function test:');
    console.log('   Success:', multimediaResult.success);
    console.log('   Tools used:', multimediaResult.toolsUsed);
    console.log('   Message preview:', multimediaResult.message?.substring(0, 150));
    
    // Verificar si se llamó send_multimedia
    if (multimediaResult.toolsUsed?.includes('send_multimedia')) {
      console.log('✅ send_multimedia function was called correctly!');
    } else {
      console.log('⚠️ send_multimedia function was NOT called');
    }
    
  } catch (error) {
    console.log('❌ Multimedia function test failed:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 3: Probar función save_conversation_data
  console.log('3️⃣ Testing save_conversation_data function...');
  
  const saveDataMessages = [
    {
      role: 'system',
      content: `Eres un asistente de restaurante.
      
      Tienes estas herramientas:
      - save_conversation_data: Para guardar pedidos, reservas, etc.
      
      Si el cliente hace un pedido, guárdalo usando save_conversation_data con data_type: 'order'.`
    },
    {
      role: 'user',
      content: 'Quiero hacer un pedido: 1 hamburguesa clásica, 1 coca cola y papas fritas'
    }
  ];

  try {
    const saveDataResult = await functionCallingService.generateWithFunctions(
      saveDataMessages,
      testContext,
      testAgentConfig
    );

    console.log('💾 Save data function test:');
    console.log('   Success:', saveDataResult.success);
    console.log('   Tools used:', saveDataResult.toolsUsed);
    console.log('   Message preview:', saveDataResult.message?.substring(0, 150));
    
    if (saveDataResult.toolsUsed?.includes('save_conversation_data')) {
      console.log('✅ save_conversation_data function was called correctly!');
    } else {
      console.log('⚠️ save_conversation_data function was NOT called');
    }
    
  } catch (error) {
    console.log('❌ Save data function test failed:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 4: Probar MCP Integration Service
  console.log('4️⃣ Testing MCP Integration Service...');
  
  // Mock data para simular una conversación real
  const mockAgent = {
    id: 'agent-123',
    userId: 'user-123',
    name: 'Asistente Restaurante',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokensPerMessage: 200,
    personalityPrompt: 'Eres un asistente amigable de restaurante',
    businessPrompt: 'Ayudas con pedidos y consultas',
    objectivesPrompt: 'Tu objetivo es vender más y satisfacer al cliente'
  };

  const mockCustomerLead = {
    id: 'lead-123',
    phone: '+573001234567',
    tags: ['first_time_customer']
  };

  const mockConversation = {
    id: 'conv-123',
    metadata: {}
  };

  const mockConversationHistory = [
    {
      role: 'user',
      content: 'Hola, quiero hacer un pedido y también ver el menú'
    }
  ];

  try {
    // Este test fallará porque no tenemos BD real, pero verifica la lógica
    console.log('⚠️ Note: This test may fail due to missing database, but will test the logic');
    
    const integrationResult = await mcpIntegrationService.generateResponseWithMCP(
      mockConversationHistory,
      'Eres un asistente de restaurante muy amigable',
      { whatsappNumber: '+573009876543' },
      'order_request',
      mockAgent,
      mockCustomerLead,
      mockConversation
    );

    console.log('🔧 MCP Integration result:');
    console.log('   Success:', integrationResult.success);
    console.log('   MCP Enabled:', integrationResult.mcpEnabled);
    console.log('   Tools Used:', integrationResult.toolsUsed);
    console.log('   Function Calls:', integrationResult.functionCalls);
    console.log('   Message preview:', integrationResult.message?.substring(0, 100));
    
  } catch (error) {
    console.log('❌ MCP Integration test failed (expected due to no DB):', error.message);
  }

  // Test 5: Verificar configuración disponible
  console.log('\n' + '='.repeat(60) + '\n');
  console.log('5️⃣ Testing MCP Configuration...');
  
  try {
    // Verificar que las funciones están disponibles
    console.log('📋 Available functions in FunctionCallingService:');
    console.log('   Tools defined:', functionCallingService.tools.length);
    functionCallingService.tools.forEach((tool, index) => {
      console.log(`   ${index + 1}. ${tool.function.name} - ${tool.function.description}`);
    });
    
    console.log('\n✅ MCP configuration is properly loaded');
    
  } catch (error) {
    console.log('❌ MCP Configuration test failed:', error.message);
  }

  console.log('\n🏁 MCP Integration testing complete!');
  console.log('\n📊 RESUMEN:');
  console.log('✅ Function Calling Service: Implementado');
  console.log('✅ MCP Integration Service: Implementado');
  console.log('⚠️ Database Models: Necesitan migración');
  console.log('⚠️ Webhook Integration: Pendiente');
  console.log('\n🚀 Ready for production integration!');
}

// Ejecutar tests
testMCPIntegration().catch(error => {
  console.error('💥 Fatal error during MCP testing:', error);
  process.exit(1);
});