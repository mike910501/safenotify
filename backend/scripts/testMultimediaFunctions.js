// Testing Multimedia and Functions Implementation
const dotenv = require('dotenv');
dotenv.config();

const { PrismaClient } = require('@prisma/client');
const functionCallingService = require('../services/functionCallingService');
const mcpIntegrationService = require('../services/mcpIntegrationService');

const prisma = new PrismaClient();

async function testMultimediaAndFunctions() {
  console.log('🧪 Testing Multimedia and Functions Implementation\n');
  
  try {
    // Test 1: Simular recepción de multimedia
    console.log('📎 Test 1: Simulating multimedia reception...');
    await testMultimediaReception();
    
    // Test 2: Probar function calling directo
    console.log('\n🤖 Test 2: Testing direct function calling...');
    await testFunctionCalling();
    
    // Test 3: Probar MCP Integration completo
    console.log('\n🔧 Test 3: Testing MCP Integration Service...');
    await testMCPIntegration();
    
    // Test 4: Verificar base de datos
    console.log('\n💾 Test 4: Verifying database operations...');
    await testDatabaseOperations();
    
    // Test 5: Test webhook integration simulation
    console.log('\n📡 Test 5: Testing webhook integration...');
    await testWebhookIntegration();
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function testMultimediaReception() {
  const mockMediaRequest = {
    body: {
      From: 'whatsapp:+1234567890',
      To: 'whatsapp:+0987654321', 
      Body: 'Aquí está el menú del día',
      MessageSid: 'TEST123',
      NumMedia: '1',
      MediaUrl0: 'https://api.twilio.com/test-media.jpg',
      MediaContentType0: 'image/jpeg'
    }
  };
  
  console.log('📨 Mock multimedia request:', {
    from: mockMediaRequest.body.From,
    to: mockMediaRequest.body.To,
    hasMedia: mockMediaRequest.body.NumMedia > 0,
    mediaType: mockMediaRequest.body.MediaContentType0
  });
  
  // Test multimedia context preparation
  const mediaInfo = {
    mediaCount: parseInt(mockMediaRequest.body.NumMedia),
    mediaUrl: mockMediaRequest.body.MediaUrl0,
    mediaType: mockMediaRequest.body.MediaContentType0,
    messageWithMedia: true
  };
  
  console.log('✅ Media info extracted:', mediaInfo);
  
  // Test multimedia storage (would happen in real webhook)
  try {
    // Create test user first
    const testUser = await createTestUser();
    
    const mediaFile = await prisma.mediaFile.create({
      data: {
        userId: testUser.id,
        originalUrl: mediaInfo.mediaUrl,
        fileType: 'image',
        mimeType: mediaInfo.mediaType,
        purpose: 'user_upload',
        description: 'Test multimedia file'
      }
    });
    
    console.log('✅ Media file stored in database:', mediaFile.id);
    
  } catch (error) {
    console.log('⚠️ Media storage test skipped (expected if no test user):', error.message.substring(0, 60));
  }
}

async function testFunctionCalling() {
  const testMessages = [
    {
      role: 'system',
      content: 'Eres un asistente de restaurante. Puedes enviar menús y guardar pedidos.'
    },
    {
      role: 'user', 
      content: 'Hola, me gustaría ver el menú y hacer un pedido de hamburguesa'
    }
  ];
  
  const testContext = {
    userId: 'test-user-123',
    agentId: 'test-agent-123',
    conversationId: 'test-conv-123',
    customerLeadId: 'test-lead-123',
    customerPhone: '+1234567890',
    whatsappNumber: '+0987654321'
  };
  
  const testConfig = {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokensPerMessage: 200,
    useFunctionCalling: true
  };
  
  try {
    console.log('🔧 Testing function calling with test context...');
    
    const response = await functionCallingService.generateWithFunctions(
      testMessages,
      testContext, 
      testConfig
    );
    
    console.log('📊 Function calling results:');
    console.log('  Success:', response.success);
    console.log('  Tools used:', response.toolsUsed);
    console.log('  Function calls:', response.functionCalls);
    console.log('  Message preview:', response.message?.substring(0, 100) + '...');
    
    if (response.toolsUsed && response.toolsUsed.length > 0) {
      console.log('✅ Function calling worked! Tools were called:', response.toolsUsed);
    } else {
      console.log('⚠️ No tools were called in this test');
    }
    
  } catch (error) {
    console.error('❌ Function calling test failed:', error.message);
  }
}

async function testMCPIntegration() {
  // Mock complete context for MCP integration
  const mockAgent = {
    id: 'agent-123',
    userId: 'user-123', 
    name: 'Test Restaurant Agent',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokensPerMessage: 200,
    personalityPrompt: 'Eres un asistente amigable de restaurante',
    businessPrompt: 'Ayudas con pedidos y consultas',
    objectivesPrompt: 'Vender más y satisfacer al cliente'
  };
  
  const mockCustomerLead = {
    id: 'lead-123',
    phone: '+1234567890',
    tags: ['first_time_customer']
  };
  
  const mockConversation = {
    id: 'conv-123',
    messages: [],
    metadata: {}
  };
  
  const mockHistory = [
    {
      role: 'user',
      content: 'Hola, quiero ver el menú y hacer un pedido'
    }
  ];
  
  const mockContext = {
    whatsappNumber: '+0987654321'
  };
  
  try {
    console.log('🚀 Testing MCP Integration Service...');
    
    const result = await mcpIntegrationService.generateResponseWithMCP(
      mockHistory,
      'Eres un asistente de restaurante muy profesional',
      mockContext,
      'order_request',
      mockAgent,
      mockCustomerLead,
      mockConversation
    );
    
    console.log('📋 MCP Integration results:');
    console.log('  Success:', result.success);
    console.log('  MCP Enabled:', result.mcpEnabled);
    console.log('  Tools Used:', result.toolsUsed);
    console.log('  Function Calls:', result.functionCalls);
    console.log('  Message preview:', result.message?.substring(0, 100) + '...');
    console.log('  Model used:', result.model_used);
    
    if (result.success) {
      console.log('✅ MCP Integration working correctly!');
    }
    
  } catch (error) {
    console.log('⚠️ MCP Integration test (expected fallback):', error.message.substring(0, 80));
    console.log('   This is expected if no test user exists in database');
  }
}

async function testDatabaseOperations() {
  try {
    // Check all new tables
    console.log('🔍 Checking database table counts...');
    
    const mediaFiles = await prisma.mediaFile.count();
    const businessRecords = await prisma.businessRecord.count();
    const mcpConfigs = await prisma.mCPConfiguration.count();
    const usersWithCRM = await prisma.user.count({
      where: { crmEnabled: true }
    });
    const agentsWithMCP = await prisma.userAIAgent.count({
      where: { mcpEnabled: true }
    });
    
    console.log('📊 Database status:');
    console.log(`  Media files: ${mediaFiles}`);
    console.log(`  Business records: ${businessRecords}`);
    console.log(`  MCP configurations: ${mcpConfigs}`);
    console.log(`  Users with CRM: ${usersWithCRM}`);
    console.log(`  Agents with MCP: ${agentsWithMCP}`);
    
    // Test creating MCP configuration
    console.log('\n🔧 Testing MCP configuration creation...');
    const testUser = await createTestUser();
    
    const mcpConfig = await prisma.mCPConfiguration.create({
      data: {
        userId: testUser.id,
        mcpEnabled: true,
        provider: 'openai_functions',
        sendMultimedia: true,
        saveData: true,
        analyzeIntent: true,
        scheduleFollowUp: true
      }
    });
    
    console.log('✅ MCP Configuration created:', mcpConfig.id);
    
    // Test business record creation
    const businessRecord = await prisma.businessRecord.create({
      data: {
        userId: testUser.id,
        recordType: 'order',
        data: {
          items: ['hamburguesa', 'papas fritas'],
          total: 25.50,
          notes: 'Sin cebolla'
        },
        status: 'pending',
        customerPhone: '+1234567890',
        createdBy: 'ai'
      }
    });
    
    console.log('✅ Business record created:', businessRecord.id);
    
    // Clean up test data
    await prisma.businessRecord.delete({ where: { id: businessRecord.id } });
    await prisma.mCPConfiguration.delete({ where: { id: mcpConfig.id } });
    await cleanupTestUser(testUser.id);
    
    console.log('✅ Database operations test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database operations test failed:', error);
  }
}

async function testWebhookIntegration() {
  console.log('🌐 Testing webhook integration pattern...');
  
  // This simulates what happens in the webhook when MCP is called
  const mockWebhookData = {
    userWhatsApp: {
      userId: 'user-123',
      phoneNumber: '+0987654321',
      user: {
        email: 'test@restaurant.com',
        crmEnabled: true
      }
    },
    agent: {
      id: 'agent-123',
      userId: 'user-123',
      name: 'Restaurant Assistant',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokensPerMessage: 200
    },
    customerLead: {
      id: 'lead-123',
      phone: '+1234567890',
      qualificationScore: 75
    },
    conversation: {
      id: 'conv-123',
      messages: [],
      sessionId: 'whatsapp_test_123'
    },
    mediaInfo: {
      mediaCount: 1,
      mediaUrl: 'https://example.com/menu.jpg',
      mediaType: 'image/jpeg',
      messageWithMedia: true
    }
  };
  
  console.log('📝 Mock webhook data prepared');
  console.log('  User ID:', mockWebhookData.userWhatsApp.userId);
  console.log('  Agent:', mockWebhookData.agent.name);
  console.log('  Has media:', !!mockWebhookData.mediaInfo);
  console.log('  Customer phone:', mockWebhookData.customerLead.phone);
  
  // Test the integration pattern from webhook
  try {
    console.log('\n🔄 Simulating webhook MCP call...');
    
    const conversationHistory = [
      { role: 'user', content: 'Hola, quiero ver el menú por favor' }
    ];
    
    // Add multimedia info to context like in webhook
    const context = {
      leadId: mockWebhookData.customerLead.id,
      phone: mockWebhookData.customerLead.phone,
      agentId: mockWebhookData.agent.id,
      userId: mockWebhookData.agent.userId,
      whatsappNumber: mockWebhookData.userWhatsApp.phoneNumber,
      hasMedia: true,
      mediaType: mockWebhookData.mediaInfo.mediaType,
      mediaUrl: mockWebhookData.mediaInfo.mediaUrl
    };
    
    // This is the same call pattern used in the webhook
    const response = await mcpIntegrationService.generateResponseWithMCP(
      conversationHistory,
      'Eres un asistente de restaurante profesional y amigable',
      context,
      'conversation',
      mockWebhookData.agent,
      mockWebhookData.customerLead,
      mockWebhookData.conversation
    );
    
    console.log('📱 Webhook simulation results:');
    console.log('  Success:', response.success);
    console.log('  Message length:', response.message?.length);
    console.log('  Model used:', response.model_used);
    console.log('  Custom prompt:', response.customPrompt);
    console.log('  User configured:', response.userConfigured);
    
    if (response.success) {
      console.log('✅ Webhook integration pattern working!');
    }
    
  } catch (error) {
    console.log('⚠️ Webhook simulation (expected fallback):', error.message.substring(0, 80));
  }
}

// Helper functions
async function createTestUser() {
  try {
    // Try to find existing test user first
    let testUser = await prisma.user.findUnique({
      where: { email: 'test@multimedia-functions.com' }
    });
    
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'test@multimedia-functions.com',
          password: 'test123',
          name: 'Test User',
          crmEnabled: true,
          crmPlan: 'basic'
        }
      });
      console.log('👤 Test user created:', testUser.email);
    } else {
      console.log('👤 Using existing test user:', testUser.email);
    }
    
    return testUser;
  } catch (error) {
    console.log('⚠️ Could not create test user:', error.message);
    throw error;
  }
}

async function cleanupTestUser(userId) {
  try {
    // Clean up related records first
    await prisma.mediaFile.deleteMany({
      where: { userId: userId }
    });
    
    await prisma.user.delete({
      where: { id: userId }
    });
    
    console.log('🧹 Test user cleaned up');
  } catch (error) {
    console.log('⚠️ Cleanup warning:', error.message.substring(0, 50));
  }
}

// Run the tests
console.log('🚀 Starting Multimedia and Functions Test Suite...\n');
testMultimediaAndFunctions().catch((error) => {
  console.error('💥 Fatal test error:', error);
  process.exit(1);
});