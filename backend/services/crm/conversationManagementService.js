/**
 * 💬 CONVERSATION MANAGEMENT SERVICE
 * 
 * Servicio para gestión de conversaciones del sistema CRM de Users
 * 
 * IMPORTANTE: 
 * - Trabaja con CRMConversation (User CRM)
 * - NO con SafeNotifyConversation (Sofia's internal system)
 * - Arquitectura User-centric (cada User maneja sus propias conversaciones)
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const prisma = new PrismaClient();

class ConversationManagementService {

  /**
   * 1. 📋 Obtener conversaciones para un User con filtros
   */
  async getConversationsForUser(userId, filters = {}) {
    try {
      const {
        status = null,
        agentId = null,
        dateRange = null,
        score = null,
        assigned = null,
        page = 1,
        limit = 20,
        search = null,
        tags = null
      } = filters;

      // Validar límite máximo
      const pageLimit = Math.min(limit, 50);
      const offset = (page - 1) * pageLimit;

      // Construir filtros dinámicos
      const whereClause = {
        userId: userId
      };

      if (status && status !== 'all') {
        whereClause.status = status.toUpperCase();
      }

      if (agentId) {
        whereClause.currentAgentId = agentId;
      }

      if (assigned !== null) {
        if (assigned === 'true' || assigned === true) {
          whereClause.assignedToUserId = { not: null };
        } else {
          whereClause.assignedToUserId = null;
        }
      }

      if (dateRange) {
        const { start, end } = dateRange;
        whereClause.createdAt = {
          gte: new Date(start),
          lte: new Date(end)
        };
      }

      if (search) {
        whereClause.OR = [
          { customerPhone: { contains: search, mode: 'insensitive' } },
          { customerLead: { name: { contains: search, mode: 'insensitive' } } },
          { customerLead: { email: { contains: search, mode: 'insensitive' } } }
        ];
      }

      if (tags && tags.length > 0) {
        whereClause.tags = {
          hasSome: tags
        };
      }

      // Obtener conversaciones con información relacionada
      const conversations = await prisma.cRMConversation.findMany({
        where: whereClause,
        include: {
          customerLead: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              qualificationScore: true,
              status: true,
              source: true,
              businessType: true
            }
          },
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
        },
        orderBy: { lastActivity: 'desc' },
        skip: offset,
        take: pageLimit
      });

      // Obtener total para paginación
      const total = await prisma.cRMConversation.count({
        where: whereClause
      });

      // Procesar conversaciones para incluir métricas y último mensaje
      const processedConversations = await Promise.all(
        conversations.map(async (conv) => {
          const metrics = await this.getConversationMetrics(conv.id);
          const lastMessage = this.getLastMessage(conv.messages);
          
          return {
            ...conv,
            metrics,
            lastMessage,
            // Campos computados
            isOverdue: this.isConversationOverdue(conv.lastActivity),
            needsAttention: this.needsAttention(conv, metrics)
          };
        })
      );

      return {
        success: true,
        conversations: processedConversations,
        pagination: {
          page,
          limit: pageLimit,
          total,
          totalPages: Math.ceil(total / pageLimit)
        },
        summary: await this.getConversationsSummary(userId)
      };

    } catch (error) {
      logger.error('Error getting conversations for user:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 2. 🔄 Cambiar estado de conversación
   */
  async updateConversationStatus(conversationId, status, userId, options = {}) {
    try {
      const { reason = null, notes = null } = options;

      // Verificar ownership
      const conversation = await prisma.cRMConversation.findFirst({
        where: {
          id: conversationId,
          userId: userId
        }
      });

      if (!conversation) {
        return {
          success: false,
          error: 'Conversación no encontrada o sin permisos'
        };
      }

      // Actualizar estado
      const updatedConversation = await prisma.cRMConversation.update({
        where: { id: conversationId },
        data: {
          status: status.toUpperCase(),
          statusUpdatedAt: new Date(),
          lastActivity: new Date(),
          // Agregar metadata del cambio
          metadata: {
            ...conversation.metadata,
            statusHistory: [
              ...(conversation.metadata?.statusHistory || []),
              {
                from: conversation.status,
                to: status.toUpperCase(),
                timestamp: new Date().toISOString(),
                reason,
                notes
              }
            ]
          }
        },
        include: {
          customerLead: true,
          currentAgent: true
        }
      });

      // Registrar en audit log
      await this.logConversationActivity(conversationId, userId, 'STATUS_CHANGE', {
        oldStatus: conversation.status,
        newStatus: status.toUpperCase(),
        reason,
        notes
      });

      // Emitir evento para real-time updates
      await this.emitConversationEvent(conversationId, 'status_updated', {
        oldStatus: conversation.status,
        newStatus: status.toUpperCase(),
        conversation: updatedConversation
      });

      return {
        success: true,
        conversation: updatedConversation,
        message: `Estado cambiado a ${status}`
      };

    } catch (error) {
      logger.error('Error updating conversation status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 3. 👤 Asignar conversación a usuario humano
   */
  async assignConversation(conversationId, assignedUserId, assigningUserId, options = {}) {
    try {
      const { notes = null, notifyUser = true } = options;

      // Verificar ownership de la conversación
      const conversation = await prisma.cRMConversation.findFirst({
        where: {
          id: conversationId,
          userId: assigningUserId // Solo el dueño puede asignar
        },
        include: {
          customerLead: true,
          currentAgent: true
        }
      });

      if (!conversation) {
        return {
          success: false,
          error: 'Conversación no encontrada o sin permisos'
        };
      }

      // Verificar que el usuario a asignar exista y tenga acceso
      const assignedUser = await prisma.user.findFirst({
        where: {
          id: assignedUserId
        }
      });

      if (!assignedUser) {
        return {
          success: false,
          error: 'Usuario a asignar no encontrado'
        };
      }

      // Actualizar asignación
      const updatedConversation = await prisma.cRMConversation.update({
        where: { id: conversationId },
        data: {
          assignedToUserId: assignedUserId,
          assignedAt: new Date(),
          lastActivity: new Date(),
          // Marcar en metadata para que AI sepa
          metadata: {
            ...conversation.metadata,
            assignedToHuman: true,
            assignmentHistory: [
              ...(conversation.metadata?.assignmentHistory || []),
              {
                assignedTo: assignedUserId,
                assignedBy: assigningUserId,
                timestamp: new Date().toISOString(),
                notes
              }
            ]
          }
        },
        include: {
          customerLead: true,
          currentAgent: true,
          assignedToUser: true
        }
      });

      // Registrar actividad
      await this.logConversationActivity(conversationId, assigningUserId, 'ASSIGNED', {
        assignedTo: assignedUserId,
        assignedToName: assignedUser.name,
        notes
      });

      // Notificar al usuario asignado
      if (notifyUser) {
        await this.notifyUserAssignment(assignedUserId, updatedConversation);
      }

      // Emitir evento
      await this.emitConversationEvent(conversationId, 'assigned', {
        assignedTo: assignedUser,
        conversation: updatedConversation
      });

      return {
        success: true,
        conversation: updatedConversation,
        message: `Conversación asignada a ${assignedUser.name || assignedUser.email}`
      };

    } catch (error) {
      logger.error('Error assigning conversation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 4. 🏷️ Agregar tags a conversación
   */
  async addConversationTags(conversationId, tags, userId, options = {}) {
    try {
      const { replace = false, source = 'manual' } = options;

      // Verificar ownership
      const conversation = await prisma.cRMConversation.findFirst({
        where: {
          id: conversationId,
          userId: userId
        }
      });

      if (!conversation) {
        return {
          success: false,
          error: 'Conversación no encontrada o sin permisos'
        };
      }

      // Procesar tags (limpiar y validar)
      const processedTags = tags
        .filter(tag => tag && typeof tag === 'string')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length <= 50)
        .slice(0, 10); // Máximo 10 tags

      if (processedTags.length === 0) {
        return {
          success: false,
          error: 'No se proporcionaron tags válidos'
        };
      }

      // Determinar tags finales
      const currentTags = conversation.tags || [];
      const finalTags = replace ? 
        processedTags : 
        [...new Set([...currentTags, ...processedTags])]; // Eliminar duplicados

      // Actualizar conversación
      const updatedConversation = await prisma.cRMConversation.update({
        where: { id: conversationId },
        data: {
          tags: finalTags,
          lastActivity: new Date(),
          metadata: {
            ...conversation.metadata,
            tagHistory: [
              ...(conversation.metadata?.tagHistory || []),
              {
                action: replace ? 'replace' : 'add',
                tags: processedTags,
                source,
                timestamp: new Date().toISOString()
              }
            ]
          }
        }
      });

      // Registrar actividad
      await this.logConversationActivity(conversationId, userId, 'TAGS_UPDATED', {
        action: replace ? 'replace' : 'add',
        tags: processedTags,
        finalTags
      });

      // Emitir evento
      await this.emitConversationEvent(conversationId, 'tags_updated', {
        tags: finalTags,
        addedTags: processedTags
      });

      return {
        success: true,
        conversation: updatedConversation,
        addedTags: processedTags,
        allTags: finalTags,
        message: `Tags ${replace ? 'actualizados' : 'agregados'} exitosamente`
      };

    } catch (error) {
      logger.error('Error adding conversation tags:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 5. 📊 Calcular métricas de conversación
   */
  async getConversationMetrics(conversationId) {
    try {
      const conversation = await prisma.cRMConversation.findUnique({
        where: { id: conversationId },
        include: { customerLead: true }
      });

      if (!conversation || !conversation.messages) {
        return this.getDefaultMetrics();
      }

      const messages = conversation.messages;
      const userMessages = messages.filter(m => m.role === 'user');
      const assistantMessages = messages.filter(m => m.role === 'assistant');

      // Métricas básicas
      const totalMessages = messages.length;
      const userMessageCount = userMessages.length;
      const assistantMessageCount = assistantMessages.length;

      // Cálculos de tiempo
      const firstMessage = messages[0];
      const lastMessage = messages[messages.length - 1];
      const conversationDuration = firstMessage && lastMessage ? 
        new Date(lastMessage.timestamp) - new Date(firstMessage.timestamp) : 0;

      // Tiempo de primera respuesta
      let firstResponseTime = null;
      if (userMessages.length > 0 && assistantMessages.length > 0) {
        const firstUserMsg = userMessages[0];
        const firstAssistantMsg = assistantMessages.find(m => 
          new Date(m.timestamp) > new Date(firstUserMsg.timestamp)
        );
        if (firstAssistantMsg) {
          firstResponseTime = new Date(firstAssistantMsg.timestamp) - new Date(firstUserMsg.timestamp);
        }
      }

      // Tiempo promedio de respuesta
      let totalResponseTimes = 0;
      let responseCount = 0;
      for (let i = 0; i < messages.length - 1; i++) {
        const currentMsg = messages[i];
        const nextMsg = messages[i + 1];
        if (currentMsg.role === 'user' && nextMsg.role === 'assistant') {
          totalResponseTimes += new Date(nextMsg.timestamp) - new Date(currentMsg.timestamp);
          responseCount++;
        }
      }
      const averageResponseTime = responseCount > 0 ? totalResponseTimes / responseCount : null;

      // Análisis de actividad
      const lastActivity = conversation.lastActivity || conversation.updatedAt;
      const timeSinceLastActivity = new Date() - new Date(lastActivity);
      const isStale = timeSinceLastActivity > (24 * 60 * 60 * 1000); // 24 horas

      // Engagement score (0-100)
      const engagementScore = this.calculateEngagementScore({
        userMessageCount,
        assistantMessageCount,
        conversationDuration,
        qualificationScore: conversation.customerLead?.qualificationScore || 0,
        responseConsistency: responseCount > 0
      });

      return {
        totalMessages,
        userMessages: userMessageCount,
        assistantMessages: assistantMessageCount,
        firstResponseTime: firstResponseTime ? Math.round(firstResponseTime / 1000) : null, // en segundos
        averageResponseTime: averageResponseTime ? Math.round(averageResponseTime / 1000) : null, // en segundos
        conversationDuration: Math.round(conversationDuration / 1000), // en segundos
        timeSinceLastActivity: Math.round(timeSinceLastActivity / 1000), // en segundos
        isStale,
        engagementScore,
        qualificationScore: conversation.customerLead?.qualificationScore || 0,
        lastActivity: lastActivity,
        createdAt: conversation.createdAt
      };

    } catch (error) {
      logger.error('Error calculating conversation metrics:', error);
      return this.getDefaultMetrics();
    }
  }

  /**
   * 6. 📦 Operaciones en lote
   */
  async bulkOperations(userId, operations) {
    try {
      const results = {
        success: true,
        processed: 0,
        failed: 0,
        errors: []
      };

      for (const operation of operations) {
        try {
          const { type, conversationIds, data } = operation;

          // Verificar ownership en lote
          const conversations = await prisma.cRMConversation.findMany({
            where: {
              id: { in: conversationIds },
              userId: userId
            }
          });

          if (conversations.length !== conversationIds.length) {
            results.errors.push(`Algunas conversaciones no fueron encontradas o no tienes permisos`);
            results.failed += conversationIds.length - conversations.length;
            continue;
          }

          switch (type) {
            case 'archive':
              await prisma.cRMConversation.updateMany({
                where: { id: { in: conversationIds } },
                data: { 
                  status: 'ARCHIVED',
                  statusUpdatedAt: new Date()
                }
              });
              break;

            case 'assign':
              if (!data.assignedUserId) {
                throw new Error('assignedUserId es requerido para asignación');
              }
              await prisma.cRMConversation.updateMany({
                where: { id: { in: conversationIds } },
                data: { 
                  assignedToUserId: data.assignedUserId,
                  assignedAt: new Date()
                }
              });
              break;

            case 'add_tags':
              if (!data.tags || !Array.isArray(data.tags)) {
                throw new Error('tags es requerido para agregar tags');
              }
              // Para bulk tags, necesitamos actualizar uno por uno para preservar tags existentes
              for (const convId of conversationIds) {
                await this.addConversationTags(convId, data.tags, userId, { source: 'bulk' });
              }
              break;

            case 'change_priority':
              if (!data.priority) {
                throw new Error('priority es requerido');
              }
              await prisma.cRMConversation.updateMany({
                where: { id: { in: conversationIds } },
                data: { priority: data.priority.toUpperCase() }
              });
              break;

            default:
              throw new Error(`Operación no soportada: ${type}`);
          }

          results.processed += conversationIds.length;

          // Log bulk operation
          await this.logConversationActivity(null, userId, 'BULK_OPERATION', {
            operation: type,
            conversationIds,
            data,
            count: conversationIds.length
          });

        } catch (operationError) {
          logger.error(`Error in bulk operation ${operation.type}:`, operationError);
          results.errors.push(`${operation.type}: ${operationError.message}`);
          results.failed += operation.conversationIds?.length || 1;
        }
      }

      if (results.failed > 0) {
        results.success = false;
      }

      return results;

    } catch (error) {
      logger.error('Error in bulk operations:', error);
      return {
        success: false,
        error: error.message,
        processed: 0,
        failed: operations.length
      };
    }
  }

  // ============================================================================
  // MÉTODOS AUXILIARES
  // ============================================================================

  /**
   * Obtener último mensaje de la conversación
   */
  getLastMessage(messages) {
    if (!messages || messages.length === 0) return null;
    
    const lastMessage = messages[messages.length - 1];
    return {
      role: lastMessage.role,
      content: lastMessage.content?.substring(0, 100) || '',
      timestamp: lastMessage.timestamp,
      agentId: lastMessage.agentId || null
    };
  }

  /**
   * Verificar si conversación está retrasada
   */
  isConversationOverdue(lastActivity) {
    const now = new Date();
    const lastActivityDate = new Date(lastActivity);
    const hoursSince = (now - lastActivityDate) / (1000 * 60 * 60);
    
    return hoursSince > 24; // Más de 24 horas sin actividad
  }

  /**
   * Determinar si conversación necesita atención
   */
  needsAttention(conversation, metrics) {
    return (
      conversation.priority === 'HIGH' ||
      conversation.status === 'ACTIVE' && metrics.isStale ||
      metrics.qualificationScore > 70 ||
      conversation.assignedToUserId && !conversation.lastHumanResponse
    );
  }

  /**
   * Calcular score de engagement
   */
  calculateEngagementScore({ userMessageCount, assistantMessageCount, conversationDuration, qualificationScore, responseConsistency }) {
    let score = 0;
    
    // Participación del usuario (30%)
    score += Math.min((userMessageCount / 10) * 30, 30);
    
    // Duración de conversación (20%)
    const durationMinutes = conversationDuration / 60;
    score += Math.min((durationMinutes / 30) * 20, 20);
    
    // Score de calificación (30%)
    score += (qualificationScore / 100) * 30;
    
    // Consistencia de respuestas (20%)
    score += responseConsistency ? 20 : 0;
    
    return Math.round(score);
  }

  /**
   * Métricas por defecto
   */
  getDefaultMetrics() {
    return {
      totalMessages: 0,
      userMessages: 0,
      assistantMessages: 0,
      firstResponseTime: null,
      averageResponseTime: null,
      conversationDuration: 0,
      timeSinceLastActivity: 0,
      isStale: false,
      engagementScore: 0,
      qualificationScore: 0,
      lastActivity: null,
      createdAt: null
    };
  }

  /**
   * Obtener resumen de conversaciones para un User
   */
  async getConversationsSummary(userId) {
    try {
      const summary = await prisma.cRMConversation.groupBy({
        by: ['status'],
        where: { userId },
        _count: { id: true }
      });

      const result = {
        total: 0,
        active: 0,
        archived: 0,
        converted: 0,
        assigned: 0,
        needsAttention: 0
      };

      summary.forEach(group => {
        result.total += group._count.id;
        switch (group.status) {
          case 'ACTIVE':
            result.active = group._count.id;
            break;
          case 'ARCHIVED':
            result.archived = group._count.id;
            break;
          case 'CONVERTED':
            result.converted = group._count.id;
            break;
        }
      });

      // Contar asignadas
      const assignedCount = await prisma.cRMConversation.count({
        where: {
          userId,
          assignedToUserId: { not: null }
        }
      });
      result.assigned = assignedCount;

      // Contar que necesitan atención (simplificado)
      const needsAttentionCount = await prisma.cRMConversation.count({
        where: {
          userId,
          OR: [
            { priority: 'HIGH' },
            { 
              status: 'ACTIVE',
              lastActivity: {
                lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Más de 24 horas
              }
            }
          ]
        }
      });
      result.needsAttention = needsAttentionCount;

      return result;

    } catch (error) {
      logger.error('Error getting conversations summary:', error);
      return {
        total: 0,
        active: 0,
        archived: 0,
        converted: 0,
        assigned: 0,
        needsAttention: 0
      };
    }
  }

  /**
   * Registrar actividad en audit log
   */
  async logConversationActivity(conversationId, userId, action, details = {}) {
    try {
      // TODO: Implementar tabla de audit log si se requiere
      logger.info(`Conversation activity: ${action}`, {
        conversationId,
        userId,
        action,
        details,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error logging conversation activity:', error);
    }
  }

  /**
   * Emitir evento para real-time updates
   */
  async emitConversationEvent(conversationId, event, data = {}) {
    try {
      // TODO: Implementar WebSocket/Server-Sent Events
      logger.info(`Conversation event: ${event}`, {
        conversationId,
        event,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error emitting conversation event:', error);
    }
  }

  /**
   * Notificar usuario sobre asignación
   */
  async notifyUserAssignment(userId, conversation) {
    try {
      // TODO: Implementar sistema de notificaciones
      logger.info('User assignment notification sent', {
        userId,
        conversationId: conversation.id,
        customerPhone: conversation.customerPhone
      });
    } catch (error) {
      logger.error('Error sending assignment notification:', error);
    }
  }
}

module.exports = new ConversationManagementService();