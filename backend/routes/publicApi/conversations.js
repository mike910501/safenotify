/**
 * 💬 PUBLIC API - CONVERSATIONS ENDPOINTS
 * REST API endpoints for third-party integrations - Conversations management
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
 * GET /v1/conversations
 * List conversations with filtering and pagination
 */
router.get('/', requireScopes(['conversations:read']), async (req, res, next) => {
  try {
    const {
      status,
      agent_id,
      customer_phone,
      created_after,
      created_before,
      limit = 20,
      cursor
    } = req.query;

    // Validate limit
    const pageLimit = Math.min(parseInt(limit) || 20, 100);

    // Build where clause
    const where = {
      userId: req.user.id
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (agent_id) {
      where.currentAgentId = agent_id;
    }

    if (customer_phone) {
      where.customerPhone = customer_phone;
    }

    if (created_after || created_before) {
      where.createdAt = {};
      if (created_after) {
        where.createdAt.gte = new Date(created_after);
      }
      if (created_before) {
        where.createdAt.lte = new Date(created_before);
      }
    }

    // Handle cursor pagination
    if (cursor) {
      where.id = { gt: cursor };
    }

    // Fetch conversations
    const conversations = await prisma.cRMConversation.findMany({
      where,
      include: {
        customerLead: {
          select: {
            id: true,
            name: true,
            email: true,
            businessType: true,
            qualificationScore: true
          }
        },
        currentAgent: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: pageLimit + 1 // Take one extra to check if there's a next page
    });

    // Determine if there's a next page
    const hasNext = conversations.length > pageLimit;
    const data = hasNext ? conversations.slice(0, -1) : conversations;

    // Format response
    const formattedConversations = data.map(conv => ({
      id: conv.id,
      customer_phone: conv.customerPhone,
      customer_name: conv.customerLead?.name || null,
      status: conv.status,
      priority: conv.priority,
      agent: conv.currentAgent ? {
        id: conv.currentAgent.id,
        name: conv.currentAgent.name,
        role: conv.currentAgent.role
      } : null,
      message_count: conv.messageCount,
      last_message_at: conv.lastMessageAt?.toISOString() || null,
      created_at: conv.createdAt.toISOString(),
      tags: conv.tags || []
    }));

    res.json({
      data: formattedConversations,
      pagination: {
        has_next: hasNext,
        next_cursor: hasNext ? data[data.length - 1].id : null,
        total: formattedConversations.length
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/conversations/{conversation_id}
 * Get a specific conversation with messages
 */
router.get('/:conversationId', requireScopes(['conversations:read']), async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const conversation = await prisma.cRMConversation.findFirst({
      where: {
        id: conversationId,
        userId: req.user.id
      },
      include: {
        customerLead: {
          select: {
            id: true,
            name: true,
            email: true,
            businessType: true,
            qualificationScore: true,
            companyName: true
          }
        },
        currentAgent: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found or access denied'
        }
      });
    }

    // Format messages
    const messages = (conversation.messages || []).map(msg => ({
      id: msg.id || `msg_${Date.now()}_${Math.random()}`,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      metadata: msg.metadata || {}
    }));

    const response = {
      id: conversation.id,
      customer_phone: conversation.customerPhone,
      customer_name: conversation.customerLead?.name || null,
      status: conversation.status,
      priority: conversation.priority,
      agent: conversation.userAIAgent ? {
        id: conversation.userAIAgent.id,
        name: conversation.userAIAgent.name,
        role: conversation.userAIAgent.role
      } : null,
      messages: messages,
      lead: conversation.customerLead ? {
        id: conversation.customerLead.id,
        name: conversation.customerLead.name,
        email: conversation.customerLead.email,
        business_type: conversation.customerLead.businessType,
        qualification_score: conversation.customerLead.qualificationScore,
        company_name: conversation.customerLead.companyName
      } : null,
      created_at: conversation.createdAt.toISOString(),
      updated_at: conversation.updatedAt.toISOString()
    };

    res.json(response);

  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/conversations/{conversation_id}/messages
 * Send a message to a conversation
 */
router.post('/:conversationId/messages', requireScopes(['conversations:write']), async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content, role = 'assistant', metadata = {} } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'MISSING_REQUIRED_FIELD',
          message: 'The field "content" is required and must be a string'
        }
      });
    }

    if (!['user', 'assistant'].includes(role)) {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'INVALID_ROLE',
          message: 'Role must be either "user" or "assistant"'
        }
      });
    }

    // Check if conversation exists and belongs to user
    const conversation = await prisma.cRMConversation.findFirst({
      where: {
        id: conversationId,
        userId: req.user.id
      }
    });

    if (!conversation) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found or access denied'
        }
      });
    }

    // Create new message
    const newMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      role: role,
      content: content,
      timestamp: new Date().toISOString(),
      metadata: {
        ...metadata,
        api_source: true,
        auth_type: req.authType
      }
    };

    // Update conversation with new message
    const updatedConversation = await prisma.cRMConversation.update({
      where: { id: conversationId },
      data: {
        messages: {
          push: newMessage
        },
        messageCount: {
          increment: 1
        },
        lastMessageAt: new Date(),
        updatedAt: new Date()
      }
    });

    res.status(201).json({
      id: newMessage.id,
      conversation_id: conversationId,
      role: newMessage.role,
      content: newMessage.content,
      timestamp: newMessage.timestamp,
      metadata: newMessage.metadata
    });

  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /v1/conversations/{conversation_id}
 * Update conversation status, priority, or assign agent
 */
router.patch('/:conversationId', requireScopes(['conversations:write']), async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { status, priority, agent_id, tags } = req.body;

    // Check if conversation exists and belongs to user
    const conversation = await prisma.cRMConversation.findFirst({
      where: {
        id: conversationId,
        userId: req.user.id
      }
    });

    if (!conversation) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'CONVERSATION_NOT_FOUND',
          message: 'Conversation not found or access denied'
        }
      });
    }

    // Prepare update data
    const updateData = { updatedAt: new Date() };

    if (status && ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'].includes(status.toUpperCase())) {
      updateData.status = status.toUpperCase();
    }

    if (priority && ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority.toUpperCase())) {
      updateData.priority = priority.toUpperCase();
    }

    if (agent_id) {
      // Verify agent belongs to user
      const agent = await prisma.userAIAgent.findFirst({
        where: {
          id: agent_id,
          userId: req.user.id,
          isActive: true
        }
      });

      if (!agent) {
        return res.status(400).json({
          error: {
            type: 'validation_error',
            code: 'INVALID_AGENT_ID',
            message: 'Agent not found or access denied'
          }
        });
      }

      updateData.currentAgentId = agent_id;
    }

    if (tags && Array.isArray(tags)) {
      updateData.tags = tags;
    }

    // Update conversation
    const updatedConversation = await prisma.cRMConversation.update({
      where: { id: conversationId },
      data: updateData,
      include: {
        customerLead: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        currentAgent: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    res.json({
      id: updatedConversation.id,
      customer_phone: updatedConversation.customerPhone,
      customer_name: updatedConversation.customerLead?.name || null,
      status: updatedConversation.status,
      priority: updatedConversation.priority,
      agent: updatedConversation.userAIAgent ? {
        id: updatedConversation.userAIAgent.id,
        name: updatedConversation.userAIAgent.name,
        role: updatedConversation.userAIAgent.role
      } : null,
      tags: updatedConversation.tags || [],
      updated_at: updatedConversation.updatedAt.toISOString()
    });

  } catch (error) {
    next(error);
  }
});

// Error handler
router.use(handlePublicApiError);

module.exports = router;