const { v4: uuidv4 } = require('uuid');
const csv = require('csv-parser');
const { Readable } = require('stream');
const db = require('../config/database');
const logger = require('../config/logger');

class CampaignService {
  async createCampaign(data, csvBuffer) {
    const campaignId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (parseInt(process.env.AUTO_DELETE_HOURS) || 24));

    try {
      // Parse CSV data
      const csvData = await this.parseCSV(csvBuffer);
      
      logger.campaign(campaignId, 'parsing_csv', {
        contactCount: csvData.length,
        columns: csvData.length > 0 ? Object.keys(csvData[0]) : []
      });

      // Validate contact data
      const validatedContacts = this.validateContacts(csvData);
      
      if (validatedContacts.length === 0) {
        throw new Error('No valid contacts found in CSV file');
      }

      // Encrypt CSV data
      const csvString = JSON.stringify(validatedContacts);
      const { encrypted, iv } = db.encrypt(csvString);

      // Create campaign record
      await db.run(`
        INSERT INTO campaigns (
          id, name, template_sid, encrypted_csv_data, iv, total_contacts, 
          expires_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        campaignId,
        data.name,
        data.templateSid,
        encrypted,
        iv,
        validatedContacts.length,
        expiresAt.toISOString(),
        JSON.stringify({
          variableMappings: data.variableMappings,
          defaultValues: data.defaultValues || {},
          createdAt: new Date().toISOString()
        })
      ]);

      logger.campaign(campaignId, 'created', {
        name: data.name,
        templateSid: data.templateSid,
        contactCount: validatedContacts.length,
        expiresAt: expiresAt.toISOString()
      });

      // Log to audit table
      await db.run(`
        INSERT INTO audit_logs (action, resource_type, resource_id, details)
        VALUES (?, ?, ?, ?)
      `, [
        'campaign_created',
        'campaign',
        campaignId,
        JSON.stringify({
          name: data.name,
          contactCount: validatedContacts.length,
          templateSid: data.templateSid
        })
      ]);

      return {
        id: campaignId,
        name: data.name,
        templateSid: data.templateSid,
        totalContacts: validatedContacts.length,
        status: 'created',
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to create campaign', {
        campaignId,
        error: error.message,
        name: data.name
      });
      
      // Clean up any partial data
      await this.deleteCampaign(campaignId, false);
      throw error;
    }
  }

  async parseCSV(csvBuffer) {
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = Readable.from(csvBuffer.toString());

      stream
        .pipe(csv({
          skipEmptyLines: true,
          trim: true
        }))
        .on('data', (data) => {
          // Clean and normalize the data
          const cleanedData = {};
          Object.keys(data).forEach(key => {
            const cleanKey = key.trim().toLowerCase();
            cleanedData[cleanKey] = data[key].trim();
          });
          results.push(cleanedData);
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          logger.error('CSV parsing error', { error: error.message });
          reject(new Error('Failed to parse CSV file'));
        });
    });
  }

  validateContacts(csvData) {
    const validContacts = [];
    const errors = [];

    csvData.forEach((contact, index) => {
      const rowErrors = [];

      // Validate required fields
      if (!contact.nombre || contact.nombre.trim() === '') {
        rowErrors.push('Missing name (nombre)');
      }

      if (!contact.telefono || contact.telefono.trim() === '') {
        rowErrors.push('Missing phone number (telefono)');
      } else {
        // Validate phone number format (basic validation)
        const phone = contact.telefono.replace(/\D/g, '');
        if (phone.length < 10) {
          rowErrors.push('Invalid phone number format');
        }
      }

      if (rowErrors.length === 0) {
        // Normalize phone number
        const normalizedPhone = this.normalizePhoneNumber(contact.telefono);
        validContacts.push({
          ...contact,
          telefono: normalizedPhone,
          _originalRow: index + 1
        });
      } else {
        errors.push({
          row: index + 1,
          errors: rowErrors,
          data: contact
        });
      }
    });

    if (errors.length > 0) {
      logger.warn('CSV validation errors found', {
        totalRows: csvData.length,
        validRows: validContacts.length,
        errorRows: errors.length,
        errors: errors.slice(0, 10) // Log first 10 errors
      });
    }

    return validContacts;
  }

  normalizePhoneNumber(phone) {
    // Remove all non-numeric characters
    let normalized = phone.replace(/\D/g, '');
    
    // Add country code for Colombia if needed
    if (normalized.length === 10) {
      normalized = '57' + normalized;
    }
    
    // Ensure + prefix
    return '+' + normalized;
  }

  async getCampaign(campaignId) {
    const campaign = await db.get(
      'SELECT * FROM campaigns WHERE id = ?',
      [campaignId]
    );

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Check if campaign has expired
    if (new Date(campaign.expires_at) < new Date()) {
      logger.campaign(campaignId, 'expired_access_attempt');
      throw new Error('Campaign has expired');
    }

    // Decrypt CSV data
    const decryptedData = db.decrypt(campaign.encrypted_csv_data, campaign.iv);
    const csvData = JSON.parse(decryptedData);

    return {
      ...campaign,
      csvData,
      metadata: JSON.parse(campaign.metadata || '{}')
    };
  }

  async getCampaignStats(campaignId) {
    const campaign = await db.get(
      'SELECT * FROM campaigns WHERE id = ?',
      [campaignId]
    );

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    // Get message statistics
    const messageStats = await db.all(`
      SELECT 
        status,
        COUNT(*) as count,
        MIN(sent_at) as first_sent,
        MAX(sent_at) as last_sent
      FROM message_logs 
      WHERE campaign_id = ? 
      GROUP BY status
    `, [campaignId]);

    const totalMessages = await db.get(
      'SELECT COUNT(*) as total FROM message_logs WHERE campaign_id = ?',
      [campaignId]
    );

    const stats = {
      id: campaignId,
      name: campaign.name,
      status: campaign.status,
      totalContacts: campaign.total_contacts,
      totalMessages: totalMessages.total,
      createdAt: campaign.created_at,
      expiresAt: campaign.expires_at,
      sentAt: campaign.sent_at,
      completedAt: campaign.completed_at,
      messageBreakdown: {}
    };

    // Process message statistics
    messageStats.forEach(stat => {
      stats.messageBreakdown[stat.status] = {
        count: stat.count,
        firstSent: stat.first_sent,
        lastSent: stat.last_sent
      };
    });

    return stats;
  }

  async deleteCampaign(campaignId, auditLog = true) {
    try {
      // Delete message logs first (foreign key constraint)
      await db.run('DELETE FROM message_logs WHERE campaign_id = ?', [campaignId]);
      
      // Delete campaign
      const result = await db.run('DELETE FROM campaigns WHERE id = ?', [campaignId]);

      if (auditLog) {
        logger.campaign(campaignId, 'deleted');
        
        await db.run(`
          INSERT INTO audit_logs (action, resource_type, resource_id, details)
          VALUES (?, ?, ?, ?)
        `, [
          'campaign_deleted',
          'campaign',
          campaignId,
          JSON.stringify({ manual: true })
        ]);
      }

      return result.changes > 0;
    } catch (error) {
      logger.error('Failed to delete campaign', {
        campaignId,
        error: error.message
      });
      throw error;
    }
  }

  async cleanupExpiredCampaigns() {
    try {
      const now = new Date().toISOString();
      
      // Find expired campaigns
      const expiredCampaigns = await db.all(
        'SELECT id, name FROM campaigns WHERE expires_at <= ?',
        [now]
      );

      let deletedCount = 0;

      for (const campaign of expiredCampaigns) {
        try {
          await this.deleteCampaign(campaign.id, false);
          deletedCount++;
          
          logger.campaign(campaign.id, 'auto_deleted', {
            name: campaign.name,
            reason: 'expired'
          });

        } catch (error) {
          logger.error('Failed to auto-delete expired campaign', {
            campaignId: campaign.id,
            error: error.message
          });
        }
      }

      if (deletedCount > 0) {
        logger.info(`Auto-deleted ${deletedCount} expired campaigns`);
        
        await db.run(`
          INSERT INTO audit_logs (action, resource_type, details)
          VALUES (?, ?, ?)
        `, [
          'campaigns_auto_deleted',
          'system',
          JSON.stringify({ count: deletedCount, timestamp: now })
        ]);
      }

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired campaigns', {
        error: error.message
      });
      throw error;
    }
  }

  async updateCampaignStatus(campaignId, status, additionalData = {}) {
    const updates = {
      status,
      ...additionalData
    };

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), campaignId];

    await db.run(
      `UPDATE campaigns SET ${setClause} WHERE id = ?`,
      values
    );

    logger.campaign(campaignId, `status_changed_to_${status}`, updates);
  }

  // Utility method to get campaign without decrypting data (for stats, etc.)
  async getCampaignMetadata(campaignId) {
    const campaign = await db.get(
      'SELECT id, name, template_sid, total_contacts, status, created_at, expires_at, sent_at, completed_at, metadata FROM campaigns WHERE id = ?',
      [campaignId]
    );

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    return {
      ...campaign,
      metadata: JSON.parse(campaign.metadata || '{}')
    };
  }
}

module.exports = new CampaignService();