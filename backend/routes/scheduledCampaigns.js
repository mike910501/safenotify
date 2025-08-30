// Scheduled Campaigns Routes
const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const schedulerService = require('../services/schedulerService');
const prisma = require('../db');

const router = express.Router();

// Configure multer for CSV uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'), false);
    }
  }
});

/**
 * @route POST /api/scheduled-campaigns/create
 * @desc Create a new scheduled campaign
 */
router.post('/create', authenticateToken, upload.single('csvFile'), async (req, res) => {
  try {
    const { name, templateSid, scheduledDate, variableMappings, defaultValues } = req.body;
    const csvFile = req.file;

    console.log('📅 Creating scheduled campaign:', {
      name,
      templateSid,
      scheduledDate,
      userId: req.user.id,
      hasFile: !!csvFile
    });

    // Validations
    if (!csvFile) {
      return res.status(400).json({
        success: false,
        error: 'Archivo CSV es requerido'
      });
    }

    if (!scheduledDate) {
      return res.status(400).json({
        success: false,
        error: 'Fecha de programación es requerida'
      });
    }

    if (!templateSid) {
      return res.status(400).json({
        success: false,
        error: 'Template SID es requerido'
      });
    }

    // Validate future date
    const scheduleDateTime = new Date(scheduledDate);
    const now = new Date();
    
    if (scheduleDateTime <= now) {
      return res.status(400).json({
        success: false,
        error: 'La fecha de programación debe ser futura'
      });
    }

    // Validate not too far in the future (max 1 year)
    const maxDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    if (scheduleDateTime > maxDate) {
      return res.status(400).json({
        success: false,
        error: 'La fecha de programación no puede ser superior a 1 año'
      });
    }

    // Read CSV file
    const fs = require('fs');
    let csvBuffer = null;
    let totalContactsToSend = 0;

    try {
      csvBuffer = fs.readFileSync(csvFile.path);
      const csvContent = csvBuffer.toString('utf8');
      const csvLines = csvContent.split('\n').filter(line => line.trim());

      if (csvLines.length < 2) {
        return res.status(400).json({
          success: false,
          error: 'El archivo CSV debe contener al menos una fila de datos'
        });
      }

      const headers = csvLines[0].split(',').map(h => h.trim());

      // Count valid contacts
      for (let i = 1; i < csvLines.length; i++) {
        const values = csvLines[i].split(',').map(v => v.trim());
        const contact = {};
        headers.forEach((header, index) => {
          contact[header] = values[index] || '';
        });

        if (contact.telefono || contact.phone || contact.Phone || contact.celular) {
          totalContactsToSend++;
        }
      }

      if (totalContactsToSend === 0) {
        return res.status(400).json({
          success: false,
          error: 'No se encontraron contactos válidos en el archivo CSV'
        });
      }

    } catch (error) {
      console.error('Error reading CSV file:', error);
      return res.status(400).json({
        success: false,
        error: 'Error al procesar archivo CSV. Verifica que el formato sea correcto.'
      });
    }

    // Find template
    const template = await prisma.template.findFirst({
      where: {
        OR: [
          { twilioSid: templateSid },
          { twilioContentSid: templateSid },
          { twilioTemplateId: templateSid },
          { name: templateSid }
        ],
        AND: {
          OR: [
            { isPublic: true },
            { userId: req.user.id }
          ]
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Plantilla no encontrada o no disponible'
      });
    }

    // Get user info
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        name: true,
        messagesUsed: true,
        messagesLimit: true,
        planType: true
      }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Schedule the campaign
    const result = await schedulerService.scheduleCampaign({
      name: name || `Scheduled Campaign ${new Date().toLocaleString()}`,
      templateId: template.id,
      userId: req.user.id,
      csvBuffer: csvBuffer,
      variableMappings: variableMappings ? JSON.parse(variableMappings) : {},
      defaultValues: defaultValues ? JSON.parse(defaultValues) : {},
      template: template,
      userName: currentUser.name || 'Usuario'
    }, scheduleDateTime);

    // Clean up uploaded file
    try {
      fs.unlinkSync(csvFile.path);
      console.log('🗑️ CSV file deleted after scheduling');
    } catch (cleanupError) {
      console.error('⚠️ Could not delete CSV file:', cleanupError.message);
    }

    res.json({
      success: true,
      message: `Campaña programada exitosamente para ${scheduleDateTime.toLocaleString('es-CO')}`,
      scheduledCampaign: {
        id: result.scheduledCampaign.id,
        name: result.scheduledCampaign.name,
        scheduledFor: result.scheduledFor,
        totalContacts: totalContactsToSend,
        template: template.name,
        status: 'scheduled'
      }
    });

  } catch (error) {
    console.error('Error creating scheduled campaign:', error);

    // Clean up file in case of error
    if (req.file && req.file.path) {
      try {
        const fs = require('fs');
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Cleaned up file after error');
      } catch (cleanupError) {
        console.error('Could not delete file after error:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Error interno del servidor al programar campaña'
    });
  }
});

/**
 * @route GET /api/scheduled-campaigns
 * @desc Get user's scheduled campaigns
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const campaigns = await schedulerService.getUserScheduledCampaigns(req.user.id);

    res.json({
      success: true,
      campaigns: campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        template: campaign.template,
        scheduledFor: campaign.scheduledFor,
        status: campaign.status,
        error: campaign.error,
        createdAt: campaign.createdAt,
        executedAt: campaign.executedAt,
        campaign: campaign.campaign
      }))
    });

  } catch (error) {
    console.error('Error fetching scheduled campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route DELETE /api/scheduled-campaigns/:id
 * @desc Cancel scheduled campaign
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await schedulerService.cancelScheduledCampaign(id, req.user.id);

    res.json({
      success: true,
      message: 'Campaña programada cancelada exitosamente'
    });

  } catch (error) {
    console.error('Error cancelling scheduled campaign:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error al cancelar campaña programada'
    });
  }
});

/**
 * @route GET /api/scheduled-campaigns/stats
 * @desc Get scheduling statistics for user
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await schedulerService.getSchedulingStats(req.user.id);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching scheduling stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * @route GET /api/scheduled-campaigns/:id
 * @desc Get specific scheduled campaign details
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.scheduledCampaign.findFirst({
      where: {
        id: id,
        userId: req.user.id
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            content: true,
            variables: true
          }
        },
        campaign: {
          select: {
            id: true,
            status: true,
            sentCount: true,
            errorCount: true,
            totalContacts: true
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaña programada no encontrada'
      });
    }

    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        template: campaign.template,
        scheduledFor: campaign.scheduledFor,
        status: campaign.status,
        error: campaign.error,
        createdAt: campaign.createdAt,
        executedAt: campaign.executedAt,
        campaign: campaign.campaign
      }
    });

  } catch (error) {
    console.error('Error fetching scheduled campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;