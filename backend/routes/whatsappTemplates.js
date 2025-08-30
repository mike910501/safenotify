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
 * @route GET /api/whatsapp-templates
 * @desc Get all WhatsApp templates
 * @access Private
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, status, search } = req.query;
    
    // Build where clause
    const where = {
      ...(category && category !== 'all' && { category }),
      ...(status && status !== 'all' && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { bodyText: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const templates = await prisma.whatsAppTemplate.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { campaigns: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const stats = {
      total: templates.length,
      pending: templates.filter(t => t.status === 'PENDING').length,
      approved: templates.filter(t => t.status === 'APPROVED').length,
      rejected: templates.filter(t => t.status === 'REJECTED').length,
      categories: templates.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      data: {
        templates: templates.map(template => ({
          ...template,
          usageCount: template._count.campaigns
        })),
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching WhatsApp templates:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/whatsapp-templates
 * @desc Create new WhatsApp template
 * @access Private
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      category = 'UTILITY',
      language = 'es',
      headerText,
      bodyText,
      footerText,
      variablesMapping
    } = req.body;

    if (!name || !bodyText) {
      return res.status(400).json({
        success: false,
        error: 'Name and bodyText are required'
      });
    }

    // Count variables in bodyText {{1}}, {{2}}, etc.
    const variableMatches = bodyText.match(/\{\{\d+\}\}/g) || [];
    const variablesCount = variableMatches.length;

    // Validate variables are sequential ({{1}}, {{2}}, {{3}}, etc.)
    const variableNumbers = variableMatches.map(v => parseInt(v.replace(/[{}]/g, '')));
    const expectedSequence = Array.from({ length: variablesCount }, (_, i) => i + 1);
    
    if (variablesCount > 0 && !variableNumbers.sort((a, b) => a - b).every((v, i) => v === expectedSequence[i])) {
      return res.status(400).json({
        success: false,
        error: 'Las variables deben ser secuenciales: {{1}}, {{2}}, {{3}}, etc.'
      });
    }

    const template = await prisma.whatsAppTemplate.create({
      data: {
        name,
        category,
        language,
        headerText,
        bodyText,
        footerText,
        variablesCount,
        variablesMapping: variablesMapping || {},
        createdBy: req.user.id,
        status: 'PENDING'
      },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      data: template,
      message: 'Template creado exitosamente. Esperando aprobación de Meta.'
    });

  } catch (error) {
    console.error('Error creating WhatsApp template:', error);
    
    if (error.code === 'P2002') {
      res.status(400).json({
        success: false,
        error: 'Ya existe un template con ese nombre en este idioma'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
});

/**
 * @route GET /api/whatsapp-templates/:id
 * @desc Get specific WhatsApp template
 * @access Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const template = await prisma.whatsAppTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        },
        campaigns: {
          select: {
            id: true,
            name: true,
            status: true,
            sentCount: true,
            totalContacts: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrado'
      });
    }

    res.json({
      success: true,
      data: template
    });

  } catch (error) {
    console.error('Error fetching WhatsApp template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route PUT /api/whatsapp-templates/:id
 * @desc Update WhatsApp template
 * @access Private
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      category,
      language,
      headerText,
      bodyText,
      footerText,
      variablesMapping,
      status,
      twilioContentSid
    } = req.body;

    const template = await prisma.whatsAppTemplate.findUnique({
      where: { id: req.params.id }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrado'
      });
    }

    // Solo admin puede cambiar status o twilioContentSid
    const isAdmin = req.user.role === 'admin';
    const canUpdateStatus = isAdmin && status;
    const canUpdateTwilioSid = isAdmin && twilioContentSid;

    // Recalcular variables si bodyText cambió
    let updateData = {
      ...(name && { name }),
      ...(category && { category }),
      ...(language && { language }),
      ...(headerText !== undefined && { headerText }),
      ...(footerText !== undefined && { footerText }),
      ...(variablesMapping && { variablesMapping })
    };

    if (bodyText && bodyText !== template.bodyText) {
      const variableMatches = bodyText.match(/\{\{\d+\}\}/g) || [];
      const variablesCount = variableMatches.length;
      
      updateData.bodyText = bodyText;
      updateData.variablesCount = variablesCount;
      updateData.status = 'PENDING'; // Reset status if content changed
    }

    if (canUpdateStatus) {
      updateData.status = status;
    }

    if (canUpdateTwilioSid) {
      updateData.twilioContentSid = twilioContentSid;
    }

    const updatedTemplate = await prisma.whatsAppTemplate.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        creator: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      data: updatedTemplate,
      message: 'Template actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error updating WhatsApp template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route DELETE /api/whatsapp-templates/:id
 * @desc Delete WhatsApp template
 * @access Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const template = await prisma.whatsAppTemplate.findUnique({
      where: { id: req.params.id },
      include: {
        _count: { select: { campaigns: true } }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrado'
      });
    }

    // Solo el creador o admin puede eliminar
    if (template.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Sin permisos para eliminar este template'
      });
    }

    // No permitir eliminar si tiene campañas asociadas
    if (template._count.campaigns > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar un template que tiene campañas asociadas'
      });
    }

    await prisma.whatsAppTemplate.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Template eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error deleting WhatsApp template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route POST /api/whatsapp-templates/:id/test
 * @desc Test WhatsApp template by sending a test message
 * @access Private
 */
router.post('/:id/test', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber, testVariables } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Número de teléfono requerido'
      });
    }

    const template = await prisma.whatsAppTemplate.findUnique({
      where: { id: req.params.id }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrado'
      });
    }

    if (template.status !== 'APPROVED') {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden probar templates aprobados'
      });
    }

    if (!template.twilioContentSid) {
      return res.status(400).json({
        success: false,
        error: 'Template no tiene Twilio Content SID configurado'
      });
    }

    // Get WhatsApp config
    const config = await prisma.whatsAppConfig.findFirst({
      where: { isActive: true }
    });

    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'Configuración de WhatsApp no encontrada'
      });
    }

    // Initialize Twilio client
    const client = twilio(config.twilioAccountSid, decrypt(config.twilioAuthToken));

    // Prepare variables for Twilio
    const variables = {};
    for (let i = 1; i <= template.variablesCount; i++) {
      const mapping = template.variablesMapping?.[i.toString()];
      variables[i.toString()] = testVariables?.[mapping] || `Test ${mapping || i}`;
    }

    // Send test message
    const message = await client.messages.create({
      contentSid: template.twilioContentSid,
      from: `whatsapp:${config.whatsappNumber}`,
      to: `whatsapp:${phoneNumber}`,
      contentVariables: JSON.stringify(variables)
    });

    res.json({
      success: true,
      data: {
        messageSid: message.sid,
        status: message.status,
        variables: variables
      },
      message: 'Mensaje de prueba enviado exitosamente'
    });

  } catch (error) {
    console.error('Error testing WhatsApp template:', error);
    
    if (error.code === 63016) {
      res.status(400).json({
        success: false,
        error: 'Template no aprobado por WhatsApp Business o variables incorrectas'
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message || 'Error enviando mensaje de prueba'
      });
    }
  }
});

/**
 * @route GET /api/whatsapp-templates/:id/preview
 * @desc Generate preview of template with sample data
 * @access Private
 */
router.get('/:id/preview', authenticateToken, async (req, res) => {
  try {
    const { sampleData } = req.query;
    
    const template = await prisma.whatsAppTemplate.findUnique({
      where: { id: req.params.id }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrado'
      });
    }

    let parsedSampleData = {};
    if (sampleData) {
      try {
        parsedSampleData = JSON.parse(sampleData);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Datos de muestra inválidos'
        });
      }
    }

    // Generate preview
    let preview = template.bodyText;
    
    // Replace variables with sample data
    for (let i = 1; i <= template.variablesCount; i++) {
      const mapping = template.variablesMapping?.[i.toString()];
      const value = parsedSampleData[mapping] || `[${mapping || `Variable ${i}`}]`;
      preview = preview.replace(new RegExp(`\\{\\{${i}\\}\\}`, 'g'), value);
    }

    res.json({
      success: true,
      data: {
        preview: {
          header: template.headerText,
          body: preview,
          footer: template.footerText
        },
        variables: template.variablesMapping,
        sampleData: parsedSampleData
      }
    });

  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;