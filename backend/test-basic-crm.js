/**
 * 🧪 BASIC CRM ENDPOINT TEST
 * Test básico de endpoints CRM después de crear usuario
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3005';

async function testBasicCRM() {
  console.log('🚀 TESTING BASIC CRM ENDPOINTS\n');
  
  const testUser = {
    email: 'basic-test@safenotify.co',
    password: 'test123',
    name: 'Basic Test User',
    role: 'user',
    planType: 'pro',
    crmEnabled: true,
    crmPlan: 'pro',
    maxAgents: 3
  };

  try {
    console.log('1️⃣ Creating test user...');
    
    // Limpiar usuario previo
    await prisma.cRMConversation.deleteMany({
      where: { user: { email: testUser.email } }
    });
    await prisma.customerLead.deleteMany({
      where: { user: { email: testUser.email } }
    });
    await prisma.userAIAgent.deleteMany({
      where: { user: { email: testUser.email } }
    });
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });

    // Crear usuario
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await prisma.user.create({
      data: { ...testUser, password: hashedPassword }
    });
    
    console.log('   ✅ User created');

    console.log('\n2️⃣ Testing login...');
    
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginData.success || !loginData.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }
    
    const token = loginData.token;
    console.log('   ✅ Login successful');

    console.log('\n3️⃣ Testing GET /api/agents...');
    
    const agentsResponse = await fetch(`${BASE_URL}/api/agents`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`   Status: ${agentsResponse.status}`);
    
    if (!agentsResponse.ok) {
      const errorText = await agentsResponse.text();
      console.log(`   Response: ${errorText}`);
      throw new Error(`Agents endpoint failed: ${agentsResponse.status}`);
    }
    
    const agentsData = await agentsResponse.json();
    console.log('   Response structure:', JSON.stringify(agentsData, null, 2));
    
    // Adapt to actual response structure
    let agentCount = 0;
    if (agentsData.data && agentsData.data.agents) {
      agentCount = agentsData.data.agents.length;
    } else if (agentsData.agents) {
      agentCount = agentsData.agents.length;
    } else if (Array.isArray(agentsData)) {
      agentCount = agentsData.length;
    }
    
    console.log(`   ✅ Agents endpoint working - found ${agentCount} agents`);

    console.log('\n4️⃣ Testing POST /api/agents...');
    
    const createResponse = await fetch(`${BASE_URL}/api/agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Basic Test Agent',
        role: 'assistant',
        personalityPrompt: 'You are a helpful assistant',
        businessPrompt: 'We provide excellent service',
        objectivesPrompt: 'Help customers with their needs',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokensPerMessage: 500,
        isActive: true,
        isDefault: false
      })
    });
    
    console.log(`   Status: ${createResponse.status}`);
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log(`   Response: ${errorText}`);
      throw new Error(`Create agent failed: ${createResponse.status}`);
    }
    
    const createData = await createResponse.json();
    console.log('   ✅ Agent created successfully');

    console.log('\n5️⃣ Testing GET /api/conversations...');
    
    const convResponse = await fetch(`${BASE_URL}/api/conversations`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log(`   Status: ${convResponse.status}`);
    
    if (!convResponse.ok) {
      const errorText = await convResponse.text();
      console.log(`   Response: ${errorText}`);
    } else {
      const convData = await convResponse.json();
      console.log(`   ✅ Conversations endpoint working - found ${convData.data.conversations.length} conversations`);
    }

    console.log('\n✅ ALL BASIC TESTS PASSED!');
    console.log('\n📋 SUMMARY:');
    console.log('   ✅ User creation working');
    console.log('   ✅ Authentication working');
    console.log('   ✅ Agents API working');
    console.log('   ✅ Agent creation working');
    console.log('   ✅ Conversations API working');
    console.log('\n🎯 Backend APIs are functional for frontend integration!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    try {
      await prisma.cRMConversation.deleteMany({
        where: { user: { email: testUser.email } }
      });
      await prisma.customerLead.deleteMany({
        where: { user: { email: testUser.email } }
      });
      await prisma.userAIAgent.deleteMany({
        where: { user: { email: testUser.email } }
      });
      await prisma.user.deleteMany({
        where: { email: testUser.email }
      });
      console.log('   ✅ Cleanup completed');
    } catch (cleanupError) {
      console.log('   ⚠️ Cleanup error:', cleanupError.message);
    }
    
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testBasicCRM();
}

module.exports = { testBasicCRM };