/**
 * 🚀 PHASE 5.1: Human Takeover API Routes
 * REST API for managing AI-to-Human conversation handoffs
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const humanTakeoverService = require('../services/crm/humanTakeoverService');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/takeover/:conversationId/start
 * Initiate human takeover of conversation
 */
router.post('/:conversationId/start', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { reason, customerMessage } = req.body;
    const userId = req.user.id;

    console.log(`🙋‍♂️ Starting takeover for conversation: ${conversationId}`);

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Takeover reason is required'
      });
    }

    const result = await humanTakeoverService.initiateHumanTakeover(
      conversationId, 
      userId, 
      reason, 
      customerMessage
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          conversation: result.conversation,
          takeoverLog: result.takeoverLog,
          message: result.message
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error starting takeover:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/takeover/:conversationId/end
 * End human takeover and return to AI
 */
router.post('/:conversationId/end', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { returnToMode = 'ai_only' } = req.body;
    const userId = req.user.id;

    console.log(`🤖 Ending takeover for conversation: ${conversationId}`);

    const result = await humanTakeoverService.endHumanTakeover(
      conversationId, 
      userId, 
      returnToMode
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          conversation: result.conversation,
          message: result.message
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error ending takeover:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/takeover/:conversationId/request
 * Request human takeover (from customer or system)
 */
router.post('/:conversationId/request', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { reason, requestedBy = 'user' } = req.body;

    console.log(`📞 Takeover requested for conversation: ${conversationId}`);

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Request reason is required'
      });
    }

    const result = await humanTakeoverService.requestHumanTakeover(
      conversationId, 
      reason, 
      requestedBy
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          conversation: result.conversation,
          message: result.message
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error requesting takeover:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/takeover/:conversationId/suggestions
 * Generate AI suggestions for human agent
 */
router.post('/:conversationId/suggestions', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { currentMessage } = req.body;
    const userId = req.user.id;

    console.log(`🧠 Generating AI suggestions for conversation: ${conversationId}`);

    if (!currentMessage) {
      return res.status(400).json({
        success: false,
        error: 'Current message is required for context'
      });
    }

    const result = await humanTakeoverService.generateAISuggestions(
      conversationId, 
      currentMessage, 
      userId
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          suggestions: result.suggestions,
          context: result.conversationContext
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error generating suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/takeover/:conversationId/status
 * Get current takeover status and history
 */
router.get('/:conversationId/status', async (req, res) => {
  try {
    const { conversationId } = req.params;

    console.log(`📊 Getting takeover status for conversation: ${conversationId}`);

    const result = await humanTakeoverService.getTakeoverStatus(conversationId);

    if (result.success) {
      res.json({
        success: true,
        data: {
          status: result.status,
          history: result.history,
          owner: result.owner
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Error getting takeover status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/takeover/dashboard
 * Get takeover dashboard data for user
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    console.log(`📋 Getting takeover dashboard for user: ${userId}`);

    // Get conversations requiring attention
    const conversationsNeedingTakeover = await prisma.cRMConversation.findMany({
      where: {
        userId: userId,
        OR: [
          { takeoverRequested: true },
          { escalationLevel: { gte: 1 } }
        ],
        status: 'ACTIVE'
      },
      include: {
        customerLead: { select: { name: true, phone: true, businessType: true } },
        currentAgent: { select: { name: true, role: true } }
      },
      orderBy: { escalationLevel: 'desc' }
    });

    // Get active takeovers
    const activeTakeovers = await prisma.cRMConversation.findMany({
      where: {
        userId: userId,
        humanTakeover: true,
        status: 'ACTIVE'
      },
      include: {
        customerLead: { select: { name: true, phone: true } },
        takeoverLogs: {
          where: { eventType: 'takeover_started' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Get takeover statistics
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      totalTakeovers24h: await prisma.conversationTakeoverLog.count({
        where: {
          userId: userId,
          eventType: 'takeover_started',
          createdAt: { gte: last24h }
        }
      }),
      totalTakeovers7d: await prisma.conversationTakeoverLog.count({
        where: {
          userId: userId,
          eventType: 'takeover_started',
          createdAt: { gte: last7d }
        }
      }),
      pendingRequests: conversationsNeedingTakeover.length,
      activeTakeovers: activeTakeovers.length
    };

    await prisma.$disconnect();

    res.json({
      success: true,
      data: {
        conversationsNeedingTakeover,
        activeTakeovers,
        stats
      }
    });

  } catch (error) {
    console.error('❌ Error getting takeover dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;