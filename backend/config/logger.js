const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.dirname(process.env.LOG_FILE || './logs/safenotify.log');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for sensitive data filtering
const sensitiveDataFilter = winston.format((info) => {
  const sensitiveFields = ['password', 'token', 'key', 'secret', 'authorization', 'phone', 'telefono'];
  
  const filterObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const filtered = {};
    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        filtered[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        filtered[key] = filterObject(value);
      } else {
        filtered[key] = value;
      }
    }
    return filtered;
  };

  // Filter the message and metadata
  if (typeof info.message === 'object') {
    info.message = filterObject(info.message);
  }
  
  // Filter additional metadata
  Object.keys(info).forEach(key => {
    if (key !== 'level' && key !== 'timestamp' && key !== 'message') {
      info[key] = filterObject(info[key]);
    }
  });

  return info;
});

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    sensitiveDataFilter(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
      
      // Add metadata if present
      if (Object.keys(meta).length > 0) {
        log += `\n${JSON.stringify(meta, null, 2)}`;
      }
      
      return log;
    })
  ),
  defaultMeta: {
    service: 'safenotify-backend'
  },
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: process.env.LOG_FILE || './logs/safenotify.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760,
      maxFiles: 5,
      tailable: true
    }),
    
    // Separate file for audit logs (security events)
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      level: 'warn',
      maxsize: 10485760,
      maxFiles: 10,
      tailable: true
    })
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log')
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log')
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      sensitiveDataFilter()
    )
  }));
}

// Helper methods for different log types
logger.security = (message, meta = {}) => {
  logger.warn(`[SECURITY] ${message}`, { ...meta, type: 'security' });
};

logger.audit = (action, resource, meta = {}) => {
  logger.info(`[AUDIT] ${action} - ${resource}`, { 
    ...meta, 
    type: 'audit',
    action,
    resource
  });
};

logger.performance = (operation, duration, meta = {}) => {
  logger.info(`[PERFORMANCE] ${operation} completed in ${duration}ms`, {
    ...meta,
    type: 'performance',
    operation,
    duration
  });
};

logger.campaign = (campaignId, action, meta = {}) => {
  logger.info(`[CAMPAIGN] ${campaignId} - ${action}`, {
    ...meta,
    type: 'campaign',
    campaignId,
    action
  });
};

logger.message = (messageSid, action, meta = {}) => {
  logger.info(`[MESSAGE] ${messageSid} - ${action}`, {
    ...meta,
    type: 'message',
    messageSid,
    action
  });
};

module.exports = logger;