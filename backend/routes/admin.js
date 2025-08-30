const express = require('express');
const prisma = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const twilio = require('twilio');
const crypto = require('crypto');

const router = express.Router();

// Encryption key for sensitive data
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

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

// Obtener todas las plantillas para admin (con filtros opcionales)
router.get('/templates', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status, search, limit = 50 } = req.query;
    
    let whereCondition = {};
    
    // Filtrar por estado si se especifica
    if (status && status !== 'all') {
      whereCondition.status = status;
    }
    
    // Búsqueda por nombre o email del usuario
    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const templates = await prisma.template.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Pendientes primero
        { createdAt: 'desc' } // Más recientes primero
      ],
      take: parseInt(limit)
    });

    res.json({
      success: true,
      templates: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error obteniendo plantillas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Mantener endpoint legacy para compatibilidad
router.get('/templates/pending', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const pendingTemplates = await prisma.template.findMany({
      where: {
        status: 'pending'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // Más antiguas primero
      }
    });

    res.json({
      success: true,
      templates: pendingTemplates
    });
  } catch (error) {
    console.error('Error obteniendo plantillas pendientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Aprobar plantilla
router.post('/templates/:id/approve', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const template = await prisma.template.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Plantilla no encontrada'
      });
    }

    if (template.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden aprobar plantillas pendientes'
      });
    }

    // Aprobar la plantilla
    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: {
        status: 'approved',
        adminReviewedBy: req.user.id,
        adminReviewedAt: new Date(),
        adminNotes: notes || null
      }
    });

    console.log(`✅ Admin ${req.user.email} aprobó template: ${template.name}`);

    res.json({
      success: true,
      template: updatedTemplate,
      message: 'Plantilla aprobada. Ahora necesita configurar ID de Twilio para activarla.'
    });
  } catch (error) {
    console.error('Error aprobando template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Rechazar plantilla
router.post('/templates/:id/reject', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const template = await prisma.template.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Plantilla no encontrada'
      });
    }

    if (template.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden rechazar plantillas pendientes'
      });
    }

    // Rechazar la plantilla
    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: {
        status: 'rejected',
        adminReviewedBy: req.user.id,
        adminReviewedAt: new Date(),
        adminNotes: notes || 'Template rechazada por políticas de WhatsApp'
      }
    });

    console.log(`❌ Admin ${req.user.email} rechazó template: ${template.name}`);

    res.json({
      success: true,
      template: updatedTemplate,
      message: 'Plantilla rechazada'
    });
  } catch (error) {
    console.error('Error rechazando template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Activar plantilla con ID de Twilio
router.post('/templates/:id/activate', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      twilioTemplateId, 
      twilioSid, 
      twilioContentSid,
      headerText, 
      footerText, 
      language, 
      variablesMapping, 
      businessCategory 
    } = req.body;

    if (!twilioTemplateId) {
      return res.status(400).json({
        success: false,
        error: 'ID de template de Twilio es requerido'
      });
    }

    const template = await prisma.template.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Plantilla no encontrada'
      });
    }

    if (template.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden activar plantillas aprobadas'
      });
    }

    // Verificar que no existe otra template activa con el mismo twilioTemplateId
    const existingActive = await prisma.template.findFirst({
      where: {
        twilioTemplateId: twilioTemplateId,
        status: 'active'
      }
    });

    if (existingActive) {
      return res.status(400).json({
        success: false,
        error: 'Ya existe una plantilla activa con ese ID de Twilio'
      });
    }

    // Activar la plantilla con datos WhatsApp Business
    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: {
        status: 'active',
        twilioTemplateId,
        twilioSid: twilioSid || null,
        twilioContentSid: twilioContentSid || null,
        headerText: headerText || null,
        footerText: footerText || null,
        language: language || 'es',
        variablesMapping: variablesMapping || null,
        businessCategory: businessCategory || 'UTILITY',
        adminReviewedAt: new Date()
      }
    });

    console.log(`🚀 Admin ${req.user.email} activó template: ${template.name} con ID: ${twilioTemplateId}`);

    res.json({
      success: true,
      template: updatedTemplate,
      message: 'Plantilla activada y lista para usar en campañas'
    });
  } catch (error) {
    console.error('Error activando template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener estadísticas de admin
router.get('/templates/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const stats = await prisma.template.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const formattedStats = stats.reduce((acc, stat) => {
      acc[stat.status] = stat._count.id;
      return acc;
    }, {});

    // Agregar totales
    const totalTemplates = await prisma.template.count();
    const recentPending = await prisma.template.count({
      where: {
        status: 'pending',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Últimos 7 días
        }
      }
    });

    res.json({
      success: true,
      stats: {
        ...formattedStats,
        total: totalTemplates,
        recentPending
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de admin:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Ruta para probar template WhatsApp
router.post('/templates/:id/test', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { phoneNumber, testVariables } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Número de teléfono requerido'
      });
    }

    const template = await prisma.template.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrado'
      });
    }

    if (template.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Solo se pueden probar templates activos'
      });
    }

    if (!template.twilioContentSid && !template.twilioTemplateId) {
      return res.status(400).json({
        success: false,
        error: 'Template no tiene configuración de Twilio'
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
    if (template.variablesMapping && testVariables) {
      Object.keys(template.variablesMapping).forEach(key => {
        const variableName = template.variablesMapping[key];
        variables[key] = testVariables[variableName] || `Test ${variableName}`;
      });
    }

    // Send test message
    const messageData = {
      from: `whatsapp:${config.whatsappNumber}`,
      to: `whatsapp:${phoneNumber}`
    };

    if (template.twilioContentSid) {
      messageData.contentSid = template.twilioContentSid;
      messageData.contentVariables = JSON.stringify(variables);
    } else {
      // Fallback to regular message
      let body = template.content;
      template.variables.forEach((variable, index) => {
        body = body.replace(new RegExp(`\\{\\{${index + 1}\\}\\}`, 'g'), 
          testVariables?.[variable] || `Test ${variable}`);
      });
      messageData.body = body;
    }

    const message = await client.messages.create(messageData);

    console.log(`📱 Admin ${req.user.email} probó template: ${template.name} → ${phoneNumber}`);

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
    console.error('Error testing template:', error);
    
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

// Obtener configuración WhatsApp
router.get('/whatsapp-config', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const config = await prisma.whatsAppConfig.findFirst({
      where: { isActive: true }
    });

    res.json({
      success: true,
      config: config ? {
        id: config.id,
        twilioAccountSid: config.twilioAccountSid,
        whatsappNumber: config.whatsappNumber,
        businessAccountId: config.businessAccountId,
        rateLimitPerMinute: config.rateLimitPerMinute,
        isActive: config.isActive,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
      } : null
    });

  } catch (error) {
    console.error('Error fetching WhatsApp config:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Eliminar plantilla
router.delete('/templates/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        campaigns: {
          select: { id: true, status: true }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrada'
      });
    }

    // Verificar si tiene campañas activas
    const activeCampaigns = template.campaigns.filter(c => 
      c.status === 'draft' || c.status === 'sending'
    );

    if (activeCampaigns.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar una plantilla que tiene campañas activas'
      });
    }

    // Eliminar plantilla
    await prisma.template.delete({
      where: { id }
    });

    console.log(`🗑️ Admin ${req.user.email} eliminó template: ${template.name}`);

    res.json({
      success: true,
      message: 'Plantilla eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;