/**
 * 🚀 PHASE 5.1: Collaboration Metrics Service
 * Track and analyze AI-human collaboration performance
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate collaboration metrics for user
 */
async function calculateCollaborationMetrics(userId, timeRange = '7d') {
  console.log(`📊 Calculating collaboration metrics for user: ${userId}`);
  
  try {
    let dateFilter = {};
    const now = new Date();
    
    switch (timeRange) {
      case '24h':
        dateFilter.gte = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        dateFilter.gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter.gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter.gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get takeover events for the period
    const takeoverEvents = await prisma.conversationTakeoverLog.findMany({
      where: {
        userId: userId,
        createdAt: dateFilter
      },
      include: {
        conversation: {
          select: {
            id: true,
            status: true,
            priority: true,
            customerPhone: true,
            messageCount: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get conversations with takeover data
    const conversationsWithTakeover = await prisma.cRMConversation.findMany({
      where: {
        userId: userId,
        humanTakeover: true,
        takeoverAt: dateFilter
      },
      include: {
        takeoverLogs: true,
        customerLead: {
          select: { name: true, businessType: true }
        }
      }
    });

    // Calculate metrics
    const metrics = {
      overview: await calculateOverviewMetrics(takeoverEvents, conversationsWithTakeover),
      efficiency: await calculateEfficiencyMetrics(conversationsWithTakeover),
      patterns: await calculatePatternMetrics(takeoverEvents),
      performance: await calculatePerformanceMetrics(userId, dateFilter),
      trends: await calculateTrendMetrics(userId, dateFilter, timeRange)
    };

    console.log('✅ Collaboration metrics calculated');

    return {
      success: true,
      timeRange: timeRange,
      data: metrics,
      generatedAt: now.toISOString()
    };

  } catch (error) {
    console.error('❌ Error calculating collaboration metrics:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Calculate overview metrics
 */
async function calculateOverviewMetrics(takeoverEvents, conversationsWithTakeover) {
  const totalTakeovers = takeoverEvents.filter(e => e.eventType === 'takeover_started').length;
  const aiSuggestions = takeoverEvents.filter(e => e.eventType === 'ai_suggestion').length;
  const customerRequests = takeoverEvents.filter(e => 
    e.eventType === 'takeover_requested' && 
    e.metadata?.requestedBy === 'customer'
  ).length;

  // Calculate average takeover duration
  let totalDuration = 0;
  let durationCount = 0;

  conversationsWithTakeover.forEach(conv => {
    const startLog = conv.takeoverLogs.find(log => log.eventType === 'takeover_started');
    const endLog = conv.takeoverLogs.find(log => log.eventType === 'takeover_ended');
    
    if (startLog && endLog) {
      const duration = new Date(endLog.createdAt) - new Date(startLog.createdAt);
      totalDuration += duration;
      durationCount++;
    }
  });

  const avgDuration = durationCount > 0 ? Math.round(totalDuration / durationCount / 60000) : 0; // in minutes

  return {
    totalTakeovers,
    aiSuggestions,
    customerRequests,
    systemRequests: totalTakeovers - customerRequests,
    avgDurationMinutes: avgDuration,
    activeCollaborations: conversationsWithTakeover.filter(c => c.humanTakeover).length
  };
}

/**
 * Calculate efficiency metrics
 */
async function calculateEfficiencyMetrics(conversationsWithTakeover) {
  const resolved = conversationsWithTakeover.filter(c => c.status === 'COMPLETED').length;
  const escalated = conversationsWithTakeover.filter(c => c.escalationLevel > 1).length;
  
  const resolutionRate = conversationsWithTakeover.length > 0 ? 
    (resolved / conversationsWithTakeover.length * 100) : 0;
  
  const escalationRate = conversationsWithTakeover.length > 0 ? 
    (escalated / conversationsWithTakeover.length * 100) : 0;

  // Calculate response time improvements (mock for now)
  const avgResponseTimeWithAI = 45; // seconds (mock)
  const avgResponseTimeHumanOnly = 180; // seconds (mock)
  const responseTimeImprovement = avgResponseTimeHumanOnly > 0 ? 
    ((avgResponseTimeHumanOnly - avgResponseTimeWithAI) / avgResponseTimeHumanOnly * 100) : 0;

  return {
    resolutionRate: Math.round(resolutionRate * 10) / 10,
    escalationRate: Math.round(escalationRate * 10) / 10,
    avgResponseTimeWithAI,
    avgResponseTimeHumanOnly,
    responseTimeImprovement: Math.round(responseTimeImprovement * 10) / 10
  };
}

/**
 * Calculate pattern metrics
 */
async function calculatePatternMetrics(takeoverEvents) {
  // Takeover reasons analysis
  const reasonsMap = {};
  takeoverEvents.forEach(event => {
    if (event.reason) {
      const reason = event.reason.toLowerCase();
      if (reason.includes('complex')) reasonsMap['complex_issue'] = (reasonsMap['complex_issue'] || 0) + 1;
      else if (reason.includes('escalat')) reasonsMap['escalation'] = (reasonsMap['escalation'] || 0) + 1;
      else if (reason.includes('customer')) reasonsMap['customer_request'] = (reasonsMap['customer_request'] || 0) + 1;
      else if (reason.includes('urgent')) reasonsMap['urgent'] = (reasonsMap['urgent'] || 0) + 1;
      else reasonsMap['other'] = (reasonsMap['other'] || 0) + 1;
    }
  });

  // Time patterns (hour of day analysis)
  const hourlyPattern = {};
  takeoverEvents.forEach(event => {
    const hour = new Date(event.createdAt).getHours();
    hourlyPattern[hour] = (hourlyPattern[hour] || 0) + 1;
  });

  // Most active hours
  const sortedHours = Object.entries(hourlyPattern)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }));

  return {
    commonReasons: Object.entries(reasonsMap)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count, percentage: Math.round((count / takeoverEvents.length) * 100) })),
    hourlyDistribution: hourlyPattern,
    peakHours: sortedHours
  };
}

/**
 * Calculate performance metrics
 */
async function calculatePerformanceMetrics(userId, dateFilter) {
  // Get conversation outcomes after human takeover
  const conversations = await prisma.cRMConversation.findMany({
    where: {
      userId: userId,
      humanTakeover: true,
      takeoverAt: dateFilter
    },
    include: {
      customerLead: {
        select: { qualificationScore: true, status: true }
      }
    }
  });

  const totalConversations = conversations.length;
  const successfulOutcomes = conversations.filter(c => 
    c.status === 'COMPLETED' && c.customerLead?.qualificationScore > 70
  ).length;

  const satisfactionScore = totalConversations > 0 ? 
    (successfulOutcomes / totalConversations * 5) : 0; // Mock satisfaction scoring

  return {
    totalHandledConversations: totalConversations,
    successfulOutcomes,
    successRate: totalConversations > 0 ? 
      Math.round((successfulOutcomes / totalConversations * 100) * 10) / 10 : 0,
    avgSatisfactionScore: Math.round(satisfactionScore * 10) / 10,
    customerRetentionRate: 85.5 // Mock data
  };
}

/**
 * Calculate trend metrics
 */
async function calculateTrendMetrics(userId, dateFilter, timeRange) {
  // Generate trend data based on time range
  const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
  const trends = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.setHours(0, 0, 0, 0));
    const dayEnd = new Date(date.setHours(23, 59, 59, 999));

    const dayTakeovers = await prisma.conversationTakeoverLog.count({
      where: {
        userId: userId,
        eventType: 'takeover_started',
        createdAt: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    });

    const dayAISuggestions = await prisma.conversationTakeoverLog.count({
      where: {
        userId: userId,
        eventType: 'ai_suggestion',
        createdAt: {
          gte: dayStart,
          lte: dayEnd
        }
      }
    });

    trends.push({
      date: dayStart.toISOString().split('T')[0],
      takeovers: dayTakeovers,
      aiSuggestions: dayAISuggestions,
      efficiency: dayTakeovers > 0 ? (dayAISuggestions / dayTakeovers) : 0
    });
  }

  return trends;
}

/**
 * Get collaboration leaderboard
 */
async function getCollaborationLeaderboard(timeRange = '30d') {
  try {
    let dateFilter = {};
    const now = new Date();
    
    switch (timeRange) {
      case '7d':
        dateFilter.gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        dateFilter.gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        dateFilter.gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get user collaboration stats
    const userStats = await prisma.user.findMany({
      where: {
        crmEnabled: true
      },
      include: {
        takeoverLogs: {
          where: {
            createdAt: dateFilter
          }
        },
        crmConversations: {
          where: {
            humanTakeover: true,
            takeoverAt: dateFilter
          },
          select: {
            status: true,
            escalationLevel: true
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        crmPlan: true,
        takeoverLogs: true,
        crmConversations: true
      }
    });

    const leaderboard = userStats.map(user => {
      const totalTakeovers = user.takeoverLogs.filter(log => log.eventType === 'takeover_started').length;
      const aiSuggestions = user.takeoverLogs.filter(log => log.eventType === 'ai_suggestion').length;
      const resolved = user.crmConversations.filter(conv => conv.status === 'COMPLETED').length;
      const escalated = user.crmConversations.filter(conv => conv.escalationLevel > 1).length;

      const efficiency = totalTakeovers > 0 ? (aiSuggestions / totalTakeovers) : 0;
      const resolutionRate = totalTakeovers > 0 ? (resolved / totalTakeovers) : 0;
      const escalationRate = totalTakeovers > 0 ? (escalated / totalTakeovers) : 0;

      // Calculate collaboration score
      const collaborationScore = Math.round(
        (efficiency * 0.4 + resolutionRate * 0.4 + (1 - escalationRate) * 0.2) * 100
      );

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        plan: user.crmPlan,
        totalTakeovers,
        aiSuggestions,
        efficiency: Math.round(efficiency * 100),
        resolutionRate: Math.round(resolutionRate * 100),
        escalationRate: Math.round(escalationRate * 100),
        collaborationScore
      };
    })
    .filter(user => user.totalTakeovers > 0) // Only users with activity
    .sort((a, b) => b.collaborationScore - a.collaborationScore)
    .slice(0, 10); // Top 10

    return {
      success: true,
      leaderboard,
      timeRange
    };

  } catch (error) {
    console.error('❌ Error getting collaboration leaderboard:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  calculateCollaborationMetrics,
  getCollaborationLeaderboard
};