const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const twilioService = require('../config/twilio');
const campaignService = require('../campaignService');
const logger = require('../config/logger');
const prisma = require('../db');

class MessageService {
  async sendCampaignMessages(campaignId) {
    try {
      // Get campaign data
      const campaign = await campaignService.getCampaign(campaignId);
      
      if (campaign.status === 'sending') {
        throw new Error('Campaign is already being sent');
      }
      
      if (campaign.status === 'completed') {
        throw new Error('Campaign has already been sent');
      }

      // Update campaign status to sending
      await campaignService.updateCampaignStatus(campaignId, 'sending', {
        sent_at: new Date().toISOString()
      });

      logger.campaign(campaignId, 'sending_started', {
        totalContacts: campaign.csvData.length,
        templateSid: campaign.template_sid
      });

      // Prepare messages
      const messages = this.prepareMessages(campaign);
      
      // Log message preparation
      logger.campaign(campaignId, 'messages_prepared', {
        totalMessages: messages.length,
        validMessages: messages.filter(m => m.valid).length,
        invalidMessages: messages.filter(m => !m.valid).length
      });

      // Send messages with rate limiting
      const ratePerSecond = parseFloat(process.env.MESSAGE_RATE_LIMIT_PER_SECOND) || 1;
      const results = await twilioService.rateLimitedSend(messages, ratePerSecond);

      // Process results and log to database
      await this.processMessageResults(campaignId, results);

      // Update campaign status
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      await campaignService.updateCampaignStatus(campaignId, 'completed', {
        completed_at: new Date().toISOString()
      });

      logger.campaign(campaignId, 'sending_completed', {
        totalSent: results.length,
        successful: successCount,
        failed: failureCount
      });

      // Log to audit table
      await db.run(`
        INSERT INTO audit_logs (action, resource_type, resource_id, details)
        VALUES (?, ?, ?, ?)
      `, [
        'campaign_sent',
        'campaign',
        campaignId,
        JSON.stringify({
          totalSent: results.length,
          successful: successCount,
          failed: failureCount,
          completedAt: new Date().toISOString()
        })
      ]);

      return {
        success: true,
        campaignId,
        totalSent: results.length,
        successful: successCount,
        failed: failureCount,
        details: results
      };

    } catch (error) {
      logger.error('Failed to send campaign messages', {
        campaignId,
        error: error.message
      });

      // Update campaign status to failed
      await campaignService.updateCampaignStatus(campaignId, 'failed').catch(() => {});

      throw error;
    }
  }

  prepareMessages(campaign) {
    if (!campaign || !campaign.csvData || !Array.isArray(campaign.csvData)) {
      return [];
    }

    return campaign.csvData.map((contact, index) => {
      const messageId = uuidv4();
      
      try {
        // Validate phone number
        const phone = contact.telefono || contact.phone || contact.numero;
        if (!phone) {
          return {
            id: messageId,
            valid: false,
            error: 'No phone number provided',
            contact: contact
          };
        }

        // Format phone number (assuming Colombian format)
        const formattedPhone = this.formatPhoneNumber(phone);
        if (!formattedPhone) {
          return {
            id: messageId,
            valid: false,
            error: 'Invalid phone number format',
            contact: contact
          };
        }

        // Build message data
        const messageData = {
          id: messageId,
          to: formattedPhone,
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          templateSid: campaign.template_sid,
          contentSid: campaign.content_sid || null,
          variables: this.buildTemplateVariables(campaign.template, contact),
          valid: true,
          contact: contact,
          campaignId: campaign.id
        };

        return messageData;

      } catch (error) {
        logger.warn('Error preparing message', {
          index,
          error: error.message,
          contact: contact
        });

        return {
          id: messageId,
          valid: false,
          error: error.message,
          contact: contact
        };
      }
    });
  }

  formatPhoneNumber(phone) {
    // Remove all non-numeric characters
    const cleaned = phone.toString().replace(/\D/g, '');
    
    // Colombian phone number validation and formatting
    if (cleaned.length === 10 && cleaned.startsWith('3')) {
      // Mobile number: 3XXXXXXXXX -> +573XXXXXXXXX
      return `+57${cleaned}`;
    } else if (cleaned.length === 12 && cleaned.startsWith('57')) {
      // Already has country code: 573XXXXXXXXX -> +573XXXXXXXXX
      return `+${cleaned}`;
    } else if (cleaned.length === 13 && cleaned.startsWith('573')) {
      // Already formatted: +573XXXXXXXXX
      return `+${cleaned}`;
    }
    
    return null; // Invalid format
  }

  buildTemplateVariables(template, contact) {
    if (!template || !template.variables) {
      return {};
    }

    const variables = {};
    
    template.variables.forEach((variable, index) => {
      const variableKey = (index + 1).toString(); // Twilio uses 1-based indexing
      
      // Try to find the value in the contact data
      let value = contact[variable.toLowerCase()] || 
                  contact[variable] || 
                  contact[variable.toUpperCase()] ||
                  `[${variable}]`; // Fallback placeholder

      variables[variableKey] = value.toString();
    });

    return variables;
  }

  async processMessageResults(campaignId, results) {
    const messageInserts = [];

    for (const result of results) {
      try {
        const insertData = [
          result.id,
          campaignId,
          result.to,
          result.success ? 'sent' : 'failed',
          result.messageSid || null,
          result.error || null,
          new Date().toISOString(),
          result.success ? null : new Date().toISOString(),
          JSON.stringify({
            variables: result.variables,
            templateSid: result.templateSid,
            contentSid: result.contentSid,
            twilioResponse: result.twilioResponse
          })
        ];

        messageInserts.push(insertData);

      } catch (error) {
        logger.error('Error processing message result', {
          result: result,
          error: error.message
        });
      }
    }

    // Batch insert message logs
    if (messageInserts.length > 0) {
      const placeholders = messageInserts.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
      const flatData = messageInserts.flat();

      await db.run(`
        INSERT INTO message_logs (
          id, campaign_id, phone, status, message_sid, 
          error_message, sent_at, delivered_at, metadata
        ) VALUES ${placeholders}
      `, flatData);
    }

    return messageInserts.length;
  }

  async updateMessageStatus(messageSid, webhookData) {
    try {
      const status = webhookData.MessageStatus;
      const errorCode = webhookData.ErrorCode;
      const errorMessage = webhookData.ErrorMessage;

      // Set delivery timestamp for delivered status
      const deliveredAt = status === 'delivered' ? new Date() : null;

      // Update message log using Prisma for better consistency
      const updatedMessage = await prisma.messageLog.updateMany({
        where: {
          messageSid: messageSid
        },
        data: {
          status: status,
          deliveredAt: deliveredAt,
          error: errorMessage || null
        }
      });

      if (updatedMessage.count > 0) {
        logger.message(messageSid, 'status_updated', {
          newStatus: status,
          deliveredAt: deliveredAt,
          errorCode: errorCode
        });

        return true;
      } else {
        logger.warn('Message not found for status update', {
          messageSid: messageSid,
          status: status
        });
        
        return false;
      }

    } catch (error) {
      logger.error('Failed to update message status', {
        messageSid: messageSid,
        error: error.message,
        webhookData: webhookData
      });

      throw error;
    }
  }

  // New methods for enhanced webhook tracking
  async updateDeliveryTime(messageSid, deliveryTime) {
    try {
      const updated = await prisma.messageLog.updateMany({
        where: {
          messageSid: messageSid,
          status: 'delivered'
        },
        data: {
          deliveredAt: deliveryTime
        }
      });

      return updated.count > 0;
    } catch (error) {
      logger.error('Failed to update delivery time', {
        messageSid: messageSid,
        error: error.message
      });
      
      return false;
    }
  }

  async updateReadTime(messageSid, readTime) {
    try {
      const updated = await prisma.messageLog.updateMany({
        where: {
          messageSid: messageSid
        },
        data: {
          readAt: readTime
        }
      });

      return updated.count > 0;
    } catch (error) {
      logger.error('Failed to update read time', {
        messageSid: messageSid,
        error: error.message
      });
      
      return false;
    }
  }

  // Analytics helper methods
  async getMessageStats(userId, startDate, endDate) {
    try {
      const stats = await prisma.messageLog.groupBy({
        by: ['status'],
        where: {
          campaign: {
            userId: userId
          },
          sentAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: {
          status: true
        }
      });

      const result = {
        total: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        read: 0
      };

      stats.forEach(stat => {
        result[stat.status] = stat._count.status;
        result.total += stat._count.status;
      });

      return result;
    } catch (error) {
      logger.error('Failed to get message stats', {
        userId: userId,
        error: error.message
      });
      
      throw error;
    }
  }

  async getDailyMessageCounts(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const dailyStats = await prisma.$queryRaw`
        SELECT 
          DATE(sent_at) as date,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
        FROM message_logs ml
        JOIN campaigns c ON ml.campaign_id = c.id
        WHERE c.user_id = ${userId}
          AND ml.sent_at >= ${startDate}
        GROUP BY DATE(sent_at)
        ORDER BY DATE(sent_at) DESC
      `;

      return dailyStats;
    } catch (error) {
      logger.error('Failed to get daily message counts', {
        userId: userId,
        error: error.message
      });
      
      throw error;
    }
  }

  async validateMessage(messageData) {
    // Phone number validation
    if (!messageData.to || !this.isValidPhoneNumber(messageData.to)) {
      return {
        valid: false,
        error: 'Invalid phone number'
      };
    }

    // Template validation
    if (!messageData.templateSid && !messageData.contentSid) {
      return {
        valid: false,
        error: 'Template or content SID required'
      };
    }

    return {
      valid: true
    };
  }

  isValidPhoneNumber(phone) {
    // Basic WhatsApp phone number validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }

  async getMessageDeliveryRate(campaignId) {
    try {
      const stats = await prisma.messageLog.groupBy({
        by: ['status'],
        where: {
          campaignId: campaignId
        },
        _count: {
          status: true
        }
      });

      let total = 0;
      let delivered = 0;

      stats.forEach(stat => {
        total += stat._count.status;
        if (stat.status === 'delivered') {
          delivered += stat._count.status;
        }
      });

      return total > 0 ? (delivered / total) * 100 : 0;
    } catch (error) {
      logger.error('Failed to get delivery rate', {
        campaignId: campaignId,
        error: error.message
      });
      
      return 0;
    }
  }
}

module.exports = new MessageService();