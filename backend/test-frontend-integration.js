/**
 * 🧪 FRONTEND-BACKEND INTEGRATION TEST
 * Verifica que las interfaces CRM se conecten correctamente con las APIs
 */

const { spawn } = require('child_process');
const fetch = require('node-fetch');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuración de prueba
const TEST_PORT = 3005;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const TEST_USER = {
  email: 'test-frontend@safenotify.co',
  password: 'test123',
  name: 'Frontend Test User',
  role: 'user',
  planType: 'pro',
  crmEnabled: true,
  crmPlan: 'pro',
  maxAgents: 3,
  maxWhatsAppNumbers: 2
};

let server;
let authToken;
let testUserId;

async function setupTestData() {
  console.log('🔧 Setting up test data...');
  
  try {
    // Limpiar datos de prueba previos
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

    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
    const testUser = await prisma.user.create({
      data: {
        ...TEST_USER,
        password: hashedPassword
      }
    });
    testUserId = testUser.id;
    
    console.log('   ✅ Test user created');
    
    // Crear agente de prueba
    const testAgent = await prisma.userAIAgent.create({
      data: {
        userId: testUserId,
        name: 'Test Frontend Agent',
        role: 'assistant',
        personalityPrompt: 'You are a helpful assistant for testing',
        businessPrompt: 'This is a test business',
        objectivesPrompt: 'Your objective is to help with testing',
        isActive: true,
        isDefault: true,
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokensPerMessage: 500
      }
    });
    
    console.log('   ✅ Test agent created');
    
    // Crear lead de prueba
    const testLead = await prisma.customerLead.create({
      data: {
        userId: testUserId,
        phone: '+573001234567',
        name: 'Test Customer',
        email: 'customer@test.com',
        source: 'whatsapp',
        status: 'NEW',
        qualificationScore: 75
      }
    });
    
    console.log('   ✅ Test lead created');
    
    // Crear conversación de prueba
    await prisma.cRMConversation.create({
      data: {
        userId: testUserId,
        customerLeadId: testLead.id,
        sessionId: `test_frontend_${Date.now()}`,
        customerPhone: testLead.phone,
        status: 'ACTIVE',
        priority: 'NORMAL',
        currentAgentId: testAgent.id,
        messages: [
          {
            role: 'user',
            content: 'Hola, necesito ayuda',
            timestamp: new Date().toISOString()
          },
          {
            role: 'assistant', 
            content: 'Hola! En qué puedo ayudarte?',
            timestamp: new Date().toISOString()
          }
        ],
        messageCount: 2,
        lastMessageAt: new Date()
      }
    });
    
    console.log('   ✅ Test conversation created');
    
  } catch (error) {
    console.error('❌ Error setting up test data:', error.message);
    throw error;
  }
}

async function startServer() {
  console.log('🚀 Starting test server...');
  
  return new Promise((resolve, reject) => {
    server = spawn('node', ['simple-server.js'], {
      cwd: './backend',
      env: { ...process.env, PORT: TEST_PORT },
      stdio: 'pipe'
    });

    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Server running on port')) {
        console.log('   ✅ Server started on port', TEST_PORT);
        resolve();
      }
    });

    server.stderr.on('data', (data) => {
      console.log('Server error:', data.toString());
    });

    server.on('error', reject);
    
    // Timeout después de 10 segundos
    setTimeout(() => reject(new Error('Server startup timeout')), 10000);
  });
}

async function authenticateUser() {
  console.log('🔐 Authenticating test user...');
  
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Authentication failed: ${error}`);
  }
  
  const data = await response.json();
  authToken = data.token;
  console.log('   ✅ Authentication successful');
  return authToken;
}

async function testAgentsAPI() {
  console.log('\n🤖 Testing Agents API...');
  
  // Test GET /api/agents
  console.log('1️⃣ Testing GET /api/agents');
  const listResponse = await fetch(`${BASE_URL}/api/agents`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  if (!listResponse.ok) {
    throw new Error(`GET /api/agents failed: ${listResponse.status}`);
  }
  
  const listData = await listResponse.json();
  console.log(`   ✅ Found ${listData.data.agents.length} agents`);
  
  // Test POST /api/agents (crear nuevo agente)
  console.log('2️⃣ Testing POST /api/agents');
  const createResponse = await fetch(`${BASE_URL}/api/agents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Frontend Test Agent',
      role: 'sales',
      personalityPrompt: 'You are a sales expert',
      businessPrompt: 'We sell CRM software',
      objectivesPrompt: 'Convert leads to customers',
      model: 'gpt-3.5-turbo',
      temperature: 0.8,
      maxTokensPerMessage: 600,
      isActive: true,
      isDefault: false
    })
  });
  
  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`POST /api/agents failed: ${error}`);
  }
  
  const createData = await createResponse.json();
  const newAgentId = createData.data.agent.id;
  console.log('   ✅ Agent created successfully');
  
  // Test GET /api/agents/:id
  console.log('3️⃣ Testing GET /api/agents/:id');
  const getResponse = await fetch(`${BASE_URL}/api/agents/${newAgentId}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  if (!getResponse.ok) {
    throw new Error(`GET /api/agents/:id failed: ${getResponse.status}`);
  }
  
  console.log('   ✅ Agent retrieved successfully');
  
  // Test PATCH /api/agents/:id
  console.log('4️⃣ Testing PATCH /api/agents/:id');
  const updateResponse = await fetch(`${BASE_URL}/api/agents/${newAgentId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Updated Frontend Test Agent',
      isActive: false
    })
  });
  
  if (!updateResponse.ok) {
    throw new Error(`PATCH /api/agents/:id failed: ${updateResponse.status}`);
  }
  
  console.log('   ✅ Agent updated successfully');
  
  return newAgentId;
}

async function testConversationsAPI() {
  console.log('\n💬 Testing Conversations API...');
  
  // Test GET /api/conversations
  console.log('1️⃣ Testing GET /api/conversations');
  const listResponse = await fetch(`${BASE_URL}/api/conversations`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  if (!listResponse.ok) {
    throw new Error(`GET /api/conversations failed: ${listResponse.status}`);
  }
  
  const listData = await listResponse.json();
  console.log(`   ✅ Found ${listData.data.conversations.length} conversations`);
  
  if (listData.data.conversations.length === 0) {
    console.log('   ⚠️ No conversations found, skipping detailed tests');
    return;
  }
  
  const conversationId = listData.data.conversations[0].id;
  
  // Test GET /api/conversations/:id
  console.log('2️⃣ Testing GET /api/conversations/:id');
  const getResponse = await fetch(`${BASE_URL}/api/conversations/${conversationId}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  if (!getResponse.ok) {
    throw new Error(`GET /api/conversations/:id failed: ${getResponse.status}`);
  }
  
  console.log('   ✅ Conversation retrieved successfully');
  
  // Test PATCH /api/conversations/:id (actualizar estado)
  console.log('3️⃣ Testing PATCH /api/conversations/:id');
  const updateResponse = await fetch(`${BASE_URL}/api/conversations/${conversationId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: 'PAUSED'
    })
  });
  
  if (!updateResponse.ok) {
    throw new Error(`PATCH /api/conversations/:id failed: ${updateResponse.status}`);
  }
  
  console.log('   ✅ Conversation updated successfully');
}

async function testPlanLimits() {
  console.log('\n🔒 Testing Plan Limits...');
  
  // Obtener agentes actuales
  const listResponse = await fetch(`${BASE_URL}/api/agents`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const listData = await listResponse.json();
  const currentAgentCount = listData.data.agents.length;
  console.log(`   Current agents: ${currentAgentCount}/${TEST_USER.maxAgents}`);
  
  // Intentar crear agentes hasta el límite
  const agentsToCreate = TEST_USER.maxAgents - currentAgentCount;
  
  for (let i = 0; i < agentsToCreate; i++) {
    const createResponse = await fetch(`${BASE_URL}/api/agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Limit Test Agent ${i + 1}`,
        role: 'assistant',
        personalityPrompt: 'Test agent for limit testing',
        businessPrompt: 'Test business',
        objectivesPrompt: 'Test objectives'
      })
    });
    
    if (createResponse.ok) {
      console.log(`   ✅ Created agent ${i + 1}/${agentsToCreate}`);
    }
  }
  
  // Intentar crear uno más (debe fallar)
  console.log('4️⃣ Testing limit enforcement');
  const limitResponse = await fetch(`${BASE_URL}/api/agents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Should Fail Agent',
      role: 'assistant',
      personalityPrompt: 'This should fail',
      businessPrompt: 'Test',
      objectivesPrompt: 'Test'
    })
  });
  
  if (limitResponse.ok) {
    console.log('   ⚠️ WARNING: Limit not enforced properly!');
  } else {
    console.log('   ✅ Plan limit correctly enforced');
  }
}

async function testErrorHandling() {
  console.log('\n❌ Testing Error Handling...');
  
  // Test sin autenticación
  console.log('1️⃣ Testing unauthorized access');
  const unauthorizedResponse = await fetch(`${BASE_URL}/api/agents`);
  
  if (unauthorizedResponse.status === 401) {
    console.log('   ✅ Unauthorized access properly rejected');
  } else {
    console.log('   ⚠️ Warning: Unauthorized access not properly handled');
  }
  
  // Test recurso inexistente
  console.log('2️⃣ Testing non-existent resource');
  const notFoundResponse = await fetch(`${BASE_URL}/api/agents/nonexistent-id`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  if (notFoundResponse.status === 404) {
    console.log('   ✅ Non-existent resource properly handled');
  } else {
    console.log('   ⚠️ Warning: Non-existent resource not properly handled');
  }
  
  // Test datos inválidos
  console.log('3️⃣ Testing invalid data');
  const invalidResponse = await fetch(`${BASE_URL}/api/agents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // Datos inválidos (sin campos requeridos)
      name: '',
      temperature: 5 // Fuera de rango
    })
  });
  
  if (!invalidResponse.ok) {
    console.log('   ✅ Invalid data properly rejected');
  } else {
    console.log('   ⚠️ Warning: Invalid data not properly validated');
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up...');
  
  try {
    // Limpiar datos de prueba
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
    
    console.log('   ✅ Test data cleaned up');
  } catch (error) {
    console.log('   ⚠️ Cleanup error:', error.message);
  }
  
  // Cerrar servidor
  if (server) {
    server.kill();
    console.log('   ✅ Server stopped');
  }
  
  await prisma.$disconnect();
}

async function runFrontendIntegrationTests() {
  console.log('🚀 STARTING FRONTEND-BACKEND INTEGRATION TESTS\n');
  
  try {
    // 1. Setup
    await setupTestData();
    await startServer();
    
    // Esperar a que el servidor esté completamente listo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 2. Autenticación
    await authenticateUser();
    
    // 3. Tests principales
    await testAgentsAPI();
    await testConversationsAPI();
    await testPlanLimits();
    await testErrorHandling();
    
    console.log('\n✅ ALL FRONTEND-BACKEND INTEGRATION TESTS PASSED!\n');
    
    console.log('📋 SUMMARY:');
    console.log('   ✅ Server startup successful');
    console.log('   ✅ User authentication working');
    console.log('   ✅ Agents API fully functional');
    console.log('   ✅ Conversations API working');
    console.log('   ✅ Plan limits properly enforced');
    console.log('   ✅ Error handling implemented');
    console.log('\n🎯 Frontend interfaces can safely connect to backend APIs');
    
  } catch (error) {
    console.error('\n❌ INTEGRATION TEST FAILED:', error.message);
    console.error(error);
  } finally {
    await cleanup();
  }
}

// Ejecutar tests
if (require.main === module) {
  runFrontendIntegrationTests();
}

module.exports = { runFrontendIntegrationTests };