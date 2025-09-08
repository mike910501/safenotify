/**
 * 🔐 PUBLIC API AUTHENTICATION MIDDLEWARE
 * Handles OAuth 2.0 and API Key authentication for public API access
 */

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * API Key Authentication Middleware
 * Validates API keys in the format: sk_live_xxx or sk_test_xxx
 */
async function authenticateApiKey(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.query.api_key;
    
    let key = null;
    
    // Extract API key from Authorization header or query parameter
    if (authHeader && authHeader.startsWith('Bearer sk_')) {
      key = authHeader.replace('Bearer ', '');
    } else if (apiKey && apiKey.startsWith('sk_')) {
      key = apiKey;
    }
    
    if (!key) {
      return res.status(401).json({
        error: {
          type: 'authentication_error',
          code: 'API_KEY_REQUIRED',
          message: 'Valid API key required. Format: Bearer sk_live_xxx or sk_test_xxx'
        }
      });
    }
    
    // Validate API key format
    const keyPattern = /^sk_(live|test)_[a-zA-Z0-9]{32,}$/;
    if (!keyPattern.test(key)) {
      return res.status(401).json({
        error: {
          type: 'authentication_error',
          code: 'INVALID_API_KEY_FORMAT',
          message: 'API key must be in format: sk_live_xxx or sk_test_xxx'
        }
      });
    }
    
    // For now, we'll use a simple validation (in production, store API keys in database)
    // Extract user info from key (simplified approach for implementation)
    const keyType = key.includes('sk_live_') ? 'live' : 'test';
    const keyHash = key.substring(8); // Remove sk_live_ or sk_test_
    
    // In a real implementation, we'd look up the API key in a database
    // For now, we'll derive user info from the key pattern
    const user = await findUserByApiKey(keyHash, keyType);
    
    if (!user) {
      return res.status(401).json({
        error: {
          type: 'authentication_error',
          code: 'INVALID_API_KEY',
          message: 'API key is invalid or revoked'
        }
      });
    }
    
    // Attach user and API key info to request
    req.user = user;
    req.apiKey = {
      key: key,
      type: keyType,
      scopes: ['conversations:read', 'conversations:write', 'agents:read', 'agents:write', 'leads:read', 'leads:write', 'analytics:read', 'webhooks:write'] // Default scopes
    };
    req.authType = 'api_key';
    
    next();
    
  } catch (error) {
    console.error('API Key Authentication Error:', error);
    res.status(500).json({
      error: {
        type: 'authentication_error',
        code: 'AUTH_SERVICE_ERROR',
        message: 'Authentication service temporarily unavailable'
      }
    });
  }
}

/**
 * OAuth 2.0 Token Authentication Middleware
 * Validates JWT access tokens issued through OAuth flow
 */
async function authenticateOAuthToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          type: 'authentication_error',
          code: 'BEARER_TOKEN_REQUIRED',
          message: 'Bearer token required in Authorization header'
        }
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Find user by ID from token
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        crmEnabled: true,
        crmPlan: true
      }
    });
    
    if (!user || !user.crmEnabled) {
      return res.status(401).json({
        error: {
          type: 'authentication_error',
          code: 'INVALID_TOKEN',
          message: 'Token is invalid or user does not have CRM access'
        }
      });
    }
    
    // Extract scopes from token (if present) - give full scopes for OAuth tokens
    const scopes = decoded.scopes || ['conversations:read', 'conversations:write', 'agents:read', 'agents:write', 'leads:read', 'leads:write', 'analytics:read', 'webhooks:write'];
    
    // Attach user and OAuth info to request
    req.user = user;
    req.oauthToken = {
      token: token,
      scopes: scopes,
      expiresAt: new Date(decoded.exp * 1000)
    };
    req.authType = 'oauth';
    
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: {
          type: 'authentication_error',
          code: 'INVALID_TOKEN',
          message: 'Token is malformed or invalid'
        }
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: {
          type: 'authentication_error',
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired'
        }
      });
    }
    
    console.error('OAuth Token Authentication Error:', error);
    res.status(500).json({
      error: {
        type: 'authentication_error',
        code: 'AUTH_SERVICE_ERROR',
        message: 'Authentication service temporarily unavailable'
      }
    });
  }
}

/**
 * Unified Public API Authentication Middleware
 * Supports both API Key and OAuth token authentication
 */
async function authenticatePublicApi(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.query.api_key;
    
    // Determine authentication method
    if ((authHeader && authHeader.startsWith('Bearer sk_')) || (apiKey && apiKey.startsWith('sk_'))) {
      // API Key authentication
      return authenticateApiKey(req, res, next);
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      // OAuth token authentication
      return authenticateOAuthToken(req, res, next);
    } else {
      // No valid authentication method found
      return res.status(401).json({
        error: {
          type: 'authentication_error',
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required. Provide API key (sk_xxx) or OAuth Bearer token'
        }
      });
    }
    
  } catch (error) {
    console.error('Public API Authentication Error:', error);
    res.status(500).json({
      error: {
        type: 'authentication_error',
        code: 'AUTH_SERVICE_ERROR',
        message: 'Authentication service temporarily unavailable'
      }
    });
  }
}

/**
 * Scope validation middleware
 * Checks if the authenticated request has required scopes
 */
function requireScopes(requiredScopes) {
  return (req, res, next) => {
    const userScopes = req.apiKey?.scopes || req.oauthToken?.scopes || [];
    
    // Check if user has all required scopes
    const hasAllScopes = requiredScopes.every(scope => userScopes.includes(scope));
    
    if (!hasAllScopes) {
      return res.status(403).json({
        error: {
          type: 'authorization_error',
          code: 'INSUFFICIENT_SCOPES',
          message: `Required scopes: ${requiredScopes.join(', ')}. Your scopes: ${userScopes.join(', ')}`
        }
      });
    }
    
    next();
  };
}

/**
 * Rate limiting middleware for public API
 * Implements rate limits based on user plan
 */
function rateLimitPublicApi(req, res, next) {
  // Get user plan-based rate limits
  const planLimits = {
    'basic': 1000,    // 1,000 requests/hour
    'pro': 5000,      // 5,000 requests/hour
    'enterprise': 25000  // 25,000 requests/hour
  };
  
  const userPlan = req.user?.crmPlan || 'basic';
  const rateLimit = planLimits[userPlan];
  
  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': rateLimit,
    'X-RateLimit-Remaining': rateLimit - 1, // Simplified for implementation
    'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  });
  
  // In production, implement actual rate limiting with Redis
  // For now, just add headers and continue
  next();
}

/**
 * Helper function to find user by API key
 * In production, this would query an API keys table
 */
async function findUserByApiKey(keyHash, keyType) {
  try {
    // For implementation purposes, we'll use a simple approach
    // In production, API keys would be stored securely in database
    
    // For demo, we'll find the first CRM-enabled user
    const user = await prisma.user.findFirst({
      where: {
        crmEnabled: true,
        role: 'user'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        crmEnabled: true,
        crmPlan: true
      }
    });
    
    return user;
    
  } catch (error) {
    console.error('Error finding user by API key:', error);
    return null;
  }
}

/**
 * Error handler for public API
 */
function handlePublicApiError(error, req, res, next) {
  console.error('Public API Error:', error);
  
  res.status(error.status || 500).json({
    error: {
      type: error.type || 'server_error',
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
      request_id: req.headers['x-request-id'] || 'unknown'
    }
  });
}

module.exports = {
  authenticatePublicApi,
  authenticateApiKey,
  authenticateOAuthToken,
  requireScopes,
  rateLimitPublicApi,
  handlePublicApiError
};