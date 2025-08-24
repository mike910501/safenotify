const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const twilioService = require('../config/twilio');
const campaignService = require('./campaignService');
const logger = require('../config/logger');

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
    const messages = [];
    const metadata = campaign.metadata || {};
    const variableMappings = metadata.variableMappings || {};
    const defaultValues = metadata.defaultValues || {};

    campaign.csvData.forEach((contact, index) => {
      try {
        // Build template variables
        const templateVariables = {};
        
        // Map CSV columns to template variables
        Object.entries(variableMappings).forEach(([templateVar, csvColumn]) => {
          if (contact[csvColumn]) {
            templateVariables[templateVar] = contact[csvColumn];
          }
        });

        // Add default values for missing variables
        Object.entries(defaultValues).forEach(([templateVar, defaultValue]) => {
          if (!templateVariables[templateVar] && defaultValue) {
            templateVariables[templateVar] = defaultValue;
          }
        });

        // Validate phone number
        if (!contact.telefono) {
          throw new Error('Missing phone number');
        }

        messages.push({
          to: contact.telefono,
          contentSid: campaign.template_sid,
          contentVariables: templateVariables,
          contactData: {
            ...contact,
            originalRow: index + 1
          },
          valid: true
        });

      } catch (error) {
        logger.warn('Invalid contact data', {
          campaignId: campaign.id,
          contactIndex: index,
          error: error.message,
          contact: { ...contact, telefono: '[REDACTED]' }
        });

        messages.push({
          to: contact.telefono || 'unknown',
          contentSid: campaign.template_sid,
          contentVariables: {},
          contactData: {
            ...contact,
            originalRow: index + 1
          },
          valid: false,
          error: error.message
        });
      }
    });

    return messages;
  }

  async processMessageResults(campaignId, results) {
    const messageInserts = [];

    for (const result of results) {
      const messageId = uuidv4();
      
      try {
        // Insert message log
        await db.run(`
          INSERT INTO message_logs (
            id, campaign_id, phone_number, message_sid, template_variables,
            status, sent_at, error_message, attempts
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          messageId,
          campaignId,
          result.to,
          result.messageSid || null,
          JSON.stringify(result.contentVariables || {}),
          result.success ? 'sent' : 'failed',
          new Date().toISOString(),
          result.error || null,
          1
        ]);

        if (result.success) {
          logger.message(result.messageSid, 'sent', {
            campaignId,
            to: result.to,
            contactRow: result.contactData?.originalRow
          });
        } else {
          logger.message(messageId, 'failed', {
            campaignId,
            to: result.to,
            error: result.error,
            contactRow: result.contactData?.originalRow
          });
        }

      } catch (error) {
        logger.error('Failed to log message result', {
          campaignId,
          messageId,
          error: error.message
        });
      }
    }

    return messageInserts.length;
  }

  async updateMessageStatus(messageSid, webhookData) {
    try {
      const status = webhookData.MessageStatus;
      const errorCode = webhookData.ErrorCode;
      const errorMessage = webhookData.ErrorMessage;

      // Update message log
      const updateResult = await db.run(`
        UPDATE message_logs 
        SET status = ?, delivered_at = ?, error_message = ?, webhook_data = ?
        WHERE message_sid = ?
      `, [
        status,
        status === 'delivered' ? new Date().toISOString() : null,
        errorMessage || null,
        JSON.stringify(webhookData),
        messageSid
      ]);

      if (updateResult.changes > 0) {
        logger.message(messageSid, 'status_updated', {
          newStatus: status,
          errorCode,
          errorMessage
        });

        // Log to audit table for important status changes
        if (['delivered', 'failed', 'undelivered'].includes(status)) {
          await db.run(`
            INSERT INTO audit_logs (action, resource_type, resource_id, details)
            VALUES (?, ?, ?, ?)
          `, [
            'message_status_updated',
            'message',
            messageSid,
            JSON.stringify({
              status,
              errorCode,
              errorMessage,
              timestamp: new Date().toISOString()
            })
          ]);
        }

        return true;
      } else {
        logger.warn('Message SID not found for status update', {
          messageSid,
          status,
          errorCode
        });
        return false;
      }

    } catch (error) {
      logger.error('Failed to update message status', {
        messageSid,
        error: error.message,
        webhookData
      });
      throw error;
    }
  }

  async getMessageStatus(messageSid) {
    try {
      const message = await db.get(
        'SELECT * FROM message_logs WHERE message_sid = ?',
        [messageSid]
      );

      if (!message) {
        throw new Error('Message not found');
      }

      // Get additional status from Twilio if needed
      const twilioStatus = await twilioService.getMessageStatus(messageSid);

      return {
        id: message.id,
        campaignId: message.campaign_id,
        phoneNumber: message.phone_number,
        messageSid: message.message_sid,
        status: message.status,
        sentAt: message.sent_at,
        deliveredAt: message.delivered_at,
        errorMessage: message.error_message,
        attempts: message.attempts,
        twilioStatus,
        webhookData: message.webhook_data ? JSON.parse(message.webhook_data) : null
      };

    } catch (error) {
      logger.error('Failed to get message status', {
        messageSid,
        error: error.message
      });
      throw error;
    }
  }

  async getCampaignMessages(campaignId, options = {}) {
    const { status, limit = 100, offset = 0 } = options;

    let query = `
      SELECT id, phone_number, message_sid, status, sent_at, delivered_at, 
             error_message, attempts, template_variables
      FROM message_logs 
      WHERE campaign_id = ?
    `;
    
    const params = [campaignId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY sent_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const messages = await db.all(query, params);

    return messages.map(message => ({
      ...message,
      templateVariables: JSON.parse(message.template_variables || '{}'),
      phoneNumber: '[REDACTED]' // Don't expose full phone numbers in API
    }));
  }

  async retryFailedMessages(campaignId, maxRetries = 3) {
    try {
      // Get failed messages that haven't exceeded retry limit
      const failedMessages = await db.all(`
        SELECT * FROM message_logs 
        WHERE campaign_id = ? AND status = 'failed' AND attempts < ?
      `, [campaignId, maxRetries]);

      if (failedMessages.length === 0) {
        return {
          success: true,
          message: 'No messages to retry',
          retriedCount: 0
        };
      }

      logger.campaign(campaignId, 'retrying_failed_messages', {
        messageCount: failedMessages.length
      });

      let successCount = 0;
      let stillFailedCount = 0;

      for (const message of failedMessages) {
        try {
          const templateVariables = JSON.parse(message.template_variables || '{}');
          const result = await twilioService.sendTemplateMessage(
            message.phone_number,
            (await campaignService.getCampaignMetadata(campaignId)).template_sid,
            templateVariables
          );

          // Update message log
          if (result.success) {
            await db.run(`
              UPDATE message_logs 
              SET status = 'sent', message_sid = ?, attempts = attempts + 1,
                  sent_at = ?, error_message = NULL
              WHERE id = ?
            `, [result.messageSid, new Date().toISOString(), message.id]);
            successCount++;
          } else {
            await db.run(`
              UPDATE message_logs 
              SET attempts = attempts + 1, error_message = ?
              WHERE id = ?
            `, [result.error, message.id]);
            stillFailedCount++;
          }

        } catch (error) {
          logger.error('Failed to retry message', {
            campaignId,
            messageId: message.id,
            error: error.message
          });
          stillFailedCount++;
        }

        // Rate limiting between retries
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.campaign(campaignId, 'retry_completed', {
        totalRetried: failedMessages.length,
        successful: successCount,
        stillFailed: stillFailedCount
      });

      return {
        success: true,
        retriedCount: failedMessages.length,
        successful: successCount,
        stillFailed: stillFailedCount
      };

    } catch (error) {
      logger.error('Failed to retry failed messages', {
        campaignId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new MessageService();