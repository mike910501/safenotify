const express = require('express');
const prisma = require('../db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

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
    const { twilioTemplateId, twilioSid } = req.body;

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

    // Activar la plantilla
    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: {
        status: 'active',
        twilioTemplateId,
        twilioSid: twilioSid || null,
        adminReviewedAt: new Date() // Update review time
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

module.exports = router;