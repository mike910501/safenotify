require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Import configurations and services
const logger = require('./config/logger');
const db = require('./config/database');
const twilioService = require('./config/twilio');

// Import middleware
const { 
  authenticateApiKey, 
  rateLimits, 
  securityHeaders 
} = require('./middleware/auth');

// Import routes
const campaignsRouter = require('./routes/campaigns');
const webhooksRouter = require('./routes/webhooks');
const templatesRouter = require('./routes/templates');
const authRouter = require('./routes/auth');

// Import cleanup service
const cleanupService = require('./jobs/cleanup');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Custom security headers
app.use(securityHeaders);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    // Store raw body for webhook signature verification
    req.rawBody = buf;
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log API requests (excluding webhooks to avoid spam)
    if (!req.path.includes('/webhooks/')) {
      logger.info(`${req.method} ${req.path} - ${res.statusCode}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        duration,
        statusCode: res.statusCode,
        contentLength: res.get('Content-Length')
      });
    }
  });
  
  next();
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'SafeNotify Backend API',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    features: {
      whatsappIntegration: true,
      autoDataDeletion: true,
      encryption: true,
      auditLogging: true,
      rateLimit: true
    }
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'SafeNotify Backend API v1.0.0',
    documentation: {
      campaigns: {
        'POST /api/campaigns/create': 'Create new campaign with CSV upload',
        'POST /api/campaigns/:id/send': 'Send messages to all contacts',
        'GET /api/campaigns/:id/stats': 'Get campaign statistics',
        'GET /api/campaigns/:id/messages': 'Get campaign messages',
        'POST /api/campaigns/:id/retry': 'Retry failed messages',
        'DELETE /api/campaigns/:id': 'Delete campaign data',
        'GET /api/campaigns': 'List recent campaigns'
      },
      templates: {
        'GET /api/templates': 'List available Twilio templates',
        'GET /api/templates/:sid': 'Get specific template details',
        'PUT /api/templates/:sid': 'Update template mapping',
        'GET /api/templates/:sid/preview': 'Preview template with sample data'
      },
      webhooks: {
        'POST /api/webhooks/twilio': 'Twilio webhook for message status updates',
        'GET /api/webhooks/health': 'Webhook service health check'
      },
      system: {
        'GET /api/system/stats': 'System statistics and cleanup info',
        'POST /api/system/cleanup': 'Manual cleanup operations'
      }
    },
    authentication: {
      method: 'API Key',
      header: 'x-api-key',
      example: 'x-api-key: your-api-key-here'
    }
  });
});

// Webhooks (no API key required, but signature validated)
app.use('/api/webhooks', webhooksRouter);

// Auth routes (no API key required)
app.use('/api/auth', authRouter);

// Apply API key authentication to protected routes
app.use('/api', authenticateApiKey);

// General rate limiting for authenticated routes
app.use('/api', rateLimits.general);

// Protected API routes
app.use('/api/campaigns', campaignsRouter);
app.use('/api/templates', templatesRouter);

// System management endpoints
app.get('/api/system/stats', async (req, res) => {
  try {
    // Get database statistics
    const dbStats = await db.all(`
      SELECT 
        'campaigns' as table_name,
        COUNT(*) as count,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM campaigns
      UNION ALL
      SELECT 
        'message_logs' as table_name,
        COUNT(*) as count,
        MIN(sent_at) as oldest,
        MAX(sent_at) as newest
      FROM message_logs
      UNION ALL
      SELECT 
        'audit_logs' as table_name,
        COUNT(*) as count,
        MIN(timestamp) as oldest,
        MAX(timestamp) as newest
      FROM audit_logs
    `);

    // Get cleanup statistics
    const cleanupStats = await cleanupService.getCleanupStats();

    // Get system info
    const systemInfo = {
      uptime: Math.floor(process.uptime()),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      cpuUsage: process.cpuUsage()
    };

    res.json({
      success: true,
      data: {
        system: systemInfo,
        database: dbStats,
        cleanup: cleanupStats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to get system stats', {
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get system statistics'
    });
  }
});

// Manual cleanup endpoint
app.post('/api/system/cleanup', express.json(), async (req, res) => {
  try {
    const { operation } = req.body;
    let result;

    switch (operation) {
      case 'campaigns':
        result = await cleanupService.forceCleanupExpiredCampaigns();
        break;
      case 'logs':
        result = await cleanupService.forceLogCleanup();
        break;
      case 'database':
        result = await cleanupService.forceDatabaseOptimization();
        break;
      case 'emergency':
        result = await cleanupService.emergencyCleanup();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid cleanup operation. Valid options: campaigns, logs, database, emergency'
        });
    }

    logger.security('Manual cleanup operation performed', {
      operation,
      result,
      ip: req.ip
    });

    res.json({
      success: true,
      message: `${operation} cleanup completed successfully`,
      data: result
    });

  } catch (error) {
    logger.error('Manual cleanup failed', {
      operation: req.body.operation,
      error: error.message,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: error.message || 'Cleanup operation failed'
    });
  }
});

// 404 handler
app.use((req, res) => {
  logger.warn('404 - Route not found', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: 'The requested endpoint does not exist'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(500).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handling
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  const server = require('http').Server(app);
  
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close database connection
      await db.close();
      logger.info('Database connection closed');

      // Perform final cleanup if needed
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
      process.exit(1);
    }
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
}

// Validate required environment variables before starting
const requiredVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN', 
  'TWILIO_WHATSAPP_NUMBER',
  'ENCRYPTION_KEY',
  'API_KEY'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error('Missing required environment variables', {
    missingVars
  });
  
  if (process.env.NODE_ENV === 'production') {
    logger.error('Shutting down due to missing required configuration');
    process.exit(1);
  }
} else {
  logger.info('All required environment variables configured');
}

// Start the server
const server = app.listen(PORT, () => {
  logger.info(`SafeNotify Backend server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV,
    corsOrigin: process.env.CORS_ORIGIN
  });
  
  console.log(`🚀 SafeNotify Backend server running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;