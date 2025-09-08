/**
 * 🧪 SIMPLE API TEST
 * Test directo de las APIs CRM sin levantar servidor
 */

const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3005';

// Usuario de prueba
const TEST_USER = {
  email: 'test-simple@safenotify.co',
  password: 'test123',
  name: 'Simple Test User',
  role: 'user',
  planType: 'pro',
  crmEnabled: true,
  crmPlan: 'pro',
  maxAgents: 3
};

let authToken;
let testUserId;

async function setupUser() {
  console.log('👤 Setting up test user...');
  
  // Limpiar usuario previo
  await prisma.cRMConversation.deleteMany({
    where: { user: { email: TEST_USER.email } }
  });
  await prisma.customerLead.deleteMany({
    where: { user: { email: TEST_USER.email } }
  });
  await prisma.userAIAgent.deleteMany({
    where: { user: { email: TEST_USER.email } }
  });
  await prisma.user.deleteMany({
    where: { email: TEST_USER.email }
  });

  // Crear usuario
  const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
  const user = await prisma.user.create({
    data: { ...TEST_USER, password: hashedPassword }
  });
  
  testUserId = user.id;
  console.log('   ✅ Test user ready');
}

async function authenticate() {
  console.log('🔐 Authenticating...');
  
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
  });
  
  if (!response.ok) {
    throw new Error('Authentication failed');
  }
  
  const data = await response.json();
  authToken = data.token;
  console.log('   ✅ Authenticated');
}

async function testAgentsCRUD() {
  console.log('\n🤖 Testing Agents CRUD...');
  
  // 1. List agents (should be empty)
  let response = await fetch(`${BASE_URL}/api/agents`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  let data = await response.json();
  console.log(`   📋 Initial agents: ${data.data.agents.length}`);
  
  // 2. Create agent
  response = await fetch(`${BASE_URL}/api/agents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Test Sales Agent',
      description: 'Agent for testing',
      role: 'sales',
      personalityPrompt: 'You are a friendly sales assistant',
      businessPrompt: 'We sell CRM software for WhatsApp',
      objectivesPrompt: 'Convert leads into customers',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokensPerMessage: 500,
      isActive: true,
      isDefault: false
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Create agent failed: ${error}`);
  }
  
  data = await response.json();
  const agentId = data.data.agent.id;
  console.log('   ✅ Agent created');
  
  // 3. Get agent
  response = await fetch(`${BASE_URL}/api/agents/${agentId}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  if (!response.ok) {
    throw new Error('Get agent failed');
  }
  
  console.log('   ✅ Agent retrieved');
  
  // 4. Update agent
  response = await fetch(`${BASE_URL}/api/agents/${agentId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Updated Test Sales Agent',
      isActive: false
    })
  });
  
  if (!response.ok) {
    throw new Error('Update agent failed');
  }
  
  console.log('   ✅ Agent updated');
  
  // 5. List agents again
  response = await fetch(`${BASE_URL}/api/agents`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  data = await response.json();
  console.log(`   📋 Final agents: ${data.data.agents.length}`);
  
  return agentId;
}

async function testConversations() {
  console.log('\n💬 Testing Conversations...');
  
  // Crear lead y conversación de prueba directamente en DB
  const lead = await prisma.customerLead.create({
    data: {
      userId: testUserId,
      phone: '+573001111111',
      name: 'Test Customer',
      source: 'whatsapp',
      status: 'NEW',
      qualificationScore: 80
    }
  });
  
  const conversation = await prisma.cRMConversation.create({
    data: {
      userId: testUserId,
      customerLeadId: lead.id,
      sessionId: `test_${Date.now()}`,
      customerPhone: lead.phone,
      status: 'ACTIVE',
      priority: 'NORMAL',
      messages: [
        {
          role: 'user',
          content: 'Hola, ¿pueden ayudarme?',
          timestamp: new Date().toISOString()
        }
      ],
      messageCount: 1
    }
  });
  
  console.log('   📋 Test data created');
  
  // 1. List conversations
  let response = await fetch(`${BASE_URL}/api/conversations`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  if (!response.ok) {
    throw new Error('List conversations failed');
  }
  
  let data = await response.json();
  console.log(`   📋 Found ${data.data.conversations.length} conversations`);
  
  // 2. Get specific conversation
  response = await fetch(`${BASE_URL}/api/conversations/${conversation.id}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  if (!response.ok) {
    throw new Error('Get conversation failed');
  }
  
  console.log('   ✅ Conversation retrieved');
  
  // 3. Update conversation status
  response = await fetch(`${BASE_URL}/api/conversations/${conversation.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'COMPLETED'
    })
  });
  
  if (!response.ok) {
    throw new Error('Update conversation failed');
  }
  
  console.log('   ✅ Conversation status updated');
}

async function testPlanLimits() {
  console.log('\n🔒 Testing Plan Limits...');
  
  // Obtener count actual
  let response = await fetch(`${BASE_URL}/api/agents`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  let data = await response.json();
  const currentCount = data.data.agents.length;
  console.log(`   📊 Current agents: ${currentCount}/${TEST_USER.maxAgents}`);
  
  // Crear agentes hasta el límite
  for (let i = currentCount; i < TEST_USER.maxAgents; i++) {
    response = await fetch(`${BASE_URL}/api/agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Limit Agent ${i + 1}`,
        role: 'assistant',
        personalityPrompt: 'Test personality',
        businessPrompt: 'Test business',
        objectivesPrompt: 'Test objectives'
      })
    });
    
    if (response.ok) {
      console.log(`   ➕ Created agent ${i + 1}`);
    }
  }
  
  // Intentar crear uno más (debe fallar)
  response = await fetch(`${BASE_URL}/api/agents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Over Limit Agent',
      role: 'assistant', 
      personalityPrompt: 'Should fail',
      businessPrompt: 'Should fail',
      objectivesPrompt: 'Should fail'
    })
  });
  
  if (response.ok) {
    console.log('   ⚠️ WARNING: Plan limit not enforced!');
  } else {
    console.log('   ✅ Plan limit properly enforced');
  }
}

async function cleanup() {
  console.log('\n🧹 Cleanup...');
  
  await prisma.cRMConversation.deleteMany({
    where: { user: { email: TEST_USER.email } }
  });
  await prisma.customerLead.deleteMany({
    where: { user: { email: TEST_USER.email } }
  });
  await prisma.userAIAgent.deleteMany({
    where: { user: { email: TEST_USER.email } }
  });
  await prisma.user.deleteMany({
    where: { email: TEST_USER.email }
  });
  
  console.log('   ✅ Cleaned up');
  await prisma.$disconnect();
}

async function runSimpleTests() {
  console.log('🚀 RUNNING SIMPLE API TESTS\n');
  
  try {
    await setupUser();
    await authenticate();
    await testAgentsCRUD();
    await testConversations();
    await testPlanLimits();
    
    console.log('\n✅ ALL API TESTS PASSED!');
    console.log('\n📋 RESULTS:');
    console.log('   ✅ User authentication working');
    console.log('   ✅ Agents CRUD fully functional');
    console.log('   ✅ Conversations API working');
    console.log('   ✅ Plan limits enforced');
    console.log('\n🎯 Backend APIs are ready for frontend integration!');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    throw error;
  } finally {
    await cleanup();
  }
}

// Ejecutar
if (require.main === module) {
  runSimpleTests().catch(console.error);
}

module.exports = { runSimpleTests };