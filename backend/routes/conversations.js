/**
 * 💬 CONVERSATIONS API ENDPOINTS
 * 
 * Endpoints REST para gestión de conversaciones del sistema CRM de Users
 * 
 * ARQUITECTURA User-centric:
 * - Cada User gestiona sus propias conversaciones CRM
 * - Trabaja con CRMConversation (no SafeNotifyConversation)
 * - Autenticación JWT requerida en todos los endpoints
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const conversationService = require('../services/conversationManagementService');
const logger = require('../config/logger');

const prisma = new PrismaClient();
const router = express.Router();

// ============================================================================
// 📋 GET /api/conversations - LISTAR CONVERSACIONES
// ============================================================================

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      status: req.query.status,
      agentId: req.query.agentId,
      assigned: req.query.assigned,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search,
      tags: req.query.tags ? req.query.tags.split(',') : null
    };

    // Date range filter
    if (req.query.dateStart && req.query.dateEnd) {
      filters.dateRange = {
        start: req.query.dateStart,
        end: req.query.dateEnd
      };
    }

    console.log('🔍 Listing conversations for user:', userId, 'with filters:', filters);

    const result = await conversationService.getConversationsForUser(userId, filters);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Error listing conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo conversaciones'
    });
  }
});

// ============================================================================
// 📊 GET /api/conversations/summary - RESUMEN DE CONVERSACIONES
// ============================================================================

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('📊 Getting conversations summary for user:', userId);

    const summary = await conversationService.getConversationsSummary(userId);

    res.json({
      success: true,
      summary
    });

  } catch (error) {
    console.error('❌ Error getting conversations summary:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo resumen de conversaciones'
    });
  }
});

// ============================================================================
// 🔍 GET /api/conversations/:id - OBTENER CONVERSACIÓN ESPECÍFICA
// ============================================================================

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log('🔍 Getting conversation:', id, 'for user:', userId);

    const conversation = await prisma.cRMConversation.findFirst({
      where: {
        id: id,
        userId: userId
      },
      include: {
        customerLead: true,
        currentAgent: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        userWhatsAppNumber: {
          select: {
            id: true,
            phoneNumber: true,
            displayName: true
          }
        },
        assignedToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversación no encontrada'
      });
    }

    // Obtener métricas
    const metrics = await conversationService.getConversationMetrics(id);

    res.json({
      success: true,
      conversation: {
        ...conversation,
        metrics
      }
    });

  } catch (error) {
    console.error('❌ Error getting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo conversación'
    });
  }
});

// ============================================================================
// 🔄 PUT /api/conversations/:id/status - CAMBIAR ESTADO
// ============================================================================

router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, notes } = req.body;
    const userId = req.user.id;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status es requerido'
      });
    }

    const validStatuses = ['ACTIVE', 'ARCHIVED', 'CONVERTED', 'PAUSED'];
    if (!validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Status debe ser uno de: ${validStatuses.join(', ')}`
      });
    }

    console.log('🔄 Changing conversation status:', id, 'to:', status);

    const result = await conversationService.updateConversationStatus(
      id, 
      status, 
      userId, 
      { reason, notes }
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Error changing conversation status:', error);
    res.status(500).json({
      success: false,
      error: 'Error cambiando estado de conversación'
    });
  }
});

// ============================================================================
// 👤 PUT /api/conversations/:id/assign - ASIGNAR A USUARIO
// ============================================================================

router.put('/:id/assign', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedUserId, notes, notifyUser = true } = req.body;
    const userId = req.user.id;

    if (!assignedUserId) {
      return res.status(400).json({
        success: false,
        error: 'assignedUserId es requerido'
      });
    }

    console.log('👤 Assigning conversation:', id, 'to user:', assignedUserId);

    const result = await conversationService.assignConversation(
      id,
      assignedUserId,
      userId,
      { notes, notifyUser }
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Error assigning conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Error asignando conversación'
    });
  }
});

// ============================================================================
// 🏷️ PUT /api/conversations/:id/tags - GESTIONAR TAGS
// ============================================================================

router.put('/:id/tags', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { tags, replace = false } = req.body;
    const userId = req.user.id;

    if (!tags || !Array.isArray(tags)) {
      return res.status(400).json({
        success: false,
        error: 'Tags debe ser un array'
      });
    }

    console.log('🏷️ Managing tags for conversation:', id);

    const result = await conversationService.addConversationTags(
      id,
      tags,
      userId,
      { replace, source: 'manual' }
    );

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);

  } catch (error) {
    console.error('❌ Error managing conversation tags:', error);
    res.status(500).json({
      success: false,
      error: 'Error gestionando tags de conversación'
    });
  }
});

// ============================================================================
// 📊 GET /api/conversations/:id/metrics - MÉTRICAS DE CONVERSACIÓN
// ============================================================================

router.get('/:id/metrics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verificar ownership
    const conversation = await prisma.cRMConversation.findFirst({
      where: {
        id: id,
        userId: userId
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversación no encontrada'
      });
    }

    console.log('📊 Getting metrics for conversation:', id);

    const metrics = await conversationService.getConversationMetrics(id);

    res.json({
      success: true,
      metrics
    });

  } catch (error) {
    console.error('❌ Error getting conversation metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Error obteniendo métricas de conversación'
    });
  }
});

// ============================================================================
// 📦 POST /api/conversations/bulk - OPERACIONES EN LOTE
// ============================================================================

router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { operations } = req.body;
    const userId = req.user.id;

    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        error: 'Operations debe ser un array'
      });
    }

    // Validar estructura de operaciones
    for (const op of operations) {
      if (!op.type || !op.conversationIds || !Array.isArray(op.conversationIds)) {
        return res.status(400).json({
          success: false,
          error: 'Cada operación debe tener type y conversationIds'
        });
      }
    }

    console.log('📦 Performing bulk operations for user:', userId);

    const result = await conversationService.bulkOperations(userId, operations);

    res.json(result);

  } catch (error) {
    console.error('❌ Error in bulk operations:', error);
    res.status(500).json({
      success: false,
      error: 'Error en operaciones en lote'
    });
  }
});

// ============================================================================
// 💬 POST /api/conversations/:id/messages - ENVIAR MENSAJE MANUAL
// ============================================================================

router.post('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, type = 'human' } = req.body;
    const userId = req.user.id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Mensaje es requerido'
      });
    }

    // Verificar ownership y obtener conversación
    const conversation = await prisma.cRMConversation.findFirst({
      where: {
        id: id,
        userId: userId
      },
      include: {
        customerLead: true,
        userWhatsAppNumber: true
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversación no encontrada'
      });
    }

    console.log('💬 Sending manual message to conversation:', id);

    // Agregar mensaje a la conversación
    const newMessage = {
      role: 'assistant',
      content: message.trim(),
      timestamp: new Date().toISOString(),
      type: type,
      userId: userId // Marcar como mensaje manual del User
    };

    const updatedMessages = [...(conversation.messages || []), newMessage];

    // Actualizar conversación
    const updatedConversation = await prisma.cRMConversation.update({
      where: { id: id },
      data: {
        messages: updatedMessages,
        messageCount: { increment: 1 },
        lastActivity: new Date(),
        lastHumanResponse: new Date() // Marcar respuesta humana
      }
    });

    // Enviar mensaje por WhatsApp si es posible
    try {
      if (conversation.customerPhone && 
          process.env.TWILIO_ACCOUNT_SID && 
          process.env.TWILIO_AUTH_TOKEN && 
          process.env.TWILIO_WHATSAPP_NUMBER) {
        
        const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        const response = await client.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`, // Usar número de Twilio configurado
          to: `whatsapp:${conversation.customerPhone}`,
          body: message.trim()
        });

        console.log('✅ Manual message sent via WhatsApp:', response.sid);
      } else {
        console.log('⚠️ WhatsApp sending skipped - Twilio not configured or missing customer phone');
      }
    } catch (whatsappError) {
      console.error('⚠️ Warning: Could not send via WhatsApp:', whatsappError.message);
      // No fallar la request, solo loguear warning
    }

    // Emitir evento
    await conversationService.emitConversationEvent(id, 'manual_message_sent', {
      message: newMessage,
      conversation: updatedConversation
    });

    res.json({
      success: true,
      message: 'Mensaje enviado exitosamente',
      conversation: updatedConversation
    });

  } catch (error) {
    console.error('❌ Error sending manual message:', error);
    res.status(500).json({
      success: false,
      error: 'Error enviando mensaje'
    });
  }
});

// ============================================================================
// 🔄 PUT /api/conversations/:id/priority - CAMBIAR PRIORIDAD
// ============================================================================

router.put('/:id/priority', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;
    const userId = req.user.id;

    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    if (!priority || !validPriorities.includes(priority.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Priority debe ser uno de: ${validPriorities.join(', ')}`
      });
    }

    // Verificar ownership
    const conversation = await prisma.cRMConversation.findFirst({
      where: {
        id: id,
        userId: userId
      }
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversación no encontrada'
      });
    }

    console.log('🔄 Changing conversation priority:', id, 'to:', priority);

    const updatedConversation = await prisma.cRMConversation.update({
      where: { id: id },
      data: {
        priority: priority.toUpperCase(),
        lastActivity: new Date()
      }
    });

    // Log activity
    await conversationService.logConversationActivity(id, userId, 'PRIORITY_CHANGED', {
      oldPriority: conversation.priority,
      newPriority: priority.toUpperCase()
    });

    // Emit event
    await conversationService.emitConversationEvent(id, 'priority_changed', {
      oldPriority: conversation.priority,
      newPriority: priority.toUpperCase(),
      conversation: updatedConversation
    });

    res.json({
      success: true,
      conversation: updatedConversation,
      message: `Prioridad cambiada a ${priority}`
    });

  } catch (error) {
    console.error('❌ Error changing conversation priority:', error);
    res.status(500).json({
      success: false,
      error: 'Error cambiando prioridad de conversación'
    });
  }
});

// ============================================================================
// 📤 GET /api/conversations/export - EXPORTAR CONVERSACIONES
// ============================================================================

router.get('/export', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { format = 'csv', status, dateStart, dateEnd } = req.query;

    if (!['csv', 'json'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Formato debe ser csv o json'
      });
    }

    console.log('📤 Exporting conversations for user:', userId);

    // Construir filtros para export
    const filters = { page: 1, limit: 1000 }; // Max para export
    if (status) filters.status = status;
    if (dateStart && dateEnd) {
      filters.dateRange = { start: dateStart, end: dateEnd };
    }

    const result = await conversationService.getConversationsForUser(userId, filters);

    if (!result.success) {
      return res.status(500).json(result);
    }

    const filename = `conversaciones_${new Date().toISOString().split('T')[0]}.${format}`;

    if (format === 'csv') {
      // Convertir a CSV
      const csvData = result.conversations.map(conv => ({
        ID: conv.id,
        Cliente: conv.customerLead?.name || conv.customerPhone,
        Telefono: conv.customerPhone,
        Estado: conv.status,
        Prioridad: conv.priority,
        Agente: conv.currentAgent?.name || 'Sin asignar',
        Mensajes: conv.metrics?.totalMessages || 0,
        'Ultima Actividad': conv.lastActivity,
        Tags: (conv.tags || []).join(', '),
        'Score Calificacion': conv.customerLead?.qualificationScore || 0
      }));

      const csvHeaders = Object.keys(csvData[0] || {}).join(',');
      const csvRows = csvData.map(row => Object.values(row).join(',')).join('\n');
      const csvContent = `${csvHeaders}\n${csvRows}`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);

    } else {
      // Formato JSON
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.json({
        exportDate: new Date().toISOString(),
        userId: userId,
        conversations: result.conversations,
        summary: result.summary
      });
    }

  } catch (error) {
    console.error('❌ Error exporting conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Error exportando conversaciones'
    });
  }
});

module.exports = router;