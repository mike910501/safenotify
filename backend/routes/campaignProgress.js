const express = require('express');
const { campaignQueue } = require('../jobs/campaignQueue');
const { authenticateToken } = require('../middleware/auth');
const prisma = require('../db');

const router = express.Router();

// Get campaign progress and current status
router.get('/campaigns/:id/progress', authenticateToken, async (req, res) => {
  try {
    const { id: campaignId } = req.params;
    
    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: req.user.id
      },
      include: {
        template: {
          select: { name: true }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaña no encontrada'
      });
    }

    // Calculate progress
    const progress = campaign.totalContacts > 0 
      ? Math.floor((campaign.sentCount / campaign.totalContacts) * 100)
      : 0;

    // Get job status from queue if campaign is processing
    let jobStatus = null;
    if (campaign.status === 'queued' || campaign.status === 'processing') {
      try {
        const jobs = await campaignQueue.getJobs(['active', 'waiting', 'delayed'], 0, 10);
        const job = jobs.find(j => j.data.campaignId === campaignId);
        
        if (job) {
          jobStatus = {
            id: job.id,
            progress: job.progress(),
            processedOn: job.processedOn,
            failedReason: job.failedReason,
            attempts: job.attemptsMade,
            maxAttempts: job.opts.attempts,
            priority: job.opts.priority
          };
        }
      } catch (queueError) {
        console.error('Error getting job status:', queueError);
      }
    }

    // Get recent message logs for this campaign
    const recentMessages = await prisma.messageLog.findMany({
      where: {
        campaignId: campaignId
      },
      orderBy: {
        sentAt: 'desc'
      },
      take: 10,
      select: {
        phone: true,
        status: true,
        error: true,
        sentAt: true
      }
    });

    // Calculate estimated completion time
    let estimatedCompletion = null;
    if (campaign.status === 'processing' && campaign.sentCount > 0) {
      const avgTimePerMessage = (Date.now() - campaign.sentAt.getTime()) / campaign.sentCount;
      const remainingMessages = campaign.totalContacts - campaign.sentCount;
      estimatedCompletion = new Date(Date.now() + (avgTimePerMessage * remainingMessages));
    }

    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        totalContacts: campaign.totalContacts,
        sentCount: campaign.sentCount,
        errorCount: campaign.errorCount,
        progress: progress,
        template: campaign.template?.name,
        createdAt: campaign.sentAt,
        completedAt: campaign.completedAt,
        estimatedCompletion: estimatedCompletion
      },
      jobStatus,
      recentMessages,
      stats: {
        successRate: campaign.totalContacts > 0 
          ? Math.floor((campaign.sentCount / campaign.totalContacts) * 100) 
          : 0,
        errorRate: campaign.totalContacts > 0 
          ? Math.floor((campaign.errorCount / campaign.totalContacts) * 100) 
          : 0
      }
    });

  } catch (error) {
    console.error('Error getting campaign progress:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Get queue statistics (admin only)
router.get('/queue/stats', authenticateToken, async (req, res) => {
  try {
    // Basic queue stats for all users, detailed for admins
    const waiting = await campaignQueue.getWaiting();
    const active = await campaignQueue.getActive();
    const completed = await campaignQueue.getCompleted();
    const failed = await campaignQueue.getFailed();

    const stats = {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    };

    // Add detailed stats for admin users
    if (req.user.role === 'admin') {
      stats.details = {
        waiting: waiting.slice(0, 5).map(job => ({
          id: job.id,
          campaignId: job.data.campaignId,
          userName: job.data.userName,
          priority: job.opts.priority,
          createdAt: new Date(job.timestamp)
        })),
        active: active.slice(0, 5).map(job => ({
          id: job.id,
          campaignId: job.data.campaignId,
          userName: job.data.userName,
          progress: job.progress(),
          processedOn: job.processedOn
        }))
      };
    }

    // WebSocket connection stats
    if (global.campaignProgressTracker) {
      stats.websocket = global.campaignProgressTracker.getStats();
    }

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error getting queue stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

// Pause/Resume campaign (future feature)
router.post('/campaigns/:id/pause', authenticateToken, async (req, res) => {
  try {
    const { id: campaignId } = req.params;
    
    // Verify campaign belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        userId: req.user.id,
        status: 'processing'
      }
    });

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaña no encontrada o no se puede pausar'
      });
    }

    // Find and pause the job
    const jobs = await campaignQueue.getJobs(['active', 'waiting'], 0, 50);
    const job = jobs.find(j => j.data.campaignId === campaignId);
    
    if (job) {
      await job.pause();
      
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'paused' }
      });

      if (global.campaignProgressTracker) {
        global.campaignProgressTracker.emitCampaignStatus(campaignId, 'paused', {
          message: 'Campaña pausada por el usuario'
        });
      }

      res.json({
        success: true,
        message: 'Campaña pausada exitosamente'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'No se pudo encontrar el trabajo de la campaña'
      });
    }

  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

module.exports = router;