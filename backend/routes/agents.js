/**
 * 🤖 API ENDPOINTS - GESTIÓN DE AGENTES IA USER-CENTRIC
 * Cada User gestiona SUS propios agentes IA para SU negocio
 * Compatible con sistema Sofia y prompts dinámicos existente
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const sofiaAIService = require('../services/sofiaAIService');
const openaiService = require('../services/openaiService');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// LÍMITES DE AGENTES POR PLAN CRM (User-centric)
// ============================================================================

const AGENT_LIMITS = {
  'free': 0,        // Sin CRM (solo pueden usar SafeNotify campaigning)
  'basic': 1,       // 1 agente default
  'pro': 3,         // 3 agentes personalizados
  'enterprise': -1  // Ilimitados
};

// ============================================================================
// MIDDLEWARE DE VALIDACIÓN DE PLAN
// ============================================================================

async function validateAgentLimit(req, res, next) {
  try {
    const user = req.user;
    
    // Verificar que el User tenga CRM habilitado
    if (!user.crmEnabled) {
      return res.status(403).json({
        success: false,
        error: 'CRM no habilitado. Contacta al administrador para activar el CRM.',
        planType: user.planType
      });
    }
    
    const limit = user.maxAgents || AGENT_LIMITS[user.crmPlan] || 0;
    
    if (limit === -1) {
      // Plan enterprise - sin límites
      return next();
    }

    if (limit === 0) {
      return res.status(403).json({
        success: false,
        error: `Tu plan ${user.crmPlan} no incluye agentes IA personalizados.`,
        currentAgents: 0,
        limit: 0,
        planType: user.crmPlan
      });
    }

    // Contar agentes actuales del usuario
    const currentAgents = await prisma.userAIAgent.count({
      where: {
        userId: user.id, // User-centric: cada User gestiona SUS agentes
        isActive: true
      }
    });

    if (currentAgents >= limit) {
      return res.status(403).json({
        success: false,
        error: `Tu plan ${user.crmPlan} permite máximo ${limit} agente(s). Actualiza tu plan para crear más.`,
        currentAgents,
        limit,
        planType: user.crmPlan
      });
    }

    req.agentLimit = limit;
    req.currentAgentCount = currentAgents;
    next();

  } catch (error) {
    console.error('❌ Error validating agent limit:', error);
    res.status(500).json({
      success: false,
      error: 'Error validando límites de agentes'
    });
  }
}

// ============================================================================
// 1. GET /api/agents - LISTAR AGENTES DEL USUARIO
// ============================================================================

router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Listing AI agents for user:', req.user.id);

    // Verificar que el User tenga CRM habilitado
    if (!req.user.crmEnabled) {
      return res.json({
        success: true,
        agents: [],
        total: 0,
        message: 'CRM no habilitado para este usuario',
        limits: {
          planType: req.user.planType,
          crmPlan: req.user.crmPlan,
          crmEnabled: false,
          maxAgents: 0,
          currentCount: 0
        }
      });
    }

    // Obtener agentes del usuario
    const agents = await prisma.userAIAgent.findMany({
      where: {
        userId: req.user.id, // User-centric: SUS agentes
        isActive: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        role: true,
        isActive: true,
        isDefault: true,
        model: true,
        temperature: true,
        maxTokensPerMessage: true,
        businessRules: true,
        triggerKeywords: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { isDefault: 'desc' }, // Default primero
        { createdAt: 'asc' }
      ]
    });

    // Si no hay agentes, el User necesita configurar su CRM
    if (agents.length === 0) {
      return res.json({
        success: true,
        agents: [],
        total: 0,
        message: 'No tienes agentes IA configurados. Crea tu primer agente para empezar.',
        limits: {
          planType: req.user.planType,
          crmPlan: req.user.crmPlan,
          crmEnabled: req.user.crmEnabled,
          maxAgents: req.user.maxAgents,
          currentCount: 0
        }
      });
    }

    res.json({
      success: true,
      agents,
      total: agents.length,
      limits: {
        planType: req.user.planType,
        crmPlan: req.user.crmPlan,
        crmEnabled: req.user.crmEnabled,
        maxAgents: req.user.maxAgents,
        currentCount: agents.length
      }
    });

  } catch (error) {
    console.error('❌ Error listing agents:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo agentes'
    });
  }
});

// ============================================================================
// 2. POST /api/agents - CREAR NUEVO AGENTE
// ============================================================================

router.post('/', authenticateToken, validateAgentLimit, async (req, res) => {
  try {
    const {
      name,
      description,
      role,
      personalityPrompt,
      businessPrompt,
      objectivesPrompt,
      businessRules,
      triggerKeywords,
      model,
      temperature,
      maxTokensPerMessage,
      responseStyle,
      activeHours,
      weekdaysOnly
    } = req.body;

    console.log('🤖 Creating new AI agent:', name, 'for user:', req.user.id);

    // Validaciones básicas
    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Nombre del agente es requerido (mínimo 2 caracteres)'
      });
    }

    if (!personalityPrompt || !businessPrompt || !objectivesPrompt) {
      return res.status(400).json({
        success: false,
        error: 'Los prompts de personalidad, negocio y objetivos son requeridos'
      });
    }

    // Verificar nombre único para este User
    const existingAgent = await prisma.userAIAgent.findFirst({
      where: {
        userId: req.user.id,
        name: name.trim(),
        isActive: true
      }
    });

    if (existingAgent) {
      return res.status(400).json({
        success: false,
        error: 'Ya tienes un agente con ese nombre'
      });
    }

    // Verificar si es el primer agente (será default)
    const agentCount = await prisma.userAIAgent.count({
      where: {
        userId: req.user.id,
        isActive: true
      }
    });

    const isFirstAgent = agentCount === 0;

    // Crear agente
    const newAgent = await prisma.userAIAgent.create({
      data: {
        userId: req.user.id, // User-centric
        name: name.trim(),
        description: description || `Agente ${role || 'assistant'} personalizado`,
        role: role || 'assistant',
        isActive: true,
        isDefault: isFirstAgent, // Primer agente es default automáticamente
        
        // Prompts personalizados del User
        personalityPrompt: personalityPrompt.trim(),
        businessPrompt: businessPrompt.trim(),
        objectivesPrompt: objectivesPrompt.trim(),
        
        // Configuración IA
        model: model || (req.user.crmPlan === 'enterprise' ? 'gpt-4' : 'gpt-3.5-turbo'),
        temperature: temperature || 0.7,
        maxTokensPerMessage: maxTokensPerMessage || 500,
        responseStyle: responseStyle || {},
        
        // Reglas específicas del User
        businessRules: businessRules || {},
        triggerKeywords: triggerKeywords || [],
        
        // Configuración horaria
        activeHours: activeHours || null,
        weekdaysOnly: weekdaysOnly || false
      }
    });

    // Crear prompt inicial para este agente
    const systemPrompt = `${personalityPrompt}\n\nCONTEXTO DEL NEGOCIO:\n${businessPrompt}\n\nOBJETIVOS:\n${objectivesPrompt}`;
    
    await prisma.userAgentPrompt.create({
      data: {
        agentId: newAgent.id,
        systemPrompt: systemPrompt,
        contextSummary: 'Prompt inicial del agente creado por el usuario',
        businessContext: {
          userPlan: req.user.crmPlan,
          agentRole: role || 'assistant',
          isFirstAgent: isFirstAgent
        },
        version: 1,
        triggerReason: 'initial',
        isActive: true
      }
    });

    console.log('✅ AI Agent created successfully:', newAgent.id);

    res.status(201).json({
      success: true,
      agent: newAgent,
      message: `Agente "${name}" creado exitosamente${isFirstAgent ? ' (configurado como agente predeterminado)' : ''}`
    });

  } catch (error) {
    console.error('❌ Error creating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Error creando agente'
    });
  }
});

// ============================================================================
// 3. PUT /api/agents/:id - ACTUALIZAR AGENTE
// ============================================================================

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      role,
      personalityPrompt,
      businessPrompt,
      objectivesPrompt,
      businessRules,
      triggerKeywords,
      model,
      temperature,
      maxTokensPerMessage,
      responseStyle,
      activeHours,
      weekdaysOnly
    } = req.body;

    console.log('🔧 Updating AI agent:', id, 'for user:', req.user.id);

    // Obtener agente existente (verificar ownership)
    const existingAgent = await prisma.userAIAgent.findFirst({
      where: {
        id,
        userId: req.user.id, // User-centric: solo SUS agentes
        isActive: true
      }
    });

    if (!existingAgent) {
      return res.status(404).json({
        success: false,
        error: 'Agente no encontrado o no tienes permisos para modificarlo'
      });
    }

    // Validar nombre único si se está cambiando
    if (name && name !== existingAgent.name) {
      const nameExists = await prisma.userAIAgent.findFirst({
        where: {
          userId: req.user.id,
          name: name.trim(),
          isActive: true,
          NOT: { id }
        }
      });

      if (nameExists) {
        return res.status(400).json({
          success: false,
          error: 'Ya tienes un agente con ese nombre'
        });
      }
    }

    // Preparar datos de actualización
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description) updateData.description = description;
    if (role) updateData.role = role;
    if (personalityPrompt) updateData.personalityPrompt = personalityPrompt.trim();
    if (businessPrompt) updateData.businessPrompt = businessPrompt.trim();
    if (objectivesPrompt) updateData.objectivesPrompt = objectivesPrompt.trim();
    if (businessRules) updateData.businessRules = businessRules;
    if (triggerKeywords) updateData.triggerKeywords = triggerKeywords;
    if (model) updateData.model = model;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (maxTokensPerMessage) updateData.maxTokensPerMessage = maxTokensPerMessage;
    if (responseStyle) updateData.responseStyle = responseStyle;
    if (activeHours !== undefined) updateData.activeHours = activeHours;
    if (weekdaysOnly !== undefined) updateData.weekdaysOnly = weekdaysOnly;

    // Regenerar system prompt si cambió alguno de los prompts
    let shouldRegeneratePrompt = false;
    let newSystemPrompt = '';
    
    if (personalityPrompt || businessPrompt || objectivesPrompt) {
      shouldRegeneratePrompt = true;
      
      const newPersonality = personalityPrompt || existingAgent.personalityPrompt;
      const newBusiness = businessPrompt || existingAgent.businessPrompt;
      const newObjectives = objectivesPrompt || existingAgent.objectivesPrompt;
      
      newSystemPrompt = `${newPersonality}\n\nCONTEXTO DEL NEGOCIO:\n${newBusiness}\n\nOBJETIVOS:\n${newObjectives}`;
    }

    // Actualizar agente
    const updatedAgent = await prisma.userAIAgent.update({
      where: { id },
      data: updateData
    });

    // Si cambió el prompt, crear nueva versión
    if (shouldRegeneratePrompt) {
      // Desactivar prompt anterior
      await prisma.userAgentPrompt.updateMany({
        where: { 
          agentId: id,
          isActive: true 
        },
        data: { isActive: false }
      });

      // Crear nueva versión del prompt
      const latestPrompt = await prisma.userAgentPrompt.findFirst({
        where: { agentId: id },
        orderBy: { version: 'desc' }
      });

      const nextVersion = (latestPrompt?.version || 0) + 1;

      await prisma.userAgentPrompt.create({
        data: {
          agentId: id,
          systemPrompt: newSystemPrompt,
          contextSummary: 'Prompt actualizado por el usuario',
          businessContext: {
            userPlan: req.user.crmPlan,
            updateReason: 'manual_update',
            updatedFields: Object.keys(updateData)
          },
          version: nextVersion,
          triggerReason: 'manual_update',
          isActive: true
        }
      });

      console.log('📝 System prompt updated to version:', nextVersion);
    }

    // TODO: Actualizar conversaciones activas con el nuevo prompt
    // await updateActiveConversationPrompts(id);

    console.log('✅ AI Agent updated successfully:', id);

    res.json({
      success: true,
      agent: updatedAgent,
      message: 'Agente actualizado exitosamente',
      promptUpdated: shouldRegeneratePrompt
    });

  } catch (error) {
    console.error('❌ Error updating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Error actualizando agente'
    });
  }
});

// ============================================================================
// 4. DELETE /api/agents/:id - ELIMINAR AGENTE (SOFT DELETE)
// ============================================================================

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Soft deleting AI agent:', id, 'for user:', req.user.id);

    // Obtener agente (verificar ownership)
    const agent = await prisma.userAIAgent.findFirst({
      where: {
        id,
        userId: req.user.id, // User-centric: solo SUS agentes
        isActive: true
      }
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente no encontrado o no tienes permisos para eliminarlo'
      });
    }

    // NO permitir eliminar el agente default si es el único
    if (agent.isDefault) {
      const activeAgentCount = await prisma.userAIAgent.count({
        where: {
          userId: req.user.id,
          isActive: true
        }
      });

      if (activeAgentCount <= 1) {
        return res.status(403).json({
          success: false,
          error: 'No puedes eliminar tu único agente activo. Crea otro agente antes de eliminar este.'
        });
      }
    }

    // Soft delete del agente
    await prisma.userAIAgent.update({
      where: { id },
      data: { isActive: false }
    });

    // Si era el agente default, asignar otro como default
    if (agent.isDefault) {
      const nextAgent = await prisma.userAIAgent.findFirst({
        where: {
          userId: req.user.id,
          isActive: true,
          NOT: { id }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (nextAgent) {
        await prisma.userAIAgent.update({
          where: { id: nextAgent.id },
          data: { isDefault: true }
        });
        
        console.log('📋 New default agent assigned:', nextAgent.name);
      }
    }

    // Reasignar conversaciones activas al agente default
    const defaultAgent = await prisma.userAIAgent.findFirst({
      where: {
        userId: req.user.id,
        isDefault: true,
        isActive: true
      }
    });

    if (defaultAgent) {
      const updatedConversations = await prisma.crmConversation.updateMany({
        where: {
          userId: req.user.id,
          currentAgentId: id,
          status: 'ACTIVE'
        },
        data: {
          currentAgentId: defaultAgent.id,
          agentName: defaultAgent.name
        }
      });

      console.log('🔄 Conversaciones reasignadas:', updatedConversations.count);
    }

    console.log('✅ AI Agent soft deleted successfully:', id);

    res.json({
      success: true,
      message: `Agente "${agent.name}" eliminado exitosamente.${defaultAgent ? ` Las conversaciones activas se reasignaron a "${defaultAgent.name}".` : ''}`
    });

  } catch (error) {
    console.error('❌ Error deleting agent:', error);
    res.status(500).json({
      success: false,
      error: 'Error eliminando agente'
    });
  }
});

// ============================================================================
// 5. GET /api/agents/:id/test - PROBAR AGENTE
// ============================================================================

router.get('/:id/test', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.query;

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Mensaje de prueba es requerido'
      });
    }

    console.log('🧪 Testing AI agent:', id, 'with message:', message.substring(0, 50) + '...');

    // Obtener agente
    const agent = await prisma.userAIAgent.findFirst({
      where: {
        id,
        userId: req.user.id,
        isActive: true
      }
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agente no encontrado'
      });
    }

    // Simular contexto de conversación
    const testContext = {
      phone: 'test_mode',
      leadId: 'test',
      conversationId: 'test',
      qualificationScore: 0,
      agentId: id
    };

    const conversationHistory = [
      { role: 'user', content: message }
    ];

    // Obtener prompt activo del agente
    const activePrompt = await prisma.userAgentPrompt.findFirst({
      where: {
        agentId: id,
        isActive: true
      },
      orderBy: { version: 'desc' }
    });

    const systemPrompt = activePrompt ? activePrompt.systemPrompt : `${agent.personalityPrompt}\n\n${agent.businessPrompt}\n\n${agent.objectivesPrompt}`;

    // Usar openaiService con custom prompt
    const response = await openaiService.generateNaturalResponseWithCustomPrompt(
      conversationHistory,
      systemPrompt,
      testContext,
      'test'
    );

    if (!response.success) {
      return res.status(500).json({
        success: false,
        error: 'Error generando respuesta de prueba',
        details: response.error
      });
    }

    res.json({
      success: true,
      testMessage: message,
      agentResponse: response.message,
      agent: {
        id: agent.id,
        name: agent.name,
        model: agent.model
      },
      metadata: {
        tokensUsed: response.tokens_used,
        modelUsed: response.model_used,
        testMode: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error testing agent:', error);
    res.status(500).json({
      success: false,
      error: 'Error probando agente'
    });
  }
});

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * NOTA: Sofia es parte del sistema SafeNotify, no del User CRM
 * Los Users crean sus propios agentes personalizados
 */

/**
 * Función auxiliar para obtener límites del User
 */
function getUserAgentLimits(userPlan) {
  const limits = {
    free: { maxAgents: 1, maxWhatsAppNumbers: 0 },
    basic: { maxAgents: 1, maxWhatsAppNumbers: 1 },
    pro: { maxAgents: 3, maxWhatsAppNumbers: 2 },
    enterprise: { maxAgents: -1, maxWhatsAppNumbers: 5 }
  };
  
  return limits[userPlan] || limits.basic;
}

module.exports = router;