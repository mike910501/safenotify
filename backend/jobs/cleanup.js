const cron = require('node-cron');
const campaignService = require('../services/campaignService');
const db = require('../config/database');
const logger = require('../config/logger');

class CleanupService {
  constructor() {
    this.isRunning = false;
    this.setupCleanupJobs();
  }

  setupCleanupJobs() {
    // Run cleanup every hour
    cron.schedule('0 * * * *', () => {
      this.runExpiredCampaignCleanup();
    }, {
      scheduled: true,
      timezone: "America/Bogota" // Colombian timezone
    });

    // Run old logs cleanup daily at 2 AM
    cron.schedule('0 2 * * *', () => {
      this.runLogCleanup();
    }, {
      scheduled: true,
      timezone: "America/Bogota"
    });

    // Run database optimization weekly (Sunday at 3 AM)
    cron.schedule('0 3 * * 0', () => {
      this.runDatabaseOptimization();
    }, {
      scheduled: true,
      timezone: "America/Bogota"
    });

    logger.info('Cleanup jobs scheduled successfully');
  }

  async runExpiredCampaignCleanup() {
    if (this.isRunning) {
      logger.warn('Cleanup job already running, skipping this cycle');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting expired campaign cleanup');
      
      const deletedCount = await campaignService.cleanupExpiredCampaigns();
      const duration = Date.now() - startTime;
      
      logger.performance('expired_campaign_cleanup', duration, {
        deletedCount,
        success: true
      });

      // Update cleanup statistics
      await this.updateCleanupStats('campaign_cleanup', {
        deletedCount,
        duration,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Expired campaign cleanup failed', {
        error: error.message,
        duration
      });

      await this.updateCleanupStats('campaign_cleanup', {
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      });
    } finally {
      this.isRunning = false;
    }
  }

  async runLogCleanup() {
    const startTime = Date.now();

    try {
      logger.info('Starting old log cleanup');

      // Keep logs for 90 days by default
      const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS) || 90;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Clean up audit logs (keep longer for compliance)
      const auditRetentionDays = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 365;
      const auditCutoffDate = new Date();
      auditCutoffDate.setDate(auditCutoffDate.getDate() - auditRetentionDays);

      // Delete old message logs from completed campaigns
      const deletedMessageLogs = await db.run(`
        DELETE FROM message_logs 
        WHERE id IN (
          SELECT ml.id FROM message_logs ml
          JOIN campaigns c ON ml.campaign_id = c.id
          WHERE c.status = 'completed' AND c.completed_at <= ?
        )
      `, [cutoffDate.toISOString()]);

      // Delete old audit logs (except security events)
      const deletedAuditLogs = await db.run(`
        DELETE FROM audit_logs 
        WHERE timestamp <= ? AND details NOT LIKE '%security%'
      `, [auditCutoffDate.toISOString()]);

      const duration = Date.now() - startTime;

      logger.performance('log_cleanup', duration, {
        deletedMessageLogs: deletedMessageLogs.changes,
        deletedAuditLogs: deletedAuditLogs.changes,
        success: true
      });

      await this.updateCleanupStats('log_cleanup', {
        deletedMessageLogs: deletedMessageLogs.changes,
        deletedAuditLogs: deletedAuditLogs.changes,
        duration,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Log cleanup failed', {
        error: error.message,
        duration
      });

      await this.updateCleanupStats('log_cleanup', {
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      });
    }
  }

  async runDatabaseOptimization() {
    const startTime = Date.now();

    try {
      logger.info('Starting database optimization');

      // Run VACUUM to reclaim space
      await db.run('VACUUM');
      
      // Analyze tables for better query planning
      await db.run('ANALYZE');

      // Get database size information
      const dbSize = await db.get(`
        SELECT 
          page_count * page_size as size_bytes,
          freelist_count * page_size as free_bytes
        FROM pragma_page_count(), pragma_page_size(), pragma_freelist_count()
      `);

      const duration = Date.now() - startTime;

      logger.performance('database_optimization', duration, {
        sizeMB: Math.round(dbSize.size_bytes / 1024 / 1024),
        freeMB: Math.round(dbSize.free_bytes / 1024 / 1024),
        success: true
      });

      await this.updateCleanupStats('database_optimization', {
        sizeMB: Math.round(dbSize.size_bytes / 1024 / 1024),
        freeMB: Math.round(dbSize.free_bytes / 1024 / 1024),
        duration,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Database optimization failed', {
        error: error.message,
        duration
      });

      await this.updateCleanupStats('database_optimization', {
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      });
    }
  }

  async updateCleanupStats(operation, stats) {
    try {
      await db.run(`
        INSERT INTO audit_logs (action, resource_type, details)
        VALUES (?, ?, ?)
      `, [
        operation,
        'system_maintenance',
        JSON.stringify(stats)
      ]);
    } catch (error) {
      logger.error('Failed to update cleanup stats', {
        operation,
        error: error.message
      });
    }
  }

  async getCleanupStats() {
    try {
      // Get recent cleanup statistics
      const stats = await db.all(`
        SELECT action, details, timestamp
        FROM audit_logs
        WHERE resource_type = 'system_maintenance'
        AND timestamp >= datetime('now', '-30 days')
        ORDER BY timestamp DESC
        LIMIT 100
      `);

      const processedStats = stats.map(stat => ({
        operation: stat.action,
        timestamp: stat.timestamp,
        ...JSON.parse(stat.details)
      }));

      // Group by operation
      const groupedStats = {};
      processedStats.forEach(stat => {
        if (!groupedStats[stat.operation]) {
          groupedStats[stat.operation] = [];
        }
        groupedStats[stat.operation].push(stat);
      });

      // Calculate summaries
      const summaries = {};
      Object.keys(groupedStats).forEach(operation => {
        const operationStats = groupedStats[operation];
        const successful = operationStats.filter(s => !s.error).length;
        const failed = operationStats.length - successful;
        
        summaries[operation] = {
          total: operationStats.length,
          successful,
          failed,
          successRate: ((successful / operationStats.length) * 100).toFixed(2),
          lastRun: operationStats[0]?.timestamp,
          avgDuration: operationStats
            .filter(s => s.duration)
            .reduce((sum, s, _, arr) => sum + (s.duration / arr.length), 0)
        };
      });

      return {
        summaries,
        recentOperations: processedStats.slice(0, 20)
      };

    } catch (error) {
      logger.error('Failed to get cleanup stats', {
        error: error.message
      });
      throw error;
    }
  }

  // Manual cleanup methods for API endpoints
  async forceCleanupExpiredCampaigns() {
    return await this.runExpiredCampaignCleanup();
  }

  async forceLogCleanup() {
    return await this.runLogCleanup();
  }

  async forceDatabaseOptimization() {
    return await this.runDatabaseOptimization();
  }

  // Emergency cleanup for critical disk space issues
  async emergencyCleanup() {
    const startTime = Date.now();
    
    try {
      logger.security('Emergency cleanup initiated', {
        timestamp: new Date().toISOString()
      });

      // 1. Delete all expired campaigns immediately
      const expiredDeleted = await campaignService.cleanupExpiredCampaigns();
      
      // 2. Delete campaigns older than 1 hour regardless of expiry
      const oldCampaigns = await db.all(`
        SELECT id FROM campaigns 
        WHERE created_at <= datetime('now', '-1 hour')
        AND status IN ('completed', 'failed')
      `);

      let urgentDeleted = 0;
      for (const campaign of oldCampaigns) {
        await campaignService.deleteCampaign(campaign.id, false);
        urgentDeleted++;
      }

      // 3. Delete old message logs
      const deletedLogs = await db.run(`
        DELETE FROM message_logs 
        WHERE sent_at <= datetime('now', '-24 hours')
      `);

      // 4. Delete old audit logs (except security)
      const deletedAudit = await db.run(`
        DELETE FROM audit_logs 
        WHERE timestamp <= datetime('now', '-7 days')
        AND details NOT LIKE '%security%'
      `);

      // 5. Vacuum database
      await db.run('VACUUM');

      const duration = Date.now() - startTime;

      const results = {
        expiredCampaigns: expiredDeleted,
        urgentCampaigns: urgentDeleted,
        messageLogs: deletedLogs.changes,
        auditLogs: deletedAudit.changes,
        duration,
        timestamp: new Date().toISOString()
      };

      logger.security('Emergency cleanup completed', results);

      await this.updateCleanupStats('emergency_cleanup', results);

      return results;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Emergency cleanup failed', {
        error: error.message,
        duration
      });

      throw error;
    }
  }
}

module.exports = new CleanupService();