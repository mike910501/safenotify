const express = require('express');
const prisma = require('../db');
const { authenticateToken: verifyToken } = require('../middleware/auth');
const aiTemplateValidator = require('../services/aiTemplateValidator');

const router = express.Router();

// Obtener todas las plantillas del usuario
router.get('/', verifyToken, async (req, res) => {
  try {
    const templates = await prisma.template.findMany({
      where: {
        OR: [
          { userId: req.user.id }, // Templates del usuario
          { isPublic: true }        // Templates públicas
        ]
      },
      orderBy: [
        { isPublic: 'asc' },      // Primero las del usuario
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      templates: templates
    });
  } catch (error) {
    console.error('Error obteniendo templates:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener plantillas aprobadas/activas del usuario (para usar en campañas)
router.get('/approved', verifyToken, async (req, res) => {
  try {
    const approvedTemplates = await prisma.template.findMany({
      where: {
        userId: req.user.id,
        status: {
          in: ['approved', 'active'] // Solo plantillas aprobadas o activas
        }
      },
      orderBy: [
        { status: 'desc' }, // Activas primero
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      templates: approvedTemplates,
      count: approvedTemplates.length
    });
  } catch (error) {
    console.error('Error obteniendo templates aprobadas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Validar template con IA
router.post('/validate', verifyToken, async (req, res) => {
  try {
    const { name, content, category, variables } = req.body;

    // Validaciones básicas
    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y contenido son requeridos'
      });
    }

    // Validaciones de seguridad - Links externos
    const dangerousPatterns = [
      /wa\.me\/\d+/i,           // Links de WhatsApp
      /whatsapp\.com\/\d+/i,   // Links de WhatsApp
      /\+\d{1,3}\s?\d{3,}/,    // Números telefónicos externos
      /bitcoin|btc|crypto/i,   // Criptomonedas
      /cuenta.*banco|transferir.*dinero/i, // Información bancaria
      /contraseña|password|pin/i // Datos sensibles
    ];

    const foundDangerousContent = dangerousPatterns.some(pattern => 
      pattern.test(content) || pattern.test(name)
    );

    if (foundDangerousContent) {
      return res.status(400).json({
        success: false,
        error: '❌ Tu plantilla contiene contenido no permitido (links externos, números de WhatsApp, o información sensible). Por favor revisa el contenido y elimina cualquier referencia a otros contactos o servicios externos.'
      });
    }

    if (!aiTemplateValidator.isConfigured()) {
      return res.status(500).json({
        success: false,
        error: 'Servicio de IA no configurado'
      });
    }

    console.log(`🤖 Iniciando validación IA para template: ${name}`);

    // Validar con IA
    const validation = await aiTemplateValidator.validateTemplate({
      name,
      content, 
      category: category || 'general',
      variables: variables || []
    });

    if (!validation.success) {
      return res.status(500).json({
        success: false,
        error: validation.error
      });
    }

    // Generar guía de Excel si tiene variables
    let excelGuide = null;
    if (variables && variables.length > 0) {
      excelGuide = aiTemplateValidator.generateExcelGuide(variables, content);
    }

    console.log(`✅ Validación IA completada - Aprobado: ${validation.approved}, Score: ${validation.score}`);

    res.json({
      success: true,
      validation: {
        approved: validation.approved,
        score: validation.score,
        reasons: validation.reasons,
        suggestions: validation.suggestions,
        riskLevel: validation.riskLevel,
        excelRequirements: validation.excelRequirements
      },
      excelGuide: excelGuide
    });

  } catch (error) {
    console.error('Error en validación con IA:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Crear nueva template (después de validación IA)
router.post('/create', verifyToken, async (req, res) => {
  try {
    const { name, content, category, variables, validationData } = req.body;

    // Validaciones básicas
    if (!name || !content) {
      return res.status(400).json({
        success: false,
        error: 'Nombre y contenido son requeridos'
      });
    }

    // Validaciones de seguridad - Links externos (doble verificación)
    const dangerousPatterns = [
      /wa\.me\/\d+/i,           // Links de WhatsApp
      /whatsapp\.com\/\d+/i,   // Links de WhatsApp
      /\+\d{1,3}\s?\d{3,}/,    // Números telefónicos externos
      /bitcoin|btc|crypto/i,   // Criptomonedas
      /cuenta.*banco|transferir.*dinero/i, // Información bancaria
      /contraseña|password|pin/i // Datos sensibles
    ];

    const foundDangerousContent = dangerousPatterns.some(pattern => 
      pattern.test(content) || pattern.test(name)
    );

    if (foundDangerousContent) {
      return res.status(400).json({
        success: false,
        error: '❌ Tu plantilla contiene contenido no permitido. No puedes incluir links a WhatsApp externos, números telefónicos, o información sensible.'
      });
    }

    // La IA debe haber validado primero
    if (!validationData) {
      return res.status(400).json({
        success: false,
        error: 'La plantilla debe ser validada por IA antes de crearla'
      });
    }

    // Verificar que no existe una template con el mismo nombre del usuario
    const existingTemplate = await prisma.template.findFirst({
      where: {
        name: name,
        userId: req.user.id
      }
    });

    if (existingTemplate) {
      return res.status(400).json({
        success: false,
        error: 'Ya tienes una plantilla con ese nombre'
      });
    }

    // Crear la template - SIEMPRE queda PENDIENTE para revisión manual
    const template = await prisma.template.create({
      data: {
        name,
        content,
        category: category || 'general',
        variables: variables || [],
        userId: req.user.id,
        
        // Estado del workflow: siempre pending hasta aprobación manual
        status: 'pending',
        isPublic: false,
        
        // Guardar datos de validación IA
        aiApproved: validationData.approved || false,
        aiScore: validationData.score || 0,
        aiReasons: validationData.reasons || [],
        aiSuggestions: validationData.suggestions || []
      }
    });

    console.log(`✅ Template creada: ${template.name} (ID: ${template.id}) - Estado: PENDING`);

    res.json({
      success: true,
      template: template,
      message: '¡Plantilla creada exitosamente! 🎉 Tu plantilla está siendo procesada y estará lista para usar en tus campañas muy pronto.'
    });

  } catch (error) {
    console.error('Error creando template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener template específica
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const templateId = req.params.id;

    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        OR: [
          { userId: req.user.id },
          { isPublic: true }
        ]
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrada'
      });
    }

    res.json({
      success: true,
      template: template
    });

  } catch (error) {
    console.error('Error obteniendo template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Actualizar template
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const templateId = req.params.id;
    const { name, content, category, variables } = req.body;

    // Verificar que la template pertenece al usuario
    const existingTemplate = await prisma.template.findFirst({
      where: {
        id: templateId,
        userId: req.user.id
      }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrada'
      });
    }

    // Actualizar template
    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: {
        ...(name && { name }),
        ...(content && { content }),
        ...(category && { category }),
        ...(variables && { variables }),
        // Si se modifica el contenido, requiere nueva aprobación
        ...(content && content !== existingTemplate.content && { isApproved: false })
      }
    });

    console.log(`✅ Template actualizada: ${updatedTemplate.name}`);

    res.json({
      success: true,
      template: updatedTemplate,
      message: content && content !== existingTemplate.content 
        ? 'Template actualizada - requiere nueva validación IA' 
        : 'Template actualizada'
    });

  } catch (error) {
    console.error('Error actualizando template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Eliminar template
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const templateId = req.params.id;

    // Verificar que la template pertenece al usuario
    const existingTemplate = await prisma.template.findFirst({
      where: {
        id: templateId,
        userId: req.user.id
      }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrada'
      });
    }

    // Verificar que no esté siendo usada en campañas activas
    const activeCampaigns = await prisma.campaign.findMany({
      where: {
        templateId: templateId,
        status: {
          in: ['draft', 'sending']
        }
      }
    });

    if (activeCampaigns.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'No se puede eliminar una template que está siendo usada en campañas activas'
      });
    }

    // Eliminar template
    await prisma.template.delete({
      where: { id: templateId }
    });

    console.log(`🗑️ Template eliminada: ${existingTemplate.name}`);

    res.json({
      success: true,
      message: 'Template eliminada correctamente'
    });

  } catch (error) {
    console.error('Error eliminando template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Obtener estadísticas de templates del usuario
router.get('/stats/user', verifyToken, async (req, res) => {
  try {
    // Templates del usuario
    const userTemplates = await prisma.template.findMany({
      where: { userId: req.user.id },
      include: {
        campaigns: {
          select: {
            id: true,
            sentCount: true,
            status: true
          }
        }
      }
    });

    // Calcular estadísticas con nuevos estados
    const stats = {
      total: userTemplates.length,
      aiPending: userTemplates.filter(t => t.status === 'ai_pending').length,
      pending: userTemplates.filter(t => t.status === 'pending').length,
      approved: userTemplates.filter(t => t.status === 'approved').length,
      rejected: userTemplates.filter(t => t.status === 'rejected').length,
      active: userTemplates.filter(t => t.status === 'active').length,
      public: userTemplates.filter(t => t.isPublic).length,
      private: userTemplates.filter(t => !t.isPublic).length,
      totalUsage: userTemplates.reduce((sum, t) => sum + (t.usageCount || 0), 0),
      categories: {}
    };

    // Estadísticas por categoría
    userTemplates.forEach(template => {
      if (!stats.categories[template.category]) {
        stats.categories[template.category] = 0;
      }
      stats.categories[template.category]++;
    });

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas de templates:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;