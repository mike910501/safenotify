/**
 * 🚀 PHASE 5.1: Notification Service
 * Manages notifications for takeover events and other CRM activities
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create notification for takeover event
 */
async function createTakeoverNotification(userId, conversationId, eventType, data = {}) {
  console.log(`📧 Creating takeover notification: ${eventType}`);
  
  try {
    const notification = await prisma.cRMNotification.create({
      data: {
        userId: userId,
        type: 'TAKEOVER',
        title: getTakeoverNotificationTitle(eventType),
        message: getTakeoverNotificationMessage(eventType, data),
        relatedId: conversationId,
        relatedType: 'CONVERSATION',
        priority: getTakeoverNotificationPriority(eventType),
        metadata: {
          eventType: eventType,
          conversationId: conversationId,
          ...data
        },
        isRead: false
      }
    });

    console.log('✅ Takeover notification created:', notification.id);
    return notification;

  } catch (error) {
    console.error('❌ Error creating takeover notification:', error);
    return null;
  }
}

/**
 * Get unread notifications for user
 */
async function getUnreadNotifications(userId, limit = 20) {
  try {
    const notifications = await prisma.cRMNotification.findMany({
      where: {
        userId: userId,
        isRead: false
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return {
      success: true,
      notifications: notifications,
      unreadCount: notifications.length
    };

  } catch (error) {
    console.error('❌ Error getting unread notifications:', error);
    return {
      success: false,
      error: error.message,
      notifications: [],
      unreadCount: 0
    };
  }
}

/**
 * Mark notification as read
 */
async function markNotificationAsRead(notificationId, userId) {
  try {
    const notification = await prisma.cRMNotification.updateMany({
      where: {
        id: notificationId,
        userId: userId
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return { success: true, updated: notification.count };

  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark all notifications as read for user
 */
async function markAllNotificationsAsRead(userId) {
  try {
    const result = await prisma.cRMNotification.updateMany({
      where: {
        userId: userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return { success: true, updated: result.count };

  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get notification dashboard data
 */
async function getNotificationDashboard(userId) {
  try {
    const [unreadCount, recentNotifications, notificationsByType] = await Promise.all([
      // Unread count
      prisma.cRMNotification.count({
        where: { userId: userId, isRead: false }
      }),
      
      // Recent notifications (last 10)
      prisma.cRMNotification.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      
      // Notifications by type (last 7 days)
      prisma.cRMNotification.groupBy({
        by: ['type'],
        where: {
          userId: userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        _count: { id: true }
      })
    ]);

    return {
      success: true,
      data: {
        unreadCount,
        recentNotifications,
        notificationsByType: notificationsByType.reduce((acc, item) => {
          acc[item.type] = item._count.id;
          return acc;
        }, {})
      }
    };

  } catch (error) {
    console.error('❌ Error getting notification dashboard:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Create conversation activity notification
 */
async function createConversationNotification(userId, conversationId, activityType, data = {}) {
  console.log(`💬 Creating conversation notification: ${activityType}`);
  
  try {
    const notification = await prisma.cRMNotification.create({
      data: {
        userId: userId,
        type: 'CONVERSATION',
        title: getConversationNotificationTitle(activityType),
        message: getConversationNotificationMessage(activityType, data),
        relatedId: conversationId,
        relatedType: 'CONVERSATION',
        priority: getConversationNotificationPriority(activityType),
        metadata: {
          activityType: activityType,
          conversationId: conversationId,
          ...data
        },
        isRead: false
      }
    });

    console.log('✅ Conversation notification created:', notification.id);
    return notification;

  } catch (error) {
    console.error('❌ Error creating conversation notification:', error);
    return null;
  }
}

// Helper functions for notification content

function getTakeoverNotificationTitle(eventType) {
  switch (eventType) {
    case 'takeover_requested':
      return '📞 Human takeover requested';
    case 'takeover_started':
      return '🙋‍♂️ Human takeover started';
    case 'takeover_ended':
      return '🤖 Returned to AI control';
    case 'ai_suggestion':
      return '💡 AI suggestions available';
    default:
      return '🔔 Takeover event';
  }
}

function getTakeoverNotificationMessage(eventType, data) {
  switch (eventType) {
    case 'takeover_requested':
      return `A customer has requested human assistance${data.reason ? `: ${data.reason}` : ''}`;
    case 'takeover_started':
      return `Human agent has taken over the conversation${data.reason ? ` (${data.reason})` : ''}`;
    case 'takeover_ended':
      return 'Conversation has been returned to AI control';
    case 'ai_suggestion':
      return `AI has provided ${data.suggestionCount || 'new'} suggestions to help with the conversation`;
    default:
      return 'Takeover event occurred';
  }
}

function getTakeoverNotificationPriority(eventType) {
  switch (eventType) {
    case 'takeover_requested':
      return 'HIGH';
    case 'takeover_started':
      return 'MEDIUM';
    case 'takeover_ended':
      return 'LOW';
    case 'ai_suggestion':
      return 'MEDIUM';
    default:
      return 'MEDIUM';
  }
}

function getConversationNotificationTitle(activityType) {
  switch (activityType) {
    case 'new_message':
      return '💬 New customer message';
    case 'agent_assigned':
      return '🤖 Agent assigned';
    case 'status_changed':
      return '📊 Status updated';
    case 'escalated':
      return '⚠️ Conversation escalated';
    default:
      return '📋 Conversation activity';
  }
}

function getConversationNotificationMessage(activityType, data) {
  switch (activityType) {
    case 'new_message':
      return `New message from ${data.customerName || 'customer'}`;
    case 'agent_assigned':
      return `${data.agentName} has been assigned to the conversation`;
    case 'status_changed':
      return `Status changed to ${data.newStatus}`;
    case 'escalated':
      return `Conversation escalated to level ${data.escalationLevel}`;
    default:
      return 'Conversation activity occurred';
  }
}

function getConversationNotificationPriority(activityType) {
  switch (activityType) {
    case 'new_message':
      return 'MEDIUM';
    case 'agent_assigned':
      return 'LOW';
    case 'status_changed':
      return 'LOW';
    case 'escalated':
      return 'HIGH';
    default:
      return 'MEDIUM';
  }
}

module.exports = {
  createTakeoverNotification,
  createConversationNotification,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getNotificationDashboard
};