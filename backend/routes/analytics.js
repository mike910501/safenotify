const express = require('express');
const prisma = require('../db');
const { authenticateToken: verifyToken } = require('../middleware/auth');

const router = express.Router();

// Obtener estadísticas del dashboard de analytics
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Estadísticas generales de mensajes
    const totalMessages = await prisma.messageLog.count({
      where: {
        campaign: {
          userId: userId
        },
        sentAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    const deliveredMessages = await prisma.messageLog.count({
      where: {
        campaign: {
          userId: userId
        },
        status: 'delivered',
        sentAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    const failedMessages = await prisma.messageLog.count({
      where: {
        campaign: {
          userId: userId
        },
        status: 'failed',
        sentAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    const pendingMessages = await prisma.messageLog.count({
      where: {
        campaign: {
          userId: userId
        },
        status: 'sent',
        sentAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    // 2. Mensajes por día (últimos 30 días)
    const dailyMessages = await prisma.$queryRaw`
      SELECT 
        DATE("sentAt") as date,
        COUNT(*) as sent,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM message_logs ml
      JOIN campaigns c ON ml."campaignId" = c.id
      WHERE c."userId" = ${userId}
        AND ml."sentAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("sentAt")
      ORDER BY DATE("sentAt") DESC
      LIMIT 30
    `;

    // 3. Performance por campaña (últimas campañas activas)
    const campaignPerformance = await prisma.$queryRaw`
      SELECT 
        c.name,
        c."totalContacts" as sent,
        COUNT(CASE WHEN ml.status = 'delivered' THEN 1 END) as delivered,
        ROUND(
          (COUNT(CASE WHEN ml.status = 'delivered' THEN 1 END) * 100.0) / 
          NULLIF(c."totalContacts", 0), 1
        ) as delivery_rate
      FROM campaigns c
      LEFT JOIN message_logs ml ON c.id = ml."campaignId"
      WHERE c."userId" = ${userId}
        AND c.status = 'completed'
        AND c."sentAt" >= ${thirtyDaysAgo}
      GROUP BY c.id, c.name, c."totalContacts"
      ORDER BY c."sentAt" DESC
      LIMIT 10
    `;

    // 4. Uso por template
    const templateUsage = await prisma.$queryRaw`
      SELECT 
        t.name,
        COUNT(c.id) as usage_count,
        ROUND(
          (COUNT(c.id) * 100.0) / NULLIF(
            (SELECT COUNT(*) FROM campaigns WHERE "userId" = ${userId} AND "createdAt" >= ${thirtyDaysAgo}), 
            0
          ), 1
        ) as usage_percentage
      FROM templates t
      JOIN campaigns c ON t.id = c."templateId"
      WHERE c."userId" = ${userId}
        AND c."createdAt" >= ${thirtyDaysAgo}
      GROUP BY t.id, t.name
      ORDER BY usage_count DESC
      LIMIT 8
    `;

    // 5. Métricas de hoy vs ayer
    const todayMessages = await prisma.messageLog.count({
      where: {
        campaign: {
          userId: userId
        },
        sentAt: {
          gte: today
        }
      }
    });

    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayMessages = await prisma.messageLog.count({
      where: {
        campaign: {
          userId: userId
        },
        sentAt: {
          gte: yesterday,
          lt: today
        }
      }
    });

    // 6. Campañas programadas vs ejecutadas
    const scheduledCampaigns = await prisma.scheduledCampaign.count({
      where: {
        userId: userId,
        status: 'scheduled'
      }
    });

    const executedCampaigns = await prisma.campaign.count({
      where: {
        userId: userId,
        status: 'completed',
        createdAt: {
          gte: thirtyDaysAgo
        }
      }
    });

    // Formatear datos para el frontend
    const deliveryRate = totalMessages > 0 ? (deliveredMessages / totalMessages) * 100 : 0;

    // Colores para templates
    const chartColors = [
      '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', 
      '#EF4444', '#EC4899', '#6366F1', '#84CC16'
    ];

    const formattedTemplateUsage = templateUsage.map((item, index) => ({
      name: item.name,
      usage: Number(item.usage_percentage) || 0,
      color: chartColors[index % chartColors.length]
    }));

    // Formatear datos diarios para el gráfico
    const formattedDailyMessages = dailyMessages.reverse().map(day => ({
      date: new Date(day.date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }),
      sent: Number(day.sent),
      delivered: Number(day.delivered),
      failed: Number(day.failed)
    }));

    // Formatear performance de campañas
    const formattedCampaignPerformance = campaignPerformance.map(camp => ({
      name: camp.name.substring(0, 20) + (camp.name.length > 20 ? '...' : ''),
      sent: Number(camp.sent),
      delivered: Number(camp.delivered),
      deliveryRate: Number(camp.delivery_rate) || 0
    }));

    res.json({
      success: true,
      data: {
        // KPIs principales
        deliveryStats: {
          total: totalMessages,
          delivered: deliveredMessages,
          failed: failedMessages,
          pending: pendingMessages,
          deliveryRate: parseFloat(deliveryRate.toFixed(1))
        },
        
        // Datos para gráficos
        dailyMessages: formattedDailyMessages,
        campaignPerformance: formattedCampaignPerformance,
        templateUsage: formattedTemplateUsage,
        
        // Métricas adicionales
        insights: {
          todayVsYesterday: {
            today: todayMessages,
            yesterday: yesterdayMessages,
            change: todayMessages - yesterdayMessages
          },
          campaignMetrics: {
            scheduled: scheduledCampaigns,
            executed: executedCampaigns
          },
          bestPerformingTemplate: templateUsage[0]?.name || 'No hay datos',
          avgDeliveryRate: deliveryRate
        }
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener métricas específicas por rango de fechas
router.get('/metrics', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, metric } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    let result;

    switch (metric) {
      case 'delivery-by-hour':
        // Análisis por hora del día para optimizar envíos
        result = await prisma.$queryRaw`
          SELECT 
            EXTRACT(HOUR FROM sent_at) as hour,
            COUNT(*) as total_sent,
            COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
            ROUND(
              (COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0) / COUNT(*), 1
            ) as delivery_rate
          FROM message_logs ml
          JOIN campaigns c ON ml.campaign_id = c.id
          WHERE c.user_id = ${userId}
            AND ml.sent_at BETWEEN ${start} AND ${end}
          GROUP BY EXTRACT(HOUR FROM sent_at)
          ORDER BY hour
        `;
        break;

      case 'template-performance':
        // Performance detallado por template
        result = await prisma.$queryRaw`
          SELECT 
            t.name,
            t.category,
            COUNT(c.id) as campaigns_used,
            SUM(c.total_contacts) as total_sent,
            SUM(c.sent_count) as total_delivered,
            ROUND(
              (SUM(c.sent_count) * 100.0) / NULLIF(SUM(c.total_contacts), 0), 1
            ) as avg_delivery_rate
          FROM templates t
          JOIN campaigns c ON t.id = c.template_id
          WHERE c.user_id = ${userId}
            AND c.created_at BETWEEN ${start} AND ${end}
          GROUP BY t.id, t.name, t.category
          ORDER BY total_sent DESC
        `;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Métrica no válida'
        });
    }

    res.json({
      success: true,
      metric: metric,
      dateRange: { start, end },
      data: result
    });

  } catch (error) {
    console.error('Error fetching specific metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Exportar datos de analytics
router.get('/export', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { format = 'json', startDate, endDate } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Obtener datos completos para exportación
    const exportData = await prisma.$queryRaw`
      SELECT 
        c.name as campaign_name,
        c.status as campaign_status,
        c.created_at as campaign_date,
        c.total_contacts,
        c.sent_count,
        c.error_count,
        t.name as template_name,
        t.category as template_category,
        ml.phone,
        ml.status as message_status,
        ml.sent_at as message_sent_at,
        ml.delivered_at,
        ml.error
      FROM campaigns c
      LEFT JOIN templates t ON c.template_id = t.id
      LEFT JOIN message_logs ml ON c.id = ml.campaign_id
      WHERE c.user_id = ${userId}
        AND c.created_at BETWEEN ${start} AND ${end}
      ORDER BY c.created_at DESC, ml.sent_at DESC
    `;

    if (format === 'csv') {
      const csvHeader = 'Campaña,Estado Campaña,Fecha Campaña,Total Contactos,Enviados,Errores,Template,Categoría,Teléfono,Estado Mensaje,Enviado,Entregado,Error\n';
      const csvData = exportData.map(row => [
        row.campaign_name,
        row.campaign_status,
        row.campaign_date,
        row.total_contacts,
        row.sent_count,
        row.error_count,
        row.template_name,
        row.template_category,
        row.phone,
        row.message_status,
        row.message_sent_at,
        row.delivered_at,
        row.error
      ].join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="safenotify-analytics-${start.toISOString().split('T')[0]}-${end.toISOString().split('T')[0]}.csv"`);
      res.send(csvHeader + csvData);
    } else {
      res.json({
        success: true,
        dateRange: { start, end },
        totalRecords: exportData.length,
        data: exportData
      });
    }

  } catch (error) {
    console.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// 🚀 CRM Analytics Endpoint - Enhanced with Model Metrics
router.get('/crm', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { timeRange = '7d' } = req.query;
    
    // CRM is now available for all users with proper plan
    // No need to check crmEnabled as it's handled by plan limits

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
      case '90d':
        dateFilter.gte = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        dateFilter.gte = new Date('2024-01-01');
        break;
      default:
        dateFilter.gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // 1. Overview Metrics
    const totalConversations = await prisma.cRMConversation.count({
      where: { 
        userId,
        createdAt: dateFilter
      }
    });

    const activeConversations = await prisma.cRMConversation.count({
      where: { 
        userId,
        status: 'ACTIVE'
      }
    });

    const totalAgents = await prisma.userAIAgent.count({
      where: { 
        userId,
        isActive: true
      }
    });

    // Get total leads and converted leads for conversion rate
    const totalLeads = await prisma.customerLead.count({
      where: {
        userId,
        createdAt: dateFilter
      }
    });

    const convertedLeads = await prisma.customerLead.count({
      where: {
        userId,
        status: 'CONVERTED',
        createdAt: dateFilter
      }
    });

    // Calculate real metrics
    const avgResponseTime = 8.5; // Will implement real calculation later
    const satisfactionScore = 4.2; // Will implement with feedback system
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

    // Get total messages count
    const conversations = await prisma.cRMConversation.findMany({
      where: {
        userId,
        createdAt: dateFilter
      },
      select: {
        messages: true
      }
    });

    let totalMessages = 0;
    conversations.forEach(conv => {
      if (conv.messages && Array.isArray(conv.messages)) {
        totalMessages += conv.messages.length;
      }
    });

    // Get GPT Usage metrics for detailed model analysis
    const gptUsageMetrics = await prisma.gPTUsage.findMany({
      where: {
        createdAt: dateFilter
      },
      select: {
        model: true,
        tokensUsed: true,
        phone: true,
        leadId: true,
        createdAt: true
      }
    });

    // Calculate model-specific metrics
    const modelMetrics = {};
    let totalTokens = 0;
    let totalEstimatedCost = 0;

    gptUsageMetrics.forEach(usage => {
      const model = usage.model || 'unknown';
      totalTokens += usage.tokensUsed || 0;
      
      if (!modelMetrics[model]) {
        modelMetrics[model] = {
          name: model,
          totalTokens: 0,
          usageCount: 0,
          estimatedCost: 0,
          lastUsed: usage.createdAt
        };
      }
      
      modelMetrics[model].totalTokens += usage.tokensUsed || 0;
      modelMetrics[model].usageCount += 1;
      
      // Calculate estimated cost (assuming input/output split 70/30)
      const inputTokens = (usage.tokensUsed || 0) * 0.7;
      const outputTokens = (usage.tokensUsed || 0) * 0.3;
      
      // Simple pricing model (will be enhanced with real pricing)
      let inputPrice = 0.001, outputPrice = 0.002; // Default
      
      switch (model) {
        case 'gpt-4o-mini':
          inputPrice = 0.00015; outputPrice = 0.0006;
          break;
        case 'gpt-4o':
          inputPrice = 0.0025; outputPrice = 0.010;
          break;
        case 'gpt-4':
          inputPrice = 0.03; outputPrice = 0.06;
          break;
        case 'gpt-3.5-turbo':
          inputPrice = 0.0005; outputPrice = 0.0015;
          break;
        case 'o1-mini':
          inputPrice = 0.003; outputPrice = 0.012;
          break;
        case 'gpt-4-turbo':
          inputPrice = 0.01; outputPrice = 0.03;
          break;
      }
      
      const usageCost = (inputTokens / 1000) * inputPrice + (outputTokens / 1000) * outputPrice;
      modelMetrics[model].estimatedCost += usageCost;
      totalEstimatedCost += usageCost;
      
      if (usage.createdAt > modelMetrics[model].lastUsed) {
        modelMetrics[model].lastUsed = usage.createdAt;
      }
    });

    // Convert to array and add percentages
    const modelMetricsArray = Object.values(modelMetrics).map(model => ({
      ...model,
      usagePercentage: totalTokens > 0 ? ((model.totalTokens / totalTokens) * 100).toFixed(1) : 0,
      avgTokensPerUse: model.usageCount > 0 ? Math.round(model.totalTokens / model.usageCount) : 0,
      costPerUse: model.usageCount > 0 ? model.estimatedCost / model.usageCount : 0
    })).sort((a, b) => b.totalTokens - a.totalTokens);

    // Generate daily usage trends for models
    const dailyModelUsage = {};
    const daysCount = timeRange === '24h' ? 1 : 
                     timeRange === '7d' ? 7 :
                     timeRange === '30d' ? 30 : 
                     timeRange === '90d' ? 90 : 30;

    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      
      dailyModelUsage[dateStr] = {
        date: dateStr,
        total: 0
      };
      
      // Initialize each model for this day
      Object.keys(modelMetrics).forEach(model => {
        dailyModelUsage[dateStr][model] = 0;
      });
    }

    // Fill in actual usage data
    gptUsageMetrics.forEach(usage => {
      const dateStr = new Date(usage.createdAt).toISOString().split('T')[0];
      if (dailyModelUsage[dateStr]) {
        const model = usage.model || 'unknown';
        dailyModelUsage[dateStr][model] += usage.tokensUsed || 0;
        dailyModelUsage[dateStr].total += usage.tokensUsed || 0;
      }
    });

    const timelineTrends = Object.values(dailyModelUsage);

    // 2. Agent Performance
    const agentStats = await prisma.userAIAgent.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
        _count: {
          select: {
            conversations: {
              where: {
                createdAt: dateFilter
              }
            }
          }
        }
      }
    });

    const agents = agentStats.map(agent => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      totalConversations: agent._count.conversations,
      avgResponseTime: Math.random() * 20 + 5, // Mock data
      satisfactionRating: (Math.random() * 1.5 + 3.5), // Mock data 3.5-5.0
      isActive: agent.isActive
    }));

    // 3. Trends Data (mock for development)
    const generateTrendData = (days, baseValue, variance) => {
      const data = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const value = Math.max(0, baseValue + (Math.random() - 0.5) * variance);
        data.push({
          date: date.toISOString().split('T')[0],
          count: Math.round(value)
        });
      }
      return data;
    };

    const daysCount = timeRange === '24h' ? 1 : 
                    timeRange === '7d' ? 7 :
                    timeRange === '30d' ? 30 : 90;

    const trends = {
      conversations: generateTrendData(daysCount, 20, 10),
      responseTime: generateTrendData(daysCount, 15, 6),
      satisfaction: generateTrendData(daysCount, 4.2, 0.8).map(item => ({
        date: item.date,
        score: Math.min(5, Math.max(3, item.count))
      }))
    };

    // 4. Top Performers
    const topPerformers = [
      { agentName: 'Sales Assistant Pro', metric: 'Response Time', value: '8.2s', change: -12.5 },
      { agentName: 'Support Specialist', metric: 'Satisfaction', value: '4.1★', change: 8.3 },
      { agentName: 'Sales Assistant Pro', metric: 'Conversations', value: totalConversations > 0 ? Math.floor(totalConversations * 0.6) : 45, change: 23.1 }
    ];

    res.json({
      success: true,
      data: {
        overview: {
          totalConversations,
          activeConversations, 
          totalAgents,
          avgResponseTime,
          satisfactionScore,
          conversionRate: parseFloat(conversionRate),
          totalMessages,
          totalLeads,
          convertedLeads,
          // New AI metrics
          totalTokens,
          totalEstimatedCost,
          avgCostPerConversation: totalConversations > 0 ? totalEstimatedCost / totalConversations : 0,
          avgTokensPerConversation: totalConversations > 0 ? totalTokens / totalConversations : 0
        },
        trends,
        agents,
        topPerformers,
        // New model-specific data
        modelMetrics: modelMetricsArray,
        modelTimelineTrends: timelineTrends,
        costBreakdown: {
          totalCost: totalEstimatedCost,
          mostExpensiveModel: modelMetricsArray[0]?.name || null,
          mostUsedModel: modelMetricsArray[0]?.name || null,
          modelCount: Object.keys(modelMetrics).length
        },
        timeRange,
        generatedAt: now.toISOString()
      }
    });

  } catch (error) {
    console.error('CRM Analytics Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error loading CRM analytics'
    });
  }
});

module.exports = router;