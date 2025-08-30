// Auto-Delete Service - Sistema de Eliminación Automática
const cron = require('node-cron');
const prisma = require('../db');
const logger = require('../config/logger');

class AutoDeleteService {
  constructor() {
    this.isInitialized = false;
    this.cronJobs = new Map();
  }

  /**
   * Inicializar el servicio de eliminación automática
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      logger.info('Initializing Auto-Delete Service');
      
      // Ejecutar limpieza diaria a las 2:00 AM
      cron.schedule('0 2 * * *', () => {
        this.performDailyCleanup();
      });

      // Ejecutar limpieza semanal los domingos a las 3:00 AM  
      cron.schedule('0 3 * * 0', () => {
        this.performWeeklyCleanup();
      });

      // Ejecutar limpieza mensual el día 1 de cada mes a las 4:00 AM
      cron.schedule('0 4 1 * *', () => {
        this.performMonthlyCleanup();
      });

      this.isInitialized = true;
      logger.info('Auto-Delete Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Auto-Delete Service:', error);
    }
  }

  /**
   * Limpieza diaria
   */
  async performDailyCleanup() {
    try {
      logger.info('Starting daily cleanup');

      // Eliminar logs de mensajes de hace más de 7 días
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const deletedLogs = await prisma.messageLog.deleteMany({
        where: {
          sentAt: {
            lt: sevenDaysAgo
          }
        }
      });

      logger.info(`Daily cleanup: Deleted ${deletedLogs.count} message logs older than 7 days`);

      // Limpiar archivos temporales (uploads folder)
      await this.cleanupTempFiles();

      // Limpiar campañas fallidas de hace más de 3 días
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      
      const deletedFailedCampaigns = await prisma.campaign.deleteMany({
        where: {
          status: 'failed',
          createdAt: {
            lt: threeDaysAgo
          }
        }
      });

      logger.info(`Daily cleanup: Deleted ${deletedFailedCampaigns.count} failed campaigns older than 3 days`);

      return {
        success: true,
        deletedLogs: deletedLogs.count,
        deletedFailedCampaigns: deletedFailedCampaigns.count
      };

    } catch (error) {
      logger.error('Error during daily cleanup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Limpieza semanal
   */
  async performWeeklyCleanup() {
    try {
      logger.info('Starting weekly cleanup');

      // Eliminar campañas completadas de hace más de 30 días
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const deletedCampaigns = await prisma.campaign.deleteMany({
        where: {
          status: 'completed',
          createdAt: {
            lt: thirtyDaysAgo
          }
        }
      });

      // Eliminar campañas programadas expiradas o canceladas de hace más de 15 días
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      
      const deletedScheduledCampaigns = await prisma.scheduledCampaign.deleteMany({
        where: {
          OR: [
            { status: 'expired' },
            { status: 'cancelled' }
          ],
          createdAt: {
            lt: fifteenDaysAgo
          }
        }
      });

      // Limpiar reportes de spam procesados de hace más de 60 días
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      
      const deletedReports = await prisma.spamReport.deleteMany({
        where: {
          status: {
            in: ['confirmed', 'rejected', 'auto_blacklisted']
          },
          processedAt: {
            lt: sixtyDaysAgo
          }
        }
      });

      logger.info(`Weekly cleanup completed:`, {
        deletedCampaigns: deletedCampaigns.count,
        deletedScheduledCampaigns: deletedScheduledCampaigns.count,
        deletedReports: deletedReports.count
      });

      return {
        success: true,
        deletedCampaigns: deletedCampaigns.count,
        deletedScheduledCampaigns: deletedScheduledCampaigns.count,
        deletedReports: deletedReports.count
      };

    } catch (error) {
      logger.error('Error during weekly cleanup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Limpieza mensual
   */
  async performMonthlyCleanup() {
    try {
      logger.info('Starting monthly cleanup');

      // Archivar templates no usadas de hace más de 6 meses
      const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000);
      
      const archivedTemplates = await prisma.template.updateMany({
        where: {
          status: 'approved',
          usageCount: 0,
          createdAt: {
            lt: sixMonthsAgo
          }
        },
        data: {
          status: 'archived'
        }
      });

      // Eliminar tokens de reset de contraseña expirados
      const expiredResets = await prisma.passwordReset.deleteMany({
        where: {
          OR: [
            { used: true },
            { expiresAt: { lt: new Date() } }
          ]
        }
      });

      // Limpiar API keys inactivas de hace más de 1 año
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      
      const deletedApiKeys = await prisma.apiKey.deleteMany({
        where: {
          isActive: false,
          OR: [
            { lastUsed: { lt: oneYearAgo } },
            { 
              lastUsed: null,
              createdAt: { lt: oneYearAgo }
            }
          ]
        }
      });

      // Generar reporte de cleanup
      const cleanupReport = await this.generateCleanupReport();

      logger.info(`Monthly cleanup completed:`, {
        archivedTemplates: archivedTemplates.count,
        expiredResets: expiredResets.count,
        deletedApiKeys: deletedApiKeys.count
      });

      return {
        success: true,
        archivedTemplates: archivedTemplates.count,
        expiredResets: expiredResets.count,
        deletedApiKeys: deletedApiKeys.count,
        report: cleanupReport
      };

    } catch (error) {
      logger.error('Error during monthly cleanup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Limpiar archivos temporales
   */
  async cleanupTempFiles() {
    try {
      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(__dirname, '../uploads');

      if (!fs.existsSync(uploadsDir)) {
        return { deletedFiles: 0 };
      }

      const files = fs.readdirSync(uploadsDir);
      let deletedFiles = 0;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        // Eliminar archivos de más de 1 día
        if (stats.mtime.getTime() < oneDayAgo) {
          try {
            fs.unlinkSync(filePath);
            deletedFiles++;
            logger.info(`Deleted temp file: ${file}`);
          } catch (error) {
            logger.warn(`Could not delete temp file ${file}:`, error.message);
          }
        }
      }

      return { deletedFiles };

    } catch (error) {
      logger.error('Error cleaning temp files:', error);
      return { deletedFiles: 0 };
    }
  }

  /**
   * Generar reporte de limpieza
   */
  async generateCleanupReport() {
    try {
      const stats = {
        totalUsers: await prisma.user.count(),
        activeCampaigns: await prisma.campaign.count({
          where: { status: { in: ['queued', 'processing', 'sending'] } }
        }),
        totalCampaigns: await prisma.campaign.count(),
        totalTemplates: await prisma.template.count(),
        activeTemplates: await prisma.template.count({
          where: { status: 'approved' }
        }),
        totalBlacklisted: await prisma.blacklistedPhone.count({
          where: { status: 'active' }
        }),
        pendingReports: await prisma.spamReport.count({
          where: { status: 'pending' }
        }),
        scheduledCampaigns: await prisma.scheduledCampaign.count({
          where: { status: 'scheduled' }
        })
      };

      return {
        timestamp: new Date().toISOString(),
        stats
      };

    } catch (error) {
      logger.error('Error generating cleanup report:', error);
      return null;
    }
  }

  /**
   * Ejecutar limpieza manual
   */
  async performManualCleanup(type = 'daily') {
    try {
      logger.info(`Starting manual ${type} cleanup`);

      let result;
      switch (type) {
        case 'daily':
          result = await this.performDailyCleanup();
          break;
        case 'weekly':
          result = await this.performWeeklyCleanup();
          break;
        case 'monthly':
          result = await this.performMonthlyCleanup();
          break;
        default:
          throw new Error('Invalid cleanup type. Use: daily, weekly, monthly');
      }

      return result;

    } catch (error) {
      logger.error(`Error during manual ${type} cleanup:`, error);
      throw error;
    }
  }

  /**
   * Configurar auto-delete personalizado para usuario
   */
  async configureUserAutoDelete(userId, config) {
    try {
      const { 
        campaignRetentionDays = 30,
        messageLogRetentionDays = 7,
        templateArchiveDays = 180
      } = config;

      // Guardar configuración personalizada (podría ser en una tabla de configuración)
      await prisma.userSettings.upsert({
        where: { userId },
        update: {
          autoDeleteConfig: JSON.stringify({
            campaignRetentionDays,
            messageLogRetentionDays,
            templateArchiveDays,
            updatedAt: new Date()
          })
        },
        create: {
          userId,
          autoDeleteConfig: JSON.stringify({
            campaignRetentionDays,
            messageLogRetentionDays,
            templateArchiveDays,
            createdAt: new Date()
          })
        }
      });

      logger.info(`Auto-delete configuration updated for user ${userId}:`, config);

      return { success: true, config };

    } catch (error) {
      logger.error('Error configuring user auto-delete:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de limpieza
   */
  async getCleanupStats() {
    try {
      const report = await this.generateCleanupReport();
      
      // Calcular próximas limpiezas
      const now = new Date();
      const tomorrow2AM = new Date(now);
      tomorrow2AM.setHours(26, 0, 0, 0); // Mañana a las 2 AM
      
      const nextSunday3AM = new Date(now);
      const daysUntilSunday = (7 - now.getDay()) % 7;
      nextSunday3AM.setDate(now.getDate() + daysUntilSunday);
      nextSunday3AM.setHours(3, 0, 0, 0);
      
      const nextMonth1st4AM = new Date(now.getFullYear(), now.getMonth() + 1, 1, 4, 0, 0, 0);

      return {
        currentStats: report?.stats,
        nextCleanups: {
          daily: tomorrow2AM.toISOString(),
          weekly: nextSunday3AM.toISOString(),
          monthly: nextMonth1st4AM.toISOString()
        },
        isInitialized: this.isInitialized
      };

    } catch (error) {
      logger.error('Error getting cleanup stats:', error);
      throw error;
    }
  }
}

// Singleton instance
const autoDeleteService = new AutoDeleteService();

module.exports = autoDeleteService;