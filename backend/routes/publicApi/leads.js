/**
 * 👥 PUBLIC API - LEADS ENDPOINTS
 * REST API endpoints for third-party integrations - Customer Leads management
 */

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { 
  authenticatePublicApi, 
  requireScopes, 
  rateLimitPublicApi,
  handlePublicApiError 
} = require('../../middleware/publicApiAuth');

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication and rate limiting to all routes
router.use(authenticatePublicApi);
router.use(rateLimitPublicApi);

/**
 * GET /v1/leads
 * List customer leads with filtering and pagination
 */
router.get('/', requireScopes(['leads:read']), async (req, res, next) => {
  try {
    const {
      status,
      business_type,
      score_min,
      score_max,
      source,
      created_after,
      created_before,
      limit = 20,
      cursor
    } = req.query;

    // Validate limit
    const pageLimit = Math.min(parseInt(limit) || 20, 100);

    // Build where clause
    const where = {
      userId: req.user.id
    };

    if (status && ['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }

    if (business_type) {
      where.businessType = business_type.toLowerCase();
    }

    if (score_min || score_max) {
      where.qualificationScore = {};
      if (score_min) {
        where.qualificationScore.gte = parseInt(score_min);
      }
      if (score_max) {
        where.qualificationScore.lte = parseInt(score_max);
      }
    }

    if (source) {
      where.source = source.toLowerCase();
    }

    if (created_after || created_before) {
      where.createdAt = {};
      if (created_after) {
        where.createdAt.gte = new Date(created_after);
      }
      if (created_before) {
        where.createdAt.lte = new Date(created_before);
      }
    }

    // Handle cursor pagination
    if (cursor) {
      where.id = { gt: cursor };
    }

    // Fetch leads
    const leads = await prisma.customerLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: pageLimit + 1 // Take one extra to check if there's a next page
    });

    // Determine if there's a next page
    const hasNext = leads.length > pageLimit;
    const data = hasNext ? leads.slice(0, -1) : leads;

    // Format response
    const formattedLeads = data.map(lead => ({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      business_type: lead.businessType,
      company_name: lead.companyName,
      status: lead.status,
      qualification_score: lead.qualificationScore,
      source: lead.source,
      created_at: lead.createdAt.toISOString(),
      last_activity: lead.lastActivity?.toISOString() || lead.updatedAt.toISOString(),
      metadata: lead.customFields || {}
    }));

    res.json({
      data: formattedLeads,
      pagination: {
        has_next: hasNext,
        next_cursor: hasNext ? data[data.length - 1].id : null,
        total: formattedLeads.length
      }
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/leads/{lead_id}
 * Get a specific customer lead
 */
router.get('/:leadId', requireScopes(['leads:read']), async (req, res, next) => {
  try {
    const { leadId } = req.params;

    const lead = await prisma.customerLead.findFirst({
      where: {
        id: leadId,
        userId: req.user.id
      }
    });

    if (!lead) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found or access denied'
        }
      });
    }

    // Get associated conversations
    const conversations = await prisma.cRMConversation.findMany({
      where: {
        customerLeadId: leadId,
        userId: req.user.id
      },
      select: {
        id: true,
        status: true,
        priority: true,
        messageCount: true,
        createdAt: true,
        lastMessageAt: true,
        userAIAgent: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const response = {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      business_type: lead.businessType,
      company_name: lead.companyName,
      status: lead.status,
      qualification_score: lead.qualificationScore,
      source: lead.source,
      notes: lead.notes,
      created_at: lead.createdAt.toISOString(),
      updated_at: lead.updatedAt.toISOString(),
      last_activity: lead.lastActivity?.toISOString() || lead.updatedAt.toISOString(),
      metadata: lead.customFields || {},
      conversations: conversations.map(conv => ({
        id: conv.id,
        status: conv.status,
        priority: conv.priority,
        message_count: conv.messageCount,
        created_at: conv.createdAt.toISOString(),
        last_message_at: conv.lastMessageAt?.toISOString() || null,
        agent: conv.userAIAgent ? {
          id: conv.userAIAgent.id,
          name: conv.userAIAgent.name,
          role: conv.userAIAgent.role
        } : null
      }))
    };

    res.json(response);

  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/leads
 * Create a new customer lead
 */
router.post('/', requireScopes(['leads:write']), async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      business_type,
      company_name,
      source = 'api',
      notes,
      metadata = {}
    } = req.body;

    // Validation
    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'MISSING_REQUIRED_FIELD',
          message: 'The field "phone" is required and must be a string'
        }
      });
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'INVALID_PHONE_FORMAT',
          message: 'Phone number must be in valid international format (e.g., +573001234567)'
        }
      });
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: {
            type: 'validation_error',
            code: 'INVALID_EMAIL_FORMAT',
            message: 'Email must be in valid format'
          }
        });
      }
    }

    // Check if lead already exists with same phone
    const existingLead = await prisma.customerLead.findFirst({
      where: {
        userId: req.user.id,
        phone: phone
      }
    });

    if (existingLead) {
      return res.status(409).json({
        error: {
          type: 'conflict_error',
          code: 'LEAD_ALREADY_EXISTS',
          message: 'A lead with this phone number already exists'
        }
      });
    }

    // Create the lead
    const lead = await prisma.customerLead.create({
      data: {
        userId: req.user.id,
        name: name ? name.trim() : null,
        email: email ? email.trim().toLowerCase() : null,
        phone: phone.trim(),
        businessType: business_type ? business_type.toLowerCase() : 'unknown',
        companyName: company_name ? company_name.trim() : null,
        source: source.toLowerCase(),
        status: 'NEW',
        qualificationScore: 0,
        notes: notes ? notes.trim() : null,
        customFields: metadata,
        lastActivity: new Date()
      }
    });

    res.status(201).json({
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      business_type: lead.businessType,
      company_name: lead.companyName,
      status: lead.status,
      qualification_score: lead.qualificationScore,
      source: lead.source,
      created_at: lead.createdAt.toISOString(),
      metadata: lead.customFields || {}
    });

  } catch (error) {
    next(error);
  }
});

/**
 * PUT /v1/leads/{lead_id}
 * Update an existing customer lead
 */
router.put('/:leadId', requireScopes(['leads:write']), async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const {
      name,
      email,
      business_type,
      company_name,
      status,
      qualification_score,
      notes,
      metadata
    } = req.body;

    // Check if lead exists and belongs to user
    const existingLead = await prisma.customerLead.findFirst({
      where: {
        id: leadId,
        userId: req.user.id
      }
    });

    if (!existingLead) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found or access denied'
        }
      });
    }

    // Prepare update data
    const updateData = { 
      updatedAt: new Date(),
      lastActivity: new Date()
    };

    if (name !== undefined) updateData.name = name ? name.trim() : null;
    
    if (email !== undefined) {
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            error: {
              type: 'validation_error',
              code: 'INVALID_EMAIL_FORMAT',
              message: 'Email must be in valid format'
            }
          });
        }
        updateData.email = email.trim().toLowerCase();
      } else {
        updateData.email = null;
      }
    }

    if (business_type) updateData.businessType = business_type.toLowerCase();
    if (company_name !== undefined) updateData.companyName = company_name ? company_name.trim() : null;
    
    if (status && ['NEW', 'QUALIFIED', 'CONVERTED', 'LOST'].includes(status.toUpperCase())) {
      updateData.status = status.toUpperCase();
    }

    if (qualification_score !== undefined) {
      const score = parseInt(qualification_score);
      if (score >= 0 && score <= 100) {
        updateData.qualificationScore = score;
      }
    }

    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;
    if (metadata !== undefined) updateData.customFields = metadata;

    // Update the lead
    const updatedLead = await prisma.customerLead.update({
      where: { id: leadId },
      data: updateData
    });

    res.json({
      id: updatedLead.id,
      name: updatedLead.name,
      email: updatedLead.email,
      phone: updatedLead.phone,
      business_type: updatedLead.businessType,
      company_name: updatedLead.companyName,
      status: updatedLead.status,
      qualification_score: updatedLead.qualificationScore,
      source: updatedLead.source,
      created_at: updatedLead.createdAt.toISOString(),
      updated_at: updatedLead.updatedAt.toISOString(),
      last_activity: updatedLead.lastActivity?.toISOString() || updatedLead.updatedAt.toISOString(),
      metadata: updatedLead.customFields || {}
    });

  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /v1/leads/{lead_id}
 * Delete a customer lead
 */
router.delete('/:leadId', requireScopes(['leads:write']), async (req, res, next) => {
  try {
    const { leadId } = req.params;

    // Check if lead exists and belongs to user
    const existingLead = await prisma.customerLead.findFirst({
      where: {
        id: leadId,
        userId: req.user.id
      }
    });

    if (!existingLead) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found or access denied'
        }
      });
    }

    // Check if lead has active conversations
    const activeConversations = await prisma.cRMConversation.count({
      where: {
        customerLeadId: leadId,
        userId: req.user.id,
        status: 'ACTIVE'
      }
    });

    if (activeConversations > 0) {
      return res.status(409).json({
        error: {
          type: 'conflict_error',
          code: 'LEAD_HAS_ACTIVE_CONVERSATIONS',
          message: `Cannot delete lead. Lead has ${activeConversations} active conversation(s). Please complete these conversations first.`
        }
      });
    }

    // Delete associated conversations first
    await prisma.cRMConversation.deleteMany({
      where: {
        customerLeadId: leadId,
        userId: req.user.id
      }
    });

    // Delete the lead
    await prisma.customerLead.delete({
      where: { id: leadId }
    });

    res.status(204).send();

  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/leads/{lead_id}/qualify
 * Update lead qualification score and status
 */
router.post('/:leadId/qualify', requireScopes(['leads:write']), async (req, res, next) => {
  try {
    const { leadId } = req.params;
    const { qualification_score, status, notes } = req.body;

    // Validation
    if (qualification_score === undefined || typeof qualification_score !== 'number') {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'MISSING_REQUIRED_FIELD',
          message: 'The field "qualification_score" is required and must be a number'
        }
      });
    }

    if (qualification_score < 0 || qualification_score > 100) {
      return res.status(400).json({
        error: {
          type: 'validation_error',
          code: 'INVALID_QUALIFICATION_SCORE',
          message: 'Qualification score must be between 0 and 100'
        }
      });
    }

    // Check if lead exists and belongs to user
    const existingLead = await prisma.customerLead.findFirst({
      where: {
        id: leadId,
        userId: req.user.id
      }
    });

    if (!existingLead) {
      return res.status(404).json({
        error: {
          type: 'not_found_error',
          code: 'LEAD_NOT_FOUND',
          message: 'Lead not found or access denied'
        }
      });
    }

    // Determine status based on score if not provided
    let leadStatus = status;
    if (!leadStatus) {
      if (qualification_score >= 80) {
        leadStatus = 'QUALIFIED';
      } else if (qualification_score >= 50) {
        leadStatus = 'NEW';
      } else {
        leadStatus = 'NEW';
      }
    }

    // Update the lead
    const updatedLead = await prisma.customerLead.update({
      where: { id: leadId },
      data: {
        qualificationScore: qualification_score,
        status: leadStatus.toUpperCase(),
        notes: notes ? (existingLead.notes ? `${existingLead.notes}\n\n[Qualification] ${notes}` : `[Qualification] ${notes}`) : existingLead.notes,
        lastActivity: new Date(),
        updatedAt: new Date()
      }
    });

    res.json({
      id: updatedLead.id,
      name: updatedLead.name,
      qualification_score: updatedLead.qualificationScore,
      status: updatedLead.status,
      last_activity: updatedLead.lastActivity.toISOString(),
      message: `Lead qualification updated. Score: ${qualification_score}, Status: ${leadStatus}`
    });

  } catch (error) {
    next(error);
  }
});

/**
 * GET /v1/leads/stats
 * Get lead statistics for the authenticated user
 */
router.get('/stats/summary', requireScopes(['leads:read']), async (req, res, next) => {
  try {
    const { time_range = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (time_range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get lead counts by status
    const statusStats = await prisma.customerLead.groupBy({
      by: ['status'],
      where: {
        userId: req.user.id,
        createdAt: { gte: startDate }
      },
      _count: true
    });

    // Get lead counts by business type
    const businessTypeStats = await prisma.customerLead.groupBy({
      by: ['businessType'],
      where: {
        userId: req.user.id,
        createdAt: { gte: startDate }
      },
      _count: true
    });

    // Get lead counts by source
    const sourceStats = await prisma.customerLead.groupBy({
      by: ['source'],
      where: {
        userId: req.user.id,
        createdAt: { gte: startDate }
      },
      _count: true
    });

    // Calculate average qualification score
    const avgScore = await prisma.customerLead.aggregate({
      where: {
        userId: req.user.id,
        createdAt: { gte: startDate }
      },
      _avg: {
        qualificationScore: true
      }
    });

    // Total leads
    const totalLeads = await prisma.customerLead.count({
      where: {
        userId: req.user.id,
        createdAt: { gte: startDate }
      }
    });

    res.json({
      time_range: time_range,
      total_leads: totalLeads,
      average_qualification_score: Math.round((avgScore._avg.qualificationScore || 0) * 10) / 10,
      status_breakdown: statusStats.reduce((acc, stat) => {
        acc[stat.status.toLowerCase()] = stat._count;
        return acc;
      }, {}),
      business_type_breakdown: businessTypeStats.reduce((acc, stat) => {
        acc[stat.businessType] = stat._count;
        return acc;
      }, {}),
      source_breakdown: sourceStats.reduce((acc, stat) => {
        acc[stat.source] = stat._count;
        return acc;
      }, {})
    });

  } catch (error) {
    next(error);
  }
});

// Error handler
router.use(handlePublicApiError);

module.exports = router;