/**
 * 🧪 TESTS: AI Agents CRM API Endpoints
 * Tests completos para validar funcionalidad multi-agente
 */

const request = require('supertest');
const app = require('../simple-server'); // Asumir que server exporta app
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

describe('🚀 AI Agents CRM API', () => {
  let authToken;
  let testUserId;
  let testAgentId;

  beforeAll(async () => {
    // Crear usuario de prueba
    const testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        planType: 'pro'
      }
    });
    testUserId = testUser.id;

    // Generar token de autenticación
    authToken = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.userAgentPrompt.deleteMany({
      where: { agent: { userId: testUserId } }
    });
    await prisma.userAIAgent.deleteMany({
      where: { userId: testUserId }
    });
    await prisma.user.delete({
      where: { id: testUserId }
    });
    await prisma.$disconnect();
  });

  describe('GET /api/agents', () => {
    test('📋 Debería listar agentes del usuario autenticado', async () => {
      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agents).toBeDefined();
      expect(Array.isArray(response.body.agents)).toBe(true);
      expect(response.body.limits).toBeDefined();
      expect(response.body.limits.planType).toBe('pro');
      
      // Sistema User CRM - no incluye Sofia (Sofia es sistema interno SafeNotify)
      // Los Users crean sus propios agentes personalizados
    });

    test('🚫 Debería fallar sin autenticación', async () => {
      await request(app)
        .get('/api/agents')
        .expect(401);
    });
  });

  describe('POST /api/agents', () => {
    test('🤖 Debería crear nuevo agente válido', async () => {
      const newAgent = {
        name: 'TestAgent',
        description: 'Agente de prueba',
        personality: {
          name: 'TestAgent',
          specialization: 'Customer Support',
          tone: 'professional',
          expertise: ['support', 'troubleshooting']
        },
        businessRules: {
          canScheduleDemo: false,
          workingHours: '9-17'
        },
        triggerConditions: {
          keywords: ['support', 'help']
        },
        model: 'gpt-3.5-turbo',
        temperature: 0.8,
        maxTokens: 300
      };

      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newAgent)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.agent).toBeDefined();
      expect(response.body.agent.name).toBe('TestAgent');
      
      testAgentId = response.body.agent.id;
    });

    test('❌ Debería fallar con datos inválidos', async () => {
      const invalidAgent = {
        name: '', // Nombre vacío
        personality: {} // Sin especialización
      };

      await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAgent)
        .expect(400);
    });

    test('🚫 Debería fallar al intentar crear "Sofia"', async () => {
      const sofiaAgent = {
        name: 'Sofia',
        personality: {
          specialization: 'Sales'
        }
      };

      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sofiaAgent)
        .expect(400);

      expect(response.body.error).toContain('Sofia');
    });

    test('📈 Debería respetar límites del plan', async () => {
      // Cambiar usuario a plan 'free' (solo 1 agente)
      await prisma.user.update({
        where: { id: testUserId },
        data: { planType: 'free' }
      });

      const agent2 = {
        name: 'Agent2',
        personality: {
          specialization: 'Sales'
        }
      };

      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', `Bearer ${authToken}`)
        .send(agent2)
        .expect(403);

      expect(response.body.error).toContain('plan free');
      
      // Restaurar plan pro
      await prisma.user.update({
        where: { id: testUserId },
        data: { planType: 'pro' }
      });
    });
  });

  describe('PUT /api/agents/:id', () => {
    test('🔧 Debería actualizar agente existente', async () => {
      const updates = {
        description: 'Agente actualizado',
        personality: {
          name: 'TestAgent',
          specialization: 'Advanced Support',
          tone: 'friendly'
        },
        temperature: 0.9
      };

      const response = await request(app)
        .put(`/api/agents/${testAgentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.agent.description).toBe('Agente actualizado');
      expect(response.body.agent.temperature).toBe(0.9);
    });

    test('🚫 Debería fallar al actualizar Sofia', async () => {
      // Obtener ID de Sofia
      const agents = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${authToken}`);
      
      const sofiaAgent = agents.body.agents.find(a => a.name === 'Sofia');
      
      const response = await request(app)
        .put(`/api/agents/${sofiaAgent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'NewSofia' })
        .expect(403);

      expect(response.body.error).toContain('Sofia');
    });

    test('❌ Debería fallar con agente inexistente', async () => {
      await request(app)
        .put('/api/agents/nonexistent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('GET /api/agents/:id/test', () => {
    test('🧪 Debería probar agente con mensaje', async () => {
      const testMessage = 'Hello, I need help with my account';
      
      const response = await request(app)
        .get(`/api/agents/${testAgentId}/test`)
        .query({ message: testMessage })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.testMessage).toBe(testMessage);
      expect(response.body.agentResponse).toBeDefined();
      expect(response.body.metadata.testMode).toBe(true);
    });

    test('❌ Debería fallar sin mensaje', async () => {
      await request(app)
        .get(`/api/agents/${testAgentId}/test`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('DELETE /api/agents/:id', () => {
    test('🚫 Debería fallar al eliminar Sofia', async () => {
      const agents = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${authToken}`);
      
      const sofiaAgent = agents.body.agents.find(a => a.name === 'Sofia');
      
      const response = await request(app)
        .delete(`/api/agents/${sofiaAgent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.error).toContain('Sofia');
    });

    test('🗑️ Debería eliminar agente personalizado (soft delete)', async () => {
      const response = await request(app)
        .delete(`/api/agents/${testAgentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('eliminado');

      // Verificar que no aparece en la lista
      const agents = await request(app)
        .get('/api/agents')
        .set('Authorization', `Bearer ${authToken}`);

      const deletedAgent = agents.body.agents.find(a => a.id === testAgentId);
      expect(deletedAgent).toBeUndefined();
    });
  });

  describe('🔐 Seguridad y Autorización', () => {
    test('Debería validar ownership de agentes', async () => {
      // Crear otro usuario
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@example.com',
          password: 'hashedpassword',
          name: 'Other User',
          planType: 'pro'
        }
      });

      // Crear agente para otro usuario
      const otherAgent = await prisma.userAIAgent.create({
        data: {
          name: 'OtherAgent',
          description: 'Agente de otro usuario',
          role: 'assistant',
          personalityPrompt: 'Test personality',
          businessPrompt: 'Test business',
          objectivesPrompt: 'Test objectives',
          userId: otherUser.id,
          isActive: true
        }
      });

      // Intentar acceder con usuario actual
      await request(app)
        .put(`/api/agents/${otherAgent.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Hacked' })
        .expect(404); // No debe encontrarlo

      // Limpiar
      await prisma.userAIAgent.delete({ where: { id: otherAgent.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });
});

// Tests de integración con Sofia AI Service
describe('🤝 Integración con Sofia AI', () => {
  test('Debería usar agente personalizado en processProspectMessage', async () => {
    const sofiaAIService = require('../services/sofiaAIService');
    
    // Mock del agente personalizado
    const mockAgent = {
      id: 'test-agent-id',
      name: 'TestAgent',
      systemPrompt: 'You are a test agent'
    };

    // Simular mensaje con agente específico
    const result = await sofiaAIService.processProspectMessage(
      '+1234567890',
      'Hello test',
      'msg123',
      mockAgent.id
    );

    // Verificar que se procese correctamente
    expect(result).toBeDefined();
    // Note: Este test requiere mocks más complejos para ser completamente funcional
  });
});

module.exports = {
  // Exportar funciones helper para otros tests
  createTestUser: async (planType = 'pro') => {
    return await prisma.user.create({
      data: {
        email: `test-${Date.now()}@example.com`,
        password: 'hashedpassword',
        name: 'Test User',
        planType
      }
    });
  },
  
  createTestAgent: async (userId, name = 'TestAgent') => {
    return await prisma.userAIAgent.create({
      data: {
        name,
        description: 'Test agent',
        role: 'assistant',
        personalityPrompt: 'Test personality prompt',
        businessPrompt: 'Test business prompt',
        objectivesPrompt: 'Test objectives prompt',
        businessRules: {},
        userId,
        isActive: true
      }
    });
  }
};