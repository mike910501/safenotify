const express = require('express');
const { rateLimits } = require('../middleware/auth');
const messageService = require('../services/messageService');
const twilioService = require('../config/twilio');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @route POST /api/webhooks/twilio
 * @desc Handle Twilio webhook for message status updates
 * @access Public (but validated with Twilio signature)
 */
router.post('/twilio',
  rateLimits.webhook,
  express.urlencoded({ extended: false }), // Twilio sends form-encoded data
  async (req, res) => {
    try {
      const signature = req.headers['x-twilio-signature'];
      const url = `${process.env.WEBHOOK_BASE_URL}/api/webhooks/twilio`;
      
      // Validate Twilio webhook signature
      const isValid = twilioService.validateWebhookSignature(signature, url, req.body);
      
      if (!isValid && process.env.NODE_ENV === 'production') {
        logger.security('Invalid Twilio webhook signature', {
          ip: req.ip,
          signature: signature?.substring(0, 20) + '...',
          userAgent: req.get('User-Agent')
        });
        
        return res.status(403).json({
          success: false,
          error: 'Invalid signature'
        });
      }

      const {
        MessageSid,
        MessageStatus,
        ErrorCode,
        ErrorMessage,
        From,
        To,
        Body,
        AccountSid
      } = req.body;

      // Log webhook reception
      logger.message(MessageSid, 'webhook_received', {
        status: MessageStatus,
        from: From,
        to: '[REDACTED]', // Don't log full phone numbers
        errorCode: ErrorCode,
        errorMessage: ErrorMessage
      });

      // Update message status in database
      const updated = await messageService.updateMessageStatus(MessageSid, {
        MessageSid,
        MessageStatus,
        ErrorCode,
        ErrorMessage,
        From,
        To,
        Body,
        AccountSid,
        timestamp: new Date().toISOString()
      });

      if (!updated) {
        logger.warn('Webhook received for unknown message', {
          messageSid: MessageSid,
          status: MessageStatus
        });
      }

      // Twilio expects a 200 response
      res.status(200).send('OK');

    } catch (error) {
      logger.error('Webhook processing failed', {
        error: error.message,
        messageSid: req.body?.MessageSid,
        status: req.body?.MessageStatus,
        ip: req.ip
      });

      // Still return 200 to prevent Twilio retries for unrecoverable errors
      res.status(200).send('ERROR');
    }
  }
);

/**
 * @route GET /api/webhooks/twilio/test
 * @desc Test webhook endpoint (development only)
 * @access Public in development
 */
router.get('/twilio/test', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
  }

  res.json({
    success: true,
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    headers: req.headers,
    query: req.query
  });
});

/**
 * @route POST /api/webhooks/twilio/simulate
 * @desc Simulate webhook for testing (development only)
 * @access Public in development
 */
router.post('/twilio/simulate',
  express.json(),
  async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: 'Not found'
      });
    }

    try {
      const {
        MessageSid,
        MessageStatus = 'delivered',
        ErrorCode,
        ErrorMessage,
        From = process.env.TWILIO_WHATSAPP_NUMBER,
        To = '+573001234567'
      } = req.body;

      if (!MessageSid) {
        return res.status(400).json({
          success: false,
          error: 'MessageSid is required'
        });
      }

      const webhookData = {
        MessageSid,
        MessageStatus,
        ErrorCode,
        ErrorMessage,
        From,
        To,
        AccountSid: process.env.TWILIO_ACCOUNT_SID,
        timestamp: new Date().toISOString()
      };

      const updated = await messageService.updateMessageStatus(MessageSid, webhookData);

      res.json({
        success: true,
        message: 'Webhook simulated successfully',
        data: {
          messageSid: MessageSid,
          status: MessageStatus,
          updated
        }
      });

    } catch (error) {
      logger.error('Webhook simulation failed', {
        error: error.message,
        body: req.body
      });

      res.status(400).json({
        success: false,
        error: error.message || 'Webhook simulation failed'
      });
    }
  }
);

/**
 * @route GET /api/webhooks/health
 * @desc Health check for webhook infrastructure
 * @access Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'SafeNotify Webhook Service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      twilio: '/api/webhooks/twilio',
      test: process.env.NODE_ENV !== 'production' ? '/api/webhooks/twilio/test' : null
    }
  });
});

module.exports = router;