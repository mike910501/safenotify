/**
 * GPT Usage Tracker Service
 * Tracks token usage, costs and sends email notifications
 */

const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

/**
 * Model pricing per 1K tokens (input cost approximation)
 */
const MODEL_COSTS = {
  'gpt-4o': 0.005,
  'gpt-3.5-turbo': 0.0005,
  'gpt-4o-mini': 0.00015,
  'gpt-4': 0.03
};

/**
 * Track GPT usage with detailed metrics
 * @param {Object} usageData - Usage tracking data
 * @returns {Object} - Saved usage record
 */
async function trackGPTUsage(usageData) {
  try {
    const {
      leadId,
      phone,
      conversationId,
      model,
      tokensUsed,
      intent,
      leadScore,
      responseType = 'conversation',
      responseTime,
      success = true,
      errorMessage,
      leadValueBefore,
      leadValueAfter,
      conversionEvent
    } = usageData;

    // Calculate estimated cost
    const estimatedCost = (tokensUsed / 1000) * (MODEL_COSTS[model] || 0.001);

    // Save to database
    const usage = await prisma.gPTUsage.create({
      data: {
        leadId,
        phone,
        conversationId,
        model,
        tokensUsed,
        estimatedCost,
        intent,
        leadScore,
        responseType,
        responseTime,
        success,
        errorMessage,
        leadValueBefore,
        leadValueAfter,
        conversionEvent
      }
    });

    console.log(`📊 GPT Usage tracked: ${model} - ${tokensUsed} tokens - $${estimatedCost.toFixed(4)}`);

    // Send email notification if significant usage or high-value event
    if (shouldSendNotification(usage)) {
      await sendUsageNotification(usage);
    }

    return usage;

  } catch (error) {
    console.error('❌ Error tracking GPT usage:', error);
    // Don't fail the main process if tracking fails
    return null;
  }
}

/**
 * Determine if usage warrants email notification
 * @param {Object} usage - Usage record
 * @returns {Boolean} - Should send notification
 */
function shouldSendNotification(usage) {
  const triggers = [
    // High token usage (>500 tokens)
    usage.tokensUsed > 500,
    
    // High cost (>$0.01)
    usage.estimatedCost > 0.01,
    
    // Premium model usage
    usage.model === 'gpt-4o' || usage.model === 'gpt-4',
    
    // High-value lead interactions (score >70)
    usage.leadScore > 70,
    
    // Conversion events
    usage.conversionEvent,
    
    // Errors
    !usage.success
  ];

  return triggers.some(trigger => trigger);
}

/**
 * Send email notification about GPT usage
 * @param {Object} usage - Usage record
 */
async function sendUsageNotification(usage) {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || 'informacion@safenotify.co',
        pass: process.env.SMTP_PASS
      },
      requireTLS: true,
      tls: {
        rejectUnauthorized: false
      }
    });

    // Determine notification type
    const notificationType = getNotificationType(usage);
    
    const emailContent = generateEmailContent(usage, notificationType);

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: 'mikehuertas91@gmail.com',
      subject: `🤖 ${notificationType.title} - GPT Usage Alert`,
      html: emailContent
    });

    console.log('✅ GPT usage notification sent:', notificationType.title);

  } catch (error) {
    console.error('❌ Error sending GPT usage notification:', error);
  }
}

/**
 * Determine notification type based on usage
 * @param {Object} usage - Usage record
 * @returns {Object} - Notification type info
 */
function getNotificationType(usage) {
  if (!usage.success) {
    return { title: 'ERROR GPT', priority: 'high', emoji: '🚨' };
  }
  
  if (usage.conversionEvent) {
    return { title: 'CONVERSIÓN', priority: 'high', emoji: '🎯' };
  }
  
  if (usage.leadScore > 70) {
    return { title: 'LEAD HOT', priority: 'medium', emoji: '🔥' };
  }
  
  if (usage.estimatedCost > 0.01) {
    return { title: 'ALTO COSTO', priority: 'medium', emoji: '💰' };
  }
  
  if (usage.model === 'gpt-4o' || usage.model === 'gpt-4') {
    return { title: 'PREMIUM MODEL', priority: 'low', emoji: '⭐' };
  }
  
  return { title: 'USAGE ALERT', priority: 'low', emoji: '📊' };
}

/**
 * Generate email content for usage notification
 * @param {Object} usage - Usage record
 * @param {Object} type - Notification type
 * @returns {String} - HTML email content
 */
function generateEmailContent(usage, type) {
  const timestamp = new Date(usage.createdAt).toLocaleString('es-CO', { 
    timeZone: 'America/Bogota',
    dateStyle: 'short',
    timeStyle: 'medium'
  });

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">${type.emoji} ${type.title} - SafeNotify GPT</h2>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3>📊 Métricas de Uso</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>🤖 Modelo:</strong> ${usage.model}</li>
          <li><strong>🔢 Tokens:</strong> ${usage.tokensUsed.toLocaleString()}</li>
          <li><strong>💵 Costo:</strong> $${usage.estimatedCost.toFixed(4)}</li>
          <li><strong>📱 Teléfono:</strong> ${usage.phone}</li>
          <li><strong>🎯 Intent:</strong> ${usage.intent || 'N/A'}</li>
          <li><strong>📈 Lead Score:</strong> ${usage.leadScore || 'N/A'}</li>
          <li><strong>⏰ Timestamp:</strong> ${timestamp}</li>
        </ul>
      </div>

      ${usage.conversionEvent ? `
        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>🎉 Evento de Conversión</h3>
          <p><strong>${usage.conversionEvent}</strong></p>
        </div>
      ` : ''}

      ${!usage.success ? `
        <div style="background: #ffe8e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3>❌ Error</h3>
          <p>${usage.errorMessage}</p>
        </div>
      ` : ''}

      <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3>📋 Detalles Técnicos</h3>
        <ul style="list-style: none; padding: 0;">
          <li><strong>Tipo Respuesta:</strong> ${usage.responseType}</li>
          <li><strong>Tiempo Respuesta:</strong> ${usage.responseTime ? `${usage.responseTime.toFixed(2)}s` : 'N/A'}</li>
          <li><strong>Lead ID:</strong> ${usage.leadId || 'N/A'}</li>
          <li><strong>Conversación ID:</strong> ${usage.conversationId || 'N/A'}</li>
        </ul>
      </div>

      <p style="color: #666; font-size: 12px;">
        🤖 Generated with SafeNotify AI Monitoring System<br>
        Timestamp: ${timestamp}
      </p>
    </div>
  `;
}

/**
 * Get usage statistics for a period
 * @param {String} period - 'today', 'week', 'month'
 * @returns {Object} - Usage statistics
 */
async function getUsageStats(period = 'today') {
  try {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    const usage = await prisma.gPTUsage.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      }
    });

    // Calculate statistics
    const totalTokens = usage.reduce((sum, u) => sum + u.tokensUsed, 0);
    const totalCost = usage.reduce((sum, u) => sum + u.estimatedCost, 0);
    const modelBreakdown = usage.reduce((acc, u) => {
      acc[u.model] = (acc[u.model] || 0) + u.tokensUsed;
      return acc;
    }, {});

    return {
      period,
      totalRequests: usage.length,
      totalTokens,
      totalCost,
      modelBreakdown,
      averageTokensPerRequest: usage.length ? Math.round(totalTokens / usage.length) : 0,
      successRate: usage.length ? (usage.filter(u => u.success).length / usage.length * 100) : 100
    };

  } catch (error) {
    console.error('❌ Error getting usage stats:', error);
    return null;
  }
}

module.exports = {
  trackGPTUsage,
  getUsageStats,
  sendUsageNotification
};