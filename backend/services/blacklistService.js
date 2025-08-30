// Blacklist Service - Sistema de Validación de Lista Negra
const prisma = require('../db');
const logger = require('../config/logger');

class BlacklistService {
  constructor() {
    this.cache = new Map(); // Cache en memoria para consultas rápidas
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos de cache
    this.lastCacheUpdate = null;
  }

  /**
   * Agregar número a lista negra
   */
  async addToBlacklist(phoneNumber, reason, userId, adminUserId = null) {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      
      // Verificar si ya existe
      const existing = await prisma.blacklistedPhone.findUnique({
        where: { phoneNumber: normalizedPhone }
      });

      if (existing) {
        throw new Error('El número ya está en la lista negra');
      }

      const blacklistEntry = await prisma.blacklistedPhone.create({
        data: {
          phoneNumber: normalizedPhone,
          originalNumber: phoneNumber,
          reason: reason || 'Agregado manualmente',
          addedByUserId: adminUserId || userId,
          reportedByUserId: userId,
          status: 'active',
          source: adminUserId ? 'admin' : 'user_report'
        }
      });

      // Invalidar cache
      this.invalidateCache();

      logger.info(`Phone number added to blacklist: ${normalizedPhone}`, {
        reason,
        addedBy: adminUserId || userId,
        source: adminUserId ? 'admin' : 'user_report'
      });

      return {
        success: true,
        blacklistEntry
      };

    } catch (error) {
      logger.error('Error adding to blacklist:', error);
      throw error;
    }
  }

  /**
   * Remover número de lista negra
   */
  async removeFromBlacklist(phoneNumber, userId, isAdmin = false) {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      const blacklistEntry = await prisma.blacklistedPhone.findUnique({
        where: { phoneNumber: normalizedPhone }
      });

      if (!blacklistEntry) {
        throw new Error('El número no está en la lista negra');
      }

      // Solo admins o el usuario que lo agregó puede removerlo
      if (!isAdmin && blacklistEntry.addedByUserId !== userId) {
        throw new Error('No tienes permisos para remover este número');
      }

      await prisma.blacklistedPhone.update({
        where: { phoneNumber: normalizedPhone },
        data: {
          status: 'removed',
          removedAt: new Date(),
          removedByUserId: userId
        }
      });

      // Invalidar cache
      this.invalidateCache();

      logger.info(`Phone number removed from blacklist: ${normalizedPhone}`, {
        removedBy: userId,
        isAdmin
      });

      return { success: true };

    } catch (error) {
      logger.error('Error removing from blacklist:', error);
      throw error;
    }
  }

  /**
   * Verificar si un número está en lista negra
   */
  async isBlacklisted(phoneNumber) {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Intentar obtener del cache primero
      if (this.cache.has(normalizedPhone) && this.isCacheValid()) {
        return this.cache.get(normalizedPhone);
      }

      // Consultar base de datos
      const blacklistEntry = await prisma.blacklistedPhone.findUnique({
        where: {
          phoneNumber: normalizedPhone,
          status: 'active'
        }
      });

      const isBlacklisted = !!blacklistEntry;

      // Actualizar cache
      this.cache.set(normalizedPhone, {
        isBlacklisted,
        entry: blacklistEntry,
        timestamp: Date.now()
      });

      return {
        isBlacklisted,
        entry: blacklistEntry
      };

    } catch (error) {
      logger.error('Error checking blacklist:', error);
      return { isBlacklisted: false }; // En caso de error, no bloquear
    }
  }

  /**
   * Validar múltiples números contra lista negra
   */
  async validateNumbers(phoneNumbers) {
    try {
      const results = await Promise.all(
        phoneNumbers.map(async (phone) => {
          const result = await this.isBlacklisted(phone);
          return {
            phoneNumber: phone,
            normalizedPhone: this.normalizePhoneNumber(phone),
            isBlacklisted: result.isBlacklisted,
            reason: result.entry?.reason,
            addedAt: result.entry?.createdAt
          };
        })
      );

      const blacklisted = results.filter(r => r.isBlacklisted);
      const valid = results.filter(r => !r.isBlacklisted);

      return {
        total: results.length,
        valid: valid.length,
        blacklisted: blacklisted.length,
        validNumbers: valid,
        blacklistedNumbers: blacklisted,
        results
      };

    } catch (error) {
      logger.error('Error validating numbers:', error);
      throw error;
    }
  }

  /**
   * Reportar número como spam/abuso
   */
  async reportNumber(phoneNumber, reason, reportedByUserId, evidence = null) {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Crear reporte
      const report = await prisma.spamReport.create({
        data: {
          phoneNumber: normalizedPhone,
          originalNumber: phoneNumber,
          reason,
          reportedByUserId,
          evidence,
          status: 'pending'
        }
      });

      // Verificar si el número debe ser automáticamente agregado a blacklist
      const reportCount = await prisma.spamReport.count({
        where: {
          phoneNumber: normalizedPhone,
          status: 'confirmed'
        }
      });

      // Si tiene más de 3 reportes confirmados, agregar automáticamente
      if (reportCount >= 3) {
        try {
          await this.addToBlacklist(
            phoneNumber,
            `Auto-blacklisted: ${reportCount} reportes confirmados`,
            reportedByUserId,
            'system'
          );

          // Actualizar reporte como procesado
          await prisma.spamReport.update({
            where: { id: report.id },
            data: { 
              status: 'auto_blacklisted',
              processedAt: new Date()
            }
          });

        } catch (error) {
          // Si ya está en blacklist, solo actualizar el reporte
          if (error.message.includes('ya está en la lista negra')) {
            await prisma.spamReport.update({
              where: { id: report.id },
              data: { 
                status: 'already_blacklisted',
                processedAt: new Date()
              }
            });
          }
        }
      }

      logger.info(`Spam report created: ${normalizedPhone}`, {
        reason,
        reportedBy: reportedByUserId,
        totalReports: reportCount + 1
      });

      return {
        success: true,
        report,
        autoBlacklisted: reportCount >= 3
      };

    } catch (error) {
      logger.error('Error reporting number:', error);
      throw error;
    }
  }

  /**
   * Obtener lista negra del usuario
   */
  async getUserBlacklist(userId, isAdmin = false, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;

      const whereCondition = isAdmin 
        ? { status: 'active' }
        : { 
            status: 'active',
            OR: [
              { addedByUserId: userId },
              { reportedByUserId: userId },
              { source: 'global' }
            ]
          };

      const blacklist = await prisma.blacklistedPhone.findMany({
        where: whereCondition,
        include: {
          addedBy: {
            select: { name: true, email: true }
          },
          reportedBy: {
            select: { name: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      });

      const total = await prisma.blacklistedPhone.count({
        where: whereCondition
      });

      return {
        blacklist,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      logger.error('Error fetching blacklist:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de blacklist
   */
  async getBlacklistStats(userId = null, isAdmin = false) {
    try {
      const baseWhere = isAdmin ? {} : userId ? {
        OR: [
          { addedByUserId: userId },
          { reportedByUserId: userId },
          { source: 'global' }
        ]
      } : {};

      const stats = await prisma.blacklistedPhone.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { status: true }
      });

      const spamReports = await prisma.spamReport.groupBy({
        by: ['status'],
        where: userId && !isAdmin ? { reportedByUserId: userId } : {},
        _count: { status: true }
      });

      const result = {
        blacklisted: {
          active: 0,
          removed: 0,
          total: 0
        },
        reports: {
          pending: 0,
          confirmed: 0,
          rejected: 0,
          auto_blacklisted: 0,
          total: 0
        }
      };

      // Procesar estadísticas de blacklist
      stats.forEach(stat => {
        result.blacklisted[stat.status] = stat._count.status;
        result.blacklisted.total += stat._count.status;
      });

      // Procesar estadísticas de reportes
      spamReports.forEach(stat => {
        result.reports[stat.status] = stat._count.status;
        result.reports.total += stat._count.status;
      });

      return result;

    } catch (error) {
      logger.error('Error fetching blacklist stats:', error);
      throw error;
    }
  }

  /**
   * Normalizar número telefónico
   */
  normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    // Remover espacios, guiones, paréntesis
    let normalized = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    // Remover el signo + si existe
    if (normalized.startsWith('+')) {
      normalized = normalized.substring(1);
    }
    
    // Si es un número colombiano sin código de país, agregar 57
    if (normalized.length === 10 && normalized.startsWith('3')) {
      normalized = '57' + normalized;
    }
    
    return normalized;
  }

  /**
   * Invalidar cache
   */
  invalidateCache() {
    this.cache.clear();
    this.lastCacheUpdate = Date.now();
  }

  /**
   * Verificar si el cache es válido
   */
  isCacheValid() {
    if (!this.lastCacheUpdate) return false;
    return (Date.now() - this.lastCacheUpdate) < this.cacheTimeout;
  }

  /**
   * Limpiar cache periódicamente
   */
  startCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.cacheTimeout) {
          this.cache.delete(key);
        }
      }
    }, this.cacheTimeout);

    logger.info('Blacklist cache cleanup started');
  }
}

// Singleton instance
const blacklistService = new BlacklistService();

// Iniciar limpieza de cache
blacklistService.startCacheCleanup();

module.exports = blacklistService;