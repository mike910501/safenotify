const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify admin role
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Admin auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Get conversation summaries for admin dashboard
 * GET /api/admin/conversations
 */
router.get('/conversations', verifyAdmin, async (req, res) => {
  try {
    console.log('📊 Admin fetching conversation summaries...');

    // Get all SafeNotify leads with their conversations
    const leads = await prisma.safeNotifyLead.findMany({
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 1 // Most recent conversation only
        }
      },
      orderBy: { lastActivity: 'desc' }
    });

    // Format data for admin dashboard
    const conversationSummaries = leads.map(lead => {
      const recentConversation = lead.conversations[0];
      const messages = recentConversation?.messages || [];
      
      // Get first user message and last Sofia message
      const firstUserMessage = messages.find(m => m.role === 'user');
      const lastSofiaMessage = messages.slice().reverse().find(m => m.role === 'assistant');
      
      return {
        id: lead.id,
        phone: lead.phone,
        name: lead.name || 'Sin nombre',
        email: lead.email || 'Sin email',
        specialty: lead.specialty || 'No identificada',
        monthlyPatients: lead.monthlyPatients,
        currentSystem: lead.currentSystem,
        qualificationScore: lead.qualificationScore,
        grade: lead.grade,
        status: lead.status,
        conversationState: lead.conversationState,
        lastActivity: lead.lastActivity,
        messageCount: recentConversation?.messageCount || 0,
        firstMessage: firstUserMessage?.content?.substring(0, 100) + '...' || 'Sin mensajes',
        lastResponse: lastSofiaMessage?.content?.substring(0, 100) + '...' || 'Sin respuesta',
        conversationId: recentConversation?.id,
        createdAt: lead.createdAt
      };
    });

    console.log(`✅ Retrieved ${conversationSummaries.length} conversation summaries`);

    res.json({
      success: true,
      conversations: conversationSummaries,
      total: conversationSummaries.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching conversation summaries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
      message: error.message
    });
  }
});

/**
 * Get detailed conversation for admin
 * GET /api/admin/conversations/:conversationId
 */
router.get('/conversations/:conversationId', verifyAdmin, async (req, res) => {
  try {
    const { conversationId } = req.params;

    console.log('📋 Admin fetching detailed conversation:', conversationId);

    const conversation = await prisma.safeNotifyConversation.findUnique({
      where: { id: conversationId },
      include: {
        lead: true
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Format messages for display
    const formattedMessages = (conversation.messages || []).map(message => ({
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
      messageSid: message.messageSid || null
    }));

    res.json({
      success: true,
      conversation: {
        id: conversation.id,
        sessionId: conversation.sessionId,
        messages: formattedMessages,
        messageCount: conversation.messageCount,
        intent: conversation.intent,
        currentStep: conversation.currentStep,
        isActive: conversation.isActive,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        lead: {
          id: conversation.lead.id,
          phone: conversation.lead.phone,
          name: conversation.lead.name,
          email: conversation.lead.email,
          specialty: conversation.lead.specialty,
          monthlyPatients: conversation.lead.monthlyPatients,
          currentSystem: conversation.lead.currentSystem,
          qualificationScore: conversation.lead.qualificationScore,
          grade: conversation.lead.grade,
          status: conversation.lead.status
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching conversation detail:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation detail',
      message: error.message
    });
  }
});

/**
 * Get dashboard statistics
 * GET /api/admin/stats
 */
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    console.log('📈 Admin fetching dashboard stats...');

    const stats = await Promise.all([
      // Total leads
      prisma.safeNotifyLead.count(),
      
      // Active conversations
      prisma.safeNotifyConversation.count({
        where: { isActive: true }
      }),
      
      // High-quality leads (grade A & B)
      prisma.safeNotifyLead.count({
        where: {
          grade: { in: ['A', 'B'] }
        }
      }),
      
      // Demos scheduled
      prisma.safeNotifyDemo.count(),
      
      // Leads by grade
      prisma.safeNotifyLead.groupBy({
        by: ['grade'],
        _count: { grade: true }
      }),
      
      // Recent activity (last 24h)
      prisma.safeNotifyLead.count({
        where: {
          lastActivity: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    const [totalLeads, activeConversations, qualityLeads, scheduledDemos, leadsByGrade, recentActivity] = stats;

    // Format grade distribution
    const gradeDistribution = {
      A: leadsByGrade.find(g => g.grade === 'A')?._count.grade || 0,
      B: leadsByGrade.find(g => g.grade === 'B')?._count.grade || 0,
      C: leadsByGrade.find(g => g.grade === 'C')?._count.grade || 0
    };

    res.json({
      success: true,
      stats: {
        totalLeads,
        activeConversations,
        qualityLeads,
        scheduledDemos,
        recentActivity,
        gradeDistribution,
        conversionRate: totalLeads > 0 ? Math.round((scheduledDemos / totalLeads) * 100) : 0
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
});

module.exports = router;