/**
 * 🤖 PUBLIC API - AGENTS ENDPOINTS
 * REST API endpoints for third-party integrations - AI Agents management
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { 
  authenticatePublicApi, 
  requireScopes, 
  rateLimitPublicApi,
  handlePublicApiError 
} = require('../../middleware/publicApiAuth');

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication and rate limiting to all routes
router.use(authenticatePublicApi);
router.use(rateLimitPublicApi);

/**
 * GET /v1/agents
 * List all AI agents for the authenticated user
 */
router.get('/', requireScopes(['agents:read']), async (req, res, next) => {
  try {
    const { is_active, role, limit = 20 } = req.query;

    // Build where clause
    const where = {
      userId: req.user.id
    };

    if (is_active !== undefined) {
      where.isActive = is_active === 'true';
    }

    if (role) {
      where.role = role.toLowerCase();
    }

    // Fetch agents
    const agents = await prisma.userAIAgent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit) || 20, 100)
    });

    // Get conversation stats for each agent
    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        // Get basic stats
        const totalConversations = await prisma.cRMConversation.count({
          where: {
            userId: req.user.id,
            currentAgentId: agent.id
          }
        });

        // Get active conversations
        const activeConversations = await prisma.cRMConversation.count({
          where: {
            userId: req.user.id,
            currentAgentId: agent.id,
            status: 'ACTIVE'
          }
        });

        // Calculate average response time (simplified)
        const avgResponseTime = 12.5; // Placeholder - would calculate from message timestamps

        // Calculate satisfaction rating (placeholder)
        const satisfactionRating = 4.2; // Placeholder - would calculate from feedback data

        return {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          role: agent.role,
          is_active: agent.isActive,
          is_default: agent.isDefault,
          personality_prompt: agent.personalityPrompt,
          business_prompt: agent.businessPrompt,
          objectives_prompt: agent.objectivesPrompt,
          model: agent.model || 'gpt-4',
          temperature: agent.temperature || 0.8,
          created_at: agent.createdAt.toISOString(),
          stats: {
            total_conversations: totalConversations,
            active_conversations: activeConversations,
            avg_response_time: avgResponseTime,
            satisfaction_rating: satisfactionRating
          }
        };
      })
    );

    res.json({
      data: agentsWithStats
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/agents/{agent_id}
 * Get a specific AI agent
 */
router.get('/:agentId', requireScopes(['agents:read']), async (req, res, next) => {
  try {
    const { agentId } = req.params;

    const agent = await prisma.userAIAgent.findFirst({
      where: {
        id: agentId,
        userId: req.user.id
      }
    });

    if (!agent) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found or access denied'
        }
      });
    }

    // Get detailed stats
    const totalConversations = await prisma.cRMConversation.count({
      where: {
        userId: req.user.id,
        currentAgentId: agent.id
      }
    });

    const activeConversations = await prisma.cRMConversation.count({
      where: {
        userId: req.user.id,
        currentAgentId: agent.id,
        status: 'ACTIVE'
      }
    });

    // Get recent conversations
    const recentConversations = await prisma.cRMConversation.findMany({
      where: {
        userId: req.user.id,
        currentAgentId: agent.id
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        customerPhone: true,
        status: true,
        priority: true,
        createdAt: true,
        customerLead: {
          select: {
            name: true
          }
        }
      }
    });

    const response = {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      role: agent.role,
      is_active: agent.isActive,
      is_default: agent.isDefault,
      personality_prompt: agent.personalityPrompt,
      business_prompt: agent.businessPrompt,
      objectives_prompt: agent.objectivesPrompt,
      model: agent.model || 'gpt-4',
      temperature: agent.temperature || 0.8,
      created_at: agent.createdAt.toISOString(),
      updated_at: agent.updatedAt.toISOString(),
      stats: {
        total_conversations: totalConversations,
        active_conversations: activeConversations,
        avg_response_time: 12.5, // Placeholder
        satisfaction_rating: 4.2  // Placeholder
      },
      recent_conversations: recentConversations.map(conv => ({
        id: conv.id,
        customer_phone: conv.customerPhone,
        customer_name: conv.customerLead?.name || null,
        status: conv.status,
        priority: conv.priority,
        created_at: conv.createdAt.toISOString()
      }))
    };

    res.json(response);

  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/agents
 * Create a new AI agent
 */
router.post('/', requireScopes(['agents:write']), async (req, res, next) => {
  try {
    const {
      name,
      description,
      role,
      personality_prompt,
      business_prompt,
      objectives_prompt,
      is_active = true,
      model = 'gpt-4',
      temperature = 0.8
    } = req.body;

    // Validation
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'MISSING_REQUIRED_FIELD',
          message: 'The field "name" is required and must be a string'
        }
      });
    }

    if (!role || !['assistant', 'sales', 'support', 'custom'].includes(role.toLowerCase())) {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'INVALID_ROLE',
          message: 'Role must be one of: assistant, sales, support, custom'
        }
      });
    }

    if (!personality_prompt || typeof personality_prompt !== 'string') {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'MISSING_REQUIRED_FIELD',
          message: 'The field "personality_prompt" is required and must be a string'
        }
      });
    }

    if (!business_prompt || typeof business_prompt !== 'string') {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'MISSING_REQUIRED_FIELD',
          message: 'The field "business_prompt" is required and must be a string'
        }
      });
    }

    if (!objectives_prompt || typeof objectives_prompt !== 'string') {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'MISSING_REQUIRED_FIELD',
          message: 'The field "objectives_prompt" is required and must be a string'
        }
      });
    }

    // Check agent limits based on user plan
    const currentAgentCount = await prisma.userAIAgent.count({
      where: {
        userId: req.user.id,
        isActive: true
      }
    });

    const planLimits = {
      'basic': 2,
      'pro': 5,
      'enterprise': 20
    };

    const maxAgents = planLimits[req.user.crmPlan] || planLimits.basic;

    if (currentAgentCount >= maxAgents) {
      return res.status(409).json({
        error: {
          type: 'quota_exceeded_error',
          code: 'AGENT_LIMIT_EXCEEDED',
          message: `Your ${req.user.crmPlan} plan allows maximum ${maxAgents} agents. You currently have ${currentAgentCount} agents.`
        }
      });
    }

    // Create the agent
    const agent = await prisma.userAIAgent.create({
      data: {
        userId: req.user.id,
        name: name.trim(),
        description: description ? description.trim() : `${role.charAt(0).toUpperCase() + role.slice(1)} assistant`,
        role: role.toLowerCase(),
        personalityPrompt: personality_prompt.trim(),
        businessPrompt: business_prompt.trim(),
        objectivesPrompt: objectives_prompt.trim(),
        isActive: Boolean(is_active),
        isDefault: false, // New agents are not default
        model: model || 'gpt-4',
        temperature: parseFloat(temperature) || 0.8
      }
    });

    res.status(201).json({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      role: agent.role,
      is_active: agent.isActive,
      is_default: agent.isDefault,
      personality_prompt: agent.personalityPrompt,
      business_prompt: agent.businessPrompt,
      objectives_prompt: agent.objectivesPrompt,
      model: agent.model,
      temperature: agent.temperature,
      created_at: agent.createdAt.toISOString()
    });

  } catch (error) {
    next(error);
  }
});

/**
 * PUT /v1/agents/{agent_id}
 * Update an existing AI agent
 */
router.put('/:agentId', requireScopes(['agents:write']), async (req, res, next) => {
  try {
    const { agentId } = req.params;
    const {
      name,
      description,
      role,
      personality_prompt,
      business_prompt,
      objectives_prompt,
      is_active,
      model,
      temperature
    } = req.body;

    // Check if agent exists and belongs to user
    const existingAgent = await prisma.userAIAgent.findFirst({
      where: {
        id: agentId,
        userId: req.user.id
      }
    });

    if (!existingAgent) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found or access denied'
        }
      });
    }

    // Prepare update data
    const updateData = { updatedAt: new Date() };

    if (name) updateData.name = name.trim();
    if (description) updateData.description = description.trim();
    if (role && ['assistant', 'sales', 'support', 'custom'].includes(role.toLowerCase())) {
      updateData.role = role.toLowerCase();
    }
    if (personality_prompt) updateData.personalityPrompt = personality_prompt.trim();
    if (business_prompt) updateData.businessPrompt = business_prompt.trim();
    if (objectives_prompt) updateData.objectivesPrompt = objectives_prompt.trim();
    if (is_active !== undefined) updateData.isActive = Boolean(is_active);
    if (model) updateData.model = model;
    if (temperature !== undefined) updateData.temperature = parseFloat(temperature);

    // Update the agent
    const updatedAgent = await prisma.userAIAgent.update({
      where: { id: agentId },
      data: updateData
    });

    res.json({
      id: updatedAgent.id,
      name: updatedAgent.name,
      description: updatedAgent.description,
      role: updatedAgent.role,
      is_active: updatedAgent.isActive,
      is_default: updatedAgent.isDefault,
      personality_prompt: updatedAgent.personalityPrompt,
      business_prompt: updatedAgent.businessPrompt,
      objectives_prompt: updatedAgent.objectivesPrompt,
      model: updatedAgent.model,
      temperature: updatedAgent.temperature,
      created_at: updatedAgent.createdAt.toISOString(),
      updated_at: updatedAgent.updatedAt.toISOString()
    });

  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /v1/agents/{agent_id}
 * Delete an AI agent
 */
router.delete('/:agentId', requireScopes(['agents:write']), async (req, res, next) => {
  try {
    const { agentId } = req.params;

    // Check if agent exists and belongs to user
    const existingAgent = await prisma.userAIAgent.findFirst({
      where: {
        id: agentId,
        userId: req.user.id
      }
    });

    if (!existingAgent) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found or access denied'
        }
      });
    }

    // Check if agent is currently assigned to active conversations
    const activeConversations = await prisma.cRMConversation.count({
      where: {
        userId: req.user.id,
        currentAgentId: agentId,
        status: 'ACTIVE'
      }
    });

    if (activeConversations > 0) {
      return res.status(409).json({
        error: {
          type: 'conflict_error',
          code: 'AGENT_IN_USE',
          message: `Cannot delete agent. Agent is currently assigned to ${activeConversations} active conversation(s). Please reassign or complete these conversations first.`
        }
      });
    }

    // Check if this is the default agent
    if (existingAgent.isDefault) {
      return res.status(409).json({
        error: {
          type: 'conflict_error',
          code: 'CANNOT_DELETE_DEFAULT_AGENT',
          message: 'Cannot delete the default agent. Please set another agent as default first.'
        }
      });
    }

    // Delete the agent
    await prisma.userAIAgent.delete({
      where: { id: agentId }
    });

    res.status(204).send();

  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/agents/{agent_id}/set-default
 * Set an agent as the default agent
 */
router.post('/:agentId/set-default', requireScopes(['agents:write']), async (req, res, next) => {
  try {
    const { agentId } = req.params;

    // Check if agent exists and belongs to user
    const agent = await prisma.userAIAgent.findFirst({
      where: {
        id: agentId,
        userId: req.user.id,
        isActive: true
      }
    });

    if (!agent) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'AGENT_NOT_FOUND',
          message: 'Agent not found, access denied, or agent is not active'
        }
      });
    }

    // Transaction to update default agent
    await prisma.$transaction(async (tx) => {
      // Remove default flag from all user's agents
      await tx.userAIAgent.updateMany({
        where: {
          userId: req.user.id,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });

      // Set the new default agent
      await tx.userAIAgent.update({
        where: { id: agentId },
        data: {
          isDefault: true
        }
      });
    });

    res.json({
      success: true,
      message: `Agent "${agent.name}" has been set as the default agent`
    });

  } catch (error) {
    next(error);
  }
});

// Error handler
router.use(handlePublicApiError);

module.exports = router;