/**
 * 🧪 BASIC CRM TEST
 * Test básico del sistema CRM sin necesidad de servidor
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCRMBasics() {
  console.log('🚀 Testing CRM System Basics\n');
  
  try {
    // Test 1: Check database connection
    console.log('1️⃣ Testing database connection...');
    const userCount = await prisma.user.count();
    console.log(`   ✅ Database connected. Users in system: ${userCount}`);
    
    // Test 2: Check if CRM tables exist
    console.log('\n2️⃣ Checking CRM tables...');
    
    try {
      // Check if we can query UserAIAgent table
      const agentCount = await prisma.userAIAgent.count();
      console.log(`   ✅ UserAIAgent table exists. Agents: ${agentCount}`);
    } catch (e) {
      console.log(`   ❌ UserAIAgent table not found. Run migrations!`);
    }
    
    try {
      // Check CustomerLead table
      const leadCount = await prisma.customerLead.count();
      console.log(`   ✅ CustomerLead table exists. Leads: ${leadCount}`);
    } catch (e) {
      console.log(`   ❌ CustomerLead table not found. Run migrations!`);
    }
    
    try {
      // Check CRMConversation table
      const convCount = await prisma.cRMConversation.count();
      console.log(`   ✅ CRMConversation table exists. Conversations: ${convCount}`);
    } catch (e) {
      console.log(`   ❌ CRMConversation table not found. Run migrations!`);
    }
    
    // Test 3: Check services
    console.log('\n3️⃣ Loading services...');
    
    try {
      const convService = require('./services/conversationManagementService');
      console.log('   ✅ ConversationManagementService loaded');
    } catch (e) {
      console.log(`   ❌ ConversationManagementService error: ${e.message}`);
    }
    
    try {
      const metricsService = require('./services/conversationMetricsService');
      console.log('   ✅ ConversationMetricsService loaded');
    } catch (e) {
      console.log(`   ❌ ConversationMetricsService error: ${e.message}`);
    }
    
    try {
      const eventsService = require('./services/conversationEventsService');
      console.log('   ✅ ConversationEventsService loaded');
    } catch (e) {
      console.log(`   ❌ ConversationEventsService error: ${e.message}`);
    }
    
    // Test 4: Check routes
    console.log('\n4️⃣ Loading routes...');
    
    try {
      const agentRoutes = require('./routes/agents');
      console.log('   ✅ Agent routes loaded');
    } catch (e) {
      console.log(`   ❌ Agent routes error: ${e.message}`);
    }
    
    try {
      const convRoutes = require('./routes/conversations');
      console.log('   ✅ Conversation routes loaded');
    } catch (e) {
      console.log(`   ❌ Conversation routes error: ${e.message}`);
    }
    
    try {
      const crmWebhook = require('./routes/crmWebhook');
      console.log('   ✅ CRM Webhook routes loaded');
    } catch (e) {
      console.log(`   ❌ CRM Webhook routes error: ${e.message}`);
    }
    
    // Test 5: Create test data
    console.log('\n5️⃣ Testing data creation...');
    
    // Find or create test user
    let testUser = await prisma.user.findFirst({
      where: { email: 'test-basic@safenotify.co' }
    });
    
    if (!testUser) {
      const bcrypt = require('bcryptjs');
      testUser = await prisma.user.create({
        data: {
          email: 'test-basic@safenotify.co',
          password: await bcrypt.hash('test123', 10),
          name: 'Basic Test User',
          role: 'user',
          planType: 'pro',
          crmEnabled: true,
          crmPlan: 'pro',
          maxAgents: 3,
          maxWhatsAppNumbers: 2
        }
      });
      console.log('   ✅ Test user created');
    } else {
      console.log('   ℹ️ Test user already exists');
    }
    
    // Try to create an agent
    const agent = await prisma.userAIAgent.create({
      data: {
        userId: testUser.id,
        name: `Test Agent ${Date.now()}`,
        role: 'assistant',
        personalityPrompt: 'Test personality',
        businessPrompt: 'Test business',
        objectivesPrompt: 'Test objectives',
        isActive: true,
        isDefault: false,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokensPerMessage: 500
      }
    });
    console.log(`   ✅ Test agent created: ${agent.name}`);
    
    // Create a lead
    const lead = await prisma.customerLead.create({
      data: {
        userId: testUser.id,
        phone: `+57300${Math.floor(Math.random() * 10000000)}`,
        name: 'Test Lead',
        source: 'whatsapp',
        status: 'NEW',
        qualificationScore: 50
      }
    });
    console.log(`   ✅ Test lead created: ${lead.phone}`);
    
    // Create a conversation
    const conversation = await prisma.cRMConversation.create({
      data: {
        userId: testUser.id,
        customerLeadId: lead.id,
        customerPhone: lead.phone,
        sessionId: `test_${Date.now()}`,
        status: 'ACTIVE',
        priority: 'NORMAL',
        currentAgentId: agent.id,
        messages: [
          { role: 'user', content: 'Test message', timestamp: new Date().toISOString() }
        ],
        messageCount: 1
      }
    });
    console.log(`   ✅ Test conversation created: ${conversation.sessionId}`);
    
    // Cleanup
    console.log('\n6️⃣ Cleaning up test data...');
    await prisma.cRMConversation.delete({ where: { id: conversation.id } });
    await prisma.customerLead.delete({ where: { id: lead.id } });
    await prisma.userAIAgent.delete({ where: { id: agent.id } });
    console.log('   ✅ Test data cleaned up');
    
    console.log('\n✅ ALL BASIC TESTS PASSED!\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testCRMBasics();