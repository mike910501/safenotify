/**
 * 🧪 TEST SUITE: CRM System Integration Tests
 * 
 * Tests completos para verificar que el sistema CRM funciona correctamente
 * Ejecutar con: node test-crm-system.js
 */

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
// Use built-in fetch if available (Node 18+) or require node-fetch
const fetch = globalThis.fetch || (() => {
  try {
    return require('node-fetch');
  } catch {
    console.error('node-fetch not installed. Run: npm install node-fetch');
    process.exit(1);
  }
})();

const prisma = new PrismaClient();

// Configuración
const BASE_URL = 'http://localhost:3001';
const TEST_USER_EMAIL = 'test-crm@safenotify.co';
const TEST_USER_PASSWORD = 'TestCRM123!';

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Estado de tests
let testsPassed = 0;
let testsFailed = 0;
let testUser = null;
let authToken = null;
let testAgentId = null;
let testConversationId = null;

// ============================================================================
// UTILIDADES
// ============================================================================

function log(message, type = 'info') {
  const colorMap = {
    success: colors.green,
    error: colors.red,
    warning: colors.yellow,
    info: colors.blue,
    test: colors.cyan
  };
  
  const color = colorMap[type] || colors.reset;
  console.log(`${color}${message}${colors.reset}`);
}

async function makeRequest(method, endpoint, body = null, token = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    return {
      status: response.status,
      success: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 500,
      success: false,
      error: error.message
    };
  }
}

function assert(condition, testName, details = '') {
  if (condition) {
    log(`✅ PASS: ${testName}`, 'success');
    testsPassed++;
    return true;
  } else {
    log(`❌ FAIL: ${testName}`, 'error');
    if (details) log(`   Details: ${details}`, 'error');
    testsFailed++;
    return false;
  }
}

// ============================================================================
// SETUP Y CLEANUP
// ============================================================================

async function setupTestUser() {
  log('\n📋 SETUP: Creando usuario de prueba...', 'test');
  
  try {
    // Limpiar usuario existente si existe
    await prisma.user.deleteMany({
      where: { email: TEST_USER_EMAIL }
    });

    // Crear usuario de prueba con CRM habilitado
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    
    testUser = await prisma.user.create({
      data: {
        email: TEST_USER_EMAIL,
        password: hashedPassword,
        name: 'Test CRM User',
        role: 'user',
        planType: 'pro',
        crmEnabled: true,
        crmPlan: 'pro',
        maxAgents: 3,
        maxWhatsAppNumbers: 2,
        messagesLimit: 500
      }
    });

    // Generar token de autenticación
    authToken = jwt.sign(
      { 
        userId: testUser.id,
        email: testUser.email,
        role: testUser.role
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '24h' }
    );

    log('✅ Usuario de prueba creado', 'success');
    return true;

  } catch (error) {
    log(`❌ Error en setup: ${error.message}`, 'error');
    return false;
  }
}

async function cleanup() {
  log('\n🧹 CLEANUP: Limpiando datos de prueba...', 'test');
  
  try {
    if (testUser) {
      // Limpiar en orden correcto por foreign keys
      await prisma.userAgentPrompt.deleteMany({
        where: { agent: { userId: testUser.id } }
      });
      
      await prisma.crmConversation.deleteMany({
        where: { userId: testUser.id }
      });
      
      await prisma.customerLead.deleteMany({
        where: { userId: testUser.id }
      });
      
      await prisma.userAIAgent.deleteMany({
        where: { userId: testUser.id }
      });
      
      await prisma.userWhatsAppNumber.deleteMany({
        where: { userId: testUser.id }
      });
      
      await prisma.user.delete({
        where: { id: testUser.id }
      });
    }
    
    log('✅ Limpieza completada', 'success');
  } catch (error) {
    log(`⚠️ Error en cleanup: ${error.message}`, 'warning');
  }
}

// ============================================================================
// TESTS: AGENT MANAGEMENT
// ============================================================================

async function testAgentManagement() {
  log('\n🤖 TESTING: Agent Management API', 'test');

  // Test 1: Listar agentes (debe estar vacío inicialmente)
  let response = await makeRequest('GET', '/api/agents', null, authToken);
  assert(
    response.success && response.data.agents && Array.isArray(response.data.agents),
    'GET /api/agents - Lista inicial',
    `Status: ${response.status}`
  );
  assert(
    response.data.agents.length === 0,
    'Lista de agentes vacía inicialmente'
  );

  // Test 2: Crear primer agente
  const newAgent = {
    name: 'Asistente Ventas',
    description: 'Agente especializado en ventas',
    role: 'sales',
    personalityPrompt: 'Eres un experto en ventas consultivas',
    businessPrompt: 'Nuestra empresa vende software CRM',
    objectivesPrompt: 'Tu objetivo es calificar leads y cerrar ventas',
    businessRules: {
      canScheduleDemo: true,
      workingHours: '9-18'
    },
    triggerKeywords: ['precio', 'demo', 'comprar'],
    model: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokensPerMessage: 500
  };

  response = await makeRequest('POST', '/api/agents', newAgent, authToken);
  assert(
    response.success && response.data.agent,
    'POST /api/agents - Crear agente',
    `Status: ${response.status}`
  );

  if (response.data.agent) {
    testAgentId = response.data.agent.id;
    assert(
      response.data.agent.isDefault === true,
      'Primer agente es default automáticamente'
    );
  }

  // Test 3: Verificar límites por plan
  const agent2 = { ...newAgent, name: 'Asistente Soporte' };
  const agent3 = { ...newAgent, name: 'Asistente Marketing' };
  
  await makeRequest('POST', '/api/agents', agent2, authToken);
  response = await makeRequest('POST', '/api/agents', agent3, authToken);
  
  assert(
    response.success,
    'Crear 3 agentes con plan Pro'
  );

  // Test 4: Intentar crear 4to agente (debe fallar por límite)
  const agent4 = { ...newAgent, name: 'Agente Extra' };
  response = await makeRequest('POST', '/api/agents', agent4, authToken);
  
  assert(
    !response.success && response.status === 403,
    'Límite de agentes respetado (max 3 para Pro)',
    `Response: ${response.data.error}`
  );

  // Test 5: Actualizar agente
  const updateData = {
    name: 'Asistente Ventas Actualizado',
    temperature: 0.8
  };

  response = await makeRequest('PUT', `/api/agents/${testAgentId}`, updateData, authToken);
  assert(
    response.success && response.data.agent,
    'PUT /api/agents/:id - Actualizar agente',
    `Status: ${response.status}`
  );

  // Test 6: Probar agente
  response = await makeRequest(
    'GET', 
    `/api/agents/${testAgentId}/test?message=Hola, necesito información sobre precios`,
    null,
    authToken
  );
  
  assert(
    response.success && response.data.agentResponse,
    'GET /api/agents/:id/test - Probar agente',
    `Response length: ${response.data.agentResponse?.length || 0}`
  );

  // Test 7: Listar agentes (debe tener 3)
  response = await makeRequest('GET', '/api/agents', null, authToken);
  assert(
    response.data.agents.length === 3,
    'Lista correcta de agentes creados',
    `Count: ${response.data.agents.length}`
  );

  return testsPassed;
}

// ============================================================================
// TESTS: CONVERSATION MANAGEMENT
// ============================================================================

async function testConversationManagement() {
  log('\n💬 TESTING: Conversation Management', 'test');

  // Primero crear un lead y conversación de prueba
  const testLead = await prisma.customerLead.create({
    data: {
      userId: testUser.id,
      phone: '+573001234567',
      name: 'Cliente Test',
      email: 'cliente@test.com',
      source: 'whatsapp',
      status: 'NEW',
      qualificationScore: 65
    }
  });

  const testConversation = await prisma.crmConversation.create({
    data: {
      userId: testUser.id,
      customerLeadId: testLead.id,
      customerPhone: testLead.phone,
      sessionId: `session_${Date.now()}`,
      status: 'ACTIVE',
      priority: 'NORMAL',
      currentAgentId: testAgentId,
      messages: [
        { role: 'user', content: 'Hola, necesito ayuda', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'Hola! ¿En qué puedo ayudarte?', timestamp: new Date().toISOString() }
      ],
      messageCount: 2
    }
  });

  testConversationId = testConversation.id;

  // Test 1: Listar conversaciones
  let response = await makeRequest('GET', '/api/conversations', null, authToken);
  assert(
    response.success && response.data.conversations,
    'GET /api/conversations - Listar conversaciones',
    `Count: ${response.data.conversations?.length || 0}`
  );

  // Test 2: Obtener conversación específica
  response = await makeRequest('GET', `/api/conversations/${testConversationId}`, null, authToken);
  assert(
    response.success && response.data.conversation,
    'GET /api/conversations/:id - Obtener conversación',
    `Messages: ${response.data.conversation?.messages?.length || 0}`
  );

  // Test 3: Cambiar estado de conversación
  response = await makeRequest(
    'PUT',
    `/api/conversations/${testConversationId}/status`,
    { status: 'ARCHIVED', reason: 'Test completed' },
    authToken
  );
  
  assert(
    response.success,
    'PUT /api/conversations/:id/status - Cambiar estado',
    `New status: ${response.data.conversation?.status}`
  );

  // Test 4: Agregar tags
  response = await makeRequest(
    'PUT',
    `/api/conversations/${testConversationId}/tags`,
    { tags: ['importante', 'seguimiento', 'ventas'] },
    authToken
  );
  
  assert(
    response.success && response.data.allTags,
    'PUT /api/conversations/:id/tags - Agregar tags',
    `Tags: ${response.data.allTags?.join(', ')}`
  );

  // Test 5: Cambiar prioridad
  response = await makeRequest(
    'PUT',
    `/api/conversations/${testConversationId}/priority`,
    { priority: 'HIGH' },
    authToken
  );
  
  assert(
    response.success,
    'PUT /api/conversations/:id/priority - Cambiar prioridad'
  );

  // Test 6: Obtener métricas
  response = await makeRequest(
    'GET',
    `/api/conversations/${testConversationId}/metrics`,
    null,
    authToken
  );
  
  assert(
    response.success && response.data.metrics,
    'GET /api/conversations/:id/metrics - Obtener métricas',
    `Total messages: ${response.data.metrics?.totalMessages}`
  );

  // Test 7: Resumen de conversaciones
  response = await makeRequest('GET', '/api/conversations/summary', null, authToken);
  assert(
    response.success && response.data.summary,
    'GET /api/conversations/summary - Resumen dashboard',
    `Total: ${response.data.summary?.total}`
  );

  // Test 8: Operaciones en lote
  response = await makeRequest(
    'POST',
    '/api/conversations/bulk',
    {
      operations: [
        {
          type: 'change_priority',
          conversationIds: [testConversationId],
          data: { priority: 'URGENT' }
        }
      ]
    },
    authToken
  );
  
  assert(
    response.success,
    'POST /api/conversations/bulk - Operaciones en lote',
    `Processed: ${response.data.processed}`
  );

  return testsPassed;
}

// ============================================================================
// TESTS: METRICS SERVICE
// ============================================================================

async function testMetricsService() {
  log('\n📊 TESTING: Metrics Service', 'test');

  // Test 1: Dashboard metrics
  const metricsService = require('./services/conversationMetricsService');
  
  const dashboardMetrics = await metricsService.getDashboardMetrics(testUser.id, '30d');
  assert(
    dashboardMetrics.success,
    'Dashboard metrics calculation',
    `Conversations: ${dashboardMetrics.current?.totalConversations || 0}`
  );

  // Test 2: Real-time metrics
  const realtimeMetrics = await metricsService.getRealTimeMetrics(testUser.id);
  assert(
    realtimeMetrics.success,
    'Real-time metrics (last 24h)',
    `Active now: ${realtimeMetrics.activeNow || 0}`
  );

  // Test 3: Agent performance metrics
  const agentMetrics = await metricsService.getAgentPerformanceMetrics(
    testUser.id,
    metricsService.getDateRange('30d')
  );
  
  assert(
    Array.isArray(agentMetrics),
    'Agent performance metrics',
    `Agents tracked: ${agentMetrics.length}`
  );

  return testsPassed;
}

// ============================================================================
// TESTS: WEBHOOK ROUTING
// ============================================================================

async function testWebhookRouting() {
  log('\n🔗 TESTING: Webhook Routing', 'test');

  // Crear número WhatsApp para el usuario
  const whatsappNumber = await prisma.userWhatsAppNumber.create({
    data: {
      userId: testUser.id,
      phoneNumber: '+573009999999',
      displayName: 'Test Business',
      isActive: true,
      defaultAgentId: testAgentId
    }
  });

  // Test 1: Webhook de User CRM (simulado)
  const webhookPayload = {
    From: 'whatsapp:+573001234567',
    To: `whatsapp:${whatsappNumber.phoneNumber}`,
    Body: 'Hola, necesito información',
    MessageSid: `test_${Date.now()}`,
    AccountSid: 'test_account'
  };

  const response = await fetch(`${BASE_URL}/api/webhooks/user-crm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(webhookPayload).toString()
  });

  assert(
    response.status === 200,
    'Webhook User CRM responde correctamente',
    `Status: ${response.status}`
  );

  // Limpiar
  await prisma.userWhatsAppNumber.delete({
    where: { id: whatsappNumber.id }
  });

  return testsPassed;
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  log('\n' + '='.repeat(70), 'info');
  log('🚀 INICIANDO TEST SUITE: SafeNotify CRM System', 'info');
  log('='.repeat(70) + '\n', 'info');

  const startTime = Date.now();

  try {
    // Setup
    const setupSuccess = await setupTestUser();
    if (!setupSuccess) {
      log('❌ Setup failed, aborting tests', 'error');
      process.exit(1);
    }

    // Run test suites
    await testAgentManagement();
    await testConversationManagement();
    await testMetricsService();
    await testWebhookRouting();

    // Results
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('\n' + '='.repeat(70), 'info');
    log('📊 RESULTADOS FINALES', 'info');
    log('='.repeat(70), 'info');
    
    log(`✅ Tests pasados: ${testsPassed}`, 'success');
    log(`❌ Tests fallidos: ${testsFailed}`, testsFailed > 0 ? 'error' : 'success');
    log(`⏱️ Duración: ${duration}s`, 'info');
    
    const successRate = ((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1);
    log(`📈 Tasa de éxito: ${successRate}%`, successRate >= 80 ? 'success' : 'warning');

    // Cleanup
    await cleanup();

    // Exit code
    process.exit(testsFailed > 0 ? 1 : 0);

  } catch (error) {
    log(`\n💥 ERROR FATAL: ${error.message}`, 'error');
    console.error(error);
    await cleanup();
    process.exit(1);
  }
}

// ============================================================================
// VERIFICAR SERVIDOR
// ============================================================================

async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (!response.ok) {
      throw new Error('Server not responding');
    }
    return true;
  } catch (error) {
    log('❌ ERROR: Servidor no está corriendo en http://localhost:3001', 'error');
    log('   Ejecuta primero: npm run dev', 'warning');
    return false;
  }
}

// ============================================================================
// EJECUTAR
// ============================================================================

(async () => {
  const serverUp = await checkServer();
  if (!serverUp) {
    process.exit(1);
  }
  
  await runAllTests();
})();