// Scheduler Service - Sistema de Programación de Mensajes
const cron = require('node-cron');
const prisma = require('../db');
const { addCampaignJob } = require('../jobs/campaignQueue');
const logger = require('../config/logger');

class SchedulerService {
  constructor() {
    this.cronJobs = new Map(); // Almacenar jobs de cron activos
    this.isInitialized = false;
  }

  /**
   * Inicializar el servicio de programación
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      logger.info('Initializing Scheduler Service');
      
      // Cargar campañas programadas pendientes al iniciar
      await this.loadScheduledCampaigns();
      
      // Ejecutar limpieza cada hora
      cron.schedule('0 * * * *', () => {
        this.cleanupExpiredSchedules();
      });

      this.isInitialized = true;
      logger.info('Scheduler Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Scheduler Service:', error);
    }
  }

  /**
   * Programar una nueva campaña
   */
  async scheduleCampaign(campaignData, scheduleDate) {
    try {
      const {
        name,
        templateId,
        userId,
        csvBuffer,
        variableMappings,
        defaultValues,
        template,
        userName
      } = campaignData;

      // Validar fecha futura
      const now = new Date();
      if (new Date(scheduleDate) <= now) {
        throw new Error('La fecha de programación debe ser futura');
      }

      // Crear registro de campaña programada
      const scheduledCampaign = await prisma.scheduledCampaign.create({
        data: {
          name,
          templateId,
          userId,
          scheduledFor: new Date(scheduleDate),
          status: 'scheduled',
          campaignData: JSON.stringify({
            csvData: csvBuffer.toString('base64'), // Almacenar CSV temporalmente
            variableMappings,
            defaultValues,
            template,
            userName
          })
        }
      });

      // Programar ejecución con node-cron
      const cronExpression = this.dateToCronExpression(scheduleDate);
      const jobId = `scheduled-${scheduledCampaign.id}`;

      const cronJob = cron.schedule(cronExpression, async () => {
        await this.executeScheduledCampaign(scheduledCampaign.id);
      }, {
        scheduled: false
      });

      // Guardar referencia del job
      this.cronJobs.set(jobId, cronJob);
      cronJob.start();

      logger.info(`Campaign scheduled successfully: ${jobId} for ${scheduleDate}`);

      return {
        success: true,
        scheduledCampaign,
        jobId,
        scheduledFor: scheduleDate
      };

    } catch (error) {
      logger.error('Error scheduling campaign:', error);
      throw error;
    }
  }

  /**
   * Ejecutar campaña programada
   */
  async executeScheduledCampaign(scheduledCampaignId) {
    try {
      logger.info(`Executing scheduled campaign: ${scheduledCampaignId}`);

      const scheduledCampaign = await prisma.scheduledCampaign.findUnique({
        where: { id: scheduledCampaignId },
        include: { template: true, user: true }
      });

      if (!scheduledCampaign) {
        logger.error(`Scheduled campaign not found: ${scheduledCampaignId}`);
        return;
      }

      if (scheduledCampaign.status !== 'scheduled') {
        logger.warn(`Scheduled campaign already processed: ${scheduledCampaignId}`);
        return;
      }

      // Parsear datos de la campaña
      const campaignData = JSON.parse(scheduledCampaign.campaignData);
      const csvBuffer = Buffer.from(campaignData.csvData, 'base64');

      // Validar límites del usuario actual
      const currentUser = await prisma.user.findUnique({
        where: { id: scheduledCampaign.userId },
        select: {
          messagesUsed: true,
          messagesLimit: true,
          planType: true,
          name: true
        }
      });

      if (!currentUser) {
        throw new Error('Usuario no encontrado');
      }

      // Contar contactos en CSV
      const csvContent = csvBuffer.toString('utf8');
      const csvLines = csvContent.split('\n').filter(line => line.trim());
      let totalContactsToSend = 0;

      if (csvLines.length > 1) {
        const headers = csvLines[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < csvLines.length; i++) {
          const values = csvLines[i].split(',').map(v => v.trim());
          const contact = {};
          headers.forEach((header, index) => {
            contact[header] = values[index] || '';
          });
          
          if (contact.telefono || contact.phone || contact.Phone || contact.celular) {
            totalContactsToSend++;
          }
        }
      }

      const messagesAvailable = currentUser.messagesLimit - currentUser.messagesUsed;

      if (totalContactsToSend > messagesAvailable) {
        // Marcar como fallida por límite excedido
        await prisma.scheduledCampaign.update({
          where: { id: scheduledCampaignId },
          data: {
            status: 'failed',
            error: 'Límite de mensajes excedido',
            executedAt: new Date()
          }
        });

        logger.error(`Scheduled campaign failed - message limit exceeded: ${scheduledCampaignId}`);
        return;
      }

      // Crear campaña regular
      const campaign = await prisma.campaign.create({
        data: {
          name: scheduledCampaign.name,
          templateId: scheduledCampaign.templateId,
          userId: scheduledCampaign.userId,
          status: 'queued',
          totalContacts: totalContactsToSend,
          sentCount: 0,
          errorCount: 0,
          sentAt: new Date(),
          isScheduled: true,
          scheduledCampaignId: scheduledCampaignId
        }
      });

      // Agregar a la cola de procesamiento
      const jobOptions = {
        delay: 1000,
        priority: currentUser.planType === 'enterprise' ? 1 : 
                  currentUser.planType === 'pro' ? 2 : 3,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        }
      };

      try {
        const job = await addCampaignJob({
          campaignId: campaign.id,
          csvBuffer: csvBuffer,
          template: scheduledCampaign.template,
          userId: scheduledCampaign.userId,
          userName: currentUser.name || 'Usuario',
          variableMappings: campaignData.variableMappings || {},
          defaultValues: campaignData.defaultValues || {},
          isScheduled: true
        }, jobOptions);

        // Marcar como ejecutada exitosamente
        await prisma.scheduledCampaign.update({
          where: { id: scheduledCampaignId },
          data: {
            status: 'executed',
            campaignId: campaign.id,
            executedAt: new Date()
          }
        });

        logger.info(`Scheduled campaign executed successfully: ${scheduledCampaignId} -> Campaign: ${campaign.id}`);

      } catch (queueError) {
        logger.error('Queue error for scheduled campaign:', queueError);
        
        // Marcar como fallida
        await prisma.scheduledCampaign.update({
          where: { id: scheduledCampaignId },
          data: {
            status: 'failed',
            error: queueError.message,
            executedAt: new Date()
          }
        });
      }

      // Limpiar job de cron
      const jobId = `scheduled-${scheduledCampaignId}`;
      if (this.cronJobs.has(jobId)) {
        this.cronJobs.get(jobId).destroy();
        this.cronJobs.delete(jobId);
      }

    } catch (error) {
      logger.error(`Error executing scheduled campaign ${scheduledCampaignId}:`, error);
      
      // Marcar como fallida
      try {
        await prisma.scheduledCampaign.update({
          where: { id: scheduledCampaignId },
          data: {
            status: 'failed',
            error: error.message,
            executedAt: new Date()
          }
        });
      } catch (updateError) {
        logger.error('Error updating failed scheduled campaign:', updateError);
      }
    }
  }

  /**
   * Cancelar campaña programada
   */
  async cancelScheduledCampaign(scheduledCampaignId, userId) {
    try {
      const scheduledCampaign = await prisma.scheduledCampaign.findFirst({
        where: {
          id: scheduledCampaignId,
          userId: userId,
          status: 'scheduled'
        }
      });

      if (!scheduledCampaign) {
        throw new Error('Campaña programada no encontrada o ya procesada');
      }

      // Cancelar job de cron
      const jobId = `scheduled-${scheduledCampaignId}`;
      if (this.cronJobs.has(jobId)) {
        this.cronJobs.get(jobId).destroy();
        this.cronJobs.delete(jobId);
      }

      // Actualizar estado
      await prisma.scheduledCampaign.update({
        where: { id: scheduledCampaignId },
        data: {
          status: 'cancelled',
          executedAt: new Date()
        }
      });

      logger.info(`Scheduled campaign cancelled: ${scheduledCampaignId}`);

      return { success: true };

    } catch (error) {
      logger.error('Error cancelling scheduled campaign:', error);
      throw error;
    }
  }

  /**
   * Obtener campañas programadas del usuario
   */
  async getUserScheduledCampaigns(userId) {
    try {
      const campaigns = await prisma.scheduledCampaign.findMany({
        where: { userId },
        include: {
          template: {
            select: {
              name: true,
              id: true
            }
          },
          campaign: {
            select: {
              id: true,
              status: true,
              sentCount: true,
              errorCount: true
            }
          }
        },
        orderBy: { scheduledFor: 'asc' }
      });

      return campaigns;
    } catch (error) {
      logger.error('Error fetching scheduled campaigns:', error);
      throw error;
    }
  }

  /**
   * Cargar campañas programadas al iniciar
   */
  async loadScheduledCampaigns() {
    try {
      const scheduledCampaigns = await prisma.scheduledCampaign.findMany({
        where: {
          status: 'scheduled',
          scheduledFor: {
            gt: new Date() // Solo futuras
          }
        }
      });

      for (const campaign of scheduledCampaigns) {
        const cronExpression = this.dateToCronExpression(campaign.scheduledFor);
        const jobId = `scheduled-${campaign.id}`;

        const cronJob = cron.schedule(cronExpression, async () => {
          await this.executeScheduledCampaign(campaign.id);
        }, {
          scheduled: false
        });

        this.cronJobs.set(jobId, cronJob);
        cronJob.start();

        logger.info(`Reloaded scheduled campaign: ${jobId} for ${campaign.scheduledFor}`);
      }

      logger.info(`Loaded ${scheduledCampaigns.length} scheduled campaigns`);
    } catch (error) {
      logger.error('Error loading scheduled campaigns:', error);
    }
  }

  /**
   * Limpiar programaciones expiradas
   */
  async cleanupExpiredSchedules() {
    try {
      const expiredCampaigns = await prisma.scheduledCampaign.findMany({
        where: {
          status: 'scheduled',
          scheduledFor: {
            lt: new Date()
          }
        }
      });

      for (const campaign of expiredCampaigns) {
        // Intentar ejecutar si es reciente (menos de 1 hora de retraso)
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        if (campaign.scheduledFor > hourAgo) {
          logger.info(`Executing late scheduled campaign: ${campaign.id}`);
          await this.executeScheduledCampaign(campaign.id);
        } else {
          // Marcar como expirada si es muy antigua
          await prisma.scheduledCampaign.update({
            where: { id: campaign.id },
            data: {
              status: 'expired',
              error: 'Programación expirada',
              executedAt: new Date()
            }
          });

          logger.info(`Expired scheduled campaign: ${campaign.id}`);
        }

        // Limpiar job de cron
        const jobId = `scheduled-${campaign.id}`;
        if (this.cronJobs.has(jobId)) {
          this.cronJobs.get(jobId).destroy();
          this.cronJobs.delete(jobId);
        }
      }

      if (expiredCampaigns.length > 0) {
        logger.info(`Cleaned up ${expiredCampaigns.length} expired scheduled campaigns`);
      }
    } catch (error) {
      logger.error('Error during cleanup:', error);
    }
  }

  /**
   * Convertir fecha a expresión cron
   */
  dateToCronExpression(date) {
    const d = new Date(date);
    const minute = d.getMinutes();
    const hour = d.getHours();
    const day = d.getDate();
    const month = d.getMonth() + 1;
    
    return `${minute} ${hour} ${day} ${month} *`;
  }

  /**
   * Obtener estadísticas de programación
   */
  async getSchedulingStats(userId) {
    try {
      const stats = await prisma.scheduledCampaign.groupBy({
        by: ['status'],
        where: { userId },
        _count: {
          status: true
        }
      });

      const result = {
        scheduled: 0,
        executed: 0,
        failed: 0,
        cancelled: 0,
        expired: 0
      };

      stats.forEach(stat => {
        result[stat.status] = stat._count.status;
      });

      return result;
    } catch (error) {
      logger.error('Error getting scheduling stats:', error);
      throw error;
    }
  }
}

// Singleton instance
const schedulerService = new SchedulerService();

module.exports = schedulerService;