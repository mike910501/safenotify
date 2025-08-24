const express = require('express');
const multer = require('multer');
const { 
  rateLimits, 
  validateCampaignCreation, 
  validateCampaignSend,
  auditLogger,
  fileUploadSecurity
} = require('../middleware/auth');
const campaignService = require('../services/campaignService');
const messageService = require('../services/messageService');
const logger = require('../config/logger');

const router = express.Router();

// Configure multer for CSV file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB default
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(new Error('Only CSV files are allowed'), false);
    }
    cb(null, true);
  }
});

/**
 * @route POST /api/campaigns/create
 * @desc Create a new campaign with CSV upload
 * @access Private (API Key required)
 */
router.post('/create', 
  rateLimits.upload,
  upload.single('csvFile'),
  fileUploadSecurity,
  validateCampaignCreation,
  auditLogger('campaign_create', 'campaign'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'CSV file is required'
        });
      }

      const { name, templateSid, variableMappings, defaultValues } = req.body;
      
      // Parse JSON strings if needed
      let parsedVariableMappings, parsedDefaultValues;
      
      try {
        parsedVariableMappings = typeof variableMappings === 'string' 
          ? JSON.parse(variableMappings) 
          : variableMappings;
        
        parsedDefaultValues = typeof defaultValues === 'string' 
          ? JSON.parse(defaultValues) 
          : defaultValues || {};
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON in variableMappings or defaultValues'
        });
      }

      const campaignData = {
        name,
        templateSid,
        variableMappings: parsedVariableMappings,
        defaultValues: parsedDefaultValues
      };

      const campaign = await campaignService.createCampaign(campaignData, req.file.buffer);

      res.status(201).json({
        success: true,
        message: 'Campaign created successfully',
        data: campaign
      });

    } catch (error) {
      logger.error('Campaign creation failed', {
        error: error.message,
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        ip: req.ip
      });

      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create campaign'
      });
    }
  }
);

/**
 * @route POST /api/campaigns/:id/send
 * @desc Send messages to all contacts in campaign
 * @access Private (API Key required)
 */
router.post('/:id/send',
  rateLimits.send,
  validateCampaignSend,
  auditLogger('campaign_send', 'campaign'),
  async (req, res) => {
    try {
      const campaignId = req.params.id;
      
      // Additional validation - campaign must exist and be in correct state
      const campaign = await campaignService.getCampaignMetadata(campaignId);
      
      if (campaign.status === 'sending') {
        return res.status(409).json({
          success: false,
          error: 'Campaign is already being sent'
        });
      }
      
      if (campaign.status === 'completed') {
        return res.status(409).json({
          success: false,
          error: 'Campaign has already been completed'
        });
      }

      // Check if campaign has expired
      if (new Date(campaign.expires_at) < new Date()) {
        return res.status(410).json({
          success: false,
          error: 'Campaign has expired'
        });
      }

      logger.campaign(campaignId, 'send_initiated', {
        totalContacts: campaign.total_contacts,
        ip: req.ip
      });

      // Start sending messages (this is async but we respond immediately)
      messageService.sendCampaignMessages(campaignId)
        .then(result => {
          logger.campaign(campaignId, 'send_completed', result);
        })
        .catch(error => {
          logger.error('Campaign send failed', {
            campaignId,
            error: error.message
          });
        });

      res.json({
        success: true,
        message: 'Campaign sending initiated',
        data: {
          campaignId,
          totalContacts: campaign.total_contacts,
          status: 'sending',
          estimatedDuration: Math.ceil(campaign.total_contacts / (parseFloat(process.env.MESSAGE_RATE_LIMIT_PER_SECOND) || 1)) + ' seconds'
        }
      });

    } catch (error) {
      logger.error('Campaign send initiation failed', {
        campaignId: req.params.id,
        error: error.message,
        ip: req.ip
      });

      res.status(400).json({
        success: false,
        error: error.message || 'Failed to send campaign'
      });
    }
  }
);

/**
 * @route GET /api/campaigns/:id/stats
 * @desc Get campaign statistics and message breakdown
 * @access Private (API Key required)
 */
router.get('/:id/stats',
  rateLimits.general,
  auditLogger('campaign_stats_view', 'campaign'),
  async (req, res) => {
    try {
      const campaignId = req.params.id;
      const stats = await campaignService.getCampaignStats(campaignId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Failed to get campaign stats', {
        campaignId: req.params.id,
        error: error.message,
        ip: req.ip
      });

      if (error.message === 'Campaign not found') {
        res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      } else {
        res.status(400).json({
          success: false,
          error: error.message || 'Failed to get campaign statistics'
        });
      }
    }
  }
);

/**
 * @route GET /api/campaigns/:id/messages
 * @desc Get messages for a campaign with optional filtering
 * @access Private (API Key required)
 */
router.get('/:id/messages',
  rateLimits.general,
  auditLogger('campaign_messages_view', 'campaign'),
  async (req, res) => {
    try {
      const campaignId = req.params.id;
      const { status, limit, offset } = req.query;

      const options = {
        status,
        limit: parseInt(limit) || 100,
        offset: parseInt(offset) || 0
      };

      // Validate limit
      if (options.limit > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Limit cannot exceed 1000'
        });
      }

      const messages = await messageService.getCampaignMessages(campaignId, options);

      res.json({
        success: true,
        data: {
          campaignId,
          messages,
          pagination: {
            limit: options.limit,
            offset: options.offset,
            hasMore: messages.length === options.limit
          }
        }
      });

    } catch (error) {
      logger.error('Failed to get campaign messages', {
        campaignId: req.params.id,
        error: error.message,
        ip: req.ip
      });

      res.status(400).json({
        success: false,
        error: error.message || 'Failed to get campaign messages'
      });
    }
  }
);

/**
 * @route POST /api/campaigns/:id/retry
 * @desc Retry failed messages in a campaign
 * @access Private (API Key required)
 */
router.post('/:id/retry',
  rateLimits.send,
  auditLogger('campaign_retry', 'campaign'),
  async (req, res) => {
    try {
      const campaignId = req.params.id;
      const { maxRetries } = req.body;

      const result = await messageService.retryFailedMessages(
        campaignId, 
        parseInt(maxRetries) || 3
      );

      res.json({
        success: true,
        message: 'Message retry completed',
        data: result
      });

    } catch (error) {
      logger.error('Failed to retry campaign messages', {
        campaignId: req.params.id,
        error: error.message,
        ip: req.ip
      });

      res.status(400).json({
        success: false,
        error: error.message || 'Failed to retry messages'
      });
    }
  }
);

/**
 * @route DELETE /api/campaigns/:id
 * @desc Manually delete campaign data
 * @access Private (API Key required)
 */
router.delete('/:id',
  rateLimits.general,
  auditLogger('campaign_delete', 'campaign'),
  async (req, res) => {
    try {
      const campaignId = req.params.id;
      
      // Get campaign info before deletion for logging
      const campaign = await campaignService.getCampaignMetadata(campaignId);
      
      const deleted = await campaignService.deleteCampaign(campaignId);

      if (deleted) {
        logger.campaign(campaignId, 'manually_deleted', {
          name: campaign.name,
          totalContacts: campaign.total_contacts,
          ip: req.ip
        });

        res.json({
          success: true,
          message: 'Campaign deleted successfully',
          data: {
            campaignId,
            deletedAt: new Date().toISOString()
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }

    } catch (error) {
      logger.error('Failed to delete campaign', {
        campaignId: req.params.id,
        error: error.message,
        ip: req.ip
      });

      if (error.message === 'Campaign not found') {
        res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      } else {
        res.status(400).json({
          success: false,
          error: error.message || 'Failed to delete campaign'
        });
      }
    }
  }
);

/**
 * @route GET /api/campaigns
 * @desc List recent campaigns (metadata only)
 * @access Private (API Key required)
 */
router.get('/',
  rateLimits.general,
  auditLogger('campaigns_list', 'campaign'),
  async (req, res) => {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      const campaigns = await require('../config/database').all(`
        SELECT id, name, template_sid, total_contacts, status, 
               created_at, expires_at, sent_at, completed_at
        FROM campaigns 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `, [parseInt(limit), parseInt(offset)]);

      res.json({
        success: true,
        data: {
          campaigns,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: campaigns.length === parseInt(limit)
          }
        }
      });

    } catch (error) {
      logger.error('Failed to list campaigns', {
        error: error.message,
        ip: req.ip
      });

      res.status(400).json({
        success: false,
        error: error.message || 'Failed to list campaigns'
      });
    }
  }
);

module.exports = router;