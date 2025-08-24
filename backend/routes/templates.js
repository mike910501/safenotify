const express = require('express');
const { rateLimits, auditLogger } = require('../middleware/auth');
const twilioService = require('../config/twilio');
const db = require('../config/database');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @route GET /api/templates
 * @desc Get list of available Twilio WhatsApp templates
 * @access Private (API Key required)
 */
router.get('/',
  rateLimits.general,
  auditLogger('templates_list', 'template'),
  async (req, res) => {
    try {
      // Get templates from Twilio service
      const twilioTemplates = await twilioService.listAvailableTemplates();
      
      // Get template mappings from database for additional metadata
      const templateMappings = await db.all(`
        SELECT template_sid, template_name, variables, created_at, updated_at
        FROM template_mappings
      `);

      // Combine Twilio data with local mappings
      const templates = twilioTemplates.map(twilioTemplate => {
        const mapping = templateMappings.find(m => m.template_sid === twilioTemplate.sid);
        
        return {
          sid: twilioTemplate.sid,
          name: twilioTemplate.name,
          status: twilioTemplate.status,
          variables: mapping ? JSON.parse(mapping.variables) : twilioTemplate.variables || [],
          lastUpdated: mapping ? mapping.updated_at : null,
          isConfigured: !!mapping,
          category: getCategoryFromName(twilioTemplate.name)
        };
      });

      res.json({
        success: true,
        data: {
          templates,
          total: templates.length,
          configured: templates.filter(t => t.isConfigured).length,
          approved: templates.filter(t => t.status === 'approved').length
        }
      });

    } catch (error) {
      logger.error('Failed to get templates', {
        error: error.message,
        ip: req.ip
      });

      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get templates'
      });
    }
  }
);

/**
 * @route GET /api/templates/:sid
 * @desc Get specific template details
 * @access Private (API Key required)
 */
router.get('/:sid',
  rateLimits.general,
  auditLogger('template_view', 'template'),
  async (req, res) => {
    try {
      const templateSid = req.params.sid;

      // Get template mapping from database
      const mapping = await db.get(`
        SELECT * FROM template_mappings WHERE template_sid = ?
      `, [templateSid]);

      if (!mapping) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      // Get usage statistics
      const usageStats = await db.get(`
        SELECT 
          COUNT(DISTINCT c.id) as campaigns_used,
          COUNT(ml.id) as total_messages,
          COUNT(CASE WHEN ml.status = 'delivered' THEN 1 END) as delivered_messages,
          COUNT(CASE WHEN ml.status = 'failed' THEN 1 END) as failed_messages,
          MIN(c.created_at) as first_used,
          MAX(c.created_at) as last_used
        FROM campaigns c
        LEFT JOIN message_logs ml ON c.id = ml.campaign_id
        WHERE c.template_sid = ?
      `, [templateSid]);

      const template = {
        sid: mapping.template_sid,
        name: mapping.template_name,
        variables: JSON.parse(mapping.variables),
        createdAt: mapping.created_at,
        updatedAt: mapping.updated_at,
        category: getCategoryFromName(mapping.template_name),
        usage: {
          campaignsUsed: usageStats?.campaigns_used || 0,
          totalMessages: usageStats?.total_messages || 0,
          deliveredMessages: usageStats?.delivered_messages || 0,
          failedMessages: usageStats?.failed_messages || 0,
          successRate: usageStats?.total_messages > 0 
            ? ((usageStats.delivered_messages / usageStats.total_messages) * 100).toFixed(2)
            : 0,
          firstUsed: usageStats?.first_used,
          lastUsed: usageStats?.last_used
        }
      };

      res.json({
        success: true,
        data: template
      });

    } catch (error) {
      logger.error('Failed to get template details', {
        templateSid: req.params.sid,
        error: error.message,
        ip: req.ip
      });

      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get template details'
      });
    }
  }
);

/**
 * @route PUT /api/templates/:sid
 * @desc Update template mapping (variables, name, etc.)
 * @access Private (API Key required)
 */
router.put('/:sid',
  rateLimits.general,
  express.json(),
  auditLogger('template_update', 'template'),
  async (req, res) => {
    try {
      const templateSid = req.params.sid;
      const { templateName, variables } = req.body;

      if (!templateName || !variables || !Array.isArray(variables)) {
        return res.status(400).json({
          success: false,
          error: 'templateName and variables array are required'
        });
      }

      // Validate template SID format
      if (!templateSid.match(/^HX[a-f0-9]{32}$/i)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid template SID format'
        });
      }

      // Update or insert template mapping
      await db.run(`
        INSERT OR REPLACE INTO template_mappings 
        (template_sid, template_name, variables, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [templateSid, templateName, JSON.stringify(variables)]);

      logger.audit('template_mapping_updated', 'template', {
        templateSid,
        templateName,
        variables,
        ip: req.ip
      });

      res.json({
        success: true,
        message: 'Template mapping updated successfully',
        data: {
          sid: templateSid,
          name: templateName,
          variables,
          updatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to update template mapping', {
        templateSid: req.params.sid,
        error: error.message,
        ip: req.ip
      });

      res.status(400).json({
        success: false,
        error: error.message || 'Failed to update template mapping'
      });
    }
  }
);

/**
 * @route GET /api/templates/:sid/preview
 * @desc Generate preview of template with sample data
 * @access Private (API Key required)
 */
router.get('/:sid/preview',
  rateLimits.general,
  auditLogger('template_preview', 'template'),
  async (req, res) => {
    try {
      const templateSid = req.params.sid;
      const { sampleData } = req.query;

      // Get template mapping
      const mapping = await db.get(`
        SELECT * FROM template_mappings WHERE template_sid = ?
      `, [templateSid]);

      if (!mapping) {
        return res.status(404).json({
          success: false,
          error: 'Template not found'
        });
      }

      const variables = JSON.parse(mapping.variables);
      let parsedSampleData = {};

      // Parse sample data if provided
      if (sampleData) {
        try {
          parsedSampleData = JSON.parse(sampleData);
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid JSON in sampleData parameter'
          });
        }
      }

      // Generate preview with sample or default data
      const preview = generateTemplatePreview(mapping.template_name, variables, parsedSampleData);

      res.json({
        success: true,
        data: {
          templateSid,
          templateName: mapping.template_name,
          variables,
          preview,
          sampleData: parsedSampleData
        }
      });

    } catch (error) {
      logger.error('Failed to generate template preview', {
        templateSid: req.params.sid,
        error: error.message,
        ip: req.ip
      });

      res.status(400).json({
        success: false,
        error: error.message || 'Failed to generate template preview'
      });
    }
  }
);

/**
 * @route GET /api/templates/categories/stats
 * @desc Get template usage statistics by category
 * @access Private (API Key required)
 */
router.get('/categories/stats',
  rateLimits.general,
  auditLogger('template_category_stats', 'template'),
  async (req, res) => {
    try {
      // Get all templates with usage stats
      const templates = await db.all(`
        SELECT 
          tm.template_sid,
          tm.template_name,
          COUNT(DISTINCT c.id) as campaigns_used,
          COUNT(ml.id) as total_messages,
          COUNT(CASE WHEN ml.status = 'delivered' THEN 1 END) as delivered_messages
        FROM template_mappings tm
        LEFT JOIN campaigns c ON tm.template_sid = c.template_sid
        LEFT JOIN message_logs ml ON c.id = ml.campaign_id
        GROUP BY tm.template_sid, tm.template_name
      `);

      // Group by category
      const categoryStats = {};
      
      templates.forEach(template => {
        const category = getCategoryFromName(template.template_name);
        
        if (!categoryStats[category]) {
          categoryStats[category] = {
            name: category,
            templates: 0,
            campaignsUsed: 0,
            totalMessages: 0,
            deliveredMessages: 0,
            successRate: 0
          };
        }
        
        const cat = categoryStats[category];
        cat.templates++;
        cat.campaignsUsed += template.campaigns_used || 0;
        cat.totalMessages += template.total_messages || 0;
        cat.deliveredMessages += template.delivered_messages || 0;
      });

      // Calculate success rates
      Object.keys(categoryStats).forEach(category => {
        const cat = categoryStats[category];
        cat.successRate = cat.totalMessages > 0 
          ? ((cat.deliveredMessages / cat.totalMessages) * 100).toFixed(2)
          : 0;
      });

      res.json({
        success: true,
        data: {
          categories: Object.values(categoryStats),
          totalCategories: Object.keys(categoryStats).length
        }
      });

    } catch (error) {
      logger.error('Failed to get template category stats', {
        error: error.message,
        ip: req.ip
      });

      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get category statistics'
      });
    }
  }
);

// Helper functions
function getCategoryFromName(templateName) {
  const name = templateName.toLowerCase();
  
  if (name.includes('medical') || name.includes('doctor') || name.includes('appointment')) {
    return 'medical';
  } else if (name.includes('beauty') || name.includes('salon') || name.includes('spa')) {
    return 'beauty';
  } else if (name.includes('promotion') || name.includes('offer') || name.includes('discount')) {
    return 'promotion';
  } else if (name.includes('service') || name.includes('reminder')) {
    return 'service';
  } else {
    return 'general';
  }
}

function generateTemplatePreview(templateName, variables, sampleData) {
  // This is a simplified preview generator
  // In production, you'd want to fetch the actual template content from Twilio
  
  const sampleValues = {
    nombre: sampleData.nombre || 'Juan Pérez',
    doctor: sampleData.doctor || 'Dr. García',
    servicio: sampleData.servicio || 'Consulta General',
    fecha: sampleData.fecha || '2024-01-15',
    hora: sampleData.hora || '14:30',
    ubicacion: sampleData.ubicacion || 'Consultorio 201',
    telefono: sampleData.telefono || '+573001234567'
  };

  // Generate basic preview based on template name
  if (templateName.toLowerCase().includes('medical')) {
    return `Hola ${sampleValues.nombre}, le recordamos su cita con ${sampleValues.doctor} el ${sampleValues.fecha} a las ${sampleValues.hora}. Por favor confirme su asistencia.`;
  } else if (templateName.toLowerCase().includes('beauty')) {
    return `Hola ${sampleValues.nombre}! Su cita de ${sampleValues.servicio} está confirmada para el ${sampleValues.fecha} a las ${sampleValues.hora}. Nos vemos pronto! 💄`;
  } else if (templateName.toLowerCase().includes('service')) {
    return `Estimado/a ${sampleValues.nombre}, le recordamos su cita de ${sampleValues.servicio} el ${sampleValues.fecha} a las ${sampleValues.hora} en ${sampleValues.ubicacion}.`;
  } else if (templateName.toLowerCase().includes('promotion')) {
    return `¡${sampleValues.nombre}, oferta especial! 30% descuento en ${sampleValues.servicio} este fin de semana. Agenda ya: ${sampleValues.telefono}`;
  } else {
    return `Mensaje personalizado para ${sampleValues.nombre} usando las variables: ${variables.join(', ')}`;
  }
}

module.exports = router;