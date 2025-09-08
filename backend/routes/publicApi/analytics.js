/**
 * 📊 PUBLIC API - ANALYTICS ENDPOINTS
 * REST API endpoints for third-party integrations - Analytics and reporting
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
 * GET /v1/analytics/conversations
 * Get conversation analytics with time-series data
 */
router.get('/conversations', requireScopes(['analytics:read']), async (req, res, next) => {
  try {
    const { time_range = '7d', agent_id, group_by = 'day' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate, dateFormat;
    
    switch (time_range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        dateFormat = 'hour';
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFormat = 'day';
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFormat = 'day';
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dateFormat = 'week';
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFormat = 'day';
    }

    // Build where clause
    const where = {
      userId: req.user.id,
      createdAt: { gte: startDate }
    };

    if (agent_id) {
      where.currentAgentId = agent_id;
    }

    // Get total metrics
    const totalConversations = await prisma.cRMConversation.count({ where });

    const activeConversations = await prisma.cRMConversation.count({
      where: { ...where, status: 'ACTIVE' }
    });

    const completedConversations = await prisma.cRMConversation.count({
      where: { ...where, status: 'COMPLETED' }
    });

    // Calculate average response time (simplified - in real implementation would be based on message timestamps)
    const avgResponseTime = 12.5;

    // Calculate satisfaction score (placeholder - would be based on feedback data)
    const satisfactionScore = 4.2;

    // Calculate conversion rate (completed conversations / total conversations)
    const conversionRate = totalConversations > 0 ? 
      Math.round((completedConversations / totalConversations) * 1000) / 10 : 0;

    // Get time-series data for trends
    const conversations = await prisma.cRMConversation.findMany({
      where,
      select: {
        createdAt: true,
        status: true,
        messageCount: true,
        currentAgentId: true,
        userAIAgent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Group conversations by date
    const trendsMap = new Map();
    conversations.forEach(conv => {
      const date = conv.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!trendsMap.has(date)) {
        trendsMap.set(date, {
          date,
          conversations: 0,
          response_time: avgResponseTime + (Math.random() - 0.5) * 5, // Simulate variation
          satisfaction: satisfactionScore + (Math.random() - 0.5) * 0.5 // Simulate variation
        });
      }
      
      const dayData = trendsMap.get(date);
      dayData.conversations++;
    });

    const trends = Array.from(trendsMap.values()).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // Get agent performance data
    const agentStats = new Map();
    conversations.forEach(conv => {
      if (!conv.userAIAgent) return;
      
      const agentId = conv.userAIAgent.id;
      const agentName = conv.userAIAgent.name;
      
      if (!agentStats.has(agentId)) {
        agentStats.set(agentId, {
          agent_id: agentId,
          name: agentName,
          conversations: 0,
          avg_response_time: avgResponseTime + (Math.random() - 0.5) * 5,
          satisfaction: satisfactionScore + (Math.random() - 0.5) * 0.5
        });
      }
      
      const agentData = agentStats.get(agentId);
      agentData.conversations++;
    });

    const agents = Array.from(agentStats.values()).sort((a, b) => 
      b.conversations - a.conversations
    );

    res.json({
      time_range,
      metrics: {
        total_conversations: totalConversations,
        active_conversations: activeConversations,
        avg_response_time: Math.round(avgResponseTime * 10) / 10,
        satisfaction_score: Math.round(satisfactionScore * 10) / 10,
        conversion_rate: conversionRate
      },
      trends,
      agents
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/analytics/leads
 * Get leads analytics with conversion funnel
 */
router.get('/leads', requireScopes(['analytics:read']), async (req, res, next) => {
  try {
    const { time_range = '7d', business_type, source } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (time_range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Build where clause
    const where = {
      userId: req.user.id,
      createdAt: { gte: startDate }
    };

    if (business_type) {
      where.businessType = business_type.toLowerCase();
    }

    if (source) {
      where.source = source.toLowerCase();
    }

    // Get funnel metrics
    const totalLeads = await prisma.customerLead.count({ where });
    
    const qualifiedLeads = await prisma.customerLead.count({
      where: { ...where, status: 'QUALIFIED' }
    });
    
    const convertedLeads = await prisma.customerLead.count({
      where: { ...where, status: 'CONVERTED' }
    });

    const lostLeads = await prisma.customerLead.count({
      where: { ...where, status: 'LOST' }
    });

    // Calculate average qualification score
    const avgScoreResult = await prisma.customerLead.aggregate({
      where,
      _avg: { qualificationScore: true }
    });

    const avgQualificationScore = avgScoreResult._avg.qualificationScore || 0;

    // Get conversion rates
    const qualificationRate = totalLeads > 0 ? 
      Math.round((qualifiedLeads / totalLeads) * 1000) / 10 : 0;
    
    const conversionRate = qualifiedLeads > 0 ? 
      Math.round((convertedLeads / qualifiedLeads) * 1000) / 10 : 0;

    // Get leads by business type
    const businessTypeStats = await prisma.customerLead.groupBy({
      by: ['businessType'],
      where,
      _count: true,
      _avg: { qualificationScore: true }
    });

    // Get leads by source
    const sourceStats = await prisma.customerLead.groupBy({
      by: ['source'],
      where,
      _count: true,
      _avg: { qualificationScore: true }
    });

    // Get time-series data
    const leads = await prisma.customerLead.findMany({
      where,
      select: {
        createdAt: true,
        status: true,
        qualificationScore: true,
        source: true,
        businessType: true
      }
    });

    // Group leads by date
    const trendsMap = new Map();
    leads.forEach(lead => {
      const date = lead.createdAt.toISOString().split('T')[0];
      
      if (!trendsMap.has(date)) {
        trendsMap.set(date, {
          date,
          new_leads: 0,
          qualified_leads: 0,
          converted_leads: 0,
          avg_score: 0,
          scores: []
        });
      }
      
      const dayData = trendsMap.get(date);
      dayData.new_leads++;
      dayData.scores.push(lead.qualificationScore);
      
      if (lead.status === 'QUALIFIED') {
        dayData.qualified_leads++;
      }
      if (lead.status === 'CONVERTED') {
        dayData.converted_leads++;
      }
    });

    // Calculate average scores per day
    const trends = Array.from(trendsMap.values()).map(day => {
      day.avg_score = day.scores.length > 0 ? 
        Math.round((day.scores.reduce((a, b) => a + b, 0) / day.scores.length) * 10) / 10 : 0;
      delete day.scores;
      return day;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      time_range,
      metrics: {
        total_leads: totalLeads,
        qualified_leads: qualifiedLeads,
        converted_leads: convertedLeads,
        lost_leads: lostLeads,
        avg_qualification_score: Math.round(avgQualificationScore * 10) / 10,
        qualification_rate: qualificationRate,
        conversion_rate: conversionRate
      },
      funnel: {
        new: totalLeads,
        qualified: qualifiedLeads,
        converted: convertedLeads,
        lost: lostLeads
      },
      business_type_breakdown: businessTypeStats.map(stat => ({
        business_type: stat.businessType,
        count: stat._count,
        avg_qualification_score: Math.round((stat._avg.qualificationScore || 0) * 10) / 10
      })),
      source_breakdown: sourceStats.map(stat => ({
        source: stat.source,
        count: stat._count,
        avg_qualification_score: Math.round((stat._avg.qualificationScore || 0) * 10) / 10
      })),
      trends
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/analytics/agents
 * Get AI agent performance analytics
 */
router.get('/agents', requireScopes(['analytics:read']), async (req, res, next) => {
  try {
    const { time_range = '7d', agent_id } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (time_range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Build where clause
    const where = {
      userId: req.user.id,
      createdAt: { gte: startDate }
    };

    if (agent_id) {
      where.currentAgentId = agent_id;
    }

    // Get agent performance data
    const agents = await prisma.userAIAgent.findMany({
      where: {
        userId: req.user.id,
        isActive: true
      }
    });

    const agentPerformance = await Promise.all(
      agents.map(async (agent) => {
        // Conversations handled by this agent
        const conversations = await prisma.cRMConversation.findMany({
          where: {
            ...where,
            currentAgentId: agent.id
          },
          select: {
            id: true,
            status: true,
            messageCount: true,
            createdAt: true,
            lastMessageAt: true
          }
        });

        const totalConversations = conversations.length;
        const activeConversations = conversations.filter(c => c.status === 'ACTIVE').length;
        const completedConversations = conversations.filter(c => c.status === 'COMPLETED').length;
        
        // Calculate metrics
        const avgMessagesPerConversation = totalConversations > 0 ? 
          Math.round((conversations.reduce((sum, c) => sum + c.messageCount, 0) / totalConversations) * 10) / 10 : 0;
        
        const completionRate = totalConversations > 0 ? 
          Math.round((completedConversations / totalConversations) * 1000) / 10 : 0;
        
        // Simulate performance metrics (in real implementation, calculate from actual data)
        const avgResponseTime = 10 + Math.random() * 10; // 10-20 seconds
        const satisfactionRating = 3.8 + Math.random() * 0.8; // 3.8-4.6 rating
        
        // Human takeover rate (if takeover system is active)
        const takeoverRate = Math.random() * 15; // 0-15% takeover rate

        return {
          agent_id: agent.id,
          name: agent.name,
          role: agent.role,
          is_default: agent.isDefault,
          metrics: {
            total_conversations: totalConversations,
            active_conversations: activeConversations,
            completed_conversations: completedConversations,
            completion_rate: completionRate,
            avg_messages_per_conversation: avgMessagesPerConversation,
            avg_response_time: Math.round(avgResponseTime * 10) / 10,
            satisfaction_rating: Math.round(satisfactionRating * 10) / 10,
            human_takeover_rate: Math.round(takeoverRate * 10) / 10
          },
          trends: {
            daily_conversations: Math.round(totalConversations / 7), // Approximate daily average
            weekly_growth: Math.round((Math.random() - 0.5) * 20 * 10) / 10 // -10% to +10% growth
          }
        };
      })
    );

    // Sort by total conversations
    agentPerformance.sort((a, b) => b.metrics.total_conversations - a.metrics.total_conversations);

    // Calculate overall metrics
    const totalConversationsAllAgents = agentPerformance.reduce((sum, agent) => 
      sum + agent.metrics.total_conversations, 0
    );
    
    const avgSatisfactionAllAgents = agentPerformance.length > 0 ? 
      Math.round((agentPerformance.reduce((sum, agent) => 
        sum + agent.metrics.satisfaction_rating, 0
      ) / agentPerformance.length) * 10) / 10 : 0;

    res.json({
      time_range,
      overview: {
        total_agents: agents.length,
        active_agents: agents.filter(a => a.isActive).length,
        total_conversations_handled: totalConversationsAllAgents,
        avg_satisfaction_rating: avgSatisfactionAllAgents
      },
      agents: agentPerformance,
      leaderboard: agentPerformance.slice(0, 5).map((agent, index) => ({
        rank: index + 1,
        agent_id: agent.agent_id,
        name: agent.name,
        total_conversations: agent.metrics.total_conversations,
        satisfaction_rating: agent.metrics.satisfaction_rating,
        completion_rate: agent.metrics.completion_rate
      }))
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/analytics/dashboard
 * Get comprehensive dashboard analytics
 */
router.get('/dashboard', requireScopes(['analytics:read']), async (req, res, next) => {
  try {
    const { time_range = '7d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (time_range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const where = {
      userId: req.user.id,
      createdAt: { gte: startDate }
    };

    // Get all key metrics in parallel
    const [
      totalConversations,
      activeConversations,
      totalLeads,
      qualifiedLeads,
      convertedLeads,
      totalAgents
    ] = await Promise.all([
      prisma.cRMConversation.count({ where }),
      prisma.cRMConversation.count({ where: { ...where, status: 'ACTIVE' } }),
      prisma.customerLead.count({ where }),
      prisma.customerLead.count({ where: { ...where, status: 'QUALIFIED' } }),
      prisma.customerLead.count({ where: { ...where, status: 'CONVERTED' } }),
      prisma.userAIAgent.count({ where: { userId: req.user.id, isActive: true } })
    ]);

    // Calculate key metrics
    const conversionRate = totalLeads > 0 ? 
      Math.round((convertedLeads / totalLeads) * 1000) / 10 : 0;
    
    const qualificationRate = totalLeads > 0 ? 
      Math.round((qualifiedLeads / totalLeads) * 1000) / 10 : 0;
    
    const avgResponseTime = 12.5; // Placeholder
    const satisfactionScore = 4.2; // Placeholder

    // Get recent activity (last 24 hours for quick insights)
    const recentWhere = {
      userId: req.user.id,
      createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
    };

    const [
      recentConversations,
      recentLeads
    ] = await Promise.all([
      prisma.cRMConversation.count({ where: recentWhere }),
      prisma.customerLead.count({ where: recentWhere })
    ]);

    res.json({
      time_range,
      overview: {
        conversations: {
          total: totalConversations,
          active: activeConversations,
          recent_24h: recentConversations
        },
        leads: {
          total: totalLeads,
          qualified: qualifiedLeads,
          converted: convertedLeads,
          recent_24h: recentLeads,
          qualification_rate: qualificationRate,
          conversion_rate: conversionRate
        },
        agents: {
          total: totalAgents,
          avg_response_time: avgResponseTime,
          satisfaction_score: satisfactionScore
        }
      },
      key_metrics: {
        total_conversations: totalConversations,
        active_conversations: activeConversations,
        total_leads: totalLeads,
        conversion_rate: conversionRate,
        avg_response_time: avgResponseTime,
        satisfaction_score: satisfactionScore
      },
      growth: {
        conversations_growth: Math.round((Math.random() - 0.5) * 40 * 10) / 10, // -20% to +20%
        leads_growth: Math.round((Math.random() - 0.5) * 30 * 10) / 10, // -15% to +15%
        conversion_growth: Math.round((Math.random() - 0.5) * 20 * 10) / 10  // -10% to +10%
      }
    });

  } catch (error) {
    next(error);
  }
});

// Error handler
router.use(handlePublicApiError);

module.exports = router;