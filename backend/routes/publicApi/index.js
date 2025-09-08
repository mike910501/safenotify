/**
 * 🔌 PUBLIC API - MAIN ROUTER
 * Central router for SafeNotify CRM Public API v1
 */

const express = require('express');
const { handlePublicApiError } = require('../../middleware/publicApiAuth');

// Import all API route modules
const conversationsRouter = require('./conversations');
const agentsRouter = require('./agents');
const leadsRouter = require('./leads');
const analyticsRouter = require('./analytics');
const webhooksRouter = require('./webhooks');

const router = express.Router();

// Add request ID for tracing
router.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.set('X-Request-ID', req.requestId);
  next();
});

// Add CORS headers for public API
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID');
  res.header('Access-Control-Expose-Headers', 'X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');
  
  if (req.method === 'OPTIONS') {
    res.status(200).send();
    return;
  }
  
  next();
});

// API versioning and content type
router.use((req, res, next) => {
  res.set('Content-Type', 'application/json');
  res.set('X-API-Version', 'v1');
  next();
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: 'v1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'SafeNotify CRM Public API',
    version: 'v1',
    description: 'REST API for third-party integrations with SafeNotify CRM system',
    documentation: 'https://docs.safenotify.co/api/v1',
    base_url: 'https://api.safenotify.co/v1',
    authentication: {
      methods: ['API Key', 'OAuth 2.0'],
      api_key_format: 'Bearer sk_live_xxx or Bearer sk_test_xxx',
      oauth_scopes: [
        'conversations:read',
        'conversations:write', 
        'agents:read',
        'agents:write',
        'leads:read',
        'leads:write',
        'analytics:read',
        'webhooks:write'
      ]
    },
    endpoints: {
      conversations: '/v1/conversations',
      agents: '/v1/agents',
      leads: '/v1/leads',
      analytics: '/v1/analytics',
      webhooks: '/v1/webhooks'
    },
    rate_limits: {
      basic: '1,000 requests/hour',
      pro: '5,000 requests/hour',
      enterprise: '25,000 requests/hour'
    },
    support: {
      documentation: 'https://docs.safenotify.co/api',
      help: 'https://help.safenotify.co',
      contact: 'api-support@safenotify.co'
    }
  });
});

// Mount API routes
router.use('/conversations', conversationsRouter);
router.use('/agents', agentsRouter);
router.use('/leads', leadsRouter);
router.use('/analytics', analyticsRouter);
router.use('/webhooks', webhooksRouter);

// Handle 404 for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    error: {
      type: 'not_found_error',
      code: 'ENDPOINT_NOT_FOUND',
      message: `The endpoint ${req.method} ${req.originalUrl} does not exist`,
      documentation: 'https://docs.safenotify.co/api/v1'
    },
    request_id: req.requestId
  });
});

// Global error handler for public API
router.use(handlePublicApiError);

module.exports = router;