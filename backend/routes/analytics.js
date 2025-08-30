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
      usage: parseFloat(item.usage_percentage) || 0,
      color: chartColors[index % chartColors.length]
    }));

    // Formatear datos diarios para el gráfico
    const formattedDailyMessages = dailyMessages.reverse().map(day => ({
      date: new Date(day.date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' }),
      sent: parseInt(day.sent),
      delivered: parseInt(day.delivered),
      failed: parseInt(day.failed)
    }));

    // Formatear performance de campañas
    const formattedCampaignPerformance = campaignPerformance.map(camp => ({
      name: camp.name.substring(0, 20) + (camp.name.length > 20 ? '...' : ''),
      sent: parseInt(camp.sent),
      delivered: parseInt(camp.delivered),
      deliveryRate: parseFloat(camp.delivery_rate) || 0
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

module.exports = router;