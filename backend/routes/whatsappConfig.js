const express = require('express');
const { PrismaClient } = require('@prisma/client');
// Auth middleware from simple-server.js
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token de acceso requerido' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Usuario no encontrado' 
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ 
      success: false, 
      error: 'Token inválido' 
    });
  }
};

const jwt = require('jsonwebtoken');
const twilio = require('twilio');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

// Encryption key for sensitive data
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Encrypt sensitive data
function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipherGCM('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex').slice(0, 32), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// Decrypt sensitive data
function decrypt(text) {
  if (!text || !text.includes(':')) return text;
  const parts = text.split(':');
  if (parts.length !== 3) return text;
  
  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipherGCM('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex').slice(0, 32), iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * @route GET /api/whatsapp-config
 * @desc Get WhatsApp configuration (admin only)
 * @access Private (Admin)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Only admin can view config
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden ver la configuración'
      });
    }

    const config = await prisma.whatsAppConfig.findFirst({
      where: { isActive: true }
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuración no encontrada'
      });
    }

    // Don't return decrypted token
    const safeConfig = {
      ...config,
      twilioAuthToken: '••••••••••••••••', // Masked
      lastUpdated: config.updatedAt
    };

    res.json({
      success: true,
      data: safeConfig
    });

  } catch (error) {
    console.error('Error fetching WhatsApp config:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/whatsapp-config
 * @desc Create or update WhatsApp configuration (admin only)
 * @access Private (Admin)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Only admin can update config
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden actualizar la configuración'
      });
    }

    const {
      twilioAccountSid,
      twilioAuthToken,
      whatsappNumber,
      businessAccountId,
      rateLimitPerMinute = 20
    } = req.body;

    if (!twilioAccountSid || !twilioAuthToken || !whatsappNumber) {
      return res.status(400).json({
        success: false,
        error: 'twilioAccountSid, twilioAuthToken y whatsappNumber son requeridos'
      });
    }

    // Validate Twilio credentials
    try {
      const client = twilio(twilioAccountSid, twilioAuthToken);
      await client.api.accounts(twilioAccountSid).fetch();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Credenciales de Twilio inválidas'
      });
    }

    // Deactivate current config
    await prisma.whatsAppConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    // Create new config
    const config = await prisma.whatsAppConfig.create({
      data: {
        twilioAccountSid,
        twilioAuthToken: encrypt(twilioAuthToken),
        whatsappNumber,
        businessAccountId,
        rateLimitPerMinute,
        isActive: true
      }
    });

    res.json({
      success: true,
      data: {
        ...config,
        twilioAuthToken: '••••••••••••••••' // Masked
      },
      message: 'Configuración actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error updating WhatsApp config:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/whatsapp-config/test
 * @desc Test WhatsApp configuration
 * @access Private (Admin)
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    // Only admin can test config
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden probar la configuración'
      });
    }

    const { testPhoneNumber } = req.body;

    if (!testPhoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Número de teléfono de prueba requerido'
      });
    }

    const config = await prisma.whatsAppConfig.findFirst({
      where: { isActive: true }
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuración no encontrada'
      });
    }

    // Initialize Twilio client
    const client = twilio(config.twilioAccountSid, decrypt(config.twilioAuthToken));

    // Test 1: Validate account
    const account = await client.api.accounts(config.twilioAccountSid).fetch();
    
    // Test 2: Check WhatsApp number capabilities
    const phoneNumbers = await client.incomingPhoneNumbers.list({
      phoneNumber: config.whatsappNumber
    });

    const whatsappNumber = phoneNumbers.find(num => num.phoneNumber === config.whatsappNumber);
    
    if (!whatsappNumber) {
      return res.status(400).json({
        success: false,
        error: 'Número de WhatsApp no encontrado en la cuenta'
      });
    }

    // Test 3: Send test message (simple text, not template)
    let testMessage = null;
    try {
      testMessage = await client.messages.create({
        from: `whatsapp:${config.whatsappNumber}`,
        to: `whatsapp:${testPhoneNumber}`,
        body: '🧪 Mensaje de prueba de SafeNotify - Configuración WhatsApp funcionando correctamente!'
      });
    } catch (messageError) {
      console.warn('Test message failed:', messageError.message);
    }

    const testResults = {
      accountValid: true,
      accountName: account.friendlyName,
      accountStatus: account.status,
      whatsappNumberValid: !!whatsappNumber,
      whatsappNumberCapabilities: whatsappNumber?.capabilities || {},
      testMessageSent: !!testMessage,
      testMessageSid: testMessage?.sid,
      rateLimitConfig: config.rateLimitPerMinute,
      lastTested: new Date().toISOString()
    };

    res.json({
      success: true,
      data: testResults,
      message: 'Prueba de configuración completada'
    });

  } catch (error) {
    console.error('Error testing WhatsApp config:', error);
    
    let errorMessage = 'Error en la prueba de configuración';
    
    if (error.code === 20003) {
      errorMessage = 'Credenciales de Twilio inválidas';
    } else if (error.code === 21211) {
      errorMessage = 'Número de WhatsApp inválido';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(400).json({
      success: false,
      error: errorMessage,
      details: {
        code: error.code,
        twilioError: error.moreInfo
      }
    });
  }
});

/**
 * @route GET /api/whatsapp-config/stats
 * @desc Get WhatsApp configuration statistics
 * @access Private (Admin)
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Only admin can view stats
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden ver estadísticas'
      });
    }

    const config = await prisma.whatsAppConfig.findFirst({
      where: { isActive: true }
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuración no encontrada'
      });
    }

    // Get template stats
    const templateStats = await prisma.whatsAppTemplate.groupBy({
      by: ['status'],
      _count: { id: true }
    });

    // Get campaign stats (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const campaignStats = await prisma.whatsAppCampaign.aggregate({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      _count: { id: true },
      _sum: {
        totalContacts: true,
        sentCount: true,
        errorCount: true
      }
    });

    // Get message stats (last 30 days)
    const messageStats = await prisma.whatsAppMessage.groupBy({
      by: ['status'],
      where: {
        sentAt: { gte: thirtyDaysAgo }
      },
      _count: { id: true }
    });

    const stats = {
      configuration: {
        isActive: config.isActive,
        whatsappNumber: config.whatsappNumber,
        rateLimit: config.rateLimitPerMinute,
        lastUpdated: config.updatedAt
      },
      templates: {
        total: templateStats.reduce((sum, stat) => sum + stat._count.id, 0),
        byStatus: templateStats.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = stat._count.id;
          return acc;
        }, {})
      },
      campaigns: {
        total: campaignStats._count.id || 0,
        totalContacts: campaignStats._sum.totalContacts || 0,
        messagesSent: campaignStats._sum.sentCount || 0,
        errors: campaignStats._sum.errorCount || 0,
        successRate: campaignStats._sum.totalContacts > 0 
          ? ((campaignStats._sum.sentCount / campaignStats._sum.totalContacts) * 100).toFixed(2) 
          : 0
      },
      messages: {
        total: messageStats.reduce((sum, stat) => sum + stat._count.id, 0),
        byStatus: messageStats.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = stat._count.id;
          return acc;
        }, {})
      },
      period: '30 días'
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching WhatsApp stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/whatsapp-config/migrate-from-env
 * @desc Migrate current .env configuration to database (admin only)
 * @access Private (Admin)
 */
router.post('/migrate-from-env', authenticateToken, async (req, res) => {
  try {
    // Only admin can migrate
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Solo administradores pueden migrar la configuración'
      });
    }

    const {
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
      TWILIO_WHATSAPP_NUMBER
    } = process.env;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      return res.status(400).json({
        success: false,
        error: 'Variables de entorno de Twilio no encontradas'
      });
    }

    // Check if config already exists
    const existingConfig = await prisma.whatsAppConfig.findFirst({
      where: { isActive: true }
    });

    if (existingConfig) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una configuración activa. Use POST /api/whatsapp-config para actualizar.'
      });
    }

    // Test credentials first
    try {
      const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      await client.api.accounts(TWILIO_ACCOUNT_SID).fetch();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Credenciales de Twilio en .env son inválidas'
      });
    }

    // Create config from env vars
    const config = await prisma.whatsAppConfig.create({
      data: {
        twilioAccountSid: TWILIO_ACCOUNT_SID,
        twilioAuthToken: encrypt(TWILIO_AUTH_TOKEN),
        whatsappNumber: TWILIO_WHATSAPP_NUMBER,
        rateLimitPerMinute: 20,
        isActive: true
      }
    });

    res.json({
      success: true,
      data: {
        ...config,
        twilioAuthToken: '••••••••••••••••' // Masked
      },
      message: 'Configuración migrada exitosamente desde variables de entorno'
    });

  } catch (error) {
    console.error('Error migrating config from env:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;