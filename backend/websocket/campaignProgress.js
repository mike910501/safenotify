const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

class CampaignProgressTracker {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    this.setupSocketHandlers();
    console.log('📡 WebSocket server initialized for campaign progress tracking');
  }

  setupSocketHandlers() {
    this.io.use((socket, next) => {
      // Authenticate socket connection using JWT
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userEmail = decoded.email;
        console.log(`🔌 Socket authenticated for user: ${decoded.email} (${decoded.id})`);
        next();
      } catch (err) {
        console.error('Socket authentication failed:', err.message);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`🔗 User connected: ${socket.userEmail} (Socket: ${socket.id})`);
      
      // Join user to their own room for targeted updates
      socket.join(`user_${socket.userId}`);
      
      // Handle client joining campaign room for progress updates
      socket.on('join_campaign', (campaignId) => {
        console.log(`📊 User ${socket.userEmail} joined campaign room: ${campaignId}`);
        socket.join(`campaign_${campaignId}`);
        
        // Send current campaign status if available
        this.sendCampaignStatus(campaignId, socket.userId);
      });

      // Handle client leaving campaign room
      socket.on('leave_campaign', (campaignId) => {
        console.log(`📤 User ${socket.userEmail} left campaign room: ${campaignId}`);
        socket.leave(`campaign_${campaignId}`);
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`🔌 User disconnected: ${socket.userEmail} (${reason})`);
      });

      // Send welcome message with connection status
      socket.emit('connection_status', {
        connected: true,
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
    });
  }

  // Send campaign progress update to specific campaign room
  emitCampaignProgress(campaignId, progressData) {
    const roomName = `campaign_${campaignId}`;
    console.log(`📈 Emitting progress to room ${roomName}:`, {
      campaignId,
      progress: progressData.progress,
      sent: progressData.sent,
      total: progressData.total
    });

    this.io.to(roomName).emit('campaign_progress', {
      campaignId,
      ...progressData,
      timestamp: new Date().toISOString()
    });
  }

  // Send campaign status update (queued, processing, completed, failed)
  emitCampaignStatus(campaignId, status, additionalData = {}) {
    const roomName = `campaign_${campaignId}`;
    console.log(`📋 Emitting status to room ${roomName}: ${status}`);

    this.io.to(roomName).emit('campaign_status', {
      campaignId,
      status,
      ...additionalData,
      timestamp: new Date().toISOString()
    });
  }

  // Send error notifications for a campaign
  emitCampaignError(campaignId, error, errorType = 'general') {
    const roomName = `campaign_${campaignId}`;
    console.log(`❌ Emitting error to room ${roomName}:`, error.message || error);

    this.io.to(roomName).emit('campaign_error', {
      campaignId,
      error: typeof error === 'string' ? error : error.message,
      errorType,
      timestamp: new Date().toISOString()
    });
  }

  // Send user-specific notifications
  emitUserNotification(userId, notification) {
    const roomName = `user_${userId}`;
    console.log(`🔔 Sending notification to user ${userId}:`, notification.title);

    this.io.to(roomName).emit('user_notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  // Send current campaign status to newly connected client
  async sendCampaignStatus(campaignId, userId) {
    try {
      // Import prisma here to avoid circular dependencies
      const prisma = require('../db');
      
      const campaign = await prisma.campaign.findFirst({
        where: {
          id: campaignId,
          userId: userId
        },
        include: {
          template: {
            select: { name: true }
          }
        }
      });

      if (campaign) {
        const progress = campaign.totalContacts > 0 
          ? Math.floor((campaign.sentCount / campaign.totalContacts) * 100)
          : 0;

        this.io.to(`campaign_${campaignId}`).emit('campaign_current_status', {
          campaignId: campaign.id,
          name: campaign.name,
          status: campaign.status,
          totalContacts: campaign.totalContacts,
          sentCount: campaign.sentCount,
          errorCount: campaign.errorCount,
          progress: progress,
          template: campaign.template?.name,
          createdAt: campaign.sentAt,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error sending campaign status:', error);
    }
  }

  // Get connection statistics
  getStats() {
    const connectedSockets = this.io.sockets.sockets.size;
    const rooms = Array.from(this.io.sockets.adapter.rooms.keys())
      .filter(room => room.startsWith('campaign_') || room.startsWith('user_'));
    
    return {
      connectedSockets,
      activeRooms: rooms.length,
      rooms: rooms
    };
  }

  // Broadcast system-wide messages (admin notifications, maintenance, etc.)
  broadcastSystemMessage(message, type = 'info') {
    console.log(`📢 Broadcasting system message: ${message}`);
    
    this.io.emit('system_message', {
      message,
      type,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = CampaignProgressTracker;