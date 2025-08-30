// Blacklist Routes - Sistema de Lista Negra
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const blacklistService = require('../services/blacklistService');
const logger = require('../config/logger');

const router = express.Router();

/**
 * @route POST /api/blacklist/add
 * @desc Add phone number to blacklist
 */
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber, reason } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Número telefónico es requerido'
      });
    }

    const result = await blacklistService.addToBlacklist(
      phoneNumber, 
      reason, 
      req.user.id
    );

    res.json({
      success: true,
      message: 'Número agregado a la lista negra exitosamente',
      entry: result.blacklistEntry
    });

  } catch (error) {
    console.error('Error adding to blacklist:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error al agregar número a lista negra'
    });
  }
});

/**
 * @route DELETE /api/blacklist/remove
 * @desc Remove phone number from blacklist
 */
router.delete('/remove', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Número telefónico es requerido'
      });
    }

    const isAdmin = req.user.role === 'admin';
    await blacklistService.removeFromBlacklist(phoneNumber, req.user.id, isAdmin);

    res.json({
      success: true,
      message: 'Número removido de la lista negra exitosamente'
    });

  } catch (error) {
    console.error('Error removing from blacklist:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error al remover número de lista negra'
    });
  }
});

/**
 * @route POST /api/blacklist/check
 * @desc Check if phone number is blacklisted
 */
router.post('/check', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Número telefónico es requerido'
      });
    }

    const result = await blacklistService.isBlacklisted(phoneNumber);

    res.json({
      success: true,
      isBlacklisted: result.isBlacklisted,
      entry: result.entry ? {
        reason: result.entry.reason,
        addedAt: result.entry.createdAt,
        source: result.entry.source
      } : null
    });

  } catch (error) {
    console.error('Error checking blacklist:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar lista negra'
    });
  }
});

/**
 * @route POST /api/blacklist/validate-bulk
 * @desc Validate multiple phone numbers against blacklist
 */
router.post('/validate-bulk', authenticateToken, async (req, res) => {
  try {
    const { phoneNumbers } = req.body;

    if (!phoneNumbers || !Array.isArray(phoneNumbers)) {
      return res.status(400).json({
        success: false,
        error: 'Array de números telefónicos es requerido'
      });
    }

    if (phoneNumbers.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Máximo 1000 números por validación'
      });
    }

    const result = await blacklistService.validateNumbers(phoneNumbers);

    res.json({
      success: true,
      validation: result
    });

  } catch (error) {
    console.error('Error validating bulk numbers:', error);
    res.status(500).json({
      success: false,
      error: 'Error al validar números'
    });
  }
});

/**
 * @route POST /api/blacklist/report
 * @desc Report phone number as spam/abuse
 */
router.post('/report', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber, reason, evidence } = req.body;

    if (!phoneNumber || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Número telefónico y razón son requeridos'
      });
    }

    const result = await blacklistService.reportNumber(
      phoneNumber, 
      reason, 
      req.user.id, 
      evidence
    );

    res.json({
      success: true,
      message: result.autoBlacklisted 
        ? 'Número reportado y agregado automáticamente a lista negra'
        : 'Número reportado exitosamente',
      report: result.report,
      autoBlacklisted: result.autoBlacklisted
    });

  } catch (error) {
    console.error('Error reporting number:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Error al reportar número'
    });
  }
});

/**
 * @route GET /api/blacklist
 * @desc Get user's blacklist
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const isAdmin = req.user.role === 'admin';

    const result = await blacklistService.getUserBlacklist(
      req.user.id, 
      isAdmin, 
      page, 
      limit
    );

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error fetching blacklist:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener lista negra'
    });
  }
});

/**
 * @route GET /api/blacklist/stats
 * @desc Get blacklist statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const stats = await blacklistService.getBlacklistStats(
      req.user.id, 
      isAdmin
    );

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching blacklist stats:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
});

/**
 * @route POST /api/blacklist/validate-csv
 * @desc Validate CSV contacts against blacklist before sending
 */
router.post('/validate-csv', authenticateToken, async (req, res) => {
  try {
    const { contacts } = req.body;

    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({
        success: false,
        error: 'Array de contactos es requerido'
      });
    }

    // Extraer números telefónicos de los contactos
    const phoneNumbers = contacts.map(contact => {
      return contact.telefono || contact.phone || contact.Phone || contact.celular;
    }).filter(phone => phone);

    const validation = await blacklistService.validateNumbers(phoneNumbers);

    // Mapear resultados de vuelta a los contactos
    const validatedContacts = contacts.map(contact => {
      const phoneNumber = contact.telefono || contact.phone || contact.Phone || contact.celular;
      const validation_result = validation.results.find(r => r.phoneNumber === phoneNumber);
      
      return {
        ...contact,
        isBlacklisted: validation_result?.isBlacklisted || false,
        blacklistReason: validation_result?.reason,
        normalizedPhone: validation_result?.normalizedPhone
      };
    });

    res.json({
      success: true,
      validation: {
        ...validation,
        contacts: validatedContacts
      },
      summary: {
        total: contacts.length,
        valid: validation.valid,
        blacklisted: validation.blacklisted,
        validContacts: validatedContacts.filter(c => !c.isBlacklisted),
        blacklistedContacts: validatedContacts.filter(c => c.isBlacklisted)
      }
    });

  } catch (error) {
    console.error('Error validating CSV contacts:', error);
    res.status(500).json({
      success: false,
      error: 'Error al validar contactos'
    });
  }
});

module.exports = router;