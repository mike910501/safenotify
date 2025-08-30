const express = require('express');
const twilio = require('twilio');
const sofiaAIService = require('../services/sofiaAIService');
const safenotifyContentService = require('../services/safenotifyContentService'); // We'll create this next

const router = express.Router();

// Twilio client from environment
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Sofia Sales Webhook - Dedicated endpoint for SafeNotify sales number
 * Route: POST /api/webhooks/sofia-sales
 * Purpose: Handle incoming WhatsApp messages for SafeNotify sales
 */
router.post('/sofia-sales',
  express.urlencoded({ extended: false }), // Twilio sends form-encoded data
  async (req, res) => {
    try {
      console.log('📞 Sofia Sales Webhook triggered');
      
      const {
        From,
        To,
        Body,
        MessageSid,
        AccountSid,
        NumMedia,
        MediaUrl0,
        MediaContentType0
      } = req.body;

      // Log incoming message (privacy-compliant)
      console.log('📨 Incoming message:');
      console.log('  From:', From?.substring(0, 12) + '***');
      console.log('  To:', To);
      console.log('  Message:', Body?.substring(0, 50) + '...');
      console.log('  SID:', MessageSid);

      // Validate this is for Sofia's sales number
      const salesNumber = process.env.SOFIA_SALES_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;
      if (To !== `whatsapp:${salesNumber}`) {
        console.log('❌ Message not for Sofia sales number, ignoring');
        return res.status(200).send('OK');
      }

      // Extract phone number (remove whatsapp: prefix)
      const phoneNumber = From?.replace('whatsapp:', '');
      if (!phoneNumber || !Body) {
        console.log('❌ Missing phone number or message body');
        return res.status(400).json({ error: 'Missing required data' });
      }

      // Check if this is an incoming message (not sent by us)
      if (Body.toLowerCase().includes('safenotify') && req.body.Direction === 'outbound-reply') {
        console.log('🔄 Outbound message, skipping AI processing');
        return res.status(200).send('OK');
      }

      // Rate limiting check - max 10 messages per minute per number
      const rateLimit = await checkRateLimit(phoneNumber);
      if (!rateLimit.allowed) {
        console.log('🚫 Rate limit exceeded for:', phoneNumber.substring(0, 8) + '***');
        return res.status(429).json({ error: 'Rate limit exceeded' });
      }

      // Process with Sofia AI
      console.log('🤖 Processing with Sofia AI...');
      const aiResponse = await sofiaAIService.processProspectMessage(
        phoneNumber,
        Body,
        MessageSid
      );

      if (!aiResponse.success) {
        console.error('❌ Sofia AI processing failed:', aiResponse.error);
        // Send fallback message
        await sendWhatsAppMessage(phoneNumber, "Disculpa, tuve un problema técnico. Soy Sofia de SafeNotify, ¿en qué puedo ayudarte?");
        return res.status(200).send('OK');
      }

      // Send Sofia's response
      if (aiResponse.response) {
        const messageSent = await sendWhatsAppMessage(phoneNumber, aiResponse.response);
        
        if (messageSent.success) {
          console.log('✅ Sofia response sent:', messageSent.sid);
        } else {
          console.error('❌ Failed to send Sofia response:', messageSent.error);
        }
      }

      // Send multimedia content if required
      if (aiResponse.shouldSendContent && aiResponse.contentToSend) {
        console.log('📎 Sending multimedia content:', aiResponse.contentToSend);
        
        // We'll implement this in the content service
        try {
          if (typeof safenotifyContentService.sendContent === 'function') {
            await safenotifyContentService.sendContent(
              phoneNumber, 
              aiResponse.contentToSend,
              aiResponse.nextStep
            );
          }
        } catch (contentError) {
          console.error('❌ Error sending content:', contentError.message);
          // Don't fail the main flow for content issues
        }
      }

      // Handle high-value leads (handoff to sales team)
      if (aiResponse.handoffRequired || aiResponse.leadScore >= 70) {
        console.log('🚨 HIGH VALUE LEAD - Notifying sales team');
        await notifySalesTeam(phoneNumber, aiResponse.leadScore, aiResponse.nextStep);
      }

      // Log successful processing
      console.log('✅ Sofia sales webhook processed successfully');
      console.log('📊 Lead Score:', aiResponse.leadScore);
      console.log('📋 Next Step:', aiResponse.nextStep);

      // Twilio expects 200 OK
      res.status(200).send('OK');

    } catch (error) {
      console.error('❌ Sofia webhook error:', error);
      
      // Try to send error recovery message
      try {
        if (req.body.From) {
          const phoneNumber = req.body.From.replace('whatsapp:', '');
          await sendWhatsAppMessage(
            phoneNumber, 
            "Disculpa, tuve un problema técnico. Soy Sofia de SafeNotify, ¿podrías repetir tu consulta?"
          );
        }
      } catch (recoveryError) {
        console.error('❌ Recovery message failed:', recoveryError.message);
      }

      // Always return 200 to prevent Twilio retries
      res.status(200).send('ERROR');
    }
  }
);

/**
 * Send WhatsApp message via Twilio
 */
async function sendWhatsAppMessage(phoneNumber, message, mediaUrl = null) {
  try {
    const salesNumber = process.env.SOFIA_SALES_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;
    
    const messageData = {
      from: `whatsapp:${salesNumber}`,
      to: `whatsapp:${phoneNumber}`,
      body: message
    };

    // Add media if provided
    if (mediaUrl) {
      messageData.mediaUrl = [mediaUrl];
    }

    const twilioMessage = await client.messages.create(messageData);

    console.log('📤 WhatsApp message sent via Sofia webhook:', twilioMessage.sid);

    return {
      success: true,
      sid: twilioMessage.sid,
      status: twilioMessage.status
    };

  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Rate limiting per phone number
 */
const messageCounters = new Map();

async function checkRateLimit(phoneNumber) {
  const now = Date.now();
  const minute = Math.floor(now / 60000); // Current minute
  const key = `${phoneNumber}_${minute}`;

  const currentCount = messageCounters.get(key) || 0;
  const maxMessages = 10; // Max 10 messages per minute

  if (currentCount >= maxMessages) {
    return { allowed: false, count: currentCount };
  }

  messageCounters.set(key, currentCount + 1);

  // Cleanup old counters (older than 2 minutes)
  for (const [mapKey] of messageCounters.entries()) {
    const [, keyMinute] = mapKey.split('_');
    if (parseInt(keyMinute) < minute - 2) {
      messageCounters.delete(mapKey);
    }
  }

  return { allowed: true, count: currentCount + 1 };
}

/**
 * Notify sales team of high-value leads
 */
async function notifySalesTeam(phoneNumber, leadScore, conversationStep) {
  try {
    console.log('🔔 Notifying sales team of hot lead');
    
    // Send notification to sales team WhatsApp/Slack
    const salesNotificationNumber = process.env.SALES_TEAM_WHATSAPP;
    if (salesNotificationNumber) {
      const notification = `🚨 HOT LEAD ALERT!
      
📱 Prospect: ${phoneNumber.substring(0, 8)}***
📊 Score: ${leadScore}/100 
📋 Stage: ${conversationStep}
🤖 Sofia: Lead ready for human handoff
      
👋 Reach out ASAP for best conversion rate.`;

      await sendWhatsAppMessage(salesNotificationNumber, notification);
    }

    // TODO: Send email notification
    // TODO: Create task in CRM
    // TODO: Slack notification

    console.log('✅ Sales team notified successfully');

  } catch (error) {
    console.error('❌ Error notifying sales team:', error);
    // Don't throw - this shouldn't break the main flow
  }
}

/**
 * Test endpoint for development
 */
router.post('/sofia-sales/test', 
  express.json(),
  async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }

    try {
      const { phoneNumber, message } = req.body;

      if (!phoneNumber || !message) {
        return res.status(400).json({ error: 'phoneNumber and message are required' });
      }

      console.log('🧪 Testing Sofia AI with:', phoneNumber.substring(0, 8) + '***');

      const response = await sofiaAIService.processProspectMessage(phoneNumber, message);

      res.json({
        success: true,
        aiResponse: response,
        testMode: true,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Sofia test error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Health check for Sofia webhook
 */
router.get('/sofia-sales/health', (req, res) => {
  res.json({
    success: true,
    service: 'Sofia Sales Webhook',
    status: 'healthy',
    personality: sofiaAIService.SOFIA_PERSONALITY.name,
    timestamp: new Date().toISOString(),
    features: [
      'SafeNotify lead qualification',
      'Medical specialty scoring',
      'Compliance risk education',
      'ROI calculation',
      'Demo scheduling',
      'Sales team handoff'
    ]
  });
});

/**
 * Get Sofia conversation states (for debugging)
 */
router.get('/sofia-sales/states', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json({
    success: true,
    conversationStates: sofiaAIService.CONVERSATION_STATES,
    qualifyingQuestions: sofiaAIService.QUALIFYING_QUESTIONS,
    personality: sofiaAIService.SOFIA_PERSONALITY
  });
});

/**
 * Handle message status updates from Twilio
 */
router.post('/sofia-sales/status',
  express.urlencoded({ extended: false }),
  async (req, res) => {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

      console.log('📋 Sofia message status update:');
      console.log('  SID:', MessageSid);
      console.log('  Status:', MessageStatus);
      console.log('  Error:', ErrorCode, ErrorMessage);

      // TODO: Update message status in database
      // TODO: Handle failed messages
      // TODO: Retry logic for failed messages

      res.status(200).send('OK');

    } catch (error) {
      console.error('❌ Sofia status update error:', error);
      res.status(200).send('ERROR');
    }
  }
);

module.exports = router;