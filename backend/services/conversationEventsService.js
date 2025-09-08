/**
 * 📡 CONVERSATION EVENTS SERVICE
 * 
 * Servicio para manejo de eventos y webhooks de conversaciones
 * 
 * CARACTERÍSTICAS:
 * - Eventos en tiempo real para dashboard
 * - Webhooks para integraciones externas
 * - Sistema de notificaciones
 * - Queue para procesamiento asíncrono
 */

const EventEmitter = require('events');
const logger = require('../config/logger');

class ConversationEventsService extends EventEmitter {
  
  constructor() {
    super();
    this.webhookEndpoints = new Map();
    this.eventQueue = [];
    this.isProcessingQueue = false;
    
    // Configurar listeners internos
    this.setupInternalListeners();
  }

  // ============================================================================
  // EVENTOS DE CONVERSACIÓN
  // ============================================================================

  /**
   * 🎯 Emitir evento de conversación
   */
  async emitConversationEvent(eventType, data = {}) {
    try {
      const event = {
        id: this.generateEventId(),
        type: eventType,
        timestamp: new Date().toISOString(),
        data,
        userId: data.userId || data.conversation?.userId
      };

      // Emitir evento interno
      this.emit(eventType, event);

      // Agregar a queue para procesamiento
      this.eventQueue.push(event);
      this.processEventQueue();

      logger.info(`Conversation event emitted: ${eventType}`, {
        eventId: event.id,
        userId: event.userId
      });

      return event.id;

    } catch (error) {
      logger.error('Error emitting conversation event:', error);
      throw error;
    }
  }

  /**
   * 📝 Eventos específicos de conversación
   */
  async emitConversationCreated(conversation) {
    return this.emitConversationEvent('conversation.created', {
      conversation,
      userId: conversation.userId
    });
  }

  async emitConversationUpdated(conversation, changes = {}) {
    return this.emitConversationEvent('conversation.updated', {
      conversation,
      changes,
      userId: conversation.userId
    });
  }

  async emitConversationStatusChanged(conversation, oldStatus, newStatus) {
    return this.emitConversationEvent('conversation.status_changed', {
      conversation,
      oldStatus,
      newStatus,
      userId: conversation.userId
    });
  }

  async emitConversationAssigned(conversation, assignedTo, assignedBy) {
    return this.emitConversationEvent('conversation.assigned', {
      conversation,
      assignedTo,
      assignedBy,
      userId: conversation.userId
    });
  }

  async emitMessageReceived(conversation, message) {
    return this.emitConversationEvent('message.received', {
      conversation,
      message,
      userId: conversation.userId
    });
  }

  async emitMessageSent(conversation, message, agentId = null) {
    return this.emitConversationEvent('message.sent', {
      conversation,
      message,
      agentId,
      userId: conversation.userId
    });
  }

  async emitConversationTagsUpdated(conversation, oldTags, newTags) {
    return this.emitConversationEvent('conversation.tags_updated', {
      conversation,
      oldTags,
      newTags,
      userId: conversation.userId
    });
  }

  async emitConversationPriorityChanged(conversation, oldPriority, newPriority) {
    return this.emitConversationEvent('conversation.priority_changed', {
      conversation,
      oldPriority,
      newPriority,
      userId: conversation.userId
    });
  }

  // ============================================================================
  // WEBHOOKS PARA INTEGRACIONES EXTERNAS
  // ============================================================================

  /**
   * 🔗 Registrar webhook endpoint
   */
  registerWebhook(userId, url, events = [], secret = null) {
    try {
      const webhookId = this.generateWebhookId();
      
      this.webhookEndpoints.set(webhookId, {
        id: webhookId,
        userId,
        url,
        events,
        secret,
        active: true,
        createdAt: new Date().toISOString(),
        lastTriggered: null,
        successCount: 0,
        failureCount: 0
      });

      logger.info('Webhook registered', { webhookId, userId, url });
      
      return webhookId;

    } catch (error) {
      logger.error('Error registering webhook:', error);
      throw error;
    }
  }

  /**
   * 🔗 Desregistrar webhook
   */
  unregisterWebhook(webhookId) {
    const deleted = this.webhookEndpoints.delete(webhookId);
    if (deleted) {
      logger.info('Webhook unregistered', { webhookId });
    }
    return deleted;
  }

  /**
   * 📤 Enviar webhook
   */
  async sendWebhook(webhook, event) {
    try {
      const payload = {
        webhook_id: webhook.id,
        event_id: event.id,
        event_type: event.type,
        timestamp: event.timestamp,
        data: event.data
      };

      // Generar signature si hay secret
      let signature = null;
      if (webhook.secret) {
        const crypto = require('crypto');
        signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(JSON.stringify(payload))
          .digest('hex');
      }

      // Preparar headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'SafeNotify-CRM-Webhooks/1.0'
      };

      if (signature) {
        headers['X-SafeNotify-Signature'] = `sha256=${signature}`;
      }

      // Enviar webhook (timeout 10 segundos)
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        timeout: 10000
      });

      // Actualizar estadísticas
      webhook.lastTriggered = new Date().toISOString();
      if (response.ok) {
        webhook.successCount++;
      } else {
        webhook.failureCount++;
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      logger.info('Webhook sent successfully', {
        webhookId: webhook.id,
        eventType: event.type,
        responseStatus: response.status
      });

      return true;

    } catch (error) {
      webhook.failureCount++;
      logger.error('Error sending webhook:', error, {
        webhookId: webhook.id,
        url: webhook.url,
        eventType: event.type
      });

      // Desactivar webhook si falla muchas veces
      if (webhook.failureCount >= 5) {
        webhook.active = false;
        logger.warn('Webhook deactivated due to failures', { webhookId: webhook.id });
      }

      return false;
    }
  }

  // ============================================================================
  // SISTEMA DE NOTIFICACIONES
  // ============================================================================

  /**
   * 🔔 Enviar notificación a usuario
   */
  async notifyUser(userId, notification) {
    try {
      const notificationEvent = {
        id: this.generateEventId(),
        type: 'user.notification',
        timestamp: new Date().toISOString(),
        userId,
        data: {
          title: notification.title,
          message: notification.message,
          type: notification.type || 'info',
          action: notification.action || null,
          metadata: notification.metadata || {}
        }
      };

      // Emitir evento para real-time
      this.emit('user.notification', notificationEvent);

      // TODO: Integrar con sistema de notificaciones push, email, etc.
      logger.info('User notification sent', {
        userId,
        type: notification.type,
        title: notification.title
      });

      return true;

    } catch (error) {
      logger.error('Error sending user notification:', error);
      return false;
    }
  }

  /**
   * 🚨 Notificaciones específicas de conversación
   */
  async notifyConversationAssigned(userId, conversation, assignedTo) {
    return this.notifyUser(assignedTo.id, {
      title: 'Nueva conversación asignada',
      message: `Te han asignado una conversación de ${conversation.customerPhone}`,
      type: 'assignment',
      action: {
        type: 'navigate',
        url: `/conversations/${conversation.id}`
      },
      metadata: {
        conversationId: conversation.id,
        customerPhone: conversation.customerPhone
      }
    });
  }

  async notifyHighPriorityConversation(userId, conversation) {
    return this.notifyUser(userId, {
      title: 'Conversación de alta prioridad',
      message: `Conversación marcada como alta prioridad: ${conversation.customerPhone}`,
      type: 'urgent',
      action: {
        type: 'navigate',
        url: `/conversations/${conversation.id}`
      },
      metadata: {
        conversationId: conversation.id,
        priority: conversation.priority
      }
    });
  }

  async notifyStaleConversation(userId, conversation) {
    return this.notifyUser(userId, {
      title: 'Conversación sin respuesta',
      message: `La conversación con ${conversation.customerPhone} necesita atención`,
      type: 'warning',
      action: {
        type: 'navigate',
        url: `/conversations/${conversation.id}`
      },
      metadata: {
        conversationId: conversation.id,
        timeSinceLastActivity: conversation.timeSinceLastActivity
      }
    });
  }

  // ============================================================================
  // PROCESAMIENTO DE COLA DE EVENTOS
  // ============================================================================

  /**
   * ⚙️ Procesar cola de eventos
   */
  async processEventQueue() {
    if (this.isProcessingQueue || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        await this.processEvent(event);
      }
    } catch (error) {
      logger.error('Error processing event queue:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * 🔄 Procesar evento individual
   */
  async processEvent(event) {
    try {
      // Enviar a webhooks relevantes
      await this.processWebhooks(event);

      // Procesar notificaciones automáticas
      await this.processAutoNotifications(event);

      // TODO: Enviar a analytics, logs, etc.

    } catch (error) {
      logger.error('Error processing event:', error, { eventId: event.id });
    }
  }

  /**
   * 🔗 Procesar webhooks para un evento
   */
  async processWebhooks(event) {
    const relevantWebhooks = Array.from(this.webhookEndpoints.values()).filter(webhook => 
      webhook.active &&
      webhook.userId === event.userId &&
      (webhook.events.length === 0 || webhook.events.includes(event.type))
    );

    for (const webhook of relevantWebhooks) {
      try {
        await this.sendWebhook(webhook, event);
      } catch (error) {
        logger.error('Error sending webhook in queue:', error, { 
          webhookId: webhook.id,
          eventId: event.id 
        });
      }
    }
  }

  /**
   * 🔔 Procesar notificaciones automáticas
   */
  async processAutoNotifications(event) {
    try {
      switch (event.type) {
        case 'conversation.assigned':
          if (event.data.assignedTo) {
            await this.notifyConversationAssigned(
              event.userId,
              event.data.conversation,
              event.data.assignedTo
            );
          }
          break;

        case 'conversation.priority_changed':
          if (event.data.newPriority === 'HIGH' || event.data.newPriority === 'URGENT') {
            await this.notifyHighPriorityConversation(
              event.userId,
              event.data.conversation
            );
          }
          break;

        // Agregar más casos según necesidades
      }
    } catch (error) {
      logger.error('Error processing auto notifications:', error);
    }
  }

  // ============================================================================
  // CONFIGURACIÓN INTERNA
  // ============================================================================

  /**
   * ⚙️ Configurar listeners internos
   */
  setupInternalListeners() {
    // Listener para debugging
    this.on('*', (event) => {
      logger.debug('Event emitted:', { type: event.type, id: event.id });
    });

    // Listeners para métricas internas
    this.on('conversation.created', this.updateMetrics.bind(this));
    this.on('conversation.status_changed', this.updateMetrics.bind(this));
    this.on('message.received', this.updateMetrics.bind(this));
    this.on('message.sent', this.updateMetrics.bind(this));
  }

  /**
   * 📊 Actualizar métricas internas
   */
  async updateMetrics(event) {
    try {
      // TODO: Actualizar métricas en tiempo real, caché, etc.
      logger.debug('Updating metrics for event:', event.type);
    } catch (error) {
      logger.error('Error updating metrics:', error);
    }
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  /**
   * Generar ID único para evento
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generar ID único para webhook
   */
  generateWebhookId() {
    return `whk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtener estadísticas de webhooks
   */
  getWebhookStats(userId = null) {
    const webhooks = Array.from(this.webhookEndpoints.values());
    const userWebhooks = userId ? webhooks.filter(w => w.userId === userId) : webhooks;

    return {
      total: userWebhooks.length,
      active: userWebhooks.filter(w => w.active).length,
      inactive: userWebhooks.filter(w => !w.active).length,
      totalSuccess: userWebhooks.reduce((sum, w) => sum + w.successCount, 0),
      totalFailures: userWebhooks.reduce((sum, w) => sum + w.failureCount, 0)
    };
  }

  /**
   * Obtener lista de webhooks de un usuario
   */
  getUserWebhooks(userId) {
    return Array.from(this.webhookEndpoints.values())
      .filter(webhook => webhook.userId === userId);
  }

  /**
   * Obtener estadísticas de eventos
   */
  getEventStats() {
    return {
      queueSize: this.eventQueue.length,
      isProcessing: this.isProcessingQueue,
      totalListeners: this.eventNames().length
    };
  }
}

// Singleton instance
const conversationEventsService = new ConversationEventsService();

// ============================================================================
// SERVER-SENT EVENTS (SSE) PARA REAL-TIME
// ============================================================================

class SSEManager {
  constructor() {
    this.connections = new Map(); // userId -> Set de connections
  }

  /**
   * Agregar conexión SSE
   */
  addConnection(userId, res) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    
    this.connections.get(userId).add(res);

    // Configurar headers SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Enviar heartbeat inicial
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date() })}\\n\\n`);

    // Cleanup al cerrar conexión
    res.on('close', () => {
      this.removeConnection(userId, res);
    });

    logger.info('SSE connection added', { userId });
  }

  /**
   * Remover conexión SSE
   */
  removeConnection(userId, res) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.delete(res);
      if (userConnections.size === 0) {
        this.connections.delete(userId);
      }
    }

    logger.info('SSE connection removed', { userId });
  }

  /**
   * Enviar evento a usuario específico
   */
  sendToUser(userId, event) {
    const userConnections = this.connections.get(userId);
    if (!userConnections) return;

    const eventData = JSON.stringify(event);
    
    userConnections.forEach(res => {
      try {
        res.write(`data: ${eventData}\\n\\n`);
      } catch (error) {
        logger.error('Error sending SSE event:', error);
        this.removeConnection(userId, res);
      }
    });
  }

  /**
   * Broadcast evento a todos los usuarios conectados
   */
  broadcast(event) {
    this.connections.forEach((connections, userId) => {
      this.sendToUser(userId, event);
    });
  }

  /**
   * Obtener estadísticas de conexiones
   */
  getStats() {
    let totalConnections = 0;
    this.connections.forEach(connections => {
      totalConnections += connections.size;
    });

    return {
      connectedUsers: this.connections.size,
      totalConnections,
      connections: Array.from(this.connections.keys()).map(userId => ({
        userId,
        connectionCount: this.connections.get(userId).size
      }))
    };
  }
}

const sseManager = new SSEManager();

// Conectar eventos del servicio con SSE
conversationEventsService.on('conversation.created', (event) => {
  sseManager.sendToUser(event.userId, event);
});

conversationEventsService.on('conversation.updated', (event) => {
  sseManager.sendToUser(event.userId, event);
});

conversationEventsService.on('message.received', (event) => {
  sseManager.sendToUser(event.userId, event);
});

conversationEventsService.on('message.sent', (event) => {
  sseManager.sendToUser(event.userId, event);
});

conversationEventsService.on('user.notification', (event) => {
  sseManager.sendToUser(event.userId, event);
});

module.exports = {
  conversationEventsService,
  sseManager
};