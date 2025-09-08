/**
 * 🔔 PUBLIC API - WEBHOOKS ENDPOINTS
 * REST API endpoints for third-party integrations - Webhooks management
 */

const express = require('express');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { 
  authenticatePublicApi, 
  requireScopes, 
  rateLimitPublicApi,
  handlePublicApiError 
} = require('../../middleware/publicApiAuth');

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication and rate limiting to all routes
router.use(authenticatePublicApi);
router.use(rateLimitPublicApi);

// Available webhook events
const WEBHOOK_EVENTS = [
  'conversation.created',
  'conversation.updated',
  'message.received',
  'message.sent',
  'lead.created',
  'lead.qualified',
  'takeover.requested',
  'takeover.started',
  'takeover.ended',
  'agent.assigned',
  'conversation.completed'
];

/**
 * GET /v1/webhooks
 * List all webhooks for the authenticated user
 */
router.get('/', requireScopes(['webhooks:write']), async (req, res, next) => {
  try {
    // For now, we'll simulate webhook data since we don't have a webhooks table
    // In a real implementation, this would query the database
    
    const mockWebhooks = [
      {
        id: 'wh_example123',
        url: 'https://example.com/webhooks/safenotify',
        events: ['conversation.created', 'message.received'],
        secret: 'whsec_**********************',
        is_active: true,
        created_at: new Date().toISOString(),
        last_delivery: null,
        delivery_attempts: 0,
        last_response_status: null
      }
    ];

    res.json({
      data: mockWebhooks,
      total: mockWebhooks.length
    });

  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/webhooks
 * Create a new webhook subscription
 */
router.post('/', requireScopes(['webhooks:write']), async (req, res, next) => {
  try {
    const { url, events, secret } = req.body;

    // Validation
    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'MISSING_REQUIRED_FIELD',
          message: 'The field "url" is required and must be a valid URL'
        }
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'INVALID_URL_FORMAT',
          message: 'The URL must be a valid HTTP/HTTPS URL'
        }
      });
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'MISSING_REQUIRED_FIELD',
          message: 'The field "events" is required and must be a non-empty array'
        }
      });
    }

    // Validate events
    const invalidEvents = events.filter(event => !WEBHOOK_EVENTS.includes(event));
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'INVALID_WEBHOOK_EVENTS',
          message: `Invalid events: ${invalidEvents.join(', ')}. Valid events: ${WEBHOOK_EVENTS.join(', ')}`
        }
      });
    }

    // Generate webhook ID and secret if not provided
    const webhookId = `wh_${crypto.randomBytes(16).toString('hex')}`;
    const webhookSecret = secret || `whsec_${crypto.randomBytes(32).toString('hex')}`;

    // In a real implementation, this would be stored in a webhooks table
    const webhook = {
      id: webhookId,
      user_id: req.user.id,
      url: url,
      events: events,
      secret: webhookSecret,
      is_active: true,
      created_at: new Date().toISOString()
    };

    res.status(201).json({
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret,
      is_active: webhook.is_active,
      created_at: webhook.created_at
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/webhooks/{webhook_id}
 * Get a specific webhook
 */
router.get('/:webhookId', requireScopes(['webhooks:write']), async (req, res, next) => {
  try {
    const { webhookId } = req.params;

    // In a real implementation, this would query the database
    if (!webhookId.startsWith('wh_')) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'WEBHOOK_NOT_FOUND',
          message: 'Webhook not found or access denied'
        }
      });
    }

    const webhook = {
      id: webhookId,
      url: 'https://example.com/webhooks/safenotify',
      events: ['conversation.created', 'message.received'],
      secret: 'whsec_**********************',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      delivery_stats: {
        total_deliveries: 156,
        successful_deliveries: 148,
        failed_deliveries: 8,
        last_delivery_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        last_response_status: 200
      }
    };

    res.json(webhook);

  } catch (error) {
    next(error);
  }
});

/**
 * PUT /v1/webhooks/{webhook_id}
 * Update a webhook
 */
router.put('/:webhookId', requireScopes(['webhooks:write']), async (req, res, next) => {
  try {
    const { webhookId } = req.params;
    const { url, events, is_active } = req.body;

    // In a real implementation, check if webhook exists and belongs to user
    if (!webhookId.startsWith('wh_')) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'WEBHOOK_NOT_FOUND',
          message: 'Webhook not found or access denied'
        }
      });
    }

    // Validate URL if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        return res.status(400).json({
          error: {
            type: 'validation_error',
            code: 'INVALID_URL_FORMAT',
            message: 'The URL must be a valid HTTP/HTTPS URL'
          }
        });
      }
    }

    // Validate events if provided
    if (events) {
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
          error: {
            type: 'validation_error',
            code: 'INVALID_EVENTS_FORMAT',
            message: 'Events must be a non-empty array'
          }
        });
      }

      const invalidEvents = events.filter(event => !WEBHOOK_EVENTS.includes(event));
      if (invalidEvents.length > 0) {
        return res.status(400).json({
          error: {
            type: 'validation_error',
            code: 'INVALID_WEBHOOK_EVENTS',
            message: `Invalid events: ${invalidEvents.join(', ')}. Valid events: ${WEBHOOK_EVENTS.join(', ')}`
          }
        });
      }
    }

    // In a real implementation, update the webhook in database
    const updatedWebhook = {
      id: webhookId,
      url: url || 'https://example.com/webhooks/safenotify',
      events: events || ['conversation.created', 'message.received'],
      secret: 'whsec_**********************',
      is_active: is_active !== undefined ? is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.json(updatedWebhook);

  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /v1/webhooks/{webhook_id}
 * Delete a webhook
 */
router.delete('/:webhookId', requireScopes(['webhooks:write']), async (req, res, next) => {
  try {
    const { webhookId } = req.params;

    // In a real implementation, check if webhook exists and belongs to user
    if (!webhookId.startsWith('wh_')) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'WEBHOOK_NOT_FOUND',
          message: 'Webhook not found or access denied'
        }
      });
    }

    // In a real implementation, delete the webhook from database
    res.status(204).send();

  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/webhooks/{webhook_id}/test
 * Test a webhook by sending a sample payload
 */
router.post('/:webhookId/test', requireScopes(['webhooks:write']), async (req, res, next) => {
  try {
    const { webhookId } = req.params;
    const { event_type = 'conversation.created' } = req.body;

    // Validate event type
    if (!WEBHOOK_EVENTS.includes(event_type)) {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'INVALID_EVENT_TYPE',
          message: `Invalid event type. Valid events: ${WEBHOOK_EVENTS.join(', ')}`
        }
      });
    }

    // In a real implementation, check if webhook exists
    if (!webhookId.startsWith('wh_')) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'WEBHOOK_NOT_FOUND',
          message: 'Webhook not found or access denied'
        }
      });
    }

    // Generate test payload based on event type
    let testPayload;
    
    switch (event_type) {
      case 'conversation.created':
        testPayload = {
          event: 'conversation.created',
          data: {
            id: 'conv_test123',
            customer_phone: '+573001234567',
            customer_name: 'Test Customer',
            status: 'ACTIVE',
            created_at: new Date().toISOString()
          },
          timestamp: new Date().toISOString(),
          webhook_id: webhookId
        };
        break;
        
      case 'message.received':
        testPayload = {
          event: 'message.received',
          data: {
            conversation_id: 'conv_test123',
            message_id: 'msg_test456',
            content: 'This is a test message',
            role: 'user',
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString(),
          webhook_id: webhookId
        };
        break;
        
      case 'lead.created':
        testPayload = {
          event: 'lead.created',
          data: {
            id: 'lead_test789',
            name: 'Test Lead',
            phone: '+573001234567',
            email: 'test@example.com',
            business_type: 'service',
            status: 'NEW',
            created_at: new Date().toISOString()
          },
          timestamp: new Date().toISOString(),
          webhook_id: webhookId
        };
        break;
        
      default:
        testPayload = {
          event: event_type,
          data: {
            test: true,
            message: 'This is a test webhook payload'
          },
          timestamp: new Date().toISOString(),
          webhook_id: webhookId
        };
    }

    // In a real implementation, send the webhook to the configured URL
    // For now, simulate the test
    res.json({
      success: true,
      message: 'Test webhook sent successfully',
      payload: testPayload,
      delivery: {
        webhook_id: webhookId,
        event_type: event_type,
        url: 'https://example.com/webhooks/safenotify',
        status: 'delivered',
        response_status: 200,
        response_time: '152ms',
        delivered_at: new Date().toISOString()
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/webhooks/{webhook_id}/deliveries
 * Get webhook delivery history
 */
router.get('/:webhookId/deliveries', requireScopes(['webhooks:write']), async (req, res, next) => {
  try {
    const { webhookId } = req.params;
    const { limit = 50, status } = req.query;

    // In a real implementation, check if webhook exists
    if (!webhookId.startsWith('wh_')) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'WEBHOOK_NOT_FOUND',
          message: 'Webhook not found or access denied'
        }
      });
    }

    // Generate mock delivery history
    const deliveries = Array.from({ length: Math.min(parseInt(limit), 100) }, (_, i) => {
      const deliveryTime = new Date(Date.now() - i * 3600000); // Each delivery 1 hour apart
      const isSuccess = Math.random() > 0.1; // 90% success rate
      
      return {
        id: `del_${crypto.randomBytes(8).toString('hex')}`,
        webhook_id: webhookId,
        event_type: WEBHOOK_EVENTS[Math.floor(Math.random() * WEBHOOK_EVENTS.length)],
        status: isSuccess ? 'delivered' : 'failed',
        response_status: isSuccess ? 200 : 500,
        response_time: `${Math.floor(Math.random() * 1000) + 50}ms`,
        attempts: isSuccess ? 1 : 3,
        delivered_at: deliveryTime.toISOString(),
        next_retry: !isSuccess ? new Date(deliveryTime.getTime() + 300000).toISOString() : null // 5 min retry
      };
    });

    // Filter by status if provided
    const filteredDeliveries = status ? 
      deliveries.filter(d => d.status === status) : 
      deliveries;

    res.json({
      data: filteredDeliveries,
      pagination: {
        total: filteredDeliveries.length,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/webhooks/events
 * List available webhook events
 */
router.get('/events/list', requireScopes(['webhooks:write']), async (req, res, next) => {
  try {
    const eventDescriptions = {
      'conversation.created': 'Triggered when a new conversation is created',
      'conversation.updated': 'Triggered when conversation status or details change',
      'message.received': 'Triggered when a customer sends a message',
      'message.sent': 'Triggered when AI or human agent sends a message',
      'lead.created': 'Triggered when a new lead is created',
      'lead.qualified': 'Triggered when a lead qualification score changes',
      'takeover.requested': 'Triggered when human takeover is requested',
      'takeover.started': 'Triggered when human agent takes control',
      'takeover.ended': 'Triggered when control returns to AI',
      'agent.assigned': 'Triggered when an AI agent is assigned to conversation',
      'conversation.completed': 'Triggered when a conversation is marked as completed'
    };

    const events = WEBHOOK_EVENTS.map(event => ({
      name: event,
      description: eventDescriptions[event],
      example_payload: generateExamplePayload(event)
    }));

    res.json({
      events: events,
      total: events.length
    });

  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to generate example payloads
 */
function generateExamplePayload(eventType) {
  const basePayload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    webhook_id: 'wh_example123'
  };

  switch (eventType) {
    case 'conversation.created':
      return {
        ...basePayload,
        data: {
          id: 'conv_abc123',
          customer_phone: '+573001234567',
          customer_name: 'Juan Pérez',
          status: 'ACTIVE',
          priority: 'MEDIUM',
          agent_id: 'agent_456',
          created_at: new Date().toISOString()
        }
      };

    case 'message.received':
      return {
        ...basePayload,
        data: {
          conversation_id: 'conv_abc123',
          message_id: 'msg_def456',
          content: 'Hola, necesito ayuda',
          role: 'user',
          timestamp: new Date().toISOString()
        }
      };

    case 'lead.created':
      return {
        ...basePayload,
        data: {
          id: 'lead_ghi789',
          name: 'María González',
          phone: '+573009876543',
          email: 'maria@empresa.com',
          business_type: 'restaurant',
          status: 'NEW',
          qualification_score: 0,
          created_at: new Date().toISOString()
        }
      };

    default:
      return {
        ...basePayload,
        data: {
          id: 'example_123',
          status: 'example',
          created_at: new Date().toISOString()
        }
      };
  }
}

// Error handler
router.use(handlePublicApiError);

module.exports = router;