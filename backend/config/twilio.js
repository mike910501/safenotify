const twilio = require('twilio');
const logger = require('./logger');

class TwilioService {
  constructor() {
    this.client = null;
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    this.initializeClient();
  }

  initializeClient() {
    try {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      // Test the connection
      this.validateConnection();
      
      logger.info('Twilio client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Twilio client:', error);
      throw new Error('Twilio configuration error');
    }
  }

  async validateConnection() {
    try {
      await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      logger.info('Twilio connection validated');
    } catch (error) {
      logger.error('Twilio connection validation failed:', error);
      throw new Error('Invalid Twilio credentials');
    }
  }

  async sendTemplateMessage(to, contentSid, contentVariables = {}) {
    try {
      // Validate phone number format
      const phoneNumber = this.formatPhoneNumber(to);
      
      logger.info('Sending WhatsApp template message', {
        to: phoneNumber,
        contentSid,
        variables: contentVariables
      });

      const message = await this.client.messages.create({
        from: this.whatsappNumber,
        to: `whatsapp:${phoneNumber}`,
        contentSid: contentSid,
        contentVariables: JSON.stringify(contentVariables)
      });

      logger.info('WhatsApp message sent successfully', {
        messageSid: message.sid,
        to: phoneNumber,
        status: message.status
      });

      return {
        success: true,
        messageSid: message.sid,
        status: message.status,
        to: phoneNumber
      };

    } catch (error) {
      logger.error('Failed to send WhatsApp message', {
        to,
        contentSid,
        error: error.message,
        code: error.code
      });

      return {
        success: false,
        error: error.message,
        code: error.code,
        to: this.formatPhoneNumber(to)
      };
    }
  }

  formatPhoneNumber(phoneNumber) {
    // Remove all non-numeric characters
    let formatted = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assume Colombia +57)
    if (!formatted.startsWith('57') && !formatted.startsWith('1')) {
      if (formatted.length === 10) {
        formatted = '57' + formatted;
      }
    }
    
    // Ensure it starts with +
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    
    return formatted;
  }

  async getMessageStatus(messageSid) {
    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        sid: message.sid,
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        dateSent: message.dateSent
      };
    } catch (error) {
      logger.error('Failed to fetch message status', {
        messageSid,
        error: error.message
      });
      throw error;
    }
  }

  async listAvailableTemplates() {
    try {
      // This would fetch from Twilio Content API in production
      // For now, return configured templates
      const templates = [
        {
          sid: process.env.TEMPLATE_APPOINTMENT_CONFIRMATION,
          name: 'Confirmación de Citas',
          variables: ['nombre', 'negocio', 'servicio', 'fecha', 'hora', 'ubicacion'],
          status: 'approved'
        },
        {
          sid: process.env.TEMPLATE_APPOINTMENT_REMINDER,
          name: 'Recordatorio de Citas',
          variables: ['nombre', 'negocio', 'servicio', 'fecha', 'hora', 'ubicacion'],
          status: 'approved'
        }
      ];

      return templates.filter(template => template.sid); // Only return configured templates
    } catch (error) {
      logger.error('Failed to list templates', { error: error.message });
      throw error;
    }
  }

  validateWebhookSignature(signature, url, body) {
    try {
      return twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        signature,
        url,
        body
      );
    } catch (error) {
      logger.error('Webhook signature validation failed', { error: error.message });
      return false;
    }
  }

  // Rate limiting helper
  async rateLimitedSend(messages, ratePerSecond = 1) {
    const delay = 1000 / ratePerSecond; // ms between messages
    const results = [];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      
      try {
        const result = await this.sendTemplateMessage(
          message.to,
          message.contentSid,
          message.contentVariables
        );
        
        results.push({
          ...result,
          index: i,
          contactData: message.contactData
        });

        // Wait before sending next message (except for last message)
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          index: i,
          to: message.to,
          contactData: message.contactData
        });
      }

      // Log progress every 10 messages
      if ((i + 1) % 10 === 0) {
        logger.info(`Sent ${i + 1}/${messages.length} messages`);
      }
    }

    return results;
  }
}

module.exports = new TwilioService();