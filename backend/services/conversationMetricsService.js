/**
 * 📊 CONVERSATION METRICS SERVICE
 * 
 * Servicio especializado para cálculo de métricas de conversaciones en tiempo real
 * 
 * CARACTERÍSTICAS:
 * - Métricas en tiempo real con caché
 * - Analytics avanzados de conversaciones
 * - KPIs para dashboard CRM
 * - Comparativas y tendencias
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const prisma = new PrismaClient();

class ConversationMetricsService {

  /**
   * 📈 Obtener métricas agregadas para dashboard del User
   */
  async getDashboardMetrics(userId, timeFrame = '30d') {
    try {
      const dateRange = this.getDateRange(timeFrame);
      const previousRange = this.getPreviousDateRange(timeFrame);

      // Obtener métricas del período actual
      const currentMetrics = await this.getMetricsForPeriod(userId, dateRange);
      
      // Obtener métricas del período anterior para comparación
      const previousMetrics = await this.getMetricsForPeriod(userId, previousRange);

      // Calcular cambios porcentuales
      const changes = this.calculateChanges(currentMetrics, previousMetrics);

      // Métricas de agentes
      const agentMetrics = await this.getAgentPerformanceMetrics(userId, dateRange);

      // Tendencias por día
      const trends = await this.getConversationTrends(userId, dateRange);

      // Top tags y categorías
      const topTags = await this.getTopTags(userId, dateRange);

      return {
        success: true,
        timeFrame,
        period: dateRange,
        current: currentMetrics,
        changes,
        agentPerformance: agentMetrics,
        trends,
        topTags,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error getting dashboard metrics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 📊 Métricas detalladas de un período específico
   */
  async getMetricsForPeriod(userId, dateRange) {
    try {
      const { start, end } = dateRange;

      // Conversaciones del período
      const conversations = await prisma.crmConversation.findMany({
        where: {
          userId,
          createdAt: {
            gte: start,
            lte: end
          }
        },
        include: {
          customerLead: {
            select: {
              qualificationScore: true,
              status: true,
              businessType: true
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

      // Métricas básicas
      const totalConversations = conversations.length;
      const activeConversations = conversations.filter(c => c.status === 'ACTIVE').length;
      const convertedConversations = conversations.filter(c => c.status === 'CONVERTED').length;
      const archivedConversations = conversations.filter(c => c.status === 'ARCHIVED').length;

      // Métricas de mensajes
      const totalMessages = conversations.reduce((sum, conv) => sum + (conv.messageCount || 0), 0);
      const avgMessagesPerConversation = totalConversations > 0 ? totalMessages / totalConversations : 0;

      // Métricas de leads
      const totalLeads = conversations.length;
      const qualifiedLeads = conversations.filter(c => 
        c.customerLead?.qualificationScore > 50
      ).length;
      const highQualityLeads = conversations.filter(c => 
        c.customerLead?.qualificationScore > 80
      ).length;

      // Métricas de tiempo
      const conversationDurations = [];
      const responseTimes = [];
      
      for (const conv of conversations) {
        if (conv.messages && conv.messages.length > 0) {
          const messages = conv.messages;
          const firstMessage = messages[0];
          const lastMessage = messages[messages.length - 1];
          
          // Duración de conversación
          if (firstMessage && lastMessage) {
            const duration = new Date(lastMessage.timestamp) - new Date(firstMessage.timestamp);
            conversationDurations.push(duration);
          }

          // Tiempos de respuesta
          for (let i = 0; i < messages.length - 1; i++) {
            const current = messages[i];
            const next = messages[i + 1];
            
            if (current.role === 'user' && next.role === 'assistant') {
              const responseTime = new Date(next.timestamp) - new Date(current.timestamp);
              responseTimes.push(responseTime);
            }
          }
        }
      }

      const avgConversationDuration = conversationDurations.length > 0 
        ? conversationDurations.reduce((a, b) => a + b, 0) / conversationDurations.length 
        : 0;

      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;

      // Métricas de conversión
      const conversionRate = totalConversations > 0 ? (convertedConversations / totalConversations) * 100 : 0;
      const qualificationRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;

      // Distribución por prioridad
      const priorityDistribution = {
        LOW: conversations.filter(c => c.priority === 'LOW').length,
        NORMAL: conversations.filter(c => c.priority === 'NORMAL').length,
        HIGH: conversations.filter(c => c.priority === 'HIGH').length,
        URGENT: conversations.filter(c => c.priority === 'URGENT').length
      };

      // Métricas de engagement
      const engagementScore = this.calculateEngagementScore(conversations);

      return {
        // Volumen
        totalConversations,
        activeConversations,
        convertedConversations,
        archivedConversations,
        
        // Mensajes
        totalMessages,
        avgMessagesPerConversation: Math.round(avgMessagesPerConversation * 100) / 100,
        
        // Leads
        totalLeads,
        qualifiedLeads,
        highQualityLeads,
        qualificationRate: Math.round(qualificationRate * 100) / 100,
        
        // Tiempo
        avgConversationDuration: Math.round(avgConversationDuration / 1000), // segundos
        avgResponseTime: Math.round(avgResponseTime / 1000), // segundos
        
        // Conversión
        conversionRate: Math.round(conversionRate * 100) / 100,
        
        // Distribución
        priorityDistribution,
        
        // Engagement
        engagementScore: Math.round(engagementScore * 100) / 100
      };

    } catch (error) {
      logger.error('Error getting metrics for period:', error);
      throw error;
    }
  }

  /**
   * 👥 Métricas de rendimiento por agente
   */
  async getAgentPerformanceMetrics(userId, dateRange) {
    try {
      const { start, end } = dateRange;

      const agentStats = await prisma.crmConversation.groupBy({
        by: ['currentAgentId'],
        where: {
          userId,
          createdAt: {
            gte: start,
            lte: end
          },
          currentAgentId: {
            not: null
          }
        },
        _count: {
          id: true
        },
        _avg: {
          messageCount: true
        }
      });

      // Obtener detalles de agentes
      const agentIds = agentStats.map(stat => stat.currentAgentId).filter(Boolean);
      const agents = await prisma.userAIAgent.findMany({
        where: {
          id: { in: agentIds },
          userId
        },
        select: {
          id: true,
          name: true,
          role: true
        }
      });

      // Combinar estadísticas con información de agentes
      const agentPerformance = agentStats.map(stat => {
        const agent = agents.find(a => a.id === stat.currentAgentId);
        
        return {
          agentId: stat.currentAgentId,
          agentName: agent?.name || 'Agente eliminado',
          agentRole: agent?.role || 'unknown',
          conversationsHandled: stat._count.id,
          avgMessagesPerConversation: Math.round((stat._avg.messageCount || 0) * 100) / 100
        };
      });

      return agentPerformance.sort((a, b) => b.conversationsHandled - a.conversationsHandled);

    } catch (error) {
      logger.error('Error getting agent performance metrics:', error);
      return [];
    }
  }

  /**
   * 📈 Tendencias de conversaciones por día
   */
  async getConversationTrends(userId, dateRange, granularity = 'day') {
    try {
      const { start, end } = dateRange;

      // Query para obtener conversaciones agrupadas por fecha
      const trendsQuery = `
        SELECT 
          DATE_TRUNC('${granularity}', "createdAt") as date,
          COUNT(*) as conversations,
          COUNT(CASE WHEN status = 'CONVERTED' THEN 1 END) as conversions,
          AVG("messageCount") as avg_messages,
          COUNT(CASE WHEN priority = 'HIGH' OR priority = 'URGENT' THEN 1 END) as high_priority
        FROM "CRMConversation"
        WHERE "userId" = $1 
          AND "createdAt" >= $2 
          AND "createdAt" <= $3
        GROUP BY DATE_TRUNC('${granularity}', "createdAt")
        ORDER BY date ASC
      `;

      const trends = await prisma.$queryRaw`${trendsQuery}`.bind(userId, start, end);

      return trends.map(trend => ({
        date: trend.date,
        conversations: Number(trend.conversations),
        conversions: Number(trend.conversions),
        avgMessages: Math.round(Number(trend.avg_messages || 0) * 100) / 100,
        highPriority: Number(trend.high_priority),
        conversionRate: Number(trend.conversations) > 0 
          ? Math.round((Number(trend.conversions) / Number(trend.conversations)) * 100 * 100) / 100 
          : 0
      }));

    } catch (error) {
      logger.error('Error getting conversation trends:', error);
      return [];
    }
  }

  /**
   * 🏷️ Top tags utilizados
   */
  async getTopTags(userId, dateRange, limit = 10) {
    try {
      const { start, end } = dateRange;

      const conversations = await prisma.crmConversation.findMany({
        where: {
          userId,
          createdAt: {
            gte: start,
            lte: end
          },
          tags: {
            not: []
          }
        },
        select: {
          tags: true
        }
      });

      // Contar frecuencia de tags
      const tagFrequency = {};
      conversations.forEach(conv => {
        if (conv.tags && Array.isArray(conv.tags)) {
          conv.tags.forEach(tag => {
            tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
          });
        }
      });

      // Convertir a array y ordenar
      const topTags = Object.entries(tagFrequency)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return topTags;

    } catch (error) {
      logger.error('Error getting top tags:', error);
      return [];
    }
  }

  /**
   * 🔄 Métricas de conversaciones en tiempo real (últimas 24h)
   */
  async getRealTimeMetrics(userId) {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const realtimeStats = await prisma.crmConversation.aggregate({
        where: {
          userId,
          lastActivity: {
            gte: last24h
          }
        },
        _count: {
          id: true
        }
      });

      // Conversaciones activas en este momento
      const activeNow = await prisma.crmConversation.count({
        where: {
          userId,
          status: 'ACTIVE',
          lastActivity: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Última hora
          }
        }
      });

      // Conversaciones que necesitan atención
      const needsAttention = await prisma.crmConversation.count({
        where: {
          userId,
          OR: [
            { priority: 'HIGH' },
            { priority: 'URGENT' },
            {
              status: 'ACTIVE',
              lastActivity: {
                lt: new Date(Date.now() - 4 * 60 * 60 * 1000) // Más de 4 horas sin respuesta
              }
            }
          ]
        }
      });

      // Métricas por hora de las últimas 24h
      const hourlyStats = await this.getHourlyStats(userId, last24h);

      return {
        success: true,
        timestamp: new Date().toISOString(),
        activeIn24h: realtimeStats._count.id || 0,
        activeNow,
        needsAttention,
        hourlyTrends: hourlyStats
      };

    } catch (error) {
      logger.error('Error getting real-time metrics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * ⏰ Estadísticas por hora
   */
  async getHourlyStats(userId, since) {
    try {
      const hourlyQuery = `
        SELECT 
          EXTRACT(HOUR FROM "lastActivity") as hour,
          COUNT(*) as activity_count
        FROM "CRMConversation"
        WHERE "userId" = $1 
          AND "lastActivity" >= $2
        GROUP BY EXTRACT(HOUR FROM "lastActivity")
        ORDER BY hour ASC
      `;

      const hourlyData = await prisma.$queryRaw`${hourlyQuery}`.bind(userId, since);

      // Crear array de 24 horas con datos
      const hours = Array.from({ length: 24 }, (_, i) => {
        const hourData = hourlyData.find(h => Number(h.hour) === i);
        return {
          hour: i,
          activityCount: hourData ? Number(hourData.activity_count) : 0
        };
      });

      return hours;

    } catch (error) {
      logger.error('Error getting hourly stats:', error);
      return [];
    }
  }

  // ============================================================================
  // MÉTODOS AUXILIARES
  // ============================================================================

  /**
   * Calcular rango de fechas según timeFrame
   */
  getDateRange(timeFrame) {
    const now = new Date();
    let start;

    switch (timeFrame) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end: now };
  }

  /**
   * Calcular rango de fechas del período anterior para comparación
   */
  getPreviousDateRange(timeFrame) {
    const current = this.getDateRange(timeFrame);
    const period = current.end.getTime() - current.start.getTime();

    return {
      start: new Date(current.start.getTime() - period),
      end: new Date(current.start.getTime())
    };
  }

  /**
   * Calcular cambios porcentuales entre períodos
   */
  calculateChanges(current, previous) {
    const calculateChange = (currentValue, previousValue) => {
      if (previousValue === 0) return currentValue > 0 ? 100 : 0;
      return Math.round(((currentValue - previousValue) / previousValue) * 100 * 100) / 100;
    };

    return {
      totalConversations: calculateChange(current.totalConversations, previous.totalConversations),
      conversionRate: calculateChange(current.conversionRate, previous.conversionRate),
      qualificationRate: calculateChange(current.qualificationRate, previous.qualificationRate),
      avgResponseTime: calculateChange(current.avgResponseTime, previous.avgResponseTime),
      engagementScore: calculateChange(current.engagementScore, previous.engagementScore)
    };
  }

  /**
   * Calcular score de engagement promedio
   */
  calculateEngagementScore(conversations) {
    if (conversations.length === 0) return 0;

    const scores = conversations.map(conv => {
      let score = 0;
      
      // Mensajes del usuario (40%)
      const userMessages = (conv.messages || []).filter(m => m.role === 'user').length;
      score += Math.min((userMessages / 5) * 40, 40);
      
      // Score de calificación (30%)
      score += (conv.customerLead?.qualificationScore || 0) * 0.3;
      
      // Estado de conversación (20%)
      if (conv.status === 'CONVERTED') score += 20;
      else if (conv.status === 'ACTIVE') score += 10;
      
      // Prioridad (10%)
      switch (conv.priority) {
        case 'URGENT': score += 10; break;
        case 'HIGH': score += 7; break;
        case 'NORMAL': score += 5; break;
        case 'LOW': score += 2; break;
      }
      
      return Math.min(score, 100);
    });

    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Cache simple en memoria (para producción usar Redis)
   */
  static cache = new Map();
  
  async getCachedMetrics(cacheKey, calculationFunction, ttlMinutes = 5) {
    try {
      const cached = ConversationMetricsService.cache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < (ttlMinutes * 60 * 1000)) {
        return cached.data;
      }

      const freshData = await calculationFunction();
      
      ConversationMetricsService.cache.set(cacheKey, {
        data: freshData,
        timestamp: Date.now()
      });

      return freshData;

    } catch (error) {
      logger.error('Error with cached metrics:', error);
      return await calculationFunction(); // Fallback sin caché
    }
  }

  /**
   * Limpiar caché periódicamente
   */
  static clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of ConversationMetricsService.cache.entries()) {
      if (now - value.timestamp > 10 * 60 * 1000) { // 10 minutos
        ConversationMetricsService.cache.delete(key);
      }
    }
  }
}

// Limpiar caché cada 10 minutos
setInterval(() => {
  ConversationMetricsService.clearExpiredCache();
}, 10 * 60 * 1000);

module.exports = new ConversationMetricsService();